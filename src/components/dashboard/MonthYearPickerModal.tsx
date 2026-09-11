import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface MonthYearPickerModalProps {
  visible: boolean;
  selectedDate: {
    month: number | null;
    year: number | null;
  };
  onClose: () => void;
  onSelect: (date: { month: number | null; year: number | null }) => void;
}

const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

export const MonthYearPickerModal: React.FC<MonthYearPickerModalProps> = ({
  visible,
  selectedDate,
  onClose,
  onSelect,
}) => {
  const currentYear = new Date().getFullYear();
  const [viewYear, setViewYear] = useState(selectedDate.year || currentYear);

  const isSelected = (m: number) => {
    return selectedDate.month === m && selectedDate.year === viewYear;
  };

  const handleSelectMonth = (monthIndex: number) => {
    onSelect({
      month: monthIndex + 1,
      year: viewYear,
    });
    onClose();
  };

  const handleSelectAllTime = () => {
    onSelect({
      month: null,
      year: null,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-slate-900/50 justify-center items-center p-5">
          <TouchableWithoutFeedback>
            <View className="w-full max-w-[360px] bg-surface rounded-3xl p-5 shadow-xl">
              {/* Modal Header */}
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-base font-extrabold text-text-primary">Chọn thời gian tra cứu</Text>
                <TouchableOpacity
                  className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center"
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Year Switcher Row */}
              <View className="flex-row justify-between items-center bg-background rounded-xl p-1.5 mb-4 border border-border">
                <TouchableOpacity
                  className="w-9 h-9 rounded-lg bg-surface items-center justify-center border border-border"
                  onPress={() => setViewYear((y) => y - 1)}
                  activeOpacity={0.7}
                >
                  <Feather name="chevron-left" size={20} color="#334155" />
                </TouchableOpacity>

                <View className="items-center">
                  <Text className="text-sm font-extrabold text-text-primary tracking-wide">Năm {viewYear}</Text>
                </View>

                <TouchableOpacity
                  className="w-9 h-9 rounded-lg bg-surface items-center justify-center border border-border"
                  onPress={() => setViewYear((y) => y + 1)}
                  activeOpacity={0.7}
                >
                  <Feather name="chevron-right" size={20} color="#334155" />
                </TouchableOpacity>
              </View>

              {/* 12 Months Grid */}
              <View className="flex-row flex-wrap gap-2 justify-between">
                {MONTHS.map((name, index) => {
                  const m = index + 1;
                  const active = isSelected(m);
                  return (
                    <TouchableOpacity
                      key={m}
                      className={`w-[31%] py-3 rounded-xl items-center justify-center border ${
                        active
                          ? 'bg-primary border-primary shadow-xs'
                          : 'bg-background border-slate-100'
                      }`}
                      onPress={() => handleSelectMonth(index)}
                      activeOpacity={0.75}
                    >
                      <Text className={`text-xs ${active ? 'font-extrabold text-white' : 'font-semibold text-slate-700'}`}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Divider */}
              <View className="h-px bg-slate-100 my-3.5" />

              {/* All Time Button */}
              <TouchableOpacity
                className={`flex-row items-center justify-center gap-2 py-3 rounded-xl border ${
                  !selectedDate.month && !selectedDate.year
                    ? 'bg-primary border-primary'
                    : 'bg-primary-light border-orange-200'
                }`}
                onPress={handleSelectAllTime}
                activeOpacity={0.75}
              >
                <Feather
                  name="calendar"
                  size={15}
                  color={!selectedDate.month && !selectedDate.year ? '#FFFFFF' : '#F38820'}
                />
                <Text
                  className={`text-xs font-bold ${
                    !selectedDate.month && !selectedDate.year ? 'text-white' : 'text-primary'
                  }`}
                >
                  Tất cả thời gian
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

