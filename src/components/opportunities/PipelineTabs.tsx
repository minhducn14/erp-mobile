import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

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
    <View className="bg-surface border-b border-slate-100">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        {PIPELINE_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tabCounts[tab.id];

          return (
            <TouchableOpacity
              key={tab.id}
              className={`flex-row items-center px-3.5 py-2 rounded-full border gap-1.5 ${
                isActive
                  ? 'bg-primary border-primary shadow-xs'
                  : 'bg-background border-border'
              }`}
              onPress={() => onSelectTab(tab.id)}
              activeOpacity={0.75}
            >
              <Text className={`text-xs ${isActive ? 'font-bold text-white' : 'font-semibold text-text-secondary'}`}>
                {tab.title}
              </Text>
              {typeof count === 'number' && (
                <View className={`px-1.5 py-px rounded-full ${isActive ? 'bg-white/30' : 'bg-slate-200'}`}>
                  <Text className={`text-[11px] font-bold ${isActive ? 'text-white' : 'text-slate-600'}`}>
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
