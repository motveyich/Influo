# Frontend Integration Guide

## Overview
Guide for integrating the Influo backend API with your frontend application.

## API Client Setup

### 1. Environment Variables

Update your frontend `.env` file:

```env
# Backend API URL
VITE_API_URL=http://localhost:3000/api

# Remove these - no longer needed on client
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
```

### 2. Create API Client Service

Create `src/services/apiClient.ts`:

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

class ApiClient {
  private client: AxiosInstance;
  private refreshing: boolean = false;
  private refreshQueue: Array<(token: string) => void> = [];

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Add JWT token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - Handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle 401 Unauthorized - Token expired
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.refreshing) {
            // Wait for refresh to complete
            return new Promise((resolve) => {
              this.refreshQueue.push((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.refreshing = true;

          try {
            const newToken = await this.refreshToken();
            this.refreshQueue.forEach((callback) => callback(newToken));
            this.refreshQueue = [];
            this.refreshing = false;

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.refreshing = false;
            this.refreshQueue = [];
            this.handleLogout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  private setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  private async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const { data } = await axios.post(
      `${import.meta.env.VITE_API_URL}/auth/refresh`,
      { refreshToken }
    );

    this.setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  }

  private handleLogout() {
    this.clearTokens();
    window.location.href = '/login';
  }

  // Public API methods

  async login(email: string, password: string) {
    const { data } = await this.client.post('/auth/login', { email, password });
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async signup(email: string, password: string, fullName: string, userType: string) {
    const { data } = await this.client.post('/auth/signup', {
      email,
      password,
      fullName,
      userType,
    });
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async logout() {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearTokens();
    }
  }

  async getCurrentUser() {
    const { data } = await this.client.get('/auth/me');
    return data;
  }

  // Generic methods for other endpoints

  async get<T = any>(url: string, config?: any): Promise<T> {
    const { data } = await this.client.get(url, config);
    return data;
  }

  async post<T = any>(url: string, body?: any, config?: any): Promise<T> {
    const { data } = await this.client.post(url, body, config);
    return data;
  }

  async patch<T = any>(url: string, body?: any, config?: any): Promise<T> {
    const { data } = await this.client.patch(url, body, config);
    return data;
  }

  async delete<T = any>(url: string, config?: any): Promise<T> {
    const { data } = await this.client.delete(url, config);
    return data;
  }
}

export const apiClient = new ApiClient();
```

### 3. Update Service Files

Replace direct Supabase calls with API calls:

#### Before (Direct Supabase):
```typescript
// OLD: src/services/profileService.ts
import { supabase } from '../core/supabase';

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}
```

#### After (API Client):
```typescript
// NEW: src/services/profileService.ts
import { apiClient } from './apiClient';

export async function getProfile(userId: string) {
  return apiClient.get(`/profiles/${userId}`);
}

export async function updateProfile(userId: string, updates: any) {
  return apiClient.patch(`/profiles/${userId}`, updates);
}

export async function uploadAvatar(userId: string, file: File) {
  const formData = new FormData();
  formData.append('avatar', file);
  return apiClient.post(`/profiles/${userId}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
```

### 4. Service Migration Examples

#### Influencer Cards Service
```typescript
// src/services/influencerCardService.ts
import { apiClient } from './apiClient';

export const influencerCardService = {
  async create(cardData: any) {
    return apiClient.post('/influencer-cards', cardData);
  },

  async getAll(filters?: any) {
    const params = new URLSearchParams(filters);
    return apiClient.get(`/influencer-cards?${params}`);
  },

  async getById(id: string) {
    return apiClient.get(`/influencer-cards/${id}`);
  },

  async update(id: string, updates: any) {
    return apiClient.patch(`/influencer-cards/${id}`, updates);
  },

  async delete(id: string) {
    return apiClient.delete(`/influencer-cards/${id}`);
  },

  async getAnalytics(id: string) {
    return apiClient.get(`/influencer-cards/${id}/analytics`);
  },
};
```

#### Offers Service
```typescript
// src/services/offerService.ts
import { apiClient } from './apiClient';

export const offerService = {
  async create(offerData: any) {
    return apiClient.post('/offers', offerData);
  },

  async getAll(asInfluencer = false) {
    return apiClient.get(`/offers?asInfluencer=${asInfluencer}`);
  },

  async accept(id: string) {
    return apiClient.patch(`/offers/${id}/accept`);
  },

  async decline(id: string) {
    return apiClient.patch(`/offers/${id}/decline`);
  },

  async markInProgress(id: string) {
    return apiClient.patch(`/offers/${id}/in-progress`);
  },

  async markCompleted(id: string) {
    return apiClient.patch(`/offers/${id}/complete`);
  },
};
```

#### Payments Service
```typescript
// src/services/paymentService.ts
import { apiClient } from './apiClient';

export const paymentService = {
  async createRequest(paymentData: any) {
    return apiClient.post('/payments', paymentData);
  },

  async getAll(asAdvertiser = false) {
    return apiClient.get(`/payments?asAdvertiser=${asAdvertiser}`);
  },

  async approve(id: string, notes?: string) {
    return apiClient.patch(`/payments/${id}/approve`, { adminNotes: notes });
  },

  async reject(id: string, reason?: string) {
    return apiClient.patch(`/payments/${id}/reject`, { adminNotes: reason });
  },

  async markPaid(id: string, transactionId: string) {
    return apiClient.patch(`/payments/${id}/mark-paid`, { transactionId });
  },

  async getStatistics() {
    return apiClient.get('/payments/statistics');
  },
};
```

## Error Handling

### Global Error Handler
```typescript
// src/utils/errorHandler.ts
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';

export function handleApiError(error: unknown) {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message || error.message;
    const statusCode = error.response?.status;

    switch (statusCode) {
      case 400:
        toast.error(`Validation Error: ${message}`);
        break;
      case 401:
        toast.error('Authentication required. Please log in.');
        break;
      case 403:
        toast.error('You do not have permission to perform this action.');
        break;
      case 404:
        toast.error('Resource not found.');
        break;
      case 409:
        toast.error(`Conflict: ${message}`);
        break;
      case 429:
        toast.error('Too many requests. Please try again later.');
        break;
      case 500:
        toast.error('Server error. Please try again later.');
        break;
      default:
        toast.error(message || 'An unexpected error occurred.');
    }
  } else {
    toast.error('An unexpected error occurred.');
  }
}
```

### Usage in Components
```typescript
// Example: src/components/CreateInfluencerCard.tsx
import { influencerCardService } from '../services/influencerCardService';
import { handleApiError } from '../utils/errorHandler';

async function handleSubmit(cardData: any) {
  try {
    const card = await influencerCardService.create(cardData);
    toast.success('Card created successfully!');
    return card;
  } catch (error) {
    handleApiError(error);
  }
}
```

## Authentication Flow

### Login Component
```typescript
// src/components/AuthModal.tsx
import { apiClient } from '../services/apiClient';
import { useState } from 'react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await apiClient.login(email, password);
      toast.success('Logged in successfully!');
      // Redirect or update state
      window.location.href = '/dashboard';
    } catch (error) {
      handleApiError(error);
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  );
}
```

## Migration Checklist

- [ ] Install axios: `npm install axios`
- [ ] Create `apiClient.ts` service
- [ ] Update `.env` with `VITE_API_URL`
- [ ] Remove direct Supabase imports from services
- [ ] Update all service files to use API client
- [ ] Update authentication flow
- [ ] Test all endpoints
- [ ] Handle errors appropriately
- [ ] Update loading states
- [ ] Test token refresh mechanism

## Testing API Integration

```typescript
// Test API calls
import { apiClient } from './apiClient';

// Test authentication
await apiClient.login('test@example.com', 'password');

// Test protected endpoint
const profile = await apiClient.get('/profiles/me');
console.log(profile);

// Test with error handling
try {
  await apiClient.get('/invalid-endpoint');
} catch (error) {
  console.error('Expected error:', error);
}
```

## Performance Optimization

### Request Caching
```typescript
// Simple cache implementation
const cache = new Map();
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

async function getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TIME) {
    return cached.data;
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

// Usage
const cards = await getCached('influencer-cards', () =>
  influencerCardService.getAll()
);
```

## Next Steps

1. Complete service migration
2. Test all features end-to-end
3. Monitor API performance
4. Implement request retry logic
5. Add request/response logging for debugging
6. Consider using React Query or SWR for data fetching
