/**
 * WebWaka Professional — Legal Practice API Router
 * Blueprint Reference: Part 2 (Layer 2 — Cloudflare Edge Infrastructure)
 * Blueprint Reference: Part 9.2 — "API Responses: Must follow the standard format: { success: true, data: ... }"
 * Blueprint Reference: Part 9.2 — "Authentication & Authorization: Edge-based JWT validation. RBAC on all restricted endpoints."
 * Blueprint Reference: Part 10.8 — Legal Practice (Client management, case tracking, time billing, document management, NBA compliance)
 *
 * Tech Stack: Hono + Cloudflare Workers + D1 + R2
 */

import { Hono } from 'hono';
import { createLogger } from '../../../core/logger';
import { publishEvent, createEvent } from '../../../core/event-bus';
import { PaystackClient, generatePaystackReference, type PaystackWebhookEvent } from '../../../core/payments/paystack';
import {
  getClientsByTenant,
  getClientById,
  insertClient,
  updateClient,
  softDeleteClient,
  getCasesByTenant,
  getCaseById,
  insertCase,
  updateCaseStatus,
  softDeleteCase,
  getHearingsByCase,
  insertHearing,
  getTimeEntriesByCase,
  getUnbilledTimeEntries,
  insertTimeEntry,
  getInvoicesByTenant,
  getInvoiceById,
  insertInvoice,
  markInvoicePaid,
  getDocumentsByCase,
  insertDocument,
  getNBAProfileByUserId,
  getNBAProfileByBarNumber,
  insertNBAProfile,
  verifyNBAProfile,
  getDashboardStats,
  type D1Database
} from '../../../core/db/queries';
import {
  generateId,
  generateCaseReference,
  generateInvoiceNumber,
  calculateTimeEntryAmount,
  calculateVAT,
  validateNBABarNumber,
  validateYearOfCall,
  nowUTC
} from '../utils';
import type {
  LegalClient,
  LegalCase,
  CaseHearing,
  LegalTimeEntry,
  LegalInvoice,
  LegalDocument,
  NBAProfile,
  CaseStatus
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
  role: 'admin' | 'attorney' | 'paralegal' | 'client';
  exp: number;
}

async function validateJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    // Verify signature using Web Crypto API (available in Cloudflare Workers)
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
    const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, signature, data);
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64)) as JWTPayload;

    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HONO APP
// ─────────────────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env }>();

const logger = createLogger('legal-practice-api');


// ─────────────────────────────────────────────────────────────────────────────
// CORS — Environment-aware (never wildcard in staging/production)
// Security hardened 2026-03-29
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS: Record<string, string[]> = {
  production: [
    'https://professional.webwaka.app',
    'https://legal.webwaka.app',
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
// AUTH MIDDLEWARE — Edge-based JWT + RBAC
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

  // Inject auth context into request
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
    module: 'legal-practice',
    status: 'healthy',
    timestamp: nowUTC()
  }));
});

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/dashboard', async (c) => {
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
// CLIENTS ROUTES
// Blueprint Reference: Part 10.8 — "Client management"
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/clients', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const limit = parseInt(c.req.query('limit') ?? '50', 10);
  const offset = parseInt(c.req.query('offset') ?? '0', 10);

  try {
    const clients = await getClientsByTenant(c.env.DB, tenantId, limit, offset);
    return c.json<ApiResponse>(ok(clients));
  } catch (error) {
    logger.error('Failed to list clients', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve clients']), 500);
  }
});

app.get('/api/legal/clients/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const id = c.req.param('id');

  try {
    const client = await getClientById(c.env.DB, tenantId, id);
    if (!client) return c.json<ApiResponse>(fail(['Client not found']), 404);
    return c.json<ApiResponse>(ok(client));
  } catch (error) {
    logger.error('Failed to get client', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve client']), 500);
  }
});

