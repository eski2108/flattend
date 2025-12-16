/**
 * Crypto Logo Utility
 * 1. Local-first: /public/crypto-logos/{symbol}.png
 * 2. Fallback: CoinGecko image URL
 * 3. CSS makes all logos look "3D" with drop-shadow + glow
 */

// Local logos we have
const LOCAL_LOGOS = [
  'ada', 'atom', 'avax', 'bch', 'bnb', 'btc', 'dai', 'doge', 'dot', 
  'eth', 'icx', 'link', 'ltc', 'matic', 'near', 'nwc', 'om', 'pepe', 
  'shib', 'sidus', 'sol', 'tfuel', 'trx', 'uni', 'usdc', 'usdt', 'vlx', 'xlm', 'xrp', 'zent'
];

// CoinGecko ID mapping for common coins
const COINGECKO_IDS = {
  'btc': 'bitcoin', 'eth': 'ethereum', 'usdt': 'tether', 'usdc': 'usd-coin',
  'bnb': 'binancecoin', 'xrp': 'ripple', 'ada': 'cardano', 'doge': 'dogecoin',
  'sol': 'solana', 'dot': 'polkadot', 'matic': 'matic-network', 'ltc': 'litecoin',
  'shib': 'shiba-inu', 'trx': 'tron', 'avax': 'avalanche-2', 'link': 'chainlink',
  'atom': 'cosmos', 'uni': 'uniswap', 'xlm': 'stellar', 'near': 'near',
  'pepe': 'pepe', 'tfuel': 'theta-fuel', 'om': 'mantra-dao', 'icx': 'icon',
  'vlx': 'velas', 'fil': 'filecoin', 'ftm': 'fantom', 'algo': 'algorand',
  'aave': 'aave', 'mkr': 'maker', 'grt': 'the-graph', 'sand': 'the-sandbox',
  'mana': 'decentraland', 'axs': 'axie-infinity', 'theta': 'theta-token',
  'xtz': 'tezos', 'xmr': 'monero', 'eos': 'eos', 'iota': 'iota', 'neo': 'neo'
};

// Clean symbol
const cleanSymbol = (symbol) => {
  if (!symbol) return 'btc';
  return symbol
    .replace(/ERC20|TRC20|BEP20|MAINNET|BSC|ARBITRUM|POLYGON|SOL|ARB|-.*$/gi, '')
    .trim()
    .toLowerCase();
};

// Get coin logo - local first, then CoinGecko
const getCoinLogo = (symbol) => {
  const clean = cleanSymbol(symbol);
  
  // Local logo if available
  if (LOCAL_LOGOS.includes(clean)) {
    return `/crypto-logos/${clean}.png`;
  }
  
  // CoinGecko fallback
  const geckoId = COINGECKO_IDS[clean] || clean;
  return `https://assets.coingecko.com/coins/images/1/small/${geckoId}.png`;
};

// Alternative - CoinGecko direct
const getCoinLogoAlt = (symbol) => {
  const clean = cleanSymbol(symbol);
  const geckoId = COINGECKO_IDS[clean] || clean;
  return `https://assets.coingecko.com/coins/images/1/small/${geckoId}.png`;
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
export { getCoinLogo, getCoinLogoAlt, getGenericCoinIcon };
export default getCoinLogo;
