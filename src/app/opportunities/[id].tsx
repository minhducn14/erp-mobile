import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { canAccessOpportunities, isManagementRole } from '@/utils/rbac';
import { BrandColors } from '@/constants/colors';
import {
  opportunityService,
  OpportunityItem,
} from '@/services/opportunityService';
import {
  quotationService,
  QuotationItem,
} from '@/services/quotationService';
import { QuotationItemCard } from '@/components/opportunities/QuotationItemCard';
import { formatVND } from '@/utils/formatters';

export default function OpportunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [opportunity, setOpportunity] = useState<OpportunityItem | null>(null);
  const [quotations, setQuotations] = useState<QuotationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const isAdminOrBod = isManagementRole(user?.role);
  const hasAccess = canAccessOpportunities(user?.role);

  const loadData = useCallback(async () => {
    if (!id || !hasAccess) return;
    try {
      const [oppRes, quoteRes] = await Promise.all([
        opportunityService.getOpportunity(id),
        quotationService.getQuotationsByOpportunity(id),
      ]);

      if (oppRes.data) {
        setOpportunity(oppRes.data);
      }

      if (quoteRes.data && Array.isArray(quoteRes.data)) {
        setQuotations(quoteRes.data);
      }
    } catch {
      // Graceful error
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, hasAccess]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // BOD Approve Opportunity Action
  const handleApproveOpportunity = () => {
    Alert.alert(
      'Phê duyệt cơ hội',
      `Bạn có chắc chắn muốn phê duyệt cơ hội "${opportunity?.name}"? Sau khi duyệt, phòng kinh doanh có thể tiến hành làm báo giá và hợp đồng.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Phê duyệt ngay',
          style: 'default',
          onPress: async () => {
            if (!id) return;
            setIsApproving(true);
            try {
              const res = await opportunityService.approveOpportunity(id);
              if (res.error) {
                Alert.alert('Lỗi phê duyệt', res.error);
              } else {
                Alert.alert('Thành công', 'Cơ hội đã được phê duyệt thành công!');
                loadData();
              }
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể phê duyệt cơ hội.');
            } finally {
              setIsApproving(false);
            }
          },
        },
      ]
    );
  };

  // BOD Approve Quotation Action
  const handleApproveQuotation = async (quoteId: string) => {
    Alert.alert(
      'Duyệt báo giá',
      'Xác nhận phê duyệt bản báo giá này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Duyệt',
          onPress: async () => {
            try {
              const res = await quotationService.approveQuotation(quoteId);
              if (res.error) {
                Alert.alert('Lỗi', res.error);
              } else {
                Alert.alert('Thành công', 'Báo giá đã được phê duyệt.');
                loadData();
              }
            } catch {
              Alert.alert('Lỗi', 'Không thể duyệt báo giá.');
            }
          },
        },
      ]
    );
  };

  // BOD Reject Quotation Action
  const handleRejectQuotation = async (quoteId: string) => {
    Alert.alert(
      'Từ chối báo giá',
      'Bạn có chắc chắn muốn từ chối bản báo giá này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Từ chối',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await quotationService.rejectQuotation(quoteId, 'BOD yêu cầu chỉnh sửa');
              if (res.error) {
                Alert.alert('Lỗi', res.error);
              } else {
                Alert.alert('Đã từ chối', 'Bản báo giá đã bị từ chối.');
                loadData();
              }
            } catch {
              Alert.alert('Lỗi', 'Không thể từ chối báo giá.');
            }
          },
        },
      ]
    );
  };

  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('Không có SĐT', 'Chưa có thông tin số điện thoại liên hệ.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Lỗi', 'Không thể kích hoạt cuộc gọi.');
    });
  };

  const handleEmail = (email?: string) => {
    if (!email) {
      Alert.alert('Không có Email', 'Chưa có thông tin email liên hệ.');
      return;
    }
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở trình soạn email.');
    });
  };

  const formatMoney = (val?: number) => {
    return formatVND(val);
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'OPEN':
        return { text: 'Mới tạo', color: '#64748B', bg: '#F1F5F9' };
      case 'PENDING_OPP_APPROVAL':
        return { text: 'Chờ BOD duyệt', color: '#D97706', bg: '#FEF3C7' };
      case 'OPP_APPROVED':
        return { text: 'Đã duyệt cơ hội', color: '#059669', bg: '#D1FAE5' };
      case 'QUOTATION_DRAFTING':
        return { text: 'Đang làm báo giá', color: '#2563EB', bg: '#DBEAFE' };
      case 'PENDING_QUOTE_APPROVAL':
        return { text: 'Chờ duyệt báo giá', color: '#EA580C', bg: '#FFEDD5' };
      case 'QUOTE_APPROVED':
        return { text: 'Báo giá đã duyệt', color: '#0D9488', bg: '#CCFBF1' };
      case 'CONTRACT_CREATED':
        return { text: 'Đã tạo hợp đồng', color: '#7C3AED', bg: '#EDE9FE' };
      case 'PROJECT_ASSIGNED':
        return { text: 'Đã giao dự án', color: '#4F46E5', bg: '#EEF2FF' };
      case 'IMPLEMENTATION':
        return { text: 'Đang triển khai', color: '#0284C7', bg: '#E0F2FE' };
      case 'COMPLETED':
        return { text: 'Hoàn thành', color: '#16A34A', bg: '#DCFCE7' };
      default:
        return { text: status || '', color: '#64748B', bg: '#F1F5F9' };
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingDesc}>Đang tải chi tiết cơ hội...</Text>
      </View>
    );
  }

  if (!opportunity) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Không tìm thấy cơ hội</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Quay lại danh sách</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const customerName = opportunity.customer?.name || opportunity.leadName || 'Chưa cập nhật';
  const phoneNumber = opportunity.customer?.phone || opportunity.leadPhone;
  const emailAddress = opportunity.customer?.email || opportunity.leadEmail;
  const addressText = opportunity.customer?.address || opportunity.leadAddress;
  const isLead = !opportunity.customer && !!opportunity.leadName;
  const statusMeta = getStatusLabel(opportunity.status);
  const isAwaitingApproval = opportunity.status === 'PENDING_OPP_APPROVAL';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerCode}>{opportunity.opportunityCode || 'CƠ HỘI'}</Text>
          <Text style={styles.headerSub}>Chi tiết hồ sơ kinh doanh</Text>
        </View>

        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={loadData}
          activeOpacity={0.7}
        >
          <Feather name="refresh-cw" size={18} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[BrandColors.primary]}
            tintColor={BrandColors.primary}
          />
        }
      >
        {/* Status & Name Card */}
        <View style={styles.mainCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>
                {statusMeta.text}
              </Text>
            </View>

            {opportunity.priority ? (
              <View style={styles.priorityBox}>
                <Text style={styles.priorityText}>Ưu tiên: {opportunity.priority}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.oppTitle}>{opportunity.name}</Text>

          {opportunity.description ? (
            <Text style={styles.oppDesc}>{opportunity.description}</Text>
          ) : null}

          {/* Stepper overview */}
          <View style={styles.stepperContainer}>
            <View style={styles.stepperItem}>
              <View style={[styles.stepperDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.stepperText}>Mới tạo</Text>
            </View>
            <View style={styles.stepperLine} />
            <View style={styles.stepperItem}>
              <View
                style={[
                  styles.stepperDot,
                  {
                    backgroundColor:
                      opportunity.status !== 'OPEN' ? '#10B981' : '#CBD5E1',
                  },
                ]}
              />
              <Text style={styles.stepperText}>BOD duyệt</Text>
            </View>
            <View style={styles.stepperLine} />
            <View style={styles.stepperItem}>
              <View
                style={[
                  styles.stepperDot,
                  {
                    backgroundColor:
                      opportunity.status === 'QUOTATION_DRAFTING' ||
                      opportunity.status === 'PENDING_QUOTE_APPROVAL' ||
                      opportunity.status === 'QUOTE_APPROVED' ||
                      opportunity.status === 'CONTRACT_CREATED' ||
                      opportunity.status === 'PROJECT_ASSIGNED'
                        ? '#10B981'
                        : '#CBD5E1',
                  },
                ]}
              />
              <Text style={styles.stepperText}>Báo giá</Text>
            </View>
            <View style={styles.stepperLine} />
            <View style={styles.stepperItem}>
              <View
                style={[
                  styles.stepperDot,
                  {
                    backgroundColor:
                      opportunity.status === 'CONTRACT_CREATED' ||
                      opportunity.status === 'PROJECT_ASSIGNED'
                        ? '#10B981'
                        : '#CBD5E1',
                  },
                ]}
              />
              <Text style={styles.stepperText}>Hợp đồng</Text>
            </View>
          </View>
        </View>

        {/* Financial & Metric Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Thông tin Tài chính & Kỳ vọng</Text>

          <View style={styles.financialGrid}>
            <View style={styles.financialBox}>
              <Text style={styles.financialLabel}>Doanh thu kỳ vọng</Text>
              <Text style={styles.revenueHighlight}>
                {formatMoney(opportunity.expectedRevenue)}
              </Text>
            </View>

            <View style={styles.financialBox}>
              <Text style={styles.financialLabel}>Ngân sách dự kiến</Text>
              <Text style={styles.financialValue}>
                {formatMoney(opportunity.budget)}
              </Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricItemLabel}>Tỷ lệ thành công</Text>
              <Text style={styles.metricItemValue}>{opportunity.successChance ?? 0}%</Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, opportunity.successChance ?? 0))}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricItemLabel}>Thời lượng thực hiện</Text>
              <Text style={styles.metricItemValue}>
                {opportunity.durationMonths ? `${opportunity.durationMonths} Tháng` : 'Linh hoạt'}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer / Lead Info Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Khách hàng & Người liên hệ</Text>
            {isLead && (
              <View style={styles.leadBadge}>
                <Text style={styles.leadBadgeText}>Khách hàng tiềm năng (Lead)</Text>
              </View>
            )}
          </View>

          <View style={styles.customerDetailRow}>
            <View style={styles.customerAvatar}>
              <Ionicons
                name={isLead ? 'person' : 'business'}
                size={22}
                color={BrandColors.primary}
              />
            </View>
            <View style={styles.customerMeta}>
              <Text style={styles.customerFullName}>{customerName}</Text>
              <Text style={styles.customerType}>
                Loại: {opportunity.customerType === 'REFERRAL' ? 'Đối tác giới thiệu' : 'Trực tiếp'}
              </Text>
            </View>
          </View>

          {/* Contact Actions Row */}
          <View style={styles.contactActionsRow}>
            {phoneNumber ? (
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => handleCall(phoneNumber)}
                activeOpacity={0.8}
              >
                <Feather name="phone-call" size={16} color="#059669" />
                <Text style={[styles.contactBtnText, { color: '#059669' }]}>
                  {phoneNumber}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.contactBtn, styles.contactBtnDisabled]}>
                <Feather name="phone-off" size={16} color="#94A3B8" />
                <Text style={styles.contactBtnDisabledText}>Chưa có SĐT</Text>
              </View>
            )}

            {emailAddress ? (
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => handleEmail(emailAddress)}
                activeOpacity={0.8}
              >
                <Feather name="mail" size={16} color="#2563EB" />
                <Text style={[styles.contactBtnText, { color: '#2563EB' }]} numberOfLines={1}>
                  Email
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {addressText ? (
            <View style={styles.addressRow}>
              <Feather name="map-pin" size={14} color="#64748B" />
              <Text style={styles.addressText}>{addressText}</Text>
            </View>
          ) : null}

          {opportunity.referralPartner ? (
            <View style={styles.partnerInfoBox}>
              <Text style={styles.partnerInfoTitle}>Đối tác giới thiệu:</Text>
              <Text style={styles.partnerInfoName}>{opportunity.referralPartner.name}</Text>
            </View>
          ) : null}
        </View>

        {/* Linked Quotations Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Báo giá liên kết ({quotations.length})</Text>
          </View>

          {quotations.length > 0 ? (
            quotations.map((quote) => (
              <QuotationItemCard
                key={quote.id}
                item={quote}
                isAdminOrBod={isAdminOrBod}
                onApprove={handleApproveQuotation}
                onReject={handleRejectQuotation}
              />
            ))
          ) : (
            <View style={styles.noQuoteBox}>
              <Feather name="file-text" size={24} color="#CBD5E1" />
              <Text style={styles.noQuoteText}>Chưa có bản báo giá nào được tạo.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Action: BOD Approval Button */}
      {isAdminOrBod && isAwaitingApproval && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.approveActionBtn, isApproving && styles.approveActionBtnDisabled]}
            onPress={handleApproveOpportunity}
            disabled={isApproving}
            activeOpacity={0.85}
          >
            {isApproving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="check-circle" size={18} color="#FFFFFF" />
                <Text style={styles.approveActionBtnText}>Phê duyệt cơ hội này</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
    padding: 24,
  },
  loadingDesc: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerCode: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  priorityBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  oppTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
    marginBottom: 8,
  },
  oppDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  stepperItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepperDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  stepperText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  stepperLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
    marginBottom: 14,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  leadBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  leadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  financialGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  financialBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
  },
  financialLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  revenueHighlight: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  financialValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
  },
  metricItemLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  metricItemValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  customerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: BrandColors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerMeta: {
    flex: 1,
  },
  customerFullName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  customerType: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  contactActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
  },
  contactBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  contactBtnDisabled: {
    opacity: 0.5,
  },
  contactBtnDisabledText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  addressText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    lineHeight: 18,
  },
  partnerInfoBox: {
    marginTop: 10,
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 10,
  },
  partnerInfoTitle: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '700',
  },
  partnerInfoName: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '600',
    marginTop: 2,
  },
  noQuoteBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noQuoteText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  bottomBar: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  approveActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  approveActionBtnDisabled: {
    opacity: 0.6,
  },
  approveActionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
