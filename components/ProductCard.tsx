'use client';

import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [liked, setLiked] = useState(product.likes?.includes(user?._id || ''));
  const [likesCount, setLikesCount] = useState(product.likes?.length || 0);
  const [addingToCart, setAddingToCart] = useState(false);

  const formattedPrice = useMemo(() => formatPrice(product.price), [product.price]);
  const formattedTime = useMemo(() => formatRelativeTime(product.createdAt), [product.createdAt]);
  const viewsDisplay = useMemo(() => product.views || 0, [product.views]);

  const sellerRatingDisplay = useMemo(() => {
    const rating = product.seller?.averageRating ?? 0;
    if (rating > 0) {
      return (
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span>{product.seller?.averageRating?.toFixed(1) || '0.0'}</span>
          <span className="text-muted-foreground">({product.seller?.totalReviews || 0})</span>
        </div>
      );
    }
    return null;
  }, [product.seller?.averageRating, product.seller?.totalReviews]);

  const handleCardClick = useCallback(() => {
    router.push(`/products/${product._id}`);
  }, [router, product._id]);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
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
    e.stopPropagation();
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

  const handleSellerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.seller?._id) {
      router.push(`/users/${product.seller._id}`);
    }
  }, [router, product.seller?._id]);

  return (
    <article
      onClick={handleCardClick}
      className="group rounded-lg border bg-card overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      aria-label={`View ${product.title}, priced at ${formattedPrice}, located in ${product.location}`}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <ProductImage
          src={product.images?.[0]}
          alt={`Product image of ${product.title}`}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        <span className="absolute top-2 left-2 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm text-xs font-medium">
          {product.condition.replace('-', ' ')}
        </span>

        {product.status === 'sold' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="px-4 py-2 bg-red-600 text-white font-bold text-lg rounded-lg shadow-lg">
              SOLD
            </span>
          </div>
        )}

        {product.status === 'pending' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2">
            <span className="px-3 py-1 bg-yellow-500 text-white font-medium text-sm rounded-full shadow">
              Pending
            </span>
          </div>
        )}

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

      <div className="p-4 space-y-2">
        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
          {product.title}
        </h3>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">{formattedPrice}</span>
          {product.isNegotiable && (
            <span className="text-xs text-muted-foreground">Negotiable</span>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            <span className="line-clamp-1">{product.location}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Eye className="h-3 w-3" aria-hidden="true" />
              <span>{viewsDisplay}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <button
            onClick={handleSellerClick}
            className="flex items-center gap-1 hover:text-primary transition-colors rounded-lg px-2 py-1 -mx-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label={`View seller profile: ${product.seller?.name || 'Unknown Seller'}`}
            type="button"
          >
            <span>{product.seller?.name || 'Unknown Seller'}</span>
            {sellerRatingDisplay}
          </button>
          <time dateTime={product.createdAt}>{formattedTime}</time>
        </div>

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
  );
});

export default ProductCard;
