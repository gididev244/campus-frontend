'use client';

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import { Search, TrendingUp, Shield, Truck, HeadphonesIcon, ArrowRight } from 'lucide-react';
import ProductGrid from '@/components/ProductGrid';
import { productsAPI } from '@/lib/api/products';
import { categoriesAPI } from '@/lib/api/categories';
import { ProductCardSkeleton, CategoryCardSkeleton } from '@/components/ui/skeleton';
import type { Product, Category } from '@/types';
import Button from '@/components/ui/Button';
import { toast } from '@/lib/toast';

interface PlatformStats {
  products: number;
  users: number;
  transactions: number;
}

const FEATURES = [
  {
    icon: Shield,
    title: 'Secure Transactions',
    description: 'Safe payments with M-Pesa integration',
  },
  {
    icon: Truck,
    title: 'Easy Delivery',
    description: 'Convenient campus delivery options',
  },
  {
    icon: HeadphonesIcon,
    title: '24/7 Support',
    description: 'Always here to help you out',
  },
  {
    icon: TrendingUp,
    title: 'Trending Items',
    description: 'Discover what\'s popular on campus',
  },
] as const;

const formatStat = (num: number): string => {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K+`;
  }
  return `${num}+`;
};

const HomePageClient = memo(function HomePageClient() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<(Category & { productCount: number })[]>([]);
  const [stats, setStats] = useState<PlatformStats>({ products: 0, users: 0, transactions: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [productsRes, categoriesRes, statsRes] = await Promise.all([
        productsAPI.getProducts({ page: 1, limit: 8, sortBy: 'createdAt' }),
        categoriesAPI.getCategories(),
        productsAPI.getPlatformStats(),
      ]);

      setFeaturedProducts(productsRes.data.data);
      setCategories(categoriesRes.data.categories.slice(0, 6));
      setStats(statsRes.data.stats);
    } catch (error) {
      console.error('Failed to fetch data:', error);
        toast.error('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statsDisplay = useMemo(() => [
    { value: formatStat(stats.products), label: 'Products' },
    { value: formatStat(stats.users), label: 'Users' },
    { value: formatStat(stats.transactions), label: 'Transactions' },
  ], [stats]);

  const categoriesDisplay = useMemo(() => {
    return categories.map((category) => (
      <Link
        key={category._id}
        href={`/categories/${category.slug}`}
        className="group p-4 rounded-lg border bg-card hover:border-primary transition-all text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={`Browse ${category.name} category with ${category.productCount || 0} items`}
      >
        <div className="text-3xl mb-2" aria-hidden="true">{category.icon || '📦'}</div>
        <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
          {category.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {category.productCount || 0} items
        </p>
      </Link>
    ));
  }, [categories]);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section aria-labelledby="hero-heading" className="relative bg-gradient-to-br from-primary/10 via-purple-10 to-background py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 id="hero-heading" className="text-4xl md:text-6xl font-bold">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Embuni Campus Market
              </span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Your trusted campus marketplace
            </p>

            {/* Search bar */}
            <div className="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto" role="search">
              <Link href="/products" className="flex-1" aria-label="Search for products">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search for products..."
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    readOnly
                    aria-label="Search for products - click to go to products page"
                  />
                </div>
              </Link>
              <Button size="lg" aria-label="Search products">Search</Button>
            </div>

            {/* Quick stats */}
            <dl className="grid grid-cols-3 gap-4 pt-8" aria-label="Platform statistics">
              {statsDisplay.map((stat) => (
                <div key={stat.label} className="text-center">
                  <dt className="text-2xl font-bold text-primary">{stat.value}</dt>
                  <dd className="text-sm text-muted-foreground">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section aria-labelledby="features-heading" className="container mx-auto px-4">
        <h2 id="features-heading" className="sr-only">Platform Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" role="list">
          {FEATURES.map((feature, index) => (
            <article key={index} className="text-center space-y-3 p-6 rounded-lg border bg-card" role="listitem">
              <div className="inline-flex p-3 rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold" id={`feature-${index}-title`}>{feature.title}</h3>
              <p className="text-sm text-muted-foreground" aria-describedby={`feature-${index}-title`}>
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Categories Section */}
      <section aria-labelledby="categories-heading" className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 id="categories-heading" className="text-2xl font-bold">Browse Categories</h2>
          <Link
            href="/categories"
            className="text-primary hover:underline flex items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
            aria-label="View all categories"
          >
            View All <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" role="list" aria-label="Product categories">
          {loading ? (
            <CategoryCardSkeleton count={6} />
          ) : (
            categoriesDisplay
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section aria-labelledby="products-heading" className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 id="products-heading" className="text-2xl font-bold">Latest Products</h2>
          <Link
            href="/products"
            className="text-primary hover:underline flex items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
            aria-label="View all products"
          >
            View All <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <ProductGrid products={featuredProducts} loading={loading} />
      </section>

      {/* CTA Section */}
      <section aria-labelledby="cta-heading" className="container mx-auto px-4">
        <div className="bg-gradient-to-r from-primary to-purple-600 rounded-2xl p-12 text-center text-white">
          <h2 id="cta-heading" className="text-3xl font-bold mb-4">Start Selling Today</h2>
          <p className="text-lg mb-6 opacity-90">
            Turn your unused items into cash on Campus Market
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center" role="group" aria-label="Call to action buttons">
            <Link href="/register">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90" aria-label="Get started for free">
                Get Started Free
              </Button>
            </Link>
            <Link href="/products">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" aria-label="Browse all products">
                Browse Products
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
});

export default HomePageClient;
