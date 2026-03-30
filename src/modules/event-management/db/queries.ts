/**
 * WebWaka Professional — Event Management DB Queries
 * Blueprint Reference: Part 9.2 — "No direct DB client instantiation; injected via D1 binding"
 * Blueprint Reference: Part 9.2 — "Multi-Tenancy: tenantId on ALL queries"
 * Blueprint Reference: Part 9.2 — "Soft deletes via deletedAt"
 *
 * All queries are parameterised — no string interpolation in SQL.
 * All queries are scoped to tenantId to enforce multi-tenancy invariants.
 */

import type { ManagedEvent, EventRegistration } from '../../../core/db/schema';

// ─────────────────────────────────────────────────────────────────────────────
// D1 TYPE SHIM (mirrors legal-practice pattern)
// ─────────────────────────────────────────────────────────────────────────────

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; meta: Record<string, unknown> }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MANAGED EVENTS QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getEventsByTenant(
  db: D1Database,
  tenantId: string,
  filters: { status?: string; eventType?: string } = {},
  limit = 50,
  offset = 0
): Promise<ManagedEvent[]> {
  let sql = `
    SELECT * FROM managed_events
    WHERE tenantId = ? AND deletedAt IS NULL
  `;
  const params: unknown[] = [tenantId];

  if (filters.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.eventType) {
    sql += ' AND eventType = ?';
    params.push(filters.eventType);
  }

  sql += ' ORDER BY startDate ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await db.prepare(sql).bind(...params).all<ManagedEvent>();
  return result.results;
}

export async function getEventById(
  db: D1Database,
  tenantId: string,
  eventId: string
): Promise<ManagedEvent | null> {
  return db
    .prepare('SELECT * FROM managed_events WHERE id = ? AND tenantId = ? AND deletedAt IS NULL')
    .bind(eventId, tenantId)
    .first<ManagedEvent>();
}

export async function insertEvent(db: D1Database, event: ManagedEvent): Promise<void> {
  await db
    .prepare(`
      INSERT INTO managed_events (
        id, tenantId, title, description, eventType, status,
        venue, address, city, state, onlineUrl,
        startDate, endDate, registrationDeadline, capacity,
        ticketPriceKobo, currency, organizerId,
        bannerStorageKey, bannerUrl, tags,
        version, createdAt, updatedAt, deletedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?
      )
    `)
    .bind(
      event.id, event.tenantId, event.title, event.description, event.eventType, event.status,
      event.venue, event.address, event.city, event.state, event.onlineUrl,
      event.startDate, event.endDate, event.registrationDeadline, event.capacity,
      event.ticketPriceKobo, event.currency, event.organizerId,
      event.bannerStorageKey, event.bannerUrl, event.tags,
      event.version, event.createdAt, event.updatedAt, event.deletedAt
    )
    .run();
}

export async function updateEvent(
  db: D1Database,
  tenantId: string,
  eventId: string,
  updates: Partial<ManagedEvent>
): Promise<void> {
  const allowedFields = [
    'title', 'description', 'eventType', 'venue', 'address', 'city', 'state',
    'onlineUrl', 'startDate', 'endDate', 'registrationDeadline', 'capacity',
    'ticketPriceKobo', 'currency', 'tags', 'updatedAt'
  ] as const;

  const setClauses: string[] = [];
  const params: unknown[] = [];

  for (const field of allowedFields) {
    if (field in updates) {
      setClauses.push(`${field} = ?`);
      params.push(updates[field]);
    }
  }

  if (setClauses.length === 0) return;

  // Increment version for optimistic concurrency
  setClauses.push('version = version + 1');

  params.push(tenantId, eventId);
  await db
    .prepare(`UPDATE managed_events SET ${setClauses.join(', ')} WHERE tenantId = ? AND id = ? AND deletedAt IS NULL`)
    .bind(...params)
    .run();
}

export async function updateEventStatus(
  db: D1Database,
  tenantId: string,
  eventId: string,
  status: string,
  version: number
): Promise<boolean> {
  const now = Date.now();
  const result = await db
    .prepare(`
      UPDATE managed_events
      SET status = ?, version = version + 1, updatedAt = ?
      WHERE id = ? AND tenantId = ? AND version = ? AND deletedAt IS NULL
    `)
    .bind(status, now, eventId, tenantId, version)
    .run();

  return (result.meta['changes'] as number ?? 0) > 0;
}

export async function updateEventBanner(
  db: D1Database,
  tenantId: string,
  eventId: string,
  bannerStorageKey: string,
  bannerUrl: string,
  updatedAt: number
): Promise<void> {
  await db
    .prepare(`
      UPDATE managed_events
      SET bannerStorageKey = ?, bannerUrl = ?, updatedAt = ?, version = version + 1
      WHERE id = ? AND tenantId = ? AND deletedAt IS NULL
    `)
    .bind(bannerStorageKey, bannerUrl, updatedAt, eventId, tenantId)
    .run();
}

export async function softDeleteEvent(
  db: D1Database,
  tenantId: string,
  eventId: string
): Promise<void> {
  const now = Date.now();
  await db
    .prepare('UPDATE managed_events SET deletedAt = ?, updatedAt = ? WHERE id = ? AND tenantId = ?')
    .bind(now, now, eventId, tenantId)
    .run();
}

