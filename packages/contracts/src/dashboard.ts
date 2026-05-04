import { z } from 'zod';
import { categorySchema } from './categories';
import { idSchema, moneySchema } from './common';

/**
 * Dashboard summary — single endpoint feeds the home tab.
 *
 * Designed to be one round-trip. Contains everything needed for the screen
 * including computed metrics. UI never derives money values from these
 * client-side; all aggregation is server-side for consistency.
 */

export const dashboardSummarySchema = z.object({
  // Net worth block
  netWorth: moneySchema,
  netWorthChangePct: z.number().nullable(), // vs previous month
  totalAssets: moneySchema,
  totalLiabilities: moneySchema,

  // This month
  monthlyIncome: moneySchema,
  monthlyExpense: moneySchema,
  monthlyNet: moneySchema,
  /** ratio in [-∞, 1]; null when no income */
  savingsRate: z.number().nullable(),

  // Previous month for comparison
  previousMonthIncome: moneySchema,
  previousMonthExpense: moneySchema,

  // Investments
  portfolioValue: moneySchema,
  portfolioCost: moneySchema,
  portfolioUnrealizedGain: moneySchema,

  // Health
  healthScore: z.number().int().min(0).max(100),

  // Account balances summary
  cashTotal: moneySchema,
  bankTotal: moneySchema,
  walletTotal: moneySchema,

  // Top expense categories this month (top 5)
  topCategories: z.array(
    z.object({
      category: categorySchema,
      total: moneySchema,
    }),
  ),

  // Recent transactions (top 5, hydrated)
  recentTransactions: z.array(
    z.object({
      id: idSchema,
      date: z.string(),
      type: z.string(),
      amount: z.string(),
      currency: z.string(),
      description: z.string(),
      categoryName: z.string().nullable(),
      categoryColor: z.string().nullable(),
      categoryIcon: z.string().nullable(),
      accountName: z.string().nullable(),
    }),
  ),

  // Upcoming bills (next 7 days)
  upcomingBills: z.array(
    z.object({
      id: idSchema,
      description: z.string(),
      amount: moneySchema,
      dueDate: z.string(),
      kind: z.enum(['recurring', 'liability_payment']),
    }),
  ),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

// --- Cashflow trend (separate endpoint, called when user opens analytics)

export const cashflowTrendSchema = z.object({
  /** Each entry is one month, oldest first */
  months: z.array(
    z.object({
      month: z.string(), // "Jan 2026"
      income: moneySchema,
      expense: moneySchema,
      net: moneySchema,
    }),
  ),
});

export type CashflowTrend = z.infer<typeof cashflowTrendSchema>;

// --- Net worth trend (separate, used in Wealth screen)

export const netWorthTrendSchema = z.object({
  /** monthly snapshots, oldest first */
  snapshots: z.array(
    z.object({
      date: z.string(),
      netWorth: moneySchema,
      assets: moneySchema,
      liabilities: moneySchema,
    }),
  ),
});

export type NetWorthTrend = z.infer<typeof netWorthTrendSchema>;