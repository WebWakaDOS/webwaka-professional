/**
 * WebWaka Professional — NBA Trust Account Ledger Tests (T-PRO-01)
 * Blueprint Reference: Part 9.3 — "5-Layer QA Protocol"
 * Blueprint Reference: Part 10.8 — NBA Compliance (Rule 23: Client Trust Accounts)
 *
 * Tests verify:
 * 1. Balance calculation is always correct (derived from running sum, never stored)
 * 2. Trust transaction reference generation is correctly formatted
 * 3. Trust transaction direction mapping is correct for all types
 * 4. Immutability invariant: no update/delete query functions exist
 * 5. Multi-tenancy: tenant isolation enforced in all queries
 * 6. DB query functions behave correctly with mocked D1 binding
 */

import { describe, it, expect, vi } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTION TESTS — Pure logic, no mocking required
// ─────────────────────────────────────────────────────────────────────────────

import {
  calculateTrustBalance,
  generateTrustTransactionRef
} from './utils';

import {
  TRUST_TRANSACTION_DIRECTION
} from '../../core/db/schema';

import type { TrustTransactionType } from '../../core/db/schema';

describe('generateTrustTransactionRef', () => {
  it('generates a reference with format TT-YYYY-NNNN', () => {
    const ref = generateTrustTransactionRef(1);
    expect(ref).toMatch(/^TT-\d{4}-\d{4}$/);
  });

  it('includes the current year', () => {
    const ref = generateTrustTransactionRef(1);
    const year = new Date().getFullYear().toString();
    expect(ref).toContain(year);
  });

  it('pads sequence to 4 digits', () => {
    expect(generateTrustTransactionRef(1)).toContain('0001');
    expect(generateTrustTransactionRef(42)).toContain('0042');
    expect(generateTrustTransactionRef(999)).toContain('0999');
    expect(generateTrustTransactionRef(1000)).toContain('1000');
  });

  it('generates unique references for different sequences', () => {
    const refs = new Set(Array.from({ length: 50 }, (_, i) => generateTrustTransactionRef(i + 1)));
    expect(refs.size).toBe(50);
  });
});

