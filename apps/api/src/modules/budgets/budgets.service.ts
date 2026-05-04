import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { Prisma } from '../../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  Budget,
  BudgetCurrentPeriod,
  BudgetState,
  BudgetsListResponse,
  CreateBudgetRequest,
  UpdateBudgetRequest,
} from '@finance-os/contracts';

/**
 * Budgets service.
 *
 * Phase 3 v1 supports MONTHLY budgets only. Each Budget gets a hydrated
 * `currentPeriod` block describing actuals for the current calendar month
 * (or the period containing today's date, anchored on `startDate`).
 *
 * Period actuals are computed live from the transactions table — we don't
 * read from `BudgetPeriod` snapshots in v1. Snapshots are for historical
 * stability and will be written by a daily job in Phase 5 (reports).
 */

const DEFAULT_THRESHOLDS: number[] = [0.5, 0.8, 1.0];

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // LIST

  async list(userId: string, includeArchived = false): Promise<BudgetsListResponse> {
    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(includeArchived ? {} : { archived: false }),
      },
      orderBy: [{ archived: 'asc' }, { createdAt: 'desc' }],
      include: { category: true },
    });

    const now = new Date();
    const items: Budget[] = await Promise.all(
      budgets.map((b) => this.hydrate(userId, b, now)),
    );

    // Aggregate totals across NPR budgets
    let totalBudgeted = new Decimal(0);
    let totalSpent = new Decimal(0);
    for (const item of items) {
      if (item.currency !== 'NPR' || item.archived) continue;
      totalBudgeted = totalBudgeted.plus(item.currentPeriod.budgeted.amount);
      totalSpent = totalSpent.plus(item.currentPeriod.spent.amount);
    }
    const totalRemaining = totalBudgeted.minus(totalSpent);
    const totalUtilization = totalBudgeted.isZero()
      ? 0
      : totalSpent.dividedBy(totalBudgeted).toNumber();

    return {
      items,
      totals: {
        budgeted: { amount: totalBudgeted.toFixed(4), currency: 'NPR' },
        spent: { amount: totalSpent.toFixed(4), currency: 'NPR' },
        remaining: { amount: totalRemaining.toFixed(4), currency: 'NPR' },
        utilization: totalUtilization,
      },
    };
  }

  async findOne(userId: string, id: string): Promise<Budget> {
    const budget = await this.requireOwned(userId, id);
    return this.hydrate(userId, budget, new Date());
  }

  // ---------------------------------------------------------------------------
  // CREATE

  async create(userId: string, dto: CreateBudgetRequest): Promise<Budget> {
    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : firstOfMonth(new Date());

    if (dto.categoryId) {
      // Validate category belongs to user
      const cat = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, userId, deletedAt: null },
      });
      if (!cat) throw new NotFoundException('Category not found');
    }

    const created = await this.prisma.budget.create({
      data: {
        userId,
        categoryId: dto.categoryId ?? null,
        period: dto.period ? recurrenceToDb(dto.period) : 'MONTHLY',
        amount: new Prisma.Decimal(dto.amount),
        currency: dto.currency ?? 'NPR',
        startDate,
        alertThresholds:
          dto.alertThresholds && dto.alertThresholds.length > 0
            ? dto.alertThresholds.map((n) => new Prisma.Decimal(n.toFixed(2)))
            : DEFAULT_THRESHOLDS.map((n) => new Prisma.Decimal(n.toFixed(2))),
      },
      include: { category: true },
    });

    return this.hydrate(userId, created, new Date());
  }

  // ---------------------------------------------------------------------------
  // UPDATE

  async update(
    userId: string,
    id: string,
    dto: UpdateBudgetRequest,
  ): Promise<Budget> {
    await this.requireOwned(userId, id);

    const data: Record<string, unknown> = {};
    if (dto.amount !== undefined) data.amount = new Prisma.Decimal(dto.amount);
    if (dto.alertThresholds !== undefined) {
      data.alertThresholds = dto.alertThresholds.map(
        (n) => new Prisma.Decimal(n.toFixed(2)),
      );
    }
    if (dto.archived !== undefined) data.archived = dto.archived;

    const updated = await this.prisma.budget.update({
      where: { id },
      data,
      include: { category: true },
    });

    return this.hydrate(userId, updated, new Date());
  }

  // ---------------------------------------------------------------------------
  // DELETE — soft delete

  async remove(userId: string, id: string): Promise<void> {
    await this.requireOwned(userId, id);
    await this.prisma.budget.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // helpers

  private async requireOwned(userId: string, id: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!budget || budget.deletedAt)
      throw new NotFoundException('Budget not found');
    if (budget.userId !== userId)
      throw new ForbiddenException('Not your budget');
    return budget;
  }

  /**
   * Hydrate a raw Budget row into the wire shape, including the live actuals
   * for the current period.
   */
  private async hydrate(
    userId: string,
    raw: Prisma.BudgetGetPayload<{ include: { category: true } }>,
    now: Date,
  ): Promise<Budget> {
    const periodRange = currentPeriodRange(raw.period, raw.startDate, now);
    const spent = await this.aggregateSpent(
      userId,
      raw.categoryId,
      periodRange.start,
      periodRange.end,
      raw.currency,
    );
    const budgetedAmount = new Decimal(raw.amount.toString());
    const remaining = budgetedAmount.minus(spent);
    const utilization = budgetedAmount.isZero()
      ? 0
      : spent.dividedBy(budgetedAmount).toNumber();

    const thresholds = raw.alertThresholds
      .map((d) => parseFloat(d.toString()))
      .sort((a, b) => a - b);

    const state: BudgetState = computeState(utilization, thresholds);

    const currentPeriod: BudgetCurrentPeriod = {
      startDate: periodRange.start.toISOString().slice(0, 10),
      endDate: periodRange.end.toISOString().slice(0, 10),
      spent: { amount: spent.toFixed(4), currency: raw.currency as 'NPR' },
      budgeted: {
        amount: budgetedAmount.toFixed(4),
        currency: raw.currency as 'NPR',
      },
      remaining: {
        amount: remaining.toFixed(4),
        currency: raw.currency as 'NPR',
      },
      utilization,
      state,
    };

    return {
      id: raw.id,
      categoryId: raw.categoryId,
      category: raw.category
        ? {
            id: raw.category.id,
            name: raw.category.name,
            icon: raw.category.icon,
            colorHex: raw.category.colorHex,
            type:
              raw.category.type === 'INCOME'
                ? 'income'
                : raw.category.type === 'EXPENSE'
                  ? 'expense'
                  : 'transfer',
            parentId: raw.category.parentId,
            isSystem: raw.category.isSystem,
            archived: raw.category.archived,
            createdAt: raw.category.createdAt.toISOString(),
          }
        : null,
      period: recurrenceFromDb(raw.period),
      amount: raw.amount.toString(),
      currency: raw.currency as 'NPR',
      startDate: raw.startDate.toISOString().slice(0, 10),
      alertThresholds: thresholds,
      archived: raw.archived,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
      currentPeriod,
    };
  }

  private async aggregateSpent(
    userId: string,
    categoryId: string | null,
    start: Date,
    end: Date,
    currency: string,
  ): Promise<Decimal> {
    const where: Prisma.TransactionWhereInput = {
      userId,
      deletedAt: null,
      type: 'EXPENSE',
      currency,
      date: { gte: start, lte: end },
      // For the "overall" budget, sum all expenses; otherwise filter by category
      ...(categoryId ? { categoryId } : {}),
    };

    const result = await this.prisma.transaction.aggregate({
      where,
      _sum: { amount: true },
    });

    return new Decimal(result._sum.amount?.toString() ?? '0');
  }
}

