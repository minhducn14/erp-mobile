import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { TaskDetail, TASK_STATUS_CONFIG } from '@/services/taskService';
import { BrandColors } from '@/constants/colors';

interface ProjectTasksTabProps {
  tasks: TaskDetail[];
  isLoading: boolean;
  projectStatus?: string;
  isPmOrAdmin?: boolean;
  isSelectMode?: boolean;
  selectedTaskIds?: string[];
  onToggleSelectMode?: () => void;
  onToggleSelectTask?: (taskId: string) => void;
  onToggleSelectGroup?: (groupTasks: TaskDetail[]) => void;
  onOpenUpdateTask?: (task: TaskDetail) => void;
  onAssignTask?: (task: TaskDetail | TaskDetail[]) => void;
  onOpenAddExtraTask: () => void;
}

export default function ProjectTasksTab({
  tasks,
  isLoading,
  projectStatus,
  isPmOrAdmin = false,
  isSelectMode: propIsSelectMode,
  selectedTaskIds: propSelectedTaskIds,
  onToggleSelectMode,
  onToggleSelectTask,
  onToggleSelectGroup,
  onOpenUpdateTask,
  onAssignTask,
  onOpenAddExtraTask,
}: ProjectTasksTabProps) {
  const router = useRouter();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [internalIsSelectMode, setInternalIsSelectMode] = useState<boolean>(false);
  const [internalSelectedTaskIds, setInternalSelectedTaskIds] = useState<string[]>([]);

  const isSelectMode = propIsSelectMode !== undefined ? propIsSelectMode : internalIsSelectMode;
  const selectedTaskIds = propSelectedTaskIds !== undefined ? propSelectedTaskIds : internalSelectedTaskIds;

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const isTaskAssignable = (t: TaskDetail): boolean => {
    if (t.assigneeId || (t as any).assignee?.id) return false;
    const st = t.status || 'PENDING';
    return ['PENDING', 'REJECTED', 'AWAITING_SUPPORT'].includes(st);
  };

  const assignableTasks = useMemo(() => tasks.filter(isTaskAssignable), [tasks]);

  const toggleSelectTask = (taskId: string) => {
    if (onToggleSelectTask) {
      onToggleSelectTask(taskId);
    } else {
      setInternalSelectedTaskIds((prev) =>
        prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
      );
    }
  };

  // Automatically clear selectedTaskIds for tasks that are no longer assignable (e.g. assigned individually or after bulk assign)
  useEffect(() => {
    setInternalSelectedTaskIds((prev) =>
      prev.filter((id) => {
        const t = tasks.find((item) => item.id === id);
        return t ? isTaskAssignable(t) : false;
      })
    );
  }, [tasks]);

  const handleSelectAll = () => {
    if (selectedTaskIds.length === assignableTasks.length) {
      if (propSelectedTaskIds !== undefined) {
        // Handled by parent
      } else {
        setInternalSelectedTaskIds([]);
      }
    } else {
      if (propSelectedTaskIds !== undefined) {
        // Handled by parent
      } else {
        setInternalSelectedTaskIds(assignableTasks.map((t) => t.id));
      }
    }
  };

  const toggleSelectGroup = (groupTasks: TaskDetail[]) => {
    if (onToggleSelectGroup) {
      onToggleSelectGroup(groupTasks);
      return;
    }

    const groupAssignable = groupTasks.filter(isTaskAssignable);
    if (groupAssignable.length === 0) return;

    const assignableIds = groupAssignable.map((t) => t.id);
    const isAllGroupSelected = assignableIds.every((id) => selectedTaskIds.includes(id));

    if (isAllGroupSelected) {
      setInternalSelectedTaskIds((prev) => prev.filter((id) => !assignableIds.includes(id)));
    } else {
      setInternalSelectedTaskIds((prev) => Array.from(new Set([...prev, ...assignableIds])));
    }
  };

  const handleBulkAssignClick = () => {
    const selectedList = tasks.filter((t) => selectedTaskIds.includes(t.id));
    if (selectedList.length === 0) return;
    onAssignTask?.(selectedList);
  };

  const isPendingConfirmation = projectStatus === 'PENDING_CONFIRMATION';

  const getStatusBadge = (status?: string) => {
    const stKey = status || 'PENDING';
    const config = TASK_STATUS_CONFIG[stKey];
    return {
      bg: config?.bg || '#F1F5F9',
      color: config?.color || '#64748B',
      label: config?.text || stKey,
    };
  };

  const groupedTasks = useMemo(() => {
    const groups: Record<string, { jobName: string; tasks: TaskDetail[] }> = {};
    const extraTasks: TaskDetail[] = [];

    tasks.forEach((t) => {
      if (t.isExtraTask) {
        extraTasks.push(t);
        return;
      }

      const jobId = (t as any).job?.id || (t as any).jobId || 'contract_default';
      const jobName = (t as any).job?.name || 'Hạng mục hợp đồng';

      if (!groups[jobId]) {
        groups[jobId] = { jobName, tasks: [] };
      }
      groups[jobId].tasks.push(t);
    });

    const groupList = Object.keys(groups)
      .map((key) => ({
        id: key,
        jobName: groups[key].jobName,
        tasks: groups[key].tasks.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true })),
      }))
      .sort((a, b) => a.jobName.localeCompare(b.jobName, 'vi'));

    if (extraTasks.length > 0) {
      groupList.push({
        id: 'extra_tasks',
        jobName: 'Công việc phát sinh ngoài HĐ',
        tasks: extraTasks.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true })),
      });
    }

    return groupList;
  }, [tasks]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Đang tải danh sách công việc...</Text>
      </View>
    );
  }

  const renderTaskItem = (item: TaskDetail) => {
    const statusInfo = getStatusBadge(item.status);
    const progress = item.progress ?? (item.status === 'DONE' ? 100 : 0);

    const isUnassigned = !item.assigneeId && (item.status === 'PENDING' || item.status === 'AWAITING_SUPPORT');
    const isAssigned = ['DOING', 'REWORKING', 'OVERDUE', 'REJECTED'].includes(item.status || '');
    const canAssign = isTaskAssignable(item);
    const isSelected = selectedTaskIds.includes(item.id);

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.taskCard,
          isSelected && styles.taskCardSelected,
          isSelectMode && !canAssign && { opacity: 0.55 },
        ]}
        onPress={() => {
          if (isSelectMode) {
            if (canAssign) toggleSelectTask(item.id);
          } else {
            router.push(`/tasks/${item.id}` as any);
          }
        }}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isSelectMode && (
              <TouchableOpacity
                disabled={!canAssign}
                onPress={() => canAssign && toggleSelectTask(item.id)}
                style={{ paddingRight: 2 }}
              >
                <Feather
                  name={isSelected ? 'check-square' : canAssign ? 'square' : 'minus-square'}
                  size={18}
                  color={isSelected ? BrandColors.primary : canAssign ? '#94A3B8' : '#CBD5E1'}
                />
              </TouchableOpacity>
            )}
            {item.code ? (
              <View style={styles.codeBadge}>
                <Text style={styles.codeBadgeText}>{item.code}</Text>
              </View>
            ) : null}
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>

          {item.isExtraTask && (
            <View style={styles.extraTag}>
              <Text style={styles.extraTagText}>Phát sinh</Text>
            </View>
          )}
        </View>

        <Text style={styles.taskName}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.taskDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {/* Assignee & Due Date */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather name="user" size={12} color={isUnassigned ? '#D97706' : '#64748B'} />
            <Text style={[styles.metaText, isUnassigned && { color: '#D97706', fontWeight: '700' }]}>
              {item.assignee?.fullName || 'Chưa phân công'}
            </Text>
          </View>
          {item.dueDate && (
            <View style={styles.metaItem}>
              <Feather name="calendar" size={12} color="#64748B" />
              <Text style={styles.metaText}>{item.dueDate}</Text>
            </View>
          )}
        </View>

        {/* Progress Bar & Actions */}
        <View style={styles.cardFooter}>
          <View style={styles.progressBox}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Tiến độ</Text>
              <Text style={styles.progressVal}>{progress}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, Math.max(0, progress))}%` },
                ]}
              />
            </View>
          </View>

          {!isPendingConfirmation && isPmOrAdmin && (
            isUnassigned ? (
              <TouchableOpacity
                style={styles.assignBtn}
                onPress={() => {
                  if (selectedTaskIds.includes(item.id)) {
                    toggleSelectTask(item.id);
                  }
                  onAssignTask?.(item);
                }}
                activeOpacity={0.7}
              >
                <Feather name="user-plus" size={13} color="#FFFFFF" />
                <Text style={styles.assignBtnText}>Phân công</Text>
              </TouchableOpacity>
            ) : isAssigned ? (
              <TouchableOpacity
                style={styles.reassignBtn}
                onPress={() => {
                  if (selectedTaskIds.includes(item.id)) {
                    toggleSelectTask(item.id);
                  }
                  onAssignTask?.(item);
                }}
                activeOpacity={0.7}
              >
                <Feather name="user-check" size={13} color="#D97706" />
                <Text style={styles.reassignBtnText}>Đổi người</Text>
              </TouchableOpacity>
            ) : null
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Pending Confirmation Warning Banner */}
      {isPendingConfirmation && (
        <View style={styles.lockBanner}>
          <Feather name="lock" size={18} color="#C2410C" />
          <View style={{ flex: 1 }}>
            <Text style={styles.lockBannerTitle}>Dự án chưa được PM chấp nhận</Text>
            <Text style={styles.lockBannerDesc}>
              Tất cả các tính năng phân công, tạo việc phát sinh và cập nhật tiến độ đều bị tạm khóa cho đến khi PM chấp nhận dự án.
            </Text>
          </View>
        </View>
      )}

      {/* Top Action Bar */}
      <View style={styles.topBar}>
        <Text style={styles.sectionHeaderTitle}>Hạng mục công việc ({tasks.length})</Text>
        {!isPendingConfirmation && isPmOrAdmin && (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              style={[styles.multiSelectBtn, isSelectMode && styles.multiSelectBtnActive]}
              onPress={() => {
                if (onToggleSelectMode) {
                  onToggleSelectMode();
                } else {
                  setInternalIsSelectMode(!internalIsSelectMode);
                  if (internalIsSelectMode) setInternalSelectedTaskIds([]);
                }
              }}
              activeOpacity={0.8}
            >
              <Feather
                name={isSelectMode ? 'check-square' : 'square'}
                size={13}
                color={isSelectMode ? BrandColors.primary : '#475569'}
              />
              <Text style={[styles.multiSelectBtnText, isSelectMode && styles.multiSelectBtnTextActive]}>
                {isSelectMode ? 'Hủy chọn' : 'Chọn nhiều'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addExtraBtn}
              onPress={onOpenAddExtraTask}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.addExtraBtnText}>Thêm việc</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {tasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="check-square" size={40} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Chưa có công việc nào</Text>
          <Text style={styles.emptyDesc}>
            Dự án này hiện chưa có công việc triển khai. Bấm "Thêm việc phát sinh" để tạo mới.
          </Text>
        </View>
      ) : (
        <View style={styles.listSection}>
          {groupedTasks.map((group) => {
            const isCollapsed = collapsedGroups[group.id];
            return (
              <View key={group.id} style={styles.jobAccordionCard}>
                <TouchableOpacity
                  style={styles.jobAccordionHeader}
                  onPress={() => toggleGroup(group.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.jobAccordionHeaderLeft}>
                    <Feather
                      name={isCollapsed ? 'chevron-right' : 'chevron-down'}
                      size={18}
                      color="#475569"
                    />
                    <Text style={styles.jobAccordionTitle} numberOfLines={1}>
                      {group.jobName}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {isSelectMode && group.tasks.filter(isTaskAssignable).length > 0 && (
                      <TouchableOpacity
                        onPress={() => toggleSelectGroup(group.tasks)}
                        style={styles.groupCheckboxBtn}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name={
                            group.tasks.filter(isTaskAssignable).every((t) => selectedTaskIds.includes(t.id))
                              ? 'check-square'
                              : 'square'
                          }
                          size={14}
                          color={BrandColors.primary}
                        />
                        <Text style={styles.groupCheckboxText}>Chọn nhóm</Text>
                      </TouchableOpacity>
                    )}

                    <View style={styles.jobCountBadge}>
                      <Text style={styles.jobCountBadgeText}>{group.tasks.length} việc</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {!isCollapsed && (
                  <View style={styles.jobAccordionBody}>
                    {group.tasks.map(renderTaskItem)}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 90,
    gap: 12,
    position: 'relative',
  },
  groupCheckboxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  groupCheckboxText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  bulkActionBarFloating: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 9999,
  },
  multiSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  multiSelectBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: BrandColors.primary,
  },
  multiSelectBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  multiSelectBtnTextActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  taskCardSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: '#F0FDFA',
  },
  bulkActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 12,
  },
  selectAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  bulkAssignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bulkAssignBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  addExtraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addExtraBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listSection: {
    gap: 10,
  },
  jobAccordionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  jobAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  jobAccordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  jobAccordionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  jobCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  jobCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  jobAccordionBody: {
    padding: 10,
    gap: 10,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  extraTag: {
    backgroundColor: '#FEF3C7',
    borderWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  extraTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  taskName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  taskDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  progressBox: {
    flex: 1,
    gap: 2,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 10,
    color: '#94A3B8',
  },
  progressVal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: BrandColors.primary,
    borderRadius: 2,
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  assignBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reassignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  reassignBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 260,
  },
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    padding: 12,
    borderRadius: 12,
  },
  lockBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C2410C',
  },
  lockBannerDesc: {
    fontSize: 11,
    color: '#9A3412',
    lineHeight: 16,
    marginTop: 2,
  },
});
