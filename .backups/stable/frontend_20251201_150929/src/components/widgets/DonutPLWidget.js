import React from 'react';

const DonutPLWidget = ({ plPercent }) => {
  const isPositive = plPercent >= 0;
  const color = isPositive ? '#22C55E' : '#EF4444';
  const radius = 50;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.abs(plPercent) / 100) * circumference;

  return (
    <div style={{
      width: '100%',
      background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
      border: `1px solid ${isPositive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
      borderRadius: '14px',
      padding: '16px',
      boxShadow: `0 0 18px ${isPositive ? 'rgba(34, 197, 94, 0.18)' : 'rgba(239, 68, 68, 0.18)'}`,
      minHeight: '90px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ fontSize: '12px', color: '#8F9BB3', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Total P/L</div>
      
      <div style={{ position: 'relative', width: '100px', height: '100px' }}>
        <svg height="100" width="100" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            stroke="rgba(143, 155, 179, 0.2)"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx="50"
            cy="50"
          />
          {/* Progress circle */}
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={normalizedRadius}
            cx="50"
            cy="50"
            style={{
              transition: 'stroke-dashoffset 0.5s ease',
              filter: `drop-shadow(0 0 6px ${color})`
            }}
          />
        </svg>
        
        {/* Center text */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '20px',
          fontWeight: '700',
          color: color
        }}>
          {isPositive ? '+' : ''}{plPercent.toFixed(1)}%
        </div>
      </div>
    </div>
  );
};

export default DonutPLWidget;
