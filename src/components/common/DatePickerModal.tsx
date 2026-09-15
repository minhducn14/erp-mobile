import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatDateToDDMMYYYY, formatDateToYYYYMMDD, parseDateInput } from '@/utils/formatters';

export interface DatePickerModalProps {
  visible: boolean;
  title?: string;
  initialDate?: string;
  onConfirm: (formattedDDMMYYYY: string, formattedYYYYMMDD: string) => void;
  onClose: () => void;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  title = 'Chọn ngày',
  initialDate,
  onConfirm,
  onClose,
}) => {
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    if (visible) {
      const d = parseDateInput(initialDate);
      setViewDate(d);
      setSelectedDate(d);
    }
  }, [visible, initialDate]);

  if (!visible) return null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const handleSelectQuick = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    setViewDate(d);
    setSelectedDate(d);
  };

  const handleConfirm = () => {
    const ddmmyyyy = formatDateToDDMMYYYY(selectedDate);
    const yyyymmdd = formatDateToYYYYMMDD(selectedDate);
    onConfirm(ddmmyyyy, yyyymmdd);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center px-4">
        <View className="bg-white rounded-3xl p-5 w-full max-w-sm gap-4 border border-slate-200">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-slate-100 pb-3">
            <Text className="text-base font-extrabold text-slate-900 flex-1 pr-2" numberOfLines={1}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center min-h-[44px] min-w-[44px]"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick Shortcuts */}
          <View className="flex-row flex-wrap gap-1.5">
            <TouchableOpacity
              onPress={() => handleSelectQuick(0)}
              className="px-2.5 py-1.5 bg-slate-100 rounded-xl min-h-[36px] items-center justify-center border border-slate-200"
            >
              <Text className="text-xs font-bold text-slate-700">Hôm nay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSelectQuick(15)}
              className="px-2.5 py-1.5 bg-indigo-50 rounded-xl min-h-[36px] items-center justify-center border border-indigo-100"
            >
              <Text className="text-xs font-bold text-indigo-700">+15 ngày</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSelectQuick(30)}
              className="px-2.5 py-1.5 bg-indigo-50 rounded-xl min-h-[36px] items-center justify-center border border-indigo-100"
            >
              <Text className="text-xs font-bold text-indigo-700">+30 ngày</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSelectQuick(60)}
              className="px-2.5 py-1.5 bg-indigo-50 rounded-xl min-h-[36px] items-center justify-center border border-indigo-100"
            >
              <Text className="text-xs font-bold text-indigo-700">+60 ngày</Text>
            </TouchableOpacity>
          </View>

          {/* Month / Year Navigator */}
          <View className="flex-row items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <TouchableOpacity onPress={prevMonth} className="p-1 min-h-[36px] min-w-[36px] items-center justify-center">
              <Feather name="chevron-left" size={20} color="#475569" />
            </TouchableOpacity>
            <Text className="text-sm font-black text-slate-800">
              Tháng {month + 1}, {year}
            </Text>
            <TouchableOpacity onPress={nextMonth} className="p-1 min-h-[36px] min-w-[36px] items-center justify-center">
              <Feather name="chevron-right" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Day Headers (T2..CN) */}
          <View className="flex-row">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
              <View key={i} className="w-[14.285%] items-center justify-center py-1">
                <Text className="text-xs font-extrabold text-slate-400">{d}</Text>
              </View>
            ))}
          </View>

          {/* Day Grid */}
          <View className="flex-row flex-wrap">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <View key={`empty-${i}`} className="w-[14.285%] aspect-square p-0.5" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateObj = new Date(year, month, dayNum);
              const isSelected = isSameDay(dateObj, selectedDate);
              const isToday = isSameDay(dateObj, new Date());

              return (
                <View key={`day-${dayNum}`} className="w-[14.285%] aspect-square p-0.5 items-center justify-center">
                  <TouchableOpacity
                    onPress={() => setSelectedDate(dateObj)}
                    className={`w-full h-full items-center justify-center rounded-xl ${
                      isSelected
                        ? 'bg-indigo-600'
                        : isToday
                        ? 'bg-indigo-100 border border-indigo-300'
                        : 'bg-slate-50'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-white font-extrabold'
                          : isToday
                          ? 'text-indigo-700 font-extrabold'
                          : 'text-slate-800'
                      }`}
                    >
                      {dayNum}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Footer & Actions */}
          <View className="flex-row items-center justify-between border-t border-slate-100 pt-3">
            <View>
              <Text className="text-[10px] font-bold text-slate-400 uppercase">NGÀY ĐÃ CHỌN</Text>
              <Text className="text-sm font-black text-indigo-600">
                {formatDateToDDMMYYYY(selectedDate)}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={onClose}
                className="px-3.5 py-2.5 bg-slate-100 rounded-xl min-h-[44px] items-center justify-center"
              >
                <Text className="text-xs font-bold text-slate-600">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                className="px-4 py-2.5 bg-indigo-600 rounded-xl min-h-[44px] items-center justify-center active:bg-indigo-700"
              >
                <Text className="text-xs font-extrabold text-white">Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default DatePickerModal;
