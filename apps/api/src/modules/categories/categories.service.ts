import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { PrismaService } from '../../prisma/prisma.service';
  import type {
    Category,
    CategoryFilters,
    CreateCategoryRequest,
    UpdateCategoryRequest,
  } from '@finance-os/contracts';
  
  /**
   * Categories.
   *
   * - Each user has their own categories (no global table)
   * - System-seeded ones (Salary, Food, etc.) are flagged isSystem=true and
   *   cannot be deleted, only archived
   * - Hierarchy supported via parentId, but Phase 2 only surfaces flat lists
   *   in the UI; nested categories ship in Phase 5
   */
  
  const TYPE_DB_TO_API: Record<string, 'income' | 'expense' | 'transfer'> = {
    INCOME: 'income',
    EXPENSE: 'expense',
    TRANSFER: 'transfer',
  };
  
  const TYPE_API_TO_DB: Record<string, 'INCOME' | 'EXPENSE' | 'TRANSFER'> = {
    income: 'INCOME',
    expense: 'EXPENSE',
    transfer: 'TRANSFER',
  };
  
  @Injectable()
  export class CategoriesService {
    constructor(private readonly prisma: PrismaService) {}
  
    async list(userId: string, filters: CategoryFilters): Promise<Category[]> {
      const where: Record<string, unknown> = { userId, deletedAt: null };
      if (!filters.includeArchived) where.archived = false;
      if (filters.type) where.type = TYPE_API_TO_DB[filters.type];
  
      const rows = await this.prisma.category.findMany({
        where,
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      });
  
      return rows.map(this.serialize);
    }
  
    async findOne(userId: string, id: string): Promise<Category> {
      const row = await this.prisma.category.findFirst({
        where: { id, userId, deletedAt: null },
      });
      if (!row) throw new NotFoundException('Category not found');
      return this.serialize(row);
    }
  
    async create(userId: string, dto: CreateCategoryRequest): Promise<Category> {
      // Defensive: prevent users from creating duplicates of an existing name
      // within the same parent. Schema has a unique constraint, but we want a
      // friendly error rather than a 500 from a DB constraint violation.
      const existing = await this.prisma.category.findFirst({
        where: {
          userId,
          name: dto.name,
          parentId: dto.parentId ?? null,
          deletedAt: null,
        },
      });
      if (existing) {
        throw new BadRequestException(`A category named "${dto.name}" already exists`);
      }
  
      if (dto.parentId) {
        const parent = await this.prisma.category.findFirst({
          where: { id: dto.parentId, userId, deletedAt: null },
        });
        if (!parent) throw new NotFoundException('Parent category not found');
      }
  
      const row = await this.prisma.category.create({
        data: {
          userId,
          name: dto.name,
          icon: dto.icon,
          colorHex: dto.colorHex,
          type: TYPE_API_TO_DB[dto.type] as 'INCOME' | 'EXPENSE' | 'TRANSFER',
          parentId: dto.parentId ?? null,
          isSystem: false,
        },
      });
  
      return this.serialize(row);
    }
  
    async update(userId: string, id: string, dto: UpdateCategoryRequest): Promise<Category> {
      const existing = await this.prisma.category.findFirst({
        where: { id, userId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Category not found');
  
      // System categories: only `archived` is mutable. Renaming or recoloring
      // would break the seeded experience for users who switch devices/restore.
      if (existing.isSystem) {
        const allowedKeys = new Set(['archived']);
        const offendingKeys = Object.keys(dto).filter((k) => !allowedKeys.has(k));
        if (offendingKeys.length > 0) {
          throw new ForbiddenException(
            `System categories cannot be edited (${offendingKeys.join(', ')}). You can hide it instead.`,
          );
        }
      }
  
      const data: Record<string, unknown> = {};
      if (dto.name !== undefined) data.name = dto.name;
      if (dto.icon !== undefined) data.icon = dto.icon;
      if (dto.colorHex !== undefined) data.colorHex = dto.colorHex;
      if (dto.type !== undefined) data.type = TYPE_API_TO_DB[dto.type];
      if (dto.parentId !== undefined) data.parentId = dto.parentId;
      if (dto.archived !== undefined) data.archived = dto.archived;
  
      const row = await this.prisma.category.update({ where: { id }, data });
      return this.serialize(row);
    }
  
    async remove(userId: string, id: string): Promise<void> {
      const existing = await this.prisma.category.findFirst({
        where: { id, userId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Category not found');
  
      if (existing.isSystem) {
        throw new ForbiddenException('System categories cannot be deleted. Archive it instead.');
      }
  
      // Soft delete
      await this.prisma.category.update({
        where: { id },
        data: { deletedAt: new Date(), archived: true },
      });
    }
  
    // ---------------------------------------------------------------------------
  
    private serialize = (row: {
      id: string;
      name: string;
      icon: string;
      colorHex: string;
      type: string;
      parentId: string | null;
      isSystem: boolean;
      archived: boolean;
      createdAt: Date;
    }): Category => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      colorHex: row.colorHex,
      type: TYPE_DB_TO_API[row.type] ?? 'expense',
      parentId: row.parentId,
      isSystem: row.isSystem,
      archived: row.archived,
      createdAt: row.createdAt.toISOString(),
    });
  }