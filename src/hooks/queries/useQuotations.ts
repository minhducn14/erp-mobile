import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { queryKeys } from '@/services/queryKeys';

export interface QuotationFilters {
  search?: string;
  status?: string;
  opportunityId?: string;
  page?: number;
  limit?: number;
}

export interface CreateQuotationDto {
  opportunityId: string;
  title: string;
  totalAmount: number;
  vatRate?: number;
  discountAmount?: number;
  items: Array<{
    serviceId?: string;
    servicePackageId?: string;
    quantity: number;
    unitPrice: number;
  }>;
}

/**
 * Hook to fetch list of quotations
 */
export function useQuotationsQuery(filters: QuotationFilters = {}) {
  return useQuery({
    queryKey: queryKeys.quotations.list(filters),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (filters.search) searchParams.append('search', filters.search);
      if (filters.status) searchParams.append('status', filters.status);
      if (filters.opportunityId) searchParams.append('opportunityId', filters.opportunityId);
      if (filters.page) searchParams.append('page', String(filters.page));
      if (filters.limit) searchParams.append('limit', String(filters.limit));

      const queryString = searchParams.toString();
      const endpoint = `/quotations${queryString ? `?${queryString}` : ''}`;
      
      const res = await apiService.request<any>(endpoint);
      return res.data;
    },
  });
}

/**
 * Hook to fetch detail of a quotation
 */
export function useQuotationDetailQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.quotations.detail(id),
    queryFn: async () => {
      const res = await apiService.request<any>(`/quotations/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

/**
 * Hook to create a new quotation
 */
export function useCreateQuotationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateQuotationDto) => {
      const res = await apiService.request<any>('/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
    },
  });
}

/**
 * Hook to update status of a quotation (e.g. DRAFT -> SUBMITTED -> APPROVED)
 */
export function useUpdateQuotationStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiService.request<any>(`/quotations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.detail(variables.id) });
    },
  });
}
