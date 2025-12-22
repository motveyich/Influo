const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://influo-seven.vercel.app';

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

class ApiClient {
  private tokenData: TokenData | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.loadTokens();
  }

  private loadTokens() {
    try {
      const stored = localStorage.getItem('influo_tokens');
      if (stored) {
        this.tokenData = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  }

  private saveTokens(tokens: TokenData) {
    this.tokenData = tokens;
    localStorage.setItem('influo_tokens', JSON.stringify(tokens));
  }

  clearTokens() {
    this.tokenData = null;
    localStorage.removeItem('influo_tokens');
  }

  getAccessToken(): string | null {
    return this.tokenData?.accessToken || null;
  }

  isAuthenticated(): boolean {
    return !!this.tokenData?.accessToken;
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.saveTokens({ accessToken, refreshToken });
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.tokenData?.refreshToken) {
      return false;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: this.tokenData!.refreshToken }),
        });

        if (!response.ok) {
          this.clearTokens();
          return false;
        }

        const data = await response.json();
        this.saveTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || this.tokenData!.refreshToken,
        });
        return true;
      } catch (error) {
        console.error('Failed to refresh token:', error);
        this.clearTokens();
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T | null; error: { message: string; status?: number } | null }> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.tokenData?.accessToken) {
      headers['Authorization'] = `Bearer ${this.tokenData.accessToken}`;
    }

    try {
      let response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401 && this.tokenData?.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.tokenData!.accessToken}`;
          response = await fetch(url, {
            ...options,
            headers,
          });
        }
      }

      if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
        }
        return { data: null, error: { message: errorMessage, status: response.status } };
      }

      if (response.status === 204) {
        return { data: null, error: null };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error';
      return { data: null, error: { message } };
    }
  }

  async get<T>(endpoint: string): Promise<{ data: T | null; error: { message: string; status?: number } | null }> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<{ data: T | null; error: { message: string; status?: number } | null }> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<{ data: T | null; error: { message: string; status?: number } | null }> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<{ data: T | null; error: { message: string; status?: number } | null }> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<{ data: T | null; error: { message: string; status?: number } | null }> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async uploadFile<T>(
    endpoint: string,
    file: File,
    fieldName: string = 'file'
  ): Promise<{ data: T | null; error: { message: string; status?: number } | null }> {
    const formData = new FormData();
    formData.append(fieldName, file);

    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {};

    if (this.tokenData?.accessToken) {
      headers['Authorization'] = `Bearer ${this.tokenData.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
        }
        return { data: null, error: { message: errorMessage, status: response.status } };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error';
      return { data: null, error: { message } };
    }
  }
}

export const apiClient = new ApiClient();

export function showFeatureNotImplemented(featureName: string, suggestedEndpoint?: string) {
  let message = `Функционал "${featureName}" находится в разработке.`;
  if (suggestedEndpoint) {
    message += `\n\nПредполагаемый эндпоинт: ${suggestedEndpoint}`;
  }
  alert(message);
}
