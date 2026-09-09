import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StatCard } from '../StatCard';
import { HotProjectsWidget } from '../HotProjectsWidget';
import { BrandColors } from '@/constants/colors';
import { formatVND } from '@/utils/formatters';

interface SalesDashboardViewProps {
  saleMetrics?: {
    totalCustomers?: number;
    totalOpportunities?: number;
    totalRevenue?: number;
    totalDebt?: number;
    projects?: any[];
  };
}

export const SalesDashboardView: React.FC<SalesDashboardViewProps> = ({ saleMetrics }) => {
  const router = useRouter();

  const formatMoney = (val?: number) => {
    if (!val) return '0 ₫';
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} Tỷ`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)} Tr`;
    return formatVND(val);
  };

  const saleProjects = saleMetrics?.projects || [];

  return (
    <View style={styles.container}>
      {/* 4 Core Sales Metrics */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Khách hàng phụ trách"
          value={saleMetrics?.totalCustomers ?? 0}
          subtitle="Hồ sơ đối tác"
          icon="users"
          color={BrandColors.primary}
          bgColor="#FFF7ED"
          onPress={() => router.push('/customers' as any)}
        />
        <StatCard
          title="Cơ hội kinh doanh"
          value={saleMetrics?.totalOpportunities ?? 0}
          subtitle="Đang chăm sóc"
          icon="target"
          color="#3B82F6"
          bgColor="#EFF6FF"
          onPress={() => router.push('/opportunities' as any)}
        />
        <StatCard
          title="Doanh số ký"
          value={formatMoney(saleMetrics?.totalRevenue)}
          subtitle="Hợp đồng kỳ này"
          icon="dollar-sign"
          color="#10B981"
          bgColor="#ECFDF5"
        />
        <StatCard
          title="Công nợ theo dõi"
          value={formatMoney(saleMetrics?.totalDebt)}
          subtitle="Cần thu hồi"
          icon="alert-circle"
          color="#F59E0B"
          bgColor="#FFFBEB"
        />
      </View>

      {/* Sales Projects Progress */}
      <HotProjectsWidget
        projects={saleProjects}
        onProjectPress={(proj) => router.push(`/projects/${proj.id}` as any)}
        onViewAll={() => router.push('/projects' as any)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
});
