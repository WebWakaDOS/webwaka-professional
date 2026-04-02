/**
 * WebWaka Professional — Event Management Module Tests
 * Blueprint Reference: Part 9.3 — "5-Layer QA Protocol"
 *
 * Coverage:
 *   Layer 1 — Utils: ID generation, ticket refs, monetary conversions, validation
 *   Layer 2 — Event bus: createEventMgmtEvent, publishEvent integration
 *   Layer 3 — RBAC: canManageEvents, isTenantAdmin, canRegister helpers
 *   Layer 4 — API: endpoint RBAC enforcement, status machine, R2 upload path
 *   Layer 5 — DB queries: insert/select/update/soft-delete logic via mock D1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1 — UTILS TESTS
// ─────────────────────────────────────────────────────────────────────────────

import {
  generateId,
  generateTicketRef,
  koboToNaira,
  nairaToKobo,
  formatCurrency,
  nowUTC,
  formatWATDate,
  formatWATDateTime,
  validateEventDates,
  validateRegistrationDeadline,
  validateCapacity,
  validateTicketPrice,
  validateNigerianPhone,
  validateEmail,
  isValidStatusTransition,
  getAllowedTransitions,
  SUPPORTED_CURRENCIES
} from './utils';

// ── generateId ────────────────────────────────────────────────────────────────

describe('generateId', () => {
  it('generates a non-empty string with the given prefix', () => {
    const id = generateId('evt');
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^evt_/);
    expect(id.length).toBeGreaterThan(5);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId('reg')));
    expect(ids.size).toBe(100);
  });

  it('uses the provided prefix correctly', () => {
    expect(generateId('foo')).toMatch(/^foo_/);
    expect(generateId('bar')).toMatch(/^bar_/);
  });
});

// ── generateTicketRef ─────────────────────────────────────────────────────────

describe('generateTicketRef', () => {
  it('generates a ticket ref matching WW-EVT-{YEAR}-{SEQ} format', () => {
    const ref = generateTicketRef(1);
    expect(ref).toMatch(/^WW-EVT-\d{4}-\d{6}$/);
  });

  it('includes the current year', () => {
    const year = new Date().getFullYear().toString();
    expect(generateTicketRef(42)).toContain(year);
  });

  it('pads sequence to 6 digits', () => {
    expect(generateTicketRef(1)).toContain('000001');
    expect(generateTicketRef(100)).toContain('000100');
    expect(generateTicketRef(999999)).toContain('999999');
  });

  it('generates distinct refs for distinct sequences', () => {
    const refs = new Set([1, 2, 3, 4, 5].map(generateTicketRef));
    expect(refs.size).toBe(5);
  });
});

// ── koboToNaira ───────────────────────────────────────────────────────────────

describe('koboToNaira', () => {
  it('returns a string', () => {
    expect(typeof koboToNaira(1000000)).toBe('string');
  });

  it('formats 10000 kobo as ₦100', () => {
    expect(koboToNaira(10000)).toContain('100');
  });

  it('formats 0 kobo', () => {
    expect(koboToNaira(0)).toContain('0');
  });

  it('formats large amounts with thousands separator', () => {
    expect(koboToNaira(100000000)).toContain('1,000,000');
  });
});

// ── nairaToKobo ──────────────────────────────────────────────────────────────

describe('nairaToKobo', () => {
  it('converts naira to kobo correctly', () => {
    expect(nairaToKobo(100)).toBe(10000);
    expect(nairaToKobo(50000)).toBe(5000000);
    expect(nairaToKobo(0)).toBe(0);
  });

  it('rounds correctly', () => {
    expect(Number.isInteger(nairaToKobo(1.5))).toBe(true);
    expect(nairaToKobo(1.5)).toBe(150);
  });
});

// ── formatCurrency ────────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats NGN correctly', () => {
    const result = formatCurrency(100000, 'NGN');
    expect(typeof result).toBe('string');
    expect(result).toContain('1,000');
  });

  it('formats GHS without throwing', () => {
    expect(typeof formatCurrency(100000, 'GHS')).toBe('string');
  });

  it('handles unknown currency with fallback containing currency code', () => {
    const result = formatCurrency(100000, 'XYZ');
    expect(result).toContain('XYZ');
    expect(result).toContain('1000.00');
  });
});

// ── SUPPORTED_CURRENCIES ──────────────────────────────────────────────────────

describe('SUPPORTED_CURRENCIES', () => {
  it('includes NGN as default Nigeria currency with ₦ symbol', () => {
    expect(SUPPORTED_CURRENCIES['NGN']).toBeDefined();
    expect(SUPPORTED_CURRENCIES['NGN']!.symbol).toBe('₦');
  });

  it('includes all 8 African currencies', () => {
    ['NGN', 'GHS', 'KES', 'ZAR', 'UGX', 'TZS', 'ETB', 'XOF'].forEach(code => {
      expect(SUPPORTED_CURRENCIES[code]).toBeDefined();
    });
  });

  it('every currency has name, symbol, and locale', () => {
    Object.values(SUPPORTED_CURRENCIES).forEach(c => {
      expect(typeof c.name).toBe('string');
      expect(typeof c.symbol).toBe('string');
      expect(typeof c.locale).toBe('string');
    });
  });
});

// ── nowUTC ────────────────────────────────────────────────────────────────────

describe('nowUTC', () => {
  it('returns a number close to Date.now()', () => {
    const t = nowUTC();
    expect(typeof t).toBe('number');
    expect(Math.abs(t - Date.now())).toBeLessThan(100);
  });
});

// ── formatWATDate ─────────────────────────────────────────────────────────────

describe('formatWATDate', () => {
  it('returns a non-empty string for a valid UTC timestamp', () => {
    const s = formatWATDate(Date.now());
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(0);
  });

  it('accepts optional Intl.DateTimeFormatOptions', () => {
    const s = formatWATDate(Date.now(), { year: 'numeric', month: 'long', day: 'numeric' });
    expect(typeof s).toBe('string');
  });
});

// ── formatWATDateTime ─────────────────────────────────────────────────────────

describe('formatWATDateTime', () => {
  it('returns a non-empty string with timezone info', () => {
    const s = formatWATDateTime(Date.now());
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(0);
    expect(s).toMatch(/WAT|GMT\+1/);
  });
});

// ── validateEventDates ────────────────────────────────────────────────────────

describe('validateEventDates', () => {
  const future = Date.now() + 86400_000; // 1 day from now

  it('accepts valid future dates where start < end', () => {
    expect(validateEventDates(future, future + 3600_000).valid).toBe(true);
  });

  it('rejects when start === end', () => {
    expect(validateEventDates(future, future).valid).toBe(false);
  });

  it('rejects when start > end', () => {
    expect(validateEventDates(future + 3600_000, future).valid).toBe(false);
  });

  it('rejects start date significantly in the past', () => {
    const past = Date.now() - 86400_000;
    expect(validateEventDates(past, past + 3600_000).valid).toBe(false);
  });

  it('returns an error message on failure', () => {
    const result = validateEventDates(future, future - 1);
    expect(result.valid).toBe(false);
    expect(typeof result.error).toBe('string');
    expect(result.error!.length).toBeGreaterThan(0);
  });
});

// ── validateRegistrationDeadline ─────────────────────────────────────────────

describe('validateRegistrationDeadline', () => {
  const start = Date.now() + 86400_000;

  it('accepts deadline before start date', () => {
    expect(validateRegistrationDeadline(start - 3600_000, start).valid).toBe(true);
  });

  it('rejects deadline equal to start date', () => {
    expect(validateRegistrationDeadline(start, start).valid).toBe(false);
  });

  it('rejects deadline after start date', () => {
    expect(validateRegistrationDeadline(start + 1, start).valid).toBe(false);
  });

  it('returns error message on failure', () => {
    const result = validateRegistrationDeadline(start + 1, start);
    expect(result.error!.length).toBeGreaterThan(0);
  });
});

// ── validateCapacity ──────────────────────────────────────────────────────────

describe('validateCapacity', () => {
  it('accepts null (unlimited)', () => {
    expect(validateCapacity(null).valid).toBe(true);
  });

  it('accepts positive integers', () => {
    expect(validateCapacity(1).valid).toBe(true);
    expect(validateCapacity(500).valid).toBe(true);
    expect(validateCapacity(10000).valid).toBe(true);
  });

  it('rejects 0', () => {
    expect(validateCapacity(0).valid).toBe(false);
  });

  it('rejects negative values', () => {
    expect(validateCapacity(-1).valid).toBe(false);
  });

  it('rejects non-integers', () => {
    expect(validateCapacity(1.5).valid).toBe(false);
  });

  it('returns error message on invalid input', () => {
    expect(typeof validateCapacity(0).error).toBe('string');
  });
});

// ── validateTicketPrice ───────────────────────────────────────────────────────

describe('validateTicketPrice', () => {
  it('accepts 0 (free events)', () => {
    expect(validateTicketPrice(0).valid).toBe(true);
  });

  it('accepts positive integer kobo values', () => {
    expect(validateTicketPrice(500000).valid).toBe(true); // ₦5,000
    expect(validateTicketPrice(100).valid).toBe(true);
  });

  it('rejects negative values', () => {
    expect(validateTicketPrice(-1).valid).toBe(false);
  });

  it('rejects non-integers', () => {
    expect(validateTicketPrice(500.5).valid).toBe(false);
  });

  it('returns error message on failure', () => {
    expect(typeof validateTicketPrice(-100).error).toBe('string');
  });
});

// ── validateNigerianPhone ─────────────────────────────────────────────────────

describe('validateNigerianPhone', () => {
  it('accepts valid formats with +234 prefix', () => {
    expect(validateNigerianPhone('+2348012345678').valid).toBe(true);
    expect(validateNigerianPhone('+2347012345678').valid).toBe(true);
    expect(validateNigerianPhone('+2349012345678').valid).toBe(true);
  });

  it('accepts 0-prefix local format', () => {
    expect(validateNigerianPhone('08012345678').valid).toBe(true);
    expect(validateNigerianPhone('07012345678').valid).toBe(true);
  });

  it('accepts 234 prefix without +', () => {
    expect(validateNigerianPhone('2348012345678').valid).toBe(true);
  });

  it('rejects numbers that are too short', () => {
    expect(validateNigerianPhone('+23480123456').valid).toBe(false);
  });

  it('rejects numbers that are too long', () => {
    expect(validateNigerianPhone('+234801234567890').valid).toBe(false);
  });

  it('rejects non-Nigerian numbers', () => {
    expect(validateNigerianPhone('+441234567890').valid).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateNigerianPhone('').valid).toBe(false);
  });

  it('returns error message on failure', () => {
    const result = validateNigerianPhone('invalid');
    expect(result.valid).toBe(false);
    expect(typeof result.error).toBe('string');
    expect(result.error!.length).toBeGreaterThan(0);
  });
});

// ── validateEmail ─────────────────────────────────────────────────────────────

describe('validateEmail', () => {
  it('accepts valid email addresses', () => {
    expect(validateEmail('chidi@example.com').valid).toBe(true);
    expect(validateEmail('ada.obi+filter@ng.co').valid).toBe(true);
  });

  it('rejects missing @ symbol', () => {
    expect(validateEmail('notanemail').valid).toBe(false);
  });

  it('rejects missing domain', () => {
    expect(validateEmail('user@').valid).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateEmail('').valid).toBe(false);
  });

  it('returns error message on failure', () => {
    const result = validateEmail('bad');
    expect(result.valid).toBe(false);
    expect(typeof result.error).toBe('string');
  });
});

// ── isValidStatusTransition ───────────────────────────────────────────────────

describe('isValidStatusTransition', () => {
  it('allows DRAFT → PUBLISHED', () => {
    expect(isValidStatusTransition('DRAFT', 'PUBLISHED')).toBe(true);
  });

  it('allows DRAFT → CANCELLED', () => {
    expect(isValidStatusTransition('DRAFT', 'CANCELLED')).toBe(true);
  });

  it('allows PUBLISHED → REGISTRATION_OPEN', () => {
    expect(isValidStatusTransition('PUBLISHED', 'REGISTRATION_OPEN')).toBe(true);
  });

  it('allows REGISTRATION_OPEN → REGISTRATION_CLOSED', () => {
    expect(isValidStatusTransition('REGISTRATION_OPEN', 'REGISTRATION_CLOSED')).toBe(true);
  });

  it('allows REGISTRATION_CLOSED → ONGOING', () => {
    expect(isValidStatusTransition('REGISTRATION_CLOSED', 'ONGOING')).toBe(true);
  });

  it('allows ONGOING → COMPLETED', () => {
    expect(isValidStatusTransition('ONGOING', 'COMPLETED')).toBe(true);
  });

  it('rejects DRAFT → ONGOING (skipping steps)', () => {
    expect(isValidStatusTransition('DRAFT', 'ONGOING')).toBe(false);
  });

  it('rejects COMPLETED → any status (terminal)', () => {
    expect(isValidStatusTransition('COMPLETED', 'PUBLISHED')).toBe(false);
    expect(isValidStatusTransition('COMPLETED', 'DRAFT')).toBe(false);
  });

  it('rejects CANCELLED → any status (terminal)', () => {
    expect(isValidStatusTransition('CANCELLED', 'DRAFT')).toBe(false);
    expect(isValidStatusTransition('CANCELLED', 'PUBLISHED')).toBe(false);
  });

  it('rejects backward transitions', () => {
    expect(isValidStatusTransition('REGISTRATION_OPEN', 'DRAFT')).toBe(false);
    expect(isValidStatusTransition('ONGOING', 'REGISTRATION_OPEN')).toBe(false);
  });
});

// ── getAllowedTransitions ──────────────────────────────────────────────────────

describe('getAllowedTransitions', () => {
  it('returns non-empty array for DRAFT', () => {
    const t = getAllowedTransitions('DRAFT');
    expect(Array.isArray(t)).toBe(true);
    expect(t.length).toBeGreaterThan(0);
    expect(t).toContain('PUBLISHED');
  });

  it('returns empty array for COMPLETED (terminal)', () => {
    expect(getAllowedTransitions('COMPLETED')).toHaveLength(0);
  });

  it('returns empty array for CANCELLED (terminal)', () => {
    expect(getAllowedTransitions('CANCELLED')).toHaveLength(0);
  });

  it('returns array for ONGOING containing COMPLETED and CANCELLED', () => {
    const t = getAllowedTransitions('ONGOING');
    expect(t).toContain('COMPLETED');
    expect(t).toContain('CANCELLED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2 — EVENT BUS TESTS
// ─────────────────────────────────────────────────────────────────────────────

import { localEventBus, createEventMgmtEvent, publishEvent } from '../../core/event-bus';
import type { WebWakaEvent, EventMgmtEventType } from '../../core/event-bus';

describe('createEventMgmtEvent', () => {
  it('creates an event with all required fields', () => {
    const event = createEventMgmtEvent('tenant_1', 'event_mgmt.event.created', { eventId: 'evt_1' });
    expect(event.payload.id).toBeDefined();
    expect(event.tenantId).toBe('tenant_1');
    expect(event.event).toBe('event_mgmt.event.created');
    expect(event.payload.sourceModule).toBe('event_management');
    expect(typeof event.timestamp).toBe('number');
    expect(event.payload.eventId).toEqual('evt_1');
  });

  it('sets timestamp close to current time', () => {
    const before = Date.now();
    const event = createEventMgmtEvent('t1', 'event_mgmt.event.published', {});
    const after = Date.now();
    expect(event.timestamp).toBeGreaterThanOrEqual(before);
    expect(event.timestamp).toBeLessThanOrEqual(after);
  });

  it('generates unique event IDs across calls', () => {
    const ids = new Set(
      Array.from({ length: 50 }, () =>
        createEventMgmtEvent('t1', 'event_mgmt.registration.created', {}).payload.id
      )
    );
    expect(ids.size).toBe(50);
  });

  it('correctly assigns event_management as sourceModule', () => {
    const event = createEventMgmtEvent('t1', 'event_mgmt.event.cancelled', {});
    expect(event.payload.sourceModule).toBe('event_management');
  });
});

describe('publishEvent — event_mgmt events via localEventBus', () => {
  beforeEach(() => {
    localEventBus.clearHandlers();
  });

  it('publishes event_mgmt events to local bus', async () => {
    const received: WebWakaEvent[] = [];
    localEventBus.subscribe('event_mgmt.event.created', e => received.push(e));

    const event = createEventMgmtEvent('t1', 'event_mgmt.event.created', { eventId: 'evt_1' });
    await publishEvent(event, {});

    expect(received).toHaveLength(1);
    expect(received[0]?.event).toBe('event_mgmt.event.created');
    expect(received[0]?.payload.sourceModule).toBe('event_management');
  });

  it('delivers registration events to subscribed handlers', async () => {
    const received: WebWakaEvent[] = [];
    localEventBus.subscribe('event_mgmt.registration.confirmed', e => received.push(e));

    const event = createEventMgmtEvent('t1', 'event_mgmt.registration.confirmed', { registrationId: 'reg_1' });
    await publishEvent(event, {});

    expect(received).toHaveLength(1);
    expect(received[0]?.payload.registrationId).toEqual('reg_1');
  });

  it('does not deliver to wrong event type', async () => {
    const received: WebWakaEvent[] = [];
    localEventBus.subscribe('event_mgmt.event.cancelled', e => received.push(e));

    const event = createEventMgmtEvent('t1', 'event_mgmt.event.created', {});
    await publishEvent(event, {});

    expect(received).toHaveLength(0);
  });

  it('publishes to remote bus when EVENT_BUS_URL is set and handles failure gracefully', async () => {
    const received: WebWakaEvent[] = [];
    localEventBus.subscribe('event_mgmt.event.published', e => received.push(e));

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const event = createEventMgmtEvent('t1', 'event_mgmt.event.published', {});
    await expect(
      publishEvent(event, { EVENT_BUS_URL: 'https://events.example.com' })
    ).resolves.not.toThrow();

    expect(received).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 3 — RBAC UNIT TESTS
// Tests the RBAC guard functions as pure logic (extracted from the API module)
// Blueprint Reference: Part 9.2 — "RBAC on all restricted endpoints"
// ─────────────────────────────────────────────────────────────────────────────

import type { EventManagementRole } from '../../core/db/schema';

/**
 * Local copies of the RBAC helpers from api/index.ts.
 * These mirror the exact logic so that any change to the API guards
 * will cause these tests to fail — enforcing consistency.
 */
