/**
 * ========================================
 * 🔒 LOCKED - DO NOT MODIFY WITHOUT APPROVAL
 * ========================================
 * 
 * SOURCE: IconScout 3D Crypto Icons
 * TOTAL: 193 coins
 * LOCKED: December 2025
 */

// 193 coins with REAL 3D logos
const LOCAL_LOGOS = [
  '1inch', 'aave', 'ada', 'aitech', 'algo', 'ape', 'aptos', 'arb', 'aster', 'atom',
  'avax', 'awe', 'axs', 'babydoge', 'bad', 'banana', 'bat', 'bazed', 'bch', 'beam',
  'bel', 'bera', 'bnb', 'boba', 'bonk', 'brett', 'btc', 'busd', 'c98', 'cake',
  'cfx', 'cgpt', 'chr', 'chz', 'comp', 'cro', 'crv', 'cspr', 'ctsi', 'cult',
  'cvc', 'dai', 'dao', 'dash', 'dcr', 'dgb', 'dino', 'doge', 'dogs', 'dot',
  'egld', 'eos', 'etc', 'eth', 'ethw', 'fdusd', 'fet', 'fil', 'fitfi', 'floki',
  'flow', 'fluf', 'ftm', 'ftt', 'fun', 'g', 'gala', 'geth', 'gmx', 'grt',
  'guard', 'hbar', 'hex', 'hmstr', 'hnt', 'hot', 'icp', 'icx', 'id', 'ilv',
  'imx', 'inj', 'iotx', 'jasmy', 'jst', 'jto', 'jup', 'kaia', 'kas', 'kaspa',
  'keanu', 'kiba', 'knc', 'ldo', 'leash', 'lingo', 'link', 'ltc', 'luna', 'lunc',
  'major', 'mana', 'marsh', 'matic', 'mew', 'mina', 'mkr', 'mnt', 'mog', 'mx',
  'nano', 'near', 'neo', 'netvr', 'newt', 'not', 'now', 'nwc', 'okb', 'om',
  'omg', 'ondo', 'ont', 'op', 'pepe', 'pew', 'pika', 'pit', 'pls', 'ponke',
  'pyth', 'pyusd', 'qtum', 'quack', 'raca', 'rndr', 'rune', 'rvn', 's', 'sand',
  'sei', 'sfund', 'shib', 'sidus', 'sol', 'strk', 'stx', 'sui', 'sun', 'sundog',
  'super', 'sushi', 'sxp', 'tenshi', 'tfuel', 'theta', 'tia', 'tko', 'ton', 'trump',
  'trx', 'tusd', 'uni', 'usdc', 'usdt', 'velo', 'vet', 'vib', 'vlx', 'vps',
  'waves', 'wbtc', 'wemix', 'wif', 'win', 'wld', 'wolf', 'x', 'xaut', 'xdc',
  'xec', 'xlm', 'xmr', 'xrp', 'xtz', 'xvg', 'xyo', 'yfi', 'zec', 'zent',
  'zil', 'zksync', 'zro'
];

const cleanSymbol = (symbol) => {
  if (!symbol) return 'btc';
  return symbol
    .replace(/ERC20|TRC20|BEP20|MAINNET|BSC|ARBITRUM|POLYGON|SOL|ARB|OP|BASE|ARC20|MATIC|CELO|LNA|USDCE|-.*$/gi, '')
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
