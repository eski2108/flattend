import React from 'react';
import CHXButton from '../CHXButton';
import { IoArrowDownCircle as ArrowDownLeft, IoArrowUpCircle as ArrowUpRight } from 'react-icons/io5';
import { BiRepeat } from 'react-icons/bi';
import TradingViewSparkline from './TradingViewSparkline';

// Premium emoji mapping as specified
const COIN_EMOJIS = {
  'BTC': '₿',
  'ETH': '🟣',
  'USDT': '🟩',
  'BNB': '🔶',
  'SOL': '🔵',
  'XRP': '❎',
  'ADA': '🔷',
  'AVAX': '🔺',
  'DOGE': '🐶',
  'TRX': '🔻',
  'DOT': '🎯',
  'MATIC': '🟪',
  'LTC': '⚪',
  'LINK': '🔗',
  'XLM': '✴️',
  'XMR': '🟠',
  'ATOM': '🪐',
  'BCH': '💚',
  'UNI': '🌸',
  'FIL': '📁',
  'APT': '🅰️',
  'USDC': '🟩',
  'GBP': '💷',
  'USD': '💵'
};

const AssetTablePremium = ({ assets, onDeposit, onWithdraw, onSwap }) => {
  const calculatePL = (asset) => {
    const currentValue = asset.holdings * asset.currentPrice;
    const avgCost = asset.avgBuyPrice * asset.holdings;
    const pl = currentValue - avgCost;
    const plPercent = avgCost > 0 ? (pl / avgCost) * 100 : 0;
    return { pl, plPercent };
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
      border: '1px solid rgba(0, 229, 255, 0.25)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 0 28px rgba(0, 229, 255, 0.08)',
      overflowX: 'auto',
      marginBottom: '24px'
    }}>
      <h3 style={{ 
        fontSize: '20px', 
        fontWeight: '700', 
        color: '#FFFFFF', 
        marginBottom: '24px', 
        textTransform: 'uppercase', 
        letterSpacing: '1px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span style={{ color: '#00E5FF' }}>•</span>
        Your Assets
      </h3>
      
      {/* Desktop Table */}
      <div style={{ minWidth: '800px' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(0, 229, 255, 0.2)' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', color: '#8F9BB3', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Asset</th>
              <th style={{ padding: '16px', textAlign: 'right', fontSize: '13px', color: '#8F9BB3', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Holdings</th>
              <th style={{ padding: '16px', textAlign: 'right', fontSize: '13px', color: '#8F9BB3', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Avg Buy</th>
              <th style={{ padding: '16px', textAlign: 'right', fontSize: '13px', color: '#8F9BB3', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Current</th>
              <th style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: '#8F9BB3', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Trend</th>
              <th style={{ padding: '16px', textAlign: 'right', fontSize: '13px', color: '#8F9BB3', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>P/L</th>
              <th style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: '#8F9BB3', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => {
              const { pl, plPercent } = calculatePL(asset);
              const isPositive = pl >= 0;
              
              return (
                <tr
                  key={asset.symbol}
                  style={{
                    height: '64px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 229, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 229, 255, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Asset Icon & Name */}
                  <td style={{ padding: '12px 16px', borderRadius: '12px 0 0 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Icon - 40x40 */}
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: `linear-gradient(135deg, ${asset.color}40, ${asset.color}20)`,
                        border: `1.5px solid ${asset.color}60`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        boxShadow: `0 0 15px ${asset.color}30`
                      }}>
                        {COIN_EMOJIS[asset.symbol] || asset.symbol.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '0.3px' }}>
                          {asset.symbol}
                        </div>
                        <div style={{ fontSize: '12px', color: '#8F9BB3', marginTop: '2px' }}>
                          {asset.name}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Holdings */}
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#FFFFFF' }}>
                      {asset.holdings.toFixed(4)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8F9BB3', marginTop: '2px' }}>
                      £{(asset.holdings * asset.currentPrice).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>

                  {/* Avg Buy */}
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#FFFFFF' }}>
                      £{asset.avgBuyPrice.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>

                  {/* Current Price */}
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#00E5FF' }}>
                      £{asset.currentPrice.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>

                  {/* Sparkline Trend */}
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <TradingViewSparkline symbol={asset.symbol} />
                  </td>

                  {/* P/L */}
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '15px', 
                      fontWeight: '700', 
                      color: isPositive ? '#22C55E' : '#EF4444',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: '4px'
                    }}>
                      <span>{isPositive ? '+' : ''}{plPercent.toFixed(2)}%</span>
                      <span style={{ fontSize: '12px', opacity: 0.8 }}>
                        {isPositive ? '+' : ''}£{Math.abs(pl).toFixed(2)}
                      </span>
                    </div>
                  </td>

                  {/* Action Buttons */}
                  <td style={{ padding: '12px 16px', textAlign: 'center', borderRadius: '0 12px 12px 0' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeposit(asset);
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))',
                          color: '#22C55E',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: '1px solid rgba(34, 197, 94, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(34, 197, 94, 0.15))';
                          e.currentTarget.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.55)';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))';
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        onMouseDown={(e) => {
                          e.currentTarget.style.transform = 'scale(0.97)';
                          setTimeout(() => {
                            e.currentTarget.style.transform = 'scale(1)';
                          }, 80);
                        }}
                      >
                        <ArrowDownLeft size={14} strokeWidth={2.5} />
                        Deposit
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onWithdraw(asset);
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
                          color: '#EF4444',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.15))';
                          e.currentTarget.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.55)';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))';
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        onMouseDown={(e) => {
                          e.currentTarget.style.transform = 'scale(0.97)';
                          setTimeout(() => {
                            e.currentTarget.style.transform = 'scale(1)';
                          }, 80);
                        }}
                      >
                        <ArrowUpRight size={14} strokeWidth={2.5} />
                        Withdraw
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSwap(asset);
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(0, 229, 255, 0.05))',
                          color: '#00E5FF',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: '1px solid rgba(0, 229, 255, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 229, 255, 0.3), rgba(0, 229, 255, 0.15))';
                          e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 229, 255, 0.55)';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(0, 229, 255, 0.05))';
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        onMouseDown={(e) => {
                          e.currentTarget.style.transform = 'scale(0.97)';
                          setTimeout(() => {
                            e.currentTarget.style.transform = 'scale(1)';
                          }, 80);
                        }}
                      >
                        <BiRepeat size={14} strokeWidth={2.5} />
                        Swap
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {assets.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8F9BB3' }}>
          <p style={{ fontSize: '16px', marginBottom: '10px' }}>No assets yet</p>
          <p style={{ fontSize: '14px' }}>Deposit crypto to get started</p>
        </div>
      )}
    </div>
  );
};

export default AssetTablePremium;