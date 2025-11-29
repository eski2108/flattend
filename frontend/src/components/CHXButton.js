import React, { useState } from 'react';

/**
 * CHXButton - Reusable premium button component for CoinHubX
 * 
 * Features:
 * - Hover glow matching coin color
 * - Pressed state with darkening and inner glow
 * - Disabled state with reduced opacity
 * - Smooth animations
 * - Dynamic coin color support
 */
export default function CHXButton({ 
  onClick, 
  children, 
  icon, 
  coinColor = '#00C6FF', 
  disabled = false,
  variant = 'primary', // 'primary' or 'secondary'
  fullWidth = false,
  size = 'medium' // 'small', 'medium', 'large'
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
      cursor: disabled ? 'not-allowed' : 'pointer',
      border: 'none',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      width: fullWidth ? '100%' : 'auto',
      pointerEvents: disabled ? 'none' : 'auto'
    };

    // Size variants
    const sizeStyles = {
      small: {
        fontSize: '14px',
        padding: '12px 16px'
      },
      medium: {
        fontSize: '16px',
        padding: '18px 20px'
      },
      large: {
        fontSize: '18px',
        padding: '20px 24px'
      }
    };

    // Variant styles
    if (variant === 'primary') {
      return {
        ...baseStyles,
        ...sizeStyles[size],
        background: disabled ? 'rgba(0, 198, 255, 0.2)' : `linear-gradient(135deg, ${coinColor}, ${coinColor}DD)`,
        color: disabled ? 'rgba(255, 255, 255, 0.4)' : '#FFFFFF',
        opacity: disabled ? 0.4 : 1,
        boxShadow: disabled 
          ? 'none'
          : isPressed
          ? `inset 0 2px 12px rgba(0, 0, 0, 0.4), 0 0 22px ${coinColor}88`
          : isHovered
          ? `0 0 22px ${coinColor}AA, 0 4px 16px ${coinColor}66`
          : `0 0 18px ${coinColor}55`,
        filter: disabled
          ? 'none'
          : isPressed
          ? 'brightness(0.92)'
          : isHovered
          ? 'brightness(1.08)'
          : 'brightness(1.0)',
        transform: isPressed ? 'scale(0.98)' : 'scale(1.0)'
      };
    } else {
      // Secondary variant
      return {
        ...baseStyles,
        ...sizeStyles[size],
        background: disabled 
          ? 'rgba(0, 198, 255, 0.05)'
          : isHovered
          ? `rgba(${hexToRgb(coinColor)}, 0.15)`
          : `rgba(${hexToRgb(coinColor)}, 0.08)`,
        border: disabled
          ? '1px solid rgba(0, 198, 255, 0.2)'
          : `1px solid ${coinColor}66`,
        color: disabled ? 'rgba(0, 198, 255, 0.4)' : coinColor,
        opacity: disabled ? 0.4 : 1,
        boxShadow: disabled
          ? 'none'
          : isPressed
          ? `inset 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 18px ${coinColor}66`
          : isHovered
          ? `0 0 20px ${coinColor}77`
          : `0 0 12px ${coinColor}44`,
        filter: isPressed ? 'brightness(0.92)' : 'brightness(1.0)',
        transform: isPressed ? 'scale(0.98)' : 'scale(1.0)'
      };
    }
  };

  const handleClick = (e) => {
    if (!disabled && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      style={getStyles()}
      disabled={disabled}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: '600' }}>{children}</span>
    </button>
  );
}

// Helper function to convert hex to rgb
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0, 198, 255';
}
