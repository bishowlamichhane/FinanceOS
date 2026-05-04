import { Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import type { DashboardSummary } from '@finance-os/contracts';

/**
 * Dashboard service.
 *
 * Single round-trip: hits multiple aggregations and folds them into one
 * payload. All math runs in Postgres or via the AccountsService balance
 * computer — never derive money client-side.
 */

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  async getSummary(userId: string): Promise<DashboardSummary> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    const sevenDaysOut = new Date(now);
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

    // ---- Account balances ----
    const allAccounts = await this.prisma.account.findMany({
      where: { userId, deletedAt: null, archived: false },
      select: { id: true, type: true, currency: true, openingBalance: true },
    });
    const balances = await this.accounts.computeBalances(
      userId,
      allAccounts.map((a) => a.id),
    );

    let cashTotal = new Decimal(0);
    let bankTotal = new Decimal(0);
    let walletTotal = new Decimal(0);
    let creditCardTotal = new Decimal(0);
    let loanTotal = new Decimal(0);
    let otherTotal = new Decimal(0);

    for (const a of allAccounts) {
      if (a.currency !== 'NPR') continue;
      const bal = balances.get(a.id) ?? new Decimal(a.openingBalance.toString());
      switch (a.type) {
        case 'CASH':
          cashTotal = cashTotal.plus(bal);
          break;
        case 'BANK_SAVINGS':
        case 'BANK_CURRENT':
        case 'FIXED_DEPOSIT':
          bankTotal = bankTotal.plus(bal);
          break;
        case 'WALLET':
          walletTotal = walletTotal.plus(bal);
          break;
        case 'CREDIT_CARD':
          creditCardTotal = creditCardTotal.plus(bal);
          break;
        case 'LOAN':
          loanTotal = loanTotal.plus(bal);
          break;
        default:
          otherTotal = otherTotal.plus(bal);
      }
    }

    const totalAssets = cashTotal.plus(bankTotal).plus(walletTotal).plus(otherTotal);
    const totalLiabilities = creditCardTotal.plus(loanTotal);
    const netWorth = totalAssets.minus(totalLiabilities);

    // ---- Monthly cashflow ----
    const [thisMonth, prevMonth] = await Promise.all([
      this.aggregateMonth(userId, monthStart, monthEnd),
      this.aggregateMonth(userId, prevMonthStart, prevMonthEnd),
    ]);

    const monthlyNet = thisMonth.income.minus(thisMonth.expense);
    const savingsRate = thisMonth.income.isZero()
      ? null
      : monthlyNet.dividedBy(thisMonth.income).toNumber();

    // ---- Top expense categories ----
    const topCategoriesRaw = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        deletedAt: null,
        date: { gte: monthStart, lte: monthEnd },
        currency: 'NPR',
        categoryId: { not: null },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    });

    const categoryIds = topCategoriesRaw.map((r) => r.categoryId).filter(Boolean) as string[];
    const categoryRows =
      categoryIds.length > 0
        ? await this.prisma.category.findMany({
            where: { id: { in: categoryIds }, userId },
          })
        : [];
    const categoryMap = new Map(categoryRows.map((c) => [c.id, c]));

    const topCategories = topCategoriesRaw
      .map((r) => {
        const cat = r.categoryId ? categoryMap.get(r.categoryId) : null;
        if (!cat) return null;
        return {
          category: {
            id: cat.id,
            name: cat.name,
            icon: cat.icon,
            colorHex: cat.colorHex,
            type: 'expense' as const,
            parentId: cat.parentId,
            isSystem: cat.isSystem,
            archived: cat.archived,
            createdAt: cat.createdAt.toISOString(),
          },
          total: {
            amount: r._sum.amount?.toString() ?? '0',
            currency: 'NPR' as const,
          },
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // ---- Recent transactions ----
    const recentRows = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        splitParentId: null,
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      include: {
        category: { select: { name: true, colorHex: true, icon: true } },
        account: { select: { name: true } },
      },
    });

    const recentTransactions = recentRows.map((r) => ({
      id: r.id,
      date: r.date.toISOString().slice(0, 10),
      type: r.type.toLowerCase(),
      amount: r.amount.toString(),
      currency: r.currency,
      description: r.description,
      categoryName: r.category?.name ?? null,
      categoryColor: r.category?.colorHex ?? null,
      categoryIcon: r.category?.icon ?? null,
      accountName: r.account?.name ?? null,
    }));

    // ---- Upcoming bills ----
    const upcomingRows = await this.prisma.recurringTransaction.findMany({
      where: {
        userId,
        deletedAt: null,
        active: true,
        type: { in: ['EXPENSE', 'LIABILITY_PAYMENT'] },
        nextDate: { gte: now, lte: sevenDaysOut },
      },
      orderBy: { nextDate: 'asc' },
      take: 5,
      select: {
        id: true,
        description: true,
        amount: true,
        currency: true,
        nextDate: true,
        type: true,
      },
    });

    const upcomingBills = upcomingRows.map((r) => ({
      id: r.id,
      description: r.description,
      amount: { amount: r.amount.toString(), currency: r.currency as 'NPR' },
      dueDate: r.nextDate.toISOString().slice(0, 10),
      kind: (r.type === 'LIABILITY_PAYMENT' ? 'liability_payment' : 'recurring') as
        | 'liability_payment'
        | 'recurring',
    }));

    return {
      netWorth: { amount: netWorth.toFixed(4), currency: 'NPR' },
      netWorthChangePct: null,
      totalAssets: { amount: totalAssets.toFixed(4), currency: 'NPR' },
      totalLiabilities: { amount: totalLiabilities.toFixed(4), currency: 'NPR' },

      monthlyIncome: { amount: thisMonth.income.toFixed(4), currency: 'NPR' },
      monthlyExpense: { amount: thisMonth.expense.toFixed(4), currency: 'NPR' },
      monthlyNet: { amount: monthlyNet.toFixed(4), currency: 'NPR' },
      savingsRate,

      previousMonthIncome: { amount: prevMonth.income.toFixed(4), currency: 'NPR' },
      previousMonthExpense: { amount: prevMonth.expense.toFixed(4), currency: 'NPR' },

      portfolioValue: { amount: '0', currency: 'NPR' },
      portfolioCost: { amount: '0', currency: 'NPR' },
      portfolioUnrealizedGain: { amount: '0', currency: 'NPR' },

      healthScore: 0,

      cashTotal: { amount: cashTotal.toFixed(4), currency: 'NPR' },
      bankTotal: { amount: bankTotal.toFixed(4), currency: 'NPR' },
      walletTotal: { amount: walletTotal.toFixed(4), currency: 'NPR' },

      topCategories,
      recentTransactions,
      upcomingBills,
    };
  }

  private async aggregateMonth(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<{ income: Decimal; expense: Decimal }> {
    const rows = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        date: { gte: start, lte: end },
        deletedAt: null,
        currency: 'NPR',
      },
      _sum: { amount: true },
    });

    let income = new Decimal(0);
    let expense = new Decimal(0);
    for (const r of rows) {
      const amt = new Decimal(r._sum.amount?.toString() ?? '0');
      if (r.type === 'INCOME' || r.type === 'DIVIDEND') income = income.plus(amt);
      else if (r.type === 'EXPENSE') expense = expense.plus(amt);
    }
    return { income, expense };
  }
}

function endOfDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(23, 59, 59, 999);
  return next;
}