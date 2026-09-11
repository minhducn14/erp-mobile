import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TeamMember, TEAM_MEMBER_ROLE_LABELS } from '@/services/teamService';
import { useUpdateTeamMemberRoleMutation } from '@/hooks/queries/useProjects';

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
      <View className="flex-1 bg-slate-900/60 justify-end">
        <View className="bg-surface rounded-t-3xl p-5 max-h-[90%] gap-3.5">
          {/* Header */}
          <View className="flex-row justify-between items-start">
            <View className="gap-0.5">
              <Text className="text-lg font-bold text-text-primary">Cập nhật vai trò thành viên</Text>
              <Text className="text-xs text-slate-500">{member.user?.fullName || 'Nhân sự'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1 rounded-lg bg-slate-100">
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Member Card Summary */}
          <View className="flex-row items-center gap-3 bg-background rounded-xl p-3 border border-border">
            <View className="w-9 h-9 rounded-full bg-primary-light justify-center items-center">
              <Text className="text-sm font-bold text-primary">
                {member.user?.fullName ? member.user.fullName.charAt(0).toUpperCase() : 'M'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-text-primary">{member.user?.fullName || 'Thành viên'}</Text>
              <Text className="text-xs text-slate-500">
                Vai trò hiện tại:{' '}
                <Text className="font-bold text-primary">
                  {TEAM_MEMBER_ROLE_LABELS[member.role] || member.role}
                </Text>
              </Text>
            </View>
          </View>

          {/* Role Selection */}
          <Text className="text-xs font-bold text-slate-700">Chọn vai trò chuyên môn mới</Text>
          <ScrollView className="max-h-[280px]" nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <View className="gap-2">
              {ROLES_LIST.map((roleItem) => {
                const isLeadDisabled =
                  roleItem.key === 'ACCOUNT' && !!existingLeadName && !isTargetAlreadyLead;
                const isSelected = selectedRole === roleItem.key && !isLeadDisabled;

                return (
                  <TouchableOpacity
                    key={roleItem.key}
                    className={`border rounded-xl p-3 gap-1 ${
                      isSelected
                        ? 'border-primary bg-orange-50/40'
                        : isLeadDisabled
                        ? 'border-border bg-background opacity-70'
                        : 'border-border bg-surface'
                    }`}
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
                    <View className="flex-row justify-between items-center">
                      <View className="flex-row items-center gap-1.5">
                        <Text
                          className={`text-sm font-bold ${
                            isSelected
                              ? 'text-primary'
                              : isLeadDisabled
                              ? 'text-slate-400'
                              : 'text-text-primary'
                          }`}
                        >
                          {roleItem.label}
                        </Text>
                        {isLeadDisabled && (
                          <View className="flex-row items-center gap-1 bg-slate-200 px-1.5 py-0.5 rounded">
                            <Feather name="lock" size={10} color="#94A3B8" />
                            <Text className="text-[10px] font-bold text-slate-500">Đã có Lead</Text>
                          </View>
                        )}
                      </View>
                      {isSelected && (
                        <Feather name="check-circle" size={16} color="#F38820" />
                      )}
                    </View>
                    <Text
                      className={`text-xs ${
                        isSelected
                          ? 'text-orange-700'
                          : isLeadDisabled
                          ? 'text-slate-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {roleItem.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View className="flex-row gap-3 mt-1.5">
            <TouchableOpacity className="flex-1 py-3 rounded-xl border border-border items-center justify-center" onPress={onClose} disabled={isSubmitting}>
              <Text className="text-sm font-semibold text-slate-500">Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-[2] flex-row items-center justify-center gap-1.5 bg-primary py-3 rounded-xl ${
                isSubmitting ? 'opacity-60' : ''
              }`}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#FFFFFF" />
                  <Text className="text-sm font-bold text-white">Cập nhật vai trò</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

