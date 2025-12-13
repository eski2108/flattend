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
 * AssetRow Component - Binance Premium Design
 * Exact brand colors and spacing
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
  const coinColor = metadata.color || '#00E5FF';
  const canStake = ['ETH', 'ADA', 'DOT', 'SOL'].includes(asset.currency);
  
  // Generate sparkline data
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
      x: { display: false, grid: { display: false, color: 'rgba(255,255,255,0.05)' } },
      y: { display: false, grid: { display: false, color: 'rgba(255,255,255,0.05)' } }
    }
  };

  const change24h = ((Math.random() - 0.5) * 10).toFixed(2);
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
          ? 'rgba(240, 185, 11, 0.05)' 
          : '#12161C',
        border: '1px solid #1E2329',
        borderRadius: '14px',
        marginBottom: '8px',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        boxShadow: isHovered ? '0 0 20px rgba(240, 185, 11, 0.1)' : 'none'
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
            color: '#EAECEF',
            marginBottom: '4px'
          }}>
            {asset.currency}
          </div>
          <div style={{
            fontSize: '13px',
            color: '#B7BDC6'
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
          color: '#EAECEF',
          marginBottom: '4px'
        }}>
          {asset.total_balance?.toFixed(8) || '0.00000000'}
        </div>
        <div style={{
          fontSize: '13px',
          color: '#B7BDC6'
        }}>
          Available: {asset.available_balance?.toFixed(8) || '0.00000000'}
        </div>
      </div>

      {/* Fiat Value */}
      <div>
        <div style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#EAECEF',
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
            <BiTrendingUp size={14} color="#0ECB81" />
          ) : (
            <BiTrendingDown size={14} color="#F6465D" />
          )}
          <span style={{
            fontSize: '13px',
            color: isPositive ? '#0ECB81' : '#F6465D',
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
            <IoLockClosedOutline size={14} color="#F0B90B" />
            <span style={{
              fontSize: '13px',
              color: '#F0B90B',
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
            background: 'transparent',
            border: '1px solid #00E5FF',
            borderRadius: '8px',
            color: '#00E5FF',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 229, 255, 0.1)';
            e.currentTarget.style.borderColor = '#00E5FF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#00E5FF';
          }}
        >
          <IoWalletOutline size={14} />
          Deposit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onWithdraw(asset.currency); }}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid #F6465D',
            borderRadius: '8px',
            color: '#F6465D',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(246, 70, 93, 0.1)';
            e.currentTarget.style.borderColor = '#F6465D';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#F6465D';
          }}
        >
          Withdraw
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSwap(asset.currency); }}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid #7B2CFF',
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
            e.currentTarget.style.background = 'rgba(123, 44, 255, 0.1)';
            e.currentTarget.style.borderColor = '#7B2CFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#7B2CFF';
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
              background: 'transparent',
              border: '1px solid #0ECB81',
              borderRadius: '8px',
              color: '#0ECB81',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(14, 203, 129, 0.1)';
              e.currentTarget.style.borderColor = '#0ECB81';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = '#0ECB81';
            }}
          >
            Stake
          </button>
        )}
      </div>
    </div>
  );
}
