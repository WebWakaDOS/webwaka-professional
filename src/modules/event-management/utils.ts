/**
 * WebWaka Professional — Event Management Utilities
 * Blueprint Reference: Part 9.1 — Nigeria First, Africa First
 * Blueprint Reference: Part 9.2 — Monetary Values as integers (kobo)
 *
 * Pure utility functions — no side effects, fully testable.
 */

// ─────────────────────────────────────────────────────────────────────────────
// ID GENERATION
// ─────────────────────────────────────────────────────────────────────────────

export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TICKET REFERENCE GENERATION
// Blueprint Reference: Part 9.1 — Nigeria First
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a human-readable ticket reference
 * Format: WW-EVT-{YEAR}-{SEQUENCE_6_DIGITS}
 * Example: WW-EVT-2026-000001
 */
export function generateTicketRef(sequence: number): string {
  const year = new Date().getFullYear();
  const seq = String(sequence).padStart(6, '0');
  return `WW-EVT-${year}-${seq}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MONETARY UTILITIES
// Blueprint Reference: Part 9.2 — Monetary values as integers (kobo)
// ─────────────────────────────────────────────────────────────────────────────

/** Convert kobo (integer) to formatted Naira string */
export function koboToNaira(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(naira);
}

/** Convert Naira (float) to kobo (integer, rounded) */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/**
 * Format a monetary amount for any supported African currency.
 * Amount is provided in the currency's smallest unit (kobo for NGN, pesewa for GHS, etc.)
 */
export function formatCurrency(amount: number, currency: string): string {
  const config = SUPPORTED_CURRENCIES[currency];
  if (!config) {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
  const value = amount / 100;
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPPORTED CURRENCIES
// Blueprint Reference: Part 9.1 — Africa First
// ─────────────────────────────────────────────────────────────────────────────

export interface CurrencyConfig {
  name: string;
  symbol: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  NGN: { name: 'Nigerian Naira', symbol: '₦', locale: 'en-NG' },
  GHS: { name: 'Ghanaian Cedi', symbol: 'GH₵', locale: 'en-GH' },
  KES: { name: 'Kenyan Shilling', symbol: 'KSh', locale: 'en-KE' },
  ZAR: { name: 'South African Rand', symbol: 'R', locale: 'en-ZA' },
  UGX: { name: 'Ugandan Shilling', symbol: 'USh', locale: 'en-UG' },
  TZS: { name: 'Tanzanian Shilling', symbol: 'TSh', locale: 'en-TZ' },
  ETB: { name: 'Ethiopian Birr', symbol: 'Br', locale: 'am-ET' },
  XOF: { name: 'West African CFA Franc', symbol: 'CFA', locale: 'fr-SN' },
};

// ─────────────────────────────────────────────────────────────────────────────
// DATE UTILITIES
// Blueprint Reference: Part 9.1 — Nigeria First (WAT = UTC+1)
// ─────────────────────────────────────────────────────────────────────────────

/** Current time as UTC Unix timestamp (ms) */
export function nowUTC(): number {
  return Date.now();
}

/** Format a UTC timestamp as a human-readable WAT date string */
export function formatWATDate(
  utcMs: number,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  return new Intl.DateTimeFormat('en-NG', {
    ...options,
    timeZone: 'Africa/Lagos'
  }).format(new Date(utcMs));
}

/** Format a UTC timestamp as a full WAT date-time string */
export function formatWATDateTime(utcMs: number): string {
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
    timeZoneName: 'short'
  }).format(new Date(utcMs));
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Validate that startDate is before endDate */
export function validateEventDates(startDate: number, endDate: number): ValidationResult {
  if (startDate >= endDate) {
    return { valid: false, error: 'Event end date must be after start date' };
  }
  if (startDate < Date.now() - 60_000) {
    return { valid: false, error: 'Event start date cannot be in the past' };
  }
  return { valid: true };
}

/** Validate that registration deadline is before event start */
export function validateRegistrationDeadline(
  registrationDeadline: number,
  startDate: number
): ValidationResult {
  if (registrationDeadline >= startDate) {
    return { valid: false, error: 'Registration deadline must be before event start' };
  }
  return { valid: true };
}

/** Validate capacity is a positive integer or null */
export function validateCapacity(capacity: number | null): ValidationResult {
  if (capacity === null) return { valid: true };
  if (!Number.isInteger(capacity) || capacity < 1) {
    return { valid: false, error: 'Capacity must be a positive integer' };
  }
  return { valid: true };
}

/** Validate ticket price is a non-negative integer (kobo) */
export function validateTicketPrice(kobo: number): ValidationResult {
  if (!Number.isInteger(kobo) || kobo < 0) {
    return { valid: false, error: 'Ticket price must be a non-negative integer in kobo' };
  }
  return { valid: true };
}

/** Validate a Nigerian phone number */
export function validateNigerianPhone(phone: string): ValidationResult {
  const cleaned = phone.replace(/\s/g, '');
  const phoneRegex = /^(\+234|234|0)[789][01]\d{8}$/;
  if (!phoneRegex.test(cleaned)) {
    return {
      valid: false,
      error: 'Invalid Nigerian phone number. Expected format: +2348012345678 or 08012345678'
    };
  }
  return { valid: true };
}

/** Validate an email address */
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email address' };
  }
  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS TRANSITION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

import type { EventStatus } from '../../core/db/schema';

/** Valid status transitions for events */
const ALLOWED_STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['REGISTRATION_OPEN', 'CANCELLED'],
  REGISTRATION_OPEN: ['REGISTRATION_CLOSED', 'CANCELLED'],
  REGISTRATION_CLOSED: ['ONGOING', 'CANCELLED'],
  ONGOING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

export function isValidStatusTransition(from: EventStatus, to: EventStatus): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

export function getAllowedTransitions(from: EventStatus): EventStatus[] {
  return ALLOWED_STATUS_TRANSITIONS[from] ?? [];
}
