import { apiService } from './api';

export enum QuotationStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

export interface QuotationItem {
  id: string;
  version: number;
  status: QuotationStatus | string;
  type: string;
  totalAmount: number;
  note?: string;
  description?: string;
  createdAt?: string;
  createdBy?: {
    id: string;
    fullName?: string;
    username?: string;
  };
}

export const quotationService = {
  async getQuotationsByOpportunity(opportunityId: string) {
    return apiService.get<QuotationItem[]>(`/quotations/opportunity/${opportunityId}`);
  },

  async approveQuotation(id: string) {
    return apiService.post<{ message: string }>(`/quotations/${id}/approve`);
  },

  async rejectQuotation(id: string, reason?: string) {
    return apiService.post<{ message: string }>(`/quotations/${id}/reject`, { reason });
  },
};
