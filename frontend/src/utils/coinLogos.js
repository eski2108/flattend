/**
 * Get crypto logo from CoinCap CDN
 * Has proper PNG icons for ALL major coins (238+)
 * URL format: https://assets.coincap.io/assets/icons/{symbol}@2x.png
 */

// CoinCap CDN - has icons for virtually ALL coins
const COINCAP_CDN = 'https://assets.coincap.io/assets/icons';

// Fallback CDN for secondary lookup
const CRYPTO_ICONS_CDN = 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color';

// Data URI for a bold, colorful generic crypto icon (visible and professional)
const GENERIC_COIN_DATA_URI = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00E5FF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7B2CFF;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#grad)"/>
  <circle cx="50" cy="50" r="35" fill="none" stroke="#FFF" stroke-width="3"/>
  <text x="50" y="58" font-family="Arial,sans-serif" font-size="28" font-weight="bold" fill="#FFF" text-anchor="middle">₿</text>
</svg>
`)}`;

const getCoinLogo = (symbol) => {
  if (!symbol) return `${COINCAP_CDN}/btc@2x.png`;
  
  const lowerSymbol = symbol.toLowerCase();
  
  // Return CoinCap CDN URL for the icon
  return `${COINCAP_CDN}/${lowerSymbol}@2x.png`;
};

// Get alternative CDN URL for fallback
const getCoinLogoAlt = (symbol) => {
  if (!symbol) return `${CRYPTO_ICONS_CDN}/btc.svg`;
  const lowerSymbol = symbol.toLowerCase();
  return `${CRYPTO_ICONS_CDN}/${lowerSymbol}.svg`;
};

// Generic fallback icon - bold, colorful, and visible
const getGenericCoinIcon = () => {
  return GENERIC_COIN_DATA_URI;
};

// Export as both default AND named to fix import issues
export { getCoinLogo, getCoinLogoAlt, getGenericCoinIcon };
export default getCoinLogo;
