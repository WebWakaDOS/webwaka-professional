/**
 * WebWaka Professional — Legal Practice UI
 * Blueprint Reference: Part 9.1 — Mobile First, PWA First, Offline First, Nigeria First, Africa First
 * Blueprint Reference: Part 10.8 — Legal Practice (Client management, case tracking, time billing, document management, NBA compliance)
 *
 * Mobile-first React UI with:
 * - Offline-first state management via Dexie + SyncManager
 * - i18n: English, Yoruba, Igbo, Hausa
 * - NGN/kobo monetary values
 * - WAT timezone display
 * - NBA compliance integration
 * - NDPR consent capture
 */

import React, { useState, useEffect, useCallback } from 'react';
import { apiCall as _apiCall } from './apiClient';
import type { Language, LegalTranslations } from './i18n';
import { getTranslations, getSupportedLanguages } from './i18n';
import { SyncManager } from '../../core/sync/client';
import {
  koboToNaira,
  nairaToKobo,
  formatDuration,
  formatWATDate,
  formatWATDateTime,
  validateNBABarNumber,
  validateYearOfCall,
  getNDPRConsentText,
  generateId,
  nowUTC
} from './utils';

// ─────────────────────────────────────────────────────────────────────────────
// STYLES — Mobile-first, Nigeria-inspired design
// Blueprint Reference: Part 9.1 — "Mobile First"
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  primary: '#1a472a',       // Deep Nigerian green
  primaryLight: '#2d6a4f',  // Medium green
  accent: '#52b788',        // Light green
  gold: '#d4a017',          // Nigerian gold
  white: '#ffffff',
  offWhite: '#f8f9fa',
  lightGray: '#e9ecef',
  gray: '#6c757d',
  darkGray: '#343a40',
  danger: '#dc3545',
  warning: '#ffc107',
  success: '#28a745',
  info: '#17a2b8',
  text: '#212529',
  border: '#dee2e6'
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '100vh',
    backgroundColor: COLORS.offWhite,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: '16px',
    color: COLORS.text,
    maxWidth: '100vw',
    overflowX: 'hidden' as const
  },
  header: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    padding: '0.75rem 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: 700,
    letterSpacing: '0.02em'
  },
  nav: {
    backgroundColor: COLORS.white,
    borderBottom: `1px solid ${COLORS.border}`,
    overflowX: 'auto' as const,
    display: 'flex',
    padding: '0 0.5rem'
  },
  navItem: (active: boolean) => ({
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    borderBottom: active ? `3px solid ${COLORS.primary}` : '3px solid transparent',
    color: active ? COLORS.primary : COLORS.gray,
    fontWeight: active ? 600 : 400,
    whiteSpace: 'nowrap' as const,
    fontSize: '0.9rem',
    transition: 'all 0.2s'
  }),
  main: {
    flex: 1,
    padding: '1rem',
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box' as const
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: `1px solid ${COLORS.border}`
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
    marginBottom: '1rem'
  },
  statCard: (color: string) => ({
    backgroundColor: color,
    borderRadius: '8px',
    padding: '1rem',
    color: COLORS.white,
    textAlign: 'center' as const
  }),
  statValue: {
    fontSize: '1.8rem',
    fontWeight: 700,
    margin: 0
  },
  statLabel: {
    fontSize: '0.8rem',
    opacity: 0.9,
    margin: '0.25rem 0 0 0'
  },
  btn: (variant: 'primary' | 'secondary' | 'danger' | 'success' | 'warning') => ({
    padding: '0.75rem 1.25rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.95rem',
    backgroundColor:
      variant === 'primary' ? COLORS.primary :
      variant === 'secondary' ? COLORS.lightGray :
      variant === 'danger' ? COLORS.danger :
      variant === 'success' ? COLORS.success :
      COLORS.warning,
    color: variant === 'secondary' ? COLORS.darkGray : COLORS.white,
    transition: 'opacity 0.2s',
    width: '100%',
    marginBottom: '0.5rem'
  }),
  input: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '6px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '1rem',
    backgroundColor: COLORS.white,
    boxSizing: 'border-box' as const,
    marginBottom: '0.75rem'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '6px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '1rem',
    backgroundColor: COLORS.white,
    boxSizing: 'border-box' as const,
    marginBottom: '0.75rem'
  },
  label: {
    display: 'block',
    fontWeight: 600,
    marginBottom: '0.25rem',
    fontSize: '0.9rem',
    color: COLORS.darkGray
  },
  badge: (color: string) => ({
    display: 'inline-block',
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    backgroundColor: color,
    color: COLORS.white
  }),
  offlineBanner: {
    backgroundColor: COLORS.warning,
    color: COLORS.darkGray,
    padding: '0.5rem 1rem',
    textAlign: 'center' as const,
    fontSize: '0.85rem',
    fontWeight: 600
  },
  listItem: {
    padding: '0.75rem',
    borderBottom: `1px solid ${COLORS.border}`,
    cursor: 'pointer',
    transition: 'background-color 0.1s'
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: COLORS.primary,
    margin: '0 0 0.75rem 0'
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '2rem',
    color: COLORS.gray
  },
  formGroup: {
    marginBottom: '1rem'
  },
  row: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap' as const
  },
  col: {
    flex: 1,
    minWidth: '140px'
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE COLORS
// ─────────────────────────────────────────────────────────────────────────────

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    INTAKE: COLORS.info,
    ACTIVE: COLORS.success,
    PENDING_COURT: COLORS.warning,
    ADJOURNED: '#6f42c1',
    SETTLED: COLORS.primary,
    WON: COLORS.success,
    LOST: COLORS.danger,
    WITHDRAWN: COLORS.gray,
    CLOSED: COLORS.darkGray,
    DRAFT: COLORS.gray,
    SENT: COLORS.info,
    PAID: COLORS.success,
    OVERDUE: COLORS.danger,
    CANCELLED: COLORS.darkGray
  };
  return map[status] ?? COLORS.gray;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type View =
  | 'dashboard' | 'clients' | 'cases' | 'time' | 'invoices'
  | 'nba' | 'trust' | 'tasks' | 'expenses' | 'intake'
  | 'templates' | 'messages' | 'analytics' | 'compliance';

interface DashboardStats {
  totalClients: number;
  activeCases: number;
  pendingInvoicesKobo: number;
  upcomingHearings: number;
  unbilledHoursMinutes: number;
}

