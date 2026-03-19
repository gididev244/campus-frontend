/**
 * Custom client-side form validation without external libraries
 * Uses regex patterns for validation
 */

// ============================================================================
// VALIDATION RESULT TYPE
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// ============================================================================
// REGEX PATTERNS
// ============================================================================

export const REGEX_PATTERNS = {
  // Email: Standard email pattern
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Phone: Kenyan phone numbers (+254XXXXXXXXX, 07XXXXXXXX, 01XXXXXXXX)
  phone: /^(\+254|0)?[17]\d{8}$/,

  // Password: At least 6 chars, 1 lowercase, 1 uppercase, 1 number, 1 special char
  passwordLowercase: /[a-z]/,
  passwordUppercase: /[A-Z]/,
  passwordNumber: /[0-9]/,
  passwordSpecial: /[@$!%*?&]/,
  passwordMinLength: 6,

  // Price: Positive number with up to 2 decimal places
  price: /^\d+(\.\d{1,2})?$/,

  // URL: Valid URL format
  url: /^https?:\/\/.+/,

  // Kenya ID: 8 digits
  kenyaId: /^\d{8}$/,
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates that a field is not empty
 */
export const validateRequired = (value: string, fieldName?: string): ValidationResult => {
  const trimmedValue = value?.trim();

  if (!trimmedValue || trimmedValue.length === 0) {
    return {
      isValid: false,
      error: fieldName ? `${fieldName} is required` : 'This field is required',
    };
  }

  return { isValid: true };
};

/**
 * Validates minimum length
 */
export const validateMinLength = (
  value: string,
  minLength: number,
  fieldName?: string
): ValidationResult => {
  const requiredCheck = validateRequired(value, fieldName);
  if (!requiredCheck.isValid) return requiredCheck;

  if (value.trim().length < minLength) {
    return {
      isValid: false,
      error: fieldName
        ? `${fieldName} must be at least ${minLength} characters`
        : `Must be at least ${minLength} characters`,
    };
  }

  return { isValid: true };
};

/**
 * Validates maximum length
 */
export const validateMaxLength = (
  value: string,
  maxLength: number,
  fieldName?: string
): ValidationResult => {
  if (value && value.trim().length > maxLength) {
    return {
      isValid: false,
      error: fieldName
        ? `${fieldName} must be less than ${maxLength} characters`
        : `Must be less than ${maxLength} characters`,
    };
  }

  return { isValid: true };
};

/**
 * Validates length is within range
 */
export const validateLength = (
  value: string,
  minLength: number,
  maxLength: number,
  fieldName?: string
): ValidationResult => {
  const minCheck = validateMinLength(value, minLength, fieldName);
  if (!minCheck.isValid) return minCheck;

  return validateMaxLength(value, maxLength, fieldName);
};

/**
 * Validates email format
 */
export const validateEmail = (value: string): ValidationResult => {
  const requiredCheck = validateRequired(value, 'Email');
  if (!requiredCheck.isValid) return requiredCheck;

  if (!REGEX_PATTERNS.email.test(value.trim())) {
    return {
      isValid: false,
      error: 'Invalid email address',
    };
  }

  return { isValid: true };
};

/**
 * Validates phone number format (Kenyan format)
 */
export const validatePhone = (value: string): ValidationResult => {
  const requiredCheck = validateRequired(value, 'Phone number');
  if (!requiredCheck.isValid) return requiredCheck;

  if (!REGEX_PATTERNS.phone.test(value.trim())) {
    return {
      isValid: false,
      error: 'Invalid phone number. Use format +254XXXXXXXXX or 07XXXXXXXX / 01XXXXXXXX',
    };
  }

  return { isValid: true };
};

/**
 * Validates password strength
 * Requirements: Min 12 chars, 1 lowercase, 1 uppercase, 1 number, 1 special char
 */
export const validatePassword = (value: string): ValidationResult => {
  const requiredCheck = validateRequired(value, 'Password');
  if (!requiredCheck.isValid) return requiredCheck;

  const errors: string[] = [];

  if (value.length < REGEX_PATTERNS.passwordMinLength) {
    errors.push(`at least ${REGEX_PATTERNS.passwordMinLength} characters`);
  }

  if (!REGEX_PATTERNS.passwordLowercase.test(value)) {
    errors.push('one lowercase letter (a-z)');
  }

  if (!REGEX_PATTERNS.passwordUppercase.test(value)) {
    errors.push('one uppercase letter (A-Z)');
  }

  if (!REGEX_PATTERNS.passwordNumber.test(value)) {
    errors.push('one number (0-9)');
  }

  if (!REGEX_PATTERNS.passwordSpecial.test(value)) {
    errors.push('one special character (@$!%*?&)');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      error: `Password must contain ${errors.join(', ')}`,
    };
  }

  return { isValid: true };
};

/**
 * Validates password confirmation matches password
 */
