import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateTagRequest } from '@finance-os/contracts';
import { tagsApi } from '@/api/tags';
import { queryKeys } from '@/api/queryKeys';

/**
 * Tag hooks. Tags are simple — list / create / delete.
 *
 * On the API, `create` is upsert-ish: a duplicate name returns the existing tag.
 */

export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags.list(),
    queryFn: () => tagsApi.list(),
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTagRequest) => tagsApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tags.all });
    },
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tagsApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tags.all });
      // tags appear inside transactions; invalidate those too
      void qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
  });
}
