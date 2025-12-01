import React, { useState } from 'react';
import CHXButton from '../CHXButton';
import { IoChevronDown as ChevronDown, IoArrowDownCircle as ArrowDownLeft, IoArrowUpCircle as ArrowUpRight } from 'react-icons/io5';
import { BiRepeat } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';

// Coin emoji mapping
const COIN_EMOJIS = {
  'BTC': '🟧',
  'ETH': '🟪',
  'USDT': '🟩',
  'BNB': '🟨',
  'SOL': '🟪',
  'XRP': '⚫',
  'ADA': '🔵',
  'DOGE': '🟡',
  'BCH': '🟢',
  'LINK': '🔵',
  'MATIC': '🟪',
  'ATOM': '🟪',
  'LTC': '🟦',
  'DOT': '🟪',
  'UNI': '🟪',
  'AVAX': '🔴',
  'SHIB': '🟠',
  'GBP': '🔵',
  'USD': '🟩',
  'USDC': '🔵'
};

const AssetTable = ({ assets, onDeposit, onWithdraw, onSwap }) => {
  const [expandedRow, setExpandedRow] = useState(null);
  const navigate = useNavigate();

  const toggleRow = (symbol) => {
    setExpandedRow(expandedRow === symbol ? null : symbol);
  };

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
      border: '1px solid rgba(0, 198, 255, 0.25)',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 0 20px rgba(0, 198, 255, 0.15)',
      overflowX: 'auto'
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#FFFFFF', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>All Assets</h3>
      
      {/* Desktop Table - Hidden on mobile */}
      <div className="desktop-table" style={{ display: 'block' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0, 198, 255, 0.2)' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#8F9BB3', fontWeight: '600', textTransform: 'uppercase' }}>Coin</th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: '#8F9BB3', fontWeight: '600', textTransform: 'uppercase' }}>Holdings</th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: '#8F9BB3', fontWeight: '600', textTransform: 'uppercase' }}>Avg Buy</th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: '#8F9BB3', fontWeight: '600', textTransform: 'uppercase' }}>Current</th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: '#8F9BB3', fontWeight: '600', textTransform: 'uppercase' }}>P/L %</th>
              <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: '#8F9BB3', fontWeight: '600', textTransform: 'uppercase' }}>P/L £</th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#8F9BB3', fontWeight: '600', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => {
              const { pl, plPercent } = calculatePL(asset);
              const isPositive = pl >= 0;
              const isExpanded = expandedRow === asset.symbol;
              
              return (
                <React.Fragment key={asset.symbol}>
                  <tr
                    onClick={() => toggleRow(asset.symbol)}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      background: isExpanded ? 'rgba(0, 198, 255, 0.05)' : 'transparent',
                      minHeight: '90px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 198, 255, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = isExpanded ? 'rgba(0, 198, 255, 0.05)' : 'transparent'}
                  >
                    <td style={{ padding: '20px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>{COIN_EMOJIS[asset.symbol] || '🟦'}</span>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${asset.color}, ${asset.color}DD)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: '700',
                          color: '#FFFFFF',
                          boxShadow: `0 0 12px ${asset.color}55`
                        }}>
                          {asset.symbol[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF' }}>{asset.symbol}</div>
                          <div style={{ fontSize: '12px', color: '#8F9BB3' }}>{asset.name}</div>
                        </div>
                        <ChevronDown
                          size={18}
                          color="#00C6FF"
                          style={{
                            marginLeft: '8px',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s ease'
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '20px 12px', textAlign: 'right' }}>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#FFFFFF' }}>{asset.holdings.toFixed(6)}</div>
                      <div style={{ fontSize: '12px', color: '#8F9BB3' }}>£{(asset.holdings * asset.currentPrice).toFixed(2)}</div>
                    </td>
                    <td style={{ padding: '20px 12px', textAlign: 'right', fontSize: '15px', fontWeight: '600', color: '#FFFFFF' }}>
                      £{asset.avgBuyPrice.toFixed(2)}
                    </td>
                    <td style={{ padding: '20px 12px', textAlign: 'right', fontSize: '15px', fontWeight: '600', color: '#00C6FF' }}>
                      £{asset.currentPrice.toFixed(2)}
                    </td>
                    <td style={{ padding: '20px 12px', textAlign: 'right', fontSize: '15px', fontWeight: '700', color: isPositive ? '#22C55E' : '#EF4444' }}>
                      {isPositive ? '+' : ''}{plPercent.toFixed(2)}%
                    </td>
                    <td style={{ padding: '20px 12px', textAlign: 'right', fontSize: '15px', fontWeight: '700', color: isPositive ? '#22C55E' : '#EF4444' }}>
                      {isPositive ? '+' : ''}£{Math.abs(pl).toFixed(2)}
                    </td>
                    <td style={{ padding: '20px 12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <CHXButton onClick={() => onDeposit(asset)} coinColor={asset.color} variant="secondary" size="small" icon={<ArrowDownLeft size={14} />}>
                          Deposit
                        </CHXButton>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Row */}
                  {isExpanded && (
                    <tr>
                      <td colSpan="7" style={{ padding: 0 }}>
                        <div style={{
                          maxHeight: isExpanded ? '400px' : '0',
                          overflow: 'hidden',
                          transition: 'max-height 0.3s ease-in-out',
                          background: 'rgba(0, 198, 255, 0.03)',
                          borderTop: '1px solid rgba(0, 198, 255, 0.15)'
                        }}>
                          <div style={{ padding: '24px' }}>
                            {/* Expanded Details */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                              <div style={{ padding: '16px', background: 'rgba(0, 198, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 198, 255, 0.2)' }}>
                                <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '6px', textTransform: 'uppercase' }}>Total Invested</div>
                                <div style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF' }}>£{(asset.avgBuyPrice * asset.holdings).toFixed(2)}</div>
                              </div>
                              <div style={{ padding: '16px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '6px', textTransform: 'uppercase' }}>Current Value</div>
                                <div style={{ fontSize: '20px', fontWeight: '700', color: '#22C55E' }}>£{(asset.holdings * asset.currentPrice).toFixed(2)}</div>
                              </div>
                              <div style={{ padding: '16px', background: `rgba(${isPositive ? '34, 197, 94' : '239, 68, 68'}, 0.05)`, borderRadius: '12px', border: `1px solid rgba(${isPositive ? '34, 197, 94' : '239, 68, 68'}, 0.2)` }}>
                                <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '6px', textTransform: 'uppercase' }}>Unrealised P/L</div>
                                <div style={{ fontSize: '20px', fontWeight: '700', color: isPositive ? '#22C55E' : '#EF4444' }}>
                                  {isPositive ? '+' : ''}£{Math.abs(pl).toFixed(2)}
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: isPositive ? '#22C55E' : '#EF4444', opacity: 0.8 }}>
                                  {isPositive ? '+' : ''}{plPercent.toFixed(2)}%
                                </div>
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <CHXButton onClick={() => onDeposit(asset)} coinColor={asset.color} variant="primary" size="medium" fullWidth icon={<ArrowDownLeft size={18} />}>
                                Deposit {asset.symbol}
                              </CHXButton>
                              <CHXButton onClick={() => onWithdraw(asset)} coinColor={asset.color} variant="secondary" size="medium" fullWidth icon={<ArrowUpRight size={18} />}>
                                Withdraw {asset.symbol}
                              </CHXButton>
                              <CHXButton onClick={() => onSwap(asset)} coinColor={asset.color} variant="secondary" size="medium" fullWidth icon={<BiRepeat size={18} />}>
                                Swap {asset.symbol}
                              </CHXButton>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards - Show on mobile */}
      <div className="mobile-cards" style={{ display: 'none' }}>
        {assets.map((asset) => {
          const { pl, plPercent } = calculatePL(asset);
          const isPositive = pl >= 0;
          const isExpanded = expandedRow === asset.symbol;
          
          return (
            <div
              key={asset.symbol}
              style={{
                background: isExpanded ? 'rgba(0, 198, 255, 0.05)' : 'transparent',
                border: '1px solid rgba(0, 198, 255, 0.15)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                cursor: 'pointer'
              }}
              onClick={() => toggleRow(asset.symbol)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isExpanded ? '16px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>{COIN_EMOJIS[asset.symbol] || '🟦'}</span>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF' }}>{asset.symbol}</div>
                    <div style={{ fontSize: '12px', color: '#8F9BB3' }}>{asset.holdings.toFixed(4)}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: isPositive ? '#22C55E' : '#EF4444' }}>
                    {isPositive ? '+' : ''}{plPercent.toFixed(2)}%
                  </div>
                  <ChevronDown
                    size={18}
                    color="#00C6FF"
                    style={{
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease'
                    }}
                  />
                </div>
              </div>

              {isExpanded && (
                <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ padding: '12px', background: 'rgba(0, 198, 255, 0.05)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#8F9BB3', marginBottom: '4px' }}>Invested</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>£{(asset.avgBuyPrice * asset.holdings).toFixed(2)}</div>
                    </div>
                    <div style={{ padding: '12px', background: `rgba(${isPositive ? '34, 197, 94' : '239, 68, 68'}, 0.05)`, borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#8F9BB3', marginBottom: '4px' }}>P/L</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: isPositive ? '#22C55E' : '#EF4444' }}>
                        {isPositive ? '+' : ''}£{Math.abs(pl).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <CHXButton onClick={() => onDeposit(asset)} coinColor={asset.color} variant="primary" size="small" fullWidth icon={<ArrowDownLeft size={14} />}>
                      Deposit
                    </CHXButton>
                    <CHXButton onClick={() => onWithdraw(asset)} coinColor={asset.color} variant="secondary" size="small" fullWidth icon={<ArrowUpRight size={14} />}>
                      Withdraw
                    </CHXButton>
                    <CHXButton onClick={() => onSwap(asset)} coinColor={asset.color} variant="secondary" size="small" fullWidth icon={<BiRepeat size={14} />}>
                      Swap
                    </CHXButton>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AssetTable;
