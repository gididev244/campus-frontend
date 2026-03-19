/**
 * API Module - Main Entry Point
 *
 * This file re-exports all API modules for backward compatibility.
 * The actual implementation is split into separate modules in /lib/api/ directory.
 *
 * Directory Structure:
 * - /lib/api/index.ts - Axios instance, interceptors, and error handling
 * - /lib/api/auth.ts - Authentication APIs
 * - /lib/api/products.ts - Product APIs
 * - /lib/api/orders.ts - Order and payment APIs
 * - /lib/api/users.ts - User management APIs
 * - /lib/api/reviews.ts - Review APIs
 * - /lib/api/categories.ts - Category APIs
 * - /lib/api/cart.ts - Shopping cart APIs
 * - /lib/api/wishlist.ts - Wishlist APIs
 * - /lib/api/notifications.ts - Notification APIs
 * - /lib/api/upload.ts - File upload APIs
 * - /lib/api/health.ts - Health check and monitoring APIs
 *
 * @module lib/api
 */

// Export axios instance and core functionality
export { api as default } from './api/index';
export { api } from './api/index';

// Export all API modules
export { authAPI } from './api/auth';
export { productsAPI } from './api/products';
export { ordersAPI } from './api/orders';
export { usersAPI } from './api/users';
export { reviewsAPI } from './api/reviews';
export { categoriesAPI } from './api/categories';
export { cartAPI } from './api/cart';
export { wishlistAPI } from './api/wishlist';
export { notificationsAPI } from './api/notifications';
export { uploadAPI } from './api/upload';
export { adminAPI } from './api/admin';
export { healthAPI } from './api/health';
export type { BasicHealthResponse, DetailedHealthResponse, DatabaseStats } from './api/health';
