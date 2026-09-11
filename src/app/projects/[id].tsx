import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { isManagementRole } from '@/utils/rbac';
import {
  projectService,
  ProjectDetailItem,
  PROJECT_STATUS_CONFIG,
} from '@/services/projectService';
import { taskService, TaskDetail } from '@/services/taskService';
import { acceptanceService, AcceptanceItem } from '@/services/acceptanceService';
import { BrandColors } from '@/constants/colors';

import { teamService } from '@/services/teamService';
import ProjectOverviewTab from '@/components/projects/ProjectOverviewTab';
import ProjectTasksTab from '@/components/projects/ProjectTasksTab';
import ProjectAcceptanceTab from '@/components/projects/ProjectAcceptanceTab';

import AssignPmModal from '@/components/projects/AssignPmModal';
import TaskUpdateModal from '@/components/projects/TaskUpdateModal';
import AddExtraTaskModal from '@/components/projects/AddExtraTaskModal';
import CreateAcceptanceModal from '@/components/projects/CreateAcceptanceModal';
import AcceptanceReviewModal from '@/components/projects/AcceptanceReviewModal';
import AddTeamMemberModal from '@/components/projects/AddTeamMemberModal';
import EditTeamMemberRoleModal from '@/components/projects/EditTeamMemberRoleModal';
import TaskAssignModal from '@/components/projects/TaskAssignModal';
import { useSSERefresh } from '@/hooks/useSSERefresh';
import { useProjectDetailQuery, useConfirmProjectMutation } from '@/hooks/queries/useProjects';

