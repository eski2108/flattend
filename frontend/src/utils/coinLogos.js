/**
 * Get crypto logo from CoinCap CDN
 * Has proper PNG icons for ALL major coins (238+)
 * URL format: https://assets.coincap.io/assets/icons/{symbol}@2x.png
 */

// CoinCap CDN - has icons for virtually ALL coins
const COINCAP_CDN = 'https://assets.coincap.io/assets/icons';

// Fallback CDN (cryptocurrency-icons) for generic icon
const FALLBACK_CDN = 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color';

const getCoinLogo = (symbol) => {
  if (!symbol) return `${COINCAP_CDN}/btc@2x.png`;
  
  const lowerSymbol = symbol.toLowerCase();
  
  // Return CoinCap CDN URL for the icon
  return `${COINCAP_CDN}/${lowerSymbol}@2x.png`;
};

// Generic fallback icon URL (cryptocurrency-icons generic)
const getGenericCoinIcon = () => {
  return `${FALLBACK_CDN}/generic.svg`;
};

// Export as both default AND named to fix import issues
export { getCoinLogo, getGenericCoinIcon };
export default getCoinLogo;
