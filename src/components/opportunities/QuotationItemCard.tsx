import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { QuotationItem, QuotationStatus } from '@/services/quotationService';
import { formatVND } from '@/utils/formatters';

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
  const formatMoney = (val?: number) => formatVND(val);

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
      className="bg-surface rounded-xl p-3.5 mb-2.5 border border-border"
      activeOpacity={onPress ? 0.7 : 1}
      onPress={() => onPress && onPress(item)}
      disabled={!onPress}
    >
      <View className="flex-row justify-between items-center mb-2.5">
        <View className="bg-blue-50 px-2 py-[3px] rounded-md border border-blue-200">
          <Text className="text-xs font-bold text-blue-600">Báo giá lần {item.version || 1}</Text>
        </View>

        <View className="flex-row items-center">
          <View className="px-2 py-[3px] rounded-md" style={{ backgroundColor: statusMeta.bg }}>
            <Text className="text-[11px] font-bold" style={{ color: statusMeta.color }}>
              {statusMeta.label}
            </Text>
          </View>
          {onPress && (
            <Feather name="chevron-right" size={16} color="#94A3B8" className="ml-1.5" />
          )}
        </View>
      </View>

      <View className="flex-row justify-between items-baseline mb-1.5">
        <Text className="text-xs text-text-secondary font-semibold">Tổng giá trị báo giá:</Text>
        <Text className="text-base font-extrabold text-text-primary">{formatMoney(item.totalAmount)}</Text>
      </View>

      {item.note ? (
        <Text className="text-xs text-text-secondary italic mb-2" numberOfLines={2}>
          Ghi chú: {item.note}
        </Text>
      ) : null}

      {!isExpired && item.status === QuotationStatus.REJECTED && !!item.description && (
        <View className="bg-rose-50 rounded-lg p-2 mb-2 border border-rose-200">
          <Text className="text-[11px] font-bold text-rose-600 mb-0.5">Lý do từ chối:</Text>
          <Text className="text-xs text-rose-700">{item.description}</Text>
        </View>
      )}

      <View className="flex-row justify-between items-center pt-2 border-t border-slate-100">
        <Text className="text-[11px] text-text-muted">
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''}
        </Text>

        {!isExpired && isAdminOrBod && isPending && (
          <View className="flex-row gap-2">
            {onReject && (
              <TouchableOpacity
                className="flex-row items-center gap-1 bg-rose-100 px-2.5 py-[5px] rounded-md"
                onPress={() => onReject(item.id)}
                activeOpacity={0.75}
              >
                <Feather name="x" size={14} color="#DC2626" />
                <Text className="text-xs font-bold text-rose-600">Từ chối</Text>
              </TouchableOpacity>
            )}

            {onApprove && (
              <TouchableOpacity
                className="flex-row items-center gap-1 bg-emerald-500 px-3 py-[5px] rounded-md"
                onPress={() => onApprove(item.id)}
                activeOpacity={0.75}
              >
                <Feather name="check" size={14} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white">Duyệt</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!isExpired && item.status === QuotationStatus.REJECTED && onEdit && (
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="flex-row items-center gap-1 bg-blue-50 px-2.5 py-[5px] rounded-md border border-blue-200"
              onPress={() => onEdit(item)}
              activeOpacity={0.75}
            >
              <Feather name="edit-2" size={13} color="#2563EB" />
              <Text className="text-xs font-bold text-blue-600">Sửa báo giá</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};
