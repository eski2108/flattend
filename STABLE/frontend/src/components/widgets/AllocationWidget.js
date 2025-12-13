import React from 'react';

const AllocationWidget = ({ spotBalance, savingsBalance }) => {
  const total = spotBalance + savingsBalance;
  const spotPercent = total > 0 ? (spotBalance / total) * 100 : 50;
  const savingsPercent = total > 0 ? (savingsBalance / total) * 100 : 50;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
      border: '1px solid rgba(0, 198, 255, 0.25)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 0 20px rgba(0, 198, 255, 0.15)',
      minHeight: '100px'
    }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Spot vs Savings Allocation</h3>
      
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', color: '#8F9BB3', marginBottom: '4px' }}>Spot Balance</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#00C6FF' }}>£{spotBalance.toFixed(2)}</div>
          <div style={{ fontSize: '13px', color: '#00C6FF', fontWeight: '600' }}>{spotPercent.toFixed(1)}%</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', color: '#8F9BB3', marginBottom: '4px' }}>Savings Balance</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#22C55E' }}>£{savingsBalance.toFixed(2)}</div>
          <div style={{ fontSize: '13px', color: '#22C55E', fontWeight: '600' }}>{savingsPercent.toFixed(1)}%</div>
        </div>
      </div>

      {/* Horizontal Bar */}
      <div style={{ height: '12px', borderRadius: '20px', overflow: 'hidden', display: 'flex', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}>
        <div style={{ width: `${spotPercent}%`, background: 'linear-gradient(90deg, #00C6FF, #0080FF)', boxShadow: '0 0 10px rgba(0, 198, 255, 0.5)' }} />
        <div style={{ width: `${savingsPercent}%`, background: 'linear-gradient(90deg, #22C55E, #16A34A)', boxShadow: '0 0 10px rgba(34, 197, 94, 0.5)' }} />
      </div>
    </div>
  );
};

export default AllocationWidget;
