'use client';

import Link from 'next/link';
import ProductImage from '@/components/ProductImage';
import { Heart, MapPin, Eye, ShoppingCart, Star } from 'lucide-react';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import type { Product } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { productsAPI } from '@/lib/api/products';
import { toast } from '@/components/ui/Toaster';
import { useState, useCallback, memo, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
}

const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [liked, setLiked] = useState(product.likes?.includes(user?._id || ''));
  const [likesCount, setLikesCount] = useState(product.likes?.length || 0);
  const [addingToCart, setAddingToCart] = useState(false);

  // Memoize formatted price
  const formattedPrice = useMemo(() => {
    return formatPrice(product.price);
  }, [product.price]);

  // Memoize formatted relative time
  const formattedTime = useMemo(() => {
    return formatRelativeTime(product.createdAt);
  }, [product.createdAt]);

  // Memoize seller rating display
  const sellerRatingDisplay = useMemo(() => {
    const rating = product.seller?.averageRating ?? 0;
    if (rating > 0) {
      return (
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span>{product.seller.averageRating?.toFixed(1) || '0.0'}</span>
          <span className="text-muted-foreground">({product.seller.totalReviews || 0})</span>
        </div>
      );
    }
    return null;
  }, [product.seller?.averageRating, product.seller?.totalReviews]);

  // Memoize views display
  const viewsDisplay = useMemo(() => {
    return product.views || 0;
  }, [product.views]);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;

    try {
      const response = await productsAPI.toggleLike(product._id);
      setLiked(response.data.liked);
      setLikesCount(response.data.likesCount);
    } catch (error) {
      toast.error('Failed to like product');
    }
  }, [product._id, isAuthenticated]);

  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      return;
    }

    setAddingToCart(true);
    try {
      await addToCart(product._id);
      toast.success('Added to cart!');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  }, [product._id, isAuthenticated, addToCart]);

  return (
    <Link
      href={`/products/${product._id}`}
      onClick={() => console.log('[ProductCard] Clicked product:', { _id: product._id, title: product.title, href: `/products/${product._id}` })}
      className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-lg"
      aria-label={`View ${product.title}, priced at ${formattedPrice}, located in ${product.location}`}
    >
      <article className="group rounded-lg border bg-card overflow-hidden hover:shadow-lg transition-all duration-300" aria-labelledby={`product-title-${product._id}`}>
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <ProductImage
            src={product.images?.[0]}
            alt={`Product image of ${product.title}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Condition badge */}
          <span className="absolute top-2 left-2 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm text-xs font-medium" aria-label={`Condition: ${product.condition.replace('-', ' ')}`}>
            {product.condition.replace('-', ' ')}
          </span>

          {/* Sold badge */}
          {product.status === 'sold' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="px-4 py-2 bg-red-600 text-white font-bold text-lg rounded-lg shadow-lg">
                SOLD
              </span>
            </div>
          )}

          {/* Pending badge */}
          {product.status === 'pending' && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 bg-yellow-500 text-white font-medium text-sm rounded-full shadow">
                Pending
              </span>
            </div>
          )}

          {/* Like button */}
          {isAuthenticated && (
            <button
              onClick={handleLike}
              className={cn(
                'absolute top-2 right-2 p-2 rounded-full bg-background/80 backdrop-blur-sm transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                liked ? 'text-destructive' : 'hover:text-destructive'
              )}
              aria-label={liked ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
              aria-pressed={liked}
              type="button"
            >
              <Heart className={cn('h-4 w-4', liked && 'fill-current')} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          {/* Title */}
          <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors" id={`product-title-${product._id}`}>
            {product.title}
          </h3>

          {/* Price */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-primary" aria-labelledby={`product-title-${product._id}`}>
              {formattedPrice}
            </span>
            {product.isNegotiable && (
              <span className="text-xs text-muted-foreground" aria-label="Price is negotiable">Negotiable</span>
            )}
          </div>

          {/* Location & stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              <span className="line-clamp-1">{product.location}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1" aria-label={`${viewsDisplay} views`}>
                <Eye className="h-3 w-3" aria-hidden="true" />
                <span>{viewsDisplay}</span>
              </div>
            </div>
          </div>

          {/* Seller & time */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <Link
              href={`/users/${product.seller?._id}`}
              className="flex items-center gap-1 hover:text-primary transition-colors rounded-lg px-2 py-1 -mx-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              onClick={(e) => {
                e.stopPropagation();
              }}
              aria-label={`View seller profile: ${product.seller?.name || 'Unknown Seller'}`}
            >
              <span>{product.seller?.name || 'Unknown Seller'}</span>
              {sellerRatingDisplay}
            </Link>
            <time dateTime={product.createdAt} aria-label={`Listed ${formattedTime}`}>
              {formattedTime}
            </time>
          </div>

          {/* Add to cart button */}
          <button
            onClick={handleAddToCart}
            disabled={addingToCart || product.status === 'sold' || product.status === 'pending'}
            aria-live="polite"
            aria-label={addingToCart ? 'Adding product to cart' : `Add ${product.title} to cart`}
            type="button"
            className={cn(
              'w-full mt-3 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
            )}
          >
            {product.status === 'sold' ? (
              <span className="flex items-center justify-center space-x-2">
                <span>Sold Out</span>
              </span>
            ) : product.status === 'pending' ? (
              <span className="flex items-center justify-center space-x-2">
                <span>Unavailable</span>
              </span>
            ) : addingToCart ? (
              <span className="flex items-center justify-center space-x-2">
                <span className="animate-spin" aria-hidden="true">⏳</span>
                <span>Adding...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center space-x-2">
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                <span>Add to Cart</span>
              </span>
            )}
          </button>
        </div>
      </article>
    </Link>
  );
});

export default ProductCard;
