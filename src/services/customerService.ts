import { apiService } from './api';

export interface CustomerItem {
  id: string;
  name: string;
  code?: string;
  taxCode?: string;
  phoneNumber?: string;
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

class CustomerService {
  async getCustomers(): Promise<{ data?: CustomerItem[]; error?: string }> {
    const res = await apiService.get<CustomerItem[]>('/customers');
    return { data: res.data, error: res.error };
  }

  async getCustomerById(id: string): Promise<{ data?: CustomerItem; error?: string }> {
    const res = await apiService.get<CustomerItem>(`/customers/${id}`);
    return { data: res.data, error: res.error };
  }
}

export const customerService = new CustomerService();
