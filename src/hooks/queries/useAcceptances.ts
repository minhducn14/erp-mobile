import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { acceptanceService, AcceptanceItem } from '@/services/acceptanceService';
import { queryKeys } from '@/services/queryKeys';

export interface AcceptanceListFilters {
  projectId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Hook to fetch list of acceptances with caching & filters
 */
export function useAcceptancesQuery(filters: AcceptanceListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.acceptances.list(filters),
    queryFn: async () => {
      const res = await acceptanceService.getAcceptanceRequests(filters.projectId);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data || [];
    },
  });
}

/**
 * Hook to fetch single acceptance detail
 */
export function useAcceptanceDetailQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.acceptances.detail(id),
    queryFn: async () => {
      const res = await acceptanceService.getAcceptanceById(id);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    enabled: Boolean(id),
  });
}

/**
 * Hook to create an acceptance request
 */
export function useCreateAcceptanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      projectId: string;
      name?: string;
      note?: string;
      serviceIds?: string[];
      amount?: number;
      tasks?: string[];
    }) => {
      const res = await acceptanceService.createAcceptanceRequest(payload);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.acceptances.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(variables.projectId) });
    },
  });
}

/**
 * Hook to process/approve/reject acceptance request
 */
export function useProcessAcceptanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      decisions,
    }: {
      id: string;
      decisions: Array<{
        serviceId: string;
        status: 'APPROVED' | 'REJECTED';
        feedback?: string;
        resultDecisions?: Array<{ taskId: string; status: 'APPROVED' | 'REJECTED'; feedback?: string }>;
      }>;
    }) => {
      const res = await acceptanceService.processAcceptanceRequest(id, decisions);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.acceptances.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.acceptances.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}
