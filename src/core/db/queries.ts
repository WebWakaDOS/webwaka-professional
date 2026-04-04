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
  TrustTransaction,
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
// RETAINER LEDGER QUERIES
// Blueprint Reference: Part 10.8 — Retainer Management
// ─────────────────────────────────────────────────────────────────────────────

export async function insertRetainerEntry(
  db: D1Database,
  entry: RetainerLedgerEntry
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO retainer_ledger
       (id, tenantId, clientId, caseId, entryType, amountKobo, description, invoiceId, recordedBy, transactionDate, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      entry.id, entry.tenantId, entry.clientId, entry.caseId,
      entry.entryType, entry.amountKobo, entry.description,
      entry.invoiceId, entry.recordedBy, entry.transactionDate, entry.createdAt
    )
    .run();
}

export async function getRetainerLedgerByClient(
  db: D1Database,
  tenantId: string,
  clientId: string,
  limit = 50,
  offset = 0
): Promise<RetainerLedgerEntry[]> {
  const result = await db
    .prepare(
      `SELECT * FROM retainer_ledger
       WHERE tenantId = ? AND clientId = ?
       ORDER BY transactionDate DESC, createdAt DESC
       LIMIT ? OFFSET ?`
    )
    .bind(tenantId, clientId, limit, offset)
    .all<RetainerLedgerEntry>();
  return result.results;
}

export interface RetainerBalance {
  clientId: string;
  totalDepositsKobo: number;
  totalDrawdownsKobo: number;
  totalRefundsKobo: number;
  balanceKobo: number;
  entryCount: number;
}

