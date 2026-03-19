'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ShoppingBag, Package, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ordersAPI } from '@/lib/api/orders';
import { productsAPI } from '@/lib/api/products';
import type { Order, Product } from '@/types';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { toast } from '@/components/ui/Toaster';

function BuyerDashboardContent() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/buyer');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await ordersAPI.getOrders({ as: 'buyer', limit: 10 });
        setOrders(res.data.data);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
        toast.error('Failed to load orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Buyer Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.name}</p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link href="/orders" className="group">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
              <p className="text-xs text-muted-foreground">total orders</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/wishlist" className="group">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wishlist</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">saved items</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/products" className="group">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Browse</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Shop</div>
              <p className="text-xs text-muted-foreground">find products</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Orders</h2>
          <Link href="/orders" className="text-primary hover:underline text-sm">
            View All
          </Link>
        </div>

        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No orders yet</p>
              <Link href="/products" className="text-primary hover:underline">
                Start shopping
              </Link>
            </div>
          ) : (
            orders.map((order) => (
              <Link key={order._id} href={`/orders/${order._id}`}>
                <div className="flex items-center space-x-4 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                  <div className="w-16 h-16 rounded bg-muted overflow-hidden flex-shrink-0 relative">
                    {order.product.images?.[0] ? (
                      <Image
                        src={order.product.images[0]}
                        alt={order.product.title}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{order.product.title}</h3>
                    <p className="text-sm text-muted-foreground">{order.orderNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPrice(order.totalPrice)}</p>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function BuyerDashboard() {
  return (
    <ClientErrorBoundary>
      <BuyerDashboardContent />
    </ClientErrorBoundary>
  );
}
