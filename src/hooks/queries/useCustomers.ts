import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService, CustomerListFilters, CustomerItem } from '@/services/customerService';
import { queryKeys } from '@/services/queryKeys';

/**
 * Hook to fetch list of customers with filtering & caching
 */
export function useCustomersQuery(filters: CustomerListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: async () => {
      const res = await customerService.getCustomers(filters);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data || [];
    },
  });
}

/**
 * Hook to fetch detail of a single customer
 */
export function useCustomerDetailQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: async () => {
      const res = await customerService.getCustomerById(id);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    enabled: Boolean(id),
  });
}

/**
 * Hook to update customer information
 */
export function useUpdateCustomerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CustomerItem> }) => {
      const res = await customerService.updateCustomer(id, payload);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(variables.id) });
    },
  });
}
