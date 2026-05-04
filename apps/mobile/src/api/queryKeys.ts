/**
 * Query keys.
 *
 * Centralizing keys here means cache invalidation is explicit and reviewable.
 * When a transaction is created, we invalidate:
 *   - ['transactions', ...]   (lists with any filter)
 *   - ['accounts']            (balances changed)
 *   - ['dashboard', 'summary']
 */

export const queryKeys = {
    dashboard: {
      all: ['dashboard'] as const,
      summary: () => [...queryKeys.dashboard.all, 'summary'] as const,
    },
    accounts: {
      all: ['accounts'] as const,
      list: (includeArchived = false) =>
        [...queryKeys.accounts.all, 'list', { includeArchived }] as const,
      detail: (id: string) => [...queryKeys.accounts.all, 'detail', id] as const,
    },
    transactions: {
      all: ['transactions'] as const,
      list: (filters: Record<string, unknown> = {}) =>
        [...queryKeys.transactions.all, 'list', filters] as const,
      detail: (id: string) => [...queryKeys.transactions.all, 'detail', id] as const,
    },
    categories: {
      all: ['categories'] as const,
      list: (filters: Record<string, unknown> = {}) =>
        [...queryKeys.categories.all, 'list', filters] as const,
      detail: (id: string) => [...queryKeys.categories.all, 'detail', id] as const,
    },
    tags: {
      all: ['tags'] as const,
      list: () => [...queryKeys.tags.all, 'list'] as const,
    },
    budgets: {
      all: ['budgets'] as const,
      list: (includeArchived = false) =>
        [...queryKeys.budgets.all, 'list', { includeArchived }] as const,
      detail: (id: string) => [...queryKeys.budgets.all, 'detail', id] as const,
    },
    assets: {
      all: ['assets'] as const,
      list: (includeArchived = false) =>
        [...queryKeys.assets.all, 'list', { includeArchived }] as const,
      detail: (id: string) => [...queryKeys.assets.all, 'detail', id] as const,
      history: (id: string) =>
        [...queryKeys.assets.all, 'detail', id, 'history'] as const,
    },
  } as const;