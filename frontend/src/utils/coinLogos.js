/**
 * Get 3D glossy crypto logo from cryptologos.cc
 * These are the SAME 3D PNG icons used in the footer
 * NOT flat SVGs - these have depth, gradients, and glossy app-style look
 */

/**
 * Get the 3D PNG logo path for a cryptocurrency
 * @param {string} symbol - The cryptocurrency symbol (e.g., 'BTC', 'ETH')
 * @returns {string} The local 3D PNG logo path
 */
export function getCoinLogo(symbol) {
  if (!symbol) return '/crypto-icons/3d/btc.png';
  
  const cleanSymbol = symbol.toLowerCase().trim();
  return `/crypto-icons/3d/${cleanSymbol}.png`;
}

export default getCoinLogo;
