import { z } from 'zod';
import {
  assetTypeSchema,
  currencyCodeSchema,
  idSchema,
  isoDateSchema,
  isoDateTimeSchema,
  moneyAmountSchema,
  moneySchema,
} from './common';

/**
 * Asset contracts.
 *
 * An Asset represents a single owned thing with a current monetary value:
 * cash (outside of a tracked account), fixed deposits, gold, vehicles, real
 * estate, electronics, crypto, etc. Stocks / NEPSE holdings get their own
 * dedicated module in Phase 4 — `STOCK_PORTFOLIO` here is the umbrella
 * placeholder until then.
 *
 * Each asset has a chain of `AssetValueSnapshot` rows recording valuation
 * over time. `currentValue` is denormalized from the latest snapshot, and
 * the API hydrates a `change` block describing month-over-month movement.
 */

// =============================================================================
// VALUATION SNAPSHOT
// =============================================================================

export const assetValueSnapshotSchema = z.object({
  id: idSchema,
  assetId: idSchema,
  date: isoDateSchema,
  value: moneyAmountSchema,
  source: z.enum(['manual', 'import', 'computed']),
  notes: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});

export type AssetValueSnapshot = z.infer<typeof assetValueSnapshotSchema>;

// =============================================================================
// HYDRATED CHANGE
// =============================================================================

/** Month-over-month change for an asset, computed by the API. */
export const assetChangeSchema = z.object({
  /** Value 30 days ago, or first-known value if asset is younger. Null if no prior data. */
  previousValue: moneyAmountSchema.nullable(),
  /** currentValue - previousValue. Null if no prior data. */
  delta: moneyAmountSchema.nullable(),
  /** Fractional change (delta / previousValue). Null if no prior data or previousValue is zero. */
  deltaPercent: z.number().nullable(),
  /** Direction: 'up' / 'down' / 'flat'. */
  direction: z.enum(['up', 'down', 'flat']),
});

export type AssetChange = z.infer<typeof assetChangeSchema>;

// =============================================================================
// ASSET
// =============================================================================

export const assetSchema = z.object({
  id: idSchema,
  name: z.string(),
  type: assetTypeSchema,
  currentValue: moneyAmountSchema,
  currency: currencyCodeSchema,
  acquiredAt: isoDateSchema.nullable(),
  acquiredCost: moneyAmountSchema.nullable(),
  notes: z.string().nullable(),
  linkedAccountId: idSchema.nullable(),
  archived: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  /** Hydrated month-over-month change. */
  change: assetChangeSchema,
});

export type Asset = z.infer<typeof assetSchema>;

// =============================================================================
// CREATE
// =============================================================================

export const createAssetSchema = z.object({
  name: z.string().min(1).max(120),
  type: assetTypeSchema,
  /** Initial value — also written as the first AssetValueSnapshot. */
  currentValue: moneyAmountSchema.refine((v) => parseFloat(v) >= 0, {
    message: 'Value must be zero or positive',
  }),
  currency: currencyCodeSchema.default('NPR'),
  acquiredAt: isoDateSchema.optional().nullable(),
  acquiredCost: moneyAmountSchema.optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  linkedAccountId: idSchema.optional().nullable(),
});

export type CreateAssetRequest = z.infer<typeof createAssetSchema>;

// =============================================================================
// UPDATE — partial; current value goes through /values endpoint instead
// =============================================================================

export const updateAssetSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  type: assetTypeSchema.optional(),
  acquiredAt: isoDateSchema.nullable().optional(),
  acquiredCost: moneyAmountSchema.nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  linkedAccountId: idSchema.nullable().optional(),
  archived: z.boolean().optional(),
});

export type UpdateAssetRequest = z.infer<typeof updateAssetSchema>;

// =============================================================================
// RECORD VALUATION
// =============================================================================

export const recordAssetValueSchema = z.object({
  value: moneyAmountSchema.refine((v) => parseFloat(v) >= 0, {
    message: 'Value must be zero or positive',
  }),
  /** Defaults to today on the server. */
  date: isoDateSchema.optional(),
  notes: z.string().max(500).optional().nullable(),
});

export type RecordAssetValueRequest = z.infer<typeof recordAssetValueSchema>;

// =============================================================================
// LIST RESPONSE
// =============================================================================

export const assetsListResponseSchema = z.object({
  items: z.array(assetSchema),
  /** Aggregated rollup across all active (non-archived) NPR assets. */
  totals: z.object({
    totalValue: moneySchema,
    totalCost: moneySchema,
    /** totalValue - totalCost. */
    totalGain: moneySchema,
    /** Fractional gain (totalGain / totalCost). 0 when totalCost is zero. */
    gainPercent: z.number(),
    count: z.number().int(),
  }),
});

export type AssetsListResponse = z.infer<typeof assetsListResponseSchema>;

// =============================================================================
// VALUE HISTORY RESPONSE
// =============================================================================

export const assetValueHistoryResponseSchema = z.object({
  assetId: idSchema,
  items: z.array(assetValueSnapshotSchema),
});

export type AssetValueHistoryResponse = z.infer<
  typeof assetValueHistoryResponseSchema
>;
