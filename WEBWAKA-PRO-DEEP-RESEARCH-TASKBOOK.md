# WEBWAKA-PRO DEEP RESEARCH + ENHANCEMENT TASKBOOK + QA PROMPT FACTORY

**Repository:** `WebWakaDOS/webwaka-professional`  
**Prepared by:** Replit Agent — Deep Research Session  
**Date:** 2026-04-04  
**Classification:** Internal — Platform Architecture + Execution Intelligence  
**Version:** 1.0 — Phase 1 / Phase 2 Split Included  

---

## TABLE OF CONTENTS

1. [Repo Deep Understanding](#1-repo-deep-understanding)  
2. [External Best-Practice Research](#2-external-best-practice-research)  
3. [Synthesis and Gap Analysis](#3-synthesis-and-gap-analysis)  
4. [Top 20 Enhancements](#4-top-20-enhancements)  
5. [Bug Fix Recommendations](#5-bug-fix-recommendations)  
6. [Task Breakdown (All Tasks — Full Detail)](#6-task-breakdown)  
7. [QA Plans (Per Task)](#7-qa-plans)  
8. [Implementation Prompts (Per Task)](#8-implementation-prompts)  
9. [QA Prompts (Per Task)](#9-qa-prompts)  
10. [Priority Order](#10-priority-order)  
11. [Dependencies Map](#11-dependencies-map)  
12. [Phase 1 / Phase 2 Split](#12-phase-1--phase-2-split)  
13. [Repo Context and Ecosystem Notes](#13-repo-context-and-ecosystem-notes)  
14. [Governance and Reminder Block](#14-governance-and-reminder-block)  
15. [Execution Readiness Notes](#15-execution-readiness-notes)  

---

## 1. REPO DEEP UNDERSTANDING

### 1.1 What This Repository Is

`webwaka-professional` is the **professional services vertical** of the WebWaka multi-repo, multi-tenant, Cloudflare-first SaaS platform targeting the Nigerian and African markets. It is **not a standalone application**. It is one component of a larger ecosystem that includes at minimum:

- `webwaka-platform` — identity, JWT issuance, tenant provisioning, CORE-1 sync (server-side), CORE-2 event bus (server-side)
- `webwaka-commerce` — payment gateway management (Paystack, Flutterwave)
- `webwaka-core` — shared npm package (`@webwaka/core`) with auth middleware, RBAC, billing utilities, logger

This repo depends on `@webwaka/core@^1.3.2` (the shared npm package) and exposes a Cloudflare Worker API that consumes Cloudflare D1 (SQLite), R2 (object storage), and KV (key-value store).

### 1.2 Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Runtime | Cloudflare Workers (V8 isolates) | `compatibility_date = "2024-12-01"` |
| API Framework | Hono 4.12.x | Edge-native router |
| Database | Cloudflare D1 (SQLite at edge) | Dependency-injected `D1Database` |
| Object Storage | Cloudflare R2 | `DOCUMENTS` binding |
| KV Cache | Cloudflare KV | `TENANT_CONFIG`, `EVENTS`, `RATE_LIMIT_KV` |
| Frontend | React 19 + Vite 8 | Mobile-first PWA |
| Offline Store | Dexie (IndexedDB) | `LegalPracticeOfflineDB`, `EventManagementOfflineDB` |
| Test Runner | Vitest | 323 tests total, 0 failures |
| Language | TypeScript 5.9, strict mode | `exactOptionalPropertyTypes: true` |
| Auth | HS256 JWT via `@webwaka/core` | Edge-based, `tenantId` from JWT only |
| Events | CORE-2 event bus | `publishEvent()` → HTTP POST to `EVENT_BUS_URL` |
| SMS | Termii | Nigeria-First SMS gateway |
| Email | Yournotify | Africa-First email provider |
| Payments | Paystack | Nigeria-First payment gateway |

### 1.3 Implemented Modules

#### Legal Practice Management (`src/modules/legal-practice/`)
**Status:** FULLY IMPLEMENTED — 109 tests, 23+ API endpoints, full PWA UI, 5-layer QA cleared.

**API Endpoints:**
- Client CRUD (5 endpoints): create, list, get, update, soft-delete
- Case CRUD (5 endpoints): auto-generates `WW/{STATE}/{YEAR}/{SEQ}` reference
- Hearings (2 endpoints): create, list per case
- Time entries (3 endpoints): create, list, unbilled query
- Invoices (4+ endpoints): create, list, mark sent, mark paid, Paystack init, Paystack webhook
- Documents (2 endpoints): create, list per case
- NBA Profile (2 endpoints): create/update, verify
- Trust Accounts (full CRUD + transaction ledger): 6+ endpoints
- Dashboard stats: 1 endpoint
- Sync (GET + POST): 2 endpoints

**Database Tables (6 primary + 1 trust):**
- `legal_clients` — NDPR-compliant, 4-language preference
- `legal_cases` — Nigerian court types, status machine, opposing party
- `case_hearings` — hearing dates, outcome tracking
- `legal_time_entries` — kobo-integer billing, auto-calculation
- `legal_invoices` — 7.5% VAT auto-calc, Paystack reference
- `legal_documents` — R2 storage, e-signature stub
- `trust_accounts` / `trust_transactions` — NBA Rule 23 compliant append-only ledger

**Nigeria-Specific Features:**
- NBA bar number validation (`NBA/BRANCH/YEAR/SEQ`)
- NDPR consent capture in 4 languages (en, yo, ig, ha)
- 7.5% VAT on all invoices
- WAT (UTC+1) timezone throughout
- Nigerian court hierarchy (7 court types)

#### Event Management (`src/modules/event-management/`)
**Status:** FULLY IMPLEMENTED — 172 tests, 20+ API endpoints, React UI.

**API Endpoints:**
- Event CRUD + status lifecycle: `DRAFT → PUBLISHED → REGISTRATION_OPEN → REGISTRATION_CLOSED → ONGOING → COMPLETED`
- `CANCELLED` from any non-terminal (TENANT_ADMIN only)
- Registration CRUD + check-in + payment init + webhook
- Dashboard stats
- Banner upload to R2

**Database Tables:**
- `managed_events` — capacity, ticket price in kobo, banner URL, R2 key
- `event_registrations` — `WW-EVT-{YEAR}-{NNNNNN}` ticket references, status machine, Paystack reference

**RBAC Roles:**
- `TENANT_ADMIN` — full control
- `EVENT_MANAGER` — create, publish, check-in (no cancel/delete)
- `ATTENDEE` — self-register and cancel
- `GUEST` — view published events only

#### Platform Core (`src/core/`)
- **`db/d1.ts`** — canonical D1 type shims for edge + test environments
- **`db/schema.ts`** — single source of truth for all entity types (797 lines)
- **`db/queries.ts`** — shared query layer, dependency-injected D1Database
- **`event-bus/index.ts`** — dual-mode event bus (local + CORE-2 remote)
- **`sync/client.ts`** — universal offline sync engine (Dexie + mutation queue)
- **`payments/paystack.ts`** — Paystack client: initialize, verify, HMAC webhook
- **`notifications/`** — Termii (SMS), Yournotify (email), templates, service orchestrator
- **`auth-middleware.ts`** — JWT validation + RBAC via `@webwaka/core`
- **`money.ts`** — kobo integers, VAT, formatCurrency, 10 currencies
- **`time.ts`** — WAT timezone, formatWATDate/DateTime
- **`ids.ts`** — generateId(), nowUTC(), semantic prefixes
- **`validators.ts`** — phone, email, NBA bar number validation
- **`api.ts`** — standard `{ success, data, errors }` response envelope
- **`env.ts`** — shared WorkerEnv interface

### 1.4 Infrastructure

**`src/worker.ts` (Unified Entry Point):**
```
/api/legal/*       → Legal Practice Hono app
/api/events/*      → Event Management Hono app
/webhooks/legal/*  → Legal Practice webhooks (no auth middleware)
/webhooks/events/* → Event Management webhooks (no auth middleware)
/health            → Platform health (returns module list, environment, timestamp)
```

**`wrangler.toml`:**
- `main = "src/worker.ts"` — unified routing confirmed
- `staging` and `production` environments with D1, R2, KV bindings
- **Known bug:** `TENANT_CONFIG` and `EVENTS` KV bindings share the same `id` in staging env

**Test Suite:**
- 323 tests, 0 failures
- Legal Practice: 109 tests
- Event Management: 172 tests
- Notifications: 42 tests

**Migrations:**
- `migrations/0001_initial_schema.sql` — 226 lines, full schema
- `migrations/0002_trust_accounts.sql` — trust accounts and transactions tables

**Phase Completion:**
- Phases 0.1–0.9 (infrastructure hardening): ✅ Complete
- Phases 1.1–1.8 (Paystack payment integration): ✅ Complete
- Phases 2.1–2.9 (Termii/Yournotify notifications): ✅ Complete
- Phases 3–8 (documents, portals, analytics, new modules): ⏳ Pending

### 1.5 Known Gaps and Bugs

**Gaps in Current Implementation:**
1. Sync engine has no exponential backoff or dead letter queue for permanently-failed mutations
2. Trust account balance is a running sum query — will degrade at scale without checkpointing
3. CORS wildcard (`*`) used when `ENVIRONMENT` is not `production` or `staging` — dev misconfiguration risk
4. KV namespace IDs duplicated between `TENANT_CONFIG` and `EVENTS` bindings in staging `wrangler.toml`
5. Notification templates in `templates.ts` are English-only despite multilingual i18n infrastructure in place
6. Optimistic UI offline: local IndexedDB state not updated immediately after `queueMutation()` — user sees stale data until sync completes
7. JWT validation is duplicated inside each module Hono app — not pre-validated in `worker.ts`
8. No rate limiting in `RATE_LIMIT_KV` — binding exists but logic not implemented
9. Event Management sync uses a separate `EventManagementOfflineDB` that cannot share its mutation queue with the Legal module `SyncManager`
10. No CI/CD pipeline defined (`.github/workflows/` is empty aside from stubs)

---

## 2. EXTERNAL BEST-PRACTICE RESEARCH

### 2.1 Legal Practice Management — World-Class Benchmarks

**Benchmark platforms:** Clio (North America), MyCase, Smokeball, ActionStep, LawPavilion (Nigeria).

**Best practices that world-class systems implement:**

| Best Practice | Clio/MyCase Implementation | WebWaka Status |
|---|---|---|
| Immutable trust ledger | Append-only, cannot edit/delete entries | ✅ Implemented (queries.ts enforces this) |
| Cause list monitoring | Calendar integrations (Google Cal, Outlook) + email alerts | ❌ Missing |
| Conflict-of-interest check | Pre-matter search across all parties | ❌ Missing |
| Time entry auto-capture | Calendar → time entry suggestion | ❌ Missing |
| Retainer management | Separate retainer balance + drawdown tracking | ⚠️ Partial |
| PDF invoice generation | Branded, FIRS-compliant, downloadable | ❌ Missing |
| Client portal | Secure, tokenized, read-only client view | ❌ Missing |
| Matter budgeting | Budget cap per matter, alerts at threshold | ❌ Missing |
| Court deadline calculator | Deadline from service date + court rules | ❌ Missing |
| e-signature capture | In-browser signature pad | ❌ Stubbed only |
| Bulk time export | Excel/CSV export of unbilled time | ❌ Missing |
| Revenue analytics | Billable hours, realization rate, origination reports | ❌ Missing |
| Diarization | Auto-create deadline tasks from hearing dates | ❌ Missing |

**Nigerian-specific best practices from LawPavilion and peer research:**
- Adjournment reason codes matter — Nigerian courts adjourn ~70% of hearings; tracking reason (judge absence, counsel absence, incomplete filing, etc.) is operationally critical
- Brief fee vs. retainer must be tracked separately (Nigerian billing reality)
- Cash payment recording is non-negotiable for Nigerian lawyers
- NBA practicing certificate expiry is a high-anxiety item for solo practitioners
- Stamp duty on agreements is frequently forgotten — needs a tracking feature
- Nigerian court hierarchy is complex and state-specific; Sharia and Customary courts need support (already implemented)

### 2.2 Event Management — World-Class Benchmarks

**Benchmark platforms:** Eventbrite, Hopin, Humanitix, Konfhub (India), Ticketmaster Africa.

| Best Practice | Eventbrite/Hopin | WebWaka Status |
|---|---|---|
| Multi-ticket-type pricing | Early Bird, Regular, VIP, Staff | ❌ Missing |
| QR code tickets | Per-registration unique QR, scannable | ❌ Missing |
| Offline check-in app | Works without internet | ❌ Missing |
| Group/bulk registration | Single payment, N attendees | ❌ Missing |
| Waitlist management | Auto-promote on cancellation | ❌ Missing |
| Promo/discount codes | Percentage or fixed amount off | ❌ Missing |
| PDF attendance certificates | Auto-generated, branded, verifiable | ❌ Missing |
| Hybrid/virtual event support | Zoom/Meet link distribution | ❌ Missing |
| Post-event feedback survey | NPS + session ratings | ❌ Missing |
| Custom event landing page | SEO-friendly, shareable URL | ❌ Missing |
| Sponsor management | Tiers, logos, deliverables | ❌ Missing |
| WhatsApp ticket delivery | Native WhatsApp message with QR | ❌ Missing |
| Real-time check-in dashboard | Live attendee count during event | ❌ Missing |
| Recurring event series | Weekly/monthly/annual groups | ❌ Missing |
| Revenue reports | Tickets sold, revenue by type, refunds | ❌ Missing |

**Nigeria-specific observations:**
- Manual check-in via Excel spreadsheet is the norm — QR scanning is a massive upgrade
- WhatsApp confirmation is expected, not email — email open rates in Nigeria are very low
- Bank transfer with proof-of-payment screenshot is a primary payment channel
- Corporate/group registrations are common for conferences and training
- Physical check-in queues are the biggest pain point at Nigerian events
- CPD certificates have direct monetary value to professionals (NBA, ICAN, MDCN require them)

### 2.3 Offline-First PWA — Best Practices for African Markets

| Best Practice | Implementation | WebWaka Status |
|---|---|---|
| IndexedDB with Dexie | Structured offline data store | ✅ Implemented |
| Mutation queue | Queue operations for sync | ✅ Implemented |
| Background sync (Service Worker) | Sync on reconnect via SW | ✅ Basic |
| Exponential backoff | Retry with increasing delay | ❌ Missing |
| Dead letter queue | Permanent failure handling | ❌ Missing |
| Optimistic UI updates | Immediate local state update | ❌ Missing |
| Partial/chunked sync | Batch sync for large datasets on 3G | ❌ Missing |
| Online/offline indicator | Visual connectivity status | ❌ Missing |
| Conflict resolution strategy | Server-authoritative last-write-wins | ❌ Not formalized |
| App update prompt | Notify user when new version available | ❌ Missing |

### 2.4 Multi-Tenant SaaS — Best Practices

| Best Practice | Industry Standard | WebWaka Status |
|---|---|---|
| Row-level tenant isolation | `tenantId` on every table | ✅ Enforced |
| JWT-sourced tenantId | Never from request headers | ✅ Enforced |
| Per-tenant config | KV-backed tenant settings | ✅ Architected |
| Per-tenant branding | Logo, colors, custom domain | ❌ Missing |
| Tenant usage analytics | API call counts, storage used | ❌ Missing |
| Rate limiting | Per-tenant request throttling | ❌ KV binding exists, logic missing |
| Audit log | Immutable per-tenant operation log | ❌ Missing |
| Data export | GDPR/NDPR-compliant full export | ❌ Missing |
| Soft deletion everywhere | `deletedAt` field | ✅ Enforced |
| Event bus isolation | Tenant-scoped events | ✅ Enforced |

### 2.5 Security Standards

| Control | Best Practice | WebWaka Status |
|---|---|---|
| HMAC webhook validation | SHA-512 for Paystack | ✅ Implemented |
| JWT expiry enforcement | Short-lived tokens (15 min) | ✅ Via `@webwaka/core` |
| CORS configuration | Origin whitelist, not wildcard | ⚠️ Wildcard in dev |
| Rate limiting | Per-tenant + per-IP | ❌ Missing logic |
| Secret management | `wrangler secret put` only | ✅ Documented |
| Input validation | All request bodies validated | ✅ Partial |
| SQL injection prevention | Parameterized queries | ✅ D1 prepared statements |
| Secrets in code | Zero | ✅ Confirmed zero |

---

## 3. SYNTHESIS AND GAP ANALYSIS

### 3.1 What WebWaka Professional Does Well

1. **Platform invariants** — All 8 invariants enforced consistently across both modules: Nigeria/Africa First, Offline First, Mobile First, Multi-Tenant, Event-Driven, Cloudflare-First, Vendor-Neutral AI, Build-Once-Use-Infinitely
2. **Test coverage** — 323 tests with 0 failures is industry-leading for a project at this maturity level
3. **Core infrastructure** — `src/core/` is well-factored; money, time, ids, validators, event-bus, payments, notifications, sync are all cleanly separated
4. **Trust accounting** — NBA Rule 23 compliant append-only ledger is architecturally sound
5. **Payment integration** — Paystack initialization and webhook verification are fully wired for both modules
6. **Notification infrastructure** — Termii + Yournotify + templates + service orchestrator in place
7. **Worker routing** — Unified `src/worker.ts` correctly routes Legal and Event Management traffic
8. **Schema design** — All tables: `tenantId NOT NULL`, `deletedAt`, monetary values as integers in kobo
9. **i18n** — 4 languages (en/yo/ig/ha) with 836-line translation set is exceptional

### 3.2 Critical Gaps

| Gap | Impact | Blocking |
|---|---|---|
| No QR code ticket generation | Event check-in is manual/paper-based | ENH-EM-02, ENH-EM-03 |
| No PDF generation | Cannot produce invoices, certificates, receipts | ENH-LP-16, ENH-EM-03 |
| No WhatsApp notifications | Majority of Nigerian users unreachable | ENH-LP-04, ENH-EM-15 |
| No multi-ticket-type pricing | Cannot run tiered-price events | ENH-EM-11 |
| No group/bulk registration | Corporate event registrations broken | ENH-EM-04 |
| No offline check-in app | Check-in fails at poor-connectivity venues | ENH-EM-02 |
| No hearing calendar / reminders | Lawyers miss hearings | ENH-LP-02 |
| No conflict-of-interest check | Ethical/legal compliance risk for firms | ENH-LP-10 |
| No expense tracking | Lawyers lose disbursement revenue | ENH-LP-09 |
| No event landing page | Cannot share events publicly | ENH-EM-13 |
| No Cron triggers | Reminders, archiving, follow-ups impossible | Multiple |
| Sync engine fragility | Data loss risk on poor connectivity | BUG-01 |
| CORS wildcard | Security misconfiguration risk | BUG-02 |
| KV ID duplication | Staging data may cross-contaminate | BUG-03 |
| No CI/CD pipeline | Regressions not caught automatically | CI-01 |

### 3.3 Architecture Debt

1. **JWT pre-validation** not done in `worker.ts` — duplicated in each module
2. **SyncManager** is hardwired to `LegalPracticeOfflineDB` — `EventManagementOfflineDB` has no `SyncManager`
3. **Rate limiting** KV binding exists but no enforcement logic
4. **Notification templates** English-only despite 4-language i18n infrastructure

### 3.4 Cross-Module Opportunities

1. **CPD accreditation** — Event Management → Legal Practice: when an event completes with CPD hours, credit NBA profile automatically (cross-module event subscription pattern, first of its kind)
2. **Shared PDF engine** — Legal invoices, event certificates, and future modules all need PDF; extract to `core/pdf.ts`
3. **Shared QR engine** — Event tickets and future verification needs; extract to `core/qr.ts`
4. **NDPR compliance workflow** — Legal Practice has it; all other modules need it; extract to `core/compliance/ndpr.ts`
5. **Professional compliance passport** — NBA profile is the pattern; MDCN, ICAN, COREN follow the same shape; abstract to `core/compliance/professional-profile.ts`

---

## 4. TOP 20 ENHANCEMENTS

These are the top 20 enhancements synthesized from the codebase gap analysis, Nigerian market domain research, and external benchmark comparison. Each is scoped to what can be implemented within `webwaka-professional` without requiring work in other repos.

| # | Enhancement | Module | Priority | Phase |
|---|---|---|---|---|
| ENH-01 | Sync Engine Hardening (backoff, DLQ, optimistic UI) | Core/All | 🔴 CRITICAL | Phase 1 |
| ENH-02 | QR Code Ticket Generation + Offline Check-In | Event Mgmt | 🔴 CRITICAL | Phase 1 |
| ENH-03 | PDF Generation Infrastructure (`core/pdf.ts`) | Core | 🔴 CRITICAL | Phase 1 |
| ENH-04 | Attendance Certificate Auto-Generation | Event Mgmt | 🔴 CRITICAL | Phase 1 |
| ENH-05 | Multi-Ticket-Type Pricing (Early Bird, VIP, Staff) | Event Mgmt | 🔴 CRITICAL | Phase 1 |
| ENH-06 | Group / Bulk Registration | Event Mgmt | 🔴 CRITICAL | Phase 1 |
| ENH-07 | Bank Transfer Offline Payment Confirmation | Both | 🔴 CRITICAL | Phase 1 |
| ENH-08 | Court Hearing Calendar + Cron Reminders | Legal | 🔴 CRITICAL | Phase 1 |
| ENH-09 | Legal Invoice PDF Generation | Legal | 🟠 HIGH | Phase 1 |
| ENH-10 | NBA Practicing Certificate Renewal Tracker | Legal | 🟠 HIGH | Phase 1 |
| ENH-11 | Conflict-of-Interest Checker | Legal | 🟠 HIGH | Phase 1 |
| ENH-12 | Case Expense Tracking + Disbursement Billing | Legal | 🟠 HIGH | Phase 2 |
| ENH-13 | WhatsApp Notification Integration | Core | 🟠 HIGH | Phase 2 |
| ENH-14 | Event Landing Page Generator (Worker SSR) | Event Mgmt | 🟠 HIGH | Phase 2 |
| ENH-15 | Waitlist Management | Event Mgmt | 🟠 HIGH | Phase 2 |
| ENH-16 | NDPR Data Subject Request Workflow | Core/Legal | 🟠 HIGH | Phase 2 |
| ENH-17 | Event Analytics Dashboard Enhancement | Event Mgmt | 🟡 MEDIUM | Phase 2 |
| ENH-18 | CPD Accreditation Cross-Module Integration | Both | 🟡 MEDIUM | Phase 2 |
| ENH-19 | Multilingual Notification Templates | Core | 🟡 MEDIUM | Phase 2 |
| ENH-20 | CI/CD Pipeline + GitHub Actions | DevOps | 🟡 MEDIUM | Phase 2 |

---

## 5. BUG FIX RECOMMENDATIONS

| # | Bug | Severity | Phase |
|---|---|---|---|
| BUG-01 | SyncManager missing exponential backoff and dead letter queue | 🔴 CRITICAL | Phase 1 |
| BUG-02 | CORS wildcard (`*`) in non-production environments | 🟠 HIGH | Phase 1 |
| BUG-03 | KV namespace ID duplication in staging `wrangler.toml` | 🟠 HIGH | Phase 1 |
| BUG-04 | Notification templates are English-only (multilingual promised but absent) | 🟡 MEDIUM | Phase 1 |
| BUG-05 | Optimistic UI: local IndexedDB not updated after `queueMutation()` | 🟡 MEDIUM | Phase 1 |
| BUG-06 | Rate limiting KV binding (`RATE_LIMIT_KV`) exists with zero enforcement logic | 🟡 MEDIUM | Phase 2 |
| BUG-07 | Trust account balance query is an unbounded running sum (D1 performance) | 🟡 MEDIUM | Phase 2 |
| BUG-08 | `EventManagementOfflineDB` has no `SyncManager` instance | 🟠 HIGH | Phase 1 |
| BUG-09 | CI/CD pipeline absent — `.github/workflows/` has no working workflow files | 🟡 MEDIUM | Phase 2 |

---

## 6. TASK BREAKDOWN

---

### TASK-01: Sync Engine Hardening

**Title:** Universal Sync Engine — Exponential Backoff, Dead Letter Queue, EventManagement SyncManager, Optimistic UI  
**Objective:** Harden the offline sync engine against permanent failures, add exponential backoff, create a dead letter queue for unrecoverable mutations, give `EventManagementOfflineDB` its own `SyncManager`, and update the UI to apply optimistic local state updates immediately on queue.  
**Why It Matters:** The sync engine is the backbone of the Offline First invariant. If it fails silently or retries indefinitely without backoff, it corrupts the mutation queue and burns user bandwidth. Optimistic UI is essential for usability on slow connections — users must see their actions immediately.  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** None (self-contained)  
**Prerequisites:** Existing `src/core/sync/client.ts`, `EventManagementOfflineDB`  
**Impacted Modules:** Core sync, Legal Practice UI, Event Management UI  
**Files to Change:**
- `src/core/sync/client.ts` — exponential backoff, dead letter queue, EventMgmt SyncManager
- `src/modules/legal-practice/ui.tsx` — optimistic UI updates
- `src/modules/event-management/ui.tsx` — optimistic UI updates  
**Expected Output:**
- Mutations that fail retry with 2s, 4s, 8s, 16s... up to 5 retries
- After 5 failures: mutation moved to status `DEAD` (dead letter) and logged
- `EventManagementSyncManager` class mirroring `SyncManager` but using `EventManagementOfflineDB`
- UI applies local Dexie write immediately, then calls `queueMutation()`  
**Acceptance Criteria:**
- `SyncManager.processQueue()` implements exponential backoff
- Mutations with `retryCount >= 5` are marked `DEAD`, not `FAILED`
- `getDLQCount()` method returns count of DEAD mutations
- `EventManagementSyncManager` class exists and is used in Event Management UI
- UI writes to local Dexie store first, then queues — no visible latency  
**Tests Required:**
- `SyncManager` exponential backoff test (mock time, assert delay)
- Dead letter queue promotion after 5 retries
- Optimistic update: Dexie state correct before sync response
- EventManagement SyncManager test  
**Risks:** Changing sync behavior could break existing 323 tests  
**Governance Docs:** Part 6 (Universal Offline Sync Engine), Part 9.1 Offline First  
**Reminders:** `tenantId` from JWT only; no `console.log`; use `createLogger()`

---

### TASK-02: QR Code Ticket Generation + Offline Check-In

**Title:** QR Code Tickets per Registration + Offline-Capable QR Scan Check-In  
**Objective:** Generate a unique QR code (SVG or PNG) per confirmed event registration encoding the `ticketRef`. Add an offline-capable QR scan check-in endpoint and UI that queues check-in mutations in IndexedDB when offline.  
**Why It Matters:** QR check-in is the #1 quality-of-life upgrade for Nigerian event organizers. Manual check-in is the biggest operational pain point for large events. Works offline for poor-connectivity venues.  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** ENH-01 (EventManagement SyncManager) for offline check-in queuing  
**Prerequisites:** `event_registrations` table with `ticketRef`, `EventManagementOfflineDB`  
**Impacted Modules:** Event Management API, Event Management UI, Core (new `core/qr.ts`)  
**Files to Change:**
- `src/core/qr.ts` — new shared QR generation utility (`generateQRCode(data: string): Promise<string>`)
- `src/modules/event-management/api/index.ts` — add `GET /api/events/registrations/:id/ticket` (returns QR + ticket details)
- `src/modules/event-management/api/index.ts` — add `POST /api/events/registrations/scan` (check-in by ticketRef)
- `src/modules/event-management/ui.tsx` — check-in UI with QR input / scanner
- `src/core/db/schema.ts` — add `checkedInAt: number | null` to `EventRegistration` (if not already present)
- `migrations/0003_checkin.sql` — add `checkedInAt` column if needed  
**Expected Output:**
- `GET /api/events/registrations/:id/ticket` returns `{ ticketRef, attendeeName, eventTitle, eventDate, qrCode (SVG string) }`
- `POST /api/events/registrations/scan` accepts `{ ticketRef }`, marks `checkedInAt`, returns attendee info
- Check-in works offline (queued in Dexie, synced on reconnect)
- QR code embeds `ticketRef` — format: `WW-EVT-{YEAR}-{NNNNNN}`  
**Acceptance Criteria:**
- QR scan returns `200` with attendee name and event title
- Duplicate scan returns `409 Conflict` with "Already checked in" message
- Invalid `ticketRef` returns `404`
- Offline scan queues mutation; syncs correctly on reconnect
- QR SVG is valid and scannable by standard QR apps  
**Tests Required:**
- Unit: `generateQRCode()` produces valid SVG
- API: `POST /api/events/registrations/scan` happy path, duplicate scan, invalid ref
- API: `GET /api/events/registrations/:id/ticket` returns QR for confirmed registration
- Offline: check-in mutation queued when offline  
**Risks:** Edge-compatible QR library selection (must work in Cloudflare Workers V8 isolate, no Node.js APIs)  
**Governance Docs:** Part 9.1 (Offline First), Part 9.2 (API Responses)  
**Reminders:** Use edge-compatible QR library (e.g., `qrcode` with browser target, or `@akgondber/qrcode-worker`)

---

### TASK-03: PDF Generation Infrastructure (`core/pdf.ts`)

**Title:** Shared PDF Generation Engine for Invoices, Certificates, and Receipts  
**Objective:** Create `src/core/pdf.ts` — a shared, edge-compatible PDF generation service that all Professional modules can use. Implement HTML-template-to-PDF conversion using Cloudflare Workers compatible approach (HTML string → Resvg or browser-native PDF, or use a headless PDF API). Initially support: invoice PDF, event receipt PDF.  
**Why It Matters:** PDF generation is needed by at minimum 5 features: legal invoice, event ticket, attendance certificate, receipt, and retainer agreement. Without a shared engine, each module would implement its own — violating "Build Once Use Infinitely."  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** None  
**Prerequisites:** R2 `DOCUMENTS` binding  
**Impacted Modules:** Core (new capability), Legal Practice, Event Management  
**Files to Change:**
- `src/core/pdf.ts` — new shared PDF generation utility
- `src/core/env.ts` — ensure `DOCUMENTS: R2Bucket` is in WorkerEnv  
**Technical Approach:**
- **Option A (Preferred):** Use `@cloudflare/puppeteer` via Workers AI binding — render HTML → PDF
- **Option B:** Use a dedicated PDF API service (Browserless, htmlpdfapi.io) called from Worker
- **Option C:** Generate PDF-compatible HTML response with `Content-Type: text/html` and print CSS — let the browser handle printing
- For edge compatibility, Option C is the most pragmatic initial implementation; document the path to Option A when Puppeteer support is stable  
**Expected Output:**
- `generatePDF(template: string, data: Record<string, unknown>): Promise<Uint8Array>` function
- `storePDFToR2(pdf: Uint8Array, key: string, env: WorkerEnv): Promise<string>` — returns presigned URL
- `generatePresignedDownloadUrl(key: string, env: WorkerEnv, expirySeconds: number): Promise<string>`
- Invoice HTML template: firm letterhead, FIRS-format, VAT, itemized entries, payment instructions
- Receipt HTML template: event name, attendee, ticket type, amount paid  
**Acceptance Criteria:**
- `generatePDF()` returns valid PDF bytes (or structured HTML) from a template + data object
- PDF stored in R2 with tenant-scoped key
- Presigned URL valid for 24 hours
- Invoice template includes: firm name, FIRS-format VAT, line items, totals, payment instructions
- Receipt template includes: event name, attendee name, ticket ref, date, amount  
**Tests Required:**
- Unit: template rendering with variable substitution
- Unit: R2 storage key is tenant-scoped
- API: `GET /api/legal/invoices/:id/pdf` returns 200 with download URL  
**Risks:** Edge PDF generation is not fully standardized on Cloudflare Workers; may need external service  
**Governance Docs:** Part 9.1 (Build Once Use Infinitely), Part 9.3 (Cloudflare-First)

---

### TASK-04: Attendance Certificate Auto-Generation

**Title:** Auto-Generated PDF Attendance Certificates with QR Code Verification  
**Objective:** After an event reaches `COMPLETED` status, automatically generate personalized PDF attendance certificates for all `CHECKED_IN` registrations. Each certificate has a unique QR code linking to a public verification URL. For CPD-accredited events, include accrediting body and CPD hours.  
**Why It Matters:** NBA, ICAN, and MDCN all require CPD certificates. Generating them manually is time-consuming and error-prone. Auto-generation makes WebWaka Professional indispensable for professional associations.  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** TASK-03 (PDF infrastructure), TASK-02 (QR code)  
**Prerequisites:** `EventManagement` module fully deployed  
**Impacted Modules:** Event Management API, Event Management UI  
**Files to Change:**
- `src/modules/event-management/api/index.ts` — add certificate generation trigger on `COMPLETED` transition
- `src/modules/event-management/api/index.ts` — add `GET /api/events/verify/:certId` (public, no auth)
- `src/core/db/schema.ts` — add `certificateId`, `certificateUrl`, `certificateGeneratedAt` to `EventRegistration`
- `migrations/0004_certificates.sql`  
**Expected Output:**
- On `PUT /api/events/:id/complete`: for each CHECKED_IN registration, generate certificate PDF, store in R2, store cert URL in `event_registrations.certificateUrl`
- Certificate includes: attendee name, event title, event date, tenant logo, CPD hours (if `cpdHours > 0`), accrediting body, unique cert ID, verification QR code
- `GET /api/events/verify/:certId` — public endpoint, no auth required — returns: `{ valid: true, attendeeName, eventTitle, eventDate, cpdHours }`  
**Acceptance Criteria:**
- Certificates generated for all CHECKED_IN registrations on event completion
- Certificate PDF stored in R2 with presigned download URL
- Verification endpoint works without auth
- Invalid certId returns `{ valid: false }`  
**Tests Required:**
- API: `PUT /:id/complete` triggers certificate generation
- API: `GET /verify/:certId` happy path and invalid ID
- Unit: certificate PDF template renders correctly  
**Governance Docs:** Part 9.1, Part 10.8

---

### TASK-05: Multi-Ticket-Type Pricing

**Title:** Event Ticket Tiers — Early Bird, Regular, VIP, Staff  
**Objective:** Add a `event_ticket_types` table that allows event organizers to define multiple ticket types per event (each with its own name, price, capacity, and sale cutoff). Link `event_registrations` to a specific `ticketTypeId`.  
**Why It Matters:** Tiered pricing is standard for Nigerian professional events. Early Bird pricing drives early registrations. VIP tickets generate premium revenue.  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** None  
**Impacted Modules:** Event Management API, Event Management UI, DB schema  
**Files to Change:**
- `src/core/db/schema.ts` — add `EventTicketType` interface
- `migrations/0005_ticket_types.sql` — new `event_ticket_types` table
- `src/core/db/queries.ts` — add ticket type queries
- `src/modules/event-management/api/index.ts` — CRUD for ticket types; update registration to require `ticketTypeId`
- `src/modules/event-management/ui.tsx` — ticket type selection in registration form  
**Expected Output:**
- `event_ticket_types` table: `id, tenantId, eventId, name, priceKobo, capacityLimit, availableCount, saleStartsAt, saleEndsAt, deletedAt`
- `POST /api/events/:eventId/ticket-types` — create ticket type (EVENT_MANAGER+)
- `GET /api/events/:eventId/ticket-types` — list ticket types for event
- `PUT /api/events/:eventId/ticket-types/:typeId` — update ticket type
- `event_registrations.ticketTypeId` — FK to `event_ticket_types.id`
- Registration creation: must specify `ticketTypeId`; validates capacity and sale window  
**Acceptance Criteria:**
- Ticket types with `capacityLimit` enforce capacity independently from event total capacity
- Registration past `saleEndsAt` returns `409`
- Registration when `availableCount = 0` returns `409` and promotes from waitlist if implemented
- `priceKobo = 0` marks ticket type as FREE  
**Tests Required:**
- CRUD for ticket types
- Capacity enforcement per type
- Sale window enforcement
- Registration with ticket type selection  
**Governance Docs:** Part 9.2 (Monetary Values — kobo integers)

---

### TASK-06: Group / Bulk Registration

**Title:** Bulk Corporate Attendee Registration with Single Payment  
**Objective:** Allow a single API call to register multiple attendees for an event, with one aggregated Paystack payment covering all registrations. Each attendee gets their own `ticketRef` and QR code.  
**Why It Matters:** Corporate organizations send 10–100 employees to training events. Individual registration per employee is operationally impractical.  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** TASK-05 (ticket types), TASK-02 (QR codes)  
**Impacted Modules:** Event Management API, Event Management UI  
**Files to Change:**
- `src/modules/event-management/api/index.ts` — add `POST /api/events/:eventId/registrations/bulk`
- `src/modules/event-management/ui.tsx` — bulk registration form  
**Expected Output:**
- `POST /api/events/:eventId/registrations/bulk` body: `{ ticketTypeId, attendees: [{ fullName, email, phone }] }`
- Validates: total capacity available, total aggregate payment
- Creates one `event_registrations` row per attendee, all in `PENDING` status
- Initiates a single Paystack payment for `ticketPriceKobo * attendeeCount`
- On webhook confirmation: marks all group registrations as `CONFIRMED`
- Group confirmation email: lists all ticket refs  
**Acceptance Criteria:**
- Bulk registration rejects if capacity insufficient for full group
- Single Paystack reference covers all registrations in the group
- Each attendee has a unique `ticketRef`
- Group cancellation: cancels all attendees in the group  
**Tests Required:**
- Bulk registration happy path
- Partial capacity rejection
- Webhook confirming all group members  
**Governance Docs:** Part 9.2 (Paystack integration), Part 9.1 (Offline First)

---

### TASK-07: Bank Transfer / Offline Payment Confirmation

**Title:** Manual Bank Transfer Confirmation for Legal Invoices and Event Registrations  
**Objective:** Allow authorized users to manually confirm payments received via bank transfer (with optional proof-of-payment document upload to R2). Applicable to both legal invoices and event registrations.  
**Why It Matters:** A large percentage of Nigerian payments occur via bank transfer rather than card. Without this, the system cannot handle the majority of actual transactions.  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** None  
**Impacted Modules:** Legal Practice API, Event Management API, Both UIs  
**Files to Change:**
- `src/modules/legal-practice/api/index.ts` — add `PUT /api/legal/invoices/:id/record-offline-payment`
- `src/modules/event-management/api/index.ts` — add `PUT /api/events/registrations/:id/confirm-offline`
- `src/core/db/schema.ts` — add `paymentMethod: 'PAYSTACK' | 'BANK_TRANSFER' | 'CASH'` to invoices and registrations
- `migrations/0006_payment_method.sql`  
**Expected Output:**
- `PUT /api/legal/invoices/:id/record-offline-payment` body: `{ paymentMethod: 'BANK_TRANSFER' | 'CASH', amountKobo, reference, proofUrl? }` — requires `BILLING_MANAGER` or `TENANT_ADMIN` role
- `PUT /api/events/registrations/:id/confirm-offline` body: `{ paymentMethod, amountPaidKobo, proofStorageKey? }` — requires `EVENT_MANAGER+`
- Both endpoints publish the appropriate `*.paid` or `*.confirmed` event to CORE-2
- Both trigger notification via NotificationService  
**Acceptance Criteria:**
- Only authorized roles can record offline payments
- Payment method recorded in DB
- CORE-2 event published on confirmation
- Notification sent to payer  
**Tests Required:**
- Happy path for both endpoints
- RBAC rejection for unauthorized roles
- CORE-2 event publication assertion  
**Governance Docs:** Part 9.2 (RBAC), Part 9.1 (Nigeria First — bank transfers)

---

### TASK-08: Court Hearing Calendar + Cron Reminder System

**Title:** Hearing Calendar View + Automated WAT Timezone SMS/Email Reminders via Cloudflare Cron  
**Objective:** Add a calendar view (week/month) aggregating all upcoming hearings across a tenant's cases. Implement a Cloudflare Workers scheduled handler that runs daily at 06:00 WAT, queries hearings in the next 3 days, and sends SMS reminders via Termii.  
**Why It Matters:** Missing a hearing is a professional catastrophe for a lawyer. This is the single highest-value notification feature for the Legal Practice module.  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** Termii notification infrastructure (already in place)  
**Impacted Modules:** Legal Practice API, Legal Practice UI, Worker entry point  
**Files to Change:**
- `src/worker.ts` — add `scheduled` handler export for cron
- `src/modules/legal-practice/api/index.ts` — add `GET /api/legal/calendar?from=&to=` endpoint
- `src/core/db/queries.ts` — add `getHearingsInDateRange(tenantId, from, to)`
- `src/core/db/schema.ts` — add `reminderSentAt: number | null` to `CaseHearing`
- `migrations/0007_hearing_reminder.sql`
- `src/modules/legal-practice/ui.tsx` — calendar view component
- `wrangler.toml` — add `[triggers] crons = ["0 5 * * *"]` (05:00 UTC = 06:00 WAT)  
**Expected Output:**
- `GET /api/legal/calendar?from=2026-04-01&to=2026-04-30` returns hearings sorted by date
- Scheduled cron at 05:00 UTC: queries all tenants' hearings for next 3 days, sends Termii SMS
- SMS template: "Reminder: Your case [CASE_REF] is scheduled for hearing at [COURT] on [DATE]. — WebWaka"
- UI: calendar view showing hearings by day, clickable to case detail  
**Acceptance Criteria:**
- Calendar endpoint returns hearings filtered by date range
- Cron sends SMS only once per hearing (checks `reminderSentAt`)
- SMS uses WAT-formatted date
- UI calendar view shows upcoming hearings  
**Tests Required:**
- Calendar query unit tests
- Cron handler mock test (fake date, mock Termii)
- Duplicate reminder prevention  
**Risks:** Cron cannot be tested locally — requires `wrangler dev --test-scheduled`  
**Governance Docs:** Part 10.8, Part 9.1 (Nigeria First — WAT timezone, Termii SMS)

---

### TASK-09: Legal Invoice PDF Generation

**Title:** FIRS-Compliant Nigerian Tax Invoice PDF Export  
**Objective:** Generate a properly formatted Nigerian tax invoice PDF using `core/pdf.ts`. Include firm letterhead, VAT registration number, FIRS-compliant layout, client address, itemized time entries, and Paystack payment link.  
**Why It Matters:** Nigerian tax law requires a specific invoice format. Courts require formal invoices for fee recovery. Clients expect professional-looking invoices.  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** TASK-03 (PDF infrastructure)  
**Impacted Modules:** Legal Practice API, Legal Practice UI  
**Files to Change:**
- `src/modules/legal-practice/api/index.ts` — add `GET /api/legal/invoices/:id/pdf`
- `src/core/pdf.ts` — invoice template  
**Expected Output:**
- `GET /api/legal/invoices/:id/pdf` returns `{ downloadUrl, expiresAt }`
- Invoice PDF: firm name, address, VAT reg no, invoice number, date, client name, line items (time entries), subtotal, VAT 7.5%, total, payment instructions, Paystack link  
**Acceptance Criteria:**
- PDF generated for any SENT or PAID invoice
- R2 storage with 24-hour presigned URL
- Template is FIRS-layout compliant (header, body, footer, VAT section)
- All kobo amounts display as Naira  
**Tests Required:**
- PDF endpoint for existing invoice
- Template rendering with correct VAT calculation  
**Governance Docs:** Part 9.2 (Monetary Values), Part 9.1 (Nigeria First — VAT, FIRS)

---

### TASK-10: NBA Practicing Certificate Renewal Tracker

**Title:** Automated NBA Annual Certificate Renewal Reminders + Compliance Dashboard  
**Objective:** Track NBA practicing certificate expiry per attorney. Surface a compliance dashboard for firm admins. Send automated SMS/email reminders at 90, 30, and 7 days before expiry via Cloudflare Cron.  
**Why It Matters:** Practicing without a current certificate is a disciplinary offense in Nigeria. Firms with multiple attorneys lose track of individual compliance.  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** Cron infrastructure from TASK-08  
**Impacted Modules:** Legal Practice API, Legal Practice UI  
**Files to Change:**
- `src/core/db/schema.ts` — confirm `practicingCertificateExpiry` on `NBAProfile`
- `src/worker.ts` — extend scheduled handler
- `src/modules/legal-practice/api/index.ts` — add `GET /api/legal/compliance/nba-status` 
- `src/modules/legal-practice/ui.tsx` — compliance dashboard section  
**Expected Output:**
- Cron: daily check of `nba_profiles.practicingCertificateExpiry` within next 90/30/7 days
- SMS/email: "Your NBA practicing certificate expires on [DATE]. Renew at nba.org.ng — WebWaka Legal"
- API: `GET /api/legal/compliance/nba-status` returns attorneys and their certificate status
- UI: compliance dashboard card on main dashboard  
**Acceptance Criteria:**
- Reminders sent only once per threshold (90/30/7 days)
- `TENANT_ADMIN` sees all attorneys' status
- Individual attorneys see only their own  
**Tests Required:**
- Cron handler for NBA expiry
- API compliance status endpoint  
**Governance Docs:** Part 10.8, Part 9.1 (Nigeria First — NBA compliance)

---

### TASK-11: Conflict-of-Interest Checker

**Title:** Automated Conflict-of-Interest Detection Before Case Creation  
**Objective:** Before a new case is created, allow attorneys to run a conflict check against the firm's client database, case history, and opposing party records. Surface matches with confidence scores.  
**Why It Matters:** Nigerian Rules of Professional Conduct require conflict checks. Failure can result in disqualification and disciplinary proceedings.  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** None  
**Impacted Modules:** Legal Practice API, Legal Practice UI  
**Files to Change:**
- `src/modules/legal-practice/api/index.ts` — add `POST /api/legal/conflict-check`
- `src/modules/legal-practice/ui.tsx` — conflict check step in new case form  
**Expected Output:**
- `POST /api/legal/conflict-check` body: `{ partyName, relatedEntities?: string[] }`
- Searches: `legal_clients.fullName`, `legal_cases.opposingParty`, `legal_cases.title`
- Returns: `{ hasConflict: boolean, matches: [{ type, reference, matchedField, value }] }`
- UI: mandatory conflict check step before case creation form  
**Acceptance Criteria:**
- Partial name matches returned (case-insensitive, contains)
- Results scoped strictly to calling tenant
- Empty results return `{ hasConflict: false, matches: [] }`  
**Tests Required:**
- Conflict found, partial match, no conflict
- Tenant isolation verified  
**Governance Docs:** Part 9.2 (Multi-Tenancy), Part 10.8 (Legal Practice)

---

### TASK-12: Case Expense Tracking + Disbursement Billing

**Title:** Case-Level Expense Recording with Auto-Inclusion in Next Invoice  
**Objective:** Allow attorneys to record out-of-pocket expenses on a case (court filing fees, transport, stamp duty, photocopy costs, etc.). Include unbilled expenses as line items when creating the next invoice.  
**Why It Matters:** Nigerian lawyers routinely advance costs for clients and then fail to invoice them. Disbursements can be substantial (court fees, stamp duty, notarization).  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** None  
**Impacted Modules:** Legal Practice API, Legal Practice UI, DB schema  
**Files to Change:**
- `src/core/db/schema.ts` — add `CaseExpense` interface
- `migrations/0008_case_expenses.sql` — new table
- `src/core/db/queries.ts` — expense queries
- `src/modules/legal-practice/api/index.ts` — expense CRUD endpoints
- `src/modules/legal-practice/ui.tsx` — expense tracking section per case  
**Expected Output:**
- `case_expenses` table: `id, tenantId, caseId, description, amountKobo, expenseDate, receiptStorageKey, billable, billedAt, createdBy, createdAt`
- `POST /api/legal/cases/:caseId/expenses` — record an expense
- `GET /api/legal/cases/:caseId/expenses` — list expenses (filterable by unbilled)
- Invoice creation: "include unbilled expenses" toggle adds them as extra line items  
**Acceptance Criteria:**
- Expense amounts stored in kobo
- Only `ATTORNEY`, `BILLING_MANAGER`, or `TENANT_ADMIN` can create expenses
- `billedAt` set when expense is included in an invoice
- Expense report per case shows total disbursements  
**Tests Required:**
- Expense CRUD
- Invoice creation with expenses
- RBAC enforcement  
**Governance Docs:** Part 9.2 (Monetary Values, RBAC)

---

### TASK-13: WhatsApp Notification Integration

**Title:** WhatsApp Business API Integration for Invoice Delivery and Event Confirmations  
**Objective:** Add `src/core/notifications/whatsapp.ts` implementing a WhatsApp Business API client (via Termii's WhatsApp API or Meta Cloud API). Enable sending invoice payment links and event ticket confirmations via WhatsApp.  
**Why It Matters:** WhatsApp is the dominant business communication channel in Nigeria. Email open rates are <10% in many Nigerian SME contexts. WhatsApp responses are near-instant.  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** Existing Termii infrastructure  
**Impacted Modules:** Core notifications, Legal Practice API, Event Management API  
**Files to Change:**
- `src/core/notifications/whatsapp.ts` — new client
- `src/core/notifications/service.ts` — extend to include WhatsApp channel
- `src/core/env.ts` — add `WHATSAPP_API_KEY?: string`
- `src/modules/legal-practice/api/index.ts` — `POST /api/legal/invoices/:id/whatsapp`
- `src/modules/event-management/api/index.ts` — WhatsApp ticket delivery on registration  
**Expected Output:**
- `WhatsAppClient.sendMessage(phone, message)` using Termii's WhatsApp API
- `POST /api/legal/invoices/:id/whatsapp` sends formatted WhatsApp message with invoice details + Paystack link
- Event registration confirmation sent via WhatsApp if `notificationChannel = 'WHATSAPP'`
- Templates: invoice notification, event confirmation, pre-event reminder  
**Acceptance Criteria:**
- WhatsApp message sent to Nigerian phone number (normalizes to +234...)
- Message includes Paystack payment link for invoices
- Message includes ticket QR code for events
- Graceful degradation: falls back to SMS if WhatsApp fails  
**Tests Required:**
- Mock WhatsApp API — message sent with correct body
- Fallback to SMS on WhatsApp failure
- Phone normalization  
**Governance Docs:** Part 9.1 (Termii, Africa First), GDPR/NDPR opt-in requirement

---

### TASK-14: Event Landing Page Generator

**Title:** Public SEO-Friendly Event Landing Page via Cloudflare Worker SSR  
**Objective:** Generate a public, shareable event landing page at `/{tenantSlug}/events/{eventSlug}` served via Cloudflare Worker HTML SSR. Cache in KV with 1-hour TTL. No login required for GUEST access.  
**Why It Matters:** Event organizers currently share events via WhatsApp images. A linkable, shareable URL with full event details (speakers, agenda, pricing) dramatically improves registration rates.  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** None  
**Impacted Modules:** Event Management API, Worker entry point  
**Files to Change:**
- `src/worker.ts` — add route `/{tenantSlug}/events/{eventSlug}` (public, no auth)
- `src/modules/event-management/api/index.ts` — add `GET /api/events/:eventId/public` (public summary)
- `src/core/db/schema.ts` — add `slug: string` and `tenantSlug: string` to `ManagedEvent`
- `migrations/0009_event_slug.sql`  
**Expected Output:**
- `GET /{tenantSlug}/events/{eventSlug}` returns full HTML page: event title, description, date/time, location, price, organizer, registration CTA
- Page cached in `EVENTS` KV with 1-hour TTL
- Open Graph tags for WhatsApp/Twitter link preview
- Mobile-first responsive layout  
**Acceptance Criteria:**
- Page loads without authentication
- Only `PUBLISHED` or `REGISTRATION_OPEN` events are publicly accessible
- `DRAFT` or `CANCELLED` events return `404`
- KV cache invalidated when event is updated
- Open Graph `og:title`, `og:description`, `og:image` meta tags present  
**Tests Required:**
- Public page for published event
- 404 for draft event
- KV cache hit  
**Governance Docs:** Part 9.1 (Cloudflare-First — KV cache), Part 9.2 (RBAC — GUEST can view)

---

### TASK-15: Waitlist Management

**Title:** Automatic Waitlist for Fully-Booked Events with Auto-Promotion  
**Objective:** When an event reaches full capacity, new registrations automatically join a waitlist. When a confirmed registration is cancelled, the next waitlisted attendee is automatically promoted and notified.  
**Why It Matters:** Popular Nigerian professional events sell out. Waitlists prevent revenue loss from cancellations and reduce organizer manual work.  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** None  
**Impacted Modules:** Event Management API, Event Management UI  
**Files to Change:**
- `src/core/db/schema.ts` — add `WAITLISTED` to `RegistrationStatus`
- `migrations/0010_waitlist.sql` — add `waitlistPosition: integer` to `event_registrations`
- `src/modules/event-management/api/index.ts` — update registration creation and cancellation logic  
**Expected Output:**
- Registration when capacity reached: status `WAITLISTED`, `waitlistPosition` set
- Registration cancellation: trigger `promoteFromWaitlist()` — find lowest-position WAITLISTED, set to `PENDING`, send invitation SMS/email
- `GET /api/events/:id/registrations?status=WAITLISTED` lists waitlist in order  
**Acceptance Criteria:**
- Registration correctly placed on waitlist when event at capacity
- Auto-promotion fires on cancellation
- Promoted attendee notified within 60 seconds  
**Tests Required:**
- Waitlist placement on full event
- Auto-promotion on cancellation
- Waitlist ordering  
**Governance Docs:** Part 9.2 (event status machine)

---

### TASK-16: NDPR Data Subject Request Workflow

**Title:** NDPR-Compliant Data Subject Request Management (Access, Deletion, Correction)  
**Objective:** Create `src/core/compliance/ndpr.ts` implementing NDPR data subject request workflows. Allow clients to submit access/deletion/correction requests. Track resolution within the 30-day statutory deadline. Surface overdue requests to TENANT_ADMIN.  
**Why It Matters:** Nigeria Data Protection Act 2023 requires all data controllers to handle data subject requests within 30 days. Non-compliance carries penalties of up to ₦10 million or 2% of annual turnover.  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** None  
**Impacted Modules:** Core (new), Legal Practice API, Event Management API  
**Files to Change:**
- `src/core/compliance/ndpr.ts` — new shared compliance module
- `src/core/db/schema.ts` — add `DataSubjectRequest` interface
- `migrations/0011_data_subject_requests.sql`
- `src/modules/legal-practice/api/index.ts` — `POST /api/legal/data-requests` (client submits)
- `src/modules/legal-practice/api/index.ts` — `GET /api/legal/data-requests` (admin views)  
**Expected Output:**
- `data_subject_requests` table: `id, tenantId, clientId, requestType (ACCESS|DELETION|CORRECTION), submittedAt, dueAt, resolvedAt, resolutionNotes, status`
- `POST /api/legal/data-requests` — open to authenticated client or public (with email verification)
- `GET /api/legal/data-requests` — TENANT_ADMIN only; shows overdue flagged red
- Cron: daily check for requests `dueAt < now + 10 days` → send alert to TENANT_ADMIN  
**Acceptance Criteria:**
- `dueAt` automatically set to `submittedAt + 30 days`
- Overdue requests flagged in API and UI
- Deletion request: cascades soft-delete of all client data  
**Tests Required:**
- NDPR request creation and resolution
- Deadline calculation (30 days)
- Deletion cascade  
**Governance Docs:** NDPA 2023, Part 9.1 (Nigeria First)

---

### TASK-17: Event Analytics Dashboard Enhancement

**Title:** Detailed Registration Analytics — Revenue, Trends, Geographic Distribution, Check-In Rate  
**Objective:** Extend the existing `getDashboardStats` query and Event Management UI dashboard to include: registration trend over time, revenue collected vs outstanding, check-in rate, no-show rate, revenue by ticket type, and geographic distribution.  
**Why It Matters:** Event organizers need analytics to decide when to open late registrations, add capacity, or change marketing strategy.  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** TASK-05 (ticket types for revenue by type)  
**Impacted Modules:** Event Management API, Event Management UI  
**Files to Change:**
- `src/core/db/queries.ts` — add analytics queries
- `src/modules/event-management/api/index.ts` — add `GET /api/events/:id/analytics`
- `src/modules/event-management/ui.tsx` — analytics section  
**Expected Output:**
- `GET /api/events/:id/analytics` returns:
  ```json
  {
    "registrationsOverTime": [{ "date": "2026-04-01", "count": 12 }],
    "revenueKoboByStatus": { "CONFIRMED": 120000, "PENDING": 30000 },
    "checkInRate": 0.73,
    "noShowRate": 0.27,
    "revenueByTicketType": [{ "name": "VIP", "revenueKobo": 50000 }],
    "topStates": [{ "state": "Lagos", "count": 45 }]
  }
  ```
- CSV export of registrations list  
**Acceptance Criteria:**
- Analytics scoped to calling tenant's event only
- Date range filterable
- Revenue figures in kobo with Naira display  
**Tests Required:**
- Analytics endpoint with mock registrations
- Revenue calculation correctness  
**Governance Docs:** Part 9.2 (Multi-Tenancy)

---

### TASK-18: CPD Accreditation Cross-Module Integration

**Title:** Cross-Module CPD Hours: Event Management → Legal Practice (First Cross-Module Event Subscription)  
**Objective:** When a CPD-accredited event reaches `COMPLETED` status, publish `event_mgmt.event.completed` with `cpdHours` in payload. Legal Practice module subscribes to this event and auto-credits CPD hours to matching attorneys' NBA profiles.  
**Why It Matters:** This is the first cross-module integration within WebWaka Professional. It demonstrates the power of the CORE-2 event bus and removes a major manual pain point for professional associations.  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** CORE-2 event bus (already in place)  
**Impacted Modules:** Event Management (publisher), Legal Practice (subscriber), Core event bus  
**Files to Change:**
- `src/core/db/schema.ts` — add `cpdHours: number | null`, `accreditingBody: string | null` to `ManagedEvent`
- `migrations/0012_cpd_fields.sql`
- `src/modules/event-management/api/index.ts` — include CPD data in completion event payload
- `src/worker.ts` — add queue consumer or local subscription for cross-module events
- `src/core/db/queries.ts` — add `updateNBACpdHours(tenantId, userId, hoursToAdd)`
- `src/modules/legal-practice/api/index.ts` — subscribe to `event_mgmt.event.completed`  
**Expected Output:**
- `ManagedEvent.cpdHours` and `ManagedEvent.accreditingBody` fields
- On event completion: payload includes `{ cpdHours, accreditingBody, attendeeIds }`
- Local event bus handler in Legal Practice: on `event_mgmt.event.completed`, query CHECKED_IN registrations, find matching users in `nba_profiles`, add CPD hours  
**Acceptance Criteria:**
- CPD hours credited only for CHECKED_IN registrations
- No duplicate crediting (idempotent)
- `accreditingBody` stored in NBA profile CPD log  
**Tests Required:**
- Event completion triggers CPD crediting
- Idempotency check (second trigger does not double-credit)  
**Governance Docs:** Part 9.1 (Event-Driven), CORE-2 event bus

---

### TASK-19: Multilingual Notification Templates

**Title:** Yoruba / Igbo / Hausa Notification Templates for Client-Facing SMS and Email  
**Objective:** Extend `src/core/notifications/templates.ts` to generate SMS and email content in the client's preferred language (yo/ig/ha/en). Select language from `legal_clients.preferredLanguage` or `event_registrations` attendee language preference.  
**Why It Matters:** Many Nigerian clients outside Lagos and Abuja are more comfortable in Yoruba, Igbo, or Hausa. Language-appropriate communication builds trust and improves payment rates.  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** Existing i18n infrastructure in `src/modules/legal-practice/i18n.ts`  
**Impacted Modules:** Core notifications  
**Files to Change:**
- `src/core/notifications/templates.ts` — add multilingual versions
- `src/core/notifications/service.ts` — accept `language` parameter  
**Expected Output:**
- All SMS templates available in en/yo/ig/ha
- All email templates available in en/yo/ig/ha
- `createNotificationService()` uses client's `preferredLanguage` when selecting template  
**Acceptance Criteria:**
- Yoruba, Igbo, and Hausa translations present for all 8 notification templates
- `notifyClient(client, templateKey)` auto-selects language
- Fallback to English if no translation exists  
**Tests Required:**
- Template resolution for each language
- Fallback to English  
**Governance Docs:** Part 9.1 (Africa First — 4 languages)

---

### TASK-20: CI/CD Pipeline with GitHub Actions

**Title:** Automated CI/CD: TypeScript Check, Vitest Suite, Build Verification, Deploy to Staging  
**Objective:** Create `.github/workflows/ci.yml` that runs on every push: TypeScript type check, full Vitest suite (323+ tests), production build verification. Create `.github/workflows/deploy-staging.yml` that deploys to staging on merge to `main`.  
**Why It Matters:** Without CI/CD, regressions go undetected. The existing test suite is only valuable if it runs automatically. This is a prerequisite for team-scale development.  
**Repo Scope:** `webwaka-professional`  
**Dependencies:** GitHub repository access, `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets  
**Impacted Modules:** DevOps  
**Files to Change:**
- `.github/workflows/ci.yml` — TypeScript check + Vitest + build
- `.github/workflows/deploy-staging.yml` — Wrangler deploy on main merge  
**Expected Output:**
- CI pipeline: `npm run type-check && npm test && npm run build` on every PR
- Deploy pipeline: `npm run deploy:staging` on `main` merge, protected by `CLOUDFLARE_API_TOKEN` secret
- Badge in `README.md` or `replit.md` showing CI status  
**Acceptance Criteria:**
- CI fails if any TypeScript error
- CI fails if any Vitest test fails
- CI fails if build fails
- Deploy runs only on successful CI  
**Tests Required:**
- CI itself is the test — verify it blocks on intentional failure  
**Governance Docs:** Part 9.1 (CI/CD Native Development)

---

## 7. QA PLANS

---

### QA-TASK-01: Sync Engine Hardening

**What to Verify:**
- Exponential backoff: mutations retry at 2s, 4s, 8s, 16s intervals (mock `Date.now()` and `setTimeout`)
- Dead letter queue: mutation with `retryCount = 5` transitions to `DEAD`, not `FAILED`
- `getDLQCount()` returns accurate count of DEAD mutations
- `EventManagementSyncManager` processes `EventManagementOfflineDB` mutations correctly
- Optimistic UI: after `queueMutation()`, Dexie local store reflects the new state immediately

**Bugs to Look For:**
- Infinite retry loop (retryCount never increments correctly)
- DLQ mutations being picked up again on next `processQueue()` call
- SyncManager processing event mutations against legal DB tables (wrong DB instance)
- UI flicker: optimistic state reverts unexpectedly

**Edge Cases:**
- Queue with 0 mutations — no-op, no network calls
- Network timeout during sync — correctly marks as FAILED with error
- Mix of PENDING and FAILED mutations — all processed together
- Device goes offline mid-sync — graceful handling

**Regression Tests:**
- All 323 existing tests continue to pass
- Legal practice sync tests still work with new SyncManager

**Cross-Module Checks:**
- Legal mutations do not appear in Event Management queue and vice versa

**Deployment Checks:**
- Verify `EventManagementSyncManager` is instantiated with correct `EventManagementOfflineDB`

**Done Definition:**
- All new tests pass
- All 323 existing tests still pass
- Exponential backoff verified with time-mock test

---

### QA-TASK-02: QR Code Ticket Generation + Offline Check-In

**What to Verify:**
- QR code is valid SVG/PNG scannable by standard phone camera apps (Google Lens, iOS Camera)
- `ticketRef` encoded in QR matches the registration's stored `ticketRef`
- Successful scan returns attendee name, event title, and check-in timestamp
- Duplicate scan within 1 minute returns `409` with clear message
- Scan of non-existent `ticketRef` returns `404`
- Offline check-in: mutation queued in IndexedDB, not attempted to server when `isOnline = false`
- After reconnect: queued check-in mutations synced, `checkedInAt` set on server

**Bugs to Look For:**
- QR generation fails silently in Cloudflare Worker V8 environment (no Node.js `Buffer`)
- `checkedInAt` not set in D1 after webhook-like sync
- Offline mutation includes wrong `entityType`

**Edge Cases:**
- Scan for CANCELLED registration — should return `409 Already cancelled`
- Scan for WAITLISTED registration — should return `409 Not confirmed`
- Rapid duplicate scans — race condition check

**Regression Tests:**
- Existing registration CRUD tests unaffected

**Done Definition:**
- QR code scanned by standard phone in manual test
- Offline check-in verified: disconnect network, scan, reconnect, verify D1 updated

---

### QA-TASK-03: PDF Generation Infrastructure

**What to Verify:**
- `generatePDF()` returns non-empty bytes (or valid HTML string for print-based approach)
- PDF stored in R2 with correct tenant-scoped key
- Presigned URL is accessible and expires after 24 hours
- Invoice template: all required fields present (firm name, invoice number, VAT line, total)
- No `console.log` calls in `core/pdf.ts`

**Bugs to Look For:**
- R2 storage failure not handled gracefully — should return 500 not hang
- Presigned URL expiry misconfigured (never expires or wrong time)
- Template variable substitution misses a field (e.g., undefined client name)

**Edge Cases:**
- Invoice with 0 line items
- Invoice with 100+ line items — pagination or overflow
- Client name with special characters (apostrophe, ampersand)
- Amount ₦0 invoice

**Regression Tests:**
- Existing invoice API endpoints unaffected

**Done Definition:**
- PDF downloaded manually, visually verified to contain correct data
- R2 key is tenant-scoped (verified by listing R2 objects)

---

### QA-TASK-04: Attendance Certificate Auto-Generation

**What to Verify:**
- Certificate generation triggered on `PUT /:id/complete`
- Only CHECKED_IN registrations receive certificates (PENDING, WAITLISTED excluded)
- Certificate PDF contains attendee name, event title, CPD hours, cert ID
- Verification URL `GET /api/events/verify/:certId` returns correct data without auth
- Invalid cert ID returns `{ valid: false }`

**Bugs to Look For:**
- Certificate generated for unchecked-in attendee
- CPD hours not included in non-zero CPD events
- Verification endpoint accessible without rate limiting (potential abuse)

**Edge Cases:**
- Event with 0 checked-in registrations — no certificates generated, no error
- Event without CPD hours — certificate omits CPD section
- Multiple completions attempted — idempotent, no duplicate certificates

**Done Definition:**
- Certificate verified visually (PDF download + QR scan)
- Verification URL returns correct data in manual test

---

### QA-TASK-05: Multi-Ticket-Type Pricing

**What to Verify:**
- Ticket type with `capacityLimit = 100` prevents 101st registration
- `saleEndsAt` in the past: registration rejected with `409`
- `priceKobo = 0` creates FREE ticket type, bypasses Paystack
- Deleting a ticket type with existing registrations: soft-delete only, existing registrations unaffected
- Event capacity check: aggregate of all ticket type remaining counts

**Bugs to Look For:**
- `availableCount` not decremented on registration
- `availableCount` not incremented on cancellation
- Race condition: two simultaneous registrations on last available slot

**Edge Cases:**
- Ticket type with no `capacityLimit` (unlimited)
- Ticket type `saleStartsAt` in the future
- Registration for deleted ticket type

**Regression Tests:**
- Existing registration flow (single ticket, no type) still works

**Done Definition:**
- All ticket type CRUD operations verified
- Capacity enforcement verified in load test scenario

---

### QA-TASK-06: Group / Bulk Registration

**What to Verify:**
- Bulk registration with 5 attendees creates 5 `event_registrations` rows
- Single Paystack reference covers all 5
- If capacity = 3, bulk registration for 5 is rejected with `409` (not partially created)
- Webhook confirmation: all 5 registrations set to `CONFIRMED`
- Each attendee has unique `ticketRef`

**Bugs to Look For:**
- Partial creation: some registrations created before capacity check fails
- Same `ticketRef` generated for multiple attendees (UUID collision)
- Webhook confirmation using wrong `registrationId` (should match all in group)

**Edge Cases:**
- Bulk registration with 1 attendee (same as individual)
- 0 attendees in array — validation error
- Attendee list with duplicate email addresses

**Done Definition:**
- 10-attendee bulk registration tested end-to-end with Paystack test keys

---

### QA-TASK-07: Bank Transfer Offline Payment Confirmation

**What to Verify:**
- Only `BILLING_MANAGER` or `TENANT_ADMIN` can record offline payment (legal)
- Only `EVENT_MANAGER` or `TENANT_ADMIN` can confirm offline registration
- `paymentMethod` stored correctly in DB
- CORE-2 event published on confirmation
- Notification sent to payer
- Proof document uploaded to R2 (when provided)

**Bugs to Look For:**
- RBAC not enforced — any authenticated user can confirm payment
- CORE-2 event not published when `EVENT_BUS_URL` not set (graceful degradation)
- Proof URL stored but R2 object not created

**Edge Cases:**
- Confirming already-paid invoice — should return `409`
- Confirming CANCELLED registration — should return `409`

**Done Definition:**
- RBAC tested with unauthorized role (expect 403)
- CORE-2 event verified in event bus logs

---

### QA-TASK-08: Court Hearing Calendar + Cron Reminders

**What to Verify:**
- Calendar endpoint returns hearings sorted by date for date range
- Cron at 05:00 UTC queries upcoming hearings (within 3 days)
- SMS sent only once per hearing (idempotent — `reminderSentAt` checked)
- WAT timezone used in SMS date format
- UI calendar view renders upcoming hearings

**Bugs to Look For:**
- Cron sends duplicate SMS (idempotency failure)
- UTC vs WAT confusion: hearing at 09:00 WAT displayed as 08:00
- Calendar endpoint returns hearings from other tenants

**Edge Cases:**
- 0 upcoming hearings — cron runs, no SMS sent, no error
- Hearing on exact boundary of 3-day window
- Multiple hearings on same day for same case

**Deployment Checks:**
- `wrangler.toml` has `[triggers] crons` configured
- Test with `wrangler dev --test-scheduled`

**Done Definition:**
- Calendar endpoint manually tested with date range
- Cron tested with `--test-scheduled` flag

---

### QA-TASK-09: Legal Invoice PDF Generation

**What to Verify:**
- PDF endpoint returns `downloadUrl` for any SENT or PAID invoice
- PDF accessed via download URL renders correctly (not blank, not garbled)
- All required FIRS fields present: firm name, invoice number, VAT line, total, payment instructions
- `koboToNaira` conversion correct in PDF
- Presigned URL expires after 24 hours

**Bugs to Look For:**
- PDF URL accessible without auth (if not presigned)
- VAT calculation incorrect in template
- Template rendering fails for null optional fields (e.g., null email)

**Edge Cases:**
- Invoice with 0 time entries (summary invoice)
- Invoice for corporate client (CAC number in template)
- Naira amounts over ₦1,000,000 (comma formatting)

**Done Definition:**
- PDF downloaded and visually verified in manual test

---

### QA-TASK-10: NBA Certificate Renewal Tracker

**What to Verify:**
- Compliance API returns correct status for all attorneys in tenant
- Cron sends reminders at exactly 90, 30, and 7 days before expiry
- No duplicate reminders (idempotency check using `reminderSentAt` or similar flag)
- `TENANT_ADMIN` sees all attorneys; `ATTORNEY` sees only self

**Bugs to Look For:**
- Date arithmetic off-by-one (90 days from today vs 90 days remaining)
- Reminder sent for expired certificate (should say "expired," not "expiring")

**Edge Cases:**
- Attorney with no NBA profile
- Certificate already expired — immediate notification, not reminder

**Done Definition:**
- Compliance dashboard renders with correct status in manual test
- Cron tested in dev environment

---

### QA-TASK-11: Conflict-of-Interest Checker

**What to Verify:**
- Partial match returns results (e.g., "Adebayo" matches "Adebayo Okonkwo")
- Case-insensitive matching
- Results strictly scoped to tenant's own data
- Empty search returns empty results (not error)
- UI shows conflict warning before proceeding to case creation

**Bugs to Look For:**
- Full-text search returning cross-tenant results (critical security bug)
- SQL injection via `partyName` input (D1 prepared statements should prevent, but verify)

**Edge Cases:**
- Search with special characters (apostrophe in "O'Brien")
- Very short search string (1 character) — should require minimum 3 chars
- Search with leading/trailing whitespace

**Done Definition:**
- Cross-tenant isolation verified with two-tenant test scenario

---

### QA-TASK-12: Case Expense Tracking

**What to Verify:**
- Expenses stored in kobo
- `billable = false` expenses excluded from invoice generation
- `billedAt` set when expense included in invoice
- R2 upload for receipts works
- RBAC: only allowed roles can create expenses

**Bugs to Look For:**
- Expense added to wrong case (cross-case contamination)
- Double-billing: expense included in two invoices
- Receipt URL stored but R2 object missing

**Regression Tests:**
- Invoice creation without expenses still works

**Done Definition:**
- Expense included in invoice verified end-to-end

---

### QA-TASK-13: WhatsApp Notification Integration

**What to Verify:**
- WhatsApp message sent to normalized Nigerian phone number (+234...)
- Invoice notification includes: amount, invoice number, Paystack link
- Event confirmation includes: ticket ref, QR code, event details
- Fallback to SMS when WhatsApp fails
- Rate limiting: not more than 1 WhatsApp per registrant per event

**Bugs to Look For:**
- Phone normalization failure (e.g., `080...` not converted to `+234 80...`)
- WhatsApp API error not caught — request hangs indefinitely
- Duplicate messages sent (fire-and-forget retry without deduplication)

**Done Definition:**
- WhatsApp message received on test Nigerian phone number

---

### QA-TASK-14: Event Landing Page Generator

**What to Verify:**
- Page loads without authentication
- `DRAFT` events return 404
- `PUBLISHED` events show full details
- Open Graph tags present in HTML
- KV cache hit on second load
- Mobile-first layout verified on 375px viewport

**Bugs to Look For:**
- HTML injection via event title/description (XSS)
- KV cache serves wrong tenant's event (key collision)
- Page loads but registers with wrong eventId

**Done Definition:**
- Page shareable via WhatsApp with preview image (Open Graph)
- Load tested: KV cache hit confirmed via response time difference

---

### QA-TASK-15: Waitlist Management

**What to Verify:**
- `WAITLISTED` status set on registration at full capacity
- `waitlistPosition` is sequential and unique
- Cancellation promotes lowest-position waitlisted attendee
- Promoted attendee notified via SMS/email
- Promoted registration transitions to `PENDING`, not directly `CONFIRMED`

**Bugs to Look For:**
- Race condition: two cancellations simultaneously promote different waitlisted users
- Waitlist position not updated after promotion (gaps in sequence)

**Done Definition:**
- Waitlist promotion verified with 3-user scenario

---

### QA-TASK-16: NDPR Data Subject Request Workflow

**What to Verify:**
- `dueAt = submittedAt + 30 days` always correct
- TENANT_ADMIN sees all requests with overdue flagged
- Deletion request triggers soft-delete cascade
- Cron sends overdue alert at 10 days before deadline
- Non-admin cannot view other clients' requests

**Bugs to Look For:**
- Deletion cascade not complete (some client data survives)
- Overdue alert sent repeatedly (idempotency failure)
- `dueAt` calculation in wrong timezone

**Done Definition:**
- NDPR request submitted, resolved, and deletion cascade verified

---

### QA-TASK-17: Event Analytics Dashboard

**What to Verify:**
- `registrationsOverTime` correct for date range
- Revenue calculation matches sum of `amountPaidKobo` for CONFIRMED registrations
- `checkInRate` = `CHECKED_IN count / CONFIRMED count`
- Geographic distribution based on registrant's `state` field
- CSV export downloadable and parseable

**Bugs to Look For:**
- Revenue includes PENDING (unpaid) registrations
- Analytics scoped to wrong tenant's events

**Done Definition:**
- Analytics verified against known test data in DB

---

### QA-TASK-18: CPD Accreditation Cross-Module Integration

**What to Verify:**
- On `COMPLETED` transition with `cpdHours > 0`, CHECKED_IN registrations' users credited
- Idempotent: second completion does not double-credit
- NBA profile `cpdHoursYTD` incremented correctly
- Only users with NBA profiles are credited (no error for non-legal users)

**Bugs to Look For:**
- Cross-tenant CPD crediting (User A's NBA profile updated by Tenant B's event)
- Event with `cpdHours = null` accidentally treated as `0` hours

**Done Definition:**
- CPD hours visible in NBA profile after event completion

---

### QA-TASK-19: Multilingual Notification Templates

**What to Verify:**
- All 8 templates available in en, yo, ig, ha
- Language selection uses client's `preferredLanguage`
- Fallback to English when template not available in preferred language
- No garbled encoding for Yoruba characters (UTF-8)

**Done Definition:**
- SMS received in Yoruba on test phone

---

### QA-TASK-20: CI/CD Pipeline

**What to Verify:**
- CI fails on intentional TypeScript error
- CI fails on intentional test failure
- CI fails on build error
- Deploy runs only when CI passes
- Staging deployment visible at Workers dashboard URL

**Done Definition:**
- Merged PR with intentional bug triggers CI failure
- Merged PR with fix deploys to staging

---

## 8. IMPLEMENTATION PROMPTS

---

### IMPL-PROMPT-01: Sync Engine Hardening

```
IMPLEMENTATION PROMPT — TASK-01: SYNC ENGINE HARDENING
Repository: WebWakaDOS/webwaka-professional
Date: [Date of execution]

OBJECTIVE:
Harden the universal offline sync engine in `src/core/sync/client.ts`. Implement:
1. Exponential backoff for failed mutations (2s, 4s, 8s, 16s, 32s — then DEAD after 5 retries)
2. Dead letter queue: mutations with retryCount >= 5 transition to status 'DEAD'
3. A getDLQCount() method on SyncManager
4. An EventManagementSyncManager class that uses EventManagementOfflineDB
5. Optimistic UI update pattern: write to Dexie FIRST, then call queueMutation()

REPOSITORY CONTEXT:
This is a multi-repo Cloudflare-first platform. This repo is NOT standalone.
- Core sync: src/core/sync/client.ts
- Legal Practice UI: src/modules/legal-practice/ui.tsx
- Event Management UI: src/modules/event-management/ui.tsx
- Legal offline DB: LegalPracticeOfflineDB
- Event offline DB: EventManagementOfflineDB (exists but has no SyncManager)
- Tests: 323 passing — MUST NOT regress

ECOSYSTEM CAVEAT:
This repo implements only the CLIENT side of CORE-1. Server-side reconciliation lives in webwaka-platform. Do not implement server-side sync here. Only the client mutation queue and retry logic.

IMPORTANT REMINDERS:
- Build Once Use Infinitely: SyncManager base class should be generic enough to work for both modules
- Offline First: sync failures must not block the UI — queue and proceed
- Nigeria First: backoff intervals should account for intermittent 3G connectivity
- No console.log: use createLogger() from src/core/logger.ts
- TypeScript strict: exactOptionalPropertyTypes: true
- No vendor-specific AI imports
- Consult Part 6 (Universal Offline Sync Engine) before acting

REQUIRED DELIVERABLES:
1. Updated src/core/sync/client.ts with exponential backoff, DLQ, EventManagementSyncManager
2. Updated src/modules/legal-practice/ui.tsx with optimistic update pattern
3. Updated src/modules/event-management/ui.tsx with optimistic update pattern
4. New/updated Vitest tests for sync behavior

ACCEPTANCE CRITERIA:
- SyncManager.processQueue() implements exponential backoff
- Mutations with retryCount >= 5 become DEAD
- getDLQCount() returns count of DEAD mutations
- EventManagementSyncManager exists and uses EventManagementOfflineDB
- UI writes to Dexie first, then queues mutation
- All 323 existing tests still pass
- 4+ new tests for sync behavior

DO NOT:
- Implement server-side reconciliation (wrong repo)
- Use console.log
- Add vendor-specific AI imports
- Skip the dead letter queue
- Break existing test coverage
```

---

### IMPL-PROMPT-02: QR Code Ticket Generation + Offline Check-In

```
IMPLEMENTATION PROMPT — TASK-02: QR CODE TICKET GENERATION + OFFLINE CHECK-IN
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Add QR code ticket generation per event registration and an offline-capable QR scan check-in system.

REPOSITORY CONTEXT:
- Event registrations: event_registrations table in D1 (ticketRef: WW-EVT-{YEAR}-{NNNNNN} format)
- EventManagementOfflineDB: src/core/sync/client.ts
- Event API: src/modules/event-management/api/index.ts
- Event UI: src/modules/event-management/ui.tsx
- QR utility to create: src/core/qr.ts

ECOSYSTEM CAVEAT:
This repo is not standalone. The QR utility must work in Cloudflare Workers V8 environment — NO Node.js Buffer, NO file system, NO child_process. Use edge-compatible QR library only (e.g., qrcode package with browser/worker target, or manual SVG construction).

IMPORTANT REMINDERS:
- Offline First: check-in must queue in IndexedDB when offline, sync on reconnect
- Build Once Use Infinitely: qr.ts in core/ — reusable by Legal Practice and future modules
- Multi-Tenant: check-in endpoint must validate tenantId from JWT
- No console.log: use createLogger()
- Verify edge-compatibility of QR library before installing

REQUIRED DELIVERABLES:
1. src/core/qr.ts — generateQRCode(data: string): Promise<string> (returns SVG string)
2. GET /api/events/registrations/:id/ticket endpoint
3. POST /api/events/registrations/scan endpoint
4. checkedInAt field in schema + migration (if not present)
5. Check-in UI in event-management/ui.tsx
6. Offline mutation queuing for check-in action
7. New Vitest tests: QR generation, scan happy path, duplicate scan, invalid ref

ACCEPTANCE CRITERIA:
- QR code is valid SVG/PNG scannable by standard phone camera apps
- Duplicate scan returns 409 with clear message
- Invalid ticketRef returns 404
- CANCELLED/WAITLISTED registration scan returns 409 with reason
- Offline check-in queued in IndexedDB, synced on reconnect

CONSULT BEFORE ACTING:
- replit.md — architecture overview
- src/core/db/schema.ts — existing EventRegistration interface
- src/core/sync/client.ts — mutation queue pattern
- Part 9.1 (Offline First), Part 9.2 (API Responses)

DO NOT:
- Use Node.js-specific APIs in the QR library
- Skip the offline mutation queuing
- Hard-code tenant IDs
```

---

### IMPL-PROMPT-03: PDF Generation Infrastructure

```
IMPLEMENTATION PROMPT — TASK-03: PDF GENERATION INFRASTRUCTURE
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Create src/core/pdf.ts — a shared, edge-compatible PDF generation service usable by all Professional modules.

REPOSITORY CONTEXT:
- R2 binding: DOCUMENTS (already in WorkerEnv)
- Invoices: legal_invoices table (kobo integers, VAT 7.5%)
- Shared utility pattern: see src/core/money.ts, src/core/time.ts

ECOSYSTEM CAVEAT:
PDF generation in Cloudflare Workers has constraints. @cloudflare/puppeteer requires a specific Workers AI binding not guaranteed in this repo. RECOMMENDED APPROACH: Use HTML template rendering with CSS print styles served as a print-formatted HTML response, or integrate with an external PDF API service. Do NOT use puppeteer unless the Cloudflare binding is confirmed in wrangler.toml. Document the approach chosen and why.

IMPORTANT REMINDERS:
- Build Once Use Infinitely: core/pdf.ts must work for legal invoices, event certificates, and all future PDFs
- Nigeria First: amounts in Naira format (₦1,000.00), FIRS-compliant invoice layout
- Cloudflare First: use R2 for storage, not local file system
- No console.log
- Presigned URLs must be time-limited (max 24 hours)

REQUIRED DELIVERABLES:
1. src/core/pdf.ts — generateInvoicePDF(invoice, client, timeEntries, tenantConfig), generateReceiptPDF(registration, event)
2. storePDFToR2(pdf, key, env) returning presigned URL
3. GET /api/legal/invoices/:id/pdf endpoint
4. Invoice HTML template with: firm name, FIRS-format, VAT breakdown, line items, payment instructions
5. Receipt template for event confirmations
6. New Vitest tests for template rendering and R2 storage

ACCEPTANCE CRITERIA:
- generateInvoicePDF() returns non-empty content (PDF bytes or print-ready HTML)
- R2 key is tenant-scoped: {tenantId}/invoices/{invoiceId}.pdf
- Presigned URL valid 24 hours
- Invoice contains correct VAT (7.5%) calculation
- All currency amounts displayed in Naira (₦) not kobo

DO NOT:
- Use file system writes
- Hard-code VAT rate (read from config or use calculateVAT from core/money.ts)
- Use console.log
- Expose R2 objects without presigned URLs
```

---

### IMPL-PROMPT-04: Attendance Certificate Auto-Generation

```
IMPLEMENTATION PROMPT — TASK-04: ATTENDANCE CERTIFICATE AUTO-GENERATION
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Auto-generate personalized PDF attendance certificates for all CHECKED_IN registrations when an event transitions to COMPLETED status. Include a public verification URL with QR code.

PREREQUISITE:
TASK-03 (core/pdf.ts) must be implemented first.

REPOSITORY CONTEXT:
- Event status machine: DRAFT→PUBLISHED→REGISTRATION_OPEN→REGISTRATION_CLOSED→ONGOING→COMPLETED
- Registration statuses: PENDING, CONFIRMED, CANCELLED, CHECKED_IN, WAITLISTED
- Event API: src/modules/event-management/api/index.ts
- Schema: src/core/db/schema.ts

ECOSYSTEM CAVEAT:
Certificate verification endpoint (GET /api/events/verify/:certId) must be PUBLIC (no auth required). This is intentional — organizations verify certificates without logging into WebWaka.

IMPORTANT REMINDERS:
- Build Once Use Infinitely: certificate PDF template reuses core/pdf.ts
- Nigeria First: CPD certificate format follows NBA/ICAN/MDCN conventions
- Multi-Tenant: each certificate has a tenant-scoped cert ID
- No console.log

REQUIRED DELIVERABLES:
1. certificateId, certificateUrl, certificateGeneratedAt fields in EventRegistration schema
2. Migration 0004_certificates.sql
3. Certificate generation logic in event COMPLETED handler
4. GET /api/events/verify/:certId public endpoint
5. Certificate PDF template: attendee name, event title, date, CPD hours (if applicable), accrediting body, cert QR code
6. New Vitest tests

ACCEPTANCE CRITERIA:
- Certificates generated for all CHECKED_IN registrations on COMPLETED transition
- Certificates NOT generated for PENDING/WAITLISTED/CANCELLED registrations
- Verification endpoint works without Authorization header
- Invalid certId returns { valid: false }
- Generation is idempotent (second COMPLETED transition does not regenerate)
```

---

### IMPL-PROMPT-05: Multi-Ticket-Type Pricing

```
IMPLEMENTATION PROMPT — TASK-05: MULTI-TICKET-TYPE PRICING
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Add event_ticket_types table and API. Allow events to have multiple pricing tiers (Early Bird, Regular, VIP, Staff/FREE). Link event_registrations to a specific ticket type.

REPOSITORY CONTEXT:
- Event Management schema: src/core/db/schema.ts (ManagedEvent, EventRegistration)
- Event queries: src/core/db/queries.ts
- Event API: src/modules/event-management/api/index.ts
- All amounts in kobo (integers)

IMPORTANT REMINDERS:
- Nigeria First: kobo integers — priceKobo, never float
- Multi-Tenant: tenantId on event_ticket_types
- Soft deletes: deletedAt on event_ticket_types
- Backwards compatibility: events without ticket types still work (existing registrations)
- RBAC: only EVENT_MANAGER+ can create ticket types

REQUIRED DELIVERABLES:
1. EventTicketType interface in schema.ts
2. Migration 0005_ticket_types.sql
3. Ticket type D1 queries in queries.ts
4. CRUD endpoints for ticket types under /api/events/:eventId/ticket-types
5. Registration creation updated to accept optional ticketTypeId
6. Capacity enforcement per ticket type
7. Sale window enforcement (saleStartsAt / saleEndsAt)
8. New Vitest tests: CRUD, capacity, sale window

ACCEPTANCE CRITERIA:
- priceKobo = 0 creates FREE ticket type (bypasses Paystack)
- Registration past saleEndsAt returns 409
- Registration when availableCount = 0 returns 409
- Existing registrations without ticketTypeId still valid (nullable FK)
```

---

### IMPL-PROMPT-06: Group / Bulk Registration

```
IMPLEMENTATION PROMPT — TASK-06: GROUP / BULK REGISTRATION
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Add POST /api/events/:eventId/registrations/bulk — register multiple attendees in one request with a single aggregated Paystack payment.

PREREQUISITE: TASK-05 (ticket types) recommended but not blocking.

REPOSITORY CONTEXT:
- Registration creation: src/modules/event-management/api/index.ts
- Paystack client: src/core/payments/paystack.ts
- Event capacity: managed_events.capacityLimit

IMPORTANT REMINDERS:
- Atomic: if capacity insufficient for full group, reject the ENTIRE batch — no partial creation
- Nigeria First: Paystack aggregate payment
- Each attendee gets unique ticketRef (WW-EVT-{YEAR}-{NNNNNN})
- Multi-Tenant: all registrations in group share same tenantId from JWT

REQUIRED DELIVERABLES:
1. POST /api/events/:eventId/registrations/bulk endpoint
2. Capacity check for total group size before any inserts
3. Single Paystack initialization for total group amount
4. Webhook handling: confirm all group members on payment verification
5. Group cancellation endpoint (cancels all registrations in a group batch)
6. groupId field linking all registrations in a bulk request
7. New Vitest tests

ACCEPTANCE CRITERIA:
- Bulk registration for 5 creates exactly 5 event_registrations rows
- Insufficient capacity rejects entire batch
- Webhook confirmation marks all 5 as CONFIRMED
- Each has unique ticketRef
```

---

### IMPL-PROMPT-07: Bank Transfer Offline Payment Confirmation

```
IMPLEMENTATION PROMPT — TASK-07: BANK TRANSFER OFFLINE PAYMENT CONFIRMATION
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Add offline payment confirmation endpoints for both Legal invoices and Event registrations. Record bank transfer or cash payments manually with optional proof-of-payment document upload.

REPOSITORY CONTEXT:
- Legal invoice API: src/modules/legal-practice/api/index.ts
- Event registration API: src/modules/event-management/api/index.ts
- Notification service: src/core/notifications/service.ts
- Event bus: src/core/event-bus/index.ts
- RBAC: Legal = BILLING_MANAGER|TENANT_ADMIN; Events = EVENT_MANAGER|TENANT_ADMIN

IMPORTANT REMINDERS:
- Nigeria First: bank transfer is a primary payment channel, not an edge case
- Event-Driven: publish appropriate CORE-2 event on confirmation
- RBAC enforced: not all authenticated users can confirm payment
- Amounts still in kobo

REQUIRED DELIVERABLES:
1. paymentMethod field added to legal_invoices and event_registrations (migration 0006)
2. PUT /api/legal/invoices/:id/record-offline-payment endpoint
3. PUT /api/events/registrations/:id/confirm-offline endpoint
4. CORE-2 event published on confirmation (legal.invoice.paid / event_mgmt.registration.payment_confirmed)
5. NotificationService called on confirmation
6. New Vitest tests for both endpoints with RBAC verification

ACCEPTANCE CRITERIA:
- Unauthorized role gets 403
- Confirming already-paid invoice returns 409
- CORE-2 event published
- Notification triggered
```

---

### IMPL-PROMPT-08: Court Hearing Calendar + Cron Reminders

```
IMPLEMENTATION PROMPT — TASK-08: COURT HEARING CALENDAR + CRON REMINDERS
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Add a hearing calendar API endpoint and a Cloudflare Workers scheduled cron trigger that sends SMS reminders at 06:00 WAT for hearings occurring within the next 3 days.

REPOSITORY CONTEXT:
- Hearings: case_hearings table in D1
- Termii: src/core/notifications/termii.ts
- Worker entry: src/worker.ts (add scheduled handler export)
- WAT timezone: Africa/Lagos (UTC+1) — use src/core/time.ts

IMPORTANT REMINDERS:
- Cloudflare First: Cron triggers configured in wrangler.toml as [triggers] crons = ["0 5 * * *"] (05:00 UTC = 06:00 WAT)
- Nigeria First: WAT timezone for all date display, Termii for SMS
- Idempotent: reminderSentAt flag prevents duplicate SMS
- No console.log

REQUIRED DELIVERABLES:
1. reminderSentAt field in case_hearings (migration 0007)
2. GET /api/legal/calendar?from=ISO&to=ISO endpoint
3. getHearingsInDateRange() D1 query
4. scheduled() handler in src/worker.ts
5. Cron logic: query all tenants' hearings, send Termii SMS, set reminderSentAt
6. [triggers] crons config in wrangler.toml
7. Calendar UI component in ui.tsx
8. New Vitest tests (mock Termii, mock date)

ACCEPTANCE CRITERIA:
- Calendar endpoint returns hearings in date range, sorted ascending
- Cron sends SMS to case's attorney phone (from legal_clients)
- reminderSentAt set after SMS sent
- Second cron run does not resend SMS
- WAT date in SMS message format: "Thursday, 10 April 2026"
```

---

### IMPL-PROMPT-09: Legal Invoice PDF Generation

```
IMPLEMENTATION PROMPT — TASK-09: LEGAL INVOICE PDF GENERATION
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Generate FIRS-compliant Nigerian tax invoice PDFs using core/pdf.ts infrastructure.

PREREQUISITE: TASK-03 (core/pdf.ts) must be completed first.

REPOSITORY CONTEXT:
- Invoices: legal_invoices table, getInvoiceById() query
- Time entries: legal_time_entries (line items)
- VAT: 7.5% via calculateVAT() from src/core/money.ts
- PDF service: src/core/pdf.ts

IMPORTANT REMINDERS:
- Nigeria First: FIRS-compliant layout, ₦ currency symbol, WAT date
- No console.log
- Presigned URL 24-hour expiry
- Amounts in Naira display (koboToNaira) not kobo

REQUIRED DELIVERABLES:
1. GET /api/legal/invoices/:id/pdf endpoint
2. Invoice PDF template (FIRS-format): firm name, address, VAT reg no, invoice number, date, client details, line items, subtotal, VAT, total, payment instructions, Paystack link
3. R2 storage with tenant-scoped key
4. Presigned download URL in response
5. New Vitest tests

ACCEPTANCE CRITERIA:
- PDF generated for SENT and PAID invoices
- DRAFT invoices return 400
- Download URL returns non-empty content
- VAT line shows 7.5% of subtotal
- Total = subtotal + VAT
```

---

### IMPL-PROMPT-10: NBA Certificate Renewal Tracker

```
IMPLEMENTATION PROMPT — TASK-10: NBA PRACTICING CERTIFICATE RENEWAL TRACKER
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Track NBA practicing certificate expiry. Send SMS/email reminders via cron at 90, 30, and 7 days before expiry. Add a compliance dashboard API.

REPOSITORY CONTEXT:
- NBA profiles: nba_profiles table, getNBAProfileByUserId() query
- Cron handler: src/worker.ts scheduled()
- Notifications: src/core/notifications/service.ts
- Termii: src/core/notifications/termii.ts

IMPORTANT REMINDERS:
- Nigeria First: NBA compliance is high-stakes — failing to track this causes professional harm
- Idempotent: track which thresholds have been notified (90/30/7)
- No console.log

REQUIRED DELIVERABLES:
1. practicingCertificateExpiry already in schema — verify or add if missing
2. reminderSentAt_90, reminderSentAt_30, reminderSentAt_7 fields OR a separate reminder_log table
3. GET /api/legal/compliance/nba-status endpoint (TENANT_ADMIN sees all; ATTORNEY sees self)
4. Cron logic extension in scheduled() handler
5. SMS/email templates for each threshold
6. UI compliance dashboard section
7. New Vitest tests

ACCEPTANCE CRITERIA:
- Each threshold reminder sent exactly once
- TENANT_ADMIN sees all attorneys with status (CURRENT / EXPIRING_SOON / EXPIRED)
- ATTORNEY sees only their own status
```

---

### IMPL-PROMPT-11: Conflict-of-Interest Checker

```
IMPLEMENTATION PROMPT — TASK-11: CONFLICT-OF-INTEREST CHECKER
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Add POST /api/legal/conflict-check that searches the tenant's client, case, and opposing party data for potential conflicts of interest. Surface results in the new case creation flow.

REPOSITORY CONTEXT:
- legal_clients: fullName field
- legal_cases: opposingParty, title fields
- All queries must include tenantId WHERE clause (tenant isolation)

IMPORTANT REMINDERS:
- Multi-Tenant: CRITICAL — search must NEVER cross tenant boundaries
- Nigeria First: Nigerian case law context — Nigerian Ethics Rules (RPC 2007) require conflict checks
- D1 does not support full-text search by default — use LIKE '%{term}%' with parameterized queries
- Minimum search term: 3 characters (UI validation + API validation)
- No console.log

REQUIRED DELIVERABLES:
1. POST /api/legal/conflict-check endpoint
2. Searches: legal_clients.fullName, legal_cases.opposingParty, legal_cases.title
3. Returns: { hasConflict: boolean, matches: [{ type, reference, value, matchedField }] }
4. UI: mandatory step in new case creation form, with "proceed anyway" override for TENANT_ADMIN
5. New Vitest tests: match found, no match, tenant isolation test

ACCEPTANCE CRITERIA:
- Results only from calling tenant's data
- Partial case-insensitive match returns results
- Short term (<3 chars) returns 400
- Empty result returns { hasConflict: false, matches: [] }

SECURITY NOTE: This is a high-stakes multi-tenant security requirement. The tenant isolation test MUST pass.
```

---

### IMPL-PROMPT-12: Case Expense Tracking

```
IMPLEMENTATION PROMPT — TASK-12: CASE EXPENSE TRACKING + DISBURSEMENT BILLING
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Add case_expenses table and API for tracking out-of-pocket disbursements per case, with auto-inclusion in invoice generation.

REPOSITORY CONTEXT:
- Cases: legal_cases table
- Invoices: legal_invoices, legal_time_entries tables
- R2: DOCUMENTS binding for receipt upload
- RBAC: ATTORNEY, BILLING_MANAGER, TENANT_ADMIN can create expenses

IMPORTANT REMINDERS:
- Nigeria First: disbursements are large in Nigerian legal practice (court fees, stamp duty, filing fees)
- Monetary Values: amountKobo — integer, never float
- Soft deletes: deletedAt on case_expenses
- Build Once Use Infinitely: expense pattern reusable for Accounting module

REQUIRED DELIVERABLES:
1. CaseExpense interface in schema.ts
2. Migration 0008_case_expenses.sql
3. D1 queries for expenses
4. POST /api/legal/cases/:caseId/expenses
5. GET /api/legal/cases/:caseId/expenses?unbilled=true
6. PUT /api/legal/cases/:caseId/expenses/:expenseId
7. Invoice creation updated: optional "include unbilled expenses" toggle
8. New Vitest tests
```

---

### IMPL-PROMPT-13: WhatsApp Notification Integration

```
IMPLEMENTATION PROMPT — TASK-13: WHATSAPP NOTIFICATION INTEGRATION
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Add src/core/notifications/whatsapp.ts using Termii's WhatsApp API. Enable WhatsApp delivery for invoice notifications and event confirmations.

REPOSITORY CONTEXT:
- Termii client: src/core/notifications/termii.ts (existing — reuse phone normalization)
- Notification service: src/core/notifications/service.ts
- Templates: src/core/notifications/templates.ts
- Env: TERMII_API_KEY already available; add WHATSAPP_API_KEY or reuse Termii

ECOSYSTEM CAVEAT:
WhatsApp Business API can be accessed via Termii's WhatsApp channel (simpler) or Meta Cloud API directly. Default to Termii WhatsApp to reuse existing Termii infrastructure. Never require a vendor-specific SDK.

IMPORTANT REMINDERS:
- Nigeria First: Termii is the established Nigerian-market provider
- Graceful degradation: if WhatsApp fails, fall back to SMS via Termii
- Phone normalization: +234 prefix (same as Termii SMS)
- No console.log

REQUIRED DELIVERABLES:
1. src/core/notifications/whatsapp.ts — WhatsAppClient class
2. Extended NotificationService with WhatsApp channel
3. POST /api/legal/invoices/:id/whatsapp endpoint
4. Event registration: WhatsApp ticket confirmation on CONFIRMED status
5. New Vitest tests with mocked API
```

---

### IMPL-PROMPT-14: Event Landing Page Generator

```
IMPLEMENTATION PROMPT — TASK-14: EVENT LANDING PAGE GENERATOR
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Generate public, SEO-optimized event landing pages served via Cloudflare Worker HTML SSR at /{tenantSlug}/events/{eventSlug}. Cache in KV.

REPOSITORY CONTEXT:
- Worker routing: src/worker.ts
- Events KV: EVENTS KV namespace binding
- Event API: src/modules/event-management/api/index.ts
- Schema: managed_events table (add slug field)

IMPORTANT REMINDERS:
- Cloudflare First: KV cache with 1-hour TTL
- Security: escape all user-generated content (event title, description) — prevent XSS in HTML response
- Multi-Tenant: KV key must include tenantSlug to prevent cross-tenant cache pollution
- GUEST access: no authentication required for PUBLISHED events
- Open Graph: og:title, og:description, og:image for WhatsApp/social preview

REQUIRED DELIVERABLES:
1. slug, tenantSlug fields in managed_events schema
2. Migration 0009_event_slug.sql
3. Route in worker.ts: GET /{tenantSlug}/events/{eventSlug}
4. HTML page template: mobile-first, event details, speaker bios, registration CTA
5. KV caching logic with invalidation on event update
6. Open Graph meta tags in HTML
7. New Vitest tests

ACCEPTANCE CRITERIA:
- DRAFT events return 404 to public
- PUBLISHED/REGISTRATION_OPEN events return full HTML
- KV cache hit served on second request within TTL
- XSS prevented: user content HTML-escaped
```

---

### IMPL-PROMPT-15: Waitlist Management

```
IMPLEMENTATION PROMPT — TASK-15: WAITLIST MANAGEMENT
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Implement waitlist logic: WAITLISTED registration status, auto-promotion on cancellation, SMS/email notification to promoted attendee.

REPOSITORY CONTEXT:
- Registration status machine: src/core/db/schema.ts RegistrationStatus
- Registration API: src/modules/event-management/api/index.ts
- Capacity: managed_events.capacityLimit

IMPORTANT REMINDERS:
- Atomic: capacity check and registration creation must be atomic (use D1 transactions if available, or check-then-insert with conflict detection)
- Nigeria First: SMS via Termii for waitlist promotion notification
- Event-Driven: publish event_mgmt.registration.waitlisted and event_mgmt.registration.promoted

REQUIRED DELIVERABLES:
1. WAITLISTED added to RegistrationStatus (migration 0010)
2. waitlistPosition INTEGER field in event_registrations
3. Registration creation: if at capacity, set WAITLISTED + waitlistPosition
4. Cancellation handler: promoteFromWaitlist() function
5. Promotion notification via Termii SMS
6. New Vitest tests
```

---

### IMPL-PROMPT-16: NDPR Data Subject Request Workflow

```
IMPLEMENTATION PROMPT — TASK-16: NDPR DATA SUBJECT REQUEST WORKFLOW
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Implement NDPR-compliant data subject request handling in src/core/compliance/ndpr.ts. Allow clients to submit access/deletion/correction requests. Track 30-day resolution deadline.

REPOSITORY CONTEXT:
- Legal clients: legal_clients table
- Cron handler: src/worker.ts scheduled()
- Notifications: src/core/notifications/service.ts

IMPORTANT REMINDERS:
- Nigeria First: NDPA 2023 compliance is mandatory for Nigerian data controllers
- Deletion cascade: soft-delete ALL client data (cases, time entries, invoices, documents) on DELETION request resolution
- Deadline: dueAt = submittedAt + 30 days (calculate in UTC)
- Multi-Tenant: data subject requests scoped to tenantId
- Audit: all resolution actions logged

REQUIRED DELIVERABLES:
1. src/core/compliance/ndpr.ts module
2. data_subject_requests table + migration 0011
3. POST /api/legal/data-requests
4. GET /api/legal/data-requests (TENANT_ADMIN) with overdue flagging
5. PUT /api/legal/data-requests/:id/resolve (TENANT_ADMIN)
6. Cron: alert for requests approaching 30-day deadline
7. Deletion resolution: cascade soft-delete of all client data
8. New Vitest tests
```

---

### IMPL-PROMPT-17: Event Analytics Dashboard

```
IMPLEMENTATION PROMPT — TASK-17: EVENT ANALYTICS DASHBOARD ENHANCEMENT
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Extend event dashboard with detailed analytics: registration trend, revenue by status, check-in rate, geographic distribution, CSV export.

REPOSITORY CONTEXT:
- Existing: getDashboardStats() in src/core/db/queries.ts
- Event registrations: event_registrations table with status, amountPaidKobo, createdAt, state

IMPORTANT REMINDERS:
- Multi-Tenant: all analytics queries must include tenantId WHERE clause
- Nigeria First: amounts in kobo integers; display as Naira
- Performance: avoid N+1 queries — use aggregate D1 queries

REQUIRED DELIVERABLES:
1. GET /api/events/:id/analytics endpoint
2. Queries: registrations over time, revenue by status, check-in rate, no-show rate, top states
3. CSV export: GET /api/events/:id/registrations/export?format=csv
4. Analytics section in event-management/ui.tsx
5. New Vitest tests
```

---

### IMPL-PROMPT-18: CPD Accreditation Cross-Module Integration

```
IMPLEMENTATION PROMPT — TASK-18: CPD ACCREDITATION CROSS-MODULE INTEGRATION
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
When a CPD-accredited event completes, auto-credit CPD hours to matching attorneys' NBA profiles. This is the first cross-module event subscription in WebWaka Professional.

REPOSITORY CONTEXT:
- Event bus: src/core/event-bus/index.ts
- Event COMPLETED handler: src/modules/event-management/api/index.ts
- NBA profiles: nba_profiles table
- CORE-2 event type: event_mgmt.event.completed

ECOSYSTEM CAVEAT:
Cross-module communication happens via the platform event bus (CORE-2), not direct DB access. Do not access event_registrations from the Legal Practice module directly. Use the event payload.

IMPORTANT REMINDERS:
- Event-Driven: subscription via publishEvent() / localEventBus
- No direct DB access across modules — only via events
- Idempotent: cpdHoursApplied flag or event deduplication key prevents double-crediting
- Multi-Tenant: use tenantId from event envelope — never from payload

REQUIRED DELIVERABLES:
1. cpdHours, accreditingBody fields in managed_events schema (migration 0012)
2. CPD data included in event_mgmt.event.completed payload
3. Local bus subscription in Legal Practice module handler
4. updateNBACpdHours() D1 query
5. Idempotency: event deduplication key in nba_profiles or credit log
6. New Vitest tests
```

---

### IMPL-PROMPT-19: Multilingual Notification Templates

```
IMPLEMENTATION PROMPT — TASK-19: MULTILINGUAL NOTIFICATION TEMPLATES
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Extend src/core/notifications/templates.ts to include Yoruba, Igbo, and Hausa versions of all 8 notification templates. Update NotificationService to select language from client/attendee preference.

REPOSITORY CONTEXT:
- Templates: src/core/notifications/templates.ts (English only currently)
- i18n reference: src/modules/legal-practice/i18n.ts (translations for reference)
- Notification service: src/core/notifications/service.ts

IMPORTANT REMINDERS:
- Africa First: en/yo/ig/ha — all 4 languages required
- Fallback to English if no translation for preferred language
- Unicode/UTF-8: Yoruba has diacritical characters — verify encoding throughout
- Do not break existing English templates

REQUIRED DELIVERABLES:
1. All 8 templates in 4 languages (32 total template strings)
2. getNotificationTemplate(key, language) function
3. Service updated to use client preferredLanguage
4. New Vitest tests: template resolution per language, fallback

LANGUAGES FOR TRANSLATION (derive from existing i18n.ts translations):
- English (en): already done
- Yoruba (yo): derive from i18n.ts yo translations
- Igbo (ig): derive from i18n.ts ig translations  
- Hausa (ha): derive from i18n.ts ha translations
```

---

### IMPL-PROMPT-20: CI/CD Pipeline

```
IMPLEMENTATION PROMPT — TASK-20: CI/CD PIPELINE WITH GITHUB ACTIONS
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Create GitHub Actions CI/CD pipelines for automated testing and staging deployment.

REPOSITORY CONTEXT:
- Test runner: Vitest (npm test)
- TypeScript check: tsc --noEmit
- Build: npm run build
- Staging deploy: npm run deploy:staging (requires CLOUDFLARE_API_TOKEN secret)
- Node version: 20 (see .replit)

IMPORTANT REMINDERS:
- CI/CD Native Development: this is a core invariant of the WebWaka platform
- Deploy only on successful CI
- Protect Cloudflare API token via GitHub Secrets (never in code)
- Reuse Node.js 20 to match Cloudflare Workers runtime

REQUIRED DELIVERABLES:
1. .github/workflows/ci.yml — triggers on: push to any branch, PR to main
   Steps: checkout, setup node 20, npm ci, npm run type-check, npm test, npm run build
2. .github/workflows/deploy-staging.yml — triggers on: push to main (after CI passes)
   Steps: checkout, setup node 20, npm ci, wrangler deploy --env staging
   Uses: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID GitHub Secrets
3. Document required GitHub Secrets in replit.md

ACCEPTANCE CRITERIA:
- CI fails on TypeScript error (test with intentional error)
- CI fails on test failure
- CI fails on build failure
- Deploy does not run if CI fails
- All secrets via GitHub Secrets — never hardcoded
```

---

## 9. QA PROMPTS

---

### QA-PROMPT-01: Sync Engine Hardening

```
QA PROMPT — TASK-01: SYNC ENGINE HARDENING
Repository: WebWakaDOS/webwaka-professional

OBJECTIVE:
Verify that the sync engine hardening (exponential backoff, dead letter queue, EventManagement SyncManager, optimistic UI) is correctly implemented, fully tested, and does not regress existing functionality.

ECOSYSTEM CAVEAT:
This repo implements only the CLIENT side of CORE-1. Do not test server-side reconciliation — that is a different repo.

WHAT TO VERIFY:
1. EXPONENTIAL BACKOFF:
   - Run `npm test` — look for tests that verify retry intervals
   - Inspect SyncManager.processQueue(): confirm setTimeout or equivalent with 2^retryCount * 1000ms
   - Mock time (fake timers in Vitest) to confirm delay grows exponentially
   
2. DEAD LETTER QUEUE:
   - Verify mutations with retryCount >= 5 transition to status 'DEAD'
   - Confirm DEAD mutations NOT picked up on next processQueue() call
   - Test getDLQCount() returns accurate count

3. EVENTMANAGEMENT SYNCMANAGER:
   - Confirm EventManagementSyncManager class exists in client.ts
   - Confirm it uses EventManagementOfflineDB (not LegalPracticeOfflineDB)
   - Confirm it is instantiated in event-management/ui.tsx

4. OPTIMISTIC UI:
   - Trace ui.tsx mutation handlers: Dexie write BEFORE queueMutation() call
   - Simulate offline: queue mutation, verify local Dexie state reflects change immediately

BUGS TO LOOK FOR:
- Infinite retry: retryCount increment missing or conditional
- Wrong DB instance: EventManagementSyncManager writing to legal tables
- DLQ bypass: DEAD mutations picked up again
- UI flicker: local state reverted before sync completes

EDGE CASES TO TEST:
- Sync with 0 pending mutations (no-op)
- Network error mid-sync (mutations correctly marked FAILED)
- 6th failure (should be DEAD, not 6 retries)

REGRESSION CHECK:
- Run npm test — all 323 existing tests must pass
- If any test fails, identify whether it's a regression or a test that needs updating for new behavior

WHAT "DONE" MEANS FOR QA:
- All 323 existing tests pass
- 4+ new tests for sync behavior pass
- Exponential backoff verified with time-mock test
- No DEAD mutation appears in processQueue() processing
- EventManagementSyncManager verified against EventManagementOfflineDB
```

---

### QA-PROMPT-02: QR Code Ticket + Offline Check-In

```
QA PROMPT — TASK-02: QR CODE TICKET GENERATION + OFFLINE CHECK-IN
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. QR GENERATION:
   - generateQRCode() in core/qr.ts returns non-empty SVG string
   - SVG is valid XML
   - QR encodes the ticketRef exactly (verify by parsing SVG or using a QR decoder tool)
   - Verify it works in Cloudflare Worker V8 environment (no Node.js Buffer used)

2. TICKET ENDPOINT:
   - GET /api/events/registrations/:id/ticket returns { ticketRef, qrCode, attendeeName, eventTitle, eventDate }
   - Only CONFIRMED registrations return ticket (PENDING returns 404 or 400)
   - Invalid ID returns 404

3. SCAN/CHECK-IN ENDPOINT:
   - POST /api/events/registrations/scan with valid ticketRef → 200 + attendee info
   - Duplicate scan → 409 with "Already checked in at [timestamp]"
   - Non-existent ticketRef → 404
   - CANCELLED registration scan → 409 with reason
   - WAITLISTED registration scan → 409 with reason

4. OFFLINE CHECK-IN:
   - Disconnect network (or set isOnline = false in test)
   - Perform check-in: verify mutation queued in EventManagementOfflineDB
   - Reconnect: verify SyncManager processes queue and checkedInAt is set in D1

CROSS-MODULE:
- Verify QR library used is edge-compatible (grep for Node.js APIs: Buffer, fs, crypto, child_process)

DEPLOYMENT CHECK:
- Verify checkedInAt migration applied in D1

DONE DEFINITION:
- QR code decoded successfully on physical phone (manual test required)
- Duplicate scan returns 409 in manual API test
- Offline check-in queued and synced in integration test
```

---

### QA-PROMPT-03: PDF Generation Infrastructure

```
QA PROMPT — TASK-03: PDF GENERATION INFRASTRUCTURE
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. core/pdf.ts EXISTS and exports generateInvoicePDF(), generateReceiptPDF(), storePDFToR2(), generatePresignedDownloadUrl()
2. INVOICE TEMPLATE:
   - Contains firm name, invoice number, date, client name
   - Contains line items (description, hours, rate, amount)
   - Contains subtotal, VAT (7.5%), total
   - Currency displayed as Naira (₦), not kobo
   - Contains payment instructions and Paystack link
3. R2 STORAGE:
   - Key format: {tenantId}/invoices/{invoiceId}.pdf
   - Presigned URL accessible without additional auth
   - URL expires (test by checking response headers or expiry parameter)
4. GET /api/legal/invoices/:id/pdf:
   - Returns 200 + { downloadUrl, expiresAt }
   - DRAFT invoice returns 400
   - Non-existent invoice returns 404
   - Unauthorized tenant returns 403

BUGS TO LOOK FOR:
- Template renders with undefined/null values (missing null checks)
- R2 storage key not tenant-scoped (security issue)
- kobo amounts not converted to Naira in template

DONE DEFINITION:
- PDF downloaded from presigned URL in manual browser test
- Invoice visually verified: all required fields present, amounts correct
```

---

### QA-PROMPT-04: Attendance Certificate Auto-Generation

```
QA PROMPT — TASK-04: ATTENDANCE CERTIFICATE AUTO-GENERATION
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. On PUT /:id/complete → all CHECKED_IN registrations get certificateUrl populated
2. PENDING/WAITLISTED/CANCELLED registrations do NOT get certificates
3. Certificate PDF: attendee name, event title, CPD hours (if > 0), cert ID, QR code for verification
4. GET /api/events/verify/:certId (no auth):
   - Valid cert → { valid: true, attendeeName, eventTitle, eventDate, cpdHours }
   - Invalid cert → { valid: false }
5. IDEMPOTENCY: calling complete twice does not generate duplicate certificates

EDGE CASES:
- Event with 0 CHECKED_IN registrations (no certificates, no error)
- Event with cpdHours = null (certificate generated without CPD section)
- Certificate download URL expires correctly

DONE DEFINITION:
- Certificate PDF downloaded and visually verified in manual test
- Verification URL returns correct data without auth header
```

---

### QA-PROMPT-05: Multi-Ticket-Type Pricing

```
QA PROMPT — TASK-05: MULTI-TICKET-TYPE PRICING
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. Ticket type CRUD: create, list, update, soft-delete
2. CAPACITY: registration with type at capacityLimit + 1 returns 409
3. SALE WINDOW: registration with saleEndsAt in past returns 409
4. FREE TICKET: priceKobo = 0 → registration bypasses Paystack → direct CONFIRMED status
5. BACKWARDS COMPATIBILITY: existing event registrations without ticketTypeId still work
6. SOFT DELETE: deleted ticket type → existing registrations unaffected; new registration with deleted type returns 404

REGRESSION:
- Run npm test — existing registration tests pass

DONE DEFINITION:
- All 4 ticket types verified (Early Bird, Regular, VIP, Staff/FREE)
- Capacity enforcement tested with concurrent registrations
```

---

### QA-PROMPT-06: Group / Bulk Registration

```
QA PROMPT — TASK-06: GROUP / BULK REGISTRATION
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. Bulk 5 attendees: exactly 5 event_registrations created
2. Each has unique ticketRef
3. All share the same Paystack reference (groupPaymentRef)
4. Capacity check: if event has 3 remaining, bulk of 5 rejected entirely (no partial creation)
5. Webhook: on payment.success, all 5 registrations set to CONFIRMED
6. Group cancellation: all registrations in group cancelled

CONCURRENCY TEST:
- Simulate two bulk requests of 5 submitted simultaneously for an event with capacity 8
- Only 1 of the 5 should succeed in full; the other should fail or be waitlisted

DONE DEFINITION:
- End-to-end test with Paystack test keys completed
```

---

### QA-PROMPT-07: Bank Transfer Offline Payment

```
QA PROMPT — TASK-07: BANK TRANSFER OFFLINE PAYMENT CONFIRMATION
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. Legal invoice: PUT /api/legal/invoices/:id/record-offline-payment
   - BILLING_MANAGER role → 200
   - ATTORNEY role → 403
   - READONLY role → 403
   - Already-PAID invoice → 409
2. Event registration: PUT /api/events/registrations/:id/confirm-offline
   - EVENT_MANAGER role → 200
   - ATTENDEE role → 403
3. CORE-2 event published (check event bus log or mock)
4. Notification sent (check Termii mock or Yournotify mock)
5. paymentMethod field set correctly in DB

DONE DEFINITION:
- Both endpoints tested with correct and incorrect roles
- CORE-2 event verified in test assertions
```

---

### QA-PROMPT-08: Court Hearing Calendar + Cron Reminders

```
QA PROMPT — TASK-08: COURT HEARING CALENDAR + CRON REMINDERS
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. GET /api/legal/calendar?from=2026-04-01&to=2026-04-30:
   - Returns hearings in ascending date order
   - Only hearings for calling tenant (tenant isolation check)
   - Date range inclusive of boundary dates
2. CRON LOGIC:
   - Hearings in next 3 days: SMS sent, reminderSentAt set
   - Second cron run: SMS NOT resent (reminderSentAt already set)
   - WAT date in SMS message ("Thursday, 10 April 2026")
3. TERMII MOCK: verify Termii SMS called with correct phone and message
4. wrangler.toml: [triggers] crons = ["0 5 * * *"] present

EDGE CASES:
- Hearing today (boundary check)
- Hearing in exactly 3 days (boundary check)
- Hearing in 4 days (not in window)

DEPLOYMENT CHECK:
- Test with: wrangler dev --test-scheduled

DONE DEFINITION:
- Calendar endpoint tested manually with date filters
- Cron tested with --test-scheduled producing Termii mock call
```

---

### QA-PROMPT-09: Legal Invoice PDF

```
QA PROMPT — TASK-09: LEGAL INVOICE PDF GENERATION
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. GET /api/legal/invoices/:id/pdf → { downloadUrl, expiresAt }
2. Download URL returns non-empty content (PDF or HTML)
3. Content contains: firm name, invoice number, date, client name, line items, VAT, total
4. DRAFT invoice → 400
5. Non-existent → 404
6. Unauthorized tenant → 403
7. Currency: amounts displayed as ₦ (Naira), not kobo integers

DONE DEFINITION:
- PDF visually verified with all required FIRS fields
```

---

### QA-PROMPT-10: NBA Certificate Renewal Tracker

```
QA PROMPT — TASK-10: NBA CERTIFICATE RENEWAL TRACKER
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. GET /api/legal/compliance/nba-status → correct status per attorney
2. Status values: CURRENT (>90 days), EXPIRING_90 (90-31 days), EXPIRING_30 (30-8 days), EXPIRING_7 (<8 days), EXPIRED
3. RBAC: TENANT_ADMIN sees all; ATTORNEY sees only self
4. Cron: for each threshold (90/30/7 days), reminder sent exactly once
5. Already-expired certificate: shows EXPIRED, not EXPIRING_7

DONE DEFINITION:
- Compliance dashboard rendered with test attorneys at different expiry states
```

---

### QA-PROMPT-11: Conflict-of-Interest Checker

```
QA PROMPT — TASK-11: CONFLICT-OF-INTEREST CHECKER
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. POST /api/legal/conflict-check { partyName: "Adebayo" }:
   - Matches partial: "Adebayo Okonkwo" in clients
   - Case-insensitive: "adebayo" matches "Adebayo"
2. No match → { hasConflict: false, matches: [] }
3. Short term < 3 chars → 400
4. TENANT ISOLATION (CRITICAL): setup two tenants with same client name → verify Tenant A's search never returns Tenant B's clients

SECURITY TEST:
- POST /api/legal/conflict-check with partyName: "'; DROP TABLE legal_clients; --"
  → Should return empty matches, not an error (parameterized query protection)

DONE DEFINITION:
- Cross-tenant isolation confirmed in dedicated test case
- SQL injection protection confirmed
```

---

### QA-PROMPT-12: Case Expense Tracking

```
QA PROMPT — TASK-12: CASE EXPENSE TRACKING
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. Expense created with amountKobo, description, caseId
2. GET /api/legal/cases/:caseId/expenses?unbilled=true returns only unbilled expenses
3. Invoice creation with include_expenses=true adds expenses as line items
4. billedAt set when expense included in invoice
5. Expense cannot be included in two invoices (billedAt prevents re-billing)
6. RBAC: READONLY role cannot create expenses (403)
7. R2 receipt upload: receipt stored, URL saved

REGRESSION:
- Invoice creation without expenses still works

DONE DEFINITION:
- End-to-end: expense created → included in invoice → billedAt set → not in next invoice
```

---

### QA-PROMPT-13: WhatsApp Notification Integration

```
QA PROMPT — TASK-13: WHATSAPP NOTIFICATION INTEGRATION
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. POST /api/legal/invoices/:id/whatsapp → WhatsApp message sent
2. Message body contains: invoice number, amount, Paystack link
3. Phone normalization: "08012345678" → "+2348012345678"
4. WhatsApp failure → fallback to SMS via Termii
5. Event registration confirmed → WhatsApp sent if phone available

DONE DEFINITION:
- WhatsApp message received on test Nigerian phone (manual test required)
- Fallback to SMS verified with mocked WhatsApp failure
```

---

### QA-PROMPT-14: Event Landing Page Generator

```
QA PROMPT — TASK-14: EVENT LANDING PAGE GENERATOR
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. GET /{tenantSlug}/events/{eventSlug} for PUBLISHED event → HTML page returned
2. HTML contains event title, description, date, location, ticket price
3. DRAFT event → 404
4. CANCELLED event → 404
5. Open Graph tags: og:title, og:description, og:image present in <head>
6. KV cache: second request faster (or verify via KV hit counter)
7. XSS: event title "<script>alert('xss')</script>" is HTML-escaped

DONE DEFINITION:
- Page shared via WhatsApp shows correct preview card (Open Graph verified)
- XSS payload escaped in manual test
```

---

### QA-PROMPT-15: Waitlist Management

```
QA PROMPT — TASK-15: WAITLIST MANAGEMENT
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. Registration when event at capacity → status WAITLISTED, waitlistPosition set
2. Second registration at capacity → waitlistPosition 2 (sequential)
3. CONFIRMED registration cancelled → waitlistPosition 1 promoted to PENDING
4. Promoted attendee notified (Termii mock called)
5. Promoted registration → PENDING, not directly CONFIRMED

EDGE CASES:
- Cancel the only confirmed registration when 3 are on waitlist → only first promoted
- Cancel waitlisted registration → position gaps handled gracefully

DONE DEFINITION:
- 3-user waitlist scenario tested end-to-end
```

---

### QA-PROMPT-16: NDPR Data Subject Request

```
QA PROMPT — TASK-16: NDPR DATA SUBJECT REQUEST WORKFLOW
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. POST /api/legal/data-requests → dueAt = submittedAt + 30 days
2. GET /api/legal/data-requests (TENANT_ADMIN) → overdue requests flagged
3. PUT /api/legal/data-requests/:id/resolve → resolvedAt set
4. DELETION request resolution → client soft-deleted + all related data
5. Cron: alert sent for requests approaching deadline (10 days before)
6. Cron: alert NOT sent twice (idempotent)

CRITICAL SECURITY TEST:
- Verify ATTORNEY cannot view another client's data request
- Verify READONLY cannot resolve requests

DONE DEFINITION:
- DELETION request resolved → verify all client data soft-deleted
```

---

### QA-PROMPT-17: Event Analytics Dashboard

```
QA PROMPT — TASK-17: EVENT ANALYTICS DASHBOARD
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. GET /api/events/:id/analytics returns all 6 metrics
2. Revenue = sum of amountPaidKobo for CONFIRMED registrations only (not PENDING)
3. checkInRate = CHECKED_IN / CONFIRMED (verify calculation)
4. Tenant isolation: analytics for Tenant A event not visible to Tenant B
5. CSV export: all confirmed registrations in parseable CSV

DONE DEFINITION:
- Analytics verified against known test data (seed 10 registrations, verify aggregates)
```

---

### QA-PROMPT-18: CPD Accreditation Integration

```
QA PROMPT — TASK-18: CPD ACCREDITATION CROSS-MODULE INTEGRATION
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. Event completed with cpdHours = 5 → matching users' nba_profiles.cpdHoursYTD incremented by 5
2. Only CHECKED_IN registrations credited (not CONFIRMED non-attendees)
3. IDEMPOTENCY: complete event twice → nba_profiles NOT double-incremented
4. Event with cpdHours = null → no CPD crediting, no error
5. Registration with no matching NBA profile → no error (graceful skip)

CRITICAL:
- Tenant isolation: Tenant A's event completion does not affect Tenant B's NBA profiles

DONE DEFINITION:
- CPD hours visible in GET /api/legal/nba after event completion
```

---

### QA-PROMPT-19: Multilingual Notification Templates

```
QA PROMPT — TASK-19: MULTILINGUAL NOTIFICATION TEMPLATES
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. All 8 templates have yo/ig/ha translations (32 total strings)
2. getNotificationTemplate('invoice_paid', 'yo') returns Yoruba string
3. getNotificationTemplate('invoice_paid', 'xx') falls back to English
4. Yoruba characters (e.g., ọ, ẹ, ṣ) render correctly in SMS (UTF-8)
5. Templates do not have untranslated English strings in yo/ig/ha versions

DONE DEFINITION:
- Yoruba SMS received on physical phone with correct character rendering
- All 32 template strings present and non-empty in test assertions
```

---

### QA-PROMPT-20: CI/CD Pipeline

```
QA PROMPT — TASK-20: CI/CD PIPELINE
Repository: WebWakaDOS/webwaka-professional

WHAT TO VERIFY:
1. .github/workflows/ci.yml exists and has correct triggers (push, PR)
2. CI steps: checkout, node 20, npm ci, tsc --noEmit, npm test, npm run build
3. .github/workflows/deploy-staging.yml triggers on push to main
4. Deploy requires CI to pass (dependency configured)
5. No secrets hardcoded in workflow files

TESTS TO PERFORM:
1. Introduce intentional TypeScript error → CI should fail on type-check step
2. Introduce intentional test failure → CI should fail on test step
3. Revert intentional error → CI should pass
4. Merge to main → deploy-staging should run

SECURITY CHECK:
- grep .github/workflows/ for any hardcoded API tokens, secrets, or passwords
- Verify CLOUDFLARE_API_TOKEN uses ${{ secrets.CLOUDFLARE_API_TOKEN }} notation

DONE DEFINITION:
- CI failure on intentional error verified
- Staging deployment visible in Cloudflare Workers dashboard after successful CI
```

---

## 10. PRIORITY ORDER

### Tier 1 — Execute Immediately (Blocking Revenue + Safety)

| Priority | Task | Rationale |
|---|---|---|
| 1 | BUG-01: Sync Engine Hardening (TASK-01) | Data loss risk on poor connectivity — blocks Offline First invariant |
| 2 | BUG-02: CORS Wildcard Fix | Security risk in production misconfiguration |
| 3 | BUG-03: KV Namespace ID Duplication | Staging data integrity |
| 4 | BUG-08: EventManagement SyncManager | Event check-in offline is broken without this |
| 5 | TASK-02: QR Code + Offline Check-In | Highest-impact feature for event organizers |
| 6 | TASK-07: Bank Transfer Offline Payment | Majority of Nigerian payments are bank transfer |
| 7 | TASK-08: Court Hearing Calendar + Cron | Highest-impact feature for legal practice |

### Tier 2 — Execute Next (Feature Completeness)

| Priority | Task | Rationale |
|---|---|---|
| 8 | TASK-03: PDF Infrastructure | Required by TASK-04, TASK-09 |
| 9 | TASK-05: Multi-Ticket-Type Pricing | Required by TASK-06 |
| 10 | TASK-06: Group/Bulk Registration | High commercial value |
| 11 | TASK-04: Attendance Certificates | CPD requirement — professional associations |
| 12 | TASK-09: Legal Invoice PDF | FIRS compliance |
| 13 | TASK-11: Conflict-of-Interest Checker | Ethics compliance |
| 14 | TASK-10: NBA Certificate Tracker | Professional compliance |

### Tier 3 — Execute in Phase 2 (Enhancement)

| Priority | Task |
|---|---|
| 15 | TASK-12: Case Expense Tracking |
| 16 | TASK-14: Event Landing Page |
| 17 | TASK-15: Waitlist Management |
| 18 | TASK-13: WhatsApp Integration |
| 19 | TASK-16: NDPR Workflow |
| 20 | TASK-17: Event Analytics |
| 21 | TASK-18: CPD Cross-Module |
| 22 | TASK-19: Multilingual Templates |
| 23 | TASK-20: CI/CD Pipeline |
| 24 | BUG-04: Multilingual Notification Templates |
| 25 | BUG-05: Optimistic UI |
| 26 | BUG-06: Rate Limiting Logic |
| 27 | BUG-07: Trust Account Balance Query (checkpointing) |

---

## 11. DEPENDENCIES MAP

```
TASK-01 (Sync Hardening)
  └─ Required by: TASK-02 (offline check-in)
  └─ Required by: TASK-12 (expense offline sync)

TASK-03 (PDF Infrastructure)
  └─ Required by: TASK-04 (attendance certificates)
  └─ Required by: TASK-09 (legal invoice PDF)

TASK-05 (Multi-Ticket-Type)
  └─ Required by: TASK-06 (group registration)
  └─ Required by: TASK-17 (analytics by ticket type)

TASK-02 (QR Codes)
  └─ Required by: TASK-04 (certificate QR)
  └─ Required by: TASK-06 (group ticket QRs)

TASK-08 (Cron infrastructure)
  └─ Reused by: TASK-10 (NBA certificate cron)
  └─ Reused by: TASK-16 (NDPR deadline cron)

TASK-13 (WhatsApp)
  └─ Required by: ENH-LP-04 (WhatsApp invoice)
  └─ Required by: ENH-EM-15 (WhatsApp broadcast)

TASK-20 (CI/CD)
  └─ Should be done early but is not strictly required by any task
  └─ Provides safety net for all other tasks
```

**Critical Path:**
```
BUG-01/08 → TASK-01 → TASK-02 → TASK-04
                    ↓
              TASK-03 → TASK-09
                    ↓
              TASK-05 → TASK-06
```

---

## 12. PHASE 1 / PHASE 2 SPLIT

### Phase 1: Core Infrastructure + Revenue-Critical Features

**Timeline:** 4–6 weeks  
**Goal:** Make WebWaka Professional commercially viable and safe for production use.

| Task | Type | Effort |
|---|---|---|
| BUG-01: CORS Wildcard Fix | Bug Fix | 0.5 days |
| BUG-03: KV Namespace ID Duplication | Bug Fix | 0.5 days |
| BUG-04: Multilingual Templates | Bug Fix | 2 days |
| TASK-01: Sync Engine Hardening (BUG-01/BUG-08) | Critical Fix + Enhancement | 3 days |
| TASK-02: QR Code + Offline Check-In | Feature | 4 days |
| TASK-03: PDF Infrastructure | Feature | 3 days |
| TASK-04: Attendance Certificate Auto-Gen | Feature | 2 days |
| TASK-05: Multi-Ticket-Type Pricing | Feature | 3 days |
| TASK-06: Group/Bulk Registration | Feature | 2 days |
| TASK-07: Bank Transfer Offline Payment | Feature | 2 days |
| TASK-08: Hearing Calendar + Cron | Feature | 4 days |
| TASK-09: Legal Invoice PDF | Feature | 2 days |
| TASK-10: NBA Certificate Tracker | Feature | 2 days |
| TASK-11: Conflict-of-Interest Checker | Feature | 2 days |
| TASK-20: CI/CD Pipeline | DevOps | 1 day |

**Phase 1 Acceptance Criteria:**
- All 5 existing QA layers still pass (TypeScript, Tests, Build, File Completeness, Core Invariants)
- 50+ new tests added (target: 375+ total)
- Paystack payment flow verified end-to-end with test keys
- QR code scanned on physical phone
- PDF generated and downloaded
- CI/CD pipeline running on every push

---

### Phase 2: Enhancement + New Module Foundations

**Timeline:** 6–10 weeks  
**Goal:** Extend platform value, prepare for Healthcare and Accounting module development.

| Task | Type | Effort |
|---|---|---|
| TASK-12: Case Expense Tracking | Feature | 2 days |
| TASK-13: WhatsApp Integration | Feature | 3 days |
| TASK-14: Event Landing Page Generator | Feature | 3 days |
| TASK-15: Waitlist Management | Feature | 2 days |
| TASK-16: NDPR Data Subject Request | Feature | 3 days |
| TASK-17: Event Analytics Dashboard | Feature | 3 days |
| TASK-18: CPD Cross-Module Integration | Feature | 3 days |
| TASK-19: Multilingual Templates | Feature | 2 days |
| BUG-05: Optimistic UI | Bug Fix | 1 day |
| BUG-06: Rate Limiting Logic | Bug Fix | 2 days |
| BUG-07: Trust Account Balance Checkpoint | Bug Fix | 2 days |
| Healthcare Module — Phase 1 | New Module | 4–6 weeks |
| Accounting Module — Phase 1 | New Module | 4–6 weeks |

**Phase 2 Acceptance Criteria:**
- WhatsApp message received on test Nigerian phone
- CPD hours reflected in NBA profile after event completion
- NDPR deletion cascade verified
- Healthcare module: 120+ tests, 5-layer QA passed
- Accounting module: 120+ tests, 5-layer QA passed

---

## 13. REPO CONTEXT AND ECOSYSTEM NOTES

### 13.1 What This Repo Does NOT Own

| Capability | Owner Repo | How This Repo Integrates |
|---|---|---|
| JWT issuance | `webwaka-platform/auth` | Consumes JWT via Authorization header |
| Tenant provisioning | `webwaka-platform/tenants` | Reads from `TENANT_CONFIG` KV |
| CORE-1 server-side sync reconciliation | `webwaka-platform/sync` | Client only; POST /sync sends mutations |
| CORE-2 event bus (server routing) | `webwaka-platform/events` | POST to `EVENT_BUS_URL` env var |
| OpenRouter AI gateway | `webwaka-platform/ai` | NEVER call AI vendors directly |
| Cross-tenant identity resolution | `webwaka-platform/identity` | Not implemented here |

### 13.2 What Must NOT Be Done in This Repo

1. **Never issue JWTs** — only consume and validate them
2. **Never access another module's D1 database** — use events (CORE-2) and APIs only
3. **Never import AI vendor SDKs** — `openai`, `anthropic`, `@google/generative-ai`, `gemini` are banned
4. **Never put secrets in code** — `wrangler secret put` only
5. **Never use `console.log`** — only `createLogger()` from `src/core/logger.ts`
6. **Never bypass `tenantId` from JWT** — never use request headers for tenantId
7. **Never delete trust_transactions rows** — append-only ledger (NBA Rule 23)

### 13.3 How New Modules Should Be Added

1. Create `src/modules/{module-name}/api/index.ts` (Hono router)
2. Add new entity types to `src/core/sync/client.ts` Mutation interface
3. Add new offline DB class to `src/core/sync/client.ts`
4. Add routes to `src/worker.ts` fetch handler
5. Add module API bindings to `wrangler.toml`
6. Add module event types to `src/core/event-bus/index.ts`
7. Target 100+ Vitest tests before any deployment
8. Run 5-layer QA protocol before marking module complete

### 13.4 Shared Core Capabilities Available

| Capability | Import Path |
|---|---|
| `generateId`, `nowUTC` | `../../core/ids` |
| `koboToNaira`, `formatCurrency`, `calculateVAT` | `../../core/money` |
| `formatWATDate`, `formatWATDateTime` | `../../core/time` |
| `validateNigerianPhone`, `validateEmail` | `../../core/validators` |
| `PaystackClient` | `../../core/payments/paystack` |
| `createNotificationService` | `../../core/notifications/service` |
| `publishEvent`, `createEvent` | `../../core/event-bus` |
| `createLogger` | `../../core/logger` |
| `ok`, `fail` (API responses) | `../../core/api` |
| `professionalAuthMiddleware`, `requireProfessionalRole` | `../../core/auth-middleware` |

---

## 14. GOVERNANCE AND REMINDER BLOCK

### 14.1 Core Platform Invariants (All Tasks Must Enforce)

```
✅ BUILD ONCE USE INFINITELY
   - All new utilities go in src/core/ if they are reusable across modules
   - Never duplicate logic between Legal Practice and Event Management

✅ NIGERIA FIRST / AFRICA FIRST
   - All monetary values stored as INTEGER in kobo
   - Display in Naira (₦) using koboToNaira()
   - Timezone: always WAT (Africa/Lagos, UTC+1) for display; UTC for storage
   - SMS: Termii only — never Twilio or other non-Nigerian providers
   - Email: Yournotify only — never SendGrid or Mailgun
   - Payment: Paystack first — never Stripe

✅ OFFLINE FIRST
   - All write operations must queue in IndexedDB if offline
   - SyncManager (or EventManagementSyncManager) must be used — never custom sync
   - UI must never block on network — optimistic updates always

✅ MOBILE FIRST / PWA FIRST
   - All UI components: max 375px width tested
   - Touch targets: minimum 44×44px
   - PWA manifest and service worker must remain functional

✅ MULTI-TENANT
   - tenantId on EVERY new DB table
   - tenantId from JWT ONLY — never from request headers or body
   - Every D1 query must include WHERE tenantId = ?

✅ EVENT-DRIVEN
   - Every state-changing operation must publish to CORE-2 via publishEvent()
   - No direct DB access between modules — use events and APIs only

✅ CLOUDFLARE FIRST
   - D1 for relational data, R2 for documents, KV for configuration/cache
   - No external databases, no non-Cloudflare infrastructure
   - Cron triggers via Cloudflare Workers scheduled handler

✅ VENDOR-NEUTRAL AI
   - If AI is used: OpenRouter ONLY — never openai, anthropic, gemini SDKs directly
   - AI calls should route through webwaka-platform/ai — not called from module code
```

### 14.2 Code Quality Standards

```
✅ TypeScript strict: true, exactOptionalPropertyTypes: true
✅ Zero console.log — use createLogger() everywhere
✅ Zero hardcoded secrets or tenant IDs
✅ All amounts as integers in kobo
✅ All dates stored as UTC Unix timestamps (ms)
✅ All new API endpoints follow { success: true, data: T } / { success: false, errors: string[] }
✅ Soft deletes via deletedAt on all new entities
✅ RBAC enforced on all non-public endpoints
✅ No cross-repo DB access — events and APIs only
✅ Conventional commits: feat(task-01):, fix(bug-01):, etc.
```

### 14.3 Testing Standards

```
✅ Vitest for all tests — no Jest, no Mocha
✅ 5-layer QA protocol before any module is marked complete:
   Layer 1: tsc --noEmit (zero TypeScript errors)
   Layer 2: npm test (zero Vitest failures)
   Layer 3: npm run build (clean production build)
   Layer 4: File completeness check
   Layer 5: Core invariants check
✅ Minimum 10 new Vitest tests per task
✅ Mock D1, Termii, Yournotify, Paystack in tests — never call live APIs in tests
✅ Test RBAC rejection for all protected endpoints
✅ Test tenant isolation for all multi-tenant queries
```

---

## 15. EXECUTION READINESS NOTES

### 15.1 Before Starting Any Task

1. Read `replit.md` — understand current state, architecture, and constraints
2. Read `WEBWAKA-PRO-RESEARCH-REPORT.md` — understand the full ecosystem context
3. Read `PRO-1-QA-REPORT.md` — understand the 5-layer QA protocol
4. Run `npm test` — confirm all 323 tests pass before touching any code
5. Run `npm run type-check` — confirm zero TypeScript errors
6. Read `src/core/` — understand shared utilities before creating new ones
7. Read the specific task's "Files to Change" section — understand scope before acting

### 15.2 Task Execution Checklist

For every task:
- [ ] Read task brief, QA plan, and implementation prompt fully
- [ ] Check existing code for reusable patterns before writing new code
- [ ] Implement in small, testable increments
- [ ] Write tests BEFORE implementing (TDD where practical)
- [ ] Run `npm test` after EVERY significant change
- [ ] Run `npm run type-check` before submitting
- [ ] Verify all new D1 queries include `WHERE tenantId = ?`
- [ ] Verify no `console.log` added
- [ ] Write migration SQL in `/migrations/` for any schema changes
- [ ] Update `replit.md` phase completion table

### 15.3 Known Environment Notes

- **Dev server:** `npm run dev` — Vite on port 5000 (frontend only; Cloudflare Worker not running locally)
- **API proxy:** `/api/*` → `http://localhost:8787` in `vite.config.ts` — Worker must run separately via `wrangler dev`
- **Worker not testable via browser locally** — use `wrangler dev` for Worker testing
- **D1 locally:** Use `wrangler d1 execute DB --local --file=migrations/xxxx.sql` for local migration
- **Cron testing:** `wrangler dev --test-scheduled` triggers the scheduled handler
- **No live Cloudflare account required for development** — Vitest covers all business logic
- **Replit deployment:** Static site only (`npm run build`); Worker must be deployed separately via `wrangler deploy`

### 15.4 Files Never to Modify Without Platform Review

- `src/core/auth-middleware.ts` — JWT validation and RBAC
- `src/worker.ts` — unified routing (additions OK; no removals)
- `src/core/payments/paystack.ts` — HMAC verification (security-critical)
- `wrangler.toml` — infrastructure configuration
- `.env.example` — add new vars here; never add actual values

### 15.5 Document Output Summary

This taskbook produces:
- **20 enhancement tasks** with full detail (TASK-01 through TASK-20)
- **5 bug fix recommendations** (BUG-01 through BUG-05 in Phase 1; BUG-06 through BUG-09 in Phase 2)
- **20 QA plans** (QA-TASK-01 through QA-TASK-20)
- **20 implementation prompts** (IMPL-PROMPT-01 through IMPL-PROMPT-20)
- **20 QA prompts** (QA-PROMPT-01 through QA-PROMPT-20)
- **Phase 1 / Phase 2 split** with timelines and acceptance criteria
- **Priority order** (Tier 1, Tier 2, Tier 3)
- **Dependencies map** (critical path identified)
- **Governance block** (core invariants + code standards)
- **Execution readiness notes** (environment setup, pre-task checklist)

**Total estimated Phase 1 effort:** 32–37 developer-days  
**Total estimated Phase 2 effort:** 45–60 developer-days (excluding new modules)  
**New modules (Healthcare + Accounting):** 8–12 weeks each  

---

*End of WEBWAKA-PRO-DEEP-RESEARCH-TASKBOOK.md*  
*Repository: WebWakaDOS/webwaka-professional | Version: 1.0 | Date: 2026-04-04*
