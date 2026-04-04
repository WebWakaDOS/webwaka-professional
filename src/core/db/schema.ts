/**
 * WebWaka Professional Services Suite — Database Schema
 * Blueprint Reference: Part 9.2 (Universal Architecture Standards)
 * Blueprint Reference: Part 10.8 (Professional Services Suite — Legal Practice)
 *
 * Invariants enforced:
 * - tenantId on ALL models (Part 9.2 Multi-Tenancy)
 * - Soft deletes via deletedAt (Part 9.2 Data Integrity)
 * - Monetary values as integers in kobo (Part 9.2 Monetary Values)
 * - No direct DB client instantiation — injected via Cloudflare D1 binding (Part 9.3)
 */

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export type CaseStatus =
  | 'INTAKE'
  | 'ACTIVE'
  | 'PENDING_COURT'
  | 'ADJOURNED'
  | 'SETTLED'
  | 'CLOSED'
  | 'ARCHIVED';

export type CaseType =
  | 'CIVIL'
  | 'CRIMINAL'
  | 'CORPORATE'
  | 'FAMILY'
  | 'LAND_PROPERTY'
  | 'EMPLOYMENT'
  | 'INTELLECTUAL_PROPERTY'
  | 'CONSTITUTIONAL'
  | 'ARBITRATION'
  | 'OTHER';

export type CourtType =
  | 'MAGISTRATE'
  | 'HIGH_COURT'
  | 'COURT_OF_APPEAL'
  | 'SUPREME_COURT'
  | 'FEDERAL_HIGH_COURT'
  | 'CUSTOMARY'
  | 'SHARIA'
  | 'ARBITRATION_PANEL'
  | 'OTHER';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type DocumentType =
  | 'BRIEF'
  | 'MOTION'
  | 'AFFIDAVIT'
  | 'AGREEMENT'
  | 'COURT_ORDER'
  | 'EXHIBIT'
  | 'CORRESPONDENCE'
  | 'RETAINER'
  | 'OTHER';

export type NBACallType = 'BAR' | 'INNER_BAR';

// ─────────────────────────────────────────────────────────────────────────────
// LEGAL CLIENTS
// Blueprint Reference: Part 10.8 — "Client management"
// ─────────────────────────────────────────────────────────────────────────────

