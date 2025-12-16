/**
 * ========================================
 * 🔒 LOCKED - DO NOT MODIFY WITHOUT APPROVAL
 * ========================================
 * 
 * Coin Logo Utility
 * 
 * RULES:
 * 1. ONLY local 3D-rendered logos from /assets/coins/3d/
 * 2. NO CDN, NO random downloads
 * 3. Placeholder for missing coins
 * 
 * LOCKED: December 2025
 */

// Coins with REAL 3D-rendered logos
const LOCAL_LOGOS = [
  'ada', 'atom', 'bch', 'bnb', 'btc', 'dai', 'doge', 'dot', 
  'eth', 'link', 'ltc', 'matic', 'shib', 'sol', 'trx', 'uni', 
  'usdc', 'usdt', 'xrp'
];

const cleanSymbol = (symbol) => {
  if (!symbol) return 'btc';
  return symbol
    .replace(/ERC20|TRC20|BEP20|MAINNET|BSC|ARBITRUM|POLYGON|SOL|ARB|OP|BASE|-.*$/gi, '')
    .trim()
    .toLowerCase();
};

const getCoinLogo = (symbol) => {
  const clean = cleanSymbol(symbol);
  if (LOCAL_LOGOS.includes(clean)) {
    return `/assets/coins/3d/${clean}.png`;
  }
  return '/assets/coins/3d/placeholder.svg';
};

const getCoinLogoAlt = getCoinLogo;
const getCoinLogoFallback = getCoinLogo;
const getGenericCoinIcon = () => '/assets/coins/3d/placeholder.svg';

export { 
  getCoinLogo, 
  getCoinLogoAlt, 
  getCoinLogoFallback,
  getGenericCoinIcon, 
  cleanSymbol,
  LOCAL_LOGOS
};

export default getCoinLogo;
