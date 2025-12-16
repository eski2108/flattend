/**
 * ========================================
 * 🔒 LOCKED - DO NOT MODIFY WITHOUT APPROVAL
 * ========================================
 * 
 * SOURCE: IconScout 3D Crypto Icons
 * LOCKED: December 2025
 */

// 108 coins with REAL 3D logos
const LOCAL_LOGOS = [
  'aave', 'ada', 'algo', 'ape', 'aptos', 'arb', 'atom', 'avax', 'axs', 'bad',
  'banana', 'bazed', 'bch', 'beam', 'bel', 'bnb', 'bonk', 'btc', 'cake', 'cfx',
  'chr', 'chz', 'comp', 'cro', 'crv', 'cspr', 'ctsi', 'cvc', 'dai', 'dash',
  'doge', 'dogs', 'dot', 'egld', 'eos', 'eth', 'fet', 'fil', 'fitfi', 'floki',
  'flow', 'fluf', 'ftm', 'gala', 'gmx', 'hbar', 'hmstr', 'hnt', 'icp', 'icx',
  'id', 'imx', 'inj', 'jto', 'jup', 'kaia', 'kaspa', 'kiba', 'ldo', 'link',
  'ltc', 'mana', 'matic', 'mina', 'mkr', 'mnt', 'near', 'neo', 'not', 'nwc',
  'om', 'ondo', 'op', 'pepe', 'pew', 'pyth', 'rndr', 'rune', 'sand', 'sei',
  'shib', 'sidus', 'sol', 'stx', 'sui', 'sun', 'sushi', 'tfuel', 'theta', 'tia',
  'ton', 'trump', 'trx', 'tusd', 'uni', 'usdc', 'usdt', 'vet', 'vlx', 'waves',
  'wif', 'wld', 'xdc', 'xlm', 'xmr', 'xrp', 'zec', 'zent'
];

const cleanSymbol = (symbol) => {
  if (!symbol) return 'btc';
  return symbol
    .replace(/ERC20|TRC20|BEP20|MAINNET|BSC|ARBITRUM|POLYGON|SOL|ARB|OP|BASE|ARC20|MATIC|CELO|LNA|-.*$/gi, '')
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
