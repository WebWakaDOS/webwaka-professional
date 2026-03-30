# WebWaka Professional — Comprehensive Research Report & Implementation Plan

**Date:** 2026-03-30  
**Repository:** WebWakaDOS/webwaka-professional  
**Classification:** Internal Architecture & Product Intelligence Document  
**Prepared by:** Replit Agent — WebWaka Professional  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Professional Codebase Architecture Report](#2-professional-codebase-architecture-report)
3. [Professional Module Discovery Map](#3-professional-module-discovery-map)
4. [Nigeria Professional Domain Research Summary](#4-nigeria-professional-domain-research-summary)
5. [Top 20 Enhancements — Legal Practice Management](#5-top-20-enhancements--legal-practice-management)
6. [Top 20 Enhancements — Event Management](#6-top-20-enhancements--event-management)
7. [Top 20 Enhancements — Healthcare Practice Management (Planned)](#7-top-20-enhancements--healthcare-practice-management-planned)
8. [Top 20 Enhancements — Accounting Practice Management (Planned)](#8-top-20-enhancements--accounting-practice-management-planned)
9. [Top 20 Enhancements — HR & Recruitment Agency Management (Planned)](#9-top-20-enhancements--hr--recruitment-agency-management-planned)
10. [Cross-Repo Integration Map](#10-cross-repo-integration-map)
11. [Recommended Execution Order](#11-recommended-execution-order)

---

## 1. Executive Summary

WebWaka Professional is the **professional services vertical** of the broader WebWaka platform — a multi-repo, multi-tenant, Cloudflare-first ecosystem targeting the Nigerian and African markets. This repository is not a standalone product; it is one of at least four or five major WebWaka repositories (commerce, civic, logistics/transport, professional, and a platform core), wired together via a shared event bus (CORE-2), a shared sync protocol (CORE-1), and multi-tenant platform conventions.

**Current state of this repo:**

| Module | Status | Tests |
|---|---|---|
| Legal Practice Management | **FULLY IMPLEMENTED** | 91 / 91 pass |
| Event Management | **FULLY IMPLEMENTED** | 156 / 156 pass |
| Platform Core (logger, event bus, sync, schema) | **FULLY IMPLEMENTED** | Embedded in suites above |
| Healthcare Practice Management | PLANNED / IMPLIED | 0 |
| Accounting Practice Management | PLANNED / IMPLIED | 0 |
| HR & Recruitment Agency Management | PLANNED / IMPLIED | 0 |

**Key metrics:**
- **247 unit tests passing, 0 failures** across both implemented modules
- **0 TypeScript errors** (`tsc --noEmit` clean)
- **8 platform invariants enforced**: Nigeria First, Africa First, Offline First, Mobile First, Multi-Tenant, Event-Driven, Cloudflare-First, Vendor-Neutral AI
- **8 African currencies** supported natively
- **4 Nigerian languages** (en / yo / ig / ha) with 836-line i18n translation set
- **12 event types on the platform event bus** for Event Management alone; 11 for Legal Practice

This report provides: a full architecture assessment, module discovery, Nigerian domain research, 20 enhancements per major module, a cross-repo integration map, and a sequenced execution roadmap.

---

## 2. Professional Codebase Architecture Report

### 2.1 Repository Layout

```
webwaka-professional/
├── src/
│   ├── core/
│   │   ├── db/
│   │   │   ├── schema.ts          # All type definitions + D1 migration SQL (662 lines)
│   │   │   └── queries.ts         # Shared DB query helpers for legal practice (554 lines)
│   │   ├── event-bus/
│   │   │   └── index.ts           # Platform event bus (local + remote CORE-2) (187 lines)
│   │   ├── sync/
│   │   │   └── client.ts          # Universal offline sync engine (Dexie/IndexedDB) (185 lines)
│   │   └── logger.ts              # Platform structured logger (84 lines)
│   ├── modules/
│   │   ├── legal-practice/
│   │   │   ├── api/index.ts       # Hono API router, 23 endpoints (966 lines)
│   │   │   ├── db/                # (queries merged into core/db/queries.ts)
│   │   │   ├── utils.ts           # Pure utility functions (266 lines)
│   │   │   ├── i18n.ts            # en/yo/ig/ha translations (836 lines)
│   │   │   ├── ui.tsx             # Mobile-first React PWA UI (1183 lines)
│   │   │   ├── apiClient.ts       # TypeScript fetch client (38 lines)
│   │   │   └── legal-practice.test.ts  # Vitest suite (741 lines, 91 tests)
│   │   └── event-management/
│   │       ├── api/index.ts       # Hono API router, 20+ endpoints (1053 lines)
│   │       ├── db/queries.ts      # D1 queries for events and registrations
│   │       ├── utils.ts           # Pure utilities, status machine, WAT (225 lines)
│   │       ├── ui.tsx             # React dashboard, list, register, check-in
│   │       ├── apiClient.ts       # TypeScript fetch client
│   │       └── event-management.test.ts  # Vitest suite (156 tests)
│   └── main.tsx                   # PWA entry point (38 lines)
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service worker (offline + background sync)
│   └── offline.html               # Offline fallback page
├── wrangler.toml                  # Cloudflare Workers config (staging + production)
├── .env.example                   # Environment variable documentation
├── PRO-1-QA-REPORT.md             # Legal Practice QA report (all 5 layers pass)
├── CHANGELOG.md                   # Security patch history
└── package.json / tsconfig.json / vitest.config.ts
```

### 2.2 Technology Stack

| Layer | Technology | Version/Config |
|---|---|---|
| Runtime | Cloudflare Workers (V8 isolates) | `compatibility_date = "2024-03-14"` |
| API Framework | Hono | Edge-native, lightweight |
| Database | Cloudflare D1 (SQLite at edge) | D1PreparedStatement pattern |
| Object Storage | Cloudflare R2 | `DOCUMENTS` binding |
| KV Store | Cloudflare KV | `TENANT_CONFIG`, `EVENTS`, `RATE_LIMIT_KV` |
| Frontend | React + Vite | Mobile-first, inline styles |
| Offline DB | Dexie (IndexedDB wrapper) | `LegalPracticeOfflineDB` class |
| Test Runner | Vitest | 247 tests, all passing |
| Language | TypeScript | `strict: true`, `exactOptionalPropertyTypes: true` |
| Auth | HS256 JWT (Web Crypto API) | Signed tokens, tenantId from JWT only |
| Events | CORE-2 Event Bus | `publishEvent()` / `localEventBus` |
| Logging | Platform logger | `createLogger()`, structured JSON |
| Payments (planned) | Paystack + Flutterwave | Nigeria-first |
| SMS (planned) | Termii | Nigerian SMS provider |
| Email (planned) | Yournotify | Nigerian email provider |

### 2.3 Core Platform Invariants

All 8 platform invariants are fully enforced in both implemented modules:

| Invariant | Implementation Evidence |
|---|---|
| **Nigeria First** | NGN default, kobo integers, WAT timezone, NBA bar validation, NDPR consent, Paystack in `.env.example` |
| **Africa First** | 8 currencies (NGN GHS KES ZAR UGX TZS ETB XOF), en/yo/ig/ha i18n |
| **Offline First** | Dexie IndexedDB, mutation queue, service worker background sync |
| **Mobile First** | PWA manifest, standalone display, sticky header, responsive layouts |
| **Multi-Tenant** | `tenantId` on ALL DB rows; sourced exclusively from JWT (not headers) |
| **Event-Driven** | 23 event types across both modules; `publishEvent()` on every state-changing operation |
| **Cloudflare First** | D1, R2, KV, Workers, Hono — zero non-Cloudflare dependencies at edge |
| **Vendor-Neutral AI** | Zero AI vendor imports confirmed (`openai`, `anthropic`, `gemini` — none present) |

### 2.4 Shared Platform Infrastructure

#### CORE-1: Universal Offline Sync Engine (`src/core/sync/client.ts`)

The `SyncManager` and `LegalPracticeOfflineDB` classes implement the standard WebWaka offline pattern:

- **Architecture:** `IndexedDB (Dexie) → Mutation Queue → POST /sync → Server reconciliation → D1`
- **Mutation queue** stores: `tenantId`, `entityType`, `entityId`, `action`, `payload`, `version`, `status`, `retryCount`
- **Status lifecycle:** `PENDING → SYNCING → RESOLVED` or `FAILED` (with retry)
- **Online/offline detection** via `navigator.onLine` and `window` events
- **Current gap:** `entityType` union only covers 7 legal entities — Event Management entities are not yet in the sync engine

#### CORE-2: Platform Event Bus (`src/core/event-bus/index.ts`)

- **Dual-mode:** local in-process bus (testing/offline) + remote CORE-2 HTTP publisher
- **Event envelope:** `{ id, tenantId, type, sourceModule, timestamp, payload }`
- **23 event types** across two source modules: `legal_practice` and `event_management`
- **Auth:** `Authorization: Bearer ${EVENT_BUS_API_KEY}` header + `X-Tenant-ID` on remote publishes
- **Graceful degradation:** logs warning if `EVENT_BUS_URL` not configured; continues with local bus

#### Platform Logger (`src/core/logger.ts`)

- **Structured JSON** output — all logs captured by Cloudflare Workers Dashboard
- **Zero `console.log`** anywhere in application code; only inside `logger.ts`
- **API:** `createLogger(module, tenantId?)` → `PlatformLogger` instance
- **Levels:** DEBUG, INFO, WARN, ERROR

#### Database Schema (`src/core/db/schema.ts`)

- **8 tables** across two modules: 6 for Legal Practice, 2 for Event Management
- **Migration SQL** (`MIGRATION_SQL` export): ready to apply with `wrangler d1 migrations apply`
- **All tables:** `tenantId NOT NULL`, `deletedAt INTEGER` (soft delete), monetary values as `INTEGER` (kobo)
- **Indexes:** per-tenant queries, status filters, date-range queries all have dedicated indexes

### 2.5 RBAC Model

Both modules implement a consistent RBAC model passed via **HTTP headers from the platform shell**:

| Module | Roles | Scope |
|---|---|---|
| Legal Practice | `TENANT_ADMIN`, `ATTORNEY`, `PARALEGAL`, `BILLING_MANAGER`, `READONLY` | Client, case, time, invoice, document management |
| Event Management | `TENANT_ADMIN`, `EVENT_MANAGER`, `ATTENDEE`, `GUEST` | Event lifecycle, registration, check-in |

RBAC headers: `X-User-Role`, `X-User-ID`, `X-Tenant-ID` (validated from JWT payload, not request headers).

### 2.6 API Surface

| Module | Method Count | Base Path | Auth Model |
|---|---|---|---|
| Legal Practice | 23 endpoints | `/api/v1/legal/` | JWT Bearer, RBAC |
| Event Management | ~20 endpoints | `/api/v1/events/` | JWT Bearer, RBAC |

Both modules expose a `/health` endpoint and a `/sync` endpoint (GET + POST) for CORE-1.

### 2.7 wrangler.toml Gap (Known)

The `wrangler.toml` currently points `main` to `src/modules/legal-practice/api/index.ts`. For the Event Management API to be reachable in staging/production, either:
1. A unified worker entry (`src/worker.ts`) must route to both API routers, or
2. A second `wrangler.toml` / separate worker must be created for Event Management.

This is the most critical infrastructure gap to resolve before next deployment.

### 2.8 Shared Abstractions & Reuse Opportunities

| Abstraction | Current Location | Reuse Opportunity |
|---|---|---|
| `D1Database` / `D1PreparedStatement` types | `core/db/queries.ts` | Move to `core/db/d1.ts`; avoid redefinition in `event-management/db/queries.ts` |
| Monetary utilities (`koboToNaira`, `nairaToKobo`, `formatCurrency`) | Duplicated in `legal-practice/utils.ts` AND `event-management/utils.ts` | Extract to `core/money.ts` |
| `generateId`, `nowUTC` | Duplicated in both utils | Extract to `core/ids.ts` |
| `SUPPORTED_CURRENCIES` | Duplicated in both utils | Move to `core/currencies.ts` |
| `validateNigerianPhone`, `validateEmail` | Duplicated in both modules | Move to `core/validators.ts` |
| `formatWATDate`, `formatWATDateTime` | Duplicated in both modules | Move to `core/time.ts` |
| `Env` interface | Defined separately in each module API | Shared `core/env.ts` |
| API response format `{ success, data, errors }` | Repeated in both APIs | Shared `core/api.ts` helper |

### 2.9 Dependencies on Other Repos / Shared Services

| Dependency | Expected Location | Status in This Repo |
|---|---|---|
| CORE-2 Event Bus API | `webwaka-core` or `webwaka-platform` | Configured via `EVENT_BUS_URL` env var |
| CORE-1 Sync Coordination (server-side conflict resolution) | `webwaka-platform` | Client only; server reconciliation in another repo |
| Identity / Auth Token Issuance | `webwaka-platform` / `webwaka-auth` | JWT consumed, not issued here |
| Paystack / Flutterwave payment callbacks | `webwaka-commerce` or `webwaka-fintech` | Stubs only in this repo |
| Notification dispatch (Termii SMS, Yournotify email) | `webwaka-platform/notifications` | Stubbed; env vars present |
| Tenant provisioning | `webwaka-platform` | KV-based `TENANT_CONFIG`; not provisioned here |
| AI integration (OpenRouter) | `webwaka-platform/ai` | Not implemented; env var not present |

---

## 3. Professional Module Discovery Map

### 3.1 Summary Table

| Module | Discovered From | Status | Notes |
|---|---|---|---|
| **Legal Practice Management** | `src/modules/legal-practice/` | ✅ FULLY IMPLEMENTED | 91 tests, 23 API endpoints, full PWA UI |
| **Event Management** | `src/modules/event-management/` | ✅ FULLY IMPLEMENTED | 156 tests, 20+ endpoints, React UI |
| **Platform Core** | `src/core/` | ✅ IMPLEMENTED | Event bus, sync engine, logger, schema |
| **Healthcare / Medical Practice** | Blueprint Part 10.x implied; Nigerian market necessity | 🟡 PLANNED | MDCN registration akin to NBA profile pattern |
| **Accounting Practice Management** | Blueprint Part 10.x implied; ICAN/ANAN compliance | 🟡 PLANNED | Strong overlap with billing patterns |
| **HR & Recruitment Agency** | Platform breadth + Nigerian professional ecosystem | 🟡 PLANNED | Candidate lifecycle, placements, fees |
| **Engineering Practice Management** | COREN, NSE compliance | 🔵 IMPLIED | Blueprint Part 10.x; strong SME demand |
| **Consulting Practice Management** | Cross-cutting; shared with legal billing patterns | 🔵 IMPLIED | Retainer + time billing already built |
| **Document Management Platform** | `legal_documents` R2 integration; e-signature stub | 🟠 PARTIAL | Module-level; needs platform extraction |
| **Paystack/Payment Integration** | `.env.example`, `paymentReference` fields on invoices | 🟠 PARTIAL | Stubs present; callbacks not wired |
| **Notification Service** | Termii/Yournotify in `.env.example` | 🟠 PARTIAL | Env vars present; no implementation |

### 3.2 Implemented Modules (Deep)

#### Legal Practice Management System
- **Blueprint Reference:** Part 10.8
- **State:** Fully implemented, QA-cleared, all 5 QA layers passed
- **Tables:** `legal_clients`, `legal_cases`, `case_hearings`, `legal_time_entries`, `legal_invoices`, `legal_documents`, `nba_profiles` (7 tables)
- **API:** 23 endpoints covering client CRUD, case CRUD, time entry, invoicing, documents, NBA profile, sync
- **Nigeria-specific:** NBA bar number validation (format `NBA/BRANCH/YEAR/SEQ`), NDPR consent, 7.5% VAT, WAT timezone, Nigerian court hierarchy
- **Offline:** Full Dexie sync with mutation queue
- **Events:** 11 types published to CORE-2

#### Event Management Module
- **Blueprint Reference:** Part 9.2, Part 2
- **State:** Fully implemented, 156 tests passing
- **Tables:** `managed_events`, `event_registrations` (2 tables)
- **API:** ~20 endpoints covering event CRUD, status lifecycle, banner upload, registrations, check-in, dashboard stats
- **Status machine:** `DRAFT → PUBLISHED → REGISTRATION_OPEN → REGISTRATION_CLOSED → ONGOING → COMPLETED`; `CANCELLED` from any non-terminal (admin only)
- **Ticket refs:** `WW-EVT-{YEAR}-{NNNNNN}`
- **Events:** 12 types published to CORE-2

### 3.3 Partially Implemented

#### Document Management
- Present as a sub-feature of Legal Practice (`legal_documents` table, R2 `storageKey`/`storageUrl`)
- Missing: presigned URL generation, e-signature (stubbed), document versioning beyond `documentVersion` integer, cross-module document access (event posters, accounting records)
- Should eventually become a platform-level capability used by all Professional modules

#### Payment Integration
- `paymentReference` fields on `legal_invoices` and `event_registrations` are ready
- `.env.example` has Paystack and Flutterwave keys
- No actual payment initiation or webhook handler implemented yet
- Should integrate via a shared `webwaka-commerce` payment gateway rather than duplicating payment logic

### 3.4 Planned / Strongly Implied Modules

These modules are implied by: the "Professional Services Suite" blueprint framing, the Nigerian professional ecosystem, the reusable patterns already established (RBAC, billing, compliance profiles), and the multi-tenant architecture designed for horizontal expansion.

#### Healthcare / Medical Practice Management
- **Why implied:** Nigeria has 70,000+ registered doctors (MDCN); clinic management is a massive underserved market. The NBA profile pattern maps directly to MDCN profile. Appointment scheduling, prescription records, and patient billing follow the same case/client/invoice arc already built.
- **Regulatory body:** MDCN (Medical and Dental Council of Nigeria)

#### Accounting Practice Management
- **Why implied:** ICAN (Institute of Chartered Accountants of Nigeria) has 50,000+ members. Accounting firms manage client engagements, billable hours, financial statements, tax filings, and regulatory submissions — all mapping to the existing billing and document patterns.

#### HR & Recruitment Agency Management
- **Why implied:** Nigeria's formal and informal labor placement market is large. Agencies track candidate pipelines, client briefs, placement fees (typically a % of first-year salary), and must manage NDPR-compliant data for candidates and employers.

#### Engineering Practice Management
- **Why implied:** COREN (Council for the Regulation of Engineering in Nigeria) and NSE (Nigerian Society of Engineers) require registered engineers to track professional development and project records. Project-based billing and document management overlap strongly with the existing legal patterns.

---

## 4. Nigeria Professional Domain Research Summary

### 4.1 The Nigerian Professional Services Ecosystem

Nigeria's professional services market is large, fragmented, and rapidly digitalizing. Key characteristics:

**Scale:**
- ~100,000 registered lawyers (NBA — Nigerian Bar Association), distributed across 125 branches
- ~70,000 MDCN-registered doctors and 15,000+ registered dental practitioners
- ~50,000 ICAN members; thousands more ANAN accountants
- Hundreds of thousands of unregistered but active consultants, event planners, HR practitioners

**Digital maturity:**
- Mobile-first by necessity: most professionals operate on Android smartphones (≥60% of the market)
- Unreliable internet connectivity is the norm outside Lagos, Abuja, and Port Harcourt — Offline First is non-negotiable
- WhatsApp is the primary business communication channel; email is secondary
- Bank transfers (NUBSS/NIP), Paystack, and Flutterwave dominate payments; cash remains significant

**Regulatory reality:**
- Multiple professional bodies (NBA, MDCN, ICAN, COREN, ARCON, NIA, etc.) each have unique compliance requirements
- Annual practicing certificates, dues payment tracking, and CPD (Continuing Professional Development) hours are universal pain points
- NDPR (Nigeria Data Protection Regulation) 2019 / NDPA 2023: data controllers must have consent records, privacy notices, and breach response procedures
- FIRS (Federal Inland Revenue Service): 7.5% VAT on professional services invoices is mandatory above the VAT threshold

### 4.2 Legal Practice Realities

**Workflow realities unique to Nigeria:**

1. **Cause list management** — Nigerian courts issue cause lists daily/weekly. Lawyers must monitor them to know when their matters are called. This is a major pain point with no digital solution.
2. **Court adjournments** — Nigerian courts adjourn cases at very high rates (>70% of hearings). Tracking adjournment dates and reasons is critical.
3. **Brief fees vs. retainer** — Many Nigerian lawyers charge both a one-time brief fee and ongoing retainers. Both must be tracked separately.
4. **Co-counsel/Chamber-sharing** — It is common for lawyers to refer cases to each other for a percentage of fees. Revenue sharing must be trackable.
5. **Cash payments** — Many clients still pay in cash. Receipt generation and cash tracking must be supported alongside Paystack.
6. **State-specific courts** — Each of Nigeria's 36 states has different court hierarchies and procedures. The existing `CourtType` enum captures the federal hierarchy well.
7. **Stamp duty on agreements** — Certain legal documents require stamp duty payment to the state government. This is often tracked manually.
8. **Power of Attorney** — POA documents are extremely common in Nigerian legal practice and require specific workflows.

### 4.3 Event Management Realities

1. **Events are a major revenue stream** — Professional associations (NBA, ICAN, MDCN) run annual conferences that generate millions in registration fees. Corporate organizations run training workshops, seminars, and AGMs.
2. **Check-in is predominantly manual** — Event organizers currently use printed attendee lists or Excel sheets. Digital check-in via QR code is a clear upgrade.
3. **Attendance certificates** — Most professional events in Nigeria issue attendance certificates that count toward CPD hours. Generating these digitally is high-value.
4. **Hybrid events** — Post-2020, many Nigerian professional events are hybrid (physical + Zoom/Teams). Virtual attendance tracking is needed.
5. **Payment complexity** — Attendees often pay via bank transfer (providing a proof of payment image) rather than card. Offline payment confirmation workflows are needed.
6. **Group registrations** — Organizations often register 10-50 employees for training events. Bulk registration is essential.
7. **Vendor/sponsor management** — Major events have sponsors and vendors that need separate management tracks.
8. **State chapter events** — For professional associations with state branches, event visibility must be scoped to the right tenant/chapter.

### 4.4 Cross-Module Compliance & Privacy Realities

1. **NDPR/NDPA compliance** is mandatory for all professional data controllers:
   - Consent at point of data collection (already implemented for legal clients)
   - Privacy notices and data subject rights (access, deletion, correction)
   - Data Processing Agreements with third-party processors
   - Breach notification within 72 hours to NITDA
   - **All Professional modules need this**, not just Legal Practice

2. **FIRS VAT obligations:**
   - 7.5% VAT on professional services (already implemented for legal invoices)
   - VAT registration number must appear on all tax invoices
   - Quarterly VAT returns filing
   - **All billing modules must enforce this**

3. **CBN foreign exchange restrictions:**
   - NGN is the default currency by regulation for transactions in Nigeria
   - Multi-currency support (8 African currencies) is correctly implemented but NGN must remain the default

### 4.5 Product Implications for WebWaka Professional

| Insight | Product Implication |
|---|---|
| Cause lists are a daily pain for lawyers | Build a court hearing tracker with calendar sync and push notifications |
| High adjournment rate | Adjournment tracking with reason codes is high-value |
| Professional body dues/CPD tracking | A "Compliance Passport" feature per profession |
| Cash payments are still common | Offline payment recording with later bank reconciliation |
| WhatsApp is primary comms | WhatsApp integration for invoice delivery and event confirmations |
| Attendance certificates have CPD value | Auto-generate PDF certificates with QR-code verification |
| Multi-staff practices are common | Team/firm multi-user access with per-seat billing |
| Data portability expectations are low but rising | Export to PDF/Excel for every major list |

---

## 5. Top 20 Enhancements — Legal Practice Management

**Module purpose:** Comprehensive practice management for Nigerian law firms and solo practitioners. Covers client lifecycle, case tracking, court hearing management, time billing, invoicing, document management, and NBA compliance.

**Current implementation state:** FULLY IMPLEMENTED — 91 tests, 23 API endpoints, PWA UI. Known gaps: Paystack payment flow, digital signatures, cause list monitoring, WhatsApp delivery.

---

### ENH-LP-01: Paystack / Flutterwave Invoice Payment Integration

**Title:** Integrated Nigerian Payment Gateway for Invoice Collection  
**Description:** Wire the stubbed `paymentReference` field in `legal_invoices` to actual Paystack and Flutterwave payment initiation and webhook callbacks. Generate a payment link per invoice. Mark invoices as PAID automatically on verified webhook.  
**Why it matters:** The single biggest revenue-affecting feature gap. Cash collection is slow, error-prone, and untrackable. Paystack is used by 99% of Nigerian businesses.  
**Implementation approach:**
- Add `POST /api/v1/legal/invoices/:id/initiate-payment` → calls Paystack Initialize Transaction API → returns `authorization_url`
- Add `POST /api/v1/legal/webhooks/paystack` → validates HMAC-SHA512 signature → updates invoice status
- Store Paystack `reference` in existing `paymentReference` field
- Publish `legal.invoice.paid` event on confirmation  
**Reuse/integration notes:** Should integrate with `webwaka-commerce` payment gateway module if one exists. If not, build a shared `PaymentService` class in `src/core/payments/` that both Legal Practice and Event Management can use.  
**Dependencies:** `PAYSTACK_SECRET_KEY` env var (already in `.env.example`), `FLUTTERWAVE_SECRET_KEY`  
**Priority:** 🔴 CRITICAL

---

### ENH-LP-02: Court Hearing Calendar & Cause List Tracker

**Title:** Proactive Court Hearing Reminders with Cause List Monitoring  
**Description:** Add a calendar view of upcoming hearings across all active cases. Send push notification reminders (3 days, 1 day, morning-of) for each scheduled hearing date. Provide a "cause list check" feature where the attorney marks whether the case appeared on the day's list.  
**Why it matters:** Missing a hearing date is a professional liability for lawyers. It can result in cases being struck out. Currently tracked via personal diaries / WhatsApp reminders.  
**Implementation approach:**
- Extend `case_hearings` with `reminderSent` flag
- Scheduled Worker cron trigger: daily at 06:00 WAT, query upcoming hearings in next 3 days
- Publish `legal.case.hearing_reminder` event → notification dispatch via Termii
- UI: calendar view (week/month) aggregating hearings across all cases  
**Reuse/integration notes:** Notification dispatch should route through the platform notification service (Termii). Cron is native to Cloudflare Workers Cron Triggers.  
**Dependencies:** `TERMII_API_KEY`, Cloudflare Workers Cron Triggers  
**Priority:** 🔴 CRITICAL

---

### ENH-LP-03: Offline Payment Recording (Cash / Bank Transfer)

**Title:** Offline Cash and Bank Transfer Payment Capture  
**Description:** Allow attorneys to record cash payments and bank transfer payments offline, with manual reconciliation later. Generate a receipt PDF for the client. These payments queue in the offline mutation queue and sync when online.  
**Why it matters:** Most Nigerian clients still pay partially or fully in cash or via bank transfer with a screenshot of debit advice. Refusing to support this means rejecting the majority of actual transactions.  
**Implementation approach:**
- Add `paymentMethod: 'PAYSTACK' | 'FLUTTERWAVE' | 'CASH' | 'BANK_TRANSFER'` to `legal_invoices`
- Add `PUT /api/v1/legal/invoices/:id/record-payment` for offline payment recording
- Generate receipt PDF (using Cloudflare Worker + html-to-pdf or a simple HTML receipt template)
- Queue mutation in Dexie when offline  
**Reuse/integration notes:** Receipt PDF generation should be a shared `core/receipts.ts` capability — Event Management also needs receipts.  
**Dependencies:** Dexie sync engine, optional PDF generation library  
**Priority:** 🔴 CRITICAL

---

### ENH-LP-04: WhatsApp Invoice & Hearing Reminder Delivery

**Title:** WhatsApp-Native Invoice Sharing and Hearing Reminders  
**Description:** Enable "Send Invoice via WhatsApp" which sends a formatted WhatsApp message with invoice details and payment link to the client's Nigerian phone number. Also send hearing reminders via WhatsApp.  
**Why it matters:** Nigerian clients are 10x more likely to respond to a WhatsApp message than an email. This is the primary business communication channel.  
**Implementation approach:**
- Integrate WhatsApp Business API (via Meta Cloud API or a BSP like Termii/Infobip)
- `POST /api/v1/legal/invoices/:id/whatsapp` → sends templated message with invoice PDF link + Paystack link
- Use Cloudflare Worker to call WhatsApp API; no new server needed  
**Reuse/integration notes:** WhatsApp integration should be a shared platform capability. Do not build per-module. Expose via `core/notifications/whatsapp.ts`.  
**Dependencies:** WhatsApp Business API credentials, Meta Business verification  
**Priority:** 🟠 HIGH

---

### ENH-LP-05: Digital Signature on Documents

**Title:** Native Digital Signature Capture for Legal Documents  
**Description:** Add an in-browser signature pad (canvas-based) to the document creation flow. Store the signature as a PNG in R2. Link the signature to the document record via `legal_documents.signatureUrl` (field already exists).  
**Why it matters:** Many Nigerian legal documents (retainer agreements, POAs, settlement agreements) need signatures. Currently this requires printing, signing, and scanning.  
**Implementation approach:**
- Add `signature-pad` canvas component to `ui.tsx`
- Capture as base64 PNG → upload to R2 → store URL in `signatureUrl`
- Generate a "signed document" overlay using Cloudflare Worker (HTML → PDF with signature image)
- Publish `legal.document.signed` event  
**Reuse/integration notes:** Signature capture component can be shared with other Professional modules that need document signing.  
**Dependencies:** R2 `DOCUMENTS` binding, `signature-pad` npm package or canvas API  
**Priority:** 🟠 HIGH

---

### ENH-LP-06: Retainer Agreement Templates & Auto-Generation

**Title:** Nigerian Legal Document Template Library  
**Description:** Provide a library of 10+ Nigerian legal document templates (retainer agreement, POA, deed of assignment, tenancy agreement, affidavit, etc.). Auto-populate with client/case data. Store in R2 with version history.  
**Why it matters:** Lawyers spend hours drafting routine documents. Templates reduce this to minutes. Firm-specific templates are also a key tenant differentiation feature.  
**Implementation approach:**
- Add `document_templates` table: `id, tenantId, name, documentType, templateHtml, variables, version`
- Template rendering: Mustache-style variable substitution in Cloudflare Worker
- Library of platform defaults (tenant-overridable)
- UI: template browser, variable fill form, preview, save to case  
**Reuse/integration notes:** Template engine should be shared with Event Management (event promotional materials) and future modules.  
**Dependencies:** New `document_templates` table, HTML-to-PDF generation  
**Priority:** 🟠 HIGH

---

### ENH-LP-07: Co-Counsel Revenue Sharing & Referral Tracking

**Title:** Inter-Firm Revenue Sharing and Referral Fee Management  
**Description:** Track referral relationships between law firms and co-counsel arrangements on cases. Automatically calculate and track referral fees (typically 10-30% of brief fee). Generate referral fee invoices between firms.  
**Why it matters:** Referral and co-counsel arrangements are extremely common in Nigerian legal practice but almost always tracked informally, leading to disputes.  
**Implementation approach:**
- Extend `legal_cases` with `referralSource: string | null` and `referralFeePercent: number | null`
- Add `co_counsel_arrangements` table: `id, tenantId, caseId, counselTenantId, feePercent, status`
- Auto-generate a referral fee invoice when original invoice is PAID
- Publish `legal.case.referral_fee_generated` event  
**Reuse/integration notes:** Cross-tenant referral relationships need platform-level identity; coordinate with `webwaka-platform/tenants`.  
**Dependencies:** Cross-tenant relationship model  
**Priority:** 🟡 MEDIUM

---

### ENH-LP-08: NBA Practicing Certificate Renewal Tracker

**Title:** Automated NBA Annual Dues and Practicing Certificate Renewal Reminders  
**Description:** Track the expiry date of each attorney's NBA practicing certificate. Send automated reminders at 90, 30, and 7 days before expiry. Surface a compliance dashboard showing which attorneys in the firm are current vs overdue.  
**Why it matters:** Practicing without a current certificate is a disciplinary offense. Firms often lose track of individual attorney compliance when managing 5+ staff.  
**Implementation approach:**
- Extend `nba_profiles` with `practicingCertificateExpiry` (already present), `duesPaidYear`, `annualDuesKobo`
- Scheduled Worker cron: check `practicingCertificateExpiry` approaching, publish `legal.nba.certificate_expiring` event
- UI: compliance dashboard card on main dashboard  
**Reuse/integration notes:** The "professional compliance passport" pattern is reusable across Healthcare (MDCN), Accounting (ICAN), Engineering (COREN).  
**Dependencies:** Cloudflare Workers Cron Triggers, Termii  
**Priority:** 🟠 HIGH

---

### ENH-LP-09: Expense Tracking on Cases

**Title:** Case-Level Expense Recording and Disbursement Billing  
**Description:** Allow attorneys to record out-of-pocket expenses on a case (court filing fees, travel, stamp duty, photocopy costs). Include these expenses as line items on the next invoice automatically.  
**Why it matters:** Nigerian lawyers routinely advance costs for clients and then forget to invoice them or struggle to document them. Disbursements can be significant (court fees, stamp duty, notarization).  
**Implementation approach:**
- New `case_expenses` table: `id, tenantId, caseId, description, amountKobo, receiptUrl, billable, billed, workDate`
- Add to invoice creation flow: "include unbilled expenses" toggle
- R2 upload for expense receipts  
**Reuse/integration notes:** Generic expense pattern can be shared with Consulting and Accounting modules.  
**Dependencies:** New DB table; R2 for receipts  
**Priority:** 🟠 HIGH

---

### ENH-LP-10: Matter Conflict-of-Interest Checker

**Title:** Automated Conflict of Interest Detection  
**Description:** Before opening a new case, check if the opposing party or any related entity has previously appeared as a client, opposing party, or witness in any case handled by the firm.  
**Why it matters:** Ethical Rules of Professional Conduct (RPC) in Nigeria require lawyers to identify and manage conflicts of interest. Failure can result in disqualification and disciplinary proceedings.  
**Implementation approach:**
- Conflict search API: `POST /api/v1/legal/conflict-check` with `{ partyName, relatedEntities[] }`
- Search against `legal_clients.fullName`, `legal_cases.opposingParty`, `case_hearings.presidingOfficer`
- Return match confidence score and case references
- Mandatory step before `POST /api/v1/legal/cases` in the UI  
**Reuse/integration notes:** Pure search query on existing data; no new table needed.  
**Dependencies:** Full-text search (D1 FTS5 or edge-side JS search)  
**Priority:** 🟠 HIGH

---

### ENH-LP-11: Time Entry Auto-Capture from Calendar

**Title:** Calendar-Linked Automatic Time Entry Creation  
**Description:** When an attorney marks a hearing as "attended" or completes a scheduled task on the calendar, automatically create a draft time entry for the time spent. Reduce manual time logging friction.  
**Why it matters:** Most attorneys under-bill because logging time is tedious. Auto-creation from calendar events captures otherwise-lost billable time.  
**Implementation approach:**
- Add `calendarEventId` to `case_hearings` and `legal_time_entries`
- On hearing outcome recording: suggest a time entry (pre-populated with hearing duration)
- "Accept suggestion" creates the entry; attorney can edit before saving  
**Dependencies:** Hearing outcome recording (already in schema)  
**Priority:** 🟡 MEDIUM

---

### ENH-LP-12: Client Portal (Self-Service)

**Title:** Secure Client Portal for Invoice and Case Status Access  
**Description:** Generate a secure, time-limited, read-only portal URL for each client. The client can view their case status, upcoming hearings, outstanding invoices, and pay online without needing an account.  
**Why it matters:** Clients constantly call or WhatsApp for updates. A portal reduces interruption and improves client satisfaction.  
**Implementation approach:**
- Generate signed URL token (HMAC-SHA256 with 30-day expiry) encoding `{ tenantId, clientId }`
- New Hono router: `/portal/:token/*` — validates token, serves client-scoped data
- PWA-friendly read-only UI for client  
**Reuse/integration notes:** Signed URL pattern can be shared across Professional modules for guest/client access. Event Management already has a guest role — same concept.  
**Dependencies:** HMAC token generation (Web Crypto API — already in use)  
**Priority:** 🟠 HIGH

---

### ENH-LP-13: Bulk Court Date Import from CSV

**Title:** CSV Import of Court Hearing Dates  
**Description:** Allow attorneys to upload a CSV export from the court registry or their existing diary app to bulk-import upcoming hearing dates for multiple cases.  
**Why it matters:** Attorneys with 50+ active cases cannot manually re-enter all hearing dates. Bulk import is essential for onboarding.  
**Implementation approach:**
- `POST /api/v1/legal/hearings/import` — accepts CSV with columns: `caseReference, hearingDate, court, presidingOfficer`
- Match `caseReference` to existing `legal_cases.caseReference`
- Preview step before confirmation; report unmatched references  
**Dependencies:** CSV parsing (PapaParse or edge-side manual split)  
**Priority:** 🟡 MEDIUM

---

### ENH-LP-14: Firm Performance Analytics Dashboard

**Title:** Partner-Level Practice Analytics (Revenue, Caseload, Utilization)  
**Description:** A dedicated analytics view for `TENANT_ADMIN` showing: revenue by month, average invoice payment time, attorney utilization rates, case win/resolution rates by type, and top clients by revenue.  
**Why it matters:** Law firm partners currently have no visibility into firm performance beyond a spreadsheet. Data-driven decisions on staffing and pricing are impossible without this.  
**Implementation approach:**
- Add aggregate queries: revenue by period, average days-to-payment, hours-logged by attorney
- Dashboard component in UI: charts (recharts or Chart.js)
- Cloudflare Analytics Engine or D1 aggregations  
**Dependencies:** Existing invoice, time entry, and case data  
**Priority:** 🟡 MEDIUM

---

### ENH-LP-15: NDPR Data Subject Request Workflow

**Title:** Formal NDPR Data Subject Rights Request Handling  
**Description:** Allow clients to submit formal Data Subject Requests (access, correction, deletion) via the client portal. Track the request, generate a response within the statutory 30-day window, and maintain an audit trail.  
**Why it matters:** NDPA 2023 requires data controllers to handle DSARs within 30 days with a documented process. Non-compliance risks NITDA enforcement.  
**Implementation approach:**
- New `data_subject_requests` table: `id, tenantId, clientId, requestType, submittedAt, dueAt, resolvedAt, resolutionNotes`
- Client portal form: "Submit Data Request"
- Admin workflow: assigned to `TENANT_ADMIN`; reminder at day 20 if unresolved  
**Reuse/integration notes:** NDPR workflow is platform-wide. Should live in `core/compliance/` and be shared with all Professional modules and other WebWaka repos.  
**Dependencies:** New table; client portal (ENH-LP-12)  
**Priority:** 🟠 HIGH

---

### ENH-LP-16: Legal Invoice PDF Generation

**Title:** Professional Nigerian Tax Invoice PDF Export  
**Description:** Generate a properly formatted Nigerian tax invoice PDF for any invoice, including: firm letterhead, VAT registration number, FIRS-compliant layout, client address, itemized time entries, and payment instructions.  
**Why it matters:** Nigerian tax law requires a specific invoice format for VAT claims. Courts also require formal invoices as evidence in fee recovery proceedings.  
**Implementation approach:**
- Cloudflare Worker renders an HTML invoice template → Puppeteer or `@cloudflare/puppeteer` → PDF
- Store generated PDF in R2 with a presigned 24-hour download URL
- `GET /api/v1/legal/invoices/:id/pdf` endpoint  
**Reuse/integration notes:** PDF invoice generation is a shared platform capability — Event Management needs receipt PDFs too. Extract to `core/pdf.ts`.  
**Dependencies:** `@cloudflare/puppeteer` or equivalent; R2 for storage  
**Priority:** 🟠 HIGH

---

### ENH-LP-17: Multi-Lingual Client Communication Templates

**Title:** Yoruba / Igbo / Hausa Client Communication  
**Description:** Extend the existing i18n system to generate client-facing communications (SMS, WhatsApp, email) in the client's preferred language. Invoice notifications, hearing reminders, and document requests should be in the client's language.  
**Why it matters:** Many Nigerian clients outside Lagos and Abuja are more comfortable in Yoruba, Igbo, or Hausa. Language-appropriate communication builds trust.  
**Implementation approach:**
- Extend `i18n.ts` with communication templates for each language
- `notifyClient(client, templateKey, vars)` utility in `core/notifications/`
- Select language from `legal_clients.preferredLanguage`  
**Dependencies:** Existing i18n infrastructure; Termii/WhatsApp  
**Priority:** 🟡 MEDIUM

---

### ENH-LP-18: Legal Research Integration (OpenRouter AI — Vendor Neutral)

**Title:** AI-Assisted Case Law Research via OpenRouter  
**Description:** Allow attorneys to run natural-language queries against Nigerian case law, statutes, and precedents. Surface relevant cases and statutory provisions within the context of an open matter.  
**Why it matters:** Nigerian legal research is extremely time-consuming. Platforms like LawPavilion serve this need manually; an AI layer can dramatically accelerate it.  
**Implementation approach:**
- Use OpenRouter (vendor-neutral AI gateway) to call an LLM with context of the case facts
- RAG (Retrieval-Augmented Generation) against a vectorized corpus of Nigerian case law
- `POST /api/v1/legal/cases/:id/research` → returns 3-5 relevant citations  
**Reuse/integration notes:** AI calls MUST go through OpenRouter — never a vendor-specific client. The AI service layer should live in `webwaka-platform/ai` and be shared across all repos.  
**Dependencies:** OpenRouter API key, Nigerian case law corpus, vector DB  
**Priority:** 🔵 LOW (foundational infrastructure not yet available)

---

### ENH-LP-19: Stamp Duty Tracking

**Title:** Nigerian Stamp Duty Recording on Legal Documents  
**Description:** Track stamp duty payments on relevant documents (deeds, agreements, instruments). Record the stamp duty receipt number, amount, and paying officer. Include in matter cost summary.  
**Why it matters:** Stamp duties in Nigeria are collected by FIRS (federal instruments) or state revenue services. Failure to stamp renders documents inadmissible in court proceedings.  
**Implementation approach:**
- Extend `legal_documents` with `stampDutyAmount: number | null`, `stampDutyRef: string | null`, `stampDutyDate: number | null`
- UI: "Record Stamp Duty" action on document detail view
- Include in `case_expenses` total  
**Dependencies:** Schema migration  
**Priority:** 🟡 MEDIUM

---

### ENH-LP-20: Case Archiving & Long-Term Records Management

**Title:** Automated Case Archiving with Retention Policy  
**Description:** After a case reaches `CLOSED` or `ARCHIVED` status, move it to cold storage (compressed archive) after 2 years of inactivity. Maintain an index for search. Nigerian legal records may need to be retained for 7–12 years for limitation period compliance.  
**Why it matters:** Active D1 database size grows unbounded without archiving. Nigerian statute of limitations (6 years for contract, 12 for land) drives long retention requirements.  
**Implementation approach:**
- Scheduled Worker: identify cases `status = CLOSED` AND `updatedAt < 2 years ago`
- Move to a separate `legal_cases_archive` D1 table or compress payload to R2
- Maintain searchable index (case reference, client name, dates)  
**Dependencies:** Cloudflare Workers Cron; D1 or R2 archive storage  
**Priority:** 🔵 LOW

---

## 6. Top 20 Enhancements — Event Management

**Module purpose:** Multi-tenant professional event creation, publication, registration management, and physical/digital check-in for the Nigerian professional and corporate events market.

**Current implementation state:** FULLY IMPLEMENTED — 156 tests, full RBAC, 6-state status machine, ticket ref generation, check-in flow, dashboard stats. Gaps: payment integration, QR codes, certificate generation, group registration, virtual attendance, email notifications.

---

### ENH-EM-01: Paystack Payment for Paid Event Registration

**Title:** Integrated Ticket Payment via Paystack  
**Description:** For events with `ticketPriceKobo > 0`, trigger a Paystack payment initiation on registration. Confirm the registration only after successful webhook verification. Auto-cancel unpaid registrations after a configurable timeout.  
**Why it matters:** Without payment integration, paid events have no revenue collection mechanism. This is the most critical missing piece for commercial viability.  
**Implementation approach:**
- `POST /api/v1/events/registrations/:id/initiate-payment` → Paystack Initialize
- `POST /api/v1/events/webhooks/paystack` → validate + update `amountPaidKobo` + confirm registration
- Use shared `core/payments/paystack.ts` (see ENH-LP-01)  
**Reuse/integration notes:** Reuse the same Paystack payment service as Legal Practice invoices. Single implementation in `core/payments/`.  
**Dependencies:** Paystack API keys, shared payment service  
**Priority:** 🔴 CRITICAL

---

### ENH-EM-02: QR Code Ticket Generation & Mobile Check-In

**Title:** QR Code Tickets and Instant Mobile Check-In  
**Description:** Generate a unique QR code per confirmed registration encoding the `ticketRef`. Allow event staff to scan the QR code from their phone to check in attendees instantly, even offline.  
**Why it matters:** Event check-in in Nigeria is currently a major bottleneck — long queues at manual registration desks. QR code scanning is the industry standard solution.  
**Implementation approach:**
- Generate QR code as SVG on registration confirmation using `qrcode` package (edge-compatible)
- Embed QR in confirmation email and ticket PDF
- `POST /api/v1/events/registrations/scan` — takes `ticketRef` from QR scan, records check-in
- Offline-capable: queue check-in in local IndexedDB; sync when online  
**Reuse/integration notes:** QR scan check-in component should be a standalone PWA page — shareable as an app link to event staff with zero installation.  
**Dependencies:** `qrcode` or equivalent; offline sync  
**Priority:** 🔴 CRITICAL

---

### ENH-EM-03: Attendance Certificate Generation (CPD)

**Title:** Auto-Generated PDF Attendance Certificates with QR Verification  
**Description:** After an event reaches `COMPLETED` status, automatically generate personalized attendance certificates for all `CHECKED_IN` registrations. Include CPD hours where applicable. Each certificate has a unique QR code linking to a verification page.  
**Why it matters:** Professional associations in Nigeria (NBA, ICAN, MDCN) award CPD points for attending accredited events. Certificate generation is manual and error-prone today.  
**Implementation approach:**
- Certificate template: HTML with tenant logo, attendee name, event title, date, CPD hours, unique cert ID
- Render to PDF via Cloudflare Worker (`@cloudflare/puppeteer`)
- Store in R2; generate presigned download URL
- `GET /api/v1/events/verify/:certId` — public verification endpoint  
**Reuse/integration notes:** Certificate generation shares the PDF infra with Legal Invoice PDF (ENH-LP-16). Use `core/pdf.ts`.  
**Dependencies:** PDF generation, R2  
**Priority:** 🔴 CRITICAL

---

### ENH-EM-04: Group / Bulk Registration

**Title:** Bulk Corporate Attendee Registration  
**Description:** Allow a single registration request to enroll multiple attendees from the same organization. One payment covers all. Each attendee gets their own `ticketRef` and QR code.  
**Why it matters:** Nigerian corporate events frequently have 10–100 employees attending from the same company. Individual registration for each is impractical.  
**Implementation approach:**
- `POST /api/v1/events/:id/registrations/bulk` — accepts `attendees[]` array
- Validates aggregate capacity; creates individual `event_registrations` records
- Single Paystack payment for total amount (`ticketPriceKobo * count`)
- Group confirmation email listing all tickets  
**Reuse/integration notes:** Bulk Paystack payment uses the shared payment service.  
**Dependencies:** Paystack for aggregate payments  
**Priority:** 🔴 CRITICAL

---

### ENH-EM-05: Bank Transfer / Offline Payment Confirmation

**Title:** Manual Bank Transfer Registration Confirmation  
**Description:** Allow event organizers to confirm registrations for attendees who pay via bank transfer (a very common Nigerian payment method). Organizer uploads proof of payment screenshot and manually marks registration as CONFIRMED.  
**Why it matters:** Card payments are still not universal in Nigeria. Many event participants pay via bank transfer and send a proof-of-payment screenshot via WhatsApp.  
**Implementation approach:**
- `PUT /api/v1/events/registrations/:id/confirm-offline` — requires `EVENT_MANAGER` role
- Accept optional `paymentProofStorageKey` (R2 upload)
- Publish `event_mgmt.registration.confirmed` event  
**Dependencies:** R2 for proof storage  
**Priority:** 🔴 CRITICAL

---

### ENH-EM-06: Event Email Confirmation & Reminder Notifications

**Title:** Automated Email Confirmation and Pre-Event Reminders  
**Description:** Send automated emails to registrants at: (1) registration confirmation, (2) 3 days before the event, (3) day of event with QR ticket. Email via Yournotify (Nigeria-first).  
**Why it matters:** Registrants frequently forget about events they signed up for weeks earlier. Reminder emails significantly improve show-up rates.  
**Implementation approach:**
- `POST /api/v1/events/registrations/:id/send-confirmation` or triggered automatically on confirmation
- Use `YOURNOTIFY_API_KEY` from env; compose HTML email with ticket QR and event details
- Cron trigger for pre-event reminders: query `registration_open` events starting in 3 days  
**Reuse/integration notes:** Email dispatch through a shared `core/notifications/email.ts` service.  
**Dependencies:** `YOURNOTIFY_API_KEY`, cron triggers  
**Priority:** 🟠 HIGH

---

### ENH-EM-07: Virtual / Hybrid Event Support

**Title:** Online Meeting Link Integration for Hybrid Events  
**Description:** Extend `managed_events` with a `virtualPlatform` field (Zoom / Google Meet / Teams / custom) and auto-distribute the meeting link to confirmed registrants via email/WhatsApp at event start time.  
**Why it matters:** Post-2020, Nigerian professional events are routinely hybrid. Virtual links are currently managed outside the system.  
**Implementation approach:**
- Add `virtualPlatform: 'ZOOM' | 'GMEET' | 'TEAMS' | 'CUSTOM' | null` and `virtualLink: string | null` to `managed_events`
- Virtual-only attendees: skip physical check-in; mark `CHECKED_IN` on virtual join (requires Zoom webhook or simpler: manual toggle)
- Distribute link in pre-event reminder email  
**Dependencies:** Yournotify email or WhatsApp; optional Zoom API  
**Priority:** 🟠 HIGH

---

### ENH-EM-08: Event Sponsorship & Vendor Management

**Title:** Sponsor and Vendor Registration for Events  
**Description:** Add a sponsorship management track allowing event organizers to log sponsors (tiers: Gold / Silver / Bronze), their contributions, and deliverables (logo placement, booth space, speaking slot).  
**Why it matters:** Large Nigerian professional events (NBA conference, ICAN annual conference) generate significant revenue from sponsorships. Managing sponsors in spreadsheets is error-prone.  
**Implementation approach:**
- New `event_sponsors` table: `id, tenantId, eventId, sponsorName, tier, contributionKobo, logo, deliverables, status`
- API: CRUD for sponsors under an event
- UI: Sponsors tab on event detail page  
**Dependencies:** New DB table  
**Priority:** 🟡 MEDIUM

---

### ENH-EM-09: Waitlist Management

**Title:** Automatic Waitlist for Fully-Booked Events  
**Description:** When an event reaches capacity, new registrations automatically join a waitlist. When a confirmed registration is cancelled, the next waitlisted attendee is automatically invited to confirm.  
**Why it matters:** Popular Nigerian professional events fill up quickly. Waitlists prevent revenue loss from cancellations.  
**Implementation approach:**
- Add `WAITLISTED` to `RegistrationStatus`
- On capacity check failure: create registration with `WAITLISTED` status
- On cancellation: trigger `promoteFromWaitlist()` function — find oldest WAITLISTED registration, set to PENDING, send invitation  
**Dependencies:** Schema migration for `WAITLISTED` status  
**Priority:** 🟡 MEDIUM

---

### ENH-EM-10: Event Analytics Dashboard

**Title:** Detailed Registration Analytics and Revenue Tracking  
**Description:** Extend the existing dashboard to include: registration trend over time, revenue collected vs outstanding, geographic distribution of registrants, check-in rate, no-show rate, and CPD hours awarded.  
**Why it matters:** Event organizers have no visibility into registration momentum, which drives decisions like adding capacity, changing marketing strategy, or opening late registrations.  
**Implementation approach:**
- Aggregate D1 queries: `registrations over time`, `revenue by status`, `check-in rate`
- Recharts or Chart.js in UI dashboard
- Export to CSV capability  
**Dependencies:** Existing `getDashboardStats` query (partially implemented)  
**Priority:** 🟡 MEDIUM

---

### ENH-EM-11: Multi-Ticket-Type Support

**Title:** VIP, Early Bird, and Staff Ticket Tiers  
**Description:** Allow events to have multiple ticket types with different prices and capacities (e.g., Early Bird NGN 5,000, Regular NGN 10,000, VIP NGN 25,000, Staff FREE).  
**Why it matters:** Tiered pricing is universal for Nigerian professional events and drives both revenue optimization and attendee segmentation.  
**Implementation approach:**
- New `event_ticket_types` table: `id, eventId, tenantId, name, priceKobo, capacity, available, cutoffDate`
- Link `event_registrations.ticketTypeId` → `event_ticket_types.id`
- Registration UI: show available ticket types with prices and remaining slots  
**Dependencies:** New DB tables; schema migration  
**Priority:** 🟠 HIGH

---

### ENH-EM-12: Offline-First Event Management Sync

**Title:** Full Offline Capability for Event Managers  
**Description:** Extend the `LegalPracticeOfflineDB` (or create `EventManagementOfflineDB`) to queue event mutations (create, registration, check-in) in IndexedDB for sync when connectivity is restored. Critical for check-in at venues with poor connectivity.  
**Why it matters:** Nigerian event venues (hotels, conference centres) frequently have poor or overloaded Wi-Fi during large events. Check-in must work offline.  
**Implementation approach:**
- Create `EventManagementOfflineDB` in `core/sync/client.ts` extending Dexie
- Add `event` and `event_registration` to `Mutation['entityType']` union
- Check-in mutations: queue locally, sync on reconnect
- Service worker intercepts check-in API calls when offline  
**Reuse/integration notes:** Extend existing `SyncManager` pattern; do not create a separate sync implementation.  
**Dependencies:** Dexie, service worker  
**Priority:** 🔴 CRITICAL

---

### ENH-EM-13: Event Promotional Landing Page Generator

**Title:** Auto-Generated SEO-Friendly Event Landing Page  
**Description:** Generate a public event landing page at `/{tenantSlug}/events/{eventSlug}` with event details, speaker bios, agenda, sponsor logos, and a registration CTA. No login required for guests.  
**Why it matters:** Event organizers currently share event details via WhatsApp images. A linkable, shareable landing page drives registrations far more effectively.  
**Implementation approach:**
- New route: `GET /events/:tenantSlug/:eventSlug` — serves HTML (SSR in Cloudflare Worker)
- Auto-generate from `managed_events` data; cache in KV with 1-hour TTL
- Schema: add `eventSlug` to `managed_events`  
**Reuse/integration notes:** SSR in Worker using raw HTML string (no React on server). Cache in `EVENTS` KV namespace (already bound).  
**Dependencies:** KV cache, slug field in schema  
**Priority:** 🟠 HIGH

---

### ENH-EM-14: Agenda / Schedule Management

**Title:** Detailed Event Agenda with Speaker Profiles  
**Description:** Allow organizers to build a structured event agenda (sessions, tracks, speakers, room assignments). Display on the event landing page and in the attendee app.  
**Why it matters:** Conferences with multiple tracks require session-level scheduling. Attendees need to know which sessions to attend and who is speaking.  
**Implementation approach:**
- New `event_sessions` table: `id, eventId, tenantId, title, speakerName, speakerBio, startTime, endTime, room, track`
- API: CRUD for sessions under an event
- UI: Agenda tab on event detail page  
**Dependencies:** New DB table  
**Priority:** 🟡 MEDIUM

---

### ENH-EM-15: WhatsApp Broadcast to Registrants

**Title:** WhatsApp Blast to All Confirmed Registrants  
**Description:** Allow event managers to send a WhatsApp broadcast message to all confirmed registrants (e.g., venue change, session update, last-minute information).  
**Why it matters:** WhatsApp is the primary real-time communication channel for Nigerian event updates. Email bounce rates are high.  
**Implementation approach:**
- `POST /api/v1/events/:id/broadcast` — body: `{ message, channel: 'WHATSAPP' | 'SMS' }`
- Query all CONFIRMED registrations with phone numbers
- Fan out to WhatsApp Business API (via Termii or Meta Cloud API)  
**Reuse/integration notes:** Use shared `core/notifications/` service. Rate-limit to avoid API throttling.  
**Dependencies:** WhatsApp Business API  
**Priority:** 🟡 MEDIUM

---

### ENH-EM-16: Event Recurring / Series Management

**Title:** Recurring Event Series Support  
**Description:** Support recurring events (weekly training, monthly networking, annual conference) with a `seriesId` grouping. Share base configuration across instances; override per-occurrence.  
**Why it matters:** Many Nigerian professional associations run regular events on fixed schedules. Managing each occurrence individually is repetitive.  
**Implementation approach:**
- Add `seriesId: string | null` and `recurrencePattern: string | null` (cron-like) to `managed_events`
- "Duplicate as next occurrence" action in UI
- Series-level analytics aggregating across all occurrences  
**Dependencies:** Schema migration  
**Priority:** 🔵 LOW

---

### ENH-EM-17: Feedback / Rating Collection Post-Event

**Title:** Post-Event Attendee Feedback Survey  
**Description:** Automatically send a feedback survey to checked-in attendees 1 hour after event end. Collect NPS score and session ratings. Aggregate results in organizer dashboard.  
**Why it matters:** Professional associations in Nigeria need evidence of event quality for accreditation and sponsor reporting.  
**Implementation approach:**
- Scheduled Worker: after `managed_events.endDate`, query CHECKED_IN registrations, send survey link
- Lightweight survey: NPS (1-10) + 3 open questions, stored in `event_feedback` table
- Aggregate in analytics dashboard  
**Dependencies:** Scheduled Worker, Yournotify email, new `event_feedback` table  
**Priority:** 🟡 MEDIUM

---

### ENH-EM-18: Event Staff Access (Crew Roles)

**Title:** Limited Staff Access for Check-In Crew  
**Description:** Allow event managers to grant temporary check-in-only access to event staff (volunteers, registration desk workers) without giving them full `EVENT_MANAGER` access.  
**Why it matters:** Events use temporary staff for check-in who should not have access to financial data or attendee PII beyond name and ticket status.  
**Implementation approach:**
- Add `EVENT_STAFF` to `EventManagementRole` enum
- `EVENT_STAFF` RBAC: only `POST /events/registrations/scan` and `GET /events/:id/registrations` (limited fields)
- Time-bound access: `validFrom`, `validUntil` on staff role assignment  
**Reuse/integration notes:** Role management is a platform concern. Coordinate with `webwaka-platform/auth` for role delegation.  
**Dependencies:** RBAC extension; platform auth  
**Priority:** 🟡 MEDIUM

---

### ENH-EM-19: Tenant Event Subdomain / Custom Domain Support

**Title:** Custom Domain for Tenant Event Registration Pages  
**Description:** Allow professional associations to have their event pages served from their own subdomain (e.g., `events.nba-lagos.org`) rather than a generic WebWaka URL.  
**Why it matters:** Brand credibility is critical for professional associations. A Nigerian Bar Association event page on their own domain is far more credible than a generic platform URL.  
**Implementation approach:**
- Cloudflare Workers Custom Domains feature: bind tenant slugs to custom domains
- `TENANT_CONFIG` KV: store `customDomain → tenantId` mapping
- SSL via Cloudflare's automatic certificate provisioning  
**Reuse/integration notes:** Custom domain mapping is a platform-level Cloudflare Workers feature. Configure in `wrangler.toml` and document process.  
**Dependencies:** Cloudflare Workers Custom Domains; tenant config  
**Priority:** 🟡 MEDIUM

---

### ENH-EM-20: CPD Accreditation Integration

**Title:** Formal CPD Hours Recording and Certificate API  
**Description:** Allow events to be marked as CPD-accredited by a professional body (e.g., NBA, ICAN). After attendance is confirmed, automatically credit CPD hours to the attendee's professional profile (if they are also a Legal Practice or Accounting module user on the same platform).  
**Why it matters:** Mandatory CPD hours are a major driver of professional event attendance in Nigeria. An integrated system that automatically tracks hours removes a major manual pain point.  
**Implementation approach:**
- Add `cpdHours: number | null` and `accreditingBody: string | null` to `managed_events`
- On event completion: publish `event_mgmt.event.completed` (already implemented) with CPD data in payload
- Legal Practice module subscribes: on `event_mgmt.event.completed`, update `nba_profiles.cpdHoursYTD`
- This is the first cross-module event subscription in WebWaka Professional  
**Reuse/integration notes:** Event bus (CORE-2) enables this cross-module integration without direct coupling. The Legal Practice module subscribes to Event Management events.  
**Dependencies:** CORE-2 event subscription pattern; `nba_profiles` extension  
**Priority:** 🟠 HIGH

---

## 7. Top 20 Enhancements — Healthcare Practice Management (Planned)

**Module purpose:** Clinic and hospital practice management for Nigerian healthcare providers. Covers patient records, appointment scheduling, consultation billing, prescription management, and MDCN compliance.

**Current implementation state:** NOT IMPLEMENTED. Strongly implied by the "Professional Services Suite" blueprint and the pattern established by Legal Practice (professional body profile, client/patient management, billing, records).

**Key Nigerian regulatory body:** MDCN (Medical and Dental Council of Nigeria) — maintains a register of ~70,000 doctors.

---

### ENH-HC-01: MDCN Professional Registration Profile

**Title:** MDCN Compliance Passport (analogous to NBA Profile)  
**Description:** Track each healthcare provider's MDCN registration number, specialty, annual practicing certificate, and annual dues status. Automated renewal reminders.  
**Why it matters:** Practicing without a current MDCN certificate is illegal and exposes patients to harm. Clinics with multiple doctors must track compliance for all staff.  
**Implementation approach:** Mirror `nba_profiles` pattern with `mdcn_profiles` table: `mdcnNumber`, `specialty`, `practicingCertExpiry`, `pcmHoursYTD`, `state`.  
**Priority:** 🔴 CRITICAL

---

### ENH-HC-02: Patient Record Management with NDPR Consent

**Title:** Multi-Tenant Patient Health Records with Full NDPR Compliance  
**Description:** Patient demographics, contact information, medical history summary, and NDPR consent tracking. All records tenant-isolated.  
**Implementation approach:** `health_patients` table mirroring `legal_clients` pattern. Add `bloodGroup`, `genotype`, `allergies`, `chronicConditions`. NDPR consent at registration.  
**Priority:** 🔴 CRITICAL

---

### ENH-HC-03: Appointment Scheduling & Waiting Room Queue

**Title:** Clinic Appointment Calendar with Digital Waiting Room  
**Description:** Patients book appointments online or via walk-in. Receptionists manage the queue. Patients receive SMS/WhatsApp confirmation.  
**Implementation approach:** `health_appointments` table: `patientId, doctorId, appointmentDate, status (SCHEDULED/IN_PROGRESS/COMPLETED/CANCELLED/NO_SHOW), queuePosition`.  
**Priority:** 🔴 CRITICAL

---

### ENH-HC-04: Consultation Billing & Receipt Generation

**Title:** Consultation Fee Billing with Nigerian Payment Methods  
**Description:** Generate consultation invoices in kobo. Support cash, Paystack, and bank transfer. Receipt on payment. Nigerian tax invoice format with 7.5% VAT where applicable.  
**Implementation approach:** `health_invoices` table mirroring `legal_invoices`. Use shared payment service.  
**Priority:** 🔴 CRITICAL

---

### ENH-HC-05: Prescription Management

**Title:** Digital Prescription with Drug Interaction Awareness  
**Description:** Doctors issue digital prescriptions. Record drug name, dosage, frequency, duration. Warn on known interactions.  
**Implementation approach:** `health_prescriptions` table. Drug database via NAFDAC approved drug list or OpenRouter AI for interaction checking.  
**Priority:** 🟠 HIGH

---

### ENH-HC-06: Medical Record Confidentiality Tiers

**Title:** Role-Based Access to Sensitive Medical Records  
**Description:** Receptionist sees demographics. Nurse sees vitals and allergies. Doctor sees full records. Administrator sees billing only.  
**Implementation approach:** Extend RBAC: `CLINIC_ADMIN`, `DOCTOR`, `NURSE`, `RECEPTIONIST`, `BILLING`. Column-level access masks for sensitive fields.  
**Priority:** 🔴 CRITICAL

---

### ENH-HC-07: Referral Letter Generation

**Title:** Structured Specialist Referral Letters  
**Description:** Doctors generate formatted referral letters to specialists with patient summary, reason for referral, and relevant history. Signed digitally.  
**Implementation approach:** Template-based in Cloudflare Worker. Use shared PDF generation service.  
**Priority:** 🟠 HIGH

---

### ENH-HC-08: Lab Test Request & Results Management

**Title:** Laboratory Test Ordering and Result Recording  
**Description:** Doctors order lab tests; lab uploads results; results visible to treating doctor. Patient portal access.  
**Implementation approach:** `health_lab_requests` and `health_lab_results` tables. R2 for result file uploads.  
**Priority:** 🟠 HIGH

---

### ENH-HC-09: NHIS / HMO Claims Integration

**Title:** National Health Insurance Scheme Claims Processing  
**Description:** Generate and track NHIS and private HMO claims for covered procedures. Track claim status (submitted, approved, rejected, paid).  
**Why it matters:** Nigeria's NHIS and private HMO networks are growing. Clinics lose significant revenue through incorrect or delayed claims.  
**Implementation approach:** `health_claims` table. HMO-specific rate schedules. Claims submission API integration (HMO-specific per partnership).  
**Priority:** 🟠 HIGH

---

### ENH-HC-10: Telemedicine / Video Consultation Support

**Title:** Integrated Video Consultation Booking and Conduct  
**Description:** Allow patients to book video consultations. Doctor joins from the platform. Consultation notes are recorded normally.  
**Implementation approach:** Integration with Zoom/Google Meet API for session creation. Virtual appointment type in `health_appointments`.  
**Priority:** 🟡 MEDIUM

---

### ENH-HC-11: Vaccination & Immunization Tracking

**Title:** Patient Immunization History and Schedule  
**Description:** Track vaccinations given (COVID-19, yellow fever, meningitis, routine childhood immunizations). Generate vaccination certificates.  
**Priority:** 🟡 MEDIUM

---

### ENH-HC-12: Multi-Branch / Multi-Location Clinic Management

**Title:** Enterprise Clinic Network Management  
**Description:** A single tenant manages multiple clinic branches. Doctors can work across branches. Billing is consolidated but branch-specific reporting is available.  
**Implementation approach:** Add `branchId` to all health tables. Tenant has multiple branches in `tenant_branches` table.  
**Priority:** 🟡 MEDIUM

---

### ENH-HC-13: Patient Recall & Chronic Disease Management

**Title:** Automated Patient Recall for Follow-Ups  
**Description:** For patients with chronic conditions (hypertension, diabetes, sickle cell), schedule automatic recall reminders based on the doctor's recommended follow-up interval.  
**Implementation approach:** `health_patient_recalls` table. Cron trigger.  
**Priority:** 🟡 MEDIUM

---

### ENH-HC-14: Inventory / Pharmacy Management

**Title:** In-Clinic Pharmacy Inventory Tracking  
**Description:** Track drug stock levels, dispensing, and reorder alerts. Link dispensed drugs to prescriptions and billing.  
**Priority:** 🔵 LOW (scope expansion)

---

### ENH-HC-15: Patient Satisfaction Surveys

**Title:** Post-Visit Patient Experience Rating  
**Description:** Automated WhatsApp/SMS survey after each consultation. NPS + follow-up questions. Dashboard for clinic management.  
**Priority:** 🔵 LOW

---

### ENH-HC-16: PCM (Professional Continuing Medical Education) Tracking

**Title:** CME / CPD Hours for Medical Practitioners  
**Description:** Track CME hours earned (conferences, webinars, training). Integration with Event Management module's CPD tracking (ENH-EM-20).  
**Implementation approach:** Extend MDCN profile with `cmHoursYTD`. Subscribe to `event_mgmt.event.completed` events.  
**Priority:** 🟡 MEDIUM

---

### ENH-HC-17: Clinical Audit Trail

**Title:** Immutable Audit Log for All Clinical Record Changes  
**Description:** Every modification to patient records must be timestamped, attributed to a specific user, and stored in an immutable audit trail. MDCN requires this for disciplinary investigations.  
**Implementation approach:** `health_audit_trail` table: `id, tenantId, entityType, entityId, userId, action, before, after, timestamp`. Append-only (no updates/deletes).  
**Priority:** 🟠 HIGH

---

### ENH-HC-18: Emergency Contact & Next of Kin Management

**Title:** Emergency Contact and Guardian Records  
**Description:** For each patient, store emergency contact name, relationship, phone number. Alert emergency contact on admission or critical events.  
**Priority:** 🟠 HIGH

---

### ENH-HC-19: Analytics: Clinical Outcome Reporting

**Title:** Clinical Outcomes and Practice Performance Dashboard  
**Description:** Clinic management sees: patient volume trends, diagnosis frequency, revenue by service type, average consultation time, and outstanding claims.  
**Priority:** 🟡 MEDIUM

---

### ENH-HC-20: NDPR Compliant Data Retention and Deletion

**Title:** Automated NDPR-Compliant Health Record Retention  
**Description:** Health records have a minimum 7-year retention period under Nigerian law. After that period, automated anonymization with patient consent. Data subject deletion requests handled with statutory exemption logging.  
**Priority:** 🟠 HIGH

---

## 8. Top 20 Enhancements — Accounting Practice Management (Planned)

**Module purpose:** Practice management for Nigerian chartered accountants, accounting firms, and tax consultants. Covers client engagements, audit file management, tax filing tracking, billing, and ICAN/ANAN compliance.

**Current implementation state:** NOT IMPLEMENTED. Strongly implied by the billing and document patterns already established. Key regulatory body: ICAN (Institute of Chartered Accountants of Nigeria), ~50,000 members.

---

### ENH-AC-01: ICAN / ANAN Compliance Profile

**Title:** Professional Registration and Practicing Certificate for Accountants  
**Description:** Track ICAN/ANAN member number, fellowship grade (ACA/FCA), annual practising fees, and CPD hours. Automated renewal reminders.  
**Implementation approach:** `ican_profiles` table mirroring `nba_profiles`. `membershipGrade: 'ACA' | 'FCA'`, `annualFeesPaidYear`, `cpd_hours_ytd`.  
**Priority:** 🔴 CRITICAL

---

### ENH-AC-02: Client Engagement Management

**Title:** Audit / Tax / Advisory Engagement Lifecycle  
**Description:** Manage client engagements (audit, tax filing, payroll, advisory). Each engagement has a scope, fee, timeline, assigned team, and deliverables checklist.  
**Implementation approach:** `accounting_engagements` table: `id, tenantId, clientId, engagementType (AUDIT/TAX/PAYROLL/ADVISORY), status, engagementLetterSignedAt, feeKobo, currency`.  
**Priority:** 🔴 CRITICAL

---

### ENH-AC-03: Tax Filing Deadline Tracker

**Title:** FIRS, LIRS, and Corporate Tax Deadline Management  
**Description:** Track filing deadlines for all active clients: CIT (Company Income Tax), WHT (Withholding Tax), VAT, PAYE. Color-coded urgency dashboard. Automatic reminders.  
**Implementation approach:** `accounting_tax_deadlines` table: `clientId, taxType, periodEnd, dueDate, filedDate, status`. Cron reminders.  
**Priority:** 🔴 CRITICAL

---

### ENH-AC-04: Time Billing for Engagements

**Title:** Engagement-Level Time Recording and Billing  
**Description:** Reuse the `legal_time_entries` pattern for accounting engagements. Partners and managers log time by client. Billing rate varies by level (partner, manager, senior, junior).  
**Implementation approach:** `accounting_time_entries` table (same shape as `legal_time_entries` but linked to `accounting_engagements`). Or: abstract to a shared `professional_time_entries` table.  
**Reuse/integration notes:** Strong opportunity to extract a shared `core/billing/time-entries.ts` — used by Legal Practice, Accounting, and potentially Healthcare.  
**Priority:** 🔴 CRITICAL

---

### ENH-AC-05: Audit File & Working Paper Management

**Title:** Structured Audit File with Working Paper Templates  
**Description:** Organize audit evidence into a structured working paper file (lead schedules, sub-schedules, supporting documents). Templates for common Nigerian audit procedures.  
**Implementation approach:** `accounting_working_papers` table: `id, tenantId, engagementId, sectionCode, title, content, preparedBy, reviewedBy, reviewStatus`. R2 for attachments.  
**Priority:** 🟠 HIGH

---

### ENH-AC-06: Management Accounts Generator

**Title:** Auto-Generate Management Accounts from Client Data  
**Description:** From client-uploaded trial balance data (CSV/Excel), auto-generate a formatted management accounts pack (income statement, balance sheet, cash flow statement) in PDF.  
**Implementation approach:** Trial balance import → mapping engine → account classification → PDF generation.  
**Priority:** 🟠 HIGH

---

### ENH-AC-07: Payroll Processing Module

**Title:** Nigerian Payroll Computation with PAYE, Pension, and NHF  
**Description:** Compute monthly payroll for clients' employees including PAYE (scaled rates), 7.5% employer pension, 2.5% NHF (National Housing Fund), and NSITF. Generate payslips.  
**Priority:** 🟠 HIGH

---

### ENH-AC-08: CAC Compliance Tracker

**Title:** Corporate Affairs Commission Annual Return Deadlines  
**Description:** Track CAC annual return deadlines for corporate clients. Companies Act 2020 requires annual returns within 42 days of AGM. Automated reminders.  
**Implementation approach:** Extend `accounting_tax_deadlines` with `CAC_ANNUAL_RETURN` type.  
**Priority:** 🟠 HIGH

---

### ENH-AC-09: Client Invoice with Multiple Tax Types

**Title:** FIRS-Compliant Tax Invoices for Accounting Services  
**Description:** Professional service invoices with VAT registration number, applicable taxes (VAT, WHT), and FIRS-standard format. Differentiate between vatable and non-vatable services.  
**Implementation approach:** Extend invoice schema with `taxType: 'VAT' | 'WHT' | 'EXEMPT'`. Use shared invoice + PDF generation from Legal Practice (ENH-LP-16).  
**Priority:** 🟠 HIGH

---

### ENH-AC-10: CPD Compliance for Accountants

**Title:** ICAN Mandatory CPD Hours Tracking  
**Description:** ICAN requires 40 CPD hours/year for practicing members. Track CPD activities, auto-credit from attended webinars/events (via Event Management integration), and alert members approaching the deadline.  
**Implementation approach:** Subscribe to `event_mgmt.event.completed` event. Link `ican_profiles.cpd_hours_ytd`.  
**Priority:** 🟡 MEDIUM

---

### ENH-AC-11 to ENH-AC-20: Additional Accounting Enhancements

| # | Title | Priority |
|---|---|---|
| AC-11 | Client Due Diligence (KYC) Workflow for Anti-Money Laundering Compliance | 🟠 HIGH |
| AC-12 | Accounts Receivable Aging Report per Client Engagement | 🟡 MEDIUM |
| AC-13 | Multi-Signatory Engagement Letter Workflow | 🟡 MEDIUM |
| AC-14 | Transfer Pricing Documentation Tracker (for multinationals) | 🔵 LOW |
| AC-15 | FIRS TaxPro-Max Integration for Electronic Filing | 🟡 MEDIUM |
| AC-16 | Audit Risk Assessment Matrix | 🟡 MEDIUM |
| AC-17 | Consolidation Module for Group Accounts | 🔵 LOW |
| AC-18 | Pension Fund Administration Support (PFAs) | 🔵 LOW |
| AC-19 | Practice Succession Planning and File Transfer | 🔵 LOW |
| AC-20 | Blockchain-Anchored Audit Certificates (NFT receipt) | 🔵 LOW |

---

## 9. Top 20 Enhancements — HR & Recruitment Agency Management (Planned)

**Module purpose:** End-to-end management for Nigerian HR consulting firms and recruitment agencies. Covers job order management, candidate pipeline, placement tracking, fee billing, and NDPR-compliant candidate data management.

**Current implementation state:** NOT IMPLEMENTED. Implied by the multi-professional suite vision and Nigerian market need.

---

### ENH-HR-01: Job Order (Client Brief) Management

**Title:** Client Job Brief and Vacancy Management  
**Description:** Track job briefs from client organizations: role title, level, department, compensation range, required qualifications, placement fee arrangement.  
**Implementation approach:** `hr_job_orders` table: `id, tenantId, clientId, title, level, department, salaryRangeKoboMin, salaryRangeKoboMax, feePercent, status (OPEN/SEARCHING/SHORTLISTED/FILLED/CANCELLED)`.  
**Priority:** 🔴 CRITICAL

---

### ENH-HR-02: Candidate Profile & Pipeline Management

**Title:** NDPR-Compliant Candidate Database with Pipeline Tracking  
**Description:** Comprehensive candidate profiles with NDPR consent, CV storage in R2, skills tagging, and pipeline stage tracking per job order.  
**Implementation approach:** `hr_candidates` table with NDPR consent following `legal_clients` pattern. Pipeline: `hr_candidate_stages` table.  
**Priority:** 🔴 CRITICAL

---

### ENH-HR-03: Interview Scheduling & Feedback

**Title:** Structured Interview Process Management  
**Description:** Schedule interviews (phone screen, technical, panel, final) with Calendly-like booking. Collect structured feedback from interviewers.  
**Priority:** 🟠 HIGH

---

### ENH-HR-04: Placement Fee Invoice Generation

**Title:** Automatic Placement Fee Invoice on Successful Hire  
**Description:** On placement, auto-generate an invoice for the placement fee (typically 15-25% of first-year salary). Use shared billing infrastructure.  
**Implementation approach:** Trigger on `hr_job_orders.status = FILLED`. Compute fee from salary offer + fee percent. Generate invoice via shared invoice module.  
**Priority:** 🔴 CRITICAL

---

### ENH-HR-05: CV / Resume Parsing and Skills Extraction

**Title:** AI-Powered CV Parsing via OpenRouter  
**Description:** Upload a candidate CV (PDF); use OpenRouter LLM to extract structured data (name, experience, education, skills, contact) and pre-fill the candidate profile.  
**Reuse/integration notes:** AI via OpenRouter only. Shared with `webwaka-platform/ai`. No vendor-specific SDK.  
**Priority:** 🟠 HIGH

---

### ENH-HR-06: Reference Check Automation

**Title:** Digital Reference Check with Structured Questions  
**Description:** Send automated reference check requests to referees via email/WhatsApp. Referees fill out a structured form. Results stored against candidate record.  
**Priority:** 🟡 MEDIUM

---

### ENH-HR-07: Background Check Tracking

**Title:** Background Verification Status Tracking  
**Description:** Track background checks (education verification, employment verification, criminal record, guarantor verification) with third-party providers.  
**Priority:** 🟡 MEDIUM

---

### ENH-HR-08: Guarantee / Surety Bond Document Management

**Title:** Employer Guarantor Documents for New Hires  
**Description:** Nigerian employers frequently require guarantors for new hires. Track guarantor details, generate guarantor forms, store signed copies in R2.  
**Priority:** 🟡 MEDIUM

---

### ENH-HR-09: Candidate Portal for Self-Service Applications

**Title:** Secure Candidate Portal for Application Tracking  
**Description:** Candidates receive a portal link to track their application status, upload documents, and receive offer letters digitally.  
**Reuse/integration notes:** Same signed-URL pattern as Legal Practice Client Portal (ENH-LP-12).  
**Priority:** 🟡 MEDIUM

---

### ENH-HR-10: Offer Letter Generation

**Title:** Digital Offer Letter with e-Signature  
**Description:** Generate a customized offer letter from a template. Candidate signs digitally via the portal. Signed copy stored in R2.  
**Reuse/integration notes:** Reuse shared document template engine (ENH-LP-06) and digital signature capability (ENH-LP-05).  
**Priority:** 🟠 HIGH

---

### ENH-HR-11 to ENH-HR-20: Additional HR Enhancements

| # | Title | Priority |
|---|---|---|
| HR-11 | Retained Search Client Billing (monthly retainer + success fee) | 🟠 HIGH |
| HR-12 | Candidate Blacklist and Fraud Alert System | 🟠 HIGH |
| HR-13 | Headhunting Target Company Mapping | 🟡 MEDIUM |
| HR-14 | CIPM (Chartered Institute of Personnel Management) Professional Profile | 🟡 MEDIUM |
| HR-15 | Temp / Contract Staffing Timesheet Management | 🟡 MEDIUM |
| HR-16 | Compensation Benchmarking by Industry and Level | 🟡 MEDIUM |
| HR-17 | Employer Brand and Job Board Integration (Jobberman, LinkedIn) | 🔵 LOW |
| HR-18 | Workforce Planning Analytics | 🔵 LOW |
| HR-19 | Outplacement Services Management | 🔵 LOW |
| HR-20 | WhatsApp Bot for Candidate Updates | 🔵 LOW |

---

## 10. Cross-Repo Integration Map

### 10.1 What Must Be Built in This Repo

| Capability | Rationale |
|---|---|
| All module-specific API routes, DB schemas, UI components | Domain logic belongs in the Professional repo |
| RBAC roles per module | Each module has unique role semantics |
| Nigeria-specific compliance features (NBA, MDCN, ICAN, NDPR) | Professional domain knowledge |
| Module-specific event types (published to CORE-2) | Module is the authoritative source for its events |
| Offline sync stores per module (Dexie) | Offline behavior is module-aware |
| Module-specific i18n translations | Domain terminology varies by profession |
| `wrangler.toml` unified worker entry | Infrastructure to serve all module APIs from one worker |

### 10.2 What Must Be Integrated from Other Repos (Not Rebuilt)

| Capability | Source Repo | Integration Method |
|---|---|---|
| JWT issuance and tenant provisioning | `webwaka-platform/auth` | JWT consumed here; not issued |
| CORE-1 server-side sync reconciliation | `webwaka-platform/sync` | Client only in this repo; server in platform |
| CORE-2 event bus (remote) | `webwaka-platform/events` | `publishEvent()` via `EVENT_BUS_URL` HTTP POST |
| Paystack / Flutterwave payment initiation and webhooks | `webwaka-commerce/payments` OR shared `core/payments/` | Prefer shared service to avoid duplication |
| WhatsApp Business API dispatch | `webwaka-platform/notifications` | Do not build per-module; route through platform |
| Termii SMS dispatch | `webwaka-platform/notifications` | Same — single notification service |
| Yournotify email dispatch | `webwaka-platform/notifications` | Same |
| OpenRouter AI gateway | `webwaka-platform/ai` | Never call AI vendors directly from module code |
| Tenant admin and billing | `webwaka-platform/tenants` | Multi-tenant provisioning is a platform concern |
| Cross-tenant identity resolution (co-counsel referrals) | `webwaka-platform/identity` | Cross-tenant identity is not this repo's domain |

### 10.3 What Should Become Shared Platform Capabilities (Extracted from This Repo)

| Capability | Current Location | Target Location | Priority |
|---|---|---|---|
| Monetary utilities (`koboToNaira`, `formatCurrency`, `SUPPORTED_CURRENCIES`) | Duplicated in legal + event utils | `core/money.ts` | 🔴 CRITICAL |
| `generateId`, `nowUTC` | Duplicated in both utils | `core/ids.ts` | 🟠 HIGH |
| `validateNigerianPhone`, `validateEmail` | Duplicated in both utils | `core/validators.ts` | 🟠 HIGH |
| `formatWATDate`, `formatWATDateTime` | Duplicated in both utils | `core/time.ts` | 🟠 HIGH |
| `Env` bindings interface | Duplicated per module | `core/env.ts` | 🟠 HIGH |
| Standard API response type `{ success, data, errors }` | Repeated in both APIs | `core/api.ts` | 🟠 HIGH |
| D1 type definitions (`D1Database`, `D1PreparedStatement`) | Duplicated in queries files | `core/db/d1.ts` | 🟠 HIGH |
| NDPR consent workflow and data subject request handling | Legal Practice only | `core/compliance/ndpr.ts` | 🟠 HIGH |
| PDF generation (invoices, certificates, receipts) | Not yet implemented | `core/pdf.ts` | 🟠 HIGH |
| QR code generation | Not yet implemented | `core/qr.ts` | 🟠 HIGH |
| Document template engine (Mustache-style) | Not yet implemented | `core/templates.ts` | 🟡 MEDIUM |
| Offline sync `Mutation['entityType']` extension | `core/sync/client.ts` | Expand existing client | 🔴 CRITICAL |
| `EventManagementOfflineDB` | Not yet implemented | `core/sync/client.ts` extension | 🔴 CRITICAL |
| Professional compliance passport pattern | `nba_profiles` only | Generic `professional_license_profiles` | 🟡 MEDIUM |

### 10.4 What Must Never Be Duplicated

| Capability | Rule |
|---|---|
| JWT secret management | Never in application code; only via `wrangler secret put` |
| Tenant isolation logic | `tenantId` always from JWT payload; never from request headers |
| Direct AI vendor SDKs | Never import `openai`, `anthropic`, `@google/generative-ai` — use OpenRouter only |
| Cross-repo database access | Never access another repo's D1 directly; use events and APIs only |
| Payment webhook HMAC validation | Must use the same shared validator; never re-implement |
| `console.log` statements | Only through `createLogger()`; enforced by existing convention |
| Hard-coded tenant IDs or secrets | Never in source code |

---

## 11. Recommended Execution Order

This sequence is ordered by: (1) blocking dependencies, (2) business-critical value, (3) cross-module reuse leverage.

### Phase 0: Infrastructure Hardening (2–3 weeks) — BLOCKING EVERYTHING ELSE

| Step | Task | Blocking For |
|---|---|---|
| 0.1 | **Unified `src/worker.ts` entry point** routing to both Legal + Event Management APIs | Deployment of Event Management |
| 0.2 | **Extract shared `core/money.ts`** (monetary utils deduplication) | All future modules |
| 0.3 | **Extract shared `core/ids.ts`, `core/validators.ts`, `core/time.ts`** | All future modules |
| 0.4 | **Extract shared `core/db/d1.ts`** (D1 type definitions) | All future modules |
| 0.5 | **Extend `core/sync/client.ts`** with `EventManagementOfflineDB` and event entity types | Event Management offline support |
| 0.6 | **Implement `core/payments/paystack.ts`** shared payment service | ENH-LP-01, ENH-EM-01 |
| 0.7 | **Apply D1 migrations** for `managed_events` and `event_registrations` tables in staging | Event Management staging deployment |
| 0.8 | **Update `wrangler.toml` worker `main`** to unified entry | Production routing |

### Phase 1: Payment Integration (2 weeks) — Revenue-Unlocking

| Step | Task | Module |
|---|---|---|
| 1.1 | ENH-LP-01: Paystack invoice payment + webhook | Legal Practice |
| 1.2 | ENH-EM-01: Paystack event ticket payment + webhook | Event Management |
| 1.3 | ENH-EM-05: Offline payment (bank transfer) confirmation | Event Management |
| 1.4 | ENH-LP-03: Offline cash/bank transfer recording | Legal Practice |

### Phase 2: Core Engagement Tools (3 weeks) — Retention-Driving

| Step | Task | Module |
|---|---|---|
| 2.1 | ENH-EM-02: QR code ticket generation | Event Management |
| 2.2 | ENH-EM-03: Attendance certificate PDF generation + QR verification | Event Management |
| 2.3 | ENH-EM-12: Event offline sync engine | Event Management |
| 2.4 | ENH-EM-11: Multi-ticket-type support | Event Management |
| 2.5 | ENH-LP-02: Hearing calendar + reminders | Legal Practice |
| 2.6 | ENH-LP-09: Expense tracking on cases | Legal Practice |
| 2.7 | ENH-LP-10: Conflict-of-interest checker | Legal Practice |

### Phase 3: Document & Communication Infrastructure (3 weeks) — Platform Leverage

| Step | Task | Module / Core |
|---|---|---|
| 3.1 | **`core/pdf.ts`**: shared PDF generation (Cloudflare Workers) | Platform |
| 3.2 | ENH-LP-16: Legal invoice PDF generation | Legal Practice |
| 3.3 | ENH-LP-05: Digital signature on documents | Legal Practice |
| 3.4 | ENH-LP-06: Document template library | Legal Practice |
| 3.5 | **`core/notifications/`**: shared email + SMS + WhatsApp service | Platform |
| 3.6 | ENH-EM-06: Email confirmation + reminders | Event Management |
| 3.7 | ENH-LP-04: WhatsApp invoice delivery | Legal Practice |

### Phase 4: Client & Attendee Self-Service (2 weeks) — Stickiness

| Step | Task | Module |
|---|---|---|
| 4.1 | ENH-LP-12: Legal client portal (signed URL) | Legal Practice |
| 4.2 | ENH-EM-13: Event landing page generator (Cloudflare Worker SSR) | Event Management |
| 4.3 | ENH-EM-04: Group / bulk registration | Event Management |
| 4.4 | ENH-EM-09: Waitlist management | Event Management |
| 4.5 | ENH-LP-15: NDPR data subject request workflow → `core/compliance/ndpr.ts` | Platform + Legal |

### Phase 5: Analytics & Compliance (2 weeks) — Management Value

| Step | Task | Module |
|---|---|---|
| 5.1 | ENH-LP-14: Firm performance analytics dashboard | Legal Practice |
| 5.2 | ENH-EM-10: Event registration analytics | Event Management |
| 5.3 | ENH-LP-08: NBA certificate renewal tracker | Legal Practice |
| 5.4 | ENH-LP-07: Co-counsel revenue sharing | Legal Practice |
| 5.5 | ENH-EM-20: CPD accreditation integration (first cross-module event subscription) | Event + Legal |

### Phase 6: New Module — Healthcare Practice Management (4–6 weeks)

| Step | Task |
|---|---|
| 6.1 | Schema design: `health_patients`, `health_appointments`, `health_invoices`, `mdcn_profiles` |
| 6.2 | API router: `src/modules/healthcare-practice/api/index.ts` |
| 6.3 | ENH-HC-01: MDCN compliance profile |
| 6.4 | ENH-HC-02: Patient records + NDPR |
| 6.5 | ENH-HC-03: Appointment scheduling |
| 6.6 | ENH-HC-04: Consultation billing (reuse shared payment + invoice service) |
| 6.7 | ENH-HC-06: Role-based access to clinical records |
| 6.8 | ENH-HC-17: Clinical audit trail |
| 6.9 | Vitest suite: target 120+ tests following the 5-layer QA protocol |

### Phase 7: New Module — Accounting Practice Management (4–6 weeks)

| Step | Task |
|---|---|
| 7.1 | Schema: `accounting_engagements`, `ican_profiles`, `accounting_tax_deadlines` |
| 7.2 | API router: `src/modules/accounting-practice/api/index.ts` |
| 7.3 | ENH-AC-01: ICAN compliance profile |
| 7.4 | ENH-AC-02: Engagement management |
| 7.5 | ENH-AC-03: Tax filing deadline tracker |
| 7.6 | ENH-AC-04: Time billing (reuse or abstract from `core/billing/time-entries.ts`) |
| 7.7 | ENH-AC-08: CAC compliance tracker |
| 7.8 | ENH-AC-10: CPD integration with Event Management |
| 7.9 | Vitest suite: target 120+ tests |

### Phase 8: New Module — HR & Recruitment Agency (4–6 weeks)

| Step | Task |
|---|---|
| 8.1 | Schema: `hr_job_orders`, `hr_candidates`, `hr_candidate_stages` |
| 8.2 | API router: `src/modules/hr-recruitment/api/index.ts` |
| 8.3 | ENH-HR-01: Job order management |
| 8.4 | ENH-HR-02: Candidate database with NDPR |
| 8.5 | ENH-HR-04: Placement fee invoice (reuse shared billing) |
| 8.6 | ENH-HR-10: Offer letter generation (reuse template engine + signature) |
| 8.7 | ENH-HR-05: CV parsing via OpenRouter (platform AI service) |
| 8.8 | Vitest suite: target 100+ tests |

---

## Appendix A: Open Issues & Technical Debt

| Issue | Severity | Proposed Fix |
|---|---|---|
| `wrangler.toml main` still points to legal-practice only | 🔴 CRITICAL | Unified `src/worker.ts` entry (Phase 0.1) |
| Monetary utilities duplicated across modules | 🟠 HIGH | Extract to `core/money.ts` (Phase 0.2) |
| `D1Database` type defined twice | 🟠 HIGH | Shared `core/db/d1.ts` (Phase 0.4) |
| `generateId`, `nowUTC`, validators duplicated | 🟠 HIGH | Shared core utilities (Phase 0.3) |
| Event Management not in offline sync engine | 🔴 CRITICAL | Extend `core/sync/client.ts` (Phase 0.5) |
| No payment flow implemented (stubs only) | 🔴 CRITICAL | Phase 1 |
| `wrangler.toml` KV IDs are placeholders for RATE_LIMIT_KV | 🟠 HIGH | Replace with real KV namespace IDs before production |
| No `src/worker.ts` unified entry point | 🔴 CRITICAL | Phase 0.1 |
| `TENANT_CONFIG` and `EVENTS` KV bindings use the same ID in staging | 🟡 MEDIUM | Provision separate KV namespaces |

---

## Appendix B: Current Test Coverage Summary

| Module / Suite | Tests | Status |
|---|---|---|
| Legal Practice — core utilities | 91 | ✅ All pass |
| Event Management — API, DB, utils, status machine | 156 | ✅ All pass |
| Healthcare Practice | 0 | ⬜ Not started |
| Accounting Practice | 0 | ⬜ Not started |
| HR & Recruitment | 0 | ⬜ Not started |
| Core shared utilities (extracted) | 0 | ⬜ Pending extraction |
| **TOTAL** | **247** | **247 / 247 PASS** |

---

## Appendix C: Environment Variables Checklist

| Variable | Status | Notes |
|---|---|---|
| `JWT_SECRET` | Required | `wrangler secret put JWT_SECRET` |
| `PAYSTACK_SECRET_KEY` | Required for payments | Not yet used in code |
| `PAYSTACK_PUBLIC_KEY` | Required for payments | Not yet used in code |
| `FLUTTERWAVE_SECRET_KEY` | Optional (secondary gateway) | Not yet used |
| `TERMII_API_KEY` | Required for SMS | Not yet used |
| `TERMII_SENDER_ID` | Required for SMS | Default: `WebWaka` |
| `YOURNOTIFY_API_KEY` | Required for email | Not yet used |
| `EVENT_BUS_URL` | Required for CORE-2 | `https://webwaka-core-api.webwakados.workers.dev/events/publish` |
| `EVENT_BUS_API_KEY` | Optional but recommended | Platform API key |
| D1 `database_id` (staging) | Present | `66c38966-...` |
| D1 `database_id` (production) | Present | `acfdfc4d-...` |
| KV `RATE_LIMIT_KV` IDs | ⚠️ Placeholder | Replace before production deployment |

---

*End of Report — WebWaka Professional Research Report & Implementation Plan*  
*Generated: 2026-03-30 | Version: 1.0.0*
