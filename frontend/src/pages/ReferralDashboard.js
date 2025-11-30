import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Users, Copy, DollarSign, TrendingUp, Share2, Award, Gift, CheckCircle } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function ReferralDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [referralData, setReferralData] = useState({
    referral_code: '',
    referral_link: '',
    total_referrals: 0,
    active_referrals: 0,
    total_earnings: 0,
    pending_earnings: 0,
    referral_tier: 'standard',
    referred_users: []
  });

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadReferralData(parsedUser.user_id);
  }, [navigate]);

  const loadReferralData = async (userId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/user/referral-dashboard/${userId}`);
      if (response.data.success) {
        setReferralData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralData.referral_link);
    toast.success('Referral link copied to clipboard!');
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralData.referral_code);
    toast.success('Referral code copied to clipboard!');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#00F0FF' }}>
          <div style={{ fontSize: '18px' }}>Loading referral dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>
            Referral Program
          </h1>
          <p style={{ color: '#A3AEC2', fontSize: '16px' }}>
            Earn {referralData.referral_tier === 'golden' ? '50%' : '20%'} commission on every transaction your referrals make
          </p>
        </div>

        {/* Tier Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          background: referralData.referral_tier === 'golden' ? 'linear-gradient(135deg, #FFD700, #FFA500)' : 'linear-gradient(135deg, #00F0FF, #7B2CFF)',
          borderRadius: '25px',
          marginBottom: '2rem'
        }}>
          <Award size={20} color="#000" />
          <span style={{ color: '#000', fontWeight: '700', fontSize: '14px' }}>
            {referralData.referral_tier === 'golden' ? 'GOLDEN TIER (50% Commission)' : 'STANDARD TIER (20% Commission)'}
          </span>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{
            background: 'rgba(0, 240, 255, 0.1)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
              <Users size={24} color="#00F0FF" />
              <span style={{ color: '#A3AEC2', fontSize: '14px' }}>Total Referrals</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#00F0FF' }}>{referralData.total_referrals}</div>
          </div>

          <div style={{
            background: 'rgba(168, 85, 247, 0.1)',
            border: '2px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
              <TrendingUp size={24} color="#A855F7" />
              <span style={{ color: '#A3AEC2', fontSize: '14px' }}>Active Referrals</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#A855F7' }}>{referralData.active_referrals}</div>
          </div>

          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '2px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
              <DollarSign size={24} color="#22C55E" />
              <span style={{ color: '#A3AEC2', fontSize: '14px' }}>Total Earnings</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#22C55E' }}>£{referralData.total_earnings.toFixed(2)}</div>
          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '2px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
              <Gift size={24} color="#F59E0B" />
              <span style={{ color: '#A3AEC2', fontSize: '14px' }}>Pending Earnings</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#F59E0B' }}>£{referralData.pending_earnings.toFixed(2)}</div>
          </div>
        </div>

        {/* Referral Link Section */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '2px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>Your Referral Link</h2>
          <p style={{ color: '#A3AEC2', marginBottom: '1.5rem' }}>Share this link with friends to start earning commissions</p>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '300px' }}>
              <label style={{ color: '#A3AEC2', fontSize: '14px', marginBottom: '0.5rem', display: 'block' }}>Referral Link</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={referralData.referral_link}
                  readOnly
                  style={{
                    flex: '1',
                    padding: '12px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '2px solid rgba(0,240,255,0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={copyReferralLink}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#000',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Copy size={18} />
                  Copy
                </button>
              </div>
            </div>

            <div style={{ minWidth: '200px' }}>
              <label style={{ color: '#A3AEC2', fontSize: '14px', marginBottom: '0.5rem', display: 'block' }}>Referral Code</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={referralData.referral_code}
                  readOnly
                  style={{
                    flex: '1',
                    padding: '12px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '2px solid rgba(168,85,247,0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    textAlign: 'center',
                    fontWeight: '700'
                  }}
                />
                <button
                  onClick={copyReferralCode}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #A855F7, #7B2CFF)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => window.open(`https://twitter.com/intent/tweet?text=Join CoinHubX and start trading crypto! Use my referral link: ${encodeURIComponent(referralData.referral_link)}`, '_blank')}
              style={{
                padding: '10px 20px',
                background: '#1DA1F2',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Share2 size={16} />
              Share on Twitter
            </button>

            <button
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('Join CoinHubX! ' + referralData.referral_link)}`, '_blank')}
              style={{
                padding: '10px 20px',
                background: '#25D366',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Share2 size={16} />
              Share on WhatsApp
            </button>
          </div>
        </div>

        {/* Referred Users Table */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '2px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '2rem'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>Your Referrals</h2>
          
          {referralData.referred_users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#A3AEC2' }}>
              <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No referrals yet. Share your link to start earning!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#A3AEC2', fontSize: '14px', fontWeight: '600' }}>User</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#A3AEC2', fontSize: '14px', fontWeight: '600' }}>Joined</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#A3AEC2', fontSize: '14px', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'right', color: '#A3AEC2', fontSize: '14px', fontWeight: '600' }}>Total Trades</th>
                    <th style={{ padding: '12px', textAlign: 'right', color: '#A3AEC2', fontSize: '14px', fontWeight: '600' }}>Your Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {referralData.referred_users.map((referral, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px', color: '#fff' }}>{referral.email || 'User ' + (index + 1)}</td>
                      <td style={{ padding: '12px', color: '#A3AEC2', fontSize: '14px' }}>{new Date(referral.joined_at).toLocaleDateString()}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 12px',
                          background: referral.is_active ? 'rgba(34,197,94,0.2)' : 'rgba(168,85,247,0.2)',
                          color: referral.is_active ? '#22C55E' : '#A855F7',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {referral.is_active && <CheckCircle size={12} />}
                          {referral.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{referral.total_transactions || 0}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#22C55E', fontWeight: '700', fontSize: '16px' }}>£{(referral.commission_earned || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* How it Works */}
        <div style={{
          marginTop: '2rem',
          background: 'rgba(0,240,255,0.05)',
          border: '2px solid rgba(0,240,255,0.2)',
          borderRadius: '16px',
          padding: '2rem'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#00F0FF', marginBottom: '1rem' }}>How It Works</h3>
          <div style={{ display: 'grid', gap: '1rem', color: '#A3AEC2', fontSize: '14px', lineHeight: '1.6' }}>
            <div>✅ <strong>Share your link</strong> - Send your unique referral link to friends</div>
            <div>✅ <strong>They sign up</strong> - Your friends register using your link or code</div>
            <div>✅ <strong>You earn</strong> - Get {referralData.referral_tier === 'golden' ? '50%' : '20%'} commission on every transaction they make</div>
            <div>✅ <strong>Instant payouts</strong> - Commissions are paid directly to your wallet automatically</div>
          </div>
        </div>
      </div>
    </div>
  );
}
