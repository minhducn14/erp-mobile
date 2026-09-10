import { apiService } from './api';

export interface ProductDescriptionItem {
  id: string;
  productName: string;
  sourceType: 'LINK' | 'FILE';
  sourceName?: string;
  sourceUrl?: string;
  size?: number;
  publicId?: string;
}

export interface ProductDescriptionSubmission {
  id: string;
  projectId: string;
  versionNumber?: number;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  reviewNote?: string;
  createdBy?: {
    id: string;
    fullName: string;
  };
  reviewedBy?: {
    id: string;
    fullName: string;
  };
  items: ProductDescriptionItem[];
  createdAt?: string;
  updatedAt?: string;
}

class ProductDescriptionService {
  async getSubmissions(projectId: string): Promise<{ data?: ProductDescriptionSubmission[]; error?: string }> {
    const res = await apiService.get<ProductDescriptionSubmission[]>(`/projects/${projectId}/product-descriptions`);
    const raw = res.data;
    const items = Array.isArray(raw)
      ? raw
      : (raw as any)?.data && Array.isArray((raw as any).data)
      ? (raw as any).data
      : [];
    return { data: items, error: res.error };
  }

  async createSubmission(projectId: string, payload: { items: any[] }): Promise<{ data?: ProductDescriptionSubmission; error?: string }> {
    const res = await apiService.post<any>(`/projects/${projectId}/product-descriptions`, payload);
    const item = res.data?.data && typeof res.data.data === 'object' ? res.data.data : res.data;
    return { data: item, error: res.error };
  }

  async updateSubmission(projectId: string, submissionId: string, payload: { items: any[] }): Promise<{ data?: ProductDescriptionSubmission; error?: string }> {
    const res = await apiService.put<any>(`/projects/${projectId}/product-descriptions/${submissionId}`, payload);
    const item = res.data?.data && typeof res.data.data === 'object' ? res.data.data : res.data;
    return { data: item, error: res.error };
  }

  async submitSubmission(projectId: string, submissionId: string): Promise<{ data?: any; error?: string }> {
    const res = await apiService.post(`/projects/${projectId}/product-descriptions/${submissionId}/submit`, {});
    return { data: res.data, error: res.error };
  }

  async approveSubmission(projectId: string, submissionId: string): Promise<{ data?: any; error?: string }> {
    const res = await apiService.post(`/projects/${projectId}/product-descriptions/${submissionId}/approve`, {});
    return { data: res.data, error: res.error };
  }

  async rejectSubmission(projectId: string, submissionId: string, reviewNote?: string): Promise<{ data?: any; error?: string }> {
    const res = await apiService.post(`/projects/${projectId}/product-descriptions/${submissionId}/reject`, { reviewNote });
    return { data: res.data, error: res.error };
  }
}

export const productDescriptionService = new ProductDescriptionService();
