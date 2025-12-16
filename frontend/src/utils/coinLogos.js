/**
 * Get 3D crypto logo from local /crypto-logos/ folder
 * These are the same high-quality 3D PNGs used in the footer
 * DO NOT use CDN or SVG logos - use local 3D PNGs only
 */

// Get 3D coin logo - uses local PNG files (same as footer)
const getCoinLogo = (symbol) => {
  if (!symbol) return '/crypto-logos/btc.png';
  
  // Clean symbol - remove network suffixes
  const cleanSymbol = symbol
    .replace(/ERC20|TRC20|BEP20|MAINNET|BSC|ARBITRUM|POLYGON|SOL|ARB|-.*$/gi, '')
    .trim()
    .toLowerCase();
  
  // Return local 3D PNG logo
  return `/crypto-logos/${cleanSymbol}.png`;
};

// Alternative - same as main (we only use local 3D PNGs)
const getCoinLogoAlt = (symbol) => {
  return getCoinLogo(symbol);
};

// Generic fallback - returns BTC logo
const getGenericCoinIcon = () => {
  return '/crypto-logos/btc.png';
};

// Export as both default AND named to fix import issues
export { getCoinLogo, getCoinLogoAlt, getGenericCoinIcon };
export default getCoinLogo;
