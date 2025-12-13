import React, { useState } from 'react';
import { getCoinLogo } from '@/utils/coinLogos';
import { BiTrendingUp, BiTrendingDown } from 'react-icons/bi';
import { IoWalletOutline, IoSwapHorizontalOutline, IoLockClosedOutline } from 'react-icons/io5';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip
);

/**
 * AssetRow Component
 * Enhanced crypto asset row with logo, balance, fiat value, chart, and action buttons
 * Matches top-tier exchange design standards (Binance, Crypto.com)
 */
export default function AssetRow({
  asset,
  coinMetadata = {},
  onDeposit,
  onWithdraw,
  onSwap,
  onStake,
  currencySymbol = '£'
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  const metadata = coinMetadata[asset.currency] || {};
  const coinName = metadata.name || asset.currency;
  const coinColor = metadata.color || '#00F0FF';
  const canStake = ['ETH', 'ADA', 'DOT', 'SOL'].includes(asset.currency);
  
  // Generate mock sparkline data (in production, fetch from API)
  const generateSparklineData = () => {
    const data = [];
    let value = 100;
    for (let i = 0; i < 24; i++) {
      value += (Math.random() - 0.48) * 5;
      data.push(value);
    }
    return data;
  };

  const sparklineData = {
    labels: Array(24).fill(''),
    datasets: [{
      data: generateSparklineData(),
      borderColor: coinColor,
      borderWidth: 2,
      fill: false,
      tension: 0.4,
      pointRadius: 0
    }]
  };

  const sparklineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
    scales: {
      x: { display: false },
      y: { display: false }
    }
  };

  const change24h = ((Math.random() - 0.5) * 10).toFixed(2); // Mock 24h change
  const isPositive = parseFloat(change24h) >= 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.5fr 1fr 1fr 120px 2fr',
        gap: '16px',
        alignItems: 'center',
        padding: '16px 20px',
        background: isHovered 
          ? 'rgba(0, 198, 255, 0.05)' 
          : 'rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        marginBottom: '8px',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Asset Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img 
          src={getCoinLogo(asset.currency)} 
          alt={asset.currency}
          style={{
            width: '40px',
            height: '40px',
            objectFit: 'contain'
          }}
        />
        <div>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#FFFFFF',
            marginBottom: '4px'
          }}>
            {asset.currency}
          </div>
          <div style={{
            fontSize: '13px',
            color: '#8F9BB3'
          }}>
            {coinName}
          </div>
        </div>
      </div>

      {/* Balance */}
      <div>
        <div style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#FFFFFF',
          marginBottom: '4px'
        }}>
          {asset.total_balance?.toFixed(8) || '0.00000000'}
        </div>
        <div style={{
          fontSize: '13px',
          color: '#8F9BB3'
        }}>
          Available: {asset.available_balance?.toFixed(8) || '0.00000000'}
        </div>
      </div>

      {/* Fiat Value */}
      <div>
        <div style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#FFFFFF',
          marginBottom: '4px'
        }}>
          {currencySymbol}{(asset.gbp_value || 0).toFixed(2)}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {isPositive ? (
            <BiTrendingUp size={14} color="#22C55E" />
          ) : (
            <BiTrendingDown size={14} color="#EF4444" />
          )}
          <span style={{
            fontSize: '13px',
            color: isPositive ? '#22C55E' : '#EF4444',
            fontWeight: '500'
          }}>
            {isPositive ? '+' : ''}{change24h}%
          </span>
        </div>
      </div>

      {/* Locked Balance */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        {asset.locked_balance > 0 && (
          <>
            <IoLockClosedOutline size={14} color="#FBBF24" />
            <span style={{
              fontSize: '13px',
              color: '#FBBF24',
              fontWeight: '500'
            }}>
              {asset.locked_balance?.toFixed(8)}
            </span>
          </>
        )}
      </div>

      {/* Sparkline Chart */}
      <div style={{
        height: '40px',
        width: '100%'
      }}>
        <Line data={sparklineData} options={sparklineOptions} />
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); onDeposit(asset.currency); }}
          style={{
            padding: '8px 16px',
            background: 'rgba(0, 198, 255, 0.1)',
            border: '1px solid rgba(0, 198, 255, 0.3)',
            borderRadius: '8px',
            color: '#00C6FF',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
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
          <IoWalletOutline size={14} />
          Deposit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onWithdraw(asset.currency); }}
          style={{
            padding: '8px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#EF4444',
            fontSize: '13px',
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
          Withdraw
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSwap(asset.currency); }}
          style={{
            padding: '8px 16px',
            background: 'rgba(123, 44, 255, 0.1)',
            border: '1px solid rgba(123, 44, 255, 0.3)',
            borderRadius: '8px',
            color: '#7B2CFF',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(123, 44, 255, 0.2)';
            e.currentTarget.style.borderColor = '#7B2CFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(123, 44, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(123, 44, 255, 0.3)';
          }}
        >
          <IoSwapHorizontalOutline size={14} />
          Swap
        </button>
        {canStake && (
          <button
            onClick={(e) => { e.stopPropagation(); onStake(asset.currency); }}
            style={{
              padding: '8px 16px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              color: '#22C55E',
              fontSize: '13px',
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
            Stake
          </button>
        )}
      </div>
    </div>
  );
}
