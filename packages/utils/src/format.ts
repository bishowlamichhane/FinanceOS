/**
 * Money display formatting.
 *
 * Locale-aware. NPR uses Indian-style grouping (1,24,500.00) which is what
 * Nepali users expect — `en-IN` does this correctly while `en-US` would write
 * "1,240,500.00". We pick the locale based on currency.
 *
 * Symbols: NPR uses ₹ in casual usage, but the formal/official symbol is "रू"
 * or "Rs". The screens show "NPR" prefix and "₹" symbol mixed; for an app
 * meant for Nepali finance, the safest universal display is "Rs" or "NPR".
 * We support both via opt.
 */

import { Money, type CurrencyCode } from './money';

export type FormatOptions = {
  /** false: hides the symbol/code (just the number). default true. */
  showSymbol?: boolean;
  /** "code" -> "NPR 1,24,500"; "symbol" -> "Rs 1,24,500". default "symbol". */
  symbolStyle?: 'code' | 'symbol' | 'narrow';
  /** Decimal places. default 2. */
  decimals?: number;
  /** Compact notation for large numbers (1.2L, 12.4Cr for INR/NPR; 1.2K/M for USD). */
  compact?: boolean;
  /** Show explicit + sign for positive values (good for delta displays). */
  signed?: boolean;
};

const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  NPR: 'en-IN', // Indian-style grouping is conventional in Nepal too
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-GB',
  GBP: 'en-GB',
};

const NARROW_SYMBOLS: Record<CurrencyCode, string> = {
  NPR: 'Rs',
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function formatMoney(money: Money, opts: FormatOptions = {}): string {
  const {
    showSymbol = true,
    symbolStyle = 'symbol',
    decimals = 2,
    compact = false,
    signed = false,
  } = opts;

  const locale = CURRENCY_LOCALES[money.currency] ?? 'en-US';
  const value = money.toNumber(); // safe for display only

  const numFmt = new Intl.NumberFormat(locale, {
    minimumFractionDigits: compact ? 0 : decimals,
    maximumFractionDigits: compact ? 1 : decimals,
    notation: compact ? 'compact' : 'standard',
    signDisplay: signed ? 'exceptZero' : 'auto',
  });

  const number = numFmt.format(value);

  if (!showSymbol) return number;

  if (symbolStyle === 'code') {
    return `${money.currency} ${number}`;
  }

  // narrow / symbol
  const sym = NARROW_SYMBOLS[money.currency] ?? money.currency;
  return `${sym} ${number}`;
}

/**
 * Format a percentage (input is already a ratio, e.g. 0.124 -> "+12.4%").
 */
export function formatPercent(
  value: number,
  opts: { decimals?: number; signed?: boolean } = {},
): string {
  const { decimals = 1, signed = true } = opts;
  if (!Number.isFinite(value)) return '—';
  const fmt = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: signed ? 'exceptZero' : 'auto',
  });
  return fmt.format(value);
}

/**
 * Compact summary for dashboard cards.
 * E.g. 1240500 -> "Rs 12.4L".
 */
export function formatMoneyCompact(money: Money, opts: FormatOptions = {}): string {
  return formatMoney(money, { ...opts, compact: true });
}

/**
 * Format a raw money value (string from the wire) without constructing Money.
 * Convenience for list rendering.
 */
export function formatAmount(
  amount: string | number,
  currency: CurrencyCode,
  opts?: FormatOptions,
): string {
  return formatMoney(new Money(amount, currency), opts);
}
