import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Tag, CreateTagRequest } from '@finance-os/contracts';

/**
 * Tags.
 *
 * Lightweight — just a name + color, scoped per user. Created on demand from
 * the transaction form (typed name → look up or create).
 */

const DEFAULT_TAG_COLOR = '#94A3B8';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<Tag[]> {
    const rows = await this.prisma.tag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    return rows.map(this.serialize);
  }

  async findOrCreate(userId: string, name: string): Promise<Tag> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Tag name is required');

    const existing = await this.prisma.tag.findFirst({
      where: { userId, name: trimmed },
    });
    if (existing) return this.serialize(existing);

    const row = await this.prisma.tag.create({
      data: { userId, name: trimmed, colorHex: DEFAULT_TAG_COLOR },
    });
    return this.serialize(row);
  }

  async create(userId: string, dto: CreateTagRequest): Promise<Tag> {
    return this.findOrCreate(userId, dto.name);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.tag.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Tag not found');
    await this.prisma.tag.delete({ where: { id } });
  }

  /**
   * Resolve an array of tag names to tag IDs, creating any missing ones.
   * Used by the transactions service when saving a new transaction.
   */
  async resolveNames(userId: string, names: string[]): Promise<string[]> {
    if (names.length === 0) return [];
    const unique = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
    const ids: string[] = [];
    for (const name of unique) {
      const tag = await this.findOrCreate(userId, name);
      ids.push(tag.id);
    }
    return ids;
  }

  private serialize = (row: {
    id: string;
    name: string;
    colorHex: string;
    createdAt: Date;
  }): Tag => ({
    id: row.id,
    name: row.name,
    colorHex: row.colorHex,
    createdAt: row.createdAt.toISOString(),
  });
}