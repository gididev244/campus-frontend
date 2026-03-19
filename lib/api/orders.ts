import { api } from './index';
import type { Order, PaginationResponse, ShippingAddress, PayoutLedger } from '@/types';

/**
 * Orders API endpoints
 * Handles order creation, payment, status updates, and admin payout operations
 */
export const ordersAPI = {
  /**
   * Create a new order
   */
  createOrder: (data: {
    productId: string;
    quantity?: number;
    shippingAddress: ShippingAddress;
    notes?: string;
    paymentMethod?: string;
  }) => api.post<{ success: boolean; order: Order }>('/orders', data),

  /**
   * Initiate M-Pesa payment for order
   */
  initiatePayment: (id: string, data: { phoneNumber: string }) =>
    api.post<{
      success: boolean;
      checkoutRequestID: string;
    }>(`/orders/${id}/pay`, data),

  /**
   * Get single order by ID
   */
  getOrder: (id: string) =>
    api.get<{ success: boolean; order: Order }>(`/orders/${id}`),

  /**
   * Get all orders with optional filters
   */
  getOrders: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    as?: string;
  }) => api.get<PaginationResponse<Order>>('/orders', { params }),

  /**
   * Get payment status for an order
   */
  getPaymentStatus: (id: string) =>
    api.get<{
      success: boolean;
      data: {
        orderId: string;
        orderNumber: string;
        paymentStatus: string;
        checkoutRequestID: string;
        mpesaTransactionId?: string;
      };
    }>(`/orders/${id}/payment-status`),

  /**
   * Update order status
   */
  updateOrderStatus: (id: string, data: { status: string }) =>
    api.put<{ success: boolean; order: Order }>(`/orders/${id}/status`, data),

  /**
   * Cancel order
   */
  cancelOrder: (id: string, data?: { reason?: string }) =>
    api.put<{ success: boolean; order: Order }>(`/orders/${id}/cancel`, data),

  /**
   * Buyer confirms order received
   */
  confirmReceived: (id: string) =>
    api.put<{ success: boolean; order: Order; message: string }>(`/orders/${id}/confirm-received`),

  // Admin payout API

  /**
   * Get payout ledger for admin
   */
  getPayoutLedger: (params?: { page?: number; limit?: number }) =>
    api.get<{
      success: boolean;
      sellerGroups: PayoutLedger['sellerGroups'];
      totalOrders: number;
      totalSellers: number;
      pendingPayoutTotal: number;
    }>('/orders/admin/payouts/ledger', { params }),

  /**
   * Mark specific order as paid to seller
   */
  markSellerPaid: (orderId: string, data?: { notes?: string }) =>
    api.put<{
      success: boolean;
      order: Order;
      message: string;
    }>(`/orders/admin/payouts/${orderId}/pay`, data),

  /**
   * Mark all orders for a seller as paid
   */
  markSellerPaidBatch: (sellerId: string, data?: { notes?: string }) =>
    api.put<{
      success: boolean;
      message: string;
      ordersUpdated: number;
    }>(`/orders/admin/payouts/seller/${sellerId}/pay`, data),

  // Cart checkout API

  /**
   * Checkout all items in cart
   */
  checkoutCart: (data: {
    shippingAddress: ShippingAddress;
    phoneNumber: string;
    paymentMethod?: string;
    notes?: string;
  }) =>
    api.post<{
      success: boolean;
      message: string;
      checkoutSessionId: string;
      totalAmount: number;
      orderCount: number;
      orders: Order[];
    }>('/orders/checkout-cart', data),

  /**
   * Get orders by checkout session ID
   */
  getOrdersBySession: (sessionId: string) =>
    api.get<{ success: boolean; orders: Order[] }>(`/orders/session/${sessionId}`),
};
