import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { taskService, TaskDetail } from '@/services/taskService';
import { teamService, TEAM_MEMBER_ROLE_LABELS } from '@/services/teamService';
import {
  useAssignTaskMutation,
  useBulkAssignTasksMutation,
  useAssignSupportTeamMutation,
  useRequestSupportMutation,
  useVendorsByJobQuery,
  useTeamsQuery,
} from '@/hooks/queries/useTasks';
import { uploadToCloudinary, PickedFile } from '@/services/cloudinaryService';
import { BrandColors } from '@/constants/colors';
import { isValidUrl, normalizeUrl } from '@/utils/validators';

const ITEM_HEIGHT = 38;
const VISIBLE_ITEMS = 3;

// Wheel Picker Component for dragging/swiping hours and minutes
const WheelPicker: React.FC<{
  data: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}> = ({ data, selectedIndex, onSelect }) => {
  const scrollRef = useRef<ScrollView>(null);
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    if (scrollRef.current && selectedIndex >= 0 && selectedIndex < data.length) {
      isProgrammaticScroll.current = true;
      scrollRef.current.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: true,
      });
      const timer = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedIndex, data.length]);

  const handleScrollEnd = (e: any) => {
    if (isProgrammaticScroll.current) return;
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(data.length - 1, index));
    if (clamped !== selectedIndex) {
      onSelect(clamped);
    }
  };

  return (
    <View style={wheelStyles.wheelContainer}>
      {/* Active selection background bar */}
      <View pointerEvents="none" style={wheelStyles.selectionBand} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        style={{ flex: 1, zIndex: 2 }}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT,
        }}
      >
        {data.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <TouchableOpacity
              key={idx}
              style={wheelStyles.wheelCell}
              onPress={() => {
                onSelect(idx);
                scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
              }}
            >
              <Text style={[wheelStyles.wheelText, isSelected && wheelStyles.wheelTextSelected]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

// Helper to parse date string into Date, Hour, Minute
const parseDateObj = (dateStr: string): { date: Date; hour: string; minute: string } => {
  const now = new Date();
  const currentH = String(now.getHours()).padStart(2, '0');
  const currentM = String(now.getMinutes()).padStart(2, '0');

  if (!dateStr) {
    return { date: now, hour: currentH, minute: currentM };
  }

  // 1. DD/MM/YYYY HH:mm or DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
    const [dPart, tPart] = dateStr.split(/\s+/);
    const [d, m, y] = dPart.split('/').map(Number);
    let h = now.getHours(), min = now.getMinutes();
    if (tPart && tPart.includes(':')) {
      const [hNum, minNum] = tPart.split(':').map(Number);
      if (!isNaN(hNum)) h = hNum;
      if (!isNaN(minNum)) min = minNum;
    }
    const dt = new Date(y, m - 1, d, h, min);
    return {
      date: isNaN(dt.getTime()) ? new Date() : dt,
      hour: String(h).padStart(2, '0'),
      minute: String(min).padStart(2, '0'),
    };
  }

  // 2. YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm or YYYY-MM-DD
  const dt = new Date(dateStr);
  if (!isNaN(dt.getTime())) {
    return {
      date: dt,
      hour: String(dt.getHours()).padStart(2, '0'),
      minute: String(dt.getMinutes()).padStart(2, '0'),
    };
  }

  return { date: now, hour: currentH, minute: currentM };
};

// Format user-entered or selected date string to ISO string for backend
const formatDueDateToISO = (str?: string) => {
  if (!str || !str.trim()) return undefined;
  const trimmed = str.trim();

  // If DD/MM/YYYY HH:mm
  if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}$/.test(trimmed)) {
    const [dStr, tStr] = trimmed.split(/\s+/);
    const [d, m, y] = dStr.split('/').map(Number);
    const [h, min] = tStr.split(':').map(Number);
    return new Date(y, m - 1, d, h, min).toISOString();
  }

  // If DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/').map(Number);
    return new Date(y, m - 1, d, 17, 0, 0).toISOString();
  }

  // If YYYY-MM-DDTHH:mm or ISO date
  const dt = new Date(trimmed);
  if (!isNaN(dt.getTime())) {
    return dt.toISOString();
  }

  return trimmed;
};

