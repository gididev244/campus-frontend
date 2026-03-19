'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, MapPin, Phone, Mail, Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { ordersAPI } from '@/lib/api/orders';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/lib/utils';
import type { Order } from '@/types';
import { toast } from '@/components/ui/Toaster';
import { OrderDetailSkeleton } from '@/components/ui/skeleton';

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await ordersAPI.getOrder(params.id as string);
        setOrder(res.data.order);
      } catch (error: unknown) {
        console.error('Failed to fetch order:', error);
        toast.error('Failed to load order details.');
        const err = error as { response?: { status?: number } };
        if (err.response?.status === 404) {
          toast.error('Order not found');
          router.push('/buyer/orders');
        } else if (err.response?.status === 403) {
          toast.error('You are not authorized to view this order');
          router.push('/products');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [params.id, isAuthenticated, router]);

  const handleConfirmReceived = async () => {
    if (!order) return;

    setConfirming(true);
    try {
      await ordersAPI.confirmReceived(order._id);
      toast.success('Order confirmed as received!');
      const res = await ordersAPI.getOrder(order._id);
      setOrder(res.data.order);
    } catch (error: unknown) {
      console.error('Failed to confirm received:', error);
      toast.error('Failed to confirm receipt.');
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to confirm receipt');
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    setCancelling(true);
    try {
      await ordersAPI.cancelOrder(order._id, { reason: 'buyer-request' });
      toast.success('Order cancelled successfully');
      // Refresh order details
      const res = await ordersAPI.getOrder(order._id);
      setOrder(res.data.order);
    } catch (error: unknown) {
      console.error('Failed to cancel order:', error);
        toast.error('Failed to cancel order.');
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const handleInitiatePayment = async () => {
    if (!order) return;

    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setPaying(true);
    try {
      const res = await ordersAPI.initiatePayment(order._id, { phoneNumber });
      toast.success(`Payment initiated! Request ID: ${res.data.checkoutRequestID}. Check your phone for M-Pesa prompt.`);
      // Refresh order details
      const orderRes = await ordersAPI.getOrder(order._id);
      setOrder(orderRes.data.order);
    } catch (error: unknown) {
      console.error('Failed to initiate payment:', error);
        toast.error('Failed to initiate payment.');
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setPaying(false);
    }
  };

  const getStatusIcon = () => {
    if (!order) return null;

    switch (order.status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'shipped':
        return <Package className="h-5 w-5 text-purple-500" />;
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'refunded':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPaymentStatusColor = () => {
    if (!order) return 'text-gray-500';

    switch (order.paymentStatus) {
      case 'completed':
        return 'text-green-500';
      case 'pending':
        return 'text-yellow-500';
      case 'failed':
        return 'text-red-500';
      case 'refunded':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <OrderDetailSkeleton />
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Order Details</h1>
            <p className="text-muted-foreground mt-1">Order #{order.orderNumber}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
          >
            Back
          </button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Order Status</p>
                <p className="text-2xl font-bold capitalize mt-1">{order.status}</p>
              </div>
              {getStatusIcon()}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <p className={`text-2xl font-bold capitalize mt-1 ${getPaymentStatusColor()}`}>
                  {order.paymentStatus}
                </p>
              </div>
              {order.paymentStatus === 'completed' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-500" />
              )}
            </div>
          </div>
        </div>

        {/* Product Details */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">Product Information</h2>
          <div className="flex gap-4">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {order.product?.images?.[0] ? (
                <Image
                  src={order.product.images[0]}
                  alt={order.product?.title || 'Product'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No Image
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{order.product?.title || 'Unknown Product'}</h3>
              <p className="text-sm text-muted-foreground">Seller: {order.seller.name}</p>
              <p className="text-sm text-muted-foreground">Quantity: {order.quantity}</p>
              <p className="text-lg font-bold text-primary mt-2">
                {formatPrice(order.totalPrice)}
              </p>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        {order.shippingAddress && (
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center space-x-2 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Shipping Address</h2>
            </div>
            <div className="space-y-1">
              {order.shippingAddress.street && (
                <p className="text-sm">{order.shippingAddress.street}</p>
              )}
              {(order.shippingAddress.building || order.shippingAddress.room) && (
                <p className="text-sm">
                  {order.shippingAddress.building && `Building: ${order.shippingAddress.building}`}
                  {order.shippingAddress.building && order.shippingAddress.room && ', '}
                  {order.shippingAddress.room && `Room: ${order.shippingAddress.room}`}
                </p>
              )}
              {order.shippingAddress.city && (
                <p className="text-sm">{order.shippingAddress.city}</p>
              )}
              {order.shippingAddress.landmarks && (
                <p className="text-sm text-muted-foreground">Landmarks: {order.shippingAddress.landmarks}</p>
              )}
            </div>
          </div>
        )}

        {/* Seller Information */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">Seller Information</h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{order.seller.email}</p>
              </div>
            </div>
            {order.seller.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{order.seller.phone}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Information */}
        {order.paymentStatus === 'pending' && (
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Complete Payment</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  M-Pesa Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g., 0712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You will receive an M-Pesa prompt on this number
                </p>
              </div>
              <button
                onClick={handleInitiatePayment}
                disabled={paying}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {paying ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Processing...</span>
                  </span>
                ) : (
                  `Pay ${formatPrice(order.totalPrice)}`
                )}
              </button>
            </div>
          </div>
        )}

        {/* Confirm Receipt - Show when order is shipped */}
        {order.status === 'shipped' && (
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Confirm Receipt</h2>
            <p className="text-muted-foreground mb-4">
              Have you received your order? Click below to confirm delivery.
            </p>
            <button
              onClick={handleConfirmReceived}
              disabled={confirming}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirming ? (
                <span className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Confirming...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>Confirm Received</span>
                </span>
              )}
            </button>
          </div>
        )}

        {/* Actions - Cancel only for pending orders */}
        {order.status === 'pending' && (
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="w-full px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? (
                <span className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Cancelling...</span>
                </span>
              ) : (
                'Cancel Order'
              )}
            </button>
          </div>
        )}

        {/* Order Timeline */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">Order Timeline</h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Order Placed</p>
                <p className="font-medium">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
            </div>
            {order.deliveredAt && (
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Delivered</p>
                  <p className="font-medium">{new Date(order.deliveredAt).toLocaleString()}</p>
                </div>
              </div>
            )}
            {order.cancelledAt && (
              <div className="flex items-center space-x-3">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Cancelled</p>
                  <p className="font-medium">{new Date(order.cancelledAt).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* M-Pesa Transaction Details */}
        {order.mpesaTransactionId && (
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-medium">{order.mpesaTransactionId}</span>
              </div>
              {order.mpesaPhoneNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone Number</span>
                  <span className="font-medium">{order.mpesaPhoneNumber}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
