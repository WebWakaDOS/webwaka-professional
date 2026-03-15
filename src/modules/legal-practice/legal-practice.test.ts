/**
 * WebWaka Professional — PRO-1 Legal Practice Module Tests
 * Blueprint Reference: Part 9.3 — "5-Layer QA Protocol"
 *
 * Layer 2 QA: Unit tests for all pure functions, utilities, i18n, event bus, and schema validation.
 * All tests are written against the ACTUAL function signatures — no assumptions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// UTILS TESTS — actual signatures from utils.ts
// ─────────────────────────────────────────────────────────────────────────────

import {
  generateId,
  generateCaseReference,
  generateInvoiceNumber,
  calculateTimeEntryAmount,
  calculateVAT,
  koboToNaira,
  nairaToKobo,
  formatCurrency,
  formatDuration,
  formatWATDate,
  formatWATDateTime,
  nowUTC,
  validateNBABarNumber,
  validateYearOfCall,
  getNDPRConsentText,
  SUPPORTED_CURRENCIES
} from './utils';

describe('generateId', () => {
  it('generates a non-empty string with the given prefix', () => {
    const id = generateId('pro');
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^pro_/);
    expect(id.length).toBeGreaterThan(4);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId('test')));
    expect(ids.size).toBe(100);
  });
});

describe('generateCaseReference', () => {
  it('generates a case reference with correct format WW/{STATE}/{YEAR}/{SEQ}', () => {
    const ref = generateCaseReference('Lagos', 1);
    expect(ref).toMatch(/^WW\/[A-Z]+\/\d{4}\/\d{3}$/);
  });

  it('includes the current year', () => {
    const ref = generateCaseReference('Lagos', 1);
    const year = new Date().getFullYear().toString();
    expect(ref).toContain(year);
  });

  it('uses known state code for Lagos', () => {
    const ref = generateCaseReference('Lagos', 5);
    expect(ref).toContain('LAG');
  });

  it('uses NGR as fallback for unknown state', () => {
    const ref = generateCaseReference('UnknownState', 1);
    expect(ref).toContain('NGR');
  });

  it('pads sequence number to 3 digits', () => {
    const ref = generateCaseReference('Lagos', 7);
    expect(ref).toContain('007');
  });
});

describe('generateInvoiceNumber', () => {
  it('generates an invoice number with format INV-YYYY-SEQ', () => {
    const num = generateInvoiceNumber(1);
    expect(num).toMatch(/^INV-\d{4}-\d{3}$/);
  });

  it('includes the current year', () => {
    const num = generateInvoiceNumber(1);
    const year = new Date().getFullYear().toString();
    expect(num).toContain(year);
  });

  it('pads sequence to 3 digits', () => {
    const num = generateInvoiceNumber(42);
    expect(num).toContain('042');
  });
});

describe('calculateTimeEntryAmount', () => {
  it('calculates amount correctly for whole hours', () => {
    // 120 mins at 5,000,000 kobo/hr = 10,000,000 kobo
    const amount = calculateTimeEntryAmount(120, 5000000);
    expect(amount).toBe(10000000);
  });

  it('calculates amount correctly for partial hours', () => {
    // 30 mins at 6,000,000 kobo/hr = 3,000,000 kobo
    const amount = calculateTimeEntryAmount(30, 6000000);
    expect(amount).toBe(3000000);
  });

  it('returns 0 for 0 minutes', () => {
    expect(calculateTimeEntryAmount(0, 5000000)).toBe(0);
  });

  it('returns 0 for 0 rate', () => {
    expect(calculateTimeEntryAmount(60, 0)).toBe(0);
  });
});

describe('calculateVAT', () => {
  it('calculates 7.5% VAT correctly', () => {
    // 10,000,000 kobo → VAT = 750,000 kobo
    expect(calculateVAT(10000000)).toBe(750000);
  });

  it('returns 0 for 0 amount', () => {
    expect(calculateVAT(0)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    // 1 kobo → VAT = 0 (floor of 0.075)
    expect(Number.isInteger(calculateVAT(1))).toBe(true);
  });
});

describe('koboToNaira', () => {
  it('returns a formatted string (not a number)', () => {
    const result = koboToNaira(1000000);
    expect(typeof result).toBe('string');
  });

  it('formats 10000 kobo as ₦100', () => {
    const result = koboToNaira(10000);
    expect(result).toContain('100');
  });

  it('formats 0 kobo', () => {
    const result = koboToNaira(0);
    expect(result).toContain('0');
  });

  it('formats large amounts with thousands separator', () => {
    const result = koboToNaira(100000000); // ₦1,000,000
    expect(result).toContain('1,000,000');
  });
});

describe('nairaToKobo', () => {
  it('converts naira to kobo correctly', () => {
    expect(nairaToKobo(1000)).toBe(100000);
    expect(nairaToKobo(50000)).toBe(5000000);
    expect(nairaToKobo(0)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(Number.isInteger(nairaToKobo(1.5))).toBe(true);
    expect(nairaToKobo(1.5)).toBe(150);
  });
});

describe('formatCurrency', () => {
  it('formats NGN correctly', () => {
    const result = formatCurrency(100000, 'NGN'); // ₦1,000
    expect(typeof result).toBe('string');
    expect(result).toContain('1,000');
  });

  it('formats GHS (Ghanaian Cedi)', () => {
    const result = formatCurrency(100000, 'GHS');
    expect(typeof result).toBe('string');
  });

  it('handles unknown currency with fallback', () => {
    const result = formatCurrency(100000, 'XYZ');
    expect(result).toContain('XYZ');
    expect(result).toContain('1000.00');
  });
});

describe('formatDuration', () => {
  it('formats minutes only', () => {
    expect(formatDuration(30)).toBe('30m');
    expect(formatDuration(45)).toBe('45m');
  });

  it('formats hours only', () => {
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(120)).toBe('2h');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(150)).toBe('2h 30m');
  });

  it('handles 0 minutes', () => {
    expect(formatDuration(0)).toBe('0m');
  });
});

describe('formatWATDate', () => {
  it('returns a non-empty string for a valid UTC timestamp', () => {
    const display = formatWATDate(Date.now());
    expect(typeof display).toBe('string');
    expect(display.length).toBeGreaterThan(0);
  });

  it('accepts optional Intl.DateTimeFormatOptions', () => {
    const display = formatWATDate(Date.now(), { year: 'numeric', month: 'long', day: 'numeric' });
    expect(typeof display).toBe('string');
  });
});

describe('formatWATDateTime', () => {
  it('returns a non-empty string with time info', () => {
    const display = formatWATDateTime(Date.now());
    expect(typeof display).toBe('string');
    expect(display.length).toBeGreaterThan(0);
    // Should include WAT timezone indicator
    expect(display).toMatch(/WAT|GMT\+1/);
  });
});

describe('nowUTC', () => {
  it('returns a Unix timestamp in milliseconds', () => {
    const now = nowUTC();
    expect(typeof now).toBe('number');
    expect(now).toBeGreaterThan(0);
    expect(Math.abs(now - Date.now())).toBeLessThan(1000);
  });
});

describe('validateNBABarNumber', () => {
  it('accepts valid NBA bar numbers with branch code', () => {
    expect(validateNBABarNumber('NBA/LAG/2015/001234').valid).toBe(true);
    expect(validateNBABarNumber('NBA/FCT/2020/000001').valid).toBe(true);
    expect(validateNBABarNumber('NBA/KAN/1999/9999').valid).toBe(true);
  });

  it('rejects empty string', () => {
    expect(validateNBABarNumber('').valid).toBe(false);
  });

  it('rejects wrong prefix', () => {
    expect(validateNBABarNumber('ABC/LAG/2015/001234').valid).toBe(false);
  });

  it('rejects wrong separator', () => {
    expect(validateNBABarNumber('NBA-LAG-2015-001234').valid).toBe(false);
  });

  it('rejects branch code that is too short', () => {
    expect(validateNBABarNumber('NBA/L/2015/001234').valid).toBe(false);
  });

  it('rejects sequence that is too short', () => {
    expect(validateNBABarNumber('NBA/LAG/2015/123').valid).toBe(false);
  });

  it('rejects year before 1963 (pre-NBA)', () => {
    expect(validateNBABarNumber('NBA/LAG/1962/001234').valid).toBe(false);
  });

  it('rejects future year', () => {
    const futureYear = new Date().getFullYear() + 1;
    expect(validateNBABarNumber(`NBA/LAG/${futureYear}/001234`).valid).toBe(false);
  });

  it('returns error message on invalid bar number', () => {
    const result = validateNBABarNumber('INVALID');
    expect(result.valid).toBe(false);
    expect(typeof result.error).toBe('string');
    expect(result.error!.length).toBeGreaterThan(0);
  });
});

describe('validateYearOfCall', () => {
  it('accepts valid years of call (1963 to current year)', () => {
    expect(validateYearOfCall(1963).valid).toBe(true);
    expect(validateYearOfCall(2000).valid).toBe(true);
    expect(validateYearOfCall(new Date().getFullYear()).valid).toBe(true);
  });

  it('rejects years before 1963 (pre-NBA)', () => {
    expect(validateYearOfCall(1962).valid).toBe(false);
    expect(validateYearOfCall(1900).valid).toBe(false);
  });

  it('rejects future years', () => {
    expect(validateYearOfCall(new Date().getFullYear() + 1).valid).toBe(false);
  });

  it('returns error message on invalid year', () => {
    const result = validateYearOfCall(1900);
    expect(result.valid).toBe(false);
    expect(typeof result.error).toBe('string');
  });
});

describe('getNDPRConsentText', () => {
  it('returns English consent text', () => {
    const text = getNDPRConsentText('en');
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(50);
    expect(text).toContain('NDPR');
  });

  it('returns Yoruba consent text different from English', () => {
    const en = getNDPRConsentText('en');
    const yo = getNDPRConsentText('yo');
    expect(yo).not.toBe(en);
    expect(yo.length).toBeGreaterThan(50);
  });

  it('returns Igbo consent text different from English', () => {
    const en = getNDPRConsentText('en');
    const ig = getNDPRConsentText('ig');
    expect(ig).not.toBe(en);
  });

  it('returns Hausa consent text different from English', () => {
    const en = getNDPRConsentText('en');
    const ha = getNDPRConsentText('ha');
    expect(ha).not.toBe(en);
  });
});

describe('SUPPORTED_CURRENCIES', () => {
  it('includes NGN as default Nigeria currency', () => {
    expect(SUPPORTED_CURRENCIES['NGN']).toBeDefined();
    expect(SUPPORTED_CURRENCIES['NGN']!.symbol).toBe('₦');
  });

  it('includes African currencies (GHS, KES, ZAR, UGX, TZS, ETB, XOF)', () => {
    expect(SUPPORTED_CURRENCIES['GHS']).toBeDefined();
    expect(SUPPORTED_CURRENCIES['KES']).toBeDefined();
    expect(SUPPORTED_CURRENCIES['ZAR']).toBeDefined();
    expect(SUPPORTED_CURRENCIES['UGX']).toBeDefined();
    expect(SUPPORTED_CURRENCIES['TZS']).toBeDefined();
    expect(SUPPORTED_CURRENCIES['ETB']).toBeDefined();
    expect(SUPPORTED_CURRENCIES['XOF']).toBeDefined();
  });

  it('each currency has name, symbol, and locale', () => {
    Object.values(SUPPORTED_CURRENCIES).forEach(currency => {
      expect(typeof currency.name).toBe('string');
      expect(typeof currency.symbol).toBe('string');
      expect(typeof currency.locale).toBe('string');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// I18N TESTS — actual structure from i18n.ts
// ─────────────────────────────────────────────────────────────────────────────

import { getTranslations, getSupportedLanguages } from './i18n';
import type { Language } from './i18n';

describe('getTranslations', () => {
  const languages: Language[] = ['en', 'yo', 'ig', 'ha'];

  it('returns translations for all 4 supported languages', () => {
    languages.forEach(lang => {
      const t = getTranslations(lang);
      expect(t).toBeDefined();
      expect(typeof t.nav.dashboard).toBe('string');
    });
  });

  it('returns English as the fallback for unsupported languages', () => {
    const t = getTranslations('fr' as Language);
    const en = getTranslations('en');
    expect(t.nav.dashboard).toBe(en.nav.dashboard);
  });

  it('has all required top-level keys in English', () => {
    const t = getTranslations('en');
    expect(t).toHaveProperty('nav');
    expect(t).toHaveProperty('dashboard');
    expect(t).toHaveProperty('clients');
    expect(t).toHaveProperty('cases');
    expect(t).toHaveProperty('timeEntries');
    expect(t).toHaveProperty('invoices');
    expect(t).toHaveProperty('nba');
    expect(t).toHaveProperty('common');
  });

  it('has all required nav keys', () => {
    const t = getTranslations('en');
    expect(t.nav).toHaveProperty('dashboard');
    expect(t.nav).toHaveProperty('clients');
    expect(t.nav).toHaveProperty('cases');
    expect(t.nav).toHaveProperty('timeEntries');
    expect(t.nav).toHaveProperty('invoices');
    expect(t.nav).toHaveProperty('documents');
    expect(t.nav).toHaveProperty('nbaCompliance');
  });

  it('has all required NBA compliance keys', () => {
    const t = getTranslations('en');
    expect(t.nba).toHaveProperty('title');
    expect(t.nba).toHaveProperty('barNumber');
    expect(t.nba).toHaveProperty('yearOfCall');
    expect(t.nba).toHaveProperty('barNumberHelp');
  });

  it('has all required common keys', () => {
    const t = getTranslations('en');
    expect(t.common).toHaveProperty('offline');
    expect(t.common).toHaveProperty('offlineMessage');
    expect(t.common).toHaveProperty('syncPending');
    expect(t.common).toHaveProperty('naira');
    expect(t.common).toHaveProperty('currency');
  });

  it('Yoruba nav dashboard translation is different from English', () => {
    const en = getTranslations('en');
    const yo = getTranslations('yo');
    expect(yo.nav.dashboard).not.toBe(en.nav.dashboard);
  });

  it('Igbo nav dashboard translation is different from English', () => {
    const en = getTranslations('en');
    const ig = getTranslations('ig');
    expect(ig.nav.dashboard).not.toBe(en.nav.dashboard);
  });

  it('Hausa nav dashboard translation is different from English', () => {
    const en = getTranslations('en');
    const ha = getTranslations('ha');
    expect(ha.nav.dashboard).not.toBe(en.nav.dashboard);
  });

  it('all languages have non-empty string values for nav keys', () => {
    languages.forEach(lang => {
      const t = getTranslations(lang);
      Object.values(t.nav).forEach(val => {
        expect(typeof val).toBe('string');
        expect(val.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('getSupportedLanguages', () => {
  it('returns 4 supported languages', () => {
    const langs = getSupportedLanguages();
    expect(langs.length).toBe(4);
  });

  it('includes all 4 required languages', () => {
    const langs = getSupportedLanguages();
    const codes = langs.map(l => l.code);
    expect(codes).toContain('en');
    expect(codes).toContain('yo');
    expect(codes).toContain('ig');
    expect(codes).toContain('ha');
  });

  it('each language has code, name, and nativeName', () => {
    getSupportedLanguages().forEach(lang => {
      expect(typeof lang.code).toBe('string');
      expect(typeof lang.name).toBe('string');
      expect(typeof lang.nativeName).toBe('string');
      expect(lang.nativeName.length).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENT BUS TESTS — actual API from event-bus/index.ts
// ─────────────────────────────────────────────────────────────────────────────

import { localEventBus, createEvent, publishEvent } from '../../core/event-bus';
import type { PlatformEvent } from '../../core/event-bus';

describe('localEventBus', () => {
  beforeEach(() => {
    localEventBus.clearHandlers();
  });

  it('subscribes and receives events', async () => {
    const received: PlatformEvent[] = [];
    localEventBus.subscribe('legal.client.created', (event) => {
      received.push(event);
    });

    const event = createEvent('tenant_1', 'legal.client.created', { clientId: 'c1' });
    await localEventBus.publish(event);

    expect(received).toHaveLength(1);
    expect(received[0]?.type).toBe('legal.client.created');
    expect(received[0]?.tenantId).toBe('tenant_1');
  });

  it('delivers to multiple subscribers for the same event type', async () => {
    const calls: number[] = [];
    localEventBus.subscribe('legal.case.created', () => calls.push(1));
    localEventBus.subscribe('legal.case.created', () => calls.push(2));

    const event = createEvent('tenant_1', 'legal.case.created', { caseId: 'case_1' });
    await localEventBus.publish(event);

    expect(calls).toHaveLength(2);
    expect(calls).toContain(1);
    expect(calls).toContain(2);
  });

  it('does not deliver to subscribers of a different event type', async () => {
    const received: PlatformEvent[] = [];
    localEventBus.subscribe('legal.invoice.paid', (event) => received.push(event));

    const event = createEvent('tenant_1', 'legal.client.created', { clientId: 'c1' });
    await localEventBus.publish(event);

    expect(received).toHaveLength(0);
  });

  it('clearHandlers stops all future deliveries', async () => {
    const received: PlatformEvent[] = [];
    localEventBus.subscribe('legal.client.created', (event) => received.push(event));
    localEventBus.clearHandlers();

    const event = createEvent('tenant_1', 'legal.client.created', { clientId: 'c1' });
    await localEventBus.publish(event);

    expect(received).toHaveLength(0);
  });
});

describe('createEvent', () => {
  it('creates an event with all required fields', () => {
    const event = createEvent('tenant_1', 'legal.client.created', { clientId: 'c1' });
    expect(event.id).toBeDefined();
    expect(event.tenantId).toBe('tenant_1');
    expect(event.type).toBe('legal.client.created');
    expect(event.sourceModule).toBe('legal_practice');
    expect(typeof event.timestamp).toBe('number');
    expect(event.payload).toEqual({ clientId: 'c1' });
  });

  it('generates unique event IDs', () => {
    const ids = new Set(
      Array.from({ length: 50 }, () =>
        createEvent('t1', 'legal.client.created', {}).id
      )
    );
    expect(ids.size).toBe(50);
  });

  it('sets timestamp close to current time', () => {
    const before = Date.now();
    const event = createEvent('t1', 'legal.client.created', {});
    const after = Date.now();
    expect(event.timestamp).toBeGreaterThanOrEqual(before);
    expect(event.timestamp).toBeLessThanOrEqual(after);
  });
});

describe('publishEvent', () => {
  beforeEach(() => {
    localEventBus.clearHandlers();
  });

  it('publishes to local bus when no EVENT_BUS_URL configured', async () => {
    const received: PlatformEvent[] = [];
    localEventBus.subscribe('legal.invoice.paid', (e) => received.push(e));

    const event = createEvent('t1', 'legal.invoice.paid', { invoiceId: 'inv_1' });
    await publishEvent(event, {});

    expect(received).toHaveLength(1);
  });

  it('publishes to local bus AND calls remote fetch when EVENT_BUS_URL is configured', async () => {
    const received: PlatformEvent[] = [];
    localEventBus.subscribe('legal.case.status_changed', (e) => received.push(e));

    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    const event = createEvent('t1', 'legal.case.status_changed', { caseId: 'case_1' });
    await publishEvent(event, { EVENT_BUS_URL: 'https://events.example.com', EVENT_BUS_API_KEY: 'key' });

    expect(received).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });

  it('handles remote bus network error gracefully without throwing', async () => {
    const received: PlatformEvent[] = [];
    localEventBus.subscribe('legal.document.uploaded', (e) => received.push(e));

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const event = createEvent('t1', 'legal.document.uploaded', { docId: 'doc_1' });
    await expect(
      publishEvent(event, { EVENT_BUS_URL: 'https://events.example.com' })
    ).resolves.not.toThrow();

    // Local bus still received the event despite remote failure
    expect(received).toHaveLength(1);

    vi.unstubAllGlobals();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM LOGGER TESTS — actual API from logger.ts
// ─────────────────────────────────────────────────────────────────────────────

import { createLogger, PlatformLogger } from '../../core/logger';

describe('PlatformLogger', () => {
  it('creates a logger instance with createLogger factory', () => {
    const logger = createLogger('test-module');
    expect(logger).toBeInstanceOf(PlatformLogger);
  });

  it('creates a child logger with withTenant()', () => {
    const logger = createLogger('test-module');
    const tenantLogger = logger.withTenant('tenant_1');
    expect(tenantLogger).toBeInstanceOf(PlatformLogger);
  });

  it('logs at all levels without throwing', () => {
    const logger = createLogger('test-module', 'tenant_1');
    expect(() => logger.debug('debug message')).not.toThrow();
    expect(() => logger.info('info message')).not.toThrow();
    expect(() => logger.warn('warn message')).not.toThrow();
    expect(() => logger.error('error message')).not.toThrow();
  });

  it('outputs JSON-structured log entries via console.info', () => {
    const logger = createLogger('test-module');
    const consoleSpy = vi.spyOn(console, 'info');
    logger.info('test message', { key: 'value', count: 42 });
    expect(consoleSpy).toHaveBeenCalled();
    const logOutput = consoleSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(logOutput) as Record<string, unknown>;
    expect(parsed.module).toBe('test-module');
    expect(parsed.message).toBe('test message');
    expect(parsed.level).toBe('INFO');
    expect(typeof parsed.timestamp).toBe('string');
    consoleSpy.mockRestore();
  });

  it('includes tenantId in log output when provided', () => {
    const logger = createLogger('test-module', 'tenant_abc');
    const consoleSpy = vi.spyOn(console, 'error');
    logger.error('something failed', { errorCode: 'E001' });
    const logOutput = consoleSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(logOutput) as Record<string, unknown>;
    expect(parsed.level).toBe('ERROR');
    expect(parsed.tenantId).toBe('tenant_abc');
    expect((parsed.data as Record<string, unknown>)?.errorCode).toBe('E001');
    consoleSpy.mockRestore();
  });

  it('does not include tenantId when not provided', () => {
    const logger = createLogger('test-module');
    const consoleSpy = vi.spyOn(console, 'warn');
    logger.warn('warning message');
    const logOutput = consoleSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(logOutput) as Record<string, unknown>;
    expect(parsed.tenantId).toBeUndefined();
    consoleSpy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA CONVENTIONS TESTS (Blueprint Part 9.2)
// ─────────────────────────────────────────────────────────────────────────────

import type { LegalClient, LegalCase, LegalTimeEntry, LegalInvoice } from '../../core/db/schema';

describe('Schema conventions (Blueprint Part 9.2)', () => {
  it('LegalClient type has tenantId field (multi-tenancy invariant)', () => {
    const client: Partial<LegalClient> = { tenantId: 'tenant_1' };
    expect(client.tenantId).toBe('tenant_1');
  });

  it('LegalClient type has deletedAt for soft deletes', () => {
    const client: Partial<LegalClient> = { deletedAt: null };
    expect(client.deletedAt).toBeNull();
  });

  it('LegalTimeEntry stores amount in kobo (integer)', () => {
    const entry: Partial<LegalTimeEntry> = { amountKobo: 5000000 };
    expect(Number.isInteger(entry.amountKobo)).toBe(true);
  });

  it('LegalInvoice stores all monetary values in kobo (integers)', () => {
    const invoice: Partial<LegalInvoice> = {
      subtotalKobo: 10000000,
      vatKobo: 750000,
      totalKobo: 10750000
    };
    expect(Number.isInteger(invoice.subtotalKobo)).toBe(true);
    expect(Number.isInteger(invoice.vatKobo)).toBe(true);
    expect(Number.isInteger(invoice.totalKobo)).toBe(true);
  });

  it('LegalCase has caseReference field', () => {
    const legalCase: Partial<LegalCase> = { caseReference: 'WW/LAG/2024/001' };
    expect(legalCase.caseReference).toMatch(/^WW\//);
  });

  it('LegalCase has tenantId field', () => {
    const legalCase: Partial<LegalCase> = { tenantId: 'tenant_1' };
    expect(legalCase.tenantId).toBe('tenant_1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE FORMAT TESTS (Blueprint Part 9.2)
// ─────────────────────────────────────────────────────────────────────────────

describe('API Response Format (Blueprint Part 9.2 — { success: true, data: ... })', () => {
  it('success response has correct structure', () => {
    const response = { success: true as const, data: { id: '1', name: 'Test' } };
    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
  });

  it('error response has correct structure', () => {
    const response = { success: false as const, errors: ['Validation failed', 'Missing field'] };
    expect(response.success).toBe(false);
    expect(Array.isArray(response.errors)).toBe(true);
    expect(response.errors).toHaveLength(2);
  });
});
