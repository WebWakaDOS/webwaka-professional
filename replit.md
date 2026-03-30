# WebWaka Professional

A multi-tenant professional services management suite for the Nigerian/African market. Implements the **Legal Practice** and **Event Management** modules.

## Architecture

- **Frontend:** React 19 + TypeScript + Vite, with Dexie.js (IndexedDB) for offline-first support
- **Backend:** Hono framework on Cloudflare Workers (edge compute) — runs in the cloud, not locally
- **Database:** Cloudflare D1 (SQLite at the edge)
- **Storage:** Cloudflare R2 (document/banner storage)
- **Config:** Cloudflare KV (tenant config, event cache)

## Key Design Principles

- **Nigeria First / Africa First** — Paystack payments, Termii SMS, Naira in kobo (integers), WAT timezone, 10 currencies (8 African + USD + GBP)
- **Offline First** — Mutation queue syncs local IndexedDB changes to server when online
- **Mobile First / PWA** — Service worker, manifest.json included
- **Multi-tenant** — Every DB row includes `tenantId`; RBAC enforced on every API endpoint
- **Event-Driven** — `PlatformEvent` bus; optional remote dispatch to CORE-2

## Project Structure

```
src/
  worker.ts                     # Unified Cloudflare Worker entry point (Phase 0)
  core/
    api.ts                      # Shared ApiResponse<T>, ok(), fail() helpers
    env.ts                      # Shared WorkerEnv interface (all Cloudflare bindings)
    ids.ts                      # generateId(), nowUTC()
    money.ts                    # koboToNaira, nairaToKobo, formatCurrency, calculateVAT, SUPPORTED_CURRENCIES
    time.ts                     # formatWATDate(), formatWATDateTime() (Africa/Lagos, UTC+1)
    validators.ts               # validateNigerianPhone(), validateEmail(), ValidationResult
    db/
      d1.ts                     # Canonical D1Database / D1PreparedStatement / D1Result types
      schema.ts                 # All entity types + D1 migration SQL
      queries.ts                # Legal Practice D1 query helpers (re-exports D1 types from d1.ts)
    event-bus/index.ts          # PlatformEvent bus — LegalEventType, EventMgmtEventType
    logger/                     # Structured logging
    payments/
      paystack.ts               # PaystackClient: initializeTransaction, verifyTransaction, verifyWebhookSignature
    sync/
      client.ts                 # LegalPracticeOfflineDB + EventManagementOfflineDB + SyncManager
  modules/
    legal-practice/             # Client mgmt, case tracking, hearings, billing, NBA compliance
      api/index.ts              # Hono API (routes at /api/legal/*)
      db/queries.ts             # D1 queries (re-exports D1Database from core)
      utils.ts                  # Module utils (re-exports shared from core; keeps module-specific)
    event-management/
      api/index.ts              # Hono API (routes at /api/events/*)
      db/queries.ts             # D1 queries (imports D1Database from core/db/d1)
      utils.ts                  # Module utils (re-exports shared from core; keeps module-specific)
public/                         # Static assets, PWA manifest, service worker
```

## Worker Routing (src/worker.ts)

| Path prefix     | Module             |
|-----------------|-------------------|
| `/api/legal/*`  | Legal Practice     |
| `/api/events/*` | Event Management   |
| `/health`       | Platform health    |

## Event Management Module

### RBAC Roles
| Role | Can Do |
|------|--------|
| `TENANT_ADMIN` | Full control — create, edit, publish, cancel, delete, manage registrations |
| `EVENT_MANAGER` | Create, edit, publish, open/close registration, check-in. **Cannot cancel or delete.** |
| `ATTENDEE` | View published events, register self, cancel own registration |
| `GUEST` | View published events only — no write access |

### Event Status Machine
`DRAFT → PUBLISHED → REGISTRATION_OPEN → REGISTRATION_CLOSED → ONGOING → COMPLETED`
`CANCELLED` reachable from any non-terminal state (TENANT_ADMIN only)

### Monetary Convention
All amounts in the **smallest currency unit** (kobo for NGN = 1/100 Naira). Always integers, never floats.

## Test Suite

- **247 tests total — 0 failures**
- Legal Practice: 91 tests (utils, DB, API, sync, i18n layers)
- Event Management: 156 tests (utils, event bus, RBAC, API, DB layers)
- Run: `npm test`

## Development

- **Dev server:** `npm run dev` — runs Vite on port 5000
- **Frontend build:** `npm run build` — outputs to `dist/client/`
- **Worker build:** `npm run build:worker` — compiles Cloudflare Worker with tsc
- **Deploy to staging:** `npm run deploy:staging`
- **Deploy to production:** `npm run deploy:production`

## Replit Setup

- Workflow "Start application" runs `npm run dev` on port 5000
- Vite configured with `host: '0.0.0.0'`, `allowedHosts: true` for Replit proxy compatibility
- Deployment configured as **static** site (build: `npm run build`, publicDir: `dist/client`)
- Backend (Cloudflare Workers) is deployed separately via `wrangler deploy` — not run locally

## Environment Variables

See `.env.example` for required variables. Cloudflare bindings (D1, R2, KV) are injected by Wrangler at runtime.

## Phase Completion Status

| Phase | Description | Status |
|-------|-------------|--------|
| 0.1 | Unified `src/worker.ts` entry point | ✅ Complete |
| 0.2 | `core/money.ts` — monetary utilities | ✅ Complete |
| 0.3 | `core/ids.ts`, `core/time.ts`, `core/validators.ts` | ✅ Complete |
| 0.4 | `core/db/d1.ts`, `core/api.ts` | ✅ Complete |
| 0.5 | Module utils re-export from core (backwards-compatible) | ✅ Complete |
| 0.6 | `core/env.ts` (WorkerEnv), `core/payments/paystack.ts` | ✅ Complete |
| 0.7 | Sync client extended with EventManagementOfflineDB | ✅ Complete |
| 0.8 | `wrangler.toml` updated; 247 tests passing | ✅ Complete |
| 1–8 | Payment integration, notifications, portals, analytics, new modules | Pending |
