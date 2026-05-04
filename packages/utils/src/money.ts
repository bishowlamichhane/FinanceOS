/**
 * Money — decimal-safe currency arithmetic.
 *
 * Rules of the road:
 *  1. NEVER use `number` for money. Always wrap in Money or pass as string.
 *  2. Money values cross the wire as strings ("1240500.00"), not numbers.
 *     Postgres NUMERIC -> Prisma Decimal -> JSON string -> Money on client.
 *  3. Two-currency operations throw. We don't auto-convert; that's a product
 *     decision that needs explicit FX handling.
 *  4. Comparisons use `eq`, `gt`, `lt`, etc. NEVER `===` or `>`.
 *  5. Display formatting is a separate concern (see ./format.ts).
 *
 * Built on decimal.js — battle-tested arbitrary-precision decimal math.
 */

import { Decimal } from 'decimal.js';

// Configure decimal.js once. 28 significant digits is more than enough
// for personal finance — supports values up to ~10^15 with 4dp precision,
// and we cap displayed precision separately.
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_EVEN, // banker's rounding — fairer for money
  toExpNeg: -7,
  toExpPos: 21,
});

export type CurrencyCode = 'NPR' | 'USD' | 'EUR' | 'INR' | 'GBP';

export const DEFAULT_CURRENCY: CurrencyCode = 'NPR';

/**
 * Money is a (value, currency) pair. Immutable. All operations return new
 * instances — never mutate.
 */
export class Money {
  private readonly value: Decimal;
  public readonly currency: CurrencyCode;

  constructor(value: Decimal | string | number, currency: CurrencyCode = DEFAULT_CURRENCY) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error(`Money: cannot construct from non-finite number ${value}`);
    }
    this.value = value instanceof Decimal ? value : new Decimal(value);
    this.currency = currency;
  }

  // --- factories ---

  static zero(currency: CurrencyCode = DEFAULT_CURRENCY): Money {
    return new Money('0', currency);
  }

  static from(value: string | number | Decimal | Money, currency?: CurrencyCode): Money {
    if (value instanceof Money) {
      if (currency && currency !== value.currency) {
        throw new Error(
          `Money.from: cannot rewrap ${value.currency} as ${currency} without conversion`,
        );
      }
      return value;
    }
    return new Money(value, currency ?? DEFAULT_CURRENCY);
  }

  // --- arithmetic ---

  add(other: Money): Money {
    this.assertSameCurrency(other, 'add');
    return new Money(this.value.plus(other.value), this.currency);
  }

  sub(other: Money): Money {
    this.assertSameCurrency(other, 'sub');
    return new Money(this.value.minus(other.value), this.currency);
  }

  mul(scalar: string | number | Decimal): Money {
    return new Money(this.value.times(scalar), this.currency);
  }

  div(scalar: string | number | Decimal): Money {
    const d = scalar instanceof Decimal ? scalar : new Decimal(scalar);
    if (d.isZero()) {
      throw new Error('Money.div: division by zero');
    }
    return new Money(this.value.dividedBy(d), this.currency);
  }

  negate(): Money {
    return new Money(this.value.negated(), this.currency);
  }

  abs(): Money {
    return new Money(this.value.abs(), this.currency);
  }

  // --- comparison ---

  eq(other: Money): boolean {
    this.assertSameCurrency(other, 'eq');
    return this.value.equals(other.value);
  }

  gt(other: Money): boolean {
    this.assertSameCurrency(other, 'gt');
    return this.value.greaterThan(other.value);
  }

  gte(other: Money): boolean {
    this.assertSameCurrency(other, 'gte');
    return this.value.greaterThanOrEqualTo(other.value);
  }

  lt(other: Money): boolean {
    this.assertSameCurrency(other, 'lt');
    return this.value.lessThan(other.value);
  }

  lte(other: Money): boolean {
    this.assertSameCurrency(other, 'lte');
    return this.value.lessThanOrEqualTo(other.value);
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isPositive(): boolean {
    return this.value.isPositive() && !this.value.isZero();
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  // --- conversions ---

  /**
   * Returns the underlying value as a string, with full precision. This is
   * the format used over the wire / in the database.
   */
  toString(): string {
    return this.value.toString();
  }

  /**
   * Returns a string formatted to a specific decimal precision. Uses
   * banker's rounding. Precision defaults to 2 — change for crypto, etc.
   */
  toFixed(dp = 2): string {
    return this.value.toFixed(dp);
  }

  /**
   * Plain object for JSON serialization.
   * Useful when sending Money over the wire.
   */
  toJSON(): { amount: string; currency: CurrencyCode } {
    return { amount: this.value.toString(), currency: this.currency };
  }

  /**
   * Underlying Decimal — for chained internal math only.
   * Don't expose this to UI code.
   */
  toDecimal(): Decimal {
    return this.value;
  }

  /**
   * Convert to plain number. ONLY for display calculations (e.g. percentages
   * where the result is a ratio, not a money value). Never use for further
   * money math.
   */
  toNumber(): number {
    return this.value.toNumber();
  }

  // --- internal ---

  private assertSameCurrency(other: Money, op: string): void {
    if (this.currency !== other.currency) {
      throw new Error(
        `Money.${op}: currency mismatch ${this.currency} vs ${other.currency}. ` +
          `Use an explicit FX conversion before mixing currencies.`,
      );
    }
  }
}

/**
 * Helpers for collection math — common in dashboard aggregation.
 */

export const sum = (values: Money[], currency: CurrencyCode = DEFAULT_CURRENCY): Money => {
  if (values.length === 0) return Money.zero(currency);
  return values.reduce((acc, v) => acc.add(v), Money.zero(values[0]!.currency));
};

export const max = (values: Money[]): Money | null => {
  if (values.length === 0) return null;
  return values.reduce((a, b) => (a.gte(b) ? a : b));
};

export const min = (values: Money[]): Money | null => {
  if (values.length === 0) return null;
  return values.reduce((a, b) => (a.lte(b) ? a : b));
};
