import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { queryKeys } from '@/services/queryKeys';

export interface OpportunityFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * Hook to fetch opportunities list with TanStack Query caching & refetching
 */
export function useOpportunitiesQuery(filters: OpportunityFilters = {}) {
  return useQuery({
    queryKey: queryKeys.opportunities.list(filters),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (filters.search) searchParams.append('search', filters.search);
      if (filters.status) searchParams.append('status', filters.status);
      if (filters.page) searchParams.append('page', String(filters.page));
      if (filters.limit) searchParams.append('limit', String(filters.limit));

      const queryString = searchParams.toString();
      const endpoint = `/opportunities${queryString ? `?${queryString}` : ''}`;
      
      const res = await apiService.request<any>(endpoint);
      return res.data;
    },
  });
}

/**
 * Hook to fetch detail of a single opportunity
 */
export function useOpportunityDetailQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.opportunities.detail(id),
    queryFn: async () => {
      const res = await apiService.request<any>(`/opportunities/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

/**
 * Hook to create a new opportunity
 */
export function useCreateOpportunityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiService.request<any>('/opportunities', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res;
    },
    onSuccess: () => {
      // Invalidate opportunities list cache when new item is created
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });
    },
  });
}
