import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { IoCash, IoCheckmark, IoCopy, IoGift as Gift, IoOpenOutline, IoPeople, IoShareSocial as Share2, IoTrendingUp } from 'react-icons/io5';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
const API = process.env.REACT_APP_BACKEND_URL;

// API already defined

export default function ReferralLinkGenerator() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const userData = localStorage.getItem('cryptobank_user');
      if (!userData) {
        navigate('/login');
        return;
      }

      const user = JSON.parse(userData);
      const userId = user.user_id;

      const response = await axios.get(`${API}/referral/dashboard/${userId}`);
      
      if (response.data.success) {
        setReferralData(response.data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast.error('Failed to load referral data');
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success('Referral link copied!');
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success('Referral code copied!');
    }
  };

  const shareOnTwitter = () => {
    const text = `Join Coin Hub IoClose as X and start trading crypto securely! Use my referral code: ${referralData.referral_code}`;
    const url = referralData.referral_link;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareOnWhatsApp = () => {
    const text = `Join Coin Hub IoClose as X using my referral link: ${referralData.referral_link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareOnTelegram = () => {
    const text = `Join Coin Hub IoClose as X using my referral link: ${referralData.referral_link}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralData.referral_link)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ minHeight: '100vh', background: '#0B0E13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#FFF' }}>Loading referral data...</div>
        </div>
      </Layout>
    );
  }

  if (!referralData) {
    return (
      <Layout>
        <div style={{ minHeight: '100vh', background: '#0B0E13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#FFF' }}>Failed to load referral data</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ minHeight: '100vh', background: '#0B0E13', padding: '2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#FFF', marginBottom: '0.5rem' }}>
              <span style={{ 
                background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Your Referral Program
              </span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>
              Earn 20% commission on every trade your referrals make
            </p>
          </div>

          {/* Stats Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1.5rem', 
            marginBottom: '2rem' 
          }}>
            {/* Total Referrals */}
            <div style={{
              background: 'linear-gradient(135deg, #11141A 0%, #1A1D26 100%)',
              border: '2px solid #00E0FF',
              borderRadius: '16px',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <IoPeople size={20} style={{ color: '#00E0FF' }} />
                <div style={{ fontSize: '0.875rem', color: '#A8A8A8', textTransform: 'uppercase' }}>
                  Total Referrals
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: '#00F6FF' }}>
                {referralData.total_referrals || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                {referralData.qualified_referrals || 0} qualified (≥£150 top-up)
              </div>
            </div>

            {/* Total Earned */}
            <div style={{
              background: 'linear-gradient(135deg, #11141A 0%, #1A1D26 100%)',
              border: '2px solid #A855F7',
              borderRadius: '16px',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <IoCash size={20} style={{ color: '#A855F7' }} />
                <div style={{ fontSize: '0.875rem', color: '#A8A8A8', textTransform: 'uppercase' }}>
                  Total Earned
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: '#A855F7' }}>
                £{((referralData.total_referral_bonus_earned || 0) + (referralData.lifetime_commission_earned || 0)).toFixed(2)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                Bonus: £{(referralData.total_referral_bonus_earned || 0).toFixed(2)} | Commission: £{(referralData.lifetime_commission_earned || 0).toFixed(2)}
              </div>
            </div>

            {/* Active Referrals */}
            <div style={{
              background: 'linear-gradient(135deg, #11141A 0%, #1A1D26 100%)',
              border: '2px solid #22C55E',
              borderRadius: '16px',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <IoTrendingUp size={20} style={{ color: '#22C55E' }} />
                <div style={{ fontSize: '0.875rem', color: '#A8A8A8', textTransform: 'uppercase' }}>
                  Active Referrals
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: '#22C55E' }}>
                {referralData.active_referrals || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                Currently active users
              </div>
            </div>
          </div>

          {/* Referral Link Section */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
            border: '2px solid rgba(0, 240, 255, 0.5)',
            borderRadius: '20px',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#FFF', marginBottom: '1rem' }}>
              Your Unique Referral Link
            </h2>
            
            {/* Referral Code */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: '#A8A8A8', display: 'block', marginBottom: '0.5rem' }}>
                Referral Code
              </label>
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center'
              }}>
                <div style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '2px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '12px',
                  padding: '1rem',
                  fontFamily: 'monospace',
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#00F0FF',
                  textAlign: 'center',
                  letterSpacing: '0.05em'
                }}>
                  {referralData.referral_code}
                </div>
                <button
                  onClick={() => copyToClipboard(referralData.referral_code, 'code')}
                  style={{
                    padding: '1rem',
                    background: copiedCode ? '#22C55E' : 'rgba(0, 240, 255, 0.2)',
                    border: `2px solid ${copiedCode ? '#22C55E' : '#00F0FF'}`,
                    borderRadius: '12px',
                    color: copiedCode ? '#FFF' : '#00F0FF',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {copiedCode ? <IoCheckmark size={24} /> : <IoCopy size={24} />}
                </button>
              </div>
            </div>

            {/* Referral Link */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: '#A8A8A8', display: 'block', marginBottom: '0.5rem' }}>
                Referral Link
              </label>
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center'
              }}>
                <div style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '2px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: '12px',
                  padding: '1rem',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  color: '#A855F7',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {referralData.referral_link}
                </div>
                <button
                  onClick={() => copyToClipboard(referralData.referral_link, 'link')}
                  style={{
                    padding: '1rem',
                    background: copiedLink ? '#22C55E' : 'rgba(168, 85, 247, 0.2)',
                    border: `2px solid ${copiedLink ? '#22C55E' : '#A855F7'}`,
                    borderRadius: '12px',
                    color: copiedLink ? '#FFF' : '#A855F7',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {copiedLink ? <IoCheckmark size={24} /> : <IoCopy size={24} />}
                </button>
              </div>
            </div>

            {/* Share Buttons */}
            <div style={{ marginTop: '1.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: '#A8A8A8', display: 'block', marginBottom: '0.75rem' }}>
                Share Your Link
              </label>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={shareOnTwitter}
                  style={{
                    flex: '1',
                    minWidth: '150px',
                    padding: '0.875rem 1.5rem',
                    background: 'linear-gradient(135deg, #1DA1F2, #0C85D0)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#FFF',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <IoOpenOutline size={18} /> Twitter
                </button>
                <button
                  onClick={shareOnWhatsApp}
                  style={{
                    flex: '1',
                    minWidth: '150px',
                    padding: '0.875rem 1.5rem',
                    background: 'linear-gradient(135deg, #25D366, #1DA851)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#FFF',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <Share2 size={18} /> WhatsApp
                </button>
                <button
                  onClick={shareOnTelegram}
                  style={{
                    flex: '1',
                    minWidth: '150px',
                    padding: '0.875rem 1.5rem',
                    background: 'linear-gradient(135deg, #0088cc, #006699)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#FFF',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <Share2 size={18} /> Telegram
                </button>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div style={{
            background: '#11141A',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#FFF', marginBottom: '1.5rem' }}>
              How It Works
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00F0FF, #00B8E6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  flexShrink: 0
                }}>
                  1
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#FFF', marginBottom: '0.25rem' }}>
                    Share Your Link
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                    Share your unique referral link with friends, family, or on social media
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #A855F7, #8B5CF6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  flexShrink: 0
                }}>
                  2
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#FFF', marginBottom: '0.25rem' }}>
                    They Sign Up & Top Up £150+
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                    Your referral registers and makes their first deposit of £150 or more
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  flexShrink: 0
                }}>
                  3
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#FFF', marginBottom: '0.25rem' }}>
                    You Both Earn
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                    You get £20 bonus + 20% lifetime commission on all their trading fees
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings Breakdown */}
          {referralData.earnings_by_currency && referralData.earnings_by_currency.length > 0 && (
            <div style={{
              background: '#11141A',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '2rem'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#FFF', marginBottom: '1.5rem' }}>
                Earnings by Currency
              </h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {referralData.earnings_by_currency.map((earning, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    background: 'rgba(0, 240, 255, 0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(0, 240, 255, 0.2)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: '#A8A8A8' }}>
                        {earning.currency}
                      </div>
                      <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#00F0FF' }}>
                        {earning.total_earned.toFixed(8)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                        Paid: {earning.paid.toFixed(8)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#F59E0B' }}>
                        Pending: {earning.pending.toFixed(8)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
