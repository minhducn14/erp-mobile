import { apiService } from './api';

export const ACCEPTANCE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  PROCESSED: 'Đã xử lý',
  CANCELLED: 'Đã hủy',
};

export const ACCEPTANCE_STATUS_CONFIG: Record<
  string,
  { text: string; color: string; bg: string }
> = {
  PENDING: { text: 'Chờ duyệt', color: '#D97706', bg: '#FFFBEB' },
  APPROVED: { text: 'Đã duyệt', color: '#059669', bg: '#ECFDF5' },
  REJECTED: { text: 'Từ chối', color: '#DC2626', bg: '#FEF2F2' },
  PROCESSED: { text: 'Đã xử lý', color: '#2563EB', bg: '#EFF6FF' },
  CANCELLED: { text: 'Đã hủy', color: '#64748B', bg: '#F1F5F9' },
};

export interface AcceptanceItem {
  id: string;
  name?: string;
  acceptanceCode?: string;
  projectId: string;
  status: string;
  amount?: number;
  note?: string;
  createdAt?: string;
  services?: any[];
  creator?: {
    id: string;
    fullName: string;
  };
  project?: {
    id: string;
    name: string;
  };
}

class AcceptanceService {
  async getAcceptanceRequests(projectId?: string): Promise<{ data?: AcceptanceItem[]; error?: string }> {
    const res = await apiService.get<any>('/acceptance', { projectId });
    const raw = res.data;
    const items = Array.isArray(raw)
      ? raw
      : raw?.data && Array.isArray(raw.data)
      ? raw.data
      : [];
    return { data: items, error: res.error };
  }

  async getAcceptanceById(id: string): Promise<{ data?: AcceptanceItem; error?: string }> {
    const res = await apiService.get<any>(`/acceptance/${id}`);
    const item = res.data?.data && typeof res.data.data === 'object' && !Array.isArray(res.data.data)
      ? res.data.data
      : res.data;
    return { data: item, error: res.error };
  }


  async createAcceptanceRequest(payload: {
    projectId: string;
    name?: string;
    note?: string;
    serviceIds?: string[];
    amount?: number;
    tasks?: string[];
  }): Promise<{ data?: AcceptanceItem; error?: string }> {
    const res = await apiService.post<AcceptanceItem>('/acceptance/request', payload);
    return { data: res.data, error: res.error };
  }

  async processAcceptanceRequest(
    id: string,
    decisions: Array<{
      serviceId: string;
      status: 'APPROVED' | 'REJECTED';
      feedback?: string;
      resultDecisions?: Array<{ taskId: string; status: 'APPROVED' | 'REJECTED'; feedback?: string }>;
    }>
  ): Promise<{ data?: any; error?: string }> {
    const res = await apiService.post(`/acceptance/${id}/process`, { decisions });
    return { data: res.data, error: res.error };
  }
}

export const acceptanceService = new AcceptanceService();
