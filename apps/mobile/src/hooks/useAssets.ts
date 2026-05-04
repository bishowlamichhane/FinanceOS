import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Asset,
  CreateAssetRequest,
  RecordAssetValueRequest,
  UpdateAssetRequest,
} from '@finance-os/contracts';
import { assetsApi } from '@/api/assets';
import { queryKeys } from '@/api/queryKeys';

/**
 * Asset hooks. Hydrated `change` block is computed server-side from the
 * snapshot history, so any value mutation invalidates the whole asset cache.
 */

export function useAssets(includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.assets.list(includeArchived),
    queryFn: () => assetsApi.list(includeArchived),
  });
}

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.assets.detail(id) : ['assets', 'detail', 'noop'],
    queryFn: () => assetsApi.findOne(id!),
    enabled: !!id,
  });
}

export function useAssetValueHistory(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.assets.history(id) : ['assets', 'history', 'noop'],
    queryFn: () => assetsApi.valueHistory(id!),
    enabled: !!id,
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAssetRequest) => assetsApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.assets.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAssetRequest }) =>
      assetsApi.update(id, payload),
    onSuccess: (a: Asset) => {
      void qc.invalidateQueries({ queryKey: queryKeys.assets.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      qc.setQueryData(queryKeys.assets.detail(a.id), a);
    },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetsApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.assets.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useRecordAssetValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: RecordAssetValueRequest;
    }) => assetsApi.recordValue(id, payload),
    onSuccess: (a: Asset) => {
      void qc.invalidateQueries({ queryKey: queryKeys.assets.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      qc.setQueryData(queryKeys.assets.detail(a.id), a);
    },
  });
}
