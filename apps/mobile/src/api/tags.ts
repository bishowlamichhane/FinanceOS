import type { CreateTagRequest, Tag } from '@finance-os/contracts';
import { apiClient } from './client';

export const tagsApi = {
  async list(): Promise<Tag[]> {
    const { data } = await apiClient.get<Tag[]>('/tags');
    return data;
  },

  async create(payload: CreateTagRequest): Promise<Tag> {
    const { data } = await apiClient.post<Tag>('/tags', payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/tags/${id}`);
  },
};
