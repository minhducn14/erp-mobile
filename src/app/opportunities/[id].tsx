import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
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
  QuotationStatus,
} from '@/services/quotationService';
import { useSSERefresh } from '@/hooks/useSSERefresh';
import {
  contractService,
  CONTRACT_STATUS_CONFIG,
  CONTRACT_STATUS_LABELS,
} from '@/services/contractService';
import { customerService } from '@/services/customerService';
import { QuotationItemCard } from '@/components/opportunities/QuotationItemCard';
import { CustomerInfoCard } from '@/components/opportunities/CustomerInfoCard';
import {
  CustomerAssignModal,
  CustomerAssignData,
} from '@/components/opportunities/CustomerAssignModal';
import { formatVNDFull, formatNumber } from '@/utils/formatters';
import {
  useOpportunityDetailQuery,
  useApproveOpportunityMutation,
  useUpdateOpportunityMutation,
} from '@/hooks/queries/useOpportunities';
import {
  useOpportunityQuotationsQuery,
  useApproveQuotationMutation,
  useRejectQuotationMutation,
} from '@/hooks/queries/useQuotations';
import { useCreateContractMutation } from '@/hooks/queries/useContracts';
import { useUpdateCustomerMutation } from '@/hooks/queries/useCustomers';

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
  const {
    data: opportunity = null,
    isLoading: isOppLoading,
    isFetching: isOppFetching,
    refetch: refetchOpp,
  } = useOpportunityDetailQuery(id as string);

  const {
    data: rawQuotations = [],
    isLoading: isQuoteLoading,
    isFetching: isQuoteFetching,
    refetch: refetchQuotes,
  } = useOpportunityQuotationsQuery(id as string);

  const quotations: QuotationItem[] = Array.isArray(rawQuotations) ? rawQuotations : [];

  const updateOpportunityMutation = useUpdateOpportunityMutation();
  const approveOpportunityMutation = useApproveOpportunityMutation();
  const createContractMutation = useCreateContractMutation();
  const updateCustomerMutation = useUpdateCustomerMutation();
  const approveQuotationMutation = useApproveQuotationMutation();
  const rejectQuotationMutation = useRejectQuotationMutation();

  const isApproving = approveOpportunityMutation.isPending;
  const isCreatingContract = createContractMutation.isPending;

  // Customer Assign Modal State
  const [isCustomerModalVisible, setIsCustomerModalVisible] = useState(false);

  const handlePromptCreateContract = () => {
    if (!opportunity) return;
    const defaultName = opportunity.name
      ? `Hợp đồng ${opportunity.name}`
      : `Hợp đồng ${opportunity.opportunityCode}`;

    Alert.alert(
      'Xác nhận tạo hợp đồng',
      `Hệ thống sẽ tạo hợp đồng mới dựa trên thông tin và báo giá đã duyệt của cơ hội "${opportunity.name}". Bạn có chắc chắn muốn tạo?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tạo hợp đồng',
          onPress: async () => {
            try {
              const newContract = await createContractMutation.mutateAsync({
                opportunityId: id as string,
                name: defaultName,
              });

              if (newContract) {
                Alert.alert('Thành công', 'Đã tạo hợp đồng kinh tế thành công!', [
                  {
                    text: 'Xem chi tiết hợp đồng',
                    onPress: () => {
                      if (newContract?.id) {
                        router.push({
                          pathname: '/contracts/[id]',
                          params: { id: newContract.id },
                        } as any);
                      }
                    },
                  },
                  {
                    text: 'Đóng',
                    style: 'cancel',
                  },
                ]);
                refetchAll();
              }
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi tạo hợp đồng.');
            }
          },
        },
      ]
    );
  };

  const isAdminOrBod = isManagementRole(user?.role);
  const hasAccess = canAccessOpportunities(user?.role);

  const refetchAll = useCallback(() => {
    refetchOpp();
    refetchQuotes();
  }, [refetchOpp, refetchQuotes]);

  useFocusEffect(
    useCallback(() => {
      refetchAll();
    }, [refetchAll])
  );

  useSSERefresh(
    ['invalidate_Opportunities', 'invalidate_Tasks'],
    refetchAll
  );

  const isLoading = (isOppLoading || isQuoteLoading) && !opportunity;
  const isRefreshing = isOppFetching || isQuoteFetching;

  const handleRefresh = () => {
    refetchAll();
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

    await updateOpportunityMutation.mutateAsync({ id, payload: updatePayload });
    Alert.alert('Thành công', 'Thông tin khách hàng đã được lưu thành công!');
  };

  // Inline Edit Customer Handler (chuẩn Web CustomerInfo.jsx)
  const handleSaveEditCustomer = async (data: {
    name?: string;
    phone?: string;
    email?: string;
    taxId?: string;
    address?: string;
  }) => {
    if (!id || !opportunity) return;

    if (opportunity.customer) {
      // KH hiện hữu: cập nhật qua TanStack Mutation
      await updateCustomerMutation.mutateAsync({
        id: opportunity.customer.id,
        payload: {
          phoneNumber: data.phone,
          email: data.email,
          taxId: data.taxId,
          address: data.address,
        } as any,
      });
      refetchAll();
    } else {
      // Lead (tiềm năng): cập nhật qua opportunityService
      await updateOpportunityMutation.mutateAsync({
        id,
        payload: {
          leadName: data.name,
          leadPhone: data.phone,
          leadEmail: data.email,
          leadTaxId: data.taxId,
          leadAddress: data.address,
        },
      });
    }

    Alert.alert('Thành công', 'Cập nhật thông tin thành công!');
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
            try {
              await approveOpportunityMutation.mutateAsync(id);
              Alert.alert('Thành công', 'Cơ hội đã được phê duyệt thành công!');
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể phê duyệt cơ hội.');
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
            await approveQuotationMutation.mutateAsync(quoteId);
            Alert.alert('Thành công', 'Báo giá đã được phê duyệt.');
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
            await rejectQuotationMutation.mutateAsync({ id: quoteId, reason: 'BOD yêu cầu chỉnh sửa' });
            Alert.alert('Đã từ chối', 'Bản báo giá đã bị từ chối.');
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
      <View className="flex-1 justify-center items-center p-6">
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text className="mt-3 text-[13px] text-slate-500">Đang tải chi tiết cơ hội...</Text>
      </View>
    );
  }

  if (!opportunity) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-base font-bold text-slate-800 mb-4">Không tìm thấy cơ hội</Text>
          <TouchableOpacity className="bg-primary px-4 py-2.5 rounded-xl" onPress={() => router.back()}>
            <Text className="text-white font-bold">Quay lại danh sách</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusMeta = getStatusLabel(opportunity.status);
  const isAwaitingApproval = opportunity.status === 'PENDING_OPP_APPROVAL';
  const hasCustomer = !!(
    opportunity.customer ||
    opportunity.customerId ||
    opportunity.leadName
  );

  const draftCount = quotations.filter((q) => q.status === 'DRAFT').length;
  const showBadge = draftCount > 0;

  const canCreateQuotation =
    hasCustomer &&
    (opportunity.status === 'QUOTATION_DRAFTING' ||
      opportunity.status === 'PENDING_QUOTE_APPROVAL' ||
      (opportunity.status === 'OPP_APPROVED' &&
        (user?.role === 'ADMIN' || (opportunity.createdBy as any)?.id === user?.id)));

  const canViewQuotations = hasCustomer && quotations.length > 0;
  const canCreateContract = opportunity.status === 'QUOTE_APPROVED';
  const linkedContract =
    opportunity.contracts && opportunity.contracts.length > 0
      ? opportunity.contracts[0]
      : null;
  const hasContract =
    opportunity.status === 'CONTRACT_CREATED' || !!linkedContract;
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
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* 1. TOP APP BAR */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        <TouchableOpacity
          className="w-[38px] h-[38px] rounded-xl bg-slate-100 justify-center items-center"
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-base font-extrabold text-slate-900">{opportunity.opportunityCode || 'CƠ HỘI'}</Text>
          <Text className="text-[11px] text-slate-500">Chi tiết hồ sơ kinh doanh</Text>
        </View>

        <TouchableOpacity
          className="w-[38px] h-[38px] rounded-xl bg-slate-100 justify-center items-center"
          onPress={handleRefresh}
          activeOpacity={0.7}
        >
          <Feather name="refresh-cw" size={18} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerClassName="p-4 pb-10"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
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
        <View className="bg-white rounded-[18px] p-4 mb-3.5 border border-slate-200 shadow-sm">
          <View className="flex-row justify-between items-center mb-2.5">
            <View className="px-2.5 py-1 rounded-lg" style={{ backgroundColor: statusMeta.bg }}>
              <Text className="text-xs font-bold" style={{ color: statusMeta.color }}>
                {statusMeta.text}
              </Text>
            </View>

            <View
              className="px-2 py-0.5 rounded-md border"
              style={{ backgroundColor: priorityTheme.bg, borderColor: priorityTheme.border }}
            >
              <Text className="text-[11px] font-bold" style={{ color: priorityTheme.text }}>
                Ưu tiên: {priorityLabel}
              </Text>
            </View>
          </View>

          <Text className="text-lg font-extrabold text-slate-900 leading-6 mb-2">{opportunity.name}</Text>

          {opportunity.description ? (
            <Text className="text-[13px] text-slate-600 leading-5 mb-4">{opportunity.description}</Text>
          ) : null}

          {/* Stepper visual 4 bước */}
          <View className="flex-row items-center justify-between pt-3.5 border-t border-slate-100">
            <View className="items-center gap-1">
              <View className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
              <Text className="text-[10px] text-slate-500 font-semibold">Mới tạo</Text>
            </View>
            <View className="flex-1 h-0.5 bg-slate-200 mx-1 mb-3.5" />
            <View className="items-center gap-1">
              <View
                className={`w-3.5 h-3.5 rounded-full ${
                  opportunity.status !== 'OPEN' ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              />
              <Text className="text-[10px] text-slate-500 font-semibold">BOD duyệt</Text>
            </View>
            <View className="flex-1 h-0.5 bg-slate-200 mx-1 mb-3.5" />
            <View className="items-center gap-1">
              <View
                className={`w-3.5 h-3.5 rounded-full ${
                  opportunity.status === 'QUOTATION_DRAFTING' ||
                  opportunity.status === 'PENDING_QUOTE_APPROVAL' ||
                  opportunity.status === 'QUOTE_APPROVED' ||
                  opportunity.status === 'CONTRACT_CREATED' ||
                  opportunity.status === 'PROJECT_ASSIGNED'
                    ? 'bg-emerald-500'
                    : 'bg-slate-300'
                }`}
              />
              <Text className="text-[10px] text-slate-500 font-semibold">Báo giá</Text>
            </View>
            <View className="flex-1 h-0.5 bg-slate-200 mx-1 mb-3.5" />
            <View className="items-center gap-1">
              <View
                className={`w-3.5 h-3.5 rounded-full ${
                  opportunity.status === 'CONTRACT_CREATED' ||
                  opportunity.status === 'PROJECT_ASSIGNED'
                    ? 'bg-emerald-500'
                    : 'bg-slate-300'
                }`}
              />
              <Text className="text-[10px] text-slate-500 font-semibold">Hợp đồng</Text>
            </View>
          </View>

          {/* 2.1. THANH HÀNH ĐỘNG NHANH (QUICK ACTIONS BAR) ĐỒNG BỘ TỪ WEB */}
          {hasCustomer && (canViewQuotations || canCreateQuotation || canCreateContract || hasContract) && (
            <View className="flex-row flex-wrap gap-2 mt-3.5 pt-3 border-t border-slate-100">
              {canViewQuotations && (
                <View className="relative flex-1 min-w-[125px]">
                  <TouchableOpacity
                    className="flex-row items-center justify-center gap-1.5 bg-slate-900 px-3.5 py-2 rounded-lg"
                    onPress={() =>
                      router.push({
                        pathname: '/opportunities/quotations/list',
                        params: { opportunityId: id, opportunityName: opportunity.name },
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <Feather name="file-text" size={14} color="#FFFFFF" />
                    <Text className="text-[13px] font-bold text-white" style={{ flexShrink: 1 }} numberOfLines={1} ellipsizeMode="tail">Xem báo giá</Text>
                  </TouchableOpacity>
                  {showBadge && (
                    <View className="absolute -top-1.5 -right-1.5 bg-red-600 rounded-full min-w-[20px] h-5 items-center justify-center px-1 border-2 border-white">
                      <Text className="text-[10px] font-black text-white">
                        {draftCount > 9 ? '9+' : draftCount}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {canCreateQuotation && (
                <TouchableOpacity
                  className="flex-row items-center gap-1.5 bg-emerald-600 px-3.5 py-2 rounded-lg"
                  onPress={() =>
                    router.push({
                      pathname: '/opportunities/quotations/create',
                      params: { opportunityId: id },
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Feather name="plus" size={14} color="#FFFFFF" />
                  <Text className="text-[13px] font-bold text-white" style={{ flexShrink: 1 }} numberOfLines={1} ellipsizeMode="tail">Tạo báo giá</Text>
                </TouchableOpacity>
              )}

              {canCreateContract && (
                <TouchableOpacity
                  className="flex-row items-center gap-1.5 bg-cyan-600 px-3.5 py-2 rounded-lg"
                  onPress={handlePromptCreateContract}
                  disabled={isCreatingContract}
                  activeOpacity={0.8}
                >
                  {isCreatingContract ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="briefcase" size={14} color="#FFFFFF" />
                      <Text className="text-[13px] font-bold text-white" style={{ flexShrink: 1 }} numberOfLines={1} ellipsizeMode="tail">Tạo hợp đồng</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {hasContract && linkedContract && (
                <TouchableOpacity
                  className="flex-row items-center justify-center gap-1.5 bg-slate-900 px-2.5 py-2 rounded-lg flex-1 min-w-[120px]"
                  onPress={() =>
                    router.push({
                      pathname: '/contracts/[id]',
                      params: { id: linkedContract.id },
                    } as any)
                  }
                  activeOpacity={0.8}
                >
                  <Feather name="file-text" size={14} color="#FFFFFF" />
                    <Text
                      className="text-[13px] font-bold text-white"
                      style={{ flexShrink: 1 }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {linkedContract.contractCode
                        ? `HĐ: ${linkedContract.contractCode}`
                        : 'Xem hợp đồng'}
                    </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* 3. KHỐI KHÁCH HÀNG & NGƯỜI LIÊN HỆ */}
        <View className="mb-3.5">
          <CustomerInfoCard
            opportunity={opportunity}
            onAddCustomer={() => setIsCustomerModalVisible(true)}
            onSaveEdit={handleSaveEditCustomer}
          />
        </View>

        {/* 4. KHỐI THÔNG TIN TÀI CHÍNH & KỲ VỌNG */}
        <View className="bg-white rounded-[18px] p-4 mb-3.5 border border-slate-200 shadow-sm">
          <View className="flex-row justify-between items-center mb-3.5">
            <View className="flex-row items-center gap-2">
              <View className="w-7 h-7 rounded-lg justify-center items-center bg-blue-50">
                <Ionicons name="cash-outline" size={17} color="#2563EB" />
              </View>
              <Text className="text-[15px] font-extrabold text-slate-900">Thông tin Tài chính & Kỳ vọng</Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <Text className="text-[11px] text-slate-500 font-semibold mb-1">Doanh thu kỳ vọng</Text>
              <Text 
                className="text-[15px] font-extrabold text-primary" 
                numberOfLines={1} 
                adjustsFontSizeToFit 
                minimumFontScale={0.75}
              >
                {formatVNDFull(opportunity.expectedRevenue)}
              </Text>
            </View>

            <View className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <Text className="text-[11px] text-slate-500 font-semibold mb-1">Ngân sách dự kiến</Text>
              <Text 
                className="text-[15px] font-bold text-slate-900" 
                numberOfLines={1} 
                adjustsFontSizeToFit 
                minimumFontScale={0.75}
              >
                {formatVNDFull(opportunity.budget)}
              </Text>
            </View>
          </View>
        </View>

        {/* 5. KHỐI THỜI GIAN & ĐỊA ĐIỂM */}
        <View className="bg-white rounded-[18px] p-4 mb-3.5 border border-slate-200 shadow-sm">
          <View className="flex-row justify-between items-center mb-3.5">
            <View className="flex-row items-center gap-2">
              <View className="w-7 h-7 rounded-lg justify-center items-center bg-purple-100">
                <Feather name="calendar" size={16} color="#7C3AED" />
              </View>
              <Text className="text-[15px] font-extrabold text-slate-900">Thời gian & Địa điểm</Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-3">
            <View className="w-[47%] bg-slate-50 p-2.5 rounded-lg">
              <Text className="text-[11px] text-slate-500 mb-0.5">Dự kiến khởi công</Text>
              <Text className="text-[13px] font-bold text-slate-800">{formatDate(opportunity.startDate)}</Text>
            </View>

            <View className="w-[47%] bg-slate-50 p-2.5 rounded-lg">
              <Text className="text-[11px] text-slate-500 mb-0.5">Dự kiến kết thúc</Text>
              <Text className="text-[13px] font-bold text-slate-800">{formatDate(opportunity.endDate)}</Text>
            </View>

            <View className="w-[47%] bg-slate-50 p-2.5 rounded-lg">
              <Text className="text-[11px] text-slate-500 mb-0.5">Địa điểm triển khai</Text>
              <Text className="text-[13px] font-bold text-slate-800">
                {Array.isArray(opportunity.region)
                  ? opportunity.region
                      .map((r) => REGION_LABELS[r] || r)
                      .join(', ')
                  : (REGION_LABELS[opportunity.region as string] || opportunity.region || 'Chưa xác định')}
              </Text>
            </View>

            <View className="w-[47%] bg-slate-50 p-2.5 rounded-lg">
              <Text className="text-[11px] text-slate-500 mb-0.5">Thời lượng thực hiện</Text>
              <Text className="text-[13px] font-bold text-slate-800">
                {opportunity.durationMonths ? `${opportunity.durationMonths} Tháng` : 'Linh hoạt'}
              </Text>
            </View>
          </View>
        </View>

        {/* 6. KHỐI ĐÁNH GIÁ CƠ HỘI */}
        <View className="bg-white rounded-[18px] p-4 mb-3.5 border border-slate-200 shadow-sm">
          <View className="flex-row justify-between items-center mb-3.5">
            <View className="flex-row items-center gap-2">
              <View className="w-7 h-7 rounded-lg justify-center items-center bg-orange-100">
                <Ionicons name="trending-up" size={17} color="#EA580C" />
              </View>
              <Text className="text-[15px] font-extrabold text-slate-900">Đánh giá cơ hội</Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-3">
            <View className="w-[47%] bg-slate-50 p-2.5 rounded-lg">
              <Text className="text-[11px] text-slate-500 mb-0.5">Lĩnh vực kinh doanh</Text>
              <Text className="text-[13px] font-bold text-slate-800">
                {FIELD_LABELS[opportunity.field || ''] || opportunity.field || 'Chưa xác định'}
              </Text>
            </View>

            <View className="w-[47%] bg-slate-50 p-2.5 rounded-lg">
              <Text className="text-[11px] text-slate-500 mb-0.5">Độ ưu tiên</Text>
              <View className="self-start px-2 py-0.5 rounded-md mt-0.5" style={{ backgroundColor: priorityTheme.bg }}>
                <Text className="text-[11px] font-bold" style={{ color: priorityTheme.text }}>
                  {priorityLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* Win-rate bar */}
          <View className="mt-3.5 bg-slate-50 p-3 rounded-xl">
            <View className="flex-row justify-between items-center mb-1.5">
              <Text className="text-xs font-semibold text-slate-600">Khả năng thành công (Win-rate)</Text>
              <Text className="text-sm font-extrabold" style={{ color: successColor }}>
                {successChance}%
              </Text>
            </View>

            <View className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(0, successChance))}%`,
                  backgroundColor: successColor,
                }}
              />
            </View>
          </View>
        </View>

        {/* 7. KHỐI DỊCH VỤ & GÓI DỊCH VỤ */}
        <View className="bg-white rounded-[18px] p-4 mb-3.5 border border-slate-200 shadow-sm">
          <View className="flex-row justify-between items-center mb-3.5">
            <View className="flex-row items-center gap-2">
              <View className="w-7 h-7 rounded-lg justify-center items-center bg-indigo-100">
                <Feather name="package" size={16} color="#4F46E5" />
              </View>
              <Text className="text-[15px] font-extrabold text-slate-900">Dịch vụ & Gói dịch vụ</Text>
            </View>
          </View>

          {/* Danh sách các gói thầu */}
          {packages.length > 0 && (
            <View className="gap-3">
              {packages.map((pkg) => (
                <View key={pkg.id} className="bg-sky-50/60 rounded-xl p-3 border border-sky-200">
                  <View className="flex-row items-center gap-2 mb-2">
                    <View className="w-6 h-6 rounded-md bg-sky-100 justify-center items-center">
                      <Feather name="briefcase" size={14} color="#2563EB" />
                    </View>
                    <Text className="text-sm font-extrabold text-sky-800 flex-1">
                      Gói: {pkg.name}{' '}
                      <Text className="text-[13px] font-semibold text-sky-600">x{pkg.quantity || 1}</Text>
                    </Text>
                  </View>

                  {/* Định mức dịch vụ con */}
                  <View className="ml-2 pl-2.5 border-l-2 border-sky-200 gap-2">
                    <Text className="text-[10px] font-bold text-sky-600 italic uppercase tracking-wider">
                      Số lượng dưới đây là định mức cho 1 gói:
                    </Text>

                    {pkg.services && pkg.services.length > 0 ? (
                      pkg.services.map((s) => {
                        const rawRatio = (s.quantity || 1) / (pkg.quantity || 1);
                        const quotaDisplay =
                          rawRatio % 1 === 0 ? rawRatio : Number(rawRatio.toFixed(2));
                        const unitName = s.service?.unit || s.unit || 'Đơn vị';

                        return (
                          <View key={s.id} className="flex-row justify-between items-center py-1 border-b border-sky-100">
                            <View className="flex-1 pr-2">
                              <Text className="text-xs font-semibold text-slate-800">{s.service?.name || 'Dịch vụ'}</Text>
                              <Text className="text-[11px] text-slate-500 mt-0.5">
                                Định mức: {quotaDisplay} {unitName} / Gói
                              </Text>
                            </View>
                            <Text className="text-xs font-bold text-sky-700">
                              {formatNumber(s.sellingPrice)} VNĐ
                            </Text>
                          </View>
                        );
                      })
                    ) : (
                      <Text className="text-[11px] text-slate-400 italic">Chưa có dịch vụ thành phần trong gói.</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Danh sách Dịch vụ lẻ */}
          {standaloneServices.length > 0 && (
            <View className="mt-3.5 gap-1.5">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-1">Dịch vụ lẻ</Text>
              {standaloneServices.map((s, idx) => (
                <View key={s.id || idx} className="flex-row justify-between items-center bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                  <View className="flex-1 pr-2">
                    <Text className="text-[13px] font-semibold text-slate-800">
                      {s.service?.name || s.serviceName || 'Dịch vụ lẻ'}
                    </Text>
                    <Text className="text-[11px] text-slate-500 mt-0.5">
                      Số lượng: {s.quantity || 1} {s.service?.unit || s.unit || ''}
                    </Text>
                  </View>
                  <Text className="text-[13px] font-bold text-slate-700">
                    {formatNumber(s.sellingPrice || s.expectedRevenue)} VNĐ
                  </Text>
                </View>
              ))}
            </View>
          )}

          {packages.length === 0 && standaloneServices.length === 0 && (
            <View className="py-5 items-center gap-1.5">
              <Feather name="layers" size={24} color="#CBD5E1" />
              <Text className="text-xs text-slate-400 italic">Chưa có dịch vụ hoặc gói nào được chọn.</Text>
            </View>
          )}
        </View>

        {/* 8. KHỐI YÊU CẦU KHÁCH HÀNG & TÀI LIỆU ĐÍNH KÈM */}
        <View className="bg-white rounded-[18px] p-4 mb-3.5 border border-slate-200 shadow-sm">
          <View className="flex-row justify-between items-center mb-3.5">
            <View className="flex-row items-center gap-2">
              <View className="w-7 h-7 rounded-lg justify-center items-center bg-cyan-100">
                <Feather name="file-text" size={16} color="#0891B2" />
              </View>
              <Text className="text-[15px] font-extrabold text-slate-900">Yêu cầu & Tài liệu đính kèm</Text>
            </View>
          </View>

          {/* Yêu cầu đặc thù của khách hàng */}
          {opportunity.customerRequirements ? (
            <View className="bg-teal-50/50 border border-teal-100 rounded-xl p-3 mb-3">
              <Text className="text-xs font-bold text-teal-600 mb-1">Yêu cầu đặc thù của khách hàng:</Text>
              <Text className="text-[13px] text-teal-900 leading-[18px]">{opportunity.customerRequirements}</Text>
            </View>
          ) : null}

          {/* Danh sách tệp & liên kết đính kèm */}
          {attachments.length > 0 ? (
            <View className="gap-2">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-1">Tài liệu đính kèm ({attachments.length})</Text>
              {attachments.map((att, idx) => {
                const isLink = att.type === 'LINK';
                return (
                  <TouchableOpacity
                    key={att.id || idx}
                    className="flex-row items-center bg-slate-50 rounded-xl p-2.5 border border-slate-200 gap-2.5"
                    onPress={() => handleOpenLink(att.url)}
                    activeOpacity={0.7}
                  >
                    <View
                      className={`w-8 h-8 rounded-lg justify-center items-center ${
                        isLink ? 'bg-blue-50' : 'bg-purple-100'
                      }`}
                    >
                      <Feather
                        name={isLink ? 'external-link' : 'file'}
                        size={16}
                        color={isLink ? '#2563EB' : '#7C3AED'}
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-[13px] font-semibold text-slate-800" numberOfLines={1}>
                        {att.name || att.url}
                      </Text>
                      {isLink ? (
                        <Text className="text-[11px] text-slate-500 mt-0.5" numberOfLines={1}>
                          {att.url}
                        </Text>
                      ) : att.size ? (
                        <Text className="text-[11px] text-slate-500 mt-0.5">
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
            <View className="py-4 items-center gap-1.5">
              <Feather name="paperclip" size={20} color="#CBD5E1" />
              <Text className="text-xs text-slate-400 italic">Không có tài liệu hoặc yêu cầu đính kèm.</Text>
            </View>
          ) : null}
        </View>

        {/* 9. KHỐI THÔNG TIN BỔ SUNG */}
        <View className="bg-white rounded-[18px] p-4 mb-3.5 border border-slate-200 shadow-sm">
          <View className="flex-row justify-between items-center mb-3.5">
            <View className="flex-row items-center gap-2">
              <View className="w-7 h-7 rounded-lg justify-center items-center bg-slate-100">
                <Feather name="info" size={16} color="#64748B" />
              </View>
              <Text className="text-[15px] font-extrabold text-slate-900">Thông tin bổ sung</Text>
            </View>
          </View>

          <View className="gap-2">
            <View className="flex-row justify-between py-1 border-b border-slate-50">
              <Text className="text-xs text-slate-500">Ngày tạo</Text>
              <Text className="text-xs font-semibold text-slate-800">{formatDate(opportunity.createdAt)}</Text>
            </View>

            <View className="flex-row justify-between py-1 border-b border-slate-50">
              <Text className="text-xs text-slate-500">Cập nhật lần cuối</Text>
              <Text className="text-xs font-semibold text-slate-800">{formatDate(opportunity.updatedAt)}</Text>
            </View>

            <View className="flex-row justify-between py-1 border-b border-slate-50">
              <Text className="text-xs text-slate-500">Người tạo</Text>
              <Text className="text-xs font-semibold text-slate-800">
                {opportunity.createdBy?.fullName ||
                  opportunity.creator?.fullName ||
                  opportunity.createdBy?.username ||
                  'Chưa cập nhật'}
              </Text>
            </View>

            {opportunity.referralPartner && (
              <View className="flex-row justify-between py-1 border-b border-slate-50">
                <Text className="text-xs text-slate-500">Đối tác giới thiệu</Text>
                <Text className="text-xs font-semibold text-slate-800">{opportunity.referralPartner.name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 10. KHỐI BÁO GIÁ */}
        <View className="bg-white rounded-[18px] p-4 mb-3.5 border border-slate-200 shadow-sm">
          <View className="flex-row justify-between items-center mb-3.5">
            <View className="flex-row items-center gap-2">
              <View className="w-7 h-7 rounded-lg justify-center items-center bg-emerald-100">
                <Feather name="file-text" size={16} color="#059669" />
              </View>
              <Text className="text-[15px] font-extrabold text-slate-900">Báo giá ({quotations.length})</Text>
            </View>

            <View className="flex-row items-center gap-2">
              {canCreateQuotation && (
                <TouchableOpacity
                  className="flex-row items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200"
                  onPress={() =>
                    router.push({
                      pathname: '/opportunities/quotations/create',
                      params: { opportunityId: id },
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Feather name="plus" size={14} color="#059669" />
                  <Text className="text-xs font-bold text-emerald-600">Tạo báo giá</Text>
                </TouchableOpacity>
              )}
              {quotations.length > 0 && (
                <TouchableOpacity
                  className="flex-row items-center gap-0.5"
                  onPress={() =>
                    router.push({
                      pathname: '/opportunities/quotations/list',
                      params: { opportunityId: id, opportunityName: opportunity?.name },
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Text className="text-xs font-semibold text-slate-500">Xem tất cả</Text>
                  <Feather name="chevron-right" size={14} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {quotations.length > 0 ? (
            quotations.map((quote) => {
              const hasApprovedQuote =
                opportunity?.status === 'QUOTE_APPROVED' ||
                quotations.some(
                  (q) => q.status === QuotationStatus.APPROVED || q.status === 'APPROVED'
                );
              const isThisItemApproved =
                quote.status === QuotationStatus.APPROVED || quote.status === 'APPROVED';
              const isExpired = hasApprovedQuote && !isThisItemApproved;

              return (
                <QuotationItemCard
                  key={quote.id}
                  item={quote}
                  isAdminOrBod={isAdminOrBod}
                  isExpired={isExpired}
                  onPress={(item) =>
                    router.push({
                      pathname: '/opportunities/quotations/[quotId]',
                      params: { quotId: item.id, opportunityId: id },
                    })
                  }
                  onApprove={isExpired ? undefined : handleApproveQuotation}
                  onReject={isExpired ? undefined : handleRejectQuotation}
                  onEdit={
                    isExpired
                      ? undefined
                      : (item) =>
                          router.push({
                            pathname: '/opportunities/quotations/create',
                            params: { opportunityId: id, quotationId: item.id },
                          })
                  }
                />
              );
            })
          ) : (
            <View className="p-6 items-center justify-center gap-2">
              <Feather name="file-text" size={24} color="#CBD5E1" />
              <Text className="text-xs text-slate-400 text-center">
                {hasCustomer
                  ? 'Chưa có bản báo giá nào được tạo cho cơ hội này.'
                  : 'Vui lòng gán thông tin khách hàng để thực hiện tạo báo giá.'}
              </Text>
              {canCreateQuotation && (
                <TouchableOpacity
                  className="flex-row items-center gap-1.5 bg-emerald-600 px-3.5 py-2 rounded-lg mt-2"
                  onPress={() =>
                    router.push({
                      pathname: '/opportunities/quotations/create',
                      params: { opportunityId: id },
                    })
                  }
                  activeOpacity={0.85}
                >
                  <Feather name="plus" size={14} color="#FFFFFF" />
                  <Text className="text-[13px] font-bold text-white">Tạo báo giá đầu tiên</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* 11. KHỐI HỢP ĐỒNG KINH TẾ */}
        {hasContract && linkedContract && (
          <View className="bg-white rounded-[18px] p-4 mb-3.5 border border-slate-200 shadow-sm">
            <View className="flex-row justify-between items-center mb-3.5">
              <View className="flex-row items-center gap-2">
                <View className="w-7 h-7 rounded-lg justify-center items-center bg-teal-50">
                  <Feather name="briefcase" size={16} color="#0D9488" />
                </View>
                <Text className="text-[15px] font-extrabold text-slate-900">Hợp đồng kinh tế</Text>
              </View>
              {(() => {
                const statusKey = linkedContract.status || '';
                const conf = CONTRACT_STATUS_CONFIG[statusKey];
                return (
                  <View
                    className="bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md"
                    style={conf ? { backgroundColor: conf.bg, borderColor: conf.border } : undefined}
                  >
                    <Text
                      className="text-[11px] font-bold text-teal-600"
                      style={conf ? { color: conf.color } : undefined}
                    >
                      {conf?.text ||
                        CONTRACT_STATUS_LABELS[statusKey] ||
                        statusKey ||
                        'Đã tạo HĐ'}
                    </Text>
                  </View>
                );
              })()}
            </View>

            <View className="bg-slate-50 rounded-xl border border-slate-200 p-3">
              <View className="flex-row justify-between items-start mb-2.5">
                <View className="flex-1">
                  <Text className="text-xs font-extrabold text-cyan-600">
                    {linkedContract.contractCode ||
                      (linkedContract as any).contract_code ||
                      '—'}
                  </Text>
                  <Text className="text-sm font-bold text-slate-900 mt-0.5">
                    {linkedContract.name || opportunity.name}
                  </Text>
                </View>
                {linkedContract.sellingPrice ? (
                  <Text className="text-sm font-extrabold text-emerald-600">
                    {formatVNDFull(linkedContract.sellingPrice)}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                className="flex-row items-center justify-center gap-1.5 bg-white border border-cyan-100 py-2 rounded-lg"
                onPress={() =>
                  router.push({
                    pathname: '/contracts/[id]',
                    params: { id: linkedContract.id },
                  } as any)
                }
                activeOpacity={0.85}
              >
                <Text className="text-[13px] font-bold text-cyan-600">Xem chi tiết hợp đồng</Text>
                <Feather name="arrow-right" size={15} color="#0891B2" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* CALLOUT BANNER: SẴN SÀNG TẠO HỢP ĐỒNG */}
        {canCreateContract && !linkedContract && (
          <View className="flex-row gap-3 bg-cyan-50 border border-cyan-100 rounded-2xl p-4">
            <View className="w-9 h-9 rounded-xl bg-cyan-100 items-center justify-center">
              <Feather name="check-circle" size={20} color="#0891B2" />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-extrabold text-cyan-900 mb-1">Báo giá đã được phê duyệt!</Text>
              <Text className="text-xs text-cyan-800 leading-[18px] mb-3">
                Cơ hội kinh doanh này đã có bản báo giá được duyệt. Bạn có thể tiến hành tạo hồ sơ hợp đồng chính thức ngay.
              </Text>
              <TouchableOpacity
                className="flex-row items-center justify-center gap-1.5 bg-cyan-600 py-2.5 rounded-lg"
                onPress={handlePromptCreateContract}
                disabled={isCreatingContract}
                activeOpacity={0.85}
              >
                {isCreatingContract ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="plus-circle" size={15} color="#FFFFFF" />
                    <Text className="text-[13px] font-bold text-white">Tạo hợp đồng ngay</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View className="h-5" />
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
        <View className="p-4 bg-white border-t border-slate-200">
          {hasCustomer ? (
            <TouchableOpacity
              className={`flex-row items-center justify-center gap-2 bg-primary py-3.5 rounded-2xl shadow-lg ${
                isApproving ? 'opacity-60' : ''
              }`}
              onPress={handleApproveOpportunity}
              disabled={isApproving}
              activeOpacity={0.85}
            >
              {isApproving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="check-circle" size={18} color="#FFFFFF" />
                  <Text className="text-[15px] font-extrabold text-white">Phê duyệt cơ hội này</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 bg-amber-600 py-3.5 rounded-2xl shadow-lg"
              onPress={() => setIsCustomerModalVisible(true)}
              activeOpacity={0.85}
            >
              <Feather name="user-plus" size={17} color="#FFFFFF" />
              <Text className="text-[15px] font-extrabold text-white">
                Thêm khách hàng để duyệt cơ hội
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
