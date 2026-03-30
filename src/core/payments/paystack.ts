/**
 * WebWaka Platform — Paystack Payment Gateway Integration
 * Blueprint Reference: Part 9.1 — "Nigeria First: Paystack is the primary payment gateway."
 * Blueprint Reference: Part 9.1 — "Build Once Use Infinitely: shared core utilities."
 * Blueprint Reference: Part 9.2 — "Monetary Values: All amounts in kobo (integer)."
 * Blueprint Reference: Part 9.3 — "Event-Driven: Payment confirmations published to CORE-2."
 * Blueprint Reference: Part 9.1 — "Cloudflare-First: Uses Web Crypto API for HMAC verification."
 *
 * Paystack is the Nigeria-first payment gateway used across all WebWaka modules.
 * Flutterwave is supported as a secondary gateway (stub — wire as needed per module).
 *
 * All amounts are in kobo (1 Naira = 100 kobo) — integers only.
 *
 * Build Once, Use Infinitely: Legal Practice invoices, Event tickets, and future
 * module billing all use this shared service.
 *
 * Usage (in a Cloudflare Worker route handler):
 *   const paystack = new PaystackClient(env.PAYSTACK_SECRET_KEY);
 *   const init = await paystack.initializeTransaction({ ... });
 *   // redirect user to init.authorization_url
 *
 * Webhook verification:
 *   const isValid = await PaystackClient.verifyWebhookSignature(body, signature, secretKey);
 */

import { createLogger } from '../logger';

const logger = createLogger('payments-paystack');

// ─────────────────────────────────────────────────────────────────────────────
// PAYSTACK TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface PaystackInitParams {
  /** Payer email address */
  email: string;
  /** Amount in KOBO (integer) — NOT naira */
  amountKobo: number;
  /** Your internal reference — must be unique per transaction */
  reference: string;
  /** URL to redirect to after payment (optional; defaults to your dashboard callback) */
  callbackUrl?: string;
  /** Currency code — defaults to NGN */
  currency?: string;
  /** Additional metadata to attach to the transaction */
  metadata?: Record<string, unknown>;
  /** Optional channels to enable (card, bank, ussd, qr, mobile_money, bank_transfer) */
  channels?: string[];
}

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: 'success' | 'failed' | 'abandoned' | 'pending';
    reference: string;
    amount: number;
    currency: string;
    paid_at: string | null;
    channel: string;
    customer: {
      email: string;
      customer_code: string;
    };
    metadata: Record<string, unknown> | null;
  };
}

export interface PaystackWebhookEvent {
  event: string;
  data: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    paid_at: string;
    customer: {
      email: string;
    };
    metadata: Record<string, unknown> | null;
  };
}

export interface PaystackError {
  status: false;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYSTACK CLIENT
// ─────────────────────────────────────────────────────────────────────────────

export class PaystackClient {
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Initialize a Paystack transaction.
   * Returns an authorization_url to redirect the user to.
   *
   * @param params - Transaction parameters; amountKobo must be an integer in kobo
   * @returns PaystackInitResponse with authorization_url
   */
  async initializeTransaction(
    params: PaystackInitParams
  ): Promise<PaystackInitResponse | PaystackError> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          email: params.email,
          amount: params.amountKobo,
          reference: params.reference,
          currency: params.currency ?? 'NGN',
          ...(params.callbackUrl ? { callback_url: params.callbackUrl } : {}),
          ...(params.metadata ? { metadata: params.metadata } : {}),
          ...(params.channels ? { channels: params.channels } : {})
        })
      });

      const data = (await response.json()) as PaystackInitResponse | PaystackError;

      if (!response.ok) {
        logger.error('Paystack initialize transaction failed', {
          reference: params.reference,
          status: String(response.status)
        });
      } else {
        logger.info('Paystack transaction initialized', { reference: params.reference });
      }

      return data;
    } catch (error) {
      logger.error('Paystack initialize transaction network error', {
        reference: params.reference,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { status: false, message: 'Network error connecting to Paystack' };
    }
  }

  /**
   * Verify a Paystack transaction by reference.
   * Call this after receiving a webhook or callback redirect.
   *
   * @param reference - The transaction reference from initializeTransaction
   * @returns PaystackVerifyResponse with payment status
   */
  async verifyTransaction(
    reference: string
  ): Promise<PaystackVerifyResponse | PaystackError> {
    try {
      const response = await fetch(
        `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
        { method: 'GET', headers: this.headers() }
      );

      const data = (await response.json()) as PaystackVerifyResponse | PaystackError;

      if (!response.ok) {
        logger.error('Paystack verify transaction failed', {
          reference,
          status: String(response.status)
        });
      } else {
        logger.info('Paystack transaction verified', { reference });
      }

      return data;
    } catch (error) {
      logger.error('Paystack verify transaction network error', {
        reference,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { status: false, message: 'Network error connecting to Paystack' };
    }
  }

  /**
   * Verify a Paystack webhook signature using HMAC-SHA512.
   *
   * Paystack signs webhooks with HMAC-SHA512 of the raw request body
   * using your secret key. Verify this before processing any webhook.
   *
   * @param rawBody - The raw request body as a string (do NOT parse before verifying)
   * @param signature - The x-paystack-signature header value
   * @param secretKey - Your Paystack secret key
   * @returns true if the signature is valid
   *
   * Uses Web Crypto API (available in Cloudflare Workers natively).
   */
  static async verifyWebhookSignature(
    rawBody: string,
    signature: string,
    secretKey: string
  ): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secretKey);

      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-512' },
        false,
        ['sign']
      );

      const data = encoder.encode(rawBody);
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);

      const computedHex = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      return computedHex === signature;
    } catch (error) {
      logger.error('Paystack webhook signature verification error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REFERENCE GENERATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a unique Paystack transaction reference.
 * Format: WW-{MODULE_PREFIX}-{TIMESTAMP_BASE36}-{RANDOM_7}
 * Examples:
 *   WW-INV-lh3p4k7-8x2q5r9   (Legal Practice invoice payment)
 *   WW-EVT-lh3p4k7-8x2q5r9   (Event Management ticket payment)
 */
export function generatePaystackReference(modulePrefix: 'INV' | 'EVT' | 'HR' | 'ACC'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `WW-${modulePrefix}-${timestamp}-${random}`;
}
