/**
 * WebWaka Platform — Shared Cloudflare Worker Environment Bindings
 * Blueprint Reference: Part 2 — "Layer 2: Cloudflare Edge Infrastructure"
 * Blueprint Reference: Part 9.1 — "Build Once Use Infinitely: shared core utilities."
 * Blueprint Reference: Part 9.1 — "Cloudflare-First: D1, R2, KV, Workers."
 *
 * Canonical WorkerEnv interface for all WebWaka Professional module APIs.
 * Module-specific Env interfaces extend this base interface.
 *
 * Build Once, Use Infinitely: platform bindings are defined once here.
 *
 * ─── Binding Conventions ────────────────────────────────────────────────────
 *   DB             → Cloudflare D1  (SQLite at the edge, multi-tenant data)
 *   DOCUMENTS      → Cloudflare R2  (object storage for files and media)
 *   TENANT_CONFIG  → Cloudflare KV  (tenant configuration, TTL-cached)
 *   EVENTS         → Cloudflare KV  (event landing page cache)
 *   RATE_LIMIT_KV  → Cloudflare KV  (future rate limiting counters)
 *   JWT_SECRET     → Worker Secret  (HS256 signing key, set via wrangler secret)
 *   ENVIRONMENT    → Worker Var     (production | staging | development)
 *   EVENT_BUS_URL  → Worker Var     (CORE-2 event bus endpoint)
 *   EVENT_BUS_API_KEY → Worker Secret (CORE-2 auth key)
 * ────────────────────────────────────────────────────────────────────────────
 */

import type { D1Database } from './db/d1';

export interface WorkerEnv {
  /** Cloudflare D1 database binding — primary data store */
  DB: D1Database;

  /** Cloudflare R2 bucket — document and media storage */
  DOCUMENTS: R2Bucket;

  /** Cloudflare KV — tenant configuration cache */
  TENANT_CONFIG: KVNamespace;

  /** Cloudflare KV — event landing page HTML cache */
  EVENTS: KVNamespace;

  /** HS256 JWT signing secret — set via `wrangler secret put JWT_SECRET` */
  JWT_SECRET: string;

  /** Runtime environment identifier */
  ENVIRONMENT?: string;

  /** Cloudflare KV — rate limit counters (optional; future use) */
  RATE_LIMIT_KV?: KVNamespace;

  /** CORE-2 Platform Event Bus endpoint URL */
  EVENT_BUS_URL?: string;

  /** CORE-2 Platform Event Bus authentication key */
  EVENT_BUS_API_KEY?: string;

  /** Paystack secret key (Nigeria-First payment gateway) */
  PAYSTACK_SECRET_KEY?: string;

  /** Termii API key (Nigeria-First SMS notifications) */
  TERMII_API_KEY?: string;

  /** Yournotify API key (Nigeria-First email notifications) */
  YOURNOTIFY_API_KEY?: string;
}
