import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  financeService,
  ContractDebtGroup,
} from '@/services/financeService';
import { queryKeys } from '@/services/queryKeys';

/**
 * Hook to fetch contract debts and milestones with TanStack Query
 */
export function useContractDebtsQuery() {
  return useQuery({
    queryKey: queryKeys.finance.contractDebts(),
    queryFn: async (): Promise<ContractDebtGroup[]> => {
      const res = await financeService.getContractDebtsAndMilestones();
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data || [];
    },
  });
}

/**
 * Hook to activate debt for a milestone
 */
export function useActivateDebtMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (milestoneId: string) => {
      const res = await financeService.activateDebt(milestoneId);
      if (!res.success) {
        throw new Error(res.error || 'Không thể kích hoạt công nợ');
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
    },
  });
}

/**
 * Hook to record payment
 */
export function useCreatePaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      debtId: string;
      amount: number;
      paymentDate: string;
      note?: string;
      proofLink?: string;
      proofFile?: { name: string; size?: number; uri: string; mimeType?: string };
    }) => {
      const res = await financeService.createPayment(payload);
      if (!res.success) {
        throw new Error(res.error || 'Không thể ghi nhận thanh toán');
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
    },
  });
}

/**
 * Hook to delete payment record
 */
export function useDeletePaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await financeService.deletePayment(paymentId);
      if (!res.success) {
        throw new Error(res.error || 'Không thể xóa ghi nhận thanh toán');
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
    },
  });
}

/**
 * Hook to bulk save milestone roadmap for a contract
 */
export function useBulkSaveMilestonesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contractId,
      milestones,
    }: {
      contractId: string;
      milestones: Array<{
        id?: string;
        name: string;
        percentage?: number;
        amount: number;
        dueDate?: string;
      }>;
    }) => {
      const res = await financeService.bulkSaveMilestones(contractId, milestones);
      if (!res.success) {
        throw new Error(res.error || 'Không thể lưu kế hoạch thanh toán');
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
    },
  });
}