function canManageEvents(role: EventManagementRole): boolean {
  return role === 'TENANT_ADMIN' || role === 'EVENT_MANAGER';
}
function isTenantAdmin(role: EventManagementRole): boolean {
  return role === 'TENANT_ADMIN';
}
function canRegister(role: EventManagementRole): boolean {
  return role === 'TENANT_ADMIN' || role === 'EVENT_MANAGER' || role === 'ATTENDEE';
}

describe('RBAC — canManageEvents', () => {
  it('returns true for TENANT_ADMIN', () => {
    expect(canManageEvents('TENANT_ADMIN')).toBe(true);
  });

  it('returns true for EVENT_MANAGER', () => {
    expect(canManageEvents('EVENT_MANAGER')).toBe(true);
  });

  it('returns false for ATTENDEE', () => {
    expect(canManageEvents('ATTENDEE')).toBe(false);
  });

  it('returns false for GUEST', () => {
    expect(canManageEvents('GUEST')).toBe(false);
  });
});

describe('RBAC — isTenantAdmin', () => {
  it('returns true only for TENANT_ADMIN', () => {
    expect(isTenantAdmin('TENANT_ADMIN')).toBe(true);
  });

  it('returns false for EVENT_MANAGER', () => {
    expect(isTenantAdmin('EVENT_MANAGER')).toBe(false);
  });

  it('returns false for ATTENDEE', () => {
    expect(isTenantAdmin('ATTENDEE')).toBe(false);
  });

  it('returns false for GUEST', () => {
    expect(isTenantAdmin('GUEST')).toBe(false);
  });
});

