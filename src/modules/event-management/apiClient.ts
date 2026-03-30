/**
 * WebWaka Professional — Event Management API Client
 * Blueprint Reference: Part 9.2 — Offline First, Standard API Response format
 *
 * Thin client that wraps fetch() calls to the event-management API.
 * All responses are typed against ApiResponse<T>.
 * The client is PWA/offline-aware: callers should handle network errors gracefully.
 */

import type {
  ManagedEvent,
  EventRegistration,
  EventStatus,
  EventType
} from '../../core/db/schema';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export interface DashboardStats {
  totalEvents: number;
  publishedEvents: number;
  upcomingEvents: number;
  totalRegistrations: number;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  eventType: EventType;
  venue: string;
  address: string;
  city: string;
  state: string;
  onlineUrl?: string;
  startDate: number;
  endDate: number;
  registrationDeadline?: number;
  capacity?: number | null;
  ticketPriceKobo?: number;
  currency?: string;
  tags?: string[];
}

export interface RegisterInput {
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  attendeeId?: string;
  paymentReference?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class EventManagementApiClient {
  private readonly baseUrl: string;
  private readonly authToken: string;

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.authToken = authToken;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authToken) h['Authorization'] = `Bearer ${this.authToken}`;
    return h;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    try {
      const resp = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: this.headers(),
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
      return (await resp.json()) as ApiResponse<T>;
    } catch {
      return { success: false, errors: ['Network error — check your connection'] };
    }
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  getDashboard(): Promise<ApiResponse<DashboardStats>> {
    return this.request<DashboardStats>('GET', '/api/events/dashboard');
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  listEvents(params?: {
    status?: EventStatus;
    eventType?: EventType;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<ManagedEvent[]>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.eventType) qs.set('eventType', params.eventType);
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.offset !== undefined) qs.set('offset', String(params.offset));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<ManagedEvent[]>('GET', `/api/events${query}`);
  }

  getEvent(id: string): Promise<ApiResponse<ManagedEvent>> {
    return this.request<ManagedEvent>('GET', `/api/events/${id}`);
  }

  createEvent(input: CreateEventInput): Promise<ApiResponse<ManagedEvent>> {
    return this.request<ManagedEvent>('POST', '/api/events', input);
  }

  updateEvent(id: string, updates: Partial<ManagedEvent>): Promise<ApiResponse<ManagedEvent>> {
    return this.request<ManagedEvent>('PUT', `/api/events/${id}`, updates);
  }

  updateEventStatus(
    id: string,
    status: EventStatus,
    version: number
  ): Promise<ApiResponse<{ id: string; status: EventStatus }>> {
    return this.request('PATCH', `/api/events/${id}/status`, { status, version });
  }

  uploadBanner(id: string, file: File): Promise<ApiResponse<{ id: string; bannerUrl: string }>> {
    const form = new FormData();
    form.append('banner', file);
    // Cannot use this.headers() directly (FormData sets its own Content-Type boundary)
    const headers: Record<string, string> = {};
    if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;
    return fetch(`${this.baseUrl}/api/events/${id}/banner`, {
      method: 'POST',
      headers,
      body: form
    })
      .then(r => r.json() as Promise<ApiResponse<{ id: string; bannerUrl: string }>>)
      .catch(() => ({ success: false, errors: ['Network error — check your connection'] }));
  }

  deleteEvent(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request('DELETE', `/api/events/${id}`);
  }

  // ── Registrations ──────────────────────────────────────────────────────────

  listRegistrations(
    eventId: string,
    params?: { status?: string }
  ): Promise<ApiResponse<EventRegistration[]>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<EventRegistration[]>('GET', `/api/events/${eventId}/registrations${query}`);
  }

  register(eventId: string, input: RegisterInput): Promise<ApiResponse<EventRegistration>> {
    return this.request<EventRegistration>('POST', `/api/events/${eventId}/registrations`, input);
  }

  confirmRegistration(
    eventId: string,
    registrationId: string,
    paymentReference: string
  ): Promise<ApiResponse<{ id: string; status: string; paymentReference: string }>> {
    return this.request(
      'PATCH',
      `/api/events/${eventId}/registrations/${registrationId}/confirm`,
      { paymentReference }
    );
  }

  cancelRegistration(
    eventId: string,
    registrationId: string
  ): Promise<ApiResponse<{ id: string; status: string }>> {
    return this.request(
      'PATCH',
      `/api/events/${eventId}/registrations/${registrationId}/cancel`
    );
  }

  checkIn(
    eventId: string,
    ticketRef: string
  ): Promise<ApiResponse<{ registrationId: string; attendeeName: string; status: string; checkedInAt: number }>> {
    return this.request('POST', `/api/events/${eventId}/check-in`, { ticketRef });
  }
}
