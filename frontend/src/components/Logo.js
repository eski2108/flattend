import React from 'react';

const Logo = ({ size = 55, showText = false }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      cursor: 'pointer'
    }}>
      {/* CHX Logo - Original Size */}
      <img
        src="/logo1-transparent.png"
        alt="Coin Hub X Logo"
        style={{
          height: size,
          width: 'auto',
          objectFit: 'contain',
          filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.3))',
          imageRendering: 'crisp-edges'
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
