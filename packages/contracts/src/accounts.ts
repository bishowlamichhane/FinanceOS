import { z } from 'zod';
import {
  accountTypeSchema,
  currencyCodeSchema,
  idSchema,
  isoDateSchema,
  isoDateTimeSchema,
  moneyAmountSchema,
} from './common';

// =============================================================================
// ACCOUNTS
// =============================================================================

export const accountSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(100),
  type: accountTypeSchema,
  bankName: z.string().max(100).nullable(),
  /** Last 4 of account number for display ("•••• 4421"). Stored separately. */
  accountNumberLast4: z.string().regex(/^\d{4}$/).nullable(),
  currency: currencyCodeSchema,
  openingBalance: moneyAmountSchema,
  /** Funds reserved / on hold. Available = currentBalance - holdBalance. */
  holdBalance: moneyAmountSchema,
  /** Computed by API on demand. */
  currentBalance: moneyAmountSchema,
  /** Color hex, nullable for default */
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(),
  /** Icon key, e.g. "building", "wallet". Maps to lucide icon. */
  icon: z.string().max(40),
  notes: z.string().nullable(),
  archived: z.boolean(),
  createdAt: isoDateTimeSchema,
});

export type Account = z.infer<typeof accountSchema>;

// --- Create

export const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: accountTypeSchema,
  bankName: z.string().max(100).optional(),
  accountNumberLast4: z.string().regex(/^\d{4}$/).optional(),
  currency: currencyCodeSchema.default('NPR'),
  openingBalance: moneyAmountSchema.default('0'),
  holdBalance: moneyAmountSchema.default('0').optional(),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().min(1).max(40).default('wallet'),
  notes: z.string().max(1000).optional(),
});

export type CreateAccountRequest = z.infer<typeof createAccountSchema>;

// --- Update

export const updateAccountSchema = createAccountSchema.partial().extend({
  archived: z.boolean().optional(),
});

export type UpdateAccountRequest = z.infer<typeof updateAccountSchema>;

// --- Account list with totals

export const accountsListResponseSchema = z.object({
  accounts: z.array(accountSchema),
  totals: z.object({
    cash: moneyAmountSchema,
    bank: moneyAmountSchema,
    wallet: moneyAmountSchema,
    investment: moneyAmountSchema,
    creditCard: moneyAmountSchema,
    loan: moneyAmountSchema,
    other: moneyAmountSchema,
    /** Net (assets - liabilities for accounts only — true net worth includes assets/liabilities tables) */
    net: moneyAmountSchema,
  }),
});

export type AccountsListResponse = z.infer<typeof accountsListResponseSchema>;

// --- Transfer (atomic — single endpoint, single transaction record)

export const transferRequestSchema = z.object({
  fromAccountId: idSchema,
  toAccountId: idSchema,
  amount: moneyAmountSchema.refine((v: string) => parseFloat(v) > 0, {
    message: 'Amount must be greater than zero',
  }),
  currency: currencyCodeSchema.default('NPR'),
  date: isoDateSchema,
  description: z.string().min(1).max(200).default('Transfer'),
  notes: z.string().max(500).optional(),
}).refine((v: { fromAccountId: string; toAccountId: string }) => v.fromAccountId !== v.toAccountId, {
  message: 'Source and destination accounts must differ',
  path: ['toAccountId'],
});

export type TransferRequest = z.infer<typeof transferRequestSchema>;