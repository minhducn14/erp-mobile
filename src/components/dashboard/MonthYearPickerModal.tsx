import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BrandColors } from '@/constants/colors';

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
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chọn thời gian tra cứu</Text>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Year Switcher Row */}
              <View style={styles.yearSwitcher}>
                <TouchableOpacity
                  style={styles.yearNavBtn}
                  onPress={() => setViewYear((y) => y - 1)}
                  activeOpacity={0.7}
                >
                  <Feather name="chevron-left" size={20} color="#334155" />
                </TouchableOpacity>

                <View style={styles.yearLabelBox}>
                  <Text style={styles.yearLabelText}>Năm {viewYear}</Text>
                </View>

                <TouchableOpacity
                  style={styles.yearNavBtn}
                  onPress={() => setViewYear((y) => y + 1)}
                  activeOpacity={0.7}
                >
                  <Feather name="chevron-right" size={20} color="#334155" />
                </TouchableOpacity>
              </View>

              {/* 12 Months Grid (3 columns x 4 rows) */}
              <View style={styles.monthsGrid}>
                {MONTHS.map((name, index) => {
                  const m = index + 1;
                  const active = isSelected(m);
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.monthCell, active && styles.monthCellActive]}
                      onPress={() => handleSelectMonth(index)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.monthCellText, active && styles.monthCellTextActive]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* All Time Button */}
              <TouchableOpacity
                style={[
                  styles.allTimeBtn,
                  !selectedDate.month && !selectedDate.year && styles.allTimeBtnActive,
                ]}
                onPress={handleSelectAllTime}
                activeOpacity={0.75}
              >
                <Feather
                  name="calendar"
                  size={15}
                  color={!selectedDate.month && !selectedDate.year ? '#FFFFFF' : BrandColors.primary}
                />
                <Text
                  style={[
                    styles.allTimeText,
                    !selectedDate.month && !selectedDate.year && styles.allTimeTextActive,
                  ]}
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearSwitcher: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  yearNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  yearLabelBox: {
    alignItems: 'center',
  },
  yearLabelText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  monthCell: {
    width: '31%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  monthCellActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  monthCellText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  monthCellTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  allTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  allTimeBtnActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  allTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  allTimeTextActive: {
    color: '#FFFFFF',
  },
});
