import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { OpportunityItem } from '@/services/opportunityService';
import { BrandColors } from '@/constants/colors';
import { formatVND } from '@/utils/formatters';

interface OpportunityCardProps {
  item: OpportunityItem;
  onPress: () => void;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({ item, onPress }) => {
  const customerName = item.customer?.name || item.leadName || 'Chưa xác định';
  const isLead = !item.customer && !!item.leadName;
  const phoneNumber = item.customer?.phone || item.leadPhone;

  // Format currency with standard thousand separators
  const formatMoney = (val?: number) => formatVND(val);

  // Status mapping
  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { label: 'Mới tạo', color: '#64748B', bg: '#F1F5F9' };
      case 'PENDING_OPP_APPROVAL':
        return { label: 'Chờ BOD duyệt', color: '#D97706', bg: '#FEF3C7' };
      case 'OPP_APPROVED':
        return { label: 'Đã duyệt cơ hội', color: '#059669', bg: '#D1FAE5' };
      case 'QUOTATION_DRAFTING':
        return { label: 'Đang làm báo giá', color: '#2563EB', bg: '#DBEAFE' };
      case 'PENDING_QUOTE_APPROVAL':
        return { label: 'Chờ duyệt báo giá', color: '#EA580C', bg: '#FFEDD5' };
      case 'QUOTE_APPROVED':
        return { label: 'Báo giá đã duyệt', color: '#0D9488', bg: '#CCFBF1' };
      case 'CONTRACT_CREATED':
        return { label: 'Đã tạo hợp đồng', color: '#7C3AED', bg: '#EDE9FE' };
      case 'PROJECT_ASSIGNED':
        return { label: 'Đã giao dự án', color: '#4F46E5', bg: '#EEF2FF' };
      case 'IMPLEMENTATION':
        return { label: 'Đang triển khai', color: '#0284C7', bg: '#E0F2FE' };
      case 'COMPLETED':
        return { label: 'Hoàn thành', color: '#16A34A', bg: '#DCFCE7' };
      case 'CANCELLED':
        return { label: 'Đã hủy', color: '#DC2626', bg: '#FEE2E2' };
      default:
        return { label: status, color: '#64748B', bg: '#F1F5F9' };
    }
  };

  // Priority mapping
  const getPriorityMeta = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
        return { label: 'Gấp', color: '#EF4444' };
      case 'HIGH':
        return { label: 'Cao', color: '#F97316' };
      case 'MEDIUM':
        return { label: 'Trung bình', color: '#3B82F6' };
      case 'LOW':
        return { label: 'Thấp', color: '#6B7280' };
      default:
        return null;
    }
  };

  const statusMeta = getStatusMeta(item.status);
  const priorityMeta = getPriorityMeta(item.priority);
  const chance = item.successChance ?? 0;

  const handleCall = () => {
    if (!phoneNumber) {
      Alert.alert('Không có SĐT', 'Cơ hội này chưa cập nhật số điện thoại liên hệ.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Lỗi', 'Không thể kích hoạt cuộc gọi.');
    });
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Top Header Row: Code, Priority, Status */}
      <View style={styles.headerRow}>
        <View style={styles.codeRow}>
          <Text style={styles.codeText}>{item.opportunityCode || 'OPP'}</Text>
          {priorityMeta && (
            <View style={[styles.priorityBadge, { borderColor: priorityMeta.color }]}>
              <Text style={[styles.priorityText, { color: priorityMeta.color }]}>
                {priorityMeta.label}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
          <Text style={[styles.statusText, { color: statusMeta.color }]}>
            {statusMeta.label}
          </Text>
        </View>
      </View>

      {/* Opportunity Name */}
      <Text style={styles.title} numberOfLines={2}>
        {item.name}
      </Text>

      {/* Customer / Lead Info */}
      <View style={styles.customerRow}>
        <Ionicons
          name={isLead ? 'person-outline' : 'business-outline'}
          size={15}
          color="#64748B"
        />
        <Text style={styles.customerName} numberOfLines={1}>
          {customerName}
        </Text>
        {isLead && (
          <View style={styles.leadTag}>
            <Text style={styles.leadTagText}>Lead</Text>
          </View>
        )}
      </View>

      {/* Financials & Chance Metrics */}
      <View style={styles.metricContainer}>
        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>Doanh thu kỳ vọng</Text>
          <Text style={styles.revenueValue}>{formatMoney(item.expectedRevenue)}</Text>
        </View>

        <View style={styles.chanceColumn}>
          <View style={styles.chanceTextRow}>
            <Text style={styles.metricLabel}>Khả năng thành công</Text>
            <Text style={styles.chanceNumber}>{chance}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, Math.max(0, chance))}%`,
                  backgroundColor:
                    chance >= 70 ? '#10B981' : chance >= 40 ? '#F59E0B' : '#94A3B8',
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Card Footer: Date & Quick Actions */}
      <View style={styles.footerRow}>
        <View style={styles.dateRow}>
          <Feather name="clock" size={13} color="#94A3B8" />
          <Text style={styles.dateText}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : 'Mới'}
          </Text>
        </View>

        <View style={styles.actionIconsRow}>
          {phoneNumber ? (
            <TouchableOpacity
              style={styles.callBtn}
              onPress={handleCall}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="phone-call" size={14} color="#10B981" />
              <Text style={styles.callText}>Gọi</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.arrowBox}>
            <Feather name="chevron-right" size={16} color="#94A3B8" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1.5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 22,
    marginBottom: 6,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  customerName: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    flex: 1,
  },
  leadTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  leadTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  metricContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 12,
  },
  metricColumn: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 2,
  },
  revenueValue: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  chanceColumn: {
    flex: 1,
  },
  chanceTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chanceNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  actionIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  callText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  arrowBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
