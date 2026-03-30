/**
 * WebWaka Platform — Standard API Response Format
 * Blueprint Reference: Part 9.2 — "API Responses: Must follow the standard format: { success: true, data: ... }"
 * Blueprint Reference: Part 9.1 — "Build Once Use Infinitely: shared core utilities."
 *
 * Every module API uses this exact response envelope.
 * Clients depend on this contract — never deviate from it.
 *
 * Success response:  { success: true,  data: T }
 * Failure response:  { success: false, errors: string[] }
 *
 * Build Once, Use Infinitely: all module APIs import ok() and fail() from here.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/** Construct a successful API response envelope. */
export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

/** Construct a failed API response envelope. */
export function fail(errors: string[]): ApiResponse {
  return { success: false, errors };
}
