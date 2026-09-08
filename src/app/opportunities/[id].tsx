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
import { CustomerInfoCard } from '@/components/opportunities/CustomerInfoCard';
import {
  CustomerAssignModal,
  CustomerAssignData,
} from '@/components/opportunities/CustomerAssignModal';
import { formatVNDFull, formatNumber } from '@/utils/formatters';

// Dictionary mapping for Region, Field and Priority
const REGION_LABELS: Record<string, string> = {
  NATIONAL: 'Toàn quốc',
  NORTH: 'Miền Bắc',
  CENTRAL: 'Miền Trung',
  SOUTH: 'Miền Nam',
};

const FIELD_LABELS: Record<string, string> = {
  CNTT: 'Công nghệ thông tin',
  XayDung: 'Xây dựng',
  SanXuat: 'Sản xuất',
  ThuongMai: 'Thương mại',
  DichVu: 'Dịch vụ',
  GiaoDuc: 'Giáo dục',
  YTe: 'Y tế',
  TaiChinh: 'Tài chính',
  BatDongSan: 'Bất động sản',
  Khac: 'Khác',
};

const PRIORITY_LABELS: Record<string, string> = {
  High: 'Cao',
  HIGH: 'Cao',
  Medium: 'Trung bình',
  MEDIUM: 'Trung bình',
  Low: 'Thấp',
  LOW: 'Thấp',
  URGENT: 'Khẩn cấp',
  Urgent: 'Khẩn cấp',
};

