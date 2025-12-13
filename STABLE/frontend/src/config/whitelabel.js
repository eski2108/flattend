/**
 * WHITE-LABEL CONFIGURATION
 * 
 * This file centralizes all brand-specific configurations for the platform.
 * Each white-label instance loads its configuration via environment variables.
 */

export const WHITELABEL_CONFIG = {
  // ========================================
  // BRAND IDENTITY
  // ========================================
  brandName: process.env.REACT_APP_BRAND_NAME || 'Coin Hub X',
  brandSlogan: process.env.REACT_APP_BRAND_SLOGAN || 'Trade Crypto P2P With Total Protection',
  brandId: process.env.REACT_APP_BRAND_ID || 'coinhubx',
  
  // ========================================
  // COLOR PALETTE
  // ========================================
  colors: {
    // Primary brand color (main CTA buttons, highlights)
    primary: process.env.REACT_APP_COLOR_PRIMARY || '#00F0FF',
    
    // Secondary brand color (accents, secondary buttons)
    secondary: process.env.REACT_APP_COLOR_SECONDARY || '#A855F7',
    
    // Accent color (success states, positive values)
    accent: process.env.REACT_APP_COLOR_ACCENT || '#22C55E',
    
    // Background colors
    background: {
      primary: process.env.REACT_APP_COLOR_BG_PRIMARY || '#0B0E13',
      secondary: process.env.REACT_APP_COLOR_BG_SECONDARY || '#11141A',
      tertiary: process.env.REACT_APP_COLOR_BG_TERTIARY || '#1A1D26'
    },
    
    // Text colors
    text: {
      primary: process.env.REACT_APP_COLOR_TEXT_PRIMARY || '#FFFFFF',
      secondary: process.env.REACT_APP_COLOR_TEXT_SECONDARY || '#A8A8A8',
      tertiary: process.env.REACT_APP_COLOR_TEXT_TERTIARY || 'rgba(255,255,255,0.5)'
    },
    
    // Status colors
    error: process.env.REACT_APP_COLOR_ERROR || '#EF4444',
    warning: process.env.REACT_APP_COLOR_WARNING || '#F59E0B',
    success: process.env.REACT_APP_COLOR_SUCCESS || '#22C55E',
    info: process.env.REACT_APP_COLOR_INFO || '#3B82F6',
    
    // Crypto-specific colors
    crypto: {
      btc: '#F7931A',
      eth: '#627EEA',
      usdt: '#26A17B',
      bnb: '#F3BA2F',
      sol: '#14F195'
    }
  },
  
  // ========================================
  // LOGO & BRANDING ASSETS
  // ========================================
  logo: {
    // Main logo (used in header, landing page)
    main: process.env.REACT_APP_LOGO_URL || '/logo.png',
    
    // Favicon
    favicon: process.env.REACT_APP_FAVICON_URL || '/favicon.ico',
    
    // Logo for dark backgrounds
    darkMode: process.env.REACT_APP_LOGO_DARK_URL || '/logo.png',
    
    // Logo for light backgrounds
    lightMode: process.env.REACT_APP_LOGO_LIGHT_URL || '/logo-light.png',
    
    // Logo dimensions
    width: parseInt(process.env.REACT_APP_LOGO_WIDTH) || 150,
    height: parseInt(process.env.REACT_APP_LOGO_HEIGHT) || 50,
    
    // Icon-only logo (for mobile, small spaces)
    icon: process.env.REACT_APP_LOGO_ICON_URL || '/icon.png'
  },
  
  // ========================================
  // DOMAIN & URLS
  // ========================================
  domain: process.env.REACT_APP_DOMAIN || 'coinhubx.com',
  backendUrl: process.env.REACT_APP_BACKEND_URL,
  websiteUrl: process.env.REACT_APP_WEBSITE_URL || 'https://coinhubx.com',
  
  // ========================================
  // FEATURE TOGGLES
  // ========================================
  features: {
    // Core Trading Features
    p2pTrading: process.env.REACT_APP_FEATURE_P2P !== 'false',
    spotTrading: process.env.REACT_APP_FEATURE_SPOT !== 'false',
    expressBuy: process.env.REACT_APP_FEATURE_EXPRESS !== 'false',
    swapCrypto: process.env.REACT_APP_FEATURE_SWAP !== 'false',
    
    // Financial Features
    savings: process.env.REACT_APP_FEATURE_SAVINGS !== 'false',
    staking: process.env.REACT_APP_FEATURE_STAKING === 'true',
    lending: process.env.REACT_APP_FEATURE_LENDING === 'true',
    
    // User Features
    referrals: process.env.REACT_APP_FEATURE_REFERRALS !== 'false',
    kyc: process.env.REACT_APP_FEATURE_KYC !== 'false',
    twoFactorAuth: process.env.REACT_APP_FEATURE_2FA === 'true',
    
    // Advanced Features
    merchantCenter: process.env.REACT_APP_FEATURE_MERCHANT === 'true',
    apiAccess: process.env.REACT_APP_FEATURE_API === 'true',
    advancedCharts: process.env.REACT_APP_FEATURE_CHARTS === 'true'
  },
  
  // ========================================
  // CONTACT & SUPPORT
  // ========================================
  support: {
    email: process.env.REACT_APP_SUPPORT_EMAIL || 'support@coinhubx.com',
    phone: process.env.REACT_APP_SUPPORT_PHONE || '+44 20 1234 5678',
    liveChat: process.env.REACT_APP_TAWK_ID || null,
    helpCenter: process.env.REACT_APP_HELP_URL || '/help',
    
    // Business hours
    hours: {
      weekday: '9:00 AM - 6:00 PM GMT',
      weekend: '10:00 AM - 4:00 PM GMT'
    }
  },
  
  // ========================================
  // SOCIAL MEDIA LINKS
  // ========================================
  social: {
    twitter: process.env.REACT_APP_SOCIAL_TWITTER || null,
    telegram: process.env.REACT_APP_SOCIAL_TELEGRAM || null,
    facebook: process.env.REACT_APP_SOCIAL_FACEBOOK || null,
    linkedin: process.env.REACT_APP_SOCIAL_LINKEDIN || null,
    instagram: process.env.REACT_APP_SOCIAL_INSTAGRAM || null,
    youtube: process.env.REACT_APP_SOCIAL_YOUTUBE || null,
    discord: process.env.REACT_APP_SOCIAL_DISCORD || null
  },
  
  // ========================================
  // TRADING LIMITS & FEES
  // ========================================
  limits: {
    // Minimum trade amounts
    minTrade: {
      p2p: parseFloat(process.env.REACT_APP_MIN_P2P_TRADE) || 10,
      spot: parseFloat(process.env.REACT_APP_MIN_SPOT_TRADE) || 5,
      swap: parseFloat(process.env.REACT_APP_MIN_SWAP) || 5
    },
    
    // Maximum trade amounts (daily)
    maxTrade: {
      unverified: parseFloat(process.env.REACT_APP_MAX_UNVERIFIED) || 1000,
      verified: parseFloat(process.env.REACT_APP_MAX_VERIFIED) || 10000,
      premium: parseFloat(process.env.REACT_APP_MAX_PREMIUM) || 100000
    },
    
    // Withdrawal limits
    withdrawal: {
      daily: parseFloat(process.env.REACT_APP_WITHDRAWAL_DAILY) || 5000,
      monthly: parseFloat(process.env.REACT_APP_WITHDRAWAL_MONTHLY) || 50000
    }
  },
  
  // ========================================
  // REFERRAL PROGRAM
  // ========================================
  referral: {
    commissionRate: parseFloat(process.env.REACT_APP_REFERRAL_RATE) || 0.20, // 20%
    signupBonus: parseFloat(process.env.REACT_APP_SIGNUP_BONUS) || 20,  // £20
    qualifyingAmount: parseFloat(process.env.REACT_APP_REFERRAL_QUALIFY) || 150, // £150
    duration: parseInt(process.env.REACT_APP_REFERRAL_DURATION) || 365 // 1 year
  },
  
  // ========================================
  // LOCALIZATION
  // ========================================
  locale: {
    defaultLanguage: process.env.REACT_APP_DEFAULT_LANG || 'en',
    defaultCurrency: process.env.REACT_APP_DEFAULT_CURRENCY || 'GBP',
    dateFormat: process.env.REACT_APP_DATE_FORMAT || 'DD/MM/YYYY',
    timeFormat: process.env.REACT_APP_TIME_FORMAT || 'HH:mm',
    timezone: process.env.REACT_APP_TIMEZONE || 'Europe/London'
  },
  
  // ========================================
  // LEGAL & COMPLIANCE
  // ========================================
  legal: {
    companyName: process.env.REACT_APP_COMPANY_NAME || 'Coin Hub IoClose as X Ltd',
    registrationNumber: process.env.REACT_APP_REG_NUMBER || '12345678',
    registeredAddress: process.env.REACT_APP_ADDRESS || 'London, United Kingdom',
    termsUrl: '/terms',
    privacyUrl: '/privacy',
    amlPolicy: '/aml-policy',
    cookiePolicy: '/cookie-policy'
  },
  
  // ========================================
  // SEO & METADATA
  // ========================================
  seo: {
    title: process.env.REACT_APP_SEO_TITLE || 'Coin Hub IoClose as X - P2P Crypto Trading Platform',
    description: process.env.REACT_APP_SEO_DESC || 'Trade crypto peer-to-peer with escrow protection, instant settlements, and 24/7 support.',
    keywords: process.env.REACT_APP_SEO_KEYWORDS || 'crypto, p2p, trading, bitcoin, ethereum',
    ogImage: process.env.REACT_APP_OG_IMAGE || '/og-image.png'
  }
};

// Helper functions
export const getColor = (path) => {
  const keys = path.split('.');
  let value = WHITELABEL_CONFIG.colors;
  for (const key of keys) {
    value = value?.[key];
  }
  return value;
};

export const isFeatureEnabled = (feature) => {
  return WHITELABEL_CONFIG.features[feature] === true;
};

export const getBrandAsset = (asset) => {
  return WHITELABEL_CONFIG.logo[asset] || WHITELABEL_CONFIG.logo.main;
};

export default WHITELABEL_CONFIG;
