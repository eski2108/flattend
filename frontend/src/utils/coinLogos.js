/**
 * Get crypto logo - 3D PNG first, fallback to SVG
 * Covers all 483 cryptocurrency icons
 */

/**
 * Get the logo path for a cryptocurrency
 * @param {string} symbol - The cryptocurrency symbol (e.g., 'BTC', 'ETH')
 * @returns {string} The local logo path (PNG or SVG)
 */
export function getCoinLogo(symbol) {
  if (!symbol) return '/crypto-icons/3d/btc.png';
  
  const cleanSymbol = symbol.toLowerCase().trim();
  
  // Try 3D PNG first (197 major coins)
  // If PNG doesn't exist, img tag will handle onError and we'll use SVG fallback
  return `/crypto-icons/3d/${cleanSymbol}.png`;
}

export default getCoinLogo;