export interface LegalClient {
  /** Surrogate primary key — UUID generated at application layer */
  id: string;
  /** Multi-tenancy invariant — Part 9.2 */
  tenantId: string;
  /** Full legal name of the client */
  fullName: string;
  /** Client type: individual or corporate entity */
  clientType: 'INDIVIDUAL' | 'CORPORATE';
  /** Nigerian phone number (e.g., +2348012345678) */
  phone: string;
  /** Email address */
  email: string | null;
  /** Residential or registered office address */
  address: string;
  /** State of residence / registration (Nigerian state) */
  state: string;
  /** National Identification Number (NDPR compliance — Part 9.1 Nigeria First) */
  ninNumber: string | null;
  /** Corporate Affairs Commission registration number (for corporate clients) */
  cacNumber: string | null;
  /** Retainer fee in kobo — Part 9.2 Monetary Values */
  retainerFeeKobo: number | null;
  /** NDPR consent timestamp — Part 9.1 Nigeria First */
  ndprConsentAt: number | null;
  /** Preferred language — Part 9.1 Africa First (en, yo, ig, ha) */
  preferredLanguage: 'en' | 'yo' | 'ig' | 'ha';
  /** UTC Unix timestamp (ms) */
  createdAt: number;
  /** UTC Unix timestamp (ms) */
  updatedAt: number;
  /** Soft delete — Part 9.2 Data Integrity */
  deletedAt: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGAL CASES
// Blueprint Reference: Part 10.8 — "Case tracking"
// ─────────────────────────────────────────────────────────────────────────────

export interface LegalCase {
  id: string;
  tenantId: string;
  /** Human-readable case reference (e.g., WW/LAG/2026/001) */
  caseReference: string;
  /** Case title (e.g., "Adeyemi v. Lagos State Government") */
  title: string;
  /** Case type classification */
  caseType: CaseType;
  /** Current workflow status */
  status: CaseStatus;
  /** Primary client ID — FK to legal_clients */
  clientId: string;
  /** Assigned lead attorney (user ID from platform auth) */
  leadAttorneyId: string;
  /** Co-counsel user IDs (JSON array stored as string) */
  coCounselIds: string;
  /** Court or tribunal handling the case */
  courtType: CourtType;
  /** Name of the specific court (e.g., "Lagos High Court, Ikeja Division") */
  courtName: string | null;
  /** Suit number assigned by the court */
  suitNumber: string | null;
  /** Date case was filed — UTC Unix timestamp (ms) */
  filingDate: number | null;
  /** Next hearing date — UTC Unix timestamp (ms) */
  nextHearingDate: number | null;
  /** Opposing party name */
  opposingParty: string | null;
  /** Opposing counsel name */
  opposingCounsel: string | null;
  /** Brief description of the case */
  description: string | null;
  /** Agreed fee in kobo — Part 9.2 Monetary Values */
  agreedFeeKobo: number | null;
  /** Currency code (default NGN) — Part 9.1 Africa First */
  currency: string;
  /** Version for optimistic concurrency control — Part 6 */
  version: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE HEARINGS
// Blueprint Reference: Part 10.8 — "Case tracking"
// ─────────────────────────────────────────────────────────────────────────────

export interface CaseHearing {
  id: string;
  tenantId: string;
  caseId: string;
  /** Hearing date — UTC Unix timestamp (ms) */
  hearingDate: number;
  /** Outcome of the hearing */
  outcome: string | null;
  /** Next adjournment date — UTC Unix timestamp (ms) */
  adjournmentDate: number | null;
  /** Presiding judge/magistrate */
  presidingOfficer: string | null;
  /** Notes from the hearing */
  notes: string | null;
  /** Attorney who attended (user ID) */
  attendedBy: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGAL TIME ENTRIES
// Blueprint Reference: Part 10.8 — "Time billing"
// ─────────────────────────────────────────────────────────────────────────────

export interface LegalTimeEntry {
  id: string;
  tenantId: string;
  /** FK to legal_cases */
  caseId: string;
  /** Attorney who performed the work (user ID) */
  attorneyId: string;
  /** Description of work performed */
  description: string;
  /** Duration in minutes */
  durationMinutes: number;
  /** Hourly rate in kobo — Part 9.2 Monetary Values */
  hourlyRateKobo: number;
  /** Computed: durationMinutes / 60 * hourlyRateKobo */
  amountKobo: number;
  /** Whether this entry has been invoiced */
  invoiced: boolean;
  /** FK to legal_invoices (null if not yet invoiced) */
  invoiceId: string | null;
  /** Date work was performed — UTC Unix timestamp (ms) */
  workDate: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGAL INVOICES
// Blueprint Reference: Part 10.8 — "Time billing"
// ─────────────────────────────────────────────────────────────────────────────

export interface LegalInvoice {
  id: string;
  tenantId: string;
  /** FK to legal_cases */
  caseId: string;
  /** FK to legal_clients */
  clientId: string;
  /** Human-readable invoice number (e.g., INV-2026-001) */
  invoiceNumber: string;
  status: InvoiceStatus;
  /** Subtotal of time entries in kobo */
  subtotalKobo: number;
  /** VAT amount in kobo (7.5% standard Nigerian VAT) */
  vatKobo: number;
  /** Total amount due in kobo — Part 9.2 Monetary Values */
  totalKobo: number;
  /** Currency code (default NGN) — Part 9.1 Africa First */
  currency: string;
  /** Due date — UTC Unix timestamp (ms) */
  dueDate: number;
  /** Payment date — UTC Unix timestamp (ms) */
  paidAt: number | null;
  /** Paystack/Flutterwave payment reference — Part 9.1 Nigeria First */
  paymentReference: string | null;
  /** Notes or terms */
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGAL DOCUMENTS
// Blueprint Reference: Part 10.8 — "Document management"
// ─────────────────────────────────────────────────────────────────────────────

export interface LegalDocument {
  id: string;
  tenantId: string;
  /** FK to legal_cases */
  caseId: string;
  /** Document type classification */
  documentType: DocumentType;
  /** Document title */
  title: string;
  /** R2 storage key for the document file — Part 9.2 (no file bytes in DB) */
  storageKey: string;
  /** Public or presigned URL for the document */
  storageUrl: string;
  /** MIME type (e.g., application/pdf) */
  mimeType: string;
  /** File size in bytes */
  fileSizeBytes: number;
  /** Uploaded by (user ID) */
  uploadedBy: string;
  /** Document version for version control */
  documentVersion: number;
  /** Whether this is a confidential document */
  isConfidential: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// NBA PROFILES (Nigerian Bar Association Compliance)
// Blueprint Reference: Part 10.8 — "NBA compliance"
// Blueprint Reference: Part 9.1 — "Nigeria First"
// ─────────────────────────────────────────────────────────────────────────────

export interface NBAProfile {
  id: string;
  tenantId: string;
  /** Platform user ID of the attorney */
  userId: string;
  /** Full name as registered with the NBA */
  fullName: string;
  /** NBA bar number (e.g., NBA/LAG/2015/001234) */
  barNumber: string;
  /** Year of call to bar */
  yearOfCall: number;
  /** Type of call — Bar or Inner Bar (SAN) */
  callType: NBACallType;
  /** NBA branch (e.g., Lagos, Abuja, Kano) */
  nbaBranch: string;
  /** Law school attended */
  lawSchool: string;
  /** University where LLB was obtained */
  llbUniversity: string;
  /** Current NBA dues payment status */
  duesPaidYear: number | null;
  /** NBA practicing certificate expiry — UTC Unix timestamp (ms) */
  practicingCertificateExpiry: number | null;
  /** Whether the profile has been verified */
  isVerified: boolean;
  /** Verification timestamp — UTC Unix timestamp (ms) */
  verifiedAt: number | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// NBA TRUST ACCOUNT LEDGER
// Blueprint Reference: Part 10.8 — NBA Compliance
// Blueprint Reference: Part 9.2 — Append-Only / Immutable Records
// NBA Rule 23: Lawyers must maintain a separate client trust account.
// Commingling of funds is a serious professional violation.
//
// INVARIANT: trust_transactions is APPEND-ONLY.
// No UPDATE or DELETE operations are permitted on trust_transactions.
// Balance is always derived from a running sum — never stored.
// ─────────────────────────────────────────────────────────────────────────────

/** Transaction direction — used for running-sum balance calculation */
export type TrustTransactionDirection = 'CREDIT' | 'DEBIT';

/** Transaction types — determines direction automatically */
export type TrustTransactionType =
  | 'DEPOSIT'       // CREDIT: client funds received into trust
  | 'DISBURSEMENT'  // DEBIT:  client funds paid out on client's behalf
  | 'BANK_CHARGES'  // DEBIT:  bank fees deducted from trust account
  | 'INTEREST'      // CREDIT: interest earned on trust funds
  | 'TRANSFER_IN'   // CREDIT: funds transferred in from another trust account
  | 'TRANSFER_OUT'; // DEBIT:  funds transferred out to another trust account

/** Derive transaction direction from type — canonical mapping */
export const TRUST_TRANSACTION_DIRECTION: Record<TrustTransactionType, TrustTransactionDirection> = {
  DEPOSIT: 'CREDIT',
  DISBURSEMENT: 'DEBIT',
  BANK_CHARGES: 'DEBIT',
  INTEREST: 'CREDIT',
  TRANSFER_IN: 'CREDIT',
  TRANSFER_OUT: 'DEBIT'
};

export interface TrustAccount {
  /** Surrogate primary key — UUID generated at application layer */
  id: string;
  /** Multi-tenancy invariant — Part 9.2 */
  tenantId: string;
  /** Human-readable name (e.g., "Commercial Litigation Trust Account") */
  accountName: string;
  /** Bank name (e.g., "First Bank Nigeria") */
  bankName: string;
  /** Bank account number */
  accountNumber: string;
  /** Optional description / purpose notes */
  description: string | null;
  /** Whether this account is active — use false to close (no hard delete) */
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TrustTransaction {
  /** Surrogate primary key — UUID generated at application layer */
  id: string;
  /** Multi-tenancy invariant — Part 9.2 */
  tenantId: string;
  /** FK to trust_accounts */
  accountId: string;
  /** Type of transaction — determines direction (CREDIT or DEBIT) */
  transactionType: TrustTransactionType;
  /** Direction derived from transactionType — stored for query efficiency */
  direction: TrustTransactionDirection;
  /** Transaction amount in kobo — ALWAYS positive — Part 9.2 Monetary Values */
  amountKobo: number;
  /** Human-readable description of this transaction */
  description: string;
  /** FK to legal_clients (null for bank charges / interest) */
  clientId: string | null;
  /** FK to legal_cases (null for account-level transactions) */
  caseId: string | null;
  /** Human-readable reference (e.g., TT-2026-001) */
  reference: string;
  /** External bank / Paystack reference number */
  externalReference: string | null;
  /** User ID of the attorney/admin who recorded this transaction */
  recordedBy: string;
  /** Date the transaction occurred (may differ from createdAt) — UTC Unix ms */
  transactionDate: number;
  /**
   * IMMUTABILITY INVARIANT: createdAt is set once at INSERT.
   * There is NO updatedAt, NO deletedAt — this record can NEVER be modified.
   * NBA Rule 23 requires a complete, unaltered audit trail.
   */
  createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT MANAGEMENT MODULE
// Blueprint Reference: Part 9.2 — Multi-Tenant, Event-Driven
// Blueprint Reference: Part 9.1 — Nigeria First, Offline First
// ─────────────────────────────────────────────────────────────────────────────

export type EventStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'REGISTRATION_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'ONGOING'
  | 'COMPLETED'
  | 'CANCELLED';

export type EventType =
  | 'CONFERENCE'
  | 'WORKSHOP'
  | 'SEMINAR'
  | 'WEBINAR'
  | 'NETWORKING'
  | 'TRAINING'
  | 'GALA'
  | 'EXHIBITION'
  | 'CULTURAL'
  | 'SPORTS'
  | 'OTHER';

export type RegistrationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'CHECKED_IN'
  | 'NO_SHOW';

/** RBAC roles for the Event Management module */
export type EventManagementRole = 'TENANT_ADMIN' | 'EVENT_MANAGER' | 'ATTENDEE' | 'GUEST';

export interface ManagedEvent {
  /** Surrogate primary key */
  id: string;
  /** Multi-tenancy invariant — Part 9.2 */
  tenantId: string;
  /** Event title */
  title: string;
  /** Detailed description */
  description: string | null;
  /** Event type classification */
  eventType: EventType;
  /** Workflow status */
  status: EventStatus;
  /** Venue name */
  venue: string;
  /** Street address of the venue */
  address: string;
  /** City/LGA — Nigeria First */
  city: string;
  /** Nigerian state — Nigeria First */
  state: string;
  /** Online meeting URL (for webinars/hybrid events) */
  onlineUrl: string | null;
  /** Event start — UTC Unix timestamp (ms) */
  startDate: number;
  /** Event end — UTC Unix timestamp (ms) */
  endDate: number;
  /** Registration deadline — UTC Unix timestamp (ms) */
  registrationDeadline: number | null;
  /** Maximum attendee capacity (null = unlimited) */
  capacity: number | null;
  /** Ticket price in kobo (0 = free) — Part 9.2 Monetary Values */
  ticketPriceKobo: number;
  /** Currency code — Part 9.1 Africa First */
  currency: string;
  /** Organiser user ID */
  organizerId: string;
  /** R2 storage key for the event banner image */
  bannerStorageKey: string | null;
  /** Public URL for the event banner */
  bannerUrl: string | null;
  /** JSON array of tags */
  tags: string;
  /** Version for optimistic concurrency — Part 6 */
  version: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface EventRegistration {
  id: string;
  tenantId: string;
  /** FK to managed_events */
  eventId: string;
  /** Platform user ID (null for guest registrations) */
  attendeeId: string | null;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  status: RegistrationStatus;
  /** Human-readable ticket reference (e.g., WW-EVT-2026-001) */
  ticketRef: string;
  /** Amount paid in kobo (0 for free events) */
  amountPaidKobo: number;
  /** Paystack/Flutterwave payment reference — Part 9.1 Nigeria First */
  paymentReference: string | null;
  /** Check-in timestamp — UTC Unix timestamp (ms) */
  checkedInAt: number | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RETAINER LEDGER
// Blueprint Reference: Part 10.8 — Retainer Management
// Tracks per-client retainer deposits, drawdowns, and refunds. Append-only.
// ─────────────────────────────────────────────────────────────────────────────

export type RetainerEntryType = 'DEPOSIT' | 'DRAWDOWN' | 'REFUND';

export interface RetainerLedgerEntry {
  id: string;
  tenantId: string;
  clientId: string;
  caseId: string | null;
  entryType: RetainerEntryType;
  amountKobo: number;
  description: string;
  invoiceId: string | null;
  recordedBy: string;
  transactionDate: number;
  createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MATTER TASKS — Task Delegation
// Blueprint Reference: Part 10.8 — Task Delegation
// ─────────────────────────────────────────────────────────────────────────────

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface MatterTask {
  id: string;
  tenantId: string;
  caseId: string;
  title: string;
  description: string | null;
  assignedTo: string;
  assignedBy: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MATTER EXPENSES — Expense Tracking
// Blueprint Reference: Part 10.8 — Expense Tracking
// ─────────────────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'FILING_FEE'
  | 'TRAVEL'
  | 'COURIER'
  | 'PRINTING'
  | 'EXPERT_WITNESS'
  | 'COURT_FEES'
  | 'SEARCH_FEES'
  | 'OTHER';

export interface MatterExpense {
  id: string;
  tenantId: string;
  caseId: string;
  category: ExpenseCategory;
  description: string;
  amountKobo: number;
  currency: string;
  receiptUrl: string | null;
  recordedBy: string;
  expenseDate: number;
  invoiced: boolean;
  invoiceId: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT INTAKE FORMS
// Blueprint Reference: Part 10.8 — Client Intake Forms
// ─────────────────────────────────────────────────────────────────────────────

export interface IntakeFormField {
  id: string;
  label: string;
  type: 'TEXT' | 'EMAIL' | 'PHONE' | 'TEXTAREA' | 'SELECT' | 'DATE' | 'CHECKBOX';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface ClientIntakeForm {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  fields: string;
  isActive: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export type IntakeSubmissionStatus = 'PENDING' | 'REVIEWED' | 'CONVERTED' | 'REJECTED';

export interface ClientIntakeSubmission {
  id: string;
  tenantId: string;
  formId: string;
  submitterName: string;
  submitterEmail: string | null;
  submitterPhone: string | null;
  responses: string;
  status: IntakeSubmissionStatus;
  reviewedBy: string | null;
  reviewedAt: number | null;
  clientId: string | null;
  createdAt: number;
  updatedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT ANALYSES — AI Contract Analysis
// Blueprint Reference: Part 10.8 — AI Contract Analysis
// ─────────────────────────────────────────────────────────────────────────────

export type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface DocumentAnalysis {
  id: string;
  tenantId: string;
  documentId: string;
  caseId: string;
  analysisType: string;
  status: AnalysisStatus;
  summary: string | null;
  riskyClauses: string | null;
  keyTerms: string | null;
  recommendations: string | null;
  rawResponse: string | null;
  analyzedBy: string;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT TEMPLATES — Document Assembly
// Blueprint Reference: Part 10.8 — Document Assembly
// ─────────────────────────────────────────────────────────────────────────────

export type TemplateType =
  | 'NDA'
  | 'EMPLOYMENT_AGREEMENT'
  | 'RETAINER_AGREEMENT'
  | 'POWER_OF_ATTORNEY'
  | 'AFFIDAVIT'
  | 'NOTICE'
  | 'LETTER_DEMAND'
  | 'SETTLEMENT_AGREEMENT'
  | 'OTHER';

export interface DocumentTemplate {
  id: string;
  tenantId: string;
  title: string;
  templateType: TemplateType;
  content: string;
  variables: string;
  isActive: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// E-SIGNATURE REQUESTS
// Blueprint Reference: Part 10.8 — E-Signature Integration
// ─────────────────────────────────────────────────────────────────────────────

export type ESignatureStatus = 'PENDING' | 'SENT' | 'VIEWED' | 'SIGNED' | 'DECLINED' | 'EXPIRED';

export interface ESignatureRequest {
  id: string;
  tenantId: string;
  documentId: string;
  caseId: string;
  requestedBy: string;
  signerName: string;
  signerEmail: string;
  signerPhone: string | null;
  status: ESignatureStatus;
  signedAt: number | null;
  declinedAt: number | null;
  expiresAt: number;
  signatureData: string | null;
  accessToken: string;
  createdAt: number;
  updatedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT PORTAL TOKENS — Secure Client Portal
// Blueprint Reference: Part 10.8 — Secure Client Portal
// ─────────────────────────────────────────────────────────────────────────────

export interface ClientPortalToken {
  id: string;
  tenantId: string;
  clientId: string;
  token: string;
  expiresAt: number;
  lastUsedAt: number | null;
  isRevoked: boolean;
  createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT MESSAGES — Secure Messaging
// Blueprint Reference: Part 10.8 — Secure Messaging
// ─────────────────────────────────────────────────────────────────────────────

export type MessageSenderType = 'ATTORNEY' | 'CLIENT' | 'PARALEGAL';

export interface ClientMessage {
  id: string;
  tenantId: string;
  caseId: string;
  senderId: string;
  senderType: MessageSenderType;
  recipientId: string;
  subject: string | null;
  body: string;
  isRead: boolean;
  readAt: number | null;
  parentMessageId: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION SCHEDULES — Automated Reminders
// Blueprint Reference: Part 10.8 — Automated Reminders
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'HEARING_REMINDER'
  | 'INVOICE_OVERDUE'
  | 'TASK_DUE'
  | 'RETAINER_LOW'
  | 'CERTIFICATE_EXPIRY'
  | 'COURT_DATE';

export type NotificationScheduleStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface NotificationSchedule {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  notificationType: NotificationType;
  recipientPhone: string | null;
  recipientEmail: string | null;
  message: string;
  scheduledFor: number;
  sentAt: number | null;
  status: NotificationScheduleStatus;
  createdAt: number;
  updatedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// D1 MIGRATION SQL
// Blueprint Reference: Part 3 (Layer 3 — Edge-Native Data Architecture)
// ─────────────────────────────────────────────────────────────────────────────

export const MIGRATION_SQL = `
-- WebWaka Professional Services Suite — D1 Schema Migration
-- Blueprint Reference: Part 10.8 (Professional Services Suite)
-- Part 9.2: tenantId on all tables, soft deletes, monetary values in kobo

CREATE TABLE IF NOT EXISTS legal_clients (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  fullName TEXT NOT NULL,
  clientType TEXT NOT NULL CHECK (clientType IN ('INDIVIDUAL', 'CORPORATE')),
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  state TEXT NOT NULL,
  ninNumber TEXT,
  cacNumber TEXT,
  retainerFeeKobo INTEGER,
  ndprConsentAt INTEGER,
  preferredLanguage TEXT NOT NULL DEFAULT 'en' CHECK (preferredLanguage IN ('en', 'yo', 'ig', 'ha')),
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER
);

CREATE INDEX IF NOT EXISTS idx_legal_clients_tenant ON legal_clients(tenantId);
CREATE INDEX IF NOT EXISTS idx_legal_clients_tenant_deleted ON legal_clients(tenantId, deletedAt);

CREATE TABLE IF NOT EXISTS legal_cases (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  caseReference TEXT NOT NULL,
  title TEXT NOT NULL,
  caseType TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'INTAKE',
  clientId TEXT NOT NULL REFERENCES legal_clients(id),
  leadAttorneyId TEXT NOT NULL,
  coCounselIds TEXT NOT NULL DEFAULT '[]',
  courtType TEXT NOT NULL,
  courtName TEXT,
  suitNumber TEXT,
  filingDate INTEGER,
  nextHearingDate INTEGER,
  opposingParty TEXT,
  opposingCounsel TEXT,
  description TEXT,
  agreedFeeKobo INTEGER,
  currency TEXT NOT NULL DEFAULT 'NGN',
  version INTEGER NOT NULL DEFAULT 1,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER
);

CREATE INDEX IF NOT EXISTS idx_legal_cases_tenant ON legal_cases(tenantId);
CREATE INDEX IF NOT EXISTS idx_legal_cases_client ON legal_cases(clientId);
CREATE INDEX IF NOT EXISTS idx_legal_cases_status ON legal_cases(tenantId, status);
CREATE INDEX IF NOT EXISTS idx_legal_cases_hearing ON legal_cases(tenantId, nextHearingDate);

CREATE TABLE IF NOT EXISTS case_hearings (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  caseId TEXT NOT NULL REFERENCES legal_cases(id),
  hearingDate INTEGER NOT NULL,
  outcome TEXT,
  adjournmentDate INTEGER,
  presidingOfficer TEXT,
  notes TEXT,
  attendedBy TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER
);

CREATE INDEX IF NOT EXISTS idx_case_hearings_case ON case_hearings(caseId);
CREATE INDEX IF NOT EXISTS idx_case_hearings_tenant ON case_hearings(tenantId);

CREATE TABLE IF NOT EXISTS legal_time_entries (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  caseId TEXT NOT NULL REFERENCES legal_cases(id),
  attorneyId TEXT NOT NULL,
  description TEXT NOT NULL,
  durationMinutes INTEGER NOT NULL,
  hourlyRateKobo INTEGER NOT NULL,
  amountKobo INTEGER NOT NULL,
  invoiced INTEGER NOT NULL DEFAULT 0,
  invoiceId TEXT,
  workDate INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER
);

CREATE INDEX IF NOT EXISTS idx_time_entries_case ON legal_time_entries(caseId);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant ON legal_time_entries(tenantId);
CREATE INDEX IF NOT EXISTS idx_time_entries_invoiced ON legal_time_entries(tenantId, invoiced);

CREATE TABLE IF NOT EXISTS legal_invoices (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  caseId TEXT NOT NULL REFERENCES legal_cases(id),
  clientId TEXT NOT NULL REFERENCES legal_clients(id),
  invoiceNumber TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED')),
  subtotalKobo INTEGER NOT NULL,
  vatKobo INTEGER NOT NULL,
  totalKobo INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  dueDate INTEGER NOT NULL,
  paidAt INTEGER,
  paymentReference TEXT,
  notes TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON legal_invoices(tenantId);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON legal_invoices(clientId);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON legal_invoices(tenantId, status);

CREATE TABLE IF NOT EXISTS legal_documents (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  caseId TEXT NOT NULL REFERENCES legal_cases(id),
  documentType TEXT NOT NULL,
  title TEXT NOT NULL,
  storageKey TEXT NOT NULL,
  storageUrl TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  fileSizeBytes INTEGER NOT NULL,
  uploadedBy TEXT NOT NULL,
  documentVersion INTEGER NOT NULL DEFAULT 1,
  isConfidential INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER
);

CREATE INDEX IF NOT EXISTS idx_documents_case ON legal_documents(caseId);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON legal_documents(tenantId);

CREATE TABLE IF NOT EXISTS nba_profiles (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  userId TEXT NOT NULL,
  fullName TEXT NOT NULL,
  barNumber TEXT NOT NULL,
  yearOfCall INTEGER NOT NULL,
  callType TEXT NOT NULL DEFAULT 'BAR' CHECK (callType IN ('BAR', 'INNER_BAR')),
  nbaBranch TEXT NOT NULL,
  lawSchool TEXT NOT NULL,
  llbUniversity TEXT NOT NULL,
  duesPaidYear INTEGER,
  practicingCertificateExpiry INTEGER,
  isVerified INTEGER NOT NULL DEFAULT 0,
  verifiedAt INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nba_profiles_bar_number ON nba_profiles(barNumber);
CREATE INDEX IF NOT EXISTS idx_nba_profiles_tenant ON nba_profiles(tenantId);
CREATE INDEX IF NOT EXISTS idx_nba_profiles_user ON nba_profiles(userId);

-- ─────────────────────────────────────────────────────────────────────────────
-- EVENT MANAGEMENT MODULE
-- Blueprint Reference: Part 9.2 — Multi-Tenant, Event-Driven
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS managed_events (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  eventType TEXT NOT NULL CHECK (eventType IN ('CONFERENCE','WORKSHOP','SEMINAR','WEBINAR','NETWORKING','TRAINING','GALA','EXHIBITION','CULTURAL','SPORTS','OTHER')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','REGISTRATION_OPEN','REGISTRATION_CLOSED','ONGOING','COMPLETED','CANCELLED')),
  venue TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  onlineUrl TEXT,
  startDate INTEGER NOT NULL,
  endDate INTEGER NOT NULL,
  registrationDeadline INTEGER,
  capacity INTEGER,
  ticketPriceKobo INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  organizerId TEXT NOT NULL,
  bannerStorageKey TEXT,
  bannerUrl TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER
);

CREATE INDEX IF NOT EXISTS idx_managed_events_tenant ON managed_events(tenantId);
CREATE INDEX IF NOT EXISTS idx_managed_events_status ON managed_events(tenantId, status);
CREATE INDEX IF NOT EXISTS idx_managed_events_start ON managed_events(tenantId, startDate);
CREATE INDEX IF NOT EXISTS idx_managed_events_organiser ON managed_events(tenantId, organizerId);

CREATE TABLE IF NOT EXISTS event_registrations (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  eventId TEXT NOT NULL REFERENCES managed_events(id),
  attendeeId TEXT,
  attendeeName TEXT NOT NULL,
  attendeeEmail TEXT NOT NULL,
  attendeePhone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','CANCELLED','CHECKED_IN','NO_SHOW')),
  ticketRef TEXT NOT NULL,
  amountPaidKobo INTEGER NOT NULL DEFAULT 0,
  paymentReference TEXT,
  checkedInAt INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations(eventId);
CREATE INDEX IF NOT EXISTS idx_event_registrations_tenant ON event_registrations(tenantId);
CREATE INDEX IF NOT EXISTS idx_event_registrations_attendee ON event_registrations(tenantId, attendeeId);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON event_registrations(tenantId, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_registrations_ticket ON event_registrations(ticketRef);

-- ─────────────────────────────────────────────────────────────────────────────
-- NBA TRUST ACCOUNT LEDGER (Migration 0002)
-- Blueprint Reference: Part 10.8 — NBA Compliance (Rule 23)
-- INVARIANT: trust_transactions is APPEND-ONLY. No UPDATE or DELETE.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trust_accounts (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  accountName TEXT NOT NULL,
  bankName TEXT NOT NULL,
  accountNumber TEXT NOT NULL,
  description TEXT,
  isActive INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1)),
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trust_accounts_tenant ON trust_accounts(tenantId);
CREATE INDEX IF NOT EXISTS idx_trust_accounts_active ON trust_accounts(tenantId, isActive);

CREATE TABLE IF NOT EXISTS trust_transactions (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  accountId TEXT NOT NULL REFERENCES trust_accounts(id),
  transactionType TEXT NOT NULL CHECK (transactionType IN (
    'DEPOSIT', 'DISBURSEMENT', 'BANK_CHARGES', 'INTEREST', 'TRANSFER_IN', 'TRANSFER_OUT'
  )),
  direction TEXT NOT NULL CHECK (direction IN ('CREDIT', 'DEBIT')),
  amountKobo INTEGER NOT NULL CHECK (amountKobo > 0),
  description TEXT NOT NULL,
  clientId TEXT REFERENCES legal_clients(id),
  caseId TEXT REFERENCES legal_cases(id),
  reference TEXT NOT NULL,
  externalReference TEXT,
  recordedBy TEXT NOT NULL,
  transactionDate INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trust_txn_account ON trust_transactions(accountId);
CREATE INDEX IF NOT EXISTS idx_trust_txn_tenant ON trust_transactions(tenantId);
CREATE INDEX IF NOT EXISTS idx_trust_txn_client ON trust_transactions(tenantId, clientId);
CREATE INDEX IF NOT EXISTS idx_trust_txn_case ON trust_transactions(tenantId, caseId);
CREATE INDEX IF NOT EXISTS idx_trust_txn_date ON trust_transactions(tenantId, transactionDate);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trust_txn_reference ON trust_transactions(tenantId, reference);

-- ─────────────────────────────────────────────────────────────────────────────
-- RETAINER LEDGER (Migration 0003)
-- Blueprint Reference: Part 10.8 — Retainer Management (append-only ledger)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS retainer_ledger (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  clientId TEXT NOT NULL REFERENCES legal_clients(id),
  caseId TEXT REFERENCES legal_cases(id),
  entryType TEXT NOT NULL CHECK (entryType IN ('DEPOSIT', 'DRAWDOWN', 'REFUND')),
  amountKobo INTEGER NOT NULL CHECK (amountKobo > 0),
  description TEXT NOT NULL,
  invoiceId TEXT REFERENCES legal_invoices(id),
  recordedBy TEXT NOT NULL,
  transactionDate INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_retainer_tenant ON retainer_ledger(tenantId);
CREATE INDEX IF NOT EXISTS idx_retainer_client ON retainer_ledger(tenantId, clientId);
CREATE INDEX IF NOT EXISTS idx_retainer_case ON retainer_ledger(tenantId, caseId);

-- ─────────────────────────────────────────────────────────────────────────────
-- MATTER TASKS (Migration 0004)
-- Blueprint Reference: Part 10.8 — Task Delegation
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS matter_tasks (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  caseId TEXT NOT NULL REFERENCES legal_cases(id),
  title TEXT NOT NULL,
  description TEXT,
  assignedTo TEXT NOT NULL,
  assignedBy TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  dueDate INTEGER,
  completedAt INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER
);

CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON matter_tasks(tenantId);
CREATE INDEX IF NOT EXISTS idx_tasks_case ON matter_tasks(tenantId, caseId);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON matter_tasks(tenantId, assignedTo);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON matter_tasks(tenantId, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- MATTER EXPENSES (Migration 0005)
-- Blueprint Reference: Part 10.8 — Expense Tracking
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS matter_expenses (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  caseId TEXT NOT NULL REFERENCES legal_cases(id),
  category TEXT NOT NULL CHECK (category IN ('FILING_FEE','TRAVEL','COURIER','PRINTING','EXPERT_WITNESS','COURT_FEES','SEARCH_FEES','OTHER')),
  description TEXT NOT NULL,
  amountKobo INTEGER NOT NULL CHECK (amountKobo > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  receiptUrl TEXT,
  recordedBy TEXT NOT NULL,
  expenseDate INTEGER NOT NULL,
  invoiced INTEGER NOT NULL DEFAULT 0,
  invoiceId TEXT REFERENCES legal_invoices(id),
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER
);

CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON matter_expenses(tenantId);
CREATE INDEX IF NOT EXISTS idx_expenses_case ON matter_expenses(tenantId, caseId);
CREATE INDEX IF NOT EXISTS idx_expenses_invoiced ON matter_expenses(tenantId, invoiced);

-- ─────────────────────────────────────────────────────────────────────────────
-- CLIENT INTAKE FORMS (Migration 0006)
-- Blueprint Reference: Part 10.8 — Client Intake Forms
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_intake_forms (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  fields TEXT NOT NULL DEFAULT '[]',
  isActive INTEGER NOT NULL DEFAULT 1,
  createdBy TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER
);

CREATE INDEX IF NOT EXISTS idx_intake_forms_tenant ON client_intake_forms(tenantId);

CREATE TABLE IF NOT EXISTS client_intake_submissions (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  formId TEXT NOT NULL REFERENCES client_intake_forms(id),
  submitterName TEXT NOT NULL,
  submitterEmail TEXT,
  submitterPhone TEXT,
  responses TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'CONVERTED', 'REJECTED')),
  reviewedBy TEXT,
  reviewedAt INTEGER,
  clientId TEXT REFERENCES legal_clients(id),
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_intake_submissions_tenant ON client_intake_submissions(tenantId);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_form ON client_intake_submissions(formId);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_status ON client_intake_submissions(tenantId, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOCUMENT ANALYSES (Migration 0007)
-- Blueprint Reference: Part 10.8 — AI Contract Analysis
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_analyses (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  documentId TEXT NOT NULL REFERENCES legal_documents(id),
  caseId TEXT NOT NULL REFERENCES legal_cases(id),
  analysisType TEXT NOT NULL DEFAULT 'CONTRACT_REVIEW',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  summary TEXT,
  riskyClauses TEXT,
  keyTerms TEXT,
  recommendations TEXT,
  rawResponse TEXT,
  analyzedBy TEXT NOT NULL,
  completedAt INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analyses_tenant ON document_analyses(tenantId);
CREATE INDEX IF NOT EXISTS idx_analyses_document ON document_analyses(documentId);
CREATE INDEX IF NOT EXISTS idx_analyses_case ON document_analyses(tenantId, caseId);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOCUMENT TEMPLATES (Migration 0008)
-- Blueprint Reference: Part 10.8 — Document Assembly
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_templates (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  title TEXT NOT NULL,
  templateType TEXT NOT NULL CHECK (templateType IN ('NDA','EMPLOYMENT_AGREEMENT','RETAINER_AGREEMENT','POWER_OF_ATTORNEY','AFFIDAVIT','NOTICE','LETTER_DEMAND','SETTLEMENT_AGREEMENT','OTHER')),
  content TEXT NOT NULL,
  variables TEXT NOT NULL DEFAULT '[]',
  isActive INTEGER NOT NULL DEFAULT 1,
  createdBy TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER
);

CREATE INDEX IF NOT EXISTS idx_templates_tenant ON document_templates(tenantId);
CREATE INDEX IF NOT EXISTS idx_templates_type ON document_templates(tenantId, templateType);

-- ─────────────────────────────────────────────────────────────────────────────
-- E-SIGNATURE REQUESTS (Migration 0009)
-- Blueprint Reference: Part 10.8 — E-Signature Integration
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS esignature_requests (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  documentId TEXT NOT NULL REFERENCES legal_documents(id),
  caseId TEXT NOT NULL REFERENCES legal_cases(id),
  requestedBy TEXT NOT NULL,
  signerName TEXT NOT NULL,
  signerEmail TEXT NOT NULL,
  signerPhone TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','VIEWED','SIGNED','DECLINED','EXPIRED')),
  signedAt INTEGER,
  declinedAt INTEGER,
  expiresAt INTEGER NOT NULL,
  signatureData TEXT,
  accessToken TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_esig_token ON esignature_requests(accessToken);
CREATE INDEX IF NOT EXISTS idx_esig_tenant ON esignature_requests(tenantId);
CREATE INDEX IF NOT EXISTS idx_esig_case ON esignature_requests(tenantId, caseId);

-- ─────────────────────────────────────────────────────────────────────────────
-- CLIENT PORTAL TOKENS (Migration 0010)
-- Blueprint Reference: Part 10.8 — Secure Client Portal
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_portal_tokens (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  clientId TEXT NOT NULL REFERENCES legal_clients(id),
  token TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  lastUsedAt INTEGER,
  isRevoked INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_token ON client_portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_portal_client ON client_portal_tokens(tenantId, clientId);

-- ─────────────────────────────────────────────────────────────────────────────
-- CLIENT MESSAGES (Migration 0011)
-- Blueprint Reference: Part 10.8 — Secure Messaging
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_messages (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  caseId TEXT NOT NULL REFERENCES legal_cases(id),
  senderId TEXT NOT NULL,
  senderType TEXT NOT NULL CHECK (senderType IN ('ATTORNEY','CLIENT','PARALEGAL')),
  recipientId TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  isRead INTEGER NOT NULL DEFAULT 0,
  readAt INTEGER,
  parentMessageId TEXT REFERENCES client_messages(id),
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  deletedAt INTEGER
);

CREATE INDEX IF NOT EXISTS idx_messages_tenant ON client_messages(tenantId);
CREATE INDEX IF NOT EXISTS idx_messages_case ON client_messages(tenantId, caseId);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON client_messages(tenantId, recipientId);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON client_messages(tenantId, recipientId, isRead);

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATION SCHEDULES (Migration 0012)
-- Blueprint Reference: Part 10.8 — Automated Reminders
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_schedules (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  entityType TEXT NOT NULL CHECK (entityType IN ('CASE','HEARING','INVOICE','TASK','NBA_PROFILE')),
  entityId TEXT NOT NULL,
  notificationType TEXT NOT NULL CHECK (notificationType IN ('HEARING_REMINDER','INVOICE_OVERDUE','TASK_DUE','RETAINER_LOW','CERTIFICATE_EXPIRY','COURT_DATE')),
  recipientPhone TEXT,
  recipientEmail TEXT,
  message TEXT NOT NULL,
  scheduledFor INTEGER NOT NULL,
  sentAt INTEGER,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','FAILED','CANCELLED')),
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_tenant ON notification_schedules(tenantId);
CREATE INDEX IF NOT EXISTS idx_notif_scheduled ON notification_schedules(tenantId, scheduledFor, status);
CREATE INDEX IF NOT EXISTS idx_notif_entity ON notification_schedules(tenantId, entityType, entityId);
`;
