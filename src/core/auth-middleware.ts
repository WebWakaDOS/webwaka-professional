/**
 * WebWaka Professional — Shared Auth Middleware
 * Replaces per-module custom validateJWT implementations.
 *
 * Uses jwtAuthMiddleware and requireRole from @webwaka/core (canonical).
 *
 * Security hardened: 2026-04-01
 * Blueprint Reference: Part 9.2 (Universal Architecture Standards)
 * Blueprint Reference: Part 9.3 (Platform Conventions — RBAC)
 * Remediation: Issue #3 from Integration Audit Report 2026-04-01
 */
import { jwtAuthMiddleware, requireRole } from '@webwaka/core';
import type { MiddlewareHandler } from 'hono';

export type ProfessionalRole =
  | 'admin'
  | 'attorney'
  | 'paralegal'
  | 'client'
  | 'organizer'
  | 'attendee'
  | 'accountant'
  | 'viewer';

/**
 * Apply JWT authentication to all /api/* routes.
 * Skips /webhooks/* routes (Paystack HMAC-SHA512 auth handles those).
 *
 * Usage:
 *   app.use('/api/*', professionalAuthMiddleware);
 */
export const professionalAuthMiddleware: MiddlewareHandler = jwtAuthMiddleware({
  publicRoutes: [
    { path: '/health' },
    { path: '/webhooks', prefix: true },
  ],
});

/**
 * Require one or more roles on a specific route.
 * MUST be used after professionalAuthMiddleware.
 *
 * Usage:
 *   app.post('/api/legal/cases', requireProfessionalRole(['admin', 'attorney']), handler)
 */
export function requireProfessionalRole(roles: ProfessionalRole[]) {
  return requireRole(roles);
}
