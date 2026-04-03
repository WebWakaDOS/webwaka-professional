/**
 * WebWaka Professional — Database Query Helpers
 * Blueprint Reference: Part 9.3 — "Zero Direct Database Clients: No direct database client instantiation. Must use injected database service."
 * Blueprint Reference: Part 9.2 — Multi-tenancy: tenantId in ALL queries
 *
 * All functions receive the D1 database binding as a parameter (injected by Cloudflare Workers).
 * No module ever instantiates a database client directly.
 */

import type {
  LegalClient,
  LegalCase,
  CaseHearing,
  LegalTimeEntry,
  LegalInvoice,
  LegalDocument,
  NBAProfile,
  TrustAccount,
  TrustTransaction
} from './schema';

// ─────────────────────────────────────────────────────────────────────────────
// D1 DATABASE BINDING TYPES — Canonical definition lives in core/db/d1.ts
// Re-exported here for backwards-compatible import paths.
// ─────────────────────────────────────────────────────────────────────────────

import type { D1Database, D1PreparedStatement, D1Result, D1ExecResult } from './d1';
export type { D1Database, D1PreparedStatement, D1Result, D1ExecResult };

// ─────────────────────────────────────────────────────────────────────────────
// LEGAL CLIENTS QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getClientsByTenant(
  db: D1Database,
  tenantId: string,
  limit = 50,
  offset = 0
): Promise<LegalClient[]> {
  const result = await db
    .prepare(
      `SELECT * FROM legal_clients
       WHERE tenantId = ? AND deletedAt IS NULL
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`
    )
    .bind(tenantId, limit, offset)
    .all<LegalClient>();
  return result.results;
}

export async function getClientById(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<LegalClient | null> {
  return db
    .prepare(`SELECT * FROM legal_clients WHERE id = ? AND tenantId = ? AND deletedAt IS NULL`)
    .bind(id, tenantId)
    .first<LegalClient>();
}

export async function insertClient(
  db: D1Database,
  client: LegalClient
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO legal_clients
       (id, tenantId, fullName, clientType, phone, email, address, state,
        ninNumber, cacNumber, retainerFeeKobo, ndprConsentAt, preferredLanguage,
        createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      client.id, client.tenantId, client.fullName, client.clientType,
      client.phone, client.email, client.address, client.state,
      client.ninNumber, client.cacNumber, client.retainerFeeKobo,
      client.ndprConsentAt, client.preferredLanguage,
      client.createdAt, client.updatedAt, client.deletedAt
    )
    .run();
}

export async function updateClient(
  db: D1Database,
  tenantId: string,
  id: string,
  updates: Partial<LegalClient>
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `UPDATE legal_clients
       SET fullName = COALESCE(?, fullName),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           address = COALESCE(?, address),
           state = COALESCE(?, state),
           retainerFeeKobo = COALESCE(?, retainerFeeKobo),
           preferredLanguage = COALESCE(?, preferredLanguage),
           updatedAt = ?
       WHERE id = ? AND tenantId = ? AND deletedAt IS NULL`
    )
    .bind(
      updates.fullName ?? null, updates.phone ?? null, updates.email ?? null,
      updates.address ?? null, updates.state ?? null, updates.retainerFeeKobo ?? null,
      updates.preferredLanguage ?? null, now, id, tenantId
    )
    .run();
}

