import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TaskItem } from '@/services/dashboardService';
import { BrandColors } from '@/constants/colors';
import BottomNavBar from '@/components/BottomNavBar';
import { useSSERefresh } from '@/hooks/useSSERefresh';
import { useTasksQuery } from '@/hooks/queries/useTasks';

type StatusFilter = 'ALL' | 'TODO' | 'IN_PROGRESS' | 'AWAITING_REVIEW' | 'ACCEPTED';

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'TODO', label: 'Cần làm' },
  { id: 'IN_PROGRESS', label: 'Đang làm' },
  { id: 'AWAITING_REVIEW', label: 'Chờ duyệt' },
  { id: 'ACCEPTED', label: 'Đã xong' },
];

export default function TasksScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: tasksRes, isLoading, isFetching, refetch } = useTasksQuery({
    status: activeTab !== 'ALL' ? activeTab : undefined,
  });

  const tasks: TaskItem[] = useMemo(() => {
    if (!tasksRes) return [];
    return Array.isArray(tasksRes) ? tasksRes : [];
  }, [tasksRes]);

  useSSERefresh('invalidate_Tasks', refetch);

  const handleRefresh = () => {
    refetch();
  };

  const filteredTasks = tasks.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.code?.toLowerCase().includes(q) ||
      t.project?.name?.toLowerCase().includes(q) ||
      t.assignee?.fullName?.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
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

  const renderTaskCard = ({ item }: { item: TaskItem }) => {
    const badge = getStatusBadge(item.status);
    return (
      <TouchableOpacity
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        onPress={() => router.push(`/tasks/${item.id}` as any)}
        activeOpacity={0.75}
      >
        <View className="mb-2 flex-row items-center justify-between">
          <View className="rounded-md px-2 py-[3px]" style={{ backgroundColor: badge.bg }}>
            <Text className="text-[11px] font-bold" style={{ color: badge.text }}>{badge.label}</Text>
          </View>
          {item.code && <Text className="text-xs font-semibold text-slate-400">#{item.code}</Text>}
        </View>

        <Text className="mb-2.5 text-[15px] font-bold leading-[22px] text-slate-900" numberOfLines={2}>
          {item.name}
        </Text>

        <View className="mb-2.5 h-px bg-slate-100" />

        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-3.5">
            {item.project?.name && (
              <View className="flex-row items-center gap-[5px]">
                <Feather name="folder" size={12} color="#64748B" />
                <Text className="max-w-[160px] text-xs text-slate-500" numberOfLines={1}>
                  {item.project.name}
                </Text>
              </View>
            )}
            {item.plannedEndDate && (
              <View className="flex-row items-center gap-[5px]">
                <Feather name="clock" size={12} color="#64748B" />
                <Text className="max-w-[160px] text-xs text-slate-500">
                  {new Date(item.plannedEndDate).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            )}
          </View>
          <Feather name="chevron-right" size={16} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Top Header */}
      <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-[10px] bg-slate-100"
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-[17px] font-bold text-slate-900">Nhiệm vụ & Tiến độ</Text>
        <View className="w-10" />
      </View>

      {/* Search Input */}
      <View className="bg-white px-4 pb-2 pt-3">
        <View className="h-[42px] flex-row items-center rounded-xl bg-slate-100 px-3">
          <Feather name="search" size={18} color="#94A3B8" />
          <TextInput
            className="ml-2 flex-1 text-sm text-slate-900"
            placeholder="Tìm theo tên task, mã hoặc dự án..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="border-b border-slate-200 bg-white pb-2">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_TABS}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-2 px-4"
          renderItem={({ item }) => {
            const isActive = activeTab === item.id;
            return (
              <TouchableOpacity
                className={`rounded-full px-3.5 py-1.5 ${isActive ? 'bg-primary' : 'bg-slate-100'}`}
                onPress={() => setActiveTab(item.id)}
                activeOpacity={0.75}
              >
                <Text className={`text-[13px] font-semibold ${isActive ? 'text-white' : 'text-slate-500'}`}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Task List */}
      {isLoading && !isFetching ? (
        <View className="flex-1 items-center justify-center gap-2.5">
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text className="text-[13px] text-slate-400">Đang tải danh sách công việc...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTaskCard}
          contentContainerClassName="gap-3 p-4 pb-6"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={handleRefresh}
              colors={[BrandColors.primary]}
              tintColor={BrandColors.primary}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center gap-2.5 py-[60px]">
              <Feather name="inbox" size={44} color="#CBD5E1" />
              <Text className="text-base font-bold text-slate-600">Không có nhiệm vụ nào</Text>
              <Text className="max-w-[260px] text-center text-[13px] text-slate-400">
                {searchQuery
                  ? 'Không tìm thấy nhiệm vụ phù hợp với từ khóa.'
                  : 'Danh sách công việc cho trạng thái này hiện đang trống.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Bottom Nav */}
      <BottomNavBar />
    </SafeAreaView>
  );
}
