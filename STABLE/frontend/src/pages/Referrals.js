import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export default function Referrals() {
  const [userId, setUserId] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState({
    totalEarned: 0,
    referredUsers: 0,
    activeReferrals: 0,
    tier: 'standard'
  });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Get user from localStorage or auth
    const userData = localStorage.getItem('cryptobank_user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.user_id) {
        setUserId(user.user_id);
        loadReferralData(user.user_id);
      }
    }
  }, []);

  const loadReferralData = async (uid) => {
    setLoading(true);
    try {
      // Generate referral code
      const code = `REF_${uid.substring(0, 8).toUpperCase()}`;
      setReferralCode(code);
      setReferralLink(`${window.location.origin}/signup?ref=${code}`);

      // Load commissions
      const commissionsRes = await axios.get(`${API}/api/referrals/commissions/${uid}`);
      if (commissionsRes.data.success) {
        setCommissions(commissionsRes.data.commissions || []);
      }

      // Load stats
      const statsRes = await axios.get(`${API}/api/referrals/stats/${uid}`);
      if (statsRes.data.success) {
        setStats(statsRes.data.stats || stats);
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTierBadge = (tier) => {
    if (tier === 'golden') {
      return (
        <span style={{
          background: 'linear-gradient(135deg, #FFD700, #FFA500)',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: '700',
          color: '#000',
          boxShadow: '0 0 20px rgba(255, 215, 0, 0.4)'
        }}>
          👑 GOLDEN (50%)
        </span>
      );
    }
    return (
      <span style={{
        background: 'rgba(0, 240, 255, 0.1)',
        border: '1px solid rgba(0, 240, 255, 0.3)',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: '600',
        color: '#00F0FF'
      }}>
        ⭐ STANDARD (20%)
      </span>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
      padding: '2rem',
      color: '#fff'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>
            💰 Referral Program
          </h1>
          <p style={{ color: '#888', fontSize: '0.95rem' }}>
            Earn commission on every transaction your referrals make
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {/* Total Earned */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>
              Total Earned
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#00F0FF' }}>
              £{stats.totalEarned.toFixed(2)}
            </div>
          </div>

          {/* Referred Users */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1))',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>
              Referred Users
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#A855F7' }}>
              {stats.referredUsers}
            </div>
          </div>

          {/* Active Referrals */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1))',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>
              Active This Month
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#22C55E' }}>
              {stats.activeReferrals}
            </div>
          </div>

          {/* Tier Badge */}
          <div style={{
            background: stats.tier === 'golden' 
              ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 165, 0, 0.1))'
              : 'rgba(0, 240, 255, 0.05)',
            border: stats.tier === 'golden'
              ? '1px solid rgba(255, 215, 0, 0.3)'
              : '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>
              Your Tier
            </div>
            {getTierBadge(stats.tier)}
          </div>
        </div>

        {/* Referral Link Card */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#00F0FF'
          }}>
            🔗 Your Referral Link
          </h2>
          
          <div style={{
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                Referral Code
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#00F0FF' }}>
                {referralCode || 'Loading...'}
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: '0.9rem',
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {referralLink || 'Loading...'}
              </div>
            </div>
            <button
              onClick={copyToClipboard}
              style={{
                background: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(0, 240, 255, 0.1)',
                border: copied ? '1px solid #22C55E' : '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '8px',
                padding: '0.5rem 1.5rem',
                color: copied ? '#22C55E' : '#00F0FF',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.3s ease'
              }}
            >
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>

          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#A855F7', fontWeight: '600', marginBottom: '0.5rem' }}>
              💡 How it works:
            </div>
            <div style={{ fontSize: '0.85rem', color: '#888', lineHeight: '1.6' }}>
              Share your referral link with friends. When they sign up and make transactions, 
              you earn {stats.tier === 'golden' ? '50%' : '20%'} commission on all their fees - for life! 
              Commissions are paid instantly to your wallet.
            </div>
          </div>
        </div>

        {/* Commission History */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
            color: '#00F0FF'
          }}>
            💸 Commission History
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
              Loading commissions...
            </div>
          ) : commissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
              <div style={{ color: '#888', fontSize: '0.95rem' }}>
                No commissions yet. Start sharing your referral link!
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#888', fontSize: '0.85rem', fontWeight: '600' }}>
                      Date
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#888', fontSize: '0.85rem', fontWeight: '600' }}>
                      User
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#888', fontSize: '0.85rem', fontWeight: '600' }}>
                      Transaction Type
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', color: '#888', fontSize: '0.85rem', fontWeight: '600' }}>
                      Fee Amount
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', color: '#888', fontSize: '0.85rem', fontWeight: '600' }}>
                      Your Commission
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((commission, index) => (
                    <tr key={index} style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.2s ease'
                    }}>
                      <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#fff' }}>
                        {new Date(commission.timestamp).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#00F0FF' }}>
                        {commission.referred_user_id?.substring(0, 8)}...
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#A855F7' }}>
                        {commission.transaction_type}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.9rem', color: '#888' }}>
                        {commission.fee_amount.toFixed(4)} {commission.currency}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: '600', color: '#22C55E' }}>
                        +{commission.commission_amount.toFixed(4)} {commission.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
