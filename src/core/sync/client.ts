/**
 * WebWaka Universal Offline Sync Engine — CORE-1 Integration
 * Blueprint Reference: Part 6 (Universal Offline Sync Engine)
 * Blueprint Reference: Part 9.1 — "Offline First: Critical operations must work without internet."
 *
 * Modules MUST NOT implement their own sync logic.
 * All modules use this platform sync engine.
 *
 * Architecture: IndexedDB → Mutation Queue → Sync API → Server reconciliation → D1 database
 */

import Dexie, { type Table } from 'dexie';

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION INTERFACE
// Blueprint Reference: Part 6 — "Required Features: Version control, Retry logic"
// ─────────────────────────────────────────────────────────────────────────────

export interface Mutation {
  id?: number;
  tenantId: string;
  /** All entity types across all WebWaka Professional modules */
  entityType:
    // Legal Practice module
    | 'legal_client' | 'legal_case' | 'case_hearing'
    | 'legal_time_entry' | 'legal_invoice' | 'legal_document' | 'nba_profile'
    // Event Management module
    | 'managed_event' | 'event_registration';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: Record<string, unknown>;
  version: number;
  timestamp: number;
  status: 'PENDING' | 'SYNCING' | 'FAILED' | 'RESOLVED';
  retryCount: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE DATABASE — Legal Practice Module
// Blueprint Reference: Part 6 — "IndexedDB → Mutation Queue"
// ─────────────────────────────────────────────────────────────────────────────

export class LegalPracticeOfflineDB extends Dexie {
  mutations!: Table<Mutation, number>;
  legalClients!: Table<Record<string, unknown>, string>;
  legalCases!: Table<Record<string, unknown>, string>;
  caseHearings!: Table<Record<string, unknown>, string>;
  timeEntries!: Table<Record<string, unknown>, string>;
  invoices!: Table<Record<string, unknown>, string>;
  documents!: Table<Record<string, unknown>, string>;
  nbaProfiles!: Table<Record<string, unknown>, string>;

  constructor(tenantId: string) {
    super(`WebWakaDB_professional_${tenantId}`);

    this.version(1).stores({
      // Core mutation queue — Part 6
      mutations: '++id, tenantId, entityType, entityId, status, timestamp',
      // Module-specific offline stores
      legalClients: 'id, tenantId, deletedAt',
      legalCases: 'id, tenantId, clientId, status, nextHearingDate, deletedAt',
      caseHearings: 'id, tenantId, caseId, hearingDate, deletedAt',
      timeEntries: 'id, tenantId, caseId, invoiced, deletedAt',
      invoices: 'id, tenantId, caseId, clientId, status, deletedAt',
      documents: 'id, tenantId, caseId, deletedAt',
      nbaProfiles: 'id, tenantId, userId, barNumber, deletedAt'
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE DATABASE — Event Management Module
// Blueprint Reference: Part 6 — "IndexedDB → Mutation Queue"
// ─────────────────────────────────────────────────────────────────────────────

export class EventManagementOfflineDB extends Dexie {
  mutations!: Table<Mutation, number>;
  managedEvents!: Table<Record<string, unknown>, string>;
  eventRegistrations!: Table<Record<string, unknown>, string>;

  constructor(tenantId: string) {
    super(`WebWakaDB_professional_events_${tenantId}`);

    this.version(1).stores({
      mutations: '++id, tenantId, entityType, entityId, status, timestamp',
      managedEvents: 'id, tenantId, status, startDate, deletedAt',
      eventRegistrations: 'id, tenantId, eventId, status, ticketRef, deletedAt'
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNC MANAGER
// Blueprint Reference: Part 6 — "Conflict resolution, Background sync"
// ─────────────────────────────────────────────────────────────────────────────

export class SyncManager {
  private db: LegalPracticeOfflineDB;
  private readonly tenantId: string;
  private readonly syncApiUrl: string;
  private isOnline: boolean;

  constructor(tenantId: string, syncApiUrl: string) {
    this.tenantId = tenantId;
    this.syncApiUrl = syncApiUrl;
    this.db = new LegalPracticeOfflineDB(tenantId);
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        void this.processQueue();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  /** Queue a mutation for sync — works offline */
  async queueMutation(
    entityType: Mutation['entityType'],
    entityId: string,
    action: Mutation['action'],
    payload: Record<string, unknown>,
    version: number
  ): Promise<void> {
    const mutation: Mutation = {
      tenantId: this.tenantId,
      entityType,
      entityId,
      action,
      payload,
      version,
      timestamp: Date.now(),
      status: 'PENDING',
      retryCount: 0
    };

    await this.db.mutations.add(mutation);

    if (this.isOnline) {
      void this.processQueue();
    }
  }

  /** Process the mutation queue — sends to server when online */
  async processQueue(): Promise<void> {
    if (!this.isOnline) return;

    const pendingMutations = await this.db.mutations
      .where('status')
      .anyOf(['PENDING', 'FAILED'])
      .toArray();

    if (pendingMutations.length === 0) return;

    try {
      const response = await fetch(this.syncApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': this.tenantId
        },
        body: JSON.stringify({ mutations: pendingMutations })
      });

      const result = (await response.json()) as { success: boolean; data?: { applied: number[] }; errors?: string[] };

      if (result.success && result.data) {
        const resolvedIds = pendingMutations
          .filter(m => m.id !== undefined)
          .map(m => m.id as number);
        await this.db.mutations.bulkDelete(resolvedIds);
      } else {
        await this.handleSyncErrors(pendingMutations, result.errors ?? []);
      }
    } catch (error) {
      for (const mutation of pendingMutations) {
        if (mutation.id !== undefined) {
          await this.db.mutations.update(mutation.id, {
            status: 'FAILED',
            retryCount: mutation.retryCount + 1,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
  }

  private async handleSyncErrors(mutations: Mutation[], _errors: string[]): Promise<void> {
    for (const mutation of mutations) {
      if (mutation.id !== undefined) {
        await this.db.mutations.update(mutation.id, {
          status: 'FAILED',
          retryCount: mutation.retryCount + 1
        });
      }
    }
  }

  /** Get the offline database instance */
  getDb(): LegalPracticeOfflineDB {
    return this.db;
  }

  /** Get count of pending mutations */
  async getPendingCount(): Promise<number> {
    return this.db.mutations.where('status').anyOf(['PENDING', 'FAILED']).count();
  }
}
