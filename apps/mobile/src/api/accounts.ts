import type {
    Account,
    AccountsListResponse,
    CreateAccountRequest,
    TransferRequest,
    UpdateAccountRequest,
  } from '@finance-os/contracts';
  import { apiClient } from './client';
  
  export const accountsApi = {
    async list(includeArchived = false): Promise<AccountsListResponse> {
      const { data } = await apiClient.get<AccountsListResponse>('/accounts', {
        params: { includeArchived: includeArchived ? 'true' : undefined },
      });
      return data;
    },
  
    async findOne(id: string): Promise<Account> {
      const { data } = await apiClient.get<Account>(`/accounts/${id}`);
      return data;
    },
  
    async create(payload: CreateAccountRequest): Promise<Account> {
      const { data } = await apiClient.post<Account>('/accounts', payload);
      return data;
    },
  
    async update(id: string, payload: UpdateAccountRequest): Promise<Account> {
      const { data } = await apiClient.patch<Account>(`/accounts/${id}`, payload);
      return data;
    },
  
    async remove(id: string): Promise<void> {
      await apiClient.delete(`/accounts/${id}`);
    },
  
    async transfer(payload: TransferRequest): Promise<{ id: string }> {
      const { data } = await apiClient.post<{ id: string }>('/accounts/transfer', payload);
      return data;
    },
  };