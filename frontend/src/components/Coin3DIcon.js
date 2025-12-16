import React from 'react';

/**
 * ========================================
 * 🔒 LOCKED - DO NOT MODIFY WITHOUT APPROVAL
 * ========================================
 * 
 * 3D Coin Icon Component
 * 
 * SOURCE: IconScout 3D Crypto Icons
 * FORMAT: PNG, transparent background, 3D rendered
 * 
 * RULES:
 * 1. ONLY local 3D-rendered logos from /assets/coins/3d/
 * 2. NO CDN, NO CSS fake 3D, NO random downloads
 * 3. If coin has no 3D logo -> placeholder
 * 4. Consistent glow on ALL coins
 * 
 * LOCKED: December 2025
 */

// 81 coins with REAL 3D-rendered logos from IconScout
const COINS_WITH_3D_LOGOS = [
  'aave', 'ada', 'algo', 'ape', 'aptos', 'arb', 'atom', 'avax', 'axs', 'bch',
  'beam', 'bnb', 'bonk', 'btc', 'cake', 'chz', 'comp', 'crv', 'dai', 'dash',
  'doge', 'dogs', 'dot', 'eos', 'eth', 'fet', 'fil', 'floki', 'flow', 'ftm',
  'gala', 'gmx', 'hbar', 'hmstr', 'hnt', 'icp', 'imx', 'inj', 'jto', 'jup',
  'kaspa', 'ldo', 'link', 'ltc', 'mana', 'matic', 'mina', 'mkr', 'mnt', 'near',
  'neo', 'not', 'ondo', 'op', 'pepe', 'pyth', 'rndr', 'rune', 'sand', 'sei',
  'shib', 'sol', 'stx', 'sui', 'sushi', 'theta', 'tia', 'ton', 'trump', 'trx',
  'uni', 'usdc', 'usdt', 'vet', 'waves', 'wif', 'wld', 'xlm', 'xmr', 'xrp', 'zec'
];

// Clean symbol - remove network suffixes
const cleanSymbol = (symbol) => {
  if (!symbol) return 'btc';
  return symbol
    .replace(/ERC20|TRC20|BEP20|MAINNET|BSC|ARBITRUM|POLYGON|SOL|ARB|OP|BASE|-.*$/gi, '')
    .trim()
    .toLowerCase();
};

const Coin3DIcon = ({ symbol, size = 40, style = {} }) => {
  const clean = cleanSymbol(symbol);
  
  // Check if we have a real 3D logo
  const has3DLogo = COINS_WITH_3D_LOGOS.includes(clean);
  
  // ONLY local 3D logos - NO CDN
  const logoSrc = has3DLogo 
    ? `/assets/coins/3d/${clean}.png`
    : '/assets/coins/3d/placeholder.svg';
  
  // ========================================
  // 🔒 LOCKED BADGE STYLE - CONSISTENT GLOW
  // ========================================
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
