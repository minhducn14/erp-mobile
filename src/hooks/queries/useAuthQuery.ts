import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, UserProfile, STORAGE_REMEMBER_KEY, STORAGE_USER_KEY } from '@/services/api';
import { privateStorage } from '@/services/secureStorage';
import { queryKeys } from '@/services/queryKeys';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * Hook to fetch current user profile and sync with useAuthStore
 */
export function useUserProfileQuery() {
  const setUser = useAuthStore((state) => state.setUser);
  const setIsLoading = useAuthStore((state) => state.setIsLoading);

  return useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: async () => {
      try {
        const res = await apiService.getMe();
        if (res.data && !res.error) {
          setUser(res.data);
          return res.data;
        } else {
          setUser(null);
          return null;
        }
      } catch (err) {
        setUser(null);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

/**
 * Hook for login mutation with privateStorage token handling & Zustand sync
 */
export function useLoginMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (credentials: { username: string; password: string; rememberMe?: boolean }) => {
      const res = await apiService.login(credentials);
      if (res.error || !res.data) {
        throw new Error(res.error || 'Đăng nhập thất bại. Vui lòng thử lại.');
      }

      if (credentials.rememberMe) {
        await privateStorage.setItem(STORAGE_REMEMBER_KEY, credentials.username);
      } else {
        await privateStorage.removeItem(STORAGE_REMEMBER_KEY);
      }

      // Fetch full profile via getMe right after login to populate full fields (username, email, phone)
      let fullUser: UserProfile = res.data.user;
      try {
        const meRes = await apiService.getMe();
        if (meRes.data && !meRes.error) {
          fullUser = meRes.data;
        }
      } catch {}

      if (!fullUser.username && credentials.username) {
        fullUser.username = credentials.username;
      }

      return fullUser;
    },
    onSuccess: (userData: UserProfile) => {
      setUser(userData);
      queryClient.setQueryData(queryKeys.auth.user, userData);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    },
  });
}

/**
 * Hook for logout mutation with privateStorage cleanup & Zustand sync
 */
export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation({
    mutationFn: async () => {
      try {
        await apiService.logout();
      } catch (err) {
        console.warn('⚠️ [Logout Warning] Failed to call logout API, clearing local storage anyway:', err);
      } finally {
        await privateStorage.removeItem(STORAGE_USER_KEY).catch(() => undefined);
        clearAuth();
      }
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
