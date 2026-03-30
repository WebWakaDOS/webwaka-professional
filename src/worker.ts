/**
 * WebWaka Professional — Unified Cloudflare Worker Entry Point
 * Blueprint Reference: Part 2 — "Layer 2: Cloudflare Edge Infrastructure"
 * Blueprint Reference: Part 9.1 — "Cloudflare-First: D1, R2, KV, Workers"
 * Blueprint Reference: Part 9.1 — "Build Once Use Infinitely"
 *
 * This is the single Cloudflare Worker that serves all WebWaka Professional modules.
 * Routing is based on URL path prefix — each module app is fully self-contained
 * with its own CORS policy, auth middleware, and business logic.
 *
 * ─── Module Routing ───────────────────────────────────────────────────────────
 *   /api/legal/*           → Legal Practice module (NBA compliance, cases, invoices)
 *   /api/events/*          → Event Management module (events, registrations, check-in)
 *   /webhooks/legal/*      → Legal Practice webhooks (Paystack — no auth middleware)
 *   /webhooks/events/*     → Event Management webhooks (Paystack — no auth middleware)
 *   /health                → Platform health check
 * ────────────────────────────────────────────────────────────────────────────
 *
 * To add a new module:
 *   1. import its Hono app
 *   2. add a route condition in the fetch handler below
 *   3. update wrangler.toml if new bindings are required
 */

import legalApp from './modules/legal-practice/api/index';
import eventApp from './modules/event-management/api/index';

export interface Env {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  TENANT_CONFIG: KVNamespace;
  EVENTS: KVNamespace;
  JWT_SECRET: string;
  ENVIRONMENT?: string;
  RATE_LIMIT_KV?: KVNamespace;
  EVENT_BUS_URL?: string;
  EVENT_BUS_API_KEY?: string;
  PAYSTACK_SECRET_KEY?: string;
  TERMII_API_KEY?: string;
  YOURNOTIFY_API_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // ── Global health check ────────────────────────────────────────────────
    if (path === '/health') {
      return Response.json({
        success: true,
        data: {
          service: 'webwaka-professional',
          status: 'healthy',
          modules: ['legal-practice', 'event-management'],
          environment: env.ENVIRONMENT ?? 'development',
          timestamp: Date.now()
        }
      });
    }

    // ── Legal Practice module ──────────────────────────────────────────────
    // Routes: /api/legal/*, /webhooks/legal/* (webhook bypasses auth middleware)
    if (path.startsWith('/api/legal') || path.startsWith('/webhooks/legal')) {
      return legalApp.fetch(request, env, ctx);
    }

    // ── Event Management module ────────────────────────────────────────────
    // Routes: /api/events/*, /webhooks/events/* (webhook bypasses auth middleware)
    if (path.startsWith('/api/events') || path.startsWith('/webhooks/events')) {
      return eventApp.fetch(request, env, ctx);
    }

    // ── 404 ───────────────────────────────────────────────────────────────
    return Response.json(
      { success: false, errors: ['Not Found'] },
      { status: 404 }
    );
  }
};
