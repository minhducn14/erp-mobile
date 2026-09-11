import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useCreateTaskMutation } from '@/hooks/queries/useTasks';

interface AddExtraTaskModalProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
}

export default function AddExtraTaskModal({
  visible,
  onClose,
  projectId,
  onSuccess,
}: AddExtraTaskModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  const createTaskMutation = useCreateTaskMutation();
  const isSubmitting = createTaskMutation.isPending;

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Cảnh báo', 'Vui lòng nhập tên công việc phát sinh.');
      return;
    }

    try {
      await createTaskMutation.mutateAsync({
        projectId,
        name: name.trim(),
        description: description.trim(),
        dueDate: dueDate.trim() || undefined,
        isExtraTask: true,
      });

      Alert.alert('Thành công', 'Đã thêm công việc phát sinh thành công.');
      setName('');
      setDescription('');
      setDueDate('');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-900/50 justify-end">
        <View className="bg-surface rounded-t-3xl p-5 gap-4 max-h-[85%]">
          {/* Header */}
          <View className="flex-row justify-between items-center border-b border-slate-100 pb-3">
            <Text className="text-base font-bold text-text-primary">Thêm công việc phát sinh</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView className="gap-3.5" showsVerticalScrollIndicator={false}>
            {/* Task Name */}
            <View className="gap-1.5 mb-3">
              <Text className="text-xs font-semibold text-slate-600">Tên công việc <Text className="text-danger">*</Text></Text>
              <TextInput
                className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
                placeholder="Nhập tên công việc phát sinh..."
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Description */}
            <View className="gap-1.5 mb-3">
              <Text className="text-xs font-semibold text-slate-600">Mô tả công việc</Text>
              <TextInput
                className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary h-20 text-left"
                placeholder="Chi tiết công việc cần thực hiện..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                style={{ textAlignVertical: 'top' }}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Due Date */}
            <View className="gap-1.5 mb-3">
              <Text className="text-xs font-semibold text-slate-600">Hạn chót (YYYY-MM-DD)</Text>
              <TextInput
                className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
                placeholder="Ví dụ: 2026-09-30"
                placeholderTextColor="#94A3B8"
                value={dueDate}
                onChangeText={setDueDate}
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View className="flex-row justify-end gap-2.5 border-t border-slate-100 pt-3.5">
            <TouchableOpacity className="px-4 py-2.5 rounded-lg bg-slate-100" onPress={onClose} disabled={isSubmitting}>
              <Text className="text-sm font-semibold text-slate-500">Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`px-5 py-2.5 rounded-lg bg-primary ${isSubmitting ? 'opacity-60' : ''}`}
              onPress={handleCreate}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-sm font-bold text-white">Tạo công việc</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

