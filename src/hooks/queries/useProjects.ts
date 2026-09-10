import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';

/**
 * Hook to fetch project list
 */
export function useProjectsQuery() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiService.request<any>('/projects');
      return res.data;
    },
  });
}

/**
 * Hook to fetch project details
 */
export function useProjectDetailQuery(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: async () => {
      const res = await apiService.request<any>(`/projects/${projectId}`);
      return res.data;
    },
    enabled: Boolean(projectId),
  });
}

/**
 * Hook to fetch product descriptions for a project
 */
export function useProductDescriptionsQuery(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'product-descriptions'],
    queryFn: async () => {
      const res = await apiService.request<any>(`/projects/${projectId}/product-descriptions`);
      return res.data;
    },
    enabled: Boolean(projectId),
  });
}

/**
 * Hook to submit a product description
 */
export function useSubmitProductDescriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      descriptionId,
      payload,
    }: {
      projectId: string;
      descriptionId: string;
      payload?: any;
    }) => {
      const res = await apiService.request<any>(
        `/projects/${projectId}/product-descriptions/${descriptionId}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload || {}),
        }
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'product-descriptions'],
      });
    },
  });
}
