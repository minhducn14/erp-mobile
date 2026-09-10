/**
 * TanStack Query Key Factory - Complete ERP Mobile Coverage
 * Hierarchical query keys for cache management, fetching & real-time invalidation.
 */
export const queryKeys = {
  // Auth & Profile
  auth: {
    user: ['auth', 'user'] as const,
    permissions: ['auth', 'permissions'] as const,
  },

  // Dashboard & Home Metrics
  dashboard: {
    all: ['dashboard'] as const,
    summary: (params?: { month?: number; year?: number }) => [...queryKeys.dashboard.all, params || {}] as const,
  },

  // Opportunities / Cơ hội kinh doanh
  opportunities: {
    all: ['opportunities'] as const,
    lists: () => [...queryKeys.opportunities.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.opportunities.lists(), filters || {}] as const,
    details: () => [...queryKeys.opportunities.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.opportunities.details(), id] as const,
  },

  // Quotations / Báo giá
  quotations: {
    all: ['quotations'] as const,
    lists: () => [...queryKeys.quotations.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.quotations.lists(), filters || {}] as const,
    details: () => [...queryKeys.quotations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.quotations.details(), id] as const,
  },

  // Customers / Khách hàng
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.customers.lists(), filters || {}] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
  },

  // Contracts / Hợp đồng
  contracts: {
    all: ['contracts'] as const,
    lists: () => [...queryKeys.contracts.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.contracts.lists(), filters || {}] as const,
    details: () => [...queryKeys.contracts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.contracts.details(), id] as const,
  },

  // Projects / Dự án
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.projects.lists(), filters || {}] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
    productDescriptions: (projectId: string) => [...queryKeys.projects.detail(projectId), 'product-descriptions'] as const,
  },

  // Tasks / Công việc
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.tasks.lists(), filters || {}] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
  },

  // Acceptances / Nghiệm thu
  acceptances: {
    all: ['acceptances'] as const,
    lists: () => [...queryKeys.acceptances.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.acceptances.lists(), filters || {}] as const,
    details: () => [...queryKeys.acceptances.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.acceptances.details(), id] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    unread: ['notifications', 'unread'] as const,
  },
};
