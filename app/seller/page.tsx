'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Package,
  ShoppingCart,
  TrendingUp,
  Star,
  LogOut,
  Settings,
  Eye,
  Edit,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { usersAPI } from '@/lib/api/users';
import { productsAPI } from '@/lib/api/products';
import { ordersAPI } from '@/lib/api/orders';
import { sellersAPI } from '@/lib/api/sellers';
import type { Product, Order, DashboardStats } from '@/types';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { toast } from '@/components/ui/Toaster';
import { Wallet, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

function SellerDashboardContent() {
  const { user, logout } = useAuth();
  const { socket, isConnected } = useSocket();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, balanceRes] = await Promise.all([
        usersAPI.getDashboardStats(),
        sellersAPI.getBalance()
      ]);
      setStats(statsRes.data.stats);
      setRecentProducts(statsRes.data.recentProducts);
      setRecentOrders(statsRes.data.recentOrders);
      setBalance(balanceRes.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for payout processed events
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    const handlePayoutProcessed = (data: {
      sellerId: string;
      orderId: string;
      orderNumber: string;
      amount: number;
      processedAt: string;
    }) => {
      if (data.sellerId === user._id) {
        toast.success(`Payout received! Order ${data.orderNumber} - ${formatPrice(data.amount)}`);
        // Refresh balance only
        sellersAPI.getBalance().then(res => {
          setBalance(res.data.data);
        }).catch(err => {
          console.error('Failed to refresh balance:', err);
        });
      }
    };

    socket.on('payout:processed', handlePayoutProcessed);

    return () => {
      socket.off('payout:processed', handlePayoutProcessed);
    };
  }, [socket, isConnected, user]);

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await productsAPI.deleteProduct(productId);
      setRecentProducts(recentProducts.filter(p => p._id !== productId));
    } catch (error) {
      console.error('Failed to delete product:', error);
        toast.error('Failed to delete product.');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await ordersAPI.updateOrderStatus(orderId, { status });
      setRecentOrders(recentOrders.map(o =>
        o._id === orderId ? { ...o, status: status as Order['status'] } : o
      ));
    } catch (error) {
      console.error('Failed to update order:', error);
        toast.error('Failed to update order.');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Seller Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name}</p>
        </div>
        <Link href="/products/new">
          <button className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
            <Plus className="h-5 w-5" />
            <span>Add Product</span>
          </button>
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.products.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.products.available} available
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.orders.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.orders.pending} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(stats.revenue)}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.orders.completed} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rating</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{user?.averageRating || 'N/A'}</div>
                <p className="text-xs text-muted-foreground">
                  {user?.totalReviews || 0} reviews
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Balance Card */}
          {balance && (
            <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Wallet className="h-5 w-5" />
                    <span>Your Balance</span>
                  </CardTitle>
                  <Link href="/seller/earnings">
                    <button className="text-sm text-primary hover:underline">
                      View Details →
                    </button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                    <p className="text-3xl font-bold text-primary">{formatPrice(balance.currentBalance)}</p>
                    <Link href="/seller/earnings" className="inline-flex items-center mt-3">
                      <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm font-medium">
                        <Wallet className="h-4 w-4" />
                        Withdraw Funds
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </Link>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
                    <p className="text-2xl font-semibold flex items-center">
                      <ArrowDownToLine className="h-4 w-4 mr-2 text-green-600" />
                      {formatPrice(balance.totalEarnings)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Withdrawn Total</p>
                    <p className="text-2xl font-semibold flex items-center">
                      <ArrowUpFromLine className="h-4 w-4 mr-2 text-blue-600" />
                      {formatPrice(balance.withdrawnTotal)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Products */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Products</h2>
            <Link href="/seller/products" className="text-primary hover:underline text-sm">
              View All
            </Link>
          </div>

          <div className="space-y-4">
            {recentProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No products yet. Add your first product!
              </div>
            ) : (
              recentProducts.map((product) => (
                <div key={product._id} className="flex items-center space-x-4 p-4 rounded-lg border bg-card">
                  <div className="w-16 h-16 rounded bg-muted overflow-hidden flex-shrink-0 relative">
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.title}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{product.title}</h3>
                    <p className="text-sm text-muted-foreground">{formatPrice(product.price)}</p>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>{product.views}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link href={`/products/${product._id}/edit`}>
                      <button className="p-2 hover:bg-accent rounded-lg">
                        <Edit className="h-4 w-4" />
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDeleteProduct(product._id)}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Orders</h2>
            <Link href="/seller/orders" className="text-primary hover:underline text-sm">
              View All
            </Link>
          </div>

          <div className="space-y-4">
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No orders yet
              </div>
            ) : (
              recentOrders.map((order) => (
                <div key={order._id} className="p-4 rounded-lg border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{order.orderNumber}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{order.product?.title || 'Unknown Product'}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span>{formatPrice(order.totalPrice)}</span>
                    <span className="text-muted-foreground">{formatRelativeTime(order.createdAt)}</span>
                  </div>

                  {order.status === 'pending' && (
                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={() => handleUpdateOrderStatus(order._id, 'confirmed')}
                        className="flex-1 px-3 py-1 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleUpdateOrderStatus(order._id, 'cancelled')}
                        className="flex-1 px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded-lg hover:opacity-90"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SellerDashboard() {
  return (
    <ClientErrorBoundary>
      <SellerDashboardContent />
    </ClientErrorBoundary>
  );
}
