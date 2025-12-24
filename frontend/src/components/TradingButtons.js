/**
 * TradingButtons.js - SHARED BUY/SELL BUTTON COMPONENT
 * 
 * Used by: SpotTradingPro, MobileTradingPage
 * 
 * EXACT SPEC - DO NOT MODIFY WITHOUT APPROVAL
 */

import React from 'react';

const buttonBaseStyle = {
  height: '48px',
  minWidth: 0,
  flex: 1,
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: '600',
  letterSpacing: '0.2px',
  cursor: 'pointer',
  position: 'relative',
  overflow: 'hidden',
  transition: 'transform 140ms ease, filter 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
  outline: 'none'
};

const buyButtonStyle = {
  ...buttonBaseStyle,
  background: 'linear-gradient(135deg, #00F5A0 0%, #00D1FF 100%)',
  border: '1px solid rgba(0, 245, 160, 0.35)',
  boxShadow: '0 10px 24px rgba(0, 245, 160, 0.18), 0 0 0 1px rgba(0, 209, 255, 0.10) inset',
  color: '#071018'
};

const sellButtonStyle = {
  ...buttonBaseStyle,
  background: 'linear-gradient(135deg, #FF4D6D 0%, #FF9F1C 100%)',
  border: '1px solid rgba(255, 77, 109, 0.32)',
  boxShadow: '0 10px 24px rgba(255, 77, 109, 0.16), 0 0 0 1px rgba(255, 159, 28, 0.10) inset',
  color: '#071018'
};

const disabledStyle = {
  opacity: 0.45,
  cursor: 'not-allowed',
  boxShadow: 'none',
  filter: 'grayscale(0.25)'
};

const mobileButtonStyle = {
  height: '52px',
  borderRadius: '14px',
  fontSize: '15px'
};

export function BuyButton({ onClick, disabled, loading, label, isMobile = false }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const getStyle = () => {
    let style = { ...buyButtonStyle };
    
    if (isMobile) {
      style = { ...style, ...mobileButtonStyle };
    }
    
    if (disabled || loading) {
      style = { ...style, ...disabledStyle };
    } else if (isPressed) {
      style = {
        ...style,
        transform: 'translateY(0px) scale(0.99)',
        filter: 'brightness(0.98)'
      };
    } else if (isHovered) {
      style = {
        ...style,
        transform: 'translateY(-1px)',
        filter: 'brightness(1.03) saturate(1.05)',
        boxShadow: '0 14px 30px rgba(0, 245, 160, 0.22), 0 0 0 1px rgba(0, 209, 255, 0.10) inset'
      };
    }
    
    return style;
  };

  return (
    <button
      data-testid="buy-btn"
      onClick={onClick}
      disabled={disabled || loading}
      style={getStyle()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onFocus={(e) => {
        e.target.style.boxShadow = '0 0 0 3px rgba(0, 245, 160, 0.22), 0 10px 24px rgba(0, 245, 160, 0.18)';
      }}
      onBlur={(e) => {
        e.target.style.boxShadow = '0 10px 24px rgba(0, 245, 160, 0.18), 0 0 0 1px rgba(0, 209, 255, 0.10) inset';
      }}
    >
      {/* Inner highlight overlay */}
      <span style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.06) 35%, rgba(0,0,0,0.00) 100%)',
        pointerEvents: 'none',
        borderRadius: 'inherit'
      }} />
      {/* Vignette */}
      <span style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.10), rgba(0,0,0,0.00) 60%)',
        pointerEvents: 'none',
        borderRadius: 'inherit'
      }} />
      {loading && (
        <span style={{
          display: 'inline-block',
          width: '14px',
          height: '14px',
          border: '2px solid rgba(7,16,24,0.3)',
          borderTopColor: 'rgba(7,16,24,0.65)',
          borderRadius: '50%',
          marginRight: '8px',
          animation: 'spin 1s linear infinite'
        }} />
      )}
      <span style={{ position: 'relative', zIndex: 1 }}>
        {loading ? 'Processing...' : label || 'Buy'}
      </span>
    </button>
  );
}

export function SellButton({ onClick, disabled, loading, label, isMobile = false }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const getStyle = () => {
    let style = { ...sellButtonStyle };
    
    if (isMobile) {
      style = { ...style, ...mobileButtonStyle };
    }
    
    if (disabled || loading) {
      style = { ...style, ...disabledStyle };
    } else if (isPressed) {
      style = {
        ...style,
        transform: 'translateY(0px) scale(0.99)',
        filter: 'brightness(0.98)'
      };
    } else if (isHovered) {
      style = {
        ...style,
        transform: 'translateY(-1px)',
        filter: 'brightness(1.03) saturate(1.05)',
        boxShadow: '0 14px 30px rgba(255, 77, 109, 0.20), 0 0 0 1px rgba(255, 159, 28, 0.10) inset'
      };
    }
    
    return style;
  };

  return (
    <button
      data-testid="sell-btn"
      onClick={onClick}
      disabled={disabled || loading}
      style={getStyle()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onFocus={(e) => {
        e.target.style.boxShadow = '0 0 0 3px rgba(255, 77, 109, 0.22), 0 10px 24px rgba(255, 77, 109, 0.16)';
      }}
      onBlur={(e) => {
        e.target.style.boxShadow = '0 10px 24px rgba(255, 77, 109, 0.16), 0 0 0 1px rgba(255, 159, 28, 0.10) inset';
      }}
    >
      {/* Inner highlight overlay */}
      <span style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 35%, rgba(0,0,0,0.00) 100%)',
        pointerEvents: 'none',
        borderRadius: 'inherit'
      }} />
      {/* Vignette */}
      <span style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.10), rgba(0,0,0,0.00) 60%)',
        pointerEvents: 'none',
        borderRadius: 'inherit'
      }} />
      {loading && (
        <span style={{
          display: 'inline-block',
          width: '14px',
          height: '14px',
          border: '2px solid rgba(7,16,24,0.3)',
          borderTopColor: 'rgba(7,16,24,0.65)',
          borderRadius: '50%',
          marginRight: '8px',
          animation: 'spin 1s linear infinite'
        }} />
      )}
      <span style={{ position: 'relative', zIndex: 1 }}>
        {loading ? 'Processing...' : label || 'Sell'}
      </span>
    </button>
  );
}

export function TradingButtonsContainer({ children, isMobile = false }) {
  return (
    <div style={{
      display: 'flex',
      gap: isMobile ? '10px' : '12px',
      marginTop: '14px',
      flexDirection: isMobile && typeof window !== 'undefined' && window.innerWidth < 420 ? 'column' : 'row'
    }}>
      {children}
    </div>
  );
}

// Add spinner animation to document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  if (!document.querySelector('style[data-trading-buttons]')) {
    style.setAttribute('data-trading-buttons', 'true');
    document.head.appendChild(style);
  }
}

export default { BuyButton, SellButton, TradingButtonsContainer };
