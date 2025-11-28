import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Share2, Copy, Users, TrendingUp, DollarSign, Clock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function ReferralDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [referralData, setReferralData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('cryptobank_user') || '{}');
    if (!userData.user_id) {
      navigate('/login');
      return;
    }
    setUser(userData);
    loadReferralData(userData.user_id);
  }, [navigate]);

  const loadReferralData = async (userId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/referral/dashboard/${userId}`);
      setReferralData(response.data);
    } catch (error) {
      console.error('Failed to load referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (referralData?.referral_code) {
      navigator.clipboard.writeText(referralData.referral_code).then(() => {
        toast.success('Referral code copied!');
      }).catch(() => {
        toast.error('Failed to copy code');
      });
    }
  };

  const copyReferralLink = () => {
    if (referralData?.referral_link) {
      navigator.clipboard.writeText(referralData.referral_link).then(() => {
        toast.success('Referral link copied!');
      }).catch(() => {
        toast.error('Failed to copy link');
      });
    }
  };

  const shareViaWhatsApp = () => {
    const message = `Join Coin Hub X and get 0% trading fees for 30 days! Use my referral code: ${referralData.referral_code}\\n${referralData.referral_link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaTelegram = () => {
    const message = `Join Coin Hub X and get 0% trading fees for 30 days! Use my referral code: ${referralData.referral_code}\\n${referralData.referral_link}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralData.referral_link)}&text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaTwitter = () => {
    const message = `Just joined @CoinHubX - the best P2P crypto marketplace! Get 0% fees for 30 days with my referral: ${referralData.referral_code}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(referralData.referral_link)}`, '_blank');
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{
            border: '4px solid rgba(0, 240, 255, 0.1)',
            borderTop: '4px solid #00F0FF',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#00F0FF' }}>Loading referral data...</p>
        </div>
      </div>
    );
  }

  if (!referralData) return null;

  const totalEarnings = referralData.earnings_by_currency.reduce((sum, e) => sum + e.total_earned, 0);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'none',
              border: 'none',
              color: '#00F0FF',
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ← Back to Dashboard
          </button>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '900',
            color: '#fff',
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Gift size={40} color="#00F0FF" />
            Referral Program
          </h1>
          <p style={{ color: '#a0a0a0', fontSize: '16px' }}>
            Invite friends and earn 20% commission on all their trading fees for 12 months
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <Card style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(0, 240, 255, 0.05))',
            border: '2px solid #00F0FF',
            padding: '1.5rem',
            borderRadius: '16px',
            boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <Users size={32} color="#00F0FF" />
              <div style={{ fontSize: '32px' }}>👥</div>
            </div>
            <div style={{ color: '#00F0FF', fontSize: '36px', fontWeight: '900', marginBottom: '0.5rem' }}>
              {referralData.total_signups}
            </div>
            <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>Total Signups</div>
            <div style={{ color: '#888', fontSize: '13px', marginTop: '0.5rem' }}>
              {referralData.active_referrals} active referrals
            </div>
          </Card>

          <Card style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(168, 85, 247, 0.05))',
            border: '2px solid #A855F7',
            padding: '1.5rem',
            borderRadius: '16px',
            boxShadow: '0 0 30px rgba(168, 85, 247, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <DollarSign size={32} color="#A855F7" />
            </div>
            <div style={{ color: '#A855F7', fontSize: '36px', fontWeight: '900', marginBottom: '0.5rem' }}>
              ${(referralData.earnings_by_currency.reduce((sum, e) => sum + e.total_earned, 0)).toFixed(2)}
            </div>
            <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>Commission Earned</div>
            <div style={{ color: '#888', fontSize: '13px', marginTop: '0.5rem' }}>
              Total from referrals
            </div>
          </Card>

          <Card style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))',
            border: '2px solid #22C55E',
            padding: '1.5rem',
            borderRadius: '16px',
            boxShadow: '0 0 30px rgba(34, 197, 94, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <DollarSign size={32} color="#22C55E" />
            </div>
            <div style={{ color: '#22C55E', fontSize: '36px', fontWeight: '900', marginBottom: '0.5rem' }}>
              ${totalEarnings.toFixed(2)}
            </div>
            <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>Total Earnings</div>
            <div style={{ color: '#888', fontSize: '13px', marginTop: '0.5rem' }}>
              Across all currencies
            </div>
          </Card>

          <Card style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))',
            border: '2px solid #F59E0B',
            padding: '1.5rem',
            borderRadius: '16px',
            boxShadow: '0 0 30px rgba(245, 158, 11, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <Clock size={32} color="#F59E0B" />
            </div>
            <div style={{ color: '#F59E0B', fontSize: '36px', fontWeight: '900', marginBottom: '0.5rem' }}>
              20%
            </div>
            <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>Commission Rate</div>
            <div style={{ color: '#888', fontSize: '13px', marginTop: '0.5rem' }}>
              For 12 months per referral
            </div>
          </Card>
        </div>

        {/* Referral Code Card */}
        <Card style={{
          background: 'linear-gradient(135deg, #1a1f3a, #13182a)',
          border: '2px solid #00F0FF',
          padding: '2rem',
          borderRadius: '16px',
          marginBottom: '2rem',
          boxShadow: '0 0 40px rgba(0, 240, 255, 0.3)'
        }}>
          <h2 style={{
            color: '#fff',
            fontSize: '24px',
            fontWeight: '900',
            marginBottom: '1.5rem'
          }}>
            Your Referral Code & Link
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {/* Referral Code */}
            <div>
              <label style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '0.5rem' }}>
                Referral Code
              </label>
              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <code style={{
                  color: '#00F0FF',
                  fontSize: '24px',
                  fontWeight: '900',
                  letterSpacing: '3px'
                }}>
                  {referralData.referral_code}
                </code>
                <button
                  onClick={copyReferralCode}
                  style={{
                    background: '#00F0FF',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Copy size={16} />
                  COPY
                </button>
              </div>
            </div>

            {/* Referral Link */}
            <div>
              <label style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '0.5rem' }}>
                Referral Link
              </label>
              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <code style={{
                  color: '#00F0FF',
                  fontSize: '14px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  marginRight: '1rem'
                }}>
                  {referralData.referral_link}
                </code>
                <button
                  onClick={copyReferralLink}
                  style={{
                    background: '#00F0FF',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Copy size={16} />
                  COPY
                </button>
              </div>
            </div>
          </div>

          {/* Share Buttons */}
          <div>
            <label style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '0.5rem' }}>
              Share via Social Media
            </label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={shareViaWhatsApp}
                style={{
                  background: '#25D366',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 0 20px rgba(37, 211, 102, 0.3)'
                }}
              >
                <Share2 size={18} />
                WhatsApp
              </button>
              <button
                onClick={shareViaTelegram}
                style={{
                  background: '#0088cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 0 20px rgba(0, 136, 204, 0.3)'
                }}
              >
                <Share2 size={18} />
                Telegram
              </button>
              <button
                onClick={shareViaTwitter}
                style={{
                  background: '#1DA1F2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 0 20px rgba(29, 161, 242, 0.3)'
                }}
              >
                <Share2 size={18} />
                Twitter / X
              </button>
            </div>
          </div>
        </Card>

        {/* Earnings by Currency */}
        {referralData.earnings_by_currency.length > 0 && (
          <Card style={{
            background: 'linear-gradient(135deg, #1a1f3a, #13182a)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            padding: '2rem',
            borderRadius: '16px',
            marginBottom: '2rem'
          }}>
            <h2 style={{
              color: '#fff',
              fontSize: '20px',
              fontWeight: '900',
              marginBottom: '1.5rem'
            }}>
              Earnings by Currency
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {referralData.earnings_by_currency.map(earning => (
                <div key={earning.currency} style={{
                  background: 'rgba(0, 240, 255, 0.05)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '1rem'
                }}>
                  <div style={{ color: '#888', fontSize: '13px', marginBottom: '0.5rem' }}>
                    {earning.currency}
                  </div>
                  <div style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '900' }}>
                    {earning.total_earned.toFixed(8)}
                  </div>
                  <div style={{ color: '#888', fontSize: '12px', marginTop: '0.5rem' }}>
                    Paid: {earning.paid.toFixed(8)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recent Commissions */}
        {referralData.recent_commissions.length > 0 && (
          <Card style={{
            background: 'linear-gradient(135deg, #1a1f3a, #13182a)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            padding: '2rem',
            borderRadius: '16px'
          }}>
            <h2 style={{
              color: '#fff',
              fontSize: '20px',
              fontWeight: '900',
              marginBottom: '1.5rem'
            }}>
              Recent Commissions
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.2)' }}>
                    <th style={{ color: '#888', fontSize: '13px', fontWeight: '600', padding: '1rem', textAlign: 'left' }}>Date</th>
                    <th style={{ color: '#888', fontSize: '13px', fontWeight: '600', padding: '1rem', textAlign: 'left' }}>Type</th>
                    <th style={{ color: '#888', fontSize: '13px', fontWeight: '600', padding: '1rem', textAlign: 'right' }}>Amount</th>
                    <th style={{ color: '#888', fontSize: '13px', fontWeight: '600', padding: '1rem', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {referralData.recent_commissions.map(commission => (
                    <tr key={commission.commission_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ color: '#fff', fontSize: '14px', padding: '1rem' }}>
                        {new Date(commission.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ color: '#00F0FF', fontSize: '14px', padding: '1rem' }}>
                        {commission.transaction_type}
                      </td>
                      <td style={{ color: '#22C55E', fontSize: '16px', fontWeight: '700', padding: '1rem', textAlign: 'right' }}>
                        {commission.amount.toFixed(8)} {commission.currency}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{
                          background: commission.status === 'paid' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: commission.status === 'paid' ? '#22C55E' : '#F59E0B',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700'
                        }}>
                          {commission.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* How it Works */}
        <Card style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(168, 85, 247, 0.05))',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          padding: '2rem',
          borderRadius: '16px',
          marginTop: '2rem'
        }}>
          <h2 style={{
            color: '#A855F7',
            fontSize: '20px',
            fontWeight: '900',
            marginBottom: '1.5rem'
          }}>
            How It Works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '40px', marginBottom: '0.5rem' }}>1️⃣</div>
              <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '0.5rem' }}>
                Share Your Code
              </h3>
              <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.6' }}>
                Share your unique referral code or link with friends via WhatsApp, Telegram, or Twitter
              </p>
            </div>
            <div>
              <div style={{ fontSize: '40px', marginBottom: '0.5rem' }}>2️⃣</div>
              <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '0.5rem' }}>
                They Get 0% Fees
              </h3>
              <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.6' }}>
                Your referred friends enjoy 0% trading fees for their first 30 days on the platform
              </p>
            </div>
            <div>
              <div style={{ fontSize: '40px', marginBottom: '0.5rem' }}>3️⃣</div>
              <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '0.5rem' }}>
                You Earn 20%
              </h3>
              <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.6' }}>
                Earn 20% commission on all platform fees generated by your referrals for 12 months automatically
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
