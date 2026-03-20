'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProductImage from '@/components/ProductImage';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import {
  ArrowLeft,
  Heart,
  MapPin,
  Eye,
  Calendar,
  ShoppingCart,
  Star,
  Share2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
} from 'lucide-react';
import ProductGrid from '@/components/ProductGrid';
import { productsAPI } from '@/lib/api/products';
import type { Product } from '@/types';
import { formatPrice, formatDate, cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import Button from '@/components/ui/Button';
import { toast } from '@/components/ui/Toaster';
import { ProductDetailSkeleton } from '@/components/ui/skeleton';
import StructuredData from '@/components/StructuredData';
import { generateProductSchema, generateBreadcrumbSchema } from '@/lib/seo';

interface ProductDetailClientProps {
  productId: string;
}

export default function ProductDetailClient({ productId }: ProductDetailClientProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [liked, setLiked] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        console.error('[ProductDetailClient] No productId provided');
        toast.error('Invalid product ID');
        router.push('/products');
        return;
      }

      console.log('[ProductDetailClient] Fetching product:', { productId, userId: user?._id });
      try {
        const res = await productsAPI.getProduct(productId);
        console.log('[ProductDetailClient] Product fetched successfully:', { _id: res.data.product?._id, title: res.data.product?.title });

        if (!res.data.product) {
          console.error('[ProductDetailClient] Product data is null - API response:', res.data);
          toast.error('Invalid product data received from server');
          // Don't redirect - show error to user
          return;
        }

        setProduct(res.data.product);
        setLiked(res.data.product.likes?.includes(user?._id || '') || false);

        // Fetch related products (with error handling)
        try {
          const relatedRes = await productsAPI.getRelatedProducts(productId);
          setRelatedProducts(relatedRes.data.products?.filter(Boolean) || []);
        } catch (relatedError) {
          console.warn('[ProductDetailClient] Failed to fetch related products:', relatedError);
          setRelatedProducts([]);
        }
      } catch (error: any) {
        console.error('[ProductDetailClient] Failed to fetch product:', error);

        // Check if it's a 404 error
        if (error.response?.status === 404) {
          console.log('[ProductDetailClient] Product not found, redirecting');
          toast.error('Product not found');
          router.push('/products');
          return;
        }

        // For other errors, show error message and stay on page to let user retry
        toast.error(error.response?.data?.message || 'Failed to load product');
        // Don't redirect - let the user see the error and potentially retry
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    try {
      const res = await productsAPI.toggleLike(product!._id);
      setLiked(res.data.liked);
    } catch (error) {
      console.error('Failed to like product:', error);
    }
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    router.push(`/buyer/checkout?productId=${product?._id}&quantity=${quantity}`);
  };

  const handleContact = () => {
    if (!product?.seller?.phone) {
      toast.error('Seller contact information not available');
      return;
    }

    const phone = product.seller.phone.replace(/\D/g, '');
    const formattedPhone = phone.startsWith('0') ? '254' + phone.slice(1) : phone.replace(/^\+/, '');
    
    const message = encodeURIComponent(
      `Hello, is this still available?\n\n` +
      `Product: ${product.title}\n` +
      `Price: KES ${product.price.toLocaleString()}\n` +
      `Condition: ${product.condition.replace('-', ' ')}\n` +
      `Location: ${product.location}`
    );
    
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setAddingToCart(true);
    try {
      await addToCart(product!._id);
      toast.success(`Added ${quantity} item(s) to cart!`);
    } catch (error: unknown) {
      console.error('Failed to add to cart:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleShare = async () => {
    if (!product) return;

    const shareData = {
      title: product.title,
      text: `Check out ${product.title} for only ${formatPrice(product.price)} on Embuni Campus Market!`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Shared successfully!');
      } catch {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(window.location.href);
          toast.success('Link copied to clipboard!');
        } else {
          toast.error('Failed to share');
        }
      }
    } else {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      } else {
        toast.error('Unable to share. Please try copying the link manually.');
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Product Not Available</h1>
          <p className="text-muted-foreground mb-8">
            This product could not be loaded. It may have been removed or the ID is invalid.
          </p>
          <div className="flex justify-center space-x-4">
            <Button onClick={() => window.location.reload()}>Try Again</Button>
            <Button variant="outline" onClick={() => router.push('/products')}>
              Browse Products
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Generate structured data
  const productSchema = product ? generateProductSchema({
    _id: product._id,
    title: product.title || 'Unknown Product',
    description: product.description || '',
    price: product.price || 0,
    images: product.images || [],
    condition: product.condition || 'good',
    category: product.category?.name || 'Uncategorized',
    location: product.location || '',
    seller: product.seller,
    createdAt: product.createdAt,
  }) : null;

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Products', url: '/products' },
    { name: product?.title || 'Product', url: `/products/${product?._id}` },
  ]);

  return (
    <>
      {productSchema && <StructuredData data={productSchema} />}
      <StructuredData data={breadcrumbSchema} />
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <Link
          href="/products"
          className="inline-flex items-center space-x-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Products</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Images */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
              <ProductImage
                src={product.images?.[selectedImage]}
                alt={product.title || 'Product'}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {product.images.filter(Boolean).map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={cn(
                      'relative w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0',
                      selectedImage === index ? 'border-primary' : 'border-transparent'
                    )}
                  >
                    <ProductImage
                      src={img}
                      alt={`${product.title} ${index + 1}`}
                      fill
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            {/* Title & price */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{product.title}</h1>
                {product.status === 'sold' && (
                  <span className="px-3 py-1 bg-red-600 text-white font-bold text-sm rounded-full">
                    SOLD OUT
                  </span>
                )}
                {product.status === 'pending' && (
                  <span className="px-3 py-1 bg-yellow-500 text-white font-medium text-sm rounded-full">
                    Pending
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
                {product.isNegotiable && (
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                    Negotiable
                  </span>
                )}
              </div>
            </div>

            {/* Seller info */}
            {product.seller && (
              <Link
                href={`/users/${product.seller._id}`}
                className="flex items-center space-x-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {product.seller.name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{product.seller.name || 'Unknown Seller'}</div>
                  <div className="text-sm text-muted-foreground flex items-center space-x-2">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{product.seller.averageRating || 'New'}</span>
                    {(product.seller.totalReviews || 0) > 0 && (
                      <span>({product.seller.totalReviews || 0} reviews)</span>
                    )}
                  </div>
                </div>
              </Link>
            )}

            {/* Stats */}
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Eye className="h-4 w-4" />
                <span>{product.views} views</span>
              </div>
              <div className="flex items-center space-x-1">
                <Heart className="h-4 w-4" />
                <span>{product.likes?.length || 0} likes</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(product.createdAt)}</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="font-semibold mb-2">Description</h2>
              <p className="text-muted-foreground whitespace-pre-line">{product.description}</p>
            </div>

            {/* Category & condition */}
            <div className="flex items-center space-x-4">
              <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm">
                {product.category?.name || 'Uncategorized'}
              </span>
              <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm capitalize">
                {product.condition.replace('-', ' ')}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center space-x-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{product.location}</span>
            </div>

            {/* Actions */}
            <div className="space-y-4 pt-4 border-t">
              {/* Quantity selector */}
              <div>
                <label className="block text-sm font-medium mb-2">Quantity</label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 rounded-lg border hover:bg-accent transition-colors"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-16 text-center font-medium text-lg">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-3">
                {product.status === 'sold' ? (
                  <div className="flex-1 p-4 bg-muted rounded-lg text-center">
                    <p className="text-lg font-semibold text-muted-foreground">
                      This item has been sold
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Check back later for similar items
                    </p>
                  </div>
                ) : product.status === 'pending' ? (
                  <div className="flex-1 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                    <p className="text-lg font-semibold text-yellow-700 dark:text-yellow-400">
                      This item is currently pending
                    </p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
                      Another buyer is in the process of purchasing
                    </p>
                  </div>
                ) : (
                  <>
                    <Button onClick={handleBuyNow} className="flex-1" size="lg">
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Buy Now
                    </Button>
                    <Button
                      onClick={handleAddToCart}
                      variant="outline"
                      className="flex-1"
                      size="lg"
                      disabled={addingToCart}
                    >
                      {addingToCart ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Adding...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-5 w-5 mr-2" />
                          Add to Cart
                        </>
                      )}
                    </Button>
                  </>
                )}
                <Button
                  onClick={handleLike}
                  variant={liked ? 'primary' : 'outline'}
                  size="lg"
                  className={cn(liked && 'bg-destructive hover:bg-destructive/90')}
                >
                  <Heart className={cn('h-5 w-5', liked && 'fill-current')} />
                </Button>
                <Button
                  onClick={handleContact}
                  variant="outline"
                  size="lg"
                  disabled={!product?.seller?.phone}
                  className="text-green-600 border-green-600 hover:bg-green-50"
                  title="Contact seller on WhatsApp"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </Button>
                <Button
                  onClick={handleShare}
                  variant="outline"
                  size="lg"
                  title="Share product"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{formatPrice((product?.price || 0) * quantity)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.filter(Boolean).map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