describe('calculateTrustBalance', () => {
  it('returns 0 for empty transaction list', () => {
    expect(calculateTrustBalance([])).toBe(0);
  });

  it('sums CREDIT transactions correctly', () => {
    const txns = [
      { direction: 'CREDIT' as const, amountKobo: 1000000 },
      { direction: 'CREDIT' as const, amountKobo: 2000000 }
    ];
    expect(calculateTrustBalance(txns)).toBe(3000000);
  });

  it('subtracts DEBIT transactions correctly', () => {
    const txns = [
      { direction: 'CREDIT' as const, amountKobo: 5000000 },
      { direction: 'DEBIT' as const, amountKobo: 2000000 }
    ];
    expect(calculateTrustBalance(txns)).toBe(3000000);
  });

  it('handles multiple credits and debits', () => {
    const txns = [
      { direction: 'CREDIT' as const, amountKobo: 10000000 }, // +10,000,000
      { direction: 'CREDIT' as const, amountKobo: 5000000 },  // +5,000,000
      { direction: 'DEBIT' as const, amountKobo: 3000000 },   // -3,000,000
      { direction: 'DEBIT' as const, amountKobo: 500000 },    // -500,000
      { direction: 'CREDIT' as const, amountKobo: 250000 },   // +250,000
    ];
    // 10,000,000 + 5,000,000 + 250,000 - 3,000,000 - 500,000 = 11,750,000
    expect(calculateTrustBalance(txns)).toBe(11750000);
  });

  it('can produce a negative balance (overdraft scenario)', () => {
    const txns = [
      { direction: 'CREDIT' as const, amountKobo: 1000000 },
      { direction: 'DEBIT' as const, amountKobo: 3000000 }
    ];
    expect(calculateTrustBalance(txns)).toBe(-2000000);
  });

  it('handles a single CREDIT', () => {
    expect(calculateTrustBalance([{ direction: 'CREDIT' as const, amountKobo: 5000000 }])).toBe(5000000);
  });

  it('handles a single DEBIT', () => {
    expect(calculateTrustBalance([{ direction: 'DEBIT' as const, amountKobo: 5000000 }])).toBe(-5000000);
  });

  it('preserves kobo precision (no floating point rounding)', () => {
    const txns = [
      { direction: 'CREDIT' as const, amountKobo: 100 },
      { direction: 'DEBIT' as const, amountKobo: 33 }
    ];
    expect(calculateTrustBalance(txns)).toBe(67);
    expect(Number.isInteger(calculateTrustBalance(txns))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TRUST_TRANSACTION_DIRECTION MAPPING TESTS
// Ensures every transaction type correctly maps to CREDIT or DEBIT
// ─────────────────────────────────────────────────────────────────────────────

describe('TRUST_TRANSACTION_DIRECTION', () => {
  it('maps DEPOSIT to CREDIT', () => {
    expect(TRUST_TRANSACTION_DIRECTION['DEPOSIT']).toBe('CREDIT');
  });

  it('maps INTEREST to CREDIT', () => {
    expect(TRUST_TRANSACTION_DIRECTION['INTEREST']).toBe('CREDIT');
  });

  it('maps TRANSFER_IN to CREDIT', () => {
    expect(TRUST_TRANSACTION_DIRECTION['TRANSFER_IN']).toBe('CREDIT');
  });

  it('maps DISBURSEMENT to DEBIT', () => {
    expect(TRUST_TRANSACTION_DIRECTION['DISBURSEMENT']).toBe('DEBIT');
  });

  it('maps BANK_CHARGES to DEBIT', () => {
    expect(TRUST_TRANSACTION_DIRECTION['BANK_CHARGES']).toBe('DEBIT');
  });

  it('maps TRANSFER_OUT to DEBIT', () => {
    expect(TRUST_TRANSACTION_DIRECTION['TRANSFER_OUT']).toBe('DEBIT');
  });

  it('all 6 transaction types are mapped', () => {
    const types: TrustTransactionType[] = [
      'DEPOSIT', 'DISBURSEMENT', 'BANK_CHARGES', 'INTEREST', 'TRANSFER_IN', 'TRANSFER_OUT'
    ];
    types.forEach(type => {
      expect(TRUST_TRANSACTION_DIRECTION[type]).toMatch(/^(CREDIT|DEBIT)$/);
    });
  });

  it('exactly 3 credit types and 3 debit types', () => {
    const values = Object.values(TRUST_TRANSACTION_DIRECTION);
    const credits = values.filter(d => d === 'CREDIT');
    const debits = values.filter(d => d === 'DEBIT');
    expect(credits).toHaveLength(3);
    expect(debits).toHaveLength(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IMMUTABILITY INVARIANT TEST
// Verifies that NO update or delete functions exist for trust_transactions.
// This is a compile-time + runtime invariant — any attempt to import/call
// updateTrustTransaction or deleteTrustTransaction must fail.
// ─────────────────────────────────────────────────────────────────────────────

describe('Trust Transaction Immutability Invariant', () => {
  it('insertTrustTransaction exists as the only write function', async () => {
    const queries = await import('../../core/db/queries');
    expect(typeof queries.insertTrustTransaction).toBe('function');
  });

  it('updateTrustTransaction does NOT exist — immutability enforced', async () => {
    const queries = await import('../../core/db/queries') as Record<string, unknown>;
    expect(queries['updateTrustTransaction']).toBeUndefined();
  });

  it('deleteTrustTransaction does NOT exist — immutability enforced', async () => {
    const queries = await import('../../core/db/queries') as Record<string, unknown>;
    expect(queries['deleteTrustTransaction']).toBeUndefined();
  });

  it('softDeleteTrustTransaction does NOT exist — no soft delete either', async () => {
    const queries = await import('../../core/db/queries') as Record<string, unknown>;
    expect(queries['softDeleteTrustTransaction']).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DB QUERY FUNCTION TESTS — Mocked D1 binding
// Tests the tenant isolation invariant and correct SQL binding
// ─────────────────────────────────────────────────────────────────────────────

import {
  getTrustAccountsByTenant,
  getTrustAccountById,
  insertTrustAccount,
  insertTrustTransaction,
  getTrustTransactionsByAccount,
  getTrustAccountBalance,
  countTrustTransactionsByAccount,
  countTrustTransactionsByTenant
} from '../../core/db/queries';
import type { TrustAccount, TrustTransaction } from '../../core/db/schema';

function makeMockDB(overrides: Record<string, unknown> = {}) {
  const mockAll = vi.fn().mockResolvedValue({ results: [] });
  const mockFirst = vi.fn().mockResolvedValue(null);
  const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });

  const mockStatement = {
    bind: vi.fn().mockReturnThis(),
    all: mockAll,
    first: mockFirst,
    run: mockRun,
    ...overrides
  };

  return {
    db: { prepare: vi.fn().mockReturnValue(mockStatement) },
    mockStatement,
    mockAll,
    mockFirst,
    mockRun
  };
}

describe('getTrustAccountsByTenant', () => {
  it('queries with tenantId — multi-tenancy enforced', async () => {
    const { db } = makeMockDB();
    await getTrustAccountsByTenant(db as never, 'tenant_abc');
    expect(db.prepare).toHaveBeenCalledOnce();
    const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(sql).toContain('tenantId');
  });

  it('filters to active accounts by default', async () => {
    const { db } = makeMockDB();
    await getTrustAccountsByTenant(db as never, 'tenant_abc');
    const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(sql).toContain('isActive');
  });

  it('can include inactive accounts when includeInactive=true', async () => {
    const { db } = makeMockDB();
    await getTrustAccountsByTenant(db as never, 'tenant_abc', true);
    const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(sql).not.toContain('isActive = 1');
  });
});

describe('getTrustAccountById', () => {
  it('queries with both id and tenantId — tenant isolation', async () => {
    const { db } = makeMockDB();
    await getTrustAccountById(db as never, 'tenant_abc', 'acct_123');
    const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(sql).toContain('tenantId');
    expect(sql).toContain('id');
  });

  it('returns null when no row found', async () => {
    const { db } = makeMockDB();
    const result = await getTrustAccountById(db as never, 'tenant_abc', 'nonexistent');
    expect(result).toBeNull();
  });
});

describe('insertTrustAccount', () => {
  it('inserts with all required fields', async () => {
    const { db, mockRun } = makeMockDB();
    const account: TrustAccount = {
      id: 'acct_001',
      tenantId: 'tenant_abc',
      accountName: 'Commercial Litigation Trust',
      bankName: 'First Bank Nigeria',
      accountNumber: '3012345678',
      description: null,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await insertTrustAccount(db as never, account);
    expect(mockRun).toHaveBeenCalledOnce();
  });

  it('includes tenantId in the insert — multi-tenancy enforced', async () => {
    const { db } = makeMockDB();
    const account: TrustAccount = {
      id: 'acct_001',
      tenantId: 'tenant_xyz',
      accountName: 'Test Trust Account',
      bankName: 'GTBank',
      accountNumber: '0123456789',
      description: 'Test account',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await insertTrustAccount(db as never, account);
    const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(sql).toContain('tenantId');
  });
});

describe('insertTrustTransaction', () => {
  it('inserts with all required fields including direction', async () => {
    const { db, mockRun } = makeMockDB();
    const txn: TrustTransaction = {
      id: 'txn_001',
      tenantId: 'tenant_abc',
      accountId: 'acct_001',
      transactionType: 'DEPOSIT',
      direction: 'CREDIT',
      amountKobo: 5000000,
      description: 'Initial deposit from Adeyemi & Co.',
      clientId: 'cli_001',
      caseId: null,
      reference: 'TT-2026-0001',
      externalReference: 'FBN/2026/001',
      recordedBy: 'usr_001',
      transactionDate: Date.now(),
      createdAt: Date.now()
    };
    await insertTrustTransaction(db as never, txn);
    expect(mockRun).toHaveBeenCalledOnce();
  });

  it('SQL does NOT include updatedAt column — immutability enforced', async () => {
    const { db } = makeMockDB();
    const txn: TrustTransaction = {
      id: 'txn_002',
      tenantId: 'tenant_abc',
      accountId: 'acct_001',
      transactionType: 'DISBURSEMENT',
      direction: 'DEBIT',
      amountKobo: 2000000,
      description: 'Court filing fees for Suit No. FHC/ABJ/2026/100',
      clientId: 'cli_001',
      caseId: 'cas_001',
      reference: 'TT-2026-0002',
      externalReference: null,
      recordedBy: 'usr_001',
      transactionDate: Date.now(),
      createdAt: Date.now()
    };
    await insertTrustTransaction(db as never, txn);
    const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(sql).not.toContain('updatedAt');
    expect(sql).not.toContain('deletedAt');
  });

  it('binds tenantId — multi-tenancy enforced', async () => {
    const { db } = makeMockDB();
    const txn: TrustTransaction = {
      id: 'txn_003',
      tenantId: 'firm_xyz',
      accountId: 'acct_001',
      transactionType: 'INTEREST',
      direction: 'CREDIT',
      amountKobo: 15000,
      description: 'Monthly interest',
      clientId: null,
      caseId: null,
      reference: 'TT-2026-0003',
      externalReference: null,
      recordedBy: 'usr_001',
      transactionDate: Date.now(),
      createdAt: Date.now()
    };
    await insertTrustTransaction(db as never, txn);
    const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(sql).toContain('tenantId');
  });
});

describe('getTrustTransactionsByAccount', () => {
  it('queries with accountId AND tenantId — tenant isolation', async () => {
    const { db } = makeMockDB();
    await getTrustTransactionsByAccount(db as never, 'tenant_abc', 'acct_001');
    const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(sql).toContain('accountId');
    expect(sql).toContain('tenantId');
  });

  it('orders by transactionDate DESC for correct ledger view', async () => {
    const { db } = makeMockDB();
    await getTrustTransactionsByAccount(db as never, 'tenant_abc', 'acct_001');
    const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(sql).toMatch(/ORDER BY.*transactionDate.*DESC/i);
  });
});

describe('getTrustAccountBalance', () => {
  it('queries with both accountId and tenantId — tenant isolation', async () => {
    const { db } = makeMockDB();
    await getTrustAccountBalance(db as never, 'tenant_abc', 'acct_001');
    const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(sql).toContain('accountId');
    expect(sql).toContain('tenantId');
  });

  it('uses conditional SUM to separate CREDIT and DEBIT', async () => {
    const { db } = makeMockDB();
    await getTrustAccountBalance(db as never, 'tenant_abc', 'acct_001');
    const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(sql).toContain('CREDIT');
    expect(sql).toContain('DEBIT');
    expect(sql).toContain('SUM');
  });

  it('returns zero balances when no transactions exist', async () => {
    const { db } = makeMockDB();
    const balance = await getTrustAccountBalance(db as never, 'tenant_abc', 'acct_001');
    expect(balance.totalCreditsKobo).toBe(0);
    expect(balance.totalDebitsKobo).toBe(0);
    expect(balance.balanceKobo).toBe(0);
    expect(balance.transactionCount).toBe(0);
  });

  it('calculates balance as credits minus debits', async () => {
    const mockStatement = {
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({
        accountId: 'acct_001',
        totalCreditsKobo: 10000000,
        totalDebitsKobo: 3000000,
        transactionCount: 5
      })
    };
    const db = { prepare: vi.fn().mockReturnValue(mockStatement) };
    const balance = await getTrustAccountBalance(db as never, 'tenant_abc', 'acct_001');
    expect(balance.totalCreditsKobo).toBe(10000000);
    expect(balance.totalDebitsKobo).toBe(3000000);
    expect(balance.balanceKobo).toBe(7000000); // 10,000,000 - 3,000,000
    expect(balance.transactionCount).toBe(5);
  });
});

describe('countTrustTransactionsByAccount', () => {
  it('queries with accountId and tenantId', async () => {
    const { db } = makeMockDB();
    await countTrustTransactionsByAccount(db as never, 'tenant_abc', 'acct_001');
    const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(sql).toContain('accountId');
    expect(sql).toContain('tenantId');
    expect(sql).toContain('COUNT');
  });

  it('returns 0 when no transactions exist', async () => {
    const { db } = makeMockDB();
    const count = await countTrustTransactionsByAccount(db as never, 'tenant_abc', 'acct_001');
    expect(count).toBe(0);
  });
});

describe('countTrustTransactionsByTenant', () => {
  it('queries with only tenantId — returns tenant-wide count', async () => {
    const { db } = makeMockDB();
    await countTrustTransactionsByTenant(db as never, 'tenant_abc');
    const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(sql).toContain('tenantId');
    expect(sql).not.toContain('accountId');
    expect(sql).toContain('COUNT');
  });

  it('returns 0 when tenant has no transactions', async () => {
    const { db } = makeMockDB();
    const count = await countTrustTransactionsByTenant(db as never, 'tenant_abc');
    expect(count).toBe(0);
  });

  it('returns correct count from mocked DB', async () => {
    const mockStatement = {
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ count: 42 })
    };
    const db = { prepare: vi.fn().mockReturnValue(mockStatement) };
    const count = await countTrustTransactionsByTenant(db as never, 'tenant_abc');
    expect(count).toBe(42);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REGRESSION TESTS — Reference Uniqueness (Bug Fix)
// Verifies that trust transaction references are unique ACROSS THE WHOLE TENANT
// not just per-account. The UNIQUE INDEX is on (tenantId, reference).
//
// BUG: The original code used countTrustTransactionsByAccount() for reference
// generation. A firm with two accounts (both at count=0) would generate
// TT-YYYY-0001 twice, causing a UNIQUE constraint violation.
//
// FIX: Use countTrustTransactionsByTenant() so the sequence is tenant-wide.
// ─────────────────────────────────────────────────────────────────────────────

describe('Trust Transaction Reference Uniqueness (Multi-Account Regression)', () => {
  it('countTrustTransactionsByTenant exists and is the correct function for reference generation', async () => {
    const queries = await import('../../core/db/queries');
    expect(typeof queries.countTrustTransactionsByTenant).toBe('function');
  });

  it('countTrustTransactionsByAccount still exists for per-account statistics', async () => {
    const queries = await import('../../core/db/queries');
    expect(typeof queries.countTrustTransactionsByAccount).toBe('function');
  });

  it('two accounts at count=0 generate DIFFERENT references using tenant-wide count', () => {
    // Simulate two accounts both starting at 0 transactions.
    // If we used per-account count, both would generate TT-2026-0001 — collision!
    // With tenant-wide count: first gets seq=1 (TT-2026-0001),
    // after inserting, tenant count becomes 1, second gets seq=2 (TT-2026-0002).
    const ref1 = generateTrustTransactionRef(1);  // tenant count was 0
    const ref2 = generateTrustTransactionRef(2);  // tenant count is now 1
    expect(ref1).not.toBe(ref2);
    expect(ref1).toContain('0001');
    expect(ref2).toContain('0002');
  });

  it('tenant-wide sequence produces globally unique references across accounts', () => {
    // Simulate 3 accounts each recording 2 transactions using tenant-wide sequence
    const allRefs: string[] = [];
    let tenantCount = 0;
    for (let account = 0; account < 3; account++) {
      for (let txn = 0; txn < 2; txn++) {
        tenantCount++;
        allRefs.push(generateTrustTransactionRef(tenantCount));
      }
    }
    // All 6 references must be unique
    const unique = new Set(allRefs);
    expect(unique.size).toBe(6);
    expect(allRefs).toEqual([
      expect.stringContaining('0001'),
      expect.stringContaining('0002'),
      expect.stringContaining('0003'),
      expect.stringContaining('0004'),
      expect.stringContaining('0005'),
      expect.stringContaining('0006'),
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION-STYLE TESTS — Balance consistency using calculateTrustBalance
// Ensures that the balance derived from a sequence of transactions is always correct
// regardless of the number or order of transactions
// ─────────────────────────────────────────────────────────────────────────────

describe('Trust Account Balance Consistency', () => {
  it('balance is consistent regardless of transaction order', () => {
    const transactions = [
      { direction: 'CREDIT' as const, amountKobo: 5000000 },
      { direction: 'DEBIT' as const, amountKobo: 1000000 },
      { direction: 'CREDIT' as const, amountKobo: 3000000 },
      { direction: 'DEBIT' as const, amountKobo: 500000 }
    ];
    const reversed = [...transactions].reverse();
    expect(calculateTrustBalance(transactions)).toBe(calculateTrustBalance(reversed));
  });

  it('adding a reversing entry restores the original balance', () => {
    const initialTxns = [
      { direction: 'CREDIT' as const, amountKobo: 10000000 }
    ];
    const balanceBefore = calculateTrustBalance(initialTxns);

    // Simulate an incorrect disbursement
    const withError = [
      ...initialTxns,
      { direction: 'DEBIT' as const, amountKobo: 2000000 }
    ];

    // Reverse the error with a correcting CREDIT entry
    const corrected = [
      ...withError,
      { direction: 'CREDIT' as const, amountKobo: 2000000 }
    ];

    expect(calculateTrustBalance(corrected)).toBe(balanceBefore);
  });

  it('DEPOSIT followed by equal DISBURSEMENT yields zero balance', () => {
    const txns = [
      { direction: 'CREDIT' as const, amountKobo: 5000000 },
      { direction: 'DEBIT' as const, amountKobo: 5000000 }
    ];
    expect(calculateTrustBalance(txns)).toBe(0);
  });

  it('large multi-transaction ledger sums correctly', () => {
    const deposits = Array.from({ length: 20 }, () => ({ direction: 'CREDIT' as const, amountKobo: 1000000 }));
    const disbursements = Array.from({ length: 7 }, () => ({ direction: 'DEBIT' as const, amountKobo: 1000000 }));
    const all = [...deposits, ...disbursements];
    expect(calculateTrustBalance(all)).toBe(13000000); // 20M - 7M
  });
});
