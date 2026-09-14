import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptic from 'expo-haptics';
import {
  financeService,
  ContractDebtGroup,
  ContractDebtMilestone,
} from '@/services/financeService';
import { BrandColors } from '@/constants/colors';
import BottomNavBar from '@/components/BottomNavBar';
import { safeGoBack } from '@/utils/navigation';
import { useAuth } from '@/context/AuthContext';
import { canAccessFinance } from '@/utils/rbac';

const PRESET_OPTIONS: Array<{ key: 'this_month' | 'last_month' | 'this_quarter' | 'all'; label: string }> = [
  { key: 'this_month', label: 'Tháng này' },
  { key: 'last_month', label: 'Tháng trước' },
  { key: 'this_quarter', label: 'Quý này' },
  { key: 'all', label: 'Tất cả' },
];

const DEBT_STATUS_OPTIONS: Array<{ key: 'ALL' | 'HAS_DEBT' | 'NO_DEBT'; label: string }> = [
  { key: 'ALL', label: 'Tất cả công nợ' },
  { key: 'HAS_DEBT', label: 'Còn nợ cần thu' },
  { key: 'NO_DEBT', label: 'Đã hoàn thành thu' },
];

interface EditableMilestone {
  id?: string;
  name: string;
  percentage: number;
  amount: number;
  dueDate: string;
}

