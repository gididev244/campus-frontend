'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Loader2, Search, Filter, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { ordersAPI } from '@/lib/api/orders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import OrderCard from '@/components/admin/OrderCard';
import OrderFilters from '@/components/admin/OrderFilters';
import OrderDetailsModal from '@/components/admin/OrderDetailsModal';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { toast } from '@/components/ui/Toaster';
import type { Order } from '@/types';

// Order status options for filtering
const ORDER_STATUSES = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'] as const;

// Payment status options
const PAYMENT_STATUSES = ['all', 'pending', 'completed', 'failed', 'refunded'] as const;

function AdminOrdersPage() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'totalPrice' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selected order for details modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Expanded orders for mobile view
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Memoized fetch function
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        limit: 20,
        as: 'admin', // Get all orders as admin
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (paymentStatusFilter !== 'all') {
        params.paymentStatus = paymentStatusFilter;
      }

      const response = await ordersAPI.getOrders(params);
      setOrders(response.data?.data || []);
      setTotalPages(response.data?.pagination?.pages || 1);
      setTotal(response.data?.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, paymentStatusFilter]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Listen for new orders via socket
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    const handleNewOrder = (data: { orderId: string; orderNumber: string }) => {
      toast.success(`New order: #${data.orderNumber}`);
      fetchOrders();
    };

    socket.on('order:new', handleNewOrder);

    return () => {
      socket.off('order:new', handleNewOrder);
    };
  }, [socket, isConnected, user, fetchOrders]);

  // Memoized filtered and sorted orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((order) => {
        return (
          order.orderNumber?.toLowerCase().includes(query) ||
          order.buyer?.name?.toLowerCase().includes(query) ||
          order.seller?.name?.toLowerCase().includes(query) ||
          order.product?.title?.toLowerCase().includes(query)
        );
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortBy) {
        case 'totalPrice':
          aVal = a.totalPrice;
          bVal = b.totalPrice;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'createdAt':
        default:
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  }, [orders, searchQuery, sortBy, sortOrder]);

  // Toggle order expansion
  const toggleExpanded = useCallback((orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((filters: {
    status: string;
    paymentStatus: string;
    search: string;
  }) => {
    setStatusFilter(filters.status);
    setPaymentStatusFilter(filters.paymentStatus);
    setSearchQuery(filters.search);
    setPage(1); // Reset to first page when filters change
  }, []);

  // View order details
  const viewOrderDetails = useCallback((order: Order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  }, []);

  // Handle status update
  const handleStatusUpdate = useCallback(async (orderId: string, newStatus: string) => {
    try {
      await ordersAPI.updateOrderStatus(orderId, { status: newStatus });
      // Refresh orders
      fetchOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
      throw error;
    }
  }, [fetchOrders]);

  // Toggle sort
  const toggleSort = useCallback((field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  }, [sortBy, sortOrder]);

  // Order statistics
  const orderStats = useMemo(() => {
    const stats = {
      total: total,
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      refunded: 0,
    };

    orders.forEach((order) => {
      if (stats[order.status as keyof typeof stats] !== undefined) {
        stats[order.status as keyof typeof stats]++;
      }
    });

    return stats;
  }, [orders, total]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Order Management</h1>
        <p className="text-muted-foreground">View and manage all platform orders</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">Shipped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats.shipped}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats.delivered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats.cancelled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Refunded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats.refunded}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OrderFilters
            statusFilter={statusFilter}
            paymentStatusFilter={paymentStatusFilter}
            searchQuery={searchQuery}
            onFilterChange={handleFilterChange}
            statuses={ORDER_STATUSES}
            paymentStatuses={PAYMENT_STATUSES}
          />
        </CardContent>
      </Card>

      {/* Sort Controls */}
      <div className="flex items-center space-x-4 mb-4">
        <Label>Sort by:</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleSort('createdAt')}
          className={sortBy === 'createdAt' ? 'bg-accent' : ''}
        >
          Date
          {sortBy === 'createdAt' && (
            sortOrder === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleSort('totalPrice')}
          className={sortBy === 'totalPrice' ? 'bg-accent' : ''}
        >
          Price
          {sortBy === 'totalPrice' && (
            sortOrder === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleSort('status')}
          className={sortBy === 'status' ? 'bg-accent' : ''}
        >
          Status
          {sortBy === 'status' && (
            sortOrder === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
          )}
        </Button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No orders found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                onViewDetails={() => viewOrderDetails(order)}
                onStatusUpdate={handleStatusUpdate}
                isExpanded={expandedOrders.has(order._id)}
                onToggleExpand={() => toggleExpanded(order._id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}

export default function AdminOrders() {
  return (
    <ClientErrorBoundary>
      <AdminOrdersPage />
    </ClientErrorBoundary>
  );
}
