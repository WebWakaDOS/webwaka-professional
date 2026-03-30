/**
 * WebWaka Platform — Time and Timezone Utilities
 * Blueprint Reference: Part 9.1 — "Nigeria First: WAT (West Africa Time, UTC+1) for all display."
 * Blueprint Reference: Part 9.1 — "Build Once Use Infinitely: shared core utilities."
 *
 * All internal timestamps are stored as UTC Unix milliseconds.
 * All user-facing display uses WAT (Africa/Lagos, UTC+1, no DST).
 *
 * Build Once, Use Infinitely: all modules import from here, never re-implement.
 */

/**
 * Format a UTC timestamp for display in WAT (West Africa Time, UTC+1, Africa/Lagos).
 * Defaults to: "30 Mar 2026"
 */
export function formatWATDate(
  utcTimestampMs: number,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
): string {
  return new Intl.DateTimeFormat('en-NG', {
    ...options,
    timeZone: 'Africa/Lagos'
  }).format(new Date(utcTimestampMs));
}

/**
 * Format a UTC timestamp as a full datetime string in WAT.
 * Example: "30 March 2026 at 12:00 PM WAT"
 */
export function formatWATDateTime(utcTimestampMs: number): string {
  return formatWATDate(utcTimestampMs, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}
