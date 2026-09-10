import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserProfileQuery, useLogoutMutation } from '@/hooks/queries';
import { useAuthStore } from '@/stores/useAuthStore';
import { BrandColors } from '@/constants/colors';
import BottomNavBar from '@/components/BottomNavBar';

export default function ProfileScreen() {
  const router = useRouter();
  const storeUser = useAuthStore((state) => state.user);

  // TanStack Query Hooks
  const { data: queryUser, isLoading, refetch, isRefetching } = useUserProfileQuery();
  const logoutMutation = useLogoutMutation();

  const user = queryUser || storeUser;

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng Getvini ERP?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            await logoutMutation.mutateAsync();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={BrandColors.primary}
          />
        }
      >
        {/* Profile Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>
              {(user?.fullName || user?.username || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.fullName || user?.username || 'Người dùng'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{user?.role || 'PM'}</Text>
          </View>
        </View>

        {/* Contact Info Group */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionLabel}>Thông tin tài khoản</Text>

          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Feather name="user" size={16} color={BrandColors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.fieldLabel}>Tên tài khoản</Text>
              <Text style={styles.fieldVal}>{user?.username || '-'}</Text>
            </View>
          </View>

          {user?.email ? (
            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Feather name="mail" size={16} color="#3B82F6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.fieldLabel}>Email doanh nghiệp</Text>
                <Text style={styles.fieldVal}>{user.email}</Text>
              </View>
            </View>
          ) : null}

          {user?.phoneNumber ? (
            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Feather name="phone" size={16} color="#10B981" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.fieldLabel}>Số điện thoại</Text>
                <Text style={styles.fieldVal}>{user.phoneNumber}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* System & Support Group */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionLabel}>Hệ thống & Trợ giúp</Text>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Thông tin phiên bản', 'Getvini ERP Mobile v1.0.0 (Build 2026)')}
          >
            <View style={styles.menuLeft}>
              <Feather name="info" size={16} color="#64748B" />
              <Text style={styles.menuText}>Phiên bản ứng dụng</Text>
            </View>
            <Text style={styles.versionBadge}>v1.0.0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert('Hỗ trợ kỹ thuật', 'Vui lòng liên hệ Quản trị viên IT nội bộ Getvini.')
            }
          >
            <View style={styles.menuLeft}>
              <Feather name="headphones" size={16} color="#64748B" />
              <Text style={styles.menuText}>Hỗ trợ IT nội bộ</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Feather name="log-out" size={18} color="#EF4444" />
          <Text style={styles.logoutBtnText}>Đăng xuất tài khoản</Text>
        </TouchableOpacity>

        <Text style={styles.footerBranding}>
          Getvini • Make a sustainable brand
        </Text>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  roleBadge: {
    backgroundColor: '#FFF4EA',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDCB9E',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
    textTransform: 'uppercase',
  },
  sectionGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  fieldVal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  versionBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  footerBranding: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
  },
});
