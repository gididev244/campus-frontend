'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Check, Phone, Receipt, Package, User, Calendar, ChevronDown, ChevronRight, MessageCircle, Send, Loader2, Banknote, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ordersAPI } from '@/lib/api/orders';
import { adminAPI } from '@/lib/api/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatPrice } from '@/lib/utils';
import { PageHeaderSkeleton } from '@/components/ui/skeleton';
import type { Order, SellerPayoutGroup, PayoutOrderSummary } from '@/types';
import { toast } from '@/components/ui/Toaster';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';

interface ApiLedgerResponse {
  success: boolean;
  data: Order[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  pendingPayoutTotal?: number;
}

export default function PayoutLedger() {
  return (
    <ClientErrorBoundary>
      <PayoutLedgerContent />
    </ClientErrorBoundary>
  );
}

function PayoutLedgerContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<SellerPayoutGroup | null>(null);
  const [notes, setNotes] = useState('');
  const [expandedSellers, setExpandedSellers] = useState<Set<string>>(new Set());
  const [b2cProcessing, setB2cProcessing] = useState<string | null>(null);
  const [payoutMode, setPayoutMode] = useState<'manual' | 'b2c'>('manual');

  const sellerGroups = useMemo(() => {
  const [b2cProcessing, setB2cProcessing] = useState<string | null>(null);
  const [payoutMode, setPayoutMode] = useState<'manual' | 'b2c'>('manual');

  const sellerGroups = useMemo(() => {
    const groups: SellerPayoutGroup[] = [];
    const sellerMap = new Map<string, SellerPayoutGroup>();

    for (const order of orders) {
      if (!order.seller?._id) continue;

      const sellerId = order.seller._id;

      if (!sellerMap.has(sellerId)) {
        const group: SellerPayoutGroup = {
          seller: order.seller,
          sellerId: sellerId,
          totalOrders: 0,
          totalEarnings: 0,
          paidAmount: 0,
          pendingAmount: 0,
          orders: [],
        };
        sellerMap.set(sellerId, group);
        groups.push(group);
      }

      const group = sellerMap.get(sellerId)!;
      const orderSummary: PayoutOrderSummary = {
        orderId: order._id,
        orderNumber: order.orderNumber,
        product: order.product,
        quantity: order.quantity,
        totalPrice: order.totalPrice,
        orderDate: order.createdAt,
        buyer: order.buyer,
      };
      group.orders.push(orderSummary);
      group.totalOrders++;
      group.totalEarnings += order.totalPrice;
      group.pendingAmount += order.totalPrice;
    }

    return groups;
  }, [orders]);

  useEffect(() => {
    fetchLedger();
  }, [page]);

  const fetchLedger = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ordersAPI.getPayoutLedger({ page, limit: 50 });
      const data = response.data as ApiLedgerResponse;

      setOrders(data.data || []);
      setPendingTotal(data.pendingPayoutTotal || 0);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to fetch payout ledger:', error);
      toast.error('Failed to load payout ledger.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  const toggleSellerExpansion = useCallback((sellerId: string) => {
    setExpandedSellers(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(sellerId)) {
        newExpanded.delete(sellerId);
      } else {
        newExpanded.add(sellerId);
      }
      return newExpanded;
    });
  }, []);

  const handleMarkSellerPaid = useCallback(async (sellerId: string) => {
    try {
    setProcessing(sellerId);
    await ordersAPI.markSellerPaidBatch(sellerId, notes ? { notes } : undefined);

    const paidGroup = sellerGroups.find(g => g.seller._id === sellerId);
    const paidOrderIds = paidGroup?.orders.map(o => o.orderId) || [];

    setOrders(prev => prev.filter(o => !paidOrderIds.includes(o._id)));

    if (paidGroup) {
      setPendingTotal(prev => Math.max(0, prev - paidGroup.pendingAmount));
      }

      setShowNotesModal(false);
      setNotes('');
      setSelectedSeller(null);
      toast.success('Seller marked as paid successfully!');
    } catch (error) {
      console.error('Failed to mark as paid:', error);
      toast.error('Failed to mark as paid. Please try again.');
    } finally {
      setProcessing(null);
    }
  }, [notes, sellerGroups]);

  const handleB2CPayout = useCallback(async (sellerId: string) => {
    if (!selectedSeller) return;

    try {
      setB2cProcessing(sellerId);
      
      const response = await adminAPI.initiateB2CPayout(sellerId, {
        amount: selectedSeller.pendingAmount,
        notes: notes || undefined
      });

      const paidGroup = sellerGroups.find(g => g.seller._id === sellerId);

      if (response.data.b2cStatus === 'processing') {
        toast.success('B2C payment initiated! Seller will receive M-Pesa shortly.');
      } else {
        toast.success('B2C payment completed successfully!');
        const paidOrderIds = paidGroup?.orders.map(o => o.orderId) || [];
        setOrders(prev => prev.filter(o => !paidOrderIds.includes(o._id)));
        if (paidGroup) {
          setPendingTotal(prev => Math.max(0, prev - paidGroup.pendingAmount));
        }
      }

      setShowNotesModal(false);
      setNotes('');
      setSelectedSeller(null);
    } catch (error: any) {
      console.error('Failed to initiate B2C payout:', error);
      toast.error(error.response?.data?.message || 'Failed to initiate B2C payout. Please try again.');
    } finally {
      setB2cProcessing(null);
    }
  }, [notes, selectedSeller, sellerGroups]);

  const openNotesModal = useCallback((sellerGroup: SellerPayoutGroup) => {
    setSelectedSeller(sellerGroup);
    setNotes('');
    setShowNotesModal(true);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const handleMessageSeller = useCallback((sellerId: string) => {
    router.push(`/messages?userId=${sellerId}&from=payouts`);
  }, [router]);

  const handleMessageBuyer = useCallback((buyerId: string) => {
    router.push(`/messages?userId=${buyerId}&from=payouts`);
  }, [router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeaderSkeleton showSubtitle showActions={false} />
        <div className="mb-8 rounded-lg border bg-card p-6">
          <div className="space-y-4">
            <div className="h-6 bg-muted rounded w-48 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                <div className="h-8 bg-muted rounded w-32 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                <div className="h-8 bg-muted rounded w-32 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                <div className="h-8 bg-muted rounded w-32 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-lg border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-48 animate-pulse" />
                    <div className="h-3 bg-muted rounded w-32 animate-pulse" />
                  </div>
                </div>
                <div className="h-6 bg-muted rounded w-24 animate-pulse" />
              </div>
              <div className="h-24 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Seller Payout Ledger</h1>
        <p className="text-muted-foreground">
          Manage payouts to sellers for completed orders
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Pending Payouts Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Sellers to Pay</p>
              <p className="text-3xl font-bold">{sellerGroups.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Orders to Pay</p>
              <p className="text-3xl font-bold">{orders.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount to Pay</p>
              <p className="text-3xl font-bold text-green-600">{formatPrice(pendingTotal)}</p>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2">💡 Payment Flow Instructions:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li><strong>Verify Payment:</strong> Check the M-Pesa Receipt code matches buyer&apos;s payment message</li>
              <li><strong>Message Seller:</strong> Click &quot;Message Seller&quot; to instruct delivery</li>
              <li><strong>Message Buyer:</strong> Click message icon to confirm they received the goods</li>
              <li><strong>Mark Paid:</strong> Once confirmed, click &quot;Pay All&quot; to record seller payout</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {sellerGroups.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Check className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                <p className="text-muted-foreground">No pending payouts at the moment.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          sellerGroups.map((sellerGroup) => {
            const isExpanded = expandedSellers.has(sellerGroup.seller._id);
            return (
              <Card key={sellerGroup.seller._id}>
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSellerExpansion(sellerGroup.seller._id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold">{sellerGroup.seller?.name || 'Unknown'}</h3>
                          <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium">
                            {sellerGroup.orders.length} order(s)
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{sellerGroup.seller?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Payout</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatPrice(sellerGroup.pendingAmount)}
                        </p>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          openNotesModal(sellerGroup);
                        }}
                        disabled={processing === sellerGroup.seller._id}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processing === sellerGroup.seller._id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Pay All
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-sm text-muted-foreground">
                          Order Details ({sellerGroup.orders.length})
                        </h4>
                        <div className="flex items-center space-x-3 text-sm">
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono">{sellerGroup.seller?.phone || 'N/A'}</span>
                          </div>
                          <Button
                            onClick={() => handleMessageSeller(sellerGroup.seller._id)}
                            size="sm"
                            variant="outline"
                            className="h-8 px-3"
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Message Seller
                          </Button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 font-medium text-sm">Order</th>
                              <th className="text-left py-2 px-3 font-medium text-sm">Product</th>
                              <th className="text-left py-2 px-3 font-medium text-sm">Buyer</th>
                              <th className="text-left py-2 px-3 font-medium text-sm">M-Pesa Receipt</th>
                              <th className="text-left py-2 px-3 font-medium text-sm">Amount</th>
                              <th className="text-left py-2 px-3 font-medium text-sm">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sellerGroup.orders.map((order) => (
                              <tr key={order.orderId} className="border-b hover:bg-muted/30">
                                <td className="py-3 px-3">
                                  <div className="font-medium text-sm">{order.orderNumber}</div>
                                  <div className="text-xs text-muted-foreground">ID: {order.orderId.slice(-6)}</div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center space-x-2">
                                    {order.product?.images?.[0] && (
                                      <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0">
                                        <Image
                                          src={order.product.images[0]}
                                          alt={order.product?.title || 'Product'}
                                          fill
                                          className="object-cover"
                                          sizes="32px"
                                        />
                                      </div>
                                    )}
                                    <div className="max-w-xs">
                                      <div className="text-sm font-medium truncate">{order.product?.title || 'Unknown Product'}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {order.product?.condition || 'N/A'} • {formatPrice(order.product?.price || 0)}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <User className="h-3 w-3 text-muted-foreground" />
                                      <div>
                                        <div className="text-sm font-medium">{order.buyer?.name}</div>
                                        <div className="text-xs text-muted-foreground">{order.buyer?.email}</div>
                                      </div>
                                    </div>
                                    <Button
                                      onClick={() => handleMessageBuyer(order.buyer?._id || '')}
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      title={`Message ${order.buyer?.name}`}
                                    >
                                      <Send className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  {order.mpesaTransactionId ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center space-x-1">
                                        <Receipt className="h-3 w-3 text-green-600" />
                                        <span className="font-mono text-xs font-semibold">{order.mpesaTransactionId}</span>
                                      </div>
                                      {order.mpesaPhoneNumber && (
                                        <div className="text-xs text-muted-foreground">
                                          Paid with: {order.mpesaPhoneNumber}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">N/A</span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-semibold">{formatPrice(order.totalPrice)}</div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(order.orderDate)}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-6">
          <Button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            variant="outline"
            size="sm"
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            variant="outline"
            size="sm"
          >
            Next
          </Button>
        </div>
      )}

      {showNotesModal && selectedSeller && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Pay {selectedSeller.seller?.name || 'Unknown'}
            </h3>

            <div className="space-y-4 mb-6">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Amount:</span>
                  <span className="font-bold text-green-600">{formatPrice(selectedSeller.pendingAmount)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Orders:</span>
                  <span>{selectedSeller.orders.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Phone:</span>
                  <span className="font-mono">{selectedSeller.seller?.phone || 'N/A'}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Payout Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPayoutMode('b2c')}
                    className={`p-3 rounded-lg border-2 text-left ${payoutMode === 'b2c' ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Banknote className={`h-4 w-4 ${payoutMode === 'b2c' ? 'text-primary' : ''}`} />
                      <span className="font-medium text-sm">M-Pesa B2C</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Instant payout via M-Pesa</p>
                  </button>
                  <button
                    onClick={() => setPayoutMode('manual')}
                    className={`p-3 rounded-lg border-2 text-left ${payoutMode === 'manual' ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Check className={`h-4 w-4 ${payoutMode === 'manual' ? 'text-primary' : ''}`} />
                      <span className="font-medium text-sm">Manual</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Mark as paid manually</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this payout..."
                  className="w-full border rounded-lg px-3 py-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => {
                  setShowNotesModal(false);
                  setNotes('');
                  setSelectedSeller(null);
                }}
                variant="outline"
              >
                Cancel
              </Button>
              {payoutMode === 'b2c' ? (
                <Button
                  onClick={() => handleB2CPayout(selectedSeller.seller._id)}
                  disabled={b2cProcessing === selectedSeller.seller._id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {b2cProcessing === selectedSeller.seller._id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Banknote className="h-4 w-4 mr-2" />
                      Pay via M-Pesa
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => handleMarkSellerPaid(selectedSeller.seller._id)}
                  disabled={processing === selectedSeller.seller._id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing === selectedSeller.seller._id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
