import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import BottomNavBar from '@/components/BottomNavBar';
import { StatCard } from '@/components/dashboard/StatCard';
import { ReviewQueueWidget } from '@/components/dashboard/ReviewQueueWidget';
import { TodayTasksWidget } from '@/components/dashboard/TodayTasksWidget';
import { FocusBanner } from '@/components/dashboard/FocusBanner';
import { QuickActionGrid } from '@/components/dashboard/QuickActionGrid';
import { HotProjectsWidget } from '@/components/dashboard/HotProjectsWidget';
import { MonthYearPickerModal } from '@/components/dashboard/MonthYearPickerModal';
import { AdminDashboardView } from '@/components/dashboard/views/AdminDashboardView';
import { SalesDashboardView } from '@/components/dashboard/views/SalesDashboardView';
import { TeamLeadDashboardView } from '@/components/dashboard/views/TeamLeadDashboardView';
import { MemberDashboardView } from '@/components/dashboard/views/MemberDashboardView';
import {
  dashboardService,
  DashboardResponse,
  TaskItem,
} from '@/services/dashboardService';
import { BrandColors } from '@/constants/colors';
import { formatVND } from '@/utils/formatters';
import {
  canAccessCustomers,
  isManagementRole,
  isSalesRole,
} from '@/utils/rbac';

const PRIMARY_COLOR = BrandColors.primary;

