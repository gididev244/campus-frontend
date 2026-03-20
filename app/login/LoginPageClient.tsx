'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/Toaster';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { loginSchema, type LoginFormData } from '@/lib/validations';

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login(data.email, data.password);

      toast.success('Successfully logged in!');

      const redirectParam = searchParams.get('redirect');

      if (result.forcePasswordChange) {
        router.push('/change-password');
      } else if (redirectParam) {
        router.push(redirectParam);
      } else {
        const role = result.user?.role;
        if (role === 'admin') {
          router.push('/admin');
        } else if (role === 'seller') {
          router.push('/seller');
        } else {
          router.push('/buyer');
        }
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      setError('root', { type: 'manual', message: errorMessage });
      toast.error(errorMessage);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </header>

        <main>
          <div className="bg-card rounded-lg border p-8">
            {errors.root && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm" role="alert" aria-live="assertive">
                {errors.root.message}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate aria-label="Login form">
              <Input
                label="Email"
                type="email"
                placeholder="your.email@example.com"
                error={errors.email?.message}
                required
                autoComplete="email"
                {...register('email')}
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                required
                autoComplete="current-password"
                {...register('password')}
              />

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="mr-2 w-4 h-4 rounded border-input focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    aria-label="Remember me on this device"
                  />
                  <span>Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded px-2 py-1 -mx-2">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                isLoading={isSubmitting}
                aria-live="polite"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account?</span>{' '}
              <Link href="/register" className="text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded px-2 py-1 -mx-2">
                Sign up
              </Link>
            </p>
          </div>

          {/* Contact Info */}
          <aside className="mt-6 text-center text-sm text-muted-foreground" aria-label="Help and support information">
            <p className="font-medium mb-2">Need help?</p>
            <p>
              WhatsApp:{' '}
              <a
                href="https://wa.me/254111938368"
                className="text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded px-2 py-1 -mx-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                0111938368
              </a>
            </p>
            <p>
              Email:{' '}
              <a
                href="mailto:gedionmutua2024@gmail.com"
                className="text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded px-2 py-1 -mx-2"
              >
                gedionmutua2024@gmail.com
              </a>
            </p>
          </aside>
        </main>
      </div>
    </div>
  );
}
