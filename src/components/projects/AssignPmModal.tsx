import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { projectService, UserPMItem } from '@/services/projectService';
import { BrandColors } from '@/constants/colors';

interface AssignPmModalProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  contractId?: string;
  currentPmId?: string;
  onSuccess: () => void;
}

export default function AssignPmModal({
  visible,
  onClose,
  projectId,
  contractId,
  currentPmId,
  onSuccess,
}: AssignPmModalProps) {
  const [pmUsers, setPmUsers] = useState<UserPMItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedPmId, setSelectedPmId] = useState<string | undefined>(currentPmId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedPmId(currentPmId);
      loadPmUsers();
    }
  }, [visible, currentPmId]);

  const loadPmUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await projectService.getPmUsers();
      if (res.data) {
        setPmUsers(res.data);
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedPmId) {
      Alert.alert('Cảnh báo', 'Vui lòng chọn Quản lý dự án (PM).');
      return;
    }
    const targetContractId = contractId || projectId;
    setIsSubmitting(true);
    try {
      const res = await projectService.assignPm(targetContractId, selectedPmId);

      if (res.error) {
        Alert.alert('Lỗi', res.error || 'Khởi tạo gán PM thất bại.');
      } else {
        Alert.alert('Thành công', 'Đã phân công Quản lý dự án thành công.');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Phân công Quản lý Dự án (PM)</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* User List */}
          {loadingUsers ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={BrandColors.primary} />
              <Text style={styles.loadingText}>Đang tải danh sách PM...</Text>
            </View>
          ) : (
            <ScrollView style={styles.userList} showsVerticalScrollIndicator={false}>
              {pmUsers.map((user) => {
                const isSelected = selectedPmId === user.id;
                return (
                  <TouchableOpacity
                    key={user.id}
                    style={[styles.userOption, isSelected && styles.userOptionSelected]}
                    onPress={() => setSelectedPmId(user.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.userInfo}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                          {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.userName}>{user.fullName}</Text>
                        {user.email && <Text style={styles.userEmail}>{user.email}</Text>}
                      </View>
                    </View>
                    {isSelected && (
                      <Feather name="check-circle" size={20} color={BrandColors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleAssign}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitText}>Lưu phân công</Text>
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
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: '80%',
    padding: 20,
    gap: 16,
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
  },
  closeBtn: {
    padding: 4,
  },
  loadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  userList: {
    maxHeight: 280,
  },
  userOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  userOptionSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: '#F0FDFA',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
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
    paddingHorizontal: 18,
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
