/**
 * WebWaka Professional — Legal Practice Utilities
 * Blueprint Reference: Part 9.1 — Nigeria First, Africa First
 * Blueprint Reference: Part 9.2 — Monetary Values as integers (kobo)
 *
 * Pure utility functions — no side effects, fully testable.
 *
 * ── Shared utilities are re-exported from core for backwards compatibility ──
 * New code that needs these utilities should import from core directly:
 *   import { generateId, nowUTC } from '../../core/ids';
 *   import { koboToNaira, calculateVAT } from '../../core/money';
 *   import { formatWATDate } from '../../core/time';
 */

// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORTS FROM CORE — Backwards-compatible; tests import from './utils'
// ─────────────────────────────────────────────────────────────────────────────

export { generateId, nowUTC } from '../../core/ids';
export { koboToNaira, nairaToKobo, formatCurrency, SUPPORTED_CURRENCIES, calculateVAT } from '../../core/money';
export { formatWATDate, formatWATDateTime } from '../../core/time';

// ─────────────────────────────────────────────────────────────────────────────
// CASE REFERENCE GENERATION
// Blueprint Reference: Part 10.8 — "Case tracking with Nigerian state codes"
// ─────────────────────────────────────────────────────────────────────────────

const NIGERIAN_STATE_CODES: Record<string, string> = {
  'Lagos': 'LAG',
  'Abuja': 'FCT',
  'Kano': 'KAN',
  'Rivers': 'RIV',
  'Ogun': 'OGN',
  'Oyo': 'OYO',
  'Kaduna': 'KAD',
  'Anambra': 'ANM',
  'Enugu': 'ENU',
  'Delta': 'DLT',
  'Imo': 'IMO',
  'Borno': 'BOR',
  'Katsina': 'KAT',
  'Sokoto': 'SOK',
  'Bauchi': 'BAU',
  'Plateau': 'PLA',
  'Cross River': 'CRS',
  'Akwa Ibom': 'AKW',
  'Edo': 'EDO',
  'Ondo': 'OND',
  'Osun': 'OSU',
  'Ekiti': 'EKI',
  'Kwara': 'KWA',
  'Niger': 'NGR',
  'Benue': 'BEN',
  'Taraba': 'TAR',
  'Adamawa': 'ADM',
  'Gombe': 'GOM',
  'Yobe': 'YOB',
  'Zamfara': 'ZAM',
  'Kebbi': 'KEB',
  'Jigawa': 'JIG',
  'Nasarawa': 'NAS',
  'Kogi': 'KOG',
  'Ebonyi': 'EBO',
  'Abia': 'ABI',
  'Bayelsa': 'BAY'
};

/**
 * Generate a human-readable case reference.
 * Format: WW/{STATE_CODE}/{YEAR}/{SEQUENCE}
 * Example: WW/LAG/2026/001
 */
