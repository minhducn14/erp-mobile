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
import { USER_ROLE } from '@/services/teamService';
import { useAvailableUsersQuery, useAddTeamMemberMutation } from '@/hooks/queries/useProjects';
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
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('EDITOR');

  const { data: usersData, isLoading: loadingUsers } = useAvailableUsersQuery();
  const users = usersData || [];

  const addMemberMutation = useAddTeamMemberMutation();
  const isSubmitting = addMemberMutation.isPending;

  useEffect(() => {
    if (visible) {
      setSelectedUserId('');
      setSelectedRole('EDITOR');
    }
  }, [visible]);

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

    try {
      await addMemberMutation.mutateAsync({
        teamId,
        userId: selectedUserId,
        role: selectedRole,
      });

      Alert.alert('Thành công', 'Đã thêm nhân sự vào đội dự án!');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi thêm nhân sự.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-900/50 justify-end">
        <View className="bg-surface rounded-t-3xl max-h-[85%] p-5 gap-3">
          {/* Header */}
          <View className="flex-row justify-between items-center border-b border-slate-100 pb-3">
            <View className="flex-1">
              <Text className="text-base font-bold text-text-primary">Thêm nhân sự vào đội dự án</Text>
              <Text className="text-xs text-text-secondary mt-0.5">Chọn nhân viên công ty & phân bổ vai trò</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* User Selection Section */}
          <Text className="text-xs font-bold text-slate-700 mt-1">1. Chọn nhân sự ({availableUsers.length})</Text>
          {loadingUsers ? (
            <View className="py-6 items-center gap-2">
              <ActivityIndicator size="small" color={BrandColors.primary} />
              <Text className="text-xs text-text-muted">Đang tải danh sách nhân sự...</Text>
            </View>
          ) : availableUsers.length === 0 ? (
            <View className="py-5 items-center justify-center gap-1.5 bg-background rounded-xl">
              <Feather name="users" size={24} color="#94A3B8" />
              <Text className="text-xs text-text-secondary">Tất cả nhân sự công ty đã có trong dự án.</Text>
            </View>
          ) : (
            <ScrollView className="max-h-[160px]" showsVerticalScrollIndicator={false}>
              {availableUsers.map((user) => {
                const isSelected = selectedUserId === user.id;
                return (
                  <TouchableOpacity
                    key={user.id}
                    className={`flex-row items-center justify-between py-2 px-2.5 rounded-xl mb-1.5 border ${
                      isSelected ? 'border-primary bg-teal-50/50' : 'border-border bg-slate-50/50'
                    }`}
                    onPress={() => setSelectedUserId(user.id)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center gap-2.5 flex-1">
                      <View className="w-8 h-8 rounded-full bg-slate-200 items-center justify-center">
                        <Text className="text-xs font-bold text-slate-600">
                          {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs font-semibold text-text-primary">{user.fullName}</Text>
                        <Text className="text-[11px] text-text-secondary">
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
          <Text className="text-xs font-bold text-slate-700 mt-1">2. Chọn vai trò chuyên môn trong đội</Text>
          <ScrollView className="max-h-[180px]" nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <View className="gap-2">
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
                    className={`p-2.5 rounded-xl border ${
                      isSelected
                        ? 'border-primary bg-teal-50/50'
                        : isLeadDisabled
                        ? 'border-border bg-background opacity-70'
                        : 'border-border bg-slate-50/50'
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
                          className={`text-xs font-bold ${
                            isSelected
                              ? 'text-primary'
                              : isLeadDisabled
                              ? 'text-text-muted'
                              : 'text-slate-700'
                          }`}
                        >
                          {roleItem.label}
                        </Text>
                        {isLeadDisabled && (
                          <View className="flex-row items-center gap-[3px] bg-slate-100 px-1.5 py-0.5 rounded">
                            <Feather name="lock" size={10} color="#94A3B8" />
                            <Text className="text-[10px] font-semibold text-text-secondary">Đã có Lead</Text>
                          </View>
                        )}
                      </View>
                      {isSelected && !isLeadDisabled && (
                        <Feather name="check-circle" size={15} color={BrandColors.primary} />
                      )}
                    </View>
                    <Text className="text-[11px] text-text-secondary mt-0.5">
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
          <View className="flex-row justify-end gap-2.5 border-t border-slate-100 pt-3 mt-1.5">
            <TouchableOpacity className="px-4 py-2.5 rounded-xl bg-slate-100" onPress={onClose} disabled={isSubmitting}>
              <Text className="text-xs font-semibold text-slate-600">Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-row items-center gap-1.5 px-[18px] py-2.5 rounded-xl bg-primary ${(!selectedUserId || isSubmitting) ? 'opacity-50' : ''}`}
              onPress={handleAdd}
              disabled={!selectedUserId || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="user-plus" size={15} color="#FFFFFF" />
                  <Text className="text-xs font-bold text-white">Thêm vào đội</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
