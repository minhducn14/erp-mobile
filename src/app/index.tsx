import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import BottomNavBar from '@/components/BottomNavBar';

const logo = require('@/assets/images/logo.png');
const PRIMARY_COLOR = '#F38820';

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Redirect to login if not authenticated (mirroring ProtectedRoute in erp-UI)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Khởi tạo hệ thống...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleNotificationPress = () => {
    Alert.alert('Thông báo', 'Bạn không có thông báo mới nào chưa đọc.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header Bar: User Profile Greeting & Actions */}
      <View style={styles.topBar}>
        <View style={styles.userSection}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>
              {(user?.fullName || user?.username || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.greetingText}>Xin chào,</Text>
            <View style={styles.nameBadgeRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.fullName || user?.username}
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{user?.role || 'PM'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.iconActionBtn}
            onPress={handleNotificationPress}
            activeOpacity={0.7}
          >
            <Feather name="bell" size={20} color="#475569" />
            <View style={styles.notifDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconActionBtn, styles.logoutBtn]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Feather name="log-out" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quick Search Bar */}
        <View style={styles.searchBarWrapper}>
          <Feather name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm dự án, nhiệm vụ, khách hàng..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Dashboard Sections */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tổng quan hoạt động</Text>
        </View>

        <View style={styles.statsGrid}>
          <TouchableOpacity style={styles.statCard} activeOpacity={0.75}>
            <View style={[styles.statIcon, { backgroundColor: '#FFF4EA' }]}>
              <Feather name="folder" size={20} color={PRIMARY_COLOR} />
            </View>
            <Text style={styles.statVal}>Dự án</Text>
            <Text style={styles.statDesc}>Quản lý tiến độ</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.75}>
            <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="check-square" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.statVal}>Nhiệm vụ</Text>
            <Text style={styles.statDesc}>Danh sách việc làm</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.75}>
            <View style={[styles.statIcon, { backgroundColor: '#ECFDF5' }]}>
              <Feather name="users" size={20} color="#10B981" />
            </View>
            <Text style={styles.statVal}>Khách hàng</Text>
            <Text style={styles.statDesc}>Hồ sơ đối tác</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.75}>
            <View style={[styles.statIcon, { backgroundColor: '#FFFBEB' }]}>
              <Feather name="file-text" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.statVal}>Hợp đồng</Text>
            <Text style={styles.statDesc}>Kinh tế & Phụ lục</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  greetingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  roleBadge: {
    backgroundColor: '#FFF4EA',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDCB9E',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: PRIMARY_COLOR,
    textTransform: 'uppercase',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: PRIMARY_COLOR,
  },
  logoutBtn: {
    backgroundColor: '#FEF2F2',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  sectionHeader: {
    paddingHorizontal: 18,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  statDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
});
