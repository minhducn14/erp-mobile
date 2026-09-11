import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BrandColors } from '@/constants/colors';
import { formatVND } from '@/utils/formatters';

interface FocusBannerProps {
  userName?: string;
  pendingApprovalCount?: number;
  activeProjectCount?: number;
  totalDebt?: number;
  averageProgress?: number;
  isAdminOrBod?: boolean;
  onViewApprovals?: () => void;
  onViewProjects?: () => void;
}

export const FocusBanner: React.FC<FocusBannerProps> = ({
  userName,
  pendingApprovalCount = 0,
  activeProjectCount = 0,
  totalDebt = 0,
  averageProgress = 65,
  isAdminOrBod = false,
  onViewApprovals,
  onViewProjects,
}) => {
  const formatCompactMoney = (val?: number) => {
    if (!val) return '0 ₫';
    if (val >= 1_000_000_000) {
      return `${(val / 1_000_000_000).toFixed(1)} Tỷ`;
    }
    if (val >= 1_000_000) {
      return `${(val / 1_000_000).toFixed(0)} Tr`;
    }
    return formatVND(val);
  };

  return (
    <View className="bg-primary-light rounded-2xl p-[18px] border-[1.5px] border-orange-200 mb-4 shadow-sm">
      <View className="flex-row justify-between items-center mb-2">
        <View className="bg-rose-100 px-2 py-0.5 rounded-sm">
          <Text className="text-[9px] font-extrabold text-rose-600 tracking-wider">
            {isAdminOrBod ? 'ADMIN FOCUS' : 'MEMBER FOCUS'}
          </Text>
        </View>

        {/* Circular / Pill Progress Indicator */}
        <View className="flex-row items-center gap-1 bg-surface px-2.5 py-0.5 rounded-full border border-orange-200">
          <Feather name="trending-up" size={13} color={BrandColors.primary} />
          <Text className="text-[11px] font-bold text-primary-dark">{averageProgress}% tiến độ TB</Text>
        </View>
      </View>

      <Text className="text-xl font-extrabold text-text-primary leading-6 tracking-tight mb-3.5">
        Tập trung để tạo ra{'\n'}những điều khác biệt! 🔥
      </Text>

      {/* 3 Quick Highlight Pills */}
      <View className="flex-row gap-2.5">
        {pendingApprovalCount > 0 && (
          <TouchableOpacity
            className="flex-1 flex-row items-center gap-2 bg-surface px-2.5 py-2 rounded-xl border border-orange-100 border-l-[3px] border-l-danger shadow-xs"
            onPress={onViewApprovals}
            activeOpacity={0.8}
            disabled={!onViewApprovals}
          >
            <View className="w-7 h-7 rounded-lg bg-danger-light items-center justify-center">
              <Feather name="clipboard" size={14} color="#EF4444" />
            </View>
            <View>
              <Text className="text-sm font-extrabold text-text-primary">{pendingApprovalCount}</Text>
              <Text className="text-[9px] font-semibold text-text-secondary">Cần duyệt</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          className="flex-1 flex-row items-center gap-2 bg-surface px-2.5 py-2 rounded-xl border border-orange-100 shadow-xs"
          onPress={onViewProjects}
          activeOpacity={0.8}
          disabled={!onViewProjects}
        >
          <View className="w-7 h-7 rounded-lg bg-info-light items-center justify-center">
            <Feather name="folder" size={14} color="#3B82F6" />
          </View>
          <View>
            <Text className="text-sm font-extrabold text-text-primary">{activeProjectCount}</Text>
            <Text className="text-[9px] font-semibold text-text-secondary">Dự án chạy</Text>
          </View>
        </TouchableOpacity>

        {isAdminOrBod && totalDebt > 0 && (
          <View className="flex-1 flex-row items-center gap-2 bg-surface px-2.5 py-2 rounded-xl border border-orange-100 shadow-xs">
            <View className="w-7 h-7 rounded-lg bg-warning-light items-center justify-center">
              <Feather name="credit-card" size={14} color="#F59E0B" />
            </View>
            <View>
              <Text className="text-sm font-extrabold text-text-primary" numberOfLines={1}>
                {formatCompactMoney(totalDebt)}
              </Text>
              <Text className="text-[9px] font-semibold text-text-secondary">Công nợ</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};