export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): ValidationResult => {
  const requiredCheck = validateRequired(confirmPassword, 'Confirm password');
  if (!requiredCheck.isValid) return requiredCheck;

  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: 'Passwords do not match',
    };
  }

  return { isValid: true };
};

/**
 * Validates price format
 */
export const validatePrice = (value: string): ValidationResult => {
  const requiredCheck = validateRequired(value, 'Price');
  if (!requiredCheck.isValid) return requiredCheck;

  if (!REGEX_PATTERNS.price.test(value.trim())) {
    return {
      isValid: false,
      error: 'Invalid price format',
    };
  }

  const price = parseFloat(value);
  if (price <= 0) {
    return {
      isValid: false,
      error: 'Price must be greater than 0',
    };
  }

  return { isValid: true };
};

/**
 * Validates URL format
 */
export const validateURL = (value: string, fieldName?: string): ValidationResult => {
  if (!value || value.trim().length === 0) {
    return { isValid: true }; // URLs are often optional
  }

  if (!REGEX_PATTERNS.url.test(value.trim())) {
    return {
      isValid: false,
      error: fieldName
        ? `${fieldName} must be a valid URL`
        : 'Must be a valid URL',
    };
  }

  return { isValid: true };
};

/**
 * Calculates password strength for UI feedback
 */
