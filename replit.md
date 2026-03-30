# WebWaka Professional

A professional services management suite focused on the African (Nigerian) market. Currently implements the **Legal Practice** module.

## Architecture

- **Frontend:** React 19 + TypeScript + Vite, with Dexie.js (IndexedDB) for offline-first support
- **Backend:** Hono framework on Cloudflare Workers (edge compute) — runs in the cloud, not locally
- **Database:** Cloudflare D1 (SQLite at the edge)
- **Storage:** Cloudflare R2 (document storage)
- **Config:** Cloudflare KV (tenant config)

## Key Design Principles

- **Nigeria First / Africa First** — Paystack & Flutterwave payments, Termii SMS, Naira amounts stored in kobo (integers)
- **Offline First** — Mutation queue syncs local IndexedDB changes to server when online
- **Mobile First / PWA** — Service worker, manifest.json included
- **Multi-tenant** — Every DB row includes `tenantId`

## Project Structure

```
src/
  core/          # Shared platform services (sync engine, event bus, logging)
  modules/
    legal-practice/   # Client mgmt, case tracking, hearings, billing, NBA compliance
public/          # Static assets, PWA manifest, service worker
```

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
