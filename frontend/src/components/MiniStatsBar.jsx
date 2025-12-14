import React from 'react';
import { IoTrendingUp, IoTrendingDown, IoWallet } from 'react-icons/io5';

const COLORS = {
  PRIMARY_BG: '#0B0F14',
  SECONDARY_BG: '#0F172A',
  DIVIDER: '#1F2937',
  BINANCE_BLUE: '#1E90FF',
  SUCCESS: '#16C784',
  DANGER: '#EA3943',
  GREY: '#9CA3AF',
  WHITE: '#FFFFFF'
};

export default function MiniStatsBar({ balances, totalValue }) {
  // Calculate 24h change (mock for now, real calculation needs price history)
  const change24hPercent = 2.45;
  const change24hAbsolute = totalValue * (change24hPercent / 100);
  const isPositive = change24hPercent >= 0;

  // Find best and worst performers
  const performers = balances.map(asset => ({
    currency: asset.currency,
    change: ((Math.random() - 0.5) * 20).toFixed(2) // Mock - needs real price delta
  })).sort((a, b) => parseFloat(b.change) - parseFloat(a.change));

  const bestPerformer = performers[0] || { currency: '-', change: '0.00' };
  const worstPerformer = performers[performers.length - 1] || { currency: '-', change: '0.00' };
  const totalAssets = balances.filter(b => b.total_balance > 0).length;

  const stats = [
    {
      label: '24h Change',
      value: `${isPositive ? '+' : ''}${change24hPercent.toFixed(2)}%`,
      subValue: `£${Math.abs(change24hAbsolute).toFixed(2)}`,
      color: isPositive ? COLORS.SUCCESS : COLORS.DANGER,
      icon: isPositive ? IoTrendingUp : IoTrendingDown
    },
    {
      label: 'Best Performer',
      value: bestPerformer.currency,
      subValue: `${parseFloat(bestPerformer.change) >= 0 ? '+' : ''}${bestPerformer.change}%`,
      color: COLORS.SUCCESS,
      icon: IoTrendingUp
    },
    {
      label: 'Worst Performer',
      value: worstPerformer.currency,
      subValue: `${parseFloat(worstPerformer.change) >= 0 ? '+' : ''}${worstPerformer.change}%`,
      color: COLORS.DANGER,
      icon: IoTrendingDown
    },
    {
      label: 'Total Assets',
      value: totalAssets.toString(),
      subValue: 'holdings',
      color: COLORS.ACCENT,
      icon: IoWallet
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    }}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            style={{
              background: COLORS.SECONDARY_BG,
              border: `1px solid rgba(0, 174, 239, 0.2)`,
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: `${stat.color}22`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon size={20} color={stat.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: COLORS.GREY, marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: COLORS.WHITE, marginBottom: '2px' }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: stat.color, fontWeight: '600' }}>{stat.subValue}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
