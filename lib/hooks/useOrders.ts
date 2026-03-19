'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { ordersAPI } from '@/lib/api/orders';
import type { Order, PaginationResponse, ShippingAddress, PayoutLedger } from '@/types';

/**
 * Query keys for orders
 * Used for cache management and invalidation
 */
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params?: { page?: number; limit?: number; status?: string; as?: string }) =>
    [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  session: (sessionId: string) => [...orderKeys.all, 'session', sessionId] as const,
  payouts: () => [...orderKeys.all, 'payouts'] as const,
  payoutLedger: (params?: { page?: number; limit?: number }) =>
    [...orderKeys.payouts(), 'ledger', params] as const,
};

/**
 * Custom hook to fetch orders with optional filters
 *
 * @param params - Optional filters and pagination
 * @param options - React Query options
 * @returns Orders query result
 */
export function useOrders(
  params?: {
    page?: number;
    limit?: number;
    status?: string;
    as?: string;
  },
  options?: Partial<UseQueryOptions<PaginationResponse<Order>>>
) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => ordersAPI.getOrders(params).then(res => res.data),
    ...options,
  });
}

/**
 * Custom hook to fetch a single order by ID
 *
 * @param id - Order ID
 * @param options - React Query options
 * @returns Order query result
 */
export function useOrder(
  id: string,
  options?: Partial<UseQueryOptions<Order>>
) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => ordersAPI.getOrder(id).then(res => res.data.order),
    enabled: !!id,
    ...options,
  });
}

/**
 * Custom hook to fetch orders by checkout session ID
 *
 * @param sessionId - Checkout session ID
 * @param options - React Query options
 * @returns Orders query result
 */
export function useOrdersBySession(
  sessionId: string,
  options?: Partial<UseQueryOptions<Order[]>>
) {
  return useQuery({
    queryKey: orderKeys.session(sessionId),
    queryFn: () =>
      ordersAPI.getOrdersBySession(sessionId).then(res => res.data.orders),
    enabled: !!sessionId,
    ...options,
  });
}

/**
 * Custom hook to fetch payout ledger (admin only)
 *
 * @param params - Optional pagination
 * @param options - React Query options
 * @returns Payout ledger query result
 */
export function usePayoutLedger(
  params?: { page?: number; limit?: number },
  options?: Partial<UseQueryOptions<{
    success: boolean;
    data: Order[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    pendingPayoutTotal: number;
  }>>
) {
  return useQuery({
    queryKey: orderKeys.payoutLedger(params),
    queryFn: () => ordersAPI.getPayoutLedger(params).then(res => res.data),
    ...options,
  });
}

/**
 * Custom hook to create a new order
 *
 * @returns Mutation object for creating orders
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      productId: string;
      quantity?: number;
      shippingAddress: ShippingAddress;
      notes?: string;
      paymentMethod?: string;
    }) => ordersAPI.createOrder(data),
    onSuccess: () => {
      // Invalidate orders list queries
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/**
 * Custom hook to initiate M-Pesa payment for an order
 *
 * @returns Mutation object for initiating payments
 */
export function useInitiatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, phoneNumber }: { id: string; phoneNumber: string }) =>
      ordersAPI.initiatePayment(id, { phoneNumber }),
    onSuccess: (response, { id }) => {
      // Invalidate the specific order query to check for status updates
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
    },
  });
}

/**
 * Custom hook to update order status
 *
 * @returns Mutation object for updating order status
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersAPI.updateOrderStatus(id, { status }),
    onSuccess: (response, { id }) => {
      // Invalidate the specific order query
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });

      // Invalidate orders list queries
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/**
 * Custom hook to cancel an order
 *
 * @returns Mutation object for canceling orders
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      ordersAPI.cancelOrder(id, { reason }),
    onSuccess: (response, { id }) => {
      // Invalidate the specific order query
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });

      // Invalidate orders list queries
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/**
 * Custom hook to mark a seller as paid (admin)
 *
 * @returns Mutation object for marking seller as paid
 */
export function useMarkSellerPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, notes }: { orderId: string; notes?: string }) =>
      ordersAPI.markSellerPaid(orderId, { notes }),
    onSuccess: () => {
      // Invalidate payout ledger queries
      queryClient.invalidateQueries({ queryKey: orderKeys.payouts() });

      // Invalidate orders list queries
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/**
 * Custom hook to mark all orders for a seller as paid (admin)
 *
 * @returns Mutation object for batch marking seller as paid
 */
export function useMarkSellerPaidBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sellerId, notes }: { sellerId: string; notes?: string }) =>
      ordersAPI.markSellerPaidBatch(sellerId, { notes }),
    onSuccess: () => {
      // Invalidate payout ledger queries
      queryClient.invalidateQueries({ queryKey: orderKeys.payouts() });

      // Invalidate orders list queries
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/**
 * Custom hook to checkout cart
 *
 * @returns Mutation object for cart checkout
 */
export function useCheckoutCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      shippingAddress: ShippingAddress;
      phoneNumber: string;
      paymentMethod?: string;
      notes?: string;
    }) => ordersAPI.checkoutCart(data),
    onSuccess: (response) => {
      // Invalidate orders list queries
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });

      // Invalidate cart queries
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
