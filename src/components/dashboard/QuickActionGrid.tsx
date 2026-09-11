import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/colors';
import { canAccessOpportunities, canAccessCustomers, canAccessContracts, isManagementRole } from '@/utils/rbac';
import { formatVND } from '@/utils/formatters';

interface QuickActionGridProps {
  userRole?: string;
  totalDebt?: number;
}

interface ActionItem {
  id: string;
  label: string;
  iconName: string;
  iconType: 'feather' | 'ionicons';
  iconColor: string;
  bgColor: string;
  badge?: string;
  onPress: () => void;
}

export const QuickActionGrid: React.FC<QuickActionGridProps> = ({
  userRole,
  totalDebt = 0,
}) => {
  const router = useRouter();
  const hasOppAccess = canAccessOpportunities(userRole);

  // Actions for Sales & Management roles (BOD, Admin, BD, Admin Sale)
  const salesActions: ActionItem[] = [
    {
      id: 'opp_pipeline',
      label: 'Cơ hội',
      iconName: 'trending-up',
      iconType: 'feather',
      iconColor: '#8B5CF6',
      bgColor: '#F3E8FF',
      onPress: () => router.push('/opportunities' as any),
    },
    {
      id: 'contracts',
      label: 'Hợp đồng',
      iconName: 'document-text-outline',
      iconType: 'ionicons',
      iconColor: '#2563EB',
      bgColor: '#EFF6FF',
      onPress: () => router.push('/contracts' as any),
    },
    {
      id: 'create_opp',
      label: 'Tạo Cơ hội',
      iconName: 'plus',
      iconType: 'feather',
      iconColor: BrandColors.primary,
      bgColor: '#FFF4EA',
      onPress: () => router.push('/opportunities/create' as any),
    },
    {
      id: 'customers',
      label: 'Khách hàng',
      iconName: 'people-outline',
      iconType: 'ionicons',
      iconColor: '#10B981',
      bgColor: '#ECFDF5',
      onPress: () => router.push('/customers' as any),
    },
    {
      id: 'projects',
      label: 'Dự án',
      iconName: 'briefcase-outline',
      iconType: 'ionicons',
      iconColor: '#3B82F6',
      bgColor: '#EFF6FF',
      onPress: () => router.push('/projects' as any),
    },
    {
      id: 'tasks',
      label: 'Nhiệm vụ',
      iconName: 'checkbox-outline',
      iconType: 'ionicons',
      iconColor: '#F59E0B',
      bgColor: '#FFFBEB',
      onPress: () => router.push('/tasks' as any),
    },
    {
      id: 'acceptances',
      label: 'Nghiệm thu',
      iconName: 'checkmark-done-circle-outline',
      iconType: 'ionicons',
      iconColor: '#059669',
      bgColor: '#ECFDF5',
      onPress: () => router.push('/acceptances' as any),
    },
    {
      id: 'explore',
      label: 'Tất cả',
      iconName: 'grid-outline',
      iconType: 'ionicons',
      iconColor: '#6366F1',
      bgColor: '#EEF2FF',
      onPress: () => router.push('/explore'),
    },
  ];

  // Actions for Staff / Technical Members (Staff A/B/C/D, PM)
  const staffActions: ActionItem[] = [
    {
      id: 'my_tasks',
      label: 'Việc của tôi',
      iconName: 'checkbox-outline',
      iconType: 'ionicons',
      iconColor: BrandColors.primary,
      bgColor: '#FFF4EA',
      onPress: () => router.push('/tasks' as any),
    },
    {
      id: 'my_projects',
      label: 'Dự án',
      iconName: 'briefcase-outline',
      iconType: 'ionicons',
      iconColor: '#3B82F6',
      bgColor: '#EFF6FF',
      onPress: () => router.push('/projects' as any),
    },
    {
      id: 'my_acceptances',
      label: 'Nghiệm thu',
      iconName: 'checkmark-done-circle-outline',
      iconType: 'ionicons',
      iconColor: '#059669',
      bgColor: '#ECFDF5',
      onPress: () => router.push('/acceptances' as any),
    },
    {
      id: 'profile',
      label: 'Hồ sơ tôi',
      iconName: 'person-outline',
      iconType: 'ionicons',
      iconColor: '#10B981',
      bgColor: '#ECFDF5',
      onPress: () => router.push('/profile' as any),
    },
    {
      id: 'calendar',
      label: 'Lịch làm việc',
      iconName: 'calendar-outline',
      iconType: 'ionicons',
      iconColor: '#8B5CF6',
      bgColor: '#F3E8FF',
      onPress: () => router.push('/tasks' as any),
    },
    {
      id: 'support',
      label: 'Hỗ trợ',
      iconName: 'help-circle-outline',
      iconType: 'ionicons',
      iconColor: '#0284C7',
      bgColor: '#E0F2FE',
      onPress: () => {
        Alert.alert('Trung tâm Hỗ trợ', 'Vui lòng liên hệ quản lý dự án (PM) hoặc phòng IT Getvini nếu bạn cần hỗ trợ.');
      },
    },
    {
      id: 'notif',
      label: 'Thông báo',
      iconName: 'notifications-outline',
      iconType: 'ionicons',
      iconColor: '#EC4899',
      bgColor: '#FDF2F8',
      onPress: () => {
        Alert.alert('Thông báo', 'Bạn không có thông báo mới nào chưa đọc.');
      },
    },
    {
      id: 'explore_staff',
      label: 'Khám phá',
      iconName: 'grid-outline',
      iconType: 'ionicons',
      iconColor: '#6366F1',
      bgColor: '#EEF2FF',
      onPress: () => router.push('/explore'),
    },
  ];

  const actions = hasOppAccess ? salesActions : staffActions;

  return (
    <View className="bg-surface rounded-2xl px-3 py-4 mb-4 border border-border shadow-xs">
      <View className="flex-row justify-between items-center px-1 mb-3.5">
        <Text className="text-[15px] font-bold text-text-primary tracking-tight">Tiện ích truy cập nhanh</Text>
      </View>

      <View className="flex-row flex-wrap">
        {actions.map((item) => (
          <TouchableOpacity
            key={item.id}
            className="w-1/4 items-center py-2 px-0.5"
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View className="w-[50px] h-[50px] rounded-2xl justify-center items-center mb-1.5 relative" style={{ backgroundColor: item.bgColor }}>
              {item.iconType === 'feather' ? (
                <Feather name={item.iconName as any} size={22} color={item.iconColor} />
              ) : (
                <Ionicons name={item.iconName as any} size={22} color={item.iconColor} />
              )}

              {item.badge ? (
                <View className="absolute -top-1 -right-1.5 bg-danger px-1 py-0.5 rounded-lg border-[1.5px] border-surface">
                  <Text className="text-[9px] font-extrabold text-white">{item.badge}</Text>
                </View>
              ) : null}
            </View>

            <Text className="text-xs font-semibold text-slate-700 text-center leading-4" numberOfLines={2}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};
