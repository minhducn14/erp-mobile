import { apiService } from './api';
import { TaskItem } from './dashboardService';

export interface TaskDetail extends TaskItem {
  description?: string;
  expectedResult?: string;
  links?: string[];
  attachments?: Array<{
    type?: string;
    name?: string;
    url: string;
    size?: number;
  }>;
  result?: {
    type?: string;
    name?: string;
    url?: string;
    note?: string;
    checklist?: Array<{ item: string; checked: boolean }>;
  };
  reworkCount?: number;
  reworkReason?: string;
  project?: {
    id: string;
    name: string;
    status?: string;
    contract?: {
      customer?: {
        name: string;
        phoneNumber?: string;
      };
    };
  };
}

class TaskService {
  async getTasks(filters?: Record<string, any>): Promise<{ data?: TaskItem[]; error?: string }> {
    const res = await apiService.get<TaskItem[]>('/tasks', filters);
    return { data: res.data, error: res.error };
  }

  async getTaskById(id: string): Promise<{ data?: TaskDetail; error?: string }> {
    const res = await apiService.get<TaskDetail>(`/tasks/${id}`);
    return { data: res.data, error: res.error };
  }

  async updateTask(id: string, data: Partial<TaskDetail>): Promise<{ data?: TaskDetail; error?: string }> {
    const res = await apiService.put<TaskDetail>(`/tasks/${id}`, data);
    return { data: res.data, error: res.error };
  }

  async submitTaskResult(
    id: string,
    payload: { link?: string; result?: any }
  ): Promise<{ data?: any; error?: string }> {
    const res = await apiService.patch(`/tasks/${id}/submit-result`, payload);
    return { data: res.data, error: res.error };
  }
}

export const taskService = new TaskService();
