import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { AuthResponse, FailedQueueItem, ApiError } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create axios instance
export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    } else {
      prom.reject(new Error('No token available'));
    }
  });

  failedQueue = [];
};

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If this is the refresh token endpoint itself, fail immediately
      if (originalRequest.url === '/v1/auth/refresh-token') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      // If already refreshing, queue the request
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Get current token
      const currentToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      if (!currentToken) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        // Try to refresh the token
        const response = await axios.post<AuthResponse>(
          `${API_URL}/api/v1/auth/refresh-token`,
          { token: currentToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const newToken = response.data.token;

        // Store new token
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', newToken);
        }

        // Update Authorization header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        // Process queued requests
        processQueue(null, newToken);

        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        const err = refreshError instanceof Error ? refreshError : new Error('Token refresh failed');
        processQueue(err, null);

        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Re-export all API modules for backward compatibility
export { authAPI } from './auth';
export { productsAPI } from './products';
export { ordersAPI } from './orders';
export { usersAPI } from './users';
export { reviewsAPI } from './reviews';
export { categoriesAPI } from './categories';
export { cartAPI } from './cart';
export { wishlistAPI } from './wishlist';
export { notificationsAPI } from './notifications';
export { uploadAPI } from './upload';
export { sellersAPI } from './sellers';

export default api;
