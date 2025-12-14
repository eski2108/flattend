import React from 'react';

export default function MiniStatsBar({ assetsWithBalance, totalValue, portfolioChange24h, priceData }) {
  // ONLY calculate from assets with balance > 0
  const performersWithChange = assetsWithBalance
    .map(asset => {
      const price = priceData[asset.currency] || {};
      const change24h = price.change_24h || price.change_24h_gbp || 0;
      return {
        currency: asset.currency,
        change_24h: change24h
      };
    })
    .sort((a, b) => b.change_24h - a.change_24h);

  const bestPerformer = performersWithChange.length > 0 ? performersWithChange[0] : null;
  const worstPerformer = performersWithChange.length > 0 ? performersWithChange[performersWithChange.length - 1] : null;
  const totalAssets = assetsWithBalance.length; // Count ONLY assets with balance > 0

  // Calculate absolute change in GBP
  const change24hAbsolute = totalValue * (portfolioChange24h / 100);
  const hasHoldings = assetsWithBalance.length > 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}
    >
      {/* 24h Portfolio Change */}
      <div
        style={{
          background: '#11162A',
          border: '1px solid #1E2545',
          borderRadius: '12px',
          padding: '14px',
          transition: 'all 0.3s ease'
        }}
      >
        <div
          style={{
            fontSize: '10px',
            color: '#9AA4BF',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px'
          }}
        >
          24h Change
        </div>
        <div
          style={{
            fontSize: '22px',
            fontWeight: '700',
            color: hasHoldings ? (portfolioChange24h >= 0 ? '#2DFF9A' : '#FF5C5C') : '#6B7390',
            marginBottom: '4px'
          }}
        >
          {hasHoldings ? (
            <>
              {portfolioChange24h >= 0 ? '+' : ''}{portfolioChange24h.toFixed(2)}%
            </>
          ) : (
            '—'
          )}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: '#9AA4BF',
            fontWeight: '500'
          }}
        >
          {hasHoldings ? `£${Math.abs(change24hAbsolute).toFixed(2)}` : 'No holdings'}
        </div>
      </div>

      {/* Best Performer */}
      <div
        style={{
          background: '#11162A',
          border: '1px solid #1E2545',
          borderRadius: '12px',
          padding: '14px',
          transition: 'all 0.3s ease'
        }}
      >
        <div
          style={{
            fontSize: '10px',
            color: '#9AA4BF',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px'
          }}
        >
          Best Performer
        </div>
        <div
          style={{
            fontSize: '22px',
            fontWeight: '700',
            color: bestPerformer ? '#E6EAF2' : '#6B7390',
            marginBottom: '4px'
          }}
        >
          {bestPerformer ? bestPerformer.currency : '—'}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: bestPerformer ? (bestPerformer.change_24h >= 0 ? '#2DFF9A' : '#FF5C5C') : '#6B7390',
            fontWeight: '600'
          }}
        >
          {bestPerformer ? (
            <>
              {bestPerformer.change_24h >= 0 ? '+' : ''}{bestPerformer.change_24h.toFixed(2)}%
            </>
          ) : (
            '—'
          )}
        </div>
      </div>

      {/* Worst Performer */}
      <div
        style={{
          background: '#11162A',
          border: '1px solid #1E2545',
          borderRadius: '12px',
          padding: '14px',
          transition: 'all 0.3s ease'
        }}
      >
        <div
          style={{
            fontSize: '10px',
            color: '#9AA4BF',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px'
          }}
        >
          Worst Performer
        </div>
        <div
          style={{
            fontSize: '22px',
            fontWeight: '700',
            color: worstPerformer ? '#E6EAF2' : '#6B7390',
            marginBottom: '4px'
          }}
        >
          {worstPerformer ? worstPerformer.currency : '—'}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: worstPerformer ? (worstPerformer.change_24h >= 0 ? '#2DFF9A' : '#FF5C5C') : '#6B7390',
            fontWeight: '600'
          }}
        >
          {worstPerformer ? (
            <>
              {worstPerformer.change_24h >= 0 ? '+' : ''}{worstPerformer.change_24h.toFixed(2)}%
            </>
          ) : (
            '—'
          )}
        </div>
      </div>

      {/* Total Assets - COUNT ONLY ASSETS WITH BALANCE > 0 */}
      <div
        style={{
          background: '#11162A',
          border: '1px solid #1E2545',
          borderRadius: '12px',
          padding: '14px',
          transition: 'all 0.3s ease'
        }}
      >
        <div
          style={{
            fontSize: '10px',
            color: '#9AA4BF',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px'
          }}
        >
          Total Assets
        </div>
        <div
          style={{
            fontSize: '22px',
            fontWeight: '700',
            color: '#E6EAF2',
            marginBottom: '4px'
          }}
        >
          {totalAssets}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: '#9AA4BF',
            fontWeight: '500'
          }}
        >
          holdings
        </div>
      </div>
    </div>
  );
}
