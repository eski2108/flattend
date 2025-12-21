/**
 * SINGLE SOURCE OF TRUTH FOR API CONFIGURATION
 * 
 * DO NOT modify REACT_APP_BACKEND_URL directly in pages
 * Import this file instead: import { API_BASE_URL } from '@/config/api';
 */

// Get backend URL from environment
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://bugsecurehub.preview.emergentagent.com';

// Ensure it ALWAYS has /api at the end
export const API_BASE_URL = BACKEND_URL.endsWith('/api') ? BACKEND_URL : `${BACKEND_URL}/api`;

// For backward compatibility - some pages might use this
export const BACKEND_URL_WITH_API = API_BASE_URL;
export const BACKEND_URL_WITHOUT_API = BACKEND_URL.replace('/api', '');

// Export default as API_BASE_URL for convenience
export default API_BASE_URL;

console.log('API Configuration loaded:', {
  BACKEND_URL,
  API_BASE_URL,
  timestamp: new Date().toISOString()
});
