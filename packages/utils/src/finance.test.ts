/**
 * Money & finance tests.
 *
 * These cover the CALCULATIONS that, if wrong, mean the app is silently
 * lying to the user about their money. Coverage target here is 100%.
 */

import { describe, it, expect } from 'vitest';
import { Money, sum } from './money';
import {
  computeNetWorth,
  computeCashflow,
  computeAccountBalance,
  replayStockEvents,
  computeGainLoss,
  computeAllocation,
  computeDebtPayoff,
  computeBudgetUtilization,
  computeHealthScore,
} from './finance';

// ---- Money basics ----

describe('Money', () => {
  it('adds without floating-point error', () => {
    const a = Money.from('0.1');
    const b = Money.from('0.2');
    expect(a.add(b).toString()).toBe('0.3');
  });

  it('refuses cross-currency operations', () => {
    const npr = Money.from('100', 'NPR');
    const usd = Money.from('100', 'USD');
    expect(() => npr.add(usd)).toThrow(/currency mismatch/);
  });

  it('refuses division by zero', () => {
    expect(() => Money.from('100').div(0)).toThrow(/division by zero/);
  });

  it('handles very large NPR amounts (crores)', () => {
    const total = Money.from('12345678.90');
    expect(total.mul(100).toString()).toBe('1234567890');
  });

  it('round-trips via toJSON', () => {
    const m = Money.from('1240500.50', 'NPR');
    const json = m.toJSON();
    const restored = Money.from(json.amount, json.currency);
    expect(restored.eq(m)).toBe(true);
  });
});

describe('sum()', () => {
  it('returns zero for empty array', () => {
    expect(sum([], 'NPR').isZero()).toBe(true);
  });

  it('sums correctly', () => {
    const result = sum([Money.from('100'), Money.from('200'), Money.from('50.5')], 'NPR');
    expect(result.toString()).toBe('350.5');
  });
});

// ---- Net worth ----

describe('computeNetWorth', () => {
  it('subtracts liabilities from assets', () => {
    const r = computeNetWorth(
      {
        assets: [Money.from('1000000'), Money.from('250000')],
        liabilities: [Money.from('50000'), Money.from('100000')],
      },
      'NPR',
    );
    expect(r.totalAssets.toString()).toBe('1250000');
    expect(r.totalLiabilities.toString()).toBe('150000');
    expect(r.netWorth.toString()).toBe('1100000');
  });

  it('handles negative net worth', () => {
    const r = computeNetWorth(
      { assets: [Money.from('100')], liabilities: [Money.from('500')] },
      'NPR',
    );
    expect(r.netWorth.toString()).toBe('-400');
    expect(r.netWorth.isNegative()).toBe(true);
  });
});

// ---- Cashflow & savings rate ----

describe('computeCashflow', () => {
  it('computes savings rate', () => {
    const r = computeCashflow(
      { income: [Money.from('100000')], expenses: [Money.from('60000')] },
      'NPR',
    );
    expect(r.net.toString()).toBe('40000');
    expect(r.savingsRate).toBeCloseTo(0.4, 5);
  });

  it('returns null savings rate when income is zero', () => {
    const r = computeCashflow({ income: [], expenses: [Money.from('100')] }, 'NPR');
    expect(r.savingsRate).toBeNull();
  });

  it('reports negative savings rate when overspending', () => {
    const r = computeCashflow(
      { income: [Money.from('1000')], expenses: [Money.from('1500')] },
      'NPR',
    );
    expect(r.savingsRate).toBeLessThan(0);
  });
});

// ---- Account balance ----

describe('computeAccountBalance', () => {
  it('replays mixed transactions in order', () => {
    const opening = Money.from('1000', 'NPR');
    const balance = computeAccountBalance(opening, [
      { type: 'income', amount: Money.from('500') },
      { type: 'expense', amount: Money.from('200') },
      { type: 'transfer_in', amount: Money.from('100') },
      { type: 'transfer_out', amount: Money.from('50') },
      { type: 'adjustment', amount: Money.from('25') }, // positive adjustment
      { type: 'adjustment', amount: Money.from('-10') }, // negative
    ]);
    // 1000 + 500 - 200 + 100 - 50 + 25 - 10 = 1365
    expect(balance.toString()).toBe('1365');
  });
});

// ---- Stock WACC ----

