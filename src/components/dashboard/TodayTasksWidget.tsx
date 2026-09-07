import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Feather name="calendar" size={16} color={BrandColors.primary} />
          <Text style={styles.title}>Nhiệm vụ ưu tiên ({tasks.length})</Text>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.viewAllText}>Tất cả việc</Text>
          </TouchableOpacity>
        )}
      </View>

      {tasks.length === 0 ? (
        <View style={styles.emptyBox}>
          <Feather name="check-circle" size={28} color="#10B981" />
          <Text style={styles.emptyText}>Tuyệt vời! Không có nhiệm vụ nào quá hạn hoặc cần làm gấp.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {tasks.slice(0, 5).map((task) => {
            const badge = getStatusColor(task.status);
            return (
              <TouchableOpacity
                key={task.id}
                style={styles.taskCard}
                onPress={() => onTaskPress && onTaskPress(task)}
                activeOpacity={0.7}
              >
                <View style={styles.leftBorder} />
                <View style={styles.taskBody}>
                  <View style={styles.topRow}>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
                    </View>
                    {task.plannedEndDate && (
                      <Text style={styles.dateText}>
                        Hạn: {new Date(task.plannedEndDate).toLocaleDateString('vi-VN')}
                      </Text>
                    )}
                  </View>

                  <Text style={styles.taskTitle} numberOfLines={2}>
                    {task.name}
                  </Text>

                  {task.project?.name && (
                    <Text style={styles.projectName} numberOfLines={1}>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  emptyBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 260,
  },
  list: {
    gap: 10,
  },
  taskCard: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  leftBorder: {
    width: 4,
    backgroundColor: BrandColors.primary,
  },
  taskBody: {
    flex: 1,
    padding: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 4,
  },
  projectName: {
    fontSize: 11,
    color: '#64748B',
  },
});
