import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TaskItem } from '@/services/dashboardService';
import { BrandColors } from '@/constants/colors';

interface TodayTasksWidgetProps {
  tasks: TaskItem[];
  onTaskPress?: (task: TaskItem) => void;
  onViewAll?: () => void;
}

export const TodayTasksWidget: React.FC<TodayTasksWidgetProps> = ({
  tasks,
  onTaskPress,
  onViewAll,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
      case 'DONE':
        return { bg: '#ECFDF5', text: '#059669', label: 'Hoàn thành' };
      case 'IN_PROGRESS':
        return { bg: '#EFF6FF', text: '#2563EB', label: 'Đang làm' };
      case 'AWAITING_REVIEW':
        return { bg: '#FFFBEB', text: '#D97706', label: 'Chờ duyệt' };
      default:
        return { bg: '#F1F5F9', text: '#64748B', label: 'Cần làm' };
    }
  };

  return (
    <View className="bg-surface rounded-[18px] p-4 border border-border mb-5">
      <View className="flex-row justify-between items-center mb-3.5">
        <View className="flex-row items-center gap-2">
          <Feather name="calendar" size={16} color={BrandColors.primary} />
          <Text className="text-[15px] font-bold text-text-primary">Nhiệm vụ ưu tiên ({tasks.length})</Text>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text className="text-xs font-semibold text-primary">Tất cả việc</Text>
          </TouchableOpacity>
        )}
      </View>

      {tasks.length === 0 ? (
        <View className="py-5 items-center justify-center gap-2">
          <Feather name="check-circle" size={28} color="#10B981" />
          <Text className="text-xs text-text-secondary text-center max-w-[260px]">
            Tuyệt vời! Không có nhiệm vụ nào quá hạn hoặc cần làm gấp.
          </Text>
        </View>
      ) : (
        <View className="gap-2.5">
          {tasks.slice(0, 5).map((task) => {
            const badge = getStatusColor(task.status);
            return (
              <TouchableOpacity
                key={task.id}
                className="flex-row rounded-xl bg-background border border-slate-100 overflow-hidden"
                onPress={() => onTaskPress && onTaskPress(task)}
                activeOpacity={0.7}
              >
                <View className="w-1 bg-primary" />
                <View className="flex-1 p-3">
                  <View className="flex-row justify-between items-center mb-1.5">
                    <View className="px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: badge.bg }}>
                      <Text className="text-[10px] font-bold" style={{ color: badge.text }}>{badge.label}</Text>
                    </View>
                    {task.plannedEndDate && (
                      <Text className="text-[11px] text-text-muted">
                        Hạn: {new Date(task.plannedEndDate).toLocaleDateString('vi-VN')}
                      </Text>
                    )}
                  </View>

                  <Text className="text-xs font-semibold text-text-primary leading-4.5 mb-1" numberOfLines={2}>
                    {task.name}
                  </Text>

                  {task.project?.name && (
                    <Text className="text-[11px] text-text-secondary" numberOfLines={1}>
                      📁 {task.project.name}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};
