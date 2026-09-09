import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BrandColors } from '@/constants/colors';
import { formatVND } from '@/utils/formatters';

interface FocusBannerProps {
  userName?: string;
  pendingApprovalCount?: number;
  activeProjectCount?: number;
  totalDebt?: number;
  averageProgress?: number;
  isAdminOrBod?: boolean;
  onViewApprovals?: () => void;
  onViewProjects?: () => void;
}

export const FocusBanner: React.FC<FocusBannerProps> = ({
  userName,
  pendingApprovalCount = 0,
  activeProjectCount = 0,
  totalDebt = 0,
  averageProgress = 65,
  isAdminOrBod = false,
  onViewApprovals,
  onViewProjects,
}) => {
  const formatCompactMoney = (val?: number) => {
    if (!val) return '0 ₫';
    if (val >= 1_000_000_000) {
      return `${(val / 1_000_000_000).toFixed(1)} Tỷ`;
    }
    if (val >= 1_000_000) {
      return `${(val / 1_000_000).toFixed(0)} Tr`;
    }
    return formatVND(val);
  };

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.topRow}>
        <View style={styles.tagBadge}>
          <Text style={styles.tagText}>{isAdminOrBod ? 'ADMIN FOCUS' : 'MEMBER FOCUS'}</Text>
        </View>

        {/* Circular / Pill Progress Indicator */}
        <View style={styles.progressPill}>
          <Feather name="trending-up" size={13} color={BrandColors.primary} />
          <Text style={styles.progressPillText}>{averageProgress}% tiến độ TB</Text>
        </View>
      </View>

      <Text style={styles.headline}>
        Tập trung để tạo ra{'\n'}những điều khác biệt! 🔥
      </Text>

      {/* 3 Quick Highlight Pills */}
      <View style={styles.pillsRow}>
        {pendingApprovalCount > 0 && (
          <TouchableOpacity
            style={[styles.pillCard, styles.approvalCard]}
            onPress={onViewApprovals}
            activeOpacity={0.8}
            disabled={!onViewApprovals}
          >
            <View style={styles.approvalIcon}>
              <Feather name="clipboard" size={14} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.pillNumber}>{pendingApprovalCount}</Text>
              <Text style={styles.pillLabel}>Cần duyệt</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.pillCard}
          onPress={onViewProjects}
          activeOpacity={0.8}
          disabled={!onViewProjects}
        >
          <View style={[styles.pillIcon, { backgroundColor: '#EFF6FF' }]}>
            <Feather name="folder" size={14} color="#3B82F6" />
          </View>
          <View>
            <Text style={styles.pillNumber}>{activeProjectCount}</Text>
            <Text style={styles.pillLabel}>Dự án chạy</Text>
          </View>
        </TouchableOpacity>

        {isAdminOrBod && totalDebt > 0 && (
          <View style={styles.pillCard}>
            <View style={[styles.pillIcon, { backgroundColor: '#FFFBEB' }]}>
              <Feather name="credit-card" size={14} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.pillNumber} numberOfLines={1}>
                {formatCompactMoney(totalDebt)}
              </Text>
              <Text style={styles.pillLabel}>Công nợ</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    marginBottom: 16,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagBadge: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E11D48',
    letterSpacing: 0.8,
  },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  progressPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primaryDark,
  },
  headline: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 26,
    letterSpacing: -0.4,
    marginBottom: 14,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pillCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE8D6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  approvalCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  approvalIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  pillLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
  },
});
