import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_USER_KEY = '@erp_auth_user';
const STORAGE_COOKIE_KEY = '@erp_auth_cookie';
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
  private currentCookie: string | null = null;

  constructor() {
    this.initCookie();
  }

  private async initCookie() {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_COOKIE_KEY);
      if (saved) {
        this.currentCookie = saved;
      }
    } catch {
      // Ignore initial storage read error
    }
  }

  private async saveCookie(cookie: string | null) {
    this.currentCookie = cookie;
    try {
      if (cookie) {
        await AsyncStorage.setItem(STORAGE_COOKIE_KEY, cookie);
      } else {
        await AsyncStorage.removeItem(STORAGE_COOKIE_KEY);
      }
    } catch {
      // Ignore storage error
    }
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string; status: number }> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    if (!this.currentCookie) {
      await this.initCookie();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.currentCookie) {
      headers['Cookie'] = this.currentCookie;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      // Capture Set-Cookie if returned (crucial for mobile session persistence)
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        const parsed = setCookie.split(';')[0];
        if (parsed && parsed.includes('=')) {
          this.saveCookie(parsed);
        }
      }

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
            ? 'Phiên đăng nhập đã hết hạn hoặc không có quyền truy cập.'
            : 'Yêu cầu thất bại. Vui lòng thử lại.');
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

  async get<T = any>(endpoint: string, params?: Record<string, any>) {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async login(payload: { username: string; password: string; rememberMe?: boolean }) {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async logout() {
    const res = await this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
    await this.saveCookie(null);
    return res;
  }

  async getMe() {
    return this.request<UserProfile>('/me', {
      method: 'GET',
    });
  }
}

export const apiService = new ApiService();
export { STORAGE_USER_KEY, STORAGE_COOKIE_KEY, STORAGE_REMEMBER_KEY };
