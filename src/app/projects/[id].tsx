import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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
import { ProjectDetailItem, PROJECT_STATUS_CONFIG } from '@/services/projectService';
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
import {
  useProjectDetailQuery,
  useConfirmProjectMutation,
  useRemoveTeamMemberMutation,
} from '@/hooks/queries/useProjects';
import { useTasksByProjectQuery } from '@/hooks/queries/useTasks';
import { useAcceptancesQuery } from '@/hooks/queries/useAcceptances';

type TabKey = 'OVERVIEW' | 'TASKS' | 'ACCEPTANCE';

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('OVERVIEW');

  // TanStack Query for Project Detail
  const {
    data: projectData,
    isLoading: isProjectLoading,
    isFetching: isProjectFetching,
    refetch: refetchProject,
  } = useProjectDetailQuery(String(id || ''));

  const confirmProjectMutation = useConfirmProjectMutation();
  const removeTeamMemberMutation = useRemoveTeamMemberMutation();

  const { data: tasksData, isLoading: isLoadingTasks, refetch: refetchTasks } = useTasksByProjectQuery(String(id || ''));
  const tasks: TaskDetail[] = tasksData || [];

  const { data: acceptancesData, isLoading: isLoadingAcceptances, refetch: refetchAcceptances } = useAcceptancesQuery({ projectId: String(id || '') });
  const acceptances: AcceptanceItem[] = acceptancesData || [];

  const project: ProjectDetailItem | null = projectData || null;
  const isLoading = isProjectLoading;
  const isRefreshing = isProjectFetching;

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
            await removeTeamMemberMutation.mutateAsync({
              teamId: project.team!.id,
              memberId,
            });
            Alert.alert('Thành công', 'Đã xóa nhân sự khỏi đội dự án.');
            loadProjectDetail();
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
      refetchTasks();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi chấp nhận dự án.');
    } finally {
      setIsConfirming(false);
    }
  };

  const loadProjectDetail = useCallback(() => {
    refetchProject();
  }, [refetchProject]);

  const loadTasks = useCallback(() => {
    refetchTasks();
  }, [refetchTasks]);

  const loadAcceptances = useCallback(() => {
    refetchAcceptances();
  }, [refetchAcceptances]);

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
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200 gap-2">
          <TouchableOpacity className="w-[38px] h-[38px] rounded-xl bg-slate-100 items-center justify-center" onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-slate-900">Chi tiết dự án</Text>
          <View className="w-10" />
        </View>
        <View className="flex-1 justify-center items-center gap-2.5">
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text className="text-[13px] text-slate-400">Đang tải chi tiết dự án...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = getStatusBadge(project?.status);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200 gap-2">
        <TouchableOpacity className="w-[38px] h-[38px] rounded-xl bg-slate-100 items-center justify-center" onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View className="flex-1">
          <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
            {project?.name || 'Chi tiết Dự án'}
          </Text>
          {project?.code && <Text className="text-[11px] text-slate-500 font-semibold">#{project.code}</Text>}
        </View>

        <View className="px-2 py-1 rounded-md" style={{ backgroundColor: statusInfo.bg }}>
          <Text className="text-[11px] font-bold" style={{ color: statusInfo.color }}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View className="flex-row bg-white border-b border-slate-200 px-2">
        <TouchableOpacity
          className={`flex-1 items-center py-3 border-b-2 ${activeTab === 'OVERVIEW' ? 'border-primary' : 'border-transparent'}`}
          onPress={() => setActiveTab('OVERVIEW')}
          activeOpacity={0.7}
        >
          <Text className={`text-[13px] ${activeTab === 'OVERVIEW' ? 'text-primary font-bold' : 'text-slate-500 font-semibold'}`}>
            Tổng quan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 items-center py-3 border-b-2 ${activeTab === 'TASKS' ? 'border-primary' : 'border-transparent'}`}
          onPress={() => setActiveTab('TASKS')}
          activeOpacity={0.7}
        >
          <Text className={`text-[13px] ${activeTab === 'TASKS' ? 'text-primary font-bold' : 'text-slate-500 font-semibold'}`}>
            Công việc ({tasks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 items-center py-3 border-b-2 ${activeTab === 'ACCEPTANCE' ? 'border-primary' : 'border-transparent'}`}
          onPress={() => setActiveTab('ACCEPTANCE')}
          activeOpacity={0.7}
        >
          <Text className={`text-[13px] ${activeTab === 'ACCEPTANCE' ? 'text-primary font-bold' : 'text-slate-500 font-semibold'}`}>
            Nghiệm thu ({acceptances.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: activeTab === 'TASKS' && isSelectMode ? 90 : 30 }}
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
        <View className="absolute bottom-5 left-4 right-4 flex-row justify-between items-center bg-slate-900 px-4 py-3 rounded-2xl z-50">
          <TouchableOpacity
            className="py-1.5 px-2"
            onPress={handleSelectAllTasks}
            activeOpacity={0.7}
          >
            <Text className="text-[13px] font-semibold text-slate-400">
              {selectedTaskIds.length > 0 && selectedTaskIds.length === assignableTasks.length
                ? 'Bỏ chọn tất cả'
                : 'Chọn tất cả'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-row items-center gap-2 bg-primary px-4 py-2.5 rounded-xl ${selectedTaskIds.length === 0 ? 'opacity-50' : ''}`}
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
            <Text className="text-[13px] font-bold text-white">
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
