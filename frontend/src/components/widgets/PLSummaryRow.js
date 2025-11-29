import React from 'react';

const PLSummaryRow = ({ todayPL, weekPL, monthPL }) => {
  const renderPLWidget = (label, pl, plPercent, icon) => {
    const isPositive = pl >= 0;
    const color = isPositive ? '#22C55E' : '#EF4444';
    
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
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '18px' }}>{icon}</span>
          <span style={{ fontSize: '13px', color: '#8F9BB3', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        </div>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: color, marginBottom: '2px' }}>
            {isPositive ? '+' : ''}£{Math.abs(pl).toFixed(2)}
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: color, opacity: 0.8 }}>
            {isPositive ? '+' : ''}{plPercent.toFixed(2)}%
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderPLWidget('Today', todayPL, (todayPL / 50000) * 100, '📈')}
      {renderPLWidget('7 Days', weekPL, (weekPL / 50000) * 100, '📊')}
      {renderPLWidget('30 Days', monthPL, (monthPL / 50000) * 100, '💰')}
    </>
  );
};

export default PLSummaryRow;
