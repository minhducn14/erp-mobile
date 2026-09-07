import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, UserProfile, STORAGE_USER_KEY, STORAGE_REMEMBER_KEY } from '@/services/api';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { username: string; password: string; rememberMe?: boolean }) => Promise<{ user?: UserProfile; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore user session on startup
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const savedUser = await AsyncStorage.getItem(STORAGE_USER_KEY);
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (e) {
        console.warn('Failed to restore auth user', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = useCallback(async ({ username, password, rememberMe }: { username: string; password: string; rememberMe?: boolean }) => {
    try {
      const response = await apiService.login({ username, password, rememberMe });

      if (response.error || !response.data) {
        return { error: response.error || 'Đăng nhập thất bại. Vui lòng thử lại.' };
      }

      const userData = response.data.user;
      setUser(userData);
      await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));

      if (rememberMe) {
        await AsyncStorage.setItem(STORAGE_REMEMBER_KEY, username);
      } else {
        await AsyncStorage.removeItem(STORAGE_REMEMBER_KEY);
      }

      return { user: userData };
    } catch (err: any) {
      return { error: err.message || 'Đăng nhập thất bại. Vui lòng thử lại.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiService.logout();
    } catch {}
    try {
      await AsyncStorage.removeItem(STORAGE_USER_KEY);
    } catch {}
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
