/**
 * WebWaka Platform Event Bus — CORE-2 Integration
 * Blueprint Reference: Part 5 (Platform Event Bus)
 * Blueprint Reference: Part 9.2 — "Event-Driven: Financial transactions must publish events via the event bus."
 *
 * Modules communicate via events, never via direct dependencies.
 * This module provides both a local in-process event bus (for testing/offline)
 * and a remote CORE-2 event bus publisher (for production).
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

export interface PlatformEvent<T = Record<string, unknown>> {
  /** Unique event ID */
  id: string;
  /** Multi-tenancy invariant — Part 9.2 */
  tenantId: string;
  /** Event type following dot-notation convention */
  type: LegalEventType;
  /** Source module identifier */
  sourceModule: 'legal_practice';
  /** UTC Unix timestamp (ms) */
  timestamp: number;
  /** Event payload */
  payload: T;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL EVENT BUS (in-process, used for testing and offline scenarios)
// ─────────────────────────────────────────────────────────────────────────────

type EventHandler<T = Record<string, unknown>> = (event: PlatformEvent<T>) => void | Promise<void>;

class LocalEventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  subscribe<T = Record<string, unknown>>(eventType: LegalEventType, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...existing, handler as EventHandler]);
  }

  async publish<T = Record<string, unknown>>(event: PlatformEvent<T>): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];
    await Promise.all(handlers.map(h => h(event as PlatformEvent)));
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
  event: PlatformEvent<T>,
  env: EventBusEnv
): Promise<void> {
  // Always publish to local bus (for in-process subscribers and testing)
  await localEventBus.publish(event);

  // Publish to remote CORE-2 event bus if configured
  if (!env.EVENT_BUS_URL) {
    logger.warn('EVENT_BUS_URL not configured — event published locally only', {
      eventType: event.type,
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
        eventType: event.type,
        tenantId: event.tenantId,
        status: String(response.status)
      });
    } else {
      logger.info('Event published to CORE-2 event bus', {
        eventType: event.type,
        tenantId: event.tenantId,
        eventId: event.id
      });
    }
  } catch (error) {
    logger.error('Network error publishing event to CORE-2 event bus', {
      eventType: event.type,
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
): PlatformEvent<T> {
  return {
    id: generateEventId(),
    tenantId,
    type,
    sourceModule: 'legal_practice',
    timestamp: Date.now(),
    payload
  };
}
