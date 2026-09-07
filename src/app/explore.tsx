import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BrandColors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import BottomNavBar from '@/components/BottomNavBar';

const MODULES = [
  {
    id: 'projects',
    title: 'Quản lý Dự án & Tasks',
    desc: 'Theo dõi tiến độ Kanban, phân công công việc, xét duyệt và nghiệm thu nhiệm vụ.',
    icon: 'briefcase-outline' as const,
    color: BrandColors.primary,
    badge: 'Cốt lõi',
  },
  {
    id: 'contracts',
    title: 'Hợp đồng & Phụ lục',
    desc: 'Quản lý danh sách hợp đồng kinh tế, điều khoản thanh toán và phụ lục phát sinh.',
    icon: 'document-text-outline' as const,
    color: '#3B82F6',
    badge: 'Pháp lý',
  },
  {
    id: 'customers',
    title: 'Khách hàng & CRM',
    desc: 'Hồ sơ đối tác doanh nghiệp, lịch sử giao dịch và cơ hội hợp tác kinh doanh.',
    icon: 'people-outline' as const,
    color: '#10B981',
    badge: 'Kinh doanh',
  },
  {
    id: 'finance',
    title: 'Tài chính & Công nợ',
    desc: 'Theo dõi các đợt thanh toán, công nợ phải thu/phải trả và dòng tiền dự án.',
    icon: 'card-outline' as const,
    color: '#F59E0B',
    badge: 'Kế toán',
  },
  {
    id: 'teams',
    title: 'Đội ngũ & Nhân sự',
    desc: 'Phân quyền tài khoản (RBAC), phòng ban và đánh giá hiệu suất nhân viên.',
    icon: 'shield-checkmark-outline' as const,
    color: '#8B5CF6',
    badge: 'Nhân sự',
  },
  {
    id: 'notifications',
    title: 'Thông báo & SSE Live',
    desc: 'Nhận thông báo cập nhật công việc và tương tác theo thời gian thực.',
    icon: 'notifications-outline' as const,
    color: '#EC4899',
    badge: 'Real-time',
  },
];

export default function ExploreScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hệ sinh thái ERP</Text>
          <Text style={styles.headerSubtitle}>
            Toàn bộ các phân hệ chức năng chuyên sâu phục vụ chuyển đổi số doanh nghiệp
          </Text>
        </View>

        {/* Auth prompt if not logged in */}
        {!isAuthenticated && (
          <TouchableOpacity
            style={styles.authBanner}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.85}
          >
            <View style={styles.authBannerContent}>
              <Ionicons name="lock-closed" size={20} color={BrandColors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.authBannerTitle}>Yêu cầu đăng nhập</Text>
                <Text style={styles.authBannerText}>
                  Đăng nhập để xem và thao tác trên dữ liệu doanh nghiệp thực tế.
                </Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={18} color={BrandColors.primary} />
          </TouchableOpacity>
        )}

        {/* Modules List */}
        <View style={styles.moduleList}>
          {MODULES.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <View style={styles.headerText}>
                  <View style={styles.titleRow}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <View style={[styles.badge, { backgroundColor: item.color + '20' }]}>
                      <Text style={[styles.badgeText, { color: item.color }]}>{item.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDesc}>{item.desc}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Nav */}
      <BottomNavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  header: {
    paddingVertical: 18,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.slate900,
  },
  headerSubtitle: {
    fontSize: 13,
    color: BrandColors.slate500,
    marginTop: 6,
    lineHeight: 19,
  },
  authBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BrandColors.primaryLight,
    borderWidth: 1.5,
    borderColor: BrandColors.primaryBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  authBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  authBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.primaryDark,
  },
  authBannerText: {
    fontSize: 12,
    color: BrandColors.slate600,
    marginTop: 2,
  },
  moduleList: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BrandColors.slate200,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.slate900,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 12,
    color: BrandColors.slate500,
    lineHeight: 18,
    marginTop: 2,
  },
});
