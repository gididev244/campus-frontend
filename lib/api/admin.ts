/**
 * Admin API Module
 *
 * Handles all admin-specific API calls including:
 * - Analytics (revenue, users, orders, products)
 * - Review moderation
 * - Withdrawal management
 *
 * @module lib/api/admin
 */

import { api } from './index';

/**
 * Analytics types
 */
type TimePeriod = '7d' | '30d' | '90d' | '1y' | 'all';

interface RevenueData {
  date: string;
  revenue: number;
}

interface RevenueAnalyticsResponse {
  success: boolean;
  data: {
    totalRevenue: number;
    todayRevenue: number;
    dailyRevenue: RevenueData[];
    period: string;
    startDate: Date;
    endDate: Date;
  };
}

interface UserRegistrationData {
  date: string;
  count: number;
}

interface UserAnalyticsResponse {
  success: boolean;
  data: {
    totalUsers: number;
    todayRegistrations: number;
    newUsers: number;
    dailyRegistrations: UserRegistrationData[];
    usersByRole: {
      admin: number;
      seller: number;
      buyer: number;
    };
    period: string;
    startDate: Date;
    endDate: Date;
  };
}

interface OrderStatusData {
  date: string;
  count: number;
}

interface OrderAnalyticsResponse {
  success: boolean;
  data: {
    totalOrders: number;
    todayOrders: number;
    newOrders: number;
    ordersByStatus: {
      pending: number;
      confirmed: number;
      shipped: number;
      delivered: number;
      cancelled: number;
      refunded: number;
    };
    paymentStatusCounts: {
      pending: { count: number; amount: number } | number;
      completed: { count: number; amount: number } | number;
      failed: { count: number; amount: number } | number;
      refunded: { count: number; amount: number } | number;
    };
    dailyOrders: OrderStatusData[];
    completionRate: number;
    cancellationRate: number;
    averageOrderValue: number;
    period: string;
    startDate: Date;
    endDate: Date;
  };
}

interface ProductAnalyticsResponse {
  success: boolean;
  data: {
    totalProducts: number;
    recentProducts: number;
    productsByStatus: {
      available: number;
      sold: number;
      pending: number;
    };
    productsByCondition: Record<string, number>;
    topCategories: Array<{
      _id: string;
      count: number;
    }>;
    totalProductValue: number;
  };
}

interface ReviewsResponse {
  success: boolean;
  data: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

  /**
   * Initiate M-Pesa B2C payout for admin only)
   */
  initiateB2CPayout: (sellerId: string, data: {
    amount: number;
    notes?: string;
  }) => api.post<{ success: boolean; message: string; data: B2CPayoutResponse }>(`/payments/b2c/payout`, data),

export interface B2CPayoutResponse {
  success: boolean;
  message: string;
  data: {
    conversationID: string;
    originatorConversationID: string;
    responseCode: string;
    responseDescription: string;
    withdrawalId: string;
    amount: number;
    status: 'processing' | 'completed' | 'failed';
    b2cStatus?: string;
    b2cTransactionId?: string;
    sellerId: string;
    sellerName?: string;
    sellerPhone?: string;
    requestedAt?: string;
    completedAt?: string;
    metadata?: {
      b2cResultCode?: number;
      b2cResultDesc?: string;
      b2cTransactionID?: string;
    };
  }
}

interface WithdrawalRequestsResponse {
  success: boolean;
  data: WithdrawalRequest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/**
 * Admin API object
 */
export const adminAPI = {
  /**
   * Get revenue analytics
   * @param params - Query parameters
   * @param params.period - Time period for analytics (default: '7d')
   */
  getRevenueAnalytics: (params?: { period?: TimePeriod }) =>
    api.get<RevenueAnalyticsResponse>('/admin/analytics/revenue', { params }),

  /**
   * Get user analytics
   * @param params - Query parameters
   * @param params.period - Time period for analytics (default: '7d')
   */
  getUserAnalytics: (params?: { period?: TimePeriod }) =>
    api.get<UserAnalyticsResponse>('/admin/analytics/users', { params }),

  /**
   * Get order analytics
   * @param params - Query parameters
   * @param params.period - Time period for analytics (default: '7d')
   */
  getOrderAnalytics: (params?: { period?: TimePeriod }) =>
    api.get<OrderAnalyticsResponse>('/admin/analytics/orders', { params }),

  /**
   * Get product analytics
   */
  getProductAnalytics: () =>
    api.get<ProductAnalyticsResponse>('/admin/analytics/products'),

  /**
   * Get all reviews for moderation
   * @param params - Query parameters
   * @param params.page - Page number (default: 1)
   * @param params.limit - Items per page (default: 20)
   * @param params.rating - Filter by rating
   * @param params.productId - Filter by product
   */
  getAllReviews: (params?: {
    page?: number;
    limit?: number;
    rating?: number;
    productId?: string;
  }) => api.get<ReviewsResponse>('/admin/reviews', { params }),

  /**
   * Delete a review (admin only)
   * @param id - Review ID
   */
  deleteReview: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/admin/reviews/${id}`),

  /**
   * Get all withdrawal requests
   * @param params - Query parameters
   * @param params.status - Filter by status (default: 'pending')
   * @param params.page - Page number (default: 1)
   * @param params.limit - Items per page (default: 20)
   */
  getWithdrawalRequests: (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) => api.get<WithdrawalRequestsResponse>('/admin/withdrawals', { params }),

  /**
   * Process withdrawal request
   * @param requestId - Withdrawal request ID
   * @param data - Request body
   * @param data.status - New status ('processing' or 'completed')
   * @param data.notes - Optional notes
   */
  processWithdrawalRequest: (requestId: string, data: {
    status: 'processing' | 'completed' | 'cancelled';
    notes?: string;
  }) => api.put<{ success: boolean; message: string; data: any }>(`/admin/withdrawals/${requestId}`, data),

  /**
   * Initiate M-Pesa B2C payout to seller
   * @param sellerId - Seller ID to pay
   * @param data - Payout data
   * @param data.amount - Amount to pay in KES
   * @param data.notes - Optional notes
   */
  initiateB2CPayout: (sellerId: string, data: {
    amount: number;
    notes?: string;
  }) => api.post<{ success: boolean; message: string; data: B2CPayoutResponse }>(
    '/payments/b2c/payout',
    { sellerId, ...data }
  ),

  /**
   * Get B2C payout status
   * @param conversationId - M-Pesa conversation ID
   */
  getB2CPayoutStatus: (conversationId: string) =>
    api.get<{ success: boolean; data: B2CPayoutStatus }>(
      `/payments/b2c/status/${conversationId}`
    ),
};

export interface B2CPayoutResponse {
  withdrawalId: string;
  amount: number;
  sellerName: string;
  sellerPhone: string;
  conversationID: string;
  status: string;
}

export interface B2CPayoutStatus {
  withdrawalId: string;
  amount: number;
  status: string;
  b2cStatus: string;
  b2cTransactionId?: string;
  seller: string;
  requestedAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}