const PRIORITY_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  High: { bg: '#FFF1F2', text: '#E11D48', border: '#FFE4E6' },
  HIGH: { bg: '#FFF1F2', text: '#E11D48', border: '#FFE4E6' },
  Medium: { bg: '#FFFBEB', text: '#D97706', border: '#FEF3C7' },
  MEDIUM: { bg: '#FFFBEB', text: '#D97706', border: '#FEF3C7' },
  Low: { bg: '#ECFDF5', text: '#059669', border: '#D1FAE5' },
  LOW: { bg: '#ECFDF5', text: '#059669', border: '#D1FAE5' },
  URGENT: { bg: '#FEF2F2', text: '#DC2626', border: '#FEE2E2' },
  Urgent: { bg: '#FEF2F2', text: '#DC2626', border: '#FEE2E2' },
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'Chưa xác định';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export default function OpportunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [opportunity, setOpportunity] = useState<OpportunityItem | null>(null);
  const [quotations, setQuotations] = useState<QuotationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Customer Assign Modal State
  const [isCustomerModalVisible, setIsCustomerModalVisible] = useState(false);

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
      // Graceful error handling
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

  // Save Customer Handler (From CustomerAssignModal)
  const handleSaveCustomer = async (data: CustomerAssignData) => {
    if (!id) return;
    const backendSource = data.customerType === 'REFERRAL' ? 'REFERRAL_PARTNER' : 'INTERNAL';
    const updatePayload: any = {
      customerType: data.customerType,
      source: backendSource,
    };

    if (data.customerStatus === 'EXISTING') {
      updatePayload.customerId = data.selectedCustomerId;
      updatePayload.leadName = '';
      updatePayload.leadPhone = '';
      updatePayload.leadEmail = '';
      updatePayload.leadTaxId = '';
      updatePayload.leadAddress = '';
      updatePayload.referralPartnerId =
        data.customerType === 'REFERRAL' ? data.selectedReferralPartnerId : null;
    } else {
      updatePayload.customerId = null;
      updatePayload.leadName = data.leadName;
      updatePayload.leadPhone = data.leadPhone;
      updatePayload.leadEmail = data.leadEmail;
      updatePayload.leadTaxId = data.leadTaxId;
      updatePayload.leadAddress = data.leadAddress;
      updatePayload.referralPartnerId =
        data.customerType === 'REFERRAL' ? data.selectedReferralPartnerId : null;
    }

    const res = await opportunityService.updateOpportunity(id, updatePayload);
    if (res.error) {
      throw new Error(res.error);
    }
    Alert.alert('Thành công', 'Thông tin khách hàng đã được lưu thành công!');
    await loadData();
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
    Alert.alert('Duyệt báo giá', 'Xác nhận phê duyệt bản báo giá này?', [
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
    ]);
  };

  // BOD Reject Quotation Action
  const handleRejectQuotation = async (quoteId: string) => {
    Alert.alert('Từ chối báo giá', 'Bạn có chắc chắn muốn từ chối bản báo giá này?', [
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
    ]);
  };

  const handleOpenLink = (url: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert('Lỗi', `Không thể mở liên kết: ${url}`);
    });
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

  const statusMeta = getStatusLabel(opportunity.status);
  const isAwaitingApproval = opportunity.status === 'PENDING_OPP_APPROVAL';
  const standaloneServices = opportunity.services?.filter((s) => !s.opportunityPackageId) || [];
  const packages = opportunity.packages || [];
  const attachments = opportunity.attachments || [];

  const priorityKey = opportunity.priority || 'Medium';
  const priorityTheme = PRIORITY_THEMES[priorityKey] || {
    bg: '#F1F5F9',
    text: '#475569',
    border: '#E2E8F0',
  };
  const priorityLabel = PRIORITY_LABELS[priorityKey] || opportunity.priority || 'Bình thường';

  const successChance = opportunity.successChance ?? 0;
  const successColor =
    successChance >= 70 ? '#059669' : successChance >= 40 ? '#D97706' : '#DC2626';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. TOP APP BAR */}
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
        {/* 2. STATUS & PROGRESS STEPPER CARD */}
        <View style={styles.mainCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>
                {statusMeta.text}
              </Text>
            </View>

            <View
              style={[
                styles.priorityBox,
                { backgroundColor: priorityTheme.bg, borderColor: priorityTheme.border },
              ]}
            >
              <Text style={[styles.priorityText, { color: priorityTheme.text }]}>
                Ưu tiên: {priorityLabel}
              </Text>
            </View>
          </View>

          <Text style={styles.oppTitle}>{opportunity.name}</Text>

          {opportunity.description ? (
            <Text style={styles.oppDesc}>{opportunity.description}</Text>
          ) : null}

          {/* Stepper visual 4 bước */}
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

        {/* 3. KHỐI KHÁCH HÀNG & NGƯỜI LIÊN HỆ (OPTION A - VỊ TRÍ ƯU TIÊN SỐ 1) */}
        <View style={styles.cardWrapper}>
          <CustomerInfoCard
            opportunity={opportunity}
            onAddOrEditCustomer={() => setIsCustomerModalVisible(true)}
          />
        </View>

        {/* 4. KHỐI THÔNG TIN TÀI CHÍNH & KỲ VỌNG */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.titleIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="cash-outline" size={17} color="#2563EB" />
              </View>
              <Text style={styles.sectionHeader}>Thông tin Tài chính & Kỳ vọng</Text>
            </View>
          </View>

          <View style={styles.financialGrid}>
            <View style={styles.financialBox}>
              <Text style={styles.financialLabel}>Doanh thu kỳ vọng</Text>
              <Text style={styles.revenueHighlight}>
                {formatVNDFull(opportunity.expectedRevenue)}
              </Text>
            </View>

            <View style={styles.financialBox}>
              <Text style={styles.financialLabel}>Ngân sách dự kiến</Text>
              <Text style={styles.financialValue}>
                {formatVNDFull(opportunity.budget)}
              </Text>
            </View>
          </View>
        </View>

        {/* 5. KHỐI THỜI GIAN & ĐỊA ĐIỂM */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.titleIconBox, { backgroundColor: '#F3E8FF' }]}>
                <Feather name="calendar" size={16} color="#7C3AED" />
              </View>
              <Text style={styles.sectionHeader}>Thời gian & Địa điểm</Text>
            </View>
          </View>

          <View style={styles.twoColGrid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridItemLabel}>Dự kiến khởi công</Text>
              <Text style={styles.gridItemValue}>{formatDate(opportunity.startDate)}</Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.gridItemLabel}>Dự kiến kết thúc</Text>
              <Text style={styles.gridItemValue}>{formatDate(opportunity.endDate)}</Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.gridItemLabel}>Địa điểm triển khai</Text>
              <Text style={styles.gridItemValue}>
                {Array.isArray(opportunity.region)
                  ? opportunity.region
                      .map((r) => REGION_LABELS[r] || r)
                      .join(', ')
                  : (REGION_LABELS[opportunity.region as string] || opportunity.region || 'Chưa xác định')}
              </Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.gridItemLabel}>Thời lượng thực hiện</Text>
              <Text style={styles.gridItemValue}>
                {opportunity.durationMonths ? `${opportunity.durationMonths} Tháng` : 'Linh hoạt'}
              </Text>
            </View>
          </View>
        </View>

        {/* 6. KHỐI ĐÁNH GIÁ CƠ HỘI */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.titleIconBox, { backgroundColor: '#FFEDD5' }]}>
                <Ionicons name="trending-up" size={17} color="#EA580C" />
              </View>
              <Text style={styles.sectionHeader}>Đánh giá cơ hội</Text>
            </View>
          </View>

          <View style={styles.twoColGrid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridItemLabel}>Lĩnh vực kinh doanh</Text>
              <Text style={styles.gridItemValue}>
                {FIELD_LABELS[opportunity.field || ''] || opportunity.field || 'Chưa xác định'}
              </Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.gridItemLabel}>Độ ưu tiên</Text>
              <View style={[styles.priorityBadgeInline, { backgroundColor: priorityTheme.bg }]}>
                <Text style={[styles.priorityBadgeInlineText, { color: priorityTheme.text }]}>
                  {priorityLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* Win-rate bar */}
          <View style={styles.winRateContainer}>
            <View style={styles.winRateHeaderRow}>
              <Text style={styles.winRateLabel}>Khả năng thành công (Win-rate)</Text>
              <Text style={[styles.winRateValueText, { color: successColor }]}>
                {successChance}%
              </Text>
            </View>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, Math.max(0, successChance))}%`,
                    backgroundColor: successColor,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* 7. KHỐI DỊCH VỤ & GÓI DỊCH VỤ (Định mức chi tiết theo Web) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.titleIconBox, { backgroundColor: '#E0E7FF' }]}>
                <Feather name="package" size={16} color="#4F46E5" />
              </View>
              <Text style={styles.sectionHeader}>Dịch vụ & Gói dịch vụ</Text>
            </View>
          </View>

          {/* Danh sách các gói thầu */}
          {packages.length > 0 && (
            <View style={styles.packagesWrapper}>
              {packages.map((pkg) => (
                <View key={pkg.id} style={styles.packageCard}>
                  <View style={styles.packageCardHeader}>
                    <View style={styles.packageIcon}>
                      <Feather name="briefcase" size={14} color="#2563EB" />
                    </View>
                    <Text style={styles.packageNameText}>
                      Gói: {pkg.name}{' '}
                      <Text style={styles.packageQtyText}>x{pkg.quantity || 1}</Text>
                    </Text>
                  </View>

                  {/* Định mức dịch vụ con */}
                  <View style={styles.subServicesContainer}>
                    <Text style={styles.subServicesNotice}>
                      Số lượng dưới đây là định mức cho 1 gói:
                    </Text>

                    {pkg.services && pkg.services.length > 0 ? (
                      pkg.services.map((s) => {
                        const rawRatio = (s.quantity || 1) / (pkg.quantity || 1);
                        const quotaDisplay =
                          rawRatio % 1 === 0 ? rawRatio : Number(rawRatio.toFixed(2));
                        const unitName = s.service?.unit || s.unit || 'Đơn vị';

                        return (
                          <View key={s.id} style={styles.subServiceRow}>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text style={styles.subServiceName}>{s.service?.name || 'Dịch vụ'}</Text>
                              <Text style={styles.subServiceQuota}>
                                Định mức: {quotaDisplay} {unitName} / Gói
                              </Text>
                            </View>
                            <Text style={styles.subServicePrice}>
                              {formatNumber(s.sellingPrice)} VNĐ
                            </Text>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.emptySubText}>Chưa có dịch vụ thành phần trong gói.</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Danh sách Dịch vụ lẻ */}
          {standaloneServices.length > 0 && (
            <View style={styles.standaloneWrapper}>
              <Text style={styles.sectionSubTitle}>Dịch vụ lẻ</Text>
              {standaloneServices.map((s, idx) => (
                <View key={s.id || idx} style={styles.standaloneItemRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.standaloneName}>
                      {s.service?.name || s.serviceName || 'Dịch vụ lẻ'}
                    </Text>
                    <Text style={styles.standaloneQty}>
                      Số lượng: {s.quantity || 1} {s.service?.unit || s.unit || ''}
                    </Text>
                  </View>
                  <Text style={styles.standalonePrice}>
                    {formatNumber(s.sellingPrice || s.expectedRevenue)} VNĐ
                  </Text>
                </View>
              ))}
            </View>
          )}

          {packages.length === 0 && standaloneServices.length === 0 && (
            <View style={styles.emptyServicesBox}>
              <Feather name="layers" size={24} color="#CBD5E1" />
              <Text style={styles.emptyServicesText}>Chưa có dịch vụ hoặc gói nào được chọn.</Text>
            </View>
          )}
        </View>

        {/* 8. KHỐI YÊU CẦU KHÁCH HÀNG & TÀI LIỆU ĐÍNH KÈM */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.titleIconBox, { backgroundColor: '#CFFAFE' }]}>
                <Feather name="file-text" size={16} color="#0891B2" />
              </View>
              <Text style={styles.sectionHeader}>Yêu cầu & Tài liệu đính kèm</Text>
            </View>
          </View>

          {/* Yêu cầu đặc thù của khách hàng */}
          {opportunity.customerRequirements ? (
            <View style={styles.requirementsBox}>
              <Text style={styles.requirementsTitle}>Yêu cầu đặc thù của khách hàng:</Text>
              <Text style={styles.requirementsContent}>{opportunity.customerRequirements}</Text>
            </View>
          ) : null}

          {/* Danh sách tệp & liên kết đính kèm */}
          {attachments.length > 0 ? (
            <View style={styles.attachmentsList}>
              <Text style={styles.sectionSubTitle}>Tài liệu đính kèm ({attachments.length})</Text>
              {attachments.map((att, idx) => {
                const isLink = att.type === 'LINK';
                return (
                  <TouchableOpacity
                    key={att.id || idx}
                    style={styles.attachmentItemCard}
                    onPress={() => handleOpenLink(att.url)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.attachmentIconBox,
                        { backgroundColor: isLink ? '#EFF6FF' : '#F3E8FF' },
                      ]}
                    >
                      <Feather
                        name={isLink ? 'external-link' : 'file'}
                        size={16}
                        color={isLink ? '#2563EB' : '#7C3AED'}
                      />
                    </View>

                    <View style={styles.attachmentMeta}>
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {att.name || att.url}
                      </Text>
                      {isLink ? (
                        <Text style={styles.attachmentSubText} numberOfLines={1}>
                          {att.url}
                        </Text>
                      ) : att.size ? (
                        <Text style={styles.attachmentSubText}>
                          {(att.size / 1024).toFixed(1)} KB
                        </Text>
                      ) : null}
                    </View>

                    <Feather name="arrow-up-right" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : !opportunity.customerRequirements ? (
            <View style={styles.emptyAttachmentsBox}>
              <Feather name="paperclip" size={20} color="#CBD5E1" />
              <Text style={styles.emptyAttachmentsText}>Không có tài liệu hoặc yêu cầu đính kèm.</Text>
            </View>
          ) : null}
        </View>

        {/* 9. KHỐI THÔNG TIN BỔ SUNG */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.titleIconBox, { backgroundColor: '#F1F5F9' }]}>
                <Feather name="info" size={16} color="#64748B" />
              </View>
              <Text style={styles.sectionHeader}>Thông tin bổ sung</Text>
            </View>
          </View>

          <View style={styles.additionalList}>
            <View style={styles.additionalRow}>
              <Text style={styles.additionalLabel}>Ngày tạo</Text>
              <Text style={styles.additionalValue}>{formatDate(opportunity.createdAt)}</Text>
            </View>

            <View style={styles.additionalRow}>
              <Text style={styles.additionalLabel}>Cập nhật lần cuối</Text>
              <Text style={styles.additionalValue}>{formatDate(opportunity.updatedAt)}</Text>
            </View>

            <View style={styles.additionalRow}>
              <Text style={styles.additionalLabel}>Người tạo</Text>
              <Text style={styles.additionalValue}>
                {opportunity.createdBy?.fullName ||
                  opportunity.creator?.fullName ||
                  opportunity.createdBy?.username ||
                  'Chưa cập nhật'}
              </Text>
            </View>

            {opportunity.referralPartner && (
              <View style={styles.additionalRow}>
                <Text style={styles.additionalLabel}>Đối tác giới thiệu</Text>
                <Text style={styles.additionalValue}>{opportunity.referralPartner.name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 10. KHỐI BÁO GIÁ LIÊN KẾT */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.titleIconBox, { backgroundColor: '#ECFDF5' }]}>
                <Feather name="file-text" size={16} color="#059669" />
              </View>
              <Text style={styles.sectionHeader}>Báo giá liên kết ({quotations.length})</Text>
            </View>
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
              <Text style={styles.noQuoteText}>Chưa có bản báo giá nào được tạo cho cơ hội này.</Text>
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* 11. MODAL GÁN / CHỈNH SỬA KHÁCH HÀNG (BOTTOM SHEET) */}
      <CustomerAssignModal
        visible={isCustomerModalVisible}
        onClose={() => setIsCustomerModalVisible(false)}
        onSave={handleSaveCustomer}
        initialData={{
          customerType: opportunity.customerType,
          customerId: opportunity.customerId || opportunity.customer?.id,
          customer: opportunity.customer,
          leadName: opportunity.leadName,
          leadPhone: opportunity.leadPhone,
          leadEmail: opportunity.leadEmail,
          leadAddress: opportunity.leadAddress,
          leadTaxId: opportunity.leadTaxId,
          referralPartnerId: opportunity.referralPartnerId || opportunity.referralPartner?.id,
        }}
      />

      {/* 12. STICKY BOTTOM BAR: NÚT DUYỆT CƠ HỘI CHO BOD / ADMIN */}
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1.5,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
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
  cardWrapper: {
    marginBottom: 14,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  financialGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  financialBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  financialLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  revenueHighlight: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  financialValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  twoColGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '47%',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  gridItemLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  gridItemValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  priorityBadgeInline: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  priorityBadgeInlineText: {
    fontSize: 11,
    fontWeight: '700',
  },
  winRateContainer: {
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
  },
  winRateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  winRateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  winRateValueText: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  packagesWrapper: {
    gap: 12,
  },
  packageCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  packageCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  packageIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369A1',
    flex: 1,
  },
  packageQtyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284C7',
  },
  subServicesContainer: {
    marginLeft: 8,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#BAE6FD',
    gap: 8,
  },
  subServicesNotice: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  subServiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2FE',
  },
  subServiceName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  subServiceQuota: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  subServicePrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  emptySubText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  standaloneWrapper: {
    marginTop: 14,
    gap: 6,
  },
  standaloneItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  standaloneName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  standaloneQty: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  standalonePrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  emptyServicesBox: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyServicesText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  requirementsBox: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
    marginBottom: 4,
  },
  requirementsContent: {
    fontSize: 13,
    color: '#134E4A',
    lineHeight: 18,
  },
  attachmentsList: {
    gap: 8,
  },
  attachmentItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  attachmentIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentMeta: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  attachmentSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  emptyAttachmentsBox: {
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyAttachmentsText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  additionalList: {
    gap: 8,
  },
  additionalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  additionalLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  additionalValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
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
    textAlign: 'center',
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
