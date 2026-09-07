import { apiService } from './api';

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
  };
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
}

export const projectService = new ProjectService();
