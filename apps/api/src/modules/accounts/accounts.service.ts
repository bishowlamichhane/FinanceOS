import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { Decimal } from 'decimal.js';
  import { PrismaService } from '../../prisma/prisma.service';
  import type {
    Account,
    AccountsListResponse,
    CreateAccountRequest,
    TransferRequest,
    UpdateAccountRequest,
  } from '@finance-os/contracts';
  
  /**
   * Accounts service.
   *
   * Balance computation:
   *   currentBalance = openingBalance
   *                  + sum(income, transfer_in, dividend, investment_sell)
   *                  - sum(expense, transfer_out, investment_buy, liability_payment, asset_purchase)
   *                  + sum(adjustment)  (signed; positive adds, negative subtracts)
   *
   * The aggregations happen in Postgres via Prisma's groupBy — never in app
   * memory. This keeps the API responsive even with thousands of transactions.
   */
  
  const TYPE_DB_TO_API: Record<string, string> = {
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
  
  const TYPE_API_TO_DB: Record<string, string> = {
    cash: 'CASH',
    bank_savings: 'BANK_SAVINGS',
    bank_current: 'BANK_CURRENT',
    fixed_deposit: 'FIXED_DEPOSIT',
    wallet: 'WALLET',
    credit_card: 'CREDIT_CARD',
    loan: 'LOAN',
    investment: 'INVESTMENT',
    other: 'OTHER',
  };
  
  @Injectable()
  export class AccountsService {
    constructor(private readonly prisma: PrismaService) {}
  
    // ===========================================================================
    // LIST
    // ===========================================================================
  
    async list(userId: string, includeArchived = false): Promise<AccountsListResponse> {
      const accounts = await this.prisma.account.findMany({
        where: {
          userId,
          deletedAt: null,
          ...(includeArchived ? {} : { archived: false }),
        },
        orderBy: [{ archived: 'asc' }, { createdAt: 'asc' }],
      });
  
      if (accounts.length === 0) {
        return {
          accounts: [],
          totals: this.zeroTotals(),
        };
      }
  
      const balances = await this.computeBalances(
        userId,
        accounts.map((a) => a.id),
      );
  
      const serialized = accounts.map((a) =>
        this.serialize(a, balances.get(a.id) ?? new Decimal(a.openingBalance.toString())),
      );
  
      const totals = this.aggregateTotals(serialized);
  
      return { accounts: serialized, totals };
    }
  
    async findOne(userId: string, id: string): Promise<Account> {
      const account = await this.prisma.account.findFirst({
        where: { id, userId, deletedAt: null },
      });
      if (!account) throw new NotFoundException('Account not found');
  
      const balances = await this.computeBalances(userId, [id]);
      return this.serialize(account, balances.get(id) ?? new Decimal(account.openingBalance.toString()));
    }
  
    // ===========================================================================
    // CREATE / UPDATE / DELETE
    // ===========================================================================
  
    async create(userId: string, dto: CreateAccountRequest): Promise<Account> {
      const account = await this.prisma.account.create({
        data: {
          userId,
          name: dto.name,
          type: TYPE_API_TO_DB[dto.type] as
            | 'CASH'
            | 'BANK_SAVINGS'
            | 'BANK_CURRENT'
            | 'FIXED_DEPOSIT'
            | 'WALLET'
            | 'CREDIT_CARD'
            | 'LOAN'
            | 'INVESTMENT'
            | 'OTHER',
          bankName: dto.bankName ?? null,
          accountNumberLast4: dto.accountNumberLast4 ?? null,
          currency: dto.currency,
          openingBalance: new Decimal(dto.openingBalance),
          holdBalance: new Decimal(dto.holdBalance ?? '0'),
          colorHex: dto.colorHex ?? null,
          icon: dto.icon,
          notes: dto.notes ?? null,
        },
      });
  
      return this.serialize(account, new Decimal(account.openingBalance.toString()));
    }
  
    async update(userId: string, id: string, dto: UpdateAccountRequest): Promise<Account> {
      const existing = await this.prisma.account.findFirst({
        where: { id, userId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Account not found');
  
      const data: Record<string, unknown> = {};
      if (dto.name !== undefined) data.name = dto.name;
      if (dto.type !== undefined) data.type = TYPE_API_TO_DB[dto.type];
      if (dto.bankName !== undefined) data.bankName = dto.bankName ?? null;
      if (dto.accountNumberLast4 !== undefined)
        data.accountNumberLast4 = dto.accountNumberLast4 ?? null;
      if (dto.currency !== undefined) data.currency = dto.currency;
      if (dto.openingBalance !== undefined) data.openingBalance = new Decimal(dto.openingBalance);
      if (dto.holdBalance !== undefined) data.holdBalance = new Decimal(dto.holdBalance);
      if (dto.colorHex !== undefined) data.colorHex = dto.colorHex ?? null;
      if (dto.icon !== undefined) data.icon = dto.icon;
      if (dto.notes !== undefined) data.notes = dto.notes ?? null;
      if (dto.archived !== undefined) data.archived = dto.archived;
  
      const updated = await this.prisma.account.update({ where: { id }, data });
      const balances = await this.computeBalances(userId, [id]);
      return this.serialize(updated, balances.get(id) ?? new Decimal(updated.openingBalance.toString()));
    }
  
    async remove(userId: string, id: string): Promise<void> {
      const existing = await this.prisma.account.findFirst({
        where: { id, userId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Account not found');
  
      const txCount = await this.prisma.transaction.count({
        where: {
          userId,
          deletedAt: null,
          OR: [{ accountId: id }, { counterAccountId: id }],
        },
      });
      if (txCount > 0) {
        throw new BadRequestException(
          `This account has ${txCount} transaction${txCount === 1 ? '' : 's'}. Archive it instead, or delete its transactions first.`,
        );
      }
  
      await this.prisma.account.update({
        where: { id },
        data: { deletedAt: new Date(), archived: true },
      });
    }
  
    // ===========================================================================
    // TRANSFER (atomic)
    // ===========================================================================
  
    async transfer(userId: string, dto: TransferRequest): Promise<{ id: string }> {
      if (dto.fromAccountId === dto.toAccountId) {
        throw new BadRequestException('Source and destination accounts must differ');
      }
  
      const accounts = await this.prisma.account.findMany({
        where: {
          userId,
          id: { in: [dto.fromAccountId, dto.toAccountId] },
          deletedAt: null,
        },
      });
      if (accounts.length !== 2) {
        throw new NotFoundException('One or both accounts not found');
      }
  
      const fromAcct = accounts.find((a) => a.id === dto.fromAccountId)!;
      const toAcct = accounts.find((a) => a.id === dto.toAccountId)!;
      if (fromAcct.currency !== toAcct.currency) {
        throw new BadRequestException(
          `Cannot transfer between accounts in different currencies (${fromAcct.currency} → ${toAcct.currency}). Multi-currency support coming later.`,
        );
      }
      if (fromAcct.currency !== dto.currency) {
        throw new BadRequestException(
          `Transfer currency ${dto.currency} doesn't match account currency ${fromAcct.currency}`,
        );
      }
  
      const tx = await this.prisma.transaction.create({
        data: {
          userId,
          date: new Date(dto.date),
          type: 'TRANSFER',
          amount: new Decimal(dto.amount),
          currency: dto.currency,
          description: dto.description,
          notes: dto.notes ?? null,
          accountId: dto.fromAccountId,
          counterAccountId: dto.toAccountId,
        },
        select: { id: true },
      });
  
      return { id: tx.id };
    }
  
    // ===========================================================================
    // BALANCE COMPUTATION
    // ===========================================================================
  
    /**
     * Returns a Map of accountId → currentBalance Decimal.
     * Computes via SQL aggregations — fast even with 100K+ transactions.
     */
    async computeBalances(userId: string, accountIds: string[]): Promise<Map<string, Decimal>> {
      const result = new Map<string, Decimal>();
      if (accountIds.length === 0) return result;
  
      const accounts = await this.prisma.account.findMany({
        where: { id: { in: accountIds }, userId, deletedAt: null },
        select: { id: true, openingBalance: true },
      });
  
      for (const a of accounts) {
        result.set(a.id, new Decimal(a.openingBalance.toString()));
      }
  
      const aggs = await this.prisma.transaction.groupBy({
        by: ['accountId', 'type'],
        where: {
          userId,
          accountId: { in: accountIds },
          deletedAt: null,
        },
        _sum: { amount: true },
      });
  
      for (const row of aggs) {
        if (!row.accountId || !row._sum.amount) continue;
        const amt = new Decimal(row._sum.amount.toString());
        const current = result.get(row.accountId) ?? new Decimal(0);
        switch (row.type) {
          case 'INCOME':
          case 'DIVIDEND':
          case 'INVESTMENT_SELL':
            result.set(row.accountId, current.plus(amt));
            break;
          case 'EXPENSE':
          case 'INVESTMENT_BUY':
          case 'LIABILITY_PAYMENT':
          case 'ASSET_PURCHASE':
            result.set(row.accountId, current.minus(amt));
            break;
          case 'TRANSFER':
            result.set(row.accountId, current.minus(amt));
            break;
          case 'ADJUSTMENT':
            result.set(row.accountId, current.plus(amt));
            break;
        }
      }
  
      // Add transfer-in (transactions where these accounts are the destination)
      const transferIns = await this.prisma.transaction.groupBy({
        by: ['counterAccountId'],
        where: {
          userId,
          type: 'TRANSFER',
          counterAccountId: { in: accountIds },
          deletedAt: null,
        },
        _sum: { amount: true },
      });
      for (const row of transferIns) {
        if (!row.counterAccountId || !row._sum.amount) continue;
        const amt = new Decimal(row._sum.amount.toString());
        const current = result.get(row.counterAccountId) ?? new Decimal(0);
        result.set(row.counterAccountId, current.plus(amt));
      }
  
      return result;
    }
  
    // ===========================================================================
    // HELPERS
    // ===========================================================================
  
    private serialize(
      row: {
        id: string;
        name: string;
        type: string;
        bankName: string | null;
        accountNumberLast4: string | null;
        currency: string;
        openingBalance: { toString(): string };
        holdBalance: { toString(): string };
        colorHex: string | null;
        icon: string;
        notes: string | null;
        archived: boolean;
        createdAt: Date;
      },
      currentBalance: Decimal,
    ): Account {
      return {
        id: row.id,
        name: row.name,
        type: TYPE_DB_TO_API[row.type] as Account['type'],
        bankName: row.bankName,
        accountNumberLast4: row.accountNumberLast4,
        currency: row.currency as Account['currency'],
        openingBalance: row.openingBalance.toString(),
        holdBalance: row.holdBalance.toString(),
        currentBalance: currentBalance.toFixed(4),
        colorHex: row.colorHex,
        icon: row.icon,
        notes: row.notes,
        archived: row.archived,
        createdAt: row.createdAt.toISOString(),
      };
    }
  
    private zeroTotals(): AccountsListResponse['totals'] {
      return {
        cash: '0',
        bank: '0',
        wallet: '0',
        investment: '0',
        creditCard: '0',
        loan: '0',
        other: '0',
        net: '0',
      };
    }
  
    private aggregateTotals(accounts: Account[]): AccountsListResponse['totals'] {
      let cash = new Decimal(0);
      let bank = new Decimal(0);
      let wallet = new Decimal(0);
      let investment = new Decimal(0);
      let creditCard = new Decimal(0);
      let loan = new Decimal(0);
      let other = new Decimal(0);
  
      for (const a of accounts) {
        if (a.currency !== 'NPR' || a.archived) continue;
        const bal = new Decimal(a.currentBalance);
        switch (a.type) {
          case 'cash':
            cash = cash.plus(bal);
            break;
          case 'bank_savings':
          case 'bank_current':
          case 'fixed_deposit':
            bank = bank.plus(bal);
            break;
          case 'wallet':
            wallet = wallet.plus(bal);
            break;
          case 'investment':
            investment = investment.plus(bal);
            break;
          case 'credit_card':
            creditCard = creditCard.plus(bal);
            break;
          case 'loan':
            loan = loan.plus(bal);
            break;
          default:
            other = other.plus(bal);
        }
      }
  
      const net = cash.plus(bank).plus(wallet).plus(investment).plus(other).minus(creditCard).minus(loan);
  
      return {
        cash: cash.toFixed(4),
        bank: bank.toFixed(4),
        wallet: wallet.toFixed(4),
        investment: investment.toFixed(4),
        creditCard: creditCard.toFixed(4),
        loan: loan.toFixed(4),
        other: other.toFixed(4),
        net: net.toFixed(4),
      };
    }
  }