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
import * as DocumentPicker from 'expo-document-picker';
import { uploadToCloudinary, PickedFile } from '@/services/cloudinaryService';
import {
  contractService,
  ContractItem,
  ContractStatus,
  MilestoneStatus,
  CONTRACT_STATUS_CONFIG,
  CONTRACT_STATUS_LABELS,
} from '@/services/contractService';
import { formatVNDFull, formatNumber } from '@/utils/formatters';
import { isValidUrl, normalizeUrl } from '@/utils/validators';
import {
  projectService,
  ProjectItem,
  UserPMItem,
  PROJECT_STATUS_CONFIG,
  PROJECT_STATUS_LABELS,
} from '@/services/projectService';
import { useSSERefresh } from '@/hooks/useSSERefresh';

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

  // Upload Proposal Modal State (Chuẩn 100% Web ProposalManagement.jsx)
  const [isUploadProposalModalVisible, setIsUploadProposalModalVisible] = useState(false);
  const [uploadProposalMethod, setUploadProposalMethod] = useState<'FILE' | 'LINK'>('FILE');
  const [proposalFile, setProposalFile] = useState<PickedFile | null>(null);
  const [proposalLink, setProposalLink] = useState('');
  const [quotationMethod, setQuotationMethod] = useState<'NONE' | 'LINK' | 'FILE'>('NONE');
  const [quotationFile, setQuotationFile] = useState<PickedFile | null>(null);
  const [quotationLink, setQuotationLink] = useState('');

  // Upload progress & loading states
  const [isUploadingProposal, setIsUploadingProposal] = useState(false);
  const [isUploadingSigned, setIsUploadingSigned] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Project Info State (Chuẩn 100% Web ERP ProjectInfo.jsx)
  const [project, setProject] = useState<ProjectItem | null>(null);
  const [pmUsers, setPmUsers] = useState<UserPMItem[]>([]);
  const [selectedPmId, setSelectedPmId] = useState<string>('');
  const [isAssigningPm, setIsAssigningPm] = useState(false);
  const [isPmPickerVisible, setIsPmPickerVisible] = useState(false);

  useEffect(() => {
    if (isAdminOrBod) {
      projectService.getPmUsers().then((res) => {
        if (res.data) setPmUsers(res.data);
      });
    }
  }, [isAdminOrBod]);

  const loadContract = useCallback(async () => {
    if (!id) return;
    try {
      const res = await contractService.getContract(id as string);
      if (res.data) {
        setContract(res.data);
        // Tải dự án liên kết với hợp đồng (Chuẩn Web ERP ProjectInfo.jsx)
        try {
          const projRes = await projectService.getProjectByContract(id as string);
          if (projRes.data) {
            setProject(projRes.data);
            const pmMember = projRes.data.team?.members?.find((m) => m.role === 'PROJECT_MANAGER');
            setSelectedPmId(pmMember?.user?.id || '');
          } else {
            setProject(null);
          }
        } catch {
          setProject(null);
        }
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

  useSSERefresh('invalidate_Contracts', loadContract);

  const handleAssignPmSubmit = async (pmId: string) => {
    if (!contract) return;
    try {
      setIsAssigningPm(true);
      const res = await projectService.assignProject(contract.id, pmId || null);
      if (res.error) {
        Alert.alert('Lỗi phân công', res.error);
      } else {
        Alert.alert('Thành công', 'Phân công PM phụ trách dự án thành công!');
        setIsPmPickerVisible(false);
        loadContract();
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể phân công PM');
    } finally {
      setIsAssigningPm(false);
    }
  };

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

  const openProposalEditor = () => {
    setUploadProposalMethod('FILE');
    setProposalFile(null);
    setProposalLink('');
    setQuotationMethod(contract?.quotation_link ? 'LINK' : 'NONE');
    setQuotationFile(null);
    setQuotationLink(contract?.quotation_link || '');
    setIsUploadProposalModalVisible(true);
  };

  const handlePickProposalFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const lower = asset.name.toLowerCase();
        if (
          !lower.endsWith('.docx') &&
          !lower.endsWith('.doc') &&
          !lower.endsWith('.xls') &&
          !lower.endsWith('.xlsx')
        ) {
          Alert.alert(
            'Định dạng không hợp lệ',
            'Chỉ chấp nhận file .docx, .xls hoặc .xlsx cho hợp đồng'
          );
          return;
        }
        setProposalFile({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          size: asset.size,
        });
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở trình chọn tệp tin');
    }
  };

  const handlePickQuotationFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const lower = asset.name.toLowerCase();
        if (!lower.endsWith('.xls') && !lower.endsWith('.xlsx')) {
          Alert.alert(
            'Định dạng không hợp lệ',
            'Chỉ chấp nhận file Excel .xls hoặc .xlsx cho báo giá'
          );
          return;
        }
        setQuotationFile({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          size: asset.size,
        });
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở trình chọn tệp tin');
    }
  };

  const handleSubmitProposal = async () => {
    if (!contract) return;
    if (uploadProposalMethod === 'FILE' && !proposalFile) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn file Word hoặc Excel hợp đồng');
      return;
    }
    if (uploadProposalMethod === 'LINK') {
      if (!proposalLink.trim()) {
        Alert.alert('Thiếu thông tin', 'Vui lòng nhập link hợp đồng');
        return;
      }
      if (!isValidUrl(proposalLink)) {
        Alert.alert(
          'Đường dẫn không hợp lệ',
          'Đường dẫn link hợp đồng không đúng định dạng. Vui lòng kiểm tra lại (Ví dụ: https://docs.google.com/...)'
        );
        return;
      }
    }

    if (quotationMethod === 'LINK') {
      if (!quotationLink.trim()) {
        Alert.alert('Thiếu thông tin', 'Vui lòng nhập link báo giá');
        return;
      }
      if (!isValidUrl(quotationLink)) {
        Alert.alert(
          'Đường dẫn không hợp lệ',
          'Đường dẫn link báo giá không đúng định dạng. Vui lòng kiểm tra lại (Ví dụ: https://docs.google.com/...)'
        );
        return;
      }
    }

    try {
      setIsUploadingProposal(true);
      setUploadProgress(0);

      let uploadedFile: any = undefined;
      if (uploadProposalMethod === 'FILE' && proposalFile) {
        uploadedFile = await uploadToCloudinary(proposalFile, 'GETVINI/ERP/proposal', (p) =>
          setUploadProgress(p)
        );
      }

      let uploadedQuotationFile: any = undefined;
      if (quotationMethod === 'FILE' && quotationFile) {
        uploadedQuotationFile = await uploadToCloudinary(
          quotationFile,
          'GETVINI/ERP/quotation',
          (p) => setUploadProgress(p)
        );
      }

      if (uploadProposalMethod === 'FILE' || quotationMethod === 'FILE') {
        setUploadProgress(100);
      }

      const qLink =
        uploadedQuotationFile?.url ||
        (quotationMethod === 'LINK' ? normalizeUrl(quotationLink) : undefined);

      const res = await contractService.uploadProposal(contract.id, {
        file: uploadedFile,
        contractLink: uploadProposalMethod === 'LINK' ? normalizeUrl(proposalLink) : undefined,
        quotationLink: qLink || undefined,
      });

      if (res.error) {
        Alert.alert('Lỗi cập nhật', res.error);
      } else {
        await new Promise((r) => setTimeout(r, 350));
        Alert.alert('Thành công', 'Cập nhật hợp đồng thành công!');
        setIsUploadProposalModalVisible(false);
        loadContract();
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Cập nhật hợp đồng thất bại');
    } finally {
      setIsUploadingProposal(false);
      setUploadProgress(0);
    }
  };

  const handleUploadSignedFile = async () => {
    if (!contract) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', '*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!asset.name.toLowerCase().endsWith('.pdf')) {
          Alert.alert('Định dạng không hợp lệ', 'Chỉ chấp nhận file .pdf cho hợp đồng đã ký');
          return;
        }

        setIsUploadingSigned(true);
        setUploadProgress(0);

        const uploadedFile = await uploadToCloudinary(
          {
            uri: asset.uri,
            name: asset.name,
            mimeType: asset.mimeType || 'application/pdf',
            size: asset.size,
          },
          'GETVINI/ERP/signed',
          (p) => setUploadProgress(p)
        );

        setUploadProgress(100);

        const res = await contractService.uploadSigned(contract.id, uploadedFile);
        if (res.error) {
          Alert.alert('Lỗi', res.error);
        } else {
          await new Promise((r) => setTimeout(r, 350));
          Alert.alert('Thành công', 'Tải lên hợp đồng đã ký thành công!');
          loadContract();
        }
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể tải lên hợp đồng đã ký');
    } finally {
      setIsUploadingSigned(false);
      setUploadProgress(0);
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

  // Financial Calculations (100% chuẩn Web ERP FinancialInfo.jsx)
  const sellingPrice = Number(contract.sellingPrice || (contract as any).selling_price || 0);
  const costPrice = Number(contract.cost || 0);

  const rawMilestones = contract.milestones || [];
  const rawDebts = (contract as any).debts || [];

  const processedMilestones = rawMilestones.map((m) => {
    const debt = rawDebts.find((d: any) => d.milestone?.id === m.id || d.milestoneId === m.id);
    let paidAmount = 0;
    if (debt) {
      const payments = debt.payments?.map((p: any) => ({ ...p, amount: Number(p.amount || 0) })) || [];
      paidAmount = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    } else if (m.status === 'COMPLETED') {
      paidAmount = Number(m.amount || 0);
    }

    const amount = Number(m.amount || 0);
    const remaining = Math.max(0, amount - paidAmount);
    const isActive = !!debt || m.status === 'COMPLETED' || m.status === 'ACTIVE';

    return {
      paidAmount,
      remaining,
      isActive,
    };
  });

  const totalPaid = processedMilestones.reduce((sum, m) => sum + m.paidAmount, 0);
  const totalDebt = processedMilestones.reduce((sum, m) => sum + (m.isActive ? m.remaining : 0), 0);
  const progressPercent = sellingPrice > 0 ? Math.round((totalPaid / sellingPrice) * 100) : 0;

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
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1, gap: 5 }}>
                <Feather name="calendar" size={13} color="#64748B" />
                <Text style={[styles.infoValue, { flex: 0 }]}>{formatDate(contract.createdAt)}</Text>
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

        {/* 3.1 CARD DỰ ÁN CỦA HỢP ĐỒNG (CHUẨN 100% WEB ERP ProjectInfo.jsx) */}
        {project ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithIcon}>
                <View style={[styles.titleIconBox, { backgroundColor: '#EEF2FF' }]}>
                  <Feather name="briefcase" size={16} color="#4F46E5" />
                </View>
                <Text style={styles.sectionHeader}>Dự án của hợp đồng</Text>
              </View>

              <TouchableOpacity
                style={styles.projectLinkBtn}
                onPress={() => router.push(`/projects/${project.id}` as any)}
                activeOpacity={0.7}
              >
                <Feather name="external-link" size={13} color="#2563EB" />
                <Text style={styles.projectLinkText}>Xem dự án</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoList}>
              {/* Tên dự án */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tên dự án</Text>
                <Text
                  style={[
                    styles.infoValue,
                    { flex: 1, textAlign: 'right', fontWeight: '700', color: '#1E1B4B' },
                  ]}
                >
                  {project.name}
                </Text>
              </View>

              {/* Trạng thái dự án */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Trạng thái dự án</Text>
                {(() => {
                  const projStatusConfig = PROJECT_STATUS_CONFIG[project.status] || {
                    text: PROJECT_STATUS_LABELS[project.status] || project.status || 'Đang thực hiện',
                    color: '#047857',
                    bg: '#ECFDF5',
                    border: '#A7F3D0',
                  };
                  return (
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: projStatusConfig.bg, borderColor: projStatusConfig.border },
                      ]}
                    >
                      <Text style={[styles.statusBadgeText, { color: projStatusConfig.color }]}>
                        {projStatusConfig.text}
                      </Text>
                    </View>
                  );
                })()}
              </View>

              {/* PM Phụ trách */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>PM phụ trách</Text>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 6 }}>
                  {(() => {
                    const pmMember = project.team?.members?.find(
                      (m) => m.role === 'PROJECT_MANAGER'
                    );
                    const hasPm = !!pmMember?.user;
                    const pmName = pmMember?.user?.fullName || 'Chưa phân công PM';
                    return (
                      <>
                        <Text
                          style={[
                            styles.infoValue,
                            { flex: 0, fontWeight: '700', color: hasPm ? '#0F172A' : '#94A3B8' },
                          ]}
                        >
                          {pmName}
                        </Text>

                        {isAdminOrBod && !hasPm && (
                          <TouchableOpacity
                            style={styles.assignPmBtn}
                            onPress={() => setIsPmPickerVisible(true)}
                            disabled={isAssigningPm}
                            activeOpacity={0.7}
                          >
                            <Feather name="user-plus" size={12} color="#2563EB" />
                            <Text style={styles.assignPmBtnText}>Phân công</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    );
                  })()}
                </View>
              </View>

              {/* Lead dự án */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Lead dự án</Text>
                <Text style={[styles.infoValue, { fontWeight: '600' }]}>
                  {project.team?.teamLead?.fullName || 'PM chưa chọn lead'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* 4. TỔNG KẾT TÀI CHÍNH (CHUẨN 100% WEB ERP FinancialInfo.jsx) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.titleIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Feather name="dollar-sign" size={16} color="#2563EB" />
              </View>
              <Text style={styles.sectionHeader}>Tổng kết tài chính</Text>
            </View>
          </View>

          <View style={styles.financialGrid}>
            {/* 1. TỔNG GIÁ TRỊ HỢP ĐỒNG */}
            <View style={styles.financialCardTotal}>
              <Text style={styles.financialCardTotalLabel}>TỔNG GIÁ TRỊ HỢP ĐỒNG</Text>
              <Text style={styles.financialCardTotalValue}>{formatVNDFull(sellingPrice)}</Text>
            </View>

            {/* 2. TỔNG VỐN */}
            <View style={styles.financialCard}>
              <Text style={styles.financialCardLabel}>TỔNG VỐN</Text>
              <Text style={[styles.financialCardValue, { color: '#059669' }]}>
                {formatVNDFull(costPrice)}
              </Text>
            </View>

            {/* 3. ĐÃ THANH TOÁN THỰC TẾ */}
            <View style={styles.financialCard}>
              <View style={styles.financialCardHeader}>
                <Text style={styles.financialCardLabel}>ĐÃ THANH TOÁN THỰC TẾ</Text>
                <View style={[styles.miniIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Feather name="trending-up" size={13} color="#059669" />
                </View>
              </View>
              <Text style={[styles.financialCardValue, { color: '#059669' }]}>
                {formatVNDFull(totalPaid)}
              </Text>
              <Text style={styles.financialCardSub}>
                Bạn đã thu về {progressPercent}% doanh thu
              </Text>
            </View>

            {/* 4. CÔNG NỢ CHỜ THU HỒI */}
            <View style={styles.financialCard}>
              <View style={styles.financialCardHeader}>
                <Text style={styles.financialCardLabel}>CÔNG NỢ CHỜ THU HỒI</Text>
                <View style={[styles.miniIconBox, { backgroundColor: '#FEF2F2' }]}>
                  <Feather name="alert-circle" size={13} color="#DC2626" />
                </View>
              </View>
              <Text style={[styles.financialCardValue, { color: '#DC2626' }]}>
                {formatVNDFull(totalDebt)}
              </Text>
              <Text style={styles.financialCardSub}>
                Tổng nợ từ các đợt đã kích hoạt
              </Text>
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

        {/* 7. CARD QUẢN LÝ HỢP ĐỒNG (PROPOSAL & SIGNED FILES - CHUẨN 100% WEB ProposalManagement.jsx) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <View style={[styles.titleIconBox, { backgroundColor: '#F3E8FF' }]}>
                <Feather name="file-text" size={16} color="#9333EA" />
              </View>
              <Text style={styles.sectionHeader}>Quản lý hợp đồng</Text>
            </View>
          </View>

          <View style={styles.proposalBoxList}>
            {/* Box 1: Hợp đồng dự thảo (Proposal) */}
            <View style={styles.proposalCardItem}>
              <View style={styles.proposalCardTop}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.proposalItemTitle}>
                    Hợp đồng{' '}
                    <Text style={styles.proposalItemHint}>(.docx, Excel hoặc link)</Text>
                  </Text>
                  <Text style={styles.proposalItemSub}>
                    {contract.proposal_contract ? 'Đã upload' : 'Chưa có file'}
                  </Text>
                </View>

                {/* Proposal Action Buttons */}
                <View style={styles.proposalBtnRow}>
                  {contract.proposal_contract ? (
                    <>
                      <TouchableOpacity
                        style={styles.proposalViewBtn}
                        onPress={() => handleOpenLink(contract.proposal_contract)}
                        activeOpacity={0.7}
                      >
                        <Feather name="file-text" size={13} color="#334155" />
                        <Text style={styles.proposalViewBtnText}>Xem</Text>
                      </TouchableOpacity>

                      {contract.status === ContractStatus.PROPOSAL_UPLOADED && isAdminOrBod && (
                        <View style={styles.proposalReviewBtnGroup}>
                          <TouchableOpacity
                            style={styles.proposalApproveBtn}
                            onPress={handleApproveProposal}
                            disabled={actionLoading || isUploadingProposal || isUploadingSigned}
                            activeOpacity={0.7}
                          >
                            <Feather name="check-circle" size={13} color="#FFFFFF" />
                            <Text style={styles.proposalApproveBtnText}>Duyệt</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.proposalRejectBtn}
                            onPress={() => setIsRejectModalVisible(true)}
                            disabled={actionLoading || isUploadingProposal || isUploadingSigned}
                            activeOpacity={0.7}
                          >
                            <Feather name="x" size={13} color="#DC2626" />
                            <Text style={styles.proposalRejectBtnText}>Từ chối</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {contract.status === ContractStatus.PROPOSAL_REJECTED && (
                        <TouchableOpacity
                          style={styles.proposalUploadNewBtn}
                          onPress={openProposalEditor}
                          disabled={isUploadingProposal || isUploadingSigned}
                          activeOpacity={0.7}
                        >
                          {isUploadingProposal ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Feather name="upload" size={13} color="#FFFFFF" />
                          )}
                          <Text style={styles.proposalUploadNewBtnText}>Upload bản mới</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.proposalUploadPrimaryBtn}
                      onPress={openProposalEditor}
                      disabled={isUploadingProposal || isUploadingSigned}
                      activeOpacity={0.7}
                    >
                      {isUploadingProposal ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Feather name="upload" size={13} color="#FFFFFF" />
                      )}
                      <Text style={styles.proposalUploadPrimaryBtnText}>Upload</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Quotation link if exists */}
              {contract.quotation_link ? (
                <TouchableOpacity
                  style={styles.quotationLinkRow}
                  onPress={() => handleOpenLink(contract.quotation_link)}
                  activeOpacity={0.7}
                >
                  <Feather name="file-text" size={14} color="#2563EB" />
                  <Text style={styles.quotationLinkText}>Xem link báo giá</Text>
                  <Feather name="external-link" size={12} color="#2563EB" />
                </TouchableOpacity>
              ) : null}

              {/* Rejection callout box if PROPOSAL_REJECTED */}
              {contract.status === ContractStatus.PROPOSAL_REJECTED &&
                (contract.rejectReason || (contract as any).rejectionReason) && (
                  <View style={styles.rejectionNoticeBox}>
                    <Text style={styles.rejectionNoticeTitle}>LÝ DO TỪ CHỐI HIỆN TẠI:</Text>
                    <Text style={styles.rejectionNoticeText}>
                      {contract.rejectReason || (contract as any).rejectionReason}
                    </Text>
                  </View>
                )}

              {/* Progress bar if uploading proposal */}
              {isUploadingProposal && (
                <View style={styles.uploadProgressContainer}>
                  <View style={styles.uploadProgressHeader}>
                    <Text style={styles.uploadProgressTitle}>Đang tải lên hợp đồng...</Text>
                    <Text style={styles.uploadProgressPercent}>{uploadProgress}%</Text>
                  </View>
                  <View style={styles.uploadProgressBarTrack}>
                    <View
                      style={[styles.uploadProgressBarFill, { width: `${uploadProgress}%` }]}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Box 2: Hợp đồng đã ký (Signed Contract) */}
            <View style={styles.proposalCardItem}>
              <View style={styles.proposalCardTop}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.proposalItemTitle}>
                    Hợp đồng đã ký{' '}
                    <Text style={styles.proposalItemHint}>(.pdf)</Text>
                  </Text>
                  <Text style={styles.proposalItemSub}>
                    {contract.signed_contract ? 'Đã upload' : 'Chưa có file'}
                  </Text>
                </View>

                <View style={styles.proposalBtnRow}>
                  {contract.signed_contract ? (
                    <TouchableOpacity
                      style={styles.proposalViewBtn}
                      onPress={() => handleOpenLink(contract.signed_contract)}
                      activeOpacity={0.7}
                    >
                      <Feather name="check-circle" size={13} color="#16A34A" />
                      <Text style={[styles.proposalViewBtnText, { color: '#16A34A' }]}>Xem</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.signedUploadBtn}
                      onPress={handleUploadSignedFile}
                      disabled={isUploadingSigned || isUploadingProposal}
                      activeOpacity={0.7}
                    >
                      {isUploadingSigned ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Feather name="upload" size={13} color="#FFFFFF" />
                      )}
                      <Text style={styles.signedUploadBtnText}>Upload</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Progress bar if uploading signed contract */}
              {isUploadingSigned && (
                <View style={styles.uploadProgressContainer}>
                  <View style={styles.uploadProgressHeader}>
                    <Text style={styles.uploadProgressTitle}>Đang tải lên bản đã ký...</Text>
                    <Text style={styles.uploadProgressPercent}>{uploadProgress}%</Text>
                  </View>
                  <View style={styles.uploadProgressBarTrack}>
                    <View
                      style={[
                        styles.uploadProgressBarFill,
                        { backgroundColor: '#4F46E5', width: `${uploadProgress}%` },
                      ]}
                    />
                  </View>
                </View>
              )}
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

      {/* 10. MODAL UPLOAD PROPOSAL (ĐỒNG BỘ 100% WEB ProposalManagement.jsx) */}
      <Modal
        visible={isUploadProposalModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isUploadingProposal) setIsUploadProposalModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.uploadModalContent]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.miniIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Feather name="upload-cloud" size={16} color="#2563EB" />
                </View>
                <Text style={styles.modalTitle}>Cập nhật Proposal hợp đồng</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!isUploadingProposal) setIsUploadProposalModalVisible(false);
                }}
                disabled={isUploadingProposal}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              {/* Section 1: Phương thức tải Hợp đồng */}
              <Text style={styles.uploadSectionLabel}>1. Chọn hình thức upload hợp đồng</Text>
              <View style={styles.methodSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.methodOptionBtn,
                    uploadProposalMethod === 'FILE' && styles.methodOptionBtnActive,
                  ]}
                  onPress={() => {
                    setUploadProposalMethod('FILE');
                    setProposalLink('');
                  }}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="upload"
                    size={16}
                    color={uploadProposalMethod === 'FILE' ? '#2563EB' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.methodOptionText,
                      uploadProposalMethod === 'FILE' && styles.methodOptionTextActive,
                    ]}
                  >
                    Tải file Word/Excel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodOptionBtn,
                    uploadProposalMethod === 'LINK' && styles.methodOptionBtnActive,
                  ]}
                  onPress={() => {
                    setUploadProposalMethod('LINK');
                    setProposalFile(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="link-2"
                    size={16}
                    color={uploadProposalMethod === 'LINK' ? '#2563EB' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.methodOptionText,
                      uploadProposalMethod === 'LINK' && styles.methodOptionTextActive,
                    ]}
                  >
                    Nhập link hợp đồng
                  </Text>
                </TouchableOpacity>
              </View>

              {uploadProposalMethod === 'FILE' && (
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldSubLabel}>File hợp đồng (.docx, .xls, .xlsx)</Text>
                  {proposalFile ? (
                    <View style={styles.selectedFileBox}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.selectedFileName} numberOfLines={1}>
                          {proposalFile.name}
                        </Text>
                        <Text style={styles.selectedFileSize}>
                          {proposalFile.size
                            ? `${(proposalFile.size / 1024).toFixed(1)} KB`
                            : 'Đã sẵn sàng tải lên'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.changeFileBtn}
                        onPress={handlePickProposalFile}
                        disabled={isUploadingProposal}
                      >
                        <Text style={styles.changeFileText}>Đổi file</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.pickFileDashedBtn}
                      onPress={handlePickProposalFile}
                      disabled={isUploadingProposal}
                      activeOpacity={0.7}
                    >
                      <Feather name="file-plus" size={20} color="#2563EB" />
                      <Text style={styles.pickFileDashedText}>Bấm để chọn file từ thiết bị</Text>
                      <Text style={styles.pickFileDashedHint}>Hỗ trợ định dạng .docx, .xls, .xlsx</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {uploadProposalMethod === 'LINK' && (
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldSubLabel}>Link hợp đồng (Google Docs, Drive...)</Text>
                  <TextInput
                    style={styles.urlInput}
                    value={proposalLink}
                    onChangeText={setProposalLink}
                    placeholder="https://docs.google.com/..."
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </View>
              )}

              {/* Section 2: Báo giá (nếu có) */}
              <Text style={[styles.uploadSectionLabel, { marginTop: 16 }]}>2. Báo giá (nếu có)</Text>
              <View style={styles.methodSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.methodOptionBtn,
                    quotationMethod === 'LINK' && styles.methodOptionBtnActive,
                  ]}
                  onPress={() => {
                    setQuotationMethod(quotationMethod === 'LINK' ? 'NONE' : 'LINK');
                    setQuotationFile(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="link-2"
                    size={16}
                    color={quotationMethod === 'LINK' ? '#2563EB' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.methodOptionText,
                      quotationMethod === 'LINK' && styles.methodOptionTextActive,
                    ]}
                  >
                    Nhập link báo giá
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodOptionBtn,
                    quotationMethod === 'FILE' && styles.methodOptionBtnActive,
                  ]}
                  onPress={() => {
                    setQuotationMethod(quotationMethod === 'FILE' ? 'NONE' : 'FILE');
                    setQuotationLink('');
                  }}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="file-text"
                    size={16}
                    color={quotationMethod === 'FILE' ? '#2563EB' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.methodOptionText,
                      quotationMethod === 'FILE' && styles.methodOptionTextActive,
                    ]}
                  >
                    Tải file Excel
                  </Text>
                </TouchableOpacity>
              </View>

              {quotationMethod === 'LINK' && (
                <View style={styles.fieldBlock}>
                  <TextInput
                    style={styles.urlInput}
                    value={quotationLink}
                    onChangeText={setQuotationLink}
                    placeholder="https://docs.google.com/spreadsheets/..."
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </View>
              )}

              {quotationMethod === 'FILE' && (
                <View style={styles.fieldBlock}>
                  {quotationFile ? (
                    <View style={styles.selectedFileBox}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.selectedFileName} numberOfLines={1}>
                          {quotationFile.name}
                        </Text>
                        <Text style={styles.selectedFileSize}>
                          {quotationFile.size
                            ? `${(quotationFile.size / 1024).toFixed(1)} KB`
                            : 'Đã sẵn sàng tải lên'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.changeFileBtn}
                        onPress={handlePickQuotationFile}
                        disabled={isUploadingProposal}
                      >
                        <Text style={styles.changeFileText}>Đổi file</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.pickFileDashedBtn}
                      onPress={handlePickQuotationFile}
                      disabled={isUploadingProposal}
                      activeOpacity={0.7}
                    >
                      <Feather name="file-plus" size={18} color="#2563EB" />
                      <Text style={styles.pickFileDashedText}>Chọn file Excel báo giá</Text>
                      <Text style={styles.pickFileDashedHint}>Chỉ chấp nhận file .xls, .xlsx</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Progress bar in modal */}
              {isUploadingProposal && (
                <View style={[styles.uploadProgressContainer, { marginTop: 16 }]}>
                  <View style={styles.uploadProgressHeader}>
                    <Text style={styles.uploadProgressTitle}>Đang tải lên máy chủ Cloudinary...</Text>
                    <Text style={styles.uploadProgressPercent}>{uploadProgress}%</Text>
                  </View>
                  <View style={styles.uploadProgressBarTrack}>
                    <View
                      style={[styles.uploadProgressBarFill, { width: `${uploadProgress}%` }]}
                    />
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalActions, { marginTop: 16 }]}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsUploadProposalModalVisible(false)}
                disabled={isUploadingProposal}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmSaveBtn,
                  (isUploadingProposal ||
                    (uploadProposalMethod === 'FILE' ? !proposalFile : !proposalLink.trim())) && {
                    opacity: 0.5,
                  },
                ]}
                onPress={handleSubmitProposal}
                disabled={
                  isUploadingProposal ||
                  (uploadProposalMethod === 'FILE' ? !proposalFile : !proposalLink.trim())
                }
              >
                {isUploadingProposal ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="check" size={16} color="#FFFFFF" />
                )}
                <Text style={styles.modalConfirmSaveText}>
                  {isUploadingProposal ? 'Đang lưu...' : 'Lưu'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 11. MODAL PHÂN CÔNG PM DỰ ÁN (CHUẨN 100% WEB ProjectInfo.jsx) */}
      <Modal
        visible={isPmPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPmPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Phân công PM phụ trách dự án</Text>
              <TouchableOpacity onPress={() => setIsPmPickerVisible(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Chọn Quản lý dự án (PM) để chịu trách nhiệm triển khai hợp đồng này:
            </Text>

            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
              {pmUsers.length > 0 ? (
                pmUsers.map((pm) => {
                  const isSelected = selectedPmId === pm.id;
                  return (
                    <TouchableOpacity
                      key={pm.id}
                      style={[styles.pmUserItem, isSelected && styles.pmUserItemActive]}
                      onPress={() => {
                        setSelectedPmId(pm.id);
                        handleAssignPmSubmit(pm.id);
                      }}
                      disabled={isAssigningPm}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[styles.pmUserAvatar, isSelected && { backgroundColor: '#2563EB' }]}
                      >
                        <Text
                          style={[
                            styles.pmUserAvatarText,
                            isSelected && { color: '#FFFFFF' },
                          ]}
                        >
                          {pm.fullName?.substring(0, 1).toUpperCase() || 'P'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.pmUserName,
                            isSelected && { color: '#1D4ED8', fontWeight: '700' },
                          ]}
                        >
                          {pm.fullName}
                        </Text>
                        {pm.email ? <Text style={styles.pmUserEmail}>{pm.email}</Text> : null}
                      </View>
                      {isSelected ? <Feather name="check-circle" size={18} color="#2563EB" /> : null}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>Không tìm thấy tài khoản PM nào</Text>
              )}
            </ScrollView>

            <View style={[styles.modalActions, { marginTop: 16 }]}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsPmPickerVisible(false)}
              >
                <Text style={styles.modalCancelText}>Đóng</Text>
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
    paddingVertical: 4,
    gap: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    textAlign: 'right',
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
  financialGrid: {
    gap: 10,
  },
  financialCardTotal: {
    backgroundColor: '#1E40AF',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  financialCardTotalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DBEAFE',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  financialCardTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  financialCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  financialCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  financialCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  financialCardValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  financialCardSub: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 4,
  },
  miniIconBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Proposal Management Card Styles (Chuẩn 100% Web ProposalManagement.jsx)
  proposalBoxList: {
    gap: 12,
  },
  proposalCardItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
  },
  proposalCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  proposalItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  proposalItemHint: {
    fontSize: 12,
    fontWeight: '400',
    fontStyle: 'italic',
    color: '#94A3B8',
  },
  proposalItemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  proposalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proposalViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  proposalViewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  proposalReviewBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  proposalApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#16A34A',
    borderRadius: 8,
  },
  proposalApproveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  proposalRejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
  },
  proposalRejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  proposalUploadNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  proposalUploadNewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  proposalUploadPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  proposalUploadPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  signedUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
  },
  signedUploadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quotationLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  quotationLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  rejectionNoticeBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
  },
  rejectionNoticeTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991B1B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  rejectionNoticeText: {
    fontSize: 12,
    color: '#B91C1C',
    lineHeight: 16,
  },
  uploadProgressContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  uploadProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  uploadProgressTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  uploadProgressPercent: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  uploadProgressBarTrack: {
    height: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 99,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  uploadProgressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 99,
  },
  // Modal Upload Proposal Styles
  uploadModalContent: {
    maxWidth: 480,
    maxHeight: '85%',
  },
  uploadSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  methodSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  methodOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  methodOptionBtnActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  methodOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  methodOptionTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  fieldBlock: {
    marginBottom: 8,
  },
  fieldSubLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 6,
  },
  urlInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  pickFileDashedBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pickFileDashedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  pickFileDashedHint: {
    fontSize: 11,
    color: '#94A3B8',
  },
  selectedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 10,
  },
  selectedFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  selectedFileSize: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
  },
  changeFileBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 6,
  },
  changeFileText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  modalConfirmSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  modalConfirmSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // ProjectInfo Card & PM Assignment Styles (Chuẩn 100% Web ProjectInfo.jsx)
  projectLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  projectLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  assignPmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  assignPmBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  pmUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  pmUserItemActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  pmUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pmUserAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  pmUserName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  pmUserEmail: {
    fontSize: 11,
    color: '#64748B',
  },
});
