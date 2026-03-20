'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import { ArrowLeft, Users, Search, Mail, Phone, MapPin, Calendar, Shield, Trash2, Edit, Check, X, Key, Copy, Lock, PhoneCall, Wallet, DollarSign, TrendingUp, Eye, Loader2, ArrowUpRight, ArrowDownRight, Receipt, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI } from '@/lib/api/users';
import { adminAPI, type UserBalanceResponse } from '@/lib/api/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { TableSkeleton, PageHeaderSkeleton, StatsCardsSkeleton } from '@/components/ui/skeleton';
import type { User } from '@/types';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { toast } from '@/components/ui/Toaster';

interface UsersResponse {
  success: boolean;
  data?: User[];  // Backend returns 'data' not 'users'
  users?: User[]; // Fallback for frontend compatibility
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export default function AdminUsers() {
  return (
    <ClientErrorBoundary>
      <AdminUsersContent />
    </ClientErrorBoundary>
  );
}

function AdminUsersContent() {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedUserBalance, setSelectedUserBalance] = useState<UserBalanceResponse | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setMessage({ type: 'error', text: 'Access denied. Admin only.' });
      setLoading(false);
      return;
    }

    fetchUsers();
  }, [isAdmin, page, roleFilter]);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;

    try {
      setLoading(true);
      const params: { page: number; limit: number; role?: string } = {
        page,
        limit: 20,
      };

      if (roleFilter !== 'all') {
        params.role = roleFilter;
      }

      const response = await usersAPI.getUsers(params);
      const data = response.data as UsersResponse;

      // Backend returns { data, pagination } not { users, pagination }
      let filteredUsers = (data.data || data.users || []);

      // Filter out the current admin user from being edited/deleted
      filteredUsers = filteredUsers.filter(u => u._id !== currentUser?._id);

      // Apply search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredUsers = filteredUsers.filter(
          u =>
            u.name.toLowerCase().includes(term) ||
            u.email.toLowerCase().includes(term) ||
            u.phone.includes(term)
        );
      }

      setUsers(filteredUsers);
      setTotalPages(data.pagination.pages);
      setTotalUsers(data.pagination.total);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users. Please try again.');

      setMessage({ type: 'error', text: 'Failed to load users. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, roleFilter, searchTerm, currentUser?._id]);

  useEffect(() => {
    if (searchTerm !== undefined) {
      const timer = setTimeout(() => {
        if (page === 1) {
          fetchUsers();
        } else {
          setPage(1);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [searchTerm, page, fetchUsers]);

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      setUpdatingUser(userId);
      await usersAPI.updateUser(userId, { role });

      setUsers(users.map(u => (u._id === userId ? { ...u, role: role as User['role'] } : u)));
      setMessage({ type: 'success', text: 'User role updated successfully' });
      setEditingRole(null);
      setNewRole('');
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update user role. Please try again.');

      setMessage({ type: 'error', text: 'Failed to update user role. Please try again.' });
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingUser(userId);
      await usersAPI.deleteUser(userId);

      setUsers(users.filter(u => u._id !== userId));
      setTotalUsers(prev => prev - 1);
      setMessage({ type: 'success', text: 'User deleted successfully' });
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user. Please try again.');

      setMessage({ type: 'error', text: 'Failed to delete user. Please try again.' });
    } finally {
      setDeletingUser(null);
    }
  };

  const startEditingRole = (userId: string, currentRole: string) => {
    setEditingRole(userId);
    setNewRole(currentRole);
  };

  const cancelEditingRole = () => {
    setEditingRole(null);
    setNewRole('');
  };

  const handleResetPassword = async (user: User) => {
    try {
      setResettingPassword(true);
      const response = await usersAPI.resetUserPassword(user._id);

      setNewPassword(response.data.data.newPassword);
      setSelectedUserForReset(user);
      setShowPasswordResetModal(true);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to reset password' });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleViewBalance = async (user: User) => {
    try {
      setLoadingBalance(true);
      const response = await adminAPI.getUserBalance(user._id);
      setSelectedUserBalance(response.data.data);
      setSelectedUserForReset(user);
      setShowBalanceModal(true);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      toast.error('Failed to load user balance');
    } finally {
      setLoadingBalance(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'seller':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'buyer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-8">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeaderSkeleton showSubtitle showActions={false} />
        <StatsCardsSkeleton count={4} />
        <div className="mt-8 bg-card rounded-lg border">
          <div className="px-6 py-3 border-b">
            <div className="h-5 bg-muted rounded w-20 animate-pulse" />
          </div>
          <div className="p-6">
            <TableSkeleton rows={10} columns={7} showAvatar />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage user accounts and permissions</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-200'
              : 'bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-4 hover:opacity-70">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Buyers</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.role === 'buyer').length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sellers</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.role === 'seller').length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <select
              value={roleFilter}
              onChange={e => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Roles</option>
              <option value="buyer">Buyers</option>
              <option value="seller">Sellers</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || roleFilter !== 'all'
                  ? 'Try adjusting your filters or search terms.'
                  : 'No users registered yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm">User</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Contact</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Balance</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Joined</th>
                    <th className="text-right py-3 px-4 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(userItem => (
                    <tr key={userItem._id} className="border-b hover:bg-muted/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <Avatar
                            src={userItem.avatar}
                            alt={userItem.name}
                            size="md"
                          />
                          <div>
                            <div className="font-medium">{userItem.name}</div>
                            <div className="text-xs text-muted-foreground">ID: {userItem._id.slice(-6)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-2 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">{userItem.email}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-2 text-muted-foreground" />
                            <span>{userItem.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {userItem.location ? (
                          <div className="flex items-center text-sm">
                            <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                            <span>{userItem.location}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {editingRole === userItem._id ? (
                          <div className="flex items-center space-x-2">
                            <select
                              value={newRole}
                              onChange={e => setNewRole(e.target.value)}
                              className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="buyer">Buyer</option>
                              <option value="seller">Seller</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={() => handleUpdateRole(userItem._id, newRole)}
                              disabled={updatingUser === userItem._id}
                              className="text-green-600 hover:text-green-700 disabled:opacity-50"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                             <button onClick={cancelEditingRole} className="text-red-600 hover:text-red-700">
                               <X className="h-4 w-4" />
                             </button>
                           </div>
                         ) : (
                           <span
                             className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                               userItem.role
                             )}`}
                           >
                             {userItem.role.charAt(0).toUpperCase() + userItem.role.slice(1)}
                           </span>
                         )}
                       </td>
                       <td className="py-4 px-4">
                         {userItem.role === 'seller' ? (
                           <div className="flex items-center justify-between">
                             <div>
                               <div className="text-sm font-medium text-green-600">
                                 KES {(userItem as any).balance?.currentBalance?.toLocaleString() || '0'}
                               </div>
                               <div className="text-xs text-muted-foreground">
                                 Earned: KES {(userItem as any).balance?.totalEarnings?.toLocaleString() || '1'}
                               </div>
                             </div>
                             <Button
                               onClick={() => handleViewBalance(userItem)}
                               size="sm"
                               variant="ghost"
                               className="h-8 w-8 p-0"
                             >
                               <Eye className="h-4 w-4" />
                             </Button>
                           </div>
                         ) : (
                           <span className="text-muted-foreground text-sm">-</span>
                         )}
                       </td>
                       <td className="py-4 px-4">
                         <div className="space-y-1">
                           {userItem.isVerified && (
                            <span className="inline-flex items-center text-xs text-green-600">
                              <Check className="h-3 w-3 mr-1" />
                              Verified
                            </span>
                          )}
                          {userItem.isActive !== undefined && (
                            <div className={`text-xs ${userItem.isActive ? 'text-green-600' : 'text-red-600'}`}>
                              {userItem.isActive ? 'Active' : 'Inactive'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(userItem.createdAt)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            onClick={() => startEditingRole(userItem._id, userItem.role)}
                            disabled={updatingUser === userItem._id || deletingUser === userItem._id}
                            size="sm"
                            variant="outline"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Role
                          </Button>
                          <Button
                            onClick={() => handleResetPassword(userItem)}
                            disabled={resettingPassword}
                            size="sm"
                            variant="outline"
                            className="text-orange-600 hover:text-orange-700 border-orange-600 hover:bg-orange-50"
                          >
                            <Key className="h-3 w-3 mr-1" />
                            Reset
                          </Button>
                          <Button
                            onClick={() => handleDeleteUser(userItem._id)}
                            disabled={updatingUser === userItem._id || deletingUser === userItem._id}
                            size="sm"
                            variant="danger"
                          >
                            {deletingUser === userItem._id ? (
                              'Deleting...'
                            ) : (
                              <>
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
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

      {/* Password Reset Modal */}
      {showPasswordResetModal && selectedUserForReset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Password Reset Successful</h3>

            <div className="space-y-4 mb-6">
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium mb-2">New Password for {selectedUserForReset.name}:</p>
                <div className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 rounded border">
                  <code className="text-lg font-mono font-bold">{newPassword}</code>
                  <Button
                    onClick={() => navigator.clipboard.writeText(newPassword)}
                    size="sm"
                    variant="ghost"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Please communicate this password to the user via phone or other secure channel.
                  The user should change it after logging in.
                </p>
              </div>

              <div className="text-sm space-y-1 p-3 bg-muted rounded">
                <p><strong>Email:</strong> {selectedUserForReset.email}</p>
                <p><strong>Phone:</strong> {selectedUserForReset.phone}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setShowPasswordResetModal(false);
                  setSelectedUserForReset(null);
                  setNewPassword('');
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Details Modal */}
      {showBalanceModal && selectedUserBalance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Seller Balance Details</h3>
              <button
                onClick={() => {
                  setShowBalanceModal(false);
                  setSelectedUserBalance(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-4 mb-6 p-4 bg-muted rounded-lg">
              <Avatar
                src={selectedUserBalance.user?.avatar}
                alt={selectedUserBalance.user?.name}
                size="lg"
              />
              <div>
                <div className="font-semibold">{selectedUserBalance.user?.name}</div>
                <div className="text-sm text-muted-foreground">{selectedUserBalance.user?.email}</div>
                <div className="text-sm text-muted-foreground">{selectedUserBalance.user?.phone}</div>
              </div>
            </div>

            {selectedUserBalance.isSeller ? (
              <>
                {/* Balance Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <Wallet className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-muted-foreground">Current Balance</span>
                    </div>
                    <div className="text-xl font-bold text-green-600">
                      {formatPrice(selectedUserBalance.balance?.currentBalance || 1)}
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-muted-foreground">Total Earnings</span>
                    </div>
                    <div className="text-xl font-bold text-blue-600">
                      {formatPrice(selectedUserBalance.balance?.totalEarnings || 1)}
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                      <span className="text-xs text-muted-foreground">Total Withdrawn</span>
                    </div>
                    <div className="text-xl font-bold text-purple-600">
                      {formatPrice(selectedUserBalance.balance?.withdrawnTotal || 1)}
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-xs text-muted-foreground">Pending</span>
                    </div>
                    <div className="text-xl font-bold text-yellow-600">
                      {formatPrice(selectedUserBalance.balance?.pendingWithdrawals || 1)}
                    </div>
                  </div>
                </div>

                {/* Withdrawal Requests */}
                {selectedUserBalance.pendingWithdrawals && selectedUserBalance.pendingWithdrawals.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-3 flex items-center">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Pending Withdrawals ({selectedUserBalance.pendingWithdrawals.length})
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedUserBalance.pendingWithdrawals.slice(0, 5).map((w: any) => (
                        <div key={w._id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950 rounded">
                          <div>
                            <div className="font-medium">{formatPrice(w.amount)}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(w.requestedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded text-xs">
                            {w.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Ledger */}
                {selectedUserBalance.recentLedger && selectedUserBalance.recentLedger.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-3 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Recent Transactions
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedUserBalance.recentLedger.slice(0, 10).map((entry: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded">
                          <div className="flex items-center space-x-3">
                            <div className={`p-1 rounded ${entry.type === 'sale' ? 'bg-green-100 text-green-600' : entry.type === 'withdrawal' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                              {entry.type === 'sale' ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{entry.description || entry.type}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(entry.date).toLocaleDateString()}
                              </div>
                              {/* M-Pesa Transaction Code */}
                              {entry.mpesaTransactionId && (
                                <div className="flex items-center space-x-1 text-xs text-green-600 mt-1">
                                  <Receipt className="h-3 w-3" />
                                  <span className="font-mono">{entry.mpesaTransactionId}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-medium ${entry.type === 'sale' ? 'text-green-600' : 'text-red-600'}`}>
                              {entry.type === 'sale' ? '+' : '-'}KES {entry.amount.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Balance: KES {entry.balance?.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">This user is not a seller</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setShowBalanceModal(false);
                  setSelectedUserBalance(null);
                }}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
