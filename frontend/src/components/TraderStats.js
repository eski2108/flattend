import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IoCheckmarkCircle, IoTime, IoTrendingUp, IoPeople, IoShield } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * TraderStats Component
 * Fetches and displays real P2P trader statistics from backend API
 * NO MOCKS - All data from /api/trader/stats/{user_id}
 * 
 * Props:
 * - userId: string (required) - The trader's user ID
 * - compact: boolean - Show compact version for cards (default: true)
 */
const TraderStats = ({ userId, compact = true }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setError(true);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await axios.get(`${API}/api/trader/stats/${userId}`);
        
        if (response.data.success) {
          setStats(response.data.stats);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Failed to fetch trader stats:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  // Loading state
  if (loading) {
    return (
      <div style={{ 
        color: 'rgba(255, 255, 255, 0.5)', 
        fontSize: '12px',
        fontStyle: 'italic'
      }}>
        Loading stats...
      </div>
    );
  }

  // Error state
  if (error || !stats) {
    return (
      <div style={{ 
        color: 'rgba(255, 255, 255, 0.4)', 
        fontSize: '12px'
      }}>
        Stats unavailable
      </div>
    );
  }

  // Compact view for P2P marketplace cards
  if (compact) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* Primary Stats Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {/* 30-day trades */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <IoTrendingUp size={14} color="#00F0FF" />
            <span style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              {stats.thirty_day_trades || 0}
            </span>
            <span style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '11px'
            }}>
              trades (30d)
            </span>
          </div>

          {/* Completion rate */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <IoCheckmarkCircle 
              size={14} 
              color={stats.thirty_day_completion_rate >= 95 ? '#22C55E' : '#FFA500'} 
            />
            <span style={{
              color: stats.thirty_day_completion_rate >= 95 ? '#22C55E' : '#FFA500',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              {stats.thirty_day_completion_rate?.toFixed(1) || '0.0'}%
            </span>
          </div>

          {/* Release time */}
          {stats.avg_release_time_minutes > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <IoTime size={14} color="#8B5CF6" />
              <span style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                {stats.avg_release_time_minutes?.toFixed(0) || 0}m
              </span>
              <span style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '11px'
              }}>
                release
              </span>
            </div>
          )}
        </div>

        {/* Secondary Stats Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {/* Total trades */}
          <div style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '11px'
          }}>
            {stats.total_trades || 0} total trades
          </div>

          {/* Trading partners */}
          {stats.unique_counterparties > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <IoPeople size={12} color="rgba(255, 255, 255, 0.5)" />
              <span style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '11px'
              }}>
                {stats.unique_counterparties} partners
              </span>
            </div>
          )}

          {/* Verification badges */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {stats.email_verified && (
              <div title="Email Verified" style={{
                background: 'rgba(34, 197, 94, 0.15)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '9px',
                color: '#22C55E',
                fontWeight: '600'
              }}>
                ✉️
              </div>
            )}
            {stats.phone_verified && (
              <div title="Phone Verified" style={{
                background: 'rgba(59, 130, 246, 0.15)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '9px',
                color: '#3B82F6',
                fontWeight: '600'
              }}>
                📱
              </div>
            )}
            {stats.kyc_verified && (
              <div title="KYC Verified" style={{
                background: 'rgba(168, 85, 247, 0.15)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '9px',
                color: '#A855F7',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}>
                <IoShield size={10} />
                KYC
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full view (for profile pages)
  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '16px'
    }}>
      <h3 style={{
        color: '#fff',
        fontSize: '16px',
        fontWeight: '700',
        marginBottom: '16px'
      }}>
        Trader Statistics
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px'
      }}>
        {/* 30-day metrics */}
        <StatBox 
          label="30-Day Trades" 
          value={stats.thirty_day_trades || 0} 
        />
        <StatBox 
          label="Completion Rate" 
          value={`${stats.thirty_day_completion_rate?.toFixed(1) || 0}%`}
          highlight={stats.thirty_day_completion_rate >= 95}
        />
        <StatBox 
          label="Avg Release Time" 
          value={stats.avg_release_time_minutes > 0 ? `${stats.avg_release_time_minutes?.toFixed(0)}m` : 'N/A'} 
        />
        <StatBox 
          label="Total Trades" 
          value={stats.total_trades || 0} 
        />
        <StatBox 
          label="Trading Partners" 
          value={stats.unique_counterparties || 0} 
        />
        <StatBox 
          label="Account Age" 
          value={`${stats.account_age_days || 0}d`} 
        />
      </div>

      {/* Verification status */}
      <div style={{
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '12px',
          marginBottom: '8px',
          fontWeight: '600'
        }}>
          Verification Status
        </div>
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <VerificationBadge 
            label="Email" 
            verified={stats.email_verified} 
          />
          <VerificationBadge 
            label="Phone" 
            verified={stats.phone_verified} 
          />
          <VerificationBadge 
            label="KYC" 
            verified={stats.kyc_verified} 
          />
          <VerificationBadge 
            label="Address" 
            verified={stats.address_verified} 
          />
        </div>
      </div>
    </div>
  );
};

// Helper component for stat boxes
const StatBox = ({ label, value, highlight = false }) => (
  <div style={{
    background: 'rgba(0, 0, 0, 0.2)',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.05)'
  }}>
    <div style={{
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: '11px',
      marginBottom: '4px',
      textTransform: 'uppercase',
      fontWeight: '600'
    }}>
      {label}
    </div>
    <div style={{
      color: highlight ? '#22C55E' : '#fff',
      fontSize: '18px',
      fontWeight: '700'
    }}>
      {value}
    </div>
  </div>
);

// Helper component for verification badges
const VerificationBadge = ({ label, verified }) => (
  <div style={{
    padding: '6px 12px',
    borderRadius: '6px',
    background: verified ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
    border: `1px solid ${verified ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
    fontSize: '12px',
    fontWeight: '600',
    color: verified ? '#22C55E' : 'rgba(255, 255, 255, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }}>
    {verified ? '✓' : '✗'} {label}
  </div>
);

export default TraderStats;
