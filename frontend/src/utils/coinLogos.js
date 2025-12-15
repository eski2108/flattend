/**
 * Get real cryptocurrency logo from local files
 * Using cryptocurrency-icons from https://github.com/spothq/cryptocurrency-icons
 */

/**
 * Get the logo path for a cryptocurrency
 * @param {string} symbol - The cryptocurrency symbol (e.g., 'BTC', 'ETH')
 * @returns {string} The local logo path
 */
export function getCoinLogo(symbol) {
  if (!symbol) return '/crypto-icons/btc.svg';
  
  const cleanSymbol = symbol.toLowerCase().trim();
  return `/crypto-icons/${cleanSymbol}.svg`;
}

export default getCoinLogo;
