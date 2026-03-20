'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Loader2,
  ShoppingBag,
  User,
  MapPin,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  AlertCircle,
  ChevronRight,
  Receipt,
} from 'lucide-react';
import { ordersAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { toast } from '@/components/ui/Toaster';
import type { Order } from '@/types';

type OrderStatus = 'all' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export default function SellerOrdersPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: { status?: string; as?: string } = { as: 'seller' };
      if (filter !== 'all') {
        params.status = filter;
      }

      const res = await ordersAPI.getOrders(params);
      setOrders(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setMessage({ type: 'error', text: 'Failed to load orders' });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'seller' && user?.role !== 'admin') {
      router.push('/products');
      return;
    }

    fetchOrders();
  }, [isAuthenticated, user, router, fetchOrders]);

  // Listen for new orders via socket
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    const handleNewOrder = (data: { orderId: string; orderNumber: string }) => {
      toast.success(`New order received: #${data.orderNumber}`);
      fetchOrders();
    };

    socket.on('order:new', handleNewOrder);

    return () => {
      socket.off('order:new', handleNewOrder);
    };
  }, [socket, isConnected, user, fetchOrders]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    setMessage(null);

    try {
      await ordersAPI.updateOrderStatus(orderId, { status: newStatus });
      setOrders(orders.map(order =>
        order._id === orderId
          ? { ...order, status: newStatus as Order['status'] }
          : order
      ));
      setMessage({ type: 'success', text: `Order marked as ${newStatus}` });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error && 'response' in error
        ? (error as Error & { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update order status'
        : 'Failed to update order status';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'shipped': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'refunded': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'refunded': return <AlertCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const statusFlow: Record<string, string | null> = {
      'pending': 'confirmed',
      'confirmed': 'shipped',
      'shipped': 'delivered',
      'delivered': null,
      'cancelled': null,
      'refunded': null,
    };
    return statusFlow[currentStatus] || null;
  };

  const getActionLabel = (currentStatus: string): string => {
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) return 'Completed';

    const labels: Record<string, string> = {
      'pending': 'Confirm Order',
      'confirmed': 'Mark as Shipped',
      'shipped': 'Mark as Delivered',
    };
    return labels[currentStatus] || 'Update Status';
  };

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <ShoppingBag className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Seller Orders</h1>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400'
              : 'bg-destructive/10 text-destructive'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
            )}
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'primary' : 'outline'}
              onClick={() => setFilter(status)}
              size="sm"
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No orders yet</h2>
            <p className="text-muted-foreground">
              {filter === 'all'
                ? 'Orders will appear here when customers purchase your products'
                : `No ${filter} orders found`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const nextStatus = getNextStatus(order.status);
              const canUpdate = nextStatus !== null;

              return (
                <div
                  key={order._id}
                  className="rounded-lg border bg-card overflow-hidden"
                >
                  {/* Order Header - Always Visible */}
                  <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="font-semibold text-lg">#{order.orderNumber}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            <span className="capitalize">{order.status}</span>
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {formatPrice(order.totalPrice)}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {order.paymentMethod}
                        </p>
                      </div>
                    </div>

                    {/* Product Preview */}
                    <div className="flex items-center space-x-4">
                      {order.product?.images?.[0] ? (
                        <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <Image
                            src={order.product.images[0]}
                            alt={order.product.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{order.product?.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {order.quantity} × {formatPrice(order.product?.price || 0)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleOrderExpand(order._id)}
                      >
                        {expandedOrder === order._id ? (
                          <ChevronRight className="h-4 w-4 rotate-90" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Order Details - Expandable */}
                  {expandedOrder === order._id && (
                    <div className="border-t border-border p-4 space-y-4 bg-muted/20">
                      {/* Buyer Info */}
                      <div className="flex items-start space-x-3">
                        <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold mb-1">Buyer Information</p>
                          <p className="text-sm">{order.buyer?.name}</p>
                          <p className="text-sm text-muted-foreground">{order.buyer?.email}</p>
                          <p className="text-sm text-muted-foreground">{order.buyer?.phone}</p>
                        </div>
                      </div>

                      {/* Shipping Address */}
                      <div className="flex items-start space-x-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold mb-1">Shipping Address</p>
                          {order.shippingAddress ? (
                            <div className="text-sm space-y-0.5">
                              {order.shippingAddress.street && <p>{order.shippingAddress.street}</p>}
                              {order.shippingAddress.building && <p>{order.shippingAddress.building}</p>}
                              {order.shippingAddress.room && <p>Room {order.shippingAddress.room}</p>}
                              {order.shippingAddress.city && <p>{order.shippingAddress.city}</p>}
                              {order.shippingAddress.landmarks && <p className="text-muted-foreground">Near: {order.shippingAddress.landmarks}</p>}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No shipping address provided</p>
                          )}
                        </div>
                      </div>

                      {/* Payment Details */}
                      {order.paymentStatus === 'completed' && (order.mpesaTransactionId || order.mpesaPhoneNumber) && (
                        <div className="flex items-start space-x-3">
                          <Receipt className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-semibold mb-1">Payment Details</p>
                            {order.mpesaTransactionId && (
                              <p className="font-mono text-sm text-green-600 mb-1">{order.mpesaTransactionId}</p>
                            )}
                            {order.mpesaPhoneNumber && (
                              <p className="text-sm text-muted-foreground">Paid with: {order.mpesaPhoneNumber}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {order.notes && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-1">Order Notes:</p>
                          <p className="text-sm text-muted-foreground">{order.notes}</p>
                        </div>
                      )}

                      {/* Product Details */}
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">Product Details</p>
                        <div className="flex items-start space-x-3">
                          {order.product?.images?.[0] ? (
                            <div className="relative h-20 w-20 rounded overflow-hidden bg-muted flex-shrink-0">
                              <Image
                                src={order.product.images[0]}
                                alt={order.product.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-20 w-20 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <Package className="h-10 w-10 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-semibold">{order.product?.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {order.product?.description}
                            </p>
                            <p className="text-sm">
                              Condition: <span className="capitalize">{order.product?.condition}</span>
                            </p>
                            <p className="text-sm">
                              Category: {order.product?.category?.name}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {canUpdate && order.status !== 'cancelled' && order.status !== 'refunded' && (
                        <div className="flex space-x-2 pt-2">
                          <Button
                            variant="primary"
                            onClick={() => updateOrderStatus(order._id, nextStatus!)}
                            disabled={updating === order._id}
                            isLoading={updating === order._id}
                            className="flex-1"
                          >
                            {getActionLabel(order.status)}
                          </Button>
                          {order.status === 'pending' && (
                            <Button
                              variant="danger"
                              onClick={() => {
                                if (confirm('Are you sure you want to cancel this order?')) {
                                  updateOrderStatus(order._id, 'cancelled');
                                }
                              }}
                              disabled={updating === order._id}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
