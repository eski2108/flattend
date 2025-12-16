import React, { useState } from 'react';
import { cleanSymbol, LOCAL_LOGOS } from '@/utils/coinLogos';

/**
 * ========================================
 * 🔒 LOCKED - DO NOT MODIFY WITHOUT APPROVAL
 * ========================================
 * 
 * 3D Coin Icon Component - PREMIUM STYLING
 * 
 * RULES:
 * 1. Every coin has unique logo (local PNG or NOWPayments CDN)
 * 2. ALL logos have STRONG 3D effect - depth, shadow, highlight, glow
 * 3. NO flat icons allowed
 * 4. Consistent premium look across entire app
 * 
 * LOCKED BY: CoinHubX Master Engineer
 * DATE: December 2025
 */
const Coin3DIcon = ({ symbol, size = 40, style = {} }) => {
  const [fallbackStage, setFallbackStage] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  
  const clean = cleanSymbol(symbol);
  const lowerSymbol = symbol?.toLowerCase() || 'btc';
  
  // Fallback chain: Local PNG → NOWPayments → CoinCap → Placeholder
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
  // 🔒 LOCKED 3D BADGE STYLE - PREMIUM LOOK
  // ========================================
  const badgeStyle = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
    borderRadius: '50%',
    // Deep gradient for 3D depth
    background: `
      radial-gradient(ellipse at 30% 20%, rgba(100, 120, 180, 0.4) 0%, transparent 50%),
      linear-gradient(145deg, #3a4065 0%, #1a1f35 40%, #0a0f1a 100%)
    `,
    // Glowing cyan border
    border: '2px solid rgba(0, 229, 255, 0.4)',
    // STRONG 3D shadows + GLOW
    boxShadow: `
      inset 0 4px 8px rgba(255,255,255,0.15),
      inset 0 -4px 8px rgba(0,0,0,0.5),
      0 4px 8px rgba(0,0,0,0.4),
      0 8px 24px rgba(0,0,0,0.6),
      0 0 30px rgba(0,229,255,0.35),
      0 0 60px rgba(0,229,255,0.2),
      0 0 100px rgba(0,229,255,0.1)
    `,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${Math.floor(size * 0.15)}px`,
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
    // Smooth animation
    transition: 'all 0.3s ease',
    ...style
  };
  
  // ========================================
  // 🔒 LOCKED 3D IMAGE STYLE - STRONG EFFECT
  // ========================================
  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    // HEAVY drop shadows for 3D depth + GLOW
    filter: `
      drop-shadow(0 2px 4px rgba(0,0,0,0.8))
      drop-shadow(0 4px 8px rgba(0,0,0,0.6))
      drop-shadow(0 8px 16px rgba(0,0,0,0.4))
      drop-shadow(0 0 8px rgba(0,255,200,0.4))
      drop-shadow(0 0 16px rgba(0,229,255,0.3))
    `,
    borderRadius: '50%',
    transform: 'translateZ(0)'
  };
  
  // ========================================
  // 🔒 LOCKED PLACEHOLDER STYLE
  // ========================================
  const placeholderStyle = {
    fontSize: `${Math.floor(size * 0.42)}px`,
    fontWeight: '800',
    color: '#00E5FF',
    textTransform: 'uppercase',
    textShadow: `
      0 2px 4px rgba(0,0,0,0.9),
      0 4px 8px rgba(0,0,0,0.6),
      0 0 20px rgba(0,229,255,0.8),
      0 0 40px rgba(0,229,255,0.5),
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
