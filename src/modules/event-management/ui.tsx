/**
 * WebWaka Professional — Event Management UI
 * Blueprint Reference: Part 9.1 — Mobile First, PWA First, Offline First, Nigeria First
 * Blueprint Reference: Part 9.2 — Multi-Tenant (tenantId always in scope)
 *
 * React component for creating, listing, and managing professional events.
 * Renders conditionally based on the authenticated user's role (RBAC-aware).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { EventManagementApiClient, type CreateEventInput } from './apiClient';
import type { ManagedEvent, EventRegistration, EventStatus, EventType, EventManagementRole } from '../../core/db/schema';
import { formatWATDate, formatWATDateTime, koboToNaira } from './utils';

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

export interface EventManagementUIProps {
  tenantId: string;
  userId: string;
  role: EventManagementRole;
  apiBaseUrl: string;
  authToken: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_TYPES: EventType[] = [
  'CONFERENCE', 'WORKSHOP', 'SEMINAR', 'WEBINAR', 'NETWORKING',
  'TRAINING', 'GALA', 'EXHIBITION', 'CULTURAL', 'SPORTS', 'OTHER'
];

const STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  REGISTRATION_OPEN: 'Registration Open',
  REGISTRATION_CLOSED: 'Registration Closed',
  ONGOING: 'Ongoing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

const STATUS_COLORS: Record<EventStatus, string> = {
  DRAFT: '#9ca3af',
  PUBLISHED: '#3b82f6',
  REGISTRATION_OPEN: '#10b981',
  REGISTRATION_CLOSED: '#f59e0b',
  ONGOING: '#8b5cf6',
  COMPLETED: '#6b7280',
  CANCELLED: '#ef4444'
};

type Tab = 'dashboard' | 'events' | 'create' | 'registrations' | 'checkin';

// ─────────────────────────────────────────────────────────────────────────────
// COLOUR SCHEME — Nigeria-inspired green palette
// ─────────────────────────────────────────────────────────────────────────────

const STYLES = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    minHeight: '100vh',
    background: '#f9fafb',
    color: '#111827'
  } as React.CSSProperties,
  header: {
    background: '#1a472a',
    color: '#fff',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  } as React.CSSProperties,
  nav: {
    display: 'flex',
    gap: 0,
    borderBottom: '1px solid #e5e7eb',
    background: '#fff',
    paddingLeft: 24,
    overflowX: 'auto' as const
  } as React.CSSProperties,
  navBtn: (active: boolean): React.CSSProperties => ({
    padding: '12px 20px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontWeight: active ? 700 : 400,
    color: active ? '#1a472a' : '#6b7280',
    borderBottom: active ? '3px solid #1a472a' : '3px solid transparent',
    fontSize: 14,
    whiteSpace: 'nowrap' as const
  }),
  content: { padding: 24, maxWidth: 1100, margin: '0 auto' } as React.CSSProperties,
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    marginBottom: 16
  } as React.CSSProperties,
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    marginBottom: 24
  } as React.CSSProperties,
  statCard: (bg: string): React.CSSProperties => ({
    background: bg,
    color: '#fff',
    borderRadius: 12,
    padding: '20px 24px'
  }),
  label: { display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 } as React.CSSProperties,
  input: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 14,
    boxSizing: 'border-box' as const,
    marginBottom: 14
  } as React.CSSProperties,
  select: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 14,
    boxSizing: 'border-box' as const,
    marginBottom: 14,
    background: '#fff'
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 14,
    boxSizing: 'border-box' as const,
    marginBottom: 14,
    minHeight: 80,
    resize: 'vertical' as const
  } as React.CSSProperties,
  btn: (variant: 'primary' | 'secondary' | 'danger'): React.CSSProperties => ({
    padding: '9px 18px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    background: variant === 'primary' ? '#1a472a' : variant === 'danger' ? '#dc2626' : '#e5e7eb',
    color: variant === 'secondary' ? '#374151' : '#fff',
    marginRight: 8
  }),
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '12px 16px',
    color: '#dc2626',
    marginBottom: 16,
    fontSize: 14
  } as React.CSSProperties,
  statusBadge: (status: EventStatus): React.CSSProperties => ({
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    background: STATUS_COLORS[status] + '22',
    color: STATUS_COLORS[status]
  }),
  row: { display: 'flex', gap: 16, flexWrap: 'wrap' as const } as React.CSSProperties,
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 8
  } as React.CSSProperties
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function EventManagementUI({
  tenantId,
  userId,
  role,
  apiBaseUrl,
  authToken
}: EventManagementUIProps) {
  const client = new EventManagementApiClient(apiBaseUrl, authToken);
  const canManage = role === 'TENANT_ADMIN' || role === 'EVENT_MANAGER';
  const isAdmin = role === 'TENANT_ADMIN';

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState({ totalEvents: 0, publishedEvents: 0, upcomingEvents: 0, totalRegistrations: 0 });
  const [events, setEvents] = useState<ManagedEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ManagedEvent | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create event form state
  const [createForm, setCreateForm] = useState<Partial<CreateEventInput>>({ currency: 'NGN', ticketPriceKobo: 0 });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Registration form state
  const [regForm, setRegForm] = useState({ attendeeName: '', attendeeEmail: '', attendeePhone: '' });
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Check-in state
  const [ticketRefInput, setTicketRefInput] = useState('');
  const [checkInResult, setCheckInResult] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const res = await client.getDashboard();
    setLoading(false);
    if (res.success && res.data) setStats(res.data);
    else setError(res.errors?.[0] ?? 'Failed to load dashboard');
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const res = await client.listEvents({ limit: 50 });
    setLoading(false);
    if (res.success && res.data) setEvents(res.data);
    else setError(res.errors?.[0] ?? 'Failed to load events');
  }, []);

  const loadRegistrations = useCallback(async (eventId: string) => {
    const res = await client.listRegistrations(eventId);
    if (res.success && res.data) setRegistrations(res.data);
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') loadDashboard();
    if (activeTab === 'events' || activeTab === 'registrations' || activeTab === 'checkin') loadEvents();
  }, [activeTab]);

  useEffect(() => {
    if (selectedEvent && (activeTab === 'registrations' || activeTab === 'checkin')) {
      loadRegistrations(selectedEvent.id);
    }
  }, [selectedEvent, activeTab]);

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  }

  // ── CREATE EVENT ──────────────────────────────────────────────────────────

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    const input: CreateEventInput = {
      title: createForm.title ?? '',
      description: createForm.description,
      eventType: (createForm.eventType as EventType) ?? 'CONFERENCE',
      venue: createForm.venue ?? '',
      address: createForm.address ?? '',
      city: createForm.city ?? '',
      state: createForm.state ?? '',
      onlineUrl: createForm.onlineUrl,
      startDate: new Date(createForm.startDate as unknown as string).getTime(),
      endDate: new Date(createForm.endDate as unknown as string).getTime(),
      registrationDeadline: createForm.registrationDeadline
        ? new Date(createForm.registrationDeadline as unknown as string).getTime()
        : undefined,
      capacity: createForm.capacity ? Number(createForm.capacity) : null,
      ticketPriceKobo: Number(createForm.ticketPriceKobo ?? 0),
      currency: createForm.currency ?? 'NGN'
    };

    const res = await client.createEvent(input);
    setCreateLoading(false);

    if (res.success && res.data) {
      flash(`Event "${res.data.title}" created successfully`);
      setCreateForm({ currency: 'NGN', ticketPriceKobo: 0 });
      setActiveTab('events');
      loadEvents();
    } else {
      setCreateError(res.errors?.[0] ?? 'Failed to create event');
    }
  }

  // ── STATUS UPDATE ────────────────────────────────────────────────────────

  async function handleStatusChange(event: ManagedEvent, newStatus: EventStatus) {
    const res = await client.updateEventStatus(event.id, newStatus, event.version);
    if (res.success) {
      flash(`Event status updated to ${STATUS_LABELS[newStatus]}`);
      loadEvents();
    } else {
      setError(res.errors?.[0] ?? 'Failed to update status');
    }
  }

  async function handleDeleteEvent(event: ManagedEvent) {
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    const res = await client.deleteEvent(event.id);
    if (res.success) {
      flash('Event deleted');
      loadEvents();
    } else {
      setError(res.errors?.[0] ?? 'Failed to delete event');
    }
  }

  // ── REGISTRATION ─────────────────────────────────────────────────────────

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEvent) return;
    setRegError(null);
    setRegLoading(true);

    const res = await client.register(selectedEvent.id, {
      attendeeName: regForm.attendeeName,
      attendeeEmail: regForm.attendeeEmail,
      attendeePhone: regForm.attendeePhone
    });
    setRegLoading(false);

    if (res.success) {
      flash(`Registration successful! Ticket: ${res.data?.ticketRef}`);
      setRegForm({ attendeeName: '', attendeeEmail: '', attendeePhone: '' });
      loadRegistrations(selectedEvent.id);
    } else {
      setRegError(res.errors?.[0] ?? 'Registration failed');
    }
  }

  // ── CHECK-IN ─────────────────────────────────────────────────────────────

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEvent) return;
    setCheckInError(null);
    setCheckInResult(null);

    const res = await client.checkIn(selectedEvent.id, ticketRefInput.trim());
    if (res.success && res.data) {
      setCheckInResult(`✓ ${res.data.attendeeName} checked in at ${formatWATDateTime(res.data.checkedInAt)}`);
      setTicketRefInput('');
      loadRegistrations(selectedEvent.id);
    } else {
      setCheckInError(res.errors?.[0] ?? 'Check-in failed');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={STYLES.container}>
      {/* Header */}
      <header style={STYLES.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🗓️</span>
          <span style={{ fontWeight: 700, fontSize: 18 }}>WebWaka Events</span>
          <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 8 }}>
            {role} | {tenantId}
          </span>
        </div>
        <span style={{ fontSize: 12, opacity: 0.7, color: '#a7f3d0' }}>
          {userId}
        </span>
      </header>

      {/* Navigation */}
      <nav style={STYLES.nav}>
        {(['dashboard', 'events'] as Tab[]).map(tab => (
          <button key={tab} style={STYLES.navBtn(activeTab === tab)} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
        {canManage && (
          <button style={STYLES.navBtn(activeTab === 'create')} onClick={() => setActiveTab('create')}>
            + Create Event
          </button>
        )}
        {selectedEvent && (
          <>
            <button style={STYLES.navBtn(activeTab === 'registrations')} onClick={() => setActiveTab('registrations')}>
              Registrations
            </button>
            {canManage && (
              <button style={STYLES.navBtn(activeTab === 'checkin')} onClick={() => setActiveTab('checkin')}>
                Check-In
              </button>
            )}
          </>
        )}
      </nav>

      <div style={STYLES.content}>
        {/* Global messages */}
        {successMsg && (
          <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '12px 16px', color: '#065f46', marginBottom: 16, fontSize: 14 }}>
            ✓ {successMsg}
          </div>
        )}
        {error && (
          <div style={STYLES.error} onClick={() => setError(null)} role="alert">
            {error} (click to dismiss)
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ margin: '0 0 20px', fontWeight: 700, fontSize: 22 }}>Dashboard</h2>
            {loading ? <p>Loading…</p> : (
              <>
                <div style={STYLES.statsGrid}>
                  <div style={STYLES.statCard('#1a472a')}>
                    <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.totalEvents}</div>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>Total Events</div>
                  </div>
                  <div style={STYLES.statCard('#059669')}>
                    <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.publishedEvents}</div>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>Active Events</div>
                  </div>
                  <div style={STYLES.statCard('#2563eb')}>
                    <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.upcomingEvents}</div>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>Upcoming</div>
                  </div>
                  <div style={STYLES.statCard('#7c3aed')}>
                    <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.totalRegistrations}</div>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>Registrations</div>
                  </div>
                </div>
                <div style={STYLES.card}>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
                    Tenant: <strong>{tenantId}</strong> | Role: <strong>{role}</strong>
                    {!canManage && ' — Contact your administrator to manage events.'}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── EVENTS LIST ── */}
        {activeTab === 'events' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>Events</h2>
              {canManage && (
                <button style={STYLES.btn('primary')} onClick={() => setActiveTab('create')}>
                  + New Event
                </button>
              )}
            </div>
            {loading ? <p>Loading…</p> : events.length === 0 ? (
              <div style={STYLES.card}>
                <p style={{ margin: 0, color: '#6b7280' }}>No events found. {canManage ? 'Create your first event.' : ''}</p>
              </div>
            ) : (
              events.map(evt => (
                <div key={evt.id} style={{ ...STYLES.card, borderLeft: `4px solid ${STATUS_COLORS[evt.status]}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{evt.title}</div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
                        {evt.eventType} · {evt.city}, {evt.state} · {formatWATDate(evt.startDate)}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                        <span style={STYLES.statusBadge(evt.status)}>{STATUS_LABELS[evt.status]}</span>
                        {evt.capacity && <span style={{ fontSize: 12, color: '#6b7280' }}>Capacity: {evt.capacity}</span>}
                        {evt.ticketPriceKobo === 0
                          ? <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>Free</span>
                          : <span style={{ fontSize: 12, color: '#374151' }}>{koboToNaira(evt.ticketPriceKobo)}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' as const }}>
                      <button style={STYLES.btn('secondary')} onClick={() => { setSelectedEvent(evt); setActiveTab('registrations'); }}>
                        Registrations
                      </button>
                      {canManage && (
                        <>
                          {evt.status === 'DRAFT' && (
                            <button style={STYLES.btn('primary')} onClick={() => handleStatusChange(evt, 'PUBLISHED')}>Publish</button>
                          )}
                          {evt.status === 'PUBLISHED' && (
                            <button style={STYLES.btn('primary')} onClick={() => handleStatusChange(evt, 'REGISTRATION_OPEN')}>Open Registration</button>
                          )}
                          {evt.status === 'REGISTRATION_OPEN' && (
                            <button style={STYLES.btn('secondary')} onClick={() => handleStatusChange(evt, 'REGISTRATION_CLOSED')}>Close Registration</button>
                          )}
                          {evt.status === 'REGISTRATION_CLOSED' && (
                            <button style={STYLES.btn('primary')} onClick={() => { setSelectedEvent(evt); setActiveTab('checkin'); }}>Start Check-In</button>
                          )}
                          {isAdmin && !['COMPLETED', 'CANCELLED'].includes(evt.status) && (
                            <button style={STYLES.btn('danger')} onClick={() => handleStatusChange(evt, 'CANCELLED')}>Cancel</button>
                          )}
                          {isAdmin && ['DRAFT', 'PUBLISHED'].includes(evt.status) && (
                            <button style={STYLES.btn('danger')} onClick={() => handleDeleteEvent(evt)}>Delete</button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── CREATE EVENT ── */}
        {activeTab === 'create' && canManage && (
          <div>
            <h2 style={{ margin: '0 0 20px', fontWeight: 700, fontSize: 22 }}>Create Event</h2>
            {createError && <div style={STYLES.error}>{createError}</div>}
            <form onSubmit={handleCreateEvent}>
              <div style={STYLES.card}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Basic Details</h3>
                <div style={STYLES.formGrid}>
                  <div>
                    <label style={STYLES.label}>Event Title *</label>
                    <input style={STYLES.input} required placeholder="e.g. Lagos Tech Summit 2026"
                      value={createForm.title ?? ''}
                      onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div>
                    <label style={STYLES.label}>Event Type *</label>
                    <select style={STYLES.select} required
                      value={createForm.eventType ?? ''}
                      onChange={e => setCreateForm(f => ({ ...f, eventType: e.target.value as EventType }))}>
                      <option value="">Select type…</option>
                      {EVENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                    </select>
                  </div>
                </div>
                <label style={STYLES.label}>Description</label>
                <textarea style={STYLES.textarea} placeholder="Brief description of the event"
                  value={createForm.description ?? ''}
                  onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div style={STYLES.card}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Venue &amp; Location</h3>
                <div style={STYLES.formGrid}>
                  <div>
                    <label style={STYLES.label}>Venue Name *</label>
                    <input style={STYLES.input} required placeholder="e.g. Eko Hotel"
                      value={createForm.venue ?? ''}
                      onChange={e => setCreateForm(f => ({ ...f, venue: e.target.value }))} />
                  </div>
                  <div>
                    <label style={STYLES.label}>Address *</label>
                    <input style={STYLES.input} required placeholder="Street address"
                      value={createForm.address ?? ''}
                      onChange={e => setCreateForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                  <div>
                    <label style={STYLES.label}>City / LGA *</label>
                    <input style={STYLES.input} required placeholder="e.g. Victoria Island"
                      value={createForm.city ?? ''}
                      onChange={e => setCreateForm(f => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div>
                    <label style={STYLES.label}>State *</label>
                    <input style={STYLES.input} required placeholder="e.g. Lagos"
                      value={createForm.state ?? ''}
                      onChange={e => setCreateForm(f => ({ ...f, state: e.target.value }))} />
                  </div>
                  <div>
                    <label style={STYLES.label}>Online URL (for webinars)</label>
                    <input style={STYLES.input} type="url" placeholder="https://meet.example.com/…"
                      value={createForm.onlineUrl ?? ''}
                      onChange={e => setCreateForm(f => ({ ...f, onlineUrl: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div style={STYLES.card}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Date &amp; Time</h3>
                <div style={STYLES.formGrid}>
                  <div>
                    <label style={STYLES.label}>Start Date &amp; Time (WAT) *</label>
                    <input style={STYLES.input} type="datetime-local" required
                      value={createForm.startDate as unknown as string ?? ''}
                      onChange={e => setCreateForm(f => ({ ...f, startDate: e.target.value as unknown as number }))} />
                  </div>
                  <div>
                    <label style={STYLES.label}>End Date &amp; Time (WAT) *</label>
                    <input style={STYLES.input} type="datetime-local" required
                      value={createForm.endDate as unknown as string ?? ''}
                      onChange={e => setCreateForm(f => ({ ...f, endDate: e.target.value as unknown as number }))} />
                  </div>
                  <div>
                    <label style={STYLES.label}>Registration Deadline</label>
                    <input style={STYLES.input} type="datetime-local"
                      value={createForm.registrationDeadline as unknown as string ?? ''}
                      onChange={e => setCreateForm(f => ({ ...f, registrationDeadline: e.target.value as unknown as number }))} />
                  </div>
                </div>
              </div>

              <div style={STYLES.card}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Tickets &amp; Capacity</h3>
                <div style={STYLES.formGrid}>
                  <div>
                    <label style={STYLES.label}>Ticket Price (Naira)</label>
                    <input style={STYLES.input} type="number" min={0} step={100} placeholder="0 for free"
                      value={(createForm.ticketPriceKobo ?? 0) / 100}
                      onChange={e => setCreateForm(f => ({ ...f, ticketPriceKobo: Math.round(Number(e.target.value) * 100) }))} />
                  </div>
                  <div>
                    <label style={STYLES.label}>Currency</label>
                    <select style={STYLES.select}
                      value={createForm.currency ?? 'NGN'}
                      onChange={e => setCreateForm(f => ({ ...f, currency: e.target.value }))}>
                      <option value="NGN">NGN — Nigerian Naira</option>
                      <option value="GHS">GHS — Ghanaian Cedi</option>
                      <option value="KES">KES — Kenyan Shilling</option>
                      <option value="ZAR">ZAR — South African Rand</option>
                    </select>
                  </div>
                  <div>
                    <label style={STYLES.label}>Capacity (leave blank for unlimited)</label>
                    <input style={STYLES.input} type="number" min={1} placeholder="e.g. 500"
                      value={createForm.capacity ?? ''}
                      onChange={e => setCreateForm(f => ({ ...f, capacity: e.target.value ? Number(e.target.value) : null }))} />
                  </div>
                </div>
              </div>

              <div style={STYLES.row}>
                <button type="submit" style={STYLES.btn('primary')} disabled={createLoading}>
                  {createLoading ? 'Creating…' : 'Create Event'}
                </button>
                <button type="button" style={STYLES.btn('secondary')} onClick={() => setActiveTab('events')}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── REGISTRATIONS ── */}
        {activeTab === 'registrations' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>
                  Registrations
                </h2>
                {selectedEvent && (
                  <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
                    {selectedEvent.title}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!selectedEvent && (
                  <select style={{ ...STYLES.select, marginBottom: 0, width: 'auto' }}
                    onChange={e => {
                      const ev = events.find(x => x.id === e.target.value) ?? null;
                      setSelectedEvent(ev);
                      if (ev) loadRegistrations(ev.id);
                    }}>
                    <option value="">Select event…</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* Register form — for attendees on open events */}
            {selectedEvent?.status === 'REGISTRATION_OPEN' && (
              <div style={STYLES.card}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Register Attendee</h3>
                {regError && <div style={STYLES.error}>{regError}</div>}
                <form onSubmit={handleRegister}>
                  <div style={STYLES.formGrid}>
                    <div>
                      <label style={STYLES.label}>Full Name *</label>
                      <input style={STYLES.input} required placeholder="Chidi Okeke"
                        value={regForm.attendeeName}
                        onChange={e => setRegForm(f => ({ ...f, attendeeName: e.target.value }))} />
                    </div>
                    <div>
                      <label style={STYLES.label}>Email *</label>
                      <input style={STYLES.input} type="email" required placeholder="chidi@example.com"
                        value={regForm.attendeeEmail}
                        onChange={e => setRegForm(f => ({ ...f, attendeeEmail: e.target.value }))} />
                    </div>
                    <div>
                      <label style={STYLES.label}>Phone *</label>
                      <input style={STYLES.input} required placeholder="+2348012345678"
                        value={regForm.attendeePhone}
                        onChange={e => setRegForm(f => ({ ...f, attendeePhone: e.target.value }))} />
                    </div>
                  </div>
                  <button type="submit" style={STYLES.btn('primary')} disabled={regLoading}>
                    {regLoading ? 'Registering…' : 'Register'}
                  </button>
                </form>
              </div>
            )}

            {/* Registrations table */}
            {selectedEvent && registrations.length === 0 ? (
              <div style={STYLES.card}>
                <p style={{ margin: 0, color: '#6b7280' }}>No registrations yet.</p>
              </div>
            ) : (
              registrations.map(reg => (
                <div key={reg.id} style={STYLES.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{reg.attendeeName}</div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>{reg.attendeeEmail} · {reg.attendeePhone}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Ticket: {reg.ticketRef}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                        background: reg.status === 'CONFIRMED' ? '#d1fae5' : reg.status === 'CHECKED_IN' ? '#ede9fe' : '#fef3c7',
                        color: reg.status === 'CONFIRMED' ? '#065f46' : reg.status === 'CHECKED_IN' ? '#4c1d95' : '#92400e'
                      }}>
                        {reg.status}
                      </span>
                      {canManage && reg.status === 'PENDING' && (
                        <button style={STYLES.btn('primary')} onClick={async () => {
                          await client.confirmRegistration(selectedEvent!.id, reg.id, 'manual');
                          flash('Registration confirmed');
                          loadRegistrations(selectedEvent!.id);
                        }}>Confirm</button>
                      )}
                      {(canManage || reg.attendeeId === userId) && !['CANCELLED', 'CHECKED_IN'].includes(reg.status) && (
                        <button style={STYLES.btn('danger')} onClick={async () => {
                          await client.cancelRegistration(selectedEvent!.id, reg.id);
                          flash('Registration cancelled');
                          loadRegistrations(selectedEvent!.id);
                        }}>Cancel</button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── CHECK-IN ── */}
        {activeTab === 'checkin' && canManage && (
          <div>
            <h2 style={{ margin: '0 0 20px', fontWeight: 700, fontSize: 22 }}>Event Check-In</h2>

            {!selectedEvent ? (
              <div style={STYLES.card}>
                <label style={STYLES.label}>Select Event</label>
                <select style={STYLES.select}
                  onChange={e => {
                    const ev = events.find(x => x.id === e.target.value) ?? null;
                    setSelectedEvent(ev);
                    if (ev) loadRegistrations(ev.id);
                  }}>
                  <option value="">Select event…</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
              </div>
            ) : (
              <>
                <div style={STYLES.card}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{selectedEvent.title}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    {formatWATDate(selectedEvent.startDate)} · {selectedEvent.city}, {selectedEvent.state}
                  </div>
                  <span style={STYLES.statusBadge(selectedEvent.status)}>{STATUS_LABELS[selectedEvent.status]}</span>
                </div>

                <div style={STYLES.card}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Scan / Enter Ticket Reference</h3>
                  {checkInError && <div style={STYLES.error}>{checkInError}</div>}
                  {checkInResult && (
                    <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '12px 16px', color: '#065f46', marginBottom: 16, fontSize: 14 }}>
                      {checkInResult}
                    </div>
                  )}
                  <form onSubmit={handleCheckIn} style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...STYLES.input, marginBottom: 0, flex: 1 }}
                      placeholder="WW-EVT-2026-000001"
                      value={ticketRefInput}
                      onChange={e => setTicketRefInput(e.target.value)}
                      autoFocus />
                    <button type="submit" style={STYLES.btn('primary')}>Check In</button>
                  </form>
                </div>

                <h3 style={{ margin: '16px 0 8px', fontSize: 16 }}>
                  Checked In ({registrations.filter(r => r.status === 'CHECKED_IN').length} / {registrations.filter(r => !['CANCELLED', 'NO_SHOW'].includes(r.status)).length})
                </h3>
                {registrations.filter(r => r.status === 'CHECKED_IN').map(reg => (
                  <div key={reg.id} style={{ ...STYLES.card, padding: '12px 16px' }}>
                    <span style={{ fontWeight: 600 }}>{reg.attendeeName}</span>
                    <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 12 }}>{reg.ticketRef}</span>
                    {reg.checkedInAt && (
                      <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 12 }}>
                        · {formatWATDateTime(reg.checkedInAt)}
                      </span>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EventManagementUI;