export async function getRetainerBalance(
  db: D1Database,
  tenantId: string,
  clientId: string
): Promise<RetainerBalance> {
  const row = await db
    .prepare(
      `SELECT
         clientId,
         COALESCE(SUM(CASE WHEN entryType = 'DEPOSIT' THEN amountKobo ELSE 0 END), 0) AS totalDepositsKobo,
         COALESCE(SUM(CASE WHEN entryType = 'DRAWDOWN' THEN amountKobo ELSE 0 END), 0) AS totalDrawdownsKobo,
         COALESCE(SUM(CASE WHEN entryType = 'REFUND' THEN amountKobo ELSE 0 END), 0) AS totalRefundsKobo,
         COUNT(*) AS entryCount
       FROM retainer_ledger
       WHERE tenantId = ? AND clientId = ?`
    )
    .bind(tenantId, clientId)
    .first<{
      clientId: string;
      totalDepositsKobo: number;
      totalDrawdownsKobo: number;
      totalRefundsKobo: number;
      entryCount: number;
    }>();
  const deposits = row?.totalDepositsKobo ?? 0;
  const drawdowns = row?.totalDrawdownsKobo ?? 0;
  const refunds = row?.totalRefundsKobo ?? 0;
  return {
    clientId,
    totalDepositsKobo: deposits,
    totalDrawdownsKobo: drawdowns,
    totalRefundsKobo: refunds,
    balanceKobo: deposits - drawdowns - refunds,
    entryCount: row?.entryCount ?? 0
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MATTER TASKS QUERIES
// Blueprint Reference: Part 10.8 — Task Delegation
// ─────────────────────────────────────────────────────────────────────────────

export async function getTasksByCase(
  db: D1Database,
  tenantId: string,
  caseId: string
): Promise<MatterTask[]> {
  const result = await db
    .prepare(
      `SELECT * FROM matter_tasks
       WHERE tenantId = ? AND caseId = ? AND deletedAt IS NULL
       ORDER BY priority DESC, dueDate ASC`
    )
    .bind(tenantId, caseId)
    .all<MatterTask>();
  return result.results;
}

export async function getTasksByAssignee(
  db: D1Database,
  tenantId: string,
  assignedTo: string,
  status?: string
): Promise<MatterTask[]> {
  let query = `SELECT * FROM matter_tasks WHERE tenantId = ? AND assignedTo = ? AND deletedAt IS NULL`;
  const bindings: unknown[] = [tenantId, assignedTo];
  if (status) { query += ` AND status = ?`; bindings.push(status); }
  query += ` ORDER BY dueDate ASC`;
  const result = await db.prepare(query).bind(...bindings).all<MatterTask>();
  return result.results;
}

export async function getTasksByTenant(
  db: D1Database,
  tenantId: string,
  filters: { status?: string; assignedTo?: string; caseId?: string } = {},
  limit = 50,
  offset = 0
): Promise<MatterTask[]> {
  let query = `SELECT * FROM matter_tasks WHERE tenantId = ? AND deletedAt IS NULL`;
  const bindings: unknown[] = [tenantId];
  if (filters.status) { query += ` AND status = ?`; bindings.push(filters.status); }
  if (filters.assignedTo) { query += ` AND assignedTo = ?`; bindings.push(filters.assignedTo); }
  if (filters.caseId) { query += ` AND caseId = ?`; bindings.push(filters.caseId); }
  query += ` ORDER BY dueDate ASC LIMIT ? OFFSET ?`;
  bindings.push(limit, offset);
  const result = await db.prepare(query).bind(...bindings).all<MatterTask>();
  return result.results;
}

export async function getTaskById(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<MatterTask | null> {
  return db
    .prepare(`SELECT * FROM matter_tasks WHERE id = ? AND tenantId = ? AND deletedAt IS NULL`)
    .bind(id, tenantId)
    .first<MatterTask>();
}

export async function insertTask(
  db: D1Database,
  task: MatterTask
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO matter_tasks
       (id, tenantId, caseId, title, description, assignedTo, assignedBy, priority, status, dueDate, completedAt, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      task.id, task.tenantId, task.caseId, task.title, task.description,
      task.assignedTo, task.assignedBy, task.priority, task.status,
      task.dueDate, task.completedAt, task.createdAt, task.updatedAt, task.deletedAt
    )
    .run();
}

export async function updateTaskStatus(
  db: D1Database,
  tenantId: string,
  id: string,
  status: string,
  completedAt: number | null
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `UPDATE matter_tasks SET status = ?, completedAt = ?, updatedAt = ?
       WHERE id = ? AND tenantId = ? AND deletedAt IS NULL`
    )
    .bind(status, completedAt, now, id, tenantId)
    .run();
}

export async function updateTask(
  db: D1Database,
  tenantId: string,
  id: string,
  updates: Partial<Pick<MatterTask, 'title' | 'description' | 'assignedTo' | 'priority' | 'dueDate' | 'status'>>
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `UPDATE matter_tasks
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           assignedTo = COALESCE(?, assignedTo),
           priority = COALESCE(?, priority),
           dueDate = COALESCE(?, dueDate),
           status = COALESCE(?, status),
           updatedAt = ?
       WHERE id = ? AND tenantId = ? AND deletedAt IS NULL`
    )
    .bind(
      updates.title ?? null, updates.description ?? null, updates.assignedTo ?? null,
      updates.priority ?? null, updates.dueDate ?? null, updates.status ?? null,
      now, id, tenantId
    )
    .run();
}

export async function softDeleteTask(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(`UPDATE matter_tasks SET deletedAt = ?, updatedAt = ? WHERE id = ? AND tenantId = ?`)
    .bind(now, now, id, tenantId)
    .run();
}

// ─────────────────────────────────────────────────────────────────────────────
// MATTER EXPENSES QUERIES
// Blueprint Reference: Part 10.8 — Expense Tracking
// ─────────────────────────────────────────────────────────────────────────────

export async function getExpensesByCase(
  db: D1Database,
  tenantId: string,
  caseId: string
): Promise<MatterExpense[]> {
  const result = await db
    .prepare(
      `SELECT * FROM matter_expenses
       WHERE tenantId = ? AND caseId = ? AND deletedAt IS NULL
       ORDER BY expenseDate DESC`
    )
    .bind(tenantId, caseId)
    .all<MatterExpenseRow>();
  return result.results.map(rowToExpense);
}

export async function getExpensesByTenant(
  db: D1Database,
  tenantId: string,
  filters: { caseId?: string; invoiced?: boolean } = {},
  limit = 50,
  offset = 0
): Promise<MatterExpense[]> {
  let query = `SELECT * FROM matter_expenses WHERE tenantId = ? AND deletedAt IS NULL`;
  const bindings: unknown[] = [tenantId];
  if (filters.caseId) { query += ` AND caseId = ?`; bindings.push(filters.caseId); }
  if (filters.invoiced !== undefined) { query += ` AND invoiced = ?`; bindings.push(filters.invoiced ? 1 : 0); }
  query += ` ORDER BY expenseDate DESC LIMIT ? OFFSET ?`;
  bindings.push(limit, offset);
  const result = await db.prepare(query).bind(...bindings).all<MatterExpenseRow>();
  return result.results.map(rowToExpense);
}

type MatterExpenseRow = Omit<MatterExpense, 'invoiced'> & { invoiced: number };
function rowToExpense(r: MatterExpenseRow): MatterExpense {
  return { ...r, invoiced: r.invoiced === 1 };
}

export async function insertExpense(
  db: D1Database,
  expense: MatterExpense
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO matter_expenses
       (id, tenantId, caseId, category, description, amountKobo, currency, receiptUrl, recordedBy, expenseDate, invoiced, invoiceId, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      expense.id, expense.tenantId, expense.caseId, expense.category,
      expense.description, expense.amountKobo, expense.currency, expense.receiptUrl,
      expense.recordedBy, expense.expenseDate, expense.invoiced ? 1 : 0,
      expense.invoiceId, expense.createdAt, expense.updatedAt, expense.deletedAt
    )
    .run();
}

export async function softDeleteExpense(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(`UPDATE matter_expenses SET deletedAt = ?, updatedAt = ? WHERE id = ? AND tenantId = ?`)
    .bind(now, now, id, tenantId)
    .run();
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT INTAKE FORMS QUERIES
// Blueprint Reference: Part 10.8 — Client Intake Forms
// ─────────────────────────────────────────────────────────────────────────────

type IntakeFormRow = Omit<ClientIntakeForm, 'isActive'> & { isActive: number };

export async function getIntakeFormsByTenant(
  db: D1Database,
  tenantId: string,
  activeOnly = true
): Promise<ClientIntakeForm[]> {
  let query = `SELECT * FROM client_intake_forms WHERE tenantId = ? AND deletedAt IS NULL`;
  const bindings: unknown[] = [tenantId];
  if (activeOnly) { query += ` AND isActive = 1`; }
  query += ` ORDER BY createdAt DESC`;
  const result = await db.prepare(query).bind(...bindings).all<IntakeFormRow>();
  return result.results.map(r => ({ ...r, isActive: r.isActive === 1 }));
}

export async function getIntakeFormById(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<ClientIntakeForm | null> {
  const row = await db
    .prepare(`SELECT * FROM client_intake_forms WHERE id = ? AND tenantId = ? AND deletedAt IS NULL`)
    .bind(id, tenantId)
    .first<IntakeFormRow>();
  if (!row) return null;
  return { ...row, isActive: row.isActive === 1 };
}

export async function insertIntakeForm(
  db: D1Database,
  form: ClientIntakeForm
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO client_intake_forms
       (id, tenantId, title, description, fields, isActive, createdBy, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      form.id, form.tenantId, form.title, form.description, form.fields,
      form.isActive ? 1 : 0, form.createdBy, form.createdAt, form.updatedAt, form.deletedAt
    )
    .run();
}

export async function updateIntakeForm(
  db: D1Database,
  tenantId: string,
  id: string,
  updates: Partial<Pick<ClientIntakeForm, 'title' | 'description' | 'fields' | 'isActive'>>
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `UPDATE client_intake_forms
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           fields = COALESCE(?, fields),
           isActive = COALESCE(?, isActive),
           updatedAt = ?
       WHERE id = ? AND tenantId = ? AND deletedAt IS NULL`
    )
    .bind(
      updates.title ?? null, updates.description ?? null, updates.fields ?? null,
      updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : null,
      now, id, tenantId
    )
    .run();
}

export async function softDeleteIntakeForm(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(`UPDATE client_intake_forms SET deletedAt = ?, updatedAt = ? WHERE id = ? AND tenantId = ?`)
    .bind(now, now, id, tenantId)
    .run();
}

export async function getIntakeSubmissionsByTenant(
  db: D1Database,
  tenantId: string,
  filters: { formId?: string; status?: string } = {},
  limit = 50,
  offset = 0
): Promise<ClientIntakeSubmission[]> {
  let query = `SELECT * FROM client_intake_submissions WHERE tenantId = ?`;
  const bindings: unknown[] = [tenantId];
  if (filters.formId) { query += ` AND formId = ?`; bindings.push(filters.formId); }
  if (filters.status) { query += ` AND status = ?`; bindings.push(filters.status); }
  query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
  bindings.push(limit, offset);
  const result = await db.prepare(query).bind(...bindings).all<ClientIntakeSubmission>();
  return result.results;
}

export async function getIntakeSubmissionById(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<ClientIntakeSubmission | null> {
  return db
    .prepare(`SELECT * FROM client_intake_submissions WHERE id = ? AND tenantId = ?`)
    .bind(id, tenantId)
    .first<ClientIntakeSubmission>();
}

export async function insertIntakeSubmission(
  db: D1Database,
  submission: ClientIntakeSubmission
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO client_intake_submissions
       (id, tenantId, formId, submitterName, submitterEmail, submitterPhone, responses, status, reviewedBy, reviewedAt, clientId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      submission.id, submission.tenantId, submission.formId, submission.submitterName,
      submission.submitterEmail, submission.submitterPhone, submission.responses,
      submission.status, submission.reviewedBy, submission.reviewedAt, submission.clientId,
      submission.createdAt, submission.updatedAt
    )
    .run();
}

export async function updateIntakeSubmissionStatus(
  db: D1Database,
  tenantId: string,
  id: string,
  status: string,
  reviewedBy: string,
  clientId?: string
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `UPDATE client_intake_submissions
       SET status = ?, reviewedBy = ?, reviewedAt = ?, clientId = COALESCE(?, clientId), updatedAt = ?
       WHERE id = ? AND tenantId = ?`
    )
    .bind(status, reviewedBy, now, clientId ?? null, now, id, tenantId)
    .run();
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT ANALYSES QUERIES
// Blueprint Reference: Part 10.8 — AI Contract Analysis
// ─────────────────────────────────────────────────────────────────────────────

export async function getAnalysesByDocument(
  db: D1Database,
  tenantId: string,
  documentId: string
): Promise<DocumentAnalysis[]> {
  const result = await db
    .prepare(
      `SELECT * FROM document_analyses
       WHERE tenantId = ? AND documentId = ?
       ORDER BY createdAt DESC`
    )
    .bind(tenantId, documentId)
    .all<DocumentAnalysis>();
  return result.results;
}

export async function getAnalysisByCase(
  db: D1Database,
  tenantId: string,
  caseId: string
): Promise<DocumentAnalysis[]> {
  const result = await db
    .prepare(
      `SELECT * FROM document_analyses
       WHERE tenantId = ? AND caseId = ?
       ORDER BY createdAt DESC`
    )
    .bind(tenantId, caseId)
    .all<DocumentAnalysis>();
  return result.results;
}

export async function getAnalysisById(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<DocumentAnalysis | null> {
  return db
    .prepare(`SELECT * FROM document_analyses WHERE id = ? AND tenantId = ?`)
    .bind(id, tenantId)
    .first<DocumentAnalysis>();
}

export async function insertDocumentAnalysis(
  db: D1Database,
  analysis: DocumentAnalysis
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO document_analyses
       (id, tenantId, documentId, caseId, analysisType, status, summary, riskyClauses, keyTerms, recommendations, rawResponse, analyzedBy, completedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      analysis.id, analysis.tenantId, analysis.documentId, analysis.caseId,
      analysis.analysisType, analysis.status, analysis.summary, analysis.riskyClauses,
      analysis.keyTerms, analysis.recommendations, analysis.rawResponse, analysis.analyzedBy,
      analysis.completedAt, analysis.createdAt, analysis.updatedAt
    )
    .run();
}

export async function updateDocumentAnalysis(
  db: D1Database,
  tenantId: string,
  id: string,
  updates: Partial<Pick<DocumentAnalysis, 'status' | 'summary' | 'riskyClauses' | 'keyTerms' | 'recommendations' | 'rawResponse' | 'completedAt'>>
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `UPDATE document_analyses
       SET status = COALESCE(?, status),
           summary = COALESCE(?, summary),
           riskyClauses = COALESCE(?, riskyClauses),
           keyTerms = COALESCE(?, keyTerms),
           recommendations = COALESCE(?, recommendations),
           rawResponse = COALESCE(?, rawResponse),
           completedAt = COALESCE(?, completedAt),
           updatedAt = ?
       WHERE id = ? AND tenantId = ?`
    )
    .bind(
      updates.status ?? null, updates.summary ?? null, updates.riskyClauses ?? null,
      updates.keyTerms ?? null, updates.recommendations ?? null, updates.rawResponse ?? null,
      updates.completedAt ?? null, now, id, tenantId
    )
    .run();
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT TEMPLATES QUERIES
// Blueprint Reference: Part 10.8 — Document Assembly
// ─────────────────────────────────────────────────────────────────────────────

type DocTemplateRow = Omit<DocumentTemplate, 'isActive'> & { isActive: number };

export async function getTemplatesByTenant(
  db: D1Database,
  tenantId: string,
  activeOnly = true
): Promise<DocumentTemplate[]> {
  let query = `SELECT * FROM document_templates WHERE tenantId = ? AND deletedAt IS NULL`;
  const bindings: unknown[] = [tenantId];
  if (activeOnly) { query += ` AND isActive = 1`; }
  query += ` ORDER BY templateType ASC, title ASC`;
  const result = await db.prepare(query).bind(...bindings).all<DocTemplateRow>();
  return result.results.map(r => ({ ...r, isActive: r.isActive === 1 }));
}

export async function getTemplateById(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<DocumentTemplate | null> {
  const row = await db
    .prepare(`SELECT * FROM document_templates WHERE id = ? AND tenantId = ? AND deletedAt IS NULL`)
    .bind(id, tenantId)
    .first<DocTemplateRow>();
  if (!row) return null;
  return { ...row, isActive: row.isActive === 1 };
}

export async function insertDocumentTemplate(
  db: D1Database,
  template: DocumentTemplate
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO document_templates
       (id, tenantId, title, templateType, content, variables, isActive, createdBy, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      template.id, template.tenantId, template.title, template.templateType,
      template.content, template.variables, template.isActive ? 1 : 0,
      template.createdBy, template.createdAt, template.updatedAt, template.deletedAt
    )
    .run();
}

export async function updateDocumentTemplate(
  db: D1Database,
  tenantId: string,
  id: string,
  updates: Partial<Pick<DocumentTemplate, 'title' | 'content' | 'variables' | 'isActive'>>
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `UPDATE document_templates
       SET title = COALESCE(?, title),
           content = COALESCE(?, content),
           variables = COALESCE(?, variables),
           isActive = COALESCE(?, isActive),
           updatedAt = ?
       WHERE id = ? AND tenantId = ? AND deletedAt IS NULL`
    )
    .bind(
      updates.title ?? null, updates.content ?? null, updates.variables ?? null,
      updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : null,
      now, id, tenantId
    )
    .run();
}

export async function softDeleteTemplate(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(`UPDATE document_templates SET deletedAt = ?, updatedAt = ? WHERE id = ? AND tenantId = ?`)
    .bind(now, now, id, tenantId)
    .run();
}

// ─────────────────────────────────────────────────────────────────────────────
// E-SIGNATURE REQUESTS QUERIES
// Blueprint Reference: Part 10.8 — E-Signature Integration
// ─────────────────────────────────────────────────────────────────────────────

export async function getESignaturesByCase(
  db: D1Database,
  tenantId: string,
  caseId: string
): Promise<ESignatureRequest[]> {
  const result = await db
    .prepare(
      `SELECT * FROM esignature_requests WHERE tenantId = ? AND caseId = ? ORDER BY createdAt DESC`
    )
    .bind(tenantId, caseId)
    .all<ESignatureRequest>();
  return result.results;
}

export async function getESignatureById(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<ESignatureRequest | null> {
  return db
    .prepare(`SELECT * FROM esignature_requests WHERE id = ? AND tenantId = ?`)
    .bind(id, tenantId)
    .first<ESignatureRequest>();
}

export async function getESignatureByToken(
  db: D1Database,
  token: string
): Promise<ESignatureRequest | null> {
  return db
    .prepare(`SELECT * FROM esignature_requests WHERE accessToken = ?`)
    .bind(token)
    .first<ESignatureRequest>();
}

export async function insertESignatureRequest(
  db: D1Database,
  request: ESignatureRequest
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO esignature_requests
       (id, tenantId, documentId, caseId, requestedBy, signerName, signerEmail, signerPhone, status, signedAt, declinedAt, expiresAt, signatureData, accessToken, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      request.id, request.tenantId, request.documentId, request.caseId,
      request.requestedBy, request.signerName, request.signerEmail, request.signerPhone,
      request.status, request.signedAt, request.declinedAt, request.expiresAt,
      request.signatureData, request.accessToken, request.createdAt, request.updatedAt
    )
    .run();
}

export async function updateESignatureStatus(
  db: D1Database,
  id: string,
  status: string,
  signedAt?: number,
  declinedAt?: number,
  signatureData?: string
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `UPDATE esignature_requests
       SET status = ?, signedAt = COALESCE(?, signedAt), declinedAt = COALESCE(?, declinedAt),
           signatureData = COALESCE(?, signatureData), updatedAt = ?
       WHERE id = ?`
    )
    .bind(status, signedAt ?? null, declinedAt ?? null, signatureData ?? null, now, id)
    .run();
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT PORTAL TOKEN QUERIES
// Blueprint Reference: Part 10.8 — Secure Client Portal
// ─────────────────────────────────────────────────────────────────────────────

type PortalTokenRow = Omit<ClientPortalToken, 'isRevoked'> & { isRevoked: number };

export async function insertPortalToken(
  db: D1Database,
  token: ClientPortalToken
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO client_portal_tokens
       (id, tenantId, clientId, token, expiresAt, lastUsedAt, isRevoked, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      token.id, token.tenantId, token.clientId, token.token,
      token.expiresAt, token.lastUsedAt, token.isRevoked ? 1 : 0, token.createdAt
    )
    .run();
}

export async function getPortalTokenByValue(
  db: D1Database,
  token: string
): Promise<ClientPortalToken | null> {
  const row = await db
    .prepare(`SELECT * FROM client_portal_tokens WHERE token = ? AND isRevoked = 0`)
    .bind(token)
    .first<PortalTokenRow>();
  if (!row) return null;
  return { ...row, isRevoked: row.isRevoked === 1 };
}

export async function touchPortalToken(
  db: D1Database,
  id: string
): Promise<void> {
  await db
    .prepare(`UPDATE client_portal_tokens SET lastUsedAt = ? WHERE id = ?`)
    .bind(Date.now(), id)
    .run();
}

export async function revokePortalToken(
  db: D1Database,
  tenantId: string,
  clientId: string
): Promise<void> {
  await db
    .prepare(`UPDATE client_portal_tokens SET isRevoked = 1 WHERE tenantId = ? AND clientId = ?`)
    .bind(tenantId, clientId)
    .run();
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT MESSAGES QUERIES
// Blueprint Reference: Part 10.8 — Secure Messaging
// ─────────────────────────────────────────────────────────────────────────────

export async function getMessagesByCase(
  db: D1Database,
  tenantId: string,
  caseId: string,
  limit = 100,
  offset = 0
): Promise<ClientMessage[]> {
  const result = await db
    .prepare(
      `SELECT * FROM client_messages
       WHERE tenantId = ? AND caseId = ? AND deletedAt IS NULL
       ORDER BY createdAt ASC
       LIMIT ? OFFSET ?`
    )
    .bind(tenantId, caseId, limit, offset)
    .all<ClientMessageRow>();
  return result.results.map(rowToMessage);
}

export async function getUnreadMessageCount(
  db: D1Database,
  tenantId: string,
  recipientId: string
): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) as count FROM client_messages WHERE tenantId = ? AND recipientId = ? AND isRead = 0 AND deletedAt IS NULL`)
    .bind(tenantId, recipientId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

type ClientMessageRow = Omit<ClientMessage, 'isRead'> & { isRead: number };
function rowToMessage(r: ClientMessageRow): ClientMessage {
  return { ...r, isRead: r.isRead === 1 };
}

export async function insertMessage(
  db: D1Database,
  message: ClientMessage
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO client_messages
       (id, tenantId, caseId, senderId, senderType, recipientId, subject, body, isRead, readAt, parentMessageId, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      message.id, message.tenantId, message.caseId, message.senderId, message.senderType,
      message.recipientId, message.subject, message.body,
      message.isRead ? 1 : 0, message.readAt, message.parentMessageId,
      message.createdAt, message.updatedAt, message.deletedAt
    )
    .run();
}

export async function markMessageRead(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(`UPDATE client_messages SET isRead = 1, readAt = ?, updatedAt = ? WHERE id = ? AND tenantId = ?`)
    .bind(now, now, id, tenantId)
    .run();
}

export async function softDeleteMessage(
  db: D1Database,
  tenantId: string,
  id: string
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(`UPDATE client_messages SET deletedAt = ?, updatedAt = ? WHERE id = ? AND tenantId = ?`)
    .bind(now, now, id, tenantId)
    .run();
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION SCHEDULES QUERIES
// Blueprint Reference: Part 10.8 — Automated Reminders
// ─────────────────────────────────────────────────────────────────────────────

export async function getPendingNotifications(
  db: D1Database,
  tenantId: string,
  before: number
): Promise<NotificationSchedule[]> {
  const result = await db
    .prepare(
      `SELECT * FROM notification_schedules
       WHERE tenantId = ? AND status = 'PENDING' AND scheduledFor <= ?
       ORDER BY scheduledFor ASC
       LIMIT 100`
    )
    .bind(tenantId, before)
    .all<NotificationSchedule>();
  return result.results;
}

export async function getScheduledNotificationsByEntity(
  db: D1Database,
  tenantId: string,
  entityType: string,
  entityId: string
): Promise<NotificationSchedule[]> {
  const result = await db
    .prepare(
      `SELECT * FROM notification_schedules
       WHERE tenantId = ? AND entityType = ? AND entityId = ?
       ORDER BY scheduledFor ASC`
    )
    .bind(tenantId, entityType, entityId)
    .all<NotificationSchedule>();
  return result.results;
}

export async function insertNotificationSchedule(
  db: D1Database,
  schedule: NotificationSchedule
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO notification_schedules
       (id, tenantId, entityType, entityId, notificationType, recipientPhone, recipientEmail, message, scheduledFor, sentAt, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      schedule.id, schedule.tenantId, schedule.entityType, schedule.entityId,
      schedule.notificationType, schedule.recipientPhone, schedule.recipientEmail,
      schedule.message, schedule.scheduledFor, schedule.sentAt, schedule.status,
      schedule.createdAt, schedule.updatedAt
    )
    .run();
}

export async function updateNotificationStatus(
  db: D1Database,
  id: string,
  status: string,
  sentAt?: number
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(`UPDATE notification_schedules SET status = ?, sentAt = COALESCE(?, sentAt), updatedAt = ? WHERE id = ?`)
    .bind(status, sentAt ?? null, now, id)
    .run();
}

export async function cancelNotificationsByEntity(
  db: D1Database,
  tenantId: string,
  entityType: string,
  entityId: string
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(`UPDATE notification_schedules SET status = 'CANCELLED', updatedAt = ? WHERE tenantId = ? AND entityType = ? AND entityId = ? AND status = 'PENDING'`)
    .bind(now, tenantId, entityType, entityId)
    .run();
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE ANALYTICS QUERIES
// Blueprint Reference: Part 10.8 — Performance Analytics
// ─────────────────────────────────────────────────────────────────────────────

export interface AttorneyAnalytics {
  attorneyId: string;
  totalMinutes: number;
  billableMinutes: number;
  totalBilledKobo: number;
  caseCount: number;
}

export async function getAttorneyAnalytics(
  db: D1Database,
  tenantId: string,
  startDate: number,
  endDate: number
): Promise<AttorneyAnalytics[]> {
  const result = await db
    .prepare(
      `SELECT
         te.attorneyId,
         COALESCE(SUM(te.durationMinutes), 0) AS totalMinutes,
         COALESCE(SUM(CASE WHEN te.invoiced = 1 THEN te.durationMinutes ELSE 0 END), 0) AS billableMinutes,
         COALESCE(SUM(CASE WHEN te.invoiced = 1 THEN te.amountKobo ELSE 0 END), 0) AS totalBilledKobo,
         COUNT(DISTINCT te.caseId) AS caseCount
       FROM legal_time_entries te
       WHERE te.tenantId = ? AND te.workDate BETWEEN ? AND ? AND te.deletedAt IS NULL
       GROUP BY te.attorneyId`
    )
    .bind(tenantId, startDate, endDate)
    .all<AttorneyAnalytics>();
  return result.results;
}

export interface RevenueStats {
  period: string;
  invoicedKobo: number;
  collectedKobo: number;
  outstandingKobo: number;
  invoiceCount: number;
}

export async function getMonthlyRevenue(
  db: D1Database,
  tenantId: string,
  months = 6
): Promise<RevenueStats[]> {
  const result = await db
    .prepare(
      `SELECT
         strftime('%Y-%m', datetime(createdAt/1000, 'unixepoch')) AS period,
         COALESCE(SUM(totalKobo), 0) AS invoicedKobo,
         COALESCE(SUM(CASE WHEN status = 'PAID' THEN totalKobo ELSE 0 END), 0) AS collectedKobo,
         COALESCE(SUM(CASE WHEN status IN ('SENT', 'OVERDUE') THEN totalKobo ELSE 0 END), 0) AS outstandingKobo,
         COUNT(*) AS invoiceCount
       FROM legal_invoices
       WHERE tenantId = ? AND deletedAt IS NULL
       GROUP BY period
       ORDER BY period DESC
       LIMIT ?`
    )
    .bind(tenantId, months)
    .all<RevenueStats>();
  return result.results;
}

export interface ConflictCheckResult {
  clientId: string;
  fullName: string;
  phone: string;
  email: string | null;
  caseCount: number;
  activeCase: boolean;
}

export async function checkConflictOfInterest(
  db: D1Database,
  tenantId: string,
  fullName: string,
  phone: string,
  email: string | null
): Promise<ConflictCheckResult[]> {
  let query = `
    SELECT
      c.id AS clientId,
      c.fullName,
      c.phone,
      c.email,
      COUNT(DISTINCT ca.id) AS caseCount,
      MAX(CASE WHEN ca.status IN ('INTAKE','ACTIVE','PENDING_COURT','ADJOURNED') THEN 1 ELSE 0 END) AS activeCase
    FROM legal_clients c
    LEFT JOIN legal_cases ca ON ca.clientId = c.id AND ca.deletedAt IS NULL
    WHERE c.tenantId = ? AND c.deletedAt IS NULL
    AND (LOWER(c.fullName) LIKE LOWER(?)`;
  const bindings: unknown[] = [tenantId, `%${fullName}%`];
  if (phone) { query += ` OR c.phone LIKE ?`; bindings.push(`%${phone.slice(-8)}`); }
  if (email) { query += ` OR LOWER(c.email) = LOWER(?)`; bindings.push(email); }
  query += `) GROUP BY c.id`;
  const result = await db.prepare(query).bind(...bindings).all<ConflictCheckResult & { activeCase: number }>();
  return result.results.map(r => ({ ...r, activeCase: r.activeCase === 1 }));
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLIANCE REPORTING QUERIES
// Blueprint Reference: Part 10.8 — Compliance Reporting (NBA)
// ─────────────────────────────────────────────────────────────────────────────

export interface NBAComplianceReport {
  tenantId: string;
  reportDate: number;
  totalAttorneys: number;
  verifiedAttorneys: number;
  expiringCertificates: number;
  totalTrustAccounts: number;
  totalTrustBalanceKobo: number;
  totalCases: number;
  activeCases: number;
  closedCases: number;
}

export async function generateNBAComplianceReport(
  db: D1Database,
  tenantId: string
): Promise<NBAComplianceReport> {
  const now = Date.now();
  const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;

  const [attorneys, expiringCerts, trustAccounts, trustBalance, cases] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN isVerified = 1 THEN 1 ELSE 0 END) as verified FROM nba_profiles WHERE tenantId = ? AND deletedAt IS NULL`).bind(tenantId).first<{ total: number; verified: number }>(),
    db.prepare(`SELECT COUNT(*) as count FROM nba_profiles WHERE tenantId = ? AND practicingCertificateExpiry BETWEEN ? AND ? AND deletedAt IS NULL`).bind(tenantId, now, thirtyDaysFromNow).first<{ count: number }>(),
    db.prepare(`SELECT COUNT(*) as count FROM trust_accounts WHERE tenantId = ? AND isActive = 1`).bind(tenantId).first<{ count: number }>(),
    db.prepare(`SELECT COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amountKobo ELSE -amountKobo END), 0) AS balance FROM trust_transactions WHERE tenantId = ?`).bind(tenantId).first<{ balance: number }>(),
    db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN status IN ('INTAKE','ACTIVE','PENDING_COURT','ADJOURNED') THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status IN ('CLOSED','SETTLED','ARCHIVED') THEN 1 ELSE 0 END) as closed FROM legal_cases WHERE tenantId = ? AND deletedAt IS NULL`).bind(tenantId).first<{ total: number; active: number; closed: number }>()
  ]);

  return {
    tenantId,
    reportDate: now,
    totalAttorneys: attorneys?.total ?? 0,
    verifiedAttorneys: attorneys?.verified ?? 0,
    expiringCertificates: expiringCerts?.count ?? 0,
    totalTrustAccounts: trustAccounts?.count ?? 0,
    totalTrustBalanceKobo: trustBalance?.balance ?? 0,
    totalCases: cases?.total ?? 0,
    activeCases: cases?.active ?? 0,
    closedCases: cases?.closed ?? 0
  };
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