export const getPasswordStrength = (password: string): {
  score: number;
  label: string;
  color: string;
  requirements: {
    hasMinLength: boolean;
    hasLowercase: boolean;
    hasUppercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
} => {
  if (!password) {
    return {
      score: 0,
      label: '',
      color: '',
      requirements: {
        hasMinLength: false,
        hasLowercase: false,
        hasUppercase: false,
        hasNumber: false,
        hasSpecial: false,
      },
    };
  }

  const requirements = {
    hasMinLength: password.length >= REGEX_PATTERNS.passwordMinLength,
    hasLowercase: REGEX_PATTERNS.passwordLowercase.test(password),
    hasUppercase: REGEX_PATTERNS.passwordUppercase.test(password),
    hasNumber: REGEX_PATTERNS.passwordNumber.test(password),
    hasSpecial: REGEX_PATTERNS.passwordSpecial.test(password),
  };

  const metRequirements = Object.values(requirements).filter(Boolean).length;
  const score = Math.ceil((metRequirements / 5) * 4);

  const strengthMap = {
    0: { label: '', color: '' },
    1: { label: 'Weak', color: 'bg-red-500' },
    2: { label: 'Fair', color: 'bg-orange-500' },
    3: { label: 'Good', color: 'bg-yellow-500' },
    4: { label: 'Strong', color: 'bg-green-500' },
  };

  return {
    score,
    ...strengthMap[score as keyof typeof strengthMap],
    requirements,
  };
};

// ============================================================================
// FORM VALIDATORS
// ============================================================================

/**
 * Validates login form
 */
export const validateLoginForm = (data: { email: string; password: string }) => {
  const errors: Record<string, string> = {};

  const emailResult = validateEmail(data.email);
  if (!emailResult.isValid) errors.email = emailResult.error!;

  const passwordResult = validateRequired(data.password, 'Password');
  if (!passwordResult.isValid) errors.password = passwordResult.error!;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates registration form
 */
export const validateRegistrationForm = (data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: string;
  location?: string;
}) => {
  const errors: Record<string, string> = {};

  // Name validation
  const nameResult = validateLength(data.name, 2, 50, 'Name');
  if (!nameResult.isValid) errors.name = nameResult.error!;

  // Email validation
  const emailResult = validateEmail(data.email);
  if (!emailResult.isValid) errors.email = emailResult.error!;

  // Phone validation
  const phoneResult = validatePhone(data.phone);
  if (!phoneResult.isValid) errors.phone = phoneResult.error!;

  // Password validation
  const passwordResult = validatePassword(data.password);
  if (!passwordResult.isValid) errors.password = passwordResult.error!;

  // Confirm password validation
  const confirmPasswordResult = validatePasswordMatch(data.password, data.confirmPassword);
  if (!confirmPasswordResult.isValid) errors.confirmPassword = confirmPasswordResult.error!;

  // Role validation
  const roleResult = validateRequired(data.role, 'Role');
  if (!roleResult.isValid) errors.role = roleResult.error!;

  // Location validation (optional)
  if (data.location) {
    const locationResult = validateMaxLength(data.location, 100, 'Location');
    if (!locationResult.isValid) errors.location = locationResult.error!;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates product form
 */
export const validateProductForm = (data: {
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  location: string;
  isNegotiable: boolean;
  images?: string[];
}) => {
  const errors: Record<string, string> = {};

  // Title validation
  const titleResult = validateLength(data.title, 5, 100, 'Title');
  if (!titleResult.isValid) errors.title = titleResult.error!;

  // Description validation
  const descriptionResult = validateLength(data.description, 20, 2000, 'Description');
  if (!descriptionResult.isValid) errors.description = descriptionResult.error!;

  // Price validation
  const priceResult = validatePrice(data.price);
  if (!priceResult.isValid) errors.price = priceResult.error!;

  // Category validation
  const categoryResult = validateRequired(data.category, 'Category');
  if (!categoryResult.isValid) errors.category = categoryResult.error!;

  // Condition validation
  const conditionResult = validateRequired(data.condition, 'Condition');
  if (!conditionResult.isValid) errors.condition = conditionResult.error!;

  // Location validation
  const locationResult = validateLength(data.location, 3, 100, 'Location');
  if (!locationResult.isValid) errors.location = locationResult.error!;

  // Images validation
  if (data.images && data.images.length === 0) {
    errors.images = 'At least one image is required';
  } else if (data.images && data.images.length > 5) {
    errors.images = 'Maximum 5 images allowed';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates contact form
 */
export const validateContactForm = (data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) => {
  const errors: Record<string, string> = {};

  // Name validation
  const nameResult = validateLength(data.name, 2, 50, 'Name');
  if (!nameResult.isValid) errors.name = nameResult.error!;

  // Email validation
  const emailResult = validateEmail(data.email);
  if (!emailResult.isValid) errors.email = emailResult.error!;

  // Subject validation
  const subjectResult = validateLength(data.subject, 5, 100, 'Subject');
  if (!subjectResult.isValid) errors.subject = subjectResult.error!;

  // Message validation
  const messageResult = validateLength(data.message, 10, 1000, 'Message');
  if (!messageResult.isValid) errors.message = messageResult.error!;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates profile update form
 */
export const validateProfileUpdateForm = (data: {
  name: string;
  phone?: string;
  location?: string;
}) => {
  const errors: Record<string, string> = {};

  // Name validation
  const nameResult = validateLength(data.name, 2, 50, 'Name');
  if (!nameResult.isValid) errors.name = nameResult.error!;

  // Phone validation (optional)
  if (data.phone && data.phone.trim().length > 0) {
    const phoneResult = validatePhone(data.phone);
    if (!phoneResult.isValid) errors.phone = phoneResult.error!;
  }

  // Location validation (optional)
  if (data.location && data.location.trim().length > 0) {
    const locationResult = validateMaxLength(data.location, 100, 'Location');
    if (!locationResult.isValid) errors.location = locationResult.error!;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates password change form
 */
export const validatePasswordChangeForm = (data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) => {
  const errors: Record<string, string> = {};

  // Current password validation
  const currentResult = validateRequired(data.currentPassword, 'Current password');
  if (!currentResult.isValid) errors.currentPassword = currentResult.error!;

  // New password validation
  const newPasswordResult = validatePassword(data.newPassword);
  if (!newPasswordResult.isValid) errors.newPassword = newPasswordResult.error!;

  // Confirm password validation
  const confirmPasswordResult = validatePasswordMatch(data.newPassword, data.confirmPassword);
  if (!confirmPasswordResult.isValid) errors.confirmPassword = confirmPasswordResult.error!;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates category form
 */
export const validateCategoryForm = (data: {
  name: string;
  description?: string;
  icon?: string;
  image?: string;
  isActive?: boolean;
}) => {
  const errors: Record<string, string> = {};

  // Name validation
  const nameResult = validateLength(data.name, 2, 50, 'Category name');
  if (!nameResult.isValid) errors.name = nameResult.error!;

  // Description validation (optional)
  if (data.description && data.description.trim().length > 0) {
    const descriptionResult = validateMaxLength(data.description, 500, 'Description');
    if (!descriptionResult.isValid) errors.description = descriptionResult.error!;
  }

  // Icon validation (optional)
  if (data.icon && data.icon.trim().length > 0) {
    const iconResult = validateMaxLength(data.icon, 10, 'Icon');
    if (!iconResult.isValid) errors.icon = iconResult.error!;
  }

  // Image validation (optional)
  if (data.image && data.image.trim().length > 0) {
    const imageResult = validateURL(data.image, 'Image URL');
    if (!imageResult.isValid) errors.image = imageResult.error!;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates checkout form (M-Pesa payment)
 */
export const validateCheckoutForm = (data: {
  phoneNumber: string;
  shippingAddress: {
    street: string;
    building: string;
    room: string;
  };
}) => {
  const errors: Record<string, string> = {};

  // Phone validation
  const phoneResult = validatePhone(data.phoneNumber);
  if (!phoneResult.isValid) errors.phoneNumber = phoneResult.error!;

  // Shipping address validation
  const streetResult = validateLength(data.shippingAddress.street, 3, 100, 'Street address');
  if (!streetResult.isValid) errors.street = streetResult.error!;

  const buildingResult = validateLength(data.shippingAddress.building, 2, 50, 'Building/floor');
  if (!buildingResult.isValid) errors.building = buildingResult.error!;

  const roomResult = validateMinLength(data.shippingAddress.room, 1, 'Room number');
  if (!roomResult.isValid) errors.room = roomResult.error!;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
