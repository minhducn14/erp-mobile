import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BrandColors } from '@/constants/colors';

interface HotProjectItem {
  id: string;
  name: string;
  status: string;
  progress?: number;
  clientName?: string;
  serviceCount?: number;
  completedServiceCount?: number;
}

interface HotProjectsWidgetProps {
  projects: HotProjectItem[];
  onProjectPress?: (project: HotProjectItem) => void;
  onViewAll?: () => void;
}

export const HotProjectsWidget: React.FC<HotProjectsWidgetProps> = ({
  projects,
  onProjectPress,
  onViewAll,
}) => {
  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <View className="bg-surface rounded-[18px] p-4 border border-border mb-4">
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center gap-2">
          <View className="w-2 h-2 rounded-full bg-info" />
          <Text className="text-[15px] font-bold text-text-primary">Dự án tiêu điểm ({projects.length})</Text>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text className="text-xs font-semibold text-primary">Xem tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="gap-2.5">
        {projects.slice(0, 3).map((p) => {
          const progress = p.progress ?? 50;
          return (
            <TouchableOpacity
              key={p.id}
              className="bg-background rounded-xl p-3 border border-slate-100"
              onPress={() => onProjectPress && onProjectPress(p)}
              activeOpacity={0.7}
            >
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-sm font-bold text-text-primary flex-1 mr-2.5" numberOfLines={1}>
                  {p.name}
                </Text>
                <Text className="text-xs font-extrabold text-primary">{progress}%</Text>
              </View>

              {p.clientName && (
                <Text className="text-[11px] text-text-secondary mb-2" numberOfLines={1}>
                  Khách hàng: {p.clientName}
                </Text>
              )}

              {/* Progress Bar */}
              <View className="h-1.25 bg-slate-200 rounded-full overflow-hidden">
                <View className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
