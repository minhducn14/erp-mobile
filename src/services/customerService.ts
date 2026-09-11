import { apiService } from './api';

export interface CustomerItem {
  id: string;
  name: string;
  code?: string;
  taxId?: string;
  taxCode?: string;
  phoneNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  contactPerson?: string;
  industry?: string;
  contracts?: Array<{
    id: string;
    contractCode?: string;
    sellingPrice?: number;
    status?: string;
  }>;
}

export interface CustomerListFilters {
  search?: string;
  page?: number;
  limit?: number;
}

class CustomerService {
  async getCustomers(filters?: CustomerListFilters): Promise<{ data?: CustomerItem[]; error?: string }> {
    const searchParams = new URLSearchParams();
    if (filters?.search) searchParams.append('search', filters.search);
    if (filters?.page) searchParams.append('page', String(filters.page));
    if (filters?.limit) searchParams.append('limit', String(filters.limit));
    const query = searchParams.toString();
    const res = await apiService.get<CustomerItem[]>(`/customers${query ? `?${query}` : ''}`);
    return { data: res.data, error: res.error };
  }

  async getCustomerById(id: string): Promise<{ data?: CustomerItem; error?: string }> {
    const res = await apiService.get<CustomerItem>(`/customers/${id}`);
    return { data: res.data, error: res.error };
  }

  async updateCustomer(id: string, payload: Partial<CustomerItem>): Promise<{ data?: CustomerItem; error?: string }> {
    const res = await apiService.put<CustomerItem>(`/customers/${id}`, payload);
    return { data: res.data, error: res.error };
  }
}

export const customerService = new CustomerService();
