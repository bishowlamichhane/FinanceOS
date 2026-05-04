import type {
  Budget,
  BudgetsListResponse,
  CreateBudgetRequest,
  UpdateBudgetRequest,
} from '@finance-os/contracts';
import { apiClient } from './client';

export const budgetsApi = {
  async list(includeArchived = false): Promise<BudgetsListResponse> {
    const { data } = await apiClient.get<BudgetsListResponse>('/budgets', {
      params: { includeArchived: includeArchived ? 'true' : undefined },
    });
    return data;
  },

  async findOne(id: string): Promise<Budget> {
    const { data } = await apiClient.get<Budget>(`/budgets/${id}`);
    return data;
  },

  async create(payload: CreateBudgetRequest): Promise<Budget> {
    const { data } = await apiClient.post<Budget>('/budgets', payload);
    return data;
  },

  async update(id: string, payload: UpdateBudgetRequest): Promise<Budget> {
    const { data } = await apiClient.patch<Budget>(`/budgets/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/budgets/${id}`);
  },
};