interface Client {
  id: string;
  tenantId: string;
  fullName: string;
  clientType: 'INDIVIDUAL' | 'CORPORATE';
  phone: string;
  email?: string | null;
  address?: string | null;
  state?: string | null;
  retainerFeeKobo: number;
  preferredLanguage: string;
  ndprConsentAt: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

interface LegalCase {
  id: string;
  tenantId: string;
  caseReference: string;
  title: string;
  caseType: string;
  status: string;
  clientId: string;
  leadAttorneyId: string;
  courtName?: string | null;
  suitNumber?: string | null;
  filingDate?: number | null;
  nextHearingDate?: number | null;
  opposingParty?: string | null;
  agreedFeeKobo: number;
  currency: string;
  description?: string | null;
  version: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

interface TimeEntry {
  id: string;
  caseId: string;
  description: string;
  durationMinutes: number;
  hourlyRateKobo: number;
  amountKobo: number;
  invoiced: boolean;
  workDate: number;
  createdAt: number;
}

interface Invoice {
  id: string;
  caseId: string;
  clientId: string;
  invoiceNumber: string;
  status: string;
  subtotalKobo: number;
  vatKobo: number;
  totalKobo: number;
  currency: string;
  dueDate: number;
  paidAt: number | null;
  createdAt: number;
}

interface NBAProfile {
  id: string;
  fullName: string;
  barNumber: string;
  yearOfCall: number;
  callType: string;
  nbaBranch: string;
  lawSchool: string;
  llbUniversity: string;
  duesPaidYear: number;
  practicingCertificateExpiry?: number | null;
  isVerified: boolean;
  verifiedAt?: number | null;
}

interface TrustAccount {
  id: string;
  tenantId: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  description: string | null;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

interface TrustBalance {
  accountId: string;
  totalCreditsKobo: number;
  totalDebitsKobo: number;
  balanceKobo: number;
  transactionCount: number;
}

interface TrustAccountWithBalance extends TrustAccount {
  balance: TrustBalance;
}

interface TrustTxn {
  id: string;
  tenantId: string;
  accountId: string;
  transactionType: 'DEPOSIT' | 'DISBURSEMENT' | 'BANK_CHARGES' | 'INTEREST' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  direction: 'CREDIT' | 'DEBIT';
  amountKobo: number;
  description: string;
  clientId: string | null;
  caseId: string | null;
  reference: string;
  externalReference: string | null;
  recordedBy: string;
  transactionDate: number;
  createdAt: number;
}

interface MatterTask {
  id: string;
  caseId: string;
  title: string;
  description: string | null;
  assignedTo: string;
  assignedBy: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueDate: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

interface MatterExpense {
  id: string;
  caseId: string;
  category: string;
  description: string;
  amountKobo: number;
  currency: string;
  receiptUrl: string | null;
  recordedBy: string;
  expenseDate: number;
  invoiced: boolean;
  createdAt: number;
}

interface IntakeForm {
  id: string;
  title: string;
  description: string | null;
  fields: unknown[];
  isActive: boolean;
  createdAt: number;
}

interface IntakeSubmission {
  id: string;
  formId: string;
  submitterName: string;
  submitterEmail: string | null;
  submitterPhone: string | null;
  responses: string;
  status: string;
  createdAt: number;
}

interface DocTemplate {
  id: string;
  title: string;
  templateType: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: number;
}

interface ClientMessage {
  id: string;
  caseId: string;
  senderId: string;
  senderType: string;
  recipientId: string;
  subject: string | null;
  body: string;
  isRead: boolean;
  createdAt: number;
}

interface AttorneyAnalytic {
  attorneyId: string;
  totalMinutes: number;
  billableMinutes: number;
  totalBilledKobo: number;
  totalBilledNaira: number;
  billableHours: string;
  totalHours: string;
  utilizationRate: string;
  caseCount: number;
}

interface RevenueMonth {
  period: string;
  invoicedKobo: number;
  collectedKobo: number;
  outstandingKobo: number;
  invoicedNaira: number;
  collectedNaira: number;
  outstandingNaira: number;
  collectionRate: string;
  invoiceCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface LegalPracticeUIProps {
  tenantId: string;
  userId: string;
  apiBaseUrl: string;
  authToken: string;
  initialLanguage?: Language;
}

export const LegalPracticeUI: React.FC<LegalPracticeUIProps> = ({
  tenantId,
  userId,
  apiBaseUrl,
  authToken,
  initialLanguage = 'en'
}) => {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [t, setT] = useState<LegalTranslations>(getTranslations(initialLanguage));
  const [view, setView] = useState<View>('dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncManager] = useState(() => new SyncManager(tenantId, `${apiBaseUrl}/api/legal/sync`));

  // Data state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [nbaProfile, setNBAProfile] = useState<NBAProfile | null>(null);
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
  const [trustAccounts, setTrustAccounts] = useState<TrustAccount[]>([]);
  const [selectedTrustAccount, setSelectedTrustAccount] = useState<TrustAccountWithBalance | null>(null);
  const [trustTransactions, setTrustTransactions] = useState<TrustTxn[]>([]);
  const [trustBalance, setTrustBalance] = useState<TrustBalance | null>(null);

  // New feature state
  const [tasks, setTasks] = useState<MatterTask[]>([]);
  const [expenses, setExpenses] = useState<MatterExpense[]>([]);
  const [intakeForms, setIntakeForms] = useState<IntakeForm[]>([]);
  const [intakeSubmissions, setIntakeSubmissions] = useState<IntakeSubmission[]>([]);
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [attorneyAnalytics, setAttorneyAnalytics] = useState<AttorneyAnalytic[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueMonth[]>([]);
  const [complianceReport, setComplianceReport] = useState<Record<string, unknown> | null>(null);
  const [assembledDoc, setAssembledDoc] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DocTemplate | null>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [conflictResult, setConflictResult] = useState<Record<string, unknown> | null>(null);

  // Task form state
  const [taskForm, setTaskForm] = useState({ caseId: '', title: '', description: '', assignedTo: '', priority: 'MEDIUM', dueDate: '' });
  // Expense form state
  const [expenseForm, setExpenseForm] = useState({ caseId: '', category: 'FILING_FEE', description: '', amountNaira: '', receiptUrl: '', expenseDate: '' });
  // Intake form state
  const [intakeTab, setIntakeTab] = useState<'forms' | 'submissions'>('forms');
  const [intakeFormData, setIntakeFormData] = useState({ title: '', description: '' });
  // Template form state
  const [templateForm, setTemplateForm] = useState({ title: '', templateType: 'NDA', content: '', variables: '' });
  // Message state
  const [selectedCaseForMessages, setSelectedCaseForMessages] = useState<LegalCase | null>(null);
  const [msgBody, setMsgBody] = useState('');
  const [msgRecipient, setMsgRecipient] = useState('');
  // Compliance / conflict form state
  const [conflictForm, setConflictForm] = useState({ fullName: '', phone: '', email: '' });

  // Form state
  const [showForm, setShowForm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update translations when language changes
  useEffect(() => {
    setT(getTranslations(language));
  }, [language]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check pending sync count
  useEffect(() => {
    const checkPending = async () => {
      const count = await syncManager.getPendingCount();
      setPendingSyncCount(count);
    };
    const interval = setInterval(checkPending, 5000);
    void checkPending();
    return () => clearInterval(interval);
  }, [syncManager]);

  // API helper — wraps the extracted apiCall utility with component error state
  const apiCall = useCallback(async <T extends object | unknown[]>(path: string, options: RequestInit = {}): Promise<T | null> => {
    try {
      return await _apiCall<T>(apiBaseUrl, authToken, tenantId, path, options as import('./apiClient').ApiCallOptions);
    } catch (err) {
      if (!isOnline) return null;
      setError(err instanceof Error ? err.message : 'Network error');
      return null;
    }
  }, [apiBaseUrl, authToken, tenantId, isOnline]);

  // Load data based on current view
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (view === 'dashboard') {
          const data = await apiCall<DashboardStats>('/api/legal/dashboard');
          if (data) setStats(data);
        } else if (view === 'clients') {
          const data = await apiCall<Client[]>('/api/legal/clients');
          if (data) setClients(data);
        } else if (view === 'cases') {
          const data = await apiCall<LegalCase[]>('/api/legal/cases');
          if (data) setCases(data);
        } else if (view === 'invoices') {
          const data = await apiCall<Invoice[]>('/api/legal/invoices');
          if (data) setInvoices(data);
        } else if (view === 'nba') {
          const data = await apiCall<NBAProfile>('/api/legal/nba/profile');
          if (data) setNBAProfile(data);
        } else if (view === 'trust') {
          const data = await apiCall<TrustAccount[]>('/api/legal/trust-accounts');
          if (data) setTrustAccounts(data);
          setSelectedTrustAccount(null);
          setTrustTransactions([]);
          setTrustBalance(null);
        } else if (view === 'tasks') {
          const data = await apiCall<MatterTask[]>('/api/legal/tasks');
          if (data) setTasks(data);
        } else if (view === 'expenses') {
          const data = await apiCall<MatterExpense[]>('/api/legal/expenses');
          if (data) setExpenses(data);
        } else if (view === 'intake') {
          const [forms, subs] = await Promise.all([
            apiCall<IntakeForm[]>('/api/legal/intake/forms'),
            apiCall<IntakeSubmission[]>('/api/legal/intake/submissions')
          ]);
          if (forms) setIntakeForms(forms);
          if (subs) setIntakeSubmissions(subs);
        } else if (view === 'templates') {
          const data = await apiCall<DocTemplate[]>('/api/legal/templates');
          if (data) setTemplates(data);
          setAssembledDoc(null);
          setSelectedTemplate(null);
        } else if (view === 'messages') {
          if (cases.length === 0) {
            const casesData = await apiCall<LegalCase[]>('/api/legal/cases');
            if (casesData) setCases(casesData);
          }
          const count = await apiCall<{ unreadCount: number }>('/api/legal/messages/unread');
          if (count) setUnreadMessages(count.unreadCount);
        } else if (view === 'analytics') {
          const [atty, revenue] = await Promise.all([
            apiCall<{ attorneys: AttorneyAnalytic[] }>('/api/legal/analytics/attorneys'),
            apiCall<{ months: RevenueMonth[] }>('/api/legal/analytics/revenue')
          ]);
          if (atty) setAttorneyAnalytics(atty.attorneys);
          if (revenue) setRevenueData(revenue.months);
        } else if (view === 'compliance') {
          const data = await apiCall<Record<string, unknown>>('/api/legal/compliance/report');
          if (data) setComplianceReport(data);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [view, apiCall]);

  // Load time entries when a case is selected
  useEffect(() => {
    if (selectedCase && view === 'time') {
      const load = async () => {
        const data = await apiCall<TimeEntry[]>(`/api/legal/cases/${selectedCase.id}/time-entries`);
        if (data) setTimeEntries(data);
      };
      void load();
    }
  }, [selectedCase, view, apiCall]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const renderOfflineBanner = () => {
    if (isOnline && pendingSyncCount === 0) return null;
    return (
      <div style={styles.offlineBanner}>
        {!isOnline
          ? `⚡ ${t.common.offline} — ${t.common.offlineMessage}`
          : `🔄 ${pendingSyncCount} ${t.common.syncPendingMessage}`
        }
      </div>
    );
  };

  const renderHeader = () => (
    <header style={styles.header}>
      <h1 style={styles.headerTitle}>⚖️ WebWaka Legal</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          style={{
            backgroundColor: 'transparent',
            color: COLORS.white,
            border: `1px solid rgba(255,255,255,0.4)`,
            borderRadius: '4px',
            padding: '0.25rem 0.5rem',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          {getSupportedLanguages().map(lang => (
            <option key={lang.code} value={lang.code} style={{ color: COLORS.text, backgroundColor: COLORS.white }}>
              {lang.nativeName}
            </option>
          ))}
        </select>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          backgroundColor: isOnline ? COLORS.success : COLORS.danger
        }} title={isOnline ? 'Online' : 'Offline'} />
      </div>
    </header>
  );

  const renderNav = () => {
    const navItems: Array<{ key: View; label: string }> = [
      { key: 'dashboard', label: t.nav.dashboard },
      { key: 'clients', label: t.nav.clients },
      { key: 'cases', label: t.nav.cases },
      { key: 'time', label: t.nav.timeEntries },
      { key: 'invoices', label: t.nav.invoices },
      { key: 'tasks', label: 'Tasks' },
      { key: 'expenses', label: 'Expenses' },
      { key: 'intake', label: 'Intake' },
      { key: 'templates', label: 'Templates' },
      { key: 'messages', label: `Messages${unreadMessages > 0 ? ` (${unreadMessages})` : ''}` },
      { key: 'analytics', label: 'Analytics' },
      { key: 'compliance', label: 'Compliance' },
      { key: 'nba', label: t.nav.nbaCompliance },
      { key: 'trust', label: t.nav.trustAccounts }
    ];
    return (
      <nav style={styles.nav}>
        {navItems.map(item => (
          <div
            key={item.key}
            style={styles.navItem(view === item.key)}
            onClick={() => { setView(item.key); setShowForm(null); setError(null); }}
          >
            {item.label}
          </div>
        ))}
      </nav>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD VIEW
  // ─────────────────────────────────────────────────────────────────────────

  const renderDashboard = () => (
    <div>
      <h2 style={styles.sectionTitle}>{t.dashboard.title}</h2>
      {stats && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard(COLORS.primary)}>
            <p style={styles.statValue}>{stats.totalClients}</p>
            <p style={styles.statLabel}>{t.dashboard.totalClients}</p>
          </div>
          <div style={styles.statCard(COLORS.primaryLight)}>
            <p style={styles.statValue}>{stats.activeCases}</p>
            <p style={styles.statLabel}>{t.dashboard.activeCases}</p>
          </div>
          <div style={styles.statCard(COLORS.gold)}>
            <p style={styles.statValue}>{koboToNaira(stats.pendingInvoicesKobo)}</p>
            <p style={styles.statLabel}>{t.dashboard.pendingInvoices}</p>
          </div>
          <div style={styles.statCard(COLORS.info)}>
            <p style={styles.statValue}>{stats.upcomingHearings}</p>
            <p style={styles.statLabel}>{t.dashboard.upcomingHearings}</p>
          </div>
        </div>
      )}
      {!stats && !loading && (
        <div style={styles.statsGrid}>
          {[COLORS.primary, COLORS.primaryLight, COLORS.gold, COLORS.info].map((color, i) => (
            <div key={i} style={{ ...styles.statCard(color), opacity: 0.5 }}>
              <p style={styles.statValue}>—</p>
              <p style={styles.statLabel}>Loading...</p>
            </div>
          ))}
        </div>
      )}

      <div style={styles.card}>
        <h3 style={{ ...styles.sectionTitle, marginBottom: '0.75rem' }}>{t.dashboard.quickActions}</h3>
        <div style={styles.row}>
          <button style={{ ...styles.btn('primary'), flex: 1 }} onClick={() => { setView('clients'); setShowForm('client'); }}>
            + {t.dashboard.newClient}
          </button>
          <button style={{ ...styles.btn('secondary'), flex: 1 }} onClick={() => { setView('cases'); setShowForm('case'); }}>
            + {t.dashboard.newCase}
          </button>
        </div>
        <div style={styles.row}>
          <button style={{ ...styles.btn('success'), flex: 1 }} onClick={() => setView('time')}>
            ⏱ {t.dashboard.logTime}
          </button>
          <button style={{ ...styles.btn('warning'), flex: 1 }} onClick={() => setView('invoices')}>
            📄 {t.dashboard.createInvoice}
          </button>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CLIENTS VIEW
  // ─────────────────────────────────────────────────────────────────────────

  const renderClientForm = () => {
    const [form, setForm] = useState({
      fullName: '', clientType: 'INDIVIDUAL', phone: '', email: '',
      address: '', state: 'Lagos', retainerFeeNaira: '', preferredLanguage: language,
      ndprConsent: false
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.ndprConsent) {
        setError('NDPR consent is required');
        return;
      }
      setLoading(true);
      try {
        const payload = {
          fullName: form.fullName,
          clientType: form.clientType,
          phone: form.phone,
          email: form.email || null,
          address: form.address || null,
          state: form.state,
          retainerFeeKobo: nairaToKobo(parseFloat(form.retainerFeeNaira) || 0),
          preferredLanguage: form.preferredLanguage,
          currency: 'NGN'
        };

        if (!isOnline) {
          // Queue for offline sync — CORE-1
          const offlineClient = {
            id: generateId('cli'),
            tenantId,
            ...payload,
            ndprConsentAt: nowUTC(),
            createdAt: nowUTC(),
            updatedAt: nowUTC(),
            deletedAt: null
          };
          await syncManager.queueMutation('legal_client', offlineClient.id, 'CREATE', offlineClient, 1);
          setClients(prev => [offlineClient as Client, ...prev]);
        } else {
          const created = await apiCall<Client>('/api/legal/clients', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          if (created) setClients(prev => [created, ...prev]);
        }
        setShowForm(null);
      } finally {
        setLoading(false);
      }
    };

    const nigerianStates = [
      'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
      'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
      'Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
      'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
      'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
    ];

    return (
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>{t.clients.newClient}</h3>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t.clients.fullName} *</label>
            <input style={styles.input} required value={form.fullName}
              onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t.clients.clientType}</label>
            <select style={styles.select} value={form.clientType}
              onChange={e => setForm(p => ({ ...p, clientType: e.target.value }))}>
              <option value="INDIVIDUAL">{t.clients.individual}</option>
              <option value="CORPORATE">{t.clients.corporate}</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t.clients.phone} *</label>
            <input style={styles.input} required type="tel" value={form.phone}
              placeholder="+234 xxx xxx xxxx"
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t.clients.email}</label>
            <input style={styles.input} type="email" value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t.clients.state}</label>
            <select style={styles.select} value={form.state}
              onChange={e => setForm(p => ({ ...p, state: e.target.value }))}>
              {nigerianStates.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t.clients.retainerFee}</label>
            <input style={styles.input} type="number" min="0" step="0.01" value={form.retainerFeeNaira}
              placeholder="0.00"
              onChange={e => setForm(p => ({ ...p, retainerFeeNaira: e.target.value }))} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t.clients.preferredLanguage}</label>
            <select style={styles.select} value={form.preferredLanguage}
              onChange={e => setForm(p => ({ ...p, preferredLanguage: e.target.value as Language }))}>
              {getSupportedLanguages().map(l => (
                <option key={l.code} value={l.code}>{l.nativeName}</option>
              ))}
            </select>
          </div>
          {/* NDPR Consent — Nigeria First, Part 9.1 */}
          <div style={{ ...styles.formGroup, backgroundColor: '#fff3cd', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ffc107' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: COLORS.darkGray }}>
              {getNDPRConsentText(language)}
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.ndprConsent}
                onChange={e => setForm(p => ({ ...p, ndprConsent: e.target.checked }))} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t.clients.ndprConsentText}</span>
            </label>
          </div>
          {error && <p style={{ color: COLORS.danger, marginBottom: '0.5rem' }}>{error}</p>}
          <div style={styles.row}>
            <button type="submit" style={{ ...styles.btn('primary'), flex: 2 }} disabled={loading}>
              {loading ? t.common.loading : t.clients.save}
            </button>
            <button type="button" style={{ ...styles.btn('secondary'), flex: 1 }} onClick={() => setShowForm(null)}>
              {t.common.cancel}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderClients = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={styles.sectionTitle}>{t.clients.title}</h2>
        <button style={{ ...styles.btn('primary'), width: 'auto', marginBottom: 0, padding: '0.5rem 1rem' }}
          onClick={() => setShowForm('client')}>
          + {t.clients.newClient}
        </button>
      </div>
      {showForm === 'client' && renderClientForm()}
      {loading && <p style={{ textAlign: 'center', color: COLORS.gray }}>{t.common.loading}</p>}
      {!loading && clients.length === 0 && (
        <div style={styles.emptyState}>
          <p>👥</p>
          <p>{t.clients.noClients}</p>
        </div>
      )}
      {clients.map(client => (
        <div key={client.id} style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem' }}>{client.fullName}</h3>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: COLORS.gray }}>{client.phone}</p>
              {client.email && <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: COLORS.gray }}>{client.email}</p>}
              <p style={{ margin: '0', fontSize: '0.8rem', color: COLORS.gray }}>
                {client.state} · {formatWATDate(client.createdAt, { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={styles.badge(client.clientType === 'CORPORATE' ? COLORS.primary : COLORS.info)}>
                {client.clientType === 'CORPORATE' ? t.clients.corporate : t.clients.individual}
              </span>
              {client.retainerFeeKobo > 0 && (
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', fontWeight: 600, color: COLORS.gold }}>
                  {koboToNaira(client.retainerFeeKobo)}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CASES VIEW
  // ─────────────────────────────────────────────────────────────────────────

  const renderCases = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={styles.sectionTitle}>{t.cases.title}</h2>
        <button style={{ ...styles.btn('primary'), width: 'auto', marginBottom: 0, padding: '0.5rem 1rem' }}
          onClick={() => setShowForm('case')}>
          + {t.cases.newCase}
        </button>
      </div>
      {loading && <p style={{ textAlign: 'center', color: COLORS.gray }}>{t.common.loading}</p>}
      {!loading && cases.length === 0 && (
        <div style={styles.emptyState}>
          <p>⚖️</p>
          <p>{t.cases.noCases}</p>
        </div>
      )}
      {cases.map(c => (
        <div key={c.id} style={{ ...styles.card, cursor: 'pointer' }}
          onClick={() => { setSelectedCase(c); setView('time'); }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.primary }}>{c.caseReference}</span>
                <span style={styles.badge(getStatusColor(c.status))}>
                  {t.cases[`status${c.status.charAt(0) + c.status.slice(1).toLowerCase().replace(/_([a-z])/g, (_, l) => l.toUpperCase())}` as keyof typeof t.cases] as string || c.status}
                </span>
              </div>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem' }}>{c.title}</h3>
              {c.courtName && <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: COLORS.gray }}>{c.courtName}</p>}
              {c.nextHearingDate && (
                <p style={{ margin: '0', fontSize: '0.8rem', color: COLORS.warning, fontWeight: 600 }}>
                  📅 {formatWATDate(c.nextHearingDate, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
            <div style={{ textAlign: 'right', marginLeft: '0.5rem' }}>
              <p style={{ margin: '0', fontSize: '0.85rem', fontWeight: 600, color: COLORS.gold }}>
                {koboToNaira(c.agreedFeeKobo)}
              </p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: COLORS.gray }}>{c.caseType}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TIME ENTRIES VIEW
  // ─────────────────────────────────────────────────────────────────────────

  const renderTimeEntries = () => {
    const [form, setForm] = useState({
      description: '', durationHours: '0', durationMinutes: '30',
      hourlyRateNaira: '50000', workDate: new Date().toISOString().split('T')[0] ?? ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCase) return;
      setLoading(true);
      try {
        const durationMinutes = parseInt(form.durationHours) * 60 + parseInt(form.durationMinutes);
        const hourlyRateKobo = nairaToKobo(parseFloat(form.hourlyRateNaira));
        const workDate = new Date(form.workDate).getTime();

        const payload = { description: form.description, durationMinutes, hourlyRateKobo, workDate };

        if (!isOnline) {
          const entry: TimeEntry = {
            id: generateId('ent'),
            caseId: selectedCase.id,
            ...payload,
            amountKobo: Math.round((durationMinutes / 60) * hourlyRateKobo),
            invoiced: false,
            createdAt: nowUTC()
          };
          await syncManager.queueMutation('legal_time_entry', entry.id, 'CREATE', { ...entry, tenantId, attorneyId: userId, updatedAt: nowUTC(), deletedAt: null, invoiceId: null }, 1);
          setTimeEntries(prev => [entry, ...prev]);
        } else {
          const created = await apiCall<TimeEntry>(
            `/api/legal/cases/${selectedCase.id}/time-entries`,
            { method: 'POST', body: JSON.stringify(payload) }
          );
          if (created) setTimeEntries(prev => [created, ...prev]);
        }
        setShowForm(null);
      } finally {
        setLoading(false);
      }
    };

    const totalUnbilled = timeEntries.filter(e => !e.invoiced).reduce((s, e) => s + e.amountKobo, 0);
    const totalUnbilledMinutes = timeEntries.filter(e => !e.invoiced).reduce((s, e) => s + e.durationMinutes, 0);

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <button style={{ ...styles.btn('secondary'), width: 'auto', marginBottom: 0, padding: '0.4rem 0.75rem' }}
            onClick={() => { setView('cases'); setSelectedCase(null); }}>
            ← {t.common.back}
          </button>
          <h2 style={{ ...styles.sectionTitle, margin: 0 }}>
            {t.nav.timeEntries} {selectedCase ? `— ${selectedCase.caseReference}` : ''}
          </h2>
        </div>

        {selectedCase && (
          <div style={{ ...styles.card, backgroundColor: '#e8f5e9', borderColor: COLORS.accent }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{selectedCase.title}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: COLORS.gray }}>{t.timeEntries.totalUnbilled}</span>
              <span style={{ fontWeight: 700, color: COLORS.primary }}>{koboToNaira(totalUnbilled)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: COLORS.gray }}>{t.dashboard.unbilledHours}</span>
              <span style={{ fontWeight: 600 }}>{formatDuration(totalUnbilledMinutes)}</span>
            </div>
          </div>
        )}

        <button style={styles.btn('primary')} onClick={() => setShowForm('time')}>
          + {t.timeEntries.logTime}
        </button>

        {showForm === 'time' && selectedCase && (
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>{t.timeEntries.logTime}</h3>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>{t.timeEntries.description} *</label>
                <input style={styles.input} required value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>{t.timeEntries.hours}</label>
                  <input style={styles.input} type="number" min="0" max="24" value={form.durationHours}
                    onChange={e => setForm(p => ({ ...p, durationHours: e.target.value }))} />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>{t.timeEntries.minutes}</label>
                  <select style={styles.select} value={form.durationMinutes}
                    onChange={e => setForm(p => ({ ...p, durationMinutes: e.target.value }))}>
                    {[0, 15, 30, 45].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>{t.timeEntries.hourlyRate}</label>
                <input style={styles.input} type="number" min="0" step="0.01" value={form.hourlyRateNaira}
                  onChange={e => setForm(p => ({ ...p, hourlyRateNaira: e.target.value }))} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>{t.timeEntries.workDate}</label>
                <input style={styles.input} type="date" value={form.workDate}
                  onChange={e => setForm(p => ({ ...p, workDate: e.target.value }))} />
              </div>
              <div style={styles.row}>
                <button type="submit" style={{ ...styles.btn('primary'), flex: 2 }} disabled={loading}>
                  {loading ? t.common.loading : t.timeEntries.logTime}
                </button>
                <button type="button" style={{ ...styles.btn('secondary'), flex: 1 }} onClick={() => setShowForm(null)}>
                  {t.common.cancel}
                </button>
              </div>
            </form>
          </div>
        )}

        {timeEntries.length === 0 && !loading && (
          <div style={styles.emptyState}><p>⏱</p><p>{t.timeEntries.noEntries}</p></div>
        )}
        {timeEntries.map(entry => (
          <div key={entry.id} style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600 }}>{entry.description}</p>
                <p style={{ margin: '0', fontSize: '0.85rem', color: COLORS.gray }}>
                  {formatDuration(entry.durationMinutes)} · {formatWATDate(entry.workDate, { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0', fontWeight: 700, color: COLORS.primary }}>{koboToNaira(entry.amountKobo)}</p>
                <span style={styles.badge(entry.invoiced ? COLORS.success : COLORS.warning)}>
                  {entry.invoiced ? t.timeEntries.invoiced : t.timeEntries.unbilled}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // INVOICES VIEW
  // ─────────────────────────────────────────────────────────────────────────

  const renderInvoices = () => (
    <div>
      <h2 style={styles.sectionTitle}>{t.invoices.title}</h2>
      {loading && <p style={{ textAlign: 'center', color: COLORS.gray }}>{t.common.loading}</p>}
      {!loading && invoices.length === 0 && (
        <div style={styles.emptyState}><p>📄</p><p>{t.invoices.noInvoices}</p></div>
      )}
      {invoices.map(inv => (
        <div key={inv.id} style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: '0 0 0.25rem 0', fontWeight: 700, fontSize: '0.95rem' }}>{inv.invoiceNumber}</p>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: COLORS.gray }}>
                {t.invoices.dueDate}: {formatWATDate(inv.dueDate, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              {inv.paidAt && (
                <p style={{ margin: '0', fontSize: '0.8rem', color: COLORS.success }}>
                  ✓ {t.invoices.paid}: {formatWATDate(inv.paidAt, { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={styles.badge(getStatusColor(inv.status))}>
                {t.invoices[inv.status.toLowerCase() as keyof typeof t.invoices] as string || inv.status}
              </span>
              <p style={{ margin: '0.25rem 0 0 0', fontWeight: 700, color: COLORS.primary }}>
                {koboToNaira(inv.totalKobo)}
              </p>
              <p style={{ margin: '0', fontSize: '0.75rem', color: COLORS.gray }}>
                {t.invoices.vat}: {koboToNaira(inv.vatKobo)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // NBA COMPLIANCE VIEW
  // ─────────────────────────────────────────────────────────────────────────

  const renderNBA = () => {
    const [form, setForm] = useState({
      fullName: '', barNumber: '', yearOfCall: new Date().getFullYear() - 5,
      callType: 'NIGERIAN_BAR', nbaBranch: 'Lagos', lawSchool: 'Nigerian Law School',
      llbUniversity: '', duesPaidYear: new Date().getFullYear()
    });
    const [barError, setBarError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const barValidation = validateNBABarNumber(form.barNumber);
      if (!barValidation.valid) {
        setBarError(barValidation.error ?? 'Invalid bar number');
        return;
      }
      const yearValidation = validateYearOfCall(form.yearOfCall);
      if (!yearValidation.valid) {
        setBarError(yearValidation.error ?? 'Invalid year of call');
        return;
      }
      setBarError(null);
      setLoading(true);
      try {
        const created = await apiCall<NBAProfile>('/api/legal/nba/profile', {
          method: 'POST',
          body: JSON.stringify(form)
        });
        if (created) setNBAProfile(created);
      } finally {
        setLoading(false);
      }
    };

    if (nbaProfile) {
      return (
        <div>
          <h2 style={styles.sectionTitle}>{t.nba.title}</h2>
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{nbaProfile.fullName}</h3>
              <span style={styles.badge(nbaProfile.isVerified ? COLORS.success : COLORS.warning)}>
                {nbaProfile.isVerified ? `✓ ${t.nba.verified}` : t.nba.unverified}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
              <div><strong>{t.nba.barNumber}:</strong><br />{nbaProfile.barNumber}</div>
              <div><strong>{t.nba.yearOfCall}:</strong><br />{nbaProfile.yearOfCall}</div>
              <div><strong>{t.nba.nbaBranch}:</strong><br />{nbaProfile.nbaBranch}</div>
              <div><strong>{t.nba.lawSchool}:</strong><br />{nbaProfile.lawSchool}</div>
              <div><strong>{t.nba.llbUniversity}:</strong><br />{nbaProfile.llbUniversity}</div>
              <div><strong>{t.nba.duesPaidYear}:</strong><br />{nbaProfile.duesPaidYear}</div>
            </div>
            {nbaProfile.verifiedAt && (
              <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.8rem', color: COLORS.success }}>
                ✓ {t.nba.verified}: {formatWATDateTime(nbaProfile.verifiedAt)}
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div>
        <h2 style={styles.sectionTitle}>{t.nba.title}</h2>
        <div style={styles.emptyState}>
          <p>⚖️</p>
          <p>{t.nba.noProfile}</p>
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>{t.nba.registerProfile}</h3>
          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t.clients.fullName} *</label>
              <input style={styles.input} required value={form.fullName}
                onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t.nba.barNumber} *</label>
              <input style={styles.input} required value={form.barNumber}
                placeholder="NBA/LAG/2015/001234"
                onChange={e => { setForm(p => ({ ...p, barNumber: e.target.value })); setBarError(null); }} />
              <p style={{ margin: '0', fontSize: '0.8rem', color: COLORS.gray }}>{t.nba.barNumberHelp}</p>
              {barError && <p style={{ margin: '0.25rem 0 0 0', color: COLORS.danger, fontSize: '0.85rem' }}>{barError}</p>}
            </div>
            <div style={styles.row}>
              <div style={styles.col}>
                <label style={styles.label}>{t.nba.yearOfCall} *</label>
                <input style={styles.input} type="number" min="1963" max={new Date().getFullYear()}
                  value={form.yearOfCall}
                  onChange={e => setForm(p => ({ ...p, yearOfCall: parseInt(e.target.value) }))} />
              </div>
              <div style={styles.col}>
                <label style={styles.label}>{t.nba.duesPaidYear}</label>
                <input style={styles.input} type="number" min="1963" max={new Date().getFullYear()}
                  value={form.duesPaidYear}
                  onChange={e => setForm(p => ({ ...p, duesPaidYear: parseInt(e.target.value) }))} />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t.nba.nbaBranch}</label>
              <input style={styles.input} value={form.nbaBranch}
                onChange={e => setForm(p => ({ ...p, nbaBranch: e.target.value }))} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t.nba.lawSchool}</label>
              <input style={styles.input} value={form.lawSchool}
                onChange={e => setForm(p => ({ ...p, lawSchool: e.target.value }))} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t.nba.llbUniversity} *</label>
              <input style={styles.input} required value={form.llbUniversity}
                onChange={e => setForm(p => ({ ...p, llbUniversity: e.target.value }))} />
            </div>
            {error && <p style={{ color: COLORS.danger }}>{error}</p>}
            <button type="submit" style={styles.btn('primary')} disabled={loading}>
              {loading ? t.common.loading : t.nba.registerProfile}
            </button>
          </form>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // TRUST ACCOUNT LEDGER VIEW — NBA Rule 23 Compliance
  // Blueprint Reference: Part 10.8 — NBA Trust Account Ledger
  // INVARIANT: No edit or delete actions are exposed. Reversing entries only.
  // ─────────────────────────────────────────────────────────────────────────

  const renderTrust = () => {
    const TRANSACTION_TYPE_LABELS: Record<TrustTxn['transactionType'], string> = {
      DEPOSIT: t.trust.deposit,
      DISBURSEMENT: t.trust.disbursement,
      BANK_CHARGES: t.trust.bankCharges,
      INTEREST: t.trust.interest,
      TRANSFER_IN: t.trust.transferIn,
      TRANSFER_OUT: t.trust.transferOut
    };

    const loadAccountDetail = async (account: TrustAccount) => {
      setLoading(true);
      try {
        const data = await apiCall<{ account: TrustAccountWithBalance; transactions: TrustTxn[]; balance: TrustBalance }>(
          `/api/legal/trust-accounts/${account.id}/transactions`
        );
        if (data) {
          setSelectedTrustAccount(data.account);
          setTrustTransactions(data.transactions);
          setTrustBalance(data.balance);
        }
      } finally {
        setLoading(false);
      }
    };

    // ── Transaction detail / audit log ──────────────────────────────────────
    if (selectedTrustAccount) {
      const bal = trustBalance;
      return (
        <div>
          <button
            style={{ ...styles.btn('secondary'), marginBottom: '1rem' }}
            onClick={() => { setSelectedTrustAccount(null); setTrustTransactions([]); setTrustBalance(null); }}
          >
            ← {t.trust.backToAccounts}
          </button>

          {/* Account Summary Card */}
          <div style={{ backgroundColor: COLORS.primary, color: COLORS.white, borderRadius: '8px', padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{selectedTrustAccount.accountName}</h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', opacity: 0.8 }}>
                  {selectedTrustAccount.bankName} • {selectedTrustAccount.accountNumber}
                </p>
              </div>
              <span style={{
                backgroundColor: selectedTrustAccount.isActive ? COLORS.success : COLORS.gray,
                color: COLORS.white, padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem'
              }}>
                {selectedTrustAccount.isActive ? t.trust.activeAccount : t.trust.closedAccount}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.75 }}>{t.trust.totalCredits}</p>
                <p style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: '#90ee90' }}>
                  {bal ? koboToNaira(bal.totalCreditsKobo) : '—'}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.75 }}>{t.trust.totalDebits}</p>
                <p style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: '#ffb3b3' }}>
                  {bal ? koboToNaira(bal.totalDebitsKobo) : '—'}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.75 }}>{t.trust.balance}</p>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {bal ? koboToNaira(bal.balanceKobo) : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Immutability notice */}
          <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#856404' }}>
            🔒 {t.trust.immutableNote}
          </div>

          {/* Record new transaction */}
          {selectedTrustAccount.isActive && (
            <div style={{ marginBottom: '1.25rem' }}>
              {showForm === 'trust-txn' ? (
                <div style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '1rem' }}>
                  <h3 style={{ ...styles.sectionTitle, marginTop: 0 }}>{t.trust.newTransaction}</h3>
                  <form onSubmit={async e => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const amountNaira = parseFloat(fd.get('amount') as string);
                    const body = {
                      transactionType: fd.get('transactionType') as TrustTxn['transactionType'],
                      amountKobo: nairaToKobo(amountNaira),
                      description: fd.get('description') as string,
                      externalReference: (fd.get('externalReference') as string) || undefined,
                      transactionDate: new Date(fd.get('transactionDate') as string).getTime()
                    };
                    setLoading(true);
                    setError(null);
                    try {
                      const result = await apiCall<{ transaction: TrustTxn; balance: TrustBalance }>(
                        `/api/legal/trust-accounts/${selectedTrustAccount.id}/transactions`,
                        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
                      );
                      if (result) {
                        setTrustBalance(result.balance);
                        setTrustTransactions(prev => [result.transaction, ...prev]);
                        setShowForm(null);
                      }
                    } finally {
                      setLoading(false);
                    }
                  }}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>{t.trust.transactionType} *</label>
                      <select name="transactionType" style={styles.input} required>
                        <option value="DEPOSIT">{t.trust.deposit}</option>
                        <option value="DISBURSEMENT">{t.trust.disbursement}</option>
                        <option value="BANK_CHARGES">{t.trust.bankCharges}</option>
                        <option value="INTEREST">{t.trust.interest}</option>
                        <option value="TRANSFER_IN">{t.trust.transferIn}</option>
                        <option value="TRANSFER_OUT">{t.trust.transferOut}</option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>{t.trust.amount} *</label>
                      <input name="amount" type="number" min="0.01" step="0.01" style={styles.input} required />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>{t.trust.transactionDate} *</label>
                      <input name="transactionDate" type="date" style={styles.input} required
                        defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>{t.common.save} — {t.trust.description}</label>
                      <input name="description" type="text" style={styles.input} required
                        placeholder="e.g. Court filing fees for Suit No. FHC/ABJ/2026/100" />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>{t.trust.externalReference}</label>
                      <input name="externalReference" type="text" style={styles.input}
                        placeholder="e.g. Bank teller number / transfer ref" />
                    </div>
                    {error && <p style={{ color: COLORS.danger }}>{error}</p>}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" style={styles.btn('primary')} disabled={loading}>
                        {loading ? t.common.loading : t.trust.newTransaction}
                      </button>
                      <button type="button" style={styles.btn('secondary')} onClick={() => setShowForm(null)}>
                        {t.common.cancel}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <button style={styles.btn('primary')} onClick={() => setShowForm('trust-txn')}>
                  + {t.trust.newTransaction}
                </button>
              )}
            </div>
          )}

          {/* Transaction audit log */}
          <h3 style={styles.sectionTitle}>{t.trust.auditLog} ({bal?.transactionCount ?? 0})</h3>
          {trustTransactions.length === 0 ? (
            <p style={{ color: COLORS.gray }}>{t.trust.noTransactions}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {trustTransactions.map(txn => (
                <div key={txn.id} style={{
                  backgroundColor: COLORS.white,
                  border: `1px solid ${COLORS.border}`,
                  borderLeft: `4px solid ${txn.direction === 'CREDIT' ? COLORS.success : COLORS.danger}`,
                  borderRadius: '6px',
                  padding: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {TRANSACTION_TYPE_LABELS[txn.transactionType]}
                      </span>
                      <span style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.75rem',
                        color: txn.direction === 'CREDIT' ? COLORS.success : COLORS.danger,
                        fontWeight: 600
                      }}>
                        {txn.direction === 'CREDIT' ? '▲' : '▼'} {txn.direction === 'CREDIT' ? t.trust.credit : t.trust.debit}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: txn.direction === 'CREDIT' ? COLORS.success : COLORS.danger }}>
                      {txn.direction === 'CREDIT' ? '+' : '-'}{koboToNaira(txn.amountKobo)}
                    </span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: COLORS.darkGray }}>{txn.description}</p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', fontSize: '0.75rem', color: COLORS.gray }}>
                    <span>📅 {formatWATDate(txn.transactionDate)}</span>
                    <span>🔖 {txn.reference}</span>
                    {txn.externalReference && <span>🏦 {txn.externalReference}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // ── Account list view ────────────────────────────────────────────────────
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={styles.sectionTitle}>{t.trust.title}</h2>
        </div>

        {/* NBA Rule 23 notice */}
        <div style={{ backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#155724' }}>
          ⚖️ {t.trust.rule23Note}
        </div>

        {/* Create account form */}
        {showForm === 'trust-account' ? (
          <div style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
            <h3 style={{ ...styles.sectionTitle, marginTop: 0 }}>{t.trust.newAccount}</h3>
            <form onSubmit={async e => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const body = {
                accountName: fd.get('accountName') as string,
                bankName: fd.get('bankName') as string,
                accountNumber: fd.get('accountNumber') as string,
                description: (fd.get('description') as string) || undefined
              };
              setLoading(true);
              setError(null);
              try {
                const result = await apiCall<TrustAccount>(
                  '/api/legal/trust-accounts',
                  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
                );
                if (result) {
                  setTrustAccounts(prev => [result, ...prev]);
                  setShowForm(null);
                }
              } finally {
                setLoading(false);
              }
            }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>{t.trust.accountName} *</label>
                <input name="accountName" type="text" style={styles.input} required
                  placeholder="e.g. Commercial Litigation Trust Account" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>{t.trust.bankName} *</label>
                <input name="bankName" type="text" style={styles.input} required
                  placeholder="e.g. First Bank Nigeria" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>{t.trust.accountNumber} *</label>
                <input name="accountNumber" type="text" style={styles.input} required
                  placeholder="10-digit account number" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>{t.trust.description}</label>
                <input name="description" type="text" style={styles.input}
                  placeholder="Optional description" />
              </div>
              {error && <p style={{ color: COLORS.danger }}>{error}</p>}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" style={styles.btn('primary')} disabled={loading}>
                  {loading ? t.common.loading : t.trust.newAccount}
                </button>
                <button type="button" style={styles.btn('secondary')} onClick={() => setShowForm(null)}>
                  {t.common.cancel}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button style={{ ...styles.btn('primary'), marginBottom: '1rem' }} onClick={() => setShowForm('trust-account')}>
            + {t.trust.newAccount}
          </button>
        )}

        {loading && <p style={{ color: COLORS.gray }}>{t.common.loading}</p>}

        {trustAccounts.length === 0 && !loading ? (
          <p style={{ color: COLORS.gray }}>{t.trust.noAccounts}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {trustAccounts.map(account => (
              <div
                key={account.id}
                onClick={() => { void loadAccountDetail(account); }}
                style={{
                  backgroundColor: COLORS.white,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '8px',
                  padding: '1rem',
                  cursor: 'pointer',
                  borderLeft: `4px solid ${account.isActive ? COLORS.primary : COLORS.gray}`,
                  transition: 'box-shadow 0.15s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: COLORS.primary }}>{account.accountName}</h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: COLORS.gray }}>
                      {account.bankName} • {account.accountNumber}
                    </p>
                    {account.description && (
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: COLORS.gray }}>{account.description}</p>
                    )}
                  </div>
                  <span style={{
                    backgroundColor: account.isActive ? '#d4edda' : '#e9ecef',
                    color: account.isActive ? '#155724' : COLORS.gray,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}>
                    {account.isActive ? t.trust.activeAccount : t.trust.closedAccount}
                  </span>
                </div>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: COLORS.gray }}>
                  {t.trust.transactions} →
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // TASK DELEGATION VIEW
  // ─────────────────────────────────────────────────────────────────────────

  const renderTasks = () => {
    const priorityColor = (p: string) => ({
      LOW: COLORS.gray, MEDIUM: COLORS.info, HIGH: COLORS.warning, URGENT: COLORS.danger
    }[p] ?? COLORS.gray);
    const statusColor = (s: string) => ({
      PENDING: COLORS.gray, IN_PROGRESS: COLORS.info, COMPLETED: COLORS.success, CANCELLED: COLORS.darkGray
    }[s] ?? COLORS.gray);

    const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
        await apiCall<MatterTask>('/api/legal/tasks', { method: 'POST', body: JSON.stringify({ ...taskForm, dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).getTime() : undefined }) });
        const data = await apiCall<MatterTask[]>('/api/legal/tasks');
        if (data) setTasks(data);
        setShowForm(null);
        setTaskForm({ caseId: '', title: '', description: '', assignedTo: '', priority: 'MEDIUM', dueDate: '' });
      } finally { setLoading(false); }
    };

    const handleStatusUpdate = async (task: MatterTask, status: string) => {
      await apiCall(`/api/legal/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      const data = await apiCall<MatterTask[]>('/api/legal/tasks');
      if (data) setTasks(data);
    };

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={styles.sectionTitle}>Task Management</h2>
          <button style={{ ...styles.btn('primary'), width: 'auto', padding: '0.5rem 1rem', marginBottom: 0 }} onClick={() => setShowForm('task')}>+ New Task</button>
        </div>
        {showForm === 'task' && (
          <div style={styles.card}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: COLORS.primary }}>Delegate New Task</h3>
            <form onSubmit={(e) => { void handleCreate(e); }}>
              <label style={styles.label}>Case ID <span style={{ color: COLORS.danger }}>*</span></label>
              <select style={styles.select} value={taskForm.caseId} onChange={e => setTaskForm(f => ({ ...f, caseId: e.target.value }))} required>
                <option value="">Select Case</option>
                {cases.map(cs => <option key={cs.id} value={cs.id}>{cs.caseReference} — {cs.title}</option>)}
              </select>
              <label style={styles.label}>Title <span style={{ color: COLORS.danger }}>*</span></label>
              <input style={styles.input} value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" required />
              <label style={styles.label}>Description</label>
              <textarea style={{ ...styles.input, height: '80px', resize: 'vertical' as const }} value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Task details..." />
              <label style={styles.label}>Assign To (User ID) <span style={{ color: COLORS.danger }}>*</span></label>
              <input style={styles.input} value={taskForm.assignedTo} onChange={e => setTaskForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="Attorney/Paralegal User ID" required />
              <label style={styles.label}>Priority</label>
              <select style={styles.select} value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}>
                {['LOW','MEDIUM','HIGH','URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <label style={styles.label}>Due Date</label>
              <input type="date" style={styles.input} value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button style={{ ...styles.btn('primary'), flex: 1, marginBottom: 0 }} type="submit" disabled={loading}>{loading ? 'Saving...' : 'Create Task'}</button>
                <button style={{ ...styles.btn('secondary'), flex: 1, marginBottom: 0 }} type="button" onClick={() => setShowForm(null)}>Cancel</button>
              </div>
            </form>
          </div>
        )}
        {loading && <p style={{ color: COLORS.gray }}>Loading tasks...</p>}
        {tasks.length === 0 && !loading ? (
          <div style={styles.emptyState}><p>No tasks yet. Delegate work to your team.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tasks.map(task => (
              <div key={task.id} style={{ ...styles.card, borderLeft: `4px solid ${priorityColor(task.priority)}`, marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{task.title}</p>
                    {task.description && <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: COLORS.gray }}>{task.description}</p>}
                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: COLORS.gray }}>
                      Assigned to: {task.assignedTo} {task.dueDate ? `• Due: ${formatWATDate(task.dueDate)}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                    <span style={styles.badge(priorityColor(task.priority))}>{task.priority}</span>
                    <span style={styles.badge(statusColor(task.status))}>{task.status.replace('_', ' ')}</span>
                  </div>
                </div>
                {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {task.status === 'PENDING' && (
                      <button style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', border: `1px solid ${COLORS.info}`, color: COLORS.info, background: 'white', borderRadius: '4px', cursor: 'pointer' }} onClick={() => void handleStatusUpdate(task, 'IN_PROGRESS')}>Start</button>
                    )}
                    {task.status === 'IN_PROGRESS' && (
                      <button style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', border: `1px solid ${COLORS.success}`, color: COLORS.success, background: 'white', borderRadius: '4px', cursor: 'pointer' }} onClick={() => void handleStatusUpdate(task, 'COMPLETED')}>Complete</button>
                    )}
                    <button style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', border: `1px solid ${COLORS.danger}`, color: COLORS.danger, background: 'white', borderRadius: '4px', cursor: 'pointer' }} onClick={() => void handleStatusUpdate(task, 'CANCELLED')}>Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EXPENSE TRACKING VIEW
  // ─────────────────────────────────────────────────────────────────────────

  const renderExpenses = () => {
    const totalKobo = expenses.reduce((sum, e) => sum + e.amountKobo, 0);
    const unbilledKobo = expenses.filter(e => !e.invoiced).reduce((sum, e) => sum + e.amountKobo, 0);

    const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
        await apiCall('/api/legal/expenses', { method: 'POST', body: JSON.stringify({ ...expenseForm, amountNaira: parseFloat(expenseForm.amountNaira), expenseDate: expenseForm.expenseDate ? new Date(expenseForm.expenseDate).getTime() : undefined }) });
        const data = await apiCall<MatterExpense[]>('/api/legal/expenses');
        if (data) setExpenses(data);
        setShowForm(null);
        setExpenseForm({ caseId: '', category: 'FILING_FEE', description: '', amountNaira: '', receiptUrl: '', expenseDate: '' });
      } finally { setLoading(false); }
    };

    const EXPENSE_CATEGORIES = ['FILING_FEE','TRAVEL','COURIER','PRINTING','EXPERT_WITNESS','COURT_FEES','SEARCH_FEES','OTHER'];

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={styles.sectionTitle}>Expense Tracking</h2>
          <button style={{ ...styles.btn('primary'), width: 'auto', padding: '0.5rem 1rem', marginBottom: 0 }} onClick={() => setShowForm('expense')}>+ Log Expense</button>
        </div>
        <div style={styles.statsGrid}>
          <div style={styles.statCard(COLORS.primary)}><p style={styles.statValue}>₦{(totalKobo / 100).toLocaleString()}</p><p style={styles.statLabel}>Total Expenses</p></div>
          <div style={styles.statCard(COLORS.warning)}><p style={styles.statValue}>₦{(unbilledKobo / 100).toLocaleString()}</p><p style={styles.statLabel}>Unbilled</p></div>
        </div>
        {showForm === 'expense' && (
          <div style={styles.card}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: COLORS.primary }}>Log Expense</h3>
            <form onSubmit={(e) => { void handleCreate(e); }}>
              <label style={styles.label}>Case <span style={{ color: COLORS.danger }}>*</span></label>
              <select style={styles.select} value={expenseForm.caseId} onChange={e => setExpenseForm(f => ({ ...f, caseId: e.target.value }))} required>
                <option value="">Select Case</option>
                {cases.map(cs => <option key={cs.id} value={cs.id}>{cs.caseReference} — {cs.title}</option>)}
              </select>
              <label style={styles.label}>Category <span style={{ color: COLORS.danger }}>*</span></label>
              <select style={styles.select} value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}>
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
              <label style={styles.label}>Description <span style={{ color: COLORS.danger }}>*</span></label>
              <input style={styles.input} value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} placeholder="Expense details" required />
              <label style={styles.label}>Amount (₦) <span style={{ color: COLORS.danger }}>*</span></label>
              <input type="number" style={styles.input} value={expenseForm.amountNaira} onChange={e => setExpenseForm(f => ({ ...f, amountNaira: e.target.value }))} placeholder="0.00" step="0.01" min="0" required />
              <label style={styles.label}>Date</label>
              <input type="date" style={styles.input} value={expenseForm.expenseDate} onChange={e => setExpenseForm(f => ({ ...f, expenseDate: e.target.value }))} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button style={{ ...styles.btn('primary'), flex: 1, marginBottom: 0 }} type="submit" disabled={loading}>{loading ? 'Saving...' : 'Log Expense'}</button>
                <button style={{ ...styles.btn('secondary'), flex: 1, marginBottom: 0 }} type="button" onClick={() => setShowForm(null)}>Cancel</button>
              </div>
            </form>
          </div>
        )}
        {expenses.length === 0 && !loading ? (
          <div style={styles.emptyState}><p>No expenses logged yet.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {expenses.map(exp => (
              <div key={exp.id} style={{ ...styles.card, marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>{exp.description}</p>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: COLORS.gray }}>{exp.category.replace(/_/g,' ')} • {formatWATDate(exp.expenseDate)}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: COLORS.primary }}>₦{(exp.amountKobo / 100).toLocaleString()}</p>
                    <span style={styles.badge(exp.invoiced ? COLORS.success : COLORS.warning)}>{exp.invoiced ? 'Invoiced' : 'Unbilled'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CLIENT INTAKE VIEW
  // ─────────────────────────────────────────────────────────────────────────

  const renderIntake = () => {
    const handleCreateForm = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
        await apiCall('/api/legal/intake/forms', { method: 'POST', body: JSON.stringify({ ...intakeFormData, fields: [
          { id: 'name', label: 'Full Name', type: 'TEXT', required: true },
          { id: 'phone', label: 'Phone Number', type: 'PHONE', required: true },
          { id: 'email', label: 'Email', type: 'EMAIL', required: false },
          { id: 'matter', label: 'Legal Matter Description', type: 'TEXTAREA', required: true }
        ]}) });
        const data = await apiCall<IntakeForm[]>('/api/legal/intake/forms');
        if (data) setIntakeForms(data);
        setShowForm(null);
        setIntakeFormData({ title: '', description: '' });
      } finally { setLoading(false); }
    };

    const handleReview = async (sub: IntakeSubmission, status: string) => {
      await apiCall(`/api/legal/intake/submissions/${sub.id}/review`, { method: 'PATCH', body: JSON.stringify({ status }) });
      const data = await apiCall<IntakeSubmission[]>('/api/legal/intake/submissions');
      if (data) setIntakeSubmissions(data);
    };

    const statusColor = (s: string) => ({ PENDING: COLORS.gray, REVIEWED: COLORS.info, CONVERTED: COLORS.success, REJECTED: COLORS.danger }[s] ?? COLORS.gray);

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={styles.sectionTitle}>Client Intake</h2>
          {intakeTab === 'forms' && <button style={{ ...styles.btn('primary'), width: 'auto', padding: '0.5rem 1rem', marginBottom: 0 }} onClick={() => setShowForm('intake-form')}>+ New Form</button>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {(['forms','submissions'] as const).map(tab => (
            <button key={tab} style={{ padding: '0.4rem 1rem', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: intakeTab === tab ? 700 : 400, backgroundColor: intakeTab === tab ? COLORS.primary : COLORS.lightGray, color: intakeTab === tab ? COLORS.white : COLORS.gray, fontSize: '0.85rem' }} onClick={() => setIntakeTab(tab)}>
              {tab === 'forms' ? `Forms (${intakeForms.length})` : `Submissions (${intakeSubmissions.filter(s => s.status === 'PENDING').length} pending)`}
            </button>
          ))}
        </div>
        {showForm === 'intake-form' && (
          <div style={styles.card}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Create Intake Form</h3>
            <form onSubmit={(e) => { void handleCreateForm(e); }}>
              <label style={styles.label}>Form Title <span style={{ color: COLORS.danger }}>*</span></label>
              <input style={styles.input} value={intakeFormData.title} onChange={e => setIntakeFormData(f => ({ ...f, title: e.target.value }))} placeholder="e.g., New Client Onboarding" required />
              <label style={styles.label}>Description</label>
              <textarea style={{ ...styles.input, height: '60px' }} value={intakeFormData.description} onChange={e => setIntakeFormData(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of this form's purpose" />
              <p style={{ fontSize: '0.8rem', color: COLORS.gray, marginTop: '-0.5rem' }}>Default fields will be added: Name, Phone, Email, Legal Matter</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button style={{ ...styles.btn('primary'), flex: 1, marginBottom: 0 }} type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Form'}</button>
                <button style={{ ...styles.btn('secondary'), flex: 1, marginBottom: 0 }} type="button" onClick={() => setShowForm(null)}>Cancel</button>
              </div>
            </form>
          </div>
        )}
        {activeTab === 'forms' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {intakeForms.length === 0 ? <div style={styles.emptyState}><p>No intake forms created yet.</p></div> : intakeForms.map(form => (
              <div key={form.id} style={{ ...styles.card, marginBottom: 0, borderLeft: `4px solid ${form.isActive ? COLORS.success : COLORS.gray}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{form.title}</p>
                    {form.description && <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: COLORS.gray }}>{form.description}</p>}
                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: COLORS.gray }}>{Array.isArray(form.fields) ? form.fields.length : 0} fields • Created {formatWATDate(form.createdAt)}</p>
                  </div>
                  <span style={styles.badge(form.isActive ? COLORS.success : COLORS.gray)}>{form.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <code style={{ fontSize: '0.75rem', backgroundColor: '#f1f3f5', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'block', wordBreak: 'break-all' as const }}>
                    Submit URL: /api/legal/intake/submit/{form.id}
                  </code>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'submissions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {intakeSubmissions.length === 0 ? <div style={styles.emptyState}><p>No submissions received yet.</p></div> : intakeSubmissions.map(sub => (
              <div key={sub.id} style={{ ...styles.card, marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{sub.submitterName}</p>
                    <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: COLORS.gray }}>{sub.submitterEmail ?? sub.submitterPhone ?? 'No contact'}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: COLORS.gray }}>{formatWATDate(sub.createdAt)}</p>
                  </div>
                  <span style={styles.badge(statusColor(sub.status))}>{sub.status}</span>
                </div>
                {sub.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', background: COLORS.success, color: COLORS.white, border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => void handleReview(sub, 'REVIEWED')}>Review</button>
                    <button style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', background: COLORS.info, color: COLORS.white, border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => void handleReview(sub, 'CONVERTED')}>Convert to Client</button>
                    <button style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', background: COLORS.danger, color: COLORS.white, border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => void handleReview(sub, 'REJECTED')}>Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DOCUMENT TEMPLATES VIEW
  // ─────────────────────────────────────────────────────────────────────────

  const renderTemplates = () => {
    const TEMPLATE_TYPES = ['NDA','EMPLOYMENT_AGREEMENT','RETAINER_AGREEMENT','POWER_OF_ATTORNEY','AFFIDAVIT','NOTICE','LETTER_DEMAND','SETTLEMENT_AGREEMENT','OTHER'];

    const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
        const vars = templateForm.variables.split(',').map(v => v.trim()).filter(Boolean);
        await apiCall('/api/legal/templates', { method: 'POST', body: JSON.stringify({ ...templateForm, variables: vars }) });
        const data = await apiCall<DocTemplate[]>('/api/legal/templates');
        if (data) setTemplates(data);
        setShowForm(null);
        setTemplateForm({ title: '', templateType: 'NDA', content: '', variables: '' });
      } finally { setLoading(false); }
    };

    const handleAssemble = async () => {
      if (!selectedTemplate) return;
      setLoading(true);
      try {
        const result = await apiCall<{ assembledContent: string }>(`/api/legal/templates/${selectedTemplate.id}/assemble`, { method: 'POST', body: JSON.stringify({ variables: templateVars }) });
        if (result) setAssembledDoc(result.assembledContent);
      } finally { setLoading(false); }
    };

    if (selectedTemplate) {
      return (
        <div>
          <button style={{ ...styles.btn('secondary'), width: 'auto', padding: '0.5rem 1rem', marginBottom: '1rem' }} onClick={() => { setSelectedTemplate(null); setAssembledDoc(null); setTemplateVars({}); }}>← Back to Templates</button>
          <div style={styles.card}>
            <h2 style={{ margin: '0 0 0.5rem', color: COLORS.primary }}>{selectedTemplate.title}</h2>
            <span style={styles.badge(COLORS.info)}>{selectedTemplate.templateType.replace(/_/g,' ')}</span>
            {selectedTemplate.variables.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Fill in Variables</h3>
                {selectedTemplate.variables.map(v => (
                  <div key={v}>
                    <label style={styles.label}>{v}</label>
                    <input style={styles.input} value={templateVars[v] ?? ''} onChange={e => setTemplateVars(prev => ({ ...prev, [v]: e.target.value }))} placeholder={`Enter ${v}`} />
                  </div>
                ))}
                <button style={styles.btn('primary')} onClick={() => void handleAssemble()} disabled={loading}>{loading ? 'Assembling...' : 'Assemble Document'}</button>
              </div>
            )}
          </div>
          {assembledDoc && (
            <div style={styles.card}>
              <h3 style={{ color: COLORS.primary }}>Assembled Document</h3>
              <pre style={{ whiteSpace: 'pre-wrap' as const, fontFamily: 'Georgia, serif', fontSize: '0.9rem', lineHeight: 1.6, backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '6px', overflowY: 'auto' as const, maxHeight: '500px' }}>{assembledDoc}</pre>
              <button style={styles.btn('secondary')} onClick={() => { const blob = new Blob([assembledDoc], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${selectedTemplate.title}.txt`; a.click(); }}>Download Document</button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={styles.sectionTitle}>Document Templates</h2>
          <button style={{ ...styles.btn('primary'), width: 'auto', padding: '0.5rem 1rem', marginBottom: 0 }} onClick={() => setShowForm('template')}>+ New Template</button>
        </div>
        {showForm === 'template' && (
          <div style={styles.card}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Create Template</h3>
            <form onSubmit={(e) => { void handleCreate(e); }}>
              <label style={styles.label}>Title <span style={{ color: COLORS.danger }}>*</span></label>
              <input style={styles.input} value={templateForm.title} onChange={e => setTemplateForm(f => ({ ...f, title: e.target.value }))} placeholder="Template name" required />
              <label style={styles.label}>Type</label>
              <select style={styles.select} value={templateForm.templateType} onChange={e => setTemplateForm(f => ({ ...f, templateType: e.target.value }))}>
                {TEMPLATE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
              <label style={styles.label}>Variables (comma-separated)</label>
              <input style={styles.input} value={templateForm.variables} onChange={e => setTemplateForm(f => ({ ...f, variables: e.target.value }))} placeholder="ClientName, Date, Amount" />
              <label style={styles.label}>Template Content (use {'{{VariableName}}'} for placeholders) <span style={{ color: COLORS.danger }}>*</span></label>
              <textarea style={{ ...styles.input, height: '200px', fontFamily: 'monospace', resize: 'vertical' as const }} value={templateForm.content} onChange={e => setTemplateForm(f => ({ ...f, content: e.target.value }))} placeholder="This agreement is entered into by {{ClientName}} on {{Date}}..." required />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button style={{ ...styles.btn('primary'), flex: 1, marginBottom: 0 }} type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Template'}</button>
                <button style={{ ...styles.btn('secondary'), flex: 1, marginBottom: 0 }} type="button" onClick={() => setShowForm(null)}>Cancel</button>
              </div>
            </form>
          </div>
        )}
        {templates.length === 0 && !loading ? (
          <div style={styles.emptyState}><p>No templates yet. Create your first document template.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {templates.map(tmpl => (
              <div key={tmpl.id} style={{ ...styles.card, marginBottom: 0, cursor: 'pointer' }} onClick={() => { setSelectedTemplate(tmpl); setTemplateVars(Object.fromEntries((tmpl.variables ?? []).map(v => [v, '']))); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{tmpl.title}</p>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: COLORS.gray }}>{tmpl.templateType.replace(/_/g,' ')} • {tmpl.variables?.length ?? 0} variables</p>
                  </div>
                  <span style={{ color: COLORS.primary, fontSize: '0.9rem' }}>Use →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SECURE MESSAGING VIEW
  // ─────────────────────────────────────────────────────────────────────────

  const renderMessages = () => {
    const loadMessages = async (cs: LegalCase) => {
      setSelectedCaseForMessages(cs);
      const data = await apiCall<ClientMessage[]>(`/api/legal/messages/case/${cs.id}`);
      if (data) setMessages(data);
    };

    const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCaseForMessages || !msgBody || !msgRecipient) return;
      setLoading(true);
      try {
        await apiCall('/api/legal/messages', { method: 'POST', body: JSON.stringify({ caseId: selectedCaseForMessages.id, recipientId: msgRecipient, body: msgBody }) });
        const data = await apiCall<ClientMessage[]>(`/api/legal/messages/case/${selectedCaseForMessages.id}`);
        if (data) setMessages(data);
        setMsgBody('');
      } finally { setLoading(false); }
    };

    if (selectedCaseForMessages) {
      return (
        <div>
          <button style={{ ...styles.btn('secondary'), width: 'auto', padding: '0.5rem 1rem', marginBottom: '1rem' }} onClick={() => { setSelectedCaseForMessages(null); setMessages([]); }}>← Back</button>
          <h2 style={styles.sectionTitle}>Messages — {selectedCaseForMessages.title}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', maxHeight: '400px', overflowY: 'auto' as const }}>
            {messages.length === 0 ? <p style={{ color: COLORS.gray, textAlign: 'center' }}>No messages yet. Start the conversation.</p> : messages.map(msg => (
              <div key={msg.id} style={{ backgroundColor: msg.senderId === userId ? COLORS.primary : COLORS.white, color: msg.senderId === userId ? COLORS.white : COLORS.text, padding: '0.75rem', borderRadius: '8px', maxWidth: '80%', alignSelf: msg.senderId === userId ? 'flex-end' as const : 'flex-start' as const, border: msg.senderId !== userId ? `1px solid ${COLORS.border}` : 'none' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>{msg.body}</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', opacity: 0.7 }}>{msg.senderType} • {formatWATDateTime(msg.createdAt)}</p>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => { void handleSend(e); }} style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: '1rem' }}>
            <label style={styles.label}>Recipient (User ID)</label>
            <input style={styles.input} value={msgRecipient} onChange={e => setMsgRecipient(e.target.value)} placeholder="Client or attorney user ID" required />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <textarea style={{ ...styles.input, flex: 1, marginBottom: 0, height: '60px', resize: 'vertical' as const }} value={msgBody} onChange={e => setMsgBody(e.target.value)} placeholder="Type your message..." required />
              <button style={{ ...styles.btn('primary'), width: 'auto', padding: '0 1.5rem', marginBottom: 0 }} type="submit" disabled={loading || !msgBody}>Send</button>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div>
        <h2 style={styles.sectionTitle}>Secure Messaging{unreadMessages > 0 && <span style={{ ...styles.badge(COLORS.danger), marginLeft: '0.5rem' }}>{unreadMessages} unread</span>}</h2>
        <p style={{ color: COLORS.gray, fontSize: '0.9rem' }}>Select a case to view and send messages.</p>
        {cases.length === 0 ? <div style={styles.emptyState}><p>No cases available.</p></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {cases.map(cs => (
              <div key={cs.id} style={{ ...styles.card, marginBottom: 0, cursor: 'pointer' }} onClick={() => void loadMessages(cs)}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{cs.title}</p>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: COLORS.gray }}>{cs.caseReference} • {cs.status}</p>
                  </div>
                  <span style={{ color: COLORS.primary }}>→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PERFORMANCE ANALYTICS VIEW
  // ─────────────────────────────────────────────────────────────────────────

  const renderAnalytics = () => {
    const totalBilledNaira = attorneyAnalytics.reduce((sum, a) => sum + a.totalBilledNaira, 0);
    const totalHours = attorneyAnalytics.reduce((sum, a) => sum + parseFloat(a.totalHours), 0);
    const avgUtilization = attorneyAnalytics.length > 0
      ? (attorneyAnalytics.reduce((sum, a) => sum + parseFloat(a.utilizationRate), 0) / attorneyAnalytics.length).toFixed(1)
      : '0.0';
    const totalRevenue = revenueData.reduce((sum, r) => sum + r.collectedNaira, 0);

    return (
      <div>
        <h2 style={styles.sectionTitle}>Performance Analytics</h2>
        <div style={styles.statsGrid}>
          <div style={styles.statCard(COLORS.primary)}><p style={styles.statValue}>₦{totalBilledNaira.toLocaleString()}</p><p style={styles.statLabel}>Total Billed</p></div>
          <div style={styles.statCard(COLORS.success)}><p style={styles.statValue}>₦{totalRevenue.toLocaleString()}</p><p style={styles.statLabel}>Collected</p></div>
          <div style={styles.statCard(COLORS.info)}><p style={styles.statValue}>{totalHours.toFixed(0)}h</p><p style={styles.statLabel}>Total Hours</p></div>
          <div style={styles.statCard(COLORS.gold)}><p style={styles.statValue}>{avgUtilization}%</p><p style={styles.statLabel}>Avg Utilization</p></div>
        </div>

        {revenueData.length > 0 && (
          <div style={styles.card}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700 }}>Monthly Revenue (Last 6 Months)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {revenueData.map(r => (
                <div key={r.period}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 600 }}>{r.period}</span>
                    <span>₦{r.collectedNaira.toLocaleString()} collected ({r.collectionRate}%)</span>
                  </div>
                  <div style={{ backgroundColor: COLORS.lightGray, borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: COLORS.success, height: '100%', width: `${Math.min(100, parseFloat(r.collectionRate))}%`, borderRadius: '4px', transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: COLORS.gray, marginTop: '0.1rem' }}>
                    <span>Invoiced: ₦{r.invoicedNaira.toLocaleString()}</span>
                    <span>Outstanding: ₦{r.outstandingNaira.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {attorneyAnalytics.length > 0 && (
          <div style={styles.card}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700 }}>Attorney Performance</h3>
            {attorneyAnalytics.map(a => (
              <div key={a.attorneyId} style={{ borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{a.attorneyId}</p>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: COLORS.gray }}>{a.caseCount} cases • {a.totalHours}h total • {a.billableHours}h billable</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: COLORS.primary }}>₦{a.totalBilledNaira.toLocaleString()}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: parseFloat(a.utilizationRate) >= 70 ? COLORS.success : COLORS.warning }}>{a.utilizationRate}% utilization</p>
                  </div>
                </div>
                <div style={{ backgroundColor: COLORS.lightGray, borderRadius: '4px', height: '6px', overflow: 'hidden', marginTop: '0.5rem' }}>
                  <div style={{ backgroundColor: parseFloat(a.utilizationRate) >= 70 ? COLORS.success : COLORS.warning, height: '100%', width: `${Math.min(100, parseFloat(a.utilizationRate))}%`, borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {attorneyAnalytics.length === 0 && revenueData.length === 0 && !loading && (
          <div style={styles.emptyState}><p>No analytics data yet. Start logging time and generating invoices.</p></div>
        )}

        <div style={styles.card}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700 }}>Export Options</h3>
          <a href={`${apiBaseUrl}/api/legal/accounting/export?format=csv`} style={{ display: 'block', ...styles.btn('secondary'), textAlign: 'center' as const, textDecoration: 'none' }} download>Download Invoices CSV (Xero/QuickBooks)</a>
          <a href={`${apiBaseUrl}/api/legal/calendar/ical`} style={{ display: 'block', ...styles.btn('secondary'), textAlign: 'center' as const, textDecoration: 'none' }} download>Download Court Calendar (.ics)</a>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // COMPLIANCE REPORT VIEW
  // ─────────────────────────────────────────────────────────────────────────

  const renderCompliance = () => {
    const report = complianceReport;
    const statusBadge = (status: string) => (
      <span style={styles.badge(status === 'COMPLIANT' ? COLORS.success : status === 'ATTENTION_NEEDED' ? COLORS.warning : COLORS.gray)}>{status.replace(/_/g,' ')}</span>
    );

    const handleConflictCheck = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
        const result = await apiCall<Record<string, unknown>>('/api/legal/conflict-check', { method: 'POST', body: JSON.stringify(conflictForm) });
        if (result) setConflictResult(result);
      } finally { setLoading(false); }
    };

    return (
      <div>
        <h2 style={styles.sectionTitle}>Compliance & Reports</h2>

        {/* NBA Compliance Report */}
        <div style={styles.card}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700, color: COLORS.primary }}>NBA Compliance Report</h3>
          {report ? (
            <>
              <div style={styles.statsGrid}>
                <div style={styles.statCard(COLORS.primary)}><p style={styles.statValue}>{report.totalAttorneys as number}</p><p style={styles.statLabel}>Total Attorneys</p></div>
                <div style={styles.statCard(COLORS.success)}><p style={styles.statValue}>{report.verifiedAttorneys as number}</p><p style={styles.statLabel}>Verified</p></div>
                <div style={styles.statCard(COLORS.warning)}><p style={styles.statValue}>{report.expiringCertificates as number}</p><p style={styles.statLabel}>Certs Expiring</p></div>
                <div style={styles.statCard(COLORS.info)}><p style={styles.statValue}>{report.totalTrustAccounts as number}</p><p style={styles.statLabel}>Trust Accounts</p></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: `1px solid ${COLORS.border}` }}>
                  <span style={{ fontSize: '0.9rem' }}>NBA Verification</span>
                  {statusBadge((report.complianceStatus as Record<string, string>)?.nbaVerification ?? 'UNKNOWN')}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: `1px solid ${COLORS.border}` }}>
                  <span style={{ fontSize: '0.9rem' }}>Expiring Certificates</span>
                  {statusBadge((report.complianceStatus as Record<string, string>)?.expiringCertificates ?? 'UNKNOWN')}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                  <span style={{ fontSize: '0.9rem' }}>Trust Accounts</span>
                  {statusBadge((report.complianceStatus as Record<string, string>)?.trustAccounts ?? 'UNKNOWN')}
                </div>
              </div>
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: COLORS.gray }}>Trust Balance: ₦{((report.totalTrustBalanceNaira as number) ?? 0).toLocaleString()} • Cases: {report.activeCases as number} active / {report.totalCases as number} total</p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: COLORS.gray }}>Generated: {report.generatedAt as string}</p>
            </>
          ) : loading ? <p style={{ color: COLORS.gray }}>Loading report...</p> : <p style={{ color: COLORS.gray }}>No compliance data available.</p>}
        </div>

        {/* Conflict of Interest Checker */}
        <div style={styles.card}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700, color: COLORS.primary }}>Conflict of Interest Checker</h3>
          <form onSubmit={(e) => { void handleConflictCheck(e); }}>
            <label style={styles.label}>Client Full Name <span style={{ color: COLORS.danger }}>*</span></label>
            <input style={styles.input} value={conflictForm.fullName} onChange={e => setConflictForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Prospective client name" required />
            <label style={styles.label}>Phone Number</label>
            <input style={styles.input} value={conflictForm.phone} onChange={e => setConflictForm(f => ({ ...f, phone: e.target.value }))} placeholder="+234..." />
            <label style={styles.label}>Email</label>
            <input style={styles.input} value={conflictForm.email} onChange={e => setConflictForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
            <button style={styles.btn('primary')} type="submit" disabled={loading}>{loading ? 'Checking...' : 'Check for Conflicts'}</button>
          </form>
          {conflictResult && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: (conflictResult.hasConflict as boolean) ? '#fff3cd' : '#d4edda', borderRadius: '6px', border: `1px solid ${(conflictResult.hasConflict as boolean) ? COLORS.warning : COLORS.success}` }}>
              {(conflictResult.hasConflict as boolean) ? (
                <>
                  <p style={{ margin: 0, fontWeight: 700, color: COLORS.warning }}>⚠️ Potential Conflict Detected</p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>Found {(conflictResult.conflicts as unknown[]).length} existing record(s) that may conflict. Review before proceeding.</p>
                </>
              ) : (
                <p style={{ margin: 0, fontWeight: 700, color: COLORS.success }}>✓ No conflicts found. Safe to proceed.</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {renderHeader()}
      {renderOfflineBanner()}
      {renderNav()}
      <main style={styles.main}>
        {error && view !== 'clients' && view !== 'nba' && view !== 'trust' && (
          <div style={{ backgroundColor: '#f8d7da', color: COLORS.danger, padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        {view === 'dashboard' && renderDashboard()}
        {view === 'clients' && renderClients()}
        {view === 'cases' && renderCases()}
        {view === 'time' && renderTimeEntries()}
        {view === 'invoices' && renderInvoices()}
        {view === 'nba' && renderNBA()}
        {view === 'trust' && renderTrust()}
        {view === 'tasks' && renderTasks()}
        {view === 'expenses' && renderExpenses()}
        {view === 'intake' && renderIntake()}
        {view === 'templates' && renderTemplates()}
        {view === 'messages' && renderMessages()}
        {view === 'analytics' && renderAnalytics()}
        {view === 'compliance' && renderCompliance()}
      </main>
    </div>
  );
};
