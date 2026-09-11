import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomerItem } from '@/services/customerService';
import { useCustomersQuery } from '@/hooks/queries/useCustomers';
import { useSSERefresh } from '@/hooks/useSSERefresh';
import { BrandColors } from '@/constants/colors';
import BottomNavBar from '@/components/BottomNavBar';
import { useAuth } from '@/context/AuthContext';
import { canAccessCustomers } from '@/utils/rbac';

export default function CustomersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const hasAccess = canAccessCustomers(user?.role);
  const [searchQuery, setSearchQuery] = useState('');

  // TanStack Query for customer list
  const { data: customers = [], isLoading, isFetching, refetch } = useCustomersQuery({
    search: searchQuery,
  });

  useSSERefresh('invalidate_Customers', refetch);

  const handleRefresh = () => {
    refetch();
  };

  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('Thông báo', 'Khách hàng này chưa cập nhật số điện thoại.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email?: string) => {
    if (!email) {
      Alert.alert('Thông báo', 'Khách hàng này chưa cập nhật email liên hệ.');
      return;
    }
    Linking.openURL(`mailto:${email}`);
  };

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.code?.toLowerCase().includes(q) ||
      c.phoneNumber?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.contactPerson?.toLowerCase().includes(q)
    );
  });

  const renderCustomerCard = ({ item }: { item: CustomerItem }) => {
    return (
      <View className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <View className="flex-row items-center mb-2.5">
          <View className="w-[42px] h-[42px] rounded-xl bg-blue-50 border border-blue-100 items-center justify-center mr-3">
            <Text className="text-lg font-extrabold text-blue-500">{(item.name || 'C').charAt(0).toUpperCase()}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-bold text-slate-900 mb-0.5" numberOfLines={1}>
              {item.name}
            </Text>
            {item.contactPerson ? (
              <Text className="text-xs text-slate-500" numberOfLines={1}>
                Đại diện: {item.contactPerson}
              </Text>
            ) : null}
          </View>
          {item.code && <Text className="text-[11px] font-bold text-slate-400">#{item.code}</Text>}
        </View>

        {item.address ? (
          <View className="flex-row items-start gap-1.5 mb-3 bg-slate-50 p-2.5 rounded-lg">
            <Feather name="map-pin" size={13} color="#64748B" />
            <Text className="text-xs text-slate-500 leading-[18px] flex-1" numberOfLines={2}>
              {item.address}
            </Text>
          </View>
        ) : null}

        <View className="flex-row justify-between items-center border-t border-slate-100 pt-2.5">
          <View className="flex-row items-center gap-2">
            {item.phoneNumber && (
              <TouchableOpacity
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50"
                onPress={() => handleCall(item.phoneNumber)}
                activeOpacity={0.7}
              >
                <Feather name="phone" size={14} color="#10B981" />
                <Text className="text-xs font-bold text-emerald-600">Gọi điện</Text>
              </TouchableOpacity>
            )}

            {item.email && (
              <TouchableOpacity
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50"
                onPress={() => handleEmail(item.email)}
                activeOpacity={0.7}
              >
                <Feather name="mail" size={14} color="#3B82F6" />
                <Text className="text-xs font-bold text-blue-600">Gửi mail</Text>
              </TouchableOpacity>
            )}
          </View>

          {item.contracts && item.contracts.length > 0 ? (
            <Text className="text-[11px] font-semibold text-slate-500">
              {item.contracts.length} hợp đồng
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  if (!hasAccess) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
          <TouchableOpacity className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center" onPress={() => router.replace('/')}>
            <Feather name="arrow-left" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-[17px] font-bold text-slate-900">Hồ sơ Khách hàng & CRM</Text>
          <View className="w-10" />
        </View>

        <View className="flex-1 justify-center items-center p-8 gap-3">
          <View className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 items-center justify-center mb-2">
            <Feather name="shield-off" size={36} color="#EF4444" />
          </View>
          <Text className="text-lg font-extrabold text-slate-900">Không có quyền truy cập</Text>
          <Text className="text-[13px] text-slate-500 text-center leading-5 max-w-[280px]">
            Phân hệ Khách hàng chỉ dành riêng cho Ban Quản trị (Admin/BOD) và Bộ phận Phát triển kinh doanh (BD).
          </Text>
          <TouchableOpacity className="mt-3 bg-primary px-5 py-3 rounded-xl" onPress={() => router.replace('/')}>
            <Text className="text-sm font-bold text-white">Quay về Trang chủ</Text>
          </TouchableOpacity>
        </View>

        <BottomNavBar />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <TouchableOpacity
          className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center"
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-[17px] font-bold text-slate-900">Hồ sơ Khách hàng & CRM</Text>
        <View className="w-10" />
      </View>

      {/* Search Input */}
      <View className="px-4 py-3 bg-white border-b border-slate-200">
        <View className="flex-row items-center bg-slate-100 rounded-xl px-3 h-[42px]">
          <Feather name="search" size={18} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-2 text-sm text-slate-900"
            placeholder="Tìm theo tên công ty, SĐT, người đại diện..."
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

      {/* Content List */}
      {isLoading && !isFetching ? (
        <View className="flex-1 justify-center items-center gap-2.5">
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text className="text-[13px] text-slate-400">Đang tải danh bạ đối tác Getvini...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          renderItem={renderCustomerCard}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
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
            <View className="py-14 items-center justify-center gap-2.5">
              <Feather name="users" size={44} color="#CBD5E1" />
              <Text className="text-base font-bold text-slate-600">Chưa có thông tin đối tác</Text>
              <Text className="text-[13px] text-slate-400 text-center max-w-[260px]">
                {searchQuery
                  ? 'Không tìm thấy đối tác nào phù hợp.'
                  : 'Hiện tại chưa có hồ sơ khách hàng nào trong hệ thống.'}
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
