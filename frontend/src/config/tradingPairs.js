/**
 * Trading Pairs Configuration
 * Single source of truth for all trading pairs across the platform
 */

export const COIN_NAMES = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  USDT: 'Tether',
  USDC: 'USD Coin',
  BNB: 'BNB',
  SOL: 'Solana',
  XRP: 'Ripple',
  ADA: 'Cardano',
  DOGE: 'Dogecoin',
  DOT: 'Polkadot',
  MATIC: 'Polygon',
  LTC: 'Litecoin',
  LINK: 'Chainlink',
  AVAX: 'Avalanche',
  ATOM: 'Cosmos',
  UNI: 'Uniswap',
  TRX: 'TRON',
  BCH: 'Bitcoin Cash',
  SHIB: 'Shiba Inu',
  DAI: 'Dai',
  XLM: 'Stellar',
  XMR: 'Monero',
  FIL: 'Filecoin',
  APT: 'Aptos'
};

// CoinGecko IDs for logo fetching
export const COINGECKO_IDS = {
  BTC: '1',
  ETH: '279',
  USDT: '825',
  USDC: '3408',
  BNB: '1839',
  SOL: '5426',
  XRP: '52',
  ADA: '2010',
  DOGE: '5',
  DOT: '6636',
  MATIC: '4713',
  LTC: '2',
  LINK: '1975',
  AVAX: '12559',
  ATOM: '3794',
  UNI: '7083',
  TRX: '1958',
  BCH: '1831',
  SHIB: '11939',
  DAI: '4943',
  XLM: '512',
  XMR: '328',
  FIL: '5632',
  APT: '21794'
};

/**
 * Generate trading pairs from backend data
 * @param {Object} backendPrices - Price data from /api/prices/live
 * @returns {Array} Array of trading pair objects
 */
export const generateTradingPairs = (backendPrices = {}) => {
  const coins = Object.keys(backendPrices);
  
  return coins.map(coin => ({
    symbol: `${coin}USD`,
    name: `${coin}/USD`,
    base: coin,
    quote: 'USD',
    fullName: COIN_NAMES[coin] || coin,
    coinGeckoId: COINGECKO_IDS[coin] || null,
    logoUrl: COINGECKO_IDS[coin] 
      ? `https://assets.coingecko.com/coins/images/${COINGECKO_IDS[coin]}/large/${coin.toLowerCase()}.png`
      : null
  }));
};

/**
 * Get coin logo URL - Uses unified logo system
 * @param {string} coinSymbol - Coin symbol (e.g., 'BTC')
 * @returns {string} Logo URL
 */
export const getCoinLogoUrl = (coinSymbol) => {
  // Import getCoinLogo from utils if needed, or use inline logic
  const clean = coinSymbol?.toLowerCase().replace(/ERC20|TRC20|BEP20|MAINNET|BSC|-.*$/gi, '').trim();
  
  // Local logos (fastest)
  const LOCAL_LOGOS = ['ada', 'atom', 'avax', 'bch', 'bnb', 'btc', 'dai', 'doge', 'dot', 'eth', 'link', 'ltc', 'matic', 'sol', 'trx', 'uni', 'usdc', 'usdt', 'xlm', 'xrp', 'shib'];
  if (LOCAL_LOGOS.includes(clean)) {
    return `/crypto-logos/${clean}.png`;
  }
  
  // CoinGecko fallback
  const geckoId = COINGECKO_IDS[coinSymbol];
  if (geckoId) {
    return `https://assets.coingecko.com/coins/images/${geckoId}/small/${clean}.png`;
  }
  
  // CoinCap CDN fallback
  return `https://assets.coincap.io/assets/icons/${clean}@2x.png`;
};

/**
 * Get full coin name
 * @param {string} coinSymbol - Coin symbol (e.g., 'BTC')
 * @returns {string} Full coin name
 */
export const getCoinName = (coinSymbol) => {
  return COIN_NAMES[coinSymbol] || coinSymbol;
};

export default {
  COIN_NAMES,
  COINGECKO_IDS,
  generateTradingPairs,
  getCoinLogoUrl,
  getCoinName
};
