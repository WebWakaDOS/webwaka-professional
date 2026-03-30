/**
 * WebWaka Platform — Cloudflare D1 Type Definitions
 * Blueprint Reference: Part 3 — "Edge-Native Data Architecture: Cloudflare D1 (SQLite at the edge)"
 * Blueprint Reference: Part 9.3 — "Zero Direct Database Clients: injected via D1 binding only."
 *
 * Canonical D1 type shims for type-safe parameterised query building.
 * All modules import D1 types from here — never re-define them locally.
 *
 * Build Once, Use Infinitely: single source of truth for D1 interface contracts.
 *
 * Note: These mirror the @cloudflare/workers-types D1 types but are defined
 * explicitly here so test environments (Vitest) can mock them without needing
 * the full Cloudflare runtime.
 */

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: {
    changed_db: boolean;
    changes: number;
    duration: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
    size_after: number;
  };
}

export interface D1ExecResult {
  count: number;
  duration: number;
}
