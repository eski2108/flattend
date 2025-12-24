/**
 * TradingButtons.js - PREMIUM NEON BUTTONS
 * 
 * MATCHES THE TOP INFO BOXES STYLE:
 * - Gradient background with glow
 * - Neon border
 * - Bottom glow bar
 * - Glass/frosted effect
 */

import React from 'react';

// BUY: Green/Cyan glow style (matches info box pattern)
export function BuyButton({ onClick, disabled, loading, label, isMobile = false }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const height = isMobile ? '52px' : '48px';
  const isDisabledState = disabled || loading;

  // Color: Green/Teal like the cyan info box but green
  const baseColor = '32, 227, 162'; // #20E3A2
  const glowColor = '#20E3A2';

  const getOpacity = () => {
    if (isDisabledState) return 0.5;
    if (isPressed) return 0.95;
    if (isHovered) return 1;
    return 0.9;
  };

  const getTransform = () => {
    if (isPressed) return 'scale(0.98)';
    if (isHovered) return 'translateY(-1px)';
    return 'none';
  };

  return (
    <button
      data-testid="buy-btn"
      onClick={onClick}
      disabled={isDisabledState}
      style={{
        height,
        flex: 1,
        minWidth: 0,
        borderRadius: '12px',
        border: `1px solid rgba(${baseColor}, 0.4)`,
        background: `linear-gradient(180deg, rgba(${baseColor}, 0.08) 0%, rgba(${baseColor}, 0.25) 100%)`,
        boxShadow: isDisabledState ? 'none' : `0 0 20px rgba(${baseColor}, 0.25), inset 0 0 15px rgba(${baseColor}, 0.08)`,
        color: glowColor,
        fontSize: '14px',
        fontWeight: '600',
        cursor: isDisabledState ? 'not-allowed' : 'pointer',
        opacity: getOpacity(),
        transform: getTransform(),
        transition: 'all 150ms ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={() => !isDisabledState && setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onMouseDown={() => !isDisabledState && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      {/* Bottom glow bar - matches info boxes */}
      <span style={{
        position: 'absolute',
        bottom: 0,
        left: '15%',
        right: '15%',
        height: '2px',
        background: glowColor,
        boxShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}`,
        filter: 'blur(1px)',
        opacity: isDisabledState ? 0.3 : 1
      }} />
      {loading && (
        <span style={{
          display: 'inline-block',
          width: '14px',
          height: '14px',
          border: `2px solid rgba(${baseColor}, 0.3)`,
          borderTopColor: glowColor,
          borderRadius: '50%',
          animation: 'tradingBtnSpin 0.8s linear infinite'
        }} />
      )}
      {loading ? 'Processing...' : label || 'Buy BTC'}
    </button>
  );
}

// SELL: Red/Orange glow style (matches info box pattern)
export function SellButton({ onClick, disabled, loading, label, isMobile = false }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const height = isMobile ? '52px' : '48px';
  const isDisabledState = disabled || loading;

  // Color: Red/Coral like the red info box
  const baseColor = '255, 50, 80'; // #ff3250
  const glowColor = '#ff3250';

  const getOpacity = () => {
    if (isDisabledState) return 0.5;
    if (isPressed) return 0.95;
    if (isHovered) return 1;
    return 0.9;
  };

  const getTransform = () => {
    if (isPressed) return 'scale(0.98)';
    if (isHovered) return 'translateY(-1px)';
    return 'none';
  };

  return (
    <button
      data-testid="sell-btn"
      onClick={onClick}
      disabled={isDisabledState}
      style={{
        height,
        flex: 1,
        minWidth: 0,
        borderRadius: '12px',
        border: `1px solid rgba(${baseColor}, 0.4)`,
        background: `linear-gradient(180deg, rgba(${baseColor}, 0.08) 0%, rgba(${baseColor}, 0.25) 100%)`,
        boxShadow: isDisabledState ? 'none' : `0 0 20px rgba(${baseColor}, 0.25), inset 0 0 15px rgba(${baseColor}, 0.08)`,
        color: glowColor,
        fontSize: '14px',
        fontWeight: '600',
        cursor: isDisabledState ? 'not-allowed' : 'pointer',
        opacity: getOpacity(),
        transform: getTransform(),
        transition: 'all 150ms ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={() => !isDisabledState && setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onMouseDown={() => !isDisabledState && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      {/* Bottom glow bar - matches info boxes */}
      <span style={{
        position: 'absolute',
        bottom: 0,
        left: '15%',
        right: '15%',
        height: '2px',
        background: glowColor,
        boxShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}`,
        filter: 'blur(1px)',
        opacity: isDisabledState ? 0.3 : 1
      }} />
      {loading && (
        <span style={{
          display: 'inline-block',
          width: '14px',
          height: '14px',
          border: `2px solid rgba(${baseColor}, 0.3)`,
          borderTopColor: glowColor,
          borderRadius: '50%',
          animation: 'tradingBtnSpin 0.8s linear infinite'
        }} />
      )}
      {loading ? 'Processing...' : label || 'Sell BTC'}
    </button>
  );
}

export function TradingButtonsContainer({ children, isMobile = false }) {
  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      marginTop: '14px'
    }}>
      {children}
    </div>
  );
}

// Spinner animation
if (typeof document !== 'undefined' && !document.querySelector('style[data-trading-buttons]')) {
  const style = document.createElement('style');
  style.setAttribute('data-trading-buttons', 'true');
  style.textContent = '@keyframes tradingBtnSpin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}

export default { BuyButton, SellButton, TradingButtonsContainer };
