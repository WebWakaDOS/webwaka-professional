/**
 * WebWaka Professional — Event Management API Router
 * Blueprint Reference: Part 2 (Layer 2 — Cloudflare Edge Infrastructure)
 * Blueprint Reference: Part 9.2 — "API Responses: Must follow the standard format: { success: true, data: ... }"
 * Blueprint Reference: Part 9.2 — "Authentication & Authorization: Edge-based JWT validation. RBAC on all restricted endpoints."
 *
 * RBAC Roles (Event Management Module):
 *   TENANT_ADMIN — full control over all resources
 *   EVENT_MANAGER — create, edit, publish events; manage registrations
 *   ATTENDEE — read published events and register
 *   GUEST — read published events only (no registration via API)
 *
 * Tech Stack: Hono + Cloudflare Workers + D1 + R2
 */

import { Hono } from 'hono';
import { createLogger } from '../../../core/logger';
import { publishEvent, createEventMgmtEvent } from '../../../core/event-bus';
import { PaystackClient, generatePaystackReference, type PaystackWebhookEvent } from '../../../core/payments/paystack';
import {
  getEventsByTenant,
  getEventById,
  insertEvent,
  updateEvent,
  updateEventStatus,
  updateEventBanner,
  softDeleteEvent,
  getEventCount,
  getRegistrationsByEvent,
  getRegistrationById,
  getRegistrationByTicketRef,
  getRegistrationCountForEvent,
  insertRegistration,
  updateRegistrationStatus,
  markRegistrationPaid,
  getDashboardStats,
  type D1Database
} from '../db/queries';
import {
  generateId,
  generateTicketRef,
  nowUTC,
  validateEventDates,
  validateRegistrationDeadline,
  validateCapacity,
  validateTicketPrice,
  validateNigerianPhone,
  validateEmail,
  isValidStatusTransition
} from '../utils';
import type {
  ManagedEvent,
  EventRegistration,
  EventStatus,
  EventType,
  EventManagementRole
} from '../../../core/db/schema';

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT BINDINGS
// Blueprint Reference: Part 2 — Cloudflare Workers bindings
// ─────────────────────────────────────────────────────────────────────────────

export interface Env {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  TENANT_CONFIG: KVNamespace;
  EVENTS: KVNamespace;
  JWT_SECRET: string;
  ENVIRONMENT?: string;
  RATE_LIMIT_KV?: KVNamespace;
  EVENT_BUS_URL?: string;
  EVENT_BUS_API_KEY?: string;
  PAYSTACK_SECRET_KEY?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// STANDARD API RESPONSE FORMAT
// Blueprint Reference: Part 9.2 — "{ success: true, data: ... }"
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  errors?: string[];
}

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

function fail(errors: string[]): ApiResponse {
  return { success: false, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// JWT VALIDATION — Edge-based
// Blueprint Reference: Part 9.2 — "Edge-based JWT validation"
// ─────────────────────────────────────────────────────────────────────────────

interface JWTPayload {
  sub: string;
  tenantId: string;
  role: EventManagementRole;
  exp: number;
}

async function validateJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );
    const valid = await crypto.subtle.verify('HMAC', key, signature, data);
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64)) as JWTPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RBAC HELPERS
// Blueprint Reference: Part 9.2 — "RBAC on all restricted endpoints"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when the given role is allowed to manage events
 * (create, edit, update status, upload banners, delete).
 * TENANT_ADMIN has unrestricted access. EVENT_MANAGER has operational access.
 */
function canManageEvents(role: EventManagementRole): boolean {
  return role === 'TENANT_ADMIN' || role === 'EVENT_MANAGER';
}

/**
 * Returns true when the given role is allowed to delete events or cancel events
 * and perform other destructive operations.
 * Restricted to TENANT_ADMIN only.
 */
function isTenantAdmin(role: EventManagementRole): boolean {
  return role === 'TENANT_ADMIN';
}

/**
 * Returns true when the given role can register attendees or manage registrations.
 * TENANT_ADMIN and EVENT_MANAGER can manage any registration.
 * ATTENDEE can create their own registration.
 */
function canRegister(role: EventManagementRole): boolean {
  return role === 'TENANT_ADMIN' || role === 'EVENT_MANAGER' || role === 'ATTENDEE';
}

