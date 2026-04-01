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