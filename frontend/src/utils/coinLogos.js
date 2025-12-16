/**
 * Crypto Logo Utility - UNIFIED SYSTEM
 * 
 * Priority Order:
 * 1. LOCAL PNG: /public/crypto-logos/{symbol}.png (fastest, ~30 core coins)
 * 2. NOWPAYMENTS SVG: https://nowpayments.io/images/coins/{symbol}.svg (has ALL 247+ coins)
 * 3. COINGECKO: https://assets.coingecko.com/coins/images/{id}/small/{symbol}.png
 * 4. COINCAP CDN: https://assets.coincap.io/assets/icons/{symbol}@2x.png
 * 5. TEXT FALLBACK: Styled letter with same 3D effect (LAST RESORT ONLY)
 * 
 * CSS 3D Effect applied via filter + badge wrapper
 */

// Local logos we have (for offline/faster loading)
const LOCAL_LOGOS = [
  'ada', 'atom', 'avax', 'bch', 'bnb', 'btc', 'dai', 'doge', 'dot', 
  'eth', 'icx', 'link', 'ltc', 'matic', 'near', 'nwc', 'om', 'pepe', 
  'shib', 'sidus', 'sol', 'tfuel', 'trx', 'uni', 'usdc', 'usdt', 'vlx', 'xlm', 'xrp', 'zent'
];

// CoinGecko IDs for direct logo fetching (most popular coins)
const COINGECKO_IDS = {
  btc: '1', bitcoin: '1',
  eth: '279', ethereum: '279',
  usdt: '325', tether: '325',
  usdc: '6319', 
  bnb: '825',
  sol: '4128', solana: '4128',
  xrp: '44', ripple: '44',
  ada: '975', cardano: '975',
  doge: '74', dogecoin: '74',
  dot: '6636', polkadot: '6636',
  matic: '4713', polygon: '4713',
  ltc: '2', litecoin: '2',
  link: '877', chainlink: '877',
  avax: '5805', avalanche: '5805',
  atom: '1481', cosmos: '1481',
  uni: '12504', uniswap: '12504',
  trx: '1094', tron: '1094',
  bch: '780',
  shib: '11939',
  dai: '9956',
  xlm: '100', stellar: '100',
  near: '10365',
  apt: '21794', aptos: '21794',
  fil: '12817', filecoin: '12817',
  xmr: '69', monero: '69',
  algo: '4030', algorand: '4030',
  icp: '8916',
  vet: '3077', vechain: '3077',
  hbar: '4642', hedera: '4642',
  ftm: '4001', fantom: '4001',
  theta: '2416',
  egld: '6892',
  xtz: '2011', tezos: '2011',
  sand: '14557', sandbox: '14557',
  mana: '1966', decentraland: '1966',
  aave: '7278',
  grt: '12220', thegraph: '12220',
  mkr: '1518', maker: '1518',
  snx: '2586', synthetix: '2586',
  crv: '13855', curve: '13855',
  ldo: '8000', lido: '8000',
  arb: '22287', arbitrum: '22287',
  op: '11840', optimism: '11840',
  inj: '7226', injective: '7226',
  imx: '10603', immutable: '10603',
  pepe: '24478',
  floki: '10804'
};

// Clean symbol - remove network suffixes
const cleanSymbol = (symbol) => {
  if (!symbol) return 'btc';
  return symbol
    .replace(/ERC20|TRC20|BEP20|MAINNET|BSC|ARBITRUM|POLYGON|SOL|ARB|OP|BASE|-.*$/gi, '')
    .trim()
    .toLowerCase();
};

/**
 * Get coin logo URL - Local first, then NOWPayments (has ALL coins)
 * @param {string} symbol - Coin symbol (e.g., 'BTC', 'ETH')
 * @returns {string} Logo URL
 */
const getCoinLogo = (symbol) => {
  if (!symbol) return '/crypto-logos/btc.png';
  
  const clean = cleanSymbol(symbol);
  
  // 1. LOCAL PNG FIRST (fastest)
  if (LOCAL_LOGOS.includes(clean)) {
    return `/crypto-logos/${clean}.png`;
  }
  
  // 2. NOWPAYMENTS SVG - They have ALL 247+ coins!
  return `https://nowpayments.io/images/coins/${symbol.toLowerCase()}.svg`;
};

/**
 * Get alternative logo URL (for fallback chain)
 * @param {string} symbol - Coin symbol
 * @returns {string} Alternative logo URL
 */
const getCoinLogoAlt = (symbol) => {
  const clean = cleanSymbol(symbol);
  
  // Try CoinCap if primary was local
  if (LOCAL_LOGOS.includes(clean)) {
    return `https://assets.coincap.io/assets/icons/${clean}@2x.png`;
  }
  
  // Try CoinGecko small image
  const geckoId = COINGECKO_IDS[clean];
  if (geckoId) {
    return `https://assets.coingecko.com/coins/images/${geckoId}/thumb/${clean}.png`;
  }
  
  // Final CDN attempt
  return `https://cryptologos.cc/logos/${clean}-${clean}-logo.png`;
};

/**
 * Get third fallback logo URL
 * @param {string} symbol - Coin symbol  
 * @returns {string} Third fallback logo URL
 */
const getCoinLogoFallback = (symbol) => {
  const clean = cleanSymbol(symbol);
  // CryptoLogos.cc as final attempt
  return `https://cryptologos.cc/logos/${clean}-${clean}-logo.png`;
};

// Generic fallback
const getGenericCoinIcon = () => '/crypto-logos/btc.png';

// CSS 3D EFFECT STYLES
// Apply this to <img> elements for the 3D drop-shadow effect
const COIN_LOGO_3D_STYLE = {
  filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.45)) drop-shadow(0 0 10px rgba(0,255,200,0.25))',
  borderRadius: '50%'
};

// Badge wrapper style for 3D effect (wrap the img in a div with this style)
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
  padding: `${Math.floor(size * 0.12)}px`,
  overflow: 'hidden',
  flexShrink: 0
});

// Export everything
export { 
  getCoinLogo, 
  getCoinLogoAlt, 
  getCoinLogoFallback,
  getGenericCoinIcon, 
  COIN_LOGO_3D_STYLE, 
  COIN_BADGE_STYLE, 
  cleanSymbol,
  LOCAL_LOGOS,
  COINGECKO_IDS
};

export default getCoinLogo;