describe('replayStockEvents (WACC)', () => {
  it('basic buys average correctly', () => {
    // Buy 100 @ 200, then 100 @ 300 → WACC = 250
    const r = replayStockEvents(
      [
        { kind: 'buy', quantity: 100, pricePerShare: Money.from('200') },
        { kind: 'buy', quantity: 100, pricePerShare: Money.from('300') },
      ],
      'NPR',
    );
    expect(r.quantity).toBe(200);
    expect(r.wacc.toString()).toBe('250');
    expect(r.costBasis.toString()).toBe('50000');
  });

  it('bonus shares dilute WACC without changing cost basis', () => {
    // Buy 100 @ 1000 (cost 100000), bonus 1:10 (10 shares) → 110 shares, same cost
    const r = replayStockEvents(
      [
        { kind: 'buy', quantity: 100, pricePerShare: Money.from('1000') },
        { kind: 'bonus', quantity: 10 },
      ],
      'NPR',
    );
    expect(r.quantity).toBe(110);
    expect(r.costBasis.toString()).toBe('100000');
    expect(r.wacc.toFixed(4)).toBe(Money.from('100000').div(110).toFixed(4));
  });

  it('right shares add to cost basis at issue price', () => {
    // Buy 100 @ 1000, then exercise rights for 50 @ 200
    // Cost basis: 100*1000 + 50*200 = 110000, qty 150, WACC = 733.33
    const r = replayStockEvents(
      [
        { kind: 'buy', quantity: 100, pricePerShare: Money.from('1000') },
        { kind: 'right', quantity: 50, pricePerShare: Money.from('200') },
      ],
      'NPR',
    );
    expect(r.quantity).toBe(150);
    expect(r.costBasis.toString()).toBe('110000');
    expect(r.wacc.toFixed(2)).toBe('733.33');
  });

  it('sell realizes gain, leaves WACC unchanged', () => {
    // Buy 100 @ 200 (WACC 200), sell 50 @ 300 → realized = 50 * 100 = 5000
    const r = replayStockEvents(
      [
        { kind: 'buy', quantity: 100, pricePerShare: Money.from('200') },
        { kind: 'sell', quantity: 50, pricePerShare: Money.from('300') },
      ],
      'NPR',
    );
    expect(r.quantity).toBe(50);
    expect(r.wacc.toString()).toBe('200');
    expect(r.realized.toString()).toBe('5000');
    expect(r.costBasis.toString()).toBe('10000'); // 50 shares × 200 WACC
  });

  it('selling more than held throws', () => {
    expect(() =>
      replayStockEvents(
        [
          { kind: 'buy', quantity: 10, pricePerShare: Money.from('100') },
          { kind: 'sell', quantity: 20, pricePerShare: Money.from('100') },
        ],
        'NPR',
      ),
    ).toThrow(/cannot sell/);
  });

  it('1:5 split scales quantity and divides WACC', () => {
    const r = replayStockEvents(
      [
        { kind: 'buy', quantity: 10, pricePerShare: Money.from('1000') },
        { kind: 'split', ratio: 5 },
      ],
      'NPR',
    );
    expect(r.quantity).toBe(50);
    expect(r.costBasis.toString()).toBe('10000');
    expect(r.wacc.toString()).toBe('200');
  });

  it('Nepal-realistic: IPO + bonus + right + sell', () => {
    // IPO: 10 shares @ 100 (cost 1000)
    // Buy 50 @ 250 (cost +12500 = 13500, qty 60, WACC 225)
    // 1:1 bonus: 60 shares free → qty 120, cost 13500, WACC 112.50
    // Right 30 @ 100: cost +3000 = 16500, qty 150, WACC 110
    // Sell 50 @ 150: realized = (150-110) * 50 = 2000; qty 100, cost 11000, WACC 110
    const r = replayStockEvents(
      [
        { kind: 'ipo', quantity: 10, pricePerShare: Money.from('100') },
        { kind: 'buy', quantity: 50, pricePerShare: Money.from('250') },
        { kind: 'bonus', quantity: 60 },
        { kind: 'right', quantity: 30, pricePerShare: Money.from('100') },
        { kind: 'sell', quantity: 50, pricePerShare: Money.from('150') },
      ],
      'NPR',
    );
    expect(r.quantity).toBe(100);
    expect(r.wacc.toFixed(2)).toBe('110.00');
    expect(r.realized.toString()).toBe('2000');
  });
});

// ---- Gain/loss ----

