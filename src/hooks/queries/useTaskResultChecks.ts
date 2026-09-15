import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskResultChecksService, ResultCheckKind } from '@/services/taskResultChecksService';
import { queryKeys } from '@/services/queryKeys';

export function useTaskResultCheckQuery(taskId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.taskResultChecks.detail(taskId),
    queryFn: async () => {
      const res = await taskResultChecksService.getByTask(taskId);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data ?? null;
    },
    enabled: Boolean(taskId) && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PENDING' || status === 'RUNNING' ? 2000 : false;
    },
  });
}

export function useToggleResultCheckItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      kind,
      itemId,
      confirmed,
    }: {
      taskId: string;
      kind: ResultCheckKind;
      itemId: string;
      confirmed: boolean;
    }) => {
      const res = await taskResultChecksService.toggleItem(taskId, kind, itemId, confirmed);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskResultChecks.detail(variables.taskId) });
    },
  });
}

export function useToggleResultCheckItemsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      kind,
      itemIds,
      confirmed,
    }: {
      taskId: string;
      kind: ResultCheckKind;
      itemIds: string[];
      confirmed: boolean;
    }) => {
      const res = await taskResultChecksService.toggleItems(taskId, kind, itemIds, confirmed);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskResultChecks.detail(variables.taskId) });
    },
  });
}

export function useFinalizeResultCheckMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await taskResultChecksService.finalize(taskId);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskResultChecks.detail(taskId) });
    },
  });
}

export function useRerunResultCheckMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      kind,
      whitelist,
    }: {
      taskId: string;
      kind: ResultCheckKind;
      whitelist: string[];
    }) => {
      const res = await taskResultChecksService.rerun(taskId, kind, whitelist);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskResultChecks.detail(variables.taskId) });
    },
  });
}
