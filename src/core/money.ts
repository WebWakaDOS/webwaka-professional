/**
 * WebWaka Platform — Monetary Utilities
 * Blueprint Reference: Part 9.2 — "Monetary Values: All monetary fields must be stored as integers (kobo/cents)."
 * Blueprint Reference: Part 9.1 — "Nigeria First: NGN is the default currency. 1 Naira = 100 kobo."
 * Blueprint Reference: Part 9.1 — "Africa First: Multi-currency support across African markets."
 * Blueprint Reference: Part 9.1 — "Build Once Use Infinitely: shared core utilities."
 *
 * ─── Storage Rule (Non-Negotiable) ──────────────────────────────────────────
 * ALL monetary values are stored as INTEGERS in the currency's smallest unit:
 *   NGN → kobo      (1 Naira    = 100 kobo)
 *   GHS → pesewa    (1 Cedi     = 100 pesewa)
 *   KES → cents     (1 Shilling = 100 cents)
 *   ZAR → cents     (1 Rand     = 100 cents)
 *   UGX → cents     (1 Shilling = 100 cents)
 *   TZS → cents     (1 Shilling = 100 cents)
 *   ETB → santim    (1 Birr     = 100 santim)
 *   XOF → centimes  (1 CFA      = 100 centimes)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Build Once, Use Infinitely: all module financial code imports from here.
 */

export interface CurrencyConfig {
  name: string;
  symbol: string;
  locale: string;
}

/**
 * Supported currencies — Africa-First principle.
 * NGN is the default (Nigeria-First). Alphabetically sorted after NGN.
 * Add new African currencies here; all modules benefit automatically.
 */
export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  NGN: { name: 'Nigerian Naira',          symbol: '₦',   locale: 'en-NG' },
  ETB: { name: 'Ethiopian Birr',           symbol: 'Br',  locale: 'am-ET' },
  GBP: { name: 'British Pound',            symbol: '£',   locale: 'en-GB' },
  GHS: { name: 'Ghanaian Cedi',            symbol: 'GH₵', locale: 'en-GH' },
  KES: { name: 'Kenyan Shilling',          symbol: 'KSh', locale: 'en-KE' },
  TZS: { name: 'Tanzanian Shilling',       symbol: 'TSh', locale: 'en-TZ' },
  UGX: { name: 'Ugandan Shilling',         symbol: 'USh', locale: 'en-UG' },
  USD: { name: 'US Dollar',                symbol: '$',   locale: 'en-US' },
  XOF: { name: 'West African CFA Franc',   symbol: 'CFA', locale: 'fr-SN' },
  ZAR: { name: 'South African Rand',       symbol: 'R',   locale: 'en-ZA' },
};

/**
 * Convert kobo (integer) to a formatted Nigerian Naira string.
 * Example: koboToNaira(150000) → "₦1,500.00"
 *
 * Use this only for NGN amounts. For other currencies use formatCurrency().
 */
export function koboToNaira(kobo: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2
  }).format(kobo / 100);
}

/**
 * Convert a Naira amount (float) to kobo integer (rounds to nearest kobo).
 * Example: nairaToKobo(1500.00) → 150000
 */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/**
 * Format any amount in the currency's smallest unit to a localised display string.
 * Amount MUST be an integer (kobo, pesewa, cents, etc.).
 *
 * Example: formatCurrency(150000, 'NGN') → "₦1,500.00"
 * Example: formatCurrency(150000, 'GHS') → "GH₵1,500.00"
 * Example: formatCurrency(150000, 'XYZ') → "XYZ 1500.00" (fallback)
 */
export function formatCurrency(amountSmallestUnit: number, currencyCode: string): string {
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  if (!currency) {
    return `${currencyCode} ${(amountSmallestUnit / 100).toFixed(2)}`;
  }
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2
  }).format(amountSmallestUnit / 100);
}

/**
 * Calculate Nigerian VAT at the standard rate of 7.5% (FIRS, effective 2020).
 * Returns the VAT amount in kobo (integer, rounded to nearest kobo).
 *
 * Blueprint Reference: Part 9.1 — "Nigeria First: 7.5% VAT standard rate."
 *
 * Usage: const vatKobo = calculateVAT(subtotalKobo);
 */
export function calculateVAT(subtotalKobo: number): number {
  return Math.round(subtotalKobo * 0.075);
}