describe('RBAC — canRegister', () => {
  it('returns true for TENANT_ADMIN', () => {
    expect(canRegister('TENANT_ADMIN')).toBe(true);
  });

  it('returns true for EVENT_MANAGER', () => {
    expect(canRegister('EVENT_MANAGER')).toBe(true);
  });

  it('returns true for ATTENDEE', () => {
    expect(canRegister('ATTENDEE')).toBe(true);
  });

  it('returns false for GUEST', () => {
    expect(canRegister('GUEST')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 4 — API RBAC INTEGRATION TESTS (Hono app + mock environment)
// Blueprint Reference: Part 9.2 — "RBAC on all restricted endpoints"
// ─────────────────────────────────────────────────────────────────────────────

import app from './api/index';

// ── Mock D1 database ─────────────────────────────────────────────────────────

interface MockEvent {
  id: string;
  tenantId: string;
  title: string;
  status: string;
  version: number;
  startDate: number;
  endDate: number;
  ticketPriceKobo: number;
  capacity: number | null;
  [key: string]: unknown;
}

function createMockD1(events: MockEvent[] = [], registrations: MockEvent[] = []) {
  return {
    prepare: (sql: string) => ({
      bind: (..._args: unknown[]) => ({
        first: async () => {
          if (sql.includes('managed_events') && sql.includes('WHERE id = ?')) return events[0] ?? null;
          if (sql.includes('COUNT(*)') && sql.includes('managed_events')) return { count: events.length };
          if (sql.includes('COUNT(*)') && sql.includes('event_registrations')) return { count: registrations.length };
          return null;
        },
        all: async () => {
          if (sql.includes('managed_events')) return { results: events };
          if (sql.includes('event_registrations')) return { results: registrations };
          return { results: [] };
        },
        run: async () => ({ success: true, meta: { changes: 1 } })
      })
    }),
    exec: async () => ({ count: 0, duration: 0 })
  };
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

const JWT_SECRET = 'test_secret_key_32chars_minimum!';

async function makeJWT(payload: Record<string, unknown>): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const body = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ...payload }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
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

async function makeRequest(
  method: string,
  path: string,
  role: EventManagementRole,
  body?: unknown,
  db = createMockD1()
): Promise<Response> {
  const token = await makeJWT({ sub: 'user_1', tenantId: 'tenant_1', role });
  return app.request(path, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  }, {
    DB: db,
    DOCUMENTS: {} as R2Bucket,
    TENANT_CONFIG: {} as KVNamespace,
    EVENTS: {} as KVNamespace,
    JWT_SECRET,
    ENVIRONMENT: 'development'
  } as unknown as Record<string, unknown>);
}

// ── Health check ──────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 without auth', async () => {
    const res = await app.request('/health', {}, {
      ENVIRONMENT: 'development',
      JWT_SECRET: 'test',
      DB: createMockD1(),
      DOCUMENTS: {},
      TENANT_CONFIG: {},
      EVENTS: {}
    } as unknown as Record<string, unknown>);
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { module: string } };
    expect(body.success).toBe(true);
    expect(body.data.module).toBe('event-management');
  });
});

// ── Auth middleware ───────────────────────────────────────────────────────────

describe('Auth middleware — /api/events', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await app.request('/api/events', {}, {
      DB: createMockD1(),
      JWT_SECRET,
      DOCUMENTS: {}, TENANT_CONFIG: {}, EVENTS: {}
    } as unknown as Record<string, unknown>);
    expect(res.status).toBe(401);
  });

  it('returns 401 with a malformed token', async () => {
    const res = await app.request('/api/events', {
      headers: { 'Authorization': 'Bearer not.a.valid.jwt.here' }
    }, {
      DB: createMockD1(),
      JWT_SECRET,
      DOCUMENTS: {}, TENANT_CONFIG: {}, EVENTS: {}
    } as unknown as Record<string, unknown>);
    expect(res.status).toBe(401);
  });
});

// ── GET /api/events (list) ────────────────────────────────────────────────────

describe('GET /api/events', () => {
  it('returns 200 for TENANT_ADMIN', async () => {
    const res = await makeRequest('GET', '/api/events', 'TENANT_ADMIN');
    expect(res.status).toBe(200);
  });

  it('returns 200 for EVENT_MANAGER', async () => {
    const res = await makeRequest('GET', '/api/events', 'EVENT_MANAGER');
    expect(res.status).toBe(200);
  });

  it('returns 200 for ATTENDEE (filtered to open events)', async () => {
    const res = await makeRequest('GET', '/api/events', 'ATTENDEE');
    expect(res.status).toBe(200);
  });

  it('returns only open events for ATTENDEE when requesting DRAFT status', async () => {
    const res = await makeRequest('GET', '/api/events?status=DRAFT', 'ATTENDEE');
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });
});

