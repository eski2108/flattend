/**
 * Get crypto logo from jsDelivr CDN - cryptocurrency-icons package
 * Has proper SVG icons for ALL major coins
 * Fallback chain: CDN color SVG -> CDN black SVG -> generic icon
 */

// CDN base URL for cryptocurrency-icons package
const CDN_BASE = 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1';

const getCoinLogo = (symbol) => {
  if (!symbol) return `${CDN_BASE}/svg/color/btc.svg`;
  
  const lowerSymbol = symbol.toLowerCase();
  
  // Return CDN URL for the colored SVG icon
  return `${CDN_BASE}/svg/color/${lowerSymbol}.svg`;
};

// Get black/white version if needed
const getCoinLogoBlack = (symbol) => {
  if (!symbol) return `${CDN_BASE}/svg/black/btc.svg`;
  const lowerSymbol = symbol.toLowerCase();
  return `${CDN_BASE}/svg/black/${lowerSymbol}.svg`;
};

// Generic fallback icon URL
const getGenericCoinIcon = () => {
  return `${CDN_BASE}/svg/color/generic.svg`;
};

// Export as both default AND named to fix import issues
export { getCoinLogo, getCoinLogoBlack, getGenericCoinIcon };
export default getCoinLogo;