// =============================================================================
// helpers — pure functions

const RECURRENCE_TO_DB: Record<string, 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'> = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  biweekly: 'BIWEEKLY',
  monthly: 'MONTHLY',
  quarterly: 'QUARTERLY',
  yearly: 'YEARLY',
};

const RECURRENCE_FROM_DB: Record<string, 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'> = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
};

function recurrenceToDb(r: string) {
  return RECURRENCE_TO_DB[r] ?? 'MONTHLY';
}

function recurrenceFromDb(r: string) {
  return RECURRENCE_FROM_DB[r] ?? 'monthly';
}

function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/**
 * Returns the [start, end] date range for the period containing `now`,
 * anchored on the budget's `startDate`. Phase 3 v1 only supports MONTHLY.
 */
function currentPeriodRange(
  period: string,
  _startDate: Date,
  now: Date,
): { start: Date; end: Date } {
  switch (period) {
    case 'MONTHLY':
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      return { start, end };
    }
    // TODO Phase 5: WEEKLY / BIWEEKLY / QUARTERLY / YEARLY
  }
}

function computeState(utilization: number, thresholds: number[]): BudgetState {
  if (utilization >= 1) return 'over';
  // "near_limit" once we cross any threshold below 1.0 (e.g. 0.8)
  const nearThreshold = thresholds.find((t) => t < 1) ?? 0.8;
  if (utilization >= nearThreshold) return 'near_limit';
  return 'on_track';
}