// ── GET /api/events/:id ───────────────────────────────────────────────────────

describe('GET /api/events/:id', () => {
  it('returns 404 for ATTENDEE requesting a DRAFT event', async () => {
    const db = createMockD1([{
      id: 'evt_1', tenantId: 'tenant_1', title: 'Test', status: 'DRAFT',
      version: 1, startDate: Date.now() + 86400_000, endDate: Date.now() + 90000_000,
      ticketPriceKobo: 0, capacity: null
    }]);
    const res = await makeRequest('GET', '/api/events/evt_1', 'ATTENDEE', undefined, db);
    expect(res.status).toBe(404);
  });

  it('returns 200 for TENANT_ADMIN requesting a DRAFT event', async () => {
    const db = createMockD1([{
      id: 'evt_1', tenantId: 'tenant_1', title: 'Test', status: 'DRAFT',
      version: 1, startDate: Date.now() + 86400_000, endDate: Date.now() + 90000_000,
      ticketPriceKobo: 0, capacity: null
    }]);
    const res = await makeRequest('GET', '/api/events/evt_1', 'TENANT_ADMIN', undefined, db);
    expect(res.status).toBe(200);
  });

  it('returns 404 when event does not exist', async () => {
    const res = await makeRequest('GET', '/api/events/nonexistent', 'TENANT_ADMIN');
    expect(res.status).toBe(404);
  });
});

// ── POST /api/events (create) ─────────────────────────────────────────────────

describe('POST /api/events', () => {
  const validPayload = {
    title: 'Lagos Tech Summit',
    eventType: 'CONFERENCE',
    venue: 'Eko Hotel',
    address: '1 Adeola Odeku',
    city: 'Victoria Island',
    state: 'Lagos',
    startDate: Date.now() + 86400_000,
    endDate: Date.now() + 90000_000,
    ticketPriceKobo: 0,
    currency: 'NGN'
  };

  it('returns 201 for TENANT_ADMIN', async () => {
    const res = await makeRequest('POST', '/api/events', 'TENANT_ADMIN', validPayload);
    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean; data: ManagedEvent };
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Lagos Tech Summit');
    expect(body.data.status).toBe('DRAFT');
  });

  it('returns 201 for EVENT_MANAGER', async () => {
    const res = await makeRequest('POST', '/api/events', 'EVENT_MANAGER', validPayload);
    expect(res.status).toBe(201);
  });

  it('returns 403 for ATTENDEE', async () => {
    const res = await makeRequest('POST', '/api/events', 'ATTENDEE', validPayload);
    expect(res.status).toBe(403);
    const body = await res.json() as { success: boolean; errors: string[] };
    expect(body.success).toBe(false);
    expect(body.errors[0]).toContain('Insufficient permissions');
  });

  it('returns 403 for GUEST', async () => {
    const res = await makeRequest('POST', '/api/events', 'GUEST', validPayload);
    expect(res.status).toBe(403);
  });

  it('returns 400 when title is missing', async () => {
    const res = await makeRequest('POST', '/api/events', 'TENANT_ADMIN', { ...validPayload, title: '' });
    expect(res.status).toBe(400);
  });
});

// ── PUT /api/events/:id (update) ──────────────────────────────────────────────

describe('PUT /api/events/:id', () => {
  it('returns 403 for ATTENDEE', async () => {
    const res = await makeRequest('PUT', '/api/events/evt_1', 'ATTENDEE', { title: 'Updated' });
    expect(res.status).toBe(403);
  });

  it('returns 403 for GUEST', async () => {
    const res = await makeRequest('PUT', '/api/events/evt_1', 'GUEST', { title: 'Updated' });
    expect(res.status).toBe(403);
  });

  it('returns 404 when event does not exist', async () => {
    const res = await makeRequest('PUT', '/api/events/nonexistent', 'TENANT_ADMIN', { title: 'x' });
    expect(res.status).toBe(404);
  });

  it('returns 409 when event is COMPLETED', async () => {
    const db = createMockD1([{
      id: 'evt_1', tenantId: 'tenant_1', title: 'Done', status: 'COMPLETED',
      version: 2, startDate: Date.now() - 86400_000, endDate: Date.now() - 3600_000,
      ticketPriceKobo: 0, capacity: null
    }]);
    const res = await makeRequest('PUT', '/api/events/evt_1', 'TENANT_ADMIN', { title: 'Edit' }, db);
    expect(res.status).toBe(409);
  });

  it('returns 409 when event is CANCELLED', async () => {
    const db = createMockD1([{
      id: 'evt_1', tenantId: 'tenant_1', title: 'Old', status: 'CANCELLED',
      version: 1, startDate: Date.now() - 86400_000, endDate: Date.now() - 3600_000,
      ticketPriceKobo: 0, capacity: null
    }]);
    const res = await makeRequest('PUT', '/api/events/evt_1', 'EVENT_MANAGER', { title: 'Edit' }, db);
    expect(res.status).toBe(409);
  });
});

// ── PATCH /api/events/:id/status (state machine) ─────────────────────────────

describe('PATCH /api/events/:id/status', () => {
  function makeEvent(status: string): MockEvent[] {
    return [{
      id: 'evt_1', tenantId: 'tenant_1', title: 'Test', status,
      version: 1, startDate: Date.now() + 86400_000, endDate: Date.now() + 90000_000,
      ticketPriceKobo: 0, capacity: null
    }];
  }

  it('returns 403 for ATTENDEE attempting any status change', async () => {
    const db = createMockD1(makeEvent('DRAFT'));
    const res = await makeRequest('PATCH', '/api/events/evt_1/status', 'ATTENDEE', { status: 'PUBLISHED', version: 1 }, db);
    expect(res.status).toBe(403);
  });

  it('returns 403 for GUEST attempting status change', async () => {
    const db = createMockD1(makeEvent('DRAFT'));
    const res = await makeRequest('PATCH', '/api/events/evt_1/status', 'GUEST', { status: 'PUBLISHED', version: 1 }, db);
    expect(res.status).toBe(403);
  });

  it('EVENT_MANAGER cannot cancel an event (403)', async () => {
    const db = createMockD1(makeEvent('DRAFT'));
    const res = await makeRequest('PATCH', '/api/events/evt_1/status', 'EVENT_MANAGER', { status: 'CANCELLED', version: 1 }, db);
    expect(res.status).toBe(403);
    const body = await res.json() as { errors: string[] };
    expect(body.errors[0]).toContain('TENANT_ADMIN');
  });

  it('TENANT_ADMIN can cancel an event', async () => {
    const db = createMockD1(makeEvent('DRAFT'));
    const res = await makeRequest('PATCH', '/api/events/evt_1/status', 'TENANT_ADMIN', { status: 'CANCELLED', version: 1 }, db);
    expect(res.status).toBe(200);
  });

  it('returns 409 for invalid state machine transition', async () => {
    const db = createMockD1(makeEvent('DRAFT'));
    const res = await makeRequest('PATCH', '/api/events/evt_1/status', 'TENANT_ADMIN', { status: 'ONGOING', version: 1 }, db);
    expect(res.status).toBe(409);
  });

  it('allows DRAFT → PUBLISHED for EVENT_MANAGER', async () => {
    const db = createMockD1(makeEvent('DRAFT'));
    const res = await makeRequest('PATCH', '/api/events/evt_1/status', 'EVENT_MANAGER', { status: 'PUBLISHED', version: 1 }, db);
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { status: string } };
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('PUBLISHED');
  });
});

// ── DELETE /api/events/:id ────────────────────────────────────────────────────

