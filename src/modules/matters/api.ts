/**
 * WebWaka Professional — Matters API
 * QA Reference: QA-PRO-1, QA-PRO-2, QA-PRO-3
 *
 * Manages legal matters (cases) with full CRUD, time-based billing,
 * and AI contract analysis. All data is scoped by tenantId (multi-tenancy).
 *
 * Security:
 *   - All /api/matters/* routes require a valid JWT (401 if absent/invalid).
 *   - Mutating operations require the `manage:matters` permission (403 otherwise).
 *   - Tenant isolation: every query filters by tenantId extracted from the JWT.
 *
 * AI Resilience:
 *   - Contract analysis gracefully degrades when the AI platform is unavailable
 *     (503/network error), returning a clear retryable error message instead of
 *     crashing. The DB record is always written, preserving auditability.
 */

import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { professionalAuthMiddleware } from '../../core/auth-middleware';
import { createLogger } from '../../core/logger';
import { getAICompletion, analyzeContract } from '../../core/ai-platform-client';
import type { AIEnv } from '../../core/ai-platform-client';
import { generateId, nowUTC } from '../../core/ids';
import { calculateVAT } from '../../core/money';
import type { D1Database } from '../../core/db/queries';

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface MattersEnv {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT?: string;
  AI_API_URL?: string;
  AI_API_KEY?: string;
  AI_MODEL?: string;
  DOCUMENTS?: R2Bucket;
  TENANT_CONFIG?: KVNamespace;
  EVENTS?: KVNamespace;
}

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

