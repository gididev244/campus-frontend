export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'buyer' | 'seller' | 'admin';
  phone: string;
  location?: string;
  avatar?: string;
  isVerified?: boolean;
  isActive?: boolean;
  averageRating?: number;
  totalReviews?: number;
  createdAt?: string;
}

export interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: Category;
  condition: 'new' | 'like-new' | 'good' | 'fair';
  images: string[];
  seller: User;
  location: string;
  status: 'available' | 'sold' | 'pending';
  isNegotiable?: boolean;
  views?: number;
  likes?: string[];
  averageRating?: number;
  totalReviews?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  buyer: User;
  seller: User;
  product: Product;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'mpesa' | 'cash';
  mpesaTransactionId?: string;
  mpesaPhoneNumber?: string;
  shippingAddress: {
    street?: string;
    city?: string;
    building?: string;
    room?: string;
    landmarks?: string;
  };
  notes?: string;
  cancelledAt?: string;
  deliveredAt?: string;
  cancellationReason?: 'buyer-request' | 'seller-request' | 'payment-failed' | 'other';
  // B2C payout fields
  b2cTransactionId?: string;
  b2cStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  sellerPaid?: boolean;
  sellerPaidAt?: string;
  sellerPayoutNotes?: string;
  checkoutSessionId?: string;
  checkoutRequestID?: string;
  createdAt: string;
  updatedAt?: string;
  shippedAt?: string;
}

export interface Review {
  _id: string;
  reviewer: User;
  reviewedUser: User;
  product?: Product;
  order: Order;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  isActive: boolean;
  parentCategory?: Category;
  productCount?: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
  forcePasswordChange?: boolean;
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface Filters {
  search?: string;
  category?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DashboardStats {
  products: {
    total: number;
    available: number;
    sold: number;
    pending: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
  };
  revenue: number;
}

// Cart Types
export interface CartItem {
  product: Product;
  quantity: number;
  addedAt?: string;
}

export interface Cart {
  _id: string;
  user: string;
  items: CartItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

// Wishlist Types
export interface Wishlist {
  _id: string;
  user: string;
  products: Product[];
  createdAt: string;
  updatedAt: string;
}

// Shipping Address
export interface ShippingAddress {
  street?: string;
  city?: string;
  building?: string;
  room?: string;
  landmarks?: string;
}

// Notification Types
export type NotificationType =
  | 'order'
  | 'product'
  | 'review'
  | 'payout'
  | 'system'
  | 'price_drop'
  | 'product_available';

export interface NotificationData {
  orderId?: string;
  productId?: string;
  amount?: number;
  link?: string;
}

export interface Notification {
  _id: string;
  recipient: User;
  sender?: User;
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Seller Balance & Payout Types
export interface SellerBalance {
  _id: string;
  seller: User;
  totalOrders: number;
  totalEarnings: number;
  paidAmount: number;
  pendingAmount: number;
  lastPayoutAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutOrderSummary {
  orderId: string;
  orderNumber: string;
  product: Product;
  quantity: number;
  totalPrice: number;
  orderDate: string;
  buyer: User;
  mpesaTransactionId?: string;
  mpesaPhoneNumber?: string;
}

export interface SellerPayoutGroup {
  seller: User;
  sellerId: string;
  totalOrders: number;
  totalEarnings: number;
  paidAmount: number;
  pendingAmount: number;
  orders: PayoutOrderSummary[];
}

export interface PayoutLedger {
  sellerGroups: SellerPayoutGroup[];
  totalOrders: number;
  totalSellers: number;
  pendingPayoutTotal: number;
}

// Upload Types
export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

// Extended Types
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
}

export interface AuthTokens {
  token: string;
  refreshToken?: string;
}

// Error Types
export interface ApiError {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  message?: string;
}

// Token Queue Types (for JWT refresh)
export interface FailedQueueItem {
  resolve: (value: string | PromiseLike<string>) => void;
  reject: (reason?: any) => void;
}
