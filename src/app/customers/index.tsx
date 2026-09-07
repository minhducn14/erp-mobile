import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { customerService, CustomerItem } from '@/services/customerService';
import { BrandColors } from '@/constants/colors';
import BottomNavBar from '@/components/BottomNavBar';
import { useAuth } from '@/context/AuthContext';
import { canAccessCustomers } from '@/utils/rbac';

export default function CustomersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const hasAccess = canAccessCustomers(user?.role);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadCustomers = useCallback(async () => {
    if (!hasAccess) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await customerService.getCustomers();
      if (res.data && Array.isArray(res.data)) {
        setCustomers(res.data);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [hasAccess]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadCustomers();
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
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{(item.name || 'C').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.customerName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.contactPerson ? (
              <Text style={styles.contactPerson} numberOfLines={1}>
                Đại diện: {item.contactPerson}
              </Text>
            ) : null}
          </View>
          {item.code && <Text style={styles.codeBadge}>#{item.code}</Text>}
        </View>

        {item.address ? (
          <View style={styles.addressRow}>
            <Feather name="map-pin" size={13} color="#64748B" />
            <Text style={styles.addressText} numberOfLines={2}>
              {item.address}
            </Text>
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.actionsRow}>
            {item.phoneNumber && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.callBtn]}
                onPress={() => handleCall(item.phoneNumber)}
                activeOpacity={0.7}
              >
                <Feather name="phone" size={14} color="#10B981" />
                <Text style={styles.callBtnText}>Gọi điện</Text>
              </TouchableOpacity>
            )}

            {item.email && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.emailBtn]}
                onPress={() => handleEmail(item.email)}
                activeOpacity={0.7}
              >
                <Feather name="mail" size={14} color="#3B82F6" />
                <Text style={styles.emailBtnText}>Gửi mail</Text>
              </TouchableOpacity>
            )}
          </View>

          {item.contracts && item.contracts.length > 0 ? (
            <Text style={styles.contractCountText}>
              {item.contracts.length} hợp đồng
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
            <Feather name="arrow-left" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hồ sơ Khách hàng & CRM</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.forbiddenContainer}>
          <View style={styles.forbiddenIconBox}>
            <Feather name="shield-off" size={36} color="#EF4444" />
          </View>
          <Text style={styles.forbiddenTitle}>Không có quyền truy cập</Text>
          <Text style={styles.forbiddenDesc}>
            Phân hệ Khách hàng chỉ dành riêng cho Ban Quản trị (Admin/BOD) và Bộ phận Phát triển kinh doanh (BD).
          </Text>
          <TouchableOpacity style={styles.returnHomeBtn} onPress={() => router.replace('/')}>
            <Text style={styles.returnHomeText}>Quay về Trang chủ</Text>
          </TouchableOpacity>
        </View>

        <BottomNavBar />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ Khách hàng & CRM</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
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
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải danh bạ đối tác Getvini...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          renderItem={renderCustomerCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[BrandColors.primary]}
              tintColor={BrandColors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="users" size={44} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Chưa có thông tin đối tác</Text>
              <Text style={styles.emptyDesc}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3B82F6',
  },
  headerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  contactPerson: {
    fontSize: 12,
    color: '#64748B',
  },
  codeBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
  },
  addressText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  callBtn: {
    backgroundColor: '#ECFDF5',
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  emailBtn: {
    backgroundColor: '#EFF6FF',
  },
  emailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  contractCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 260,
  },
  forbiddenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  forbiddenIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  forbiddenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  forbiddenDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  returnHomeBtn: {
    marginTop: 12,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  returnHomeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