export function generateCaseReference(state: string, sequence: number): string {
  const stateCode = NIGERIAN_STATE_CODES[state] ?? 'NGR';
  const year = new Date().getFullYear();
  const seq = String(sequence).padStart(3, '0');
  return `WW/${stateCode}/${year}/${seq}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// NBA BAR NUMBER VALIDATION
// Blueprint Reference: Part 10.8 — "NBA compliance"
// Blueprint Reference: Part 9.1 — "Nigeria First"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate Nigerian Bar Association bar number format.
 * Format: NBA/{BRANCH}/{YEAR}/{SEQUENCE}
 * Example: NBA/LAG/2015/001234
 *
 * Rules:
 * - Must start with "NBA/"
 * - Branch code: 2–5 uppercase letters
 * - Year: 4-digit year between 1963 (first lawyers called to bar) and current year
 * - Sequence: 4–6 digits
 */
export function validateNBABarNumber(barNumber: string): { valid: boolean; error?: string } {
  if (!barNumber || typeof barNumber !== 'string') {
    return { valid: false, error: 'Bar number is required' };
  }

  const trimmed = barNumber.trim().toUpperCase();
  const pattern = /^NBA\/([A-Z]{2,5})\/(\d{4})\/(\d{4,6})$/;
  const match = pattern.exec(trimmed);

  if (!match) {
    return {
      valid: false,
      error: 'Invalid bar number format. Expected: NBA/{BRANCH}/{YEAR}/{SEQUENCE} (e.g., NBA/LAG/2015/001234)'
    };
  }

  const year = parseInt(match[2] ?? '0', 10);
  const currentYear = new Date().getFullYear();

  if (year < 1963 || year > currentYear) {
    return {
      valid: false,
      error: `Year of call must be between 1963 and ${currentYear}`
    };
  }

  return { valid: true };
}

/**
 * Validate year of call to the Nigerian Bar.
 * Nigerian Bar Association was established in 1959; first lawyers called in 1963.
 */
export function validateYearOfCall(year: number): { valid: boolean; error?: string } {
  const currentYear = new Date().getFullYear();
  if (year < 1963 || year > currentYear) {
    return {
      valid: false,
      error: `Year of call must be between 1963 and ${currentYear}`
    };
  }
  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGAL-SPECIFIC MONETARY UTILITIES
// Blueprint Reference: Part 9.2 — "Monetary Values: All monetary fields stored as integers (kobo)."
// ─────────────────────────────────────────────────────────────────────────────

/** Calculate time entry amount in kobo from duration (minutes) and hourly rate (kobo/hr) */
export function calculateTimeEntryAmount(durationMinutes: number, hourlyRateKobo: number): number {
  return Math.round((durationMinutes / 60) * hourlyRateKobo);
}

/** Format duration in minutes to human-readable string (e.g., "1h 30m") */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE NUMBER GENERATION
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a human-readable invoice number. Format: INV-{YEAR}-{SEQUENCE_3_DIGITS} */
export function generateInvoiceNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const seq = String(sequence).padStart(3, '0');
  return `INV-${year}-${seq}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// NDPR COMPLIANCE
// Blueprint Reference: Part 9.1 — "Nigeria First: NDPR compliance enforced."
// Nigeria Data Protection Regulation (NDPR) 2019
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate NDPR consent text in the user's preferred Nigerian language.
 * Supports English, Yoruba, Igbo, and Hausa — the 3 major languages plus English.
 */
export function getNDPRConsentText(language: 'en' | 'yo' | 'ig' | 'ha'): string {
  const texts: Record<string, string> = {
    en: 'I consent to WebWaka collecting and processing my personal data in accordance with the Nigeria Data Protection Regulation (NDPR) 2019. My data will be used solely for legal practice management purposes and will not be shared with third parties without my explicit consent.',
    yo: 'Mo gba pe WebWaka le gba ati lo alaye ti ara mi gẹgẹ bi Ofin Idaabobo Data ti Naijiria (NDPR) 2019. A o lo alaye mi nikan fun iṣakoso iṣẹ ofin ati pe a kii yoo pin pẹlu awọn ẹni kẹta laisi igbanilaaye mi.',
    ig: 'Anọ m na-ekwe ka WebWaka nweta ma ọ bụ jiri data nkeonwe m mee ihe dị ka Iwu Nchedo Data nke Nigeria (NDPR) 2019 si dị. A ga-eji data m naanị maka njikwa ọrụ iwu, a gaghị ekekọrịta ya na ndị ọzọ na-enweghị ikike m.',
    ha: 'Ina yarda da WebWaka tattara da sarrafa bayanan sirrina bisa ga Dokar Kare Bayanai ta Najeriya (NDPR) 2019. Za a yi amfani da bayanan ne kawai don gudanar da shari\'a kuma ba za a raba su da wasu ba ba tare da izinina ba.'
  };
  return texts[language] ?? texts['en']!;
}
