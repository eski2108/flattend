import React, { useState, useCallback } from 'react';
import { getCoinLogo, getCoinLogoAlt, getCoinLogoFallback, getCoinLogoFallback2, cleanSymbol } from '@/utils/coinLogos';

/**
 * 3D Coin Icon Component
 * 
 * Fallback chain (5 stages before text):
 * 1. Local PNG (/crypto-logos/{symbol}.png) or NOWPayments
 * 2. NOWPayments SVG (has ALL 247+ coins)
 * 3. CoinGecko image
 * 4. CoinCap CDN
 * 5. NOWPayments with cleaned symbol
 * 6. Styled text placeholder (LAST RESORT)
 * 
 * CSS 3D Effect:
 * - Gradient badge background
 * - Drop shadows
 * - Subtle glow
 */
const Coin3DIcon = ({ symbol, size = 40, style = {} }) => {
  const [fallbackStage, setFallbackStage] = useState(0);
  const [showTextFallback, setShowTextFallback] = useState(false);
  
  const clean = cleanSymbol(symbol);
  
  // Get current image source based on fallback stage - 5 fallbacks before text!
  const getImageSrc = useCallback(() => {
    switch (fallbackStage) {
      case 0:
        return getCoinLogo(symbol);
      case 1:
        // NOWPayments with original symbol
        return `https://nowpayments.io/images/coins/${symbol?.toLowerCase()}.svg`;
      case 2:
        // NOWPayments with cleaned symbol
        return `https://nowpayments.io/images/coins/${clean}.svg`;
      case 3:
        return getCoinLogoFallback(symbol);
      case 4:
        return getCoinLogoFallback2(symbol);
      default:
        return null;
    }
  }, [fallbackStage, symbol, clean]);
  
  const handleError = () => {
    if (fallbackStage < 4) {
      setFallbackStage(prev => prev + 1);
    } else {
      // All 5 image sources failed, show text
      setShowTextFallback(true);
    }
  };
  
  const imgSrc = getImageSrc();
  const displaySymbol = cleanSymbol(symbol)?.toUpperCase() || '?';
  
  // Badge wrapper with 3D effect
  const badgeStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    background: 'linear-gradient(145deg, #2a2f45, #1a1f35)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.4), 0 0 20px rgba(0,229,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${Math.floor(size * 0.12)}px`,
    overflow: 'hidden',
    flexShrink: 0,
    ...style
  };
  
  // Image style with 3D filter
  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.45)) drop-shadow(0 0 10px rgba(0,255,200,0.25))',
    borderRadius: '50%'
  };
  
  // Text fallback style
  const textStyle = {
    fontSize: `${Math.floor(size * 0.38)}px`,
    fontWeight: '700',
    color: '#00E5FF',
    textTransform: 'uppercase',
    textShadow: '0 0 10px rgba(0,229,255,0.5)',
    letterSpacing: '-0.5px'
  };
  
  return (
    <div style={badgeStyle}>
      {!showTextFallback && imgSrc ? (
        <img
          src={imgSrc}
          alt={displaySymbol}
          onError={handleError}
          style={imgStyle}
          loading="lazy"
        />
      ) : (
        <span style={textStyle}>
          {displaySymbol.slice(0, 2)}
        </span>
      )}
    </div>
  );
};

export default Coin3DIcon;
