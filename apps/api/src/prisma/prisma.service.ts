import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../prisma/generated/client';
import { AppConfig } from '../config/app.config';

/**
 * Prisma service.
 *
 * Single PrismaClient instance for the whole app. Logs slow queries.
 * Wires graceful shutdown so connections drain on SIGTERM.
 *
 * Audit logging: implemented via $extends. We only log mutations on tables
 * that hold financial data — auth/session noise is excluded.
 */

const AUDITED_MODELS = new Set([
  'Account',
  'Transaction',
  'RecurringTransaction',
  'Budget',
  'Asset',
  'AssetValueSnapshot',
  'Liability',
  'LiabilityPayment',
  'StockHolding',
  'StockTransaction',
  'ImportJob',
]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly config: AppConfig) {
    super({
      datasources: { db: { url: config.env.DATABASE_URL } },
      log: config.isDev
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
          ]
        : [
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
          ],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected');

    // Slow-query logging in dev
    if (this.config.isDev) {
      (this as unknown as {
        $on: (event: 'query', cb: (e: { duration: number; query: string }) => void) => void;
      }).$on('query', (e) => {
        if (e.duration > 200) {
          this.logger.warn(`Slow query (${e.duration}ms): ${e.query.slice(0, 200)}...`);
        }
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Build an audit-aware extension. Apply at request scope so we can capture
   * the userId from the authenticated context.
   *
   * Usage in services:
   *   const tx = this.prisma.withAudit(userId);
   *   await tx.transaction.create({ data: ... });
   */
  withAudit(userId: string | null, source = 'api', ipAddress?: string) {
    return this.$extends({
      query: {
        $allModels: {
          async create({ model, args, query }: { model: string; args: unknown; query: (a: unknown) => Promise<unknown> }) {
            const result = await query(args);
            if (AUDITED_MODELS.has(model)) {
              await audit('create', model, result, null, result, userId, source, ipAddress);
            }
            return result;
          },
          async update({ model, args, query }: { model: string; args: { where?: unknown }; query: (a: unknown) => Promise<unknown> }) {
            // Capture before-state for diff
            let before: unknown = null;
            if (AUDITED_MODELS.has(model) && args.where) {
              try {
                // @ts-expect-error dynamic
                before = await this[model.charAt(0).toLowerCase() + model.slice(1)].findUnique({
                  where: args.where,
                });
              } catch {
                /* swallow */
              }
            }
            const result = await query(args);
            if (AUDITED_MODELS.has(model)) {
              await audit('update', model, result, before, result, userId, source, ipAddress);
            }
            return result;
          },
          async delete({ model, args, query }: { model: string; args: unknown; query: (a: unknown) => Promise<unknown> }) {
            const result = await query(args);
            if (AUDITED_MODELS.has(model)) {
              await audit('delete', model, result, result, null, userId, source, ipAddress);
            }
            return result;
          },
        },
      },
    });

    async function audit(
      action: string,
      entityType: string,
      entityRow: unknown,
      before: unknown,
      after: unknown,
      uid: string | null,
      src: string,
      ip?: string,
    ): Promise<void> {
      try {
        const id = (entityRow as { id?: string })?.id;
        if (!id) return;
        // Direct insert — bypass extensions to avoid recursion
        // We use a separate client here just for audit writes.
        await auditClient.auditLog.create({
          data: {
            userId: uid,
            entityType,
            entityId: id,
            action,
            before: before ? JSON.parse(JSON.stringify(before)) : null,
            after: after ? JSON.parse(JSON.stringify(after)) : null,
            source: src,
            ipAddress: ip ?? null,
          },
        });
      } catch {
        // Audit failures should never block the actual mutation.
      }
    }
  }
}

// Lightweight client used only for audit writes (avoids extension recursion).
// Created lazily on first use so we don't pay the cost at boot.
let _auditClient: PrismaClient | null = null;
const auditClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!_auditClient) {
      _auditClient = new PrismaClient({
        datasources: { db: { url: process.env.DATABASE_URL! } },
      });
    }
    return Reflect.get(_auditClient, prop);
  },
});
