/**
 * Get 3D crypto logo - local first, then CoinCap CDN fallback
 * Local logos in /crypto-logos/ are high-quality 3D PNGs
 * CoinCap CDN provides good quality logos for all other coins
 */

// Local 3D logos we have
const LOCAL_3D_LOGOS = [
  'ada', 'atom', 'avax', 'bch', 'bnb', 'btc', 'dai', 'doge', 'dot', 
  'eth', 'link', 'ltc', 'matic', 'shib', 'sol', 'trx', 'uni', 'usdc', 'usdt', 'xrp'
];

// Get 3D coin logo - local PNG if available, else CoinCap CDN
const getCoinLogo = (symbol) => {
  if (!symbol) return '/crypto-logos/btc.png';
  
  // Clean symbol - remove network suffixes
  const cleanSymbol = symbol
    .replace(/ERC20|TRC20|BEP20|MAINNET|BSC|ARBITRUM|POLYGON|SOL|ARB|-.*$/gi, '')
    .trim()
    .toLowerCase();
  
  // Use local 3D PNG if we have it
  if (LOCAL_3D_LOGOS.includes(cleanSymbol)) {
    return `/crypto-logos/${cleanSymbol}.png`;
  }
  
  // Fallback to CoinCap CDN (good quality)
  return `https://assets.coincap.io/assets/icons/${cleanSymbol}@2x.png`;
};

// Alternative CDN for fallback
const getCoinLogoAlt = (symbol) => {
  if (!symbol) return '/crypto-logos/btc.png';
  const cleanSymbol = symbol
    .replace(/ERC20|TRC20|BEP20|MAINNET|BSC|ARBITRUM|POLYGON|SOL|ARB|-.*$/gi, '')
    .trim()
    .toLowerCase();
  return `https://assets.coincap.io/assets/icons/${cleanSymbol}@2x.png`;
};

// Generic fallback - BTC logo
const getGenericCoinIcon = () => {
  return '/crypto-logos/btc.png';
};

// Export as both default AND named to fix import issues
export { getCoinLogo, getCoinLogoAlt, getGenericCoinIcon };
export default getCoinLogo;
