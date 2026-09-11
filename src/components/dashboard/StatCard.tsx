import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BrandColors } from '@/constants/colors';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: keyof typeof Feather.glyphMap;
  color?: string;
  bgColor?: string;
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = BrandColors.primary,
  bgColor = '#FFF7ED',
  onPress,
}) => {
  return (
    <TouchableOpacity
      className="flex-1 min-w-[46%] bg-surface rounded-2xl p-[14px] border border-border shadow-sm"
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      disabled={!onPress}
    >
      <View className="flex-row justify-between items-center mb-2.5">
        <View className="w-[38px] h-[38px] rounded-md items-center justify-center" style={{ backgroundColor: bgColor }}>
          <Feather name={icon} size={20} color={color} />
        </View>
        {onPress && <Feather name="chevron-right" size={16} color="#CBD5E1" />}
      </View>
      <Text className="text-[22px] font-extrabold text-text-primary tracking-tight" numberOfLines={1}>
        {value}
      </Text>
      <Text className="text-xs font-semibold text-slate-600 mt-0.5" numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-[11px] text-text-muted mt-0.5" numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};
