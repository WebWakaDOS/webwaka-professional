/**
 * WebWaka Professional — Legal Practice Utilities
 * Blueprint Reference: Part 9.1 — Nigeria First, Africa First
 * Blueprint Reference: Part 9.2 — Monetary Values as integers (kobo)
 *
 * Pure utility functions — no side effects, fully testable.
 */

// ─────────────────────────────────────────────────────────────────────────────
// ID GENERATION
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a unique ID for legal entities */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE REFERENCE GENERATION
// Blueprint Reference: Part 10.8 — "Case tracking"
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
 * Generate a human-readable case reference
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
 * - Branch code: 2-5 uppercase letters
 * - Year: 4-digit year between 1963 (first lawyers called to bar) and current year
 * - Sequence: 4-6 digits
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
 * Validate year of call to bar
 * Nigerian Bar Association was established in 1959; first lawyers called in 1963
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
// MONETARY UTILITIES
// Blueprint Reference: Part 9.2 — "Monetary Values: All monetary fields must be stored as integers (kobo/cents)."
// Blueprint Reference: Part 9.1 — "Nigeria First: NGN is the default currency."
// ─────────────────────────────────────────────────────────────────────────────

/** Convert kobo (integer) to Naira display string */
export function koboToNaira(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2
  }).format(naira);
}

/** Convert Naira amount to kobo integer */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/** Calculate time entry amount in kobo */
export function calculateTimeEntryAmount(durationMinutes: number, hourlyRateKobo: number): number {
  return Math.round((durationMinutes / 60) * hourlyRateKobo);
}

/** Calculate Nigerian VAT (7.5% standard rate) */
export function calculateVAT(subtotalKobo: number): number {
  return Math.round(subtotalKobo * 0.075);
}

/** Format duration in minutes to human-readable string */
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

/** Generate a human-readable invoice number */
export function generateInvoiceNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const seq = String(sequence).padStart(3, '0');
  return `INV-${year}-${seq}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMEZONE UTILITIES
// Blueprint Reference: Part 9.1 — "Nigeria First: WAT timezone used."
// ─────────────────────────────────────────────────────────────────────────────

/** Format a UTC timestamp for display in WAT (West Africa Time, UTC+1) */
export function formatWATDate(utcTimestampMs: number, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    ...options
  }).format(new Date(utcTimestampMs));
}

/** Format a UTC timestamp as a full datetime in WAT */
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

/** Get current time as UTC timestamp in milliseconds */
export function nowUTC(): number {
  return Date.now();
}

// ─────────────────────────────────────────────────────────────────────────────
// NDPR COMPLIANCE
// Blueprint Reference: Part 9.1 — "Nigeria First: NDPR compliance enforced."
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate NDPR consent text in the user's preferred language
 * Nigeria Data Protection Regulation (NDPR) 2019 compliance
 */
export function getNDPRConsentText(language: 'en' | 'yo' | 'ig' | 'ha'): string {
  const texts: Record<string, string> = {
    en: 'I consent to WebWaka collecting and processing my personal data in accordance with the Nigeria Data Protection Regulation (NDPR) 2019. My data will be used solely for legal practice management purposes and will not be shared with third parties without my explicit consent.',
    yo: 'Mo gba pe WebWaka le gba ati lo alaye ti ara mi gẹgẹ bi Ofin Idaabobo Data ti Naijiria (NDPR) 2019. A o lo alaye mi nikan fun iṣakoso iṣẹ ofin ati pe a kii yoo pin pẹlu awọn ẹni kẹta laisi igbanilaaye mi.',
    ig: 'Anọ m na-ekwe ka WebWaka nweta ma ọ bụ jiri data nkeonwe m mee ihe dị ka Iwu Nchedo Data nke Nigeria (NDPR) 2019 si dị. A ga-eji data m naanị maka njikwa ọrụ iwu, a gaghị ekekọrịta ya na ndị ọzọ na-enweghị ikike m.',
    ha: 'Ina yarda da WebWaka tattara da sarrafa bayanan sirrina bisa ga Dokar Kare Bayanai ta Najeriya (NDPR) 2019. Za a yi amfani da bayanan ne kawai don gudanar da shari\'a kuma ba za a raba su da wasu ba ba tare da izinina ba.'
  };
  return texts[language] ?? texts['en'];
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-CURRENCY SUPPORT
// Blueprint Reference: Part 9.1 — "Africa First: Multi-currency support required in all financial models."
// ─────────────────────────────────────────────────────────────────────────────

export const SUPPORTED_CURRENCIES: Record<string, { name: string; symbol: string; locale: string }> = {
  NGN: { name: 'Nigerian Naira', symbol: '₦', locale: 'en-NG' },
  GHS: { name: 'Ghanaian Cedi', symbol: 'GH₵', locale: 'en-GH' },
  KES: { name: 'Kenyan Shilling', symbol: 'KSh', locale: 'en-KE' },
  ZAR: { name: 'South African Rand', symbol: 'R', locale: 'en-ZA' },
  UGX: { name: 'Ugandan Shilling', symbol: 'USh', locale: 'en-UG' },
  TZS: { name: 'Tanzanian Shilling', symbol: 'TSh', locale: 'en-TZ' },
  ETB: { name: 'Ethiopian Birr', symbol: 'Br', locale: 'am-ET' },
  XOF: { name: 'West African CFA Franc', symbol: 'CFA', locale: 'fr-SN' },
  USD: { name: 'US Dollar', symbol: '$', locale: 'en-US' },
  GBP: { name: 'British Pound', symbol: '£', locale: 'en-GB' }
};

/** Format an amount in the smallest unit (kobo/cents) to a display string */
export function formatCurrency(amountSmallestUnit: number, currencyCode: string): string {
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  if (!currency) return `${currencyCode} ${(amountSmallestUnit / 100).toFixed(2)}`;

  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2
  }).format(amountSmallestUnit / 100);
}
