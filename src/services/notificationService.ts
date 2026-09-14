import { apiService } from './api';

type NotificationType = 'TASK' | 'CONTRACT' | 'ACCEPTANCE' | 'FINANCE' | 'SYSTEM';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  targetId?: string;
  createdAt: string;
}

interface NotificationApiItem {
  id: string;
  title: string;
  content: string;
  type?: string;
  isRead: boolean;
  relatedEntityId?: string;
  relatedEntityType?: string;
  createdAt: string;
}

const getNotificationType = (notification: NotificationApiItem): NotificationType => {
  const entityType = notification.relatedEntityType?.toUpperCase() ?? '';
  const eventType = notification.type?.toUpperCase() ?? '';

  if (entityType === 'TASK' || eventType.startsWith('TASK_')) return 'TASK';
  if (entityType === 'CONTRACT' || eventType.startsWith('CONTRACT_')) return 'CONTRACT';
  if (entityType === 'ACCEPTANCEREQUEST' || eventType.startsWith('ACCEPTANCE_')) return 'ACCEPTANCE';
  if (entityType === 'FINANCE' || eventType.startsWith('FINANCE_')) return 'FINANCE';
  return 'SYSTEM';
};

class NotificationService {
  async getNotifications(): Promise<{ data?: NotificationItem[]; error?: string }> {
    const res = await apiService.get<NotificationApiItem[]>('/notifications/me');
    if (res.error) {
      return { error: res.error };
    }

    return {
      data: (res.data ?? []).map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.content,
        type: getNotificationType(notification),
        isRead: notification.isRead,
        targetId: notification.relatedEntityId,
        createdAt: notification.createdAt,
      })),
    };
  }

  async markAsRead(id: string): Promise<{ success: boolean; error?: string }> {
    const res = await apiService.put<NotificationApiItem>(`/notifications/${id}/read`, {});
    return { success: !res.error, error: res.error };
  }

  async markAllAsRead(ids: string[]): Promise<{ success: boolean; error?: string }> {
    const results = await Promise.all(ids.map((id) => this.markAsRead(id)));
    const failedResult = results.find((result) => !result.success);
    return failedResult ?? { success: true };
  }
}

export const notificationService = new NotificationService();
