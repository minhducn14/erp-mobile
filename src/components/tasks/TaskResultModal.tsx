import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { uploadToCloudinary } from '@/services/cloudinaryService';
import { TaskDetail } from '@/services/taskService';
import { useSubmitTaskResultMutation } from '@/hooks/queries/useTasks';
import { isValidUrl, normalizeUrl } from '@/utils/validators';

interface TaskResultModalProps {
  visible: boolean;
  onClose: () => void;
  task: TaskDetail | null;
  onSuccess: () => void;
}

type SubmissionType = 'file' | 'link';

export default function TaskResultModal({
  visible,
  onClose,
  task,
  onSuccess,
}: TaskResultModalProps) {
  const [submissionType, setSubmissionType] = useState<SubmissionType>('file');
  const [resultLink, setResultLink] = useState('');
  const [resultFile, setResultFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const submitResultMutation = useSubmitTaskResultMutation();

  useEffect(() => {
    if (visible) {
      setResultFile(null);
      setResultLink('');
      setSubmissionType('file');
    }
  }, [visible, task?.id]);

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        setResultFile({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType || 'application/octet-stream',
          size: asset.size,
        });
        setResultLink('');
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể chọn file.');
    }
  };

  const handleSubmit = async () => {
    if (!task) return;

    try {
      let resultData: any = null;

      if (submissionType === 'file') {
        if (!resultFile) {
          Alert.alert('Cảnh báo', 'Vui lòng chọn file kết quả.');
          return;
        }
        setIsUploading(true);
        const uploaded = await uploadToCloudinary(
          resultFile,
          `GETVINI/ERP/TASK/${task.id}`
        );
        setIsUploading(false);
        if (!uploaded) {
          Alert.alert('Lỗi', 'Tải file kết quả lên không thành công.');
          return;
        }
        resultData = uploaded;
      } else if (submissionType === 'link') {
        const rawLink = resultLink.trim();
        if (!rawLink) {
          Alert.alert('Cảnh báo', 'Vui lòng nhập đường dẫn kết quả.');
          return;
        }
        if (!isValidUrl(rawLink)) {
          Alert.alert(
            'Đường dẫn không hợp lệ',
            'Vui lòng nhập đúng định dạng liên kết (Ví dụ: google.com hoặc https://example.com).'
          );
          return;
        }
        const url = normalizeUrl(rawLink);
        resultData = { type: 'LINK', url, name: url };
      }

      await submitResultMutation.mutateAsync({
        id: task.id,
        payload: {
          result: resultData,
          projectId: task.project?.id,
        },
      });

      Alert.alert('Thành công', 'Đã gửi kết quả công việc thành công!');
      onClose();
      onSuccess();
    } catch (err: any) {
      setIsUploading(false);
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi gửi kết quả.');
    }
  };

  const isReady =
    submissionType === 'file'
      ? Boolean(resultFile)
      : Boolean(resultLink.trim());

  const isPending = submitResultMutation.isPending || isUploading;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-slate-900/50 justify-end" activeOpacity={1} onPress={onClose}>
        <TouchableOpacity className="bg-surface rounded-t-3xl max-h-[85%] pb-6" activeOpacity={1} onPress={() => {}}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-border">
            <Text className="text-base font-extrabold text-text-primary">Gửi kết quả công việc</Text>
            <TouchableOpacity className="p-1.5 rounded-lg bg-slate-100" onPress={onClose}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Submission Type Switcher Tabs */}
          <View className="flex-row p-1.5 bg-slate-100 mx-5 mt-3.5 rounded-xl gap-1">
            <TouchableOpacity
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg ${
                submissionType === 'file' ? 'bg-surface shadow-xs' : ''
              }`}
              onPress={() => setSubmissionType('file')}
            >
              <Feather
                name="upload"
                size={14}
                color={submissionType === 'file' ? '#F38820' : '#64748B'}
              />
              <Text
                className={`text-xs ${
                  submissionType === 'file' ? 'font-bold text-primary' : 'font-semibold text-slate-500'
                }`}
              >
                Tải file
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg ${
                submissionType === 'link' ? 'bg-surface shadow-xs' : ''
              }`}
              onPress={() => setSubmissionType('link')}
            >
              <Feather
                name="link"
                size={14}
                color={submissionType === 'link' ? '#F38820' : '#64748B'}
              />
              <Text
                className={`text-xs ${
                  submissionType === 'link' ? 'font-bold text-primary' : 'font-semibold text-slate-500'
                }`}
              >
                Gửi link
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
            {submissionType === 'file' && (
              <View className="gap-3">
                <TouchableOpacity
                  className="border-2 border-dashed border-slate-300 rounded-2xl p-6 items-center bg-background gap-2"
                  onPress={handlePickFile}
                >
                  <View className="w-11 h-11 rounded-full bg-primary-light items-center justify-center">
                    <Feather name="upload-cloud" size={24} color="#F38820" />
                  </View>
                  <Text className="text-sm font-bold text-text-primary text-center">
                    {resultFile ? resultFile.name : 'Nhấn để chọn file kết quả'}
                  </Text>
                  <Text className="text-xs text-slate-400 text-center">Chấp nhận file hình ảnh, PDF, Word, Excel...</Text>
                </TouchableOpacity>

                {resultFile && (
                  <TouchableOpacity
                    className="flex-row items-center justify-center gap-1.5 py-1.5"
                    onPress={() => setResultFile(null)}
                  >
                    <Feather name="trash-2" size={13} color="#EF4444" />
                    <Text className="text-xs font-bold text-danger">Gỡ bỏ file đã chọn</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {submissionType === 'link' && (
              <View className="gap-3">
                <Text className="text-[10px] font-extrabold text-slate-500 tracking-wider mb-1">ĐƯỜNG DẪN KẾT QUẢ *</Text>
                <View className="flex-row items-center bg-background border border-border rounded-xl px-3">
                  <Feather name="link" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    className="flex-1 py-3 text-sm text-text-primary"
                    placeholder="https://drive.google.com/..."
                    placeholderTextColor="#94A3B8"
                    value={resultLink}
                    onChangeText={setResultLink}
                    autoCapitalize="none"
                  />
                </View>
                <Text className="text-xs text-slate-400 italic">
                  * Vui lòng đảm bảo quyền truy cập link cho quản lý và khách hàng
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View className="flex-row gap-3 px-5 pt-3">
            <TouchableOpacity
              className="flex-1 py-3.5 rounded-xl border border-border items-center bg-surface"
              onPress={onClose}
              disabled={isPending}
            >
              <Text className="text-sm font-bold text-slate-500">Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 py-3.5 rounded-xl bg-primary items-center ${
                !isReady || isPending ? 'opacity-50' : ''
              }`}
              onPress={handleSubmit}
              disabled={!isReady || isPending}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-sm font-bold text-white">Hoàn tất</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

