import React, { useState } from 'react';

/**
 * CHXButton - Premium reusable button component for CoinHubX
 * 
 * Specifications:
 * - Hover glow: 18-22px radius matching coin color
 * - Pressed state: 8% darker, inner glow for 120ms
 * - Disabled state: 40% opacity, no glow, pointer-events disabled
 * - Border radius: 14px
 * - Font: Inter SemiBold 16px for main label
 * - Padding: 18px top/bottom, 20px left/right
 */
export default function CHXButton({ 
  onClick, 
  children, 
  icon, 
  coinColor = '#00C6FF', 
  disabled = false,
  variant = 'primary', // 'primary' or 'secondary'
  fullWidth = false,
  size = 'medium', // 'small', 'medium', 'large'
  type = 'button' // 'button', 'submit', 'reset'
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const getStyles = () => {
    const baseStyles = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      borderRadius: '14px',
      fontFamily: 'Inter, sans-serif',
      fontWeight: '600',
      fontSize: '16px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      border: 'none',
      width: fullWidth ? '100%' : 'auto',
      pointerEvents: disabled ? 'none' : 'auto',
      padding: size === 'small' ? '12px 16px' : size === 'large' ? '20px 24px' : '18px 20px'
    };

    if (disabled) {
      return {
        ...baseStyles,
        background: variant === 'primary' 
          ? `linear-gradient(135deg, ${coinColor}66, ${coinColor}44)`
          : `rgba(${hexToRgb(coinColor)}, 0.1)`,
        border: variant === 'secondary' ? `1px solid rgba(${hexToRgb(coinColor)}, 0.2)` : 'none',
        color: variant === 'primary' ? 'rgba(255, 255, 255, 0.4)' : `rgba(${hexToRgb(coinColor)}, 0.4)`,
        opacity: 0.4,
        boxShadow: 'none',
        transition: 'none'
      };
    }

    // Active (pressed) state
    if (isPressed) {
      return {
        ...baseStyles,
        background: variant === 'primary'
          ? `linear-gradient(135deg, ${adjustBrightness(coinColor, 0.92)}, ${adjustBrightness(coinColor, 0.92)}DD)`
          : `rgba(${hexToRgb(coinColor)}, 0.12)`,
        border: variant === 'secondary' ? `1px solid ${coinColor}88` : 'none',
        color: variant === 'primary' ? '#FFFFFF' : coinColor,
        boxShadow: `inset 0 2px 12px rgba(0, 0, 0, 0.4), inset 0 0 20px ${coinColor}44`,
        transform: 'scale(0.98)',
        transition: 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)'
      };
    }

    // Hover state
    if (isHovered) {
      return {
        ...baseStyles,
        background: variant === 'primary'
          ? `linear-gradient(135deg, ${coinColor}, ${coinColor}DD)`
          : `rgba(${hexToRgb(coinColor)}, 0.15)`,
        border: variant === 'secondary' ? `1px solid ${coinColor}AA` : 'none',
        color: variant === 'primary' ? '#FFFFFF' : coinColor,
        boxShadow: `0 0 20px ${coinColor}AA, 0 4px 16px ${coinColor}66`,
        transform: 'translateY(-1px)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      };
    }

    // Default state
    return {
      ...baseStyles,
      background: variant === 'primary'
        ? `linear-gradient(135deg, ${coinColor}, ${coinColor}DD)`
        : `rgba(${hexToRgb(coinColor)}, 0.1)`,
      border: variant === 'secondary' ? `1px solid ${coinColor}66` : 'none',
      color: variant === 'primary' ? '#FFFFFF' : coinColor,
      boxShadow: `0 0 18px ${coinColor}77`,
      transform: 'translateY(0)',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    };
  };

  const handleClick = (e) => {
    if (!disabled && onClick) {
      // Keep pressed state for 120ms as per spec
      onClick(e);
      setTimeout(() => setIsPressed(false), 120);
    }
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setTimeout(() => setIsPressed(false), 120)}
      style={getStyles()}
      disabled={disabled}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: '600', fontSize: '16px' }}>{children}</span>
    </button>
  );
}

// Helper: Convert hex to rgb string
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0, 198, 255';
}

// Helper: Adjust brightness (0.92 = 8% darker)
function adjustBrightness(hex, factor) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  
  const r = Math.round(parseInt(result[1], 16) * factor);
  const g = Math.round(parseInt(result[2], 16) * factor);
  const b = Math.round(parseInt(result[3], 16) * factor);
  
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