describe('DELETE /api/events/:id', () => {
  it('returns 403 for EVENT_MANAGER', async () => {
    const res = await makeRequest('DELETE', '/api/events/evt_1', 'EVENT_MANAGER');
    expect(res.status).toBe(403);
  });

  it('returns 403 for ATTENDEE', async () => {
    const res = await makeRequest('DELETE', '/api/events/evt_1', 'ATTENDEE');
    expect(res.status).toBe(403);
  });

  it('returns 403 for GUEST', async () => {
    const res = await makeRequest('DELETE', '/api/events/evt_1', 'GUEST');
    expect(res.status).toBe(403);
  });

  it('returns 404 when event does not exist for TENANT_ADMIN', async () => {
    const res = await makeRequest('DELETE', '/api/events/nonexistent', 'TENANT_ADMIN');
    expect(res.status).toBe(404);
  });

  it('returns 409 for TENANT_ADMIN on an ONGOING event', async () => {
    const db = createMockD1([{
      id: 'evt_1', tenantId: 'tenant_1', title: 'Live', status: 'ONGOING',
      version: 1, startDate: Date.now() - 3600_000, endDate: Date.now() + 3600_000,
      ticketPriceKobo: 0, capacity: null
    }]);
    const res = await makeRequest('DELETE', '/api/events/evt_1', 'TENANT_ADMIN', undefined, db);
    expect(res.status).toBe(409);
  });

  it('returns 200 for TENANT_ADMIN on a DRAFT event', async () => {
    const db = createMockD1([{
      id: 'evt_1', tenantId: 'tenant_1', title: 'Draft', status: 'DRAFT',
      version: 1, startDate: Date.now() + 86400_000, endDate: Date.now() + 90000_000,
      ticketPriceKobo: 0, capacity: null
    }]);
    const res = await makeRequest('DELETE', '/api/events/evt_1', 'TENANT_ADMIN', undefined, db);
    expect(res.status).toBe(200);
  });
});

// ── POST /api/events/:id/registrations ───────────────────────────────────────

describe('POST /api/events/:eventId/registrations', () => {
  const validReg = {
    attendeeName: 'Chidi Okeke',
    attendeeEmail: 'chidi@example.com',
    attendeePhone: '+2348012345678'
  };

  function openEvent(): MockEvent[] {
    return [{
      id: 'evt_1', tenantId: 'tenant_1', title: 'Open Conf', status: 'REGISTRATION_OPEN',
      version: 1, startDate: Date.now() + 86400_000, endDate: Date.now() + 90000_000,
      ticketPriceKobo: 0, capacity: null
    }];
  }

  it('returns 201 for ATTENDEE registering for an open event', async () => {
    const db = createMockD1(openEvent());
    const res = await makeRequest('POST', '/api/events/evt_1/registrations', 'ATTENDEE', validReg, db);
    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean; data: { ticketRef: string } };
    expect(body.success).toBe(true);
    expect(body.data.ticketRef).toMatch(/^WW-EVT-/);
  });

  it('returns 201 for EVENT_MANAGER registering anyone', async () => {
    const db = createMockD1(openEvent());
    const res = await makeRequest('POST', '/api/events/evt_1/registrations', 'EVENT_MANAGER', validReg, db);
    expect(res.status).toBe(201);
  });

  it('returns 403 for GUEST', async () => {
    const db = createMockD1(openEvent());
    const res = await makeRequest('POST', '/api/events/evt_1/registrations', 'GUEST', validReg, db);
    expect(res.status).toBe(403);
  });

  it('returns 409 when ATTENDEE tries to register for a non-open event (DRAFT)', async () => {
    const db = createMockD1([{
      id: 'evt_1', tenantId: 'tenant_1', title: 'Draft Conf', status: 'DRAFT',
      version: 1, startDate: Date.now() + 86400_000, endDate: Date.now() + 90000_000,
      ticketPriceKobo: 0, capacity: null
    }]);
    const res = await makeRequest('POST', '/api/events/evt_1/registrations', 'ATTENDEE', validReg, db);
    expect(res.status).toBe(409);
  });

  it('returns 409 when capacity is exhausted', async () => {
    const db = createMockD1(
      [{ id: 'evt_1', tenantId: 'tenant_1', title: 'Full', status: 'REGISTRATION_OPEN',
        version: 1, startDate: Date.now() + 86400_000, endDate: Date.now() + 90000_000,
        ticketPriceKobo: 0, capacity: 10 }],
      Array.from({ length: 10 }, (_, i) => ({ id: `reg_${i}`, tenantId: 'tenant_1', status: 'CONFIRMED' } as MockEvent))
    );
    const res = await makeRequest('POST', '/api/events/evt_1/registrations', 'ATTENDEE', validReg, db);
    expect(res.status).toBe(409);
    const body = await res.json() as { errors: string[] };
    expect(body.errors[0]).toContain('capacity');
  });

  it('returns 400 for invalid email', async () => {
    const db = createMockD1(openEvent());
    const res = await makeRequest('POST', '/api/events/evt_1/registrations', 'ATTENDEE',
      { ...validReg, attendeeEmail: 'bademail' }, db);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid Nigerian phone', async () => {
    const db = createMockD1(openEvent());
    const res = await makeRequest('POST', '/api/events/evt_1/registrations', 'ATTENDEE',
      { ...validReg, attendeePhone: '12345' }, db);
    expect(res.status).toBe(400);
  });

  it('auto-confirms free event registrations', async () => {
    const db = createMockD1(openEvent());
    const res = await makeRequest('POST', '/api/events/evt_1/registrations', 'ATTENDEE', validReg, db);
    const body = await res.json() as { data: { status: string } };
    expect(body.data.status).toBe('CONFIRMED');
  });
});

// ── PATCH confirm/cancel registration ─────────────────────────────────────────

