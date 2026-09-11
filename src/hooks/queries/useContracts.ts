import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  contractService,
  ContractItem,
  CreateContractPayload,
} from '@/services/contractService';
import { queryKeys } from '@/services/queryKeys';

export interface ContractListFilters {
  search?: string;
  status?: string;
  customerId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

/**
 * Hook to fetch list of contracts with filtering & caching
 */
export function useContractsQuery(filters: ContractListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.contracts.list(filters),
    queryFn: async () => {
      const res = await contractService.getContracts(filters);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
  });
}

/**
 * Hook to fetch detail of a single contract
 */
export function useContractDetailQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.contracts.detail(id),
    queryFn: async () => {
      const res = await contractService.getContract(id);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    enabled: Boolean(id),
  });
}

/**
 * Hook to create a new contract
 */
export function useCreateContractMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateContractPayload) => {
      const res = await contractService.createContract(payload);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });
    },
  });
}

/**
 * Hook to upload contract proposal
 */
export function useUploadProposalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: { file?: any; contractLink?: string; quotationLink?: string };
    }) => {
      const res = await contractService.uploadProposal(id, payload);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.detail(variables.id) });
    },
  });
}

/**
 * Hook to upload signed contract
 */
export function useUploadSignedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: any }) => {
      const res = await contractService.uploadSigned(id, file);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.detail(variables.id) });
    },
  });
}

/**
 * Hook to approve contract proposal (BOD/Admin action)
 */
export function useApproveProposalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await contractService.approveProposal(id);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.detail(id) });
    },
  });
}

/**
 * Hook to reject contract proposal (BOD/Admin action)
 */
export function useRejectProposalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await contractService.rejectProposal(id, reason);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.detail(variables.id) });
    },
  });
}
