import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { taskService, TaskDetail } from '@/services/taskService';
import { BrandColors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadTask = useCallback(async () => {
    if (!id) return;
    try {
      const res = await taskService.getTaskById(id);
      if (res.data) {
        setTask(res.data);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể tải thông tin nhiệm vụ.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const handleStartTask = async () => {
    if (!task) return;
    setIsActionLoading(true);
    try {
      const res = await taskService.updateTask(task.id, { status: 'IN_PROGRESS' });
      if (res.error) {
        Alert.alert('Thất bại', res.error);
      } else {
        Alert.alert('Thành công', 'Đã chuyển trạng thái sang Đang thực hiện.');
        loadTask();
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubmitResult = async () => {
    if (!task) return;
    Alert.prompt(
      'Nộp kết quả nhiệm vụ',
      'Nhập đường link tài liệu hoặc ghi chú kết quả công việc:',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Nộp bài',
          onPress: async (link?: string) => {
            if (!link || !link.trim()) {
              Alert.alert('Cảnh báo', 'Vui lòng cung cấp link hoặc mô tả kết quả.');
              return;
            }
            setIsActionLoading(true);
            try {
              const res = await taskService.submitTaskResult(task.id, { link });
              if (res.error) {
                Alert.alert('Lỗi', res.error);
              } else {
                Alert.alert('Thành công', 'Đã gửi kết quả để chờ xét duyệt.');
                loadTask();
              }
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
      'plain-text',
      'https://'
    );
  };

  const handleApprove = async () => {
    if (!task) return;
    Alert.alert(
      'Xác nhận duyệt',
      'Bạn có đồng ý nghiệm thu đạt nhiệm vụ này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Phê duyệt',
          style: 'default',
          onPress: async () => {
            setIsActionLoading(true);
            try {
              const res = await taskService.updateTask(task.id, { status: 'ACCEPTED' });
              if (res.error) {
                Alert.alert('Lỗi', res.error);
              } else {
                Alert.alert('Thành công', 'Đã duyệt nghiệm thu hoàn thành nhiệm vụ.');
                loadTask();
              }
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Đang tải chi tiết nhiệm vụ...</Text>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Feather name="alert-circle" size={44} color="#EF4444" />
        <Text style={styles.errorText}>Không tìm thấy nhiệm vụ yêu cầu</Text>
        <TouchableOpacity style={styles.backBtnAction} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isLeadOrAdmin =
    user?.role === 'ADMIN' ||
    user?.role === 'BOD' ||
    user?.role === 'TEAM_LEAD' ||
    user?.role === 'PM';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Chi tiết nhiệm vụ
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title & Status Card */}
        <View style={styles.mainCard}>
          <View style={styles.tagRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{task.status}</Text>
            </View>
            {task.code && <Text style={styles.codeText}>#{task.code}</Text>}
          </View>
          <Text style={styles.taskTitle}>{task.name}</Text>
          {task.nickname ? <Text style={styles.nickname}>({task.nickname})</Text> : null}
        </View>

        {/* Info Grid Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardHeaderTitle}>Thông tin tổng quan</Text>

          {task.project?.name && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Feather name="folder" size={16} color={BrandColors.primary} />
              </View>
              <View style={styles.infoTextGroup}>
                <Text style={styles.infoLabel}>Dự án</Text>
                <Text style={styles.infoVal}>{task.project.name}</Text>
              </View>
            </View>
          )}

          {task.project?.contract?.customer?.name && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Feather name="user" size={16} color="#10B981" />
              </View>
              <View style={styles.infoTextGroup}>
                <Text style={styles.infoLabel}>Khách hàng</Text>
                <Text style={styles.infoVal}>{task.project.contract.customer.name}</Text>
              </View>
            </View>
          )}

          {task.assignee?.fullName && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Feather name="check-circle" size={16} color="#3B82F6" />
              </View>
              <View style={styles.infoTextGroup}>
                <Text style={styles.infoLabel}>Người phụ trách</Text>
                <Text style={styles.infoVal}>{task.assignee.fullName}</Text>
              </View>
            </View>
          )}

          {task.plannedEndDate && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Feather name="clock" size={16} color="#F59E0B" />
              </View>
              <View style={styles.infoTextGroup}>
                <Text style={styles.infoLabel}>Hạn hoàn thành (Deadline)</Text>
                <Text style={styles.infoVal}>
                  {new Date(task.plannedEndDate).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Description & Results Section */}
        {task.description && (
          <View style={styles.infoCard}>
            <Text style={styles.cardHeaderTitle}>Mô tả công việc</Text>
            <Text style={styles.descText}>{task.description}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Bar Footer */}
      <View style={styles.footerBar}>
        {task.status === 'TODO' && (
          <TouchableOpacity
            style={[styles.primaryActionBtn, isActionLoading && styles.btnDisabled]}
            onPress={handleStartTask}
            disabled={isActionLoading}
          >
            <Feather name="play" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Bắt đầu làm việc</Text>
          </TouchableOpacity>
        )}

        {task.status === 'IN_PROGRESS' && (
          <TouchableOpacity
            style={[styles.primaryActionBtn, isActionLoading && styles.btnDisabled]}
            onPress={handleSubmitResult}
            disabled={isActionLoading}
          >
            <Feather name="send" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Nộp kết quả xét duyệt</Text>
          </TouchableOpacity>
        )}

        {task.status === 'AWAITING_REVIEW' && isLeadOrAdmin && (
          <TouchableOpacity
            style={[styles.approveActionBtn, isActionLoading && styles.btnDisabled]}
            onPress={handleApprove}
            disabled={isActionLoading}
          >
            <Feather name="check" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Duyệt nghiệm thu</Text>
          </TouchableOpacity>
        )}

        {(task.status === 'ACCEPTED' || task.status === 'DONE') && (
          <View style={styles.completedBanner}>
            <Feather name="check-circle" size={18} color="#10B981" />
            <Text style={styles.completedText}>Nhiệm vụ đã được nghiệm thu hoàn tất</Text>
          </View>
        )}
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
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
  },
  nickname: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextGroup: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  infoVal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  descText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  footerBar: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  approveActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
});
