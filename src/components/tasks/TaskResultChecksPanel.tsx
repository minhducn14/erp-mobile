import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, Alert, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SpellCheckWhitelist from './SpellCheckWhitelist';
import { apiService } from '@/services/api';
import {
  useTaskResultCheckQuery,
  useToggleResultCheckItemMutation,
  useToggleResultCheckItemsMutation,
  useFinalizeResultCheckMutation,
  useRerunResultCheckMutation,
} from '@/hooks/queries/useTaskResultChecks';
import { SpellCheckResultItem } from '@/services/taskResultChecksService';

interface TaskResultChecksPanelProps {
  taskId: string;
  projectId?: string;
}

interface SpellGroup {
  token: string;
  items: SpellCheckResultItem[];
  confirmedCount: number;
}

const groupSpellItems = (items: SpellCheckResultItem[]): SpellGroup[] => {
  const map = new Map<string, SpellCheckResultItem[]>();
  items.forEach((item) => {
    if (!map.has(item.token)) map.set(item.token, []);
    map.get(item.token)!.push(item);
  });
  return Array.from(map.entries()).map(([token, group]) => ({
    token,
    items: group,
    confirmedCount: group.filter((i) => i.confirmed).length,
  }));
};

export default function TaskResultChecksPanel({ taskId, projectId }: TaskResultChecksPanelProps) {
  const router = useRouter();
  const { data: record, isLoading } = useTaskResultCheckQuery(taskId, Boolean(taskId));
  const toggleItemMutation = useToggleResultCheckItemMutation();
  const toggleItemsMutation = useToggleResultCheckItemsMutation();
  const finalizeMutation = useFinalizeResultCheckMutation();
  const rerunSpellMutation = useRerunResultCheckMutation();
  const rerunQcMutation = useRerunResultCheckMutation();
  const [rerunWhitelist, setRerunWhitelist] = useState<string[] | null>(null);
  const [expandedTokens, setExpandedTokens] = useState<Record<string, boolean>>({});

  const spellItems = record?.reviewedSpellErrors || [];
  const spellGroups = useMemo(() => groupSpellItems(spellItems), [spellItems]);

  if (isLoading) {
    return (
      <View className="flex-row items-center gap-2 p-4">
        <ActivityIndicator size="small" color="#94A3B8" />
        <Text className="text-xs text-slate-400">Đang tải kết quả kiểm tra...</Text>
      </View>
    );
  }

  if (!record) {
    return (
      <View className="p-4 bg-background border border-border rounded-2xl">
        <Text className="text-xs text-slate-500">Kết quả này không được tự động kiểm tra chính tả/QC.</Text>
      </View>
    );
  }

  const isFinalized = Boolean(record.finalizedAt);
  const qcItems = record.reviewedQcMismatches || [];
  const confirmedSpellCount = spellItems.filter((i) => i.confirmed).length;
  const confirmedQcCount = qcItems.filter((i) => i.confirmed).length;
  const activeWhitelist = rerunWhitelist ?? record.reviewerWhitelist ?? [];

  const handleToggle = async (kind: 'SPELL' | 'QC', itemId: string, confirmed: boolean) => {
    try {
      await toggleItemMutation.mutateAsync({ taskId, kind, itemId, confirmed });
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể cập nhật mục kiểm tra');
    }
  };

  const handleToggleGroup = async (group: SpellGroup, confirmed: boolean) => {
    try {
      await toggleItemsMutation.mutateAsync({
        taskId,
        kind: 'SPELL',
        itemIds: group.items.map((item) => item.id),
        confirmed,
      });
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể cập nhật mục kiểm tra');
    }
  };

  const toggleExpanded = (token: string) => {
    setExpandedTokens((prev) => ({ ...prev, [token]: !prev[token] }));
  };

  const handleFinalize = async () => {
    try {
      await finalizeMutation.mutateAsync(taskId);
      Alert.alert('Thành công', 'Đã chốt kết quả kiểm tra');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể chốt kết quả kiểm tra');
    }
  };

  const handleRerunSpell = async () => {
    try {
      await rerunSpellMutation.mutateAsync({ taskId, kind: 'SPELL', whitelist: activeWhitelist });
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể kiểm tra lại chính tả');
    }
  };

  const handleRerunQc = async () => {
    try {
      await rerunQcMutation.mutateAsync({ taskId, kind: 'QC', whitelist: activeWhitelist });
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể kiểm tra lại QC');
    }
  };

  const handleOpenExport = (path: string) => {
    const url = `${apiService.getBaseUrl()}${path}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở file xuất.');
    });
  };

  if (record.status === 'PENDING' || record.status === 'RUNNING') {
    return (
      <View className="p-4 bg-background border border-border rounded-2xl gap-1">
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color="#F38820" />
          <Text className="text-sm font-bold text-text-primary">Đang kiểm tra chính tả & QC...</Text>
        </View>
      </View>
    );
  }

  if (record.status === 'ERROR') {
    return (
      <View className="p-4 bg-red-50 border border-red-100 rounded-2xl">
        <Text className="text-xs text-danger">{record.errorMessage || 'Lỗi khi kiểm tra kết quả'}</Text>
      </View>
    );
  }

  return (
    <View className="p-4 bg-background border border-border rounded-2xl gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Feather name="check-square" size={15} color="#334155" />
          <Text className="text-sm font-bold text-text-primary">
            Lỗi chính tả ({confirmedSpellCount}/{spellItems.length})
          </Text>
        </View>
        {isFinalized && <Feather name="lock" size={13} color="#94A3B8" />}
      </View>

      <ScrollView
        className="border border-border rounded-xl bg-surface"
        style={{ maxHeight: 220 }}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {spellGroups.length === 0 && (
          <View className="px-3 py-2">
            <Text className="text-xs text-slate-400">Không phát hiện lỗi chính tả</Text>
          </View>
        )}
        {spellGroups.map((group, idx) => {
          const isExpanded = Boolean(expandedTokens[group.token]);
          const allConfirmed = group.confirmedCount === group.items.length;
          return (
            <View key={group.token} className={idx > 0 ? 'border-t border-slate-100' : ''}>
              <View className="flex-row items-center gap-2 px-3 py-2">
                <TouchableOpacity
                  disabled={isFinalized}
                  onPress={() => handleToggleGroup(group, !allConfirmed)}
                  className={`w-4 h-4 rounded border items-center justify-center ${
                    allConfirmed ? 'bg-success border-success' : 'border-slate-300'
                  }`}
                >
                  {allConfirmed && <Feather name="check" size={11} color="#FFFFFF" />}
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 flex-row items-center gap-1"
                  onPress={() => toggleExpanded(group.token)}
                  activeOpacity={0.7}
                >
                  {group.items.length > 1 && (
                    <Feather name={isExpanded ? 'chevron-down' : 'chevron-right'} size={12} color="#475569" />
                  )}
                  <Text className="text-xs font-bold text-slate-700">{group.token}</Text>
                  {group.items.length > 1 && (
                    <Text className="text-xs text-slate-400">x{group.items.length}</Text>
                  )}
                </TouchableOpacity>
                {group.items.length === 1 && (
                  <Text className="text-xs text-slate-400">{group.items[0].location}</Text>
                )}
              </View>
              {isExpanded && group.items.length > 1 && (
                <View className="pl-9 pb-1.5 gap-1">
                  {group.items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      className="flex-row items-center gap-2"
                      disabled={isFinalized}
                      onPress={() => handleToggle('SPELL', item.id, !item.confirmed)}
                      activeOpacity={0.7}
                    >
                      <View
                        className={`w-3.5 h-3.5 rounded border items-center justify-center ${
                          item.confirmed ? 'bg-success border-success' : 'border-slate-300'
                        }`}
                      >
                        {item.confirmed && <Feather name="check" size={9} color="#FFFFFF" />}
                      </View>
                      <Text className="text-xs text-slate-400">{item.location}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {!isFinalized && (
        <View className="gap-2">
          <SpellCheckWhitelist whitelist={activeWhitelist} onChange={setRerunWhitelist} />
          <TouchableOpacity
            className="flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border bg-surface self-start px-3"
            onPress={handleRerunSpell}
            disabled={rerunSpellMutation.isPending}
            activeOpacity={0.8}
          >
            {rerunSpellMutation.isPending ? (
              <ActivityIndicator size="small" color="#475569" />
            ) : (
              <Feather name="refresh-cw" size={13} color="#475569" />
            )}
            <Text className="text-xs font-bold text-slate-600">Kiểm tra lại chính tả</Text>
          </TouchableOpacity>
        </View>
      )}

      <View className="flex-row items-center justify-between pt-2 border-t border-border">
        <View className="flex-row items-center gap-2">
          <Feather name="clipboard" size={15} color="#334155" />
          <Text className="text-sm font-bold text-text-primary">
            QC chưa khớp ({confirmedQcCount}/{qcItems.length})
          </Text>
        </View>
      </View>

      <ScrollView
        className="border border-border rounded-xl bg-surface"
        style={{ maxHeight: 200 }}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {qcItems.length === 0 && (
          <View className="px-3 py-2">
            <Text className="text-xs text-slate-400">Không phát hiện điểm chưa khớp</Text>
          </View>
        )}
        {qcItems.map((item, idx) => (
          <TouchableOpacity
            key={item.id}
            className={`flex-row items-start gap-2 px-3 py-2 ${idx > 0 ? 'border-t border-slate-100' : ''}`}
            disabled={isFinalized}
            onPress={() => handleToggle('QC', item.id, !item.confirmed)}
            activeOpacity={0.7}
          >
            <View
              className={`w-4 h-4 mt-0.5 rounded border items-center justify-center ${
                item.confirmed ? 'bg-success border-success' : 'border-slate-300'
              }`}
            >
              {item.confirmed && <Feather name="check" size={11} color="#FFFFFF" />}
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-xs font-bold text-slate-700">
                {item.sheet_name ? `${item.sheet_name} · ` : ''}
                {item.product_ref || 'Không rõ sản phẩm'} · {item.attribute}
              </Text>
              <Text className="text-xs text-slate-500">
                {item.claimed_value} → {item.expected_value ?? 'không tìm thấy'}
              </Text>
              {item.reasoning && <Text className="text-xs italic text-slate-400">{item.reasoning}</Text>}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!isFinalized && (
        <View className="gap-2">
          {projectId && (
            <TouchableOpacity
              className="flex-row items-center gap-1.5 self-start"
              onPress={() => router.push(`/projects/${projectId}`)}
              activeOpacity={0.7}
            >
              <Feather name="package" size={13} color="#2563EB" />
              <Text className="text-xs font-bold text-blue-600">
                Thêm/cập nhật thông tin sản phẩm để đối chiếu
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className="flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border bg-surface self-start px-3"
            onPress={handleRerunQc}
            disabled={rerunQcMutation.isPending}
            activeOpacity={0.8}
          >
            {rerunQcMutation.isPending ? (
              <ActivityIndicator size="small" color="#475569" />
            ) : (
              <Feather name="refresh-cw" size={13} color="#475569" />
            )}
            <Text className="text-xs font-bold text-slate-600">Kiểm tra lại QC</Text>
          </TouchableOpacity>
        </View>
      )}

      <View className="flex-row items-center gap-3 pt-2 border-t border-border">
        {!isFinalized && (
          <TouchableOpacity
            className="py-3 px-4 rounded-xl bg-primary flex-row items-center gap-1.5"
            onPress={handleFinalize}
            disabled={finalizeMutation.isPending}
            activeOpacity={0.8}
          >
            {finalizeMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-xs font-bold text-white">Chốt kiểm tra</Text>
            )}
          </TouchableOpacity>
        )}
        {isFinalized && (
          <>
            <TouchableOpacity
              className="flex-row items-center gap-1.5"
              onPress={() => handleOpenExport(`/task-result-checks/task/${taskId}/pdf`)}
              activeOpacity={0.7}
            >
              <Feather name="download" size={13} color="#2563EB" />
              <Text className="text-xs font-bold text-blue-600">Xuất PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center gap-1.5"
              onPress={() => handleOpenExport(`/task-result-checks/task/${taskId}/xlsx`)}
              activeOpacity={0.7}
            >
              <Feather name="file-text" size={13} color="#059669" />
              <Text className="text-xs font-bold text-emerald-600">Xuất Excel (đã tô màu)</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}