export default function FinanceDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const hasAccess = canAccessFinance(user?.role);

  // Match Web viewType: 'list' | 'schedule'
  const [viewType, setViewType] = useState<'list' | 'schedule'>('list');

  // Filter States (Đồng bộ 100% FinanceToolbar.jsx trên Web)
  const [searchTerm, setSearchTerm] = useState('');
  const [preset, setPreset] = useState<'this_month' | 'last_month' | 'this_quarter' | 'all'>('this_month');
  const [debtStatusFilter, setDebtStatusFilter] = useState<'ALL' | 'HAS_DEBT' | 'NO_DEBT'>('ALL');

  const [contractGroups, setContractGroups] = useState<ContractDebtGroup[]>([]);
  const [expandedContracts, setExpandedContracts] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Payment Recording Modal State
  const [selectedMilestone, setSelectedMilestone] = useState<ContractDebtMilestone | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Milestone Manage / Edit Roadmap Modal State (Đồng bộ 100% MilestoneModal.jsx)
  const [selectedContractForRoadmap, setSelectedContractForRoadmap] = useState<ContractDebtGroup | null>(null);
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);
  const [editableMilestones, setEditableMilestones] = useState<EditableMilestone[]>([]);
  const [savingRoadmap, setSavingRoadmap] = useState(false);

  const fetchData = async () => {
    try {
      const contractDebtRes = await financeService.getContractDebtsAndMilestones();

      if (contractDebtRes.data) {
        setContractGroups(contractDebtRes.data);
        if (contractDebtRes.data.length > 0) {
          setExpandedContracts((prev) => ({
            ...prev,
            [contractDebtRes.data[0].id]: true,
          }));
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchData();
    }
  }, [hasAccess]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleResetFilters = () => {
    Haptic.impactAsync(Haptic.ImpactFeedbackStyle.Light);
    setSearchTerm('');
    setPreset('this_month');
    setDebtStatusFilter('ALL');
  };

  const formatVND = (amount?: number) => {
    if (amount === undefined || amount === null) return '0 ₫';
    return amount.toLocaleString('vi-VN') + ' ₫';
  };

  // Filtered Contract Groups (Logic lọc đồng bộ 100% FinancePage.jsx)
  const filteredContracts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return contractGroups.filter((group) => {
      if (term) {
        const matchCode = group.contractCode.toLowerCase().includes(term);
        const matchCustomer = group.customerName.toLowerCase().includes(term);
        if (!matchCode && !matchCustomer) return false;
      }

      if (debtStatusFilter === 'HAS_DEBT' && group.totalDebt <= 0) return false;
      if (debtStatusFilter === 'NO_DEBT' && group.totalDebt > 0) return false;

      return true;
    });
  }, [contractGroups, searchTerm, debtStatusFilter]);

  // Executive Stats dynamically calculated from filtered data
  const stats = useMemo(() => {
    const planned = filteredContracts.reduce(
      (sum, c) => sum + c.milestones.reduce((mSum, m) => mSum + m.amount, 0),
      0
    );
    const collected = filteredContracts.reduce((sum, c) => sum + c.totalPaid, 0);
    const pending = filteredContracts.reduce((sum, c) => sum + c.totalDebt, 0);
    const collectionRate = planned > 0 ? Math.min(100, Math.round((collected / planned) * 100)) : 0;
    const contractsCount = filteredContracts.length;

    return { planned, collected, pending, collectionRate, contractsCount };
  }, [filteredContracts]);

  // Flattened Milestones for Schedule View
  const allMilestones = useMemo(() => {
    return filteredContracts.flatMap((cg) =>
      cg.milestones.map((m) => ({
        ...m,
        contractCode: cg.contractCode,
        customerName: cg.customerName,
      }))
    );
  }, [filteredContracts]);

  const toggleContractExpand = (contractId: string) => {
    Haptic.impactAsync(Haptic.ImpactFeedbackStyle.Light);
    setExpandedContracts((prev) => ({
      ...prev,
      [contractId]: !prev[contractId],
    }));
  };

  const handleActivateDebt = async (milestoneId: string) => {
    try {
      setActionLoadingId(milestoneId);
      Haptic.impactAsync(Haptic.ImpactFeedbackStyle.Medium);
      const res = await financeService.activateDebt(milestoneId);
      if (res.success) {
        Haptic.notificationAsync(Haptic.NotificationFeedbackType.Success);
        Alert.alert('Đã kích hoạt', 'Đã kích hoạt công nợ cho đợt thanh toán này.');
        fetchData();
      } else {
        Haptic.notificationAsync(Haptic.NotificationFeedbackType.Error);
        Alert.alert('Không thể kích hoạt', res.error || 'Vui lòng thử lại sau.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openPaymentModal = (milestone: ContractDebtMilestone) => {
    setSelectedMilestone(milestone);
    setPaymentAmount(String(milestone.remaining || milestone.amount || 0));
    setPaymentNote('');
    setShowPaymentModal(true);
  };

  const handleSavePayment = async () => {
    if (!selectedMilestone) return;
    const debtId = selectedMilestone.debt?.id || selectedMilestone.id;
    const amountNum = Number(paymentAmount);

    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Lỗi nhập liệu', 'Vui lòng nhập số tiền thanh toán hợp lệ.');
      return;
    }

    try {
      setSavingPayment(true);
      Haptic.impactAsync(Haptic.ImpactFeedbackStyle.Heavy);
      const res = await financeService.createPayment({
        debtId: String(debtId),
        amount: amountNum,
        note: paymentNote,
      });

      if (res.success) {
        Haptic.notificationAsync(Haptic.NotificationFeedbackType.Success);
        Alert.alert('Thành công', 'Đã ghi nhận giao dịch thanh toán.');
        setShowPaymentModal(false);
        fetchData();
      } else {
        Haptic.notificationAsync(Haptic.NotificationFeedbackType.Error);
        Alert.alert('Không thể ghi nhận', res.error || 'Vui lòng thử lại sau.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra.');
    } finally {
      setSavingPayment(false);
    }
  };

  // --- Roadmap Edit/Management Modal Handlers ---
  const openRoadmapModal = (contract: ContractDebtGroup) => {
    setSelectedContractForRoadmap(contract);
    const mapped: EditableMilestone[] = contract.milestones.map((m) => {
      const percentage =
        m.percentage !== undefined && m.percentage !== null
          ? Number(m.percentage)
          : contract.sellingPrice > 0
          ? Math.round((m.amount / contract.sellingPrice) * 100)
          : 0;
      return {
        id: m.id,
        name: m.name || 'Đợt thanh toán',
        percentage,
        amount: m.amount || 0,
        dueDate: m.dueDate || '',
      };
    });
    setEditableMilestones(mapped);
    setShowRoadmapModal(true);
  };

  const handleAddRoadmapRow = () => {
    if (!selectedContractForRoadmap) return;
    const price = selectedContractForRoadmap.sellingPrice;
    const currentPercent = editableMilestones.reduce((sum, m) => sum + Number(m.percentage || 0), 0);
    const nextPercent = Math.max(0, 100 - currentPercent);
    const nextAmount = Math.round((nextPercent / 100) * price);

    setEditableMilestones((prev) => [
      ...prev,
      {
        name: `Đợt ${prev.length + 1}`,
        percentage: nextPercent,
        amount: nextAmount,
        dueDate: '',
      },
    ]);
  };

  const handleRemoveRoadmapRow = (index: number) => {
    setEditableMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRoadmapChange = (index: number, field: keyof EditableMilestone, value: string) => {
    if (!selectedContractForRoadmap) return;
    const price = selectedContractForRoadmap.sellingPrice;

    setEditableMilestones((prev) => {
      const next = [...prev];
      const row = { ...next[index] };

      if (field === 'percentage') {
        const numPercent = Number(value) || 0;
        row.percentage = numPercent;
        row.amount = Math.round((numPercent / 100) * price);
      } else if (field === 'amount') {
        const numAmount = Number(value) || 0;
        row.amount = numAmount;
        row.percentage = price > 0 ? Math.round((numAmount / price) * 100) : 0;
      } else if (field === 'name' || field === 'dueDate') {
        row[field] = value;
      }

      next[index] = row;
      return next;
    });
  };

  const roadmapTotalPercent = editableMilestones.reduce((sum, m) => sum + Number(m.percentage || 0), 0);
  const roadmapTotalAmount = editableMilestones.reduce((sum, m) => sum + Number(m.amount || 0), 0);
  const contractPrice = selectedContractForRoadmap?.sellingPrice || 0;

  const handleSaveRoadmap = async () => {
    if (!selectedContractForRoadmap) return;

    if (editableMilestones.length > 0) {
      if (roadmapTotalPercent !== 100) {
        Alert.alert(
          'Lỗi tổng tỷ lệ',
          `Tổng tỷ lệ các đợt phải bằng 100% (hiện tại: ${roadmapTotalPercent}%).`
        );
        return;
      }
    }

    try {
      setSavingRoadmap(true);
      Haptic.impactAsync(Haptic.ImpactFeedbackStyle.Heavy);
      const res = await financeService.bulkSaveMilestones(
        selectedContractForRoadmap.id,
        editableMilestones.map((m) => ({
          id: m.id,
          name: m.name,
          percentage: m.percentage,
          amount: m.amount,
          dueDate: m.dueDate,
        }))
      );

      if (res.success) {
        Haptic.notificationAsync(Haptic.NotificationFeedbackType.Success);
        Alert.alert('Thành công', 'Đã cập nhật lộ trình thanh toán cho hợp đồng.');
        setShowRoadmapModal(false);
        fetchData();
      } else {
        Haptic.notificationAsync(Haptic.NotificationFeedbackType.Error);
        Alert.alert('Không thể lưu lộ trình', res.error || 'Vui lòng thử lại sau.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra.');
    } finally {
      setSavingRoadmap(false);
    }
  };

  if (!hasAccess) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
          <TouchableOpacity
            className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center min-w-[44px] min-h-[44px]"
            onPress={() => router.replace('/')}
          >
            <Feather name="arrow-left" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-[17px] font-bold text-slate-900">Quản lý Tài chính</Text>
          <View className="w-10" />
        </View>

        <View className="flex-1 justify-center items-center p-8 gap-3">
          <View className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 items-center justify-center mb-2">
            <Feather name="shield-off" size={36} color="#EF4444" />
          </View>
          <Text className="text-lg font-extrabold text-slate-900">Giới hạn quyền truy cập</Text>
          <Text className="text-[13px] text-slate-500 text-center leading-5 max-w-[280px]">
            Phân hệ Tài chính chỉ dành riêng cho Ban Giám đốc (Admin/BOD) và Bộ phận Kế toán.
          </Text>
          <TouchableOpacity
            className="mt-3 bg-primary px-5 py-3 rounded-xl min-h-[44px] justify-center"
            onPress={() => router.replace('/')}
          >
            <Text className="text-sm font-bold text-white">Quay về Trang chủ</Text>
          </TouchableOpacity>
        </View>

        <BottomNavBar />
      </SafeAreaView>
    );
  }

  const renderContractGroupCard = (contract: ContractDebtGroup) => {
    const isExpanded = !!expandedContracts[contract.id];
    const progressPercent =
      contract.sellingPrice > 0
        ? Math.min(100, Math.round((contract.totalPaid / contract.sellingPrice) * 100))
        : 0;

    return (
      <View
        key={contract.id}
        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-4"
      >
        {/* Accordion Header */}
        <TouchableOpacity
          className="p-4 bg-white border-b border-slate-100 gap-2"
          onPress={() => toggleContractExpand(contract.id)}
          activeOpacity={0.8}
        >
          {/* Row 1: Customer Name & Contract Code + Chevron */}
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-sm font-extrabold text-slate-900 flex-1 mr-1" numberOfLines={1}>
              {contract.customerName}
            </Text>

            <View className="flex-row items-center gap-1.5 shrink-0">
              <Text className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                {contract.contractCode}
              </Text>
              <Feather
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#64748B"
              />
            </View>
          </View>

          {/* Row 2: Contract Selling Price & Remaining Debt */}
          <View className="flex-row items-center justify-between pt-1 border-t border-slate-100/60">
            <View className="flex-row items-center gap-1 flex-1 mr-2">
              <Text className="text-xs text-slate-400 font-medium">Giá trị HĐ:</Text>
              <Text className="text-xs font-extrabold text-slate-800" numberOfLines={1}>
                {formatVND(contract.sellingPrice)}
              </Text>
            </View>

            <View className="flex-row items-center gap-1 shrink-0">
              <Text className="text-xs text-slate-400 font-medium">Cần thu:</Text>
              <Text
                className={`text-xs font-extrabold ${
                  contract.totalDebt > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {formatVND(contract.totalDebt)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Progress Bar & Manage Roadmap Action */}
        <View className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2 flex-1 max-w-[160px]">
            <Text className="text-[10px] font-bold text-slate-400 uppercase">TIẾN ĐỘ</Text>
            <View className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <View
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </View>
            <Text className="text-[10px] font-bold text-emerald-700">{progressPercent}%</Text>
          </View>

          {/* Nút Quản lý / Sửa lộ trình thanh toán (Đồng bộ 100% Web) */}
          <TouchableOpacity
            className="flex-row items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-xs"
            onPress={() => openRoadmapModal(contract)}
            activeOpacity={0.8}
          >
            <Feather name="edit-3" size={12} color="#4F46E5" />
            <Text className="text-[11px] font-bold text-indigo-600">Sửa lộ trình</Text>
          </TouchableOpacity>
        </View>

        {/* Milestones Journey Timeline */}
        {isExpanded && (
          <View className="p-4 gap-3">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Lộ trình thanh toán ({contract.milestones.length} đợt)
              </Text>

              <TouchableOpacity
                className="flex-row items-center gap-1 text-indigo-600"
                onPress={() => openRoadmapModal(contract)}
              >
                <Feather name="plus-circle" size={13} color="#4F46E5" />
                <Text className="text-xs font-bold text-indigo-600">Thêm / Chỉnh sửa</Text>
              </TouchableOpacity>
            </View>

            {contract.milestones.map((m, idx) => {
              const isPlanned = m.status === 'PLANNED';
              const isActive = m.status === 'ACTIVE';
              const isCompleted = m.status === 'COMPLETED';
              const isOverdue =
                isActive && m.dueDate && new Date(m.dueDate) < new Date();
              const isActivating = actionLoadingId === m.id;

              return (
                <View
                  key={m.id || idx}
                  className={`p-3.5 rounded-xl border ${
                    isCompleted
                      ? 'bg-emerald-50/40 border-emerald-100'
                      : isActive
                      ? 'bg-blue-50/30 border-blue-100'
                      : 'bg-white border-dashed border-slate-200'
                  }`}
                >
                  {/* Milestone Name & Status */}
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-row items-center gap-2 flex-1 mr-2">
                      <View
                        className={`w-6 h-6 rounded-md items-center justify-center ${
                          isCompleted
                            ? 'bg-emerald-600'
                            : isActive
                            ? 'bg-indigo-600'
                            : 'bg-slate-300'
                        }`}
                      >
                        {isCompleted ? (
                          <Feather name="check" size={14} color="#FFFFFF" />
                        ) : (
                          <Text className="text-[10px] font-bold text-white">
                            {idx + 1}
                          </Text>
                        )}
                      </View>

                      <Text
                        className="text-xs font-bold text-slate-800 flex-1"
                        numberOfLines={1}
                      >
                        {m.name}
                      </Text>
                    </View>

                    {/* Status Badge */}
                    <View
                      className={`px-2 py-0.5 rounded-md shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-100'
                          : isActive
                          ? isOverdue
                            ? 'bg-rose-100'
                            : 'bg-indigo-100'
                          : 'bg-slate-100'
                      }`}
                    >
                      <Text
                        className={`text-[9px] font-bold uppercase ${
                          isCompleted
                            ? 'text-emerald-800'
                            : isActive
                            ? isOverdue
                              ? 'text-rose-800'
                              : 'text-indigo-800'
                            : 'text-slate-500'
                        }`}
                      >
                        {isCompleted
                          ? 'ĐÃ THU'
                          : isActive
                          ? isOverdue
                            ? 'QUÁ HẠN'
                            : 'ĐANG THU'
                          : 'CHƯA KÍCH HOẠCH'}
                      </Text>
                    </View>
                  </View>

                  {/* Amounts & Due Date */}
                  <View className="flex-row items-center justify-between pt-1 border-t border-slate-100/60 mt-1">
                    <View>
                      <Text className="text-[10px] text-slate-400">
                        {m.dueDate ? `Hạn: ${m.dueDate}` : 'Chưa có hạn'}
                      </Text>
                      <Text className="text-xs font-extrabold text-slate-900 mt-0.5">
                        Giá trị: {formatVND(m.amount)}
                      </Text>
                    </View>

                    {/* Milestone Actions */}
                    <View className="items-end gap-1">
                      {isPlanned && (
                        <TouchableOpacity
                          className="bg-indigo-600 px-3 py-1.5 rounded-lg min-h-[36px] justify-center items-center shadow-xs"
                          onPress={() => handleActivateDebt(m.id)}
                          disabled={isActivating}
                          activeOpacity={0.8}
                        >
                          {isActivating ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text className="text-xs font-bold text-white">
                              Kích hoạt công nợ
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}

                      {isActive && (
                        <TouchableOpacity
                          className="bg-emerald-600 px-3 py-1.5 rounded-lg min-h-[36px] justify-center items-center shadow-xs"
                          onPress={() => openPaymentModal(m)}
                          activeOpacity={0.8}
                        >
                          <Text className="text-xs font-bold text-white">
                            Ghi nhận thanh toán
                          </Text>
                        </TouchableOpacity>
                      )}

                      {isCompleted && (
                        <Text className="text-[11px] font-bold text-emerald-600">
                          Đã thu đủ ({formatVND(m.paidAmount)})
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header Area (Đồng bộ Header Web FinancePage.jsx) */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <TouchableOpacity
          className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center min-w-[44px] min-h-[44px]"
          onPress={() => safeGoBack(router, '/')}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>

        <Text className="text-[17px] font-bold text-slate-900">Quản lý tài chính</Text>

        <TouchableOpacity
          className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center min-w-[44px] min-h-[44px]"
          onPress={handleRefresh}
          activeOpacity={0.7}
        >
          <Feather name="refresh-cw" size={18} color="#475569" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center gap-2.5">
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text className="text-xs text-slate-400">
            Đang tải hợp đồng, công nợ và mốc thanh toán...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={BrandColors.primary}
            />
          }
        >
          {/* TOOLBAR BỘ LỌC (Đồng bộ 100% FinanceToolbar.jsx trên Web) */}
          <View className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-4 gap-3">
            {/* 1. Thanh Tìm kiếm Mã HĐ / Khách hàng */}
            <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Feather name="search" size={16} color="#94A3B8" />
              <TextInput
                className="flex-1 ml-2 text-sm text-slate-900 p-0"
                placeholder="Tìm mã hợp đồng, khách hàng..."
                placeholderTextColor="#94A3B8"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm ? (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <Feather name="x-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* 2. Bộ lọc thời gian (Presets) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
              {PRESET_OPTIONS.map((opt) => {
                const isSelected = preset === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    className={`px-3 py-1.5 rounded-lg border min-h-[32px] justify-center items-center mr-1.5 ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                    onPress={() => {
                      Haptic.impactAsync(Haptic.ImpactFeedbackStyle.Light);
                      setPreset(opt.key);
                    }}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-indigo-600' : 'text-slate-600'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 3. Bộ lọc trạng thái công nợ & Reset */}
            <View className="flex-row items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1 flex-row">
                {DEBT_STATUS_OPTIONS.map((opt) => {
                  const isSelected = debtStatusFilter === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      className={`px-2.5 py-1 rounded-md border min-h-[28px] justify-center items-center mr-1.5 ${
                        isSelected
                          ? 'bg-slate-900 border-slate-900'
                          : 'bg-white border-slate-200'
                      }`}
                      onPress={() => {
                        Haptic.impactAsync(Haptic.ImpactFeedbackStyle.Light);
                        setDebtStatusFilter(opt.key);
                      }}
                    >
                      <Text
                        className={`text-[11px] font-bold ${
                          isSelected ? 'text-white' : 'text-slate-600'
                        }`}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                className="flex-row items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md min-h-[28px]"
                onPress={handleResetFilters}
              >
                <Feather name="rotate-ccw" size={12} color="#64748B" />
                <Text className="text-[11px] font-bold text-slate-600">Reset</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Executive 4 Metric Cards (Đồng bộ Web FinancePage.jsx) */}
          <View className="gap-3 mb-4">
            <View className="flex-row gap-3">
              {/* Card 1: Dự kiến trong kỳ */}
              <View className="flex-1 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                <Text className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  Dự kiến trong kỳ
                </Text>
                <Text className="text-base font-black text-slate-900" numberOfLines={1}>
                  {formatVND(stats.planned)}
                </Text>
              </View>

              {/* Card 2: Đã thu trong kỳ */}
              <View className="flex-1 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Đã thu trong kỳ
                  </Text>
                  <Text className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100">
                    {stats.collectionRate}%
                  </Text>
                </View>
                <Text className="text-base font-black text-emerald-600" numberOfLines={1}>
                  {formatVND(stats.collected)}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              {/* Card 3: Còn phải thu */}
              <View className="flex-1 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                <Text className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  Còn phải thu
                </Text>
                <Text className="text-base font-black text-rose-600" numberOfLines={1}>
                  {formatVND(stats.pending)}
                </Text>
              </View>

              {/* Card 4: Hợp đồng liên quan */}
              <View className="flex-1 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                <Text className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  Hợp đồng liên quan
                </Text>
                <Text className="text-base font-black text-slate-800" numberOfLines={1}>
                  {stats.contractsCount} hợp đồng
                </Text>
              </View>
            </View>
          </View>

          {/* Mode Switcher Tabs (Đồng bộ viewType: 'list' | 'schedule' bên Web) */}
          <View className="flex-row bg-slate-200/60 p-1 rounded-2xl mb-4">
            <TouchableOpacity
              className={`flex-1 py-2.5 rounded-xl items-center justify-center min-h-[40px] flex-row gap-1.5 ${
                viewType === 'list' ? 'bg-white shadow-xs' : ''
              }`}
              onPress={() => {
                Haptic.impactAsync(Haptic.ImpactFeedbackStyle.Light);
                setViewType('list');
              }}
            >
              <Feather
                name="list"
                size={14}
                color={viewType === 'list' ? '#0F172A' : '#64748B'}
              />
              <Text
                className={`text-xs font-bold ${
                  viewType === 'list' ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                Hợp đồng ({filteredContracts.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 py-2.5 rounded-xl items-center justify-center min-h-[40px] flex-row gap-1.5 ${
                viewType === 'schedule' ? 'bg-white shadow-xs' : ''
              }`}
              onPress={() => {
                Haptic.impactAsync(Haptic.ImpactFeedbackStyle.Light);
                setViewType('schedule');
              }}
            >
              <Feather
                name="calendar"
                size={14}
                color={viewType === 'schedule' ? '#0F172A' : '#64748B'}
              />
              <Text
                className={`text-xs font-bold ${
                  viewType === 'schedule' ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                Lịch trình ({allMilestones.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* View 1: List View (Hợp đồng & Lộ trình công nợ) */}
          {viewType === 'list' && (
            <View>
              {filteredContracts.length === 0 ? (
                <View className="py-10 items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200 p-6">
                  <Feather name="file-text" size={36} color="#CBD5E1" />
                  <Text className="text-sm font-bold text-slate-600">
                    Không có hợp đồng nào phù hợp bộ lọc
                  </Text>
                </View>
              ) : (
                filteredContracts.map(renderContractGroupCard)
              )}
            </View>
          )}

          {/* View 2: Schedule View (Lịch trình thanh toán theo mốc thời gian) */}
          {viewType === 'schedule' && (
            <View className="gap-3">
              {allMilestones.length === 0 ? (
                <View className="py-10 items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200 p-6">
                  <Feather name="calendar" size={36} color="#CBD5E1" />
                  <Text className="text-sm font-bold text-slate-600">
                    Không có mốc thanh toán nào phù hợp bộ lọc
                  </Text>
                </View>
              ) : (
                allMilestones.map((m, idx) => {
                  const isCompleted = m.status === 'COMPLETED';
                  const isActive = m.status === 'ACTIVE';

                  return (
                    <View
                      key={m.id || idx}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm gap-2"
                    >
                      <View className="flex-row items-center justify-between gap-2">
                        <Text className="text-xs font-bold text-indigo-600 flex-1 mr-2" numberOfLines={1}>
                          {m.contractCode} • {m.customerName}
                        </Text>
                        <View
                          className={`px-2 py-0.5 rounded-md shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-100'
                              : isActive
                              ? 'bg-indigo-100'
                              : 'bg-slate-100'
                          }`}
                        >
                          <Text
                            className={`text-[9px] font-bold uppercase ${
                              isCompleted
                                ? 'text-emerald-800'
                                : isActive
                                ? 'text-indigo-800'
                                : 'text-slate-500'
                            }`}
                          >
                            {isCompleted
                              ? 'ĐÃ THU'
                              : isActive
                              ? 'ĐANG THU'
                              : 'CHƯA KÍCH HOẠCH'}
                          </Text>
                        </View>
                      </View>

                      <Text className="text-sm font-bold text-slate-900">{m.name}</Text>

                      <View className="flex-row items-center justify-between border-t border-slate-100 pt-2">
                        <Text className="text-xs text-slate-500">
                          Hạn thanh toán: {m.dueDate || 'N/A'}
                        </Text>
                        <Text className="text-sm font-black text-slate-900">
                          {formatVND(m.amount)}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* 1. Modal Record Payment */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-5 gap-4">
            <View className="flex-row items-center justify-between border-b border-slate-100 pb-3">
              <Text className="text-base font-bold text-slate-900">
                Ghi nhận thanh toán
              </Text>
              <TouchableOpacity
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                onPress={() => setShowPaymentModal(false)}
              >
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs font-bold text-slate-500">
              Đợt: {selectedMilestone?.name}
            </Text>

            <View className="gap-1.5">
              <Text className="text-xs font-bold text-slate-700 uppercase">
                Số tiền thanh toán (₫) *
              </Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 font-bold"
                keyboardType="numeric"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="Nhập số tiền"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-bold text-slate-700 uppercase">
                Ghi chú / Mã chứng từ
              </Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900"
                value={paymentNote}
                onChangeText={setPaymentNote}
                placeholder="VD: Chuyển khoản VCB - Báo có ngày 14/09"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <TouchableOpacity
              className="mt-2 bg-emerald-600 py-3.5 rounded-xl items-center justify-center min-h-[48px]"
              onPress={handleSavePayment}
              disabled={savingPayment}
              activeOpacity={0.8}
            >
              {savingPayment ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-sm font-bold text-white">
                  Xác nhận Ghi nhận Thanh toán
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. Modal Quản lý / Thêm / Sửa Lộ trình thanh toán (Đồng bộ 100% MilestoneModal.jsx) */}
      <Modal
        visible={showRoadmapModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRoadmapModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-5 max-h-[85%] gap-4">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between border-b border-slate-100 pb-3">
              <View className="flex-1 mr-2">
                <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
                  Kế hoạch thanh toán hợp đồng
                </Text>
                <Text className="text-xs font-bold text-indigo-600">
                  {selectedContractForRoadmap?.contractCode} • {selectedContractForRoadmap?.customerName}
                </Text>
              </View>
              <TouchableOpacity
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                onPress={() => setShowRoadmapModal(false)}
              >
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Validation Totals Header Bar */}
            <View className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex-row justify-between items-center">
              <View>
                <Text className="text-[10px] font-bold text-slate-400 uppercase">GIÁ TRỊ HỢP ĐỒNG</Text>
                <Text className="text-sm font-black text-slate-900">
                  {formatVND(contractPrice)}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-[10px] font-bold text-slate-400 uppercase">TỔNG TỶ LỆ CÁC ĐỢT</Text>
                <Text
                  className={`text-sm font-black ${
                    roadmapTotalPercent === 100 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {roadmapTotalPercent}% / 100%
                </Text>
              </View>
            </View>

            {/* Editable Milestones Rows */}
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {editableMilestones.map((m, idx) => (
                <View key={idx} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 gap-2.5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-extrabold text-slate-800">
                      Đợt #{idx + 1}
                    </Text>

                    <TouchableOpacity
                      className="w-7 h-7 rounded-lg bg-rose-50 items-center justify-center border border-rose-100"
                      onPress={() => handleRemoveRoadmapRow(idx)}
                    >
                      <Feather name="trash-2" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  <View className="gap-1">
                    <Text className="text-[10px] font-bold text-slate-500 uppercase">Tên đợt thanh toán</Text>
                    <TextInput
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold"
                      value={m.name}
                      onChangeText={(val) => handleRoadmapChange(idx, 'name', val)}
                      placeholder="VD: Tạm ứng đợt 1 / Nghiệm thu"
                    />
                  </View>

                  <View className="flex-row gap-2">
                    <View className="flex-1 gap-1">
                      <Text className="text-[10px] font-bold text-slate-500 uppercase">Tỷ lệ (%)</Text>
                      <TextInput
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold"
                        keyboardType="numeric"
                        value={String(m.percentage)}
                        onChangeText={(val) => handleRoadmapChange(idx, 'percentage', val)}
                        placeholder="%"
                      />
                    </View>

                    <View className="flex-1.5 gap-1">
                      <Text className="text-[10px] font-bold text-slate-500 uppercase">Số tiền (₫)</Text>
                      <TextInput
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold"
                        keyboardType="numeric"
                        value={String(m.amount)}
                        onChangeText={(val) => handleRoadmapChange(idx, 'amount', val)}
                        placeholder="Số tiền"
                      />
                    </View>
                  </View>

                  <View className="gap-1">
                    <Text className="text-[10px] font-bold text-slate-500 uppercase">Hạn thanh toán (YYYY-MM-DD)</Text>
                    <TextInput
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      value={m.dueDate}
                      onChangeText={(val) => handleRoadmapChange(idx, 'dueDate', val)}
                      placeholder="2026-09-30"
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity
                className="py-3 bg-indigo-50 border border-dashed border-indigo-200 rounded-2xl flex-row items-center justify-center gap-2"
                onPress={handleAddRoadmapRow}
              >
                <Feather name="plus-circle" size={16} color="#4F46E5" />
                <Text className="text-xs font-bold text-indigo-600">Thêm đợt thanh toán</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Modal Actions */}
            <TouchableOpacity
              className={`py-3.5 rounded-xl items-center justify-center min-h-[48px] ${
                roadmapTotalPercent === 100 ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
              onPress={handleSaveRoadmap}
              disabled={savingRoadmap}
              activeOpacity={0.8}
            >
              {savingRoadmap ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-sm font-bold text-white">
                  Lưu lộ trình thanh toán ({roadmapTotalPercent}%)
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNavBar />
    </SafeAreaView>
  );
}
