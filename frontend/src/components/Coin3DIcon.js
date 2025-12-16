import React, { useState } from 'react';
import { cleanSymbol, LOCAL_LOGOS } from '@/utils/coinLogos';

/**
 * ========================================
 * 🔒 LOCKED - DO NOT MODIFY WITHOUT APPROVAL
 * ========================================
 * 
 * 3D Coin Icon - ULTRA PREMIUM STYLING
 * 
 * - TRUE 3D effect with depth + bevel
 * - INTENSE glow that makes coins POP
 * - Every coin has unique logo
 * - Consistent across Wallet + Instant Buy
 * 
 * DO NOT TOUCH TRADING PAGE
 * 
 * LOCKED: December 2025
 */
const Coin3DIcon = ({ symbol, size = 40, style = {} }) => {
  const [fallbackStage, setFallbackStage] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  
  const clean = cleanSymbol(symbol);
  const lowerSymbol = symbol?.toLowerCase() || 'btc';
  
  const getImageSrc = () => {
    switch (fallbackStage) {
      case 0:
        if (LOCAL_LOGOS.includes(clean)) {
          return `/crypto-logos/${clean}.png`;
        }
        return `https://nowpayments.io/images/coins/${lowerSymbol}.svg`;
      case 1:
        return `https://nowpayments.io/images/coins/${clean}.svg`;
      case 2:
        return `https://assets.coincap.io/assets/icons/${clean}@2x.png`;
      case 3:
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
  
  // ========================================
  // 🔒 ULTRA 3D BADGE - INTENSE GLOW + BEVEL
  // ========================================
  const badgeStyle = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
    borderRadius: '50%',
    // TRUE 3D gradient with bevel effect
    background: `
      radial-gradient(ellipse at 25% 15%, rgba(150, 180, 255, 0.5) 0%, transparent 40%),
      radial-gradient(ellipse at 75% 85%, rgba(0, 0, 0, 0.6) 0%, transparent 40%),
      linear-gradient(160deg, #4a5080 0%, #252a45 30%, #151a2e 60%, #0a0e1a 100%)
    `,
    // STRONG glowing border
    border: '2.5px solid rgba(0, 229, 255, 0.6)',
    // ULTRA INTENSE shadows + glow
    boxShadow: `
      inset 0 6px 12px rgba(255,255,255,0.25),
      inset 0 -6px 12px rgba(0,0,0,0.7),
      inset 2px 0 8px rgba(255,255,255,0.1),
      inset -2px 0 8px rgba(0,0,0,0.3),
      0 4px 8px rgba(0,0,0,0.5),
      0 8px 20px rgba(0,0,0,0.7),
      0 0 20px rgba(0,229,255,0.6),
      0 0 40px rgba(0,229,255,0.5),
      0 0 60px rgba(0,229,255,0.4),
      0 0 80px rgba(0,229,255,0.25)
    `,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${Math.floor(size * 0.14)}px`,
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
    transition: 'all 0.3s ease',
    ...style
  };
  
  // ========================================
  // 🔒 ULTRA 3D IMAGE - DEEP SHADOWS + GLOW
  // ========================================
  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    filter: `
      drop-shadow(0 2px 3px rgba(0,0,0,0.9))
      drop-shadow(0 4px 6px rgba(0,0,0,0.7))
      drop-shadow(0 6px 12px rgba(0,0,0,0.5))
      drop-shadow(0 0 6px rgba(0,255,220,0.6))
      drop-shadow(0 0 12px rgba(0,229,255,0.5))
      drop-shadow(0 0 20px rgba(0,229,255,0.35))
    `,
    borderRadius: '50%',
    transform: 'translateZ(0)'
  };
  
  // ========================================
  // 🔒 PLACEHOLDER - SAME 3D TREATMENT
  // ========================================
  const placeholderStyle = {
    fontSize: `${Math.floor(size * 0.42)}px`,
    fontWeight: '900',
    color: '#00E5FF',
    textTransform: 'uppercase',
    textShadow: `
      0 2px 4px rgba(0,0,0,1),
      0 4px 8px rgba(0,0,0,0.8),
      0 0 15px rgba(0,229,255,1),
      0 0 30px rgba(0,229,255,0.8),
      0 0 45px rgba(0,229,255,0.5),
      0 0 60px rgba(0,229,255,0.3)
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
