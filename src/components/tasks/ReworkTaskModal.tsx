import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { uploadToCloudinary } from '@/services/cloudinaryService';
import { BrandColors } from '@/constants/colors';
import { isValidUrl, normalizeUrl } from '@/utils/validators';

const ITEM_HEIGHT = 38;

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

  if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}$/.test(trimmed)) {
    const [dStr, tStr] = trimmed.split(/\s+/);
    const [d, m, y] = dStr.split('/').map(Number);
    const [h, min] = tStr.split(':').map(Number);
    return new Date(y, m - 1, d, h, min).toISOString();
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/').map(Number);
    return new Date(y, m - 1, d, 17, 0, 0).toISOString();
  }

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

          {/* Time Picker Section */}
          <View style={calStyles.timeSection}>
            <View style={calStyles.timeSectionHeader}>
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="clock" size={15} color={BrandColors.primary} />
                  <Text style={calStyles.timeSectionTitle}>Giờ : Phút</Text>
                </View>

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

            </View>

            <View style={calStyles.wheelsWrapper}>
              <View style={{ flex: 1 }}>
                <Text style={calStyles.wheelColumnLabel}>Giờ</Text>
                <WheelPicker
                  data={hoursData}
                  selectedIndex={selectedHourIndex}
                  onSelect={(idx) => setHour(hoursData[idx])}
                />
              </View>
              <Text style={calStyles.wheelColon}>:</Text>
              <View style={{ flex: 1 }}>
                <Text style={calStyles.wheelColumnLabel}>Phút</Text>
                <WheelPicker
                  data={minutesData}
                  selectedIndex={selectedMinuteIndex}
                  onSelect={(idx) => setMinute(minutesData[idx])}
                />
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={calStyles.calendarFooter}>
            <TouchableOpacity style={calStyles.todayBtn} onPress={handleSelectToday}>
              <Feather name="calendar" size={14} color={BrandColors.primary} />
              <Text style={calStyles.todayBtnText}>Hôm nay</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={calStyles.calendarCancelBtn} onPress={onClose}>
                <Text style={calStyles.calendarCancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={calStyles.calendarConfirmBtn} onPress={handleConfirm}>
                <Text style={calStyles.calendarConfirmBtnText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface ReworkTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { feedback: string; deadlineAt: string; attachments: any[] }) => Promise<void>;
  isLoading: boolean;
  taskName?: string;
}

