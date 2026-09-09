import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { canAccessCustomers } from '@/utils/rbac';

export default function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();

  // Auto-hide BottomNavBar on any detail screen or sub-flow route (e.g. /projects/123)
  const isDetailPage =
    pathname.includes('/[') ||
    pathname.includes('/projects/') ||
    pathname.includes('/contracts/') ||
    pathname.includes('/tasks/') ||
    pathname.includes('/opportunities/') ||
    pathname.includes('/customers/');

  if (isDetailPage) {
    return null;
  }

  const isHome = pathname === '/' || pathname === '/index';
  const isTasks = pathname === '/tasks' || pathname === '/tasks/index' || pathname === '/tasks/';
  const isProjects = pathname === '/projects' || pathname === '/projects/index' || pathname === '/projects/';
  const isCustomers = pathname === '/customers' || pathname === '/customers/index' || pathname === '/customers/';
  const isProfile = pathname === '/profile' || pathname === '/profile/index' || pathname === '/profile/';

  const navigateTo = (route: string) => {
    if (!isAuthenticated && route !== '/(auth)/login') {
      router.push('/(auth)/login');
      return;
    }
    router.replace(route as any);
  };

  const hasCustomerAccess = canAccessCustomers(user?.role);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {/* 1. Home / Dashboard */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigateTo('/')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isHome ? 'grid' : 'grid-outline'}
          size={21}
          color={isHome ? BrandColors.primary : BrandColors.slate400}
        />
        <Text style={[styles.tabLabel, isHome && styles.tabLabelActive]}>Tổng quan</Text>
      </TouchableOpacity>

      {/* 2. Tasks */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigateTo('/tasks')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isTasks ? 'checkbox' : 'checkbox-outline'}
          size={21}
          color={isTasks ? BrandColors.primary : BrandColors.slate400}
        />
        <Text style={[styles.tabLabel, isTasks && styles.tabLabelActive]}>Nhiệm vụ</Text>
      </TouchableOpacity>

      {/* 3. Projects */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigateTo('/projects')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isProjects ? 'briefcase' : 'briefcase-outline'}
          size={21}
          color={isProjects ? BrandColors.primary : BrandColors.slate400}
        />
        <Text style={[styles.tabLabel, isProjects && styles.tabLabelActive]}>Dự án</Text>
      </TouchableOpacity>

      {/* 4. Customers (Role-guarded: Only for ADMIN, BOD, BD, ADMIN_SALE) */}
      {hasCustomerAccess && (
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigateTo('/customers')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isCustomers ? 'people' : 'people-outline'}
            size={21}
            color={isCustomers ? BrandColors.primary : BrandColors.slate400}
          />
          <Text style={[styles.tabLabel, isCustomers && styles.tabLabelActive]}>Khách hàng</Text>
        </TouchableOpacity>
      )}

      {/* 5. Profile */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigateTo('/profile')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isProfile ? 'person' : 'person-outline'}
          size={21}
          color={isProfile ? BrandColors.primary : BrandColors.slate400}
        />
        <Text style={[styles.tabLabel, isProfile && styles.tabLabelActive]}>Cá nhân</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 3,
  },
  tabLabelActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
});
