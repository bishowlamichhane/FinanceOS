/**
 * Finance — pure financial calculations.
 *
 * Every function here is:
 *   - Pure (no side effects, no I/O)
 *   - Money-typed (never a raw number for currency values)
 *   - Unit-tested (see finance.test.ts)
 *
 * If a calculation appears in the brief's "FINANCIAL CALCULATION REQUIREMENTS"
 * section, it lives here.
 */

import { Money, sum, type CurrencyCode } from './money';

// =============================================================================
// 1. NET WORTH
// =============================================================================

export type NetWorthInput = {
  assets: Money[];
  liabilities: Money[];
};

export type NetWorthResult = {
  totalAssets: Money;
  totalLiabilities: Money;
  netWorth: Money;
};

export function computeNetWorth(input: NetWorthInput, currency: CurrencyCode): NetWorthResult {
  const totalAssets = sum(input.assets, currency);
  const totalLiabilities = sum(input.liabilities, currency);
  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets.sub(totalLiabilities),
  };
}

// =============================================================================
// 2. CASHFLOW & SAVINGS RATE
// =============================================================================

export type CashflowInput = {
  income: Money[];
  expenses: Money[];
};

export type CashflowResult = {
  totalIncome: Money;
  totalExpense: Money;
  net: Money;
  /** ratio in [0, 1] (or negative if overspending). null if income is zero. */
  savingsRate: number | null;
};

export function computeCashflow(input: CashflowInput, currency: CurrencyCode): CashflowResult {
  const totalIncome = sum(input.income, currency);
  const totalExpense = sum(input.expenses, currency);
  const net = totalIncome.sub(totalExpense);

  // savings rate = (income - expenses) / income
  // Undefined if income is zero — we return null and let UI render "—"
  const savingsRate = totalIncome.isZero()
    ? null
    : net.toDecimal().dividedBy(totalIncome.toDecimal()).toNumber();

  return { totalIncome, totalExpense, net, savingsRate };
}

// =============================================================================
// 3. ACCOUNT BALANCE
// =============================================================================

export type AccountTransaction = {
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out' | 'adjustment';
  amount: Money;
};

/**
 * Account balance = opening + sum(income, transfer_in, positive_adjustments)
 *                            - sum(expense, transfer_out, negative_adjustments)
 *
 * `adjustment` is signed: positive amount adds, negative subtracts. This matches
 * what users intuitively want when reconciling.
 */
export function computeAccountBalance(
  openingBalance: Money,
  transactions: AccountTransaction[],
): Money {
  return transactions.reduce((balance, tx) => {
    switch (tx.type) {
      case 'income':
      case 'transfer_in':
        return balance.add(tx.amount);
      case 'expense':
      case 'transfer_out':
        return balance.sub(tx.amount);
      case 'adjustment':
        // Signed adjustment: +/- already in amount
        return balance.add(tx.amount);
    }
  }, openingBalance);
}

// =============================================================================
// 4. STOCK WACC (WEIGHTED AVERAGE COST OF CAPITAL)
// =============================================================================

/**
 * Stock transactions for a single holding.
 * Order matters — these must be replayed in chronological order.
 */
export type StockEvent =
  | { kind: 'buy'; quantity: number; pricePerShare: Money; fees?: Money }
  | { kind: 'sell'; quantity: number; pricePerShare: Money; fees?: Money }
  | { kind: 'ipo'; quantity: number; pricePerShare: Money }
  | { kind: 'bonus'; quantity: number } // free shares — dilute WACC
  | { kind: 'right'; quantity: number; pricePerShare: Money } // entitled to buy at issue price
  | { kind: 'split'; ratio: number } // 1-for-N split: existing shares × ratio
  | { kind: 'adjustment'; quantity: number; pricePerShare: Money };

export type HoldingState = {
  /** Current quantity held. */
  quantity: number;
  /** Weighted average cost per share, as Money. Zero if no shares held. */
  wacc: Money;
  /** Total invested capital still on the books (quantity × wacc). */
  costBasis: Money;
  /** Realized gain/loss from sales. */
  realized: Money;
};

/**
 * WACC algorithm:
 *
 *   On BUY/IPO/RIGHT:
 *     newCost  = (currentQty * wacc) + (newQty * priceWithFees)
 *     newQty   = currentQty + newQty
 *     wacc     = newCost / newQty
 *
 *   On BONUS:
 *     newQty   = currentQty + bonusQty
 *     wacc     = (currentQty * wacc) / newQty   (cost stays, qty grows → WACC falls)
 *
 *   On SPLIT (1-for-N: ratio = N):
 *     newQty   = currentQty * ratio
 *     wacc     = wacc / ratio
 *
 *   On SELL:
 *     realized = (sellPrice - wacc) * sellQty - fees
 *     newQty   = currentQty - sellQty
 *     wacc     unchanged
 *
 *   On ADJUSTMENT:
 *     same as buy (positive qty) or sell (negative qty)
 *
 * This is the algorithm Nepali brokers use, and matches what FIFO methodology
 * collapses to when you lump cost basis (which is fine for personal tracking).
 */