export default function ReworkTaskModal({
  visible,
  onClose,
  onSubmit,
  isLoading,
  taskName,
}: ReworkTaskModalProps) {
  const [feedback, setFeedback] = useState('');
  const [deadlineAt, setDeadlineAt] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleDueDateChange = (val: string) => {
    const digits = val.replace(/[^0-9]/g, '');
    let res = '';
    if (digits.length > 0) res += digits.slice(0, 2);
    if (digits.length > 2) res += '/' + digits.slice(2, 4);
    if (digits.length > 4) res += '/' + digits.slice(4, 8);
    if (digits.length > 8) res += ' ' + digits.slice(8, 10);
    if (digits.length > 10) res += ':' + digits.slice(10, 12);
    setDeadlineAt(res);
  };

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        setIsUploading(true);
        const uploaded = await uploadToCloudinary(
          {
            uri: asset.uri,
            name: asset.name,
            mimeType: asset.mimeType || 'application/octet-stream',
            size: asset.size,
          },
          'GETVINI/ERP/REWORK_FEEDBACK'
        );
        setIsUploading(false);
        if (uploaded) {
          setAttachments((prev) => [...prev, uploaded]);
        }
      }
    } catch {
      setIsUploading(false);
      Alert.alert('Lỗi', 'Không thể tải file lên. Vui lòng thử lại.');
    }
  };

  const handleAddLink = () => {
    const raw = linkInput.trim();
    if (!raw) return;

    if (!isValidUrl(raw)) {
      Alert.alert(
        'Đường dẫn không hợp lệ',
        'Vui lòng nhập đúng định dạng liên kết (Ví dụ: google.com hoặc https://example.com).'
      );
      return;
    }

    const url = normalizeUrl(raw);
    setAttachments((prev) => [...prev, { type: 'LINK', name: url, url }]);
    setLinkInput('');
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      Alert.alert('Cảnh báo', 'Vui lòng nhập phản hồi / hướng dẫn chỉnh sửa.');
      return;
    }
    if (!deadlineAt.trim()) {
      Alert.alert('Cảnh báo', 'Vui lòng chọn hạn chót / deadline mới.');
      return;
    }

    const isoDate = formatDueDateToISO(deadlineAt);

    await onSubmit({
      feedback: feedback.trim(),
      deadlineAt: isoDate || deadlineAt.trim(),
      attachments,
    });
    setFeedback('');
    setDeadlineAt('');
    setAttachments([]);
    setLinkInput('');
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={() => {}}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Yêu cầu làm lại công việc</Text>
                {taskName && <Text style={styles.taskName} numberOfLines={1}>{taskName}</Text>}
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {/* Feedback / Instructions Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>PHẢN HỒI / HƯỚNG DẪN CHỈNH SỬA *</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={4}
                  placeholder="Nhập chi tiết các phần cần chỉnh sửa hoặc lý do không đạt..."
                  placeholderTextColor="#94A3B8"
                  value={feedback}
                  onChangeText={setFeedback}
                />
              </View>

              {/* New Deadline Input Picker */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={[styles.label, { color: '#DC2626' }]}>DEADLINE MỚI *</Text>
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
                    value={deadlineAt}
                    onChangeText={handleDueDateChange}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>

              {/* Attachments & Link Section */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>TÀI LIỆU HƯỚNG DẪN & LINK (TÙY CHỌN)</Text>

                {/* Upload File & Add Link Actions */}
                <View style={styles.actionGrid}>
                  <TouchableOpacity
                    style={styles.uploadBox}
                    onPress={handlePickDocument}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <ActivityIndicator size="small" color={BrandColors.primary} />
                    ) : (
                      <>
                        <Feather name="upload-cloud" size={20} color={BrandColors.primary} />
                        <Text style={styles.uploadBoxText}>Thêm tập tin</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <View style={styles.linkBox}>
                    <TextInput
                      style={styles.linkInput}
                      placeholder="Dán link tại đây..."
                      placeholderTextColor="#94A3B8"
                      value={linkInput}
                      onChangeText={setLinkInput}
                    />
                    <TouchableOpacity
                      style={[styles.addLinkBtn, !linkInput.trim() && { opacity: 0.5 }]}
                      disabled={!linkInput.trim()}
                      onPress={handleAddLink}
                    >
                      <Text style={styles.addLinkBtnText}>Thêm Link</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Added Attachments List */}
                {attachments.length > 0 && (
                  <View style={styles.attachmentsSection}>
                    <Text style={styles.subLabel}>TÀI LIỆU ĐÃ THÊM ({attachments.length})</Text>
                    <View style={styles.attachmentList}>
                      {attachments.map((file, idx) => (
                        <View key={idx} style={styles.attachmentChip}>
                          <Feather
                            name={file.type === 'LINK' ? 'link' : 'file-text'}
                            size={13}
                            color={BrandColors.primary}
                          />
                          <Text style={styles.attachmentChipText} numberOfLines={1}>
                            {file.name}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveAttachment(idx)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Feather name="x" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={isLoading || isUploading}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, (isLoading || isUploading) && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={isLoading || isUploading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Gửi yêu cầu</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Calendar Picker Modal */}
      <CalendarPickerModal
        visible={showDatePicker}
        title="Chọn Deadline Mới"
        currentDateStr={deadlineAt}
        onSelectDate={(formattedStr) => setDeadlineAt(formattedStr)}
        onClose={() => setShowDatePicker(false)}
      />
    </>
  );
}

const wheelStyles = StyleSheet.create({
  wheelContainer: {
    height: ITEM_HEIGHT * 3,
    position: 'relative',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    overflow: 'hidden',
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
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BrandColors.primary,
    zIndex: 1,
  },
  wheelCell: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  wheelTextSelected: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.primary,
  },
});

const calStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  calendarModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    gap: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  calendarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  calendarNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  calendarWeekDayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    width: 36,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  calendarCellSelected: {
    backgroundColor: BrandColors.primary,
    borderRadius: 17,
  },
  calendarCellToday: {
    borderWidth: 1.5,
    borderColor: BrandColors.primary,
    borderRadius: 17,
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  calendarDayTextToday: {
    color: BrandColors.primary,
    fontWeight: '800',
  },
  timeSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeSectionHeader: {
    gap: 8,
  },
  timeSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  timeInputBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeMiniInput: {
    width: 36,
    height: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BrandColors.primary,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: BrandColors.primary,
    padding: 0,
  },
  timeMiniColon: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  presetBtnActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  presetTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  wheelsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wheelColumnLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    textAlign: 'center',
  },
  wheelColon: {
    fontSize: 18,
    fontWeight: '800',
    color: '#475569',
    marginTop: 14,
  },
  calendarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  calendarCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  calendarCancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
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
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  taskName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  body: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  openPickerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openPickerLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  inputIconWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  calendarIconBtn: {
    position: 'absolute',
    left: 12,
    zIndex: 10,
    padding: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  inputWithIcon: {
    paddingLeft: 44,
  },
  attachmentsSection: {
    marginBottom: 16,
  },
  attachmentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  attachmentChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.primary,
    maxWidth: 160,
  },
  actionGrid: {
    gap: 12,
    marginBottom: 12,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
  },
  uploadBoxText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  linkBox: {
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
  },
  linkInput: {
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addLinkBtn: {
    backgroundColor: BrandColors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  addLinkBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
