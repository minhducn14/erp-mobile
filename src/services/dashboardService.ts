import { apiService } from './api';

export interface AdminMetrics {
  totalRevenue?: number;
  totalCustomers?: number;
  newCustomers?: number;
  activeProjects?: number;
  currentProjects?: Array<{
    id: string;
    name: string;
    status: string;
    customerName?: string;
    serviceCount: number;
    completedServiceCount: number;
    progress: number;
  }>;
  totalDebt?: number;
  pendingApprovalCount?: number;
  upcomingDebts?: Array<{
    id: string;
    name: string;
    amount: number;
    remaining: number;
    dueDate: string;
    customerName?: string;
  }>;
}

export interface TeamLeadProject {
  id: string;
  name: string;
  status: string;
  serviceCount: number;
  completedServiceCount: number;
  progress: number;
}

export interface MemberMetrics {
  totalTasks?: number;
  completedTasks?: number;
  inProgressTasks?: number;
  pendingTasks?: number;
  doingCount?: number;
  completedCount?: number;
  reworkCount?: number;
  violationCount?: number;
  vinicoin?: number;
  todayTasks?: Array<{
    id: string;
    title: string;
    code?: string;
    start?: string;
    end?: string;
    status: string;
    project?: { id: string; name: string };
  }>;
  participatingProjects?: Array<{
    id: string;
    name: string;
    status: string;
    clientName?: string;
    serviceCount: number;
    completedServiceCount: number;
    progress: number;
  }>;
}

export interface DashboardResponse {
  admin?: AdminMetrics;
  teamLead?: TeamLeadProject[];
  sale?: any;
  member?: MemberMetrics;
}

export interface TaskItem {
  id: string;
  name: string;
  code?: string;
  nickname?: string;
  status: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualEndDate?: string;
  project?: {
    id: string;
    name: string;
    contract?: {
      customer?: {
        name: string;
      };
    };
  };
  assignee?: {
    id: string;
    fullName?: string;
    username?: string;
  };
}

class DashboardService {
  async getDashboardData(params?: {
    month?: number;
    year?: number;
    userId?: string;
  }): Promise<{ data?: DashboardResponse; error?: string }> {
    const res = await apiService.get<DashboardResponse>('/dashboard', params);
    return { data: res.data, error: res.error };
  }

  async getAwaitingReviewTasks(): Promise<{ data?: TaskItem[]; error?: string }> {
    const res = await apiService.get<TaskItem[]>('/tasks', {
      status: 'AWAITING_REVIEW',
    });
    return { data: res.data, error: res.error };
  }

  async getMyTasks(): Promise<{ data?: TaskItem[]; error?: string }> {
    const res = await apiService.get<TaskItem[]>('/tasks');
    return { data: res.data, error: res.error };
  }
}

export const dashboardService = new DashboardService();
