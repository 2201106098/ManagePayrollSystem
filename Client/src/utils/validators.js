/**
 * Form validation utilities
 */

/**
 * Email validation regex
 */
export const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

/**
 * Phone number validation regex (US format)
 */
export const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

/**
 * Password validation regex (minimum 8 characters, at least one uppercase, one lowercase, one number)
 */
export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

/**
 * Strong password validation regex (minimum 8 characters, at least one uppercase, one lowercase, one number, one special character)
 */
export const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Validation functions
 */
export const validators = {
  /**
   * Validate email
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  email: (email) => {
    return emailRegex.test(email);
  },

  /**
   * Validate phone number
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if valid
   */
  phone: (phone) => {
    return phoneRegex.test(phone);
  },

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @param {boolean} strong - Whether to use strong validation
   * @returns {boolean} True if valid
   */
  password: (password, strong = false) => {
    const regex = strong ? strongPasswordRegex : passwordRegex;
    return regex.test(password);
  },

  /**
   * Validate required field
   * @param {any} value - Value to check
   * @returns {boolean} True if not empty
   */
  required: (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  },

  /**
   * Validate minimum length
   * @param {string} value - String to validate
   * @param {number} min - Minimum length
   * @returns {boolean} True if valid
   */
  minLength: (value, min) => {
    if (typeof value !== 'string') return false;
    return value.length >= min;
  },

  /**
   * Validate maximum length
   * @param {string} value - String to validate
   * @param {number} max - Maximum length
   * @returns {boolean} True if valid
   */
  maxLength: (value, max) => {
    if (typeof value !== 'string') return false;
    return value.length <= max;
  },

  /**
   * Validate number
   * @param {any} value - Value to validate
   * @returns {boolean} True if valid number
   */
  number: (value) => {
    return !isNaN(value) && !isNaN(parseFloat(value));
  },

  /**
   * Validate positive number
   * @param {any} value - Value to validate
   * @returns {boolean} True if valid positive number
   */
  positiveNumber: (value) => {
    return validators.number(value) && parseFloat(value) > 0;
  },

  /**
   * Validate integer
   * @param {any} value - Value to validate
   * @returns {boolean} True if valid integer
   */
  integer: (value) => {
    return validators.number(value) && Number.isInteger(parseFloat(value));
  },

  /**
   * Validate URL
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid URL
   */
  url: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate date
   * @param {any} value - Date to validate
   * @returns {boolean} True if valid date
   */
  date: (value) => {
    const date = new Date(value);
    return !isNaN(date.getTime());
  },

  /**
   * Validate minimum date
   * @param {Date|string} value - Date to validate
   * @param {Date|string} minDate - Minimum date
   * @returns {boolean} True if valid
   */
  minDate: (value, minDate) => {
    const date = new Date(value);
    const min = new Date(minDate);
    return !isNaN(date.getTime()) && !isNaN(min.getTime()) && date >= min;
  },

  /**
   * Validate maximum date
   * @param {Date|string} value - Date to validate
   * @param {Date|string} maxDate - Maximum date
   * @returns {boolean} True if valid
   */
  maxDate: (value, maxDate) => {
    const date = new Date(value);
    const max = new Date(maxDate);
    return !isNaN(date.getTime()) && !isNaN(max.getTime()) && date <= max;
  },

  /**
   * Validate file size
   * @param {File} file - File to validate
   * @param {number} maxSizeInMB - Maximum size in MB
   * @returns {boolean} True if valid
   */
  fileSize: (file, maxSizeInMB) => {
    if (!file || !file.size) return false;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes;
  },

  /**
   * Validate file type
   * @param {File} file - File to validate
   * @param {string[]} allowedTypes - Allowed MIME types
   * @returns {boolean} True if valid
   */
  fileType: (file, allowedTypes) => {
    if (!file || !file.type) return false;
    return allowedTypes.includes(file.type);
  },
};

/**
 * Validation error messages
 */
export const validationMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  password: 'Password must be at least 8 characters long',
  strongPassword: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character',
  minLength: (min) => `Must be at least ${min} characters long`,
  maxLength: (max) => `Must be no more than ${max} characters long`,
  number: 'Please enter a valid number',
  positiveNumber: 'Please enter a positive number',
  integer: 'Please enter a whole number',
  url: 'Please enter a valid URL',
  date: 'Please enter a valid date',
  minDate: (date) => `Date must be on or after ${formatDate(date)}`,
  maxDate: (date) => `Date must be on or before ${formatDate(date)}`,
  fileSize: (maxSize) => `File size must be less than ${maxSize}MB`,
  fileType: 'File type is not allowed',
};

/**
 * Validate form field
 * @param {any} value - Field value
 * @param {Array} rules - Validation rules
 * @returns {Object} Validation result
 */
export const validateField = (value, rules = []) => {
  for (const rule of rules) {
    const { type, ...params } = rule;
    
    if (type === 'required' && !validators.required(value)) {
      return { isValid: false, message: validationMessages.required };
    }
    
    if (value && validators[type]) {
      if (!validators[type](value, ...Object.values(params))) {
        const message = params.message || validationMessages[type];
        return { 
          isValid: false, 
          message: typeof message === 'function' ? message(...Object.values(params)) : message 
        };
      }
    }
  }
  
  return { isValid: true, message: '' };
};

/**
 * Validate entire form
 * @param {Object} formData - Form data
 * @param {Object} validationSchema - Validation schema
 * @returns {Object} Validation result
 */
export const validateForm = (formData, validationSchema) => {
  const errors = {};
  let isValid = true;

  for (const [field, rules] of Object.entries(validationSchema)) {
    const result = validateField(formData[field], rules);
    if (!result.isValid) {
      errors[field] = result.message;
      isValid = false;
    }
  }

  return { isValid, errors };
};

export default {
  validators,
  validationMessages,
  validateField,
  validateForm,
  emailRegex,
  phoneRegex,
  passwordRegex,
  strongPasswordRegex,
};
