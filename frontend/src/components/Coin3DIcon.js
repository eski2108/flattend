import React from 'react';

/**
 * ========================================
 * 🔒 LOCKED - DO NOT MODIFY WITHOUT APPROVAL
 * ========================================
 * 
 * 3D Coin Icon Component
 * SOURCE: IconScout 3D Crypto Icons
 * 
 * LOCKED: December 2025
 */

// 93 coins with REAL 3D logos from IconScout
const COINS_WITH_3D_LOGOS = [
  'aave', 'ada', 'algo', 'ape', 'aptos', 'arb', 'atom', 'avax', 'axs', 'bad',
  'bch', 'beam', 'bnb', 'bonk', 'btc', 'cake', 'chz', 'comp', 'crv', 'ctsi',
  'dai', 'dash', 'doge', 'dogs', 'dot', 'eos', 'eth', 'fet', 'fil', 'floki',
  'flow', 'ftm', 'gala', 'gmx', 'hbar', 'hmstr', 'hnt', 'icp', 'icx', 'id',
  'imx', 'inj', 'jto', 'jup', 'kaspa', 'ldo', 'link', 'ltc', 'mana', 'matic',
  'mina', 'mkr', 'mnt', 'near', 'neo', 'not', 'nwc', 'om', 'ondo', 'op',
  'pepe', 'pew', 'pyth', 'rndr', 'rune', 'sand', 'sei', 'shib', 'sidus', 'sol',
  'stx', 'sui', 'sushi', 'tfuel', 'theta', 'tia', 'ton', 'trump', 'trx', 'tusd',
  'uni', 'usdc', 'usdt', 'vet', 'vlx', 'waves', 'wif', 'wld', 'xlm', 'xmr',
  'xrp', 'zec', 'zent'
];

const cleanSymbol = (symbol) => {
  if (!symbol) return 'btc';
  return symbol
    .replace(/ERC20|TRC20|BEP20|MAINNET|BSC|ARBITRUM|POLYGON|SOL|ARB|OP|BASE|-.*$/gi, '')
    .trim()
    .toLowerCase();
};

const Coin3DIcon = ({ symbol, size = 40, style = {} }) => {
  const clean = cleanSymbol(symbol);
  const has3DLogo = COINS_WITH_3D_LOGOS.includes(clean);
  
  const logoSrc = has3DLogo 
    ? `/assets/coins/3d/${clean}.png`
    : '/assets/coins/3d/placeholder.svg';
  
  const badgeStyle = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
    borderRadius: '50%',
    background: 'linear-gradient(145deg, #2a2f45, #1a1f35)',
    border: '2px solid rgba(0, 229, 255, 0.5)',
    boxShadow: `
      0 0 15px rgba(0,229,255,0.6),
      0 0 30px rgba(0,229,255,0.4),
      0 0 45px rgba(0,229,255,0.2),
      0 4px 15px rgba(0,0,0,0.5)
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
