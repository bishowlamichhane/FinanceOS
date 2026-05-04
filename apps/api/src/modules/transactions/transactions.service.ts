import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { Decimal } from 'decimal.js';
  import { PrismaService } from '../../prisma/prisma.service';
  import { TagsService } from '../tags/tags.service';
  import {
    createTransactionSchema,
    type AccountSummary,
    type Category,
    type CreateTransactionFlatRequest,
    type Transaction,
    type TransactionFilters,
    type TransactionListResponse,
    type UpdateTransactionRequest,
  } from '@finance-os/contracts';
  
  const TYPE_DB_TO_API: Record<string, Transaction['type']> = {
    INCOME: 'income',
    EXPENSE: 'expense',
    TRANSFER: 'transfer',
    INVESTMENT_BUY: 'investment_buy',
    INVESTMENT_SELL: 'investment_sell',
    DIVIDEND: 'dividend',
    LIABILITY_PAYMENT: 'liability_payment',
    ASSET_PURCHASE: 'asset_purchase',
    ADJUSTMENT: 'adjustment',
  };
  
  const TYPE_API_TO_DB: Record<string, string> = {
    income: 'INCOME',
    expense: 'EXPENSE',
    transfer: 'TRANSFER',
    investment_buy: 'INVESTMENT_BUY',
    investment_sell: 'INVESTMENT_SELL',
    dividend: 'DIVIDEND',
    liability_payment: 'LIABILITY_PAYMENT',
    asset_purchase: 'ASSET_PURCHASE',
    adjustment: 'ADJUSTMENT',
  };
  
  const ACCOUNT_TYPE_DB_TO_API: Record<string, string> = {
    CASH: 'cash',
    BANK_SAVINGS: 'bank_savings',
    BANK_CURRENT: 'bank_current',
    FIXED_DEPOSIT: 'fixed_deposit',
    WALLET: 'wallet',
    CREDIT_CARD: 'credit_card',
    LOAN: 'loan',
    INVESTMENT: 'investment',
    OTHER: 'other',
  };
  
  const CATEGORY_TYPE_DB_TO_API: Record<string, Category['type']> = {
    INCOME: 'income',
    EXPENSE: 'expense',
    TRANSFER: 'transfer',
  };
  
  @Injectable()
  export class TransactionsService {
    constructor(
      private readonly prisma: PrismaService,
      private readonly tags: TagsService,
    ) {}
  
    // ===========================================================================
    // LIST
    // ===========================================================================
  
    async list(userId: string, filters: TransactionFilters): Promise<TransactionListResponse> {
      const where: Record<string, unknown> = {
        userId,
        deletedAt: null,
        splitParentId: null,
      };
  
      if (filters.from) where.date = { ...(where.date as object), gte: new Date(filters.from) };
      if (filters.to)
        where.date = { ...(where.date as object), lte: this.endOfDay(new Date(filters.to)) };
      if (filters.type) where.type = TYPE_API_TO_DB[filters.type];
      if (filters.accountId) {
        where.OR = [{ accountId: filters.accountId }, { counterAccountId: filters.accountId }];
      }
      if (filters.categoryId) where.categoryId = filters.categoryId;
      if (filters.search) {
        where.OR = [
          ...((where.OR as unknown[]) ?? []),
          { description: { contains: filters.search, mode: 'insensitive' } },
          { merchant: { contains: filters.search, mode: 'insensitive' } },
          { notes: { contains: filters.search, mode: 'insensitive' } },
        ];
      }
  
      if (filters.cursor) {
        const decoded = this.decodeCursor(filters.cursor);
        if (decoded) {
          where.OR = [
            ...((where.OR as unknown[]) ?? []),
            { date: { lt: decoded.date } },
            {
              date: decoded.date,
              createdAt: { lt: decoded.createdAt },
            },
            {
              date: decoded.date,
              createdAt: decoded.createdAt,
              id: { lt: decoded.id },
            },
          ];
        }
      }
  
      const limit = filters.limit;
      const rows = await this.prisma.transaction.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        include: {
          category: true,
          account: {
            select: { id: true, name: true, type: true, colorHex: true, icon: true },
          },
          counterAccount: {
            select: { id: true, name: true, type: true, colorHex: true, icon: true },
          },
          tags: {
            include: { tag: { select: { name: true } } },
          },
        },
      });
  
      let nextCursor: string | null = null;
      if (rows.length > limit) {
        const nextRow = rows[limit - 1]!;
        nextCursor = this.encodeCursor({
          date: nextRow.date,
          createdAt: nextRow.createdAt,
          id: nextRow.id,
        });
      }
  
      return {
        items: rows.slice(0, limit).map(this.serialize),
        nextCursor,
      };
    }
  
    async findOne(userId: string, id: string): Promise<Transaction> {
      const row = await this.prisma.transaction.findFirst({
        where: { id, userId, deletedAt: null },
        include: {
          category: true,
          account: {
            select: { id: true, name: true, type: true, colorHex: true, icon: true },
          },
          counterAccount: {
            select: { id: true, name: true, type: true, colorHex: true, icon: true },
          },
          tags: {
            include: { tag: { select: { name: true } } },
          },
        },
      });
      if (!row) throw new NotFoundException('Transaction not found');
      return this.serialize(row);
    }
  
    // ===========================================================================
    // CREATE
    // ===========================================================================
  
    async create(userId: string, input: CreateTransactionFlatRequest): Promise<Transaction> {
      // Re-validate via the strict discriminated union to enforce per-type rules.
      const result = createTransactionSchema.safeParse(input);
      if (!result.success) {
        throw new BadRequestException({
          message: 'Invalid transaction payload',
          details: result.error.issues,
        });
      }
      const dto = result.data;
  
      if ('accountId' in dto && dto.accountId) {
        const a = await this.prisma.account.findFirst({
          where: { id: dto.accountId, userId, deletedAt: null },
        });
        if (!a) throw new NotFoundException('Account not found');
      }
      if (dto.type === 'transfer') {
        const dest = await this.prisma.account.findFirst({
          where: { id: dto.counterAccountId, userId, deletedAt: null },
        });
        if (!dest) throw new NotFoundException('Destination account not found');
        if (dto.accountId === dto.counterAccountId) {
          throw new BadRequestException('Source and destination accounts must differ');
        }
      }
      if ('categoryId' in dto && dto.categoryId) {
        const c = await this.prisma.category.findFirst({
          where: { id: dto.categoryId, userId, deletedAt: null },
        });
        if (!c) throw new NotFoundException('Category not found');
      }
  
      const tagIds = dto.tags ? await this.tags.resolveNames(userId, dto.tags) : [];
  
      const id = await this.prisma.$transaction(async (tx) => {
        const created = await tx.transaction.create({
          data: {
            userId,
            date: new Date(dto.date),
            type: TYPE_API_TO_DB[dto.type] as
              | 'INCOME'
              | 'EXPENSE'
              | 'TRANSFER'
              | 'INVESTMENT_BUY'
              | 'INVESTMENT_SELL'
              | 'DIVIDEND'
              | 'LIABILITY_PAYMENT'
              | 'ASSET_PURCHASE'
              | 'ADJUSTMENT',
            amount: new Decimal(dto.amount),
            currency: dto.currency,
            description: dto.description,
            merchant: 'merchant' in dto ? (dto.merchant ?? null) : null,
            notes: dto.notes ?? null,
            accountId: 'accountId' in dto ? (dto.accountId ?? null) : null,
            counterAccountId: dto.type === 'transfer' ? dto.counterAccountId : null,
            categoryId: 'categoryId' in dto ? (dto.categoryId ?? null) : null,
            assetId: 'assetId' in dto ? (dto.assetId ?? null) : null,
            liabilityId: 'liabilityId' in dto ? (dto.liabilityId ?? null) : null,
            attachmentUrl: dto.attachmentUrl ?? null,
          },
        });
  
        if (tagIds.length > 0) {
          await tx.transactionTag.createMany({
            data: tagIds.map((tagId) => ({ transactionId: created.id, tagId })),
            skipDuplicates: true,
          });
        }
  
        return created.id;
      });
  
      return this.findOne(userId, id);
    }
  
    // ===========================================================================
    // UPDATE
    // ===========================================================================
  
    async update(
      userId: string,
      id: string,
      dto: UpdateTransactionRequest,
    ): Promise<Transaction> {
      const existing = await this.prisma.transaction.findFirst({
        where: { id, userId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Transaction not found');
  
      if (existing.recurringId) {
        throw new ForbiddenException(
          'This transaction was created by a recurring schedule. Edit the schedule instead.',
        );
      }
  
      if (dto.accountId && dto.accountId !== existing.accountId) {
        const a = await this.prisma.account.findFirst({
          where: { id: dto.accountId, userId, deletedAt: null },
        });
        if (!a) throw new NotFoundException('Account not found');
      }
      if (dto.categoryId && dto.categoryId !== existing.categoryId) {
        const c = await this.prisma.category.findFirst({
          where: { id: dto.categoryId, userId, deletedAt: null },
        });
        if (!c) throw new NotFoundException('Category not found');
      }
      if (dto.counterAccountId && dto.counterAccountId !== existing.counterAccountId) {
        if (existing.type !== 'TRANSFER') {
          throw new BadRequestException('counterAccountId only valid on transfers');
        }
        const dest = await this.prisma.account.findFirst({
          where: { id: dto.counterAccountId, userId, deletedAt: null },
        });
        if (!dest) throw new NotFoundException('Destination account not found');
      }
  
      const tagIds = dto.tags ? await this.tags.resolveNames(userId, dto.tags) : null;
  
      await this.prisma.$transaction(async (tx) => {
        const data: Record<string, unknown> = {};
        if (dto.date !== undefined) data.date = new Date(dto.date);
        if (dto.amount !== undefined) data.amount = new Decimal(dto.amount);
        if (dto.description !== undefined) data.description = dto.description;
        if (dto.merchant !== undefined) data.merchant = dto.merchant;
        if (dto.notes !== undefined) data.notes = dto.notes;
        if (dto.accountId !== undefined) data.accountId = dto.accountId;
        if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
        if (dto.counterAccountId !== undefined) data.counterAccountId = dto.counterAccountId;
        if (dto.attachmentUrl !== undefined) data.attachmentUrl = dto.attachmentUrl;
  
        await tx.transaction.update({ where: { id }, data });
  
        if (tagIds !== null) {
          await tx.transactionTag.deleteMany({ where: { transactionId: id } });
          if (tagIds.length > 0) {
            await tx.transactionTag.createMany({
              data: tagIds.map((tagId) => ({ transactionId: id, tagId })),
              skipDuplicates: true,
            });
          }
        }
      });
  
      return this.findOne(userId, id);
    }
  
    // ===========================================================================
    // DELETE (soft)
    // ===========================================================================
  
    async remove(userId: string, id: string): Promise<void> {
      const existing = await this.prisma.transaction.findFirst({
        where: { id, userId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Transaction not found');
  
      if (existing.recurringId) {
        throw new ForbiddenException(
          'This transaction was created by a recurring schedule. Delete the schedule to remove all linked entries.',
        );
      }
  
      await this.prisma.transaction.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }
  
    // ===========================================================================
    // SERIALIZE / HELPERS
    // ===========================================================================
  
    private serialize = (row: {
      id: string;
      date: Date;
      type: string;
      amount: { toString(): string };
      currency: string;
      description: string;
      merchant: string | null;
      notes: string | null;
      accountId: string | null;
      counterAccountId: string | null;
      categoryId: string | null;
      recurringId: string | null;
      assetId: string | null;
      liabilityId: string | null;
      stockHoldingId: string | null;
      attachmentUrl: string | null;
      isSplit: boolean;
      splitParentId: string | null;
      createdAt: Date;
      updatedAt: Date;
      category?: {
        id: string;
        name: string;
        icon: string;
        colorHex: string;
        type: string;
        parentId: string | null;
        isSystem: boolean;
        archived: boolean;
        createdAt: Date;
      } | null;
      account?: {
        id: string;
        name: string;
        type: string;
        colorHex: string | null;
        icon: string;
      } | null;
      counterAccount?: {
        id: string;
        name: string;
        type: string;
        colorHex: string | null;
        icon: string;
      } | null;
      tags?: Array<{ tag: { name: string } }>;
    }): Transaction => ({
      id: row.id,
      date: row.date.toISOString().slice(0, 10),
      type: TYPE_DB_TO_API[row.type] ?? 'expense',
      amount: row.amount.toString(),
      currency: row.currency as Transaction['currency'],
      description: row.description,
      merchant: row.merchant,
      notes: row.notes,
      accountId: row.accountId,
      counterAccountId: row.counterAccountId,
      categoryId: row.categoryId,
      recurringId: row.recurringId,
      assetId: row.assetId,
      liabilityId: row.liabilityId,
      stockHoldingId: row.stockHoldingId,
      attachmentUrl: row.attachmentUrl,
      isSplit: row.isSplit,
      splitParentId: row.splitParentId,
      tags: row.tags?.map((t) => t.tag.name) ?? [],
      category: row.category
        ? {
            id: row.category.id,
            name: row.category.name,
            icon: row.category.icon,
            colorHex: row.category.colorHex,
            type: CATEGORY_TYPE_DB_TO_API[row.category.type] ?? 'expense',
            parentId: row.category.parentId,
            isSystem: row.category.isSystem,
            archived: row.category.archived,
            createdAt: row.category.createdAt.toISOString(),
          }
        : null,
      account: row.account ? this.serializeAccountSummary(row.account) : null,
      counterAccount: row.counterAccount ? this.serializeAccountSummary(row.counterAccount) : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  
    private serializeAccountSummary(a: {
      id: string;
      name: string;
      type: string;
      colorHex: string | null;
      icon: string;
    }): AccountSummary {
      return {
        id: a.id,
        name: a.name,
        type: ACCOUNT_TYPE_DB_TO_API[a.type] ?? 'other',
        colorHex: a.colorHex,
        icon: a.icon,
      };
    }
  
    private encodeCursor(c: { date: Date; createdAt: Date; id: string }): string {
      const payload = `${c.date.toISOString()}|${c.createdAt.toISOString()}|${c.id}`;
      return Buffer.from(payload, 'utf8').toString('base64url');
    }
  
    private decodeCursor(
      raw: string,
    ): { date: Date; createdAt: Date; id: string } | null {
      try {
        const decoded = Buffer.from(raw, 'base64url').toString('utf8');
        const [dateStr, createdAtStr, id] = decoded.split('|');
        if (!dateStr || !createdAtStr || !id) return null;
        const date = new Date(dateStr);
        const createdAt = new Date(createdAtStr);
        if (isNaN(date.getTime()) || isNaN(createdAt.getTime())) return null;
        return { date, createdAt, id };
      } catch {
        return null;
      }
    }
  
    private endOfDay(d: Date): Date {
      const next = new Date(d);
      next.setHours(23, 59, 59, 999);
      return next;
    }
  }