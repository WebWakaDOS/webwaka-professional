/**
 * WebWaka Professional — Termii SMS Client
 * Blueprint Reference: Part 9.1 — "Nigeria First: Termii is the primary SMS gateway."
 *
 * Termii is a Nigerian communications platform used across Africa.
 * Docs: https://developers.termii.com
 *
 * All outbound numbers are normalized to E.164 format (+234...) before dispatch.
 */

import { createLogger } from '../logger';

const logger = createLogger('notifications-termii');

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface TermiiSMSResult {
  message_id?: string;
  message: string;
  balance?: number;
  user?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHONE NORMALISATION — Nigerian E.164 format
// Blueprint Reference: Part 9.1 — "Nigeria First"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise a Nigerian phone number to E.164 international format (+234...).
 *
 * Handles:
 *   08012345678  → +2348012345678
 *   07012345678  → +2347012345678
 *   09012345678  → +2349012345678
 *   2348012345678 → +2348012345678
 *   +2348012345678 → +2348012345678  (already correct)
 */
export function normalizeNigerianPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-().]/g, '');

  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('234') && cleaned.length >= 13) return `+${cleaned}`;
  if (cleaned.startsWith('0') && cleaned.length === 11) return `+234${cleaned.substring(1)}`;

  return cleaned;
}

// ─────────────────────────────────────────────────────────────────────────────
// TERMII CLIENT
// ─────────────────────────────────────────────────────────────────────────────

export class TermiiClient {
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly baseUrl = 'https://api.ng.termii.com/api';

  constructor(apiKey: string, senderId = 'WebWaka') {
    this.apiKey = apiKey;
    this.senderId = senderId;
  }

  /**
   * Send an SMS to a Nigerian phone number.
   * @param to   Phone number (any Nigerian format — normalised automatically)
   * @param message  SMS text (max 160 chars for single SMS, 306 chars for concatenated)
   */
  async sendSMS(to: string, message: string): Promise<TermiiSMSResult> {
    const phone = normalizeNigerianPhone(to);

    logger.info('Sending SMS via Termii', { to: phone, messageLength: message.length });

    const response = await fetch(`${this.baseUrl}/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: phone,
        from: this.senderId,
        sms: message,
        type: 'plain',
        channel: 'generic',
        api_key: this.apiKey
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      logger.error('Termii SMS dispatch failed', { status: response.status, body: text });
      throw new Error(`Termii SMS failed (${response.status}): ${text}`);
    }

    const result = await response.json() as TermiiSMSResult;
    logger.info('SMS dispatched via Termii', { messageId: result.message_id, to: phone });
    return result;
  }
}
