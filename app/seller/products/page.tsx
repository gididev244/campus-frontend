'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Package, Edit2, Trash2, Plus, Eye, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { productsAPI } from '@/lib/api/products';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { ProductCardHorizontalSkeleton } from '@/components/ui/skeleton';
import type { Product } from '@/types';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';

export default function SellerProductsPage() {
  return (
    <ClientErrorBoundary>
      <SellerProductsPageContent />
    </ClientErrorBoundary>
  );
}

function SellerProductsPageContent() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [reverting, setReverting] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'sold' | 'pending'>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!user?._id) {
      return;
    }
    
    try {
      setLoading(true);
      const res = await productsAPI.getSellerProducts(user._id);
      let filteredProducts = res.data.data || [];

      if (filter !== 'all') {
        filteredProducts = filteredProducts.filter((p: Product) => p.status === filter);
      }

      setProducts(filteredProducts);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setMessage({ type: 'error', text: 'Failed to load products' });
    } finally {
      setLoading(false);
    }
  }, [user?._id, filter]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!user || !user._id) {
      return;
    }

    if (user.role !== 'seller' && user.role !== 'admin') {
      router.push('/products');
      return;
    }

    fetchProducts();
  }, [isAuthenticated, user, router, fetchProducts]);

  const handleDeleteProduct = useCallback(async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    setDeleting(productId);
    setMessage(null);
    try {
      await productsAPI.deleteProduct(productId);
      setProducts(products.filter(p => p._id !== productId));
      setMessage({ type: 'success', text: 'Product deleted successfully' });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error && 'response' in error
        ? (error as Error & { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete product'
        : 'Failed to delete product';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setDeleting(null);
    }
  }, [products]);

  const handleRevertProductStatus = useCallback(async (productId: string) => {
    if (!confirm('Revert this product to "available" status? This will make it visible to buyers again.')) return;

    setReverting(productId);
    setMessage(null);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${productId}/revert-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      // Update the product in the list
      setProducts(products.map(p => p._id === productId ? { ...p, status: 'available' } : p));
      setMessage({ type: 'success', text: 'Product status reverted to available' });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error && 'response' in error
        ? (error as Error & { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to revert product status'
        : 'Failed to revert product status';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setReverting(null);
    }
  }, [products]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'sold': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header skeleton */}
        <div className="mb-8 space-y-3">
          <div className="h-8 bg-muted rounded w-48 animate-pulse" />
          <div className="h-4 bg-muted rounded w-96 animate-pulse" />
        </div>

        {/* Products skeleton */}
        <ProductCardHorizontalSkeleton count={5} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Package className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">My Products</h1>
          </div>
          <Link href="/products/new">
            <Button>
              <Plus className="h-5 w-5 mr-2" />
              Add Product
            </Button>
          </Link>
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
        <div className="flex gap-2 mb-6">
          {(['all', 'available', 'sold', 'pending'] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'primary' : 'outline'}
              onClick={() => setFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No products yet</h2>
            <p className="text-muted-foreground mb-6">
              Start selling by adding your first product
            </p>
            <Link href="/products/new">
              <Button>
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Product
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.filter(Boolean).map((product) => (
              <div key={product._id} className="rounded-lg border bg-card overflow-hidden">
                {/* Product Image */}
                <div className="relative h-48 bg-muted">
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.title || 'Product'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No Image
                    </div>
                  )}
                  <span className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                    {product.status || 'pending'}
                  </span>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold mb-1 line-clamp-1">{product.title || 'Unknown Product'}</h3>
                  <p className="text-2xl font-bold text-primary mb-2">{formatPrice(product.price || 0)}</p>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{product.description || ''}</p>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span>{product.views || 0} views</span>
                    <span>{product.likes?.length || 0} likes</span>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Link href={`/products/${product._id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    <Link href={`/products/${product._id}/edit`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    {product.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevertProductStatus(product._id)}
                        disabled={reverting === product._id}
                        isLoading={reverting === product._id}
                        title="Revert to available"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteProduct(product._id)}
                      disabled={deleting === product._id}
                      isLoading={deleting === product._id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
