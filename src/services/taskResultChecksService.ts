import { apiService } from './api';

export type ResultCheckKind = 'SPELL' | 'QC';

export interface SpellCheckResultItem {
  id: string;
  token: string;
  location: string;
  confirmed: boolean;
}

export interface QcMismatchResultItem {
  id: string;
  sheet_name?: string;
  product_ref?: string;
  attribute: string;
  claimed_value?: string;
  expected_value?: string;
  reasoning?: string;
  confirmed: boolean;
}

export interface TaskResultCheckRecord {
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'ERROR';
  errorMessage?: string;
  finalizedAt?: string;
  reviewerWhitelist?: string[];
  reviewedSpellErrors?: SpellCheckResultItem[];
  reviewedQcMismatches?: QcMismatchResultItem[];
}

class TaskResultChecksService {
  async getByTask(taskId: string): Promise<{ data?: TaskResultCheckRecord | null; error?: string }> {
    const res = await apiService.get<TaskResultCheckRecord>(`/task-result-checks/task/${taskId}`);
    return { data: res.data ?? null, error: res.error };
  }

  async toggleItem(
    taskId: string,
    kind: ResultCheckKind,
    itemId: string,
    confirmed: boolean
  ): Promise<{ data?: any; error?: string }> {
    const res = await apiService.patch(`/task-result-checks/task/${taskId}/toggle`, {
      kind,
      itemId,
      confirmed,
    });
    return { data: res.data, error: res.error };
  }

  async toggleItems(
    taskId: string,
    kind: ResultCheckKind,
    itemIds: string[],
    confirmed: boolean
  ): Promise<{ data?: any; error?: string }> {
    const res = await apiService.patch(`/task-result-checks/task/${taskId}/toggle-bulk`, {
      kind,
      itemIds,
      confirmed,
    });
    return { data: res.data, error: res.error };
  }

  async finalize(taskId: string): Promise<{ data?: any; error?: string }> {
    const res = await apiService.post(`/task-result-checks/task/${taskId}/finalize`, {});
    return { data: res.data, error: res.error };
  }

  async rerun(taskId: string, kind: ResultCheckKind, whitelist: string[]): Promise<{ data?: any; error?: string }> {
    const res = await apiService.patch(`/task-result-checks/task/${taskId}/rerun`, {
      kind,
      whitelist,
    });
    return { data: res.data, error: res.error };
  }
}

export const taskResultChecksService = new TaskResultChecksService();
