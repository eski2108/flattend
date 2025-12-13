/**
 * Crypto Currency Icons and Emojis
 * Used throughout the marketplace for visual identification
 */

export const CRYPTO_ICONS = {
  BTC: '₿',
  ETH: 'Ξ',
  USDT: '₮',
  USDC: '$',
  BNB: '🔶',
  SOL: '◎',
  ADA: '₳',
  DOT: '●',
  DOGE: 'Ð',
  MATIC: '🔷',
  LTC: 'Ł',
  LINK: '🔗',
  UNI: '🦄',
  DAI: '◈',
  XRP: '✕'
};

export const CRYPTO_EMOJIS = {
  BTC: '🪙',
  ETH: '💎',
  USDT: '💵',
  USDC: '💵',
  BNB: '🔶',
  SOL: '☀️',
  ADA: '♠️',
  DOT: '⚫',
  DOGE: '🐕',
  MATIC: '🟣',
  LTC: '⚡',
  LINK: '🔗',
  UNI: '🦄',
  DAI: '💚',
  XRP: '💧'
};

export const CRYPTO_COLORS = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  USDT: '#26A17B',
  USDC: '#2775CA',
  BNB: '#F3BA2F',
  SOL: '#14F195',
  ADA: '#0033AD',
  DOT: '#E6007A',
  DOGE: '#C2A633',
  MATIC: '#8247E5',
  LTC: '#345D9D',
  LINK: '#2A5ADA',
  UNI: '#FF007A',
  DAI: '#F4B731',
  XRP: '#23292F'
};

/**
 * Get crypto icon with fallback
 */
export const getCryptoIcon = (currency) => {
  return CRYPTO_ICONS[currency?.toUpperCase()] || '🪙';
};

/**
 * Get crypto emoji with fallback
 */
export const getCryptoEmoji = (currency) => {
  return CRYPTO_EMOJIS[currency?.toUpperCase()] || '🪙';
};

/**
 * Get crypto color with fallback
 */
export const getCryptoColor = (currency) => {
  return CRYPTO_COLORS[currency?.toUpperCase()] || '#00F0FF';
};

/**
 * Format currency with icon
 */
export const formatCryptoWithIcon = (amount, currency) => {
  const icon = getCryptoIcon(currency);
  return `${icon} ${amount} ${currency}`;
};

/**
 * Render crypto badge component (inline styles)
 */
export const CryptoBadge = ({ currency, showName = true, size = 'medium' }) => {
  const sizes = {
    small: { icon: '16px', text: '0.75rem', padding: '4px 8px' },
    medium: { icon: '20px', text: '0.875rem', padding: '6px 12px' },
    large: { icon: '24px', text: '1rem', padding: '8px 16px' }
  };
  
  const currentSize = sizes[size] || sizes.medium;
  const emoji = getCryptoEmoji(currency);
  const color = getCryptoColor(currency);
  
  return {
    emoji,
    color,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: currentSize.padding,
      background: `${color}22`,
      border: `1px solid ${color}`,
      borderRadius: '8px',
      fontSize: currentSize.text,
      fontWeight: '600',
      color: color
    }
  };
};

export default {
  CRYPTO_ICONS,
  CRYPTO_EMOJIS,
  CRYPTO_COLORS,
  getCryptoIcon,
  getCryptoEmoji,
  getCryptoColor,
  formatCryptoWithIcon,
  CryptoBadge
};
