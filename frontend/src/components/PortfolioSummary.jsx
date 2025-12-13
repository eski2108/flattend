import React from 'react';
import { IoTrendingUp, IoTrendingDown, IoWallet } from 'react-icons/io5';
import { getCoinLogo } from '@/utils/coinLogos';

/**
 * Portfolio Summary Component - Binance Premium Design
 * Exact brand colors: #0B0E11, #12161C, #F0B90B, #00E5FF, #0ECB81, #F6465D
 */
export default function PortfolioSummary({ 
  totalValue, 
  currency = 'GBP', 
  balances = [], 
  change24h = 0,
  onDeposit,
  onWithdraw,
  onBuy,
  onSell 
}) {
  const isPositiveChange = change24h >= 0;
  const currencySymbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '€';

  // Calculate breakdown percentages
  const breakdownData = balances
    .filter(b => b.total_balance > 0)
    .map(b => ({
      currency: b.currency,
      value: b.gbp_value || 0,
      percentage: totalValue > 0 ? ((b.gbp_value || 0) / totalValue) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div style={{
      background: 'rgba(18, 22, 28, 0.85)',
      backdropFilter: 'blur(12px)',
      border: '1px solid #1E2329',
      borderRadius: '14px',
      padding: '32px',
      marginBottom: '24px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)'
    }}>
      {/* Total Balance & Change */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{
            fontSize: '14px',
            color: '#B7BDC6',
            fontWeight: '500',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <IoWallet size={16} />
            Total Portfolio Value
          </div>
          <div style={{
            fontSize: '48px',
            fontWeight: '600',
            color: '#EAECEF',
            lineHeight: '1',
            marginBottom: '12px',
            fontFamily: 'Inter, sans-serif'
          }}>
            {currencySymbol}{totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {isPositiveChange ? (
              <IoTrendingUp size={20} color="#0ECB81" />
            ) : (
              <IoTrendingDown size={20} color="#F6465D" />
            )}
            <span style={{
              fontSize: '16px',
              fontWeight: '600',
              color: isPositiveChange ? '#0ECB81' : '#F6465D'
            }}>
              {isPositiveChange ? '+' : ''}{change24h.toFixed(2)}%
            </span>
            <span style={{
              fontSize: '14px',
              color: '#B7BDC6',
              marginLeft: '4px'
            }}>
              24h
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={onDeposit}
            style={{
              padding: '12px 24px',
              background: '#F0B90B',
              border: 'none',
              borderRadius: '12px',
              color: '#000000',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(240, 185, 11, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(240, 185, 11, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(240, 185, 11, 0.3)';
            }}
          >
            Deposit
          </button>
          <button
            onClick={onWithdraw}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid #F0B90B',
              borderRadius: '12px',
              color: '#F0B90B',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(240, 185, 11, 0.1)';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            Withdraw
          </button>
          <button
            onClick={onBuy}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid #0ECB81',
              borderRadius: '12px',
              color: '#0ECB81',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(14, 203, 129, 0.1)';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            Buy
          </button>
          <button
            onClick={onSell}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid #F6465D',
              borderRadius: '12px',
              color: '#F6465D',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(246, 70, 93, 0.1)';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            Sell
          </button>
        </div>
      </div>

      {/* Asset Breakdown */}
      {breakdownData.length > 0 && (
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingTop: '24px'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#B7BDC6',
            fontWeight: '500',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Portfolio Breakdown
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            {breakdownData.map((asset, index) => (
              <div
                key={asset.currency}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: '#0B0E11',
                  borderRadius: '12px',
                  border: '1px solid #1E2329'
                }}
              >
                <img 
                  src={getCoinLogo(asset.currency)} 
                  alt={asset.currency}
                  style={{
                    width: '32px',
                    height: '32px',
                    objectFit: 'contain'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#EAECEF',
                    marginBottom: '4px'
                  }}>
                    {asset.currency}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#B7BDC6'
                  }}>
                    {asset.percentage.toFixed(1)}% • {currencySymbol}{asset.value.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
