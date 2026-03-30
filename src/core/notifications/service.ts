/**
 * WebWaka Professional — Notification Service
 * Blueprint Reference: Part 9.1 — "Nigeria First / Africa First"
 * Blueprint Reference: Part 9.3 — "Event-Driven: Notifications triggered by platform events."
 *
 * Orchestrates Termii SMS and YourNotify email notifications for key business events.
 *
 * Design principles:
 *  - Fire-and-forget friendly: no method throws; all errors are logged internally.
 *  - Graceful degradation: if API keys are not configured, notifications are silently skipped.
 *  - Dual-channel: SMS (Termii) + Email (YourNotify) sent in parallel for each event.
 */

import { createLogger } from '../logger';
import { formatCurrency } from '../money';
import { TermiiClient } from './termii';
import { YourNotifyClient } from './yournotify';
import {
  smsInvoiceSent,
  smsInvoicePaid,
  smsHearingScheduled,
  smsRegistrationConfirmed,
  smsPaymentConfirmed,
  smsCheckedIn,
  emailInvoiceSent,
  emailInvoicePaid,
  emailRegistrationConfirmed,
  emailPaymentConfirmed
} from './templates';

const logger = createLogger('notification-service');

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificationEnv {
  TERMII_API_KEY?: string;
  YOURNOTIFY_API_KEY?: string;
  TERMII_SENDER_ID?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PARAMETER TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface InvoiceSentParams {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  invoiceNumber: string;
  totalKobo: number;
  currency: string;
  dueDate: number;
  firmName?: string;
}

export interface InvoicePaidParams {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  invoiceNumber: string;
  totalKobo: number;
  currency: string;
  paymentReference: string;
}

export interface RegistrationParams {
  attendeeName: string;
  attendeePhone: string;
  attendeeEmail: string;
  eventTitle: string;
  ticketRef: string;
  eventDate?: string;
  venue?: string;
  amountKobo?: number;
  currency?: string;
  paymentReference?: string;
}

export interface HearingParams {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  hearingDate: string;
  courtName: string;
}

export interface CheckInParams {
  attendeeName: string;
  attendeePhone: string;
  eventTitle: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export class NotificationService {
  private readonly termii: TermiiClient | null;
  private readonly yournotify: YourNotifyClient | null;

  constructor(env: NotificationEnv) {
    this.termii = env.TERMII_API_KEY
      ? new TermiiClient(env.TERMII_API_KEY, env.TERMII_SENDER_ID)
      : null;
    this.yournotify = env.YOURNOTIFY_API_KEY
      ? new YourNotifyClient(env.YOURNOTIFY_API_KEY)
      : null;
  }

  /** Returns true if at least one notification channel is configured. */
  get isConfigured(): boolean {
    return this.termii !== null || this.yournotify !== null;
  }

  // ── Legal Practice ──────────────────────────────────────────────────────────

  async notifyInvoiceSent(params: InvoiceSentParams): Promise<void> {
    const amountFormatted = formatCurrency(params.totalKobo, params.currency);
    const dueDateStr = new Date(params.dueDate).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' });

    await this.dispatch({
      sms: {
        to: params.clientPhone,
        message: smsInvoiceSent(params.clientName, params.invoiceNumber, amountFormatted)
      },
      email: params.clientEmail ? {
        to: params.clientEmail,
        ...emailInvoiceSent({
          clientName: params.clientName,
          invoiceNumber: params.invoiceNumber,
          amountFormatted,
          dueDate: dueDateStr,
          firmName: params.firmName
        })
      } : undefined,
      context: `invoice.sent:${params.invoiceNumber}`
    });
  }

  async notifyInvoicePaid(params: InvoicePaidParams): Promise<void> {
    const amountFormatted = formatCurrency(params.totalKobo, params.currency);

    await this.dispatch({
      sms: {
        to: params.clientPhone,
        message: smsInvoicePaid(params.clientName, params.invoiceNumber, amountFormatted)
      },
      email: params.clientEmail ? {
        to: params.clientEmail,
        ...emailInvoicePaid({
          clientName: params.clientName,
          invoiceNumber: params.invoiceNumber,
          amountFormatted,
          paymentReference: params.paymentReference
        })
      } : undefined,
      context: `invoice.paid:${params.invoiceNumber}`
    });
  }

  async notifyHearingScheduled(params: HearingParams): Promise<void> {
    await this.dispatch({
      sms: {
        to: params.clientPhone,
        message: smsHearingScheduled(params.clientName, params.hearingDate, params.courtName)
      },
      context: `hearing.scheduled:${params.hearingDate}`
    });
  }

  // ── Event Management ────────────────────────────────────────────────────────

  async notifyRegistrationConfirmed(params: RegistrationParams): Promise<void> {
    const amountFormatted = formatCurrency(params.amountKobo ?? 0, params.currency ?? 'NGN');

    await this.dispatch({
      sms: {
        to: params.attendeePhone,
        message: smsRegistrationConfirmed(params.attendeeName, params.eventTitle, params.ticketRef)
      },
      email: {
        to: params.attendeeEmail,
        ...emailRegistrationConfirmed({
          attendeeName: params.attendeeName,
          eventTitle: params.eventTitle,
          ticketRef: params.ticketRef,
          eventDate: params.eventDate ?? 'See event page',
          venue: params.venue ?? 'See event page',
          amountFormatted
        })
      },
      context: `registration.confirmed:${params.ticketRef}`
    });
  }

  async notifyPaymentConfirmed(params: RegistrationParams): Promise<void> {
    const amountFormatted = formatCurrency(params.amountKobo ?? 0, params.currency ?? 'NGN');

    await this.dispatch({
      sms: {
        to: params.attendeePhone,
        message: smsPaymentConfirmed(params.attendeeName, params.eventTitle, params.ticketRef)
      },
      email: {
        to: params.attendeeEmail,
        ...emailPaymentConfirmed({
          attendeeName: params.attendeeName,
          eventTitle: params.eventTitle,
          ticketRef: params.ticketRef,
          amountFormatted,
          paymentReference: params.paymentReference ?? ''
        })
      },
      context: `payment.confirmed:${params.ticketRef}`
    });
  }

  async notifyCheckedIn(params: CheckInParams): Promise<void> {
    await this.dispatch({
      sms: {
        to: params.attendeePhone,
        message: smsCheckedIn(params.attendeeName, params.eventTitle)
      },
      context: `checked.in:${params.attendeeName}`
    });
  }

  // ── Internal dispatch ───────────────────────────────────────────────────────

  private async dispatch(options: {
    sms?: { to: string; message: string };
    email?: { to: string; subject: string; html: string };
    context: string;
  }): Promise<void> {
    const tasks: Promise<unknown>[] = [];

    if (options.sms && this.termii) {
      tasks.push(
        this.termii.sendSMS(options.sms.to, options.sms.message)
          .catch(err => logger.error(`SMS dispatch failed [${options.context}]`, { error: String(err) }))
      );
    }

    if (options.email && this.yournotify) {
      tasks.push(
        this.yournotify.sendEmail(options.email)
          .catch(err => logger.error(`Email dispatch failed [${options.context}]`, { error: String(err) }))
      );
    }

    if (tasks.length === 0) {
      logger.warn(`No notification channels configured — skipping [${options.context}]`);
      return;
    }

    await Promise.all(tasks);
  }
}

/**
 * Factory — creates a NotificationService from a Worker env object.
 * Usage in route handlers:
 *   const notifier = createNotificationService(c.env);
 *   void notifier.notifyInvoicePaid({...}).catch(err => logger.error('...', err));
 */
export function createNotificationService(env: NotificationEnv): NotificationService {
  return new NotificationService(env);
}
