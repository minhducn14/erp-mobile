import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { notificationService, NotificationItem } from '@/services/notificationService';
import { BrandColors } from '@/constants/colors';
import BottomNavBar from '@/components/BottomNavBar';
import * as Haptic from 'expo-haptics';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.getNotifications();
      if (res.data) {
        setNotifications(res.data);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    Haptic.impactAsync(Haptic.ImpactFeedbackStyle.Medium);
    const unreadIds = notifications.filter((notification) => !notification.isRead).map((notification) => notification.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await notificationService.markAllAsRead(unreadIds);
  };

  const handleItemPress = async (item: NotificationItem) => {
    if (!item.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      notificationService.markAsRead(item.id);
    }

    Haptic.selectionAsync();

    // Navigate to target if available
    if (item.type === 'TASK' && item.targetId) {
      router.push(`/tasks/${item.targetId}` as any);
    } else if (item.type === 'ACCEPTANCE') {
      router.push('/acceptances' as any);
    } else if (item.type === 'FINANCE') {
      router.push('/finance' as any);
    } else if (item.type === 'CONTRACT' && item.targetId) {
      router.push(`/contracts/${item.targetId}` as any);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'TASK':
        return { name: 'check-square', color: '#3B82F6', bg: 'bg-blue-50' };
      case 'ACCEPTANCE':
        return { name: 'file-text', color: '#10B981', bg: 'bg-emerald-50' };
      case 'FINANCE':
        return { name: 'dollar-sign', color: '#F59E0B', bg: 'bg-amber-50' };
      case 'CONTRACT':
        return { name: 'briefcase', color: '#8B5CF6', bg: 'bg-purple-50' };
      default:
        return { name: 'bell', color: '#64748B', bg: 'bg-slate-100' };
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const renderNotifItem = ({ item }: { item: NotificationItem }) => {
    const icon = getNotificationIcon(item.type);
    return (
      <TouchableOpacity
        className={`p-4 rounded-2xl border mb-3 flex-row items-start gap-3.5 ${
          item.isRead ? 'bg-white border-slate-200' : 'bg-blue-50/50 border-blue-200'
        }`}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.75}
      >
        <View className={`w-10 h-10 rounded-xl ${icon.bg} items-center justify-center`}>
          <Feather name={icon.name as any} size={20} color={icon.color} />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text className={`text-sm flex-1 mr-2 ${item.isRead ? 'font-semibold text-slate-800' : 'font-bold text-slate-900'}`}>
              {item.title}
            </Text>
            {!item.isRead && <View className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
          </View>

          <Text className="text-xs text-slate-600 leading-4 mb-2">{item.message}</Text>
          <Text className="text-[11px] font-medium text-slate-400">{formatDate(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <TouchableOpacity
          className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center min-w-[44px] min-h-[44px]"
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>

        <Text className="text-[17px] font-bold text-slate-900">Trung tâm Thông báo</Text>

        {unreadCount > 0 ? (
          <TouchableOpacity
            className="px-2.5 py-1.5 rounded-lg bg-blue-50 min-h-[44px] justify-center"
            onPress={handleMarkAllRead}
            activeOpacity={0.7}
          >
            <Text className="text-xs font-bold text-blue-600">Đọc tất cả</Text>
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}
      </View>

      {/* Filter Tabs */}
      <View className="flex-row px-4 py-3 bg-white border-b border-slate-200 gap-2">
        <TouchableOpacity
          className={`px-4 py-2 rounded-xl border min-h-[38px] items-center justify-center ${
            filter === 'all' ? 'bg-slate-900 border-slate-900' : 'bg-slate-100 border-slate-200'
          }`}
          onPress={() => setFilter('all')}
        >
          <Text className={`text-xs font-bold ${filter === 'all' ? 'text-white' : 'text-slate-600'}`}>
            Tất cả ({notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`px-4 py-2 rounded-xl border min-h-[38px] items-center justify-center ${
            filter === 'unread' ? 'bg-blue-600 border-blue-600' : 'bg-slate-100 border-slate-200'
          }`}
          onPress={() => setFilter('unread')}
        >
          <Text className={`text-xs font-bold ${filter === 'unread' ? 'text-white' : 'text-slate-600'}`}>
            Chưa đọc ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content List */}
      {loading ? (
        <View className="flex-1 justify-center items-center gap-2.5">
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text className="text-xs text-slate-400">Đang đồng bộ thông báo...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderNotifItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BrandColors.primary} />
          }
          ListEmptyComponent={
            <View className="py-16 items-center justify-center gap-2.5">
              <Ionicons name="notifications-off-outline" size={48} color="#CBD5E1" />
              <Text className="text-base font-bold text-slate-600">Không có thông báo nào</Text>
              <Text className="text-xs text-slate-400 text-center max-w-[240px]">
                {filter === 'unread' ? 'Bạn đã đọc toàn bộ các thông báo.' : 'Hệ thống chưa ghi nhận thông báo mới.'}
              </Text>
            </View>
          }
        />
      )}

      <BottomNavBar />
    </SafeAreaView>
  );
}