app.post('/api/legal/clients', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;

  try {
    const body = await c.req.json<Omit<LegalClient, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'deletedAt'>>();
    const now = nowUTC();

    const client: LegalClient = {
      id: generateId('cli'),
      tenantId,
      ...body,
      ndprConsentAt: now, // NDPR consent recorded at creation — Part 9.1 Nigeria First
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };

    await insertClient(c.env.DB, client);

    // Publish event to CORE-2 event bus — Part 9.2 Event-Driven
    await publishEvent(
      createEvent(tenantId, 'legal.client.created', { clientId: client.id, createdBy: userId }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    logger.info('Client created', { tenantId, clientId: client.id });
    return c.json<ApiResponse>(ok(client), 201);
  } catch (error) {
    logger.error('Failed to create client', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to create client']), 500);
  }
});

app.put('/api/legal/clients/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const id = c.req.param('id');

  try {
    const body = await c.req.json<Partial<LegalClient>>();
    await updateClient(c.env.DB, tenantId, id, body);

    const updated = await getClientById(c.env.DB, tenantId, id);
    if (!updated) return c.json<ApiResponse>(fail(['Client not found']), 404);

    await publishEvent(
      createEvent(tenantId, 'legal.client.updated', { clientId: id }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    return c.json<ApiResponse>(ok(updated));
  } catch (error) {
    logger.error('Failed to update client', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to update client']), 500);
  }
});

app.delete('/api/legal/clients/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const role = c.get('role' as never) as string;
  const id = c.req.param('id');

  // RBAC: Only admins can delete clients
  if (role !== 'admin') {
    return c.json<ApiResponse>(fail(['Insufficient permissions — admin role required']), 403);
  }

  try {
    await softDeleteClient(c.env.DB, tenantId, id);
    logger.info('Client soft-deleted', { tenantId, clientId: id });
    return c.json<ApiResponse>(ok({ deleted: true }));
  } catch (error) {
    logger.error('Failed to delete client', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to delete client']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CASES ROUTES
// Blueprint Reference: Part 10.8 — "Case tracking"
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/cases', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const status = c.req.query('status');
  const clientId = c.req.query('clientId');
  const limit = parseInt(c.req.query('limit') ?? '50', 10);
  const offset = parseInt(c.req.query('offset') ?? '0', 10);

  try {
    const caseFilters: { status?: string; clientId?: string } = {};
    if (status !== undefined) caseFilters.status = status;
    if (clientId !== undefined) caseFilters.clientId = clientId;
    const cases = await getCasesByTenant(c.env.DB, tenantId, caseFilters, limit, offset);
    return c.json<ApiResponse>(ok(cases));
  } catch (error) {
    logger.error('Failed to list cases', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve cases']), 500);
  }
});

app.get('/api/legal/cases/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const id = c.req.param('id');

  try {
    const legalCase = await getCaseById(c.env.DB, tenantId, id);
    if (!legalCase) return c.json<ApiResponse>(fail(['Case not found']), 404);
    return c.json<ApiResponse>(ok(legalCase));
  } catch (error) {
    logger.error('Failed to get case', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve case']), 500);
  }
});

app.post('/api/legal/cases', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;

  try {
    const body = await c.req.json<Omit<LegalCase, 'id' | 'tenantId' | 'caseReference' | 'version' | 'createdAt' | 'updatedAt' | 'deletedAt'>>();
    const now = nowUTC();

    // Get next sequence number for case reference
    const existingCases = await getCasesByTenant(c.env.DB, tenantId, {}, 1000, 0);
    const sequence = existingCases.length + 1;

    // Get client to determine state for case reference
    const client = await getClientById(c.env.DB, tenantId, body.clientId);
    const state = client?.state ?? 'Lagos';

    const legalCase: LegalCase = {
      id: generateId('cas'),
      tenantId,
      caseReference: generateCaseReference(state, sequence),
      ...body,
      status: 'INTAKE',
      currency: body.currency ?? 'NGN',
      coCounselIds: body.coCounselIds ?? '[]',
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };

    await insertCase(c.env.DB, legalCase);

    // Publish event — Part 9.2 Event-Driven
    await publishEvent(
      createEvent(tenantId, 'legal.case.created', {
        caseId: legalCase.id,
        caseReference: legalCase.caseReference,
        clientId: legalCase.clientId,
        createdBy: userId
      }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    logger.info('Case created', { tenantId, caseId: legalCase.id, caseReference: legalCase.caseReference });
    return c.json<ApiResponse>(ok(legalCase), 201);
  } catch (error) {
    logger.error('Failed to create case', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to create case']), 500);
  }
});

app.patch('/api/legal/cases/:id/status', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const id = c.req.param('id');

  try {
    const { status, version } = await c.req.json<{ status: CaseStatus; version: number }>();
    const updated = await updateCaseStatus(c.env.DB, tenantId, id, status, version);

    if (!updated) {
      return c.json<ApiResponse>(fail(['Version conflict — please refresh and try again']), 409);
    }

    await publishEvent(
      createEvent(tenantId, 'legal.case.status_changed', { caseId: id, newStatus: status }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    logger.info('Case status updated', { tenantId, caseId: id, status });
    return c.json<ApiResponse>(ok({ id, status }));
  } catch (error) {
    logger.error('Failed to update case status', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to update case status']), 500);
  }
});

app.delete('/api/legal/cases/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const role = c.get('role' as never) as string;
  const id = c.req.param('id');

  if (role !== 'admin') {
    return c.json<ApiResponse>(fail(['Insufficient permissions — admin role required']), 403);
  }

  try {
    await softDeleteCase(c.env.DB, tenantId, id);
    logger.info('Case soft-deleted', { tenantId, caseId: id });
    return c.json<ApiResponse>(ok({ deleted: true }));
  } catch (error) {
    logger.error('Failed to delete case', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to delete case']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HEARINGS ROUTES
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/cases/:caseId/hearings', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const caseId = c.req.param('caseId');

  try {
    const hearings = await getHearingsByCase(c.env.DB, tenantId, caseId);
    return c.json<ApiResponse>(ok(hearings));
  } catch (error) {
    logger.error('Failed to list hearings', { tenantId, caseId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve hearings']), 500);
  }
});

app.post('/api/legal/cases/:caseId/hearings', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  const caseId = c.req.param('caseId');

  try {
    const body = await c.req.json<Omit<CaseHearing, 'id' | 'tenantId' | 'caseId' | 'createdAt' | 'updatedAt' | 'deletedAt'>>();
    const now = nowUTC();

    const hearing: CaseHearing = {
      id: generateId('hrg'),
      tenantId,
      caseId,
      ...body,
      attendedBy: body.attendedBy ?? userId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };

    await insertHearing(c.env.DB, hearing);

    // Update case next hearing date if adjournment date provided
    if (hearing.adjournmentDate) {
      const legalCase = await getCaseById(c.env.DB, tenantId, caseId);
      if (legalCase) {
        await updateCaseStatus(c.env.DB, tenantId, caseId, 'ADJOURNED', legalCase.version);
      }
    }

    await publishEvent(
      createEvent(tenantId, 'legal.case.hearing_scheduled', {
        caseId,
        hearingId: hearing.id,
        hearingDate: hearing.hearingDate
      }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    logger.info('Hearing recorded', { tenantId, caseId, hearingId: hearing.id });
    return c.json<ApiResponse>(ok(hearing), 201);
  } catch (error) {
    logger.error('Failed to create hearing', { tenantId, caseId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to record hearing']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TIME ENTRIES ROUTES
// Blueprint Reference: Part 10.8 — "Time billing"
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/cases/:caseId/time-entries', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const caseId = c.req.param('caseId');

  try {
    const entries = await getTimeEntriesByCase(c.env.DB, tenantId, caseId);
    return c.json<ApiResponse>(ok(entries));
  } catch (error) {
    logger.error('Failed to list time entries', { tenantId, caseId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve time entries']), 500);
  }
});

app.post('/api/legal/cases/:caseId/time-entries', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  const caseId = c.req.param('caseId');

  try {
    const body = await c.req.json<{
      description: string;
      durationMinutes: number;
      hourlyRateKobo: number;
      workDate: number;
    }>();

    const now = nowUTC();
    const amountKobo = calculateTimeEntryAmount(body.durationMinutes, body.hourlyRateKobo);

    const entry: LegalTimeEntry = {
      id: generateId('ent'),
      tenantId,
      caseId,
      attorneyId: userId,
      description: body.description,
      durationMinutes: body.durationMinutes,
      hourlyRateKobo: body.hourlyRateKobo,
      amountKobo,
      invoiced: false,
      invoiceId: null,
      workDate: body.workDate,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };

    await insertTimeEntry(c.env.DB, entry);

    await publishEvent(
      createEvent(tenantId, 'legal.time_entry.created', {
        caseId,
        entryId: entry.id,
        amountKobo,
        attorneyId: userId
      }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    logger.info('Time entry created', { tenantId, caseId, entryId: entry.id, amountKobo });
    return c.json<ApiResponse>(ok(entry), 201);
  } catch (error) {
    logger.error('Failed to create time entry', { tenantId, caseId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to create time entry']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INVOICES ROUTES
// Blueprint Reference: Part 10.8 — "Time billing"
// Blueprint Reference: Part 9.2 — "Financial transactions must publish events via the event bus."
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/invoices', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const status = c.req.query('status');

  try {
    const invoices = await getInvoicesByTenant(c.env.DB, tenantId, status);
    return c.json<ApiResponse>(ok(invoices));
  } catch (error) {
    logger.error('Failed to list invoices', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve invoices']), 500);
  }
});

app.get('/api/legal/invoices/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const id = c.req.param('id');

  try {
    const invoice = await getInvoiceById(c.env.DB, tenantId, id);
    if (!invoice) return c.json<ApiResponse>(fail(['Invoice not found']), 404);
    return c.json<ApiResponse>(ok(invoice));
  } catch (error) {
    logger.error('Failed to get invoice', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve invoice']), 500);
  }
});

app.post('/api/legal/cases/:caseId/invoices', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const caseId = c.req.param('caseId');

  try {
    const body = await c.req.json<{
      clientId: string;
      dueDate: number;
      notes?: string;
      currency?: string;
    }>();

    // Get all unbilled time entries for this case
    const unbilledEntries = await getUnbilledTimeEntries(c.env.DB, tenantId, caseId);
    if (unbilledEntries.length === 0) {
      return c.json<ApiResponse>(fail(['No unbilled time entries found for this case']), 400);
    }

    const subtotalKobo = unbilledEntries.reduce((sum, e) => sum + e.amountKobo, 0);
    const vatKobo = calculateVAT(subtotalKobo);
    const totalKobo = subtotalKobo + vatKobo;

    // Get next invoice sequence
    const existingInvoices = await getInvoicesByTenant(c.env.DB, tenantId);
    const sequence = existingInvoices.length + 1;

    const now = nowUTC();
    const invoice: LegalInvoice = {
      id: generateId('inv'),
      tenantId,
      caseId,
      clientId: body.clientId,
      invoiceNumber: generateInvoiceNumber(sequence),
      status: 'DRAFT',
      subtotalKobo,
      vatKobo,
      totalKobo,
      currency: body.currency ?? 'NGN',
      dueDate: body.dueDate,
      paidAt: null,
      paymentReference: null,
      notes: body.notes ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };

    await insertInvoice(c.env.DB, invoice);

    await publishEvent(
      createEvent(tenantId, 'legal.invoice.created', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        caseId,
        clientId: body.clientId,
        totalKobo
      }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    logger.info('Invoice created', { tenantId, invoiceId: invoice.id, totalKobo });
    return c.json<ApiResponse>(ok(invoice), 201);
  } catch (error) {
    logger.error('Failed to create invoice', { tenantId, caseId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to create invoice']), 500);
  }
});

app.post('/api/legal/invoices/:id/mark-paid', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const id = c.req.param('id');

  try {
    const { paymentReference } = await c.req.json<{ paymentReference: string }>();
    await markInvoicePaid(c.env.DB, tenantId, id, paymentReference);

    const invoice = await getInvoiceById(c.env.DB, tenantId, id);

    // Financial event — Part 9.2 "Financial transactions must publish events via the event bus"
    await publishEvent(
      createEvent(tenantId, 'legal.invoice.paid', {
        invoiceId: id,
        paymentReference,
        totalKobo: invoice?.totalKobo ?? 0
      }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    logger.info('Invoice marked paid', { tenantId, invoiceId: id, paymentReference });
    return c.json<ApiResponse>(ok({ id, status: 'PAID', paymentReference }));
  } catch (error) {
    logger.error('Failed to mark invoice paid', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to mark invoice as paid']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYSTACK PAYMENT INITIALIZATION
// Blueprint Reference: Part 9.1 — "Nigeria First: Paystack is the primary payment gateway."
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/legal/invoices/:id/pay', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const id = c.req.param('id');

  if (!c.env.PAYSTACK_SECRET_KEY) {
    return c.json<ApiResponse>(fail(['Payment gateway not configured']), 400);
  }

  try {
    const { email } = await c.req.json<{ email: string }>().catch(() => ({ email: '' }));
    if (!email) {
      return c.json<ApiResponse>(fail(['Client email is required for payment initialization']), 400);
    }

    const invoice = await getInvoiceById(c.env.DB, tenantId, id);
    if (!invoice) {
      return c.json<ApiResponse>(fail(['Invoice not found']), 404);
    }

    if (invoice.status !== 'SENT') {
      return c.json<ApiResponse>(fail([`Invoice cannot be paid in status: ${invoice.status}`]), 400);
    }

    const reference = generatePaystackReference('INV');
    const paystack = new PaystackClient(c.env.PAYSTACK_SECRET_KEY);
    const result = await paystack.initializeTransaction({
      email,
      amountKobo: invoice.totalKobo,
      reference,
      currency: (invoice.currency as 'NGN') || 'NGN',
      metadata: { invoiceId: id, tenantId, invoiceNumber: invoice.invoiceNumber }
    });

    if (!result.status) {
      logger.error('Paystack init failed', { tenantId, invoiceId: id, message: result.message });
      return c.json<ApiResponse>(fail([result.message || 'Payment initialization failed']), 402);
    }

    logger.info('Paystack payment initialized', { tenantId, invoiceId: id, reference });
    return c.json<ApiResponse>(ok({
      authorizationUrl: result.data.authorization_url,
      accessCode: result.data.access_code,
      reference: result.data.reference,
      invoiceId: id,
      amountKobo: invoice.totalKobo,
      currency: invoice.currency
    }));
  } catch (error) {
    logger.error('Payment initialization failed', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Payment initialization failed']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS ROUTES
// Blueprint Reference: Part 10.8 — "Document management"
// Blueprint Reference: Part 9.2 — R2 storage (no file bytes in DB)
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/cases/:caseId/documents', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const caseId = c.req.param('caseId');

  try {
    const documents = await getDocumentsByCase(c.env.DB, tenantId, caseId);
    return c.json<ApiResponse>(ok(documents));
  } catch (error) {
    logger.error('Failed to list documents', { tenantId, caseId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve documents']), 500);
  }
});

app.post('/api/legal/cases/:caseId/documents', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  const caseId = c.req.param('caseId');

  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('documentType') as string;
    const title = formData.get('title') as string;
    const isConfidential = formData.get('isConfidential') === 'true';

    if (!file) {
      return c.json<ApiResponse>(fail(['No file provided']), 400);
    }

    const now = nowUTC();
    const docId = generateId('doc');
    const storageKey = `${tenantId}/legal-docs/${caseId}/${docId}-${file.name}`;

    // Upload to R2 — Part 9.2 (file bytes in R2, not DB)
    const fileBuffer = await file.arrayBuffer();
    await c.env.DOCUMENTS.put(storageKey, fileBuffer, {
      httpMetadata: { contentType: file.type }
    });

    // Generate a presigned URL (R2 public URL pattern)
    const storageUrl = `https://documents.webwakados.workers.dev/${storageKey}`;

    const document: LegalDocument = {
      id: docId,
      tenantId,
      caseId,
      documentType: documentType as LegalDocument['documentType'],
      title,
      storageKey,
      storageUrl,
      mimeType: file.type,
      fileSizeBytes: file.size,
      uploadedBy: userId,
      documentVersion: 1,
      isConfidential,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };

    await insertDocument(c.env.DB, document);

    await publishEvent(
      createEvent(tenantId, 'legal.document.uploaded', {
        documentId: document.id,
        caseId,
        documentType,
        uploadedBy: userId
      }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    logger.info('Document uploaded', { tenantId, caseId, documentId: document.id });
    return c.json<ApiResponse>(ok(document), 201);
  } catch (error) {
    logger.error('Failed to upload document', { tenantId, caseId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to upload document']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// NBA PROFILES ROUTES
// Blueprint Reference: Part 10.8 — "NBA compliance"
// Blueprint Reference: Part 9.1 — "Nigeria First"
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/nba/profile', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;

  try {
    const profile = await getNBAProfileByUserId(c.env.DB, tenantId, userId);
    if (!profile) return c.json<ApiResponse>(fail(['NBA profile not found']), 404);
    return c.json<ApiResponse>(ok(profile));
  } catch (error) {
    logger.error('Failed to get NBA profile', { tenantId, userId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve NBA profile']), 500);
  }
});

app.post('/api/legal/nba/profile', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;

  try {
    const body = await c.req.json<Omit<NBAProfile, 'id' | 'tenantId' | 'userId' | 'isVerified' | 'verifiedAt' | 'createdAt' | 'updatedAt' | 'deletedAt'>>();

    // Validate NBA bar number — Part 10.8 NBA compliance
    const barValidation = validateNBABarNumber(body.barNumber);
    if (!barValidation.valid) {
      return c.json<ApiResponse>(fail([barValidation.error ?? 'Invalid bar number']), 400);
    }

    // Validate year of call
    const yearValidation = validateYearOfCall(body.yearOfCall);
    if (!yearValidation.valid) {
      return c.json<ApiResponse>(fail([yearValidation.error ?? 'Invalid year of call']), 400);
    }

    // Check for duplicate bar number
    const existing = await getNBAProfileByBarNumber(c.env.DB, body.barNumber);
    if (existing) {
      return c.json<ApiResponse>(fail(['This bar number is already registered']), 409);
    }

    const now = nowUTC();
    const profile: NBAProfile = {
      id: generateId('nba'),
      tenantId,
      userId,
      ...body,
      isVerified: false,
      verifiedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };

    await insertNBAProfile(c.env.DB, profile);

    logger.info('NBA profile created', { tenantId, userId, barNumber: body.barNumber });
    return c.json<ApiResponse>(ok(profile), 201);
  } catch (error) {
    logger.error('Failed to create NBA profile', { tenantId, userId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to create NBA profile']), 500);
  }
});

app.post('/api/legal/nba/profiles/:id/verify', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const role = c.get('role' as never) as string;
  const id = c.req.param('id');

  // RBAC: Only admins can verify NBA profiles
  if (role !== 'admin') {
    return c.json<ApiResponse>(fail(['Insufficient permissions — admin role required']), 403);
  }

  try {
    await verifyNBAProfile(c.env.DB, tenantId, id);

    await publishEvent(
      createEvent(tenantId, 'legal.nba.profile_verified', { profileId: id }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    logger.info('NBA profile verified', { tenantId, profileId: id });
    return c.json<ApiResponse>(ok({ id, isVerified: true }));
  } catch (error) {
    logger.error('Failed to verify NBA profile', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to verify NBA profile']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SYNC ENDPOINT — CORE-1 Universal Offline Sync Engine
// Blueprint Reference: Part 6 — "IndexedDB → Mutation Queue → Sync API → Server reconciliation"
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// PAYSTACK WEBHOOK — Invoice Payment Confirmation
// Blueprint Reference: Part 9.1 — "Nigeria First: Paystack is the primary payment gateway."
// Blueprint Reference: Part 9.3 — "Event-Driven: Payment confirmations published."
// Note: Route is at /webhooks/ (not /api/) to bypass the auth middleware.
//       Paystack authenticates via HMAC-SHA512 x-paystack-signature header.
// ─────────────────────────────────────────────────────────────────────────────

app.post('/webhooks/legal/paystack', async (c) => {
  if (!c.env.PAYSTACK_SECRET_KEY) {
    logger.error('Paystack webhook received but secret key not configured');
    return c.json<ApiResponse>(fail(['Payment gateway not configured']), 500);
  }

  const rawBody = await c.req.text();
  const signature = c.req.header('x-paystack-signature') ?? '';

  const isValid = await PaystackClient.verifyWebhookSignature(rawBody, signature, c.env.PAYSTACK_SECRET_KEY);
  if (!isValid) {
    logger.warn('Paystack webhook signature verification failed');
    return c.json<ApiResponse>(fail(['Invalid webhook signature']), 401);
  }

  try {
    const event = JSON.parse(rawBody) as PaystackWebhookEvent;

    if (event.event === 'charge.success') {
      const { reference, metadata } = event.data;
      const invoiceId = (metadata as Record<string, string> | null)?.['invoiceId'];
      const tenantId = (metadata as Record<string, string> | null)?.['tenantId'];

      if (invoiceId && tenantId) {
        await markInvoicePaid(c.env.DB, tenantId, invoiceId, reference);
        const invoice = await getInvoiceById(c.env.DB, tenantId, invoiceId);
        await publishEvent(
          createEvent(tenantId, 'legal.invoice.paid', {
            invoiceId,
            paymentReference: reference,
            totalKobo: invoice?.totalKobo ?? 0
          }),
          { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
        );
        logger.info('Invoice paid via Paystack webhook', { tenantId, invoiceId, reference });
      }
    }

    return c.json<ApiResponse>(ok({ received: true }));
  } catch (error) {
    logger.error('Paystack webhook processing error', { error: String(error) });
    return c.json<ApiResponse>(fail(['Webhook processing failed']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE SYNC ROUTE
// ─────────────────────────────────────────────────────────────────────────────

interface SyncMutation {
  id: number;
  tenantId: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: Record<string, unknown>;
  version: number;
  timestamp: number;
}

app.post('/api/legal/sync', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;

  try {
    const { mutations } = await c.req.json<{ mutations: SyncMutation[] }>();

    const results = {
      applied: [] as number[],
      conflicts: [] as Array<{ id: number; reason: string }>,
      errors: [] as Array<{ id: number; error: string }>
    };

    for (const mutation of mutations) {
      // Enforce multi-tenancy invariant — Part 9.2
      if (mutation.tenantId !== tenantId) {
        results.errors.push({ id: mutation.id, error: 'Tenant ID mismatch' });
        continue;
      }

      try {
        // Apply mutation based on entity type and action
        if (mutation.action === 'CREATE') {
          switch (mutation.entityType) {
            case 'legal_client':
              await insertClient(c.env.DB, mutation.payload as unknown as LegalClient);
              break;
            case 'legal_case':
              await insertCase(c.env.DB, mutation.payload as unknown as LegalCase);
              break;
            case 'case_hearing':
              await insertHearing(c.env.DB, mutation.payload as unknown as CaseHearing);
              break;
            case 'legal_time_entry':
              await insertTimeEntry(c.env.DB, mutation.payload as unknown as LegalTimeEntry);
              break;
          }
        }
        results.applied.push(mutation.id);
      } catch (error) {
        results.errors.push({
          id: mutation.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    if (results.conflicts.length > 0 || results.errors.length > 0) {
      return c.json<ApiResponse>({ success: false, data: results }, 409);
    }

    return c.json<ApiResponse>(ok({ applied: results.applied }));
  } catch (error) {
    logger.error('Sync failed', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Sync processing failed']), 500);
  }
});

export default app;
