-- WebWaka Professional — NBA Trust Account Ledger Migration
-- Blueprint Reference: Part 10.8 — NBA Compliance (Rule 23: Client Trust Accounts)
-- Blueprint Reference: Part 9.2 — tenantId on all tables, monetary values in kobo
--
-- CRITICAL INVARIANT: trust_transactions has NO triggers or permissions for UPDATE or DELETE.
-- This table is APPEND-ONLY by design. Balance is always derived from a running sum.
-- Violating this invariant constitutes serious NBA professional misconduct.

-- ─────────────────────────────────────────────────────────────────────────────
-- TRUST ACCOUNTS
-- One firm may have multiple trust accounts (e.g., per practice group or bank).
-- Accounts may be closed (isActive = 0) but NEVER deleted.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trust_accounts (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  accountName TEXT NOT NULL,
  bankName TEXT NOT NULL,
  accountNumber TEXT NOT NULL,
  description TEXT,
  isActive INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1)),
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trust_accounts_tenant ON trust_accounts(tenantId);
CREATE INDEX IF NOT EXISTS idx_trust_accounts_active ON trust_accounts(tenantId, isActive);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRUST TRANSACTIONS — APPEND-ONLY LEDGER
--
-- IMMUTABILITY INVARIANT:
--   - There is NO updatedAt column — records are write-once.
--   - There is NO deletedAt column — soft-delete is prohibited.
--   - Application code MUST NEVER issue UPDATE or DELETE on this table.
--   - The CHECK constraint on direction and amountKobo enforces data integrity.
--   - Balance is always computed: SUM(amountKobo) WHERE direction='CREDIT'
--                                 MINUS SUM(amountKobo) WHERE direction='DEBIT'
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trust_transactions (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  accountId TEXT NOT NULL REFERENCES trust_accounts(id),
  transactionType TEXT NOT NULL CHECK (transactionType IN (
    'DEPOSIT', 'DISBURSEMENT', 'BANK_CHARGES', 'INTEREST', 'TRANSFER_IN', 'TRANSFER_OUT'
  )),
  direction TEXT NOT NULL CHECK (direction IN ('CREDIT', 'DEBIT')),
  amountKobo INTEGER NOT NULL CHECK (amountKobo > 0),
  description TEXT NOT NULL,
  clientId TEXT REFERENCES legal_clients(id),
  caseId TEXT REFERENCES legal_cases(id),
  reference TEXT NOT NULL,
  externalReference TEXT,
  recordedBy TEXT NOT NULL,
  transactionDate INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
  -- NOTE: No updatedAt, no deletedAt — immutable by design (NBA Rule 23)
);

CREATE INDEX IF NOT EXISTS idx_trust_txn_account ON trust_transactions(accountId);
CREATE INDEX IF NOT EXISTS idx_trust_txn_tenant ON trust_transactions(tenantId);
CREATE INDEX IF NOT EXISTS idx_trust_txn_client ON trust_transactions(tenantId, clientId);
CREATE INDEX IF NOT EXISTS idx_trust_txn_case ON trust_transactions(tenantId, caseId);
CREATE INDEX IF NOT EXISTS idx_trust_txn_date ON trust_transactions(tenantId, transactionDate);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trust_txn_reference ON trust_transactions(tenantId, reference);
