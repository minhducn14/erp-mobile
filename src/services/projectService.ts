import { apiService } from './api';

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  PENDING_CONFIRMATION: 'Chờ xác nhận',
  PLANNING: 'Lập kế hoạch',
  CONFIRMED: 'Đã xác nhận',
  IN_PROGRESS: 'Đang thực hiện',
  ON_HOLD: 'Tạm dừng',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export const PROJECT_STATUS_CONFIG: Record<
  string,
  { text: string; color: string; bg: string; border: string }
> = {
  PENDING_CONFIRMATION: {
    text: 'Chờ xác nhận',
    color: '#C2410C',
    bg: '#FFF7ED',
    border: '#FFEDD5',
  },
  PLANNING: {
    text: 'Lập kế hoạch',
    color: '#1D4ED8',
    bg: '#EFF6FF',
    border: '#BFDBFE',
  },
  CONFIRMED: {
    text: 'Đã xác nhận',
    color: '#1D4ED8',
    bg: '#EFF6FF',
    border: '#BFDBFE',
  },
  IN_PROGRESS: {
    text: 'Đang thực hiện',
    color: '#047857',
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
  ON_HOLD: {
    text: 'Tạm dừng',
    color: '#B45309',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  COMPLETED: {
    text: 'Hoàn thành',
    color: '#7E22CE',
    bg: '#F3E8FF',
    border: '#E9D5FF',
  },
  CANCELLED: {
    text: 'Đã hủy',
    color: '#BE123C',
    bg: '#FFE4E6',
    border: '#FECDD3',
  },
};

export interface ProjectItem {
  id: string;
  name: string;
  status: string;
  code?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  progress?: number;
  contract?: {
    id: string;
    contractCode?: string;
    sellingPrice?: number;
    customer?: {
      id: string;
      name: string;
      phoneNumber?: string;
      email?: string;
    };
  };
  team?: {
    id: string;
    name: string;
    teamLead?: {
      id: string;
      fullName: string;
    };
    members?: Array<{
      id: string;
      role: string;
      user?: {
        id: string;
        fullName: string;
      };
    }>;
  };
}

export interface UserPMItem {
  id: string;
  fullName: string;
  email?: string;
  role?: string;
}

class ProjectService {
  async getProjects(filters?: Record<string, any>): Promise<{ data?: ProjectItem[]; error?: string }> {
    const res = await apiService.get<ProjectItem[]>('/projects', filters);
    return { data: res.data, error: res.error };
  }

  async getProjectById(id: string): Promise<{ data?: ProjectItem; error?: string }> {
    const res = await apiService.get<ProjectItem>(`/projects/${id}`);
    return { data: res.data, error: res.error };
  }

  async getProjectByContract(contractId: string): Promise<{ data?: ProjectItem; error?: string }> {
    const res = await apiService.get<ProjectItem>(`/projects/contract/${contractId}`);
    return { data: res.data, error: res.error };
  }

  async assignProject(contractId: string, pmId: string | null): Promise<{ data?: any; error?: string }> {
    const res = await apiService.post('/projects/assign', { contractId, pmId });
    return { data: res.data, error: res.error };
  }

  async getPmUsers(): Promise<{ data?: UserPMItem[]; error?: string }> {
    const res = await apiService.get<UserPMItem[]>('/users', { role: 'PM' });
    return { data: res.data, error: res.error };
  }
}

export const projectService = new ProjectService();
