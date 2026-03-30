# WebWaka Professional

A multi-tenant professional services management suite for the Nigerian/African market. Implements the **Legal Practice** and **Event Management** modules.

## Architecture

- **Frontend:** React 19 + TypeScript + Vite, with Dexie.js (IndexedDB) for offline-first support
- **Backend:** Hono framework on Cloudflare Workers (edge compute) — runs in the cloud, not locally
- **Database:** Cloudflare D1 (SQLite at the edge)
- **Storage:** Cloudflare R2 (document/banner storage)
- **Config:** Cloudflare KV (tenant config, event cache)

## Key Design Principles

- **Nigeria First / Africa First** — Paystack & Flutterwave payments, Termii SMS, Naira amounts stored in kobo (integers), WAT timezone formatting, 8 African currency support (NGN, GHS, KES, ZAR, UGX, TZS, ETB, XOF)
- **Offline First** — Mutation queue syncs local IndexedDB changes to server when online
- **Mobile First / PWA** — Service worker, manifest.json included
- **Multi-tenant** — Every DB row includes `tenantId`; RBAC enforced on every API endpoint
- **Event-Driven** — `PlatformEvent` bus with `legal_practice` and `event_management` source modules; optional remote dispatch to CORE-2

## Project Structure

```
src/
  core/
    db/schema.ts          # All types + D1 migration SQL (Legal + Event Management)
    event-bus/index.ts    # PlatformEvent bus — LegalEventType, EventMgmtEventType, createEventMgmtEvent
    logger/               # Structured logging
  modules/
    legal-practice/       # Client mgmt, case tracking, hearings, billing, NBA compliance
    event-management/
      api/index.ts        # Hono API router — full RBAC (TENANT_ADMIN, EVENT_MANAGER, ATTENDEE, GUEST)
      db/queries.ts       # D1 queries for events & registrations (all tenantId-scoped)
      utils.ts            # Pure utilities: ID gen, ticket refs, monetary, WAT dates, validation, status machine
      ui.tsx              # React UI — dashboard, event list/create, registrations, check-in
      apiClient.ts        # TypeScript fetch client
      event-management.test.ts  # 247 tests (5 layers: utils, event bus, RBAC, API, DB)
public/          # Static assets, PWA manifest, service worker
```

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

## Development

- **Dev server:** `npm run dev` — runs Vite on port 5000
- **Frontend build:** `npm run build` — outputs to `dist/client/`
- **Worker build:** `npm run build:worker` — compiles Cloudflare Worker with tsc
- **Tests:** `npm test`

## Replit Setup

- Workflow "Start application" runs `npm run dev` on port 5000
- Vite configured with `host: '0.0.0.0'`, `allowedHosts: true` for Replit proxy compatibility
- Deployment configured as **static** site (build: `npm run build`, publicDir: `dist/client`)
- Backend (Cloudflare Workers) is deployed separately via `wrangler deploy` — not run locally

## Environment Variables

See `.env.example` for required variables. Cloudflare bindings (D1, R2, KV) are injected by Wrangler at runtime.
