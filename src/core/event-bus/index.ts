/**
 * WebWaka Professional — Platform Event Bus
 * Blueprint Reference: Part 5 (Platform Event Bus), Part 9.2
 *
 * Publishing model (standardized to CF Queues — matches commerce pattern):
 *   Server-side: publishEvent(c.env.PROFESSIONAL_EVENTS, event)
 *   Dev / tests:  falls back to in-memory eventBus
 *
 * DO NOT use HTTP callbacks or raw EVENT_BUS_URL — all events go via CF Queues.
 */

import { createLogger } from '../logger';

const logger = createLogger('event-bus');

// ─── Event Types ──────────────────────────────────────────────────────────────

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
  | 'legal.nba.profile_verified'
  | 'legal.trust_account.created'
  | 'legal.trust_transaction.recorded';

export type EventMgmtEventType =
  | 'event_mgmt.event.created'
  | 'event_mgmt.event.published'
  | 'event_mgmt.event.cancelled'
  | 'event_mgmt.event.completed'
  | 'event_mgmt.registration.created'
  | 'event_mgmt.registration.confirmed'
  | 'event_mgmt.registration.payment_confirmed'
  | 'event_mgmt.registration.cancelled'
  | 'event_mgmt.registration.checked_in';

export type PlatformEventType = LegalEventType | EventMgmtEventType;
export type PlatformSourceModule = 'legal_practice' | 'event_management';

// ─── Canonical Event Schema ───────────────────────────────────────────────────

export interface WebWakaEvent<T = Record<string, unknown>> {
  id: string;
  tenantId: string;
  type: string;
  sourceModule: string;
  timestamp: number;
  payload: T;
}

// ─── CF Queue interface (minimal — no hard dep on @cloudflare/workers-types) ──

export interface EventQueue {
  send(message: WebWakaEvent): Promise<void>;
}

// ─── CF Queues Producer (production) ─────────────────────────────────────────

/**
 * Publish an event to the Cloudflare Queue.
 * Falls back to in-memory eventBus in dev/test when queue is not bound.
 */
export async function publishEvent(
  queue: EventQueue | null | undefined,
  event: WebWakaEvent,
): Promise<void> {
  if (queue) {
    await queue.send(event);
  } else {
    logger.warn('PROFESSIONAL_EVENTS queue not bound — falling back to in-memory bus', { type: event.type });
    await eventBus.publish(event);
  }
}

// ─── CF Queues Consumer Dispatcher ───────────────────────────────────────────

export type EventHandler = (event: WebWakaEvent) => Promise<void>;
const consumerHandlers = new Map<string, EventHandler[]>();

export function registerHandler(eventType: string, handler: EventHandler): void {
  if (!consumerHandlers.has(eventType)) consumerHandlers.set(eventType, []);
  consumerHandlers.get(eventType)!.push(handler);
}

export function clearHandlers(): void {
  consumerHandlers.clear();
}

export async function dispatchEvent(event: WebWakaEvent): Promise<void> {
  const handlers = consumerHandlers.get(event.type) ?? [];
  await Promise.allSettled(handlers.map(h => h(event)));
}

// ─── In-Memory Bus (dev / tests) ─────────────────────────────────────────────

export class EventBusRegistry {
  private handlers: Map<string, EventHandler[]> = new Map();
  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) this.handlers.set(eventType, []);
    this.handlers.get(eventType)!.push(handler);
  }
  async publish(event: WebWakaEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];
    await Promise.allSettled(handlers.map(h => h(event)));
  }
}

export const eventBus = new EventBusRegistry();

// ─── Event factory helpers ────────────────────────────────────────────────────

function generateEventId(): string {
  return `evt_pro_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function createEvent<T = Record<string, unknown>>(
  tenantId: string,
  type: PlatformEventType,
  sourceModule: PlatformSourceModule,
  payload: T,
): WebWakaEvent<T> {
  return {
    id: generateEventId(),
    tenantId,
    type,
    sourceModule,
    timestamp: Date.now(),
    payload,
  };
}

/** @deprecated Use createEvent() instead. Legacy compatibility shim. */
export function createLegalEvent<T = Record<string, unknown>>(
  tenantId: string,
  type: LegalEventType,
  payload: T,
): WebWakaEvent<T> {
  return createEvent(tenantId, type, 'legal_practice', payload);
}

/** @deprecated Use createEvent() instead. */
export function createEventMgmtEvent<T = Record<string, unknown>>(
  tenantId: string,
  type: EventMgmtEventType,
  payload: T,
): WebWakaEvent<T> {
  return createEvent(tenantId, type, 'event_management', payload);
}
