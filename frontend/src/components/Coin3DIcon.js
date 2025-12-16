import React, { useState } from 'react';
import { cleanSymbol, LOCAL_LOGOS, COINGECKO_IDS } from '@/utils/coinLogos';

/**
 * 3D Coin Icon Component
 * 
 * RULES:
 * 1. Top coins: Local 3D PNGs
 * 2. All other coins: CoinGecko CDN ONLY
 * 3. Uniform CSS 3D effect on ALL logos
 * 4. Placeholder if CDN fails
 */
const Coin3DIcon = ({ symbol, size = 40, style = {} }) => {
  const [fallbackStage, setFallbackStage] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  
  const clean = cleanSymbol(symbol);
  const geckoId = COINGECKO_IDS[clean] || clean;
  
  // Get image source based on fallback stage
  const getImageSrc = () => {
    // Stage 0: Local PNG for top coins, CoinGecko for others
    if (fallbackStage === 0) {
      if (LOCAL_LOGOS.includes(clean)) {
        return `/crypto-logos/${clean}.png`;
      }
      return `https://assets.coingecko.com/coins/images/1/large/${geckoId}.png`;
    }
    // Stage 1: CoinGecko small image
    if (fallbackStage === 1) {
      return `https://assets.coingecko.com/coins/images/1/small/${geckoId}.png`;
    }
    // Stage 2: CoinGecko thumb
    if (fallbackStage === 2) {
      return `https://assets.coingecko.com/coins/images/1/thumb/${geckoId}.png`;
    }
    // Stage 3: Try with clean symbol directly
    if (fallbackStage === 3) {
      return `https://assets.coingecko.com/coins/images/1/small/${clean}.png`;
    }
    return null;
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
  
  // UNIFORM 3D CSS EFFECT - Same for local AND CDN logos
  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.45)) drop-shadow(0 0 10px rgba(0,255,200,0.25))',
    borderRadius: '50%'
  };
  
  // Placeholder style - same 3D treatment
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
