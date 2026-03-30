/**
 * WebWaka Professional — Event Management Utilities
 * Blueprint Reference: Part 9.1 — Nigeria First, Africa First
 * Blueprint Reference: Part 9.2 — Monetary Values as integers (kobo)
 *
 * Pure utility functions — no side effects, fully testable.
 *
 * ── Shared utilities are re-exported from core for backwards compatibility ──
 * New code that needs these utilities should import from core directly:
 *   import { generateId, nowUTC } from '../../core/ids';
 *   import { koboToNaira, formatCurrency } from '../../core/money';
 *   import { validateNigerianPhone } from '../../core/validators';
 */

// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORTS FROM CORE — Backwards-compatible; tests import from './utils'
// ─────────────────────────────────────────────────────────────────────────────

export { generateId, nowUTC } from '../../core/ids';
export { koboToNaira, nairaToKobo, formatCurrency, SUPPORTED_CURRENCIES } from '../../core/money';
export type { CurrencyConfig } from '../../core/money';
export { formatWATDate, formatWATDateTime } from '../../core/time';
export { validateNigerianPhone, validateEmail } from '../../core/validators';
export type { ValidationResult } from '../../core/validators';

// ─────────────────────────────────────────────────────────────────────────────
// TICKET REFERENCE GENERATION
// Blueprint Reference: Part 9.1 — Nigeria First
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a human-readable ticket reference.
 * Format: WW-EVT-{YEAR}-{SEQUENCE_6_DIGITS}
 * Example: WW-EVT-2026-000001
 */
export function generateTicketRef(sequence: number): string {
  const year = new Date().getFullYear();
  const seq = String(sequence).padStart(6, '0');
  return `WW-EVT-${year}-${seq}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT-SPECIFIC DATE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

import type { ValidationResult } from '../../core/validators';

/** Validate that startDate is before endDate and not significantly in the past */
export function validateEventDates(startDate: number, endDate: number): ValidationResult {
  if (startDate >= endDate) {
    return { valid: false, error: 'Event end date must be after start date' };
  }
  if (startDate < Date.now() - 60_000) {
    return { valid: false, error: 'Event start date cannot be in the past' };
  }
  return { valid: true };
}

/** Validate that registration deadline is before event start date */
export function validateRegistrationDeadline(
  registrationDeadline: number,
  startDate: number
): ValidationResult {
  if (registrationDeadline >= startDate) {
    return { valid: false, error: 'Registration deadline must be before event start' };
  }
  return { valid: true };
}

/** Validate capacity is a positive integer or null (null means unlimited) */
export function validateCapacity(capacity: number | null): ValidationResult {
  if (capacity === null) return { valid: true };
  if (!Number.isInteger(capacity) || capacity < 1) {
    return { valid: false, error: 'Capacity must be a positive integer' };
  }
  return { valid: true };
}

/** Validate ticket price is a non-negative integer in kobo */
export function validateTicketPrice(kobo: number): ValidationResult {
  if (!Number.isInteger(kobo) || kobo < 0) {
    return { valid: false, error: 'Ticket price must be a non-negative integer in kobo' };
  }
  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS TRANSITION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

import type { EventStatus } from '../../core/db/schema';

/** Valid status transitions for managed events */
const ALLOWED_STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['REGISTRATION_OPEN', 'CANCELLED'],
  REGISTRATION_OPEN: ['REGISTRATION_CLOSED', 'CANCELLED'],
  REGISTRATION_CLOSED: ['ONGOING', 'CANCELLED'],
  ONGOING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

/** Return true if the status transition from → to is a valid business-rule transition */
export function isValidStatusTransition(from: EventStatus, to: EventStatus): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

/** Return all valid next statuses from a given current status */
export function getAllowedTransitions(from: EventStatus): EventStatus[] {
  return ALLOWED_STATUS_TRANSITIONS[from] ?? [];
}
