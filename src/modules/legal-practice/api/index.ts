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
import { professionalAuthMiddleware, requireProfessionalRole } from '../../../core/auth-middleware';
import { createLogger } from '../../../core/logger';
import { publishEvent, createEvent } from '../../../core/event-bus';
import { PaystackClient, generatePaystackReference, type PaystackWebhookEvent } from '../../../core/payments/paystack';
import { createNotificationService } from '../../../core/notifications/service';
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
  getTrustAccountsByTenant,
  getTrustAccountById,
  insertTrustAccount,
  updateTrustAccount,
  insertTrustTransaction,
  getTrustTransactionsByAccount,
  getTrustAccountBalance,
  countTrustTransactionsByAccount,
  countTrustTransactionsByTenant,
  insertRetainerEntry,
  getRetainerLedgerByClient,
  getRetainerBalance,
  getTasksByTenant,
  getTasksByCase,
  getTaskById,
  insertTask,
  updateTask,
  updateTaskStatus,
  softDeleteTask,
  getExpensesByCase,
  getExpensesByTenant,
  insertExpense,
  softDeleteExpense,
  getIntakeFormsByTenant,
  getIntakeFormById,
  insertIntakeForm,
  updateIntakeForm,
  softDeleteIntakeForm,
  getIntakeSubmissionsByTenant,
  getIntakeSubmissionById,
  insertIntakeSubmission,
  updateIntakeSubmissionStatus,
  getAnalysisByCase,
  getAnalysisById,
  insertDocumentAnalysis,
  updateDocumentAnalysis,
  getTemplatesByTenant,
  getTemplateById,
  insertDocumentTemplate,
  updateDocumentTemplate,
  softDeleteTemplate,
  getESignaturesByCase,
  getESignatureById,
  getESignatureByToken,
  insertESignatureRequest,
  updateESignatureStatus,
  insertPortalToken,
  getPortalTokenByValue,
  touchPortalToken,
  revokePortalToken,
  getMessagesByCase,
  getUnreadMessageCount,
  insertMessage,
  markMessageRead,
  insertNotificationSchedule,
  getScheduledNotificationsByEntity,
  cancelNotificationsByEntity,
  getAttorneyAnalytics,
  getMonthlyRevenue,
  checkConflictOfInterest,
  generateNBAComplianceReport,
  type D1Database
} from '../../../core/db/queries';
import {
  generateId,
  generateCaseReference,
  generateInvoiceNumber,
  generateTrustTransactionRef,
  calculateTimeEntryAmount,
  calculateVAT,
  validateNBABarNumber,
  validateYearOfCall,
  nowUTC
} from '../utils';
import {
  analyzeContract,
  assembleDocumentFromTemplate
} from '../../../core/ai-platform-client';
import type {
  LegalClient,
  LegalCase,
  CaseHearing,
  LegalTimeEntry,
  LegalInvoice,
  LegalDocument,
  NBAProfile,
  TrustAccount,
  TrustTransaction,
  TrustTransactionType,
  CaseStatus,
  RetainerLedgerEntry,
  MatterTask,
  MatterExpense,
  ClientIntakeForm,
  ClientIntakeSubmission,
  DocumentAnalysis,
  DocumentTemplate,
  ESignatureRequest,
  ClientPortalToken,
  ClientMessage,
  NotificationSchedule
} from '../../../core/db/schema';
import { TRUST_TRANSACTION_DIRECTION } from '../../../core/db/schema';

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
  TERMII_API_KEY?: string;
  YOURNOTIFY_API_KEY?: string;
  TERMII_SENDER_ID?: string;
  AI_API_URL?: string;
  AI_API_KEY?: string;
  AI_MODEL?: string;
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
// JWT VALIDATION — Delegated to @webwaka/core (canonical)
// Custom validateJWT removed. jwtAuthMiddleware from @webwaka/core is used below.
// Security hardened: 2026-04-01 — Remediation Issue #3
// Blueprint Reference: Part 9.2 — "Edge-based JWT validation"
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

app.use('/api/*', professionalAuthMiddleware);

