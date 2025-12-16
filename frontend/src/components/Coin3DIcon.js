import React, { useState } from 'react';
import { cleanSymbol, LOCAL_LOGOS } from '@/utils/coinLogos';

/**
 * 3D Coin Icon Component
 * 
 * RULES:
 * 1. Top coins: Local 3D PNGs
 * 2. All other coins: NOWPayments SVG (they have most altcoins)
 * 3. Fallback: CoinCap CDN
 * 4. Last resort: Styled placeholder
 * 
 * UNIFORM 3D CSS EFFECT on ALL logos
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
        // CryptoCompare as last CDN attempt
        return `https://www.cryptocompare.com/media/37746238/${clean}.png`;
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
  
  // UNIFORM 3D BADGE STYLE - Applied to ALL logos
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
  
  // UNIFORM 3D CSS EFFECT - Same drop-shadow + glow for ALL
  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.45)) drop-shadow(0 0 10px rgba(0,255,200,0.25))',
    borderRadius: '50%'
  };
  
  // Placeholder style - same 3D treatment for consistency
  const placeholderStyle = {
    fontSize: `${Math.floor(size * 0.4)}px`,
    fontWeight: '700',
    color: '#00E5FF',
    textTransform: 'uppercase',
    textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 0 15px rgba(0,229,255,0.5)',
    letterSpacing: '-0.5px'
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
