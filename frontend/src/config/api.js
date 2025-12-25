/**
 * Centralized API Configuration
 * All API URLs should use these constants - NO hardcoded URLs elsewhere
 */

// Base URLs from environment
export const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || '';
export const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL || '';
export const WS_BASE_URL = process.env.REACT_APP_WS_URL || API_BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://');

// Helper to construct API endpoints
export const getApiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

// Common API endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  LOGOUT: '/api/auth/logout',
  
  // User
  USER_PROFILE: '/api/user/profile',
  
  // Wallets
  WALLETS: '/api/wallet/balances',
  
  // Trading
  SPOT_TRADING: '/api/spot',
  
  // Bots
  BOTS_LIST: '/api/bots/list',
  BOTS_CREATE: '/api/bots/create',
  
  // Admin
  ADMIN_DASHBOARD: '/api/admin/dashboard',
  
  // Health
  HEALTH: '/api/health',
};

export default {
  API_BASE_URL,
  FRONTEND_URL,
  WS_BASE_URL,
  getApiUrl,
  API_ENDPOINTS,
};
