import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService, TaskDetail } from '@/services/taskService';
import { TaskItem } from '@/services/dashboardService';
import { queryKeys } from '@/services/queryKeys';

export interface TaskListFilters {
  search?: string;
  status?: string;
  projectId?: string;
  assigneeId?: string;
  page?: number;
  limit?: number;
}

/**
 * Hook to fetch list of tasks with filters
 */
export function useTasksQuery(filters: TaskListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: async () => {
      const res = await taskService.getTasks(filters);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data || [];
    },
  });
}

/**
 * Hook to fetch tasks by project ID
 */
export function useTasksByProjectQuery(projectId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.list({ projectId }),
    queryFn: async () => {
      const res = await taskService.getTasksByProject(projectId);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data || [];
    },
    enabled: Boolean(projectId),
  });
}

/**
 * Hook to fetch single task detail
 */
export function useTaskDetailQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: async () => {
      const res = await taskService.getTaskById(id);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    enabled: Boolean(id),
  });
}

/**
 * Hook to update task status (Optimistic update support)
 */
export function useUpdateTaskStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await taskService.updateTaskStatus(id, status);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

/**
 * Hook to create a new task
 */
export function useCreateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      projectId: string;
      name: string;
      description?: string;
      assigneeId?: string;
      dueDate?: string;
      isExtraTask?: boolean;
    }) => {
      const res = await taskService.createTask(payload);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(variables.projectId) });
    },
  });
}

/**
 * Hook to assign a task to a performer
 */
export function useAssignTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload:
        | string
        | {
            assigneeId?: string;
            performerType?: string;
            plannedEndDate?: string;
            plannedStartDate?: string;
            description?: string;
            attachments?: any[];
            projectId?: string;
          };
    }) => {
      const res = await taskService.assignTask(id, payload);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

/**
 * Hook to bulk assign tasks
 */
export function useBulkAssignTasksMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      taskIds: string[];
      assigneeId?: string;
      performerType?: string;
      plannedEndDate?: string;
      plannedStartDate?: string;
      description?: string;
      attachments?: any[];
      projectId?: string;
    }) => {
      const res = await taskService.bulkAssignTasks(payload);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

/**
 * Hook to submit task result
 */
export function useSubmitTaskResultMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: { link?: string; result?: any; projectId?: string };
    }) => {
      const res = await taskService.submitTaskResult(id, payload);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

/**
 * Hook to finalize / approve task
 */
export function useFinalizeTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      payload,
    }: {
      taskId: string;
      payload: { passedCriteriaIds: string[]; reviewNote?: string; projectId?: string };
    }) => {
      const res = await taskService.finalizeTask(taskId, payload);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

/**
 * Hook to reject task
 */
export function useRejectTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      payload,
    }: {
      taskId: string;
      payload: { passedCriteriaIds?: string[]; reviewNote: string; projectId?: string };
    }) => {
      const res = await taskService.rejectTask(taskId, payload);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

/**
 * Hook to request rework
 */
export function useRequestReworkMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: { feedback: string; deadlineAt?: string; attachments?: any[]; projectId?: string };
    }) => {
      const res = await taskService.requestRework(id, payload);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}
