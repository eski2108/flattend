import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { IoTrendingUp, IoSwapHorizontal, IoWarning, IoTime, IoTrophy } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

function AdminP2PDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('week');

  useEffect(() => {
    fetchStats();
  }, [timeframe]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/p2p/stats?timeframe=${timeframe}`);
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching P2P stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Layout><div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading...</div></Layout>;
  if (!stats) return <Layout><div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>No data</div></Layout>;

  return (
    <Layout>
      <div style={{ padding: '2rem', background: 'linear-gradient(180deg, #05121F 0%, #071E2C 100%)', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#00C6FF', marginBottom: '8px' }}>
            💱 P2P Admin Dashboard
          </h1>
          <p style={{ color: '#8F9BB3' }}>Monitor P2P marketplace performance and metrics</p>
        </div>

        {/* Timeframe Selector */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '2rem' }}>
          {['day', 'week', 'month', 'all'].map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              style={{
                padding: '12px 24px',
                background: timeframe === t ? 'linear-gradient(135deg, #00C6FF, #0096CC)' : 'rgba(143, 155, 179, 0.1)',
                border: timeframe === t ? 'none' : '1px solid rgba(143, 155, 179, 0.3)',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontWeight: timeframe === t ? '700' : '400',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {t === 'all' ? 'All Time' : `This ${t.charAt(0).toUpperCase() + t.slice(1)}`}
            </button>
          ))}
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Total Volume */}
          <div style={{
            background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
            border: '1px solid rgba(0, 198, 255, 0.3)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <IoTrendingUp size={24} color="#00C6FF" />
              <div style={{ fontSize: '14px', color: '#8F9BB3' }}>Total Volume</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#00C6FF' }}>
              £{stats.total_volume?.toLocaleString() || '0'}
            </div>
          </div>

          {/* Total Trades */}
          <div style={{
            background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <IoSwapHorizontal size={24} color="#22C55E" />
              <div style={{ fontSize: '14px', color: '#8F9BB3' }}>Total Trades</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#22C55E' }}>
              {stats.total_trades || 0}
            </div>
            <div style={{ fontSize: '12px', color: '#8F9BB3', marginTop: '8px' }}>
              {stats.completed_trades || 0} completed · {stats.cancelled_trades || 0} cancelled
            </div>
          </div>

          {/* Dispute Rate */}
          <div style={{
            background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
            border: '1px solid rgba(255, 165, 0, 0.3)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <IoWarning size={24} color="#FFA500" />
              <div style={{ fontSize: '14px', color: '#8F9BB3' }}>Dispute Rate</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#FFA500' }}>
              {stats.dispute_rate?.toFixed(1) || '0'}%
            </div>
            <div style={{ fontSize: '12px', color: '#8F9BB3', marginTop: '8px' }}>
              {stats.disputed_trades || 0} disputes
            </div>
          </div>

          {/* Avg Completion Time */}
          <div style={{
            background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <IoTime size={24} color="#A855F7" />
              <div style={{ fontSize: '14px', color: '#8F9BB3' }}>Avg Completion Time</div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#A855F7' }}>
              {stats.avg_completion_time || '0'} min
            </div>
          </div>
        </div>

        {/* Volume by Crypto */}
        <div style={{
          background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
          border: '1px solid rgba(0, 198, 255, 0.2)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '2rem'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', marginBottom: '20px' }}>
            Volume by Crypto
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {stats.volume_by_crypto && Object.entries(stats.volume_by_crypto).map(([crypto, volume]) => (
              <div key={crypto} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: 'rgba(0, 198, 255, 0.05)',
                borderRadius: '8px'
              }}>
                <div style={{ color: '#FFFFFF', fontWeight: '600' }}>{crypto}</div>
                <div style={{ color: '#00C6FF', fontWeight: '700' }}>£{volume.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Merchants */}
        <div style={{
          background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
          border: '1px solid rgba(255, 215, 0, 0.3)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', marginBottom: '20px' }}>
            <IoTrophy size={24} color="#FFD700" style={{ marginRight: '8px' }} />
            Top Merchants
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {stats.top_merchants && stats.top_merchants.map((merchant, idx) => (
              <div key={merchant.user_id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                background: idx === 0 ? 'rgba(255, 215, 0, 0.1)' : 'rgba(0, 198, 255, 0.05)',
                border: idx === 0 ? '1px solid rgba(255, 215, 0, 0.3)' : 'none',
                borderRadius: '8px'
              }}>
                <div>
                  <div style={{ color: '#FFFFFF', fontWeight: '700' }}>
                    #{idx + 1} {merchant.username}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8F9BB3', marginTop: '4px' }}>
                    {merchant.total_trades} trades · {merchant.rating?.toFixed(1)}⭐ · {merchant.completion_rate?.toFixed(0)}% completion
                  </div>
                </div>
                <div style={{ color: '#00C6FF', fontWeight: '700' }}>
                  £{merchant.total_volume?.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* P2P Fee Revenue */}
        <div style={{
          background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '12px',
          padding: '24px',
          marginTop: '2rem'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', marginBottom: '20px' }}>
            💰 P2P Fee Revenue
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '4px' }}>Maker Fees</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#22C55E' }}>
                £{stats.maker_fees?.toLocaleString() || '0'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '4px' }}>Taker Fees</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#22C55E' }}>
                £{stats.taker_fees?.toLocaleString() || '0'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '4px' }}>Dispute Fees</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFA500' }}>
                £{stats.dispute_fees?.toLocaleString() || '0'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '4px' }}>Total Revenue</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#00C6FF' }}>
                £{((stats.maker_fees || 0) + (stats.taker_fees || 0) + (stats.dispute_fees || 0)).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default AdminP2PDashboard;
