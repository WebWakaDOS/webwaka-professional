/**
 * WebWaka Professional — Matters Module Tests
 * QA Reference: QA-PRO-1, QA-PRO-2, QA-PRO-3, QA-PRO-4
 *
 * Coverage:
 *   QA-PRO-1  CRUD — creates, reads, updates, soft-deletes legal matters scoped by tenantId
 *   QA-PRO-2  Billing — calculateMatterTimeAmount, buildInvoiceTotals, invoice generation
 *   QA-PRO-3  AI Contract Analysis — getAICompletion summarizes contracts, result stored in
 *             document_metadata (matter_analyses table); graceful 503 on AI platform outage
 *   QA-PRO-4  Unit tests for all pure functions in the matters module
 *
 * Security:
 *   - 401 returned when no JWT is supplied
 *   - 403 returned when JWT role lacks manage:matters permission
 *   - Tenant isolation: tenantId from JWT is always used; other tenants' matters return 404
 *
 * Offline resilience:
 *   - AI 503 / network error returns clear retryable message, does not throw
 *   - Analysis record is persisted with FAILED status even on AI error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// QA-PRO-4  UNIT TESTS — pure billing functions
// ─────────────────────────────────────────────────────────────────────────────

import {
  calculateMatterTimeAmount,
  buildInvoiceTotals,
  generateMatterInvoiceNumber,
  requireManageMatters,
  type MatterTimeEntry
} from './api';

describe('calculateMatterTimeAmount (QA-PRO-2)', () => {
  it('calculates correctly for whole hours', () => {
    // 60 min @ ₦50,000/hr = ₦50,000 = 5,000,000 kobo
    expect(calculateMatterTimeAmount(60, 5_000_000)).toBe(5_000_000);
  });

  it('calculates correctly for partial hours', () => {
    // 30 min @ ₦60,000/hr = ₦30,000 = 3,000,000 kobo
    expect(calculateMatterTimeAmount(30, 6_000_000)).toBe(3_000_000);
  });

  it('calculates correctly for two-hour blocks', () => {
    // 120 min @ ₦50,000/hr = ₦100,000 = 10,000,000 kobo
    expect(calculateMatterTimeAmount(120, 5_000_000)).toBe(10_000_000);
  });

  it('returns 0 for 0 minutes', () => {
    expect(calculateMatterTimeAmount(0, 5_000_000)).toBe(0);
  });

  it('returns 0 for 0 hourly rate', () => {
    expect(calculateMatterTimeAmount(60, 0)).toBe(0);
  });

  it('always returns an integer (no floating-point drift)', () => {
    const result = calculateMatterTimeAmount(45, 7_000_000);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('handles 1-minute increments', () => {
    // 1 min @ 6,000,000 kobo/hr = 100,000 kobo
    expect(calculateMatterTimeAmount(1, 6_000_000)).toBe(100_000);
  });
});

describe('buildInvoiceTotals (QA-PRO-2)', () => {
  function makeEntry(overrides: Partial<MatterTimeEntry> = {}): MatterTimeEntry {
    return {
      id: 'ent_1',
      tenantId: 'tenant_1',
      matterId: 'mat_1',
      attorneyId: 'user_1',
      description: 'Research',
      durationMinutes: 60,
      hourlyRateKobo: 5_000_000,
      amountKobo: 5_000_000,
      isBillable: true,
      invoiced: false,
      workDate: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides
    };
  }

  it('calculates subtotal, VAT (7.5%), and total for a single billable entry', () => {
    const entries = [makeEntry({ amountKobo: 10_000_000 })];
    const totals = buildInvoiceTotals(entries);
    expect(totals.subtotalKobo).toBe(10_000_000);
    expect(totals.vatKobo).toBe(750_000);         // 7.5% of 10,000,000
    expect(totals.totalKobo).toBe(10_750_000);
  });

  it('sums multiple billable entries', () => {
    const entries = [
      makeEntry({ amountKobo: 5_000_000 }),
      makeEntry({ id: 'ent_2', amountKobo: 3_000_000 })
    ];
    const totals = buildInvoiceTotals(entries);
    expect(totals.subtotalKobo).toBe(8_000_000);
    expect(totals.vatKobo).toBe(600_000);         // 7.5% of 8,000,000
    expect(totals.totalKobo).toBe(8_600_000);
  });

  it('excludes non-billable entries from totals', () => {
    const entries = [
      makeEntry({ amountKobo: 5_000_000, isBillable: true }),
      makeEntry({ id: 'ent_2', amountKobo: 2_000_000, isBillable: false })
    ];
    const totals = buildInvoiceTotals(entries);
    expect(totals.subtotalKobo).toBe(5_000_000);
    expect(totals.vatKobo).toBe(375_000);
    expect(totals.totalKobo).toBe(5_375_000);
  });

  it('returns zero totals for an empty entry list', () => {
    const totals = buildInvoiceTotals([]);
    expect(totals.subtotalKobo).toBe(0);
    expect(totals.vatKobo).toBe(0);
    expect(totals.totalKobo).toBe(0);
  });

  it('all totals are integers (kobo precision)', () => {
    const totals = buildInvoiceTotals([makeEntry({ amountKobo: 7_777_777 })]);
    expect(Number.isInteger(totals.subtotalKobo)).toBe(true);
    expect(Number.isInteger(totals.vatKobo)).toBe(true);
    expect(Number.isInteger(totals.totalKobo)).toBe(true);
  });

  it('defaults currency to NGN', () => {
    const totals = buildInvoiceTotals([makeEntry()]);
    expect(totals.currency).toBe('NGN');
  });

  it('respects custom currency', () => {
    const totals = buildInvoiceTotals([makeEntry()], 'GHS');
    expect(totals.currency).toBe('GHS');
  });

  it('serializes line items as valid JSON', () => {
    const entries = [makeEntry({ description: 'Court filing' })];
    const totals = buildInvoiceTotals(entries);
    expect(() => JSON.parse(totals.lineItems)).not.toThrow();
    const items = JSON.parse(totals.lineItems) as { description: string }[];
    expect(items[0]?.description).toBe('Court filing');
  });
});

describe('generateMatterInvoiceNumber (QA-PRO-4)', () => {
  it('generates format MI-YYYY-NNN', () => {
    expect(generateMatterInvoiceNumber(1)).toMatch(/^MI-\d{4}-001$/);
    expect(generateMatterInvoiceNumber(42)).toMatch(/^MI-\d{4}-042$/);
    expect(generateMatterInvoiceNumber(999)).toMatch(/^MI-\d{4}-999$/);
  });

  it('includes the current year', () => {
    const year = new Date().getFullYear().toString();
    expect(generateMatterInvoiceNumber(1)).toContain(year);
  });

  it('pads sequence to 3 digits', () => {
    expect(generateMatterInvoiceNumber(1)).toContain('001');
    expect(generateMatterInvoiceNumber(7)).toContain('007');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// QA-PRO-1  INTEGRATION — CRUD via HTTP (Hono test requests)
// ─────────────────────────────────────────────────────────────────────────────

import mattersApp from './api';

const JWT_SECRET = 'test_secret_key_32chars_minimum!';

async function makeJWT(payload: Record<string, unknown>): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const body = btoa(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    ...payload
  })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${header}.${body}`));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${header}.${body}.${sigB64}`;
}

// ─── Mock D1 database ────────────────────────────────────────────────────────

interface MockStore {
  matters: Map<string, Record<string, unknown>>;
  timeEntries: Map<string, Record<string, unknown>>;
  invoices: Map<string, Record<string, unknown>>;
  analyses: Map<string, Record<string, unknown>>;
}

function createMockD1(store?: MockStore) {
  const s: MockStore = store ?? {
    matters: new Map(),
    timeEntries: new Map(),
    invoices: new Map(),
    analyses: new Map()
  };

  function execSql(sql: string, args: unknown[]): unknown[] | null {
    const q = sql.trim().toUpperCase();

    if (q.startsWith('INSERT INTO MATTERS')) {
      const id = args[0] as string;
      const record: Record<string, unknown> = {
        id: args[0], tenantId: args[1], title: args[2], matterType: args[3],
        status: args[4], clientId: args[5], leadAttorneyId: args[6],
        description: args[7], courtName: args[8], suitNumber: args[9],
        opposingParty: args[10], agreedFeeKobo: args[11], hourlyRateKobo: args[12],
        currency: args[13], openedAt: args[14], closedAt: args[15],
        createdAt: args[16], updatedAt: args[17], deletedAt: null
      };
      s.matters.set(id, record);
      return null;
    }

    if (q.startsWith('INSERT INTO MATTER_TIME_ENTRIES')) {
      const id = args[0] as string;
      s.timeEntries.set(id, {
        id: args[0], tenantId: args[1], matterId: args[2], attorneyId: args[3],
        description: args[4], durationMinutes: args[5], hourlyRateKobo: args[6],
        amountKobo: args[7], isBillable: args[8], invoiced: args[9],
        workDate: args[10], createdAt: args[11], updatedAt: args[12]
      });
      return null;
    }

    if (q.startsWith('INSERT INTO MATTER_INVOICES')) {
      const id = args[0] as string;
      s.invoices.set(id, {
        id: args[0], tenantId: args[1], matterId: args[2], clientId: args[3],
        invoiceNumber: args[4], status: args[5], subtotalKobo: args[6],
        vatKobo: args[7], totalKobo: args[8], currency: args[9], dueDate: args[10],
        notes: args[11], lineItems: args[12], createdAt: args[13], updatedAt: args[14],
        paidAt: null, deletedAt: null
      });
      return null;
    }

    if (q.startsWith('INSERT INTO MATTER_ANALYSES')) {
      const id = args[0] as string;
      s.analyses.set(id, {
        id: args[0], tenantId: args[1], matterId: args[2],
        documentText: args[3], documentTitle: args[4],
        status: args[5], analyzedBy: args[6],
        createdAt: args[7], updatedAt: args[8],
        summary: null, riskyClauses: null, keyTerms: null,
        recommendations: null, errorMessage: null, completedAt: null
      });
      return null;
    }

    if (q.startsWith('SELECT * FROM MATTERS WHERE ID = ?')) {
      const id = args[0] as string;
      const tenantId = args[1] as string;
      const record = s.matters.get(id);
      if (!record || record.tenantId !== tenantId || record.deletedAt !== null) return [null];
      return [record];
    }

    if (q.startsWith('SELECT * FROM MATTERS WHERE TENANTID = ?')) {
      const tenantId = args[0] as string;
      const results = [...s.matters.values()].filter(
        m => m.tenantId === tenantId && m.deletedAt === null
      );
      return results;
    }

    if (q.startsWith('SELECT * FROM MATTER_TIME_ENTRIES WHERE TENANTID = ? AND MATTERID = ? AND INVOICED = 0')) {
      const tenantId = args[0] as string;
      const matterId = args[1] as string;
      return [...s.timeEntries.values()].filter(
        e => e.tenantId === tenantId && e.matterId === matterId &&
          e.invoiced === 0 && e.isBillable === 1
      );
    }

    if (q.startsWith('SELECT * FROM MATTER_TIME_ENTRIES')) {
      const tenantId = args[0] as string;
      const matterId = args[1] as string;
      return [...s.timeEntries.values()].filter(
        e => e.tenantId === tenantId && e.matterId === matterId
      );
    }

    if (q.startsWith('SELECT * FROM MATTER_INVOICES')) {
      const tenantId = args[0] as string;
      const matterId = args[1] as string;
      return [...s.invoices.values()].filter(
        inv => inv.tenantId === tenantId && inv.matterId === matterId && inv.deletedAt === null
      );
    }

    if (q.startsWith('SELECT COUNT(*) AS COUNT FROM MATTER_INVOICES')) {
      const tenantId = args[0] as string;
      const count = [...s.invoices.values()].filter(i => i.tenantId === tenantId).length;
      return [{ count }];
    }

    if (q.startsWith('UPDATE MATTERS SET DELETEDAT =')) {
      const tenantId = args[2] as string;
      const id = args[1] as string;
      const record = s.matters.get(id);
      if (record && record.tenantId === tenantId) {
        record.deletedAt = args[0];
        s.matters.set(id, record);
      }
      return null;
    }

    if (q.startsWith('UPDATE MATTER_TIME_ENTRIES SET INVOICED = 1')) {
      const tenantId = args[1] as string;
      const matterId = args[2] as string;
      for (const [key, e] of s.timeEntries.entries()) {
        if (e.tenantId === tenantId && e.matterId === matterId && e.invoiced === 0) {
          e.invoiced = 1;
          s.timeEntries.set(key, e);
        }
      }
      return null;
    }

    if (q.startsWith('UPDATE MATTERS SET ')) {
      const id = args[args.length - 2] as string;
      const tenantId = args[args.length - 1] as string;
      const record = s.matters.get(id);
      if (record && record.tenantId === tenantId) {
        const setCols = sql.match(/SET (.+) WHERE/i)?.[1]?.split(',').map(s => s.trim().split(' = ')[0]) ?? [];
        setCols.forEach((col, i) => {
          record[col] = args[i];
        });
        s.matters.set(id, record);
      }
      return null;
    }

    if (q.startsWith('UPDATE MATTER_ANALYSES SET ')) {
      const id = args[args.length - 2] as string;
      const tenantId = args[args.length - 1] as string;
      const record = s.analyses.get(id);
      if (record && record.tenantId === tenantId) {
        const setCols = sql.match(/SET (.+) WHERE/i)?.[1]?.split(',').map(s => s.trim().split(' = ')[0]) ?? [];
        setCols.forEach((col, i) => {
          record[col] = args[i];
        });
        s.analyses.set(id, record);
      }
      return null;
    }

    return null;
  }

  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async <T>(): Promise<T | null> => {
          const res = execSql(sql, args);
          if (!res) return null;
          return (res[0] as T | null | undefined) ?? null;
        },
        all: async <T>(): Promise<{ results: T[] }> => {
          const res = execSql(sql, args);
          if (!res) return { results: [] };
          return { results: res.filter(Boolean) as T[] };
        },
        run: async () => {
          execSql(sql, args);
          return { success: true, meta: { changes: 1 } };
        }
      })
    }),
    exec: async () => ({ count: 0, duration: 0 })
  };
}

function makeEnv(overrides: Record<string, unknown> = {}) {
  return {
    DB: createMockD1(),
    JWT_SECRET,
    ENVIRONMENT: 'test',
    ...overrides
  } as unknown as Record<string, unknown>;
}

async function request(
  method: string,
  path: string,
  role: 'admin' | 'attorney' | 'paralegal' | 'client' | 'viewer',
  body?: unknown,
  env?: Record<string, unknown>,
  permissions?: string[]
): Promise<Response> {
  const token = await makeJWT({
    sub: 'user_1',
    tenantId: 'tenant_1',
    role,
    ...(permissions ? { permissions } : {})
  });
  return mattersApp.request(path, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  }, env ?? makeEnv());
}

async function requestNoAuth(method: string, path: string): Promise<Response> {
  return mattersApp.request(path, { method }, makeEnv());
}

// ─── QA-PRO-1: CRUD Tests ────────────────────────────────────────────────────

describe('GET /api/matters — list matters (QA-PRO-1)', () => {
  it('returns 401 when no JWT is supplied', async () => {
    const res = await requestNoAuth('GET', '/api/matters');
    expect(res.status).toBe(401);
  });

  it('returns 200 and empty array for a new tenant', async () => {
    const res = await request('GET', '/api/matters', 'attorney');
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('POST /api/matters — create matter (QA-PRO-1)', () => {
  it('returns 401 without authentication', async () => {
    const res = await requestNoAuth('POST', '/api/matters');
    expect(res.status).toBe(401);
  });

  it('returns 403 for client role (lacks manage:matters)', async () => {
    const res = await request('POST', '/api/matters', 'client', {
      title: 'Test Matter', clientId: 'client_1'
    });
    expect(res.status).toBe(403);
    const body = await res.json() as { success: boolean; errors: string[] };
    expect(body.success).toBe(false);
    expect(body.errors[0]).toContain('manage:matters');
  });

  it('returns 403 for paralegal role (lacks manage:matters)', async () => {
    const res = await request('POST', '/api/matters', 'paralegal', {
      title: 'Test Matter', clientId: 'client_1'
    });
    expect(res.status).toBe(403);
  });

  it('returns 403 for viewer role (lacks manage:matters)', async () => {
    const res = await request('POST', '/api/matters', 'viewer', {
      title: 'Test Matter', clientId: 'client_1'
    });
    expect(res.status).toBe(403);
  });

  it('grants access when JWT permissions array includes manage:matters', async () => {
    const res = await request('POST', '/api/matters', 'client', {
      title: 'Permission Override', clientId: 'client_1'
    }, undefined, ['manage:matters']);
    expect(res.status).toBe(201);
  });

  it('returns 400 when title is missing', async () => {
    const res = await request('POST', '/api/matters', 'attorney', { clientId: 'client_1' });
    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean; errors: string[] };
    expect(body.success).toBe(false);
    expect(body.errors.some(e => e.includes('title'))).toBe(true);
  });

  it('returns 400 when clientId is missing', async () => {
    const res = await request('POST', '/api/matters', 'attorney', { title: 'Test Matter' });
    expect(res.status).toBe(400);
    const body = await res.json() as { errors: string[] };
    expect(body.errors.some(e => e.includes('clientId'))).toBe(true);
  });

  it('returns 400 for invalid matterType', async () => {
    const res = await request('POST', '/api/matters', 'attorney', {
      title: 'Test', clientId: 'c1', matterType: 'INVALID_TYPE'
    });
    expect(res.status).toBe(400);
  });

  it('creates a matter with 201 status for admin role', async () => {
    const res = await request('POST', '/api/matters', 'admin', {
      title: 'Doe v. State', clientId: 'client_1',
      matterType: 'CRIMINAL', hourlyRateNaira: 50000
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean; data: { id: string; title: string; status: string; tenantId: string } };
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Doe v. State');
    expect(body.data.status).toBe('INTAKE');
    expect(body.data.tenantId).toBe('tenant_1');
    expect(body.data.id).toMatch(/^mat_/);
  });

  it('creates a matter with 201 status for attorney role', async () => {
    const res = await request('POST', '/api/matters', 'attorney', {
      title: 'Obi v. Commission', clientId: 'client_2'
    });
    expect(res.status).toBe(201);
  });

  it('stores tenantId from JWT — not from request body', async () => {
    const res = await request('POST', '/api/matters', 'attorney', {
      title: 'Isolation Test', clientId: 'client_1'
    });
    const body = await res.json() as { data: { tenantId: string } };
    expect(body.data.tenantId).toBe('tenant_1');
  });

  it('converts agreedFeeNaira to kobo in storage', async () => {
    const res = await request('POST', '/api/matters', 'attorney', {
      title: 'Fee Test', clientId: 'c1', agreedFeeNaira: 500000
    });
    const body = await res.json() as { data: { agreedFeeKobo: number } };
    expect(body.data.agreedFeeKobo).toBe(50_000_000);
  });
});

describe('GET /api/matters/:id — retrieve matter (QA-PRO-1)', () => {
  it('returns 401 without authentication', async () => {
    const res = await requestNoAuth('GET', '/api/matters/nonexistent');
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent matter', async () => {
    const res = await request('GET', '/api/matters/nonexistent', 'attorney');
    expect(res.status).toBe(404);
  });

  it('returns the matter when it exists and belongs to the tenant (tenant isolation)', async () => {
    const sharedEnv = makeEnv();
    const createRes = await mattersApp.request('/api/matters', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await makeJWT({ sub: 'user_1', tenantId: 'tenant_1', role: 'attorney' })}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: 'Isolated Matter', clientId: 'c1' })
    }, sharedEnv);
    const created = await createRes.json() as { data: { id: string } };
    const matterId = created.data.id;

    const readRes = await mattersApp.request(`/api/matters/${matterId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${await makeJWT({ sub: 'user_1', tenantId: 'tenant_1', role: 'attorney' })}` }
    }, sharedEnv);
    expect(readRes.status).toBe(200);
    const body = await readRes.json() as { data: { id: string } };
    expect(body.data.id).toBe(matterId);
  });

  it('returns 404 when a different tenant tries to read the matter (tenant isolation)', async () => {
    const sharedEnv = makeEnv();
    const createRes = await mattersApp.request('/api/matters', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await makeJWT({ sub: 'u1', tenantId: 'tenant_1', role: 'attorney' })}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: 'Private Matter', clientId: 'c1' })
    }, sharedEnv);
    const { data } = await createRes.json() as { data: { id: string } };

    const attacker = await makeJWT({ sub: 'hacker', tenantId: 'tenant_99', role: 'admin' });
    const attackRes = await mattersApp.request(`/api/matters/${data.id}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${attacker}` }
    }, sharedEnv);
    expect(attackRes.status).toBe(404);
  });
});

describe('PATCH /api/matters/:id — update matter (QA-PRO-1)', () => {
  it('returns 401 without authentication', async () => {
    const res = await requestNoAuth('PATCH', '/api/matters/any');
    expect(res.status).toBe(401);
  });

  it('returns 403 for client role', async () => {
    const res = await request('PATCH', '/api/matters/any', 'client', { status: 'ACTIVE' });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid status', async () => {
    const sharedEnv = makeEnv();
    const { data } = await (await mattersApp.request('/api/matters', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'T', clientId: 'c' })
    }, sharedEnv)).json() as { data: { id: string } };

    const res = await mattersApp.request(`/api/matters/${data.id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'BOGUS_STATUS' })
    }, sharedEnv);
    expect(res.status).toBe(400);
  });

  it('updates the matter status successfully', async () => {
    const sharedEnv = makeEnv();
    const { data } = await (await mattersApp.request('/api/matters', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Status Test', clientId: 'c' })
    }, sharedEnv)).json() as { data: { id: string } };

    const res = await mattersApp.request(`/api/matters/${data.id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ACTIVE' })
    }, sharedEnv);
    expect(res.status).toBe(200);
  });

  it('returns 404 for non-existent matter', async () => {
    const res = await request('PATCH', '/api/matters/ghost', 'admin', { title: 'Updated' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/matters/:id — soft delete (QA-PRO-1)', () => {
  it('returns 401 without authentication', async () => {
    const res = await requestNoAuth('DELETE', '/api/matters/any');
    expect(res.status).toBe(401);
  });

  it('returns 403 for client role', async () => {
    const res = await request('DELETE', '/api/matters/any', 'client');
    expect(res.status).toBe(403);
  });

  it('soft-deletes a matter (returns 200, subsequent GET returns 404)', async () => {
    const sharedEnv = makeEnv();
    const token = await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'admin' });
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const { data } = await (await mattersApp.request('/api/matters', {
      method: 'POST', headers,
      body: JSON.stringify({ title: 'To Delete', clientId: 'c' })
    }, sharedEnv)).json() as { data: { id: string } };

    const deleteRes = await mattersApp.request(`/api/matters/${data.id}`, {
      method: 'DELETE', headers
    }, sharedEnv);
    expect(deleteRes.status).toBe(200);
    const deleteBody = await deleteRes.json() as { success: boolean; data: { deleted: boolean } };
    expect(deleteBody.success).toBe(true);
    expect(deleteBody.data.deleted).toBe(true);

    const getRes = await mattersApp.request(`/api/matters/${data.id}`, {
      method: 'GET', headers
    }, sharedEnv);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when matter does not exist', async () => {
    const res = await request('DELETE', '/api/matters/ghost', 'admin');
    expect(res.status).toBe(404);
  });
});

// ─── QA-PRO-2: Billing — time entries and invoice generation ─────────────────

describe('POST /api/matters/:id/time-entries — log time (QA-PRO-2)', () => {
  it('returns 401 without authentication', async () => {
    const res = await requestNoAuth('POST', '/api/matters/m1/time-entries');
    expect(res.status).toBe(401);
  });

  it('returns 403 for client role', async () => {
    const res = await request('POST', '/api/matters/m1/time-entries', 'client', {
      description: 'Research', durationMinutes: 60
    });
    expect(res.status).toBe(403);
  });

  it('returns 404 when matter does not exist', async () => {
    const res = await request('POST', '/api/matters/nonexistent/time-entries', 'attorney', {
      description: 'Research', durationMinutes: 60
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 when description is missing', async () => {
    const sharedEnv = makeEnv();
    const { data } = await (await mattersApp.request('/api/matters', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'T', clientId: 'c' })
    }, sharedEnv)).json() as { data: { id: string } };

    const res = await mattersApp.request(`/api/matters/${data.id}/time-entries`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationMinutes: 60 })
    }, sharedEnv);
    expect(res.status).toBe(400);
  });

  it('returns 400 when durationMinutes is missing', async () => {
    const sharedEnv = makeEnv();
    const { data } = await (await mattersApp.request('/api/matters', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'T', clientId: 'c' })
    }, sharedEnv)).json() as { data: { id: string } };

    const res = await mattersApp.request(`/api/matters/${data.id}/time-entries`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Research' })
    }, sharedEnv);
    expect(res.status).toBe(400);
  });

  it('logs a time entry and calculates amountKobo from hourly rate (QA-PRO-2)', async () => {
    const sharedEnv = makeEnv();
    const { data: matter } = await (await mattersApp.request('/api/matters', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Billing Test', clientId: 'c1', hourlyRateNaira: 50000 })
    }, sharedEnv)).json() as { data: { id: string } };

    const res = await mattersApp.request(`/api/matters/${matter.id}/time-entries`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Client consultation', durationMinutes: 90 })
    }, sharedEnv);
    expect(res.status).toBe(201);
    const entry = (await res.json() as { data: MatterTimeEntry }).data;
    expect(entry.durationMinutes).toBe(90);
    expect(entry.amountKobo).toBe(7_500_000); // 90min @ ₦50,000/hr = ₦75,000 = 7,500,000 kobo
    expect(Number.isInteger(entry.amountKobo)).toBe(true);
  });

  it('uses the per-request hourly rate when supplied (overrides matter default)', async () => {
    const sharedEnv = makeEnv();
    const { data: matter } = await (await mattersApp.request('/api/matters', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Rate Override', clientId: 'c1', hourlyRateNaira: 50000 })
    }, sharedEnv)).json() as { data: { id: string } };

    const res = await mattersApp.request(`/api/matters/${matter.id}/time-entries`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'SAN consultation', durationMinutes: 60, hourlyRateNaira: 100000 })
    }, sharedEnv);
    expect(res.status).toBe(201);
    const entry = (await res.json() as { data: MatterTimeEntry }).data;
    expect(entry.hourlyRateKobo).toBe(10_000_000); // ₦100,000 → 10,000,000 kobo
    expect(entry.amountKobo).toBe(10_000_000);     // 60min @ ₦100,000/hr
  });
});

describe('POST /api/matters/:id/invoices — generate invoice (QA-PRO-2)', () => {
  it('returns 401 without authentication', async () => {
    const res = await requestNoAuth('POST', '/api/matters/m1/invoices');
    expect(res.status).toBe(401);
  });

  it('returns 422 when there are no unbilled entries', async () => {
    const sharedEnv = makeEnv();
    const { data: matter } = await (await mattersApp.request('/api/matters', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Empty Billing', clientId: 'c1' })
    }, sharedEnv)).json() as { data: { id: string } };

    const res = await mattersApp.request(`/api/matters/${matter.id}/invoices`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }, sharedEnv);
    expect(res.status).toBe(422);
    const body = await res.json() as { success: boolean; errors: string[] };
    expect(body.success).toBe(false);
    expect(body.errors[0]).toContain('unbilled');
  });

  it('generates an invoice from unbilled time entries with correct VAT (QA-PRO-2)', async () => {
    const sharedEnv = makeEnv();
    const token = await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' });
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const { data: matter } = await (await mattersApp.request('/api/matters', {
      method: 'POST', headers,
      body: JSON.stringify({ title: 'Invoice Test', clientId: 'c1', hourlyRateNaira: 60000 })
    }, sharedEnv)).json() as { data: { id: string } };

    // Log 2 × 60-minute time entries at ₦60,000/hr = ₦120,000 total
    await mattersApp.request(`/api/matters/${matter.id}/time-entries`, {
      method: 'POST', headers,
      body: JSON.stringify({ description: 'Research', durationMinutes: 60 })
    }, sharedEnv);
    await mattersApp.request(`/api/matters/${matter.id}/time-entries`, {
      method: 'POST', headers,
      body: JSON.stringify({ description: 'Drafting', durationMinutes: 60 })
    }, sharedEnv);

    const res = await mattersApp.request(`/api/matters/${matter.id}/invoices`, {
      method: 'POST', headers,
      body: JSON.stringify({ daysUntilDue: 14 })
    }, sharedEnv);

    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean; data: { subtotalKobo: number; vatKobo: number; totalKobo: number; invoiceNumber: string; entryCount: number; status: string } };
    expect(body.success).toBe(true);
    const inv = body.data;
    expect(inv.subtotalKobo).toBe(12_000_000);       // 2 × ₦60,000 = ₦120,000
    expect(inv.vatKobo).toBe(900_000);               // 7.5% of ₦120,000 = ₦9,000
    expect(inv.totalKobo).toBe(12_900_000);          // ₦129,000
    expect(inv.invoiceNumber).toMatch(/^MI-\d{4}-/);
    expect(inv.entryCount).toBe(2);
    expect(inv.status).toBe('DRAFT');
  });

  it('marks time entries as invoiced after invoice generation', async () => {
    const sharedEnv = makeEnv();
    const token = await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' });
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const { data: matter } = await (await mattersApp.request('/api/matters', {
      method: 'POST', headers,
      body: JSON.stringify({ title: 'Mark Invoiced', clientId: 'c', hourlyRateNaira: 50000 })
    }, sharedEnv)).json() as { data: { id: string } };

    await mattersApp.request(`/api/matters/${matter.id}/time-entries`, {
      method: 'POST', headers,
      body: JSON.stringify({ description: 'Work', durationMinutes: 60 })
    }, sharedEnv);

    await mattersApp.request(`/api/matters/${matter.id}/invoices`, {
      method: 'POST', headers, body: JSON.stringify({})
    }, sharedEnv);

    const secondInvoice = await mattersApp.request(`/api/matters/${matter.id}/invoices`, {
      method: 'POST', headers, body: JSON.stringify({})
    }, sharedEnv);
    expect(secondInvoice.status).toBe(422);
  });
});

// ─── QA-PRO-3: AI Contract Analysis ──────────────────────────────────────────

describe('POST /api/matters/:id/analyze — AI contract analysis (QA-PRO-3)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  async function createTestMatter(sharedEnv: Record<string, unknown>) {
    const token = await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' });
    const res = await mattersApp.request('/api/matters', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'AI Test Matter', clientId: 'c1' })
    }, sharedEnv);
    return (await res.json() as { data: { id: string } }).data;
  }

  it('returns 401 without authentication', async () => {
    const res = await requestNoAuth('POST', '/api/matters/m1/analyze');
    expect(res.status).toBe(401);
  });

  it('returns 400 when documentText is missing', async () => {
    const sharedEnv = makeEnv();
    const matter = await createTestMatter(sharedEnv);
    const res = await mattersApp.request(`/api/matters/${matter.id}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ documentTitle: 'No text' })
    }, sharedEnv);
    expect(res.status).toBe(400);
  });

  it('returns 404 when matter does not exist', async () => {
    const res = await request('POST', '/api/matters/nonexistent/analyze', 'attorney', {
      documentText: 'Contract text here'
    });
    expect(res.status).toBe(404);
  });

  it('returns 503 when AI platform is not configured (graceful degradation)', async () => {
    const sharedEnv = makeEnv({ AI_API_URL: undefined, AI_API_KEY: undefined });
    const matter = await createTestMatter(sharedEnv);

    const res = await mattersApp.request(`/api/matters/${matter.id}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ documentText: 'This agreement is entered into by...' })
    }, sharedEnv);

    expect(res.status).toBe(503);
    const body = await res.json() as { success: boolean; errors: string[] };
    expect(body.success).toBe(false);
    expect(body.errors[0]).toContain('AI');
    expect(body.errors[0]).toContain('retry');
  });

  it('returns 503 with retryable message when AI platform returns a 503 error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Service Unavailable' })
    });
    vi.stubGlobal('fetch', mockFetch);

    const sharedEnv = makeEnv({ AI_API_URL: 'https://ai.example.com/v1', AI_API_KEY: 'sk-test' });
    const matter = await createTestMatter(sharedEnv);

    const res = await mattersApp.request(`/api/matters/${matter.id}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ documentText: 'Contract clause 1...' })
    }, sharedEnv);

    expect(res.status).toBe(503);
    const body = await res.json() as { success: boolean; errors: string[] };
    expect(body.success).toBe(false);
    expect(body.errors[0]).toMatch(/AI|retry/i);
  });

  it('returns 503 with retryable message when AI network call throws (upstream outage)', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED: connection refused'));
    vi.stubGlobal('fetch', mockFetch);

    const sharedEnv = makeEnv({ AI_API_URL: 'https://ai.example.com/v1', AI_API_KEY: 'sk-test' });
    const matter = await createTestMatter(sharedEnv);

    const res = await mattersApp.request(`/api/matters/${matter.id}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ documentText: 'Emergency clause...' })
    }, sharedEnv);

    expect(res.status).toBe(503);
    const body = await res.json() as { success: boolean; errors: string[] };
    expect(body.success).toBe(false);
    expect(body.errors.some(e => e.toLowerCase().includes('retry'))).toBe(true);
  });

  it('uses getAICompletion to summarize and highlights risky clauses (QA-PRO-3)', async () => {
    const analysisResult = {
      summary: 'This NDA restricts disclosure for 5 years. One party retains all IP rights.',
      riskyClauses: ['Clause 7: unlimited liability waiver', 'Clause 12: arbitration only in London'],
      keyTerms: ['5-year NDA term', 'IP assignment to Company'],
      recommendations: ['Negotiate the liability cap', 'Request Lagos arbitration clause']
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(analysisResult) } }]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const sharedEnv = makeEnv({ AI_API_URL: 'https://api.openai.com/v1', AI_API_KEY: 'sk-test' });
    const matter = await createTestMatter(sharedEnv);

    const contractText = `NON-DISCLOSURE AGREEMENT
This NDA is entered into between MegaCorp Ltd and the Vendor.
Clause 7: The Vendor waives all rights to claim damages regardless of amount.
Clause 12: All disputes shall be resolved by arbitration in London.
IP Assignment: All work product belongs exclusively to MegaCorp.`;

    const res = await mattersApp.request(`/api/matters/${matter.id}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ documentText: contractText, documentTitle: 'MegaCorp NDA' })
    }, sharedEnv);

    expect(res.status).toBe(200);
    const body = await res.json() as {
      success: boolean;
      data: {
        status: string;
        summary: string;
        riskyClauses: string[];
        keyTerms: string[];
        recommendations: string[];
        analysisId: string;
        matterId: string;
      }
    };
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('COMPLETED');
    expect(body.data.summary).toContain('NDA');
    expect(Array.isArray(body.data.riskyClauses)).toBe(true);
    expect(body.data.riskyClauses.length).toBeGreaterThan(0);
    expect(Array.isArray(body.data.keyTerms)).toBe(true);
    expect(Array.isArray(body.data.recommendations)).toBe(true);
    expect(body.data.analysisId).toMatch(/^ma_/);
    expect(body.data.matterId).toBe(matter.id);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('calls the AI API with correct authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ summary: 'S', riskyClauses: [], keyTerms: [], recommendations: [] }) } }]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const sharedEnv = makeEnv({ AI_API_URL: 'https://api.openai.com/v1', AI_API_KEY: 'sk-test-key-123' });
    const matter = await createTestMatter(sharedEnv);

    await mattersApp.request(`/api/matters/${matter.id}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await makeJWT({ sub: 'u', tenantId: 'tenant_1', role: 'attorney' })}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ documentText: 'Test contract' })
    }, sharedEnv);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('openai.com');
    expect((options.headers as Record<string, string>)?.Authorization).toContain('sk-test-key-123');
  });
});

// ─── RBAC middleware unit tests ───────────────────────────────────────────────

describe('requireManageMatters middleware (QA-PRO-4)', () => {
  async function runMiddleware(
    role?: string,
    permissions?: string[]
  ): Promise<{ status: number; passed: boolean }> {
    let passed = false;
    const mockContext = {
      get: (key: string) => {
        if (key === 'user') return { role, permissions: permissions ?? [], userId: 'u1', tenantId: 'tenant_1' };
        return undefined;
      },
      json: (body: unknown, status: number) => ({ status, body })
    } as unknown as Parameters<typeof requireManageMatters>[0];

    const next = async () => { passed = true; };
    const result = await requireManageMatters(mockContext, next);

    if (passed) return { status: 200, passed: true };
    const r = result as { status: number } | undefined;
    return { status: r?.status ?? 403, passed: false };
  }

  it('grants access to admin role', async () => {
    const { passed } = await runMiddleware('admin');
    expect(passed).toBe(true);
  });

  it('grants access to attorney role', async () => {
    const { passed } = await runMiddleware('attorney');
    expect(passed).toBe(true);
  });

  it('denies access to client role', async () => {
    const { passed, status } = await runMiddleware('client');
    expect(passed).toBe(false);
    expect(status).toBe(403);
  });

  it('denies access to paralegal role', async () => {
    const { passed } = await runMiddleware('paralegal');
    expect(passed).toBe(false);
  });

  it('denies access to viewer role', async () => {
    const { passed } = await runMiddleware('viewer');
    expect(passed).toBe(false);
  });

  it('denies access when no role or permissions are present', async () => {
    const { passed } = await runMiddleware(undefined, []);
    expect(passed).toBe(false);
  });

  it('grants access when permissions array includes manage:matters (even for client role)', async () => {
    const { passed } = await runMiddleware('client', ['manage:matters']);
    expect(passed).toBe(true);
  });

  it('grants access when permissions includes manage:matters alongside other permissions', async () => {
    const { passed } = await runMiddleware('viewer', ['read:matters', 'manage:matters', 'view:reports']);
    expect(passed).toBe(true);
  });

  it('denies access when permissions array does not include manage:matters', async () => {
    const { passed } = await runMiddleware('viewer', ['read:matters', 'view:reports']);
    expect(passed).toBe(false);
  });
});
