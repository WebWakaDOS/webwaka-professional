/**
 * WebWaka Platform Event Bus — CORE-2 Integration
 * Blueprint Reference: Part 5 (Platform Event Bus)
 * Blueprint Reference: Part 9.2 — "Event-Driven: Financial transactions must publish events via the event bus."
 *
 * Modules communicate via events, never via direct dependencies.
 * This module provides both a local in-process event bus (for testing/offline)
 * and a remote CORE-2 event bus publisher (for production).
 *
 * Schema: Unified WebWakaEvent<T> from @webwaka/core/events
 * Ref: EVENT_BUS_SCHEMA.md — event, tenantId, payload, timestamp (number)
 */

import { createLogger } from '../logger';

const logger = createLogger('event-bus');

// ─────────────────────────────────────────────────────────────────────────────
// EVENT TYPES — Legal Practice Module
// Blueprint Reference: Part 5 (Event Examples)
// ─────────────────────────────────────────────────────────────────────────────

export type LegalEventType =
  | 'legal.client.created'
  | 'legal.client.updated'
  | 'legal.case.created'
  | 'legal.case.status_changed'
  | 'legal.case.hearing_scheduled'
  | 'legal.time_entry.created'
  | 'legal.invoice.created'
  | 'legal.invoice.sent'
  | 'legal.invoice.paid'
  | 'legal.document.uploaded'
  | 'legal.nba.profile_verified';

export type EventMgmtEventType =
  | 'event_mgmt.event.created'
  | 'event_mgmt.event.published'
  | 'event_mgmt.event.registration_opened'
  | 'event_mgmt.event.registration_closed'
  | 'event_mgmt.event.cancelled'
  | 'event_mgmt.event.completed'
  | 'event_mgmt.event.updated'
  | 'event_mgmt.event.banner_uploaded'
  | 'event_mgmt.registration.created'
  | 'event_mgmt.registration.confirmed'
  | 'event_mgmt.registration.payment_confirmed'
  | 'event_mgmt.registration.cancelled'
  | 'event_mgmt.registration.checked_in';

export type PlatformEventType = LegalEventType | EventMgmtEventType;
export type PlatformSourceModule = 'legal_practice' | 'event_management';

/**
 * Unified WebWaka Platform Event Bus Schema (Governance-Mandated).
 *
 * Strictly conforms to the standard WebWakaEvent<T> shape:
 *   event (string), tenantId (string), payload (T), timestamp (number)
 *
 * Legacy fields (id, sourceModule) are moved into the payload object
 * to preserve domain context while conforming to the standard schema.
 *
 * Reference: EVENT_BUS_SCHEMA.md in webwaka-platform-docs
 */
export interface WebWakaEvent<T = Record<string, unknown>> {
  /** The event type in dot-notation (e.g., 'legal.client.created') */
  event: string;
  /** The ID of the tenant emitting the event */
  tenantId: string;
  /** The event-specific payload (includes id, sourceModule, and domain fields) */
  payload: T;
  /** UTC Unix timestamp in milliseconds */
  timestamp: number;
}

/**
 * @deprecated Use WebWakaEvent<T> instead for governance compliance.
 * Kept for backward compatibility only.
 */
export interface PlatformEvent<T = Record<string, unknown>> {
  /** Unique event ID */
  id: string;
  /** Multi-tenancy invariant — Part 9.2 */
  tenantId: string;
  /** Event type following dot-notation convention */
  type: PlatformEventType;
  /** Source module identifier */
  sourceModule: PlatformSourceModule;
  /** UTC Unix timestamp (ms) */
  timestamp: number;
  /** Event payload */
  payload: T;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL EVENT BUS (in-process, used for testing and offline scenarios)
// ─────────────────────────────────────────────────────────────────────────────

type EventHandler<T = Record<string, unknown>> = (event: WebWakaEvent<T>) => void | Promise<void>;

class LocalEventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  subscribe<T = Record<string, unknown>>(eventType: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...existing, handler as EventHandler]);
  }

  async publish<T = Record<string, unknown>>(event: WebWakaEvent<T>): Promise<void> {
    const handlers = this.handlers.get(event.event) ?? [];
    await Promise.all(handlers.map(h => h(event as WebWakaEvent)));
  }

  clearHandlers(): void {
    this.handlers.clear();
  }
}

export const localEventBus = new LocalEventBus();

// ─────────────────────────────────────────────────────────────────────────────
// REMOTE EVENT BUS PUBLISHER (CORE-2 integration)
// Blueprint Reference: Part 5 — "Modules → Event Bus → Subscribers"
// ─────────────────────────────────────────────────────────────────────────────

export interface EventBusEnv {
  EVENT_BUS_URL?: string | undefined;
  EVENT_BUS_API_KEY?: string | undefined;
}

export async function publishEvent<T = Record<string, unknown>>(
  event: WebWakaEvent<T>,
  env: EventBusEnv
): Promise<void> {
  // Always publish to local bus (for in-process subscribers and testing)
  await localEventBus.publish(event);

  // Publish to remote CORE-2 event bus if configured
  if (!env.EVENT_BUS_URL) {
    logger.warn('EVENT_BUS_URL not configured — event published locally only', {
      event: event.event,
      tenantId: event.tenantId
    });
    return;
  }

  try {
    const response = await fetch(env.EVENT_BUS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': event.tenantId,
        ...(env.EVENT_BUS_API_KEY ? { Authorization: `Bearer ${env.EVENT_BUS_API_KEY}` } : {})
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      logger.error('Failed to publish event to CORE-2 event bus', {
        event: event.event,
        tenantId: event.tenantId,
        status: String(response.status)
      });
    } else {
      logger.info('Event published to CORE-2 event bus', {
        event: event.event,
        tenantId: event.tenantId,
      });
    }
  } catch (error) {
    logger.error('Network error publishing event to CORE-2 event bus', {
      event: event.event,
      tenantId: event.tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT FACTORY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function generateEventId(): string {
  return `evt_pro_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function createEvent<T = Record<string, unknown>>(
  tenantId: string,
  type: LegalEventType,
  payload: T
): WebWakaEvent<T & { id: string; sourceModule: PlatformSourceModule }> {
  return {
    event: type,
    tenantId,
    payload: { ...payload, id: generateEventId(), sourceModule: 'legal_practice' as PlatformSourceModule },
    timestamp: Date.now(),
  };
}

export function createEventMgmtEvent<T = Record<string, unknown>>(
  tenantId: string,
  type: EventMgmtEventType,
  payload: T
): WebWakaEvent<T & { id: string; sourceModule: PlatformSourceModule }> {
  return {
    event: type,
    tenantId,
    payload: { ...payload, id: generateEventId(), sourceModule: 'event_management' as PlatformSourceModule },
    timestamp: Date.now(),
  };
}