export async function softDeleteClient(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(`UPDATE legal_clients SET deletedAt = ?, updatedAt = ? WHERE id = ? AND tenantId = ?`)
    .bind(now, now, id, tenantId)
    .run();
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGAL CASES QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getCasesByTenant(
  db: D1Database,
  tenantId: string,
  filters: { status?: string; clientId?: string } = {},
  limit = 50,
  offset = 0
): Promise<LegalCase[]> {
  let query = `SELECT * FROM legal_cases WHERE tenantId = ? AND deletedAt IS NULL`;
  const bindings: unknown[] = [tenantId];

  if (filters.status) {
    query += ` AND status = ?`;
    bindings.push(filters.status);
  }
  if (filters.clientId) {
    query += ` AND clientId = ?`;
    bindings.push(filters.clientId);
  }

  query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
  bindings.push(limit, offset);

  const result = await db.prepare(query).bind(...bindings).all<LegalCase>();
  return result.results;
}

export async function getCaseById(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<LegalCase | null> {
  return db
    .prepare(`SELECT * FROM legal_cases WHERE id = ? AND tenantId = ? AND deletedAt IS NULL`)
    .bind(id, tenantId)
    .first<LegalCase>();
}

export async function insertCase(
  db: D1Database,
  legalCase: LegalCase
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO legal_cases
       (id, tenantId, caseReference, title, caseType, status, clientId,
        leadAttorneyId, coCounselIds, courtType, courtName, suitNumber,
        filingDate, nextHearingDate, opposingParty, opposingCounsel,
        description, agreedFeeKobo, currency, version, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      legalCase.id, legalCase.tenantId, legalCase.caseReference, legalCase.title,
      legalCase.caseType, legalCase.status, legalCase.clientId, legalCase.leadAttorneyId,
      legalCase.coCounselIds, legalCase.courtType, legalCase.courtName, legalCase.suitNumber,
      legalCase.filingDate, legalCase.nextHearingDate, legalCase.opposingParty,
      legalCase.opposingCounsel, legalCase.description, legalCase.agreedFeeKobo,
      legalCase.currency, legalCase.version, legalCase.createdAt, legalCase.updatedAt, legalCase.deletedAt
    )
    .run();
}

export async function updateCaseStatus(
  db: D1Database,
  tenantId: string,
  id: string,
  status: string,
  version: number
): Promise<boolean> {
  const now = Date.now();
  const result = await db
    .prepare(
      `UPDATE legal_cases
       SET status = ?, version = version + 1, updatedAt = ?
       WHERE id = ? AND tenantId = ? AND version = ? AND deletedAt IS NULL`
    )
    .bind(status, now, id, tenantId, version)
    .run();
  return result.meta.changes > 0;
}

export async function softDeleteCase(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(`UPDATE legal_cases SET deletedAt = ?, updatedAt = ? WHERE id = ? AND tenantId = ?`)
    .bind(now, now, id, tenantId)
    .run();
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE HEARINGS QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getHearingsByCase(
  db: D1Database,
  tenantId: string,
  caseId: string
): Promise<CaseHearing[]> {
  const result = await db
    .prepare(
      `SELECT * FROM case_hearings
       WHERE caseId = ? AND tenantId = ? AND deletedAt IS NULL
       ORDER BY hearingDate DESC`
    )
    .bind(caseId, tenantId)
    .all<CaseHearing>();
  return result.results;
}

export async function insertHearing(
  db: D1Database,
  hearing: CaseHearing
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO case_hearings
       (id, tenantId, caseId, hearingDate, outcome, adjournmentDate,
        presidingOfficer, notes, attendedBy, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      hearing.id, hearing.tenantId, hearing.caseId, hearing.hearingDate,
      hearing.outcome, hearing.adjournmentDate, hearing.presidingOfficer,
      hearing.notes, hearing.attendedBy, hearing.createdAt, hearing.updatedAt, hearing.deletedAt
    )
    .run();
}

// ─────────────────────────────────────────────────────────────────────────────
// TIME ENTRIES QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getTimeEntriesByCase(
  db: D1Database,
  tenantId: string,
  caseId: string
): Promise<LegalTimeEntry[]> {
  const result = await db
    .prepare(
      `SELECT * FROM legal_time_entries
       WHERE caseId = ? AND tenantId = ? AND deletedAt IS NULL
       ORDER BY workDate DESC`
    )
    .bind(caseId, tenantId)
    .all<LegalTimeEntry>();
  return result.results;
}

export async function getUnbilledTimeEntries(
  db: D1Database,
  tenantId: string,
  caseId: string
): Promise<LegalTimeEntry[]> {
  const result = await db
    .prepare(
      `SELECT * FROM legal_time_entries
       WHERE caseId = ? AND tenantId = ? AND invoiced = 0 AND deletedAt IS NULL
       ORDER BY workDate ASC`
    )
    .bind(caseId, tenantId)
    .all<LegalTimeEntry>();
  return result.results;
}

export async function insertTimeEntry(
  db: D1Database,
  entry: LegalTimeEntry
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO legal_time_entries
       (id, tenantId, caseId, attorneyId, description, durationMinutes,
        hourlyRateKobo, amountKobo, invoiced, invoiceId, workDate, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      entry.id, entry.tenantId, entry.caseId, entry.attorneyId, entry.description,
      entry.durationMinutes, entry.hourlyRateKobo, entry.amountKobo,
      entry.invoiced ? 1 : 0, entry.invoiceId, entry.workDate,
      entry.createdAt, entry.updatedAt, entry.deletedAt
    )
    .run();
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICES QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getInvoicesByTenant(
  db: D1Database,
  tenantId: string,
  status?: string
): Promise<LegalInvoice[]> {
  let query = `SELECT * FROM legal_invoices WHERE tenantId = ? AND deletedAt IS NULL`;
  const bindings: unknown[] = [tenantId];

  if (status) {
    query += ` AND status = ?`;
    bindings.push(status);
  }

  query += ` ORDER BY createdAt DESC`;
  const result = await db.prepare(query).bind(...bindings).all<LegalInvoice>();
  return result.results;
}

export async function getInvoiceById(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<LegalInvoice | null> {
  return db
    .prepare(`SELECT * FROM legal_invoices WHERE id = ? AND tenantId = ? AND deletedAt IS NULL`)
    .bind(id, tenantId)
    .first<LegalInvoice>();
}

export async function insertInvoice(
  db: D1Database,
  invoice: LegalInvoice
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO legal_invoices
       (id, tenantId, caseId, clientId, invoiceNumber, status, subtotalKobo,
        vatKobo, totalKobo, currency, dueDate, paidAt, paymentReference, notes,
        createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      invoice.id, invoice.tenantId, invoice.caseId, invoice.clientId,
      invoice.invoiceNumber, invoice.status, invoice.subtotalKobo,
      invoice.vatKobo, invoice.totalKobo, invoice.currency, invoice.dueDate,
      invoice.paidAt, invoice.paymentReference, invoice.notes,
      invoice.createdAt, invoice.updatedAt, invoice.deletedAt
    )
    .run();
}

export async function markInvoicePaid(
  db: D1Database,
  tenantId: string,
  id: string,
  paymentReference: string
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `UPDATE legal_invoices
       SET status = 'PAID', paidAt = ?, paymentReference = ?, updatedAt = ?
       WHERE id = ? AND tenantId = ? AND deletedAt IS NULL`
    )
    .bind(now, paymentReference, now, id, tenantId)
    .run();
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getDocumentsByCase(
  db: D1Database,
  tenantId: string,
  caseId: string
): Promise<LegalDocument[]> {
  const result = await db
    .prepare(
      `SELECT * FROM legal_documents
       WHERE caseId = ? AND tenantId = ? AND deletedAt IS NULL
       ORDER BY createdAt DESC`
    )
    .bind(caseId, tenantId)
    .all<LegalDocument>();
  return result.results;
}

export async function insertDocument(
  db: D1Database,
  document: LegalDocument
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO legal_documents
       (id, tenantId, caseId, documentType, title, storageKey, storageUrl,
        mimeType, fileSizeBytes, uploadedBy, documentVersion, isConfidential,
        createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      document.id, document.tenantId, document.caseId, document.documentType,
      document.title, document.storageKey, document.storageUrl, document.mimeType,
      document.fileSizeBytes, document.uploadedBy, document.documentVersion,
      document.isConfidential ? 1 : 0,
      document.createdAt, document.updatedAt, document.deletedAt
    )
    .run();
}

// ─────────────────────────────────────────────────────────────────────────────
// NBA PROFILES QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getNBAProfileByUserId(
  db: D1Database,
  tenantId: string,
  userId: string
): Promise<NBAProfile | null> {
  return db
    .prepare(`SELECT * FROM nba_profiles WHERE userId = ? AND tenantId = ? AND deletedAt IS NULL`)
    .bind(userId, tenantId)
    .first<NBAProfile>();
}

export async function getNBAProfileByBarNumber(
  db: D1Database,
  barNumber: string
): Promise<NBAProfile | null> {
  return db
    .prepare(`SELECT * FROM nba_profiles WHERE barNumber = ? AND deletedAt IS NULL`)
    .bind(barNumber)
    .first<NBAProfile>();
}

export async function insertNBAProfile(
  db: D1Database,
  profile: NBAProfile
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO nba_profiles
       (id, tenantId, userId, fullName, barNumber, yearOfCall, callType,
        nbaBranch, lawSchool, llbUniversity, duesPaidYear, practicingCertificateExpiry,
        isVerified, verifiedAt, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      profile.id, profile.tenantId, profile.userId, profile.fullName,
      profile.barNumber, profile.yearOfCall, profile.callType, profile.nbaBranch,
      profile.lawSchool, profile.llbUniversity, profile.duesPaidYear,
      profile.practicingCertificateExpiry, profile.isVerified ? 1 : 0,
      profile.verifiedAt, profile.createdAt, profile.updatedAt, profile.deletedAt
    )
    .run();
}

export async function verifyNBAProfile(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `UPDATE nba_profiles
       SET isVerified = 1, verifiedAt = ?, updatedAt = ?
       WHERE id = ? AND tenantId = ?`
    )
    .bind(now, now, id, tenantId)
    .run();
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUST ACCOUNT QUERIES
// Blueprint Reference: Part 10.8 — NBA Trust Account Ledger (Rule 23)
// Blueprint Reference: Part 9.2 — Append-Only / Immutable Records
//
// INVARIANT: There are NO updateTrustTransaction or deleteTrustTransaction
// functions. Trust transactions are immutable by design. Any call-site that
// tries to import such a function will fail at compile time — this is intentional.
// ─────────────────────────────────────────────────────────────────────────────

type TrustAccountRow = Omit<TrustAccount, 'isActive'> & { isActive: number };

function rowToTrustAccount(r: TrustAccountRow): TrustAccount {
  return { ...r, isActive: r.isActive === 1 };
}

export async function getTrustAccountsByTenant(
  db: D1Database,
  tenantId: string,
  includeInactive = false
): Promise<TrustAccount[]> {
  let query = `SELECT * FROM trust_accounts WHERE tenantId = ?`;
  const bindings: unknown[] = [tenantId];
  if (!includeInactive) {
    query += ` AND isActive = 1`;
  }
  query += ` ORDER BY createdAt DESC`;
  const result = await db.prepare(query).bind(...bindings).all<TrustAccountRow>();
  return result.results.map(rowToTrustAccount);
}

export async function getTrustAccountById(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<TrustAccount | null> {
  const row = await db
    .prepare(`SELECT * FROM trust_accounts WHERE id = ? AND tenantId = ?`)
    .bind(id, tenantId)
    .first<TrustAccountRow>();
  if (!row) return null;
  return rowToTrustAccount(row);
}

export async function insertTrustAccount(
  db: D1Database,
  account: TrustAccount
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO trust_accounts
       (id, tenantId, accountName, bankName, accountNumber, description, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      account.id, account.tenantId, account.accountName, account.bankName,
      account.accountNumber, account.description, account.isActive ? 1 : 0,
      account.createdAt, account.updatedAt
    )
    .run();
}

export async function updateTrustAccount(
  db: D1Database,
  tenantId: string,
  id: string,
  updates: { accountName?: string; description?: string; isActive?: boolean }
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `UPDATE trust_accounts
       SET accountName = COALESCE(?, accountName),
           description = COALESCE(?, description),
           isActive = COALESCE(?, isActive),
           updatedAt = ?
       WHERE id = ? AND tenantId = ?`
    )
    .bind(
      updates.accountName ?? null,
      updates.description ?? null,
      updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : null,
      now, id, tenantId
    )
    .run();
}

/**
 * Insert a trust transaction — APPEND-ONLY.
 *
 * This is the ONLY write function for trust_transactions.
 * There is deliberately no updateTrustTransaction or deleteTrustTransaction.
 * Calling code that needs to "correct" a transaction must insert a reversing entry.
 * NBA Rule 23 requires a complete, unaltered audit trail.
 */
export async function insertTrustTransaction(
  db: D1Database,
  transaction: TrustTransaction
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO trust_transactions
       (id, tenantId, accountId, transactionType, direction, amountKobo,
        description, clientId, caseId, reference, externalReference,
        recordedBy, transactionDate, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      transaction.id, transaction.tenantId, transaction.accountId,
      transaction.transactionType, transaction.direction, transaction.amountKobo,
      transaction.description, transaction.clientId, transaction.caseId,
      transaction.reference, transaction.externalReference,
      transaction.recordedBy, transaction.transactionDate, transaction.createdAt
    )
    .run();
}

export async function getTrustTransactionsByAccount(
  db: D1Database,
  tenantId: string,
  accountId: string,
  limit = 100,
  offset = 0
): Promise<TrustTransaction[]> {
  const result = await db
    .prepare(
      `SELECT * FROM trust_transactions
       WHERE accountId = ? AND tenantId = ?
       ORDER BY transactionDate DESC, createdAt DESC
       LIMIT ? OFFSET ?`
    )
    .bind(accountId, tenantId, limit, offset)
    .all<TrustTransaction>();
  return result.results;
}

export async function getTrustTransactionsByTenant(
  db: D1Database,
  tenantId: string,
  filters: { clientId?: string; caseId?: string } = {},
  limit = 100,
  offset = 0
): Promise<TrustTransaction[]> {
  let query = `SELECT * FROM trust_transactions WHERE tenantId = ?`;
  const bindings: unknown[] = [tenantId];
  if (filters.clientId) {
    query += ` AND clientId = ?`;
    bindings.push(filters.clientId);
  }
  if (filters.caseId) {
    query += ` AND caseId = ?`;
    bindings.push(filters.caseId);
  }
  query += ` ORDER BY transactionDate DESC, createdAt DESC LIMIT ? OFFSET ?`;
  bindings.push(limit, offset);
  const result = await db.prepare(query).bind(...bindings).all<TrustTransaction>();
  return result.results;
}

export interface TrustAccountBalance {
  accountId: string;
  totalCreditsKobo: number;
  totalDebitsKobo: number;
  balanceKobo: number;
  transactionCount: number;
}

export async function getTrustAccountBalance(
  db: D1Database,
  tenantId: string,
  accountId: string
): Promise<TrustAccountBalance> {
  const row = await db
    .prepare(
      `SELECT
         accountId,
         COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amountKobo ELSE 0 END), 0) AS totalCreditsKobo,
         COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amountKobo ELSE 0 END), 0) AS totalDebitsKobo,
         COUNT(*) AS transactionCount
       FROM trust_transactions
       WHERE accountId = ? AND tenantId = ?`
    )
    .bind(accountId, tenantId)
    .first<{
      accountId: string;
      totalCreditsKobo: number;
      totalDebitsKobo: number;
      transactionCount: number;
    }>();

  const credits = row?.totalCreditsKobo ?? 0;
  const debits = row?.totalDebitsKobo ?? 0;
  return {
    accountId,
    totalCreditsKobo: credits,
    totalDebitsKobo: debits,
    balanceKobo: credits - debits,
    transactionCount: row?.transactionCount ?? 0
  };
}

export async function countTrustTransactionsByAccount(
  db: D1Database,
  tenantId: string,
  accountId: string
): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) as count FROM trust_transactions WHERE accountId = ? AND tenantId = ?`)
    .bind(accountId, tenantId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

/**
 * Count ALL trust transactions for a tenant across ALL accounts.
 *
 * IMPORTANT: This is the correct function to use when generating a new
 * trust transaction reference. The UNIQUE INDEX on trust_transactions is
 * (tenantId, reference), meaning references must be unique ACROSS THE WHOLE
 * TENANT — not just per-account. Using a per-account count would cause
 * reference collisions when a firm has more than one trust account.
 *
 * Blueprint Reference: Part 9.2 — Append-Only / Immutable Records
 */
export async function countTrustTransactionsByTenant(
  db: D1Database,
  tenantId: string
): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) as count FROM trust_transactions WHERE tenantId = ?`)
    .bind(tenantId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD STATS QUERY
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalClients: number;
  activeCases: number;
  pendingInvoicesKobo: number;
  upcomingHearings: number;
  unbilledHoursMinutes: number;
}

export async function getDashboardStats(
  db: D1Database,
  tenantId: string
): Promise<DashboardStats> {
  const now = Date.now();
  const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;

  const [clients, activeCases, pendingInvoices, upcomingHearings, unbilledTime] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as count FROM legal_clients WHERE tenantId = ? AND deletedAt IS NULL`).bind(tenantId).first<{ count: number }>(),
    db.prepare(`SELECT COUNT(*) as count FROM legal_cases WHERE tenantId = ? AND status IN ('INTAKE', 'ACTIVE', 'PENDING_COURT', 'ADJOURNED') AND deletedAt IS NULL`).bind(tenantId).first<{ count: number }>(),
    db.prepare(`SELECT COALESCE(SUM(totalKobo), 0) as total FROM legal_invoices WHERE tenantId = ? AND status IN ('SENT', 'OVERDUE') AND deletedAt IS NULL`).bind(tenantId).first<{ total: number }>(),
    db.prepare(`SELECT COUNT(*) as count FROM legal_cases WHERE tenantId = ? AND nextHearingDate BETWEEN ? AND ? AND deletedAt IS NULL`).bind(tenantId, now, sevenDaysFromNow).first<{ count: number }>(),
    db.prepare(`SELECT COALESCE(SUM(durationMinutes), 0) as total FROM legal_time_entries WHERE tenantId = ? AND invoiced = 0 AND deletedAt IS NULL`).bind(tenantId).first<{ total: number }>()
  ]);

  return {
    totalClients: clients?.count ?? 0,
    activeCases: activeCases?.count ?? 0,
    pendingInvoicesKobo: pendingInvoices?.total ?? 0,
    upcomingHearings: upcomingHearings?.count ?? 0,
    unbilledHoursMinutes: unbilledTime?.total ?? 0
  };
}
