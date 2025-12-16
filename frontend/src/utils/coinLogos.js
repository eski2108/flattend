/**
 * Crypto Logo Utility
 * 1. Local-first: /public/crypto-logos/{symbol}.png
 * 2. Fallback: CoinCap CDN (works for most coins)
 * 3. CSS makes all logos look "3D" with drop-shadow + glow
 */

// Local logos we have
const LOCAL_LOGOS = [
  'ada', 'atom', 'avax', 'bch', 'bnb', 'btc', 'dai', 'doge', 'dot', 
  'eth', 'icx', 'link', 'ltc', 'matic', 'near', 'nwc', 'om', 'pepe', 
  'shib', 'sidus', 'sol', 'tfuel', 'trx', 'uni', 'usdc', 'usdt', 'vlx', 'xlm', 'xrp', 'zent'
];

// Clean symbol - remove network suffixes
const cleanSymbol = (symbol) => {
  if (!symbol) return 'btc';
  return symbol
    .replace(/ERC20|TRC20|BEP20|MAINNET|BSC|ARBITRUM|POLYGON|SOL|ARB|OP|BASE|-.*$/gi, '')
    .trim()
    .toLowerCase();
};

// Get coin logo - local first, then CoinCap CDN
const getCoinLogo = (symbol) => {
  const clean = cleanSymbol(symbol);
  
  // Local logo if available
  if (LOCAL_LOGOS.includes(clean)) {
    return `/crypto-logos/${clean}.png`;
  }
  
  // CoinCap CDN - works for most coins
  return `https://assets.coincap.io/assets/icons/${clean}@2x.png`;
};

// Alternative CDN - CryptoCompare
const getCoinLogoAlt = (symbol) => {
  const clean = cleanSymbol(symbol);
  return `https://www.cryptocompare.com/media/37746251/${clean}.png`;
};

// Third fallback - CoinMarketCap static
const getCoinLogoFallback = (symbol) => {
  const clean = cleanSymbol(symbol).toUpperCase();
  return `https://s2.coinmarketcap.com/static/img/coins/64x64/${clean}.png`;
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
