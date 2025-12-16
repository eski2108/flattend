import React, { useState } from 'react';

/**
 * 3D Coin Icon Component
 * Uses the same 3D PNG logos as the footer
 * Stored in /public/crypto-logos/
 */
const Coin3DIcon = ({ symbol, size = 40, style = {} }) => {
  const [imgError, setImgError] = useState(false);
  
  // Clean the symbol (remove network suffixes)
  const cleanSymbol = symbol?.replace(/ERC20|TRC20|BEP20|MAINNET|BSC|ARBITRUM|POLYGON|SOL|ARB|-.*$/gi, '').trim().toLowerCase();
  
  // Use local 3D PNG logos (same as footer)
  const logoUrl = `/crypto-logos/${cleanSymbol}.png`;
  
  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0,
      ...style
    }}>
      {!imgError ? (
        <img
          src={logoUrl}
          alt={symbol}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
      ) : (
        <span style={{
          fontSize: `${size * 0.45}px`,
          fontWeight: '700',
          color: '#00E5FF',
          textTransform: 'uppercase'
        }}>
          {symbol?.charAt(0) || '?'}
        </span>
      )}
    </div>
  );
};

export default Coin3DIcon;
