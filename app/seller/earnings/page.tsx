'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { sellersAPI, type Transaction } from '@/lib/api/sellers';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { toast } from '@/components/ui/Toaster';
import Button from '@/components/ui/Button';

function EarningsPageContent() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [balance, setBalance] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalNotes, setWithdrawalNotes] = useState('');

  const fetchBalance = useCallback(async () => {
    try {
      const res = await sellersAPI.getBalance();
      const balanceData = res.data.data;
      setBalance(balanceData);
      setTransactions(balanceData.ledger || []);
      // Filter withdrawal transactions from ledger
      const withdrawals = (balanceData.ledger || []).filter(
        (t: Transaction) => t.type === 'withdrawal'
      );
      setWithdrawalRequests(withdrawals);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      toast.error('Failed to load balance information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

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
        fetchBalance();
      }
    };

    socket.on('payout:processed', handlePayoutProcessed);

    return () => {
      socket.off('payout:processed', handlePayoutProcessed);
    };
  }, [socket, isConnected, user, fetchBalance]);

  const handleWithdrawal = async () => {
    const amount = parseFloat(withdrawalAmount);

    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > balance?.currentBalance) {
      toast.error(`Insufficient balance. Available: ${formatPrice(balance.currentBalance)}`);
      return;
    }

    setWithdrawing(true);
    try {
      await sellersAPI.requestWithdrawal({
        amount,
        notes: withdrawalNotes,
      });

      toast.success('Withdrawal request submitted successfully!');
      setWithdrawalAmount('');
      setWithdrawalNotes('');
      await fetchBalance(); // Refresh balance
    } catch (error: any) {
      console.error('Withdrawal request failed:', error);
      toast.error(error.response?.data?.message || 'Failed to submit withdrawal request');
    } finally {
      setWithdrawing(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <ArrowDownToLine className="h-5 w-5 text-green-600" />;
      case 'withdrawal':
        return <ArrowUpFromLine className="h-5 w-5 text-blue-600" />;
      case 'fee':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading earnings...</p>
        </div>
      </div>
    );
  }

  if (!balance) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-2">
              <Wallet className="h-8 w-8" />
              <span>Earnings & Payouts</span>
            </h1>
            <p className="text-muted-foreground mt-2">Manage your balance and request withdrawals</p>
          </div>
          <Link href="/seller">
            <Button variant="outline">← Back to Dashboard</Button>
          </Link>
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-800">Available Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-900">{formatPrice(balance.currentBalance)}</p>
              <p className="text-xs text-green-700 mt-1">Ready for withdrawal</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold flex items-center">
                <ArrowDownToLine className="h-5 w-5 mr-2 text-green-600" />
                {formatPrice(balance.totalEarnings)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{balance.totalOrders} orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Withdrawn</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold flex items-center">
                <ArrowUpFromLine className="h-5 w-5 mr-2 text-blue-600" />
                {formatPrice(balance.withdrawnTotal)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total withdrawn</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                {formatPrice(balance.pendingWithdrawals)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Awaiting processing</p>
            </CardContent>
          </Card>
        </div>

        {/* Withdrawal Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Request Withdrawal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {balance.currentBalance <= 0 && (
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Insufficient Balance
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        You need earnings before you can request a withdrawal. 
                        Sell some products to start earning!
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Amount to Withdraw (Max: {formatPrice(balance.currentBalance || 0)})
                </label>
                <input
                  type="number"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  max={balance.currentBalance || 0}
                  min="1"
                  step="0.01"
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 rounded-lg border bg-background"
                  disabled={balance.currentBalance <= 0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={withdrawalNotes}
                  onChange={(e) => setWithdrawalNotes(e.target.value)}
                  placeholder="Any additional information..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border bg-background"
                  disabled={balance.currentBalance <= 0}
                />
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={handleWithdrawal}
                  disabled={withdrawing || !withdrawalAmount || balance.currentBalance <= 0}
                  className="flex-1"
                >
                  {withdrawing ? 'Processing...' : 'Submit Withdrawal Request'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setWithdrawalAmount('');
                    setWithdrawalNotes('');
                  }}
                  disabled={withdrawing}
                >
                  Clear
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Withdrawal requests are typically processed within 1-3 business days.
                You will receive a notification when your withdrawal is completed.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Requests */}
        {withdrawalRequests.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Withdrawal Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {withdrawalRequests.map((request) => (
                  <div
                    key={request._id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {request.status === 'pending' && <Clock className="h-5 w-5 text-yellow-600" />}
                        {request.status === 'processing' && <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />}
                        {request.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-600" />}
                        {request.status === 'cancelled' && <XCircle className="h-5 w-5 text-red-600" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold">{formatPrice(request.amount)}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                            request.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Requested {formatRelativeTime(request.requestedAt)}
                        </p>
                        {request.notes && (
                          <p className="text-xs text-muted-foreground mt-1">Note: {request.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {request.status === 'pending' && 'Awaiting processing'}
                        {request.status === 'processing' && 'Being processed'}
                        {request.status === 'completed' && 'Completed'}
                        {request.status === 'cancelled' && 'Cancelled'}
                      </p>
                      {request.completedAt && (
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(request.completedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions yet
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <p className="font-medium capitalize">
                          {transaction.type}
                          {transaction.productTitle && ` - ${transaction.productTitle}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.description || 'No description'}
                          {transaction.buyerName && ` • Buyer: ${transaction.buyerName}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(transaction.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-semibold ${
                          transaction.type === 'sale' ? 'text-green-600' :
                          transaction.type === 'withdrawal' ? 'text-blue-600' :
                          transaction.type === 'fee' ? 'text-red-600' :
                          'text-foreground'
                        }`}
                      >
                        {transaction.type === 'sale' ? '+' :
                         transaction.type === 'withdrawal' || transaction.type === 'fee' ? '-' :
                         ''}{formatPrice(transaction.amount)}
                      </p>
                      <div className="flex items-center justify-end space-x-1 mt-1">
                        {getStatusIcon(transaction.status)}
                        <span className="text-xs text-muted-foreground capitalize">
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SellerEarningsPage() {
  return (
    <ClientErrorBoundary>
      <EarningsPageContent />
    </ClientErrorBoundary>
  );
}
