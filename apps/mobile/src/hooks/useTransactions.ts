import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
  } from '@tanstack/react-query';
  import type {
    CreateTransactionRequest,
    TransactionFilters,
    TransactionListResponse,
    UpdateTransactionRequest,
  } from '@finance-os/contracts';
  import { transactionsApi } from '@/api/transactions';
  import { queryKeys } from '@/api/queryKeys';
  
  /**
   * Transaction hooks.
   *
   * - useTransactions(filters) — infinite query with cursor pagination
   * - useTransaction(id) — detail fetch
   * - useCreate/Update/DeleteTransaction — mutations with broad invalidation
   */
  
  export function useTransactions(filters: Partial<TransactionFilters> = {}) {
    return useInfiniteQuery({
      queryKey: queryKeys.transactions.list(filters),
      queryFn: ({ pageParam }) =>
        transactionsApi.list({ ...filters, cursor: pageParam as string | undefined }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage: TransactionListResponse) =>
        lastPage.nextCursor ?? undefined,
    });
  }
  
  export function useTransaction(id: string | undefined) {
    return useQuery({
      queryKey: id ? queryKeys.transactions.detail(id) : ['transactions', 'detail', 'noop'],
      queryFn: () => transactionsApi.findOne(id!),
      enabled: !!id,
    });
  }
  
  export function useCreateTransaction() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (payload: CreateTransactionRequest) => transactionsApi.create(payload),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
        void qc.invalidateQueries({ queryKey: queryKeys.accounts.all });
        void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        void qc.invalidateQueries({ queryKey: queryKeys.budgets.all });
      },
    });
  }
  
  export function useUpdateTransaction() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: UpdateTransactionRequest }) =>
        transactionsApi.update(id, payload),
      onSuccess: (tx) => {
        void qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
        void qc.invalidateQueries({ queryKey: queryKeys.accounts.all });
        void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        void qc.invalidateQueries({ queryKey: queryKeys.budgets.all });
        qc.setQueryData(queryKeys.transactions.detail(tx.id), tx);
      },
    });
  }
  
  export function useDeleteTransaction() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => transactionsApi.remove(id),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
        void qc.invalidateQueries({ queryKey: queryKeys.accounts.all });
        void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        void qc.invalidateQueries({ queryKey: queryKeys.budgets.all });
      },
    });
  }