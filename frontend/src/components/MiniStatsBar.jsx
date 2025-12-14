import React from 'react';
import { IoTrendingUp, IoTrendingDown, IoWallet } from 'react-icons/io5';

export default function MiniStatsBar({ balances, totalValue, portfolioChange24h, priceData }) {
  // Calculate best and worst performers based on REAL 24h change data
  const performersWithChange = balances
    .map(asset => {
      const price = priceData[asset.currency] || {};
      const change24h = price.change_24h || price.change_24h_gbp || 0;
      return {
        currency: asset.currency,
        change_24h: change24h,
        gbp_value: asset.gbp_value || 0
      };
    })
    .filter(a => a.gbp_value > 0)
    .sort((a, b) => b.change_24h - a.change_24h);

  const bestPerformer = performersWithChange[0] || null;
  const worstPerformer = performersWithChange[performersWithChange.length - 1] || null;
  const totalAssets = balances.length;

  // Calculate absolute change in GBP
  const change24hAbsolute = totalValue * (portfolioChange24h / 100);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}
    >
      {/* 24h Portfolio Change */}
      <div
        style={{
          background: '#11162A',
          border: '1px solid #1E2545',
          borderRadius: '12px',
          padding: '16px',
          transition: 'all 0.3s ease'
        }}
      >
        <div
          style={{
            fontSize: '11px',
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
            fontSize: '24px',
            fontWeight: '700',
            color: totalValue > 0 ? (portfolioChange24h >= 0 ? '#2DFF9A' : '#FF5C5C') : '#6B7390',
            marginBottom: '4px'
          }}
        >
          {totalValue > 0 ? (
            <>
              {portfolioChange24h >= 0 ? '+' : ''}{portfolioChange24h.toFixed(2)}%
            </>
          ) : (
            '—'
          )}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#9AA4BF',
            fontWeight: '500'
          }}
        >
          {totalValue > 0 ? `£${Math.abs(change24hAbsolute).toFixed(2)}` : 'No holdings'}
        </div>
      </div>

      {/* Best Performer */}
      <div
        style={{
          background: '#11162A',
          border: '1px solid #1E2545',
          borderRadius: '12px',
          padding: '16px',
          transition: 'all 0.3s ease'
        }}
      >
        <div
          style={{
            fontSize: '11px',
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
            fontSize: '24px',
            fontWeight: '700',
            color: bestPerformer ? '#E6EAF2' : '#6B7390',
            marginBottom: '4px'
          }}
        >
          {bestPerformer ? bestPerformer.currency : '—'}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: bestPerformer && bestPerformer.change_24h >= 0 ? '#2DFF9A' : '#FF5C5C',
            fontWeight: '600'
          }}
        >
          {bestPerformer ? (
            <>
              {bestPerformer.change_24h >= 0 ? '+' : ''}{bestPerformer.change_24h.toFixed(2)}%
            </>
          ) : (
            'No data'
          )}
        </div>
      </div>

      {/* Worst Performer */}
      <div
        style={{
          background: '#11162A',
          border: '1px solid #1E2545',
          borderRadius: '12px',
          padding: '16px',
          transition: 'all 0.3s ease'
        }}
      >
        <div
          style={{
            fontSize: '11px',
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
            fontSize: '24px',
            fontWeight: '700',
            color: worstPerformer ? '#E6EAF2' : '#6B7390',
            marginBottom: '4px'
          }}
        >
          {worstPerformer ? worstPerformer.currency : '—'}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: worstPerformer && worstPerformer.change_24h >= 0 ? '#2DFF9A' : '#FF5C5C',
            fontWeight: '600'
          }}
        >
          {worstPerformer ? (
            <>
              {worstPerformer.change_24h >= 0 ? '+' : ''}{worstPerformer.change_24h.toFixed(2)}%
            </>
          ) : (
            'No data'
          )}
        </div>
      </div>

      {/* Total Assets */}
      <div
        style={{
          background: '#11162A',
          border: '1px solid #1E2545',
          borderRadius: '12px',
          padding: '16px',
          transition: 'all 0.3s ease'
        }}
      >
        <div
          style={{
            fontSize: '11px',
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
            fontSize: '24px',
            fontWeight: '700',
            color: '#E6EAF2',
            marginBottom: '4px'
          }}
        >
          {totalAssets}
        </div>
        <div
          style={{
            fontSize: '12px',
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