import {
  useDashboardQuery,
  useMyTasksQuery,
  useAwaitingReviewTasksQuery,
} from '@/hooks/queries';

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Month & Year state
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState<{ month: number | null; year: number | null }>({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  // Check RBAC for review queue
  const isLeadOrAdmin = Boolean(
    user?.role === 'ADMIN' ||
    user?.role === 'BOD' ||
    user?.role === 'TEAM_LEAD' ||
    user?.role === 'PM'
  );

  // TanStack Query Hooks
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    isRefetching: isDashboardRefetching,
    refetch: refetchDashboard,
  } = useDashboardQuery({
    month: selectedDate.month ?? undefined,
    year: selectedDate.year ?? undefined,
  });

  const {
    data: todayTasks = [],
    refetch: refetchMyTasks,
    isRefetching: isMyTasksRefetching,
  } = useMyTasksQuery();

  const {
    data: reviewTasks = [],
    refetch: refetchReviewTasks,
    isRefetching: isReviewRefetching,
  } = useAwaitingReviewTasksQuery(isLeadOrAdmin);

  const isRefetching = isDashboardRefetching || isMyTasksRefetching || isReviewRefetching;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  const handleRefresh = () => {
    refetchDashboard();
    refetchMyTasks();
    if (isLeadOrAdmin) {
      refetchReviewTasks();
    }
  };

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

  // Determine role-based permissions & metrics
  const isAdminOrBod = isManagementRole(user?.role);
  const isSale = isSalesRole(user?.role);
  const canViewCustomers = canAccessCustomers(user?.role);

  const adminMetrics = dashboardData?.admin;
  const saleMetrics = dashboardData?.sale;
  const teamLeadProjects = dashboardData?.teamLead || [];
  const memberMetrics = dashboardData?.member;

  // Format currency helper
  const formatMoney = (val?: number) => {
    if (!val) return '0 ₫';
    if (val >= 1_000_000_000) {
      return `${(val / 1_000_000_000).toFixed(1)} Tỷ`;
    }
    if (val >= 1_000_000) {
      return `${(val / 1_000_000).toFixed(0)} Tr`;
    }
    return formatVND(val);
  };

  const hotProjects =
    isAdminOrBod && Array.isArray(adminMetrics?.currentProjects) && adminMetrics.currentProjects.length > 0
      ? adminMetrics.currentProjects
      : teamLeadProjects.length > 0
      ? teamLeadProjects
      : isSale && Array.isArray(saleMetrics?.projects) && saleMetrics.projects.length > 0
      ? saleMetrics.projects
      : memberMetrics?.participatingProjects || [];

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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={[PRIMARY_COLOR]}
            tintColor={PRIMARY_COLOR}
          />
        }
      >
        {/* Quick Search Bar */}
        <View style={styles.searchBarWrapper}>
          <Feather name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm dự án, nhiệm vụ..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Focus Banner (mirroring AdminFocusCard / TodayFocusCard on Web) */}
        <FocusBanner
          userName={user?.fullName || user?.username}
          pendingApprovalCount={reviewTasks.length}
          activeProjectCount={
            isAdminOrBod
              ? adminMetrics?.currentProjects?.length ?? adminMetrics?.activeProjects ?? teamLeadProjects.length ?? 0
              : isSale
              ? saleMetrics?.projects?.length ?? 0
              : teamLeadProjects.length || memberMetrics?.participatingProjects?.length || 0
          }
          totalDebt={
            isAdminOrBod
              ? adminMetrics?.totalDebt ?? 0
              : isSale
              ? saleMetrics?.totalDebt ?? 0
              : 0
          }
          averageProgress={68}
          isAdminOrBod={isAdminOrBod || isSale}
          onViewApprovals={() => router.push('/tasks' as any)}
          onViewProjects={() => router.push('/projects' as any)}
        />

        {/* Quick Actions Grid (8-Icon Shortcuts matching reference style) */}
        <QuickActionGrid
          userRole={user?.role}
          totalDebt={
            isAdminOrBod
              ? adminMetrics?.totalDebt ?? 0
              : isSale
              ? saleMetrics?.totalDebt ?? 0
              : 0
          }
        />

        {/* Section Header with Month/Year Switcher (mirroring MonthSelector on Web) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isAdminOrBod
              ? 'Chỉ số điều hành'
              : isSale
              ? 'Chỉ số kinh doanh'
              : 'Tiến độ công việc'}
          </Text>

          <TouchableOpacity
            style={styles.timeSelectorBtn}
            onPress={() => setIsPickerVisible(true)}
            activeOpacity={0.75}
          >
            <Feather name="calendar" size={13} color={PRIMARY_COLOR} />
            <Text style={styles.timeSelectorText}>
              {selectedDate.month
                ? `Tháng ${selectedDate.month}, ${selectedDate.year}`
                : 'Tất cả'}
            </Text>
            <Feather name="chevron-down" size={13} color="#64748B" />
          </TouchableOpacity>
        </View>

        {isDashboardLoading && !isRefetching ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            <Text style={styles.loadingDesc}>Đang đồng bộ dữ liệu Getvini...</Text>
          </View>
        ) : isAdminOrBod ? (
          <AdminDashboardView
            adminMetrics={adminMetrics}
            reviewTasks={reviewTasks}
            teamLeadProjects={teamLeadProjects}
            onTaskPress={(task) => router.push(`/tasks/${task.id}` as any)}
          />
        ) : isSale ? (
          <SalesDashboardView saleMetrics={saleMetrics} />
        ) : (user?.role === 'TEAM_LEAD' || user?.role === 'PM' || teamLeadProjects.length > 0) ? (
          <TeamLeadDashboardView
            teamLeadProjects={teamLeadProjects}
            reviewTasks={reviewTasks}
            todayTasks={todayTasks}
            onTaskPress={(task) => router.push(`/tasks/${task.id}` as any)}
          />
        ) : (
          <MemberDashboardView
            memberMetrics={memberMetrics}
            todayTasks={todayTasks}
            onTaskPress={(task) => router.push(`/tasks/${task.id}` as any)}
          />
        )}

        {/* Operational Modules Grid */}
        {/* <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Phân hệ tác nghiệp</Text>
        </View>

        <View style={styles.modulesGrid}>
          <TouchableOpacity
            style={styles.moduleCard}
            activeOpacity={0.75}
            onPress={() => router.push('/tasks' as any)}
          >
            <View style={[styles.moduleIcon, { backgroundColor: '#FFF4EA' }]}>
              <Feather name="check-square" size={22} color={PRIMARY_COLOR} />
            </View>
            <Text style={styles.moduleName}>Nhiệm vụ & Việc</Text>
            <Text style={styles.moduleDesc}>Cần làm & Chờ duyệt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleCard}
            activeOpacity={0.75}
            onPress={() => router.push('/projects' as any)}
          >
            <View style={[styles.moduleIcon, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="briefcase" size={22} color="#3B82F6" />
            </View>
            <Text style={styles.moduleName}>Quản lý Dự án</Text>
            <Text style={styles.moduleDesc}>Tiến độ & Thành viên</Text>
          </TouchableOpacity>

          {canViewCustomers ? (
            <TouchableOpacity
              style={styles.moduleCard}
              activeOpacity={0.75}
              onPress={() => router.push('/customers' as any)}
            >
              <View style={[styles.moduleIcon, { backgroundColor: '#ECFDF5' }]}>
                <Feather name="users" size={22} color="#10B981" />
              </View>
              <Text style={styles.moduleName}>Khách hàng & CRM</Text>
              <Text style={styles.moduleDesc}>Đối tác & Gọi nhanh</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.moduleCard}
              activeOpacity={0.75}
              onPress={() => router.push('/profile' as any)}
            >
              <View style={[styles.moduleIcon, { backgroundColor: '#ECFDF5' }]}>
                <Feather name="user" size={22} color="#10B981" />
              </View>
              <Text style={styles.moduleName}>Hồ sơ cá nhân</Text>
              <Text style={styles.moduleDesc}>Tài khoản & Thiết lập</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.moduleCard}
            activeOpacity={0.75}
            onPress={() => router.push('/explore')}
          >
            <View style={[styles.moduleIcon, { backgroundColor: '#FFFBEB' }]}>
              <Feather name="grid" size={22} color="#F59E0B" />
            </View>
            <Text style={styles.moduleName}>Tất cả phân hệ</Text>
            <Text style={styles.moduleDesc}>Hợp đồng, Tài chính...</Text>
          </TouchableOpacity>
        </View> */}
      </ScrollView>

      {/* Month & Year Picker Modal */}
      <MonthYearPickerModal
        visible={isPickerVisible}
        selectedDate={selectedDate}
        onClose={() => setIsPickerVisible(false)}
        onSelect={(newDate) => setSelectedDate(newDate)}
      />

      {/* Bottom Nav Bar */}
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
    fontWeight: '700',
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
  logoutBtn: {
    backgroundColor: '#FEF2F2',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: PRIMARY_COLOR,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  timeSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  timeSelectorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  loadingDesc: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  moduleCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  moduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  moduleDesc: {
    fontSize: 11,
    color: '#64748B',
  },
});
