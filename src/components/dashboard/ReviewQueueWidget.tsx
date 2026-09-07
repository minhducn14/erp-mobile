import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TaskItem } from '@/services/dashboardService';
import { BrandColors } from '@/constants/colors';

interface ReviewQueueWidgetProps {
  tasks: TaskItem[];
  onTaskPress?: (task: TaskItem) => void;
  onViewAll?: () => void;
}

export const ReviewQueueWidget: React.FC<ReviewQueueWidgetProps> = ({
  tasks,
  onTaskPress,
  onViewAll,
}) => {
  if (!tasks || tasks.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.badgeIndicator} />
          <Text style={styles.title}>Hàng đợi xét duyệt ({tasks.length})</Text>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.viewAllText}>Xem tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.list}>
        {tasks.slice(0, 4).map((task) => (
          <TouchableOpacity
            key={task.id}
            style={styles.taskCard}
            onPress={() => onTaskPress && onTaskPress(task)}
            activeOpacity={0.7}
          >
            <View style={styles.taskContent}>
              <View style={styles.tagRow}>
                <View style={styles.reviewBadge}>
                  <Text style={styles.reviewBadgeText}>Chờ duyệt</Text>
                </View>
                {task.code && <Text style={styles.codeText}>#{task.code}</Text>}
              </View>
              <Text style={styles.taskName} numberOfLines={2}>
                {task.name}
              </Text>
              <View style={styles.metaRow}>
                {task.project?.name && (
                  <View style={styles.metaItem}>
                    <Feather name="folder" size={12} color="#64748B" />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {task.project.name}
                    </Text>
                  </View>
                )}
                {task.assignee?.fullName && (
                  <View style={styles.metaItem}>
                    <Feather name="user" size={12} color="#64748B" />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {task.assignee.fullName}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.arrowBox}>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
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
    marginBottom: 16,
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
  badgeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
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
  list: {
    gap: 10,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  taskContent: {
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  reviewBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reviewBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  codeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  taskName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
    maxWidth: 140,
  },
  arrowBox: {
    marginLeft: 8,
  },
});
