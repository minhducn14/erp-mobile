import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { BrandColors } from '@/constants/colors';

export interface PipelineTabItem {
  id: string;
  title: string;
  count?: number;
}

interface PipelineTabsProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  tabCounts?: Record<string, number>;
}

export const PIPELINE_TABS: PipelineTabItem[] = [
  { id: 'ALL', title: 'Tất cả' },
  { id: 'PENDING_OPP_APPROVAL', title: 'Chờ BOD duyệt' },
  { id: 'QUOTATION', title: 'Làm báo giá' },
  { id: 'CONTRACT', title: 'Hợp đồng & DA' },
  { id: 'COMPLETED', title: 'Hoàn thành' },
];

export const PipelineTabs: React.FC<PipelineTabsProps> = ({
  activeTab,
  onSelectTab,
  tabCounts = {},
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {PIPELINE_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tabCounts[tab.id];

          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabButton, isActive && styles.activeTabButton]}
              onPress={() => onSelectTab(tab.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab.title}
              </Text>
              {typeof count === 'number' && (
                <View style={[styles.countBadge, isActive && styles.activeCountBadge]}>
                  <Text style={[styles.countText, isActive && styles.activeCountText]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  activeCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  activeCountText: {
    color: '#FFFFFF',
  },
});
