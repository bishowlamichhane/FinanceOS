import type {
    CreateTransactionRequest,
    Transaction,
    TransactionFilters,
    TransactionListResponse,
    UpdateTransactionRequest,
  } from '@finance-os/contracts';
  import { apiClient } from './client';
  
  export const transactionsApi = {
    async list(filters: Partial<TransactionFilters> = {}): Promise<TransactionListResponse> {
      const { data } = await apiClient.get<TransactionListResponse>('/transactions', {
        params: filters,
      });
      return data;
    },
  
    async findOne(id: string): Promise<Transaction> {
      const { data } = await apiClient.get<Transaction>(`/transactions/${id}`);
      return data;
    },
  
    async create(payload: CreateTransactionRequest): Promise<Transaction> {
      const { data } = await apiClient.post<Transaction>('/transactions', payload);
      return data;
    },
  
    async update(id: string, payload: UpdateTransactionRequest): Promise<Transaction> {
      const { data } = await apiClient.patch<Transaction>(`/transactions/${id}`, payload);
      return data;
    },
  
    async remove(id: string): Promise<void> {
      await apiClient.delete(`/transactions/${id}`);
    },
  };