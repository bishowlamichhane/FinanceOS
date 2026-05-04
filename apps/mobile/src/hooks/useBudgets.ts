import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Budget,
  CreateBudgetRequest,
  UpdateBudgetRequest,
} from '@finance-os/contracts';
import { budgetsApi } from '@/api/budgets';
import { queryKeys } from '@/api/queryKeys';

/**
 * Budget hooks. Hydrated `currentPeriod` actuals are computed server-side, so
 * mutations on transactions invalidate the budget cache too.
 */

export function useBudgets(includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.budgets.list(includeArchived),
    queryFn: () => budgetsApi.list(includeArchived),
  });
}

export function useBudget(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.budgets.detail(id) : ['budgets', 'detail', 'noop'],
    queryFn: () => budgetsApi.findOne(id!),
    enabled: !!id,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBudgetRequest) => budgetsApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.budgets.all });
    },
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBudgetRequest }) =>
      budgetsApi.update(id, payload),
    onSuccess: (b: Budget) => {
      void qc.invalidateQueries({ queryKey: queryKeys.budgets.all });
      qc.setQueryData(queryKeys.budgets.detail(b.id), b);
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => budgetsApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.budgets.all });
    },
  });
}