// Interactive Calendar & Swipeable Wheel Time Picker Modal
const CalendarPickerModal: React.FC<{
  visible: boolean;
  title: string;
  currentDateStr: string;
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
}> = ({ visible, title, currentDateStr, onSelectDate, onClose }) => {
  const { width } = useWindowDimensions();
  const [viewDate, setViewDate] = useState(new Date());
  const [hour, setHour] = useState('17');
  const [minute, setMinute] = useState('00');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const hoursData = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')), []);
  const minutesData = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')), []);

  useEffect(() => {
    if (visible) {
      const parsed = parseDateObj(currentDateStr);
      setViewDate(parsed.date);
      setSelectedDay(parsed.date.getDate());
      setHour(parsed.hour);
      setMinute(parsed.minute);
    }
  }, [visible, currentDateStr]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const handleConfirm = () => {
    const activeDay = selectedDay || viewDate.getDate();
    const safeH = String(Math.min(23, Math.max(0, parseInt(hour || '17', 10)))).padStart(2, '0');
    const safeM = String(Math.min(59, Math.max(0, parseInt(minute || '00', 10)))).padStart(2, '0');
    const formatted = `${String(activeDay).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year} ${safeH}:${safeM}`;
    onSelectDate(formatted);
    onClose();
  };

  const handleSelectDay = (dayNum: number) => {
    setSelectedDay(dayNum);
  };

  const handleSelectToday = () => {
    const today = new Date();
    setViewDate(today);
    setSelectedDay(today.getDate());
    const dayStr = String(today.getDate()).padStart(2, '0');
    const monthStr = String(today.getMonth() + 1).padStart(2, '0');
    const yearStr = today.getFullYear();
    const curH = String(today.getHours()).padStart(2, '0');
    const curM = String(today.getMinutes()).padStart(2, '0');
    setHour(curH);
    setMinute(curM);
    const formatted = `${dayStr}/${monthStr}/${yearStr} ${curH}:${curM}`;
    onSelectDate(formatted);
    onClose();
  };

  const setPresetTime = (tStr: string) => {
    const [h, m] = tStr.split(':');
    setHour(h);
    setMinute(m);
  };

  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDate = new Date();
  const isCurrentMonthToday = todayDate.getFullYear() === year && todayDate.getMonth() === month;

  const currentSelectedDay = useMemo(() => {
    if (selectedDay) return selectedDay;
    const parsed = parseDateObj(currentDateStr);
    if (parsed.date.getFullYear() === year && parsed.date.getMonth() === month) {
      return parsed.date.getDate();
    }
    return null;
  }, [selectedDay, currentDateStr, year, month]);

  const selectedHourIndex = Math.max(0, hoursData.indexOf(hour.padStart(2, '0')));
  const selectedMinuteIndex = Math.max(0, minutesData.indexOf(minute.padStart(2, '0')));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={calStyles.modalOverlay}>
        <View style={[calStyles.calendarModalContainer, { width: Math.min(width * 0.94, 380) }]}>
          {/* Header */}
          <View style={calStyles.calendarHeader}>
            <Text style={calStyles.calendarTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Month Navigator */}
          <View style={calStyles.calendarNavRow}>
            <TouchableOpacity onPress={prevMonth} style={calStyles.calendarNavBtn}>
              <Feather name="chevron-left" size={20} color="#1E293B" />
            </TouchableOpacity>
            <Text style={calStyles.calendarMonthText}>
              Tháng {month + 1}, {year}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={calStyles.calendarNavBtn}>
              <Feather name="chevron-right" size={20} color="#1E293B" />
            </TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View style={calStyles.calendarWeekRow}>
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
              <Text key={i} style={[calStyles.calendarWeekDayText, i >= 5 && { color: '#EF4444' }]}>
                {d}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={calStyles.calendarGrid}>
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <View key={`empty-${i}`} style={calStyles.calendarCell} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected = dayNum === currentSelectedDay;
              const isToday = isCurrentMonthToday && todayDate.getDate() === dayNum;

              return (
                <TouchableOpacity
                  key={`day-${dayNum}`}
                  style={[
                    calStyles.calendarCell,
                    isSelected && calStyles.calendarCellSelected,
                    !isSelected && isToday && calStyles.calendarCellToday,
                  ]}
                  onPress={() => handleSelectDay(dayNum)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      calStyles.calendarDayText,
                      isSelected && calStyles.calendarDayTextSelected,
                      !isSelected && isToday && calStyles.calendarDayTextToday,
                    ]}
                  >
                    {dayNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Time Picker Section (Kéo con lăn chọn Giờ : Phút hoặc Nhập) */}
          <View style={calStyles.timeSection}>
            <View style={calStyles.timeSectionHeader}>
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="clock" size={15} color={BrandColors.primary} />
                  <Text style={calStyles.timeSectionTitle}>Giờ : Phút</Text>
                </View>

                {/* Direct TextInput fields for hour and minute */}
                <View style={calStyles.timeInputBoxRow}>
                  <TextInput
                    style={calStyles.timeMiniInput}
                    value={hour}
                    onChangeText={(val) => {
                      const cleaned = val.replace(/[^0-9]/g, '');
                      setHour(cleaned);
                    }}
                    onBlur={() => {
                      const hNum = parseInt(hour, 10);
                      if (isNaN(hNum)) setHour('17');
                      else setHour(String(Math.min(23, Math.max(0, hNum))).padStart(2, '0'));
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                  <Text style={calStyles.timeMiniColon}>:</Text>
                  <TextInput
                    style={calStyles.timeMiniInput}
                    value={minute}
                    onChangeText={(val) => {
                      const cleaned = val.replace(/[^0-9]/g, '');
                      setMinute(cleaned);
                    }}
                    onBlur={() => {
                      const mNum = parseInt(minute, 10);
                      if (isNaN(mNum)) setMinute('00');
                      else setMinute(String(Math.min(59, Math.max(0, mNum))).padStart(2, '0'));
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                </View>
              </View>

              {/* Scrollable Wheel Picker for Hour and Minute */}
              <View style={calStyles.wheelPickerRow}>
                <WheelPicker
                  data={hoursData}
                  selectedIndex={selectedHourIndex >= 0 ? selectedHourIndex : 17}
                  onSelect={(idx) => setHour(hoursData[idx])}
                />
                <Text style={calStyles.wheelColon}>:</Text>
                <WheelPicker
                  data={minutesData}
                  selectedIndex={selectedMinuteIndex >= 0 ? selectedMinuteIndex : 0}
                  onSelect={(idx) => setMinute(minutesData[idx])}
                />
              </View>
            </View>

          </View>

          {/* Footer actions */}
          <View style={calStyles.calendarFooter}>
            <TouchableOpacity onPress={handleSelectToday} style={calStyles.calendarTodayBtn}>
              <Text style={calStyles.calendarTodayBtnText}>Hôm nay</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleConfirm} style={calStyles.calendarConfirmBtn}>
              <Text style={calStyles.calendarConfirmBtnText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface TaskAssignModalProps {
  visible: boolean;
  onClose: () => void;
  task: TaskDetail | TaskDetail[] | null;
  project?: any;
  teamMembers: Array<{
    id: string;
    role: string;
    user?: {
      id: string;
      fullName: string;
      email?: string;
    };
  }>;
  onSuccess: () => void;
}

export default function TaskAssignModal({
  visible,
  onClose,
  task,
  project,
  teamMembers,
  onSuccess,
}: TaskAssignModalProps) {
  const isBulk = Array.isArray(task);
  const tasks = useMemo(() => (Array.isArray(task) ? task : task ? [task] : []), [task]);
  const representativeTask = tasks[0] || null;

  const [performerType, setPerformerType] = useState<'INTERNAL' | 'VENDOR'>('INTERNAL');
  const [isTeamAssignment, setIsTeamAssignment] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');

  const [dueDate, setDueDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Auto-format date-time input mask as user types digits: "300920261700" -> "30/09/2026 17:00"
  const handleDueDateChange = (text: string) => {
    if (text.length < dueDate.length) {
      setDueDate(text);
      return;
    }

    const digits = text.replace(/\D/g, '');
    if (!digits) {
      setDueDate('');
      return;
    }

    let res = '';
    if (digits.length > 0) res += digits.slice(0, 2);
    if (digits.length > 2) res += '/' + digits.slice(2, 4);
    if (digits.length > 4) res += '/' + digits.slice(4, 8);
    if (digits.length > 8) res += ' ' + digits.slice(8, 10);
    if (digits.length > 10) res += ':' + digits.slice(10, 12);
    setDueDate(res);
  };
  const [description, setDescription] = useState<string>('');
  const [links, setLinks] = useState<string[]>(['']);
  const [files, setFiles] = useState<PickedFile[]>([]);

  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [isUploading, setIsUploading] = useState(false);

  const assignTaskMutation = useAssignTaskMutation();
  const bulkAssignMutation = useBulkAssignTasksMutation();
  const assignSupportTeamMutation = useAssignSupportTeamMutation();
  const requestSupportMutation = useRequestSupportMutation();

  const isPending =
    assignTaskMutation.isPending ||
    bulkAssignMutation.isPending ||
    assignSupportTeamMutation.isPending ||
    requestSupportMutation.isPending ||
    isUploading;

  const isSupportRequested = !isBulk && representativeTask ? (representativeTask as any).isSupportRequested : false;
  const isSupportMode = !isBulk && representativeTask ? !isSupportRequested && (representativeTask.status === 'DOING' || representativeTask.status === 'REWORKING') : false;

  const jobId =
    representativeTask?.jobId ||
    representativeTask?.job?.id ||
    (representativeTask as any)?.contractService?.jobId ||
    (representativeTask as any)?.contractService?.job?.id ||
    '';

  const { data: vendorsData, isLoading: isLoadingVendors } = useVendorsByJobQuery(
    performerType === 'VENDOR' ? jobId : ''
  );
  const vendors = vendorsData || [];

  const { data: teamsData, isLoading: isLoadingTeams } = useTeamsQuery();
  const allTeams = teamsData || [];

  // Initial load when modal becomes visible
  useEffect(() => {
    if (visible && representativeTask) {
      setSelectedAssigneeId(representativeTask.assigneeId || representativeTask.assignee?.id || '');
      const defaultPerfType = (representativeTask as any).performerType === 'VENDOR' ? 'VENDOR' : 'INTERNAL';
      setPerformerType(defaultPerfType);
      setIsTeamAssignment(false);
      setSelectedTeamId('');
      setSelectedVendorId('');
      setDueDate(representativeTask.dueDate || (representativeTask as any).plannedEndDate || '');
      setDescription(representativeTask.description || '');
      setLinks(['']);
      setFiles([]);
      setUploadProgress({});
    }
  }, [visible, representativeTask]);

  const handlePerformerTypeChange = (type: 'INTERNAL' | 'VENDOR') => {
    setPerformerType(type);
    setSelectedAssigneeId('');
    setSelectedVendorId('');
  };

  const handleToggleTeamAssignment = () => {
    const nextVal = !isTeamAssignment;
    setIsTeamAssignment(nextVal);
    setSelectedAssigneeId('');
    setSelectedTeamId('');
    setSelectedVendorId('');
  };

  // Link helper actions
  const handleAddLink = () => {
    setLinks((prev) => [...prev, '']);
  };

  const handleRemoveLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index: number, value: string) => {
    setLinks((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  // File attachment actions
  const handlePickFile = async () => {
    if (files.length >= 5) {
      Alert.alert('Cảnh báo', 'Chỉ được chọn tối đa 5 file đính kèm.');
      return;
    }

    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const newFile: PickedFile = {
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          size: asset.size,
        };

        const currentTotalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
        if (currentTotalSize + (asset.size || 0) > 25 * 1024 * 1024) {
          Alert.alert('Cảnh báo', 'Tổng dung lượng các file không được vượt quá 25MB.');
          return;
        }

        setFiles((prev) => [...prev, newFile]);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể chọn tệp. ' + (err?.message || ''));
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (!task) return null;

  const handleSubmit = async () => {
    // Form validation
    if (isTeamAssignment) {
      if (!selectedTeamId) {
        Alert.alert('Cảnh báo', 'Vui lòng chọn Team hỗ trợ.');
        return;
      }
    } else {
      if (performerType === 'INTERNAL' && !selectedAssigneeId) {
        Alert.alert('Cảnh báo', 'Vui lòng chọn nhân sự thực hiện trong đội dự án.');
        return;
      }
      if (performerType === 'VENDOR' && !selectedVendorId) {
        Alert.alert('Cảnh báo', 'Vui lòng chọn đối tác Vendor thực hiện.');
        return;
      }
    }

    try {
      const attachmentsList: Array<{ type: string; name: string; url: string; size?: number }> = [];

      // 1. Process valid URL links
      for (const l of links) {
        const trimmed = l.trim();
        if (trimmed) {
          if (!isValidUrl(trimmed)) {
            Alert.alert(
              'Liên kết không hợp lệ',
              `Đường dẫn "${trimmed}" không đúng định dạng. Vui lòng kiểm tra lại (Ví dụ: google.com hoặc https://example.com).`
            );
            return;
          }
          const formattedUrl = normalizeUrl(trimmed);
          attachmentsList.push({
            type: 'LINK',
            name: formattedUrl,
            url: formattedUrl,
          });
        }
      }

      // 2. Upload files to Cloudinary if picked
      if (files.length > 0) {
        setIsUploading(true);
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const uploaded = await uploadToCloudinary(file, 'GETVINI/ERP/tasks', (percent) => {
            setUploadProgress((prev) => ({ ...prev, [i]: percent }));
          });
          attachmentsList.push({
            type: 'FILE',
            name: uploaded.name,
            url: uploaded.url,
            size: uploaded.size,
          });
        }
        setIsUploading(false);
      }

      if (!task || tasks.length === 0) return null;

      const projectId = project?.id || (representativeTask as any)?.projectId;
      const formattedPlannedEndDate = formatDueDateToISO(dueDate);

      // 3. Execute assignment logic
      if (isBulk) {
        const finalAssigneeId = performerType === 'INTERNAL' ? selectedAssigneeId : selectedVendorId;
        await bulkAssignMutation.mutateAsync({
          taskIds: tasks.map((t) => t.id),
          assigneeId: finalAssigneeId,
          performerType,
          plannedEndDate: formattedPlannedEndDate,
          plannedStartDate: new Date().toISOString(),
          description: description.trim() || undefined,
          attachments: attachmentsList,
          projectId,
        });

        Alert.alert('Thành công', `Đã phân công ${tasks.length} công việc hàng loạt thành công!`);
      } else if (isTeamAssignment) {
        if (representativeTask && representativeTask.status === 'DOING' && !isSupportRequested) {
          await requestSupportMutation.mutateAsync({
            taskId: representativeTask.id,
            reason: description || 'Cần hỗ trợ thực hiện công việc này',
            projectId,
          });
        }

        await assignSupportTeamMutation.mutateAsync({
          taskId: representativeTask?.id || '',
          teamId: selectedTeamId,
          projectId,
        });
        Alert.alert('Thành công', 'Đã phân công Team hỗ trợ thực hiện công việc thành công!');
      } else {
        const finalAssigneeId = performerType === 'INTERNAL' ? selectedAssigneeId : selectedVendorId;
        await assignTaskMutation.mutateAsync({
          id: representativeTask?.id || '',
          payload: {
            assigneeId: finalAssigneeId,
            performerType,
            plannedEndDate: formattedPlannedEndDate,
            description: description.trim() || undefined,
            attachments: attachmentsList,
            projectId,
          },
        });

        Alert.alert('Thành công', `Đã phân công công việc "${representativeTask?.name}" thành công!`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setIsUploading(false);
      Alert.alert('Lỗi', err?.message || 'Có lỗi xảy ra khi phân công công việc.');
    }
  };

  if (!task || tasks.length === 0) return null;

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleBox}>
                <Text style={styles.title}>
                  {isBulk
                    ? `Phân công (${tasks.length}) công việc`
                    : representativeTask?.assigneeId
                    ? 'Đổi người thực hiện'
                    : 'Phân công công việc'}
                </Text>
                <Text style={styles.taskCode} numberOfLines={1}>
                  {isBulk
                    ? `Đang gán hàng loạt cho ${tasks.length} công việc đã chọn`
                    : `#${representativeTask?.code || 'TASK'} • ${representativeTask?.name}`}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.bodyScroll}>
              {/* Performer Type Selector (Internal vs Vendor) */}
              {!isTeamAssignment && (
                <>
                  <Text style={styles.label}>1. Hình thức thực hiện</Text>
                  <View style={styles.typeRow}>
                    <TouchableOpacity
                      style={[styles.typeBtn, performerType === 'INTERNAL' && styles.typeBtnActive]}
                      onPress={() => handlePerformerTypeChange('INTERNAL')}
                      activeOpacity={0.8}
                    >
                      <Feather
                        name="users"
                        size={15}
                        color={performerType === 'INTERNAL' ? BrandColors.primary : '#64748B'}
                      />
                      <Text
                        style={[styles.typeBtnText, performerType === 'INTERNAL' && styles.typeBtnTextActive]}
                      >
                        Nội bộ
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.typeBtn, performerType === 'VENDOR' && styles.typeBtnActive]}
                      onPress={() => handlePerformerTypeChange('VENDOR')}
                      activeOpacity={0.8}
                    >
                      <Feather
                        name="briefcase"
                        size={15}
                        color={performerType === 'VENDOR' ? BrandColors.primary : '#64748B'}
                      />
                      <Text
                        style={[styles.typeBtnText, performerType === 'VENDOR' && styles.typeBtnTextActive]}
                      >
                        Vendor
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Support Team Request Toggle Banner */}
              <View style={styles.supportHeaderRow}>
                <Text style={styles.label}>
                  {isTeamAssignment
                    ? '2. Chọn Team hỗ trợ'
                    : performerType === 'INTERNAL'
                    ? `2. Người thực hiện (${teamMembers.length} thành viên)`
                    : '2. Đối tác Vendor'}
                </Text>

                {isSupportMode && (
                  <TouchableOpacity
                    style={styles.teamSupportToggle}
                    onPress={handleToggleTeamAssignment}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={isTeamAssignment ? 'check-square' : 'square'}
                      size={16}
                      color={BrandColors.primary}
                    />
                    <Text style={styles.teamSupportToggleText}>Nhờ hỗ trợ từ team khác</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Assignee / Team Selection */}
              {isTeamAssignment ? (
                <View style={styles.selectionSection}>
                  {isLoadingTeams ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color={BrandColors.primary} />
                      <Text style={styles.loadingRowText}>Đang tải danh sách Team...</Text>
                    </View>
                  ) : allTeams.length === 0 ? (
                    <Text style={styles.emptyMembersText}>Không có team hỗ trợ nào khả dụng.</Text>
                  ) : (
                    <View style={styles.memberList}>
                      {allTeams.map((t) => {
                        const isSelected = selectedTeamId === t.id;
                        return (
                          <TouchableOpacity
                            key={t.id}
                            style={[styles.memberCard, isSelected && styles.memberCardSelected]}
                            onPress={() => setSelectedTeamId(t.id)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.avatarCircle}>
                              <Feather name="users" size={16} color={BrandColors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.memberName}>{t.name}</Text>
                              <Text style={styles.memberRole}>
                                Lead: {t.teamLead?.fullName || 'Chưa phân công'}
                              </Text>
                            </View>
                            {isSelected && (
                              <Feather name="check-circle" size={18} color={BrandColors.primary} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              ) : performerType === 'INTERNAL' ? (
                <View style={styles.selectionSection}>
                  {teamMembers.length === 0 ? (
                    <Text style={styles.emptyMembersText}>
                      Đội dự án chưa có thành viên nào. Vui lòng thêm nhân sự vào đội ở Tab Tổng quan.
                    </Text>
                  ) : (
                    <View style={styles.memberList}>
                      {teamMembers.map((member) => {
                        const uId = member.user?.id;
                        if (!uId) return null;
                        const isSelected = selectedAssigneeId === uId;

                        return (
                          <TouchableOpacity
                            key={member.id}
                            style={[styles.memberCard, isSelected && styles.memberCardSelected]}
                            onPress={() => setSelectedAssigneeId(uId)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.avatarCircle}>
                              <Text style={styles.avatarText}>
                                {member.user?.fullName ? member.user.fullName.charAt(0).toUpperCase() : 'M'}
                              </Text>
                            </View>

                            <View style={{ flex: 1 }}>
                              <Text style={styles.memberName}>{member.user?.fullName}</Text>
                              <Text style={styles.memberRole}>
                                {TEAM_MEMBER_ROLE_LABELS[member.role] || member.role}
                              </Text>
                            </View>

                            {isSelected && (
                              <Feather name="check-circle" size={18} color={BrandColors.primary} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.selectionSection}>
                  {isLoadingVendors ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color={BrandColors.primary} />
                      <Text style={styles.loadingRowText}>Đang tải danh sách Vendor...</Text>
                    </View>
                  ) : vendors.length === 0 ? (
                    <View style={styles.emptyVendorBox}>
                      <Feather name="alert-circle" size={16} color="#DC2626" />
                      <Text style={styles.emptyVendorText}>Chưa có vendor cung cấp dịch vụ này</Text>
                    </View>
                  ) : (
                    <View style={styles.memberList}>
                      {vendors.map((v) => {
                        const isSelected = selectedVendorId === v.id;
                        return (
                          <TouchableOpacity
                            key={v.id}
                            style={[styles.memberCard, isSelected && styles.memberCardSelected]}
                            onPress={() => setSelectedVendorId(v.id)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.avatarCircle}>
                              <Feather name="briefcase" size={15} color={BrandColors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.memberName}>{v.name}</Text>
                              <Text style={styles.memberRole}>{v.contactPerson || v.phone || 'Đối tác Vendor'}</Text>
                            </View>
                            {isSelected && (
                              <Feather name="check-circle" size={18} color={BrandColors.primary} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Deadline (Planned End Date) with Date & Time Picker */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={styles.label}>3. Hạn hoàn thành (Deadline)</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={styles.openPickerLink}
                  activeOpacity={0.7}
                >
                  <Feather name="calendar" size={13} color={BrandColors.primary} />
                  <Text style={styles.openPickerLinkText}>Mở lịch chọn</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputIconWrapper}>
                <TouchableOpacity
                  style={styles.calendarIconBtn}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Feather name="calendar" size={18} color={BrandColors.primary} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  placeholder="dd/mm/yyyy --:--"
                  placeholderTextColor="#94A3B8"
                  value={dueDate}
                  onChangeText={handleDueDateChange}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              {/* Description & Instruction */}
              <Text style={styles.label}>4. Ghi chú & Chỉ dẫn công việc</Text>
              <View style={styles.inputIconWrapper}>
                <Feather name="file-text" size={16} color="#64748B" style={styles.textAreaIcon} />
                <TextInput
                  style={[styles.input, styles.textArea, styles.inputWithIcon]}
                  placeholder="Mô tả chi tiết công việc hoặc lưu ý cho người thực hiện..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Attachments Section: Links & Files */}
              <View style={styles.attachmentHeaderRow}>
                <Text style={styles.label}>5. Tài liệu đính kèm & Links</Text>
                <TouchableOpacity
                  style={styles.addLinkBtn}
                  onPress={handleAddLink}
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={14} color={BrandColors.primary} />
                  <Text style={styles.addLinkBtnText}>Thêm Link</Text>
                </TouchableOpacity>
              </View>

              {/* Links List */}
              {links.map((link, idx) => (
                <View key={`link-${idx}`} style={styles.linkRow}>
                  <Feather name="link" size={15} color="#64748B" style={styles.linkIcon} />
                  <TextInput
                    style={styles.linkInput}
                    placeholder="Nhập link tài liệu (Google Drive, Figma, Dropbox...)"
                    value={link}
                    onChangeText={(text) => handleLinkChange(idx, text)}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                  {links.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeLinkBtn}
                      onPress={() => handleRemoveLink(idx)}
                      activeOpacity={0.7}
                    >
                      <Feather name="trash-2" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* Files Section */}
              <TouchableOpacity
                style={styles.fileDropZone}
                onPress={handlePickFile}
                activeOpacity={0.8}
              >
                <View style={styles.fileDropIconCircle}>
                  <Feather name="upload-cloud" size={22} color={BrandColors.primary} />
                </View>
                <Text style={styles.fileDropZoneTitle}>Bấm để chọn tệp đính kèm</Text>
                <Text style={styles.fileDropZoneSub}>Tối đa 5 file, tổng dung lượng 25MB</Text>
              </TouchableOpacity>

              {files.length > 0 && (
                <View style={styles.pickedFileList}>
                  {files.map((file, idx) => {
                    const progress = uploadProgress[idx];
                    return (
                      <View key={`file-${idx}`} style={styles.fileItemCard}>
                        <View style={styles.fileItemLeft}>
                          <Feather name="file" size={18} color="#64748B" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fileItemName} numberOfLines={1}>
                              {file.name}
                            </Text>
                            {file.size ? (
                              <Text style={styles.fileItemSize}>
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </Text>
                            ) : null}
                            {isUploading && progress !== undefined && (
                              <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                              </View>
                            )}
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemoveFile(idx)}
                          disabled={isUploading}
                          style={styles.removeFileBtn}
                        >
                          <Feather name="x" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={isPending}
              >
                <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  isPending && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Đang xử lý...</Text>
                  </>
                ) : (
                  <>
                    <Feather name="user-check" size={16} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>
                      {isBulk
                        ? `Phân công (${tasks.length}) việc`
                        : representativeTask?.assigneeId
                        ? 'Lưu đổi người'
                        : 'Xác nhận phân công'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date & Time Picker Modal */}
      <CalendarPickerModal
        visible={showDatePicker}
        title="Chọn hạn hoàn thành (Ngày & Giờ)"
        currentDateStr={dueDate}
        onSelectDate={(d) => setDueDate(d)}
        onClose={() => setShowDatePicker(false)}
      />
    </>
  );
}

const wheelStyles = StyleSheet.create({
  wheelContainer: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    width: 60,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectionBand: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: '#EFF6FF',
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: BrandColors.primary,
    zIndex: 0,
  },
  wheelCell: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  wheelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  wheelTextSelected: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.primary,
  },
});

const calStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  calendarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  calendarNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarNavBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  calendarMonthText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarWeekDayText: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 10,
  },
  calendarCellSelected: {
    backgroundColor: BrandColors.primary,
  },
  calendarCellToday: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: BrandColors.primary,
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calendarDayTextToday: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  timeSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  timeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  timeInputBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timeMiniInput: {
    width: 38,
    height: 32,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
    backgroundColor: '#F8FAFC',
    paddingVertical: 0,
  },
  timeMiniColon: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  wheelPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wheelColon: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 4,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  presetBtnActive: {
    borderColor: BrandColors.primary,
    backgroundColor: '#EFF6FF',
  },
  presetText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  presetTextActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  calendarTodayBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  calendarTodayBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  calendarConfirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: BrandColors.primary,
  },
  calendarConfirmBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerTitleBox: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  taskCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  bodyScroll: {
    maxHeight: 460,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
    marginBottom: 6,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  typeBtnActive: {
    borderColor: BrandColors.primary,
    backgroundColor: '#F0FDFA',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  typeBtnTextActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  supportHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamSupportToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  teamSupportToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  selectionSection: {
    marginTop: 2,
    marginBottom: 6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingRowText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyMembersText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  emptyVendorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 10,
    borderRadius: 10,
  },
  emptyVendorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  memberList: {
    gap: 6,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  memberCardSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: '#F0FDFA',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  memberRole: {
    fontSize: 11,
    color: '#64748B',
  },
  inputIconWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  calendarIconBtn: {
    position: 'absolute',
    left: 12,
    zIndex: 2,
    padding: 4,
  },
  openPickerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  openPickerLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  textAreaIcon: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  inputWithIcon: {
    paddingLeft: 42,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  attachmentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  addLinkBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  linkIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  linkInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingLeft: 36,
    paddingRight: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  removeLinkBtn: {
    padding: 8,
  },
  fileDropZone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 6,
  },
  fileDropIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  fileDropZoneTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  fileDropZoneSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  pickedFileList: {
    gap: 6,
    marginTop: 8,
  },
  fileItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  fileItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fileItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  fileItemSize: {
    fontSize: 10,
    color: '#64748B',
  },
  removeFileBtn: {
    padding: 6,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: BrandColors.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
