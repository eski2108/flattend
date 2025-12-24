/**
 * TradingButtons.js - PREMIUM BUY/SELL BUTTONS
 * 
 * EXACT SPEC - DO NOT MODIFY
 * 
 * BUY: #22E6A8 → #16CFA0 gradient
 * SELL: #FF6A6A → #FF8A4C gradient
 */

import React from 'react';

export function BuyButton({ onClick, disabled, loading, label, isMobile = false }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const height = isMobile ? '52px' : '48px';
  const isDisabledState = disabled || loading;

  const getFilter = () => {
    if (isDisabledState) return 'brightness(0.85) saturate(0.7)';
    if (isPressed) return 'brightness(0.95)';
    if (isHovered) return 'brightness(1.05)';
    return 'none';
  };

  const getBoxShadow = () => {
    if (isDisabledState) return 'none';
    return '0 0 18px rgba(34,230,168,0.35), inset 0 1px 0 rgba(255,255,255,0.18)';
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
        border: 'none',
        background: 'linear-gradient(135deg, #22E6A8 0%, #16CFA0 100%)',
        color: '#0B1F1A',
        fontSize: '14px',
        fontWeight: '600',
        cursor: isDisabledState ? 'not-allowed' : 'pointer',
        opacity: isDisabledState ? 0.6 : 1,
        boxShadow: getBoxShadow(),
        filter: getFilter(),
        transition: 'filter 120ms ease, box-shadow 120ms ease, opacity 120ms ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        position: 'relative'
      }}
      onMouseEnter={() => !isDisabledState && setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onMouseDown={() => !isDisabledState && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      {loading && (
        <span style={{
          display: 'inline-block',
          width: '14px',
          height: '14px',
          border: '2px solid rgba(11,31,26,0.3)',
          borderTopColor: '#0B1F1A',
          borderRadius: '50%',
          animation: 'tradingBtnSpin 0.8s linear infinite'
        }} />
      )}
      {loading ? 'Processing...' : label || 'Buy BTC'}
    </button>
  );
}

export function SellButton({ onClick, disabled, loading, label, isMobile = false }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const height = isMobile ? '52px' : '48px';
  const isDisabledState = disabled || loading;

  const getFilter = () => {
    if (isDisabledState) return 'brightness(0.85) saturate(0.7)';
    if (isPressed) return 'brightness(0.95)';
    if (isHovered) return 'brightness(1.05)';
    return 'none';
  };

  const getBoxShadow = () => {
    if (isDisabledState) return 'none';
    return '0 0 18px rgba(255,106,106,0.35), inset 0 1px 0 rgba(255,255,255,0.18)';
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
        border: 'none',
        background: 'linear-gradient(135deg, #FF6A6A 0%, #FF8A4C 100%)',
        color: '#2A0F0F',
        fontSize: '14px',
        fontWeight: '600',
        cursor: isDisabledState ? 'not-allowed' : 'pointer',
        opacity: isDisabledState ? 0.6 : 1,
        boxShadow: getBoxShadow(),
        filter: getFilter(),
        transition: 'filter 120ms ease, box-shadow 120ms ease, opacity 120ms ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        position: 'relative'
      }}
      onMouseEnter={() => !isDisabledState && setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onMouseDown={() => !isDisabledState && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      {loading && (
        <span style={{
          display: 'inline-block',
          width: '14px',
          height: '14px',
          border: '2px solid rgba(42,15,15,0.3)',
          borderTopColor: '#2A0F0F',
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
