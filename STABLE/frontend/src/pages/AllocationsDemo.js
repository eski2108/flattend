import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// Demo data matching the Crypto.com screenshot
const demoData = [
  { name: 'BTC', value: 47.14, color: '#F7931A' },
  { name: 'XRP', value: 33.80, color: '#23292F' },
  { name: 'SHIB', value: 5.59, color: '#FFA409' },
  { name: 'Others', value: 13.47, color: '#8B8B8B' }
];

const COIN_NAMES = {
  'BTC': 'Bitcoin',
  'XRP': 'XRP',
  'SHIB': 'Shiba Inu',
  'Others': 'Others'
};

const COIN_ICONS = {
  'BTC': '₿',
  'XRP': 'X',
  'SHIB': '🐕',
  'Others': '•••'
};

const coinDetails = [
  { symbol: 'BTC', name: 'Bitcoin', amount: 0.07871793, value: 5330.57 },
  { symbol: 'XRP', name: 'XRP', amount: 2243.85, value: 3821.73 },
  { symbol: 'SHIB', name: 'Shiba Inu', amount: 92460001, value: 632.07 },
  { symbol: 'Others', name: 'Others', amount: null, value: 1178.71 }
];

export default function AllocationsDemo() {
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 35;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="#FFF" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        style={{ fontSize: '16px', fontWeight: '700' }}
      >
        {`${demoData[index].name} ${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  const formatAmount = (amount) => {
    if (!amount) return '';
    if (amount < 0.0001) {
      return amount.toLocaleString('en-US', { maximumFractionDigits: 8 });
    }
    if (amount < 1) {
      return amount.toLocaleString('en-US', { maximumFractionDigits: 6 });
    }
    return amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0B0E13', padding: '2rem 1rem', overflow: 'hidden' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#FFF' }}>
                Allocations
              </h1>
              
              <select
                style={{
                  padding: '0.5rem 1rem',
                  background: '#1A1D26',
                  border: '1px solid rgba(0, 224, 255, 0.3)',
                  borderRadius: '8px',
                  color: '#FFF',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
              <button
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '3px solid #00F0FF',
                  color: '#00F0FF',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Coins
              </button>
              <button
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '3px solid transparent',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Products
              </button>
            </div>
          </div>

          {/* Donut Chart */}
          <div style={{ 
            background: '#11141A', 
            borderRadius: '16px', 
            padding: '2rem',
            marginBottom: '2rem',
            border: '1px solid rgba(0, 224, 255, 0.2)'
          }}>
            <ResponsiveContainer width="100%" height={450}>
              <PieChart>
                <Pie
                  data={demoData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={140}
                  innerRadius={90}
                  dataKey="value"
                >
                  {demoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: '#1A1D26', 
                    border: '1px solid rgba(0, 224, 255, 0.3)', 
                    borderRadius: '8px',
                    color: '#FFF'
                  }}
                  formatter={(value) => `${value.toFixed(2)}%`}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Toggle View */}
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#00F0FF',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                View % breakdown
              </button>
            </div>
          </div>

          {/* Coin List */}
          <div style={{
            background: '#11141A',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid rgba(0, 224, 255, 0.2)'
          }}>
            {coinDetails.map((coin, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.25rem 0',
                  borderBottom: index < coinDetails.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                {/* Left: Icon + Name + Amount */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 auto', minWidth: '200px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: `${demoData[index].color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: demoData[index].color
                  }}>
                    {COIN_ICONS[coin.symbol]}
                  </div>
                  <div>
                    <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#FFF', marginBottom: '0.25rem' }}>
                      {coin.name}
                    </div>
                    {coin.amount !== null && (
                      <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                        {formatAmount(coin.amount)} {coin.symbol}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Value */}
                <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#FFF' }}>
                    £{coin.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
  );
}