export function replayStockEvents(
  events: StockEvent[],
  currency: CurrencyCode,
): HoldingState {
  let qty = 0;
  let costBasis = Money.zero(currency);
  let realized = Money.zero(currency);

  for (const event of events) {
    switch (event.kind) {
      case 'buy':
      case 'ipo':
      case 'right': {
        const fees = 'fees' in event && event.fees ? event.fees : Money.zero(currency);
        const addedCost = event.pricePerShare.mul(event.quantity).add(fees);
        costBasis = costBasis.add(addedCost);
        qty += event.quantity;
        break;
      }

      case 'bonus': {
        // Cost basis unchanged, quantity increases. WACC falls.
        qty += event.quantity;
        break;
      }

      case 'split': {
        // Cost basis unchanged, quantity scales. WACC falls.
        qty = qty * event.ratio;
        break;
      }

      case 'sell': {
        if (event.quantity > qty) {
          throw new Error(
            `replayStockEvents: cannot sell ${event.quantity} shares, only ${qty} held`,
          );
        }
        const wacc = qty > 0 ? costBasis.div(qty) : Money.zero(currency);
        const proceedsPerShare = event.pricePerShare.sub(wacc);
        const fees = event.fees ?? Money.zero(currency);
        const gainOnSale = proceedsPerShare.mul(event.quantity).sub(fees);
        realized = realized.add(gainOnSale);
        // Reduce cost basis proportionally
        costBasis = costBasis.sub(wacc.mul(event.quantity));
        qty -= event.quantity;
        if (qty === 0) costBasis = Money.zero(currency); // floor floats
        break;
      }

      case 'adjustment': {
        if (event.quantity > 0) {
          costBasis = costBasis.add(event.pricePerShare.mul(event.quantity));
          qty += event.quantity;
        } else if (event.quantity < 0) {
          const absQty = -event.quantity;
          if (absQty > qty) {
            throw new Error(
              `replayStockEvents: adjustment cannot remove ${absQty}, only ${qty} held`,
            );
          }
          const wacc = qty > 0 ? costBasis.div(qty) : Money.zero(currency);
          costBasis = costBasis.sub(wacc.mul(absQty));
          qty -= absQty;
        }
        break;
      }
    }
  }

  const wacc = qty > 0 ? costBasis.div(qty) : Money.zero(currency);
  return { quantity: qty, wacc, costBasis, realized };
}

export type GainLossResult = {
  unrealized: Money;
  unrealizedPct: number | null;
  realized: Money;
};

export function computeGainLoss(
  state: HoldingState,
  currentPrice: Money,
): GainLossResult {
  const currentValue = currentPrice.mul(state.quantity);
  const unrealized = currentValue.sub(state.costBasis);
  const unrealizedPct = state.costBasis.isZero()
    ? null
    : unrealized.toDecimal().dividedBy(state.costBasis.toDecimal()).toNumber();

  return {
    unrealized,
    unrealizedPct,
    realized: state.realized,
  };
}

// =============================================================================
// 5. PORTFOLIO ALLOCATION
// =============================================================================

export type AllocationSlice<T = unknown> = {
  key: string;
  label: string;
  value: Money;
  /** ratio in [0, 1] */
  weight: number;
  meta?: T;
};

export function computeAllocation<T>(
  items: Array<{ key: string; label: string; value: Money; meta?: T }>,
  currency: CurrencyCode,
): AllocationSlice<T>[] {
  const total = sum(
    items.map((i) => i.value),
    currency,
  );
  if (total.isZero()) {
    return items.map((i) => ({ key: i.key, label: i.label, value: i.value, weight: 0, meta: i.meta }));
  }
  return items.map((i) => ({
    key: i.key,
    label: i.label,
    value: i.value,
    weight: i.value.toDecimal().dividedBy(total.toDecimal()).toNumber(),
    meta: i.meta,
  }));
}

// =============================================================================
// 6. DEBT PAYOFF — amortization
// =============================================================================

export type AmortizationInput = {
  principal: Money;
  /** annual interest rate as a ratio (0.12 = 12% APR) */
  annualRate: number;
  /** monthly payment amount */
  monthlyPayment: Money;
};

export type AmortizationResult = {
  monthsToPayoff: number | null; // null if payment doesn't cover monthly interest
  totalPaid: Money;
  totalInterest: Money;
  payoffDate: Date | null;
};

