/**
 * WebWaka Professional — Phase 2 Notification Tests
 * Blueprint Reference: Part 9.3 — "5-Layer QA Protocol"
 *
 * Tests:
 *   1. normalizeNigerianPhone — E.164 format conversion
 *   2. TermiiClient — sendSMS happy path, error handling
 *   3. YourNotifyClient — sendEmail happy path, error handling
 *   4. SMS Templates — output format for all 6 event types
 *   5. Email Templates — HTML structure and param injection
 *   6. NotificationService — constructor, channel selection, graceful degradation
 *   7. createNotificationService — factory function
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// 1. normalizeNigerianPhone
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeNigerianPhone, TermiiClient } from './termii';

describe('normalizeNigerianPhone', () => {
  it('converts Nigerian local format (08x) to E.164', () => {
    expect(normalizeNigerianPhone('08012345678')).toBe('+2348012345678');
  });

  it('converts Nigerian local format (07x) to E.164', () => {
    expect(normalizeNigerianPhone('07012345678')).toBe('+2347012345678');
  });

  it('converts Nigerian local format (09x) to E.164', () => {
    expect(normalizeNigerianPhone('09012345678')).toBe('+2349012345678');
  });

  it('normalises already-country-coded number without plus', () => {
    expect(normalizeNigerianPhone('2348012345678')).toBe('+2348012345678');
  });

  it('passes through already-E.164 number unchanged', () => {
    expect(normalizeNigerianPhone('+2348012345678')).toBe('+2348012345678');
  });

  it('strips spaces and dashes before normalising', () => {
    expect(normalizeNigerianPhone('0801 234 5678')).toBe('+2348012345678');
    expect(normalizeNigerianPhone('0801-234-5678')).toBe('+2348012345678');
  });

  it('strips parentheses before normalising', () => {
    expect(normalizeNigerianPhone('(080)12345678')).toBe('+2348012345678');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. TermiiClient
// ─────────────────────────────────────────────────────────────────────────────

describe('TermiiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends SMS via POST to Termii API with correct payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message_id: 'sms_abc123', message: 'Successfully Sent', balance: 100 })
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new TermiiClient('test-api-key', 'TestCo');
    const result = await client.sendSMS('08012345678', 'Hello from WebWaka!');

    expect(result.message_id).toBe('sms_abc123');
    expect(result.message).toBe('Successfully Sent');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.ng.termii.com/api/sms/send');
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body as string);
    expect(body.to).toBe('+2348012345678');
    expect(body.from).toBe('TestCo');
    expect(body.sms).toBe('Hello from WebWaka!');
    expect(body.api_key).toBe('test-api-key');
    expect(body.type).toBe('plain');
    expect(body.channel).toBe('generic');
  });

  it('uses "WebWaka" as default sender ID', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message_id: 'sms_def', message: 'Successfully Sent' })
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new TermiiClient('my-key');
    await client.sendSMS('08099887766', 'Test');

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.from).toBe('WebWaka');
  });

  it('throws on non-ok HTTP response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized'
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new TermiiClient('bad-key');
    await expect(client.sendSMS('08012345678', 'Hi')).rejects.toThrow('Termii SMS failed (401)');
  });

  it('normalises phone number automatically before sending', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message_id: 'x', message: 'Successfully Sent' })
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new TermiiClient('k');
    await client.sendSMS('+2347011112222', 'Hi');

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.to).toBe('+2347011112222');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. YourNotifyClient
// ─────────────────────────────────────────────────────────────────────────────

import { YourNotifyClient } from './yournotify';

describe('YourNotifyClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends email via POST to YourNotify API with correct payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: true, message: 'Email queued', id: 'email_xyz' })
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new YourNotifyClient('yn-api-key');
    const result = await client.sendEmail({
      to: 'user@example.com',
      subject: 'Invoice Confirmed',
      html: '<p>Thank you!</p>'
    });

    expect(result.status).toBe(true);
    expect(result.id).toBe('email_xyz');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.yournotify.co/send');
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body as string);
    expect(body.api_key).toBe('yn-api-key');
    expect(body.email).toBe('user@example.com');
    expect(body.subject).toBe('Invoice Confirmed');
    expect(body.message).toContain('Thank you');
    expect(body.sender).toBe('noreply@webwaka.app');
    expect(body.sender_name).toBe('WebWaka Professional');
  });

  it('accepts custom senderName and senderEmail', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: true, message: 'ok' })
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new YourNotifyClient('key');
    await client.sendEmail({
      to: 'a@b.com',
      subject: 'Hi',
      html: '<p>Hi</p>',
      senderName: 'Adunola Law',
      senderEmail: 'info@adunola.law'
    });

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.sender_name).toBe('Adunola Law');
    expect(body.sender).toBe('info@adunola.law');
  });

  it('throws on non-ok HTTP response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden'
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new YourNotifyClient('bad');
    await expect(client.sendEmail({ to: 'x@y.com', subject: 'Hi', html: '<p>Hi</p>' }))
      .rejects.toThrow('YourNotify email failed (403)');
  });

  it('strips HTML tags for plain-text fallback in payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: true, message: 'ok' })
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new YourNotifyClient('k');
    await client.sendEmail({
      to: 'c@d.com',
      subject: 'X',
      html: '<p>Hello <strong>World</strong></p>'
    });

    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.text_message).toBe('Hello World');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SMS Templates
// ─────────────────────────────────────────────────────────────────────────────

import {
  smsInvoiceSent,
  smsInvoicePaid,
  smsHearingScheduled,
  smsRegistrationConfirmed,
  smsPaymentConfirmed,
  smsCheckedIn
} from './templates';

describe('SMS Templates', () => {
  describe('smsInvoiceSent', () => {
    it('includes client name, invoice number and amount', () => {
      const msg = smsInvoiceSent('Chukwuemeka Obi', 'INV-2026-001', '₦50,000.00');
      expect(msg).toContain('Chukwuemeka Obi');
      expect(msg).toContain('INV-2026-001');
      expect(msg).toContain('₦50,000.00');
    });

    it('is under 306 characters (two SMS segments max)', () => {
      const msg = smsInvoiceSent('Adaeze Nwosu-Obiechina', 'INV-2026-999', '₦1,500,000.00');
      expect(msg.length).toBeLessThanOrEqual(306);
    });
  });

  describe('smsInvoicePaid', () => {
    it('includes confirmation language and invoice details', () => {
      const msg = smsInvoicePaid('Fatima Bello', 'INV-2026-042', '₦75,000.00');
      expect(msg).toContain('Fatima Bello');
      expect(msg).toContain('INV-2026-042');
      expect(msg).toContain('₦75,000.00');
      expect(msg.toLowerCase()).toMatch(/paid|payment|confirmed/);
    });
  });

  describe('smsHearingScheduled', () => {
    it('includes hearing date and court name', () => {
      const msg = smsHearingScheduled('Oluwaseun Adeyemi', '15 April 2026', 'Federal High Court, Lagos');
      expect(msg).toContain('Oluwaseun Adeyemi');
      expect(msg).toContain('15 April 2026');
      expect(msg).toContain('Federal High Court, Lagos');
    });
  });

  describe('smsRegistrationConfirmed', () => {
    it('includes event title and ticket reference', () => {
      const msg = smsRegistrationConfirmed('Amaka Okonkwo', 'Tech Summit Abuja 2026', 'WW-EVT-2026-000042');
      expect(msg).toContain('Amaka Okonkwo');
      expect(msg).toContain('Tech Summit Abuja 2026');
      expect(msg).toContain('WW-EVT-2026-000042');
    });
  });

  describe('smsPaymentConfirmed', () => {
    it('includes event title and ticket reference', () => {
      const msg = smsPaymentConfirmed('Emeka Ogbonna', 'Lagos Fashion Week', 'WW-EVT-2026-000100');
      expect(msg).toContain('Emeka Ogbonna');
      expect(msg).toContain('Lagos Fashion Week');
      expect(msg).toContain('WW-EVT-2026-000100');
    });
  });

  describe('smsCheckedIn', () => {
    it('includes attendee name and event title', () => {
      const msg = smsCheckedIn('Ngozi Eze', 'Annual Farmers Forum');
      expect(msg).toContain('Ngozi Eze');
      expect(msg).toContain('Annual Farmers Forum');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Email Templates
// ─────────────────────────────────────────────────────────────────────────────

import { emailInvoiceSent, emailInvoicePaid, emailRegistrationConfirmed, emailPaymentConfirmed } from './templates';

describe('Email Templates', () => {
  describe('emailInvoiceSent', () => {
    it('generates a subject containing the invoice number', () => {
      const { subject } = emailInvoiceSent({
        clientName: 'Kunle Adebayo',
        invoiceNumber: 'INV-2026-007',
        amountFormatted: '₦200,000.00',
        dueDate: '30 April 2026',
        firmName: 'Adebayo & Partners'
      });
      expect(subject).toContain('INV-2026-007');
    });

    it('generates HTML containing the client name and firm name', () => {
      const { html } = emailInvoiceSent({
        clientName: 'Kunle Adebayo',
        invoiceNumber: 'INV-2026-007',
        amountFormatted: '₦200,000.00',
        dueDate: '30 April 2026',
        firmName: 'Adebayo & Partners'
      });
      expect(html).toContain('Kunle Adebayo');
      expect(html).toContain('Adebayo & Partners');
      expect(html).toContain('₦200,000.00');
      expect(html).toContain('30 April 2026');
    });
  });

  describe('emailInvoicePaid', () => {
    it('subject mentions payment confirmation and invoice number', () => {
      const { subject } = emailInvoicePaid({
        clientName: 'Yetunde Lawal',
        invoiceNumber: 'INV-2026-012',
        amountFormatted: '₦50,000.00',
        paymentReference: 'PS_REF_ABCDEF'
      });
      expect(subject).toContain('INV-2026-012');
      expect(subject.toLowerCase()).toMatch(/paid|payment|confirmed/);
    });

    it('HTML includes payment reference', () => {
      const { html } = emailInvoicePaid({
        clientName: 'Yetunde Lawal',
        invoiceNumber: 'INV-2026-012',
        amountFormatted: '₦50,000.00',
        paymentReference: 'PS_REF_ABCDEF'
      });
      expect(html).toContain('PS_REF_ABCDEF');
    });
  });

  describe('emailRegistrationConfirmed', () => {
    it('subject contains the event title', () => {
      const { subject } = emailRegistrationConfirmed({
        attendeeName: 'Chidi Aneke',
        eventTitle: 'Africa Open Source Summit',
        ticketRef: 'WW-EVT-2026-000001',
        eventDate: '5 June 2026',
        venue: 'Eko Hotel, Lagos',
        amountFormatted: '₦15,000.00'
      });
      expect(subject).toContain('Africa Open Source Summit');
    });

    it('HTML includes ticket reference prominently', () => {
      const { html } = emailRegistrationConfirmed({
        attendeeName: 'Chidi Aneke',
        eventTitle: 'Africa Open Source Summit',
        ticketRef: 'WW-EVT-2026-000001',
        eventDate: '5 June 2026',
        venue: 'Eko Hotel, Lagos',
        amountFormatted: '₦15,000.00'
      });
      expect(html).toContain('WW-EVT-2026-000001');
      expect(html).toContain('Eko Hotel, Lagos');
      expect(html).toContain('5 June 2026');
    });
  });

  describe('emailPaymentConfirmed', () => {
    it('includes payment reference in HTML', () => {
      const { html } = emailPaymentConfirmed({
        attendeeName: 'Bisi Fashola',
        eventTitle: 'Kaduna Tech Fair',
        ticketRef: 'WW-EVT-2026-000200',
        amountFormatted: '₦5,000.00',
        paymentReference: 'PAY_REF_XYZ999'
      });
      expect(html).toContain('PAY_REF_XYZ999');
      expect(html).toContain('WW-EVT-2026-000200');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. NotificationService
// ─────────────────────────────────────────────────────────────────────────────

import { NotificationService, createNotificationService } from './service';

describe('NotificationService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isConfigured', () => {
    it('returns false when no API keys are provided', () => {
      const svc = new NotificationService({});
      expect(svc.isConfigured).toBe(false);
    });

    it('returns true when TERMII_API_KEY is provided', () => {
      const svc = new NotificationService({ TERMII_API_KEY: 'termii-key' });
      expect(svc.isConfigured).toBe(true);
    });

    it('returns true when only YOURNOTIFY_API_KEY is provided', () => {
      const svc = new NotificationService({ YOURNOTIFY_API_KEY: 'yn-key' });
      expect(svc.isConfigured).toBe(true);
    });

    it('returns true when both keys are provided', () => {
      const svc = new NotificationService({ TERMII_API_KEY: 'a', YOURNOTIFY_API_KEY: 'b' });
      expect(svc.isConfigured).toBe(true);
    });
  });

  describe('graceful degradation — no channels configured', () => {
    it('notifyInvoicePaid resolves without error when no keys are set', async () => {
      const svc = new NotificationService({});
      await expect(svc.notifyInvoicePaid({
        clientName: 'Test Client',
        clientPhone: '08012345678',
        clientEmail: 'test@example.com',
        invoiceNumber: 'INV-2026-001',
        totalKobo: 5000000,
        currency: 'NGN',
        paymentReference: 'PS_ABC'
      })).resolves.toBeUndefined();
    });

    it('notifyRegistrationConfirmed resolves without error when no keys are set', async () => {
      const svc = new NotificationService({});
      await expect(svc.notifyRegistrationConfirmed({
        attendeeName: 'Amaka',
        attendeePhone: '09011223344',
        attendeeEmail: 'amaka@test.com',
        eventTitle: 'Test Event',
        ticketRef: 'WW-EVT-2026-000001'
      })).resolves.toBeUndefined();
    });
  });

  describe('SMS dispatch via Termii', () => {
    it('calls Termii API when TERMII_API_KEY is set and phone is provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message_id: 'msg_001', message: 'Successfully Sent' })
      });
      vi.stubGlobal('fetch', mockFetch);

      const svc = new NotificationService({ TERMII_API_KEY: 'my-key', TERMII_SENDER_ID: 'LawFirm' });
      await svc.notifyInvoicePaid({
        clientName: 'Ade Bello',
        clientPhone: '08012345678',
        invoiceNumber: 'INV-2026-001',
        totalKobo: 10000000,
        currency: 'NGN',
        paymentReference: 'REF_123'
      });

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.ng.termii.com/api/sms/send');

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
      expect(body.api_key).toBe('my-key');
      expect(body.from).toBe('LawFirm');
      expect(body.to).toBe('+2348012345678');
      expect(body.sms).toContain('INV-2026-001');
    });

    it('sends SMS and email in parallel when both keys are set', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if ((url as string).includes('termii')) {
          return Promise.resolve({ ok: true, json: async () => ({ message_id: 'sms', message: 'ok' }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ status: true, message: 'ok' }) });
      });
      vi.stubGlobal('fetch', mockFetch);

      const svc = new NotificationService({ TERMII_API_KEY: 'tk', YOURNOTIFY_API_KEY: 'yk' });
      await svc.notifyInvoicePaid({
        clientName: 'Nkechi Oha',
        clientPhone: '07033445566',
        clientEmail: 'nkechi@lawfirm.ng',
        invoiceNumber: 'INV-2026-099',
        totalKobo: 25000000,
        currency: 'NGN',
        paymentReference: 'REF_XYZ'
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const urls = (mockFetch.mock.calls as [string, RequestInit][]).map(([u]) => u);
      expect(urls.some(u => u.includes('termii'))).toBe(true);
      expect(urls.some(u => u.includes('yournotify'))).toBe(true);
    });
  });

  describe('notifyPaymentConfirmed', () => {
    it('sends payment confirmed SMS with ticket reference', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message_id: 'm', message: 'ok' })
      });
      vi.stubGlobal('fetch', mockFetch);

      const svc = new NotificationService({ TERMII_API_KEY: 'key' });
      await svc.notifyPaymentConfirmed({
        attendeeName: 'Seun Falola',
        attendeePhone: '09099887766',
        attendeeEmail: 'seun@mail.com',
        eventTitle: 'Lagos Startup Week',
        ticketRef: 'WW-EVT-2026-000777',
        amountKobo: 1500000,
        paymentReference: 'PS_PAY_999'
      });

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
      expect(body.sms).toContain('WW-EVT-2026-000777');
      expect(body.sms).toContain('Lagos Startup Week');
    });
  });

  describe('notifyCheckedIn', () => {
    it('sends check-in SMS via Termii when key is set', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message_id: 'x', message: 'ok' })
      });
      vi.stubGlobal('fetch', mockFetch);

      const svc = new NotificationService({ TERMII_API_KEY: 'k' });
      await svc.notifyCheckedIn({
        attendeeName: 'Zara Ahmed',
        attendeePhone: '08011223344',
        eventTitle: 'Abuja Innovation Fair'
      });

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string);
      expect(body.sms).toContain('Zara Ahmed');
      expect(body.sms).toContain('Abuja Innovation Fair');
    });
  });

  describe('internal error handling — does not propagate Termii failures', () => {
    it('resolves (does not reject) when Termii returns an error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });
      vi.stubGlobal('fetch', mockFetch);

      const svc = new NotificationService({ TERMII_API_KEY: 'key' });
      await expect(svc.notifyInvoicePaid({
        clientName: 'Testname',
        clientPhone: '08011223344',
        invoiceNumber: 'INV-2026-XXX',
        totalKobo: 5000000,
        currency: 'NGN',
        paymentReference: 'REF'
      })).resolves.toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. createNotificationService factory
// ─────────────────────────────────────────────────────────────────────────────

describe('createNotificationService', () => {
  it('creates a NotificationService from a Worker env', () => {
    const svc = createNotificationService({
      TERMII_API_KEY: 'tk',
      YOURNOTIFY_API_KEY: 'yk',
      TERMII_SENDER_ID: 'WebWaka'
    });
    expect(svc).toBeInstanceOf(NotificationService);
    expect(svc.isConfigured).toBe(true);
  });

  it('creates an unconfigured service when no keys in env', () => {
    const svc = createNotificationService({});
    expect(svc.isConfigured).toBe(false);
  });
});
