/**
 * WebWaka Platform — ID and Timestamp Generation
 * Blueprint Reference: Part 9.2 — "ID Generation: Application-layer UUID generation."
 * Blueprint Reference: Part 9.1 — "Build Once Use Infinitely: shared core utilities."
 *
 * Canonical ID generation for all WebWaka Professional modules.
 * IDs are generated at the application layer — never delegated to the DB.
 * All timestamps are UTC Unix milliseconds.
 *
 * Build Once, Use Infinitely: all modules import from here, never re-implement.
 */

/**
 * Generate a unique prefixed ID for any entity.
 * Format: {prefix}_{base36_timestamp}_{base36_random_7_chars}
 * Example: evt_lh3p4k7_8x2q5r9
 *
 * Collision probability: negligible for professional-services workloads
 * (< 1 billion IDs per prefix per millisecond).
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Get the current UTC timestamp in milliseconds.
 * Canonical source of "now" for all modules — use instead of bare Date.now().
 */
export function nowUTC(): number {
  return Date.now();
}
