'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Package, Search, Eye, ShoppingCart, Image as ImageIcon, Check, X, Trash2, ExternalLink, Calendar, DollarSign, RotateCcw, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { productsAPI } from '@/lib/api/products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ProductCardHorizontalSkeleton, PageHeaderSkeleton, StatsCardsSkeleton } from '@/components/ui/skeleton';
import { formatPrice, formatDateShort, getConditionBadgeColor } from '@/lib/utils';
import type { Product } from '@/types';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { toast } from '@/components/ui/Toaster';

export default function AdminProducts() {
  return (
    <ClientErrorBoundary>
      <AdminProductsContent />
    </ClientErrorBoundary>
  );
}

function AdminProductsContent() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [updatingProduct, setUpdatingProduct] = useState<string | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setMessage({ type: 'error', text: 'Access denied. Admin only.' });
      setLoading(false);
      return;
    }

    fetchProducts();
  }, [isAdmin, page, statusFilter]);

  const fetchProducts = useCallback(async () => {
    if (!isAdmin) return;

    try {
      setLoading(true);
      const params: { page: number; limit: number; status?: string } = {
        page,
        limit: 20,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await productsAPI.getProducts(params);
      const data = response.data;

      let filteredProducts = data.data || [];

      // Apply search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredProducts = filteredProducts.filter(
          p =>
            p.title.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term) ||
            (p.seller?.name || '').toLowerCase().includes(term) ||
            (p.category?.name || '').toLowerCase().includes(term)
        );
      }

      setProducts(filteredProducts);
      setTotalPages(data.pagination.pages);
      setTotalProducts(data.pagination.total);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products. Please try again.');
      setMessage({ type: 'error', text: 'Failed to load products. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, statusFilter, searchTerm]);

  useEffect(() => {
    if (searchTerm !== undefined) {
      const timer = setTimeout(() => {
        if (page === 1) {
          fetchProducts();
        } else {
          setPage(1);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [searchTerm, page, fetchProducts]);

  const handleUpdateStatus = useCallback(async (productId: string, status: 'available' | 'sold' | 'pending') => {
    try {
      setUpdatingProduct(productId);

      // Create FormData for product update
      const formData = new FormData();
      const product = products.find(p => p._id === productId);

      if (product) {
        formData.append('title', product.title);
        formData.append('description', product.description);
        formData.append('price', product.price.toString());
        if (product.category?._id) {
          formData.append('category', product.category._id);
        }
        formData.append('condition', product.condition);
        formData.append('location', product.location);
        formData.append('status', status);

        if (product.isNegotiable !== undefined) {
          formData.append('isNegotiable', product.isNegotiable.toString());
        }

        await productsAPI.updateProduct(productId, formData);

        setProducts(products.map(p => (p._id === productId ? { ...p, status } : p)));
        setMessage({ type: 'success', text: `Product ${status === 'available' ? 'approved' : status === 'sold' ? 'marked as sold' : 'pending'} successfully` });
      }
    } catch (error) {
      console.error('Failed to update product status:', error);
      toast.error('Failed to update product status. Please try again.');
      setMessage({ type: 'error', text: 'Failed to update product status. Please try again.' });
    } finally {
      setUpdatingProduct(null);
    }
  }, [products]);

  const handleDeleteProduct = useCallback(async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingProduct(productId);
      await productsAPI.deleteProduct(productId);

      setProducts(products.filter(p => p._id !== productId));
      setTotalProducts(prev => prev - 1);
      setMessage({ type: 'success', text: 'Product deleted successfully' });
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('Failed to delete product. Please try again.');
      setMessage({ type: 'error', text: 'Failed to delete product. Please try again.' });
    } finally {
      setDeletingProduct(null);
    }
  }, [products]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'sold':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };


  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-8">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto text-destructive mb-4" />
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
        <div className="mt-8">
          <ProductCardHorizontalSkeleton count={5} />
        </div>
      </div>
    );
  }

  const pendingCount = products.filter(p => p && p.status === 'pending').length;
  const availableCount = products.filter(p => p && p.status === 'available').length;
  const soldCount = products.filter(p => p && p.status === 'sold').length;

  const pendingProducts = useMemo(() => 
    products.filter(p => p && p.status === 'pending'),
    [products]
  );

  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);

  const selectAllPending = useCallback(() => {
    setSelectedProducts(new Set(pendingProducts.map(p => p._id)));
  }, [pendingProducts]);

  const deselectAll = useCallback(() => {
    setSelectedProducts(new Set());
  }, []);

  const handleBulkRevert = useCallback(async () => {
    if (selectedProducts.size === 0) return;

    try {
      setBulkProcessing(true);
      const response = await productsAPI.bulkRevertProducts(Array.from(selectedProducts));
      
      const count = response.data.count;
      setMessage({ type: 'success', text: `${count} product(s) reverted to available` });
      
      setProducts(prev => prev.map(p => 
        selectedProducts.has(p._id) ? { ...p, status: 'available' } : p
      ));
      
      setSelectedProducts(new Set());
      setShowBulkConfirm(false);
    } catch (error) {
      console.error('Failed to bulk revert products:', error);
      toast.error('Failed to revert products. Please try again.');
      setMessage({ type: 'error', text: 'Failed to revert products. Please try again.' });
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedProducts]);

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
        <h1 className="text-3xl font-bold">Product Management</h1>
        <p className="text-muted-foreground">Moderate and manage all products</p>
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
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Eye className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Check className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sold</CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{soldCount}</div>
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
                placeholder="Search by title, description, seller, or category..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                  setSelectedProducts(new Set());
                }}
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending Review</option>
                <option value="available">Available</option>
                <option value="sold">Sold</option>
              </select>

              {pendingProducts.length > 0 && (statusFilter === 'pending' || statusFilter === 'all') && (
                <div className="flex gap-1">
                  <Button
                    onClick={selectAllPending}
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    Select All Pending
                  </Button>
                  {selectedProducts.size > 0 && (
                    <Button
                      onClick={deselectAll}
                      variant="outline"
                      size="sm"
                    >
                      Deselect
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="space-y-4">
        {products.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your filters or search terms.'
                    : 'No products listed yet.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          products.filter(Boolean).map(product => (
            <Card key={product._id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Selection Checkbox for Pending Products */}
                  {product.status === 'pending' && (
                    <div className="flex items-center px-4 bg-muted/30 border-r">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product._id)}
                        onChange={() => toggleProductSelection(product._id)}
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Product Image */}
                  <div className="w-full md:w-48 h-48 relative flex-shrink-0">
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-1">{product.title}</h3>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <span>by {product.seller?.name || 'Unknown'}</span>
                              <span>•</span>
                              <span>{product.category?.name || 'Uncategorized'}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                                product.status
                              )}`}
                            >
                              {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                            </span>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConditionBadgeColor(
                                product.condition
                              )}`}
                            >
                              {product.condition.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {product.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                            <span className="font-bold text-lg">{formatPrice(product.price)}</span>
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>Listed {formatDateShort(product.createdAt)}</span>
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Eye className="h-3 w-3 mr-1" />
                            <span>{product.views || 0} views</span>
                          </div>
                          {product.isNegotiable && (
                            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                              Negotiable
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-center text-sm text-muted-foreground">
                          <span className="mr-4">📍 {product.location}</span>
                          <Link
                            href={`/products/${product._id}`}
                            className="text-primary hover:underline flex items-center"
                          >
                            View Details <ExternalLink className="h-3 w-3 ml-1" />
                          </Link>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col space-y-2 lg:w-48">
                        {product.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => handleUpdateStatus(product._id, 'available')}
                              disabled={updatingProduct === product._id}
                              className="w-full bg-green-600 hover:bg-green-700"
                            >
                              {updatingProduct === product._id ? (
                                'Processing...'
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => handleUpdateStatus(product._id, 'sold')}
                              disabled={updatingProduct === product._id}
                              variant="outline"
                              className="w-full"
                            >
                              Mark as Sold
                            </Button>
                          </>
                        )}

                        {product.status === 'available' && (
                          <>
                            <Button
                              onClick={() => handleUpdateStatus(product._id, 'sold')}
                              disabled={updatingProduct === product._id}
                              variant="outline"
                              className="w-full"
                            >
                              {updatingProduct === product._id ? (
                                'Processing...'
                              ) : (
                                <>
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  Mark Sold
                                </>
                              )}
                            </Button>
                          </>
                        )}

                        {product.status === 'sold' && (
                          <>
                            <Button
                              onClick={() => handleUpdateStatus(product._id, 'available')}
                              disabled={updatingProduct === product._id}
                              variant="outline"
                              className="w-full"
                            >
                              {updatingProduct === product._id ? (
                                'Processing...'
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  Mark Available
                                </>
                              )}
                            </Button>
                          </>
                        )}

                        <Button
                          onClick={() => handleDeleteProduct(product._id)}
                          disabled={updatingProduct === product._id || deletingProduct === product._id}
                          variant="danger"
                          className="w-full"
                        >
                          {deletingProduct === product._id ? (
                            'Deleting...'
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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

      {/* Bulk Action Bar */}
      {selectedProducts.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="font-medium">
                  {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
                </span>
                <Button
                  onClick={deselectAll}
                  variant="outline"
                  size="sm"
                >
                  Clear Selection
                </Button>
              </div>
              <Button
                onClick={() => setShowBulkConfirm(true)}
                className="bg-green-600 hover:bg-green-700"
                disabled={bulkProcessing}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Revert to Available
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Revert Confirmation Modal */}
      {showBulkConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Confirm Bulk Revert
              </h3>
              <p className="text-muted-foreground mb-4">
                Are you sure you want to revert <strong>{selectedProducts.size}</strong> pending product{selectedProducts.size !== 1 ? 's' : ''} to available status?
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  This will make all selected products visible to buyers immediately.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowBulkConfirm(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkRevert}
                  disabled={bulkProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {bulkProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Reverting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Confirm Revert
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
