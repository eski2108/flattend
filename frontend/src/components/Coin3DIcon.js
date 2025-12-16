import React, { useState } from 'react';
import { cleanSymbol, LOCAL_LOGOS } from '@/utils/coinLogos';

/**
 * 3D Coin Icon Component - PREMIUM LOOK
 * 
 * RULES:
 * 1. Top coins: Local 3D PNGs
 * 2. All other coins: NOWPayments SVG
 * 3. Fallback: CoinCap CDN
 * 4. STRONG 3D CSS effect on ALL logos - NO FLAT ICONS
 */
const Coin3DIcon = ({ symbol, size = 40, style = {} }) => {
  const [fallbackStage, setFallbackStage] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  
  const clean = cleanSymbol(symbol);
  const lowerSymbol = symbol?.toLowerCase() || 'btc';
  
  // Get image source based on fallback stage
  const getImageSrc = () => {
    switch (fallbackStage) {
      case 0:
        // Local PNG for top coins, NOWPayments for others
        if (LOCAL_LOGOS.includes(clean)) {
          return `/crypto-logos/${clean}.png`;
        }
        return `https://nowpayments.io/images/coins/${lowerSymbol}.svg`;
      case 1:
        // NOWPayments with cleaned symbol
        return `https://nowpayments.io/images/coins/${clean}.svg`;
      case 2:
        // CoinCap CDN
        return `https://assets.coincap.io/assets/icons/${clean}@2x.png`;
      case 3:
        // CoinGecko thumb
        return `https://assets.coingecko.com/coins/images/1/thumb/${clean}.png`;
      default:
        return null;
    }
  };
  
  const handleError = () => {
    if (fallbackStage < 3) {
      setFallbackStage(prev => prev + 1);
    } else {
      setShowPlaceholder(true);
    }
  };
  
  const imgSrc = getImageSrc();
  
  // STRONG 3D BADGE - Gradient + Multiple Shadows + Glow
  const badgeStyle = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
    borderRadius: '50%',
    background: 'linear-gradient(145deg, #3a4065 0%, #1a1f35 50%, #0d1220 100%)',
    border: '1.5px solid rgba(0, 229, 255, 0.2)',
    boxShadow: `
      inset 0 3px 6px rgba(255,255,255,0.1),
      inset 0 -3px 6px rgba(0,0,0,0.4),
      0 6px 20px rgba(0,0,0,0.5),
      0 0 25px rgba(0,229,255,0.2),
      0 0 50px rgba(0,229,255,0.1)
    `,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${Math.floor(size * 0.15)}px`,
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
    ...style
  };
  
  // STRONG 3D IMAGE EFFECT - Heavy drop shadows + glow
  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    filter: `
      drop-shadow(0 4px 8px rgba(0,0,0,0.6))
      drop-shadow(0 8px 16px rgba(0,0,0,0.4))
      drop-shadow(0 0 12px rgba(0,255,200,0.3))
    `,
    borderRadius: '50%',
    transform: 'translateZ(0)' // GPU acceleration
  };
  
  // Placeholder with same 3D treatment
  const placeholderStyle = {
    fontSize: `${Math.floor(size * 0.42)}px`,
    fontWeight: '800',
    color: '#00E5FF',
    textTransform: 'uppercase',
    textShadow: `
      0 2px 4px rgba(0,0,0,0.8),
      0 4px 8px rgba(0,0,0,0.4),
      0 0 20px rgba(0,229,255,0.6),
      0 0 40px rgba(0,229,255,0.3)
    `,
    letterSpacing: '-1px'
  };
  
  return (
    <div style={badgeStyle}>
      {!showPlaceholder && imgSrc ? (
        <img
          src={imgSrc}
          alt={clean.toUpperCase()}
          onError={handleError}
          style={imgStyle}
          loading="lazy"
        />
      ) : (
        <span style={placeholderStyle}>
          {clean.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
};

export default Coin3DIcon;
