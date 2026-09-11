import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TASK_STATUS_CONFIG, TaskDetail } from '@/services/taskService';
import { useUpdateTaskStatusMutation, useUpdateTaskMutation } from '@/hooks/queries/useTasks';

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
      <View className="flex-1 bg-slate-900/50 justify-end">
        <View className="bg-surface rounded-t-3xl p-5 gap-4.5">
          {/* Header */}
          <View className="flex-row justify-between items-center border-b border-slate-100 pb-3">
            <Text className="text-base font-bold text-text-primary flex-1 mr-2.5" numberOfLines={1}>
              Cập nhật Task: {task.name}
            </Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Status Picker */}
          <View className="gap-2.5">
            <Text className="text-xs font-semibold text-slate-600">Trạng thái công việc</Text>
            <View className="flex-row flex-wrap gap-2">
              {AVAILABLE_STATUSES.map((st) => {
                const isSelected = status === st.key;
                const statusColor = TASK_STATUS_CONFIG[st.key];
                return (
                  <TouchableOpacity
                    key={st.key}
                    className={`px-3 py-2 rounded-xl border ${
                      isSelected
                        ? 'border-primary bg-orange-50'
                        : 'border-border bg-background'
                    }`}
                    style={
                      isSelected && statusColor?.color
                        ? { borderColor: statusColor.color, backgroundColor: statusColor.bg || '#FFF4EA' }
                        : undefined
                    }
                    onPress={() => {
                      setStatus(st.key);
                      if (st.key === 'DONE') setProgress(100);
                    }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{ color: isSelected ? statusColor?.color || '#F38820' : '#64748B' }}
                    >
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Progress Control */}
          <View className="gap-2.5">
            <View className="flex-row justify-between items-center">
              <Text className="text-xs font-semibold text-slate-600">Tiến độ hoàn thành (%)</Text>
              <Text className="text-sm font-bold text-primary">{progress}%</Text>
            </View>

            <View className="flex-row justify-between gap-1.5">
              {[0, 25, 50, 75, 100].map((val) => (
                <TouchableOpacity
                  key={val}
                  className={`flex-1 py-2.5 rounded-lg items-center ${
                    progress === val ? 'bg-primary' : 'bg-slate-100'
                  }`}
                  onPress={() => setProgress(val)}
                >
                  <Text className={`text-xs ${progress === val ? 'font-bold text-white' : 'font-semibold text-slate-500'}`}>
                    {val}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Footer Actions */}
          <View className="flex-row justify-end gap-2.5 border-t border-slate-100 pt-3.5">
            <TouchableOpacity className="px-4 py-2.5 rounded-lg bg-slate-100" onPress={onClose} disabled={isSubmitting}>
              <Text className="text-sm font-semibold text-slate-500">Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`px-5 py-2.5 rounded-lg bg-primary ${isSubmitting ? 'opacity-60' : ''}`}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-sm font-bold text-white">Cập nhật</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

