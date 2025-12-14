import React from 'react';

export default function MiniStatsBar({ assetsWithBalance, totalValue, portfolioChange24h, priceData }) {
  const hasHoldings = assetsWithBalance.length > 0;

  let bestPerformer = null;
  let worstPerformer = null;

  if (hasHoldings) {
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

    bestPerformer = performersWithChange[0];
    worstPerformer = performersWithChange[performersWithChange.length - 1];
  }

  const change24hAbsolute = totalValue * (portfolioChange24h / 100);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}
    >
      {/* 24h Portfolio Change */}
      <div
        style={{
          background: '#081227',
          border: 'none',
          borderRadius: '14px',
          padding: '20px',
          transition: 'all 0.3s ease',
          boxShadow: '0 8px 24px rgba(0, 170, 255, 0.08), inset 0 1px 0 rgba(255,255,255,0.04)'
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: '#8FA3C8',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom: '12px'
          }}
        >
          24h Change
        </div>
        {hasHoldings ? (
          <>
            <div
              style={{
                fontSize: '28px',
                fontWeight: '700',
                color: portfolioChange24h >= 0 ? '#16C784' : '#EA3943',
                marginBottom: '6px'
              }}
            >
              {portfolioChange24h >= 0 ? '+' : ''}{portfolioChange24h.toFixed(2)}%
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#8FA3BF',
                fontWeight: '500'
              }}
            >
              £{Math.abs(change24hAbsolute).toFixed(2)}
            </div>
          </>
        ) : (
          <div
            style={{
              fontSize: '16px',
              fontWeight: '500',
              color: '#7E90AD',
              marginTop: '8px'
            }}
          >
            No holdings
          </div>
        )}
      </div>

      {/* Best Performer */}
      <div
        style={{
          background: '#101A36',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '16px',
          padding: '20px',
          transition: 'all 0.3s ease'
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: '#8FA3BF',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom: '12px'
          }}
        >
          Best Performer
        </div>
        {bestPerformer ? (
          <>
            <div
              style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#FFFFFF',
                marginBottom: '6px'
              }}
            >
              {bestPerformer.currency}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: bestPerformer.change_24h >= 0 ? '#16C784' : '#EA3943',
                fontWeight: '700'
              }}
            >
              {bestPerformer.change_24h >= 0 ? '+' : ''}{bestPerformer.change_24h.toFixed(2)}%
            </div>
          </>
        ) : (
          <div
            style={{
              fontSize: '16px',
              fontWeight: '500',
              color: '#7E90AD',
              marginTop: '8px'
            }}
          >
            No data
          </div>
        )}
      </div>

      {/* Worst Performer */}
      <div
        style={{
          background: '#101A36',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '16px',
          padding: '20px',
          transition: 'all 0.3s ease'
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: '#8FA3BF',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom: '12px'
          }}
        >
          Worst Performer
        </div>
        {worstPerformer ? (
          <>
            <div
              style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#FFFFFF',
                marginBottom: '6px'
              }}
            >
              {worstPerformer.currency}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: worstPerformer.change_24h >= 0 ? '#16C784' : '#EA3943',
                fontWeight: '700'
              }}
            >
              {worstPerformer.change_24h >= 0 ? '+' : ''}{worstPerformer.change_24h.toFixed(2)}%
            </div>
          </>
        ) : (
          <div
            style={{
              fontSize: '16px',
              fontWeight: '500',
              color: '#7E90AD',
              marginTop: '8px'
            }}
          >
            No data
          </div>
        )}
      </div>

      {/* Total Assets */}
      <div
        style={{
          background: '#101A36',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '16px',
          padding: '20px',
          transition: 'all 0.3s ease'
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: '#8FA3BF',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom: '12px'
          }}
        >
          Total Assets
        </div>
        <div
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#FFFFFF',
            marginBottom: '6px'
          }}
        >
          {assetsWithBalance.length}
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#8FA3BF',
            fontWeight: '500'
          }}
        >
          holdings
        </div>
      </div>
    </div>
  );
}
