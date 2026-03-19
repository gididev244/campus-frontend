'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/Toaster';
import { authAPI } from '@/lib/api/auth';
import { passwordChangeSchema, getPasswordStrength, type PasswordChangeFormData } from '@/lib/validations';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, logout, forcePasswordChange } = useAuth();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    mode: 'onBlur',
  });

  const newPassword = watch('newPassword');
  const confirmPassword = watch('confirmPassword');
  const currentPassword = watch('currentPassword');

  const passwordStrength = getPasswordStrength(newPassword || '');

  useEffect(() => {
    // Redirect if not authenticated
    if (!user && !forcePasswordChange) {
      router.push('/login');
    }
  }, [user, forcePasswordChange, router]);

  const onSubmit = async (data: PasswordChangeFormData) => {
    // Additional validation: new password must be different from current
    if (data.currentPassword === data.newPassword) {
      setError('newPassword', { type: 'manual', message: 'New password must be different from current password' });
      return;
    }

    try {
      await authAPI.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSuccess(true);
      toast.success('Password changed successfully!');

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        // Force logout to re-auth with new password
        logout();
        router.push('/login?passwordChanged=true');
      }, 2000);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const errorMessage = err.response?.data?.message || 'Failed to change password';
      setError('root', { type: 'manual', message: errorMessage });
      toast.error(errorMessage);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Password Changed!</h1>
          <p className="text-muted-foreground mb-6">
            Your password has been successfully updated. You will be redirected to login shortly.
          </p>
          <Button
            onClick={() => {
              logout();
              router.push('/login?passwordChanged=true');
            }}
            className="w-full"
          >
            Continue to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Change Your Password</h1>
          <p className="text-muted-foreground">
            {forcePasswordChange
              ? 'You must change your password before continuing. Please enter your current password and choose a new one.'
              : 'Enter your current password and choose a new one.'}
          </p>
        </div>

        {/* Form */}
        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Error Message */}
            {errors.root && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {errors.root.message}
              </div>
            )}

            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium mb-2">Current Password</label>
              <div className="relative">
                <input
                  {...register('currentPassword')}
                  type={showCurrent ? 'text' : 'password'}
                  className={`w-full px-4 py-3 pr-12 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring ${
                    errors.currentPassword ? 'border-destructive focus:ring-destructive' : 'border-input'
                  }`}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="mt-1 text-sm text-destructive">{errors.currentPassword.message}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium mb-2">New Password</label>
              <div className="relative">
                <input
                  {...register('newPassword')}
                  type={showNew ? 'text' : 'password'}
                  className={`w-full px-4 py-3 pr-12 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring ${
                    errors.newPassword ? 'border-destructive focus:ring-destructive' : 'border-input'
                  }`}
                  placeholder="Enter new password (min 6 characters)"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-sm text-destructive">{errors.newPassword.message}</p>
              )}

              {/* Password Requirements */}
              {newPassword && (
                <div className="mt-2 p-3 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-xs font-medium mb-2">Password Requirements:</p>
                  <ul className="space-y-1 text-xs">
                    <li className={newPassword?.length >= 12 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                      {newPassword?.length >= 12 ? '✓' : '○'} At least 12 characters
                    </li>
                    <li className={/[a-z]/.test(newPassword || '') ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                      {/[a-z]/.test(newPassword || '') ? '✓' : '○'} One lowercase letter (a-z)
                    </li>
                    <li className={/[A-Z]/.test(newPassword || '') ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                      {/[A-Z]/.test(newPassword || '') ? '✓' : '○'} One uppercase letter (A-Z)
                    </li>
                    <li className={/[0-9]/.test(newPassword || '') ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                      {/[0-9]/.test(newPassword || '') ? '✓' : '○'} One number (0-9)
                    </li>
                    <li className={/[@$!%*?&]/.test(newPassword || '') ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                      {/[@$!%*?&]/.test(newPassword || '') ? '✓' : '○'} One special character (@$!%*?&)
                    </li>
                  </ul>

                  {/* Password Strength Indicator */}
                  <div className="flex gap-1 mt-2">
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
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-sm font-medium mb-2">Confirm New Password</label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirm ? 'text' : 'password'}
                  className={`w-full px-4 py-3 pr-12 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring ${
                    errors.confirmPassword ? 'border-destructive focus:ring-destructive' : 'border-input'
                  }`}
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}

              {/* Password Match Indicator */}
              {confirmPassword && newPassword && (
                <div className={`text-xs mt-1 ${newPassword === confirmPassword ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                  {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
              Change Password
            </Button>
          </form>
        </div>

        {/* Help Text */}
        {forcePasswordChange && (
          <div className="mt-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Important:</strong> You cannot access other features until you change your password.
            </p>
          </div>
        )}

        {/* Back Link */}
        {!forcePasswordChange && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Go back
            </button>
          </div>
        )}

        {/* Contact Info */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p className="font-medium mb-2">Having trouble?</p>
          <p>WhatsApp: <a href="https://wa.me/254111938368" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">0111938368</a></p>
          <p>Email: <a href="mailto:gedionmutua2024@gmail.com" className="text-primary hover:underline">gedionmutua2024@gmail.com</a></p>
        </div>
      </div>
    </div>
  );
}
