import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CategoryFilters,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@finance-os/contracts';
import { categoriesApi } from '@/api/categories';
import { queryKeys } from '@/api/queryKeys';

export function useCategories(filters: Partial<CategoryFilters> = {}) {
  return useQuery({
    queryKey: queryKeys.categories.list(filters),
    queryFn: () => categoriesApi.list(filters),
  });
}

export function useCategory(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.categories.detail(id) : ['categories', 'detail', 'noop'],
    queryFn: () => categoriesApi.findOne(id!),
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCategoryRequest) => categoriesApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCategoryRequest }) =>
      categoriesApi.update(id, payload),
    onSuccess: (cat) => {
      void qc.invalidateQueries({ queryKey: queryKeys.categories.all });
      qc.setQueryData(queryKeys.categories.detail(cat.id), cat);
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}