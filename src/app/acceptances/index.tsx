import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AcceptanceItem,
  ACCEPTANCE_STATUS_CONFIG,
} from '@/services/acceptanceService';
import { BrandColors } from '@/constants/colors';
import BottomNavBar from '@/components/BottomNavBar';
import AcceptanceReviewModal from '@/components/projects/AcceptanceReviewModal';
import { useSSERefresh } from '@/hooks/useSSERefresh';
import { useAcceptancesQuery } from '@/hooks/queries/useAcceptances';

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PENDING', label: 'Chờ duyệt' },
  { id: 'APPROVED', label: 'Đã duyệt' },
  { id: 'REJECTED', label: 'Từ chối' },
];

export default function AcceptancesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<AcceptanceItem | null>(null);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);

  const { data: requestsRes, isLoading, isFetching, refetch } = useAcceptancesQuery({
    status: activeTab !== 'ALL' ? activeTab : undefined,
  });

  const requests: AcceptanceItem[] = useMemo(() => {
    if (!requestsRes) return [];
    return Array.isArray(requestsRes) ? requestsRes : [];
  }, [requestsRes]);

  useSSERefresh('invalidate_Acceptances', refetch);

  const handleRefresh = () => {
    refetch();
  };

  const handleOpenReview = (item: AcceptanceItem) => {
    setSelectedRequest(item);
    setIsReviewModalVisible(true);
  };

  const handleCloseReview = () => {
    setIsReviewModalVisible(false);
    setSelectedRequest(null);
  };

  const filteredRequests = requests.filter((req) => {
    // 1. Status Filter
    if (activeTab !== 'ALL' && req.status !== activeTab) {
      return false;
    }
    // 2. Search Query Filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = req.name?.toLowerCase().includes(q);
    const codeMatch = req.acceptanceCode?.toLowerCase().includes(q);
    const projMatch = req.project?.name?.toLowerCase().includes(q);
    const creatorMatch = req.creator?.fullName?.toLowerCase().includes(q);

    return !!(nameMatch || codeMatch || projMatch || creatorMatch);
  });

  const renderAcceptanceCard = ({ item }: { item: AcceptanceItem }) => {
    const statusCfg = ACCEPTANCE_STATUS_CONFIG[item.status] || {
      text: item.status,
      color: '#64748B',
      bg: '#F1F5F9',
    };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.name || (item.acceptanceCode ? `#${item.acceptanceCode}` : 'Biên bản nghiệm thu')}
            </Text>
            {item.acceptanceCode && item.name ? (
              <Text style={styles.codeSubText}>#{item.acceptanceCode}</Text>
            ) : null}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>
              {statusCfg.text}
            </Text>
          </View>
        </View>

        {item.project?.name ? (
          <View style={styles.metaRow}>
            <Feather name="folder" size={13} color="#64748B" />
            <Text style={styles.metaText} numberOfLines={1}>
              Dự án: <Text style={styles.metaTextBold}>{item.project.name}</Text>
            </Text>
          </View>
        ) : null}

        {item.creator?.fullName && (
          <View style={styles.metaRow}>
            <Feather name="user" size={13} color="#64748B" />
            <Text style={styles.metaText} numberOfLines={1}>
              Người gửi: {item.creator.fullName}
            </Text>
          </View>
        )}

        {item.createdAt && (
          <View style={styles.metaRow}>
            <Feather name="clock" size={13} color="#64748B" />
            <Text style={styles.metaText}>
              Ngày tạo: {new Date(item.createdAt).toLocaleDateString('vi-VN')}
            </Text>
          </View>
        )}

        {item.note ? (
          <Text style={styles.noteText} numberOfLines={2}>
            Ghi chú: {item.note}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={styles.itemCountText}>
            {item.services?.length ? `${item.services.length} hạng mục dịch vụ` : 'Hạng mục dịch vụ'}
          </Text>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleOpenReview(item)}
            activeOpacity={0.75}
          >
            <Text style={styles.actionBtnText}>
              {item.status === 'PENDING' ? 'Phê duyệt' : 'Xem chi tiết'}
            </Text>
            <Feather name="chevron-right" size={14} color={BrandColors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Yêu cầu nghiệm thu</Text>
          <Text style={styles.headerSub}>Quản lý và phê duyệt các đợt nghiệm thu dự án</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên, mã, dự án, người gửi..."
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
      <View style={styles.tabContainer}>
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content List */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách nghiệm thu...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderAcceptanceCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={handleRefresh}
              tintColor={BrandColors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Feather name="clipboard" size={44} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Không có yêu cầu nghiệm thu nào</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? 'Không tìm thấy yêu cầu phù hợp với từ khóa.'
                  : 'Chưa có biên bản nghiệm thu nào thuộc bộ lọc này.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Acceptance Review Modal */}
      <AcceptanceReviewModal
        visible={isReviewModalVisible}
        onClose={handleCloseReview}
        request={selectedRequest}
        onSuccess={refetch}
      />

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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
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
    fontSize: 13,
    color: '#0F172A',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: BrandColors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
    gap: 12,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 6,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  codeSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  metaTextBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  noteText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 4,
  },
  itemCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
});
