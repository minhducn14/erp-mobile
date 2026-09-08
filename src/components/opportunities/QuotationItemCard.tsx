import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { QuotationItem, QuotationStatus } from '@/services/quotationService';

interface QuotationItemCardProps {
  item: QuotationItem;
  isAdminOrBod?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export const QuotationItemCard: React.FC<QuotationItemCardProps> = ({
  item,
  isAdminOrBod,
  onApprove,
  onReject,
}) => {
  const formatMoney = (val?: number) => {
    if (!val) return '0 ₫';
    return `${val.toLocaleString('vi-VN')} ₫`;
  };

  const getStatusMeta = (status: string) => {
    switch (status) {
      case QuotationStatus.DRAFT:
        return { label: 'Bản nháp', color: '#64748B', bg: '#F1F5F9' };
      case QuotationStatus.PENDING_APPROVAL:
        return { label: 'Chờ BOD duyệt', color: '#D97706', bg: '#FEF3C7' };
      case QuotationStatus.APPROVED:
        return { label: 'Đã duyệt', color: '#059669', bg: '#D1FAE5' };
      case QuotationStatus.REJECTED:
        return { label: 'Từ chối', color: '#DC2626', bg: '#FEE2E2' };
      default:
        return { label: status, color: '#64748B', bg: '#F1F5F9' };
    }
  };

  const statusMeta = getStatusMeta(item.status);
  const isPending = item.status === QuotationStatus.PENDING_APPROVAL;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>Phiên bản #{item.version || 1}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
          <Text style={[styles.statusText, { color: statusMeta.color }]}>
            {statusMeta.label}
          </Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Tổng giá trị báo giá:</Text>
        <Text style={styles.amountValue}>{formatMoney(item.totalAmount)}</Text>
      </View>

      {item.note ? (
        <Text style={styles.noteText} numberOfLines={2}>
          Ghi chú: {item.note}
        </Text>
      ) : null}

      <View style={styles.footerRow}>
        <Text style={styles.dateText}>
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''}
        </Text>

        {isAdminOrBod && isPending && (
          <View style={styles.actionsRow}>
            {onReject && (
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => onReject(item.id)}
                activeOpacity={0.75}
              >
                <Feather name="x" size={14} color="#DC2626" />
                <Text style={styles.rejectText}>Từ chối</Text>
              </TouchableOpacity>
            )}

            {onApprove && (
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => onApprove(item.id)}
                activeOpacity={0.75}
              >
                <Feather name="check" size={14} color="#FFFFFF" />
                <Text style={styles.approveText}>Duyệt</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  versionBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  versionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  amountLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  noteText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  rejectText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  approveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
