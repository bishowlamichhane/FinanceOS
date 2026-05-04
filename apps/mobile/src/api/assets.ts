import type {
  Asset,
  AssetValueHistoryResponse,
  AssetsListResponse,
  CreateAssetRequest,
  RecordAssetValueRequest,
  UpdateAssetRequest,
} from '@finance-os/contracts';
import { apiClient } from './client';

export const assetsApi = {
  async list(includeArchived = false): Promise<AssetsListResponse> {
    const { data } = await apiClient.get<AssetsListResponse>('/assets', {
      params: { includeArchived: includeArchived ? 'true' : undefined },
    });
    return data;
  },

  async findOne(id: string): Promise<Asset> {
    const { data } = await apiClient.get<Asset>(`/assets/${id}`);
    return data;
  },

  async create(payload: CreateAssetRequest): Promise<Asset> {
    const { data } = await apiClient.post<Asset>('/assets', payload);
    return data;
  },

  async update(id: string, payload: UpdateAssetRequest): Promise<Asset> {
    const { data } = await apiClient.patch<Asset>(`/assets/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/assets/${id}`);
  },

  async valueHistory(id: string): Promise<AssetValueHistoryResponse> {
    const { data } = await apiClient.get<AssetValueHistoryResponse>(
      `/assets/${id}/values`,
    );
    return data;
  },

  async recordValue(
    id: string,
    payload: RecordAssetValueRequest,
  ): Promise<Asset> {
    const { data } = await apiClient.post<Asset>(
      `/assets/${id}/values`,
      payload,
    );
    return data;
  },
};
