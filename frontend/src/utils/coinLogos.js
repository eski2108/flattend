/**
 * Crypto Logo Utility
 * PRIMARY: NOWPayments SVG logos (has ALL 360+ coins)
 * FALLBACK: Local PNG, then CoinCap CDN
 * CSS makes all logos look "3D" with drop-shadow + glow
 */

// NOWPayments logo base URL - HAS ALL COINS
const NOWPAYMENTS_LOGO_URL = 'https://nowpayments.io/images/coins';

// Local logos we have (for offline/faster loading)
const LOCAL_LOGOS = [
  'ada', 'atom', 'avax', 'bch', 'bnb', 'btc', 'dai', 'doge', 'dot', 
  'eth', 'icx', 'link', 'ltc', 'matic', 'near', 'nwc', 'om', 'pepe', 
  'shib', 'sidus', 'sol', 'tfuel', 'trx', 'uni', 'usdc', 'usdt', 'vlx', 'xlm', 'xrp', 'zent'
];

// Clean symbol for local logos only
const cleanSymbol = (symbol) => {
  if (!symbol) return 'btc';
  return symbol
    .replace(/ERC20|TRC20|BEP20|MAINNET|BSC|ARBITRUM|POLYGON|SOL|ARB|OP|BASE|-.*$/gi, '')
    .trim()
    .toLowerCase();
};

// Get coin logo - NOWPayments first (has ALL coins), then local, then CDN
const getCoinLogo = (symbol) => {
  if (!symbol) return `${NOWPAYMENTS_LOGO_URL}/btc.svg`;
  
  // Use NOWPayments SVG - they have EVERY coin
  const lowerSymbol = symbol.toLowerCase();
  return `${NOWPAYMENTS_LOGO_URL}/${lowerSymbol}.svg`;
};

// Alternative - Local PNG
const getCoinLogoAlt = (symbol) => {
  const clean = cleanSymbol(symbol);
  if (LOCAL_LOGOS.includes(clean)) {
    return `/crypto-logos/${clean}.png`;
  }
  // Fallback to CoinCap
  return `https://assets.coincap.io/assets/icons/${clean}@2x.png`;
};

// Third fallback - CoinCap CDN
const getCoinLogoFallback = (symbol) => {
  const clean = cleanSymbol(symbol);
  return `https://assets.coincap.io/assets/icons/${clean}@2x.png`;
};

// Generic fallback
const getGenericCoinIcon = () => '/crypto-logos/btc.png';

// CSS styles for 3D effect on any logo
const COIN_LOGO_3D_STYLE = {
  filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.45)) drop-shadow(0 0 10px rgba(0,255,200,0.25))',
  borderRadius: '50%'
};

// Wrapper style for 3D badge effect
const COIN_BADGE_STYLE = (size = 40) => ({
  width: `${size}px`,
  height: `${size}px`,
  borderRadius: '50%',
  background: 'linear-gradient(145deg, #2a2f45, #1a1f35)',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.4), 0 0 20px rgba(0,229,255,0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px',
  overflow: 'hidden'
});

// Export as both default AND named to fix import issues
export { getCoinLogo, getCoinLogoAlt, getGenericCoinIcon, COIN_LOGO_3D_STYLE, COIN_BADGE_STYLE, cleanSymbol };
export default getCoinLogo;