type TabKey = 'OVERVIEW' | 'TASKS' | 'ACCEPTANCE';

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('OVERVIEW');
  const [tasks, setTasks] = useState<TaskDetail[]>([]);
  const [acceptances, setAcceptances] = useState<AcceptanceItem[]>([]);

  // TanStack Query for Project Detail
  const {
    data: projectData,
    isLoading: isProjectLoading,
    isFetching: isProjectFetching,
    refetch: refetchProject,
  } = useProjectDetailQuery(String(id || ''));

  const confirmProjectMutation = useConfirmProjectMutation();

  const project: ProjectDetailItem | null = projectData || null;
  const isLoading = isProjectLoading;
  const isRefreshing = isProjectFetching;
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoadingAcceptances, setIsLoadingAcceptances] = useState(false);

  // Modal & Confirm States
  const [showAssignPm, setShowAssignPm] = useState(false);
  const [showTaskUpdate, setShowTaskUpdate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [assigningTask, setAssigningTask] = useState<TaskDetail | TaskDetail[] | null>(null);
  const [showAssignTask, setShowAssignTask] = useState(false);
  const [showAddExtraTask, setShowAddExtraTask] = useState(false);
  const [showCreateAcceptance, setShowCreateAcceptance] = useState(false);
  const [showReviewAcceptance, setShowReviewAcceptance] = useState(false);
  const [reviewingAcceptance, setReviewingAcceptance] = useState<AcceptanceItem | null>(null);
  const [showAddTeamMember, setShowAddTeamMember] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [showEditMemberRole, setShowEditMemberRole] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Multi-select task state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // RBAC & Permission Calculations
  const isAdminOrBod = isManagementRole(user?.role);
  const assignedPmId =
    project?.projectManager?.id ||
    project?.team?.members?.find((m) => m.role === 'PROJECT_MANAGER' || m.role === 'PM')?.user?.id;
  const isAssignedPm = !!user?.id && !!assignedPmId && assignedPmId === user.id;
  const leadUser =
    project?.team?.teamLead ||
    project?.team?.members?.find(
      (m) => (m.role === 'LEAD' || m.role === 'ACCOUNT' || m.role === 'TEAM_LEAD') && m.user?.id !== assignedPmId
    )?.user;
  const isCurrentTeamLead = !!user?.id && !!leadUser?.id && user.id === leadUser.id;
  const isAdmin = user?.role === 'ADMIN';
  const canAssignPm = isAdminOrBod;
  const canConfirmProject =
    (isAdmin || isCurrentTeamLead) && project?.status === 'PENDING_CONFIRMATION';
  const isPmOrAdmin = isAdminOrBod || isAssignedPm;

  // Can manage team members if Admin/BOD/PM/Lead, AND project has a PM assigned
  const canManageTeam =
    (isAdminOrBod || isAssignedPm || isCurrentTeamLead) && !!assignedPmId;

  const handleRemoveMember = async (memberId: string) => {
    if (!project?.team?.id) return;
    Alert.alert('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa nhân sự này khỏi đội dự án?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await teamService.removeTeamMember(project.team!.id, memberId);
            if (res.error) {
              Alert.alert('Lỗi', res.error);
            } else {
              Alert.alert('Thành công', 'Đã xóa nhân sự khỏi đội dự án.');
              loadProjectDetail();
            }
          } catch (err: any) {
            Alert.alert('Lỗi', err?.message || 'Không thể xóa nhân sự.');
          }
        },
      },
    ]);
  };


  const handleConfirmProject = async () => {
    if (!id) return;
    setIsConfirming(true);
    try {
      await confirmProjectMutation.mutateAsync(id);
      Alert.alert('Thành công', 'Đã chấp nhận dự án thành công.');
      loadTasks();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi chấp nhận dự án.');
    } finally {
      setIsConfirming(false);
    }
  };

  const loadProjectDetail = useCallback(() => {
    refetchProject();
  }, [refetchProject]);

  const loadTasks = useCallback(async () => {
    if (!id) return;
    setIsLoadingTasks(true);
    try {
      const res = await taskService.getTasksByProject(id);
      if (res.data && Array.isArray(res.data)) {
        setTasks(res.data);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingTasks(false);
    }
  }, [id]);

  const loadAcceptances = useCallback(async () => {
    if (!id) return;
    setIsLoadingAcceptances(true);
    try {
      console.log(id);
      const res = await acceptanceService.getAcceptanceRequests(id);
      if (res.data && Array.isArray(res.data)) {
        setAcceptances(res.data);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingAcceptances(false);
    }
  }, [id]);

  useEffect(() => {
    loadTasks();
    loadAcceptances();
  }, [loadTasks, loadAcceptances]);

  useSSERefresh('invalidate_Projects', refetchProject);
  useSSERefresh(['invalidate_Tasks', 'invalidate_TaskReviews'], loadTasks);

  const isTaskAssignable = useCallback((t: TaskDetail): boolean => {
    if (t.assigneeId || (t as any).assignee?.id) return false;
    const st = t.status || 'PENDING';
    return ['PENDING', 'REJECTED', 'AWAITING_SUPPORT'].includes(st);
  }, []);

  const assignableTasks = useMemo(() => tasks.filter(isTaskAssignable), [tasks, isTaskAssignable]);

  // Clean up selectedTaskIds whenever tasks list changes
  useEffect(() => {
    setSelectedTaskIds((prev) =>
      prev.filter((id) => {
        const t = tasks.find((item) => item.id === id);
        return t ? isTaskAssignable(t) : false;
      })
    );
  }, [tasks, isTaskAssignable]);

  const handleToggleSelectTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleToggleSelectGroup = (groupTasks: TaskDetail[]) => {
    const groupAssignable = groupTasks.filter(isTaskAssignable);
    if (groupAssignable.length === 0) return;

    const assignableIds = groupAssignable.map((t) => t.id);
    const isAllGroupSelected = assignableIds.every((id) => selectedTaskIds.includes(id));

    if (isAllGroupSelected) {
      setSelectedTaskIds((prev) => prev.filter((id) => !assignableIds.includes(id)));
    } else {
      setSelectedTaskIds((prev) => Array.from(new Set([...prev, ...assignableIds])));
    }
  };

  const handleSelectAllTasks = () => {
    if (selectedTaskIds.length === assignableTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(assignableTasks.map((t) => t.id));
    }
  };

  const handleRefresh = () => {
    refetchProject();
    loadTasks();
    loadAcceptances();
  };

  const getStatusBadge = (status?: string) => {
    const stKey = status || 'PENDING_CONFIRMATION';
    const config = PROJECT_STATUS_CONFIG[stKey];
    return {
      bg: config?.bg || '#F1F5F9',
      color: config?.color || '#64748B',
      label: config?.text || stKey,
    };
  };

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'DONE' || t.status === 'COMPLETED' || t.status === 'ACCEPTED').length,
    doing: tasks.filter((t) => t.status === 'DOING' || t.status === 'AWAITING_REVIEW').length,
    pending: tasks.filter((t) => t.status === 'PENDING').length,
  };

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết dự án</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải chi tiết dự án...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = getStatusBadge(project?.status);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {project?.name || 'Chi tiết Dự án'}
          </Text>
          {project?.code && <Text style={styles.headerSubTitle}>#{project.code}</Text>}
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'OVERVIEW' && styles.tabItemActive]}
          onPress={() => setActiveTab('OVERVIEW')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'OVERVIEW' && styles.tabTextActive]}>
            Tổng quan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'TASKS' && styles.tabItemActive]}
          onPress={() => setActiveTab('TASKS')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'TASKS' && styles.tabTextActive]}>
            Công việc ({tasks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ACCEPTANCE' && styles.tabItemActive]}
          onPress={() => setActiveTab('ACCEPTANCE')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'ACCEPTANCE' && styles.tabTextActive]}>
            Nghiệm thu ({acceptances.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          activeTab === 'TASKS' && isSelectMode && { paddingBottom: 90 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[BrandColors.primary]}
            tintColor={BrandColors.primary}
          />
        }
      >
        {activeTab === 'OVERVIEW' && project && (
          <ProjectOverviewTab
            project={project}
            user={user}
            onOpenAssignPm={() => setShowAssignPm(true)}
            onConfirmProject={handleConfirmProject}
            isConfirming={isConfirming}
            canAssignPm={canAssignPm}
            canConfirmProject={canConfirmProject}
            taskStats={taskStats}
            onOpenAddMember={() => setShowAddTeamMember(true)}
            onRemoveMember={handleRemoveMember}
            onEditMemberRole={(m) => {
              setEditingMember(m);
              setShowEditMemberRole(true);
            }}
            canManageTeam={canManageTeam}
          />
        )}

        {activeTab === 'TASKS' && (
          <ProjectTasksTab
            tasks={tasks}
            isLoading={isLoadingTasks}
            projectStatus={project?.status}
            isPmOrAdmin={isPmOrAdmin}
            isSelectMode={isSelectMode}
            selectedTaskIds={selectedTaskIds}
            onToggleSelectMode={() => {
              setIsSelectMode((prev) => !prev);
              if (isSelectMode) setSelectedTaskIds([]);
            }}
            onToggleSelectTask={handleToggleSelectTask}
            onToggleSelectGroup={handleToggleSelectGroup}
            onOpenUpdateTask={(t) => {
              setSelectedTask(t);
              setShowTaskUpdate(true);
            }}
            onAssignTask={(t) => {
              if (!Array.isArray(t)) {
                setSelectedTaskIds((prev) => prev.filter((id) => id !== t.id));
              }
              setAssigningTask(t);
              setShowAssignTask(true);
            }}
            onOpenAddExtraTask={() => setShowAddExtraTask(true)}
          />
        )}

        {activeTab === 'ACCEPTANCE' && (
          <ProjectAcceptanceTab
            acceptances={acceptances}
            isLoading={isLoadingAcceptances}
            projectStatus={project?.status}
            isPmOrAdmin={isPmOrAdmin||isCurrentTeamLead}
            onOpenCreateAcceptance={() => setShowCreateAcceptance(true)}
            onOpenReviewAcceptance={(item) => {
              setReviewingAcceptance(item);
              setShowReviewAcceptance(true);
            }}
          />
        )}
      </ScrollView>

      {/* Floating Bulk Action Bar - Fixed at screen bottom */}
      {activeTab === 'TASKS' && isSelectMode && (
        <View style={styles.floatingBulkActionBar}>
          <TouchableOpacity
            style={styles.selectAllBtn}
            onPress={handleSelectAllTasks}
            activeOpacity={0.7}
          >
            <Text style={styles.selectAllText}>
              {selectedTaskIds.length > 0 && selectedTaskIds.length === assignableTasks.length
                ? 'Bỏ chọn tất cả'
                : 'Chọn tất cả'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.bulkAssignBtn,
              selectedTaskIds.length === 0 && { opacity: 0.5 },
            ]}
            disabled={selectedTaskIds.length === 0}
            onPress={() => {
              const selectedList = tasks.filter((t) => selectedTaskIds.includes(t.id));
              if (selectedList.length > 0) {
                setAssigningTask(selectedList);
                setShowAssignTask(true);
              }
            }}
            activeOpacity={0.8}
          >
            <Feather name="users" size={15} color="#FFFFFF" />
            <Text style={styles.bulkAssignBtnText}>
              Phân công {selectedTaskIds.length > 0 ? `(${selectedTaskIds.length}) ` : ''}công việc
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modals */}
      {id && (
        <>
          <AssignPmModal
            visible={showAssignPm}
            onClose={() => setShowAssignPm(false)}
            projectId={id}
            contractId={project?.contract?.id || (project as any)?.contractId || (project as any)?.contract_id}
            currentPmId={assignedPmId}
            onSuccess={() => {
              loadProjectDetail();
            }}
          />

          {project?.team?.id && (
            <AddTeamMemberModal
              visible={showAddTeamMember}
              onClose={() => setShowAddTeamMember(false)}
              teamId={project.team.id}
              existingMemberUserIds={
                project.team.members?.map((m) => m.user?.id).filter((uid): uid is string => !!uid) || []
              }
              existingLeadName={leadUser?.fullName}
              onSuccess={() => {
                loadProjectDetail();
              }}
            />
          )}

          {project?.team?.id && (
            <EditTeamMemberRoleModal
              visible={showEditMemberRole}
              onClose={() => {
                setShowEditMemberRole(false);
                setEditingMember(null);
              }}
              teamId={project.team.id}
              member={editingMember}
              existingLeadName={leadUser?.fullName}
              existingLeadUserId={leadUser?.id}
              onSuccess={() => {
                loadProjectDetail();
              }}
            />
          )}

          <TaskUpdateModal
            visible={showTaskUpdate}
            onClose={() => {
              setShowTaskUpdate(false);
              setSelectedTask(null);
            }}
            task={selectedTask}
            onSuccess={() => {
              loadTasks();
              loadProjectDetail();
            }}
          />

          <TaskAssignModal
            visible={showAssignTask}
            onClose={() => {
              setShowAssignTask(false);
              setAssigningTask(null);
            }}
            task={assigningTask}
            project={project}
            teamMembers={project?.team?.members || []}
            onSuccess={() => {
              loadTasks();
              loadProjectDetail();
              if (Array.isArray(assigningTask)) {
                const assignedIds = assigningTask.map((t) => t.id);
                setSelectedTaskIds((prev) => prev.filter((id) => !assignedIds.includes(id)));
              } else if (assigningTask) {
                setSelectedTaskIds((prev) => prev.filter((id) => id !== assigningTask.id));
              }
            }}
          />

          <AddExtraTaskModal
            visible={showAddExtraTask}
            onClose={() => setShowAddExtraTask(false)}
            projectId={id}
            onSuccess={() => {
              loadTasks();
              loadProjectDetail();
            }}
          />

          <CreateAcceptanceModal
            visible={showCreateAcceptance}
            onClose={() => setShowCreateAcceptance(false)}
            contract={project?.contract}
            projectId={id}
            onSuccess={() => {
              loadAcceptances();
              loadProjectDetail();
            }}
          />

          <AcceptanceReviewModal
            visible={showReviewAcceptance}
            onClose={() => {
              setShowReviewAcceptance(false);
              setReviewingAcceptance(null);
            }}
            request={reviewingAcceptance}
            onSuccess={() => {
              loadAcceptances();
              loadProjectDetail();
            }}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubTitle: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'PlatformMono',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: BrandColors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  floatingBulkActionBar: {
    position: 'absolute',
    bottom: 20,
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 9999,
  },
  selectAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  bulkAssignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  bulkAssignBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
