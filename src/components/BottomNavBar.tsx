import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';

export default function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();

  const isHome = pathname === '/' || pathname === '/index';
  const isExplore = pathname === '/explore';
  const isAuth = pathname.includes('(auth)') || pathname.includes('login');

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {/* Home / Dashboard */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => router.replace('/')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isHome ? 'grid' : 'grid-outline'}
          size={22}
          color={isHome ? BrandColors.primary : BrandColors.slate400}
        />
        <Text style={[styles.tabLabel, isHome && styles.tabLabelActive]}>Tổng quan</Text>
      </TouchableOpacity>

      {/* Explore / Features */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => router.replace('/explore')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isExplore ? 'apps' : 'apps-outline'}
          size={22}
          color={isExplore ? BrandColors.primary : BrandColors.slate400}
        />
        <Text style={[styles.tabLabel, isExplore && styles.tabLabelActive]}>Tính năng</Text>
      </TouchableOpacity>

      {/* Auth / Account Profile */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => {
          if (isAuthenticated) {
            router.replace('/');
          } else {
            router.push('/(auth)/login');
          }
        }}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isAuthenticated ? 'person' : 'log-in-outline'}
          size={22}
          color={isAuth || (isAuthenticated && isHome) ? BrandColors.primary : BrandColors.slate400}
        />
        <Text
          style={[
            styles.tabLabel,
            (isAuth || (isAuthenticated && isHome)) && styles.tabLabelActive,
          ]}
        >
          {isAuthenticated ? user?.fullName?.split(' ').pop() || 'Hồ sơ' : 'Đăng nhập'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: BrandColors.slate200,
    paddingTop: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: BrandColors.slate500,
    marginTop: 4,
  },
  tabLabelActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
});
