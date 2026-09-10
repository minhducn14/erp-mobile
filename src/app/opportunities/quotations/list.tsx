import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSSERefresh } from '@/hooks/useSSERefresh';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import {
  quotationService,
  QuotationItem,
  QuotationStatus,
} from '@/services/quotationService';
import { opportunityService, OpportunityItem } from '@/services/opportunityService';
import { QuotationItemCard } from '@/components/opportunities/QuotationItemCard';

export default function QuotationsListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ opportunityId: string; opportunityName?: string }>();
  const opportunityId = params.opportunityId;

  const { user } = useAuth();
  const isAdminOrBod = user?.role === 'ADMIN' || user?.role === 'BOD';

  const [quotations, setQuotations] = useState<QuotationItem[]>([]);
  const [opportunity, setOpportunity] = useState<OpportunityItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Reject modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  const fetchData = useCallback(async () => {
    if (!opportunityId) return;
    try {
      const [quotesRes, oppRes] = await Promise.all([
        quotationService.getQuotationsByOpportunity(opportunityId),
        opportunityService.getOpportunity(opportunityId),
      ]);

      const quotesData = (quotesRes as any)?.data || (Array.isArray(quotesRes) ? quotesRes : []);
      const oppData = (oppRes as any)?.data || oppRes;

      setQuotations(Array.isArray(quotesData) ? quotesData : []);
      setOpportunity(oppData);
    } catch (err: any) {
      console.error('Error fetching quotations:', err);
      Alert.alert('Lỗi', err?.message || 'Không thể tải danh sách báo giá');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [opportunityId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  useSSERefresh(
    'invalidate_Quotations',
    fetchData
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const hasCustomer = !!(
    opportunity?.customer ||
    opportunity?.customerId ||
    opportunity?.leadName
  );

  const canCreateQuotation =
    hasCustomer &&
    opportunity &&
    (opportunity.status === 'QUOTATION_DRAFTING' ||
      opportunity.status === 'PENDING_QUOTE_APPROVAL' ||
      (opportunity.status === 'OPP_APPROVED' &&
        (user?.role === 'ADMIN' || (opportunity.createdBy as any)?.id === user?.id)));

  const handleCreateNew = () => {
    router.push({
      pathname: '/opportunities/quotations/create',
      params: { opportunityId },
    });
  };

  const handleSelectQuotation = (quote: QuotationItem) => {
    router.push({
      pathname: '/opportunities/quotations/[quotId]',
      params: { quotId: quote.id, opportunityId },
    });
  };

  const handleApprove = async (id: string) => {
    Alert.alert('Xác nhận duyệt', 'Bạn có chắc chắn muốn duyệt báo giá này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Duyệt',
        style: 'default',
        onPress: async () => {
          try {
            const res = await quotationService.approveQuotation(id);
            if ((res as any)?.error) {
              Alert.alert('Lỗi', (res as any).error);
              return;
            }
            Alert.alert('Thành công', 'Đã duyệt báo giá thành công');
            fetchData();
          } catch (err: any) {
            Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi duyệt báo giá');
          }
        },
      },
    ]);
  };

  const handleOpenReject = (id: string) => {
    setSelectedQuoteId(id);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedQuoteId) return;
    if (!rejectReason.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      setIsSubmittingReject(true);
      const res = await quotationService.rejectQuotation(selectedQuoteId, rejectReason.trim());
      if ((res as any)?.error) {
        Alert.alert('Lỗi', (res as any).error);
        return;
      }
      setRejectModalVisible(false);
      Alert.alert('Thành công', 'Đã từ chối báo giá');
      fetchData();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi từ chối báo giá');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleEditQuotation = (quote: QuotationItem) => {
    router.push({
      pathname: '/opportunities/quotations/create',
      params: { opportunityId, quotationId: quote.id },
    });
  };

  const hasApprovedQuote =
    opportunity?.status === 'QUOTE_APPROVED' ||
    quotations.some((q) => q.status === QuotationStatus.APPROVED || q.status === 'APPROVED');

  const renderQuotationItem = ({ item }: { item: QuotationItem }) => {
    const isThisItemApproved =
      item.status === QuotationStatus.APPROVED || item.status === 'APPROVED';
    const isExpired = hasApprovedQuote && !isThisItemApproved;

    return (
      <QuotationItemCard
        item={item}
        isAdminOrBod={isAdminOrBod}
        isExpired={isExpired}
        onPress={handleSelectQuotation}
        onApprove={isExpired ? undefined : handleApprove}
        onReject={isExpired ? undefined : handleOpenReject}
        onEdit={isExpired ? undefined : handleEditQuotation}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Danh sách báo giá</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {params.opportunityName || opportunity?.name || 'Cơ hội kinh doanh'}
          </Text>
        </View>

        {canCreateQuotation ? (
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={handleCreateNew}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
            <Text style={styles.headerActionText}>Tạo mới</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Main Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Đang tải danh sách báo giá...</Text>
        </View>
      ) : (
        <FlatList
          data={quotations}
          keyExtractor={(item) => item.id}
          renderItem={renderQuotationItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#059669']}
            />
          }
          ListHeaderComponent={
            <View style={styles.listMetaBar}>
              <View style={styles.countBadge}>
                <Feather name="file-text" size={14} color="#059669" />
                <Text style={styles.countText}>{quotations.length} bản báo giá</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Feather name="file-text" size={36} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Chưa có bản báo giá nào</Text>
              <Text style={styles.emptySubtitle}>
                Chưa có báo giá nào được tạo cho cơ hội này.
              </Text>
              {canCreateQuotation && (
                <TouchableOpacity
                  style={styles.emptyCreateBtn}
                  onPress={handleCreateNew}
                  activeOpacity={0.85}
                >
                  <Feather name="plus" size={16} color="#FFFFFF" />
                  <Text style={styles.emptyCreateBtnText}>Tạo báo giá đầu tiên</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Reject Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Từ chối báo giá</Text>
              <TouchableOpacity
                onPress={() => setRejectModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Lý do từ chối (bắt buộc):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập lý do cần chỉnh sửa / từ chối..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={rejectReason}
              onChangeText={setRejectReason}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalVisible(false)}
                disabled={isSubmittingReject}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  isSubmittingReject && styles.modalConfirmBtnDisabled,
                ]}
                onPress={handleConfirmReject}
                disabled={isSubmittingReject}
              >
                {isSubmittingReject ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Xác nhận từ chối</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  listMetaBar: {
    marginBottom: 12,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
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
    marginBottom: 20,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyCreateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 100,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  modalConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#DC2626',
  },
  modalConfirmBtnDisabled: {
    opacity: 0.6,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
