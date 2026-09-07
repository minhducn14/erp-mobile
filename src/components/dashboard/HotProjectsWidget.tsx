import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.dot} />
          <Text style={styles.title}>Dự án tiêu điểm ({projects.length})</Text>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.viewAllText}>Xem tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.list}>
        {projects.slice(0, 3).map((p) => {
          const progress = p.progress ?? 50;
          return (
            <TouchableOpacity
              key={p.id}
              style={styles.card}
              onPress={() => onProjectPress && onProjectPress(p)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.projectName} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.progressVal}>{progress}%</Text>
              </View>

              {p.clientName && (
                <Text style={styles.clientText} numberOfLines={1}>
                  Khách hàng: {p.clientName}
                </Text>
              )}

              {/* Progress Bar */}
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, progress))}%` }]} />
              </View>
            </TouchableOpacity>
          );
        })}
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
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
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
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  projectName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 10,
  },
  progressVal: {
    fontSize: 12,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  clientText: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  barBg: {
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: BrandColors.primary,
    borderRadius: 3,
  },
});
