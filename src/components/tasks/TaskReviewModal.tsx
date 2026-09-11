import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TaskDetail } from '@/services/taskService';
import {
  useFinalizeTaskMutation,
  useRejectTaskMutation,
  useTaskReviewsQuery,
} from '@/hooks/queries/useTasks';
import { BrandColors } from '@/constants/colors';

interface TaskReviewModalProps {
  visible: boolean;
  onClose: () => void;
  task: TaskDetail | null;
  onSuccess: () => void;
}

export default function TaskReviewModal({
  visible,
  onClose,
  task,
  onSuccess,
}: TaskReviewModalProps) {
  const { width } = useWindowDimensions();
  const [passedIds, setPassedIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [activeTab, setActiveTab] = useState<'TEAM_LEAD' | 'ASSIGNER'>('TEAM_LEAD');

  const { data: reviewsData, isLoading: isLoadingReviews } = useTaskReviewsQuery(
    visible && task?.id ? task.id : ''
  );
  const reviews = reviewsData || [];

  useEffect(() => {
    if (visible && reviews.length > 0) {
      setPassedIds(reviews.filter((r: any) => r.isPassed).map((r: any) => r.id));
    } else if (!visible) {
      setPassedIds([]);
      setNote('');
    }
  }, [visible, reviews]);

  const leadReviews = reviews.filter((r) => r.reviewerType === 'TEAM_LEAD');
  const assignerReviews = reviews.filter((r) => r.reviewerType === 'ASSIGNER');

  const isLeadPassed = leadReviews.length === 0 || leadReviews.every((r) => passedIds.includes(r.id));
  const isAssignerPassed = assignerReviews.length === 0 || assignerReviews.every((r) => passedIds.includes(r.id));
  const isAllPassed = isLeadPassed && isAssignerPassed;
  const isDualReview = leadReviews.length > 0 && assignerReviews.length > 0;

  const handleToggleReview = (reviewId: string) => {
    setPassedIds((prev) =>
      prev.includes(reviewId) ? prev.filter((id) => id !== reviewId) : [...prev, reviewId]
    );
  };

  const handleOpenResultUrl = (url?: string) => {
    if (!url) return;
    let target = url;
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }
    Linking.openURL(target).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở liên kết kết quả.');
    });
  };

  const finalizeTaskMutation = useFinalizeTaskMutation();
  const rejectTaskMutation = useRejectTaskMutation();
  const isFinalizing = finalizeTaskMutation.isPending;
  const isRejecting = rejectTaskMutation.isPending;

  const handleFinalize = async () => {
    if (!task?.id) return;
    if (!isAllPassed && reviews.length > 0) {
      Alert.alert('Cảnh báo', 'Bạn cần tích chọn xác nhận tất cả các tiêu chí trước khi duyệt.');
      return;
    }

    try {
      await finalizeTaskMutation.mutateAsync({
        taskId: task.id,
        payload: {
          passedCriteriaIds: passedIds,
          reviewNote: note.trim(),
          projectId: task.project?.id,
        },
      });

      Alert.alert('Thành công', 'Đã duyệt hoàn thành công việc thành công!');
      onClose();
      onSuccess();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi duyệt công việc.');
    }
  };

  const handleApprove = handleFinalize;

  const handleReject = async () => {
    if (!task?.id) return;
    if (!note.trim()) {
      Alert.alert('Cảnh báo', 'Vui lòng nhập ghi chú lý do từ chối công việc.');
      return;
    }

    try {
      await rejectTaskMutation.mutateAsync({
        taskId: task.id,
        payload: {
          passedCriteriaIds: passedIds,
          reviewNote: note.trim(),
          projectId: task.project?.id,
        },
      });

      Alert.alert('Thành công', 'Đã từ chối kết quả công việc.');
      onClose();
      onSuccess();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi từ chối công việc.');
    }
  };

  if (!task) return null;

  const currentDisplayedReviews = isDualReview
    ? activeTab === 'TEAM_LEAD'
      ? leadReviews
      : assignerReviews
    : reviews;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={() => {}}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Đánh giá & Duyệt công việc</Text>
              <Text style={styles.taskName} numberOfLines={1}>
                {task.name}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Task Result Box */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Feather name="file-text" size={18} color={BrandColors.primary} />
                </View>
                <Text style={styles.cardTitle}>Kết quả công việc</Text>
              </View>

              {task.result ? (
                <View style={styles.resultBox}>
                  <View style={styles.resultMainRow}>
                    <View style={styles.resultIconWrap}>
                      <Feather
                        name={task.result.type === 'LINK' ? 'link' : 'file'}
                        size={20}
                        color={BrandColors.primary}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.resultName} numberOfLines={1}>
                        {task.result.name || task.code || 'Kết quả công việc'}
                      </Text>
                      {task.result.note && (
                        <Text style={styles.resultNote}>{task.result.note}</Text>
                      )}
                    </View>
                  </View>

                  {task.result.url && (
                    <TouchableOpacity
                      style={styles.viewResultBtn}
                      onPress={() => handleOpenResultUrl(task.result?.url)}
                      activeOpacity={0.8}
                    >
                      <Feather name="external-link" size={13} color="#FFFFFF" />
                      <Text style={styles.viewResultBtnText}>Xem ngay</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>Chưa có kết quả để đánh giá</Text>
                </View>
              )}
            </View>

            {/* Criteria Evaluation Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Feather name="check-circle" size={18} color="#10B981" />
                </View>
                <Text style={styles.cardTitle}>Tiêu chí đánh giá</Text>
              </View>

              {isLoadingReviews ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={BrandColors.primary} />
                  <Text style={styles.loadingText}>Đang tải danh sách tiêu chí...</Text>
                </View>
              ) : (
                <>
                  {isDualReview && (
                    <View style={styles.tabContainer}>
                      <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'TEAM_LEAD' && styles.tabBtnActive]}
                        onPress={() => setActiveTab('TEAM_LEAD')}
                      >
                        <Text
                          style={[
                            styles.tabBtnText,
                            activeTab === 'TEAM_LEAD' && styles.tabBtnTextActive,
                          ]}
                        >
                          Team Lead ({isLeadPassed ? 'Đã duyệt' : 'Đang đợi'})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'ASSIGNER' && styles.tabBtnActive]}
                        onPress={() => setActiveTab('ASSIGNER')}
                      >
                        <Text
                          style={[
                            styles.tabBtnText,
                            activeTab === 'ASSIGNER' && styles.tabBtnTextActive,
                          ]}
                        >
                          Người giao việc ({isAssignerPassed ? 'Đã duyệt' : 'Đang đợi'})
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {currentDisplayedReviews.length > 0 ? (
                    <View style={styles.criteriaList}>
                      {currentDisplayedReviews.map((review) => {
                        const isChecked = passedIds.includes(review.id);
                        return (
                          <TouchableOpacity
                            key={review.id}
                            style={[styles.criteriaItem, isChecked && styles.criteriaItemChecked]}
                            onPress={() => handleToggleReview(review.id)}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                styles.checkbox,
                                isChecked && styles.checkboxChecked,
                              ]}
                            >
                              {isChecked && <Feather name="check" size={14} color="#FFFFFF" />}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.criteriaName,
                                  isChecked && styles.criteriaNameChecked,
                                ]}
                              >
                                {review.criteria?.name || 'Tiêu chí đánh giá'}
                              </Text>
                              {review.criteria?.description && (
                                <Text style={styles.criteriaDesc}>
                                  {review.criteria.description}
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyText}>
                        Không có tiêu chí đánh giá bắt buộc cho loại công việc này.
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Note Input */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
                  <Feather name="message-square" size={18} color="#8B5CF6" />
                </View>
                <Text style={styles.cardTitle}>Ghi chú / Phản hồi</Text>
              </View>
              <TextInput
                style={styles.noteInput}
                multiline
                numberOfLines={3}
                placeholder="Nhập ghi chú hoặc lý do đánh giá/từ chối..."
                placeholderTextColor="#94A3B8"
                value={note}
                onChangeText={setNote}
              />
            </View>

            {!isAllPassed && reviews.length > 0 && (
              <Text style={styles.warningText}>
                * Bạn cần xác nhận tất cả các tiêu chí trước khi duyệt
              </Text>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.rejectBtn,
                (!note.trim() || isRejecting || isFinalizing) && { opacity: 0.5 },
              ]}
              onPress={handleReject}
              disabled={!note.trim() || isRejecting || isFinalizing}
            >
              {isRejecting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Feather name="x-circle" size={16} color="#EF4444" />
                  <Text style={styles.rejectBtnText}>Từ chối</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.approveBtn,
                (!isAllPassed || isFinalizing || isRejecting) && { opacity: 0.5 },
              ]}
              onPress={handleApprove}
              disabled={!isAllPassed || isFinalizing || isRejecting}
            >
              {isFinalizing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="check-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.approveBtnText}>Duyệt hoàn thành</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  taskName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  body: {
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  iconBox: {
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
  resultBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  resultMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  resultNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  viewResultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewResultBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyBox: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    fontWeight: '800',
    color: BrandColors.primary,
  },
  criteriaList: {
    gap: 10,
  },
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
  },
  criteriaItemChecked: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  criteriaName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  criteriaNameChecked: {
    color: '#065F46',
  },
  criteriaDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  noteInput: {
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
  warningText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    textAlign: 'center',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  approveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  approveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
