/**
 * Crypto Logo Utility - UNIFIED 3D SYSTEM
 * 
 * RULES:
 * 1. Top coins: Local 3D PNGs only
 * 2. All other coins: CoinGecko CDN ONLY
 * 3. CSS 3D effect applied to ALL logos uniformly
 * 4. Placeholder fallback if CDN fails
 */

// Local 3D PNG logos (top coins only)
const LOCAL_LOGOS = [
  'btc', 'eth', 'usdt', 'usdc', 'bnb', 'sol', 'xrp', 'ada', 'doge', 'dot',
  'matic', 'ltc', 'link', 'avax', 'atom', 'uni', 'trx', 'bch', 'shib', 'dai',
  'xlm', 'near', 'pepe', 'icx', 'tfuel', 'om', 'nwc', 'sidus', 'vlx', 'zent'
];

// CoinGecko ID mapping for CDN fallback
const COINGECKO_IDS = {
  btc: 'bitcoin', eth: 'ethereum', usdt: 'tether', usdc: 'usd-coin',
  bnb: 'binancecoin', sol: 'solana', xrp: 'ripple', ada: 'cardano',
  doge: 'dogecoin', dot: 'polkadot', matic: 'matic-network', ltc: 'litecoin',
  link: 'chainlink', avax: 'avalanche-2', atom: 'cosmos', uni: 'uniswap',
  trx: 'tron', bch: 'bitcoin-cash', shib: 'shiba-inu', dai: 'dai',
  xlm: 'stellar', near: 'near', pepe: 'pepe', arb: 'arbitrum',
  op: 'optimism', apt: 'aptos', fil: 'filecoin', xmr: 'monero',
  algo: 'algorand', icp: 'internet-computer', vet: 'vechain',
  hbar: 'hedera-hashgraph', ftm: 'fantom', theta: 'theta-token',
  egld: 'elrond-erd-2', xtz: 'tezos', sand: 'the-sandbox',
  mana: 'decentraland', aave: 'aave', grt: 'the-graph', mkr: 'maker',
  snx: 'havven', crv: 'curve-dao-token', ldo: 'lido-dao',
  inj: 'injective-protocol', imx: 'immutable-x', floki: 'floki',
  ape: 'apecoin', axs: 'axie-infinity', enj: 'enjincoin',
  gala: 'gala', chz: 'chiliz', 1inch: '1inch', sushi: 'sushi',
  comp: 'compound-governance-token', bal: 'balancer', yfi: 'yearn-finance',
  cake: 'pancakeswap-token', rune: 'thorchain', zec: 'zcash',
  eos: 'eos', xem: 'nem', neo: 'neo', waves: 'waves', dash: 'dash',
  kava: 'kava', celo: 'celo', one: 'harmony', iotx: 'iotex',
  zil: 'zilliqa', ont: 'ontology', qtum: 'qtum', icx: 'icon',
  sc: 'siacoin', zen: 'zencash', rvn: 'ravencoin', dgb: 'digibyte',
  hnt: 'helium', ar: 'arweave', rose: 'oasis-network', flow: 'flow',
  mina: 'mina-protocol', kda: 'kadena', cspr: 'casper-network',
  xdc: 'xdce-crowd-sale', tfuel: 'theta-fuel', tusd: 'true-usd',
  paxg: 'pax-gold', frax: 'frax', lusd: 'liquity-usd', gusd: 'gemini-dollar',
  busd: 'binance-usd', usdp: 'paxos-standard', fei: 'fei-usd',
  om: 'mantra-dao', nwc: 'newscrypto-coin', vlx: 'velas',
  zent: 'zent-cash', sidus: 'sidus', pew: 'pepe-wif-hat',
  hoge: 'hoge-finance', bad: 'bad-idea-ai', hmstr: 'hamster-kombat',
  ctsi: 'cartesi', gmx: 'gmx', waves: 'waves'
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
 * Get coin logo URL
 * @param {string} symbol - Coin symbol
 * @returns {string} Logo URL (local or CoinGecko CDN)
 */
const getCoinLogo = (symbol) => {
  if (!symbol) return '/crypto-logos/btc.png';
  
  const clean = cleanSymbol(symbol);
  
  // 1. LOCAL 3D PNG for top coins
  if (LOCAL_LOGOS.includes(clean)) {
    return `/crypto-logos/${clean}.png`;
  }
  
  // 2. COINGECKO CDN for all other coins
  const geckoId = COINGECKO_IDS[clean];
  if (geckoId) {
    return `https://assets.coingecko.com/coins/images/1/large/${geckoId}.png`;
  }
  
  // Use CoinGecko's direct coin image API
  return `https://api.coingecko.com/api/v3/coins/${clean}/image`;
};

/**
 * Get CoinGecko CDN fallback URL
 */
const getCoinLogoAlt = (symbol) => {
  const clean = cleanSymbol(symbol);
  const geckoId = COINGECKO_IDS[clean] || clean;
  return `https://assets.coingecko.com/coins/images/1/small/${geckoId}.png`;
};

/**
 * Get secondary CoinGecko fallback
 */
const getCoinLogoFallback = (symbol) => {
  const clean = cleanSymbol(symbol);
  // Try CoinGecko's coin search format
  return `https://assets.coingecko.com/coins/images/1/thumb/${clean}.png`;
};

/**
 * Generic placeholder
 */
const getGenericCoinIcon = () => '/crypto-logos/btc.png';

// CSS 3D EFFECT - Applied to ALL logos uniformly
const COIN_LOGO_3D_STYLE = {
  filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.45)) drop-shadow(0 0 10px rgba(0,255,200,0.25))',
  borderRadius: '50%'
};

// Badge wrapper for uniform 3D appearance
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
