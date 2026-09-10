export const MODULE_EVENTS = {
  // QUOTATION
  QUOTATION_CREATED: 'quotation_created',
  QUOTATION_UPDATED: 'quotation_updated',
  QUOTATION_APPROVED: 'quotation_approved',
  QUOTATION_REJECTED: 'quotation_rejected',
  QUOTATION_DELETED: 'quotation_deleted',

  // OPPORTUNITY
  OPPORTUNITY_CREATED: 'opportunity_created',
  OPPORTUNITY_UPDATED: 'opportunity_updated',
  OPPORTUNITY_APPROVED: 'opportunity_approved',
  OPPORTUNITY_DELETED: 'opportunity_deleted',

  // TASK
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_STATUS_CHANGED: 'task_status_changed',
  TASK_DELETED: 'task_deleted',

  // TASK REVIEW
  TASK_REVIEW_UPDATED: 'task_review_updated',

  // CONTRACT
  CONTRACT_CREATED: 'contract_created',
  CONTRACT_UPDATED: 'contract_updated',
  CONTRACT_SIGNED: 'contract_signed',
  CONTRACT_REJECTED: 'contract_rejected',
  CONTRACT_DELETED: 'contract_deleted',

  // PROJECT
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_DELETED: 'project_deleted',
} as const;

export type ModuleEventName = typeof MODULE_EVENTS[keyof typeof MODULE_EVENTS];

/**
 * Maps each Module Event to its corresponding Invalidation Tags (UI & Mobile)
 */
export const EVENT_TO_TAGS_MAP: Record<string, string[]> = {
  [MODULE_EVENTS.OPPORTUNITY_CREATED]: ['Opportunities'],
  [MODULE_EVENTS.OPPORTUNITY_UPDATED]: ['Opportunities'],
  [MODULE_EVENTS.OPPORTUNITY_APPROVED]: ['Opportunities'],
  [MODULE_EVENTS.OPPORTUNITY_DELETED]: ['Opportunities'],

  [MODULE_EVENTS.QUOTATION_CREATED]: ['Quotations', 'Opportunities'],
  [MODULE_EVENTS.QUOTATION_UPDATED]: ['Quotations', 'Opportunities'],
  [MODULE_EVENTS.QUOTATION_APPROVED]: ['Quotations', 'Opportunities', 'Contracts'],
  [MODULE_EVENTS.QUOTATION_REJECTED]: ['Quotations', 'Opportunities'],
  [MODULE_EVENTS.QUOTATION_DELETED]: ['Quotations', 'Opportunities'],

  [MODULE_EVENTS.TASK_CREATED]: ['Tasks', 'Projects'],
  [MODULE_EVENTS.TASK_UPDATED]: ['Tasks', 'Projects', 'Contracts'],
  [MODULE_EVENTS.TASK_STATUS_CHANGED]: ['Tasks', 'Projects', 'TaskReviews'],
  [MODULE_EVENTS.TASK_DELETED]: ['Tasks', 'Projects'],

  [MODULE_EVENTS.CONTRACT_CREATED]: ['Contracts', 'Opportunities'],
  [MODULE_EVENTS.CONTRACT_UPDATED]: ['Contracts'],
  [MODULE_EVENTS.CONTRACT_SIGNED]: ['Contracts', 'PaymentMilestones', 'Debts'],
  [MODULE_EVENTS.CONTRACT_REJECTED]: ['Contracts', 'Opportunities'],
  [MODULE_EVENTS.CONTRACT_DELETED]: ['Contracts'],

  [MODULE_EVENTS.PROJECT_CREATED]: ['Projects', 'Contracts'],
  [MODULE_EVENTS.PROJECT_UPDATED]: ['Projects'],
  [MODULE_EVENTS.PROJECT_DELETED]: ['Projects'],

  [MODULE_EVENTS.TASK_REVIEW_UPDATED]: ['TaskReviews', 'Tasks'],
};
