import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Account,
  AccountsListResponse,
  CreateAccountRequest,
  TransferRequest,
  UpdateAccountRequest,
} from '@finance-os/contracts';
import { accountsApi } from '@/api/accounts';
import { queryKeys } from '@/api/queryKeys';

/**
 * Account hooks.
 *
 * Mutations invalidate accounts, dashboard, and transactions caches because
 * those all depend on account state.
 */

export function useAccounts(includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.accounts.list(includeArchived),
    queryFn: () => accountsApi.list(includeArchived),
  });
}

export function useAccount(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.accounts.detail(id) : ['accounts', 'detail', 'noop'],
    queryFn: () => accountsApi.findOne(id!),
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAccountRequest) => accountsApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.accounts.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAccountRequest }) =>
      accountsApi.update(id, payload),
    onSuccess: (account: Account) => {
      void qc.invalidateQueries({ queryKey: queryKeys.accounts.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      qc.setQueryData(queryKeys.accounts.detail(account.id), account);
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountsApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.accounts.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransferRequest) => accountsApi.transfer(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.accounts.all });
      void qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      void qc.invalidateQueries({ queryKey: queryKeys.budgets.all });
    },
  });
}

/**
 * Helper: returns the active (non-archived) accounts list, or empty array
 * while loading. Convenient for pickers that don't need loading state.
 */
export function useActiveAccounts(): Account[] {
  const { data } = useAccounts(false);
  return data?.accounts ?? [];
}

/**
 * Helper: pull the totals block from the accounts query.
 */
export function useAccountsTotals(): AccountsListResponse['totals'] | null {
  const { data } = useAccounts(false);
  return data?.totals ?? null;
}