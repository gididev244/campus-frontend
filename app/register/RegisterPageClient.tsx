'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/Toaster';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { registrationSchema, getPasswordStrength, type RegistrationFormData } from '@/lib/validations';

export default function RegisterPageClient() {
  const router = useRouter();
  const { register: registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: 'onBlur',
    defaultValues: {
      role: 'buyer',
    },
  });

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');
  const selectedRole = watch('role');

  const passwordStrength = getPasswordStrength(password || '');

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        role: data.role,
        location: data.location,
      });
      toast.success('Account created successfully!');
      router.push('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      setError('root', { type: 'manual', message: errorMessage });
      toast.error(errorMessage);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="text-muted-foreground mt-2">Join Campus Market today</p>
        </div>

        <div className="bg-card rounded-lg border p-8">
          {errors.root && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {errors.root.message}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Email"
              type="email"
              placeholder="your.email@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="+254700000000"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <div>
              <label className="block text-sm font-medium mb-1.5">I want to</label>
              <div className="grid grid-cols-2 gap-2">
                {(['buyer', 'seller'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setValue('role', role)}
                    className={`px-4 py-2 rounded-lg border capitalize transition-colors ${
                      selectedRole === role
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-accent'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
              {errors.role && (
                <p className="mt-1 text-sm text-destructive">{errors.role.message}</p>
              )}
            </div>

            <Input
              label="Location (Optional)"
              type="text"
              placeholder="Campus location"
              error={errors.location?.message}
              {...register('location')}
            />

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          level <= passwordStrength.score
                            ? passwordStrength.color
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  {passwordStrength.label && (
                    <p className="text-xs text-muted-foreground">
                      Password strength: <span className={`font-medium ${
                        passwordStrength.score <= 1 ? 'text-red-500' :
                        passwordStrength.score === 2 ? 'text-orange-500' :
                        passwordStrength.score === 3 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>{passwordStrength.label}</span>
                    </p>
                  )}

                  {/* Password Requirements */}
                  <div className="mt-2 p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-xs font-medium mb-2">Password Requirements:</p>
                    <ul className="space-y-1 text-xs">
                      <li className={password?.length >= 6 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                        {password?.length >= 6 ? '✓' : '○'} At least 6 characters
                      </li>
                      <li className={/[a-z]/.test(password || '') ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                        {/[a-z]/.test(password || '') ? '✓' : '○'} One lowercase letter (a-z)
                      </li>
                      <li className={/[A-Z]/.test(password || '') ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                        {/[A-Z]/.test(password || '') ? '✓' : '○'} One uppercase letter (A-Z)
                      </li>
                      <li className={/[0-9]/.test(password || '') ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                        {/[0-9]/.test(password || '') ? '✓' : '○'} One number (0-9)
                      </li>
                      <li className={/[@$!%*?&]/.test(password || '') ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                        {/[@$!%*?&]/.test(password || '') ? '✓' : '○'} One special character (@$!%*?&)
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            {/* Password Match Indicator */}
            {confirmPassword && password && (
              <div className={`text-xs ${password === confirmPassword ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account?</span>{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p className="font-medium mb-2">Need help?</p>
          <p>WhatsApp: <a href="https://wa.me/254111938368" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">0111938368</a></p>
          <p>Email: <a href="mailto:gedionmutua2024@gmail.com" className="text-primary hover:underline">gedionmutua2024@gmail.com</a></p>
        </div>
      </div>
    </div>
  );
}
