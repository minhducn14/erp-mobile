import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  Modal,
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { BrandColors } from '@/constants/colors';
import { CreateOpportunityPayload } from '@/services/opportunityService';
import {
  useCreateOpportunityMutation,
  useAvailableServicesQuery,
  useServicePackagesQuery,
} from '@/hooks/queries/useOpportunities';

import {
  formatNumber,
  formatVND,
  formatVNDFull,
  formatNumberInput,
  parseNumberInput,
  formatQuantity,
} from '@/utils/formatters';
import { isValidUrl, normalizeUrl } from '@/utils/validators';

import {
  useOpportunityFormStore,
  AttachedFile,
  SelectedPackage,
  SelectedService,
  OpportunityFormData,
  INITIAL_OPPORTUNITY_FORM_DATA,
} from '@/stores/useOpportunityFormStore';

export type { AttachedFile, SelectedPackage, SelectedService, OpportunityFormData };

export const STORAGE_DRAFT_KEY = '@erp_opportunity_draft_v3';

export const FIELDS = [
  { value: '', label: '-- Chọn lĩnh vực --' },
  { value: 'CNTT', label: 'Công nghệ thông tin' },
  { value: 'XayDung', label: 'Xây dựng' },
  { value: 'SanXuat', label: 'Sản xuất' },
  { value: 'ThuongMai', label: 'Thương mại' },
  { value: 'DichVu', label: 'Dịch vụ' },
  { value: 'GiaoDuc', label: 'Giáo dục' },
  { value: 'YTe', label: 'Y tế' },
  { value: 'Khac', label: 'Khác' },
];

export const PRIORITIES = [
  { id: 'Low', label: 'Thấp', color: '#64748B' },
  { id: 'Medium', label: 'Trung bình', color: '#3B82F6' },
  { id: 'High', label: 'Cao', color: '#F97316' },
];

export const PROVINCES_LIST = [
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'Bình Dương',
  'Đồng Nai',
  'Khánh Hòa',
  'Quảng Ninh',
  'Bà Rịa - Vũng Tàu',
  'Thừa Thiên Huế',
  'Bắc Ninh',
  'Hải Dương',
  'Hưng Yên',
  'Thái Nguyên',
  'Nghệ An',
  'Thanh Hóa',
  'Lâm Đồng',
  'Bình Định',
  'Kiên Giang',
  'Khác',
];

export const DEFAULT_LINK_PLACEHOLDERS = [
  'https://drive.google.com/... (Link tài liệu)',
  'https://docs.google.com/... (Link kế hoạch)',
  'https://example.com/spec.pdf (Link báo giá đối thủ)',
];
// Format VND currency input with thousand separator (dots)
export const formatVNDInput = formatNumberInput;

// Parse formatted string back to number
export const parseVNDInput = parseNumberInput;

