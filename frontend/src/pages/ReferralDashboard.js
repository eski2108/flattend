import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoCash, IoCheckmark as Check, IoCheckmarkCircle, IoCopy, IoPeople, IoTrendingUp, IoTrophy } from 'react-icons/io5';

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
    tier_info: {},
    can_upgrade_to_vip: false,
    referred_users: [],
    commission_history: [],
    earnings_by_fee_type: []
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
          <IoTrophy size={20} color="#000" />
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
              <IoPeople size={24} color="#00F0FF" />
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
              <IoTrendingUp size={24} color="#A855F7" />
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
              <IoCash size={24} color="#22C55E" />
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
                  <IoCopy size={18} />
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
                  <IoCopy size={18} />
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

        {/* VIP Upgrade Section */}
        {referralData.referral_tier === 'standard' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(123, 44, 255, 0.05) 100%)',
            border: '2px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '20px',
            padding: '2rem',
            marginBottom: '2rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Glow Effect */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-10%',
              width: '300px',
              height: '300px',
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)',
              filter: 'blur(60px)',
              pointerEvents: 'none'
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                <IoTrophy size={32} style={{ color: '#A855F7' }} />
                <h2 style={{
                  fontSize: '28px',
                  fontWeight: '900',
                  background: 'linear-gradient(135deg, #A855F7, #7B2CFF)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Upgrade to VIP Tier
                </h2>
              </div>

              <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                Unlock lifetime 20% commission on ALL revenue streams your referrals generate!
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                {[
                  { icon: '💰', title: 'Lifetime 20% Commission', desc: 'Earn on every transaction' },
                  { icon: '⚡', title: 'Priority Support', desc: 'Get help faster' },
                  { icon: '🏆', title: 'Exclusive Badge', desc: 'Stand out from the crowd' },
                  { icon: '📈', title: 'Advanced Analytics', desc: 'Track your earnings better' }
                ].map((benefit, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '0.5rem' }}>{benefit.icon}</div>
                    <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: '700', marginBottom: '0.25rem' }}>
                      {benefit.title}
                    </h4>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                      {benefit.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(168, 85, 247, 0.4)',
                borderRadius: '16px',
                padding: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '0.5rem' }}>
                    One-Time Payment
                  </div>
                  <div style={{
                    fontSize: '48px',
                    fontWeight: '900',
                    background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    £150
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '0.25rem' }}>
                    Lifetime access • No recurring fees
                  </div>
                </div>

                <button
                  onClick={async () => {
                    try {
                      const response = await axios.post(`${API}/api/referrals/purchase-vip`, {
                        user_id: user.user_id
                      });
                      
                      if (response.data.success) {
                        toast.success('🎉 Upgraded to VIP! Welcome to the exclusive club!');
                        loadReferralData(user.user_id);
                      } else {
                        toast.error(response.data.message || 'Upgrade failed');
                      }
                    } catch (error) {
                      console.error('VIP upgrade error:', error);
                      toast.error(error.response?.data?.detail || 'Failed to upgrade to VIP');
                    }
                  }}
                  style={{
                    padding: '16px 48px',
                    background: 'linear-gradient(135deg, #A855F7, #7B2CFF)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '18px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 0 30px rgba(168, 85, 247, 0.5)',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 0 40px rgba(168, 85, 247, 0.7)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(168, 85, 247, 0.5)';
                  }}
                >
                  <IoTrophy size={24} />
                  Upgrade to VIP Now
                </button>
              </div>

              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'rgba(0, 240, 255, 0.05)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: '12px',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '13px',
                lineHeight: '1.6'
              }}>
                <strong style={{ color: '#00F0FF' }}>💡 Note:</strong> VIP tier gives you the same 20% commission rate as Standard,
                but with priority support and exclusive features. To earn 50% commission, contact admin for Golden tier upgrade.
              </div>
            </div>
          </div>
        )}

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
              <IoPeople size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
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
                          {referral.is_active && <IoCheckmarkCircle size={12} />}
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

        {/* Earnings Breakdown by Fee Type */}
        <div style={{
          background: 'rgba(168,85,247,0.05)',
          border: '2px solid rgba(168,85,247,0.2)',
          borderRadius: '16px',
          padding: '2rem',
          marginTop: '2rem'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#A855F7', marginBottom: '1.5rem' }}>
            <PieChart size={24} style={{ display: 'inline', marginRight: '8px' }} />
            Earnings Breakdown by Fee Type
          </h2>
          
          {referralData.earnings_by_fee_type && referralData.earnings_by_fee_type.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#A3AEC2' }}>
              <p>No earnings yet from any fee types.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {referralData.earnings_by_fee_type && referralData.earnings_by_fee_type.map((item, index) => (
                <div key={index} style={{
                  background: 'rgba(168,85,247,0.1)',
                  border: '1px solid rgba(168,85,247,0.3)',
                  borderRadius: '12px',
                  padding: '1rem'
                }}>
                  <div style={{ fontSize: '12px', color: '#A3AEC2', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {item.fee_type.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#A855F7' }}>
                    £{item.total.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commission Earnings History */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '2px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '2rem',
          marginTop: '2rem'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>Commission Earnings History</h2>
          
          {referralData.commission_history && referralData.commission_history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#A3AEC2' }}>
              <IoCash size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No commissions yet. Share your link to start earning!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#A3AEC2', fontSize: '14px', fontWeight: '600' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#A3AEC2', fontSize: '14px', fontWeight: '600' }}>Fee Type</th>
                    <th style={{ padding: '12px', textAlign: 'right', color: '#A3AEC2', fontSize: '14px', fontWeight: '600' }}>Commission %</th>
                    <th style={{ padding: '12px', textAlign: 'right', color: '#A3AEC2', fontSize: '14px', fontWeight: '600' }}>Amount Earned</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#A3AEC2', fontSize: '14px', fontWeight: '600' }}>From User</th>
                  </tr>
                </thead>
                <tbody>
                  {referralData.commission_history && referralData.commission_history.map((commission, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px', color: '#A3AEC2', fontSize: '14px' }}>
                        {new Date(commission.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', color: '#fff', fontSize: '14px' }}>
                        {commission.fee_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#00F0FF', fontWeight: '600', fontSize: '14px' }}>
                        {commission.commission_percent}%
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#22C55E', fontWeight: '700', fontSize: '16px' }}>
                        £{commission.amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', color: '#A3AEC2', fontSize: '12px' }}>
                        {commission.referred_user_id.substring(0, 8)}...
                      </td>
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
