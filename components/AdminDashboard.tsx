'use client';

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import { Users, Package, ShoppingCart, TrendingUp, Settings, Wallet, Loader2, ClipboardList, BarChart3, Star, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI } from '@/lib/api/users';
import { productsAPI } from '@/lib/api/products';
import { ordersAPI } from '@/lib/api/orders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatPrice } from '@/lib/utils';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';

const DASHBOARD_LINKS = [
  {
    href: '/admin/analytics',
    icon: BarChart3,
    title: 'Analytics',
    description: 'View platform analytics and insights',
    customClass: 'border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/20',
    iconClass: 'text-purple-600',
  },
  {
    href: '/admin/orders',
    icon: ClipboardList,
    title: 'Manage Orders',
    description: 'View and manage all platform orders',
    customClass: 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20',
    iconClass: 'text-blue-600',
  },
  {
    href: '/admin/users',
    icon: Users,
    title: 'Manage Users',
    description: 'View and manage all users',
    customClass: '',
    iconClass: '',
  },
  {
    href: '/admin/products',
    icon: Package,
    title: 'Manage Products',
    description: 'View and moderate products',
    customClass: '',
    iconClass: '',
  },
  {
    href: '/admin/categories',
    icon: Settings,
    title: 'Categories',
    description: 'Manage product categories',
    customClass: '',
    iconClass: '',
  },
  {
    href: '/admin/reviews',
    icon: Star,
    title: 'Review Moderation',
    description: 'Moderate product reviews',
    customClass: 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20',
    iconClass: 'text-yellow-600',
  },
  {
    href: '/admin/payouts',
    icon: Wallet,
    title: 'Seller Payouts',
    description: 'Manage seller payouts and view ledger',
    customClass: 'border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20',
    iconClass: 'text-orange-600',
  },
  {
    href: '/admin/withdrawals',
    icon: DollarSign,
    title: 'Withdrawals',
    description: 'Manage seller withdrawal requests',
    customClass: 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20',
    iconClass: 'text-green-600',
  },
] as const;

function AdminDashboardContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    users: 0,
    products: 0,
    orders: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  // Memoized stats fetcher to prevent re-creation
  const fetchStats = useCallback(async () => {
    try {
      const [usersRes, productsRes, ordersRes] = await Promise.all([
        usersAPI.getUsers({ limit: 1 }),
        productsAPI.getProducts({ limit: 1 }),
        ordersAPI.getOrders({ limit: 1 }),
      ]);

      setStats({
        users: usersRes.data.pagination?.total || 0,
        products: productsRes.data.pagination?.total || 0,
        orders: ordersRes.data.pagination?.total || 0,
        revenue: 0, // Calculate from completed orders
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Memoize stats display to prevent re-renders
  const statsCards = useMemo(() => [
    {
      title: 'Total Users',
      value: stats.users,
      description: 'registered users',
      icon: Users,
    },
    {
      title: 'Total Products',
      value: stats.products,
      description: 'active listings',
      icon: Package,
    },
    {
      title: 'Total Orders',
      value: stats.orders,
      description: 'all orders',
      icon: ShoppingCart,
    },
    {
      title: 'Revenue',
      value: formatPrice(stats.revenue),
      description: 'total revenue',
      icon: TrendingUp,
    },
  ], [stats]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {user?.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {DASHBOARD_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className={`hover:shadow-lg transition-shadow cursor-pointer ${link.customClass || ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <link.icon className={`h-5 w-5 ${link.iconClass || ''}`} />
                  <span>{link.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <ClientErrorBoundary>
      <AdminDashboardContent />
    </ClientErrorBoundary>
  );
}
