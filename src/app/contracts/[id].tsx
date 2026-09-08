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
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { isManagementRole } from '@/utils/rbac';
import { BrandColors } from '@/constants/colors';
import {
  contractService,
  ContractItem,
  ContractStatus,
  MilestoneStatus,
  CONTRACT_STATUS_CONFIG,
  CONTRACT_STATUS_LABELS,
} from '@/services/contractService';
import { formatVNDFull, formatNumber } from '@/utils/formatters';

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
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

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isAdminOrBod = isManagementRole(user?.role);

  const [contract, setContract] = useState<ContractItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Reject Proposal Modal
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const loadContract = useCallback(async () => {
    if (!id) return;
    try {
      const res = await contractService.getContract(id as string);
      if (res.data) {
        setContract(res.data);
      } else if (res.error) {
        Alert.alert('Lỗi', res.error);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể tải thông tin hợp đồng');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadContract();
  }, [loadContract]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadContract();
  };

  const handleCallPhone = (phone?: string) => {
    if (!phone) {
      Alert.alert('Thông báo', 'Không có số điện thoại liên hệ');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleOpenLink = (url?: string) => {
    if (!url) {
      Alert.alert('Thông báo', 'Không có đường dẫn tài liệu');
      return;
    }
    Linking.openURL(url);
  };

  const handleApproveProposal = () => {
    if (!contract) return;
    Alert.alert(
      'Xác nhận phê duyệt',
      'Bạn có chắc chắn muốn phê duyệt Proposal của hợp đồng này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Phê duyệt',
          onPress: async () => {
            try {
              setActionLoading(true);
              const res = await contractService.approveProposal(contract.id);
              if (res.error) {
                Alert.alert('Lỗi', res.error);
              } else {
                Alert.alert('Thành công', 'Đã phê duyệt Proposal hợp đồng');
                loadContract();
              }
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Phê duyệt thất bại');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectProposalSubmit = async () => {
    if (!contract) return;
    if (!rejectReason.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      setActionLoading(true);
      const res = await contractService.rejectProposal(contract.id, rejectReason.trim());
      if (res.error) {
        Alert.alert('Lỗi', res.error);
      } else {
        setIsRejectModalVisible(false);
        setRejectReason('');
        Alert.alert('Thành công', 'Đã từ chối Proposal hợp đồng');
        loadContract();
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Từ chối thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin hợp đồng...</Text>
      </SafeAreaView>
    );
  }

  if (!contract) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Feather name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Không tìm thấy hợp đồng</Text>
        <Text style={styles.errorSubtitle}>Hợp đồng không tồn tại hoặc bạn không có quyền truy cập.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const contractCode = contract.contractCode || (contract as any).contract_code || '—';
  const statusConfig = CONTRACT_STATUS_CONFIG[contract.status] || {
    text: CONTRACT_STATUS_LABELS[contract.status] || contract.status || 'Chưa xác định',
    color: '#475569',
    bg: '#F1F5F9',
    border: '#E2E8F0',
  };

  // Financial Calculations
  const sellingPrice = Number(contract.sellingPrice || 0);
  const costPrice = Number(contract.cost || 0);
  const grossProfit = sellingPrice - costPrice;
  const marginPercent = sellingPrice > 0 ? Math.round((grossProfit / sellingPrice) * 100) : 0;
  const marginColor =
    marginPercent >= 40 ? '#059669' : marginPercent >= 20 ? '#D97706' : '#DC2626';

  // Group services into Packages & Standalone (đồng bộ 100% cơ cấu bên Cơ hội)
  const packageServices = contract.services?.filter((s) => s.isPackageService) || [];
  const standaloneServices = contract.services?.filter((s) => !s.isPackageService) || [];

  // Group package services by packageName
  const packagesMap: Record<
    string,
    {
      name: string;
      quantity: number;
      services: Array<{
        id?: string;
        name: string;
        quantity: number;
        sellingPrice: number;
        unit: string;
      }>;
    }
  > = {};

  packageServices.forEach((item) => {
    const pkgName = item.packageName || 'Gói dịch vụ';
    if (!packagesMap[pkgName]) {
      packagesMap[pkgName] = {
        name: pkgName,
        quantity: 1,
        services: [],
      };
    }
    const unitName = item.service?.unit || 'Đơn vị';
    const svcName = item.name || item.service?.name || 'Dịch vụ';
    const existing = packagesMap[pkgName].services.find((s) => s.name === svcName);
    if (existing) {
      existing.quantity += 1;
    } else {
      packagesMap[pkgName].services.push({
        id: item.id,
        name: svcName,
        quantity: 1,
        sellingPrice: Number(item.sellingPrice || 0),
        unit: unitName,
      });
    }
  });

  const packagesList = Object.values(packagesMap);

  // Group standalone services
  const standaloneList: Array<{
    id?: string;
    name: string;
    quantity: number;
    sellingPrice: number;
    unit: string;
  }> = [];

  standaloneServices.forEach((item) => {
    const unitName = item.service?.unit || 'Đơn vị';
    const svcName = item.name || item.service?.name || 'Dịch vụ lẻ';
    const existing = standaloneList.find((s) => s.name === svcName);
    if (existing) {
      existing.quantity += 1;
    } else {
      standaloneList.push({
        id: item.id,
        name: svcName,
        quantity: 1,
        sellingPrice: Number(item.sellingPrice || 0),
        unit: unitName,
      });
    }
  });

  const isProposalAwaiting = contract.status === ContractStatus.PROPOSAL_UPLOADED;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. TOP BAR */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerCode}>{contractCode !== '—' ? contractCode : 'HỢP ĐỒNG'}</Text>
          <Text style={styles.headerSub}>Chi tiết hồ sơ hợp đồng kinh tế</Text>
        </View>

        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={loadContract}
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
        {/* 2. STATUS & OVERVIEW CARD */}
        <View style={styles.mainCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              {/* Badge Mã hợp đồng (Chuẩn Web ERP) */}
              <View style={styles.codeBadge}>
                <Text style={styles.codeBadgeText}>{contractCode}</Text>
              </View>

              {/* Badge Trạng thái hợp đồng (Chuẩn Web ERP) */}
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusConfig.bg, borderColor: statusConfig.border },
                ]}
              >
                <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                  {statusConfig.text}
                </Text>
              </View>
            </View>

            {contract.createdAt && (
              <Text style={styles.dateText}>
                {formatDate(contract.createdAt)}
              </Text>
            )}
          </View>

          <Text style={styles.contractTitle}>{contract.name}</Text>

          {contract.description ? (
            <Text style={styles.contractDesc}>{contract.description}</Text>
          ) : null}

          {/* Alert if Proposal Rejected */}
          {contract.status === ContractStatus.PROPOSAL_REJECTED && contract.rejectReason ? (
            <View style={styles.rejectAlertBox}>
              <Feather name="alert-circle" size={16} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={styles.rejectAlertTitle}>Lý do từ chối Proposal:</Text>
                <Text style={styles.rejectAlertText}>{contract.rejectReason}</Text>
              </View>
            </View>
          ) : null}

          {/* Creator & Opportunity Link */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="user" size={13} color="#64748B" />
              <Text style={styles.metaText}>
                Người tạo: <Text style={styles.metaBold}>{contract.createdBy?.fullName || 'Hệ thống'}</Text>
              </Text>
            </View>

            {contract.opportunity && (
              <TouchableOpacity
                style={styles.oppLinkBtn}
                onPress={() => router.push(`/opportunities/${contract.opportunity?.id}`)}
                activeOpacity={0.7}
              >
                <Feather name="external-link" size={12} color="#0891B2" />
                <Text style={styles.oppLinkText}>
                  Cơ hội: {contract.opportunity.opportunityCode || contract.opportunity.name}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 2.1 THÔNG TIN HỢP ĐỒNG (CHUẨN 100% WEB ContractInfo.jsx) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.titleIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Feather name="file-text" size={16} color="#2563EB" />
              </View>
              <Text style={styles.sectionHeader}>Thông tin hợp đồng</Text>
            </View>
          </View>

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mã hợp đồng</Text>
              <View style={styles.contractCodeBox}>
                <Text style={styles.contractCodeBoxText} selectable={true}>
                  {contractCode}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tên hợp đồng</Text>
              <Text style={[styles.infoValue, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>
                {contract.name || '—'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày tạo</Text>
              <View style={styles.dateWithIcon}>
                <Feather name="calendar" size={13} color="#64748B" />
                <Text style={styles.infoValue}>{formatDate(contract.createdAt)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trạng thái</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusConfig.bg, borderColor: statusConfig.border },
                ]}
              >
                <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                  {statusConfig.text}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. CARD KHÁCH HÀNG (CUSTOMER INFO) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.titleIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Feather name="users" size={16} color="#2563EB" />
              </View>
              <Text style={styles.sectionHeader}>Thông tin khách hàng</Text>
            </View>
          </View>

          {contract.customer ? (
            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Khách hàng / Công ty</Text>
                <Text style={[styles.infoValue, { color: '#0F172A', fontWeight: '700' }]}>
                  {contract.customer.name}
                </Text>
              </View>

              {contract.customer.taxId ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Mã số thuế</Text>
                  <Text style={styles.infoValue}>{contract.customer.taxId}</Text>
                </View>
              ) : null}

              {contract.customer.phone ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Số điện thoại</Text>
                  <TouchableOpacity
                    style={styles.phoneLink}
                    onPress={() => handleCallPhone(contract.customer?.phone)}
                  >
                    <Feather name="phone-call" size={13} color="#059669" />
                    <Text style={styles.phoneText}>{contract.customer.phone}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {contract.customer.email ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{contract.customer.email}</Text>
                </View>
              ) : null}

              {contract.customer.address ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Địa chỉ</Text>
                  <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]}>
                    {contract.customer.address}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.emptyText}>Chưa có thông tin khách hàng gắn với hợp đồng</Text>
          )}
        </View>

        {/* 4. CARD TÀI CHÍNH & GIÁ TRỊ HỢP ĐỒNG */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.titleIconBox, { backgroundColor: '#ECFDF5' }]}>
                <Feather name="dollar-sign" size={16} color="#059669" />
              </View>
              <Text style={styles.sectionHeader}>Tổng kết tài chính</Text>
            </View>
          </View>

          <View style={styles.financeGrid}>
            <View style={styles.financeBox}>
              <Text style={styles.financeBoxLabel}>Giá trị hợp đồng (Doanh thu)</Text>
              <Text style={styles.financeBoxRevenue}>{formatVNDFull(sellingPrice)}</Text>
            </View>

            <View style={styles.financeBox}>
              <Text style={styles.financeBoxLabel}>Chi phí giá vốn (Cost)</Text>
              <Text style={styles.financeBoxCost}>{formatVNDFull(costPrice)}</Text>
            </View>
          </View>

          <View style={styles.marginRow}>
            <View style={styles.marginItem}>
              <Text style={styles.marginLabel}>Lợi nhuận gộp:</Text>
              <Text style={[styles.marginValue, { color: grossProfit >= 0 ? '#059669' : '#DC2626' }]}>
                {formatVNDFull(grossProfit)}
              </Text>
            </View>

            <View style={styles.marginItem}>
              <Text style={styles.marginLabel}>Biên lợi nhuận:</Text>
              <View style={[styles.marginBadge, { backgroundColor: marginColor + '15' }]}>
                <Text style={[styles.marginBadgeText, { color: marginColor }]}>
                  {marginPercent}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 5. KHỐI DỊCH VỤ & GÓI DỊCH VỤ (ĐỒNG BỘ 100% VỚI BÊN CƠ HỘI) */}
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
          {packagesList.length > 0 && (
            <View style={styles.packagesWrapper}>
              {packagesList.map((pkg, idx) => (
                <View key={idx} style={styles.packageCard}>
                  <View style={styles.packageCardHeader}>
                    <View style={styles.packageIcon}>
                      <Feather name="briefcase" size={14} color="#2563EB" />
                    </View>
                    <Text style={styles.packageNameText}>
                      Gói: {pkg.name}{' '}
                      {pkg.quantity > 1 ? (
                        <Text style={styles.packageQtyText}>x{pkg.quantity}</Text>
                      ) : null}
                    </Text>
                  </View>

                  {/* Định mức dịch vụ con */}
                  <View style={styles.subServicesContainer}>
                    <Text style={styles.subServicesNotice}>
                      Số lượng dưới đây là định mức cho 1 gói:
                    </Text>

                    {pkg.services.length > 0 ? (
                      pkg.services.map((s, sIdx) => (
                        <View key={s.id || sIdx} style={styles.subServiceRow}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.subServiceName}>{s.name}</Text>
                            <Text style={styles.subServiceQuota}>
                              Định mức: {s.quantity} {s.unit} / Gói
                            </Text>
                          </View>
                          <Text style={styles.subServicePrice}>
                            {formatNumber(s.sellingPrice)} VNĐ
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptySubText}>Chưa có dịch vụ thành phần trong gói.</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Danh sách Dịch vụ lẻ */}
          {standaloneList.length > 0 && (
            <View style={styles.standaloneWrapper}>
              <Text style={styles.sectionSubTitle}>Dịch vụ lẻ</Text>
              {standaloneList.map((s, idx) => (
                <View key={s.id || idx} style={styles.standaloneItemRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.standaloneName}>{s.name}</Text>
                    <Text style={styles.standaloneQty}>
                      Số lượng: {s.quantity} {s.unit}
                    </Text>
                  </View>
                  <Text style={styles.standalonePrice}>
                    {formatNumber(s.sellingPrice)} VNĐ
                  </Text>
                </View>
              ))}
            </View>
          )}

          {packagesList.length === 0 && standaloneList.length === 0 && (
            <View style={styles.emptyServicesBox}>
              <Feather name="layers" size={24} color="#CBD5E1" />
              <Text style={styles.emptyServicesText}>Chưa có dịch vụ hoặc gói nào được chọn.</Text>
            </View>
          )}
        </View>

        {/* 6. CARD KẾ HOẠCH THANH TOÁN (PAYMENT MILESTONES) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.titleIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="calendar" size={16} color="#D97706" />
              </View>
              <Text style={styles.sectionHeader}>
                Đợt thanh toán ({contract.milestones?.length || 0})
              </Text>
            </View>
          </View>

          {contract.milestones && contract.milestones.length > 0 ? (
            contract.milestones.map((ms, idx) => {
              const isPaid = ms.status === MilestoneStatus.COMPLETED;
              return (
                <View key={ms.id || idx} style={styles.milestoneCard}>
                  <View style={styles.milestoneTop}>
                    <View style={styles.milestoneNameRow}>
                      <View
                        style={[
                          styles.milestoneIndexBadge,
                          { backgroundColor: isPaid ? '#ECFDF5' : '#EFF6FF' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.milestoneIndexText,
                            { color: isPaid ? '#059669' : '#2563EB' },
                          ]}
                        >
                          {idx + 1}
                        </Text>
                      </View>
                      <Text style={styles.milestoneName}>{ms.name}</Text>
                    </View>

                    <View
                      style={[
                        styles.milestoneStatusBadge,
                        { backgroundColor: isPaid ? '#ECFDF5' : '#FFFBEB' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.milestoneStatusText,
                          { color: isPaid ? '#059669' : '#D97706' },
                        ]}
                      >
                        {isPaid ? 'Đã thu tiền' : 'Chờ thanh toán'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.milestoneBottom}>
                    <View>
                      <Text style={styles.milestoneAmountLabel}>Số tiền đợt này:</Text>
                      <Text style={styles.milestoneAmountVal}>{formatVNDFull(ms.amount)}</Text>
                    </View>
                    <View style={styles.milestonePercentBox}>
                      <Text style={styles.milestonePercentText}>{Number(ms.percentage || 0)}%</Text>
                    </View>
                  </View>

                  {ms.dueDate && (
                    <Text style={styles.milestoneDueDate}>
                      Hạn thanh toán: {new Date(ms.dueDate).toLocaleDateString('vi-VN')}
                    </Text>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>Chưa có kế hoạch thanh toán nào</Text>
          )}
        </View>

        {/* 7. CARD HỒ SƠ ĐỀ XUẤT & KÝ KẾT (PROPOSAL & SIGNED FILES) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.titleIconBox, { backgroundColor: '#F3E8FF' }]}>
                <Feather name="file" size={16} color="#7E22CE" />
              </View>
              <Text style={styles.sectionHeader}>Tài liệu hợp đồng</Text>
            </View>
          </View>

          <View style={styles.documentsList}>
            {/* File Proposal */}
            <View style={styles.docItem}>
              <View style={[styles.docIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Feather name="file-text" size={18} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle}>Hợp đồng dự thảo (Proposal)</Text>
                <Text style={styles.docSubtitle}>
                  {contract.proposal_contract ? 'Đã đính kèm tài liệu' : 'Chưa có file dự thảo'}
                </Text>
              </View>
              {contract.proposal_contract ? (
                <TouchableOpacity
                  style={styles.docActionBtn}
                  onPress={() => handleOpenLink(contract.proposal_contract)}
                >
                  <Feather name="download" size={14} color="#2563EB" />
                  <Text style={styles.docActionText}>Mở file</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* File Signed */}
            <View style={styles.docItem}>
              <View style={[styles.docIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Feather name="check-square" size={18} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle}>Hợp đồng đã ký kết</Text>
                <Text style={styles.docSubtitle}>
                  {contract.signed_contract ? 'Bản quét hợp đồng đã ký' : 'Chưa tải lên bản ký'}
                </Text>
              </View>
              {contract.signed_contract ? (
                <TouchableOpacity
                  style={styles.docActionBtn}
                  onPress={() => handleOpenLink(contract.signed_contract)}
                >
                  <Feather name="external-link" size={14} color="#16A34A" />
                  <Text style={[styles.docActionText, { color: '#16A34A' }]}>Xem bản ký</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 8. BOD / ADMIN ACTION BAR CHO PROPOSAL NẾU ĐANG CHỜ DUYỆT */}
      {isAdminOrBod && isProposalAwaiting && (
        <View style={styles.bottomActionBar}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => setIsRejectModalVisible(true)}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            <Feather name="x-circle" size={16} color="#DC2626" />
            <Text style={styles.rejectBtnText}>Từ chối Proposal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.approveBtn}
            onPress={handleApproveProposal}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="check-circle" size={16} color="#FFFFFF" />
                <Text style={styles.approveBtnText}>Duyệt Proposal</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* 9. MODAL NHẬP LÝ DO TỪ CHỐI PROPOSAL */}
      <Modal
        visible={isRejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Từ chối Proposal</Text>
              <TouchableOpacity onPress={() => setIsRejectModalVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Vui lòng nêu rõ lý do từ chối để nhân viên cập nhật lại bản dự thảo hợp đồng:
            </Text>

            <TextInput
              style={styles.modalInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Nhập lý do từ chối (ví dụ: điều khoản thanh toán chưa phù hợp...)"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsRejectModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmRejectBtn}
                onPress={handleRejectProposalSubmit}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmRejectText}>Xác nhận từ chối</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
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
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'monospace',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  codeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  codeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    fontFamily: 'monospace',
  },
  contractCodeBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  contractCodeBoxText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'monospace',
  },
  dateWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  contractTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
    marginBottom: 6,
  },
  contractDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  rejectAlertBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  rejectAlertTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 2,
  },
  rejectAlertText: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 10,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  metaBold: {
    fontWeight: '700',
    color: '#1E293B',
  },
  oppLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CFFAFE',
  },
  oppLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0891B2',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    paddingBottom: 8,
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  infoList: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  phoneLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  phoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  financeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  financeBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  financeBoxLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  financeBoxRevenue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  financeBoxCost: {
    fontSize: 15,
    fontWeight: '800',
    color: '#475569',
  },
  marginRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  marginItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  marginLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  marginValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  marginBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  marginBadgeText: {
    fontSize: 12,
    fontWeight: '800',
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
  sectionSubTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    marginBottom: 6,
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
    color: '#059669',
  },
  emptyServicesBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyServicesText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  milestoneCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  milestoneTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  milestoneIndexBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneIndexText: {
    fontSize: 11,
    fontWeight: '800',
  },
  milestoneName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  milestoneStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  milestoneStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  milestoneBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  milestoneAmountLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  milestoneAmountVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  milestonePercentBox: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  milestonePercentText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  milestoneDueDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
    fontStyle: 'italic',
  },
  documentsList: {
    gap: 10,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  docSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  docActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  docActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  bottomActionBar: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: 10,
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 90,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalConfirmRejectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#DC2626',
  },
  modalConfirmRejectText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
