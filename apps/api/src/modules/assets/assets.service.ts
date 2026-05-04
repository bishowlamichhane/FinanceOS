import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { Prisma } from '../../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  Asset,
  AssetChange,
  AssetType as ContractAssetType,
  AssetValueHistoryResponse,
  AssetValueSnapshot,
  AssetsListResponse,
  CreateAssetRequest,
  RecordAssetValueRequest,
  UpdateAssetRequest,
} from '@finance-os/contracts';

/**
 * Assets service.
 *
 * An Asset has a denormalized `currentValue` plus a chain of
 * `AssetValueSnapshot` rows. `currentValue` is always derived from the
 * most-recent snapshot — `recordValue()` is the canonical write path.
 *
 * On create, we always write an initial snapshot so the value history is
 * never empty. The `change` block hydrated on every read uses a 30-day
 * lookback (or earliest known snapshot if the asset is younger).
 */

const LOOKBACK_DAYS = 30;

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // LIST

  async list(
    userId: string,
    includeArchived = false,
  ): Promise<AssetsListResponse> {
    const rows = await this.prisma.asset.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(includeArchived ? {} : { archived: false }),
      },
      orderBy: [{ archived: 'asc' }, { createdAt: 'desc' }],
    });

    const items: Asset[] = await Promise.all(
      rows.map((row) => this.hydrate(row)),
    );

    let totalValue = new Decimal(0);
    let totalCost = new Decimal(0);
    let count = 0;
    for (const item of items) {
      if (item.archived) continue;
      if (item.currency !== 'NPR') continue;
      totalValue = totalValue.plus(item.currentValue);
      if (item.acquiredCost) totalCost = totalCost.plus(item.acquiredCost);
      count += 1;
    }
    const totalGain = totalValue.minus(totalCost);
    const gainPercent = totalCost.isZero()
      ? 0
      : totalGain.dividedBy(totalCost).toNumber();

    return {
      items,
      totals: {
        totalValue: { amount: totalValue.toFixed(4), currency: 'NPR' },
        totalCost: { amount: totalCost.toFixed(4), currency: 'NPR' },
        totalGain: { amount: totalGain.toFixed(4), currency: 'NPR' },
        gainPercent,
        count,
      },
    };
  }

  async findOne(userId: string, id: string): Promise<Asset> {
    const row = await this.requireOwned(userId, id);
    return this.hydrate(row);
  }

  // ---------------------------------------------------------------------------
  // CREATE

  async create(userId: string, dto: CreateAssetRequest): Promise<Asset> {
    if (dto.linkedAccountId) {
      const acct = await this.prisma.account.findFirst({
        where: { id: dto.linkedAccountId, userId, deletedAt: null },
      });
      if (!acct) throw new NotFoundException('Linked account not found');
    }

    const today = startOfDay(new Date());

    const created = await this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          userId,
          name: dto.name,
          type: assetTypeToDb(dto.type),
          currentValue: new Prisma.Decimal(dto.currentValue),
          currency: dto.currency ?? 'NPR',
          acquiredAt: dto.acquiredAt ? new Date(dto.acquiredAt) : null,
          acquiredCost:
            dto.acquiredCost !== undefined && dto.acquiredCost !== null
              ? new Prisma.Decimal(dto.acquiredCost)
              : null,
          notes: dto.notes ?? null,
          linkedAccountId: dto.linkedAccountId ?? null,
        },
      });

      await tx.assetValueSnapshot.create({
        data: {
          assetId: asset.id,
          date: today,
          value: new Prisma.Decimal(dto.currentValue),
          source: 'manual',
          notes: 'Initial valuation',
        },
      });

      return asset;
    });

    return this.hydrate(created);
  }

  // ---------------------------------------------------------------------------
  // UPDATE — name, type, acquired data, notes, link, archived

  async update(
    userId: string,
    id: string,
    dto: UpdateAssetRequest,
  ): Promise<Asset> {
    await this.requireOwned(userId, id);

    if (dto.linkedAccountId) {
      const acct = await this.prisma.account.findFirst({
        where: { id: dto.linkedAccountId, userId, deletedAt: null },
      });
      if (!acct) throw new NotFoundException('Linked account not found');
    }

    const data: Prisma.AssetUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = assetTypeToDb(dto.type);
    if (dto.acquiredAt !== undefined) {
      data.acquiredAt = dto.acquiredAt ? new Date(dto.acquiredAt) : null;
    }
    if (dto.acquiredCost !== undefined) {
      data.acquiredCost = dto.acquiredCost
        ? new Prisma.Decimal(dto.acquiredCost)
        : null;
    }
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.linkedAccountId !== undefined) {
      data.linkedAccountId = dto.linkedAccountId ?? null;
    }
    if (dto.archived !== undefined) data.archived = dto.archived;

    const updated = await this.prisma.asset.update({
      where: { id },
      data,
    });
    return this.hydrate(updated);
  }

  // ---------------------------------------------------------------------------
  // DELETE — soft delete

  async remove(userId: string, id: string): Promise<void> {
    await this.requireOwned(userId, id);
    await this.prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // RECORD VALUE — upsert a snapshot for the given date, then recompute
  // `currentValue` from the latest snapshot.

  async recordValue(
    userId: string,
    id: string,
    dto: RecordAssetValueRequest,
  ): Promise<Asset> {
    await this.requireOwned(userId, id);

    const date = dto.date ? new Date(dto.date) : startOfDay(new Date());

    await this.prisma.$transaction(async (tx) => {
      await tx.assetValueSnapshot.upsert({
        where: { assetId_date: { assetId: id, date } },
        create: {
          assetId: id,
          date,
          value: new Prisma.Decimal(dto.value),
          source: 'manual',
          notes: dto.notes ?? null,
        },
        update: {
          value: new Prisma.Decimal(dto.value),
          source: 'manual',
          notes: dto.notes ?? null,
        },
      });

      // Recompute currentValue from the latest snapshot
      const latest = await tx.assetValueSnapshot.findFirst({
        where: { assetId: id },
        orderBy: { date: 'desc' },
      });
      if (latest) {
        await tx.asset.update({
          where: { id },
          data: { currentValue: latest.value },
        });
      }
    });

    const fresh = await this.prisma.asset.findUnique({ where: { id } });
    if (!fresh) throw new NotFoundException('Asset not found');
    return this.hydrate(fresh);
  }

  // ---------------------------------------------------------------------------
  // VALUE HISTORY

  async valueHistory(
    userId: string,
    id: string,
  ): Promise<AssetValueHistoryResponse> {
    await this.requireOwned(userId, id);
    const snapshots = await this.prisma.assetValueSnapshot.findMany({
      where: { assetId: id },
      orderBy: { date: 'desc' },
    });
    return {
      assetId: id,
      items: snapshots.map((s) => this.serializeSnapshot(s)),
    };
  }

  // ---------------------------------------------------------------------------
  // helpers

  private async requireOwned(userId: string, id: string) {
    const row = await this.prisma.asset.findUnique({ where: { id } });
    if (!row || row.deletedAt) throw new NotFoundException('Asset not found');
    if (row.userId !== userId)
      throw new ForbiddenException('Not your asset');
    return row;
  }

  private async hydrate(
    row: Prisma.AssetGetPayload<Record<string, never>>,
  ): Promise<Asset> {
    const change = await this.computeChange(row.id, row.currentValue);

    return {
      id: row.id,
      name: row.name,
      type: assetTypeFromDb(row.type),
      currentValue: row.currentValue.toString(),
      currency: row.currency as 'NPR',
      acquiredAt: row.acquiredAt
        ? row.acquiredAt.toISOString().slice(0, 10)
        : null,
      acquiredCost: row.acquiredCost ? row.acquiredCost.toString() : null,
      notes: row.notes,
      linkedAccountId: row.linkedAccountId,
      archived: row.archived,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      change,
    };
  }

  private async computeChange(
    assetId: string,
    currentValue: Prisma.Decimal,
  ): Promise<AssetChange> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);
    cutoff.setHours(0, 0, 0, 0);

    // Most recent snapshot at or before the cutoff
    let benchmark = await this.prisma.assetValueSnapshot.findFirst({
      where: { assetId, date: { lte: cutoff } },
      orderBy: { date: 'desc' },
    });

    // If asset is younger than the lookback, fall back to the earliest snapshot
    // strictly before today so we always show *some* trend if available.
    if (!benchmark) {
      const today = startOfDay(new Date());
      benchmark = await this.prisma.assetValueSnapshot.findFirst({
        where: { assetId, date: { lt: today } },
        orderBy: { date: 'asc' },
      });
    }

    if (!benchmark) {
      return {
        previousValue: null,
        delta: null,
        deltaPercent: null,
        direction: 'flat',
      };
    }

    const prev = new Decimal(benchmark.value.toString());
    const curr = new Decimal(currentValue.toString());
    const delta = curr.minus(prev);
    const deltaPercent = prev.isZero() ? null : delta.dividedBy(prev).toNumber();
    const direction: AssetChange['direction'] = delta.isZero()
      ? 'flat'
      : delta.isPositive()
        ? 'up'
        : 'down';

    return {
      previousValue: prev.toFixed(4),
      delta: delta.toFixed(4),
      deltaPercent,
      direction,
    };
  }

  private serializeSnapshot(
    s: Prisma.AssetValueSnapshotGetPayload<Record<string, never>>,
  ): AssetValueSnapshot {
    const source: AssetValueSnapshot['source'] =
      s.source === 'import' || s.source === 'computed' ? s.source : 'manual';
    return {
      id: s.id,
      assetId: s.assetId,
      date: s.date.toISOString().slice(0, 10),
      value: s.value.toString(),
      source,
      notes: s.notes,
      createdAt: s.createdAt.toISOString(),
    };
  }
}

