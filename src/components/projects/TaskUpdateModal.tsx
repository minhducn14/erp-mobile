import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TASK_STATUS_CONFIG, TaskDetail } from '@/services/taskService';
import { useUpdateTaskStatusMutation, useUpdateTaskMutation } from '@/hooks/queries/useTasks';
import { BrandColors } from '@/constants/colors';

interface TaskUpdateModalProps {
  visible: boolean;
  onClose: () => void;
  task?: TaskDetail | null;
  onSuccess: () => void;
}

const AVAILABLE_STATUSES = [
  { key: 'PENDING', label: 'Chờ phân công' },
  { key: 'DOING', label: 'Đang thực hiện' },
  { key: 'AWAITING_ACCEPTANCE', label: 'Chờ nghiệm thu' },
  { key: 'DONE', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

export default function TaskUpdateModal({
  visible,
  onClose,
  task,
  onSuccess,
}: TaskUpdateModalProps) {
  const [status, setStatus] = useState<string>('DOING');
  const [progress, setProgress] = useState<number>(0);
  
  const updateStatusMutation = useUpdateTaskStatusMutation();
  const updateTaskMutation = useUpdateTaskMutation();

  const isSubmitting = updateStatusMutation.isPending || updateTaskMutation.isPending;

  useEffect(() => {
    if (task) {
      setStatus(task.status || 'DOING');
      setProgress(task.progress ?? (task.status === 'DONE' ? 100 : 0));
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;
    try {
      // Update status
      await updateStatusMutation.mutateAsync({ id: task.id, status });
      // Update details progress
      await updateTaskMutation.mutateAsync({ id: task.id, payload: { progress } });

      Alert.alert('Thành công', 'Đã cập nhật công việc thành công.');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể cập nhật task.');
    }
  };

  if (!task) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              Cập nhật Task: {task.name}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Status Picker */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Trạng thái công việc</Text>
            <View style={styles.statusGrid}>
              {AVAILABLE_STATUSES.map((st) => {
                const isSelected = status === st.key;
                const statusColor = TASK_STATUS_CONFIG[st.key];
                return (
                  <TouchableOpacity
                    key={st.key}
                    style={[
                      styles.statusPill,
                      { backgroundColor: isSelected ? statusColor?.bg || '#EFF6FF' : '#F8FAFC' },
                      isSelected && { borderColor: statusColor?.color || BrandColors.primary, borderWidth: 1.5 },
                    ]}
                    onPress={() => {
                      setStatus(st.key);
                      if (st.key === 'DONE') setProgress(100);
                    }}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: isSelected ? statusColor?.color || BrandColors.primary : '#64748B' },
                      ]}
                    >
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Progress Control */}
          <View style={styles.section}>
            <View style={styles.progressRow}>
              <Text style={styles.sectionLabel}>Tiến độ hoàn thành (%)</Text>
              <Text style={styles.progressValText}>{progress}%</Text>
            </View>

            <View style={styles.sliderButtons}>
              {[0, 25, 50, 75, 100].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.stepBtn, progress === val && styles.stepBtnActive]}
                  onPress={() => setProgress(val)}
                >
                  <Text style={[styles.stepText, progress === val && styles.stepTextActive]}>
                    {val}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitText}>Cập nhật</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 10,
  },
  closeBtn: {
    padding: 4,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressValText: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  stepBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  stepBtnActive: {
    backgroundColor: BrandColors.primary,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  stepTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: BrandColors.primary,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
