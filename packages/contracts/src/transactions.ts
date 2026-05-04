import { z } from 'zod';
import {
  currencyCodeSchema,
  idSchema,
  isoDateSchema,
  isoDateTimeSchema,
  moneyAmountSchema,
  transactionTypeSchema,
  type TransactionType,
} from './common';
import { categorySchema } from './categories';

/**
 * Transaction contracts.
 *
 * Hydration: the list endpoint returns `category` and `account` objects
 * embedded in each row to avoid N+1 fetches in the mobile list. The summary
 * (id, name, color, icon) is enough to render a row; full detail is fetched
 * only when the user opens a transaction.
 */

// Embedded summaries so list rows can render without extra fetches
export const accountSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  type: z.string(),
  colorHex: z.string().nullable(),
  icon: z.string(),
});
export type AccountSummary = z.infer<typeof accountSummarySchema>;

export const transactionSchema = z.object({
  id: idSchema,
  date: isoDateSchema,
  type: transactionTypeSchema,
  amount: moneyAmountSchema,
  currency: currencyCodeSchema,
  description: z.string().max(200),
  merchant: z.string().max(100).nullable(),
  notes: z.string().nullable(),
  accountId: idSchema.nullable(),
  categoryId: idSchema.nullable(),
  /** For TRANSFER: the receiving account */
  counterAccountId: idSchema.nullable(),
  recurringId: idSchema.nullable(),
  assetId: idSchema.nullable(),
  liabilityId: idSchema.nullable(),
  stockHoldingId: idSchema.nullable(),
  attachmentUrl: z.string().nullable(),
  isSplit: z.boolean(),
  splitParentId: idSchema.nullable(),
  tags: z.array(z.string().max(40)),
  /** Hydrated relations for list views */
  category: categorySchema.nullable().optional(),
  account: accountSummarySchema.nullable().optional(),
  counterAccount: accountSummarySchema.nullable().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type Transaction = z.infer<typeof transactionSchema>;

// =============================================================================
// CREATE — discriminated by type so API can validate each shape correctly
// =============================================================================

const createTransactionBaseSchema = z.object({
  date: isoDateSchema,
  amount: moneyAmountSchema.refine((v: string) => parseFloat(v) > 0, {
    message: 'Amount must be greater than zero',
  }),
  currency: currencyCodeSchema.default('NPR'),
  description: z.string().min(1).max(200),
  merchant: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  attachmentUrl: z.string().optional(),
  tags: z.array(z.string().min(1).max(40)).max(10).optional(),
});

/** Income / Expense / Adjustment / Dividend / Liability payment / Asset purchase */
export const createIncomeExpenseTransactionSchema = createTransactionBaseSchema.extend({
  type: z.enum(['income', 'expense', 'adjustment', 'dividend', 'liability_payment', 'asset_purchase']),
  accountId: idSchema,
  categoryId: idSchema.optional(),
  liabilityId: idSchema.optional(),
  assetId: idSchema.optional(),
});

/** Transfer — between two accounts; needs both */
export const createTransferTransactionSchema = createTransactionBaseSchema.extend({
  type: z.literal('transfer'),
  accountId: idSchema,
  counterAccountId: idSchema,
}).refine((v: { accountId: string; counterAccountId: string }) => v.accountId !== v.counterAccountId, {
  message: 'Source and destination accounts must differ',
  path: ['counterAccountId'],
});

export const createTransactionSchema = z.union([
  createIncomeExpenseTransactionSchema,
  createTransferTransactionSchema,
]);

export type CreateTransactionRequest = z.infer<typeof createTransactionSchema>;

/**
 * Flat schema for backend DTO validation.
 *
 * `createZodDto` doesn't support discriminated unions. We use a permissive
 * flat schema here (everything optional except amount/type) and rely on the
 * service to enforce the per-type constraints. The mobile client uses the
 * stricter union schema for client-side validation.
 */
export const createTransactionFlatSchema = z.object({
  date: isoDateSchema,
  type: transactionTypeSchema,
  amount: moneyAmountSchema.refine((v: string) => parseFloat(v) > 0, {
    message: 'Amount must be greater than zero',
  }),
  currency: currencyCodeSchema.default('NPR'),
  description: z.string().min(1).max(200),
  merchant: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  accountId: idSchema.optional(),
  counterAccountId: idSchema.optional(),
  categoryId: idSchema.optional(),
  assetId: idSchema.optional(),
  liabilityId: idSchema.optional(),
  attachmentUrl: z.string().optional(),
  tags: z.array(z.string().min(1).max(40)).max(10).optional(),
});

export type CreateTransactionFlatRequest = z.infer<typeof createTransactionFlatSchema>;

// --- Update (partial; cannot change type after creation)

export const updateTransactionSchema = z.object({
  date: isoDateSchema.optional(),
  amount: moneyAmountSchema.optional(),
  description: z.string().min(1).max(200).optional(),
  merchant: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  accountId: idSchema.optional(),
  categoryId: idSchema.nullable().optional(),
  counterAccountId: idSchema.optional(),
  attachmentUrl: z.string().nullable().optional(),
  tags: z.array(z.string().min(1).max(40)).max(10).optional(),
});

export type UpdateTransactionRequest = z.infer<typeof updateTransactionSchema>;

// =============================================================================
// LIST / FILTERS
// =============================================================================

export const transactionFiltersSchema = z.object({
  /** YYYY-MM-DD inclusive */
  from: isoDateSchema.optional(),
  /** YYYY-MM-DD inclusive */
  to: isoDateSchema.optional(),
  type: transactionTypeSchema.optional(),
  accountId: idSchema.optional(),
  categoryId: idSchema.optional(),
  search: z.string().max(100).optional(),
  /** Cursor is the createdAt|id of the last seen item (base64-encoded) */
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;

export const transactionListResponseSchema = z.object({
  items: z.array(transactionSchema),
  nextCursor: z.string().nullable(),
});

export type TransactionListResponse = z.infer<typeof transactionListResponseSchema>;

// =============================================================================
// HELPERS
// =============================================================================

/** Direction of a transaction from the perspective of an account. */
export type TransactionDirection = 'income' | 'expense' | 'transfer' | 'neutral';

export function transactionDirection(type: TransactionType): TransactionDirection {
  switch (type) {
    case 'income':
    case 'dividend':
    case 'investment_sell':
      return 'income';
    case 'expense':
    case 'liability_payment':
    case 'asset_purchase':
    case 'investment_buy':
      return 'expense';
    case 'transfer':
      return 'transfer';
    case 'adjustment':
    default:
      return 'neutral';
  }
}   