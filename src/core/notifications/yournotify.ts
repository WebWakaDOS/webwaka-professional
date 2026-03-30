/**
 * WebWaka Professional — YourNotify Email Client
 * Blueprint Reference: Part 9.1 — "Africa First: YourNotify is the primary email notification platform."
 *
 * YourNotify is an African transactional email and notification service.
 * Docs: https://yournotify.co
 */

import { createLogger } from '../logger';

const logger = createLogger('notifications-yournotify');

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface YourNotifyEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  senderName?: string;
  senderEmail?: string;
}

export interface YourNotifyEmailResult {
  status: boolean;
  message: string;
  id?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// YOURNOTIFY CLIENT
// ─────────────────────────────────────────────────────────────────────────────

export class YourNotifyClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.yournotify.co';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Send a transactional email via YourNotify.
   */
  async sendEmail(params: YourNotifyEmailParams): Promise<YourNotifyEmailResult> {
    logger.info('Sending email via YourNotify', { to: params.to, subject: params.subject });

    const response = await fetch(`${this.baseUrl}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: this.apiKey,
        email: params.to,
        subject: params.subject,
        message: params.html,
        text_message: params.text ?? this.htmlToText(params.html),
        sender: params.senderEmail ?? 'noreply@webwaka.app',
        sender_name: params.senderName ?? 'WebWaka Professional'
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      logger.error('YourNotify email dispatch failed', { status: response.status, body: text });
      throw new Error(`YourNotify email failed (${response.status}): ${text}`);
    }

    const result = await response.json() as YourNotifyEmailResult;
    logger.info('Email dispatched via YourNotify', { messageId: result.id, to: params.to });
    return result;
  }

  /** Strip HTML tags for plain-text fallback. */
  private htmlToText(html: string): string {
    return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }
}
