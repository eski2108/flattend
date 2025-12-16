import React, { useState } from 'react';
import { getCoinLogo, getCoinLogoAlt } from '@/utils/coinLogos';

/**
 * 3D Coin Icon Component
 * - Local logos first, CoinGecko fallback
 * - CSS 3D effect: drop-shadow + glow + gradient badge
 */
const Coin3DIcon = ({ symbol, size = 40, style = {} }) => {
  const [imgSrc, setImgSrc] = useState(getCoinLogo(symbol));
  const [showFallback, setShowFallback] = useState(false);
  
  const handleError = () => {
    if (imgSrc === getCoinLogo(symbol)) {
      // Try CoinGecko
      setImgSrc(getCoinLogoAlt(symbol));
    } else {
      // Show text fallback
      setShowFallback(true);
    }
  };
  
  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: 'linear-gradient(145deg, #2a2f45, #1a1f35)',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.4), 0 0 20px rgba(0,229,255,0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: `${size * 0.12}px`,
      overflow: 'hidden',
      flexShrink: 0,
      ...style
    }}>
      {!showFallback ? (
        <img
          src={imgSrc}
          alt={symbol}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5)) drop-shadow(0 0 8px rgba(0,255,200,0.2))',
            borderRadius: '50%'
          }}
        />
      ) : (
        <span style={{
          fontSize: `${size * 0.4}px`,
          fontWeight: '700',
          color: '#00E5FF',
          textTransform: 'uppercase',
          textShadow: '0 0 10px rgba(0,229,255,0.5)'
        }}>
          {symbol?.charAt(0) || '?'}
        </span>
      )}
    </div>
  );
};

export default Coin3DIcon;
