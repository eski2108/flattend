/**
 * Get crypto logo - 3D PNG from crypto-logos folder (FOOTER STYLE)
 * These are the glossy 3D icons from cryptologos.cc
 */
const getCoinLogo = (symbol) => {
  if (!symbol) return '/crypto-logos/btc.png';
  
  const lowerSymbol = symbol.toLowerCase();
  
  // Use the SAME 3D PNG icons as the footer
  return `/crypto-logos/${lowerSymbol}.png`;
};

// Export as both default AND named to fix import issues
export { getCoinLogo };
export default getCoinLogo;
