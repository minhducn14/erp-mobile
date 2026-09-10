import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { queryKeys } from '@/services/queryKeys';

export interface DashboardParams {
  month?: number;
  year?: number;
}

/**
 * Custom TanStack Query Hook to fetch Dashboard & Home metrics
 */
export function useDashboardQuery(params: DashboardParams = {}) {
  const now = new Date();
  const month = params.month ?? now.getMonth() + 1;
  const year = params.year ?? now.getFullYear();

  return useQuery({
    queryKey: queryKeys.dashboard.summary({ month, year }),
    queryFn: async () => {
      const endpoint = `/dashboard?month=${month}&year=${year}`;
      const res = await apiService.request<any>(endpoint);
      return res.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch current user's assigned tasks
 */
export function useMyTasksQuery() {
  return useQuery({
    queryKey: queryKeys.tasks.list({ type: 'my-tasks' }),
    queryFn: async () => {
      const res = await apiService.request<any>('/tasks');
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 1000 * 60 * 3,
  });
}

/**
 * Hook to fetch tasks awaiting review (for Leads/Admins)
 */
export function useAwaitingReviewTasksQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.tasks.list({ type: 'awaiting-review' }),
    queryFn: async () => {
      const res = await apiService.request<any>('/tasks/review-queue');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled,
    staleTime: 1000 * 60 * 3,
  });
}
