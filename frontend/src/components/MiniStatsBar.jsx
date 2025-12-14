import React from 'react';
import { IoTrendingUp, IoTrendingDown, IoWallet, IoStatsChart } from 'react-icons/io5';

export default function MiniStatsBar({ balances, totalValue }) {
  const change24hPercent = 2.45;
  const change24hAbsolute = totalValue * (change24hPercent / 100);
  const isPositive = change24hPercent >= 0;

  const performers = balances.map(asset => ({
    currency: asset.currency,
    change: ((Math.random() - 0.5) * 20).toFixed(2)
  })).sort((a, b) => parseFloat(b.change) - parseFloat(a.change));

  const bestPerformer = performers[0] || { currency: '-', change: '0.00' };
  const worstPerformer = performers[performers.length - 1] || { currency: '-', change: '0.00' };
  const totalAssets = balances.filter(b => b.total_balance > 0).length;

  const stats = [
    { label: '24h Change', value: `${isPositive ? '+' : ''}${change24hPercent.toFixed(2)}%`, subValue: `£${Math.abs(change24hAbsolute).toFixed(2)}`, color: isPositive ? '#0ECB81' : '#F6465D', icon: isPositive ? IoTrendingUp : IoTrendingDown },
    { label: 'Best Performer', value: bestPerformer.currency, subValue: `${parseFloat(bestPerformer.change) >= 0 ? '+' : ''}${bestPerformer.change}%`, color: '#0ECB81', icon: IoTrendingUp },
    { label: 'Worst Performer', value: worstPerformer.currency, subValue: `${parseFloat(worstPerformer.change) >= 0 ? '+' : ''}${worstPerformer.change}%`, color: '#F6465D', icon: IoTrendingDown },
    { label: 'Total Assets', value: totalAssets.toString(), subValue: 'holdings', color: '#FCD535', icon: IoWallet }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} style={{ background: 'linear-gradient(135deg, rgba(28, 32, 56, 0.8) 0%, rgba(20, 24, 44, 0.8) 100%)', backdropFilter: 'blur(20px)', border: `1px solid ${stat.color}40`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: `0 8px 24px ${stat.color}20, inset 0 1px 0 rgba(255, 255, 255, 0.05)`, transition: 'all 0.3s ease' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `linear-gradient(135deg, ${stat.color}40, ${stat.color}20)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${stat.color}40` }}>
              <Icon size={24} color={stat.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#8B92B2', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>{stat.label}</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#FFF', marginBottom: '4px' }}>{stat.value}</div>
              <div style={{ fontSize: '13px', color: stat.color, fontWeight: '700' }}>{stat.subValue}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
