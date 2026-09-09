import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { TaskDetail, taskService } from '@/services/taskService';
import { BrandColors } from '@/constants/colors';

export default function TaskReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [isLoadingTask, setIsLoadingTask] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [passedIds, setPassedIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'TEAM_LEAD' | 'ASSIGNER'>('TEAM_LEAD');

  useEffect(() => {
    if (id) {
      loadTaskData();
    }
  }, [id]);

  const loadTaskData = async () => {
    if (!id) return;
    setIsLoadingTask(true);
    setIsLoadingReviews(true);

    const [taskRes, reviewsRes] = await Promise.all([
      taskService.getTaskById(id),
      taskService.getTaskReviews(id),
    ]);

    setIsLoadingTask(false);
    setIsLoadingReviews(false);

    if (taskRes.data) {
      setTask(taskRes.data);
    }

    if (reviewsRes.data) {
      setReviews(reviewsRes.data);
      setPassedIds(reviewsRes.data.filter((r: any) => r.isPassed).map((r: any) => r.id));
    }
  };

  const leadReviews = reviews.filter((r) => r.reviewerType === 'TEAM_LEAD');
  const assignerReviews = reviews.filter((r) => r.reviewerType === 'ASSIGNER');

  const isLeadPassed = leadReviews.length === 0 || leadReviews.every((r) => passedIds.includes(r.id));
  const isAssignerPassed = assignerReviews.length === 0 || assignerReviews.every((r) => passedIds.includes(r.id));
  const isAllPassed = isLeadPassed && isAssignerPassed;
  const isDualReview = leadReviews.length > 0 && assignerReviews.length > 0;

  const handleToggleReview = (reviewId: string) => {
    setPassedIds((prev) =>
      prev.includes(reviewId) ? prev.filter((i) => i !== reviewId) : [...prev, reviewId]
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

  const handleApprove = async () => {
    if (!id || !task) return;
    if (!isAllPassed && reviews.length > 0) {
      Alert.alert('Cảnh báo', 'Bạn cần tích chọn xác nhận tất cả các tiêu chí trước khi duyệt.');
      return;
    }

    setIsFinalizing(true);
    const res = await taskService.finalizeTask(id, {
      passedCriteriaIds: passedIds,
      reviewNote: note.trim(),
      projectId: task.project?.id,
    });
    setIsFinalizing(false);

    if (res.error) {
      Alert.alert('Lỗi', res.error);
    } else {
      Alert.alert('Thành công', 'Đã duyệt hoàn thành công việc thành công!');
      router.back();
    }
  };

  const handleReject = async () => {
    if (!id || !task) return;
    if (!note.trim()) {
      Alert.alert('Cảnh báo', 'Vui lòng nhập ghi chú lý do từ chối công việc.');
      return;
    }

    setIsRejecting(true);
    const res = await taskService.rejectTask(id, {
      passedCriteriaIds: passedIds,
      reviewNote: note.trim(),
      projectId: task.project?.id,
    });
    setIsRejecting(false);

    if (res.error) {
      Alert.alert('Lỗi', res.error);
    } else {
      Alert.alert('Thành công', 'Đã từ chối kết quả công việc.');
      router.back();
    }
  };

  if (isLoadingTask) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin đánh giá...</Text>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Feather name="alert-circle" size={44} color="#EF4444" />
        <Text style={styles.errorText}>Không tìm thấy thông tin công việc.</Text>
        <TouchableOpacity style={styles.backBtnAction} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentDisplayedReviews = isDualReview
    ? activeTab === 'TEAM_LEAD'
      ? leadReviews
      : assignerReviews
    : reviews;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Đánh giá & Duyệt công việc</Text>
          <Text style={styles.headerSubTitle} numberOfLines={1}>
            {task.name}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Result Card */}
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
                  {task.result.note && <Text style={styles.resultNote}>{task.result.note}</Text>}
                </View>
              </View>

              {task.result.url && (
                <TouchableOpacity
                  style={styles.viewResultBtn}
                  onPress={() => handleOpenResultUrl(task.result?.url)}
                  activeOpacity={0.8}
                >
                  <Feather name="external-link" size={13} color="#FFFFFF" />
                  <Text style={styles.viewResultBtnText}>Xem kết quả</Text>
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
              <Text style={styles.loadingText}>Đang tải tiêu chí...</Text>
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
                        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
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
                    Không có tiêu chí đánh giá cho loại công việc này.
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
            numberOfLines={4}
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#F8FAFC',
  },
  errorText: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '700',
    textAlign: 'center',
  },
  backBtnAction: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: BrandColors.primary,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerBtn: {
    width: 36,
    height: 36,
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
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
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
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
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
    width: 38,
    height: 38,
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
    paddingVertical: 10,
    borderRadius: 10,
  },
  viewResultBtnText: {
    fontSize: 13,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    borderRadius: 14,
    padding: 14,
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
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  warningText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    textAlign: 'center',
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
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
