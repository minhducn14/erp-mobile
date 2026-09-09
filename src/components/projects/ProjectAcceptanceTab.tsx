import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AcceptanceItem, ACCEPTANCE_STATUS_CONFIG } from '@/services/acceptanceService';
import { BrandColors } from '@/constants/colors';
import { formatNumber } from '@/utils/formatters';

interface ProjectAcceptanceTabProps {
  acceptances: AcceptanceItem[];
  isLoading: boolean;
  projectStatus?: string;
  isPmOrAdmin?: boolean;
  onOpenCreateAcceptance: () => void;
  onOpenReviewAcceptance?: (item: AcceptanceItem) => void;
}

export default function ProjectAcceptanceTab({
  acceptances,
  isLoading,
  projectStatus,
  isPmOrAdmin = false,
  onOpenCreateAcceptance,
  onOpenReviewAcceptance,
}: ProjectAcceptanceTabProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Đang tải lịch sử nghiệm thu...</Text>
      </View>
    );
  }

  const isPendingConfirmation = projectStatus === 'PENDING_CONFIRMATION';

  const getStatusBadge = (status: string) => {
    const config = ACCEPTANCE_STATUS_CONFIG[status];
    return {
      bg: config?.bg || '#F1F5F9',
      color: config?.color || '#64748B',
      label: config?.text || status,
    };
  };

  return (
    <View style={styles.container}>
      {/* Pending Confirmation Warning Banner */}
      {isPendingConfirmation && (
        <View style={styles.lockBanner}>
          <Feather name="lock" size={18} color="#C2410C" />
          <View style={{ flex: 1 }}>
            <Text style={styles.lockBannerTitle}>Dự án chưa được PM chấp nhận</Text>
            <Text style={styles.lockBannerDesc}>
              Chưa thể tạo hoặc yêu cầu nghiệm thu mới cho tới khi PM chấp nhận dự án.
            </Text>
          </View>
        </View>
      )}

      {/* Top Action Bar */}
      <View style={styles.topBar}>
        <Text style={styles.sectionHeaderTitle}>Biên bản nghiệm thu ({acceptances.length})</Text>
        {!isPendingConfirmation && isPmOrAdmin && (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={onOpenCreateAcceptance}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={14} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Tạo nghiệm thu</Text>
          </TouchableOpacity>
        )}
      </View>


      {acceptances.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="clipboard" size={40} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Chưa có biên bản nghiệm thu nào</Text>
          <Text style={styles.emptyDesc}>
            Dự án này chưa gửi biên bản nghiệm thu. Bấm "Tạo nghiệm thu" để tạo yêu cầu mới.
          </Text>
        </View>
      ) : (
        <View style={styles.listSection}>
          {acceptances.map((item) => {
            const statusInfo = getStatusBadge(item.status);
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.titleText} numberOfLines={1}>
                      {item.name || (item.acceptanceCode ? `#${item.acceptanceCode}` : 'Biên bản nghiệm thu')}
                    </Text>
                    {item.acceptanceCode && item.name ? (
                      <Text style={styles.codeSubText}>#{item.acceptanceCode}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>

                {item.amount ? (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Giá trị nghiệm thu:</Text>
                    <Text style={styles.amountVal}>{formatNumber(item.amount)} đ</Text>
                  </View>
                ) : null}

                {item.note ? (
                  <Text style={styles.noteText} numberOfLines={2}>
                    Ghi chú: {item.note}
                  </Text>
                ) : null}

                <View style={styles.cardFooter}>
                  {item.creator?.fullName && (
                    <View style={styles.creatorWrap}>
                      <Feather name="user" size={12} color="#64748B" />
                      <Text style={styles.creatorText}>Người yêu cầu: {item.creator.fullName}</Text>
                    </View>
                  )}

                  {onOpenReviewAcceptance && (
                    <TouchableOpacity
                      style={styles.reviewLinkBtn}
                      onPress={() => onOpenReviewAcceptance(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.reviewLinkText}>
                        {item.status === 'PENDING' ? 'Phê duyệt' : 'Chi tiết'}
                      </Text>
                      <Feather name="chevron-right" size={14} color={BrandColors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listSection: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  codeSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
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
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  amountVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  noteText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 2,
  },
  creatorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  creatorText: {
    fontSize: 12,
    color: '#64748B',
  },
  reviewLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 260,
  },
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 14,
    padding: 14,
  },
  lockBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C2410C',
    marginBottom: 2,
  },
  lockBannerDesc: {
    fontSize: 12,
    color: '#9A3412',
    lineHeight: 18,
  },
});
