/**
 * SINGLE SOURCE OF TRUTH FOR API CONFIGURATION
 * 
 * FORCED TO USE PRODUCTION URL
 */

// FORCE production URL
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL.replace('/api', '');

// Ensure it ALWAYS has /api at the end
export const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

// For backward compatibility - some pages might use this
export const BACKEND_URL_WITH_API = API_BASE_URL;
export const BACKEND_URL_WITHOUT_API = BACKEND_URL;

// Export default as API_BASE_URL for convenience
export default API_BASE_URL;

console.log('API Configuration loaded:', {
  BACKEND_URL,
  API_BASE_URL,
  timestamp: new Date().toISOString()
});
