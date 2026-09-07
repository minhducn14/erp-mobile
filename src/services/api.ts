import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_USER_KEY = '@erp_auth_user';
const STORAGE_REMEMBER_KEY = 'rememberedUsername';

const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Platform.select({
    android: 'http://10.0.2.2:3000/api',
    default: 'http://localhost:3000/api',
  });

export interface UserProfile {
  id: string;
  fullName: string;
  role: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
}

export interface LoginResponse {
  message: string;
  user: UserProfile;
}

class ApiService {
  private baseUrl = DEFAULT_API_URL;

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string; status: number }> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      if (!response.ok) {
        const errorMsg =
          data?.message ||
          data?.error ||
          (response.status === 401
            ? 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.'
            : 'Đăng nhập thất bại. Vui lòng thử lại.');
        return { error: errorMsg, status: response.status };
      }

      return { data, status: response.status };
    } catch (err: any) {
      return {
        error: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối.',
        status: 0,
      };
    }
  }

  async login(payload: { username: string; password: string; rememberMe?: boolean }) {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async logout() {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  }

  async getMe() {
    return this.request<UserProfile>('/me', {
      method: 'GET',
    });
  }
}

export const apiService = new ApiService();
export { STORAGE_USER_KEY, STORAGE_REMEMBER_KEY };
