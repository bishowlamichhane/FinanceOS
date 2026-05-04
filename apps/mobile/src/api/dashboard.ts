import type { DashboardSummary } from '@finance-os/contracts';
import { apiClient } from './client';

export const dashboardApi = {
  async summary(): Promise<DashboardSummary> {
    const { data } = await apiClient.get<DashboardSummary>('/dashboard/summary');
    return data;
  },
};