interface ApiResponse<T = unknown> {
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
// MATTER STATUS / TYPE ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export type MatterStatus =
  | 'INTAKE'
  | 'ACTIVE'
  | 'PENDING_COURT'
  | 'ADJOURNED'
  | 'SETTLED'
  | 'CLOSED'
  | 'ARCHIVED';

export type MatterType =
  | 'CIVIL'
  | 'CRIMINAL'
  | 'CORPORATE'
  | 'FAMILY'
  | 'LAND_PROPERTY'
  | 'EMPLOYMENT'
  | 'INTELLECTUAL_PROPERTY'
  | 'CONSTITUTIONAL'
  | 'ARBITRATION'
  | 'OTHER';

const VALID_STATUSES: MatterStatus[] = [
  'INTAKE', 'ACTIVE', 'PENDING_COURT', 'ADJOURNED', 'SETTLED', 'CLOSED', 'ARCHIVED'
];

const VALID_TYPES: MatterType[] = [
  'CIVIL', 'CRIMINAL', 'CORPORATE', 'FAMILY', 'LAND_PROPERTY',
  'EMPLOYMENT', 'INTELLECTUAL_PROPERTY', 'CONSTITUTIONAL', 'ARBITRATION', 'OTHER'
];

// ─────────────────────────────────────────────────────────────────────────────
// MATTER SCHEMA (stored in DB as matters table)
// ─────────────────────────────────────────────────────────────────────────────

export interface Matter {
  id: string;
  tenantId: string;
  title: string;
  matterType: MatterType;
  status: MatterStatus;
  clientId: string;
  leadAttorneyId: string;
  description: string | null;
  courtName: string | null;
  suitNumber: string | null;
  opposingParty: string | null;
  agreedFeeKobo: number | null;
  hourlyRateKobo: number | null;
  currency: string;
  openedAt: number;
  closedAt: number | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MATTER TIME ENTRY SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

export interface MatterTimeEntry {
  id: string;
  tenantId: string;
  matterId: string;
  attorneyId: string;
  description: string;
  durationMinutes: number;
  hourlyRateKobo: number;
  amountKobo: number;
  isBillable: boolean;
  invoiced: boolean;
  workDate: number;
  createdAt: number;
  updatedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MATTER INVOICE SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

export interface MatterInvoice {
  id: string;
  tenantId: string;
  matterId: string;
  clientId: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  subtotalKobo: number;
  vatKobo: number;
  totalKobo: number;
  currency: string;
  dueDate: number;
  paidAt: number | null;
  notes: string | null;
  lineItems: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MATTER CONTRACT ANALYSIS RECORD (stores results in document_metadata style)
// ─────────────────────────────────────────────────────────────────────────────

export interface MatterAnalysis {
  id: string;
  tenantId: string;
  matterId: string;
  documentText: string;
  documentTitle: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  summary: string | null;
  riskyClauses: string | null;
  keyTerms: string | null;
  recommendations: string | null;
  analyzedBy: string;
  errorMessage: string | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// BILLING CALCULATION — pure functions (QA-PRO-2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the billable amount for a single time entry.
 * Uses integer kobo arithmetic to avoid floating-point errors.
 *
 * Formula: floor((durationMinutes / 60) * hourlyRateKobo)
 *
 * @param durationMinutes - Time worked in minutes
 * @param hourlyRateKobo  - Rate per hour in kobo (integer)
 * @returns Amount in kobo (integer)
 */
export function calculateMatterTimeAmount(durationMinutes: number, hourlyRateKobo: number): number {
  if (durationMinutes <= 0 || hourlyRateKobo <= 0) return 0;
  return Math.floor((durationMinutes / 60) * hourlyRateKobo);
}

/**
 * Build an invoice from a list of unbilled time entries.
 * Calculates subtotal (sum of time amounts), VAT (7.5%), and total.
 * All values are integers in kobo.
 *
 * @param entries     - Unbilled time entries for the matter
 * @param currency    - Currency code (default NGN)
 * @returns Invoice totals { subtotalKobo, vatKobo, totalKobo, lineItems }
 */
export function buildInvoiceTotals(
  entries: Pick<MatterTimeEntry, 'durationMinutes' | 'hourlyRateKobo' | 'amountKobo' | 'isBillable' | 'description' | 'workDate'>[],
  currency = 'NGN'
): { subtotalKobo: number; vatKobo: number; totalKobo: number; lineItems: string; currency: string } {
  const billable = entries.filter(e => e.isBillable);
  const subtotalKobo = billable.reduce((sum, e) => sum + e.amountKobo, 0);
  const vatKobo = calculateVAT(subtotalKobo);
  const totalKobo = subtotalKobo + vatKobo;
  const lineItems = JSON.stringify(
    billable.map(e => ({
      description: e.description,
      durationMinutes: e.durationMinutes,
      hourlyRateKobo: e.hourlyRateKobo,
      amountKobo: e.amountKobo,
      workDate: e.workDate
    }))
  );
  return { subtotalKobo, vatKobo, totalKobo, lineItems, currency };
}

/**
 * Generate a matters invoice number: MI-YYYY-NNN
 */
export function generateMatterInvoiceNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `MI-${year}-${String(sequence).padStart(3, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION MIDDLEWARE — manage:matters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Require the `manage:matters` permission.
 *
 * After jwtAuthMiddleware, the canonical user object is stored in the Hono
 * context under the key `'user'` with shape:
 *   { userId, role, tenantId, permissions: string[] }
 *
 * Grants access when ANY of these conditions holds:
 *   1. user.permissions array includes `'manage:matters'`
 *   2. user.role is `'admin'` or `'attorney'`
 *
 * Returns 403 Forbidden if neither condition is met.
 */
export const requireManageMatters: MiddlewareHandler = async (c, next) => {
  const user = c.get('user' as never) as Record<string, unknown> | undefined;
  const role = (user?.role as string | undefined) ?? '';
  const permissions = (user?.permissions as string[] | undefined) ?? [];

  const hasPermission =
    permissions.includes('manage:matters') ||
    role === 'admin' ||
    role === 'attorney';

  if (!hasPermission) {
    return c.json<ApiResponse>(fail(['Forbidden: manage:matters permission required']), 403);
  }
  return next();
};

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY DATA STORE (used in tests — swapped for D1 in production)
// In production, all operations hit c.env.DB (D1). In tests we inject a mock.
// ─────────────────────────────────────────────────────────────────────────────

// D1 query helpers — these functions translate app logic into D1 SQL statements.

async function dbGetMatter(db: D1Database, tenantId: string, id: string): Promise<Matter | null> {
  return db.prepare(
    'SELECT * FROM matters WHERE id = ? AND tenantId = ? AND deletedAt IS NULL'
  ).bind(id, tenantId).first<Matter>();
}

async function dbListMatters(db: D1Database, tenantId: string): Promise<Matter[]> {
  const result = await db.prepare(
    'SELECT * FROM matters WHERE tenantId = ? AND deletedAt IS NULL ORDER BY createdAt DESC'
  ).bind(tenantId).all<Matter>();
  return result.results ?? [];
}

async function dbInsertMatter(db: D1Database, matter: Matter): Promise<void> {
  await db.prepare(`
    INSERT INTO matters (
      id, tenantId, title, matterType, status, clientId, leadAttorneyId,
      description, courtName, suitNumber, opposingParty,
      agreedFeeKobo, hourlyRateKobo, currency,
      openedAt, closedAt, createdAt, updatedAt, deletedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
  `).bind(
    matter.id, matter.tenantId, matter.title, matter.matterType,
    matter.status, matter.clientId, matter.leadAttorneyId,
    matter.description, matter.courtName, matter.suitNumber,
    matter.opposingParty, matter.agreedFeeKobo, matter.hourlyRateKobo,
    matter.currency, matter.openedAt, matter.closedAt,
    matter.createdAt, matter.updatedAt
  ).run();
}

async function dbUpdateMatter(
  db: D1Database,
  tenantId: string,
  id: string,
  updates: Partial<Matter>
): Promise<void> {
  const fields = Object.entries(updates)
    .filter(([k]) => !['id', 'tenantId', 'createdAt'].includes(k))
    .map(([k]) => `${k} = ?`).join(', ');
  const values = Object.entries(updates)
    .filter(([k]) => !['id', 'tenantId', 'createdAt'].includes(k))
    .map(([, v]) => v);
  await db.prepare(`UPDATE matters SET ${fields} WHERE id = ? AND tenantId = ?`)
    .bind(...values, id, tenantId).run();
}

async function dbSoftDeleteMatter(db: D1Database, tenantId: string, id: string): Promise<void> {
  await db.prepare(
    'UPDATE matters SET deletedAt = ? WHERE id = ? AND tenantId = ?'
  ).bind(Date.now(), id, tenantId).run();
}

async function dbGetTimeEntries(db: D1Database, tenantId: string, matterId: string): Promise<MatterTimeEntry[]> {
  const result = await db.prepare(
    'SELECT * FROM matter_time_entries WHERE tenantId = ? AND matterId = ? ORDER BY workDate DESC'
  ).bind(tenantId, matterId).all<MatterTimeEntry>();
  return result.results ?? [];
}

async function dbInsertTimeEntry(db: D1Database, entry: MatterTimeEntry): Promise<void> {
  await db.prepare(`
    INSERT INTO matter_time_entries (
      id, tenantId, matterId, attorneyId, description,
      durationMinutes, hourlyRateKobo, amountKobo,
      isBillable, invoiced, workDate, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    entry.id, entry.tenantId, entry.matterId, entry.attorneyId,
    entry.description, entry.durationMinutes, entry.hourlyRateKobo,
    entry.amountKobo, entry.isBillable ? 1 : 0, entry.invoiced ? 1 : 0,
    entry.workDate, entry.createdAt, entry.updatedAt
  ).run();
}

async function dbGetUnbilledTimeEntries(db: D1Database, tenantId: string, matterId: string): Promise<MatterTimeEntry[]> {
  const result = await db.prepare(
    'SELECT * FROM matter_time_entries WHERE tenantId = ? AND matterId = ? AND invoiced = 0 AND isBillable = 1'
  ).bind(tenantId, matterId).all<MatterTimeEntry>();
  return result.results ?? [];
}

async function dbMarkTimeEntriesInvoiced(db: D1Database, tenantId: string, matterId: string): Promise<void> {
  await db.prepare(
    'UPDATE matter_time_entries SET invoiced = 1, updatedAt = ? WHERE tenantId = ? AND matterId = ? AND invoiced = 0'
  ).bind(Date.now(), tenantId, matterId).run();
}

async function dbGetInvoices(db: D1Database, tenantId: string, matterId: string): Promise<MatterInvoice[]> {
  const result = await db.prepare(
    'SELECT * FROM matter_invoices WHERE tenantId = ? AND matterId = ? AND deletedAt IS NULL ORDER BY createdAt DESC'
  ).bind(tenantId, matterId).all<MatterInvoice>();
  return result.results ?? [];
}

async function dbInsertInvoice(db: D1Database, invoice: MatterInvoice): Promise<void> {
  await db.prepare(`
    INSERT INTO matter_invoices (
      id, tenantId, matterId, clientId, invoiceNumber, status,
      subtotalKobo, vatKobo, totalKobo, currency,
      dueDate, paidAt, notes, lineItems, createdAt, updatedAt, deletedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, NULL)
  `).bind(
    invoice.id, invoice.tenantId, invoice.matterId, invoice.clientId,
    invoice.invoiceNumber, invoice.status,
    invoice.subtotalKobo, invoice.vatKobo, invoice.totalKobo,
    invoice.currency, invoice.dueDate, invoice.notes,
    invoice.lineItems, invoice.createdAt, invoice.updatedAt
  ).run();
}

async function dbCountInvoices(db: D1Database, tenantId: string): Promise<number> {
  const result = await db.prepare(
    'SELECT COUNT(*) as count FROM matter_invoices WHERE tenantId = ?'
  ).bind(tenantId).first<{ count: number }>();
  return result?.count ?? 0;
}

async function dbInsertAnalysis(db: D1Database, analysis: MatterAnalysis): Promise<void> {
  await db.prepare(`
    INSERT INTO matter_analyses (
      id, tenantId, matterId, documentText, documentTitle,
      status, summary, riskyClauses, keyTerms, recommendations,
      analyzedBy, errorMessage, completedAt, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, NULL, NULL, ?, ?)
  `).bind(
    analysis.id, analysis.tenantId, analysis.matterId,
    analysis.documentText, analysis.documentTitle,
    analysis.status, analysis.analyzedBy,
    analysis.createdAt, analysis.updatedAt
  ).run();
}

async function dbUpdateAnalysis(
  db: D1Database,
  tenantId: string,
  id: string,
  updates: Partial<MatterAnalysis>
): Promise<void> {
  const fields = Object.entries(updates)
    .filter(([k]) => !['id', 'tenantId', 'createdAt'].includes(k))
    .map(([k]) => `${k} = ?`).join(', ');
  const values = Object.entries(updates)
    .filter(([k]) => !['id', 'tenantId', 'createdAt'].includes(k))
    .map(([, v]) => v);
  await db.prepare(`UPDATE matter_analyses SET ${fields} WHERE id = ? AND tenantId = ?`)
    .bind(...values, id, tenantId).run();
}

// ─────────────────────────────────────────────────────────────────────────────
// HONO APP
// ─────────────────────────────────────────────────────────────────────────────

const logger = createLogger('matters');
const app = new Hono<{ Bindings: MattersEnv }>();

// Apply JWT auth to all routes
app.use('/api/matters/*', professionalAuthMiddleware);

// Extract role and userId from the authenticated user object into context
app.use('/api/matters/*', async (c, next) => {
  const user = c.get('user' as never) as { userId?: string; role?: string } | undefined;
  if (user) {
    if (user.role) c.set('role' as never, user.role as never);
    if (user.userId) c.set('userId' as never, user.userId as never);
  }
  await next();
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/matters — List all matters for the tenant
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/matters', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  try {
    const matters = await dbListMatters(c.env.DB, tenantId);
    return c.json<ApiResponse>(ok(matters));
  } catch (error) {
    logger.error('Failed to list matters', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve matters']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/matters — Create a new matter
// Requires: manage:matters permission
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/matters', requireManageMatters, async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  try {
    const body = await c.req.json<{
      title?: string;
      matterType?: string;
      clientId?: string;
      leadAttorneyId?: string;
      description?: string;
      courtName?: string;
      suitNumber?: string;
      opposingParty?: string;
      agreedFeeNaira?: number;
      hourlyRateNaira?: number;
      currency?: string;
    }>();

    const errors: string[] = [];
    if (!body.title?.trim()) errors.push('title is required');
    if (!body.clientId?.trim()) errors.push('clientId is required');
    if (body.matterType && !VALID_TYPES.includes(body.matterType as MatterType)) {
      errors.push(`matterType must be one of: ${VALID_TYPES.join(', ')}`);
    }
    if (errors.length > 0) return c.json<ApiResponse>(fail(errors), 400);

    const now = nowUTC();
    const matter: Matter = {
      id: generateId('mat'),
      tenantId,
      title: body.title!.trim(),
      matterType: (body.matterType as MatterType) ?? 'OTHER',
      status: 'INTAKE',
      clientId: body.clientId!.trim(),
      leadAttorneyId: body.leadAttorneyId?.trim() ?? userId,
      description: body.description?.trim() ?? null,
      courtName: body.courtName?.trim() ?? null,
      suitNumber: body.suitNumber?.trim() ?? null,
      opposingParty: body.opposingParty?.trim() ?? null,
      agreedFeeKobo: body.agreedFeeNaira != null ? Math.round(body.agreedFeeNaira * 100) : null,
      hourlyRateKobo: body.hourlyRateNaira != null ? Math.round(body.hourlyRateNaira * 100) : null,
      currency: body.currency ?? 'NGN',
      openedAt: now,
      closedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };

    await dbInsertMatter(c.env.DB, matter);
    logger.info('Matter created', { tenantId, matterId: matter.id, userId });
    return c.json<ApiResponse>(ok(matter), 201);
  } catch (error) {
    logger.error('Failed to create matter', { tenantId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to create matter']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/matters/:id — Get a single matter by ID
// Enforces tenant isolation — cannot retrieve another tenant's matter
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/matters/:id', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { id } = c.req.param();
  try {
    const matter = await dbGetMatter(c.env.DB, tenantId, id);
    if (!matter) return c.json<ApiResponse>(fail(['Matter not found']), 404);
    return c.json<ApiResponse>(ok(matter));
  } catch (error) {
    logger.error('Failed to get matter', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve matter']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/matters/:id — Update a matter
// Requires: manage:matters permission
// ─────────────────────────────────────────────────────────────────────────────

app.patch('/api/matters/:id', requireManageMatters, async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { id } = c.req.param();
  try {
    const existing = await dbGetMatter(c.env.DB, tenantId, id);
    if (!existing) return c.json<ApiResponse>(fail(['Matter not found']), 404);

    const body = await c.req.json<Partial<{
      title: string;
      matterType: string;
      status: string;
      leadAttorneyId: string;
      description: string;
      courtName: string;
      suitNumber: string;
      opposingParty: string;
      agreedFeeNaira: number;
      hourlyRateNaira: number;
      currency: string;
    }>>();

    const errors: string[] = [];
    if (body.status && !VALID_STATUSES.includes(body.status as MatterStatus)) {
      errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    if (body.matterType && !VALID_TYPES.includes(body.matterType as MatterType)) {
      errors.push(`matterType must be one of: ${VALID_TYPES.join(', ')}`);
    }
    if (errors.length > 0) return c.json<ApiResponse>(fail(errors), 400);

    const now = nowUTC();
    const updates: Partial<Matter> = { updatedAt: now };
    if (body.title) updates.title = body.title.trim();
    if (body.matterType) updates.matterType = body.matterType as MatterType;
    if (body.status) {
      updates.status = body.status as MatterStatus;
      if (['SETTLED', 'CLOSED', 'ARCHIVED'].includes(body.status)) {
        updates.closedAt = now;
      }
    }
    if (body.leadAttorneyId) updates.leadAttorneyId = body.leadAttorneyId;
    if (body.description !== undefined) updates.description = body.description;
    if (body.courtName !== undefined) updates.courtName = body.courtName;
    if (body.suitNumber !== undefined) updates.suitNumber = body.suitNumber;
    if (body.opposingParty !== undefined) updates.opposingParty = body.opposingParty;
    if (body.agreedFeeNaira != null) updates.agreedFeeKobo = Math.round(body.agreedFeeNaira * 100);
    if (body.hourlyRateNaira != null) updates.hourlyRateKobo = Math.round(body.hourlyRateNaira * 100);
    if (body.currency) updates.currency = body.currency;

    await dbUpdateMatter(c.env.DB, tenantId, id, updates);
    const updated = await dbGetMatter(c.env.DB, tenantId, id);
    return c.json<ApiResponse>(ok(updated));
  } catch (error) {
    logger.error('Failed to update matter', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to update matter']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/matters/:id — Soft-delete a matter
// Requires: manage:matters permission
// ─────────────────────────────────────────────────────────────────────────────

app.delete('/api/matters/:id', requireManageMatters, async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { id } = c.req.param();
  try {
    const existing = await dbGetMatter(c.env.DB, tenantId, id);
    if (!existing) return c.json<ApiResponse>(fail(['Matter not found']), 404);
    await dbSoftDeleteMatter(c.env.DB, tenantId, id);
    logger.info('Matter soft-deleted', { tenantId, matterId: id });
    return c.json<ApiResponse>(ok({ id, deleted: true }));
  } catch (error) {
    logger.error('Failed to delete matter', { tenantId, id, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to delete matter']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TIME ENTRIES — QA-PRO-2
// POST /api/matters/:id/time-entries — Log time against a matter
// GET  /api/matters/:id/time-entries — List time entries for a matter
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/matters/:id/time-entries', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { id: matterId } = c.req.param();
  try {
    const matter = await dbGetMatter(c.env.DB, tenantId, matterId);
    if (!matter) return c.json<ApiResponse>(fail(['Matter not found']), 404);
    const entries = await dbGetTimeEntries(c.env.DB, tenantId, matterId);
    return c.json<ApiResponse>(ok(entries));
  } catch (error) {
    logger.error('Failed to list time entries', { tenantId, matterId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve time entries']), 500);
  }
});

app.post('/api/matters/:id/time-entries', requireManageMatters, async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  const { id: matterId } = c.req.param();
  try {
    const matter = await dbGetMatter(c.env.DB, tenantId, matterId);
    if (!matter) return c.json<ApiResponse>(fail(['Matter not found']), 404);

    const body = await c.req.json<{
      description?: string;
      durationMinutes?: number;
      hourlyRateNaira?: number;
      isBillable?: boolean;
      workDate?: number;
    }>();

    const errors: string[] = [];
    if (!body.description?.trim()) errors.push('description is required');
    if (!body.durationMinutes || body.durationMinutes <= 0) {
      errors.push('durationMinutes must be a positive number');
    }
    if (errors.length > 0) return c.json<ApiResponse>(fail(errors), 400);

    const hourlyRateKobo = body.hourlyRateNaira != null
      ? Math.round(body.hourlyRateNaira * 100)
      : (matter.hourlyRateKobo ?? 0);

    const now = nowUTC();
    const entry: MatterTimeEntry = {
      id: generateId('mte'),
      tenantId,
      matterId,
      attorneyId: userId,
      description: body.description!.trim(),
      durationMinutes: body.durationMinutes!,
      hourlyRateKobo,
      amountKobo: calculateMatterTimeAmount(body.durationMinutes!, hourlyRateKobo),
      isBillable: body.isBillable !== false,
      invoiced: false,
      workDate: body.workDate ?? now,
      createdAt: now,
      updatedAt: now
    };

    await dbInsertTimeEntry(c.env.DB, entry);
    logger.info('Time entry logged', { tenantId, matterId, entryId: entry.id, userId });
    return c.json<ApiResponse>(ok(entry), 201);
  } catch (error) {
    logger.error('Failed to log time entry', { tenantId, matterId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to log time entry']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INVOICES — QA-PRO-2
// GET  /api/matters/:id/invoices — List invoices for a matter
// POST /api/matters/:id/invoices — Generate invoice from unbilled time entries
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/matters/:id/invoices', async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { id: matterId } = c.req.param();
  try {
    const matter = await dbGetMatter(c.env.DB, tenantId, matterId);
    if (!matter) return c.json<ApiResponse>(fail(['Matter not found']), 404);
    const invoices = await dbGetInvoices(c.env.DB, tenantId, matterId);
    return c.json<ApiResponse>(ok(invoices));
  } catch (error) {
    logger.error('Failed to list invoices', { tenantId, matterId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to retrieve invoices']), 500);
  }
});

app.post('/api/matters/:id/invoices', requireManageMatters, async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const { id: matterId } = c.req.param();
  try {
    const matter = await dbGetMatter(c.env.DB, tenantId, matterId);
    if (!matter) return c.json<ApiResponse>(fail(['Matter not found']), 404);

    const unbilledEntries = await dbGetUnbilledTimeEntries(c.env.DB, tenantId, matterId);
    if (unbilledEntries.length === 0) {
      return c.json<ApiResponse>(fail(['No unbilled time entries to invoice']), 422);
    }

    const body = await c.req.json<{ daysUntilDue?: number; notes?: string }>().catch(() => ({}));
    const now = nowUTC();
    const count = await dbCountInvoices(c.env.DB, tenantId);
    const totals = buildInvoiceTotals(unbilledEntries, matter.currency);

    const invoice: MatterInvoice = {
      id: generateId('minv'),
      tenantId,
      matterId,
      clientId: matter.clientId,
      invoiceNumber: generateMatterInvoiceNumber(count + 1),
      status: 'DRAFT',
      ...totals,
      dueDate: now + ((body.daysUntilDue ?? 30) * 24 * 60 * 60 * 1000),
      paidAt: null,
      notes: body.notes ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };

    await dbInsertInvoice(c.env.DB, invoice);
    await dbMarkTimeEntriesInvoiced(c.env.DB, tenantId, matterId);

    logger.info('Invoice generated', {
      tenantId, matterId, invoiceId: invoice.id,
      totalKobo: invoice.totalKobo, entryCount: unbilledEntries.length
    });
    return c.json<ApiResponse>(ok({
      ...invoice,
      entryCount: unbilledEntries.length
    }), 201);
  } catch (error) {
    logger.error('Failed to generate invoice', { tenantId, matterId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to generate invoice']), 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AI CONTRACT ANALYSIS — QA-PRO-3
// POST /api/matters/:id/analyze
//
// Summarizes a contract, highlights risky clauses, and stores the result in
// the matter_analyses table (the `document_metadata` store for this module).
//
// Resilience:
//   - If the AI platform returns a non-2xx response or is unreachable, the
//     route returns HTTP 503 with a clear retryable error message.
//   - The analysis record is always written before the AI call, so the request
//     is auditable even if the AI call fails.
//   - Users are explicitly told they can retry the analysis later.
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/matters/:id/analyze', requireManageMatters, async (c) => {
  const tenantId = c.get('tenantId' as never) as string;
  const userId = c.get('userId' as never) as string;
  const { id: matterId } = c.req.param();

  try {
    const matter = await dbGetMatter(c.env.DB, tenantId, matterId);
    if (!matter) return c.json<ApiResponse>(fail(['Matter not found']), 404);

    const body = await c.req.json<{
      documentText?: string;
      documentTitle?: string;
      analysisType?: 'CONTRACT_REVIEW' | 'SUMMARY' | 'RISK_ASSESSMENT';
    }>();

    if (!body.documentText?.trim()) {
      return c.json<ApiResponse>(fail(['documentText is required']), 400);
    }

    const now = nowUTC();
    const analysis: MatterAnalysis = {
      id: generateId('ma'),
      tenantId,
      matterId,
      documentText: body.documentText.slice(0, 20000),
      documentTitle: body.documentTitle?.trim() ?? `Matter: ${matter.title}`,
      status: 'PROCESSING',
      summary: null,
      riskyClauses: null,
      keyTerms: null,
      recommendations: null,
      analyzedBy: userId,
      errorMessage: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now
    };

    await dbInsertAnalysis(c.env.DB, analysis);

    const aiEnv: AIEnv = {
      AI_API_URL: c.env.AI_API_URL,
      AI_API_KEY: c.env.AI_API_KEY,
      AI_MODEL: c.env.AI_MODEL
    };

    const analysisType = body.analysisType ?? 'CONTRACT_REVIEW';

    try {
      let result = await analyzeContract(aiEnv, body.documentText, analysis.documentTitle);

      if (!result && analysisType === 'SUMMARY') {
        const prompt = `Summarize the following legal document titled "${analysis.documentTitle}" in 2-3 paragraphs:\n\n${body.documentText.slice(0, 8000)}`;
        const summary = await getAICompletion(
          aiEnv, prompt,
          'You are an expert Nigerian legal document analyst. Provide a clear, concise summary.'
        );
        if (summary) {
          result = { summary, riskyClauses: [], keyTerms: [], recommendations: [] };
        }
      }

      if (result) {
        await dbUpdateAnalysis(c.env.DB, tenantId, analysis.id, {
          status: 'COMPLETED',
          summary: result.summary,
          riskyClauses: JSON.stringify(result.riskyClauses),
          keyTerms: JSON.stringify(result.keyTerms),
          recommendations: JSON.stringify(result.recommendations),
          completedAt: Date.now(),
          updatedAt: Date.now()
        });

        return c.json<ApiResponse>(ok({
          analysisId: analysis.id,
          matterId,
          status: 'COMPLETED',
          documentTitle: analysis.documentTitle,
          summary: result.summary,
          riskyClauses: result.riskyClauses,
          keyTerms: result.keyTerms,
          recommendations: result.recommendations
        }));
      } else {
        await dbUpdateAnalysis(c.env.DB, tenantId, analysis.id, {
          status: 'FAILED',
          errorMessage: 'AI platform not configured. Set AI_API_URL and AI_API_KEY environment variables.',
          updatedAt: Date.now()
        });

        return c.json<ApiResponse>(
          fail(['AI analysis is not available. The AI platform is not configured. Please set AI_API_URL and AI_API_KEY and retry.']),
          503
        );
      }
    } catch (aiError) {
      const errorMsg = aiError instanceof Error ? aiError.message : String(aiError);
      logger.error('AI analysis call failed', { tenantId, matterId, analysisId: analysis.id, error: errorMsg });

      await dbUpdateAnalysis(c.env.DB, tenantId, analysis.id, {
        status: 'FAILED',
        errorMessage: `AI platform error: ${errorMsg}`,
        updatedAt: Date.now()
      });

      return c.json<ApiResponse>(
        fail([
          'AI analysis failed due to a temporary upstream error. Your document has been saved and you may retry the analysis later.',
          `Detail: ${errorMsg}`
        ]),
        503
      );
    }
  } catch (error) {
    logger.error('Contract analysis request failed', { tenantId, matterId, error: String(error) });
    return c.json<ApiResponse>(fail(['Failed to process analysis request']), 500);
  }
});

export default app;