// =============================================================================
// helpers — pure functions

const TYPE_TO_DB: Record<ContractAssetType, string> = {
  cash: 'CASH',
  bank_balance: 'BANK_BALANCE',
  stock_portfolio: 'STOCK_PORTFOLIO',
  fixed_deposit: 'FIXED_DEPOSIT',
  gold: 'GOLD',
  vehicle: 'VEHICLE',
  property: 'PROPERTY',
  electronics: 'ELECTRONICS',
  crypto: 'CRYPTO',
  other: 'OTHER',
};

const TYPE_FROM_DB: Record<string, ContractAssetType> = {
  CASH: 'cash',
  BANK_BALANCE: 'bank_balance',
  STOCK_PORTFOLIO: 'stock_portfolio',
  FIXED_DEPOSIT: 'fixed_deposit',
  GOLD: 'gold',
  VEHICLE: 'vehicle',
  PROPERTY: 'property',
  ELECTRONICS: 'electronics',
  CRYPTO: 'crypto',
  OTHER: 'other',
};

function assetTypeToDb(t: ContractAssetType) {
  return TYPE_TO_DB[t] as
    | 'CASH'
    | 'BANK_BALANCE'
    | 'STOCK_PORTFOLIO'
    | 'FIXED_DEPOSIT'
    | 'GOLD'
    | 'VEHICLE'
    | 'PROPERTY'
    | 'ELECTRONICS'
    | 'CRYPTO'
    | 'OTHER';
}

function assetTypeFromDb(t: string): ContractAssetType {
  return TYPE_FROM_DB[t] ?? 'other';
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
