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
import { teamService, CompanyUser, TEAM_MEMBER_ROLE_LABELS, USER_ROLE } from '@/services/teamService';
import { BrandColors } from '@/constants/colors';

interface AddTeamMemberModalProps {
  visible: boolean;
  onClose: () => void;
  teamId: string;
  existingMemberUserIds: string[];
  existingLeadName?: string;
  onSuccess: () => void;
}

export default function AddTeamMemberModal({
  visible,
  onClose,
  teamId,
  existingMemberUserIds,
  existingLeadName,
  onSuccess,
}: AddTeamMemberModalProps) {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('EDITOR');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedUserId('');
      setSelectedRole('EDITOR');
      loadUsers();
    }
  }, [visible]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await teamService.getAvailableUsers();
      if (res.data) {
        setUsers(res.data);
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoadingUsers(false);
    }
  };

  const availableUsers = users.filter((u) => !existingMemberUserIds.includes(u.id));

  const handleAdd = async () => {
    if (!selectedUserId) {
      Alert.alert('Cảnh báo', 'Vui lòng chọn nhân sự muốn thêm vào đội.');
      return;
    }
    if (!teamId) {
      Alert.alert('Lỗi', 'Không tìm thấy mã Đội thực hiện.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await teamService.addTeamMember(teamId, selectedUserId, selectedRole);
      if (res.error) {
        Alert.alert('Lỗi', res.error || 'Thêm nhân sự thất bại.');
      } else {
        Alert.alert('Thành công', 'Đã thêm nhân sự vào đội dự án!');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi thêm nhân sự.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleBox}>
              <Text style={styles.title}>Thêm nhân sự vào đội dự án</Text>
              <Text style={styles.subtitle}>Chọn nhân viên công ty & phân bổ vai trò</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* User Selection Section */}
          <Text style={styles.label}>1. Chọn nhân sự ({availableUsers.length})</Text>
          {loadingUsers ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={BrandColors.primary} />
              <Text style={styles.loadingText}>Đang tải danh sách nhân sự...</Text>
            </View>
          ) : availableUsers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="users" size={24} color="#94A3B8" />
              <Text style={styles.emptyText}>Tất cả nhân sự công ty đã có trong dự án.</Text>
            </View>
          ) : (
            <ScrollView style={styles.userList} showsVerticalScrollIndicator={false}>
              {availableUsers.map((user) => {
                const isSelected = selectedUserId === user.id;
                return (
                  <TouchableOpacity
                    key={user.id}
                    style={[styles.userOption, isSelected && styles.userOptionSelected]}
                    onPress={() => setSelectedUserId(user.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.userInfo}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                          {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.userName}>{user.fullName}</Text>
                        <Text style={styles.userSub}>
                          {user.role ? (USER_ROLE[user.role] || user.role) : user.email || 'Nhân sự'}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Feather name="check-circle" size={18} color={BrandColors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Role Selection Section */}
          <Text style={styles.label}>2. Chọn vai trò chuyên môn trong đội</Text>
          <ScrollView style={styles.roleScrollView} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <View style={styles.roleGrid}>
              {[
                {
                  key: 'ACCOUNT',
                  label: 'Lead dự án',
                  desc: 'Quản lý & duyệt công việc nhóm',
                },
                { key: 'EDITOR', label: 'Editor', desc: 'Dựng phim & biên tập video' },
                { key: 'CONTENT_CREATOR', label: 'Nội dung', desc: 'Sáng tạo nội dung & bài viết' },
                { key: 'GRAPHIC_DESIGNER', label: 'Thiết kế đồ họa', desc: 'Thiết kế banner, hình ảnh' },
                { key: 'CAMERAMAN', label: 'Quay phim', desc: 'Quay hình & kỹ thuật hình ảnh' },
                { key: 'SCRIPTER', label: 'Biên kịch', desc: 'Viết kịch bản truyền thông' },
                { key: 'SOCIAL_MEDIA_MANAGER', label: 'Quản lý MXH', desc: 'Quản trị các trang MXH' },
                { key: 'SEO_SPECIALIST', label: 'Chuyên viên SEO', desc: 'Tối ưu hóa công cụ tìm kiếm' },
              ].map((roleItem) => {
                const isLeadDisabled = roleItem.key === 'ACCOUNT' && !!existingLeadName;
                const isSelected = selectedRole === roleItem.key && !isLeadDisabled;

                return (
                  <TouchableOpacity
                    key={roleItem.key}
                    style={[
                      styles.roleCard,
                      isSelected && styles.roleCardSelected,
                      isLeadDisabled && styles.roleCardDisabled,
                    ]}
                    onPress={() => {
                      if (isLeadDisabled) {
                        Alert.alert(
                          'Không thể chọn',
                          `Dự án này đã có Lead dự án (${existingLeadName}). Mỗi dự án chỉ được phép có 1 Lead.`
                        );
                        return;
                      }
                      setSelectedRole(roleItem.key);
                    }}
                    activeOpacity={isLeadDisabled ? 0.9 : 0.8}
                  >
                    <View style={styles.roleHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          style={[
                            styles.roleTitle,
                            isSelected && styles.roleTitleSelected,
                            isLeadDisabled && styles.roleTitleDisabled,
                          ]}
                        >
                          {roleItem.label}
                        </Text>
                        {isLeadDisabled && (
                          <View style={styles.disabledLockTag}>
                            <Feather name="lock" size={10} color="#94A3B8" />
                            <Text style={styles.disabledLockTagText}>Đã có Lead</Text>
                          </View>
                        )}
                      </View>
                      {isSelected && !isLeadDisabled && (
                        <Feather name="check-circle" size={15} color={BrandColors.primary} />
                      )}
                    </View>
                    <Text style={styles.roleDesc}>
                      {isLeadDisabled
                        ? `Dự án đã có Lead phụ trách (${existingLeadName})`
                        : roleItem.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, (!selectedUserId || isSubmitting) && styles.btnDisabled]}
              onPress={handleAdd}
              disabled={!selectedUserId || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="user-plus" size={15} color="#FFFFFF" />
                  <Text style={styles.submitText}>Thêm vào đội</Text>
                </>
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
    maxHeight: '85%',
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  headerTitleBox: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  emptyBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
  },
  userList: {
    maxHeight: 160,
  },
  roleScrollView: {
    maxHeight: 180,
  },
  userOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
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
    flex: 1,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  userSub: {
    fontSize: 11,
    color: '#64748B',
  },
  roleGrid: {
    gap: 8,
  },
  roleCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  roleCardSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: '#F0FDFA',
  },
  roleCardDisabled: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    opacity: 0.7,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  roleTitleSelected: {
    color: BrandColors.primary,
  },
  roleTitleDisabled: {
    color: '#94A3B8',
  },
  disabledLockTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  disabledLockTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  roleDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginTop: 6,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: BrandColors.primary,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
