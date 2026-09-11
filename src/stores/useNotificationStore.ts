import { create } from 'zustand';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
  data?: Record<string, any>;
}

interface NotificationStore {
  notifications: NotificationItem[];
  unreadCount: number;

  addNotification: (item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (item) =>
    set((state) => {
      const newItem: NotificationItem = {
        ...item,
        id: String(Date.now()),
        createdAt: new Date().toISOString(),
        read: false,
      };
      const nextList = [newItem, ...state.notifications];
      return {
        notifications: nextList,
        unreadCount: state.unreadCount + 1,
      };
    }),

  markAsRead: (id) =>
    set((state) => {
      const nextList = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: nextList,
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  clearNotifications: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),
}));
