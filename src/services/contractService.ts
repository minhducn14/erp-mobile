import { apiService } from './api';

export enum ContractStatus {
  DRAFT = 'DRAFT',
  PROPOSAL_UPLOADED = 'PROPOSAL_UPLOADED',
  PROPOSAL_APPROVED = 'PROPOSAL_APPROVED',
  PROPOSAL_REJECTED = 'PROPOSAL_REJECTED',
  SIGNED = 'SIGNED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MilestoneStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

export enum ContractServiceStatus {
  ACTIVE = 'ACTIVE',
  ACCEPTANCE_REJECTED = 'ACCEPTANCE_REJECTED',
  CANCELLED = 'CANCELLED',
  AWAITING_ACCEPTANCE = 'AWAITING_ACCEPTANCE',
  COMPLETED = 'COMPLETED',
}

export interface ContractCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
}

export interface ContractOpportunity {
  id: string;
  opportunityCode?: string;
  name: string;
}

export interface ContractMilestone {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  status: MilestoneStatus | string;
  description?: string;
  dueDate?: string;
  paidDate?: string;
}

export interface ContractServiceItem {
  id: string;
  name?: string;
  packageName?: string;
  isPackageService?: boolean;
  sellingPrice: number;
  status?: ContractServiceStatus | string;
  service?: {
    id: string;
    name: string;
    costPrice?: number;
    unit?: string;
  };
}

export interface ContractAttachment {
  type?: string;
  name: string;
  url: string;
  size?: number;
  publicId?: string;
}

export interface ContractItem {
  id: string;
  contractCode: string;
  name: string;
  description?: string;
  status: ContractStatus | string;
  cost: number;
  sellingPrice: number;
  customer?: ContractCustomer;
  opportunity?: ContractOpportunity;
  proposal_contract?: string;
  quotation_link?: string;
  signed_contract?: string;
  rejectReason?: string;
  attachments?: ContractAttachment[];
  milestones?: ContractMilestone[];
  services?: ContractServiceItem[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: {
    id: string;
    fullName?: string;
    username?: string;
  };
}

export interface CreateContractPayload {
  opportunityId?: string;
  name?: string;
  description?: string;
  customerId?: string;
  customerData?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    taxId?: string;
    customerType?: string;
    source?: string;
    referralPartnerId?: string;
    status?: string;
  };
  services?: Array<{
    serviceId: string;
    quantity: number;
    sellingPrice?: number;
  }>;
  packages?: Array<{
    servicePackageId: string;
    quantity: number;
    customPrices?: Record<string, number>;
  }>;
}

export const contractService = {
  /**
   * Tạo hợp đồng từ cơ hội kinh doanh (hoặc độc lập)
   */
  async createContract(payload: CreateContractPayload) {
    return apiService.post<ContractItem>('/contracts', payload);
  },

  /**
   * Lấy chi tiết hợp đồng theo ID
   */
  async getContract(id: string) {
    return apiService.get<ContractItem>(`/contracts/${id}`);
  },

  /**
   * Lấy danh sách hợp đồng có bộ lọc
   */
  async getContracts(params?: {
    search?: string;
    status?: string;
    customerId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
  }) {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status && params.status !== 'ALL') queryParams.append('status', params.status);
    if (params?.customerId) queryParams.append('customerId', params.customerId);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortDir) queryParams.append('sortDir', params.sortDir);

    const queryStr = queryParams.toString();
    const endpoint = `/contracts${queryStr ? `?${queryStr}` : ''}`;
    return apiService.get<{ data: ContractItem[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(endpoint);
  },

  /**
   * Duyệt Proposal hợp đồng (BOD / Admin)
   */
  async approveProposal(id: string) {
    return apiService.post<{ message: string; contract?: ContractItem }>(`/contracts/${id}/approve-proposal`);
  },

  /**
   * Từ chối Proposal hợp đồng (BOD / Admin)
   */
  async rejectProposal(id: string, reason: string) {
    return apiService.post<{ message: string; contract?: ContractItem }>(`/contracts/${id}/reject-proposal`, { reason });
  },
};
