import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, Alert, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQcProductInfoQuery } from '@/hooks/queries/useQcSpellCheck';

interface QcProductInfoPanelProps {
  projectId?: string;
}

export default function QcProductInfoPanel({ projectId }: QcProductInfoPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isFetching, error } = useQcProductInfoQuery(projectId, isOpen);
  const items = data || [];

  if (!projectId) return null;

  const handleOpenSource = (url?: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở nguồn thông tin sản phẩm.');
    });
  };

  return (
    <View className="gap-1.5">
      <TouchableOpacity
        className="flex-row items-center gap-1.5"
        onPress={() => setIsOpen((prev) => !prev)}
        activeOpacity={0.7}
      >
        <Feather name="info" size={13} color="#475569" />
        <Text className="text-xs font-bold text-slate-600">Thông tin chuẩn đang đối chiếu</Text>
        <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={13} color="#475569" />
      </TouchableOpacity>

      {isOpen && (
        <View className="p-2 border border-border rounded-xl bg-surface">
          {isFetching && (
            <View className="flex-row items-center gap-2 py-1">
              <ActivityIndicator size="small" color="#94A3B8" />
              <Text className="text-xs text-slate-400">Đang tải thông tin sản phẩm...</Text>
            </View>
          )}

          {!isFetching && error && (
            <Text className="text-xs text-danger">Không thể tải thông tin sản phẩm chuẩn</Text>
          )}

          {!isFetching && !error && items.length === 0 && (
            <Text className="text-xs text-slate-400">Chưa có thông tin sản phẩm chuẩn</Text>
          )}

          {!isFetching && items.length > 0 && (
            <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {items.map((item, idx) => (
                <View
                  key={idx}
                  className={`py-1.5 gap-0.5 ${idx > 0 ? 'border-t border-slate-100' : ''}`}
                >
                  <Text className="text-xs font-bold text-slate-700">{item.productName}</Text>
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="text-xs text-slate-500 flex-1" numberOfLines={1}>
                      {item.sourceName || 'Không rõ nguồn'}
                    </Text>
                    {item.sourceUrl && (
                      <TouchableOpacity
                        className="flex-row items-center gap-1"
                        onPress={() => handleOpenSource(item.sourceUrl)}
                      >
                        <Feather name="external-link" size={11} color="#2563EB" />
                        <Text className="text-xs font-bold text-blue-600">Nguồn</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}
