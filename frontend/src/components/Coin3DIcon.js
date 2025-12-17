import React from 'react';

/**
 * ========================================
 * 🔒 LOCKED - DO NOT MODIFY WITHOUT APPROVAL
 * ========================================
 * 
 * 3D Coin Icon Component
 * SOURCE: IconScout 3D Crypto Icons
 * TOTAL: 193 coins
 * 
 * LOCKED: December 2025
 */

// 193 coins with REAL 3D logos from IconScout
const COINS_WITH_3D_LOGOS = [
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

const Coin3DIcon = ({ symbol, size = 40, style = {} }) => {
  const clean = cleanSymbol(symbol);
  const has3DLogo = COINS_WITH_3D_LOGOS.includes(clean);
  
  const logoSrc = has3DLogo 
    ? `/assets/coins/3d/${clean}.png`
    : '/assets/coins/3d/placeholder.svg';
  
  // REDUCED GLOW - subtle and professional
  const badgeStyle = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
    borderRadius: '50%',
    background: 'linear-gradient(145deg, #2a2f45, #1a1f35)',
    border: '1.5px solid rgba(0, 229, 255, 0.3)',
    boxShadow: `
      0 0 8px rgba(0,229,255,0.3),
      0 0 16px rgba(0,229,255,0.15),
      0 2px 8px rgba(0,0,0,0.4)
    `,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${Math.floor(size * 0.1)}px`,
    overflow: 'hidden',
    flexShrink: 0,
    ...style
  };
  
  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    borderRadius: '50%'
  };
  
  return (
    <div style={badgeStyle}>
      <img
        src={logoSrc}
        alt={clean.toUpperCase()}
        style={imgStyle}
        loading="lazy"
      />
    </div>
  );
};

export default Coin3DIcon;