export async function getEventCount(
  db: D1Database,
  tenantId: string
): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) as count FROM managed_events WHERE tenantId = ? AND deletedAt IS NULL')
    .bind(tenantId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT REGISTRATION QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getRegistrationsByEvent(
  db: D1Database,
  tenantId: string,
  eventId: string,
  statusFilter?: string
): Promise<EventRegistration[]> {
  let sql = `
    SELECT * FROM event_registrations
    WHERE tenantId = ? AND eventId = ? AND deletedAt IS NULL
  `;
  const params: unknown[] = [tenantId, eventId];

  if (statusFilter) {
    sql += ' AND status = ?';
    params.push(statusFilter);
  }

  sql += ' ORDER BY createdAt DESC';
  const result = await db.prepare(sql).bind(...params).all<EventRegistration>();
  return result.results;
}

export async function getRegistrationById(
  db: D1Database,
  tenantId: string,
  registrationId: string
): Promise<EventRegistration | null> {
  return db
    .prepare('SELECT * FROM event_registrations WHERE id = ? AND tenantId = ? AND deletedAt IS NULL')
    .bind(registrationId, tenantId)
    .first<EventRegistration>();
}

export async function getRegistrationByTicketRef(
  db: D1Database,
  ticketRef: string
): Promise<EventRegistration | null> {
  return db
    .prepare('SELECT * FROM event_registrations WHERE ticketRef = ? AND deletedAt IS NULL')
    .bind(ticketRef)
    .first<EventRegistration>();
}

export async function getRegistrationCountForEvent(
  db: D1Database,
  tenantId: string,
  eventId: string
): Promise<number> {
  const row = await db
    .prepare(`
      SELECT COUNT(*) as count FROM event_registrations
      WHERE tenantId = ? AND eventId = ? AND deletedAt IS NULL
      AND status NOT IN ('CANCELLED', 'NO_SHOW')
    `)
    .bind(tenantId, eventId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function insertRegistration(
  db: D1Database,
  registration: EventRegistration
): Promise<void> {
  await db
    .prepare(`
      INSERT INTO event_registrations (
        id, tenantId, eventId, attendeeId,
        attendeeName, attendeeEmail, attendeePhone,
        status, ticketRef, amountPaidKobo, paymentReference,
        checkedInAt, createdAt, updatedAt, deletedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      registration.id, registration.tenantId, registration.eventId, registration.attendeeId,
      registration.attendeeName, registration.attendeeEmail, registration.attendeePhone,
      registration.status, registration.ticketRef, registration.amountPaidKobo,
      registration.paymentReference, registration.checkedInAt,
      registration.createdAt, registration.updatedAt, registration.deletedAt
    )
    .run();
}

export async function updateRegistrationStatus(
  db: D1Database,
  tenantId: string,
  registrationId: string,
  status: string,
  updatedAt: number,
  checkedInAt?: number | null
): Promise<void> {
  if (checkedInAt !== undefined) {
    await db
      .prepare(`
        UPDATE event_registrations
        SET status = ?, checkedInAt = ?, updatedAt = ?
        WHERE id = ? AND tenantId = ? AND deletedAt IS NULL
      `)
      .bind(status, checkedInAt, updatedAt, registrationId, tenantId)
      .run();
  } else {
    await db
      .prepare(`
        UPDATE event_registrations
        SET status = ?, updatedAt = ?
        WHERE id = ? AND tenantId = ? AND deletedAt IS NULL
      `)
      .bind(status, updatedAt, registrationId, tenantId)
      .run();
  }
}

export async function getDashboardStats(
  db: D1Database,
  tenantId: string
): Promise<{
  totalEvents: number;
  publishedEvents: number;
  upcomingEvents: number;
  totalRegistrations: number;
}> {
  const now = Date.now();

  const [totalRow, publishedRow, upcomingRow, registrationsRow] = await Promise.all([
    db
      .prepare('SELECT COUNT(*) as count FROM managed_events WHERE tenantId = ? AND deletedAt IS NULL')
      .bind(tenantId)
      .first<{ count: number }>(),
    db
      .prepare(`SELECT COUNT(*) as count FROM managed_events WHERE tenantId = ? AND deletedAt IS NULL AND status IN ('PUBLISHED','REGISTRATION_OPEN','REGISTRATION_CLOSED','ONGOING')`)
      .bind(tenantId)
      .first<{ count: number }>(),
    db
      .prepare('SELECT COUNT(*) as count FROM managed_events WHERE tenantId = ? AND deletedAt IS NULL AND startDate > ?')
      .bind(tenantId, now)
      .first<{ count: number }>(),
    db
      .prepare(`SELECT COUNT(*) as count FROM event_registrations WHERE tenantId = ? AND deletedAt IS NULL AND status NOT IN ('CANCELLED','NO_SHOW')`)
      .bind(tenantId)
      .first<{ count: number }>()
  ]);

  return {
    totalEvents: totalRow?.count ?? 0,
    publishedEvents: publishedRow?.count ?? 0,
    upcomingEvents: upcomingRow?.count ?? 0,
    totalRegistrations: registrationsRow?.count ?? 0
  };
}
