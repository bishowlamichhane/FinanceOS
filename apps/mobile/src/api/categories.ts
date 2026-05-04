import type {
    Category,
    CategoryFilters,
    CreateCategoryRequest,
    UpdateCategoryRequest,
  } from '@finance-os/contracts';
  import { apiClient } from './client';
  
  export const categoriesApi = {
    async list(filters: Partial<CategoryFilters> = {}): Promise<Category[]> {
      const { data } = await apiClient.get<Category[]>('/categories', { params: filters });
      return data;
    },
  
    async findOne(id: string): Promise<Category> {
      const { data } = await apiClient.get<Category>(`/categories/${id}`);
      return data;
    },
  
    async create(payload: CreateCategoryRequest): Promise<Category> {
      const { data } = await apiClient.post<Category>('/categories', payload);
      return data;
    },
  
    async update(id: string, payload: UpdateCategoryRequest): Promise<Category> {
      const { data } = await apiClient.patch<Category>(`/categories/${id}`, payload);
      return data;
    },
  
    async remove(id: string): Promise<void> {
      await apiClient.delete(`/categories/${id}`);
    },
  };