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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { canAccessOpportunities } from '@/utils/rbac';
import { BrandColors } from '@/constants/colors';
import { formatVND, formatVNDFull } from '@/utils/formatters';
import { OpportunityItem, OpportunityListFilters } from '@/services/opportunityService';
import { PipelineTabs } from '@/components/opportunities/PipelineTabs';
import { OpportunityCard } from '@/components/opportunities/OpportunityCard';
import BottomNavBar from '@/components/BottomNavBar';
import { STORAGE_DRAFT_KEY } from './create';
import { useSSERefresh } from '@/hooks/useSSERefresh';
import { useOpportunitiesQuery } from '@/hooks/queries/useOpportunities';
export default function OpportunitiesScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Check RBAC permission
  const hasAccess = canAccessOpportunities(user?.role);

  // Compute filters for TanStack Query
  const filters = useMemo<OpportunityListFilters>(() => {
    const f: OpportunityListFilters = {
      search: searchQuery.trim() || undefined,
      limit: 50,
    };

    if (activeTab !== 'ALL') {
      if (activeTab === 'QUOTATION') {
        f.status = 'QUOTATION_DRAFTING';
      } else if (activeTab === 'CONTRACT') {
        f.status = 'CONTRACT_CREATED';
      } else {
        f.status = activeTab;
      }
    }
    return f;
  }, [activeTab, searchQuery]);

  // Query opportunities list via TanStack Query
  const {
    data: opportunityResponse,
    isLoading: isQueryLoading,
    isFetching: isRefreshing,
    refetch,
  } = useOpportunitiesQuery(filters);

  const opportunities: OpportunityItem[] = useMemo(() => {
    if (!opportunityResponse) return [];
    return Array.isArray(opportunityResponse.data) ? opportunityResponse.data : [];
  }, [opportunityResponse]);

  const totalCount = useMemo(() => {
    if (!opportunityResponse) return 0;
    return opportunityResponse.meta?.total ?? opportunities.length;
  }, [opportunityResponse, opportunities]);

  const isLoading = isQueryLoading && !opportunityResponse;

  useSSERefresh('invalidate_Opportunities', refetch);

  // Draft Opportunity State & Detection
  const [draftOpportunity, setDraftOpportunity] = useState<any | null>(null);

  const checkDraft = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.name || parsed.description || parsed.expectedRevenue || parsed.budget)) {
          setDraftOpportunity(parsed);
          return;
        }
      }
      setDraftOpportunity(null);
    } catch {
      setDraftOpportunity(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkDraft();
    }, [checkDraft])
  );

  const handleDeleteDraft = () => {
    Alert.alert(
      'Xóa bản nháp',
      'Bạn có chắc chắn muốn xóa bản nháp cơ hội này không? Dữ liệu chưa lưu sẽ bị xóa vĩnh viễn.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa bản nháp',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(STORAGE_DRAFT_KEY);
            setDraftOpportunity(null);
          },
        },
      ]
    );
  };

  const handleRefresh = () => {
    refetch();
    checkDraft();
  };

  // Render Draft Card at top of List
  const renderListHeader = () => {
    if (!draftOpportunity) return null;
    if (searchQuery && !draftOpportunity.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return null;
    }

    const formatDraftTime = (savedAt?: string | null) => {
      if (!savedAt) return 'Gần đây';
      const rawStr = String(savedAt).trim();
      if (/^\d{1,2}:\d{2}$/.test(rawStr)) {
        return rawStr;
      }
      const d = new Date(rawStr);
      if (isNaN(d.getTime())) {
        return rawStr;
      }
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    };

    const timeFormatted = formatDraftTime(draftOpportunity.savedAt);

    return (
      <View style={styles.draftCard}>
        <TouchableOpacity
          style={styles.draftCardMain}
          onPress={() => router.push('/opportunities/create?mode=draft' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.draftCardLeft}>
            <View style={styles.draftIconBox}>
              <Feather name="file-text" size={18} color="#D97706" />
            </View>
            <View style={styles.draftInfoCol}>
              <View style={styles.draftTagRow}>
                <View style={styles.draftBadge}>
                  <Text style={styles.draftBadgeText}>BẢN NHÁP</Text>
                </View>
                <Text style={styles.draftTimeText}>Lưu lúc {timeFormatted}</Text>
              </View>
              <Text style={styles.draftTitle} numberOfLines={1}>
                {draftOpportunity.name || 'Cơ hội chưa đặt tên'}
              </Text>
              <Text style={styles.draftRevenue} numberOfLines={1}>
                {draftOpportunity.expectedRevenue
                  ? `Kỳ vọng: ${formatVNDFull(draftOpportunity.expectedRevenue)}`
                  : draftOpportunity.description || 'Chạm để tiếp tục chỉnh sửa & hoàn thiện'}
              </Text>
            </View>
          </View>

          <View style={styles.draftCardActions}>
            <TouchableOpacity
              style={styles.draftEditBtn}
              onPress={() => router.push('/opportunities/create?mode=draft' as any)}
              activeOpacity={0.7}
            >
              <Feather name="edit-3" size={13} color="#B45309" />
              <Text style={styles.draftEditBtnText}>Sửa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.draftDeleteBtn}
              onPress={handleDeleteDraft}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="trash-2" size={16} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Calculate sum of expected revenue for displayed opportunities
  const totalExpectedRevenue = useMemo(() => {
    return opportunities.reduce((sum, item) => {
      const rev = Number(item.expectedRevenue) || 0;
      return sum + rev;
    }, 0);
  }, [opportunities]);

  const formatTotalMoney = (val: number) => {
    if (val >= 1_000_000_000) {
      return `${(val / 1_000_000_000).toFixed(2).replace('.', ',')} Tỷ`;
    }
    if (val >= 1_000_000) {
      return `${(val / 1_000_000).toFixed(0)} Triệu`;
    }
    return formatVND(val);
  };

  if (isAuthLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
      </View>
    );
  }

  // Guard screen if role is unauthorized (e.g. STAFF_*)
  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.guardContainer}>
          <View style={styles.guardIconBox}>
            <Feather name="lock" size={36} color="#DC2626" />
          </View>
          <Text style={styles.guardTitle}>Giới hạn quyền truy cập</Text>
          <Text style={styles.guardSubtitle}>
            Phân hệ Quản lý Cơ hội & CRM chỉ dành cho Ban giám đốc và Bộ phận Kinh doanh (Sales).
          </Text>
          <TouchableOpacity
            style={styles.guardBtn}
            onPress={() => router.replace('/')}
            activeOpacity={0.8}
          >
            <Feather name="arrow-left" size={16} color="#FFFFFF" />
            <Text style={styles.guardBtnText}>Về Bảng điều khiển</Text>
          </TouchableOpacity>
        </View>
        <BottomNavBar />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.headerTitles}>
          <Text style={styles.headerMainTitle}>Quản lý Cơ hội</Text>
          <Text style={styles.headerSubtitle}>Phễu bán hàng & CRM</Text>
        </View>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/opportunities/create' as any)}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Tạo</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Search */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên cơ hội, khách hàng, lead..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Pipeline Stage Tabs */}
      <PipelineTabs
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Overview Stat Ribbon */}
      <View style={styles.statRibbon}>
        <View style={styles.statRibbonItem}>
          <Text style={styles.statRibbonLabel}>Số lượng cơ hội</Text>
          <Text style={styles.statRibbonValue}>{totalCount}</Text>
        </View>
        <View style={styles.statRibbonDivider} />
        <View style={styles.statRibbonItem}>
          <Text style={styles.statRibbonLabel}>Doanh thu kỳ vọng</Text>
          <Text style={[styles.statRibbonValue, { color: BrandColors.primary }]}>
            {formatTotalMoney(totalExpectedRevenue)}
          </Text>
        </View>
      </View>

      {/* Opportunities List */}
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách cơ hội...</Text>
        </View>
      ) : (
        <FlatList
          data={opportunities}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          renderItem={({ item }) => (
            <OpportunityCard
              item={item}
              onPress={() => router.push(`/opportunities/${item.id}` as any)}
            />
          )}
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
              <View style={styles.emptyIconCircle}>
                <Ionicons name="folder-open-outline" size={32} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Chưa có cơ hội nào</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? 'Không tìm thấy cơ hội phù hợp với từ khóa.'
                  : 'Hãy bấm nút Tạo mới để ghi nhận cơ hội tiềm năng đầu tiên.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => router.push('/opportunities/create' as any)}
                activeOpacity={0.8}
              >
                <Feather name="plus-circle" size={16} color="#FFFFFF" />
                <Text style={styles.emptyAddBtnText}>Thêm cơ hội mới</Text>
              </TouchableOpacity>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitles: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  statRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statRibbonItem: {
    flex: 1,
  },
  statRibbonDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  statRibbonLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statRibbonValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },

  // Draft Opportunity Card Styles
  draftCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  draftCardMain: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  draftCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  draftIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  draftInfoCol: {
    flex: 1,
  },
  draftTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  draftBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  draftBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  draftTimeText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },
  draftTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  draftRevenue: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    fontWeight: '600',
  },
  draftCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 10,
  },
  draftEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 4,
  },
  draftEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  draftDeleteBtn: {
    padding: 6,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  guardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  guardIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  guardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 8,
  },
  guardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  guardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  guardBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
