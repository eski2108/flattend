import React from 'react';
import { IoTrendingUp, IoTrendingDown, IoWallet } from 'react-icons/io5';
import { BiLineChart } from 'react-icons/bi';
import { getCoinLogo } from '@/utils/coinLogos';

/**
 * Portfolio Summary Component
 * Displays total balance, breakdown by asset, 24h change, and quick actions
 * Matches Binance/Crypto.com premium design standards
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
    .slice(0, 5); // Top 5 assets

  return (
    <div style={{
      background: 'linear-gradient(135deg, #08192B 0%, #0A1F35 100%)',
      border: '1px solid rgba(0, 198, 255, 0.2)',
      borderRadius: '20px',
      padding: '32px',
      marginBottom: '24px',
      boxShadow: '0 8px 32px rgba(0, 198, 255, 0.1)'
    }}>
      {/* Top Section: Total Balance & Change */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        {/* Total Balance */}
        <div>
          <div style={{
            fontSize: '14px',
            color: '#8F9BB3',
            fontWeight: '500',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <IoWallet size={16} />
            Total Portfolio Value
          </div>
          <div style={{
            fontSize: '48px',
            fontWeight: '700',
            color: '#FFFFFF',
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
              <IoTrendingUp size={20} color="#22C55E" />
            ) : (
              <IoTrendingDown size={20} color="#EF4444" />
            )}
            <span style={{
              fontSize: '16px',
              fontWeight: '600',
              color: isPositiveChange ? '#22C55E' : '#EF4444'
            }}>
              {isPositiveChange ? '+' : ''}{change24h.toFixed(2)}%
            </span>
            <span style={{
              fontSize: '14px',
              color: '#8F9BB3',
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
              background: 'linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 198, 255, 0.3)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <BiLineChart size={18} />
            Deposit
          </button>
          <button
            onClick={onWithdraw}
            style={{
              padding: '12px 24px',
              background: 'rgba(0, 198, 255, 0.1)',
              border: '1px solid rgba(0, 198, 255, 0.3)',
              borderRadius: '12px',
              color: '#00C6FF',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 198, 255, 0.2)';
              e.currentTarget.style.borderColor = '#00C6FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 198, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(0, 198, 255, 0.3)';
            }}
          >
            Withdraw
          </button>
          <button
            onClick={onBuy}
            style={{
              padding: '12px 24px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '12px',
              color: '#22C55E',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
              e.currentTarget.style.borderColor = '#22C55E';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)';
            }}
          >
            Buy
          </button>
          <button
            onClick={onSell}
            style={{
              padding: '12px 24px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              color: '#EF4444',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.borderColor = '#EF4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
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
            color: '#8F9BB3',
            fontWeight: '500',
            marginBottom: '16px'
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
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
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
                    color: '#FFFFFF',
                    marginBottom: '4px'
                  }}>
                    {asset.currency}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#8F9BB3'
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