export function computeDebtPayoff(input: AmortizationInput, from = new Date()): AmortizationResult {
  const monthlyRate = input.annualRate / 12;
  const principalAmt = input.principal.toDecimal();
  const paymentAmt = input.monthlyPayment.toDecimal();

  // First-month interest. If payment doesn't cover this, debt grows forever.
  const firstInterest = principalAmt.times(monthlyRate);
  if (paymentAmt.lessThanOrEqualTo(firstInterest)) {
    return {
      monthsToPayoff: null,
      totalPaid: Money.zero(input.principal.currency),
      totalInterest: Money.zero(input.principal.currency),
      payoffDate: null,
    };
  }

  // Closed-form: n = -log(1 - (P*r)/M) / log(1 + r)
  // For r=0 (interest-free), n = P / M
  let months: number;
  if (monthlyRate === 0) {
    months = Math.ceil(principalAmt.dividedBy(paymentAmt).toNumber());
  } else {
    const numerator = Math.log(
      1 - principalAmt.times(monthlyRate).dividedBy(paymentAmt).toNumber(),
    );
    const denominator = Math.log(1 + monthlyRate);
    months = Math.ceil(-numerator / denominator);
  }

  const totalPaid = input.monthlyPayment.mul(months);
  const totalInterest = totalPaid.sub(input.principal);

  const payoffDate = new Date(from);
  payoffDate.setMonth(payoffDate.getMonth() + months);

  return { monthsToPayoff: months, totalPaid, totalInterest, payoffDate };
}

// =============================================================================
// 7. BUDGET UTILIZATION
// =============================================================================

export type BudgetUtilization = {
  spent: Money;
  limit: Money;
  remaining: Money; // can be negative if overspent
  /** ratio in [0, ∞]. >1 means overspent. */
  ratio: number;
  status: 'safe' | 'warn' | 'near' | 'over';
};

export function computeBudgetUtilization(spent: Money, limit: Money): BudgetUtilization {
  const remaining = limit.sub(spent);
  const ratio = limit.isZero()
    ? 0
    : spent.toDecimal().dividedBy(limit.toDecimal()).toNumber();

  let status: BudgetUtilization['status'];
  if (ratio >= 1) status = 'over';
  else if (ratio >= 0.8) status = 'near';
  else if (ratio >= 0.5) status = 'warn';
  else status = 'safe';

  return { spent, limit, remaining, ratio, status };
}

// =============================================================================
// 8. FINANCIAL HEALTH SCORE
// =============================================================================

/**
 * A 0-100 composite health score. Components:
 *   - Savings rate (40 pts): savings_rate * 200, capped at 40
 *     (20% savings rate = full marks)
 *   - Emergency fund (25 pts): liquid_assets / monthly_expenses, capped at
 *     6 months → full marks
 *   - Debt-to-income (20 pts): 0% debt = full, scales linearly to 50% = 0
 *   - Budget adherence (15 pts): % of budgets within limit
 *
 * Each component is computed only if data is sufficient; missing components
 * are excluded from the denominator (so a new user with no debt isn't
 * penalized for it).
 */

export type HealthScoreInput = {
  savingsRate: number | null; // ratio
  liquidAssets: Money;
  monthlyExpenses: Money;
  totalDebt: Money;
  monthlyIncome: Money;
  budgetsCount: number;
  budgetsWithinLimit: number;
};

export type HealthScoreResult = {
  score: number; // 0-100
  components: {
    savingsRate: { score: number; max: number; available: boolean };
    emergencyFund: { score: number; max: number; available: boolean };
    debtRatio: { score: number; max: number; available: boolean };
    budgetAdherence: { score: number; max: number; available: boolean };
  };
};

export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  // Savings rate component
  const savingsAvail = input.savingsRate !== null;
  const savingsScore = savingsAvail ? Math.max(0, Math.min(40, input.savingsRate! * 200)) : 0;

  // Emergency fund component
  const efAvail = !input.monthlyExpenses.isZero();
  let efScore = 0;
  if (efAvail) {
    const monthsCovered = input.liquidAssets
      .toDecimal()
      .dividedBy(input.monthlyExpenses.toDecimal())
      .toNumber();
    efScore = Math.max(0, Math.min(25, (monthsCovered / 6) * 25));
  }

  // Debt-to-income component
  const debtAvail = !input.monthlyIncome.isZero();
  let debtScore = 0;
  if (debtAvail) {
    const ratio = input.totalDebt
      .toDecimal()
      .dividedBy(input.monthlyIncome.mul(12).toDecimal())
      .toNumber();
    // 0% debt → 20pts; 50%+ → 0pts; linear in between
    debtScore = Math.max(0, Math.min(20, (1 - ratio / 0.5) * 20));
  }

  // Budget adherence component
  const budgetAvail = input.budgetsCount > 0;
  const budgetScore = budgetAvail
    ? Math.max(0, Math.min(15, (input.budgetsWithinLimit / input.budgetsCount) * 15))
    : 0;

  // Sum available components, normalize to 100
  const totalEarned = savingsScore + efScore + debtScore + budgetScore;
  const totalAvailable =
    (savingsAvail ? 40 : 0) + (efAvail ? 25 : 0) + (debtAvail ? 20 : 0) + (budgetAvail ? 15 : 0);

  const score = totalAvailable === 0 ? 0 : Math.round((totalEarned / totalAvailable) * 100);

  return {
    score,
    components: {
      savingsRate: { score: Math.round(savingsScore), max: 40, available: savingsAvail },
      emergencyFund: { score: Math.round(efScore), max: 25, available: efAvail },
      debtRatio: { score: Math.round(debtScore), max: 20, available: debtAvail },
      budgetAdherence: { score: Math.round(budgetScore), max: 15, available: budgetAvail },
    },
  };
}
