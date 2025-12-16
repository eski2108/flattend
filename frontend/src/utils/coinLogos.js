/**
 * ========================================
 * 🔒 LOCKED - DO NOT MODIFY WITHOUT APPROVAL
 * ========================================
 * 
 * Coin Logo Utility
 * SOURCE: IconScout 3D Crypto Icons
 * 
 * RULES:
 * 1. ONLY local 3D-rendered logos
 * 2. NO CDN, NO random downloads
 * 3. Placeholder for missing coins
 * 
 * LOCKED: December 2025
 */

// 81 coins with REAL 3D logos from IconScout
const LOCAL_LOGOS = [
  'aave', 'ada', 'algo', 'ape', 'aptos', 'arb', 'atom', 'avax', 'axs', 'bch',
  'beam', 'bnb', 'bonk', 'btc', 'cake', 'chz', 'comp', 'crv', 'dai', 'dash',
  'doge', 'dogs', 'dot', 'eos', 'eth', 'fet', 'fil', 'floki', 'flow', 'ftm',
  'gala', 'gmx', 'hbar', 'hmstr', 'hnt', 'icp', 'imx', 'inj', 'jto', 'jup',
  'kaspa', 'ldo', 'link', 'ltc', 'mana', 'matic', 'mina', 'mkr', 'mnt', 'near',
  'neo', 'not', 'ondo', 'op', 'pepe', 'pyth', 'rndr', 'rune', 'sand', 'sei',
  'shib', 'sol', 'stx', 'sui', 'sushi', 'theta', 'tia', 'ton', 'trump', 'trx',
  'uni', 'usdc', 'usdt', 'vet', 'waves', 'wif', 'wld', 'xlm', 'xmr', 'xrp', 'zec'
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
