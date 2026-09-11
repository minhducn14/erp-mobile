import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { taskService, TaskDetail, TASK_STATUS_CONFIG } from '@/services/taskService';
import { BrandColors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import ReworkTaskModal from '@/components/tasks/ReworkTaskModal';
import TaskResultModal from '@/components/tasks/TaskResultModal';
import TaskAssignModal from '@/components/projects/TaskAssignModal';
import TaskReviewModal from '@/components/tasks/TaskReviewModal';
import { useSSERefresh } from '@/hooks/useSSERefresh';
import {
  useTaskDetailQuery,
  useTaskReviewsQuery,
  useUpdateTaskMutation,
  useApproveByCustomerMutation,
  useRequestSupportMutation,
  useRespondToSupportMutation,
  useReturnSupportMutation,
  useRequestReturnSupportMutation,
  useSendTaskReminderMutation,
  useRequestReworkMutation,
} from '@/hooks/queries/useTasks';

const formatDateTimeStr = (dateStr?: string) => {
  if (!dateStr) return 'Chưa thiết lập';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dateFormatted = d.toLocaleDateString('vi-VN');
    const timeFormatted = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `${dateFormatted} - ${timeFormatted}`;
  } catch {
    return dateStr;
  }
};

const formatDateStr = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN');
  } catch {
    return dateStr;
  }
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: taskRes, isLoading: isTaskLoading, refetch: refetchTask } = useTaskDetailQuery(String(id || ''));
  const task: TaskDetail | null = taskRes || null;
  const isLoading = isTaskLoading;

  const { data: reviewsData, refetch: refetchReviews } = useTaskReviewsQuery(String(id || ''));
  const reviews = reviewsData || [];

  // Description inline edit state
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');

  // Modal States
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Mutations
  const updateTaskMutation = useUpdateTaskMutation();
  const approveByCustomerMutation = useApproveByCustomerMutation();
  const requestSupportMutation = useRequestSupportMutation();
  const respondToSupportMutation = useRespondToSupportMutation();
  const returnSupportMutation = useReturnSupportMutation();
  const requestReturnSupportMutation = useRequestReturnSupportMutation();
  const sendTaskReminderMutation = useSendTaskReminderMutation();
  const requestReworkMutation = useRequestReworkMutation();

  const isActionLoading =
    updateTaskMutation.isPending ||
    approveByCustomerMutation.isPending ||
    requestSupportMutation.isPending ||
    respondToSupportMutation.isPending ||
    returnSupportMutation.isPending ||
    requestReturnSupportMutation.isPending ||
    sendTaskReminderMutation.isPending ||
    requestReworkMutation.isPending;

  const isUpdatingDescription = updateTaskMutation.isPending;

  const loadTask = useCallback(() => {
    refetchTask();
    refetchReviews();
  }, [refetchTask, refetchReviews]);

  useSSERefresh(['invalidate_Tasks', 'invalidate_TaskReviews'], loadTask);

  const currentUserId = user?.id;
  const teamLeadId = task?.project?.team?.teamLead?.id;
  const isProjectLead = !!currentUserId && !!teamLeadId && currentUserId === teamLeadId;
  const isManagement = ['ADMIN', 'BOD', 'PM', 'TEAM_LEAD'].includes(user?.role || '');
  const canManageProjectTask = isManagement || isProjectLead;
  const canEditDescription = canManageProjectTask;

  const handleStartEditDescription = () => {
    setEditedDescription(task?.description || '');
    setIsEditingDescription(true);
  };

  const handleSaveDescription = async () => {
    if (!task) return;
    try {
      await updateTaskMutation.mutateAsync({
        id: task.id,
        payload: {
          description: editedDescription,
          projectId: task.project?.id,
        },
      });
      Alert.alert('Thành công', 'Cập nhật mô tả thành công!');
      setIsEditingDescription(false);
      loadTask();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể cập nhật mô tả');
    }
  };

  const handleCustomerApprove = async () => {
    if (!task) return;
    try {
      await approveByCustomerMutation.mutateAsync({
        taskId: task.id,
        projectId: task.project?.id,
      });
      Alert.alert('Thành công', 'Khách hàng đã duyệt công việc!');
      loadTask();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể duyệt');
    }
  };

  const handleRequestSupport = async () => {
    if (!task) return;
    try {
      await requestSupportMutation.mutateAsync({
        taskId: task.id,
        reason: 'Yêu cầu hỗ trợ từ thành viên',
        projectId: task.project?.id,
      });
      Alert.alert('Thành công', 'Đã gửi yêu cầu hỗ trợ!');
      loadTask();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể gửi yêu cầu hỗ trợ');
    }
  };

  const handleRespondSupport = async (action: 'ACCEPT' | 'REJECT') => {
    if (!task) return;
    try {
      await respondToSupportMutation.mutateAsync({
        taskId: task.id,
        action,
        projectId: task.project?.id,
      });
      Alert.alert('Thành công', action === 'ACCEPT' ? 'Đã chấp nhận hỗ trợ' : 'Đã từ chối hỗ trợ');
      loadTask();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Thao tác thất bại');
    }
  };

  const handleReturnSupport = async () => {
    if (!task) return;
    try {
      await returnSupportMutation.mutateAsync({
        taskId: task.id,
        projectId: task.project?.id,
      });
      Alert.alert('Thành công', 'Đã trả lại task cho team gốc.');
      router.back();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể trả lại task');
    }
  };

  const handleRequestReturnSupport = async () => {
    if (!task) return;
    try {
      await requestReturnSupportMutation.mutateAsync({
        taskId: task.id,
        reason: 'Yêu cầu trả lại task',
        projectId: task.project?.id,
      });
      Alert.alert('Thành công', 'Đã gửi yêu cầu trả lại task!');
      loadTask();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Thao tác thất bại');
    }
  };

  const handleSendReminder = async () => {
    if (!task) return;
    try {
      await sendTaskReminderMutation.mutateAsync(task.id);
      Alert.alert('Thành công', 'Đã gửi nhắc nhở công việc!');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Gửi nhắc nhở thất bại');
    }
  };

  const handleReworkSubmit = async (data: { feedback: string; deadlineAt: string; attachments: any[] }) => {
    if (!task) return;
    try {
      await requestReworkMutation.mutateAsync({
        id: task.id,
        payload: {
          feedback: data.feedback,
          deadlineAt: data.deadlineAt,
          attachments: data.attachments,
          projectId: task.project?.id,
        },
      });
      Alert.alert('Thành công', 'Gửi yêu cầu làm lại thành công!');
      setIsReworkModalOpen(false);
      loadTask();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Gửi yêu cầu làm lại thất bại');
    }
  };

  const handleOpenLink = (url?: string) => {
    if (!url) return;
    let target = url;
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }
    Linking.openURL(target).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở liên kết này.');
    });
  };

  const getStatusBadge = (status?: string) => {
    const stKey = status || 'PENDING';
    const config = TASK_STATUS_CONFIG[stKey];
    return {
      bg: config?.bg || '#F1F5F9',
      color: config?.color || '#64748B',
      label: config?.text || stKey,
    };
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin công việc...</Text>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Feather name="alert-circle" size={44} color="#EF4444" />
        <Text style={styles.errorText}>Không tìm thấy thông tin công việc</Text>
        <TouchableOpacity style={styles.backBtnAction} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusInfo = getStatusBadge(task.status);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            if (task.project?.id) {
              router.push(`/projects/${task.project.id}` as any);
            } else {
              router.back();
            }
          }}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {task.name}
          </Text>
          {task.code && <Text style={styles.headerCode}>#{task.code}</Text>}
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Project Back Link Banner */}
        {task.project?.name && (
          <TouchableOpacity
            style={styles.projectLinkBanner}
            onPress={() => router.push(`/projects/${task.project?.id}` as any)}
            activeOpacity={0.8}
          >
            <Feather name="folder" size={14} color={BrandColors.primary} />
            <Text style={styles.projectLinkText} numberOfLines={1}>
              Dự án: {task.project.name}
            </Text>
            <Feather name="chevron-right" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}

        {/* Top Action Buttons Grid */}
        <View style={styles.actionGrid}>
          {task.status === 'AWAITING_REVIEW' && canManageProjectTask && (
            <>
              <TouchableOpacity
                style={styles.reworkActionBtn}
                onPress={() => setIsReworkModalOpen(true)}
              >
                <Feather name="rotate-ccw" size={14} color="#7C3AED" />
                <Text style={styles.reworkActionText}>Yêu cầu làm lại</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reviewActionBtn}
                onPress={() => setIsReviewModalOpen(true)}
              >
                <Feather name="check-circle" size={14} color="#FFFFFF" />
                <Text style={styles.reviewActionText}>Đánh giá & Duyệt</Text>
              </TouchableOpacity>
            </>
          )}

          {task.status === 'INTERNAL_COMPLETED' && canManageProjectTask && (
            <TouchableOpacity
              style={styles.customerApproveBtn}
              onPress={handleCustomerApprove}
              disabled={isActionLoading}
            >
              <Feather name="check" size={14} color="#FFFFFF" />
              <Text style={styles.customerApproveText}>Khách hàng duyệt</Text>
            </TouchableOpacity>
          )}

          {['DONE', 'COMPLETED', 'INTERNAL_COMPLETED'].includes(task.status || '') &&
            canManageProjectTask && (
              <TouchableOpacity
                style={styles.reworkActionBtn}
                onPress={() => setIsReworkModalOpen(true)}
              >
                <Feather name="rotate-ccw" size={14} color="#7C3AED" />
                <Text style={styles.reworkActionText}>Yêu cầu làm lại</Text>
              </TouchableOpacity>
            )}

          {['DOING', 'REWORKING', 'OVERDUE'].includes(task.status || '') &&
            (currentUserId === task.assigneeId || currentUserId === task.helperId) &&
            !task.isSupportRequested && (
              <TouchableOpacity
                style={styles.supportRequestBtn}
                onPress={handleRequestSupport}
                disabled={isActionLoading}
              >
                <Feather name="help-circle" size={14} color="#DC2626" />
                <Text style={styles.supportRequestText}>Nhờ hỗ trợ</Text>
              </TouchableOpacity>
            )}

          {task.status === 'SUPPORT_PENDING' && currentUserId === task.supportLeadId && (
            <>
              <TouchableOpacity
                style={styles.acceptSupportBtn}
                onPress={() => handleRespondSupport('ACCEPT')}
                disabled={isActionLoading}
              >
                <Feather name="check" size={14} color="#FFFFFF" />
                <Text style={styles.acceptSupportText}>Đồng ý hỗ trợ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectSupportBtn}
                onPress={() => handleRespondSupport('REJECT')}
                disabled={isActionLoading}
              >
                <Feather name="x" size={14} color="#DC2626" />
                <Text style={styles.rejectSupportText}>Từ chối</Text>
              </TouchableOpacity>
            </>
          )}

          {['DOING', 'REWORKING', 'OVERDUE'].includes(task.status || '') &&
            currentUserId === task.helperId && (
              <TouchableOpacity
                style={styles.supportRequestBtn}
                onPress={handleRequestReturnSupport}
                disabled={isActionLoading}
              >
                <Feather name="arrow-left" size={14} color="#DC2626" />
                <Text style={styles.supportRequestText}>Hỗ trợ</Text>
              </TouchableOpacity>
            )}

          {task.isSupportAccepted &&
            currentUserId === task.supportLeadId &&
            task.isSupportReturnRequested &&
            ['DOING', 'REWORKING', 'SUPPORT_AWAITING_RETURN'].includes(task.status || '') && (
              <>
                <TouchableOpacity
                  style={styles.reassignActionBtn}
                  onPress={() => setIsAssignModalOpen(true)}
                >
                  <Feather name="users" size={14} color="#D97706" />
                  <Text style={styles.reassignActionText}>Phân công lại</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.returnSupportBtn}
                  onPress={handleReturnSupport}
                  disabled={isActionLoading}
                >
                  <Feather name="arrow-left" size={14} color="#FFFFFF" />
                  <Text style={styles.returnSupportText}>Trả lại</Text>
                </TouchableOpacity>
              </>
            )}

          {canManageProjectTask &&
            (task.assigneeId || task.helperId) &&
            !['COMPLETED', 'ACCEPTED', 'DONE', 'INTERNAL_COMPLETED', 'AWAITING_REVIEW'].includes(
              task.status || ''
            ) && (
              <TouchableOpacity
                style={styles.reminderBtn}
                onPress={handleSendReminder}
                disabled={isActionLoading}
              >
                <Feather name="bell" size={14} color="#FFFFFF" />
                <Text style={styles.reminderBtnText}>Nhắc việc</Text>
              </TouchableOpacity>
            )}
        </View>

        {/* Description & Note Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleBox}>
              <View style={[styles.cardIconBox, { backgroundColor: '#EEF2FF' }]}>
                <Feather name="file-text" size={16} color="#4F46E5" />
              </View>
              <Text style={styles.cardTitle}>Mô tả & Ghi chú</Text>
            </View>

            {canEditDescription && !isEditingDescription && (
              <TouchableOpacity style={styles.editBtn} onPress={handleStartEditDescription}>
                <Feather name="edit-2" size={12} color="#4F46E5" />
                <Text style={styles.editBtnText}>Chỉnh sửa</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditingDescription ? (
            <View style={styles.editArea}>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={4}
                placeholder="Nhập mô tả chi tiết hoặc lưu ý cho người thực hiện..."
                placeholderTextColor="#94A3B8"
                value={editedDescription}
                onChangeText={setEditedDescription}
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelEditBtn}
                  onPress={() => setIsEditingDescription(false)}
                >
                  <Text style={styles.cancelEditText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveEditBtn}
                  onPress={handleSaveDescription}
                  disabled={isUpdatingDescription}
                >
                  {isUpdatingDescription ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveEditText}>Lưu thay đổi</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.descContent}>
              {task.description || 'Không có mô tả cho công việc này.'}
            </Text>
          )}
        </View>

        {/* Evaluation Results Card */}
        {reviews.length > 0 && task.status !== 'AWAITING_REVIEW' && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleBox}>
                <View style={[styles.cardIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Feather name="list" size={16} color="#2563EB" />
                </View>
                <Text style={styles.cardTitle}>Kết quả đánh giá</Text>
              </View>

              <View
                style={[
                  styles.overallBadge,
                  reviews.every((r) => r.isPassed)
                    ? { backgroundColor: '#DCFCE7' }
                    : { backgroundColor: '#FEE2E2' },
                ]}
              >
                <Text
                  style={[
                    styles.overallBadgeText,
                    reviews.every((r) => r.isPassed)
                      ? { color: '#166534' }
                      : { color: '#991B1B' },
                  ]}
                >
                  {reviews.every((r) => r.isPassed) ? 'Đạt' : 'Không đạt'}
                </Text>
              </View>
            </View>

            <View style={styles.reviewsList}>
              {reviews.map((r, idx) => (
                <View
                  key={r.id || idx}
                  style={[
                    styles.reviewItem,
                    r.isPassed ? { backgroundColor: '#F0FDF4' } : { backgroundColor: '#F8FAFC' },
                  ]}
                >
                  <Feather
                    name={r.isPassed ? 'check-circle' : 'circle'}
                    size={16}
                    color={r.isPassed ? '#16A34A' : '#94A3B8'}
                  />
                  <Text style={styles.reviewItemText}>
                    {r.criteria?.name || r.name || 'Tiêu chí đánh giá'}
                  </Text>
                </View>
              ))}

              {task.reviewNote ? (
                <Text style={styles.reviewNoteText}>Ghi chú: {task.reviewNote}</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Results Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleBox}>
              <View style={[styles.cardIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Feather name="upload" size={16} color="#2563EB" />
              </View>
              <Text style={styles.cardTitle}>Kết quả</Text>
            </View>

            {['DOING', 'REJECTED', 'REWORKING', 'OVERDUE'].includes(task.status || '') &&
              task.assigneeId !== null && (
                <TouchableOpacity onPress={() => setIsResultModalOpen(true)}>
                  <Text style={styles.addResultBtnText}>
                    {task.result ? 'Cập nhật kết quả' : 'Thêm kết quả'}
                  </Text>
                </TouchableOpacity>
              )}
          </View>

          {task.result ? (
            <View style={styles.resultBox}>
              <View style={styles.resultHeader}>
                <View style={styles.resultIconBox}>
                  <Feather
                    name={
                      task.result.type === 'CHECKLIST' || task.result.type === 'CONFIRMATION'
                        ? 'check-square'
                        : 'file-text'
                    }
                    size={20}
                    color={BrandColors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName}>{task.result.name || 'Kết quả đã nộp'}</Text>
                  {task.result.note ? (
                    <Text style={styles.resultNote}>{task.result.note}</Text>
                  ) : null}
                  {task.lastSubmittedBy?.fullName && (
                    <Text style={styles.submittedByText}>
                      NGƯỜI LÀM: {task.lastSubmittedBy.fullName}
                    </Text>
                  )}
                </View>
              </View>

              {task.result.url && (
                <TouchableOpacity
                  style={styles.viewResultBtn}
                  onPress={() => handleOpenLink(task.result?.url)}
                >
                  <Text style={styles.viewResultBtnText}>Xem ngay</Text>
                </TouchableOpacity>
              )}

              {task.result.type === 'CHECKLIST' &&
                task.result.checklist &&
                task.result.checklist.length > 0 && (
                  <View style={styles.checklistGrid}>
                    {task.result.checklist.map((item, idx) => (
                      <View key={idx} style={styles.checklistItem}>
                        <Feather name="check-circle" size={14} color="#16A34A" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.checklistItemLabel}>
                            {item.label || item.item}
                          </Text>
                          {item.description ? (
                            <Text style={styles.checklistItemDesc}>{item.description}</Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
            </View>
          ) : (
            <View style={styles.emptyResultBox}>
              <Feather name="file-text" size={32} color="#CBD5E1" />
              <Text style={styles.emptyResultText}>Chưa có kết quả nào được tải lên</Text>
            </View>
          )}
        </View>

        {/* Iteration History Card */}
        {task.iterations && task.iterations.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleBox}>
                <View style={[styles.cardIconBox, { backgroundColor: '#F3E8FF' }]}>
                  <Feather name="rotate-ccw" size={16} color="#7C3AED" />
                </View>
                <Text style={styles.cardTitle}>Lịch sử làm lại</Text>
              </View>
            </View>

            <View style={styles.iterationsTimeline}>
              {task.iterations
                .slice()
                .sort((a, b) => b.version - a.version)
                .map((iteration) => (
                  <View key={iteration.id} style={styles.iterationCard}>
                    <View style={styles.iterationHeader}>
                      <View style={styles.versionBadge}>
                        <Text style={styles.versionBadgeText}>v{iteration.version}</Text>
                      </View>
                      <Text style={styles.iterationDate}>{formatDateStr(iteration.createdAt)}</Text>
                      {iteration.submittedBy?.fullName && (
                        <Text style={styles.iterationUserTag}>
                          NGƯỜI LÀM: {iteration.submittedBy.fullName}
                        </Text>
                      )}
                    </View>

                    {iteration.leadFeedback && (
                      <View style={styles.feedbackBox}>
                        <Text style={styles.feedbackLabel}>PHẢN HỒI CỦA LEAD</Text>
                        <Text style={styles.feedbackText}>"{iteration.leadFeedback}"</Text>
                      </View>
                    )}

                    {iteration.feedbackAttachments && iteration.feedbackAttachments.length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={styles.feedbackLabel}>TÀI LIỆU ĐÍNCH KÈM</Text>
                        <View style={styles.attachmentRow}>
                          {iteration.feedbackAttachments.map((f, fIdx) => (
                            <TouchableOpacity
                              key={fIdx}
                              style={styles.attachmentChip}
                              onPress={() => handleOpenLink(f.url)}
                            >
                              <Feather
                                name={f.type === 'LINK' ? 'link' : 'file-text'}
                                size={12}
                                color={BrandColors.primary}
                              />
                              <Text style={styles.attachmentChipText} numberOfLines={1}>
                                {f.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Performer / Assignee Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleBox}>
              <View style={[styles.cardIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Feather name="user" size={16} color="#2563EB" />
              </View>
              <Text style={styles.cardTitle}>Nhân sự thực hiện</Text>
            </View>
          </View>

          <View style={styles.assigneeRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {task.assignee?.fullName?.charAt(0) || 'U'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.assigneeName}>
                {task.assignee?.fullName || task.assignee?.name || 'Chưa có người thực hiện'}
              </Text>
              <Text style={styles.performerTypeTag}>
                {task.performerType || 'INTERNAL'}
              </Text>
            </View>
          </View>
        </View>

        {/* Timeline / Plan Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleBox}>
              <View style={[styles.cardIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="calendar" size={16} color="#D97706" />
              </View>
              <Text style={styles.cardTitle}>Kế hoạch</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>DEADLINE (HẠN HOÀN THÀNH)</Text>
            <Text style={styles.metaValue}>{formatDateTimeStr(task.plannedEndDate || task.dueDate)}</Text>
          </View>
        </View>

        {/* Attachments Section */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleBox}>
              <View style={[styles.cardIconBox, { backgroundColor: '#F3E8FF' }]}>
                <Feather name="paperclip" size={16} color="#7C3AED" />
              </View>
              <Text style={styles.cardTitle}>Tài liệu ({task.attachments?.length || 0})</Text>
            </View>
          </View>

          {task.attachments && task.attachments.length > 0 ? (
            <View style={styles.attachmentList}>
              {task.attachments.map((file, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.attachmentItem}
                  onPress={() => handleOpenLink(file.url)}
                  activeOpacity={0.7}
                >
                  <View style={styles.attachmentIconBox}>
                    <Feather name="file-text" size={16} color="#64748B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {file.name || 'Tài liệu đính kèm'}
                    </Text>
                    {file.type ? <Text style={styles.attachmentType}>{file.type}</Text> : null}
                  </View>
                  <Feather name="external-link" size={14} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyAttachmentText}>Không có tài liệu đính kèm</Text>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <ReworkTaskModal
        visible={isReworkModalOpen}
        onClose={() => setIsReworkModalOpen(false)}
        onSubmit={handleReworkSubmit}
        isLoading={isActionLoading}
        taskName={task.name}
      />

      <TaskResultModal
        visible={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        task={task}
        onSuccess={loadTask}
      />

      <TaskAssignModal
        visible={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        task={task}
        project={task.project}
        teamMembers={[]}
        onSuccess={loadTask}
      />

      <TaskReviewModal
        visible={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        task={task}
        onSuccess={loadTask}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    gap: 12,
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  backBtnAction: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: BrandColors.primary,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  headerBtn: {
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
  headerCode: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
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
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  projectLinkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  projectLinkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reworkActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reworkActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  reviewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reviewActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  customerApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  customerApproveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  supportRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  supportRequestText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  acceptSupportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  acceptSupportText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectSupportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  rejectSupportText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  reassignActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reassignActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  returnSupportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  returnSupportText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reminderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  editArea: {
    gap: 10,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cancelEditText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  saveEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#4F46E5',
  },
  saveEditText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  descContent: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  overallBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  overallBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewsList: {
    gap: 8,
  },
  reviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  reviewItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  reviewNoteText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 4,
  },
  addResultBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  resultBox: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  resultIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  resultNote: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  submittedByText: {
    fontSize: 10,
    fontWeight: '800',
    color: BrandColors.primary,
    marginTop: 4,
  },
  viewResultBtn: {
    alignSelf: 'flex-start',
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewResultBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  checklistGrid: {
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#CCFBF1',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checklistItemLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  checklistItemDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  emptyResultBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E2E8F0',
  },
  emptyResultText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  iterationsTimeline: {
    gap: 10,
  },
  iterationCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  iterationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  versionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
  },
  iterationDate: {
    fontSize: 11,
    color: '#64748B',
  },
  iterationUserTag: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  feedbackBox: {
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
    paddingLeft: 8,
    gap: 2,
  },
  feedbackLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  feedbackText: {
    fontSize: 12,
    color: '#0F172A',
    fontStyle: 'italic',
  },
  attachmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  attachmentChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    maxWidth: 120,
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  assigneeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  performerTypeTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 2,
  },
  metaRow: {
    gap: 4,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  attachmentList: {
    gap: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attachmentIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  attachmentType: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  emptyAttachmentText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
});