// Extract role and userId from the authenticated user object into context
app.use('/api/*', async (c, next) => {
  const user = c.get('user' as never) as { userId?: string; role?: string } | undefined;
  if (user) {
    if (user.role) c.set('role' as never, user.role as never);
    if (user.userId) c.set('userId' as never, user.userId as never);
  }
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

    // Fire-and-forget notification — Part 9.1 Nigeria First (Termii SMS)
    if (invoice) {
      const client = await getClientById(c.env.DB, tenantId, invoice.clientId).catch(() => null);
      if (client?.phone) {
        const notifier = createNotificationService(c.env);
        void notifier.notifyInvoicePaid({
          clientName: client.fullName,
          clientPhone: client.phone,
          clientEmail: client.email ?? undefined,
          invoiceNumber: invoice.invoiceNumber,
          totalKobo: invoice.totalKobo,
          currency: invoice.currency,
          paymentReference
        }).catch(err => logger.error('Invoice paid notification failed', { tenantId, error: String(err) }));
      }
    }

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

        // Fire-and-forget notification — Part 9.1 Nigeria First
        const client = await getClientById(c.env.DB, tenantId, invoice?.clientId ?? '').catch(() => null);
        if (client?.phone) {
          const notifier = createNotificationService(c.env);
          void notifier.notifyInvoicePaid({
            clientName: client.fullName,
            clientPhone: client.phone,
            clientEmail: client.email ?? undefined,
            invoiceNumber: invoice?.invoiceNumber ?? invoiceId,
            totalKobo: invoice?.totalKobo ?? 0,
            currency: invoice?.currency ?? 'NGN',
            paymentReference: reference
          }).catch(err => logger.error('Webhook invoice notification failed', { tenantId, error: String(err) }));
        }
      }
    }

    return c.json<ApiResponse>(ok({ received: true }));
  } catch (error) {
    logger.error('Paystack webhook processing error', { error: String(error) });
    return c.json<ApiResponse>(fail(['Webhook processing failed']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// NBA TRUST ACCOUNT LEDGER ROUTES (T-PRO-01)
// Blueprint Reference: Part 10.8 — NBA Compliance (Rule 23: Client Trust Accounts)
// Blueprint Reference: Part 9.2 — Append-Only / Immutable Records
//
// CRITICAL INVARIANT: There are NO PUT/PATCH/DELETE routes for trust_transactions.
// Trust transactions are immutable. An attorney who records an incorrect transaction
// must insert a reversing entry — they cannot modify or delete past entries.
// ─────────────────────────────────────────────────────────────────────────────

// LIST trust accounts for tenant
app.get('/api/legal/trust-accounts', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const includeInactive = c.req.query('includeInactive') === 'true';
  try {
    const accounts = await getTrustAccountsByTenant(c.env.DB, tenantId, includeInactive);
    return c.json<ApiResponse>(ok(accounts));
  } catch (error) {
    logger.error('Failed to list trust accounts', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve trust accounts']), 500);
  }
});

// GET single trust account with balance
app.get('/api/legal/trust-accounts/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const id = c.req.param('id');
  try {
    const account = await getTrustAccountById(c.env.DB, tenantId, id);
    if (!account) return c.json<ApiResponse>(fail(['Trust account not found']), 404);

    const balance = await getTrustAccountBalance(c.env.DB, tenantId, id);
    return c.json<ApiResponse>(ok({ ...account, balance }));
  } catch (error) {
    logger.error('Failed to get trust account', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve trust account']), 500);
  }
});

// CREATE trust account (admin only)
app.post('/api/legal/trust-accounts', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const role = (c.get('role' as never) as string | undefined) ?? '';
  const userId = c.get('userId' as never) as string;

  // Fail-closed: undefined role must NOT pass the admin check
  if (role !== 'admin') {
    return c.json<ApiResponse>(fail(['Insufficient permissions — admin role required to create trust accounts']), 403);
  }

  try {
    const body = await c.req.json<{
      accountName: string;
      bankName: string;
      accountNumber: string;
      description?: string;
    }>();

    if (!body.accountName || !body.bankName || !body.accountNumber) {
      return c.json<ApiResponse>(fail(['accountName, bankName, and accountNumber are required']), 400);
    }

    const now = nowUTC();
    const account: TrustAccount = {
      id: generateId('tac'),
      tenantId,
      accountName: body.accountName,
      bankName: body.bankName,
      accountNumber: body.accountNumber,
      description: body.description ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    await insertTrustAccount(c.env.DB, account);

    await publishEvent(
      createEvent(tenantId, 'legal.trust_account.created', { accountId: account.id, createdBy: userId }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    logger.info('Trust account created', { tenantId, accountId: account.id });
    return c.json<ApiResponse>(ok(account), 201);
  } catch (error) {
    logger.error('Failed to create trust account', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to create trust account']), 500);
  }
});

// UPDATE trust account metadata (name, description, active status) — admin only
app.patch('/api/legal/trust-accounts/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const role = (c.get('role' as never) as string | undefined) ?? '';
  const id = c.req.param('id');

  // Fail-closed: undefined role must NOT pass the admin check
  if (role !== 'admin') {
    return c.json<ApiResponse>(fail(['Insufficient permissions — admin role required']), 403);
  }

  try {
    const account = await getTrustAccountById(c.env.DB, tenantId, id);
    if (!account) return c.json<ApiResponse>(fail(['Trust account not found']), 404);

    const body = await c.req.json<{ accountName?: string; description?: string; isActive?: boolean }>();
    await updateTrustAccount(c.env.DB, tenantId, id, body);

    const updated = await getTrustAccountById(c.env.DB, tenantId, id);
    logger.info('Trust account updated', { tenantId, accountId: id });
    return c.json<ApiResponse>(ok(updated));
  } catch (error) {
    logger.error('Failed to update trust account', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to update trust account']), 500);
  }
});

// GET transactions for a trust account (audit log)
app.get('/api/legal/trust-accounts/:id/transactions', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const accountId = c.req.param('id');
  const limit = parseInt(c.req.query('limit') ?? '100', 10);
  const offset = parseInt(c.req.query('offset') ?? '0', 10);

  try {
    const account = await getTrustAccountById(c.env.DB, tenantId, accountId);
    if (!account) return c.json<ApiResponse>(fail(['Trust account not found']), 404);

    const [transactions, balance] = await Promise.all([
      getTrustTransactionsByAccount(c.env.DB, tenantId, accountId, limit, offset),
      getTrustAccountBalance(c.env.DB, tenantId, accountId)
    ]);

    return c.json<ApiResponse>(ok({ account, transactions, balance }));
  } catch (error) {
    logger.error('Failed to list trust transactions', { tenantId, accountId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve trust transactions']), 500);
  }
});

// RECORD a trust transaction — APPEND-ONLY (no update/delete routes exist)
app.post('/api/legal/trust-accounts/:id/transactions', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  const accountId = c.req.param('id');

  try {
    const account = await getTrustAccountById(c.env.DB, tenantId, accountId);
    if (!account) return c.json<ApiResponse>(fail(['Trust account not found']), 404);
    if (!account.isActive) {
      return c.json<ApiResponse>(fail(['Cannot record transactions on a closed trust account']), 422);
    }

    const body = await c.req.json<{
      transactionType: TrustTransactionType;
      amountKobo: number;
      description: string;
      clientId?: string;
      caseId?: string;
      externalReference?: string;
      transactionDate?: number;
    }>();

    // Validate transaction type
    const validTypes: TrustTransactionType[] = ['DEPOSIT', 'DISBURSEMENT', 'BANK_CHARGES', 'INTEREST', 'TRANSFER_IN', 'TRANSFER_OUT'];
    if (!validTypes.includes(body.transactionType)) {
      return c.json<ApiResponse>(fail([`Invalid transactionType. Must be one of: ${validTypes.join(', ')}`]), 400);
    }
    if (!body.amountKobo || body.amountKobo <= 0) {
      return c.json<ApiResponse>(fail(['amountKobo must be a positive integer']), 400);
    }
    if (!body.description?.trim()) {
      return c.json<ApiResponse>(fail(['description is required']), 400);
    }

    const direction = TRUST_TRANSACTION_DIRECTION[body.transactionType];
    const now = nowUTC();

    // BUG-FIX: Reference must be unique across the ENTIRE tenant (not per-account).
    // The UNIQUE INDEX idx_trust_txn_reference is on (tenantId, reference).
    // Using countTrustTransactionsByAccount would produce collisions when a firm
    // has multiple trust accounts (both at count=0 would generate TT-YYYY-0001).
    const tenantTxnCount = await countTrustTransactionsByTenant(c.env.DB, tenantId);
    const reference = generateTrustTransactionRef(tenantTxnCount + 1);

    const transaction: TrustTransaction = {
      id: generateId('ttx'),
      tenantId,
      accountId,
      transactionType: body.transactionType,
      direction,
      amountKobo: Math.round(body.amountKobo),
      description: body.description.trim(),
      clientId: body.clientId ?? null,
      caseId: body.caseId ?? null,
      reference,
      externalReference: body.externalReference ?? null,
      recordedBy: userId,
      transactionDate: body.transactionDate ?? now,
      createdAt: now
    };

    try {
      await insertTrustTransaction(c.env.DB, transaction);
    } catch (insertError) {
      // Catch reference uniqueness conflicts (SQLITE_CONSTRAINT_UNIQUE).
      // This can happen under concurrent writes — the unique index is the guard.
      const msg = String(insertError);
      if (msg.includes('UNIQUE') || msg.includes('unique')) {
        logger.warn('Trust transaction reference conflict, possible concurrent write', { tenantId, accountId, reference });
        return c.json<ApiResponse>(fail(['Reference conflict — please retry the transaction']), 409);
      }
      throw insertError;
    }

    // Compute new balance for response
    const balance = await getTrustAccountBalance(c.env.DB, tenantId, accountId);

    await publishEvent(
      createEvent(tenantId, 'legal.trust_transaction.recorded', {
        accountId,
        transactionId: transaction.id,
        transactionType: transaction.transactionType,
        direction,
        amountKobo: transaction.amountKobo,
        newBalanceKobo: balance.balanceKobo,
        recordedBy: userId
      }),
      { EVENT_BUS_URL: c.env.EVENT_BUS_URL, EVENT_BUS_API_KEY: c.env.EVENT_BUS_API_KEY }
    );

    logger.info('Trust transaction recorded', {
      tenantId,
      accountId,
      transactionId: transaction.id,
      type: transaction.transactionType,
      amountKobo: transaction.amountKobo,
      direction
    });

    return c.json<ApiResponse>(ok({ transaction, balance }), 201);
  } catch (error) {
    logger.error('Failed to record trust transaction', { tenantId, accountId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to record trust transaction']), 500);
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

// ─────────────────────────────────────────────────────────────────────────────
// RETAINER MANAGEMENT
// Blueprint Reference: Part 10.8 — Retainer Management (append-only ledger)
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/retainer/:clientId', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { clientId } = c.req.param();
  try {
    const [entries, balance] = await Promise.all([
      getRetainerLedgerByClient(c.env.DB, tenantId, clientId),
      getRetainerBalance(c.env.DB, tenantId, clientId)
    ]);
    return c.json<ApiResponse>(ok({ entries, balance }));
  } catch (error) {
    logger.error('Get retainer ledger failed', { tenantId, clientId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to fetch retainer ledger']), 500);
  }
});

app.post('/api/legal/retainer', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  try {
    const body = await c.req.json<{
      clientId: string;
      caseId?: string;
      entryType: 'DEPOSIT' | 'DRAWDOWN' | 'REFUND';
      amountNaira: number;
      description: string;
      invoiceId?: string;
      transactionDate?: number;
    }>();
    if (!body.clientId || !body.entryType || !body.amountNaira || !body.description) {
      return c.json<ApiResponse>(fail(['clientId, entryType, amountNaira, description are required']), 400);
    }
    const entry: RetainerLedgerEntry = {
      id: generateId(),
      tenantId,
      clientId: body.clientId,
      caseId: body.caseId ?? null,
      entryType: body.entryType,
      amountKobo: Math.round(body.amountNaira * 100),
      description: body.description,
      invoiceId: body.invoiceId ?? null,
      recordedBy: userId,
      transactionDate: body.transactionDate ?? Date.now(),
      createdAt: Date.now()
    };
    await insertRetainerEntry(c.env.DB, entry);
    return c.json<ApiResponse>(ok(entry), 201);
  } catch (error) {
    logger.error('Insert retainer entry failed', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to record retainer entry']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK DELEGATION
// Blueprint Reference: Part 10.8 — Task Delegation
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/tasks', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { status, assignedTo, caseId, limit = '50', offset = '0' } = c.req.query();
  try {
    const tasks = await getTasksByTenant(
      c.env.DB, tenantId,
      { status, assignedTo, caseId },
      parseInt(limit), parseInt(offset)
    );
    return c.json<ApiResponse>(ok(tasks));
  } catch (error) {
    logger.error('Get tasks failed', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to fetch tasks']), 500);
  }
});

app.get('/api/legal/tasks/case/:caseId', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { caseId } = c.req.param();
  try {
    const tasks = await getTasksByCase(c.env.DB, tenantId, caseId);
    return c.json<ApiResponse>(ok(tasks));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to fetch case tasks']), 500);
  }
});

app.post('/api/legal/tasks', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  try {
    const body = await c.req.json<{
      caseId: string;
      title: string;
      description?: string;
      assignedTo: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      dueDate?: number;
    }>();
    if (!body.caseId || !body.title || !body.assignedTo) {
      return c.json<ApiResponse>(fail(['caseId, title, assignedTo are required']), 400);
    }
    const now = Date.now();
    const task: MatterTask = {
      id: generateId(),
      tenantId,
      caseId: body.caseId,
      title: body.title,
      description: body.description ?? null,
      assignedTo: body.assignedTo,
      assignedBy: userId,
      priority: body.priority ?? 'MEDIUM',
      status: 'PENDING',
      dueDate: body.dueDate ?? null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    await insertTask(c.env.DB, task);
    if (body.dueDate) {
      await insertNotificationSchedule(c.env.DB, {
        id: generateId(),
        tenantId,
        entityType: 'TASK',
        entityId: task.id,
        notificationType: 'TASK_DUE',
        recipientPhone: null,
        recipientEmail: null,
        message: `Task "${body.title}" is due`,
        scheduledFor: body.dueDate - 86400000,
        sentAt: null,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now
      });
    }
    return c.json<ApiResponse>(ok(task), 201);
  } catch (error) {
    logger.error('Insert task failed', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to create task']), 500);
  }
});

app.patch('/api/legal/tasks/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { id } = c.req.param();
  try {
    const body = await c.req.json<Partial<{
      title: string; description: string; assignedTo: string;
      priority: string; dueDate: number; status: string;
    }>>();
    await updateTask(c.env.DB, tenantId, id, body);
    if (body.status === 'COMPLETED') {
      await updateTaskStatus(c.env.DB, tenantId, id, 'COMPLETED', Date.now());
      await cancelNotificationsByEntity(c.env.DB, tenantId, 'TASK', id);
    }
    const updated = await getTaskById(c.env.DB, tenantId, id);
    return c.json<ApiResponse>(ok(updated));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to update task']), 500);
  }
});

app.delete('/api/legal/tasks/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { id } = c.req.param();
  try {
    await softDeleteTask(c.env.DB, tenantId, id);
    return c.json<ApiResponse>(ok({ deleted: true }));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to delete task']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSE TRACKING
// Blueprint Reference: Part 10.8 — Expense Tracking
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/expenses', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { caseId, invoiced, limit = '50', offset = '0' } = c.req.query();
  try {
    const expenses = await getExpensesByTenant(
      c.env.DB, tenantId,
      {
        caseId,
        invoiced: invoiced !== undefined ? invoiced === 'true' : undefined
      },
      parseInt(limit), parseInt(offset)
    );
    return c.json<ApiResponse>(ok(expenses));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to fetch expenses']), 500);
  }
});

app.get('/api/legal/expenses/case/:caseId', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { caseId } = c.req.param();
  try {
    const expenses = await getExpensesByCase(c.env.DB, tenantId, caseId);
    return c.json<ApiResponse>(ok(expenses));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to fetch case expenses']), 500);
  }
});

app.post('/api/legal/expenses', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  try {
    const body = await c.req.json<{
      caseId: string;
      category: string;
      description: string;
      amountNaira: number;
      receiptUrl?: string;
      expenseDate?: number;
    }>();
    if (!body.caseId || !body.category || !body.description || !body.amountNaira) {
      return c.json<ApiResponse>(fail(['caseId, category, description, amountNaira are required']), 400);
    }
    const now = Date.now();
    const expense: MatterExpense = {
      id: generateId(),
      tenantId,
      caseId: body.caseId,
      category: body.category as MatterExpense['category'],
      description: body.description,
      amountKobo: Math.round(body.amountNaira * 100),
      currency: 'NGN',
      receiptUrl: body.receiptUrl ?? null,
      recordedBy: userId,
      expenseDate: body.expenseDate ?? now,
      invoiced: false,
      invoiceId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    await insertExpense(c.env.DB, expense);
    return c.json<ApiResponse>(ok(expense), 201);
  } catch (error) {
    logger.error('Insert expense failed', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to record expense']), 500);
  }
});

app.delete('/api/legal/expenses/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { id } = c.req.param();
  try {
    await softDeleteExpense(c.env.DB, tenantId, id);
    return c.json<ApiResponse>(ok({ deleted: true }));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to delete expense']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT INTAKE FORMS
// Blueprint Reference: Part 10.8 — Client Intake Forms
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/intake/forms', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  try {
    const forms = await getIntakeFormsByTenant(c.env.DB, tenantId);
    return c.json<ApiResponse>(ok(forms));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to fetch intake forms']), 500);
  }
});

app.get('/api/legal/intake/forms/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { id } = c.req.param();
  try {
    const form = await getIntakeFormById(c.env.DB, tenantId, id);
    if (!form) return c.json<ApiResponse>(fail(['Intake form not found']), 404);
    return c.json<ApiResponse>(ok(form));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to fetch intake form']), 500);
  }
});

app.post('/api/legal/intake/forms', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  try {
    const body = await c.req.json<{
      title: string; description?: string; fields: unknown[];
    }>();
    if (!body.title || !body.fields) {
      return c.json<ApiResponse>(fail(['title and fields are required']), 400);
    }
    const now = Date.now();
    const form: ClientIntakeForm = {
      id: generateId(),
      tenantId,
      title: body.title,
      description: body.description ?? null,
      fields: JSON.stringify(body.fields),
      isActive: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    await insertIntakeForm(c.env.DB, form);
    return c.json<ApiResponse>(ok({ ...form, fields: body.fields }), 201);
  } catch (error) {
    logger.error('Create intake form failed', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to create intake form']), 500);
  }
});

app.patch('/api/legal/intake/forms/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { id } = c.req.param();
  try {
    const body = await c.req.json<Partial<{ title: string; description: string; fields: unknown[]; isActive: boolean }>>();
    await updateIntakeForm(c.env.DB, tenantId, id, {
      title: body.title,
      description: body.description,
      fields: body.fields !== undefined ? JSON.stringify(body.fields) : undefined,
      isActive: body.isActive
    });
    const updated = await getIntakeFormById(c.env.DB, tenantId, id);
    return c.json<ApiResponse>(ok(updated));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to update intake form']), 500);
  }
});

app.delete('/api/legal/intake/forms/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { id } = c.req.param();
  try {
    await softDeleteIntakeForm(c.env.DB, tenantId, id);
    return c.json<ApiResponse>(ok({ deleted: true }));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to delete intake form']), 500);
  }
});

app.get('/api/legal/intake/submissions', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { formId, status, limit = '50', offset = '0' } = c.req.query();
  try {
    const submissions = await getIntakeSubmissionsByTenant(
      c.env.DB, tenantId, { formId, status }, parseInt(limit), parseInt(offset)
    );
    return c.json<ApiResponse>(ok(submissions));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to fetch submissions']), 500);
  }
});

app.post('/api/legal/intake/submit/:formId', async (c) => {
  const { formId } = c.req.param();
  const tenantId = c.req.header('X-Tenant-ID') ?? '';
  try {
    const body = await c.req.json<{
      submitterName: string;
      submitterEmail?: string;
      submitterPhone?: string;
      responses: Record<string, unknown>;
    }>();
    if (!body.submitterName || !body.responses) {
      return c.json<ApiResponse>(fail(['submitterName and responses are required']), 400);
    }
    const form = await getIntakeFormById(c.env.DB, tenantId, formId);
    if (!form || !form.isActive) {
      return c.json<ApiResponse>(fail(['Form not found or inactive']), 404);
    }
    const now = Date.now();
    const submission: ClientIntakeSubmission = {
      id: generateId(),
      tenantId,
      formId,
      submitterName: body.submitterName,
      submitterEmail: body.submitterEmail ?? null,
      submitterPhone: body.submitterPhone ?? null,
      responses: JSON.stringify(body.responses),
      status: 'PENDING',
      reviewedBy: null,
      reviewedAt: null,
      clientId: null,
      createdAt: now,
      updatedAt: now
    };
    await insertIntakeSubmission(c.env.DB, submission);
    return c.json<ApiResponse>(ok({ submissionId: submission.id, message: 'Submission received successfully' }), 201);
  } catch (error) {
    logger.error('Intake submission failed', { formId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to submit form']), 500);
  }
});

app.patch('/api/legal/intake/submissions/:id/review', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  const { id } = c.req.param();
  try {
    const body = await c.req.json<{ status: string; clientId?: string }>();
    if (!['REVIEWED', 'CONVERTED', 'REJECTED'].includes(body.status)) {
      return c.json<ApiResponse>(fail(['Invalid status']), 400);
    }
    await updateIntakeSubmissionStatus(c.env.DB, tenantId, id, body.status, userId, body.clientId);
    const updated = await getIntakeSubmissionById(c.env.DB, tenantId, id);
    return c.json<ApiResponse>(ok(updated));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to update submission']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AI CONTRACT ANALYSIS
// Blueprint Reference: Part 10.8 — AI Contract Analysis
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/legal/ai/analyze/:documentId', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  const { documentId } = c.req.param();
  try {
    const body = await c.req.json<{ caseId: string; documentText: string; documentTitle?: string }>();
    if (!body.caseId || !body.documentText) {
      return c.json<ApiResponse>(fail(['caseId and documentText are required']), 400);
    }
    const now = Date.now();
    const analysis: DocumentAnalysis = {
      id: generateId(),
      tenantId,
      documentId,
      caseId: body.caseId,
      analysisType: 'CONTRACT_REVIEW',
      status: 'PROCESSING',
      summary: null,
      riskyClauses: null,
      keyTerms: null,
      recommendations: null,
      rawResponse: null,
      analyzedBy: userId,
      completedAt: null,
      createdAt: now,
      updatedAt: now
    };
    await insertDocumentAnalysis(c.env.DB, analysis);

    const result = await analyzeContract(
      { AI_API_URL: c.env.AI_API_URL, AI_API_KEY: c.env.AI_API_KEY, AI_MODEL: c.env.AI_MODEL },
      body.documentText,
      body.documentTitle ?? 'Legal Document'
    );

    if (result) {
      await updateDocumentAnalysis(c.env.DB, tenantId, analysis.id, {
        status: 'COMPLETED',
        summary: result.summary,
        riskyClauses: JSON.stringify(result.riskyClauses),
        keyTerms: JSON.stringify(result.keyTerms),
        recommendations: JSON.stringify(result.recommendations),
        completedAt: Date.now()
      });
      return c.json<ApiResponse>(ok({
        analysisId: analysis.id,
        status: 'COMPLETED',
        summary: result.summary,
        riskyClauses: result.riskyClauses,
        keyTerms: result.keyTerms,
        recommendations: result.recommendations
      }));
    } else {
      await updateDocumentAnalysis(c.env.DB, tenantId, analysis.id, {
        status: 'FAILED',
        rawResponse: 'AI platform not configured or unavailable'
      });
      return c.json<ApiResponse>(ok({
        analysisId: analysis.id,
        status: 'FAILED',
        message: 'AI analysis unavailable. Configure AI_API_URL and AI_API_KEY environment variables.'
      }));
    }
  } catch (error) {
    logger.error('AI analysis failed', { tenantId, documentId, error: String(error) });
    return c.json<ApiResponse>(fail(['Document analysis failed']), 500);
  }
});

app.get('/api/legal/ai/analyses/case/:caseId', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { caseId } = c.req.param();
  try {
    const analyses = await getAnalysisByCase(c.env.DB, tenantId, caseId);
    return c.json<ApiResponse>(ok(analyses.map(a => ({
      ...a,
      riskyClauses: a.riskyClauses ? JSON.parse(a.riskyClauses) as unknown[] : [],
      keyTerms: a.keyTerms ? JSON.parse(a.keyTerms) as unknown[] : [],
      recommendations: a.recommendations ? JSON.parse(a.recommendations) as unknown[] : []
    }))));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to fetch analyses']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT TEMPLATES & ASSEMBLY
// Blueprint Reference: Part 10.8 — Document Assembly
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/templates', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  try {
    const templates = await getTemplatesByTenant(c.env.DB, tenantId);
    return c.json<ApiResponse>(ok(templates.map(t => ({
      ...t,
      variables: JSON.parse(t.variables) as unknown[]
    }))));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to fetch templates']), 500);
  }
});

app.get('/api/legal/templates/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { id } = c.req.param();
  try {
    const template = await getTemplateById(c.env.DB, tenantId, id);
    if (!template) return c.json<ApiResponse>(fail(['Template not found']), 404);
    return c.json<ApiResponse>(ok({ ...template, variables: JSON.parse(template.variables) as unknown[] }));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to fetch template']), 500);
  }
});

app.post('/api/legal/templates', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  try {
    const body = await c.req.json<{
      title: string; templateType: string; content: string; variables: string[];
    }>();
    if (!body.title || !body.templateType || !body.content) {
      return c.json<ApiResponse>(fail(['title, templateType, content are required']), 400);
    }
    const now = Date.now();
    const template: DocumentTemplate = {
      id: generateId(),
      tenantId,
      title: body.title,
      templateType: body.templateType as DocumentTemplate['templateType'],
      content: body.content,
      variables: JSON.stringify(body.variables ?? []),
      isActive: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    await insertDocumentTemplate(c.env.DB, template);
    return c.json<ApiResponse>(ok({ ...template, variables: body.variables ?? [] }), 201);
  } catch (error) {
    logger.error('Create template failed', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to create template']), 500);
  }
});

app.patch('/api/legal/templates/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { id } = c.req.param();
  try {
    const body = await c.req.json<Partial<{ title: string; content: string; variables: string[]; isActive: boolean }>>();
    await updateDocumentTemplate(c.env.DB, tenantId, id, {
      title: body.title,
      content: body.content,
      variables: body.variables !== undefined ? JSON.stringify(body.variables) : undefined,
      isActive: body.isActive
    });
    const updated = await getTemplateById(c.env.DB, tenantId, id);
    return c.json<ApiResponse>(ok(updated));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to update template']), 500);
  }
});

app.delete('/api/legal/templates/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { id } = c.req.param();
  try {
    await softDeleteTemplate(c.env.DB, tenantId, id);
    return c.json<ApiResponse>(ok({ deleted: true }));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to delete template']), 500);
  }
});

app.post('/api/legal/templates/:id/assemble', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { id } = c.req.param();
  try {
    const body = await c.req.json<{ variables: Record<string, string> }>();
    const template = await getTemplateById(c.env.DB, tenantId, id);
    if (!template) return c.json<ApiResponse>(fail(['Template not found']), 404);
    const assembled = assembleDocumentFromTemplate(template.content, body.variables ?? {});
    return c.json<ApiResponse>(ok({
      templateId: id,
      templateTitle: template.title,
      assembledContent: assembled,
      wordCount: assembled.split(/\s+/).length
    }));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to assemble document']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// E-SIGNATURE REQUESTS
// Blueprint Reference: Part 10.8 — E-Signature Integration
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/esignatures/case/:caseId', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { caseId } = c.req.param();
  try {
    const signatures = await getESignaturesByCase(c.env.DB, tenantId, caseId);
    return c.json<ApiResponse>(ok(signatures));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to fetch e-signature requests']), 500);
  }
});

app.post('/api/legal/esignatures', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  try {
    const body = await c.req.json<{
      documentId: string; caseId: string;
      signerName: string; signerEmail: string; signerPhone?: string;
      expiresInDays?: number;
    }>();
    if (!body.documentId || !body.caseId || !body.signerName || !body.signerEmail) {
      return c.json<ApiResponse>(fail(['documentId, caseId, signerName, signerEmail are required']), 400);
    }
    const now = Date.now();
    const expiresAt = now + (body.expiresInDays ?? 30) * 86400000;
    const accessToken = generateId() + generateId();
    const request: ESignatureRequest = {
      id: generateId(),
      tenantId,
      documentId: body.documentId,
      caseId: body.caseId,
      requestedBy: userId,
      signerName: body.signerName,
      signerEmail: body.signerEmail,
      signerPhone: body.signerPhone ?? null,
      status: 'PENDING',
      signedAt: null,
      declinedAt: null,
      expiresAt,
      signatureData: null,
      accessToken,
      createdAt: now,
      updatedAt: now
    };
    await insertESignatureRequest(c.env.DB, request);
    return c.json<ApiResponse>(ok({ ...request, signingUrl: `/sign/${accessToken}` }), 201);
  } catch (error) {
    logger.error('Create e-signature failed', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to create e-signature request']), 500);
  }
});

app.post('/api/legal/esignatures/sign/:token', async (c) => {
  const { token } = c.req.param();
  try {
    const body = await c.req.json<{ signatureData: string; action: 'SIGN' | 'DECLINE' }>();
    const request = await getESignatureByToken(c.env.DB, token);
    if (!request) return c.json<ApiResponse>(fail(['Signing request not found']), 404);
    if (request.status !== 'PENDING' && request.status !== 'SENT' && request.status !== 'VIEWED') {
      return c.json<ApiResponse>(fail([`Request is already ${request.status}`]), 400);
    }
    if (Date.now() > request.expiresAt) {
      await updateESignatureStatus(c.env.DB, request.id, 'EXPIRED');
      return c.json<ApiResponse>(fail(['Signing request has expired']), 410);
    }
    const now = Date.now();
    if (body.action === 'SIGN') {
      await updateESignatureStatus(c.env.DB, request.id, 'SIGNED', now, undefined, body.signatureData);
      return c.json<ApiResponse>(ok({ signed: true, signedAt: now }));
    } else {
      await updateESignatureStatus(c.env.DB, request.id, 'DECLINED', undefined, now);
      return c.json<ApiResponse>(ok({ declined: true, declinedAt: now }));
    }
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to process signature']), 500);
  }
});

app.get('/api/legal/esignatures/view/:token', async (c) => {
  const { token } = c.req.param();
  try {
    const request = await getESignatureByToken(c.env.DB, token);
    if (!request) return c.json<ApiResponse>(fail(['Signing request not found']), 404);
    if (request.status === 'PENDING') {
      await updateESignatureStatus(c.env.DB, request.id, 'VIEWED');
    }
    return c.json<ApiResponse>(ok({
      id: request.id,
      signerName: request.signerName,
      status: request.status,
      expiresAt: request.expiresAt,
      documentId: request.documentId
    }));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to view signing request']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SECURE CLIENT PORTAL
// Blueprint Reference: Part 10.8 — Secure Client Portal
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/legal/portal/access/:clientId', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  try {
    const client = await getClientById(c.env.DB, tenantId, c.req.param('clientId'));
    if (!client) return c.json<ApiResponse>(fail(['Client not found']), 404);
    await revokePortalToken(c.env.DB, tenantId, client.id);
    const now = Date.now();
    const portalToken: ClientPortalToken = {
      id: generateId(),
      tenantId,
      clientId: client.id,
      token: generateId() + generateId() + generateId(),
      expiresAt: now + 30 * 86400000,
      lastUsedAt: null,
      isRevoked: false,
      createdAt: now
    };
    await insertPortalToken(c.env.DB, portalToken);
    return c.json<ApiResponse>(ok({
      accessToken: portalToken.token,
      expiresAt: portalToken.expiresAt,
      portalUrl: `/client-portal/${portalToken.token}`
    }));
  } catch (error) {
    logger.error('Create portal token failed', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to create portal access']), 500);
  }
});

app.get('/api/legal/portal/me', async (c) => {
  const authHeader = c.req.header('X-Portal-Token');
  if (!authHeader) return c.json<ApiResponse>(fail(['Portal token required']), 401);
  try {
    const tokenRecord = await getPortalTokenByValue(c.env.DB, authHeader);
    if (!tokenRecord || tokenRecord.isRevoked || Date.now() > tokenRecord.expiresAt) {
      return c.json<ApiResponse>(fail(['Invalid or expired portal token']), 401);
    }
    await touchPortalToken(c.env.DB, tokenRecord.id);
    const client = await getClientById(c.env.DB, tokenRecord.tenantId, tokenRecord.clientId);
    if (!client) return c.json<ApiResponse>(fail(['Client not found']), 404);
    const [cases, invoices] = await Promise.all([
      getCasesByTenant(c.env.DB, tokenRecord.tenantId, {}, 20, 0),
      getInvoicesByTenant(c.env.DB, tokenRecord.tenantId, {}, 20, 0)
    ]);
    const clientCases = cases.filter(cs => cs.clientId === client.id);
    const clientInvoices = invoices.filter(inv => inv.clientId === client.id);
    return c.json<ApiResponse>(ok({
      client: { id: client.id, fullName: client.fullName, phone: client.phone, email: client.email },
      cases: clientCases.map(cs => ({
        id: cs.id, title: cs.title, status: cs.status,
        caseReference: cs.caseReference, nextHearingDate: cs.nextHearingDate
      })),
      invoices: clientInvoices.map(inv => ({
        id: inv.id, invoiceNumber: inv.invoiceNumber, totalKobo: inv.totalKobo,
        status: inv.status, dueDate: inv.dueDate
      }))
    }));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Portal access failed']), 500);
  }
});

app.post('/api/legal/portal/revoke/:clientId', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { clientId } = c.req.param();
  try {
    await revokePortalToken(c.env.DB, tenantId, clientId);
    return c.json<ApiResponse>(ok({ revoked: true }));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to revoke portal access']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SECURE MESSAGING
// Blueprint Reference: Part 10.8 — Secure Messaging
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/messages/case/:caseId', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { caseId } = c.req.param();
  const { limit = '100', offset = '0' } = c.req.query();
  try {
    const messages = await getMessagesByCase(c.env.DB, tenantId, caseId, parseInt(limit), parseInt(offset));
    return c.json<ApiResponse>(ok(messages));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to fetch messages']), 500);
  }
});

app.get('/api/legal/messages/unread', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  try {
    const count = await getUnreadMessageCount(c.env.DB, tenantId, userId);
    return c.json<ApiResponse>(ok({ unreadCount: count }));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to fetch unread count']), 500);
  }
});

app.post('/api/legal/messages', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  try {
    const body = await c.req.json<{
      caseId: string; recipientId: string; senderType?: string;
      subject?: string; body: string; parentMessageId?: string;
    }>();
    if (!body.caseId || !body.recipientId || !body.body) {
      return c.json<ApiResponse>(fail(['caseId, recipientId, body are required']), 400);
    }
    const now = Date.now();
    const message: ClientMessage = {
      id: generateId(),
      tenantId,
      caseId: body.caseId,
      senderId: userId,
      senderType: (body.senderType as ClientMessage['senderType']) ?? 'ATTORNEY',
      recipientId: body.recipientId,
      subject: body.subject ?? null,
      body: body.body,
      isRead: false,
      readAt: null,
      parentMessageId: body.parentMessageId ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    await insertMessage(c.env.DB, message);
    return c.json<ApiResponse>(ok(message), 201);
  } catch (error) {
    logger.error('Send message failed', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to send message']), 500);
  }
});

app.post('/api/legal/messages/:id/read', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { id } = c.req.param();
  try {
    await markMessageRead(c.env.DB, tenantId, id);
    return c.json<ApiResponse>(ok({ read: true }));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to mark message read']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CONFLICT OF INTEREST CHECKER
// Blueprint Reference: Part 10.8 — Conflict of Interest Checker
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/legal/conflict-check', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  try {
    const body = await c.req.json<{
      fullName: string; phone?: string; email?: string;
    }>();
    if (!body.fullName) {
      return c.json<ApiResponse>(fail(['fullName is required']), 400);
    }
    const conflicts = await checkConflictOfInterest(
      c.env.DB, tenantId, body.fullName, body.phone ?? '', body.email ?? null
    );
    return c.json<ApiResponse>(ok({
      hasConflict: conflicts.length > 0,
      conflicts,
      checked: { fullName: body.fullName, phone: body.phone, email: body.email }
    }));
  } catch (error) {
    logger.error('Conflict check failed', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Conflict check failed']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// COURT CALENDAR — iCal Export
// Blueprint Reference: Part 10.8 — Court Calendar Sync
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/calendar/ical', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  try {
    const cases = await getCasesByTenant(c.env.DB, tenantId, {}, 500, 0);
    const activeCases = cases.filter(cs =>
      ['INTAKE','ACTIVE','PENDING_COURT','ADJOURNED'].includes(cs.status) && cs.nextHearingDate
    );

    let ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WebWaka Professional//Legal Practice//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:WebWaka Court Dates',
      'X-WR-TIMEZONE:Africa/Lagos'
    ].join('\r\n');

    for (const cs of activeCases) {
      if (!cs.nextHearingDate) continue;
      const hearingDate = new Date(cs.nextHearingDate);
      const dtStart = formatICalDate(hearingDate);
      const uid = `${cs.id}-hearing@webwaka.pro`;
      ical += '\r\n' + [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART:${dtStart}`,
        `DTEND:${formatICalDate(new Date(cs.nextHearingDate + 3600000))}`,
        `SUMMARY:${escapeICalText(`Court: ${cs.title}`)}`,
        `DESCRIPTION:${escapeICalText(`Case Ref: ${cs.caseReference}\\nCourt: ${cs.courtName ?? 'TBC'}\\nSuit No: ${cs.suitNumber ?? 'N/A'}`)}`,
        `LOCATION:${escapeICalText(cs.courtName ?? 'TBC')}`,
        `STATUS:CONFIRMED`,
        `TRANSP:OPAQUE`,
        'END:VEVENT'
      ].join('\r\n');
    }

    ical += '\r\nEND:VCALENDAR';

    return new Response(ical, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="webwaka-court-calendar.ics"'
      }
    });
  } catch (error) {
    logger.error('Calendar export failed', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Calendar export failed']), 500);
  }
});

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
function escapeICalText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE ANALYTICS
// Blueprint Reference: Part 10.8 — Performance Analytics
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/analytics/attorneys', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { startDate, endDate } = c.req.query();
  try {
    const now = Date.now();
    const start = startDate ? parseInt(startDate) : now - 30 * 86400000;
    const end = endDate ? parseInt(endDate) : now;
    const analytics = await getAttorneyAnalytics(c.env.DB, tenantId, start, end);
    return c.json<ApiResponse>(ok({
      period: { start, end },
      attorneys: analytics.map(a => ({
        ...a,
        billableHours: (a.billableMinutes / 60).toFixed(2),
        totalHours: (a.totalMinutes / 60).toFixed(2),
        utilizationRate: a.totalMinutes > 0
          ? ((a.billableMinutes / a.totalMinutes) * 100).toFixed(1)
          : '0.0',
        totalBilledNaira: a.totalBilledKobo / 100
      }))
    }));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to fetch attorney analytics']), 500);
  }
});

app.get('/api/legal/analytics/revenue', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { months = '6' } = c.req.query();
  try {
    const revenue = await getMonthlyRevenue(c.env.DB, tenantId, parseInt(months));
    return c.json<ApiResponse>(ok({
      months: revenue.map(r => ({
        ...r,
        invoicedNaira: r.invoicedKobo / 100,
        collectedNaira: r.collectedKobo / 100,
        outstandingNaira: r.outstandingKobo / 100,
        collectionRate: r.invoicedKobo > 0
          ? ((r.collectedKobo / r.invoicedKobo) * 100).toFixed(1)
          : '0.0'
      }))
    }));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to fetch revenue analytics']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPLIANCE REPORTING
// Blueprint Reference: Part 10.8 — Compliance Reporting
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/compliance/report', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  try {
    const report = await generateNBAComplianceReport(c.env.DB, tenantId);
    return c.json<ApiResponse>(ok({
      ...report,
      totalTrustBalanceNaira: report.totalTrustBalanceKobo / 100,
      generatedAt: new Date(report.reportDate).toISOString(),
      complianceStatus: {
        nbaVerification: report.verifiedAttorneys === report.totalAttorneys
          ? 'COMPLIANT' : 'ATTENTION_NEEDED',
        expiringCertificates: report.expiringCertificates > 0
          ? 'ATTENTION_NEEDED' : 'COMPLIANT',
        trustAccounts: report.totalTrustAccounts > 0
          ? 'COMPLIANT' : 'NOT_APPLICABLE'
      }
    }));
  } catch (error) {
    logger.error('Compliance report failed', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to generate compliance report']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATED REMINDERS / NOTIFICATION SCHEDULES
// Blueprint Reference: Part 10.8 — Automated Reminders
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/legal/reminders', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  try {
    const body = await c.req.json<{
      entityType: string; entityId: string;
      notificationType: string; message: string;
      scheduledFor: number; recipientPhone?: string; recipientEmail?: string;
    }>();
    if (!body.entityType || !body.entityId || !body.notificationType || !body.message || !body.scheduledFor) {
      return c.json<ApiResponse>(fail(['entityType, entityId, notificationType, message, scheduledFor are required']), 400);
    }
    const now = Date.now();
    const schedule: NotificationSchedule = {
      id: generateId(),
      tenantId,
      entityType: body.entityType,
      entityId: body.entityId,
      notificationType: body.notificationType as NotificationSchedule['notificationType'],
      recipientPhone: body.recipientPhone ?? null,
      recipientEmail: body.recipientEmail ?? null,
      message: body.message,
      scheduledFor: body.scheduledFor,
      sentAt: null,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now
    };
    await insertNotificationSchedule(c.env.DB, schedule);
    return c.json<ApiResponse>(ok(schedule), 201);
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to schedule reminder']), 500);
  }
});

app.get('/api/legal/reminders/:entityType/:entityId', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { entityType, entityId } = c.req.param();
  try {
    const schedules = await getScheduledNotificationsByEntity(c.env.DB, tenantId, entityType, entityId);
    return c.json<ApiResponse>(ok(schedules));
  } catch (error) {
    return c.json<ApiResponse>(fail(['Failed to fetch reminders']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNTING EXPORT (Xero/QuickBooks compatible CSV)
// Blueprint Reference: Part 10.8 — Integration with Accounting Software
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/legal/accounting/export', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { format = 'csv', startDate, endDate } = c.req.query();
  try {
    const now = Date.now();
    const start = startDate ? parseInt(startDate) : now - 90 * 86400000;
    const end = endDate ? parseInt(endDate) : now;
    const [invoices, clients] = await Promise.all([
      getInvoicesByTenant(c.env.DB, tenantId, {}, 1000, 0),
      getClientsByTenant(c.env.DB, tenantId, {}, 1000, 0)
    ]);
    const clientMap = new Map(clients.map(cl => [cl.id, cl]));
    const filtered = invoices.filter(inv => inv.createdAt >= start && inv.createdAt <= end);

    if (format === 'json') {
      return c.json<ApiResponse>(ok({
        exportedAt: now,
        period: { start, end },
        invoices: filtered.map(inv => ({
          invoiceNumber: inv.invoiceNumber,
          clientName: clientMap.get(inv.clientId)?.fullName ?? 'Unknown',
          status: inv.status,
          subtotalNaira: inv.subtotalKobo / 100,
          vatNaira: inv.vatKobo / 100,
          totalNaira: inv.totalKobo / 100,
          dueDate: new Date(inv.dueDate).toISOString().split('T')[0],
          paidAt: inv.paidAt ? new Date(inv.paidAt).toISOString().split('T')[0] : null
        }))
      }));
    }

    const header = '*InvoiceNumber,*ContactName,*InvoiceDate,*DueDate,*Total,*TaxAmount,*CurrencyCode,InvoiceStatus,PaymentReference\n';
    const rows = filtered.map(inv => {
      const client = clientMap.get(inv.clientId);
      return [
        inv.invoiceNumber,
        `"${client?.fullName ?? 'Unknown'}"`,
        new Date(inv.createdAt).toISOString().split('T')[0],
        new Date(inv.dueDate).toISOString().split('T')[0],
        (inv.totalKobo / 100).toFixed(2),
        (inv.vatKobo / 100).toFixed(2),
        'NGN',
        inv.status,
        inv.paymentReference ?? ''
      ].join(',');
    }).join('\n');
    const csv = header + rows;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="webwaka-invoices-${new Date(now).toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    logger.error('Accounting export failed', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Accounting export failed']), 500);
  }
});

export default app;
