import { z } from 'zod';

// =============================================================================
// PRIMITIVES
// =============================================================================

/** UUID. Used for all primary keys. */
export const idSchema = z.string().uuid();

/** Money amount as a string (decimal-safe). Validated to be a valid decimal. */
export const moneyAmountSchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,8})?$/, 'must be a decimal number');

export const currencyCodeSchema = z.enum(['NPR', 'USD', 'EUR', 'INR', 'GBP']);

/** ISO date string YYYY-MM-DD. */
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');

/** ISO 8601 datetime. */
export const isoDateTimeSchema = z.string().datetime();

/** Money pair — what comes over the wire. */
export const moneySchema = z.object({
  amount: moneyAmountSchema,
  currency: currencyCodeSchema,
});

export type MoneyDTO = z.infer<typeof moneySchema>;

// =============================================================================
// ENUMS
// =============================================================================

export const accountTypeSchema = z.enum([
  'cash',
  'bank_savings',
  'bank_current',
  'fixed_deposit',
  'wallet',
  'credit_card',
  'loan',
  'investment',
  'other',
]);

export type AccountType = z.infer<typeof accountTypeSchema>;

export const transactionTypeSchema = z.enum([
  'income',
  'expense',
  'transfer',
  'investment_buy',
  'investment_sell',
  'dividend',
  'liability_payment',
  'asset_purchase',
  'adjustment',
]);

export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const recurrenceSchema = z.enum([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
]);

export type Recurrence = z.infer<typeof recurrenceSchema>;

export const assetTypeSchema = z.enum([
  'cash',
  'bank_balance',
  'stock_portfolio',
  'fixed_deposit',
  'gold',
  'vehicle',
  'property',
  'electronics',
  'crypto',
  'other',
]);

export type AssetType = z.infer<typeof assetTypeSchema>;

export const liabilityTypeSchema = z.enum([
  'personal_loan',
  'credit_card',
  'education_loan',
  'family_friend_loan',
  'emi',
  'mortgage',
  'other',
]);

export type LiabilityType = z.infer<typeof liabilityTypeSchema>;

export const stockTransactionKindSchema = z.enum([
  'buy',
  'sell',
  'ipo',
  'bonus',
  'right',
  'dividend',
  'split',
  'adjustment',
]);

export type StockTransactionKind = z.infer<typeof stockTransactionKindSchema>;

export const importTypeSchema = z.enum([
  'bank_statement',
  'meroshare_portfolio',
  'meroshare_transactions',
  'manual_transactions',
  'stock_prices',
]);

export type ImportType = z.infer<typeof importTypeSchema>;

// =============================================================================
// PAGINATION
// =============================================================================

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
    total: z.number().int().optional(),
  });

// =============================================================================
// ERRORS
// =============================================================================

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type APIError = z.infer<typeof apiErrorSchema>;
