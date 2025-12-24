/**
 * TradingButtons.js - SHARED BUY/SELL BUTTON COMPONENT
 * 
 * EXACT SPEC - DO NOT MODIFY WITHOUT APPROVAL
 * 
 * BUY: linear-gradient(135deg, #00F5A0 0%, #00D1FF 100%)
 * SELL: linear-gradient(135deg, #FF4D6D 0%, #FF9F1C 100%)
 */

import React from 'react';

export function BuyButton({ onClick, disabled, loading, label, isMobile = false }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const height = isMobile ? '52px' : '48px';
  const radius = isMobile ? '14px' : '12px';
  const fontSize = isMobile ? '15px' : '14px';

  const getBoxShadow = () => {
    if (disabled || loading) return 'none';
    if (isPressed) return '0 6px 16px rgba(0, 245, 160, 0.14), 0 0 0 1px rgba(0, 209, 255, 0.10) inset';
    if (isHovered) return '0 14px 30px rgba(0, 245, 160, 0.22), 0 0 0 1px rgba(0, 209, 255, 0.10) inset';
    return '0 10px 24px rgba(0, 245, 160, 0.18), 0 0 0 1px rgba(0, 209, 255, 0.10) inset';
  };

  const getTransform = () => {
    if (isPressed) return 'translateY(0px) scale(0.99)';
    if (isHovered) return 'translateY(-1px)';
    return 'translateY(0)';
  };

  const getFilter = () => {
    if (disabled || loading) return 'grayscale(0.25)';
    if (isPressed) return 'brightness(0.98)';
    if (isHovered) return 'brightness(1.03) saturate(1.05)';
    return 'none';
  };

  return (
    <button
      data-testid="buy-btn"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        height,
        minWidth: 0,
        flex: 1,
        borderRadius: radius,
        fontSize,
        fontWeight: '600',
        letterSpacing: '0.2px',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 140ms ease, filter 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
        outline: 'none',
        background: 'linear-gradient(135deg, #00F5A0 0%, #00D1FF 100%)',
        border: '1px solid rgba(0, 245, 160, 0.35)',
        boxShadow: getBoxShadow(),
        color: '#071018',
        opacity: disabled || loading ? 0.45 : 1,
        transform: getTransform(),
        filter: getFilter()
      }}
      onMouseEnter={() => !disabled && !loading && setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onMouseDown={() => !disabled && !loading && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
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
      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        {loading && (
          <span style={{
            display: 'inline-block',
            width: '14px',
            height: '14px',
            border: '2px solid rgba(7,16,24,0.3)',
            borderTopColor: 'rgba(7,16,24,0.65)',
            borderRadius: '50%',
            animation: 'tradingBtnSpin 1s linear infinite'
          }} />
        )}
        {loading ? 'Processing...' : label || 'Buy'}
      </span>
    </button>
  );
}

export function SellButton({ onClick, disabled, loading, label, isMobile = false }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const height = isMobile ? '52px' : '48px';
  const radius = isMobile ? '14px' : '12px';
  const fontSize = isMobile ? '15px' : '14px';

  const getBoxShadow = () => {
    if (disabled || loading) return 'none';
    if (isPressed) return '0 6px 16px rgba(255, 77, 109, 0.12), 0 0 0 1px rgba(255, 159, 28, 0.10) inset';
    if (isHovered) return '0 14px 30px rgba(255, 77, 109, 0.20), 0 0 0 1px rgba(255, 159, 28, 0.10) inset';
    return '0 10px 24px rgba(255, 77, 109, 0.16), 0 0 0 1px rgba(255, 159, 28, 0.10) inset';
  };

  const getTransform = () => {
    if (isPressed) return 'translateY(0px) scale(0.99)';
    if (isHovered) return 'translateY(-1px)';
    return 'translateY(0)';
  };

  const getFilter = () => {
    if (disabled || loading) return 'grayscale(0.25)';
    if (isPressed) return 'brightness(0.98)';
    if (isHovered) return 'brightness(1.03) saturate(1.05)';
    return 'none';
  };

  return (
    <button
      data-testid="sell-btn"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        height,
        minWidth: 0,
        flex: 1,
        borderRadius: radius,
        fontSize,
        fontWeight: '600',
        letterSpacing: '0.2px',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 140ms ease, filter 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
        outline: 'none',
        background: 'linear-gradient(135deg, #FF4D6D 0%, #FF9F1C 100%)',
        border: '1px solid rgba(255, 77, 109, 0.32)',
        boxShadow: getBoxShadow(),
        color: '#071018',
        opacity: disabled || loading ? 0.45 : 1,
        transform: getTransform(),
        filter: getFilter()
      }}
      onMouseEnter={() => !disabled && !loading && setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onMouseDown={() => !disabled && !loading && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
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
      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        {loading && (
          <span style={{
            display: 'inline-block',
            width: '14px',
            height: '14px',
            border: '2px solid rgba(7,16,24,0.3)',
            borderTopColor: 'rgba(7,16,24,0.65)',
            borderRadius: '50%',
            animation: 'tradingBtnSpin 1s linear infinite'
          }} />
        )}
        {loading ? 'Processing...' : label || 'Sell'}
      </span>
    </button>
  );
}

export function TradingButtonsContainer({ children, isMobile = false }) {
  const [isNarrow, setIsNarrow] = React.useState(false);
  
  React.useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 420);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div style={{
      display: 'flex',
      gap: isMobile ? '10px' : '12px',
      marginTop: '14px',
      flexDirection: isMobile && isNarrow ? 'column' : 'row'
    }}>
      {children}
    </div>
  );
}

// Add spinner animation
if (typeof document !== 'undefined' && !document.querySelector('style[data-trading-buttons]')) {
  const style = document.createElement('style');
  style.setAttribute('data-trading-buttons', 'true');
  style.textContent = `@keyframes tradingBtnSpin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}

export default { BuyButton, SellButton, TradingButtonsContainer };