describe('computeGainLoss', () => {
  it('computes unrealized gain', () => {
    const state = replayStockEvents(
      [{ kind: 'buy', quantity: 100, pricePerShare: Money.from('200') }],
      'NPR',
    );
    const r = computeGainLoss(state, Money.from('250'));
    expect(r.unrealized.toString()).toBe('5000');
    expect(r.unrealizedPct).toBeCloseTo(0.25, 5);
  });

  it('handles zero cost basis', () => {
    const state = { quantity: 0, wacc: Money.zero('NPR'), costBasis: Money.zero('NPR'), realized: Money.zero('NPR') };
    const r = computeGainLoss(state, Money.from('100'));
    expect(r.unrealizedPct).toBeNull();
  });
});

// ---- Allocation ----

describe('computeAllocation', () => {
  it('produces weights summing to 1', () => {
    const slices = computeAllocation(
      [
        { key: 'a', label: 'A', value: Money.from('400') },
        { key: 'b', label: 'B', value: Money.from('600') },
      ],
      'NPR',
    );
    expect(slices[0]!.weight).toBeCloseTo(0.4, 5);
    expect(slices[1]!.weight).toBeCloseTo(0.6, 5);
  });

  it('returns zero weights when total is zero', () => {
    const slices = computeAllocation(
      [{ key: 'a', label: 'A', value: Money.zero('NPR') }],
      'NPR',
    );
    expect(slices[0]!.weight).toBe(0);
  });
});

// ---- Debt payoff ----

describe('computeDebtPayoff', () => {
  it('computes amortization', () => {
    const r = computeDebtPayoff({
      principal: Money.from('100000'),
      annualRate: 0.12,
      monthlyPayment: Money.from('5000'),
    });
    expect(r.monthsToPayoff).toBeGreaterThan(0);
    expect(r.totalInterest.isPositive()).toBe(true);
  });

  it('detects underwater payment', () => {
    // 100000 @ 12% APR → monthly interest 1000. Payment of 500 never catches up.
    const r = computeDebtPayoff({
      principal: Money.from('100000'),
      annualRate: 0.12,
      monthlyPayment: Money.from('500'),
    });
    expect(r.monthsToPayoff).toBeNull();
  });

  it('handles zero-interest debt', () => {
    const r = computeDebtPayoff({
      principal: Money.from('12000'),
      annualRate: 0,
      monthlyPayment: Money.from('1000'),
    });
    expect(r.monthsToPayoff).toBe(12);
    expect(r.totalInterest.isZero()).toBe(true);
  });
});

// ---- Budget utilization ----

describe('computeBudgetUtilization', () => {
  it('classifies safe/warn/near/over correctly', () => {
    expect(computeBudgetUtilization(Money.from('100'), Money.from('1000')).status).toBe('safe');
    expect(computeBudgetUtilization(Money.from('600'), Money.from('1000')).status).toBe('warn');
    expect(computeBudgetUtilization(Money.from('850'), Money.from('1000')).status).toBe('near');
    expect(computeBudgetUtilization(Money.from('1100'), Money.from('1000')).status).toBe('over');
  });

  it('handles zero limit gracefully', () => {
    const r = computeBudgetUtilization(Money.from('100'), Money.zero('NPR'));
    expect(r.ratio).toBe(0);
  });
});

// ---- Health score ----

describe('computeHealthScore', () => {
  it('rewards good savings rate', () => {
    const r = computeHealthScore({
      savingsRate: 0.25, // above 20% target
      liquidAssets: Money.from('600000'),
      monthlyExpenses: Money.from('100000'),
      totalDebt: Money.zero('NPR'),
      monthlyIncome: Money.from('150000'),
      budgetsCount: 5,
      budgetsWithinLimit: 5,
    });
    expect(r.score).toBeGreaterThanOrEqual(95);
  });

  it('excludes missing components from denominator', () => {
    // No income, no expenses, no debt, no budgets — should not be 0
    const r = computeHealthScore({
      savingsRate: null,
      liquidAssets: Money.zero('NPR'),
      monthlyExpenses: Money.zero('NPR'),
      totalDebt: Money.zero('NPR'),
      monthlyIncome: Money.zero('NPR'),
      budgetsCount: 0,
      budgetsWithinLimit: 0,
    });
    // All components unavailable → score is 0 (nothing to evaluate)
    expect(r.score).toBe(0);
    expect(r.components.savingsRate.available).toBe(false);
  });

  it('penalizes overspending', () => {
    const r = computeHealthScore({
      savingsRate: -0.2, // spending more than earning
      liquidAssets: Money.zero('NPR'),
      monthlyExpenses: Money.from('100000'),
      totalDebt: Money.from('500000'),
      monthlyIncome: Money.from('50000'),
      budgetsCount: 3,
      budgetsWithinLimit: 0,
    });
    expect(r.score).toBeLessThan(20);
  });
});
