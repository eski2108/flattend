export const PLATFORM_CONFIG = {
  TRADE_FEE_PERCENT: 1, // 1% P2P trade fee
  WITHDRAWAL_FEE_PERCENT: 1, // 1% withdrawal fee
  REFERRAL_COMMISSION_PERCENT: 20, // 20% referral commission
  PLATFORM_FEE_WALLET: process.env.PLATFORM_FEE_WALLET || 'admin_platform_wallet',
  APP_NAME: 'CoinHubX',
  APP_VERSION: '1.0.0',
};

export const TRADE_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  BUYER_MARKED_PAID: 'buyer_marked_paid',
  RELEASED: 'released',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  DISPUTED: 'disputed',
};

export const TRADE_STATUS_LABELS = {
  [TRADE_STATUS.PENDING_PAYMENT]: 'Pending Payment',
  [TRADE_STATUS.BUYER_MARKED_PAID]: 'Payment Sent',
  [TRADE_STATUS.RELEASED]: 'Completed',
  [TRADE_STATUS.CANCELLED]: 'Cancelled',
  [TRADE_STATUS.EXPIRED]: 'Expired',
  [TRADE_STATUS.DISPUTED]: 'Disputed',
};

// 12+ Supported Cryptocurrencies (synced with backend)
export const CRYPTO_CURRENCIES = [
  { code: 'BTC', name: 'Bitcoin', symbol: '₿', decimals: 8 },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', decimals: 18 },
  { code: 'USDT', name: 'Tether', symbol: '₮', decimals: 6 },
  { code: 'BNB', name: 'Binance Coin', symbol: '🔶', decimals: 18 },
  { code: 'SOL', name: 'Solana', symbol: '◎', decimals: 9 },
  { code: 'XRP', name: 'Ripple', symbol: '✕', decimals: 6 },
  { code: 'ADA', name: 'Cardano', symbol: '₳', decimals: 6 },
  { code: 'DOGE', name: 'Dogecoin', symbol: 'Ð', decimals: 8 },
  { code: 'MATIC', name: 'Polygon', symbol: '⬡', decimals: 18 },
  { code: 'LTC', name: 'Litecoin', symbol: 'Ł', decimals: 8 },
  { code: 'AVAX', name: 'Avalanche', symbol: '🔺', decimals: 18 },
  { code: 'DOT', name: 'Polkadot', symbol: '●', decimals: 10 },
];

// Global Payment Methods
export const PAYMENT_METHODS = [
  { id: 'faster_payments', name: 'Faster Payments', region: 'UK', icon: '🏦' },
  { id: 'sepa', name: 'SEPA', region: 'EU', icon: '🇪🇺' },
  { id: 'swift', name: 'SWIFT', region: 'Global', icon: '🌍' },
  { id: 'wise', name: 'Wise', region: 'Global', icon: '💸' },
  { id: 'revolut', name: 'Revolut', region: 'EU/UK', icon: '🔄' },
  { id: 'paypal', name: 'PayPal', region: 'Global', icon: '💰' },
  { id: 'pix', name: 'PIX', region: 'Brazil', icon: '🇧🇷' },
  { id: 'upi', name: 'UPI', region: 'India', icon: '🇮🇳' },
  { id: 'm_pesa', name: 'M-Pesa', region: 'Africa', icon: '🇰🇪' },
];

// Global Fiat Currencies
export const FIAT_CURRENCIES = [
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
];