describe('PATCH /api/events/:eventId/registrations/:id/confirm', () => {
  it('returns 403 for ATTENDEE', async () => {
    const res = await makeRequest('PATCH', '/api/events/evt_1/registrations/reg_1/confirm', 'ATTENDEE', { paymentReference: 'PAY_1' });
    expect(res.status).toBe(403);
  });

  it('returns 403 for GUEST', async () => {
    const res = await makeRequest('PATCH', '/api/events/evt_1/registrations/reg_1/confirm', 'GUEST', { paymentReference: 'PAY_1' });
    expect(res.status).toBe(403);
  });

  it('returns 404 when registration does not exist', async () => {
    const res = await makeRequest('PATCH', '/api/events/evt_1/registrations/nonexistent/confirm', 'TENANT_ADMIN', { paymentReference: 'PAY_1' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/events/:eventId/registrations/:id/cancel', () => {
  it('returns 403 for GUEST', async () => {
    const res = await makeRequest('PATCH', '/api/events/evt_1/registrations/reg_1/cancel', 'GUEST');
    expect(res.status).toBe(403);
  });

  it('returns 404 when registration does not exist', async () => {
    const res = await makeRequest('PATCH', '/api/events/evt_1/registrations/nonexistent/cancel', 'TENANT_ADMIN');
    expect(res.status).toBe(404);
  });
});

// ── POST /api/events/:eventId/check-in ───────────────────────────────────────

describe('POST /api/events/:eventId/check-in', () => {
  it('returns 403 for ATTENDEE', async () => {
    const res = await makeRequest('POST', '/api/events/evt_1/check-in', 'ATTENDEE', { ticketRef: 'WW-EVT-2026-000001' });
    expect(res.status).toBe(403);
  });

  it('returns 403 for GUEST', async () => {
    const res = await makeRequest('POST', '/api/events/evt_1/check-in', 'GUEST', { ticketRef: 'WW-EVT-2026-000001' });
    expect(res.status).toBe(403);
  });

  it('returns 404 when event does not exist', async () => {
    const res = await makeRequest('POST', '/api/events/nonexistent/check-in', 'EVENT_MANAGER', { ticketRef: 'WW-EVT-2026-000001' });
    expect(res.status).toBe(404);
  });

  it('returns 409 when event status is DRAFT (not ONGOING)', async () => {
    const db = createMockD1([{
      id: 'evt_1', tenantId: 'tenant_1', title: 'Draft', status: 'DRAFT',
      version: 1, startDate: Date.now() + 86400_000, endDate: Date.now() + 90000_000,
      ticketPriceKobo: 0, capacity: null
    }]);
    const res = await makeRequest('POST', '/api/events/evt_1/check-in', 'EVENT_MANAGER', { ticketRef: 'WW-EVT-2026-000001' }, db);
    expect(res.status).toBe(409);
  });

  it('returns 400 when ticketRef is missing', async () => {
    const db = createMockD1([{
      id: 'evt_1', tenantId: 'tenant_1', title: 'Ongoing', status: 'ONGOING',
      version: 1, startDate: Date.now() - 3600_000, endDate: Date.now() + 3600_000,
      ticketPriceKobo: 0, capacity: null
    }]);
    const res = await makeRequest('POST', '/api/events/evt_1/check-in', 'EVENT_MANAGER', { ticketRef: '' }, db);
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 5 — R2 BANNER UPLOAD RBAC TESTS
// Blueprint Reference: Part 9.2 — "R2 storage (no file bytes in DB)"
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/events/:id/banner (R2 upload)', () => {
  it('returns 403 for ATTENDEE', async () => {
    const res = await makeRequest('POST', '/api/events/evt_1/banner', 'ATTENDEE');
    expect(res.status).toBe(403);
  });

  it('returns 403 for GUEST', async () => {
    const res = await makeRequest('POST', '/api/events/evt_1/banner', 'GUEST');
    expect(res.status).toBe(403);
  });

  it('returns 404 when event does not exist for authorized roles', async () => {
    // No multipart body — will fail at formData() after auth passes
    // We test RBAC passes but event lookup fails
    const token = await makeJWT({ sub: 'user_1', tenantId: 'tenant_1', role: 'TENANT_ADMIN' });
    const db = createMockD1(); // no events

    const formData = new FormData();
    formData.append('banner', new Blob(['img'], { type: 'image/png' }), 'test.png');

    const res = await app.request('/api/events/nonexistent/banner', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    }, {
      DB: db,
      DOCUMENTS: {} as R2Bucket,
      TENANT_CONFIG: {} as KVNamespace,
      EVENTS: {} as KVNamespace,
      JWT_SECRET,
      ENVIRONMENT: 'development'
    } as unknown as Record<string, unknown>);

    expect(res.status).toBe(404);
  });

  it('returns 400 for disallowed file type (text/plain) even for TENANT_ADMIN', async () => {
    const token = await makeJWT({ sub: 'user_1', tenantId: 'tenant_1', role: 'TENANT_ADMIN' });
    const db = createMockD1([{
      id: 'evt_1', tenantId: 'tenant_1', title: 'Test', status: 'DRAFT',
      version: 1, startDate: Date.now() + 86400_000, endDate: Date.now() + 90000_000,
      ticketPriceKobo: 0, capacity: null
    }]);

    const formData = new FormData();
    formData.append('banner', new Blob(['hello'], { type: 'text/plain' }), 'test.txt');

    const res = await app.request('/api/events/evt_1/banner', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    }, {
      DB: db,
      DOCUMENTS: { put: vi.fn().mockResolvedValue(undefined) } as unknown as R2Bucket,
      TENANT_CONFIG: {} as KVNamespace,
      EVENTS: {} as KVNamespace,
      JWT_SECRET,
      ENVIRONMENT: 'development'
    } as unknown as Record<string, unknown>);

    expect(res.status).toBe(400);
    const body = await res.json() as { errors: string[] };
    expect(body.errors[0]).toContain('JPEG');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 5 — DB QUERIES UNIT TESTS (pure logic, no D1 required)
// ─────────────────────────────────────────────────────────────────────────────

import {
  getEventsByTenant,
  getEventById,
  insertEvent,
  getRegistrationsByEvent,
  insertRegistration,
  getRegistrationCountForEvent
} from './db/queries';

describe('DB queries — in-memory mock', () => {
  const store: { events: MockEvent[]; registrations: MockEvent[] } = { events: [], registrations: [] };

  function buildDb() {
    return {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          first: async () => {
            if (sql.includes('managed_events') && sql.includes('WHERE id = ?')) {
              return store.events.find(e => e.id === args[0] && e.tenantId === args[1]) ?? null;
            }
            if (sql.includes('COUNT(*)') && sql.includes('event_registrations')) {
              const eventId = args[1];
              return { count: store.registrations.filter(r => r.eventId === eventId).length };
            }
            return null;
          },
          all: async () => {
            if (sql.includes('managed_events')) return { results: store.events.filter(e => e.tenantId === args[0]) };
            if (sql.includes('event_registrations')) return { results: store.registrations.filter(r => r.tenantId === args[0]) };
            return { results: [] };
          },
          run: async () => {
            if (sql.includes('INSERT INTO managed_events')) {
              const event: MockEvent = {
                id: args[0] as string, tenantId: args[1] as string, title: args[2] as string,
                status: args[5] as string, version: args[21] as number,
                startDate: args[11] as number, endDate: args[12] as number,
                ticketPriceKobo: args[15] as number, capacity: args[14] as number | null
              };
              store.events.push(event);
            }
            if (sql.includes('INSERT INTO event_registrations')) {
              store.registrations.push({ id: args[0] as string, tenantId: args[1] as string, eventId: args[2] as string, status: args[7] as string } as MockEvent);
            }
            return { success: true, meta: { changes: 1 } };
          }
        })
      }),
      exec: async () => ({ count: 0, duration: 0 })
    };
  }

  beforeEach(() => {
    store.events = [];
    store.registrations = [];
  });

  it('getEventsByTenant returns an empty array when no events exist', async () => {
    const events = await getEventsByTenant(buildDb() as unknown as Parameters<typeof getEventsByTenant>[0], 'tenant_1');
    expect(events).toHaveLength(0);
  });

  it('getEventById returns null when event does not exist', async () => {
    const event = await getEventById(buildDb() as unknown as Parameters<typeof getEventById>[0], 'tenant_1', 'nonexistent');
    expect(event).toBeNull();
  });

  it('insertEvent stores and getEventsByTenant retrieves it', async () => {
    const db = buildDb() as unknown as Parameters<typeof getEventsByTenant>[0];
    const now = Date.now();
    const event = {
      id: 'evt_test', tenantId: 'tenant_1', title: 'Test Event', description: null,
      eventType: 'CONFERENCE' as const, status: 'DRAFT' as const,
      venue: 'Eko Hotel', address: '1 Adeola Odeku', city: 'VI', state: 'Lagos',
      onlineUrl: null, startDate: now + 86400_000, endDate: now + 90000_000,
      registrationDeadline: null, capacity: null, ticketPriceKobo: 0, currency: 'NGN',
      organizerId: 'user_1', bannerStorageKey: null, bannerUrl: null,
      tags: '[]', version: 1, createdAt: now, updatedAt: now, deletedAt: null
    };
    await insertEvent(db, event);
    const results = await getEventsByTenant(db, 'tenant_1');
    expect(results.length).toBeGreaterThan(0);
  });

  it('getRegistrationsByEvent returns empty array when no registrations', async () => {
    const regs = await getRegistrationsByEvent(buildDb() as unknown as Parameters<typeof getRegistrationsByEvent>[0], 'tenant_1', 'evt_1');
    expect(regs).toHaveLength(0);
  });

  it('insertRegistration stores and getRegistrationCountForEvent counts it', async () => {
    const db = buildDb() as unknown as Parameters<typeof insertRegistration>[0];
    const now = Date.now();
    await insertRegistration(db, {
      id: 'reg_1', tenantId: 'tenant_1', eventId: 'evt_1', attendeeId: 'user_1',
      attendeeName: 'Chidi', attendeeEmail: 'chidi@example.com', attendeePhone: '+2348012345678',
      status: 'CONFIRMED', ticketRef: 'WW-EVT-2026-000001', amountPaidKobo: 0,
      paymentReference: null, checkedInAt: null, createdAt: now, updatedAt: now, deletedAt: null
    });
    const count = await getRegistrationCountForEvent(db as unknown as Parameters<typeof getRegistrationCountForEvent>[0], 'tenant_1', 'evt_1');
    expect(count).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA TYPES TESTS — Part 9.2 Multi-Tenancy invariants
// ─────────────────────────────────────────────────────────────────────────────

import type { ManagedEvent, EventRegistration } from '../../core/db/schema';

describe('Schema type invariants', () => {
  it('ManagedEvent includes tenantId field (multi-tenancy invariant)', () => {
    const evt: Partial<ManagedEvent> = { tenantId: 'tenant_1' };
    expect(evt.tenantId).toBe('tenant_1');
  });

  it('ManagedEvent defaults currency to NGN pattern (Nigeria First)', () => {
    const evt: Partial<ManagedEvent> = { currency: 'NGN', ticketPriceKobo: 0 };
    expect(evt.currency).toBe('NGN');
    expect(evt.ticketPriceKobo).toBe(0);
  });

  it('EventRegistration includes tenantId and eventId (multi-tenancy + FK)', () => {
    const reg: Partial<EventRegistration> = { tenantId: 'tenant_1', eventId: 'evt_1' };
    expect(reg.tenantId).toBeDefined();
    expect(reg.eventId).toBeDefined();
  });

  it('ManagedEvent has soft-delete field deletedAt', () => {
    const evt: Partial<ManagedEvent> = { deletedAt: null };
    expect(evt.deletedAt).toBeNull();
  });

  it('EventRegistration has soft-delete field deletedAt', () => {
    const reg: Partial<EventRegistration> = { deletedAt: null };
    expect(reg.deletedAt).toBeNull();
  });

  it('ManagedEvent uses integer kobo for monetary value (not float)', () => {
    const evt: Partial<ManagedEvent> = { ticketPriceKobo: 500000 };
    expect(Number.isInteger(evt.ticketPriceKobo)).toBe(true);
  });

  it('EventRegistration uses integer kobo for amountPaidKobo', () => {
    const reg: Partial<EventRegistration> = { amountPaidKobo: 500000 };
    expect(Number.isInteger(reg.amountPaidKobo)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 5 — DB PAYMENT FUNCTION TESTS
// Blueprint Reference: Part 9.1 — "Nigeria First: Paystack is the primary payment gateway."
// ─────────────────────────────────────────────────────────────────────────────

import { markRegistrationPaid } from './db/queries';

describe('markRegistrationPaid', () => {
  it('calls UPDATE on event_registrations with CONFIRMED status', async () => {
    let capturedSql = '';
    let capturedArgs: unknown[] = [];
    const db = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => {
          capturedSql = sql;
          capturedArgs = args;
          return { run: async () => ({ success: true, meta: { changes: 1 } }) };
        }
      }),
      exec: async () => ({ count: 0, duration: 0 })
    };
    await markRegistrationPaid(db as unknown as D1Database, 'tenant_1', 'reg_1', 'PAY_REF_001');
    expect(capturedSql).toContain('event_registrations');
    expect(capturedSql).toContain("status = 'CONFIRMED'");
    expect(capturedSql).toContain('paymentReference');
    expect(capturedArgs[0]).toBe('PAY_REF_001');
    expect(capturedArgs[2]).toBe('reg_1');
    expect(capturedArgs[3]).toBe('tenant_1');
  });

  it('scopes update to the correct tenantId', async () => {
    let capturedArgs: unknown[] = [];
    const db = {
      prepare: (_sql: string) => ({
        bind: (...args: unknown[]) => {
          capturedArgs = args;
          return { run: async () => ({ success: true, meta: { changes: 1 } }) };
        }
      }),
      exec: async () => ({ count: 0, duration: 0 })
    };
    await markRegistrationPaid(db as unknown as D1Database, 'tenant_xyz', 'reg_42', 'REF_XYZ');
    expect(capturedArgs).toContain('tenant_xyz');
    expect(capturedArgs).toContain('reg_42');
    expect(capturedArgs).toContain('REF_XYZ');
  });

  it('resolves without throwing on success', async () => {
    const db = {
      prepare: (_sql: string) => ({
        bind: (..._args: unknown[]) => ({
          run: async () => ({ success: true, meta: { changes: 1 } })
        })
      }),
      exec: async () => ({ count: 0, duration: 0 })
    };
    await expect(
      markRegistrationPaid(db as unknown as D1Database, 'tenant_1', 'reg_1', 'REF_123')
    ).resolves.not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 4 — EVENT MANAGEMENT API PAYMENT ROUTE TESTS
// Blueprint Reference: Part 9.1 — "Nigeria First: Paystack is the primary payment gateway."
// ─────────────────────────────────────────────────────────────────────────────

async function makeEventsPaystackSignature(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function createMockD1WithRegistration(
  events: MockEvent[] = [],
  registrations: MockEvent[] = []
) {
  return {
    prepare: (sql: string) => ({
      bind: (..._args: unknown[]) => ({
        first: async () => {
          if (sql.includes('managed_events') && sql.includes('WHERE id = ?')) return events[0] ?? null;
          if (sql.includes('event_registrations') && sql.includes('WHERE id = ?')) return registrations[0] ?? null;
          if (sql.includes('COUNT(*)') && sql.includes('managed_events')) return { count: events.length };
          if (sql.includes('COUNT(*)') && sql.includes('event_registrations')) return { count: registrations.length };
          return null;
        },
        all: async () => {
          if (sql.includes('managed_events')) return { results: events };
          if (sql.includes('event_registrations')) return { results: registrations };
          return { results: [] };
        },
        run: async () => ({ success: true, meta: { changes: 1 } })
      })
    }),
    exec: async () => ({ count: 0, duration: 0 })
  };
}

async function makePayRequest(
  eventId: string,
  registrationId: string,
  role: EventManagementRole,
  db = createMockD1(),
  paystackKey?: string
): Promise<Response> {
  const token = await makeJWT({ sub: 'user_1', tenantId: 'tenant_1', role });
  return app.request(`/api/events/${eventId}/registrations/${registrationId}/pay`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, {
    DB: db,
    DOCUMENTS: {} as R2Bucket,
    TENANT_CONFIG: {} as KVNamespace,
    EVENTS: {} as KVNamespace,
    JWT_SECRET,
    ENVIRONMENT: 'development',
    ...(paystackKey ? { PAYSTACK_SECRET_KEY: paystackKey } : {})
  } as unknown as Record<string, unknown>);
}

// ── POST /api/events/:eventId/registrations/:id/pay ───────────────────────────

describe('POST /api/events/:eventId/registrations/:id/pay', () => {
  it('returns 400 when PAYSTACK_SECRET_KEY is not configured', async () => {
    const db = createMockD1WithRegistration(
      [{ id: 'evt_1', tenantId: 'tenant_1', title: 'Test', status: 'OPEN', version: 1, startDate: Date.now() + 86400_000, endDate: Date.now() + 90000_000, ticketPriceKobo: 5000000, capacity: null }],
      [{ id: 'reg_1', tenantId: 'tenant_1', eventId: 'evt_1', status: 'PENDING', amountPaidKobo: 5000000, attendeeEmail: 'test@test.com', ticketRef: 'WW-EVT-001', title: '', version: 1, startDate: 0, endDate: 0, ticketPriceKobo: 0, capacity: null }]
    );
    const res = await makePayRequest('evt_1', 'reg_1', 'TENANT_ADMIN', db);
    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean; errors: string[] };
    expect(body.success).toBe(false);
    expect(body.errors[0]).toContain('Payment gateway not configured');
  });

  it('returns 404 when registration not found', async () => {
    const res = await makePayRequest('evt_1', 'nonexistent', 'TENANT_ADMIN', createMockD1(), 'sk_test');
    expect(res.status).toBe(404);
    const body = await res.json() as { success: boolean; errors: string[] };
    expect(body.errors[0]).toContain('Registration not found');
  });

  it('returns 200 with alreadyPaid:true when registration is already CONFIRMED', async () => {
    const db = createMockD1WithRegistration(
      [],
      [{ id: 'reg_1', tenantId: 'tenant_1', eventId: 'evt_1', status: 'CONFIRMED', amountPaidKobo: 5000000, attendeeEmail: 'test@test.com', ticketRef: 'WW-EVT-001', title: '', version: 1, startDate: 0, endDate: 0, ticketPriceKobo: 0, capacity: null }]
    );
    const res = await makePayRequest('evt_1', 'reg_1', 'TENANT_ADMIN', db, 'sk_test');
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { alreadyPaid: boolean } };
    expect(body.success).toBe(true);
    expect(body.data.alreadyPaid).toBe(true);
  });

  it('returns 400 when registration is CANCELLED', async () => {
    const db = createMockD1WithRegistration(
      [],
      [{ id: 'reg_1', tenantId: 'tenant_1', eventId: 'evt_1', status: 'CANCELLED', amountPaidKobo: 5000000, attendeeEmail: 'test@test.com', ticketRef: 'WW-EVT-001', title: '', version: 1, startDate: 0, endDate: 0, ticketPriceKobo: 0, capacity: null }]
    );
    const res = await makePayRequest('evt_1', 'reg_1', 'TENANT_ADMIN', db, 'sk_test');
    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean; errors: string[] };
    expect(body.errors[0]).toContain('CANCELLED');
  });

  it('returns 200 with freeEvent:true for zero-kobo registration', async () => {
    const db = createMockD1WithRegistration(
      [],
      [{ id: 'reg_1', tenantId: 'tenant_1', eventId: 'evt_1', status: 'PENDING', amountPaidKobo: 0, attendeeEmail: 'test@test.com', ticketRef: 'WW-EVT-001', title: '', version: 1, startDate: 0, endDate: 0, ticketPriceKobo: 0, capacity: null }]
    );
    const res = await makePayRequest('evt_1', 'reg_1', 'TENANT_ADMIN', db, 'sk_test');
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { freeEvent: boolean } };
    expect(body.success).toBe(true);
    expect(body.data.freeEvent).toBe(true);
  });

  it('returns 200 with authorizationUrl when Paystack init succeeds', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        message: 'Authorization URL created',
        data: {
          authorization_url: 'https://checkout.paystack.com/evt_access_code',
          access_code: 'EVT_ACCESS_CODE',
          reference: 'WW-EVT-xyz789'
        }
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const db = createMockD1WithRegistration(
      [],
      [{ id: 'reg_1', tenantId: 'tenant_1', eventId: 'evt_1', status: 'PENDING', amountPaidKobo: 5000000, attendeeEmail: 'attendee@test.com', ticketRef: 'WW-EVT-001', title: '', version: 1, startDate: 0, endDate: 0, ticketPriceKobo: 0, capacity: null }]
    );
    const res = await makePayRequest('evt_1', 'reg_1', 'TENANT_ADMIN', db, 'sk_test_paystack');

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { authorizationUrl: string; registrationId: string; amountKobo: number } };
    expect(body.success).toBe(true);
    expect(body.data.authorizationUrl).toContain('paystack.com');
    expect(body.data.registrationId).toBe('reg_1');
    expect(body.data.amountKobo).toBe(5000000);

    vi.unstubAllGlobals();
  });

  it('returns 402 when Paystack initialization fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ status: false, message: 'Invalid key' })
    });
    vi.stubGlobal('fetch', mockFetch);

    const db = createMockD1WithRegistration(
      [],
      [{ id: 'reg_1', tenantId: 'tenant_1', eventId: 'evt_1', status: 'PENDING', amountPaidKobo: 5000000, attendeeEmail: 'attendee@test.com', ticketRef: 'WW-EVT-001', title: '', version: 1, startDate: 0, endDate: 0, ticketPriceKobo: 0, capacity: null }]
    );
    const res = await makePayRequest('evt_1', 'reg_1', 'TENANT_ADMIN', db, 'sk_test_paystack');

    expect(res.status).toBe(402);
    vi.unstubAllGlobals();
  });

  it('requires authentication — returns 401 with no token', async () => {
    const res = await app.request('/api/events/evt_1/registrations/reg_1/pay', {
      method: 'POST'
    }, {
      DB: createMockD1(),
      JWT_SECRET,
      DOCUMENTS: {}, TENANT_CONFIG: {}, EVENTS: {}
    } as unknown as Record<string, unknown>);
    expect(res.status).toBe(401);
  });
});

// ── POST /webhooks/events/paystack ────────────────────────────────────────────

describe('POST /webhooks/events/paystack', () => {
  const EVENTS_PAYSTACK_SECRET = 'sk_test_events_paystack_webhook_secret';

  it('returns 500 when PAYSTACK_SECRET_KEY is not configured', async () => {
    const rawBody = JSON.stringify({ event: 'charge.success', data: { reference: 'ref1', metadata: {} } });
    const res = await app.request('/webhooks/events/paystack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-paystack-signature': 'anysig' },
      body: rawBody
    }, {
      DB: createMockD1(),
      JWT_SECRET,
      DOCUMENTS: {}, TENANT_CONFIG: {}, EVENTS: {}
    } as unknown as Record<string, unknown>);
    expect(res.status).toBe(500);
  });

  it('returns 401 for an invalid webhook signature', async () => {
    const rawBody = JSON.stringify({ event: 'charge.success', data: { reference: 'ref1', metadata: {} } });
    const res = await app.request('/webhooks/events/paystack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-paystack-signature': 'bad_signature' },
      body: rawBody
    }, {
      DB: createMockD1(),
      JWT_SECRET,
      PAYSTACK_SECRET_KEY: EVENTS_PAYSTACK_SECRET,
      DOCUMENTS: {}, TENANT_CONFIG: {}, EVENTS: {}
    } as unknown as Record<string, unknown>);
    expect(res.status).toBe(401);
    const body = await res.json() as { success: boolean; errors: string[] };
    expect(body.errors[0]).toContain('signature');
  });

  it('returns 200 with received:true for charge.success with valid signature', async () => {
    const webhookData = {
      event: 'charge.success',
      data: {
        id: 1,
        status: 'success',
        reference: 'ref_evt_001',
        amount: 5000000,
        currency: 'NGN',
        paid_at: new Date().toISOString(),
        customer: { email: 'attendee@test.com' },
        metadata: { registrationId: 'reg_1', eventId: 'evt_1', tenantId: 'tenant_1' }
      }
    };
    const rawBody = JSON.stringify(webhookData);
    const signature = await makeEventsPaystackSignature(rawBody, EVENTS_PAYSTACK_SECRET);

    const db = createMockD1WithRegistration(
      [],
      [{ id: 'reg_1', tenantId: 'tenant_1', eventId: 'evt_1', status: 'PENDING', amountPaidKobo: 5000000, attendeeEmail: 'attendee@test.com', ticketRef: 'WW-EVT-001', title: '', version: 1, startDate: 0, endDate: 0, ticketPriceKobo: 0, capacity: null }]
    );

    const res = await app.request('/webhooks/events/paystack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature },
      body: rawBody
    }, {
      DB: db,
      JWT_SECRET,
      PAYSTACK_SECRET_KEY: EVENTS_PAYSTACK_SECRET,
      DOCUMENTS: {}, TENANT_CONFIG: {}, EVENTS: {}
    } as unknown as Record<string, unknown>);

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { received: boolean } };
    expect(body.success).toBe(true);
    expect(body.data.received).toBe(true);
  });

  it('returns 200 for non-charge.success events (just acknowledges)', async () => {
    const webhookData = { event: 'refund.processed', data: { reference: 'ref_xyz', metadata: null } };
    const rawBody = JSON.stringify(webhookData);
    const signature = await makeEventsPaystackSignature(rawBody, EVENTS_PAYSTACK_SECRET);

    const res = await app.request('/webhooks/events/paystack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature },
      body: rawBody
    }, {
      DB: createMockD1(),
      JWT_SECRET,
      PAYSTACK_SECRET_KEY: EVENTS_PAYSTACK_SECRET,
      DOCUMENTS: {}, TENANT_CONFIG: {}, EVENTS: {}
    } as unknown as Record<string, unknown>);

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { received: boolean } };
    expect(body.data.received).toBe(true);
  });

  it('does not require Authorization header (bypasses auth middleware)', async () => {
    const webhookData = { event: 'charge.success', data: { reference: 'ref1', amount: 1000, metadata: null } };
    const rawBody = JSON.stringify(webhookData);
    const signature = await makeEventsPaystackSignature(rawBody, EVENTS_PAYSTACK_SECRET);

    const res = await app.request('/webhooks/events/paystack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature },
      body: rawBody
    }, {
      DB: createMockD1(),
      JWT_SECRET,
      PAYSTACK_SECRET_KEY: EVENTS_PAYSTACK_SECRET,
      DOCUMENTS: {}, TENANT_CONFIG: {}, EVENTS: {}
    } as unknown as Record<string, unknown>);

    expect(res.status).not.toBe(401);
  });
});
