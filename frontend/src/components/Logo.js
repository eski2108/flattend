import React from 'react';

const Logo = ({ size = 55, showText = false, style = {} }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      cursor: 'pointer'
    }}>
      {/* CHX Logo */}
      <img
        src="/logo1-transparent.png"
        alt="Coin Hub IoClose as X Logo"
        style={{
          height: size,
          width: 'auto',
          objectFit: 'contain',
          imageRendering: 'crisp-edges',
          ...style
        }}
      />

      {/* Optional Logo Text */}
      {showText && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          lineHeight: '1'
        }}>
          <div style={{
            fontSize: size * 0.5,
            fontWeight: '900',
            background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '1px'
          }}>
            COIN HUB X
          </div>
        </div>
      )}
    </div>
  );
};

export default Logo;
