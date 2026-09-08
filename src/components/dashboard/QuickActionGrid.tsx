import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/colors';
import { canAccessOpportunities, canAccessCustomers, isManagementRole } from '@/utils/rbac';

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
  const hasCustAccess = canAccessCustomers(userRole);
  const isMgmt = isManagementRole(userRole);

  const formatShortMoney = (val: number) => {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} Tỷ`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)} Tr`;
    return `${val.toLocaleString('vi-VN')} ₫`;
  };

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
      id: 'create_opp',
      label: 'Tạo Cơ hội',
      iconName: 'plus',
      iconType: 'feather',
      iconColor: BrandColors.primary,
      bgColor: '#FFF4EA',
      badge: 'Mới',
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
      id: 'review',
      label: 'Duyệt việc',
      iconName: 'time-outline',
      iconType: 'ionicons',
      iconColor: '#EC4899',
      bgColor: '#FDF2F8',
      onPress: () => router.push('/tasks' as any),
    },
    {
      id: 'debt',
      label: 'Công nợ thu',
      iconName: 'card-outline',
      iconType: 'ionicons',
      iconColor: '#059669',
      bgColor: '#ECFDF5',
      badge: totalDebt > 0 ? formatShortMoney(totalDebt) : undefined,
      onPress: () => {
        Alert.alert(
          'Theo dõi Công nợ',
          totalDebt > 0
            ? `Tổng công nợ cần thu kỳ này là ${totalDebt.toLocaleString('vi-VN')} ₫.`
            : 'Hiện tại không có công nợ quá hạn cần xử lý.'
        );
      },
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
      id: 'my_review',
      label: 'Chờ duyệt',
      iconName: 'time-outline',
      iconType: 'ionicons',
      iconColor: '#F59E0B',
      bgColor: '#FFFBEB',
      onPress: () => router.push('/tasks' as any),
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
    <View style={styles.cardWrapper}>
      <View style={styles.headerTitleRow}>
        <Text style={styles.sectionHeaderTitle}>Tiện ích truy cập nhanh</Text>
      </View>

      <View style={styles.gridContainer}>
        {actions.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.gridItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: item.bgColor }]}>
              {item.iconType === 'feather' ? (
                <Feather name={item.iconName as any} size={22} color={item.iconColor} />
              ) : (
                <Ionicons name={item.iconName as any} size={22} color={item.iconColor} />
              )}

              {item.badge ? (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.itemLabel} numberOfLines={2}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1.5,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sectionHeaderHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  itemLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 16,
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#EF4444',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