// ─────────────────────────────────────────────────────────────────────────────
// HONO APP
// ─────────────────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env }>();
const logger = createLogger('event-management-api');

// ─────────────────────────────────────────────────────────────────────────────
// CORS — Environment-aware (never wildcard in staging/production)
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS: Record<string, string[]> = {
  production: [
    'https://professional.webwaka.app',
    'https://events.webwaka.app',
    'https://admin.webwaka.app',
  ],
  staging: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://professional-staging.webwaka.app',
  ],
};

app.use('*', async (c, next) => {
  const env = c.env.ENVIRONMENT || 'development';
  const origin = c.req.header('Origin') || '';
  const allowed = ALLOWED_ORIGINS[env];
  const isAllowed = !allowed || allowed.includes(origin);

  if (c.req.method === 'OPTIONS') {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };
    if (isAllowed && origin) headers['Access-Control-Allow-Origin'] = origin;
    else if (!allowed) headers['Access-Control-Allow-Origin'] = '*';
    return new Response(null, { status: 204, headers });
  }

  await next();

  if (origin) {
    if (isAllowed) {
      c.res.headers.set('Access-Control-Allow-Origin', origin);
      c.res.headers.set('Vary', 'Origin');
    } else if (!allowed) {
      c.res.headers.set('Access-Control-Allow-Origin', '*');
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH MIDDLEWARE — Edge-based JWT + RBAC context injection
// All /api/* routes require a valid JWT
// ─────────────────────────────────────────────────────────────────────────────

app.use('/api/*', async (c, next): Promise<Response | void> => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json<ApiResponse>(fail(['Missing or invalid Authorization header']), 401);
  }

  const token = authHeader.slice(7);
  const payload = await validateJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json<ApiResponse>(fail(['Invalid or expired token']), 401);
  }

  c.set('userId' as never, payload.sub);
  c.set('tenantId' as never, payload.tenantId);
  c.set('role' as never, payload.role);

  await next();
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (c) => {
  return c.json<ApiResponse>(ok({
    service: 'webwaka-professional',
    module: 'event-management',
    status: 'healthy',
    timestamp: nowUTC()
  }));
});

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/events/dashboard', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;

  try {
    const stats = await getDashboardStats(c.env.DB, tenantId);
    return c.json<ApiResponse>(ok(stats));
  } catch (error) {
    logger.error('Failed to get dashboard stats', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve dashboard statistics']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS — LIST
// All authenticated roles can view events.
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/events', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const role = c.get('role' as never) as EventManagementRole;
  const status = c.req.query('status');
  const eventType = c.req.query('eventType');
  const limit = parseInt(c.req.query('limit') ?? '50', 10);
  const offset = parseInt(c.req.query('offset') ?? '0', 10);

  const filters: { status?: string; eventType?: string } = {};

  // RBAC: Non-managers/admins can only see published/open events
  if (!canManageEvents(role)) {
    const allowedStatuses = ['PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED'];
    if (status && allowedStatuses.includes(status)) {
      filters.status = status;
    } else {
      filters.status = 'REGISTRATION_OPEN';
    }
  } else {
    if (status) filters.status = status;
  }

  if (eventType) filters.eventType = eventType;

  try {
    const events = await getEventsByTenant(c.env.DB, tenantId, filters, limit, offset);
    return c.json<ApiResponse>(ok(events));
  } catch (error) {
    logger.error('Failed to list events', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve events']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS — GET SINGLE
// All authenticated roles can view an event.
// RBAC: Non-managers cannot see DRAFT events.
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/events/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const role = c.get('role' as never) as EventManagementRole;
  const id = c.req.param('id');

  try {
    const event = await getEventById(c.env.DB, tenantId, id);
    if (!event) return c.json<ApiResponse>(fail(['Event not found']), 404);

    // RBAC: Attendees and guests cannot access DRAFT events
    if (!canManageEvents(role) && event.status === 'DRAFT') {
      return c.json<ApiResponse>(fail(['Event not found']), 404);
    }

    return c.json<ApiResponse>(ok(event));
  } catch (error) {
    logger.error('Failed to get event', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve event']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS — CREATE
// RBAC: TENANT_ADMIN and EVENT_MANAGER only.
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/events', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  const role = c.get('role' as never) as EventManagementRole;

  if (!canManageEvents(role)) {
    return c.json<ApiResponse>(
      fail(['Insufficient permissions — TENANT_ADMIN or EVENT_MANAGER role required']),
      403
    );
  }

  try {
    const body = await c.req.json<{
      title: string;
      description?: string;
      eventType: EventType;
      venue: string;
      address: string;
      city: string;
      state: string;
      onlineUrl?: string;
      startDate: number;
      endDate: number;
      registrationDeadline?: number;
      capacity?: number | null;
      ticketPriceKobo?: number;
      currency?: string;
      tags?: string[];
    }>();

    // Validate required fields
    if (!body.title?.trim()) {
      return c.json<ApiResponse>(fail(['Event title is required']), 400);
    }
    if (!body.venue?.trim()) {
      return c.json<ApiResponse>(fail(['Venue is required']), 400);
    }
    if (!body.city?.trim() || !body.state?.trim()) {
      return c.json<ApiResponse>(fail(['City and state are required']), 400);
    }

    // Validate dates
    const dateValidation = validateEventDates(body.startDate, body.endDate);
    if (!dateValidation.valid) {
      return c.json<ApiResponse>(fail([dateValidation.error!]), 400);
    }

    if (body.registrationDeadline !== undefined) {
      const deadlineValidation = validateRegistrationDeadline(body.registrationDeadline, body.startDate);
      if (!deadlineValidation.valid) {
        return c.json<ApiResponse>(fail([deadlineValidation.error!]), 400);
      }
    }

    // Validate capacity
    const capacityValidation = validateCapacity(body.capacity ?? null);
    if (!capacityValidation.valid) {
      return c.json<ApiResponse>(fail([capacityValidation.error!]), 400);
    }

    // Validate ticket price
    const priceKobo = body.ticketPriceKobo ?? 0;
    const priceValidation = validateTicketPrice(priceKobo);
    if (!priceValidation.valid) {
      return c.json<ApiResponse>(fail([priceValidation.error!]), 400);
    }

    const now = nowUTC();
    const event: ManagedEvent = {
      id: generateId('evt'),
      tenantId,
      title: body.title.trim(),
      description: body.description?.trim() ?? null,
      eventType: body.eventType,
      status: 'DRAFT',
      venue: body.venue.trim(),
      address: body.address?.trim() ?? '',
      city: body.city.trim(),
      state: body.state.trim(),
      onlineUrl: body.onlineUrl?.trim() ?? null,
      startDate: body.startDate,
      endDate: body.endDate,
      registrationDeadline: body.registrationDeadline ?? null,
      capacity: body.capacity ?? null,
      ticketPriceKobo: priceKobo,
      currency: body.currency ?? 'NGN',
      organizerId: userId,
      bannerStorageKey: null,
      bannerUrl: null,
      tags: JSON.stringify(body.tags ?? []),
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };

    await insertEvent(c.env.DB, event);

    await publishEvent(
      createEventMgmtEvent(tenantId, 'event_mgmt.event.created', {
        eventId: event.id,
        title: event.title,
        createdBy: userId
      }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    logger.info('Event created', { tenantId, eventId: event.id, createdBy: userId });
    return c.json<ApiResponse>(ok(event), 201);
  } catch (error) {
    logger.error('Failed to create event', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to create event']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS — UPDATE FIELDS
// RBAC: TENANT_ADMIN and EVENT_MANAGER only.
// Constraint: Cannot edit COMPLETED or CANCELLED events.
// ─────────────────────────────────────────────────────────────────────────────

app.put('/api/events/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const role = c.get('role' as never) as EventManagementRole;
  const id = c.req.param('id');

  if (!canManageEvents(role)) {
    return c.json<ApiResponse>(
      fail(['Insufficient permissions — TENANT_ADMIN or EVENT_MANAGER role required']),
      403
    );
  }

  try {
    const existing = await getEventById(c.env.DB, tenantId, id);
    if (!existing) return c.json<ApiResponse>(fail(['Event not found']), 404);

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      return c.json<ApiResponse>(
        fail([`Cannot edit a ${existing.status.toLowerCase()} event`]),
        409
      );
    }

    const body = await c.req.json<Partial<ManagedEvent>>();

    // Re-validate dates if they are being changed
    const newStart = body.startDate ?? existing.startDate;
    const newEnd = body.endDate ?? existing.endDate;
    if (body.startDate !== undefined || body.endDate !== undefined) {
      const dateValidation = validateEventDates(newStart, newEnd);
      if (!dateValidation.valid) {
        return c.json<ApiResponse>(fail([dateValidation.error!]), 400);
      }
    }

    if (body.registrationDeadline !== undefined && body.registrationDeadline !== null) {
      const deadlineValidation = validateRegistrationDeadline(body.registrationDeadline, newStart);
      if (!deadlineValidation.valid) {
        return c.json<ApiResponse>(fail([deadlineValidation.error!]), 400);
      }
    }

    const now = nowUTC();
    await updateEvent(c.env.DB, tenantId, id, { ...body, updatedAt: now });

    const updated = await getEventById(c.env.DB, tenantId, id);

    await publishEvent(
      createEventMgmtEvent(tenantId, 'event_mgmt.event.updated', { eventId: id }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    logger.info('Event updated', { tenantId, eventId: id });
    return c.json<ApiResponse>(ok(updated));
  } catch (error) {
    logger.error('Failed to update event', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to update event']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS — UPDATE STATUS (state machine)
// RBAC:
//   TENANT_ADMIN — can perform any valid transition including CANCEL
//   EVENT_MANAGER — can publish, open/close registration, mark ongoing/completed
//                   cannot cancel (destructive)
// ─────────────────────────────────────────────────────────────────────────────

app.patch('/api/events/:id/status', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const role = c.get('role' as never) as EventManagementRole;
  const id = c.req.param('id');

  if (!canManageEvents(role)) {
    return c.json<ApiResponse>(
      fail(['Insufficient permissions — TENANT_ADMIN or EVENT_MANAGER role required']),
      403
    );
  }

  try {
    const { status, version } = await c.req.json<{ status: EventStatus; version: number }>();

    const existing = await getEventById(c.env.DB, tenantId, id);
    if (!existing) return c.json<ApiResponse>(fail(['Event not found']), 404);

    // RBAC: Only TENANT_ADMIN can cancel an event
    if (status === 'CANCELLED' && !isTenantAdmin(role)) {
      return c.json<ApiResponse>(
        fail(['Insufficient permissions — only TENANT_ADMIN can cancel events']),
        403
      );
    }

    // Validate state machine transition
    if (!isValidStatusTransition(existing.status, status)) {
      return c.json<ApiResponse>(
        fail([`Invalid status transition: ${existing.status} → ${status}`]),
        409
      );
    }

    const updated = await updateEventStatus(c.env.DB, tenantId, id, status, version);
    if (!updated) {
      return c.json<ApiResponse>(
        fail(['Version conflict — please refresh and try again']),
        409
      );
    }

    // Map status to event bus event type
    const statusToEvent: Partial<Record<EventStatus, Parameters<typeof createEventMgmtEvent>[1]>> = {
      PUBLISHED: 'event_mgmt.event.published',
      REGISTRATION_OPEN: 'event_mgmt.event.registration_opened',
      REGISTRATION_CLOSED: 'event_mgmt.event.registration_closed',
      CANCELLED: 'event_mgmt.event.cancelled',
      COMPLETED: 'event_mgmt.event.completed'
    };

    const eventType = statusToEvent[status];
    if (eventType) {
      await publishEvent(
        createEventMgmtEvent(tenantId, eventType, { eventId: id, newStatus: status }),
        { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
      );
    }

    logger.info('Event status updated', { tenantId, eventId: id, status });
    return c.json<ApiResponse>(ok({ id, status }));
  } catch (error) {
    logger.error('Failed to update event status', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to update event status']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS — UPLOAD BANNER
// RBAC: TENANT_ADMIN and EVENT_MANAGER only.
// Blueprint Reference: Part 9.2 — R2 storage (no file bytes in DB)
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/events/:id/banner', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  const role = c.get('role' as never) as EventManagementRole;
  const id = c.req.param('id');

  if (!canManageEvents(role)) {
    return c.json<ApiResponse>(
      fail(['Insufficient permissions — TENANT_ADMIN or EVENT_MANAGER role required']),
      403
    );
  }

  try {
    const existing = await getEventById(c.env.DB, tenantId, id);
    if (!existing) return c.json<ApiResponse>(fail(['Event not found']), 404);

    const formData = await c.req.formData();
    const file = formData.get('banner') as File | null;

    if (!file) {
      return c.json<ApiResponse>(fail(['No banner file provided']), 400);
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return c.json<ApiResponse>(
        fail(['Banner must be a JPEG, PNG, WebP, or GIF image']),
        400
      );
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSizeBytes) {
      return c.json<ApiResponse>(fail(['Banner file must be smaller than 5 MB']), 400);
    }

    const now = nowUTC();
    const storageKey = `${tenantId}/event-banners/${id}/${now}-${file.name}`;
    const fileBuffer = await file.arrayBuffer();

    await c.env.DOCUMENTS.put(storageKey, fileBuffer, {
      httpMetadata: { contentType: file.type }
    });

    const bannerUrl = `https://documents.webwakados.workers.dev/${storageKey}`;
    await updateEventBanner(c.env.DB, tenantId, id, storageKey, bannerUrl, now);

    await publishEvent(
      createEventMgmtEvent(tenantId, 'event_mgmt.event.banner_uploaded', {
        eventId: id,
        storageKey,
        uploadedBy: userId
      }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    logger.info('Event banner uploaded', { tenantId, eventId: id, storageKey });
    return c.json<ApiResponse>(ok({ id, bannerUrl, storageKey }));
  } catch (error) {
    logger.error('Failed to upload event banner', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to upload banner']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS — DELETE (soft)
// RBAC: TENANT_ADMIN only. Cannot delete ONGOING or COMPLETED events.
// ─────────────────────────────────────────────────────────────────────────────

app.delete('/api/events/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const role = c.get('role' as never) as EventManagementRole;
  const id = c.req.param('id');

  if (!isTenantAdmin(role)) {
    return c.json<ApiResponse>(
      fail(['Insufficient permissions — TENANT_ADMIN role required']),
      403
    );
  }

  try {
    const existing = await getEventById(c.env.DB, tenantId, id);
    if (!existing) return c.json<ApiResponse>(fail(['Event not found']), 404);

    if (existing.status === 'ONGOING' || existing.status === 'COMPLETED') {
      return c.json<ApiResponse>(
        fail([`Cannot delete an ${existing.status.toLowerCase()} event — cancel it first`]),
        409
      );
    }

    await softDeleteEvent(c.env.DB, tenantId, id);

    logger.info('Event soft-deleted', { tenantId, eventId: id });
    return c.json<ApiResponse>(ok({ deleted: true }));
  } catch (error) {
    logger.error('Failed to delete event', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to delete event']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATIONS — LIST
// RBAC: TENANT_ADMIN and EVENT_MANAGER can list all registrations for an event.
//       ATTENDEE can only list their own registrations (handled via attendeeId filter).
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/events/:eventId/registrations', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  const role = c.get('role' as never) as EventManagementRole;
  const eventId = c.req.param('eventId');
  const statusFilter = c.req.query('status');

  if (!canManageEvents(role) && role !== 'ATTENDEE') {
    return c.json<ApiResponse>(
      fail(['Insufficient permissions — cannot list registrations']),
      403
    );
  }

  try {
    const event = await getEventById(c.env.DB, tenantId, eventId);
    if (!event) return c.json<ApiResponse>(fail(['Event not found']), 404);

    let registrations = await getRegistrationsByEvent(c.env.DB, tenantId, eventId, statusFilter);

    // RBAC: Attendees can only see their own registrations
    if (role === 'ATTENDEE') {
      registrations = registrations.filter(r => r.attendeeId === userId);
    }

    return c.json<ApiResponse>(ok(registrations));
  } catch (error) {
    logger.error('Failed to list registrations', { tenantId, eventId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve registrations']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATIONS — CREATE
// RBAC: TENANT_ADMIN, EVENT_MANAGER (can register anyone), ATTENDEE (registers self).
//       GUEST role cannot register via API.
// Constraint: Event must be in REGISTRATION_OPEN status.
// Constraint: Capacity must not be exceeded.
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/events/:eventId/registrations', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  const role = c.get('role' as never) as EventManagementRole;
  const eventId = c.req.param('eventId');

  if (!canRegister(role)) {
    return c.json<ApiResponse>(
      fail(['Insufficient permissions — registration not allowed for this role']),
      403
    );
  }

  try {
    const event = await getEventById(c.env.DB, tenantId, eventId);
    if (!event) return c.json<ApiResponse>(fail(['Event not found']), 404);

    // RBAC: Non-managers can only register for REGISTRATION_OPEN events
    if (!canManageEvents(role) && event.status !== 'REGISTRATION_OPEN') {
      return c.json<ApiResponse>(
        fail(['Registration is not currently open for this event']),
        409
      );
    }

    // Capacity check
    if (event.capacity !== null) {
      const currentCount = await getRegistrationCountForEvent(c.env.DB, tenantId, eventId);
      if (currentCount >= event.capacity) {
        return c.json<ApiResponse>(fail(['This event has reached its capacity']), 409);
      }
    }

    const body = await c.req.json<{
      attendeeName: string;
      attendeeEmail: string;
      attendeePhone: string;
      attendeeId?: string;
      paymentReference?: string;
    }>();

    // Validate inputs
    if (!body.attendeeName?.trim()) {
      return c.json<ApiResponse>(fail(['Attendee name is required']), 400);
    }

    const emailValidation = validateEmail(body.attendeeEmail ?? '');
    if (!emailValidation.valid) {
      return c.json<ApiResponse>(fail([emailValidation.error!]), 400);
    }

    const phoneValidation = validateNigerianPhone(body.attendeePhone ?? '');
    if (!phoneValidation.valid) {
      return c.json<ApiResponse>(fail([phoneValidation.error!]), 400);
    }

    // Generate ticket reference with global sequence offset
    const totalRegistrations = await getEventCount(c.env.DB, tenantId);
    const ticketRef = generateTicketRef(totalRegistrations + 1);

    const now = nowUTC();
    const registration: EventRegistration = {
      id: generateId('reg'),
      tenantId,
      eventId,
      attendeeId: body.attendeeId ?? (role === 'ATTENDEE' ? userId : null),
      attendeeName: body.attendeeName.trim(),
      attendeeEmail: body.attendeeEmail.trim().toLowerCase(),
      attendeePhone: body.attendeePhone.trim(),
      status: event.ticketPriceKobo === 0 ? 'CONFIRMED' : 'PENDING',
      ticketRef,
      amountPaidKobo: body.paymentReference ? event.ticketPriceKobo : 0,
      paymentReference: body.paymentReference ?? null,
      checkedInAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };

    await insertRegistration(c.env.DB, registration);

    await publishEvent(
      createEventMgmtEvent(tenantId, 'event_mgmt.registration.created', {
        registrationId: registration.id,
        eventId,
        ticketRef,
        attendeeEmail: registration.attendeeEmail,
        registeredBy: userId
      }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    logger.info('Registration created', { tenantId, eventId, registrationId: registration.id, ticketRef });
    return c.json<ApiResponse>(ok(registration), 201);
  } catch (error) {
    logger.error('Failed to create registration', { tenantId, eventId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to create registration']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATIONS — CONFIRM PAYMENT
// RBAC: TENANT_ADMIN and EVENT_MANAGER only.
// ─────────────────────────────────────────────────────────────────────────────

app.patch('/api/events/:eventId/registrations/:id/confirm', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const role = c.get('role' as never) as EventManagementRole;
  const eventId = c.req.param('eventId');
  const id = c.req.param('id');

  if (!canManageEvents(role)) {
    return c.json<ApiResponse>(
      fail(['Insufficient permissions — TENANT_ADMIN or EVENT_MANAGER role required']),
      403
    );
  }

  try {
    const registration = await getRegistrationById(c.env.DB, tenantId, id);
    if (!registration || registration.eventId !== eventId) {
      return c.json<ApiResponse>(fail(['Registration not found']), 404);
    }

    if (registration.status !== 'PENDING') {
      return c.json<ApiResponse>(
        fail([`Cannot confirm a registration with status: ${registration.status}`]),
        409
      );
    }

    const { paymentReference } = await c.req.json<{ paymentReference: string }>();
    const now = nowUTC();
    await updateRegistrationStatus(c.env.DB, tenantId, id, 'CONFIRMED', now);

    await publishEvent(
      createEventMgmtEvent(tenantId, 'event_mgmt.registration.confirmed', {
        registrationId: id,
        eventId,
        paymentReference
      }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    logger.info('Registration confirmed', { tenantId, eventId, registrationId: id });
    return c.json<ApiResponse>(ok({ id, status: 'CONFIRMED', paymentReference }));
  } catch (error) {
    logger.error('Failed to confirm registration', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to confirm registration']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATIONS — CANCEL
// RBAC: TENANT_ADMIN and EVENT_MANAGER can cancel any registration.
//       ATTENDEE can cancel their own registration only.
// ─────────────────────────────────────────────────────────────────────────────

app.patch('/api/events/:eventId/registrations/:id/cancel', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  const role = c.get('role' as never) as EventManagementRole;
  const eventId = c.req.param('eventId');
  const id = c.req.param('id');

  if (!canManageEvents(role) && role !== 'ATTENDEE') {
    return c.json<ApiResponse>(
      fail(['Insufficient permissions — cannot cancel registrations']),
      403
    );
  }

  try {
    const registration = await getRegistrationById(c.env.DB, tenantId, id);
    if (!registration || registration.eventId !== eventId) {
      return c.json<ApiResponse>(fail(['Registration not found']), 404);
    }

    // RBAC: Attendees can only cancel their own registrations
    if (role === 'ATTENDEE' && registration.attendeeId !== userId) {
      return c.json<ApiResponse>(
        fail(['Insufficient permissions — you can only cancel your own registration']),
        403
      );
    }

    if (registration.status === 'CANCELLED' || registration.status === 'CHECKED_IN') {
      return c.json<ApiResponse>(
        fail([`Cannot cancel a registration with status: ${registration.status}`]),
        409
      );
    }

    const now = nowUTC();
    await updateRegistrationStatus(c.env.DB, tenantId, id, 'CANCELLED', now);

    await publishEvent(
      createEventMgmtEvent(tenantId, 'event_mgmt.registration.cancelled', {
        registrationId: id,
        eventId,
        cancelledBy: userId
      }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    logger.info('Registration cancelled', { tenantId, eventId, registrationId: id });
    return c.json<ApiResponse>(ok({ id, status: 'CANCELLED' }));
  } catch (error) {
    logger.error('Failed to cancel registration', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to cancel registration']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATIONS — CHECK IN
// RBAC: TENANT_ADMIN and EVENT_MANAGER only.
// Constraint: Event must be ONGOING. Registration must be CONFIRMED.
// Supports lookup by ticket reference (QR code scan workflow).
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/events/:eventId/check-in', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const role = c.get('role' as never) as EventManagementRole;
  const eventId = c.req.param('eventId');

  if (!canManageEvents(role)) {
    return c.json<ApiResponse>(
      fail(['Insufficient permissions — TENANT_ADMIN or EVENT_MANAGER role required']),
      403
    );
  }

  try {
    const event = await getEventById(c.env.DB, tenantId, eventId);
    if (!event) return c.json<ApiResponse>(fail(['Event not found']), 404);

    if (event.status !== 'ONGOING' && event.status !== 'REGISTRATION_CLOSED') {
      return c.json<ApiResponse>(
        fail(['Check-in is only available for ongoing or closed-registration events']),
        409
      );
    }

    const { ticketRef } = await c.req.json<{ ticketRef: string }>();
    if (!ticketRef?.trim()) {
      return c.json<ApiResponse>(fail(['Ticket reference is required']), 400);
    }

    const registration = await getRegistrationByTicketRef(c.env.DB, ticketRef.trim());
    if (!registration || registration.eventId !== eventId || registration.tenantId !== tenantId) {
      return c.json<ApiResponse>(fail(['Ticket not found for this event']), 404);
    }

    if (registration.status === 'CHECKED_IN') {
      return c.json<ApiResponse>(fail(['This ticket has already been checked in']), 409);
    }

    if (registration.status !== 'CONFIRMED') {
      return c.json<ApiResponse>(
        fail([`Cannot check in a registration with status: ${registration.status}`]),
        409
      );
    }

    const now = nowUTC();
    await updateRegistrationStatus(c.env.DB, tenantId, registration.id, 'CHECKED_IN', now, now);

    await publishEvent(
      createEventMgmtEvent(tenantId, 'event_mgmt.registration.checked_in', {
        registrationId: registration.id,
        eventId,
        ticketRef,
        checkedInAt: now
      }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    logger.info('Attendee checked in', { tenantId, eventId, registrationId: registration.id, ticketRef });
    return c.json<ApiResponse>(ok({
      registrationId: registration.id,
      ticketRef,
      attendeeName: registration.attendeeName,
      status: 'CHECKED_IN',
      checkedInAt: now
    }));
  } catch (error) {
    logger.error('Failed to check in attendee', { tenantId, eventId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to process check-in']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYSTACK PAYMENT INITIALIZATION — Event Registration
// Blueprint Reference: Part 9.1 — "Nigeria First: Paystack is the primary payment gateway."
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/events/:eventId/registrations/:id/pay', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const eventId = c.req.param('eventId');
  const id = c.req.param('id');

  if (!c.env.PAYSTACK_SECRET_KEY) {
    return c.json<ApiResponse>(fail(['Payment gateway not configured']), 400);
  }

  try {
    const registration = await getRegistrationById(c.env.DB, tenantId, id);
    if (!registration || registration.eventId !== eventId) {
      return c.json<ApiResponse>(fail(['Registration not found']), 404);
    }

    if (registration.status === 'CONFIRMED') {
      return c.json<ApiResponse>(ok({ alreadyPaid: true, status: 'CONFIRMED' }));
    }

    if (registration.status !== 'PENDING') {
      return c.json<ApiResponse>(fail([`Registration cannot be paid in status: ${registration.status}`]), 400);
    }

    if (registration.amountPaidKobo === 0) {
      const now = nowUTC();
      await updateRegistrationStatus(c.env.DB, tenantId, id, 'CONFIRMED', now);
      return c.json<ApiResponse>(ok({ confirmed: true, freeEvent: true }));
    }

    const reference = generatePaystackReference('EVT');
    const paystack = new PaystackClient(c.env.PAYSTACK_SECRET_KEY);
    const result = await paystack.initializeTransaction({
      email: registration.attendeeEmail,
      amountKobo: registration.amountPaidKobo,
      reference,
      metadata: { registrationId: id, eventId, tenantId, ticketRef: registration.ticketRef }
    });

    if (!result.status) {
      logger.error('Paystack init failed', { tenantId, registrationId: id, message: result.message });
      return c.json<ApiResponse>(fail([result.message || 'Payment initialization failed']), 402);
    }

    logger.info('Paystack payment initialized', { tenantId, registrationId: id, reference });
    return c.json<ApiResponse>(ok({
      authorizationUrl: result.data.authorization_url,
      accessCode: result.data.access_code,
      reference: result.data.reference,
      registrationId: id,
      amountKobo: registration.amountPaidKobo
    }));
  } catch (error) {
    logger.error('Payment initialization failed', { tenantId, eventId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Payment initialization failed']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYSTACK WEBHOOK — Registration Payment Confirmation
// Blueprint Reference: Part 9.1 — "Nigeria First: Paystack is the primary payment gateway."
// Note: Route is at /webhooks/ (not /api/) to bypass the auth middleware.
// ─────────────────────────────────────────────────────────────────────────────

app.post('/webhooks/events/paystack', async (c) => {
  if (!c.env.PAYSTACK_SECRET_KEY) {
    logger.error('Paystack webhook received but secret key not configured');
    return c.json<ApiResponse>(fail(['Payment gateway not configured']), 500);
  }

  const rawBody = await c.req.text();
  const signature = c.req.header('x-paystack-signature') ?? '';

  const isValid = await PaystackClient.verifyWebhookSignature(rawBody, signature, c.env.PAYSTACK_SECRET_KEY);
  if (!isValid) {
    logger.warn('Paystack events webhook signature verification failed');
    return c.json<ApiResponse>(fail(['Invalid webhook signature']), 401);
  }

  try {
    const event = JSON.parse(rawBody) as PaystackWebhookEvent;

    if (event.event === 'charge.success') {
      const { reference, metadata } = event.data;
      const registrationId = (metadata as Record<string, string> | null)?.['registrationId'];
      const tenantId = (metadata as Record<string, string> | null)?.['tenantId'];

      if (registrationId && tenantId) {
        await markRegistrationPaid(c.env.DB, tenantId, registrationId, reference);
        await publishEvent(
          createEventMgmtEvent(tenantId, 'event_mgmt.registration.payment_confirmed', {
            registrationId,
            paymentReference: reference
          }),
          { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
        );
        logger.info('Registration confirmed via Paystack webhook', { tenantId, registrationId, reference });
      }
    }

    return c.json<ApiResponse>(ok({ received: true }));
  } catch (error) {
    logger.error('Paystack events webhook processing error', { error: String(error) });
    return c.json<ApiResponse>(fail(['Webhook processing failed']), 500);
  }
});

export default app;
