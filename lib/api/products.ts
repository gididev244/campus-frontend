import { api } from './index';
import type { Product, PaginationResponse, Filters } from '@/types';

/**
 * Products API endpoints
 * Handles product CRUD operations, likes, and seller product management
 */
export const productsAPI = {
  /**
   * Get all products with optional filters and pagination
   */
  getProducts: (params?: Filters & { page?: number; limit?: number }) =>
    api.get<PaginationResponse<Product>>('/products', { params }),

  /**
   * Get single product by ID
   */
  getProduct: (id: string) =>
    api.get<{ success: boolean; product: Product }>(`/products/${id}`),

  /**
   * Create new product (requires FormData with images)
   */
  createProduct: (data: FormData) =>
    api.post<{ success: boolean; product: Product }>('/products', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   * Update product (requires FormData with images)
   */
  updateProduct: (id: string, data: FormData) =>
    api.put<{ success: boolean; product: Product }>(`/products/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   * Delete product
   */
  deleteProduct: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/products/${id}`),

  /**
   * Relist a sold/delisted product
   */
  relistProduct: (id: string, data: Partial<Product>) =>
    api.post<{ success: boolean; product: Product }>(`/products/${id}/relist`, data),

  /**
   * Toggle like on a product
   */
  toggleLike: (id: string) =>
    api.post<{
      success: boolean;
      message: string;
      liked: boolean;
      likesCount: number;
    }>(`/products/${id}/like`),

  /**
   * Get products by seller
   */
  getSellerProducts: (sellerId: string, params?: { page?: number; limit?: number }) =>
    api.get<PaginationResponse<Product>>(`/products/seller/${sellerId}`, { params }),

  /**
   * Get sold products history (for seller)
   */
  getSoldProducts: (params?: {
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }) => api.get<PaginationResponse<Product>>('/products/sold/history', { params }),

  /**
   * Get related products for a product
   */
  getRelatedProducts: (id: string) =>
    api.get<{ success: boolean; products: Product[] }>(`/products/${id}/related`),

  /**
   * Bulk revert products from pending to available (admin only)
   */
  bulkRevertProducts: (productIds: string[]) =>
    api.put<{ success: boolean; message: string; count: number }>(
      '/products/admin/bulk-revert',
      { productIds }
    ),

  /**
   * Get platform statistics (public)
   */
  getPlatformStats: () =>
    api.get<{
      success: boolean;
      stats: {
        products: number;
        users: number;
        transactions: number;
      };
    }>('/products/stats/platform'),
};
