import {jwtDecode} from "jwt-decode";

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  if (envUrl) {
    return envUrl;
  }

  // In development, use proxy; in production, use direct URL
  if (import.meta.env.DEV) {
    return '/api';
  }

  return 'https://influo-seven.vercel.app';
};

const API_URL = getApiBaseUrl();

export { API_URL };

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;

    // Миграция старых токенов из auth_session формата
    this.migrateOldTokens();

    this.accessToken = localStorage.getItem('accessToken');
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    this.tokenExpiresAt = expiresAt ? parseInt(expiresAt) : null;

    console.log('🔧 [ApiClient] Initialized with token:', this.accessToken ? `${this.accessToken.substring(0, 10)}...` : 'NO TOKEN');
  }

  private migrateOldTokens() {
    try {
      const authSessionStr = localStorage.getItem('auth_session');

      if (authSessionStr) {
        console.log('🔄 [ApiClient] Found old auth_session format, migrating...');

        const authSession = JSON.parse(authSessionStr);

        if (authSession.access_token) {
          localStorage.setItem('accessToken', authSession.access_token);
          console.log('✅ [ApiClient] Migrated accessToken');
        }

        if (authSession.refresh_token) {
          localStorage.setItem('refreshToken', authSession.refresh_token);
          console.log('✅ [ApiClient] Migrated refreshToken');
        }

        if (authSession.expires_at) {
          localStorage.setItem('tokenExpiresAt', authSession.expires_at.toString());
          console.log('✅ [ApiClient] Migrated tokenExpiresAt');
        }

        localStorage.removeItem('auth_session');
        console.log('✅ [ApiClient] Removed old auth_session');
      }
    } catch (error) {
      console.error('❌ [ApiClient] Failed to migrate old tokens:', error);
    }
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      const decoded = jwtDecode(token);
      localStorage.setItem('accessToken', token);
      if (decoded.exp) {
        const exp = decoded.exp * 1000;
        this.tokenExpiresAt = exp;
        localStorage.setItem('tokenExpiresAt', exp.toString());
      }
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('tokenExpiresAt');
      this.tokenExpiresAt = null;
    }
  }

  getAccessToken(): string | null {
    // Сначала проверяем прямой ключ
    let token = this.accessToken || localStorage.getItem('accessToken');

    // Fallback: проверяем старый формат auth_session
    if (!token) {
      try {
        const authSessionStr = localStorage.getItem('auth_session');
        if (authSessionStr) {
          const authSession = JSON.parse(authSessionStr);
          token = authSession.access_token || null;

          // Если нашли токен в старом формате, мигрируем автоматически
          if (token) {
            console.log('⚠️ [ApiClient] Found token in old format, migrating...');
            this.migrateOldTokens();
            token = localStorage.getItem('accessToken');
          }
        }
      } catch (error) {
        console.error('❌ [ApiClient] Error reading auth_session:', error);
      }
    }

    return token;
  }

  private async checkAndRefreshToken(): Promise<void> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    // Refresh if token expires in less than 5 minutes
    if (this.tokenExpiresAt && (this.tokenExpiresAt - Date.now()) < 0) {
      console.log('🔄 [ApiClient] Token expires soon, refreshing...');

      this.isRefreshing = true;
      this.refreshPromise = this.performTokenRefresh();

      try {
        await this.refreshPromise;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    }
  }

  private async performTokenRefresh(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      console.error('❌ [ApiClient] No refresh token available');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.setAccessToken(data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      console.log('✅ [ApiClient] Token refreshed successfully');
    } catch (error) {
      console.error('❌ [ApiClient] Token refresh failed:', error);
      this.setAccessToken(null);
      throw error;
    }
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    // Check and refresh token if needed (unless this IS the refresh request)
    if (!endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/signup')) {
      try {
        await this.checkAndRefreshToken();
      } catch (error) {
        console.log('🔄 [ApiClient] Token refresh failed, continuing with existing token');
      }
    }

    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getAccessToken();

    console.log(`🌐 [ApiClient] ${options.method || 'GET'} ${url}`);
    console.log('🔑 [ApiClient] Token present:', !!token, token ? `(${token.substring(0, 20)}...)` : '');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ [ApiClient] Authorization header added');
    } else {
      console.warn('⚠️ [ApiClient] No token available, request will be unauthenticated');
    }

    const config: RequestInit = {
      method: options.method || 'GET',
      headers,
      mode: 'cors',
      credentials: 'omit',
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);

      console.log(`📥 [ApiClient] Response: ${response.status} ${response.statusText}`);

      if (response.status === 401) {
        console.error('❌ [ApiClient] 401 Unauthorized - token invalid or expired');
        this.setAccessToken(null);
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        console.error(`❌ [ApiClient] Request failed: ${error.message}`, {
          status: response.status,
          statusText: response.statusText,
          error
        });

        // Create error with status information
        const apiError: any = new Error(error.message || `HTTP ${response.status}`);
        apiError.status = response.status;
        apiError.statusCode = response.status;
        apiError.statusText = response.statusText;
        throw apiError;
      }

      if (response.status === 204) {
        console.log('✅ [ApiClient] Request successful (no content)');
        return {} as T;
      }

      const jsonResponse = await response.json();
      console.log('✅ [ApiClient] Request successful');

      // If response has a wrapper structure with 'data' field, unwrap it
      if (jsonResponse.success !== undefined && jsonResponse.data !== undefined) {
        return jsonResponse.data as T;
      }

      return jsonResponse as T;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`❌ [ApiClient] Error:`, error.message);
        throw error;
      }
      throw new Error('Network request failed');
    }
  }

  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  async post<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, headers });
  }

  async put<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, headers });
  }

  async patch<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body, headers });
  }

  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }

  async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<T> {
    // Check and refresh token if needed (unless this IS an auth request)
    if (!endpoint.includes('/auth/')) {
      try {
        await this.checkAndRefreshToken();
      } catch (error) {
        console.log('🔄 [ApiClient] Token refresh failed during file upload, continuing with existing token');
      }
    }

    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getAccessToken();

    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        mode: 'cors',
        credentials: 'omit',
      });

      if (response.status === 401) {
        console.error('❌ [ApiClient] 401 Unauthorized during file upload - token invalid');
        this.setAccessToken(null);
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('File upload failed');
    }
  }

  async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      return await this.get('/health');
    } catch (error) {
      return { status: 'error', message: 'Backend is not available' };
    }
  }
}

export const apiClient = new ApiClient(API_URL);
export const api = apiClient;
