import { Metadata } from 'next';
import { Suspense } from 'react';
import LoginPageClient from './LoginPageClient';
import { generateMetadata } from '@/lib/seo';

export const metadata: Metadata = generateMetadata({
  title: 'Sign In',
  description: 'Sign in to your account to buy and sell on Embuni Campus Market',
  keywords: ['login', 'sign in', 'campus market', 'student account'],
  canonical: '/login',
  noIndex: true, // Don't index auth pages
});

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-lg border p-8 animate-pulse">
            <div className="h-8 bg-muted rounded w-32 mx-auto mb-4" />
            <div className="h-4 bg-muted rounded w-48 mx-auto mb-8" />
            <div className="space-y-4">
              <div className="h-12 bg-muted rounded" />
              <div className="h-12 bg-muted rounded" />
              <div className="h-10 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    }>
      <LoginPageClient />
    </Suspense>
  );
}