// Auto-mask DD/MM/YYYY date input
export const formatDateInputMask = (text: string): string => {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

// Validate if a DD/MM/YYYY string is a real calendar date
export const validateDateString = (dateStr: string): boolean => {
  if (!dateStr || dateStr.length !== 10) return false;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return false;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return false;
  if (m < 1 || m > 12) return false;
  if (y < 1970 || y > 2100) return false;
  const maxDays = new Date(y, m, 0).getDate();
  return d >= 1 && d <= maxDays;
};

// Parse DD/MM/YYYY string to Date object
export const parseDateObj = (dateStr: string): Date | null => {
  if (!validateDateString(dateStr)) return null;
  const [d, m, y] = dateStr.split('/').map(Number);
  return new Date(y, m - 1, d);
};

// Convert DD/MM/YYYY to ISO YYYY-MM-DD
export const toISODate = (ddmmyyyy: string): string | undefined => {
  if (!ddmmyyyy) return undefined;
  const parts = ddmmyyyy.split('/');
  if (parts.length === 3 && parts[2]?.length === 4) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return ddmmyyyy;
};

// Convert YYYY-MM-DD from backend to DD/MM/YYYY
export const toDisplayDate = (isoOrVn: string): string => {
  if (!isoOrVn) return '';
  if (isoOrVn.includes('-')) {
    const parts = isoOrVn.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
  }
  return isoOrVn;
};

// Calculate months between DD/MM/YYYY dates (if < 1 returns 1)
export const calculateDurationMonths = (startStr: string, endStr: string): number => {
  const start = parseDateObj(startStr);
  const end = parseDateObj(endStr);
  if (start && end && end >= start) {
    const diffYears = end.getFullYear() - start.getFullYear();
    const diffMonths = end.getMonth() - start.getMonth();
    const totalMonths = diffYears * 12 + diffMonths;
    return totalMonths <= 0 ? 1 : totalMonths;
  }
  return 1;
};

// Color tier metadata for Success Chance (0% - 100%)
export const getSuccessChanceMeta = (chance: number) => {
  const val = isNaN(chance) ? 0 : Math.max(0, Math.min(100, chance));
  if (val < 30) {
    return {
      color: '#EF4444',
      bgColor: '#FEF2F2',
      borderColor: '#FCA5A5',
      label: 'Rất thấp / Rủi ro',
    };
  }
  if (val < 50) {
    return {
      color: '#F97316',
      bgColor: '#FFF7ED',
      borderColor: '#FDBA74',
      label: 'Trung bình thấp',
    };
  }
  if (val < 70) {
    return {
      color: '#EAB308',
      bgColor: '#FEFCE8',
      borderColor: '#FDE047',
      label: 'Tiềm năng',
    };
  }
  if (val < 85) {
    return {
      color: '#2563EB',
      bgColor: '#EFF6FF',
      borderColor: '#93C5FD',
      label: 'Khả quan',
    };
  }
  return {
    color: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#6EE7B7',
    label: 'Rất cao / Chắc chắn',
  };
};

// Interactive Touch Slider Component
const SuccessChanceSlider: React.FC<{
  value: number;
  onChange: (val: number) => void;
}> = ({ value, onChange }) => {
  const [trackWidth, setTrackWidth] = useState(300);
  const trackRef = useRef<View>(null);
  const trackPageXRef = useRef(0);
  const safeVal = typeof value === 'number' && !isNaN(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
  const meta = getSuccessChanceMeta(safeVal);

  const measureTrack = () => {
    trackRef.current?.measure((_x, _y, width, _height, pageX) => {
      if (width && width > 0) setTrackWidth(width);
      if (typeof pageX === 'number' && !isNaN(pageX)) trackPageXRef.current = pageX;
    });
  };

  const updateFromPageX = (pageX: number) => {
    const width = trackWidth > 0 ? trackWidth : 300;
    const offset = trackPageXRef.current || 20;
    const relativeX = pageX - offset;
    const clamped = Math.max(0, Math.min(width, relativeX));
    const percentage = Math.round((clamped / width) * 100);
    if (!isNaN(percentage)) {
      onChange(Math.max(0, Math.min(100, percentage)));
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderGrant: (evt) => {
        measureTrack();
        updateFromPageX(evt.nativeEvent.pageX);
      },
      onPanResponderMove: (evt) => {
        updateFromPageX(evt.nativeEvent.pageX);
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const knobLeft = useMemo(() => {
    const w = trackWidth > 0 ? trackWidth : 300;
    return Math.max(0, Math.min(w - 24, (w * safeVal) / 100 - 12));
  }, [trackWidth, safeVal]);

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeaderRow}>
        <View style={styles.sliderHeaderLeft}>
          <Text style={styles.inputLabel}>
            Khả năng thành công <Text style={styles.reqStar}>*</Text>
          </Text>
          <View
            style={[
              styles.chanceStatusBadge,
              { backgroundColor: meta.bgColor, borderColor: meta.borderColor },
            ]}
          >
            <Text style={[styles.chanceStatusBadgeText, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.chanceNumberBadge,
            { backgroundColor: meta.bgColor, borderColor: meta.borderColor },
          ]}
        >
          <Text style={[styles.chanceNumberText, { color: meta.color }]}>
            {safeVal}%
          </Text>
        </View>
      </View>

      {/* Slider Track Bar */}
      <View
        ref={trackRef}
        style={styles.sliderTrackTouchable}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setTrackWidth(w);
          measureTrack();
        }}
        {...panResponder.panHandlers}
      >
        <View style={styles.sliderTrackBg}>
          <View
            style={[
              styles.sliderTrackFill,
              {
                width: `${safeVal}%`,
                backgroundColor: meta.color,
              },
            ]}
          />
        </View>

        <View
          style={[
            styles.sliderThumbKnob,
            {
              left: knobLeft,
              borderColor: meta.color,
              shadowColor: meta.color,
            },
          ]}
        >
          <View style={[styles.sliderThumbInner, { backgroundColor: meta.color }]} />
        </View>
      </View>

      {/* 0% - Large Value - 100% Display Matching Web */}
      <View style={styles.sliderScaleRow}>
        <Text style={styles.sliderScaleMinMax}>0%</Text>
        <Text style={[styles.sliderScaleCenterValue, { color: meta.color }]}>
          {safeVal}%
        </Text>
        <Text style={styles.sliderScaleMinMax}>100%</Text>
      </View>

      {/* Quick Select Presets */}
      <View style={styles.sliderMilestonesRow}>
        {[0, 25, 35, 50, 75, 100].map((step) => {
          const isCurrent = safeVal === step;
          return (
            <TouchableOpacity
              key={step}
              style={[
                styles.presetPill,
                isCurrent && { backgroundColor: meta.bgColor, borderColor: meta.borderColor },
              ]}
              onPress={() => onChange(step)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text
                style={[
                  styles.presetPillText,
                  isCurrent && { color: meta.color, fontWeight: '700' },
                ]}
              >
                {step}%
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Pure React Native Calendar Modal for picking dates
const CalendarPickerModal: React.FC<{
  visible: boolean;
  title: string;
  currentDateStr: string;
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
}> = ({ visible, title, currentDateStr, onSelectDate, onClose }) => {
  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTablet = width >= 768;
  const isLandscape = width > height;

  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    if (visible) {
      const parsed = parseDateObj(currentDateStr);
      setViewDate(parsed || new Date());
    }
  }, [visible, currentDateStr]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0 - 11

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const formatted = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
    onSelectDate(formatted);
    onClose();
  };

  const handleSelectToday = () => {
    const today = new Date();
    const formatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    onSelectDate(formatted);
    onClose();
  };

  // Days calculations
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const currentSelectedDay = useMemo(() => {
    const parsed = parseDateObj(currentDateStr);
    if (parsed && parsed.getFullYear() === year && parsed.getMonth() === month) {
      return parsed.getDate();
    }
    return null;
  }, [currentDateStr, year, month]);

  const todayDate = new Date();
  const isCurrentMonthToday = todayDate.getFullYear() === year && todayDate.getMonth() === month;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.calendarModalContainer,
            {
              width: isTablet ? 460 : Math.min(width * 0.94, 400),
              maxHeight: isLandscape ? height * 0.9 : undefined,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Month Navigator */}
          <View style={styles.calendarNavRow}>
            <TouchableOpacity onPress={prevMonth} style={styles.calendarNavBtn}>
              <Feather name="chevron-left" size={20} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.calendarMonthText}>
              Tháng {month + 1}, {year}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.calendarNavBtn}>
              <Feather name="chevron-right" size={20} color="#1E293B" />
            </TouchableOpacity>
          </View>

          {/* Day of Week Headers */}
          <View style={styles.calendarWeekRow}>
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
              <Text key={i} style={[styles.calendarWeekDayText, i >= 5 && { color: '#EF4444' }]}>
                {d}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.calendarGrid}>
            {/* Blank leading days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.calendarCell} />
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected = dayNum === currentSelectedDay;
              const isToday = isCurrentMonthToday && todayDate.getDate() === dayNum;

              return (
                <TouchableOpacity
                  key={`day-${dayNum}`}
                  style={[
                    styles.calendarCell,
                    isSelected && styles.calendarCellSelected,
                    !isSelected && isToday && styles.calendarCellToday,
                  ]}
                  onPress={() => handleSelectDay(dayNum)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      isSelected && styles.calendarDayTextSelected,
                      !isSelected && isToday && styles.calendarDayTextToday,
                    ]}
                  >
                    {dayNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer actions */}
          <View style={styles.calendarFooter}>
            <TouchableOpacity onPress={handleSelectToday} style={styles.calendarTodayBtn}>
              <Text style={styles.calendarTodayBtnText}>Hôm nay</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.calendarCloseBtn}>
              <Text style={styles.calendarCloseBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Auto-format MM/YY input (chuẩn Web)
const formatMonthYear = (value: string, prevValue: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  // Backspace handling: nếu prev kết thúc bằng '/' và người dùng xóa
  if (prevValue.endsWith('/') && digits.length === 2 && !value.includes('/')) {
    return digits.slice(0, 1);
  }
  if (digits.length >= 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
};

export default function CreateOpportunityScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallScreen = width < 380;
  const isTablet = width >= 768;
  const isLandscape = width > height;

  // Zustand Store
  const {
    formData,
    updateField,
    updateFormData,
    lastSavedTime,
    setLastSavedTime,
    dateError,
    setDateError,
    isSubmitting,
    setIsSubmitting,
    toggleRegion,
    addPackage,
    removePackage,
    selectPackageTemplate,
    setPackageQuantity,
    addService,
    removeService,
    selectServiceItem,
    setServiceQuantity,
    addLink,
    removeLink,
    updateLink,
    addAttachedFiles,
    removeAttachedFile,
    resetForm,
  } = useOpportunityFormStore();

  const {
    name,
    description,
    field,
    expectedRevenue,
    budget,
    startDate,
    endDate,
    durationMonths,
    selectedRegions,
    priority,
    successChance,
    packages,
    services,
    customerRequirements,
    links,
    attachedFiles,
  } = formData;

  // Opportunity Name Parts State (chuẩn Web: 3 ô ghép)
  const [nameParts, setNameParts] = useState({
    customerName: '',
    brandName: '',
    monthYear: '',
  });

  // Refs cho việc nhảy tự động giữa các ô nhập liệu khi nhấn Hoàn tất/Next
  const brandNameRef = useRef<TextInput>(null);
  const monthYearRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);

  // Auto-combine: customerName_brandName_MM/YY
  const opportunityName = useMemo(() => {
    const { customerName, brandName, monthYear } = nameParts;
    return [customerName.trim(), brandName.trim(), monthYear.trim()].filter(Boolean).join('_');
  }, [nameParts]);

  // Sync opportunityName vào store
  useEffect(() => {
    updateField('name', opportunityName);
  }, [opportunityName]);

  // Convenience Setters
  const setDescription = (val: string) => updateField('description', val);
  const setField = (val: string) => updateField('field', val);
  const setExpectedRevenue = (val: number | string) =>
    updateField('expectedRevenue', typeof val === 'number' ? val : parseNumberInput(val));
  const setBudget = (val: number | string) =>
    updateField('budget', typeof val === 'number' ? val : parseNumberInput(val));
  const setStartDate = (val: string) => updateField('startDate', val);
  const setEndDate = (val: string) => updateField('endDate', val);
  const setDurationMonths = (val: number | string) =>
    updateField('durationMonths', typeof val === 'number' ? val : (parseInt(String(val), 10) || 1));
  const setPriority = (val: string) => updateField('priority', val);
  const setSuccessChance = (val: number) => updateField('successChance', val);
  const setCustomerRequirements = (val: string) => updateField('customerRequirements', val);

  // Metadata catalogs via TanStack Query
  const { data: rawServ, isLoading: isLoadingServices } = useAvailableServicesQuery();
  const { data: rawPkg, isLoading: isLoadingPackages } = useServicePackagesQuery();

  const availableServices = useMemo<Array<{ id: string; name: string; costPrice?: number }>>(() => {
    if (!rawServ) return [];
    return Array.isArray(rawServ) ? rawServ : (rawServ as any)?.data && Array.isArray((rawServ as any).data) ? (rawServ as any).data : [];
  }, [rawServ]);

  const availablePackages = useMemo<Array<any>>(() => {
    if (!rawPkg) return [];
    return Array.isArray(rawPkg) ? rawPkg : (rawPkg as any)?.data && Array.isArray((rawPkg as any).data) ? (rawPkg as any).data : [];
  }, [rawPkg]);

  const isLoadingMeta = isLoadingServices || isLoadingPackages;
  const createOpportunityMutation = useCreateOpportunityMutation();

  // UI Selection Modals State
  const [isFieldModalVisible, setIsFieldModalVisible] = useState(false);
  const [isRegionModalVisible, setIsRegionModalVisible] = useState(false);
  const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'end' | null>(null);
  const [activePackageIndex, setActivePackageIndex] = useState<number | null>(null);
  const [activeServiceIndex, setActiveServiceIndex] = useState<number | null>(null);

  const autoSaveTimerRef = useRef<any>(null);

  // Keyboard Visibility Detection for Seamless Layout Adjustments
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Immediate Real-Time Date Validation & Duration Auto-Calculation
  useEffect(() => {
    // If either date is empty or incomplete
    if (!startDate && !endDate) {
      setDateError('');
      setDurationMonths(1);
      return;
    }

    const isStartComplete = startDate.length === 10;
    const isEndComplete = endDate.length === 10;

    const startValid = isStartComplete ? validateDateString(startDate) : false;
    const endValid = isEndComplete ? validateDateString(endDate) : false;

    if (isStartComplete && !startValid) {
      setDateError('Ngày bắt đầu không hợp lệ (DD/MM/YYYY)');
      return;
    }

    if (isEndComplete && !endValid) {
      setDateError('Ngày kết thúc không hợp lệ (DD/MM/YYYY)');
      return;
    }

    if (startValid && endValid) {
      const pStart = parseDateObj(startDate)!;
      const pEnd = parseDateObj(endDate)!;

      if (pEnd < pStart) {
        setDateError('Ngày kết thúc phải sau ngày dự kiến bắt đầu');
        setDurationMonths(1);
      } else {
        setDateError('');
        const months = calculateDurationMonths(startDate, endDate);
        setDurationMonths(months < 1 ? 1 : months);
      }
    } else {
      setDateError('');
      if (!durationMonths) {
        setDurationMonths(1);
      }
    }
  }, [startDate, endDate]);

  // Reset form if opening clean (not in draft mode)
  useEffect(() => {
    if (mode !== 'draft') {
      resetForm();
    }
  }, [mode]);

  // Auto-restore draft if opened in draft mode (?mode=draft)
  useEffect(() => {
    const restoreDraftIfRequested = async () => {
      if (mode === 'draft') {
        try {
          const savedDraft = await AsyncStorage.getItem(STORAGE_DRAFT_KEY);
          if (savedDraft) {
            const d = JSON.parse(savedDraft);
            updateFormData({
              ...d,
              expectedRevenue: typeof d.expectedRevenue === 'number' ? d.expectedRevenue : parseNumberInput(d.expectedRevenue),
              budget: typeof d.budget === 'number' ? d.budget : parseNumberInput(d.budget),
              startDate: d.startDate ? toDisplayDate(d.startDate) : '',
              endDate: d.endDate ? toDisplayDate(d.endDate) : '',
              durationMonths: Number(d.durationMonths) || 1,
              successChance: Number(d.successChance) || 0,
            });

            if (d.savedAt) {
              const rawStr = String(d.savedAt).trim();
              if (/^\d{1,2}:\d{2}$/.test(rawStr)) {
                setLastSavedTime(rawStr);
              } else {
                const dTime = new Date(rawStr);
                if (!isNaN(dTime.getTime())) {
                  setLastSavedTime(
                    `${dTime.getHours().toString().padStart(2, '0')}:${dTime.getMinutes().toString().padStart(2, '0')}`
                  );
                } else {
                  setLastSavedTime('Gần đây');
                }
              }
            }
          }
        } catch {
          // Ignore
        }
      }
    };

    restoreDraftIfRequested();
  }, [mode]);

  // Auto-Save Debounce Effect
  useEffect(() => {
    if (!name && !description && attachedFiles.length === 0) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      const draftData = {
        ...formData,
        savedAt: new Date().toISOString(),
      };

      try {
        await AsyncStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(draftData));
        const now = new Date();
        setLastSavedTime(
          `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
        );
      } catch {
        // Ignore auto-save error
      }
    }, 800);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formData]);

  // Packages Management
  const handleAddPackage = () => addPackage();

  const handleRemovePackage = (index: number) => removePackage(index);

  const handleSelectPackageTemplate = (index: number, templateId: string) => {
    const template = availablePackages.find((t) => String(t.id) === String(templateId));
    selectPackageTemplate(index, template);
    setActivePackageIndex(null);
  };

  const handlePackageQuantityChange = (index: number, qty: number) => {
    setPackageQuantity(index, Math.max(1, qty));
  };

  // Services Management
  const handleAddService = () => addService();

  const handleRemoveService = (index: number) => removeService(index);

  const handleSelectServiceItem = (index: number, serviceId: string) => {
    selectServiceItem(index, serviceId);
    setActiveServiceIndex(null);
  };

  const handleServiceQuantityChange = (index: number, qty: number) => {
    setServiceQuantity(index, Math.max(1, qty));
  };

  // Total Cost Calculation (Tổng giá vốn của các dịch vụ đã chọn)
  const totalServicesCost = useMemo(() => {
    const standaloneCost = services.reduce((total, item) => {
      if (!item.serviceId) return total;
      const found = availableServices.find((s) => String(s.id) === String(item.serviceId));
      return total + (found?.costPrice || 0) * (item.quantity || 1);
    }, 0);

    const packagesCost = packages.reduce((total, pkg) => {
      const pkgQty = Number(pkg.quantity) || 1;
      const pkgServicesTotal = (pkg.services || []).reduce((pSum, s) => {
        return pSum + (s.sellingPrice || 0) * (s.quantity || 1) * pkgQty;
      }, 0);
      return total + pkgServicesTotal;
    }, 0);

    return standaloneCost + packagesCost;
  }, [services, packages, availableServices]);

  // Links Management
  const handleAddLink = () => addLink();

  const handleRemoveLink = (index: number) => removeLink(index);

  const handleUpdateLink = (index: number, value: string) => updateLink(index, value);

  // Region Toggle
  const handleToggleRegion = (reg: string) => toggleRegion(reg);

  // Document Picker
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (attachedFiles.length + result.assets.length > 5) {
          Alert.alert('Giới hạn', 'Bạn chỉ có thể đính kèm tối đa 5 tệp tin.');
          return;
        }

        const newFiles: AttachedFile[] = result.assets.map((asset) => ({
          name: asset.name,
          size: asset.size,
          uri: asset.uri,
          mimeType: asset.mimeType,
        }));
        addAttachedFiles(newFiles);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở trình chọn tệp.');
    }
  };

  const handleRemoveFile = (index: number) => removeAttachedFile(index);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!nameParts.customerName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên khách hàng.');
      return;
    }
    if (!nameParts.brandName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên Brand.');
      return;
    }
    const monthYearNorm = nameParts.monthYear.trim();
    const monthYearMatch = monthYearNorm.match(/^(\d{2})\/(\d{2})$/);
    const monthVal = monthYearMatch ? Number(monthYearMatch[1]) : 0;
    if (!monthYearNorm) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tháng/năm (MM/YY).');
      return;
    }
    if (!monthYearMatch || monthVal < 1 || monthVal > 12) {
      Alert.alert('Sai định dạng', 'Tháng/năm phải có định dạng MM/YY, ví dụ 09/26.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập mô tả chi tiết về cơ hội.');
      return;
    }

    if (!field) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn lĩnh vực cho cơ hội.');
      return;
    }

    const expRevNum = Number(expectedRevenue) || 0;
    if (expRevNum <= 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập Doanh thu kỳ vọng lớn hơn 0 VNĐ.');
      return;
    }

    const budgetNum = Number(budget) || 0;
    if (budgetNum <= 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập Ngân sách dự kiến lớn hơn 0 VNĐ.');
      return;
    }

    const successChanceNum = Number(successChance) || 0;
    if (successChanceNum <= 0) {
      Alert.alert('Thiếu thông tin', 'Tỉ lệ thành công phải lớn hơn 0%.');
      return;
    }

    if (!startDate || startDate.length !== 10 || !validateDateString(startDate)) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ và đúng định dạng ngày dự kiến bắt đầu (DD/MM/YYYY).');
      return;
    }

    if (!endDate || endDate.length !== 10 || !validateDateString(endDate)) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ và đúng định dạng ngày dự kiến kết thúc (DD/MM/YYYY).');
      return;
    }

    if (dateError) {
      Alert.alert('Lỗi ngày tháng', dateError);
      return;
    }

    setIsSubmitting(true);
    try {
      const validServices = services
        .filter((s) => s.serviceId && s.quantity > 0)
        .map((s) => ({
          id: s.serviceId,
          quantity: Number(s.quantity) || 1,
        }));

      const validPackages = packages
        .filter((pkg) => pkg.servicePackageId)
        .map((pkg) => ({
          servicePackageId: pkg.servicePackageId,
          name: pkg.name,
          description: pkg.description,
          quantity: Number(pkg.quantity) || 1,
          services: (pkg.services || []).map((s) => ({
            serviceId: s.serviceId,
            quantity: Number(s.quantity) || 1,
            sellingPrice: s.sellingPrice,
          })),
        }));

      if (validServices.length === 0 && validPackages.length === 0) {
        Alert.alert('Thiếu thông tin', 'Vui lòng chọn ít nhất 1 dịch vụ lẻ hoặc 1 gói dịch vụ.');
        setIsSubmitting(false);
        return;
      }

      const rawLinks = links.map((l) => l.trim()).filter((l) => l.length > 0);
      for (const linkItem of rawLinks) {
        if (!isValidUrl(linkItem)) {
          Alert.alert(
            'Sai định dạng liên kết',
            `Đường dẫn "${linkItem}" không đúng định dạng. Vui lòng kiểm tra lại (Ví dụ: google.com hoặc https://example.com).`
          );
          setIsSubmitting(false);
          return;
        }
      }
      const validLinks = rawLinks.map((l) => normalizeUrl(l));

      const payload: CreateOpportunityPayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        field: field || undefined,
        priority: priority,
        successChance: Number(successChance) || 0,
        expectedRevenue: Number(expectedRevenue) || 0,
        budget: Number(budget) || 0,
        startDate: toISODate(startDate),
        endDate: toISODate(endDate),
        durationMonths: Number(durationMonths) || 1,
        region: selectedRegions.length > 0 ? selectedRegions : undefined,
        customerRequirements: customerRequirements.trim() || undefined,
        links: validLinks.length > 0 ? validLinks : undefined,
        services: validServices.length > 0 ? validServices : undefined,
        packages: validPackages.length > 0 ? validPackages : undefined,
      };

      const resData = await createOpportunityMutation.mutateAsync(payload);
      await AsyncStorage.removeItem(STORAGE_DRAFT_KEY);
      resetForm();

      Alert.alert('Thành công', 'Đã tạo cơ hội kinh doanh mới thành công!', [
        {
          text: 'Xem chi tiết',
          onPress: () => {
            if (resData?.id) {
              router.replace(`/opportunities/${resData.id}`);
            } else {
              router.replace('/opportunities');
            }
          },
        },
          {
            text: 'Về trang chủ',
            style: 'cancel',
            onPress: () => router.replace('/'),
          },
        ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể tạo cơ hội kinh doanh.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSaveDraft = async () => {
    const draftData = {
      ...formData,
      savedAt: new Date().toISOString(),
    };

    try {
      await AsyncStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(draftData));
      const now = new Date();
      setLastSavedTime(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      );
      router.back();
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu bản nháp.');
    }
  };

  const selectedFieldLabel = useMemo(() => {
    const found = FIELDS.find((f) => f.value === field);
    return found ? found.label : '-- Chọn lĩnh vực --';
  }, [field]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={[styles.topHeaderInner, isTablet && { maxWidth: 760, alignSelf: 'center', width: '100%' }]}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="x" size={20} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>
              {mode === 'draft' ? 'Chỉnh Sửa Bản Nháp' : 'Tạo Cơ Hội Mới'}
            </Text>
            <View style={styles.saveStatusRow}>
              {lastSavedTime ? (
                <View style={styles.cloudBadge}>
                  <Feather name="cloud" size={11} color="#059669" />
                  <Text style={styles.cloudBadgeText}>Đã lưu {lastSavedTime}</Text>
                </View>
              ) : (
                <Text style={styles.headerSub}>
                  {mode === 'draft' ? 'Chỉnh sửa thông tin bản nháp' : 'Điền thông tin chi tiết của cơ hội'}
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerSaveDraftBtn}
            onPress={handleManualSaveDraft}
            activeOpacity={0.7}
          >
            <Feather name="save" size={15} color={BrandColors.primary} />
            <Text style={styles.headerSaveDraftText}>Lưu nháp</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          isSmallScreen && { padding: 12, gap: 10 },
          isTablet && { maxWidth: 760, alignSelf: 'center', width: '100%' },
          { paddingBottom: isKeyboardVisible ? 100 : 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === 'ios' ? 70 : 100}
        extraHeight={100}
      >
          {/* 1. THÔNG TIN CƠ BẢN */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[styles.sectionNumberText, { color: '#2563EB' }]}>1</Text>
              </View>
              <View>
                <Text style={styles.cardSectionTitle}>Thông tin cơ bản</Text>
                <Text style={styles.cardSectionSub}>Tên cơ hội, mô tả và lĩnh vực kinh doanh</Text>
              </View>
            </View>

            {/* Tên cơ hội: 3 ô ghép chuẩn Web (customerName + brandName + MM/YY) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Tên cơ hội<Text style={styles.reqStar}>*</Text>
              </Text>

              {/* Preview tên cơ hội kết hợp */}
              {opportunityName.length > 0 && (
                <View style={styles.namePreviewBox}>
                  <Feather name="tag" size={13} color="#2563EB" />
                  <Text style={styles.namePreviewText} numberOfLines={1}>
                    {opportunityName}
                  </Text>
                </View>
              )}

              {/* Row 1: Tên khách hàng */}
              <View style={styles.namePartGroup}>
                <Text style={styles.namePartLabel}>Tên khách hàng <Text style={styles.reqStar}>*</Text></Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="VD: Công ty ABC"
                  placeholderTextColor="#94A3B8"
                  returnKeyType="next"
                  onSubmitEditing={() => brandNameRef.current?.focus()}
                  blurOnSubmit={false}
                  value={nameParts.customerName}
                  onChangeText={(v) => setNameParts((prev) => ({ ...prev, customerName: v }))}
                />
              </View>

              {/* Row 2: Tên Brand + MM/YY cạnh nhau */}
              <View style={styles.namePartsRow}>
                <View style={[styles.namePartGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.namePartLabel}>Tên Brand <Text style={styles.reqStar}>*</Text></Text>
                  <TextInput
                    ref={brandNameRef}
                    style={styles.textInput}
                    placeholder="VD: GETVINI"
                    placeholderTextColor="#94A3B8"
                    returnKeyType="next"
                    onSubmitEditing={() => monthYearRef.current?.focus()}
                    blurOnSubmit={false}
                    value={nameParts.brandName}
                    onChangeText={(v) => setNameParts((prev) => ({ ...prev, brandName: v }))}
                  />
                </View>

                <View style={[styles.namePartGroup, { width: 100 }]}>
                  <Text style={styles.namePartLabel}>Tháng/Năm <Text style={styles.reqStar}>*</Text></Text>
                  <TextInput
                    ref={monthYearRef}
                    style={styles.textInput}
                    placeholder="mm/yy"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    maxLength={5}
                    returnKeyType="next"
                    onSubmitEditing={() => descriptionRef.current?.focus()}
                    blurOnSubmit={false}
                    value={nameParts.monthYear}
                    onChangeText={(v) =>
                      setNameParts((prev) => ({ ...prev, monthYear: formatMonthYear(v, prev.monthYear) }))
                    }
                  />
                </View>
              </View>
            </View>

            {/* Mô tả chi tiết (Nằm trên Lĩnh vực) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Mô tả <Text style={styles.reqStar}>*</Text>
              </Text>
              <TextInput
                ref={descriptionRef}
                style={[styles.textInput, styles.textArea]}
                placeholder="Mô tả chi tiết về cơ hội..."
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={200}
                textAlignVertical="top"
              />
              <View style={styles.charCountRow}>
                <Text
                  style={[
                    styles.charCountText,
                    {
                      color: description.length > 180 ? '#F97316' : '#94A3B8',
                    },
                  ]}
                >
                  {description.length}/200
                </Text>
              </View>
            </View>

            {/* Lĩnh vực */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Lĩnh vực <Text style={styles.reqStar}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.selectDropdownBtn}
                onPress={() => setIsFieldModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.selectDropdownBtnText,
                    !field && styles.selectDropdownBtnPlaceholder,
                  ]}
                >
                  {selectedFieldLabel}
                </Text>
                <Feather name="chevron-down" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. THÔNG TIN TÀI CHÍNH */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.sectionNumberText, { color: '#D97706' }]}>2</Text>
              </View>
              <View>
                <Text style={styles.cardSectionTitle}>Thông tin tài chính</Text>
                <Text style={styles.cardSectionSub}>Kỳ vọng doanh thu và ngân sách dự kiến</Text>
              </View>
            </View>

            {/* Doanh thu & Ngân sách */}
            <View style={[styles.inputRow, isSmallScreen && styles.inputRowSmall]}>
              <View style={[styles.inputGroup, isSmallScreen ? styles.inputColFull : styles.inputColHalfLeft]}>
                <Text style={styles.inputLabel}>
                  Doanh thu kỳ vọng <Text style={styles.reqStar}>*</Text> <Text style={styles.inputLabelSub}>(giá muốn bán cho khách)</Text>
                </Text>
                <View style={styles.currencyInputWrap}>
                  <TextInput
                    style={styles.currencyTextInput}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={expectedRevenue ? formatNumberInput(expectedRevenue) : '0'}
                    onChangeText={(val) => setExpectedRevenue(parseNumberInput(val))}
                  />
                  <Text style={styles.currencySuffix}>VNĐ</Text>
                </View>
              </View>

              <View style={[styles.inputGroup, isSmallScreen ? styles.inputColFull : styles.inputColHalfRight]}>
                <Text style={styles.inputLabel}>
                  Ngân sách dự kiến <Text style={styles.reqStar}>*</Text> <Text style={styles.inputLabelSub}>(ngân sách của khách đề xuất)</Text>
                </Text>
                <View style={styles.currencyInputWrap}>
                  <TextInput
                    style={styles.currencyTextInput}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={budget ? formatNumberInput(budget) : '0'}
                    onChangeText={(val) => setBudget(parseNumberInput(val))}
                  />
                  <Text style={styles.currencySuffix}>VNĐ</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 3. THỜI GIAN & ĐỊA ĐIỂM */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#F3E8FF' }]}>
                <Text style={[styles.sectionNumberText, { color: '#9333EA' }]}>3</Text>
              </View>
              <View>
                <Text style={styles.cardSectionTitle}>Thời gian & Địa điểm</Text>
                <Text style={styles.cardSectionSub}>Lịch trình dự kiến và phạm vi địa lý triển khai</Text>
              </View>
            </View>

            {/* Ngày bắt đầu & Ngày kết thúc */}
            <View style={[styles.inputRow, isSmallScreen && styles.inputRowSmall]}>
              <View style={[styles.inputGroup, isSmallScreen ? styles.inputColFull : styles.inputColHalfLeft]}>
                <Text style={styles.inputLabel}>
                  Dự kiến bắt đầu <Text style={styles.reqStar}>*</Text>
                </Text>
                <View style={styles.dateInputWrap}>
                  <TouchableOpacity
                    onPress={() => setActiveDatePicker('start')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="calendar" size={16} color="#2563EB" style={styles.dateIcon} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.dateTextInput}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    maxLength={10}
                    value={startDate}
                    onChangeText={(val) => setStartDate(formatDateInputMask(val))}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, isSmallScreen ? styles.inputColFull : styles.inputColHalfRight]}>
                <Text style={styles.inputLabel}>
                  Dự kiến kết thúc <Text style={styles.reqStar}>*</Text>
                </Text>
                <View style={styles.dateInputWrap}>
                  <TouchableOpacity
                    onPress={() => setActiveDatePicker('end')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="calendar" size={16} color="#2563EB" style={styles.dateIcon} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.dateTextInput}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    maxLength={10}
                    value={endDate}
                    onChangeText={(val) => setEndDate(formatDateInputMask(val))}
                  />
                </View>
              </View>
            </View>

            {/* Immediate Validation Error Message */}
            {dateError ? (
              <View style={styles.dateErrorBox}>
                <Feather name="alert-circle" size={14} color="#EF4444" />
                <Text style={styles.dateErrorText}>{dateError}</Text>
              </View>
            ) : null}

            {/* Địa điểm triển khai (Multi select) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelWithBadgeRow}>
                <Text style={styles.inputLabel}>Địa điểm triển khai</Text>
                <TouchableOpacity
                  onPress={() => setIsRegionModalVisible(true)}
                  style={styles.textActionLink}
                >
                  <Text style={styles.textActionLinkText}>Chọn tỉnh thành</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.selectDropdownBtn}
                onPress={() => setIsRegionModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.selectDropdownBtnText,
                    selectedRegions.length === 0 && styles.selectDropdownBtnPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selectedRegions.length > 0
                    ? `Đã chọn: ${selectedRegions.join(', ')}`
                    : 'Chọn tỉnh thành (có thể chọn nhiều)...'}
                </Text>
                <Feather name="map-pin" size={16} color="#64748B" />
              </TouchableOpacity>

              {/* Quick selected chips */}
              {selectedRegions.length > 0 && (
                <View style={styles.selectedTagsWrap}>
                  {selectedRegions.map((reg) => (
                    <View key={reg} style={styles.selectedTag}>
                      <Text style={styles.selectedTagText}>{reg}</Text>
                      <TouchableOpacity
                        onPress={() => handleToggleRegion(reg)}
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      >
                        <Feather name="x" size={12} color="#475569" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Số tháng triển khai (Tự động tính, mặc định 1, nếu <1 thì là 1, không cho sửa) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelWithBadgeRow}>
                <Text style={styles.inputLabel}>Số tháng triển khai</Text>
              </View>
              <View style={styles.readOnlyInputWrap}>
                <Text style={styles.readOnlyInputText}>
                  {durationMonths && durationMonths > 0
                    ? `${durationMonths} Tháng`
                    : '1 Tháng'}
                </Text>
              </View>
            </View>
          </View>

          {/* 4. ĐÁNH GIÁ CƠ HỘI */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#FDF2F8' }]}>
                <Text style={[styles.sectionNumberText, { color: '#DB2777' }]}>4</Text>
              </View>
              <View>
                <Text style={styles.cardSectionTitle}>Đánh giá cơ hội</Text>
                <Text style={styles.cardSectionSub}>Mức độ ưu tiên và tỷ lệ thành công dự kiến</Text>
              </View>
            </View>

            {/* Độ ưu tiên */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Độ ưu tiên</Text>
              <View style={[styles.prioritiesRow, isSmallScreen && { gap: 4 }]}>
                {PRIORITIES.map((p) => {
                  const isSelected = priority.toLowerCase() === p.id.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.priorityBtn,
                        isSmallScreen && { paddingVertical: 8, paddingHorizontal: 4, gap: 4 },
                        isSelected && {
                          borderColor: p.color,
                          backgroundColor: `${p.color}15`,
                        },
                      ]}
                      onPress={() => setPriority(p.id)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.priorityDot,
                          { backgroundColor: p.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.priorityBtnText,
                          isSmallScreen && { fontSize: 12 },
                          isSelected && {
                            color: p.color,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Khả năng thành công: Thanh trượt cảm ứng 0% - 35% - 100% */}
            <SuccessChanceSlider
              value={successChance}
              onChange={setSuccessChance}
            />
          </View>

          {/* 5. DỊCH VỤ ĐỀ XUẤT (100% Khớp với Web UI & Ảnh người dùng) */}
          <View style={styles.sectionCard}>
            <View style={styles.servicesHeaderTop}>
              <View style={styles.servicesHeaderLeft}>
                <View style={styles.servicesHeaderIconBox}>
                  <Feather name="briefcase" size={18} color="#6366F1" />
                </View>
                <Text style={styles.cardSectionTitle}>
                  Dịch vụ đề xuất <Text style={styles.reqStar}>*</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addPrimaryTextBtn}
                onPress={handleAddPackage}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={14} color="#2563EB" />
                <Text style={styles.addPrimaryTextBtnText}>Gói dịch vụ</Text>
              </TouchableOpacity>
            </View>

            {/* A. GÓI DỊCH VỤ ĐỀ XUẤT */}
            <View style={styles.servicesSubSection}>
              <Text style={styles.sectionCategoryLabel}>GÓI DỊCH VỤ ĐỀ XUẤT</Text>

              {packages.map((pkg, idx) => {
                const selectedPkg = availablePackages.find((p) => String(p.id) === String(pkg.servicePackageId));
                
                // If package not chosen yet: render clean select box with trash icon (like screenshot)
                if (!pkg.servicePackageId) {
                  return (
                    <View key={idx} style={styles.packageEmptyRow}>
                      <TouchableOpacity
                        style={styles.packageSelectBoxEmpty}
                        onPress={() => setActivePackageIndex(idx)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.packageSelectPlaceholderBold}>-- Chọn gói dịch vụ --</Text>
                        <Feather name="chevron-down" size={18} color="#1E3A8A" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.rowTrashBtn}
                        onPress={() => handleRemovePackage(idx)}
                        activeOpacity={0.7}
                      >
                        <Feather name="trash-2" size={18} color="#F87171" />
                      </TouchableOpacity>
                    </View>
                  );
                }

                // If package chosen: render PackageItem card matching Web
                return (
                  <View key={idx} style={styles.packageCardItem}>
                    <View style={styles.packageCardTop}>
                      <View style={styles.packageCardLeft}>
                        <View style={styles.pkgBriefcaseIcon}>
                          <Feather name="briefcase" size={18} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.packageNameTitle}>{selectedPkg?.name || 'Gói dịch vụ'}</Text>
                          <Text style={styles.packageSubBadge}>GÓI DỊCH VỤ</Text>
                        </View>
                      </View>

                      <View style={styles.packageCardRight}>
                        <View style={styles.quantityBoxSmall}>
                          <TextInput
                            style={styles.quantityInputSmall}
                            keyboardType="numeric"
                            value={formatNumberInput(String(pkg.quantity))}
                            onChangeText={(txt) => handlePackageQuantityChange(idx, parseNumberInput(txt) || 1)}
                          />
                        </View>

                        <TouchableOpacity
                          style={styles.rowTrashBtn}
                          onPress={() => handleRemovePackage(idx)}
                          activeOpacity={0.7}
                        >
                          <Feather name="trash-2" size={18} color="#F87171" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {selectedPkg?.items && selectedPkg.items.length > 0 && (
                      <View style={styles.packageItemsPreview}>
                        <View style={styles.packageItemsHeaderRow}>
                          <Feather name="layers" size={13} color="#2563EB" />
                          <Text style={styles.packageItemsTitle}>
                            Bao gồm {selectedPkg.items.length} dịch vụ thành phần:
                          </Text>
                        </View>
                        {selectedPkg.items.map((pi: any, piIdx: number) => {
                          const cost = pi.service?.costPrice || 0;
                          const qty = pi.defaultQuantity || 1;
                          const isLast = piIdx === selectedPkg.items.length - 1;
                          return (
                            <View
                              key={piIdx}
                              style={[
                                styles.packageItemRow,
                                isLast && styles.packageItemRowLast,
                              ]}
                            >
                              <View style={styles.packageItemLeftCol}>
                                <Text style={styles.packageItemRowBullet}>•</Text>
                                <Text style={styles.packageItemRowName} numberOfLines={1}>
                                  {pi.service?.name || pi.serviceName || 'Dịch vụ thành phần'}
                                </Text>
                              </View>
                              <View style={styles.packageItemRightCol}>
                                <View style={styles.packageItemQtyBadge}>
                                  <Text style={styles.packageItemQtyText}>x{formatQuantity(qty)}</Text>
                                </View>
                                {cost > 0 && (
                                  <Text style={styles.packageItemRowCost}>
                                    {formatVND(cost)}
                                  </Text>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* B. DỊCH VỤ LẺ */}
            <View style={[styles.servicesSubSection, { marginTop: 16 }]}>
              <View style={styles.serviceCategoryHeader}>
                <Text style={styles.sectionCategoryLabel}>DỊCH VỤ LẺ</Text>
                <TouchableOpacity
                  style={styles.addPrimaryTextBtn}
                  onPress={handleAddService}
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={14} color="#6366F1" />
                  <Text style={[styles.addPrimaryTextBtnText, { color: '#6366F1' }]}>Dịch vụ lẻ</Text>
                </TouchableOpacity>
              </View>

              {services.map((row, idx) => {
                const selectedServ = availableServices.find((s) => String(s.id) === String(row.serviceId));
                return (
                  <View key={idx} style={styles.standaloneServiceRow}>
                    <TouchableOpacity
                      style={styles.serviceSelectBox}
                      onPress={() => setActiveServiceIndex(idx)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.serviceSelectText,
                          !row.serviceId && styles.serviceSelectPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {selectedServ ? selectedServ.name : '-- Chọn dịch vụ --'}
                      </Text>
                      <Feather name="chevron-down" size={16} color="#64748B" />
                    </TouchableOpacity>

                    <View style={styles.quantityBoxSmall}>
                      <TextInput
                        style={styles.quantityInputSmall}
                        keyboardType="numeric"
                        value={formatNumberInput(String(row.quantity))}
                        onChangeText={(txt) => handleServiceQuantityChange(idx, parseNumberInput(txt) || 1)}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.rowTrashBtn}
                      onPress={() => handleRemoveService(idx)}
                      activeOpacity={0.7}
                    >
                      <Feather name="trash-2" size={18} color="#F87171" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* C. TỔNG GIÁ VỐN GRADIENT BANNER (Y chang bên Web) */}
            <View style={[styles.totalCostGradientBanner, isSmallScreen && styles.totalCostGradientBannerSmall]}>
              <Text style={styles.totalCostGradientLabel}>
                Tổng giá vốn của các dịch vụ đã chọn:
              </Text>
              <Text style={[styles.totalCostGradientValue, isSmallScreen && { fontSize: 17, marginTop: 4 }]}>
                {formatVNDFull(totalServicesCost)}
              </Text>
            </View>
          </View>

          {/* 6. YÊU CẦU & TÀI LIỆU */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionNumberCircle, { backgroundColor: '#EDE9FE' }]}>
                <Text style={[styles.sectionNumberText, { color: '#7C3AED' }]}>6</Text>
              </View>
              <View>
                <Text style={styles.cardSectionTitle}>Yêu cầu & Tài liệu</Text>
                <Text style={styles.cardSectionSub}>Tài liệu mô tả yêu cầu khách hàng & tệp đính kèm</Text>
              </View>
            </View>

            {/* Tài liệu mô tả yêu cầu khách hàng */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tài liệu mô tả yêu cầu khách hàng</Text>
            </View>

            {/* Link tài liệu tham khảo */}
            <View style={styles.subBlockHeaderRow}>
              <Text style={styles.subBlockTitle}>Link tài liệu tham khảo</Text>
              <TouchableOpacity
                style={styles.addSmallBtn}
                onPress={handleAddLink}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={14} color={BrandColors.primary} />
                <Text style={styles.addSmallBtnText}>Thêm link</Text>
              </TouchableOpacity>
            </View>

            {links.map((linkVal, idx) => {
              const placeholder = DEFAULT_LINK_PLACEHOLDERS[idx % DEFAULT_LINK_PLACEHOLDERS.length];
              return (
                <View key={idx} style={styles.linkRowItem}>
                  <Feather name="link-2" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder={placeholder}
                    placeholderTextColor="#94A3B8"
                    value={linkVal}
                    onChangeText={(t) => handleUpdateLink(idx, t)}
                    autoCapitalize="none"
                  />
                  {links.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeLinkBtn}
                      onPress={() => handleRemoveLink(idx)}
                    >
                      <Feather name="x" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {/* Tệp đính kèm */}
            <View style={[styles.subBlockHeaderRow, { marginTop: 18 }]}>
              <Text style={styles.subBlockTitle}>
                Tệp đính kèm ({attachedFiles.length}/5)
              </Text>
              <TouchableOpacity
                style={styles.uploadDocBtn}
                onPress={handlePickDocument}
                activeOpacity={0.8}
              >
                <Feather name="paperclip" size={14} color="#FFFFFF" />
                <Text style={styles.uploadDocBtnText}>Chọn tệp từ máy</Text>
              </TouchableOpacity>
            </View>

            {attachedFiles.length > 0 ? (
              <View style={styles.fileListContainer}>
                {attachedFiles.map((file, idx) => (
                  <View key={idx} style={styles.fileItemRow}>
                    <View style={styles.fileIconBox}>
                      <Feather name="file" size={16} color={BrandColors.primary} />
                    </View>
                    <View style={styles.fileMetaCol}>
                      <Text style={styles.fileNameText} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={styles.fileSizeText}>
                        {formatFileSize(file.size)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.fileDeleteBtn}
                      onPress={() => handleRemoveFile(idx)}
                      activeOpacity={0.7}
                    >
                      <Feather name="trash-2" size={15} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.emptyUploadBox}
                onPress={handlePickDocument}
                activeOpacity={0.7}
              >
                <Feather name="upload-cloud" size={24} color="#94A3B8" />
                <Text style={styles.emptyUploadTitle}>Kéo thả file hoặc click để chọn</Text>
                <Text style={styles.emptyUploadSub}>
                  Tối đa 5 file, tổng dung lượng 25MB{'\n'}PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 60 }} />
        </KeyboardAwareScrollView>

        {/* Fixed Sticky Action Bar at Bottom */}
        <View
          style={[
            styles.bottomBarContainer,
            {
              paddingBottom: isKeyboardVisible ? 8 : Math.max(12, insets.bottom),
              paddingTop: isKeyboardVisible ? 8 : 12,
            },
          ]}
        >
          <View style={[styles.bottomBarInner, isTablet && { maxWidth: 760, alignSelf: 'center', width: '100%' }]}>
            {isKeyboardVisible && (
              <TouchableOpacity
                style={styles.keyboardDismissBtn}
                onPress={() => Keyboard.dismiss()}
                activeOpacity={0.7}
              >
                <Feather name="chevron-down" size={16} color="#475569" />
                <Text style={styles.keyboardDismissBtnText}>Ẩn phím</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.saveDraftBottomBtn}
              onPress={handleManualSaveDraft}
              activeOpacity={0.8}
            >
              <Feather name="save" size={16} color="#475569" />
              <Text style={styles.saveDraftBottomText}>Lưu nháp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitActionBtn, isSubmitting && styles.submitActionBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="check-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.submitActionBtnText}>Tạo Cơ Hội</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

      {/* Embedded Calendar Picker Modal */}
      <CalendarPickerModal
        visible={activeDatePicker !== null}
        title={activeDatePicker === 'start' ? 'Chọn ngày dự kiến bắt đầu' : 'Chọn ngày dự kiến kết thúc'}
        currentDateStr={activeDatePicker === 'start' ? startDate : endDate}
        onSelectDate={(selectedStr) => {
          if (activeDatePicker === 'start') {
            setStartDate(selectedStr);
          } else {
            setEndDate(selectedStr);
          }
        }}
        onClose={() => setActiveDatePicker(null)}
      />

      {/* Field Selection Modal */}
      <Modal
        visible={isFieldModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFieldModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.pickerModalContainer,
              {
                width: isTablet ? 520 : Math.min(width * 0.94, 420),
                maxHeight: isLandscape ? height * 0.88 : '80%',
              },
            ]}
          >
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Chọn lĩnh vực kinh doanh</Text>
              <TouchableOpacity
                onPress={() => setIsFieldModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pickerModalList}>
              {FIELDS.map((f) => {
                const isSelected = field === f.value;
                return (
                  <TouchableOpacity
                    key={f.value}
                    style={[styles.pickerOptionItem, isSelected && styles.pickerOptionItemActive]}
                    onPress={() => {
                      setField(f.value);
                      setIsFieldModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        isSelected && styles.pickerOptionTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                    {isSelected && <Feather name="check" size={16} color="#2563EB" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Region Selection Modal */}
      <Modal
        visible={isRegionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRegionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.pickerModalContainer,
              {
                width: isTablet ? 520 : Math.min(width * 0.94, 420),
                maxHeight: isLandscape ? height * 0.88 : '80%',
              },
            ]}
          >
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Chọn địa điểm triển khai</Text>
              <TouchableOpacity
                onPress={() => setIsRegionModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pickerModalList}>
              {PROVINCES_LIST.map((reg) => {
                const isSelected = selectedRegions.includes(reg);
                return (
                  <TouchableOpacity
                    key={reg}
                    style={[styles.pickerOptionItem, isSelected && styles.pickerOptionItemActive]}
                    onPress={() => handleToggleRegion(reg)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        isSelected && styles.pickerOptionTextActive,
                      ]}
                    >
                      {reg}
                    </Text>
                    {isSelected && <Feather name="check" size={16} color="#2563EB" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.pickerModalFooter}>
              <TouchableOpacity
                style={styles.pickerDoneBtn}
                onPress={() => setIsRegionModalVisible(false)}
              >
                <Text style={styles.pickerDoneBtnText}>
                  Xác nhận ({selectedRegions.length} đã chọn)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Package Template Selection Modal */}
      <Modal
        visible={activePackageIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePackageIndex(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.pickerModalContainer,
              {
                width: isTablet ? 520 : Math.min(width * 0.94, 420),
                maxHeight: isLandscape ? height * 0.88 : '80%',
              },
            ]}
          >
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Chọn gói dịch vụ mẫu</Text>
              <TouchableOpacity
                onPress={() => setActivePackageIndex(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pickerModalList}>
              <TouchableOpacity
                style={styles.pickerOptionItem}
                onPress={() => {
                  if (activePackageIndex !== null) handleSelectPackageTemplate(activePackageIndex, '');
                }}
              >
                <Text style={styles.pickerOptionText}>-- Chọn gói mẫu --</Text>
              </TouchableOpacity>

              {availablePackages.map((pkg) => (
                <TouchableOpacity
                  key={pkg.id}
                  style={styles.pickerOptionItem}
                  onPress={() => {
                    if (activePackageIndex !== null) handleSelectPackageTemplate(activePackageIndex, pkg.id);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerOptionTextBold}>{pkg.name}</Text>
                    {pkg.description ? (
                      <Text style={styles.pickerOptionSub} numberOfLines={2}>
                        {pkg.description}
                      </Text>
                    ) : null}
                  </View>
                  <Feather name="chevron-right" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Standalone Service Selection Modal */}
      <Modal
        visible={activeServiceIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveServiceIndex(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.pickerModalContainer,
              {
                width: isTablet ? 520 : Math.min(width * 0.94, 420),
                maxHeight: isLandscape ? height * 0.88 : '80%',
              },
            ]}
          >
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Chọn dịch vụ lẻ</Text>
              <TouchableOpacity
                onPress={() => setActiveServiceIndex(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pickerModalList}>
              <TouchableOpacity
                style={styles.pickerOptionItem}
                onPress={() => {
                  if (activeServiceIndex !== null) handleSelectServiceItem(activeServiceIndex, '');
                }}
              >
                <Text style={styles.pickerOptionText}>-- Chọn dịch vụ --</Text>
              </TouchableOpacity>

              {availableServices.map((serv) => (
                <TouchableOpacity
                  key={serv.id}
                  style={styles.pickerOptionItem}
                  onPress={() => {
                    if (activeServiceIndex !== null) handleSelectServiceItem(activeServiceIndex, serv.id);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerOptionTextBold}>{serv.name}</Text>
                    {serv.costPrice ? (
                      <Text style={styles.pickerOptionSub}>
                        Giá vốn: {formatVNDFull(serv.costPrice)}
                      </Text>
                    ) : null}
                  </View>
                  <Feather name="chevron-right" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  topHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitles: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  saveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  cloudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  cloudBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  headerSaveDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    gap: 4,
  },
  headerSaveDraftText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.primary,
  },

  // Draft Alert
  draftAlertCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  draftAlertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  draftIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  draftAlertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  draftAlertDesc: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  draftAlertActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  draftDiscardBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  draftDiscardBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  draftRestoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#D97706',
    gap: 4,
  },
  draftRestoreBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Content Blocks
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionNumberCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // Form Elements
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputRowSmall: {
    flexDirection: 'column',
  },
  inputColHalfLeft: {
    flex: 1,
    marginRight: 8,
  },
  inputColHalfRight: {
    flex: 1,
    marginLeft: 8,
  },
  inputColFull: {
    width: '100%',
    marginRight: 0,
    marginLeft: 0,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputLabelSub: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748B',
  },
  reqStar: {
    color: '#EF4444',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 84,
  },
  charCountRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  charCountText: {
    fontSize: 11,
  },

  // Select Dropdown Button
  selectDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  selectDropdownBtnText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    flex: 1,
  },
  selectDropdownBtnPlaceholder: {
    color: '#94A3B8',
  },
  textActionLink: {
    paddingVertical: 2,
  },
  textActionLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  selectedTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  selectedTagText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '500',
  },

  // Currency Formatted Inputs (Thousand Separators)
  currencyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  currencyTextInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  currencySuffix: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 4,
  },

  // Date Formatted Inputs (DD/MM/YYYY)
  dateInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  dateIcon: {
    marginRight: 6,
  },
  dateTextInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  pickDateBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 4,
  },
  pickDateBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  dateErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: -8,
    marginBottom: 14,
  },
  dateErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    flex: 1,
  },

  // ReadOnly Auto Calculated Duration Months
  labelWithBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  autoCalcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  autoCalcBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  readOnlyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  readOnlyInputText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },

  // Priorities
  prioritiesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  // Interactive Slider Styles
  sliderContainer: {
    marginBottom: 16,
  },
  sliderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chanceStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  chanceStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chanceNumberBadge: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  chanceNumberText: {
    fontSize: 16,
    fontWeight: '800',
  },
  sliderTrackTouchable: {
    height: 36,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrackBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderTrackFill: {
    height: '100%',
    borderRadius: 4,
  },
  sliderThumbKnob: {
    position: 'absolute',
    top: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sliderThumbInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sliderScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  sliderScaleMinMax: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  sliderScaleCenterValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  sliderMilestonesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 6,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  presetPillText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },

  // Services Block Styling (Matching Web)
  servicesHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 14,
  },
  servicesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  servicesHeaderIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPrimaryTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    gap: 4,
  },
  addPrimaryTextBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },

  servicesSubSection: {
    marginBottom: 6,
  },
  serviceCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionCategoryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  // Package Row Empty
  packageEmptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 246, 255, 0.4)',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 10,
    gap: 10,
    marginBottom: 8,
  },
  packageSelectBoxEmpty: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  packageSelectPlaceholderBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },

  // Package Card Chosen (PackageItem)
  packageCardItem: {
    backgroundColor: 'rgba(239, 246, 255, 0.4)',
    borderWidth: 2,
    borderColor: '#DBEAFE',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  packageCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  packageCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pkgBriefcaseIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageNameTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  packageSubBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  packageCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityBoxSmall: {
    width: 52,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInputSmall: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  rowTrashBtn: {
    padding: 6,
  },

  packageItemsPreview: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
    gap: 4,
  },
  packageItemsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  packageItemsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  packageItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF6FF',
    gap: 8,
  },
  packageItemRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  packageItemLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  packageItemRowBullet: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '700',
  },
  packageItemRowName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  packageItemRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  packageItemQtyBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  packageItemQtyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  packageItemRowCost: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
  },

  // Standalone Service Row
  standaloneServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    gap: 8,
  },
  serviceSelectBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  serviceSelectText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  serviceSelectPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },

  // Gradient Violet Banner for Total Cost (Matching Web)
  totalCostGradientBanner: {
    marginTop: 12,
    backgroundColor: '#6D28D9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalCostGradientLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  totalCostGradientValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  totalCostGradientBannerSmall: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },

  // Links & Files
  subBlockHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subBlockTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    gap: 4,
  },
  addSmallBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  linkRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeLinkBtn: {
    marginLeft: 8,
    padding: 6,
  },
  uploadDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#2563EB',
    gap: 6,
  },
  uploadDocBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fileListContainer: {
    gap: 6,
    marginTop: 6,
  },
  fileItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  fileIconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileMetaCol: {
    flex: 1,
  },
  fileNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  fileSizeText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  fileDeleteBtn: {
    padding: 6,
  },
  emptyUploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginTop: 6,
  },
  emptyUploadTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
  },
  emptyUploadSub: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
  },

  // Bottom Fixed Action Bar
  bottomBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  bottomBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  keyboardDismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  keyboardDismissBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  saveDraftBottomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  saveDraftBottomText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  submitActionBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#059669',
    gap: 6,
  },
  submitActionBtnDisabled: {
    opacity: 0.6,
  },
  submitActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal Picker Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModalContainer: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  pickerModalList: {
    marginVertical: 10,
  },
  pickerOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerOptionItemActive: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#334155',
  },
  pickerOptionTextBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  pickerOptionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  pickerOptionTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  pickerModalFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  pickerDoneBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerDoneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // Calendar Modal Styles
  calendarModalContainer: {
    width: '94%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  calendarNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  calendarNavBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  calendarMonthText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  calendarWeekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
  },
  calendarCell: {
    width: `${100 / 7}%`,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 8,
  },
  calendarCellSelected: {
    backgroundColor: '#2563EB',
  },
  calendarCellToday: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calendarDayTextToday: {
    color: '#2563EB',
    fontWeight: '700',
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  calendarTodayBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  calendarTodayBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  calendarCloseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  calendarCloseBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },

  namePreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
    gap: 6,
  },
  namePreviewText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
    fontFamily: 'monospace',
  },
  namePartsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  namePartGroup: {
    marginBottom: 10,
  },
  namePartLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 5,
  },
});
