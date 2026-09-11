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
import { TeamMember, TEAM_MEMBER_ROLE_LABELS } from '@/services/teamService';
import { useUpdateTeamMemberRoleMutation } from '@/hooks/queries/useProjects';
import { BrandColors } from '@/constants/colors';

interface EditTeamMemberRoleModalProps {
  visible: boolean;
  onClose: () => void;
  teamId: string;
  member: TeamMember | null;
  existingLeadName?: string;
  existingLeadUserId?: string;
  onSuccess: () => void;
}

const ROLES_LIST = [
  { key: 'ACCOUNT', label: 'Lead dự án', desc: 'Quản lý & duyệt công việc nhóm' },
  { key: 'EDITOR', label: 'Editor', desc: 'Dựng phim & biên tập video' },
  { key: 'CONTENT_CREATOR', label: 'Nội dung', desc: 'Sáng tạo nội dung & bài viết' },
  { key: 'GRAPHIC_DESIGNER', label: 'Thiết kế đồ họa', desc: 'Thiết kế banner, hình ảnh' },
  { key: 'CAMERAMAN', label: 'Quay phim', desc: 'Quay hình & kỹ thuật hình ảnh' },
  { key: 'SCRIPTER', label: 'Biên kịch', desc: 'Viết kịch bản truyền thông' },
  { key: 'SOCIAL_MEDIA_MANAGER', label: 'Quản lý MXH', desc: 'Quản trị các trang MXH' },
  { key: 'SEO_SPECIALIST', label: 'Chuyên viên SEO', desc: 'Tối ưu hóa công cụ tìm kiếm' },
];

export default function EditTeamMemberRoleModal({
  visible,
  onClose,
  teamId,
  member,
  existingLeadName,
  existingLeadUserId,
  onSuccess,
}: EditTeamMemberRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<string>('EDITOR');
  const updateRoleMutation = useUpdateTeamMemberRoleMutation();
  const isSubmitting = updateRoleMutation.isPending;

  useEffect(() => {
    if (visible && member) {
      setSelectedRole(member.role || 'EDITOR');
    }
  }, [visible, member]);

  if (!member) return null;

  const currentMemberUserId = member.user?.id;
  const isTargetAlreadyLead = !!existingLeadUserId && existingLeadUserId === currentMemberUserId;

  const handleSave = async () => {
    if (member.role === 'ACCOUNT' || isTargetAlreadyLead) {
      Alert.alert('Không thể chỉnh sửa', 'Không được phép thay đổi vai trò của Lead dự án.');
      return;
    }

    if (!teamId || !member.id) {
      Alert.alert('Lỗi', 'Thông tin thành viên không hợp lệ.');
      return;
    }

    if (selectedRole === member.role) {
      onClose();
      return;
    }

    try {
      await updateRoleMutation.mutateAsync({
        teamId,
        memberId: member.id,
        role: selectedRole,
      });

      Alert.alert('Thành công', `Đã cập nhật vai trò của ${member.user?.fullName || 'nhân sự'} thành ${TEAM_MEMBER_ROLE_LABELS[selectedRole] || selectedRole}.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi cập nhật vai trò.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleBox}>
              <Text style={styles.title}>Cập nhật vai trò thành viên</Text>
              <Text style={styles.subtitle}>{member.user?.fullName || 'Nhân sự'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Member Card Summary */}
          <View style={styles.memberBox}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {member.user?.fullName ? member.user.fullName.charAt(0).toUpperCase() : 'M'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{member.user?.fullName || 'Thành viên'}</Text>
              <Text style={styles.memberCurrentRole}>
                Vai trò hiện tại:{' '}
                <Text style={{ fontWeight: '700', color: BrandColors.primary }}>
                  {TEAM_MEMBER_ROLE_LABELS[member.role] || member.role}
                </Text>
              </Text>
            </View>
          </View>

          {/* Role Selection */}
          <Text style={styles.label}>Chọn vai trò chuyên môn mới</Text>
          <ScrollView style={styles.roleScrollView} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <View style={styles.roleGrid}>
              {ROLES_LIST.map((roleItem) => {
                const isLeadDisabled =
                  roleItem.key === 'ACCOUNT' && !!existingLeadName && !isTargetAlreadyLead;
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
                          <View style={styles.lockBadge}>
                            <Feather name="lock" size={10} color="#94A3B8" />
                            <Text style={styles.lockBadgeText}>Đã có Lead</Text>
                          </View>
                        )}
                      </View>
                      {isSelected && (
                        <Feather name="check-circle" size={16} color={BrandColors.primary} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.roleDesc,
                        isSelected && styles.roleDescSelected,
                        isLeadDisabled && styles.roleDescDisabled,
                      ]}
                    >
                      {roleItem.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Cập nhật vai trò</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitleBox: {
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  memberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  memberCurrentRole: {
    fontSize: 12,
    color: '#64748B',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  roleScrollView: {
    maxHeight: 280,
  },
  roleGrid: {
    gap: 8,
  },
  roleCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    gap: 4,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleTitleSelected: {
    color: BrandColors.primary,
  },
  roleTitleDisabled: {
    color: '#94A3B8',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  roleDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  roleDescSelected: {
    color: '#0F766E',
  },
  roleDescDisabled: {
    color: '#CBD5E1',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
