/**
 * WebWaka Platform — Shared Validation Utilities
 * Blueprint Reference: Part 9.1 — "Nigeria First: Nigerian phone number formats."
 * Blueprint Reference: Part 9.1 — "Build Once Use Infinitely: shared core utilities."
 *
 * Canonical validation utilities for all WebWaka Professional modules.
 * Every module that needs phone/email validation imports from here.
 *
 * Build Once, Use Infinitely: never re-implement validators per module.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a Nigerian phone number.
 *
 * Accepted formats:
 *   +2348012345678  (international with +)
 *   2348012345678   (international without +)
 *   08012345678     (local with leading 0)
 *
 * Nigerian mobile network prefixes: 070, 080, 081, 090, 091
 * Network operators: MTN, Airtel, Glo, 9mobile
 */
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

/**
 * Validate an email address.
 * Uses a practical RFC-like regex: local@domain.tld
 */
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email address' };
  }
  return { valid: true };
}
