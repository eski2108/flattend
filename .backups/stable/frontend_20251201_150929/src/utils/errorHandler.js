import { toast } from 'sonner';

/**
 * Centralized error handler for API calls
 * Provides consistent error messaging across the application
 */
export const handleApiError = (error, customMessage = null) => {
  console.error('API Error:', error);
  
  let errorMessage = customMessage || 'An error occurred';
  
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const data = error.response.data;
    
    switch (status) {
      case 400:
        errorMessage = data.detail || data.message || 'Invalid request';
        break;
      case 401:
        errorMessage = 'Please log in to continue';
        // Redirect to login if unauthorized
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        break;
      case 403:
        errorMessage = 'Access denied';
        break;
      case 404:
        errorMessage = data.detail || 'Resource not found';
        break;
      case 429:
        errorMessage = 'Too many requests. Please try again later';
        break;
      case 500:
        errorMessage = 'Server error. Please try again';
        break;
      case 503:
        errorMessage = 'Service temporarily unavailable';
        break;
      default:
        errorMessage = data.detail || data.message || 'Request failed';
    }
  } else if (error.request) {
    // Request made but no response
    errorMessage = 'Network error. Please check your connection';
  } else {
    // Error setting up request
    errorMessage = error.message || 'Request failed';
  }
  
  toast.error(errorMessage);
  return errorMessage;
};

/**
 * Handle success responses consistently
 */
export const handleApiSuccess = (message = 'Success!') => {
  toast.success(message);
};

/**
 * Validate form fields before submission
 */
export const validateRequired = (fields, fieldNames) => {
  for (let i = 0; i < fields.length; i++) {
    if (!fields[i] || fields[i].toString().trim() === '') {
      toast.error(`${fieldNames[i]} is required`);
      return false;
    }
  }
  return true;
};

/**
 * Format currency values consistently
 */
export const formatCurrency = (value, currency = 'GBP', decimals = 2) => {
  const symbols = {
    GBP: '£',
    USD: '$',
    EUR: '€'
  };
  
  const symbol = symbols[currency] || '';
  const formatted = parseFloat(value).toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  
  return `${symbol}${formatted}`;
};

/**
 * Format crypto amounts consistently
 */
export const formatCrypto = (value, decimals = 8) => {
  return parseFloat(value).toFixed(decimals);
};
