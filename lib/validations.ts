import { z } from 'zod';

/**
 * Validation schemas for React Hook Form + Zod
 * All forms in the application use these schemas for consistent validation
 *
 * @deprecated For new forms, use @/lib/validations-custom.ts for custom validation without external libraries
 */

// ============================================================================
// RE-EXPORT CUSTOM VALIDATION (No External Libraries)
// ============================================================================
// For new forms, use these custom validation functions instead of Zod
// They provide the same validation without external dependencies

export {
  // Validation functions
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateLength,
  validateEmail,
  validatePhone,
  validatePassword,
  validatePasswordMatch,
  validatePrice,
  validateURL,
  getPasswordStrength,

  // Form validators
  validateLoginForm,
  validateRegistrationForm,
  validateProductForm,
  validateContactForm,
  validateProfileUpdateForm,
  validatePasswordChangeForm,
  validateCategoryForm,
  validateCheckoutForm,

  // Types
  type ValidationResult,

  // Regex patterns
  REGEX_PATTERNS,
} from './validations-custom';

// Login schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Registration schema
export const registrationSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^(\+254|0)?[17]\d{8}$/, 'Invalid phone number. Use format +254XXXXXXXXX or 07XXXXXXXX / 01XXXXXXXX'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  role: z
    .enum(['buyer', 'seller'], {
      error: 'Please select a role',
    }),
  location: z
    .string()
    .max(100, 'Location must be less than 100 characters')
    .optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;

// Contact form schema
export const contactSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .min(5, 'Subject must be at least 5 characters')
    .max(100, 'Subject must be less than 100 characters'),
  message: z
    .string()
    .min(1, 'Message is required')
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message must be less than 1000 characters'),
});

export type ContactFormData = z.infer<typeof contactSchema>;

// Profile update schema
export const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  phone: z
    .string()
    .regex(/^(\+254|0)?[17]\d{8}$/, 'Invalid phone number. Use format +254XXXXXXXXX or 07XXXXXXXX / 01XXXXXXXX')
    .optional()
    .or(z.literal('')),
  location: z
    .string()
    .max(100, 'Location must be less than 100 characters')
    .optional()
    .or(z.literal('')),
});

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

// Password change schema
export const passwordChangeSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(1, 'New password is required')
    .min(6, 'Password must be at least 6 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New passwords do not match',
  path: ['confirmPassword'],
});

export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

// Product creation schema
export const productSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  price: z
    .string()
    .min(1, 'Price is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format')
    .refine((val) => parseFloat(val) > 0, {
      message: 'Price must be greater than 0',
    }),
  category: z
    .string()
    .min(1, 'Category is required'),
  condition: z
    .enum(['new', 'like-new', 'good', 'fair'], {
      error: 'Please select a condition',
    }),
  location: z
    .string()
    .min(1, 'Location is required')
    .min(3, 'Location must be at least 3 characters')
    .max(100, 'Location must be less than 100 characters'),
  isNegotiable: z.boolean().optional().default(false),
  images: z
    .array(z.string())
    .min(1, 'At least one image is required')
    .max(5, 'Maximum 5 images allowed'),
});

export type ProductFormData = z.infer<typeof productSchema>;

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Reset password schema
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Category creation/update schema
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .min(2, 'Category name must be at least 2 characters')
    .max(50, 'Category name must be less than 50 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  icon: z
    .string()
    .max(10, 'Icon must be less than 10 characters')
    .optional()
    .or(z.literal('')),
  image: z
    .string()
    .url('Invalid image URL')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().optional().default(true),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

// Checkout form schema (M-Pesa payment)
export const checkoutSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^(\+254|0)?[17]\d{8}$/, 'Invalid phone number. Use format +254XXXXXXXXX or 07XXXXXXXX / 01XXXXXXXX'),
  shippingAddress: z.object({
    street: z
      .string()
      .min(1, 'Street address is required')
      .min(3, 'Street address must be at least 3 characters')
      .max(100, 'Street address must be less than 100 characters'),
    building: z
      .string()
      .min(1, 'Building/floor is required')
      .min(2, 'Building/floor must be at least 2 characters')
      .max(50, 'Building/floor must be less than 50 characters'),
    room: z
      .string()
      .min(1, 'Room number is required')
      .min(1, 'Room number is required')
      .max(20, 'Room number must be less than 20 characters'),
  }),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
