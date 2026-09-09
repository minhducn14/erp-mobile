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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { uploadToCloudinary } from '@/services/cloudinaryService';
import { TaskDetail, taskService } from '@/services/taskService';
import { BrandColors } from '@/constants/colors';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      setIsSubmitting(true);
      const res = await taskService.submitTaskResult(task.id, {
        result: resultData,
        projectId: task.project?.id,
      });
      setIsSubmitting(false);

      if (res.error) {
        Alert.alert('Lỗi', res.error);
      } else {
        Alert.alert('Thành công', 'Đã gửi kết quả công việc thành công!');
        onClose();
        onSuccess();
      }
    } catch (err: any) {
      setIsUploading(false);
      setIsSubmitting(false);
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi gửi kết quả.');
    }
  };

  const isReady =
    submissionType === 'file'
      ? Boolean(resultFile)
      : Boolean(resultLink.trim());

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={() => {}}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Gửi kết quả công việc</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Submission Type Switcher Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, submissionType === 'file' && styles.tabBtnActive]}
              onPress={() => setSubmissionType('file')}
            >
              <Feather
                name="upload"
                size={14}
                color={submissionType === 'file' ? BrandColors.primary : '#64748B'}
              />
              <Text
                style={[
                  styles.tabText,
                  submissionType === 'file' && styles.tabTextActive,
                ]}
              >
                Tải file
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, submissionType === 'link' && styles.tabBtnActive]}
              onPress={() => setSubmissionType('link')}
            >
              <Feather
                name="link"
                size={14}
                color={submissionType === 'link' ? BrandColors.primary : '#64748B'}
              />
              <Text
                style={[
                  styles.tabText,
                  submissionType === 'link' && styles.tabTextActive,
                ]}
              >
                Gửi link
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {submissionType === 'file' && (
              <View style={styles.typeSection}>
                <TouchableOpacity style={styles.fileDropZone} onPress={handlePickFile}>
                  <View style={styles.iconCircle}>
                    <Feather name="upload-cloud" size={24} color={BrandColors.primary} />
                  </View>
                  <Text style={styles.fileDropTitle}>
                    {resultFile ? resultFile.name : 'Nhấn để chọn file kết quả'}
                  </Text>
                  <Text style={styles.fileDropDesc}>Chấp nhận file hình ảnh, PDF, Word, Excel...</Text>
                </TouchableOpacity>

                {resultFile && (
                  <TouchableOpacity
                    style={styles.removeFileBtn}
                    onPress={() => setResultFile(null)}
                  >
                    <Feather name="trash-2" size={13} color="#EF4444" />
                    <Text style={styles.removeFileText}>Gỡ bỏ file đã chọn</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {submissionType === 'link' && (
              <View style={styles.typeSection}>
                <Text style={styles.inputLabel}>ĐƯỜNG DẪN KẾT QUẢ *</Text>
                <View style={styles.inputWithIcon}>
                  <Feather name="link" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="https://drive.google.com/..."
                    placeholderTextColor="#94A3B8"
                    value={resultLink}
                    onChangeText={setResultLink}
                    autoCapitalize="none"
                  />
                </View>
                <Text style={styles.inputNote}>
                  * Vui lòng đảm bảo quyền truy cập link cho quản lý và khách hàng
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSubmitting || isUploading}
            >
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!isReady || isSubmitting || isUploading) && { opacity: 0.5 },
              ]}
              onPress={handleSubmit}
              disabled={!isReady || isSubmitting || isUploading}
            >
              {isSubmitting || isUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Hoàn tất</Text>
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
    maxHeight: '85%',
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
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 12,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
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
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  body: {
    padding: 20,
  },
  typeSection: {
    gap: 12,
  },
  fileDropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDropTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  fileDropDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  removeFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  removeFileText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputField: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  inputNote: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
