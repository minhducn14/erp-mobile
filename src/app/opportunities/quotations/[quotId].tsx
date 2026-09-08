import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import {
  quotationService,
  QuotationDetailResponse,
  QuotationStatus,
  QuotationItem,
} from '@/services/quotationService';

export default function QuotationDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ quotId: string; opportunityId?: string }>();
  const quotId = params.quotId;
  const opportunityId = params.opportunityId;

  const { user } = useAuth();
  const isAdminOrBod = user?.role === 'ADMIN' || user?.role === 'BOD';

  const [quotation, setQuotation] = useState<QuotationDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Accordion state for packages
  const [expandedPackages, setExpandedPackages] = useState<Record<string, boolean>>({});

  // Reject modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  // Expired / sibling approved state
  const [hasApprovedSibling, setHasApprovedSibling] = useState(false);
  const [approvedQuotationVersion, setApprovedQuotationVersion] = useState<number | null>(null);

  const fetchQuotation = useCallback(async () => {
    if (!quotId) return;
    try {
      const res = await quotationService.getQuotation(quotId);
      if ((res as any)?.error) {
        Alert.alert('Lỗi', (res as any).error);
        return;
      }
      const data: QuotationDetailResponse = (res as any)?.data || res;
      setQuotation(data);

      // Check if any other quotation of this opportunity is already approved
      const oppId =
        opportunityId || (data as any)?.opportunityId || (data as any)?.opportunity?.id;
      if (oppId) {
        try {
          const oppQuotesRes = await quotationService.getQuotationsByOpportunity(oppId);
          const quotesList: QuotationItem[] =
            (oppQuotesRes as any)?.data || (Array.isArray(oppQuotesRes) ? oppQuotesRes : []);
          const approvedQ = quotesList.find(
            (q) =>
              (q.status === QuotationStatus.APPROVED || q.status === 'APPROVED') &&
              q.id !== quotId
          );
          if (approvedQ) {
            setHasApprovedSibling(true);
            setApprovedQuotationVersion(approvedQ.version);
          } else {
            setHasApprovedSibling(false);
            setApprovedQuotationVersion(null);
          }
        } catch (e) {
          console.error('Error checking sibling quotations:', e);
        }
      }

      // Expand all packages by default
      if (data?.details) {
        const initialExpanded: Record<string, boolean> = {};
        data.details.forEach((d) => {
          if (d.packageName && d.packageName !== 'STANDALONE') {
            initialExpanded[d.packageName] = true;
          }
        });
        setExpandedPackages(initialExpanded);
      }
    } catch (err: any) {
      console.error('Error fetching quotation detail:', err);
      Alert.alert('Lỗi', err?.message || 'Không thể tải chi tiết báo giá');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [quotId, opportunityId]);

  useEffect(() => {
    fetchQuotation();
  }, [fetchQuotation]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchQuotation();
  };

  const togglePackage = (pkgName: string) => {
    setExpandedPackages((prev) => ({
      ...prev,
      [pkgName]: !prev[pkgName],
    }));
  };

  // Grouping logic matching Web's QuotationDetailModal.jsx
  const { aggregatedItems, totals } = useMemo(() => {
    if (!quotation?.details || quotation.details.length === 0) {
      return {
        aggregatedItems: { packages: [], standalone: [] },
        totals: { revenue: 0, cost: 0, vat: 0, totalWithVat: 0, margin: 0 },
      };
    }

    const packages: Record<string, any> = {};
    const standalone: any[] = [];
    let runningRevenue = 0;
    let runningCost = 0;

    quotation.details.forEach((detail) => {
      const sellingPrice = parseFloat(String(detail.sellingPrice || 0));
      const costAtSale = parseFloat(String(detail.costAtSale || 0));
      const quantity = detail.quantity || 0;
      const itemRevenue = sellingPrice * quantity;
      const itemCost = costAtSale * quantity;
      const itemVat = itemRevenue * 0.08;

      runningRevenue += itemRevenue;
      runningCost += itemCost;

      const groupKey = detail.packageName || 'STANDALONE';

      if (groupKey === 'STANDALONE') {
        standalone.push({
          ...detail,
          revenue: itemRevenue,
          cost: itemCost,
          vat: itemVat,
          totalWithVat: itemRevenue + itemVat,
          profitMargin:
            itemRevenue > 0 ? ((itemRevenue - itemCost) / itemRevenue) * 100 : 0,
        });
        return;
      }

      if (!packages[groupKey]) {
        const pkgQty = detail.packageQuantity || 1;
        packages[groupKey] = {
          name: groupKey,
          quantity: pkgQty,
          sellingPrice: 0,
          costAtSale: 0,
          revenue: 0,
          cost: 0,
          vat: 0,
          totalWithVat: 0,
          items: [],
        };
      }

      const norm = detail.packageQuantity ? quantity / detail.packageQuantity : quantity;

      packages[groupKey].sellingPrice += sellingPrice * norm;
      packages[groupKey].costAtSale += costAtSale * norm;
      packages[groupKey].revenue += itemRevenue;
      packages[groupKey].cost += itemCost;
      packages[groupKey].vat += itemVat;
      packages[groupKey].totalWithVat += itemRevenue + itemVat;
      packages[groupKey].items.push({
        ...detail,
        norm,
        revenue: itemRevenue,
        cost: itemCost,
      });
    });

    const vat = runningRevenue * 0.08;
    const totalWithVat = runningRevenue + vat;
    const margin =
      runningRevenue > 0 ? ((runningRevenue - runningCost) / runningRevenue) * 100 : 0;

    return {
      aggregatedItems: {
        packages: Object.values(packages),
        standalone,
      },
      totals: {
        revenue: runningRevenue,
        cost: runningCost,
        vat,
        totalWithVat,
        margin,
      },
    };
  }, [quotation]);

  const formatMoney = (val?: number) => {
    if (!val) return '0 ₫';
    return `${Math.round(val).toLocaleString('vi-VN')} ₫`;
  };

  const isThisApproved =
    quotation?.status === QuotationStatus.APPROVED || quotation?.status === 'APPROVED';

  const isExpired =
    !isThisApproved &&
    (hasApprovedSibling ||
      (quotation?.opportunity as any)?.status === 'QUOTE_APPROVED' ||
      (quotation?.opportunity as any)?.status === 'WON');

  const getStatusMeta = (status?: string) => {
    if (isExpired) {
      return { label: 'Hết hiệu lực', color: '#64748B', bg: '#F1F5F9' };
    }
    switch (status) {
      case QuotationStatus.DRAFT:
        return { label: 'Đang đợi duyệt', color: '#475569', bg: '#F1F5F9' };
      case QuotationStatus.PENDING_APPROVAL:
        return { label: 'Chờ BOD duyệt', color: '#D97706', bg: '#FEF3C7' };
      case QuotationStatus.APPROVED:
        return { label: 'Đã duyệt', color: '#059669', bg: '#D1FAE5' };
      case QuotationStatus.REJECTED:
        return { label: 'Từ chối', color: '#DC2626', bg: '#FEE2E2' };
      case 'SENT':
        return { label: 'Đã gửi', color: '#2563EB', bg: '#EFF6FF' };
      default:
        return { label: status || '', color: '#64748B', bg: '#F1F5F9' };
    }
  };

  const statusMeta = getStatusMeta(quotation?.status);
  const isPending =
    !isExpired &&
    (quotation?.status === QuotationStatus.DRAFT ||
      quotation?.status === QuotationStatus.PENDING_APPROVAL ||
      quotation?.status === 'DRAFT' ||
      quotation?.status === 'PENDING_APPROVAL');
  const isRejected =
    quotation?.status === QuotationStatus.REJECTED || quotation?.status === 'REJECTED';

  // Can edit ONLY if quotation is REJECTED and NOT expired, matching web behavior
  const canEdit =
    !isExpired &&
    isRejected &&
    (isAdminOrBod ||
      (quotation?.createdBy as any)?.id === user?.id ||
      (quotation?.opportunity as any)?.createdBy?.id === user?.id);

  const handleEdit = () => {
    router.push({
      pathname: '/opportunities/quotations/create',
      params: {
        opportunityId: opportunityId || quotation?.opportunityId,
        quotationId: quotId,
      },
    });
  };

  const handleApprove = async () => {
    Alert.alert('Xác nhận duyệt', 'Bạn có chắc chắn muốn duyệt báo giá này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Duyệt',
        style: 'default',
        onPress: async () => {
          try {
            setIsSubmittingApprove(true);
            const res = await quotationService.approveQuotation(quotId);
            if ((res as any)?.error) {
              Alert.alert('Lỗi', (res as any).error);
              return;
            }
            Alert.alert('Thành công', 'Đã duyệt báo giá và cập nhật cơ hội kinh doanh');
            fetchQuotation();
          } catch (err: any) {
            Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi duyệt báo giá');
          } finally {
            setIsSubmittingApprove(false);
          }
        },
      },
    ]);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      setIsSubmittingReject(true);
      const res = await quotationService.rejectQuotation(quotId, rejectReason.trim());
      if ((res as any)?.error) {
        Alert.alert('Lỗi', (res as any).error);
        return;
      }
      setRejectModalVisible(false);
      Alert.alert('Thành công', 'Đã từ chối báo giá');
      fetchQuotation();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi từ chối báo giá');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết báo giá</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Đang tải chi tiết báo giá...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            Báo giá lần {quotation?.version || 1}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {quotation?.opportunity?.name || 'Chi tiết báo giá'}
          </Text>
        </View>

        {canEdit ? (
          <TouchableOpacity
            style={styles.headerEditBtn}
            onPress={handleEdit}
            activeOpacity={0.8}
          >
            <Feather name="edit-2" size={16} color="#059669" />
            <Text style={styles.headerEditText}>Sửa</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#059669']}
          />
        }
      >
        {/* Status and Overview Card */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
              <Text style={[styles.statusText, { color: statusMeta.color }]}>
                {statusMeta.label}
              </Text>
            </View>
            <Text style={styles.dateText}>
              {quotation?.createdAt
                ? new Date(quotation.createdAt).toLocaleDateString('vi-VN')
                : ''}
            </Text>
          </View>

          {/* Expired Alert if another quotation is already APPROVED */}
          {isExpired && (
            <View style={styles.expiredNotice}>
              <View style={styles.expiredNoticeHeader}>
                <Feather name="info" size={16} color="#475569" />
                <Text style={styles.expiredNoticeTitle}>Báo giá đã hết hiệu lực</Text>
              </View>
              <Text style={styles.expiredNoticeText}>
                Cơ hội kinh doanh này đã có bản báo giá{approvedQuotationVersion ? ` (Lần ${approvedQuotationVersion})` : ''} được phê duyệt. Bản báo giá này đã hết hiệu lực và đã khóa mọi thao tác sửa, phê duyệt hoặc từ chối.
              </Text>
            </View>
          )}

          {/* Rejection Reason Alert if REJECTED and NOT expired */}
          {!isExpired && isRejected && !!quotation?.description && (
            <View style={styles.rejectNotice}>
              <View style={styles.rejectNoticeHeader}>
                <Feather name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.rejectNoticeTitle}>Lý do từ chối:</Text>
              </View>
              <Text style={styles.rejectNoticeText}>{quotation.description}</Text>
            </View>
          )}

          {/* Creator & Notes */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="user" size={14} color="#64748B" />
              <Text style={styles.metaText}>
                Tạo bởi: {quotation?.createdBy?.fullName || quotation?.createdBy?.username || 'Chưa rõ'}
              </Text>
            </View>
            {quotation?.validUntil && (
              <View style={styles.metaItem}>
                <Feather name="calendar" size={14} color="#64748B" />
                <Text style={styles.metaText}>
                  Hạn: {new Date(quotation.validUntil).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            )}
          </View>

          {quotation?.note ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Ghi chú:</Text>
              <Text style={styles.noteContent}>{quotation.note}</Text>
            </View>
          ) : null}
        </View>

        {/* Financial Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderWithIcon}>
            <View style={[styles.cardIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Feather name="dollar-sign" size={16} color="#059669" />
            </View>
            <Text style={styles.cardSectionTitle}>Tổng hợp tài chính</Text>
          </View>

          <View style={styles.summaryList}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Doanh thu trước VAT:</Text>
              <Text style={styles.summaryValue}>{formatMoney(totals.revenue)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Chi phí giá vốn:</Text>
              <Text style={styles.summaryValueSub}>{formatMoney(totals.cost)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Thuế VAT (8%):</Text>
              <Text style={styles.summaryValueSub}>{formatMoney(totals.vat)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Biên lợi nhuận gộp:</Text>
              <View
                style={[
                  styles.marginBadge,
                  totals.margin >= 20 ? styles.marginBadgeGood : styles.marginBadgeWarning,
                ]}
              >
                <Text
                  style={[
                    styles.marginText,
                    totals.margin >= 20 ? styles.marginTextGood : styles.marginTextWarning,
                  ]}
                >
                  {totals.margin.toFixed(0)}%
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tổng thanh toán (có VAT):</Text>
              <Text style={styles.totalValue}>{formatMoney(totals.totalWithVat)}</Text>
            </View>
          </View>
        </View>

        {/* Package Services Section */}
        {aggregatedItems.packages.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionTitleRow}>
              <Feather name="package" size={16} color="#2563EB" />
              <Text style={styles.sectionTitle}>
                Gói dịch vụ ({aggregatedItems.packages.length})
              </Text>
            </View>

            {aggregatedItems.packages.map((pkg: any, idx: number) => {
              const isExpanded = !!expandedPackages[pkg.name];
              const pkgMargin =
                pkg.revenue > 0 ? ((pkg.revenue - pkg.cost) / pkg.revenue) * 100 : 0;

              return (
                <View key={pkg.name || idx} style={styles.packageCard}>
                  <TouchableOpacity
                    style={styles.packageHeader}
                    activeOpacity={0.7}
                    onPress={() => togglePackage(pkg.name)}
                  >
                    <View style={styles.packageHeaderLeft}>
                      <Text style={styles.packageName}>{pkg.name}</Text>
                      <Text style={styles.packageQty}>
                        Số lượng: <Text style={{ fontWeight: '700' }}>x{pkg.quantity}</Text>
                      </Text>
                    </View>

                    <View style={styles.packageHeaderRight}>
                      <Text style={styles.packageTotal}>{formatMoney(pkg.revenue)}</Text>
                      <Feather
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#64748B"
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Package Financial Bar */}
                  <View style={styles.packageMetaBar}>
                    <Text style={styles.packageMetaText}>
                      Đơn giá gói: <Text style={styles.boldText}>{formatMoney(pkg.sellingPrice)}</Text>
                    </Text>
                    <Text style={styles.packageMetaText}>
                      Biên LN: <Text style={[styles.boldText, { color: pkgMargin >= 20 ? '#059669' : '#D97706' }]}>
                        {pkgMargin.toFixed(0)}%
                      </Text>
                    </Text>
                  </View>

                  {/* Expanded Items */}
                  {isExpanded && (
                    <View style={styles.packageItemList}>
                      <Text style={styles.packageItemsHeader}>Chi tiết dịch vụ con:</Text>
                      {pkg.items.map((item: any, itemIdx: number) => (
                        <View key={item.id || itemIdx} style={styles.subItemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.subItemName}>
                              {item.name || item.service?.name || 'Dịch vụ'}
                            </Text>
                            <Text style={styles.subItemNorm}>
                              Định mức: {item.norm} {item.service?.unit || item.unit || 'lần'} / gói | Đơn giá: {formatMoney(item.sellingPrice)}
                            </Text>
                          </View>
                          <Text style={styles.subItemRevenue}>
                            {formatMoney(item.revenue)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Standalone Services Section */}
        {aggregatedItems.standalone.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionTitleRow}>
              <Feather name="layers" size={16} color="#059669" />
              <Text style={styles.sectionTitle}>
                Dịch vụ lẻ ({aggregatedItems.standalone.length})
              </Text>
            </View>

            {aggregatedItems.standalone.map((item: any, idx: number) => (
              <View key={item.id || idx} style={styles.standaloneCard}>
                <View style={styles.standaloneHeader}>
                  <Text style={styles.standaloneName}>
                    {item.name || item.service?.name || 'Dịch vụ lẻ'}
                  </Text>
                  <Text style={styles.standaloneRevenue}>{formatMoney(item.revenue)}</Text>
                </View>

                <View style={styles.standaloneMetaRow}>
                  <Text style={styles.standaloneMetaText}>
                    Số lượng: <Text style={styles.boldText}>{item.quantity} {item.service?.unit || item.unit || 'gói'}</Text>
                  </Text>
                  <Text style={styles.standaloneMetaText}>
                    Đơn giá: <Text style={styles.boldText}>{formatMoney(item.sellingPrice)}</Text>
                  </Text>
                  <Text style={styles.standaloneMetaText}>
                    Biên LN: <Text style={[styles.boldText, { color: (item.profitMargin || 0) >= 20 ? '#059669' : '#D97706' }]}>
                      {(item.profitMargin || 0).toFixed(0)}%
                    </Text>
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Sticky Bottom Actions Bar for BOD / Admin Approval */}
      {!isExpired && isAdminOrBod && isPending && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.rejectActionBtn}
            onPress={() => {
              setRejectReason('');
              setRejectModalVisible(true);
            }}
            disabled={isSubmittingReject || isSubmittingApprove}
            activeOpacity={0.8}
          >
            <Feather name="x" size={18} color="#DC2626" />
            <Text style={styles.rejectActionText}>Từ chối</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.approveActionBtn,
              isSubmittingApprove && styles.approveActionBtnDisabled,
            ]}
            onPress={handleApprove}
            disabled={isSubmittingReject || isSubmittingApprove}
            activeOpacity={0.85}
          >
            {isSubmittingApprove ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="check" size={18} color="#FFFFFF" />
                <Text style={styles.approveActionText}>Duyệt báo giá</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Sticky Bottom Actions Bar for REJECTED -> Sửa báo giá */}
      {!isExpired && canEdit && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.editFullBtn}
            onPress={handleEdit}
            activeOpacity={0.85}
          >
            <Feather name="edit-2" size={18} color="#FFFFFF" />
            <Text style={styles.editFullBtnText}>Sửa báo giá</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reject Modal */}
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
  headerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  headerEditText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  rejectNotice: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  rejectNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  rejectNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  rejectNoticeText: {
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  noteBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 2,
  },
  noteContent: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  cardHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryList: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryValueSub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  marginBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  marginBadgeGood: {
    backgroundColor: '#DCFCE7',
  },
  marginBadgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  marginText: {
    fontSize: 12,
    fontWeight: '700',
  },
  marginTextGood: {
    color: '#15803D',
  },
  marginTextWarning: {
    color: '#B45309',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  packageName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  packageQty: {
    fontSize: 12,
    color: '#64748B',
  },
  packageHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  packageTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2563EB',
  },
  packageMetaBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  packageMetaText: {
    fontSize: 12,
    color: '#64748B',
  },
  boldText: {
    fontWeight: '700',
    color: '#1E293B',
  },
  packageItemList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
  },
  packageItemsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  subItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  subItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  subItemNorm: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  subItemRevenue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginLeft: 8,
  },
  standaloneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  standaloneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  standaloneName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  standaloneRevenue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  standaloneMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  standaloneMetaText: {
    fontSize: 12,
    color: '#64748B',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 6,
  },
  rejectActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  approveActionBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
  },
  approveActionBtnDisabled: {
    opacity: 0.6,
  },
  approveActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editFullBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  editFullBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  expiredNotice: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  expiredNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  expiredNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  expiredNoticeText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
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
