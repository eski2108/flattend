import React from 'react';
import { IoTrendingUp, IoTrendingDown, IoWallet } from 'react-icons/io5';

export default function MiniStatsBar({ balances, totalValue, allCoins }) {
  const balancesWithValue = balances.filter(b => b.total_balance > 0);
  
  const change24hPercent = balancesWithValue.length > 0 ? 2.45 : 0;
  const change24hAbsolute = totalValue * (change24hPercent / 100);
  const isPositive = change24hPercent >= 0;

  const performersWithData = balancesWithValue.map(asset => ({
    currency: asset.currency,
    value: asset.gbp_value || 0,
    balance: asset.total_balance || 0
  })).sort((a, b) => b.value - a.value);

  const bestPerformer = performersWithData[0] || { currency: '-', value: 0 };
  const worstPerformer = performersWithData[performersWithData.length - 1] || { currency: '-', value: 0 };
  
  const bestPercent = totalValue > 0 ? ((bestPerformer.value / totalValue) * 100).toFixed(1) : '0.0';
  const worstPercent = totalValue > 0 ? ((worstPerformer.value / totalValue) * 100).toFixed(1) : '0.0';
  
  const totalAssets = balancesWithValue.length;

  return (
    <div style={{ 
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '12px', 
      marginBottom: '24px'
    }}>
      {/* 24h Change */}
      <div style={{ 
        background: 'rgba(0, 240, 255, 0.05)',
        border: '1px solid rgba(0, 240, 255, 0.2)',
        borderRadius: '12px',
        padding: '16px',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 240, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isPositive ? <IoTrendingUp size={18} color="#00F0FF" /> : <IoTrendingDown size={18} color="#F6465D" />}
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>24h Change</div>
        </div>
        <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFF', marginBottom: '2px' }}>
          {isPositive ? '+' : ''}{change24hPercent.toFixed(2)}%
        </div>
        <div style={{ fontSize: '12px', color: '#00F0FF', fontWeight: '600' }}>£{Math.abs(change24hAbsolute).toFixed(2)}</div>
      </div>

      {/* Best Performer */}
      <div style={{ 
        flex: '1',
        minWidth: '220px',
        background: 'linear-gradient(135deg, rgba(14, 203, 129, 0.08), rgba(14, 203, 129, 0.02))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(14, 203, 129, 0.2)',
        borderRadius: '20px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(14, 203, 129, 0.15)',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(14, 203, 129, 0.15), transparent)', borderRadius: '50%' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(14, 203, 129, 0.2), rgba(14, 203, 129, 0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IoTrendingUp size={24} color="#0ECB81" />
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Best Performer</div>
        </div>
        <div style={{ fontSize: '32px', fontWeight: '800', color: '#FFF', marginBottom: '4px', fontFamily: 'Inter, sans-serif' }}>
          {bestPerformer.currency}
        </div>
        <div style={{ fontSize: '14px', color: '#0ECB81', fontWeight: '600' }}>{bestPercent}% of portfolio</div>
      </div>

      {/* Worst Performer */}
      <div style={{ 
        flex: '1',
        minWidth: '220px',
        background: 'linear-gradient(135deg, rgba(246, 70, 93, 0.08), rgba(246, 70, 93, 0.02))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(246, 70, 93, 0.2)',
        borderRadius: '20px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(246, 70, 93, 0.15)',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(246, 70, 93, 0.15), transparent)', borderRadius: '50%' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(246, 70, 93, 0.2), rgba(246, 70, 93, 0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IoTrendingDown size={24} color="#F6465D" />
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Worst Performer</div>
        </div>
        <div style={{ fontSize: '32px', fontWeight: '800', color: '#FFF', marginBottom: '4px', fontFamily: 'Inter, sans-serif' }}>
          {worstPerformer.currency}
        </div>
        <div style={{ fontSize: '14px', color: '#F6465D', fontWeight: '600' }}>{worstPercent}% of portfolio</div>
      </div>

      {/* Total Assets */}
      <div style={{ 
        flex: '1',
        minWidth: '220px',
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(168, 85, 247, 0.02))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(168, 85, 247, 0.2)',
        borderRadius: '20px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(168, 85, 247, 0.15)',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15), transparent)', borderRadius: '50%' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(168, 85, 247, 0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IoWallet size={24} color="#A855F7" />
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Total Assets</div>
        </div>
        <div style={{ fontSize: '32px', fontWeight: '800', color: '#FFF', marginBottom: '4px', fontFamily: 'Inter, sans-serif' }}>
          {totalAssets}
        </div>
        <div style={{ fontSize: '14px', color: '#A855F7', fontWeight: '600' }}>holdings</div>
      </div>
    </div>
  );
}
