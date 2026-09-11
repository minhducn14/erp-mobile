import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { canAccessContracts } from '@/utils/rbac';
import { BrandColors } from '@/constants/colors';
import { formatVND, formatVNDFull } from '@/utils/formatters';
import {
  ContractItem,
  CONTRACT_STATUS_CONFIG,
  CONTRACT_STATUS_LABELS,
} from '@/services/contractService';
import { useContractsQuery } from '@/hooks/queries/useContracts';
import BottomNavBar from '@/components/BottomNavBar';
import { useSSERefresh } from '@/hooks/useSSERefresh';

const CONTRACT_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'ACTIVE', label: 'Đang thực hiện' },
  { key: 'SIGNED', label: 'Đã ký' },
  { key: 'PROPOSAL_APPROVED', label: 'Đã duyệt' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

export default function ContractsScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const hasAccess = canAccessContracts(user?.role);
  const canCreate = user?.role === 'ADMIN' || user?.role === 'BOD' || user?.role === 'BD' || user?.role === 'ADMIN_SALE';

  // TanStack Query for contracts list
  const { data: contractsRes, isLoading, isFetching, refetch } = useContractsQuery({
    search: searchQuery.trim() || undefined,
    status: activeTab !== 'ALL' ? activeTab : undefined,
    limit: 50,
  });

  const contracts: ContractItem[] = useMemo(() => {
    if (!contractsRes) return [];
    return Array.isArray((contractsRes as any).data)
      ? (contractsRes as any).data
      : Array.isArray(contractsRes)
      ? contractsRes
      : [];
  }, [contractsRes]);

  const totalCount = (contractsRes as any)?.meta?.total || contracts.length;

  useSSERefresh('invalidate_Contracts', refetch);

  const handleRefresh = () => {
    refetch();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Financial summary of displayed contracts
  const summaryStats = useMemo(() => {
    const totalSelling = contracts.reduce((sum, item) => sum + Number(item.sellingPrice || 0), 0);
    return {
      count: contracts.length,
      totalSelling,
    };
  }, [contracts]);

  const renderContractCard = ({ item }: { item: ContractItem }) => {
    const statusMeta = CONTRACT_STATUS_CONFIG[item.status] || {
      text: CONTRACT_STATUS_LABELS[item.status] || item.status || 'Chưa xác định',
      color: '#475569',
      bg: '#F1F5F9',
      border: '#E2E8F0',
    };

    const code = item.contractCode || (item as any).contract_code || '—';
    const customerName = item.customer?.name || 'Khách hàng chưa cập nhật';
    const oppName = item.opportunity?.name || '';
    const sellingPrice = Number(item.sellingPrice || (item as any).selling_price || 0);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => router.push(`/contracts/${item.id}` as any)}
      >
        {/* Header: Code & Status */}
        <View style={styles.cardTopRow}>
          <View style={styles.codeBadge}>
            <Feather name="file-text" size={13} color="#2563EB" />
            <Text style={styles.codeText}>{code}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusMeta.bg, borderColor: statusMeta.border },
            ]}
          >
            <Text style={[styles.statusText, { color: statusMeta.color }]}>
              {statusMeta.text}
            </Text>
          </View>
        </View>

        {/* Contract Title */}
        <Text style={styles.contractName} numberOfLines={2}>
          {item.name || 'Hợp đồng kinh tế'}
        </Text>

        {/* Customer & Opportunity Info */}
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <Feather name="user" size={14} color="#64748B" />
            <Text style={styles.metaText} numberOfLines={1}>
              {customerName}
            </Text>
          </View>

          {oppName ? (
            <View style={styles.metaRow}>
              <Feather name="trending-up" size={14} color="#64748B" />
              <Text style={styles.metaSubText} numberOfLines={1}>
                Cơ hội: {oppName}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Footer: Price & Date */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.priceLabel}>Giá trị hợp đồng</Text>
            <Text style={styles.priceValue}>{formatVND(sellingPrice)}</Text>
          </View>

          <View style={styles.footerRight}>
            <Text style={styles.dateText}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''}
            </Text>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isAuthLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
      </SafeAreaView>
    );
  }

  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hợp đồng kinh tế</Text>
        </View>
        <View style={styles.noAccessContainer}>
          <View style={styles.noAccessIconBox}>
            <Feather name="lock" size={36} color="#94A3B8" />
          </View>
          <Text style={styles.noAccessTitle}>Giới hạn quyền truy cập</Text>
          <Text style={styles.noAccessText}>
            Phân hệ Quản lý Hợp đồng chỉ dành cho Ban giám đốc, Trưởng phòng và Bộ phận Kinh doanh.
          </Text>
        </View>
        <BottomNavBar />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* App Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Hợp đồng kinh tế</Text>
          <Text style={styles.headerSubtitle}>
            Quản lý {totalCount} hợp đồng & phụ lục phát sinh
          </Text>
        </View>

        {canCreate ? (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() =>
              Alert.alert(
                'Tạo Hợp đồng',
                'Hợp đồng được khởi tạo từ Cơ hội kinh doanh đã phê duyệt báo giá. Bạn có muốn chuyển tới danh sách Cơ hội không?',
                [
                  { text: 'Hủy', style: 'cancel' },
                  {
                    text: 'Đến Cơ hội',
                    onPress: () => router.push('/opportunities' as any),
                  },
                ]
              )
            }
            activeOpacity={0.8}
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Tạo mới</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo mã hợp đồng, tên khách hàng..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={handleClearSearch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Status Tabs Bar */}
      <View style={styles.tabsWrapper}>
        <FlatList
          data={CONTRACT_TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.tabsContainer}
          renderItem={({ item }) => {
            const isActive = activeTab === item.key;
            return (
              <TouchableOpacity
                style={[styles.tabChip, isActive && styles.tabChipActive]}
                onPress={() => setActiveTab(item.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Financial Summary Banner */}
      <View style={styles.summaryBanner}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Số lượng hợp đồng</Text>
          <Text style={styles.summaryValueCount}>{summaryStats.count} hợp đồng</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Tổng giá trị danh sách</Text>
          <Text style={styles.summaryValuePrice}>{formatVND(summaryStats.totalSelling)}</Text>
        </View>
      </View>

      {/* Main List Area */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách hợp đồng...</Text>
        </View>
      ) : (
        <FlatList
          data={contracts}
          keyExtractor={(item) => item.id}
          renderItem={renderContractCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={handleRefresh}
              colors={[BrandColors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Feather name="file-text" size={36} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Chưa có hợp đồng nào</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `Không tìm thấy hợp đồng phù hợp với từ khóa "${searchQuery}"`
                  : 'Hiện tại chưa có dữ liệu hợp đồng cho trạng thái này.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Bottom Navigation */}
      <BottomNavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  tabsWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  summaryValueCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryValuePrice: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  contractName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    lineHeight: 20,
  },
  metaContainer: {
    gap: 4,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  metaSubText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  noAccessContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  noAccessIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noAccessTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  noAccessText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
