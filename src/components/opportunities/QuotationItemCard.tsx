import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { QuotationItem, QuotationStatus } from '@/services/quotationService';

interface QuotationItemCardProps {
  item: QuotationItem;
  isAdminOrBod?: boolean;
  isExpired?: boolean;
  onPress?: (item: QuotationItem) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onEdit?: (item: QuotationItem) => void;
}

export const QuotationItemCard: React.FC<QuotationItemCardProps> = ({
  item,
  isAdminOrBod,
  isExpired = false,
  onPress,
  onApprove,
  onReject,
  onEdit,
}) => {
  const formatMoney = (val?: number) => {
    if (!val) return '0 ₫';
    return `${val.toLocaleString('vi-VN')} ₫`;
  };

  const getStatusMeta = (status: string) => {
    if (isExpired) {
      return { label: 'Hết hiệu lực', color: '#64748B', bg: '#F1F5F9' };
    }
    switch (status) {
      case QuotationStatus.DRAFT:
        return { label: 'Đang đợi duyệt', color: '#475569', bg: '#F1F5F9' };
      case QuotationStatus.PENDING_APPROVAL:
        return { label: 'Chờ BOD duyệt', color: '#D97706', bg: '#FEF3C7' };
      case QuotationStatus.APPROVED:
        return { label: 'Đã duyệt', color: '#059669', bg: '#D1FAE5' };
      case QuotationStatus.REJECTED:
        return { label: 'Từ chối', color: '#DC2626', bg: '#FEE2E2' };
      case 'SENT':
        return { label: 'Đã gửi', color: '#2563EB', bg: '#EFF6FF' };
      default:
        return { label: status, color: '#64748B', bg: '#F1F5F9' };
    }
  };

  const statusMeta = getStatusMeta(item.status);
  const isPending =
    item.status === QuotationStatus.DRAFT ||
    item.status === QuotationStatus.PENDING_APPROVAL ||
    item.status === 'DRAFT' ||
    item.status === 'PENDING_APPROVAL';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={onPress ? 0.7 : 1}
      onPress={() => onPress && onPress(item)}
      disabled={!onPress}
    >
      <View style={styles.topRow}>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>Báo giá lần {item.version || 1}</Text>
        </View>

        <View style={styles.topRightRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
            <Text style={[styles.statusText, { color: statusMeta.color }]}>
              {statusMeta.label}
            </Text>
          </View>
          {onPress && (
            <Feather name="chevron-right" size={16} color="#94A3B8" style={{ marginLeft: 6 }} />
          )}
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

      {!isExpired && item.status === QuotationStatus.REJECTED && !!item.description && (
        <View style={styles.rejectReasonBox}>
          <Text style={styles.rejectReasonLabel}>Lý do từ chối:</Text>
          <Text style={styles.rejectReasonText}>{item.description}</Text>
        </View>
      )}

      <View style={styles.footerRow}>
        <Text style={styles.dateText}>
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''}
        </Text>

        {!isExpired && isAdminOrBod && isPending && (
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

        {!isExpired && item.status === QuotationStatus.REJECTED && onEdit && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.editCardBtn}
              onPress={() => onEdit(item)}
              activeOpacity={0.75}
            >
              <Feather name="edit-2" size={13} color="#2563EB" />
              <Text style={styles.editCardText}>Sửa báo giá</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  versionBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
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
  rejectReasonBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectReasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 2,
  },
  rejectReasonText: {
    fontSize: 12,
    color: '#B91C1C',
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
  editCardBtn: {
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
  editCardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
});
