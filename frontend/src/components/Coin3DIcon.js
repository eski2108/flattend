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

// 108 coins with REAL 3D logos from IconScout
const COINS_WITH_3D_LOGOS = [
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
