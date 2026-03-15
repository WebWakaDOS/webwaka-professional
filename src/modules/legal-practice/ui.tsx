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

type View = 'dashboard' | 'clients' | 'cases' | 'time' | 'invoices' | 'nba';

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
      { key: 'nba', label: t.nav.nbaCompliance }
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
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {renderHeader()}
      {renderOfflineBanner()}
      {renderNav()}
      <main style={styles.main}>
        {error && view !== 'clients' && view !== 'nba' && (
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
      </main>
    </div>
  );
};
