import React from 'react';

/**
 * ========================================
 * 🔒 LOCKED - DO NOT MODIFY WITHOUT APPROVAL
 * ========================================
 * 
 * 3D Coin Icon Component
 * 
 * RULES:
 * 1. ONLY use local 3D-rendered logos from /assets/coins/3d/
 * 2. NO CDN pulls, NO random downloads, NO flat SVGs
 * 3. If coin has no 3D logo -> show placeholder
 * 4. ONE logo per coin, no reuse
 * 5. Consistent outer glow on ALL coins
 * 
 * LOCKED: December 2025
 */

// List of coins with REAL 3D-rendered logos (>50KB, baked lighting/depth)
const COINS_WITH_3D_LOGOS = [
  'ada', 'atom', 'bch', 'bnb', 'btc', 'dai', 'doge', 'dot', 
  'eth', 'link', 'ltc', 'matic', 'shib', 'sol', 'trx', 'uni', 
  'usdc', 'usdt', 'xrp'
];

const Coin3DIcon = ({ symbol, size = 40, style = {} }) => {
  const clean = symbol?.toLowerCase().replace(/erc20|trc20|bep20|mainnet|bsc|arbitrum|polygon|sol|arb|op|base|-.*$/gi, '').trim() || 'btc';
  
  // Check if we have a real 3D logo for this coin
  const has3DLogo = COINS_WITH_3D_LOGOS.includes(clean);
  
  // ONLY use local 3D logos - NO CDN
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
    // STRONG consistent glow
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
  
  // ========================================
  // 🔒 LOCKED IMAGE STYLE
  // ========================================
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
