import { z } from 'zod';
import {
  currencyCodeSchema,
  idSchema,
  isoDateSchema,
  isoDateTimeSchema,
  moneyAmountSchema,
  moneySchema,
  recurrenceSchema,
} from './common';
import { categorySchema } from './categories';

/**
 * Budget contracts.
 *
 * A Budget pairs (optional) Category + Period (e.g. monthly) + amount.
 * `categoryId === null` means "overall" budget across all expense categories.
 *
 * The API hydrates `currentPeriod` for each budget — actual spent so far in
 * the current period, computed via aggregating transactions, plus a
 * convenience `state` derived from the budget's own alertThresholds.
 */

export const budgetStateSchema = z.enum(['on_track', 'near_limit', 'over']);
export type BudgetState = z.infer<typeof budgetStateSchema>;

/** Hydrated stats for the current active period of a budget. */
export const budgetCurrentPeriodSchema = z.object({
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  spent: moneySchema,
  budgeted: moneySchema,
  remaining: moneySchema,
  /** 0..1+ — fraction of budget used. >1 means over budget. */
  utilization: z.number(),
  state: budgetStateSchema,
});

export type BudgetCurrentPeriod = z.infer<typeof budgetCurrentPeriodSchema>;

export const budgetSchema = z.object({
  id: idSchema,
  /** Null means "overall" budget across all expense categories. */
  categoryId: idSchema.nullable(),
  /** Hydrated category summary for list rendering. Null if overall. */
  category: categorySchema.nullable().optional(),
  period: recurrenceSchema,
  amount: moneyAmountSchema,
  currency: currencyCodeSchema,
  startDate: isoDateSchema,
  /** Notification thresholds as fractions 0..1 (e.g. 0.5, 0.8, 1.0). */
  alertThresholds: z.array(z.number().min(0).max(2)),
  archived: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  /** Hydrated stats for the current period. */
  currentPeriod: budgetCurrentPeriodSchema,
});

export type Budget = z.infer<typeof budgetSchema>;

// =============================================================================
// CREATE
// =============================================================================

export const createBudgetSchema = z.object({
  /** Null/omitted = overall budget. */
  categoryId: idSchema.nullable().optional(),
  period: recurrenceSchema.default('monthly'),
  amount: moneyAmountSchema.refine((v: string) => parseFloat(v) > 0, {
    message: 'Amount must be greater than zero',
  }),
  currency: currencyCodeSchema.default('NPR'),
  /** Anchor date for period calculation. Defaults to first of current month. */
  startDate: isoDateSchema.optional(),
  alertThresholds: z
    .array(z.number().min(0).max(2))
    .max(5)
    .optional(),
});

export type CreateBudgetRequest = z.infer<typeof createBudgetSchema>;

// =============================================================================
// UPDATE — partial
// =============================================================================

export const updateBudgetSchema = z.object({
  amount: moneyAmountSchema.optional(),
  alertThresholds: z.array(z.number().min(0).max(2)).max(5).optional(),
  archived: z.boolean().optional(),
});

export type UpdateBudgetRequest = z.infer<typeof updateBudgetSchema>;

// =============================================================================
// LIST RESPONSE
// =============================================================================

export const budgetsListResponseSchema = z.object({
  items: z.array(budgetSchema),
  /** Aggregated rollup across all active (non-archived) budgets in NPR. */
  totals: z.object({
    budgeted: moneySchema,
    spent: moneySchema,
    remaining: moneySchema,
    /** Fraction 0..1+ of the total budgeted amount that's been spent. */
    utilization: z.number(),
  }),
});

export type BudgetsListResponse = z.infer<typeof budgetsListResponseSchema>;
