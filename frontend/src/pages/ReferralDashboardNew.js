import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  IoCopyOutline, 
  IoLogoWhatsapp,
  IoLogoFacebook,
  IoLogoTwitter,
  IoCheckmarkCircleOutline,
  IoInformationCircleOutline,
  IoTrendingUpOutline,
  IoPeopleOutline,
  IoTimeOutline,
  IoTrophyOutline
} from 'react-icons/io5';
import API_BASE_URL from '@/config/api';

const API = API_BASE_URL;

export default function ReferralDashboardNew() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState({
    total_earned: 0,
    pending: 0,
    completed: 0,
    this_month: 0,
    last_30_days: []
  });
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [showUsersList, setShowUsersList] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  useEffect(() => {
    if (user?.user_id) {
      fetchReferralData();
    }
  }, [user]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      
      const dashboardRes = await axios.get(`${API}/referral/dashboard/${user.user_id}`);
      setReferralData(dashboardRes.data);
      
      const commissionsRes = await axios.get(`${API}/referral/commissions/${user.user_id}`);
      setCommissions(commissionsRes.data.commissions || []);
      
      const totalEarned = commissionsRes.data.commissions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;
      const completed = commissionsRes.data.commissions?.filter(c => c.status === 'completed').length || 0;
      const pending = commissionsRes.data.commissions?.filter(c => c.status === 'pending').length || 0;
      
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonth = commissionsRes.data.commissions?.filter(c => {
        const date = new Date(c.created_at);
        return date >= thisMonthStart;
      }).reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;
      
      setStats({
        total_earned: totalEarned,
        pending: pending,
        completed: completed,
        this_month: thisMonth
      });
      
    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(type);
    toast.success(`${type === 'code' ? 'Referral code' : 'Referral link'} copied!`);
    setTimeout(() => setCopySuccess(''), 2000);
  };

  const shareVia = (platform) => {
    const link = referralData?.referral_link || '';
    const text = `Join CoinHub X and start trading crypto! Use my referral link: ${link}`;
    
    const urls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join CoinHub X with my referral')}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`
    };
    
    if (urls[platform]) {
      window.open(urls[platform], '_blank');
    }
  };

  const calculateGoldenValue = () => {
    const standardEarnings = stats.total_earned;
    const goldenEarnings = standardEarnings * 2.5;
    const difference = goldenEarnings - standardEarnings;
    const breakEvenNeeded = Math.max(0, 150 - difference);
    
    return { goldenEarnings, difference, breakEvenNeeded };
  };

  const getTierInfo = (tier) => {
    if (!tier) return { name: 'Standard', rate: '20%', color: '#00F0FF' };
    const tierLower = tier.toLowerCase();
    if (tierLower === 'golden') return { name: 'Golden', rate: '50%', color: '#FFD700' };
    return { name: 'Standard', rate: '20%', color: '#00F0FF' };
  };

  const tierInfo = getTierInfo(referralData?.tier);
  const { goldenEarnings, difference, breakEvenNeeded } = calculateGoldenValue();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0b1a 0%, #1a1f3a 50%, #0a0b1a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(0, 240, 255, 0.1)',
            borderTop: '4px solid #00F0FF',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#00F0FF', fontSize: '18px', fontWeight: '600' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0b1a 0%, #1a1f3a 50%, #0a0b1a 100%)',
      padding: '1rem',
      paddingTop: '80px'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        {/* 1. HEADER */}
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>
            Referral Dashboard
          </h1>
          <p style={{ color: '#888', fontSize: '14px' }}>
            Invite friends and earn commission on every transaction
          </p>
        </div>

        {/* 2. COMBINED EARNINGS PANEL */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
          borderRadius: '16px',
          padding: '1.25rem',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          marginBottom: '1rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
              <IoTrendingUpOutline size={18} color="#00F0FF" />
              <span style={{ color: '#888', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Earned</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#00F0FF' }}>
              £{stats.total_earned.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
              <IoTimeOutline size={18} color="#A855F7" />
              <span style={{ color: '#888', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>This Month</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#A855F7' }}>
              £{stats.this_month.toFixed(2)}
            </div>
            <div style={{ color: '#666', fontSize: '10px', marginTop: '4px' }}>
              From {stats.completed} active referrals
            </div>
          </div>
        </div>

        {/* 3. CURRENT TIER PANEL */}
        <div style={{
          background: 'linear-gradient(135deg, #1a1f3a 0%, #13182a 100%)',
          borderRadius: '16px',
          padding: '1.25rem',
          border: `2px solid ${tierInfo.color}`,
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Tier</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: tierInfo.color }}>
                {tierInfo.name}
              </div>
            </div>
            <div style={{
              background: `${tierInfo.color}20`,
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              {tierInfo.name === 'Golden' ? '⭐' : '🎯'}
            </div>
          </div>
          
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '0.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>Commission Rate</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: tierInfo.color }}>
                  {tierInfo.rate}
                </div>
              </div>
              <div 
                onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                style={{ cursor: 'pointer', color: '#00F0FF' }}
              >
                <IoInformationCircleOutline size={24} />
              </div>
            </div>
            <div style={{ color: '#aaa', fontSize: '12px', marginTop: '0.5rem', lineHeight: '1.4' }}>
              You earn {tierInfo.rate} of the trading fees your referrals generate, for life.
            </div>
            {showInfoTooltip && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px'
              }}>
                <strong>Example:</strong> If your referral pays £10 in trading fees, you earn £{tierInfo.name === 'Golden' ? '5.00' : '2.00'}.
              </div>
            )}
          </div>

          {/* PROGRESS BAR */}
          {tierInfo.name !== 'Golden' && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: '#888',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <span>Standard</span>
                <span>Golden</span>
              </div>
              <div style={{
                height: '8px',
                background: 'rgba(255, 215, 0, 0.2)',
                borderRadius: '4px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  height: '100%',
                  width: '30%',
                  background: 'linear-gradient(90deg, #00F0FF, #FFD700)',
                  borderRadius: '4px'
                }} />
              </div>
              <div style={{ fontSize: '10px', color: '#aaa', marginTop: '6px', textAlign: 'center' }}>
                Upgrade available anytime – one-time £150
              </div>
            </div>
          )}
        </div>

        {/* 4. GOLDEN TIER UPGRADE */}
        {tierInfo.name !== 'Golden' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 165, 0, 0.1))',
            border: '2px solid rgba(255, 215, 0, 0.5)',
            borderRadius: '16px',
            padding: '1.25rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
              <IoTrophyOutline size={24} color="#FFD700" />
              <h3 style={{
                fontSize: '18px',
                fontWeight: '900',
                color: '#FFD700',
                margin: 0
              }}>
                Upgrade to GOLDEN TIER
              </h3>
            </div>
            
            <p style={{ color: '#FFD700', fontSize: '14px', marginBottom: '1rem', fontWeight: '600' }}>
              Lifetime 50% commission
            </p>
            
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px', marginBottom: '1rem' }}>
              Pay once. Earn 2.5× commission on every trade, forever.
            </p>

            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '40px', fontWeight: '900', color: '#FFD700', marginBottom: '0.5rem' }}>
                £150
              </div>
              <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '1rem' }}>
                One-time payment, no subscription
              </div>
              
              <div style={{ fontSize: '12px', color: '#fff', lineHeight: '1.8' }}>
                <div style={{ marginBottom: '6px' }}>✔ 50% of all referral trading fees</div>
                <div style={{ marginBottom: '6px' }}>✔ Applies to all current + future referrals</div>
                <div>✔ One-time payment, no subscription</div>
              </div>
            </div>

            {stats.total_earned > 0 && (
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1rem',
                fontSize: '12px',
                color: '#fff'
              }}>
                <strong style={{ color: '#FFD700' }}>Value Comparison:</strong><br />
                With your current referrals, Golden Tier would have earned you £{goldenEarnings.toFixed(2)} instead of £{stats.total_earned.toFixed(2)}.
                {breakEvenNeeded > 0 ? (
                  <div style={{ marginTop: '6px', color: '#aaa' }}>
                    You need only £{breakEvenNeeded.toFixed(2)} more commission to break even on the upgrade.
                  </div>
                ) : (
                  <div style={{ marginTop: '6px', color: '#00FF88' }}>
                    ✅ You've already earned enough to justify the upgrade!
                  </div>
                )}
              </div>
            )}

            <button
              onClick={async () => {
                try {
                  const response = await axios.post(`${API}/referrals/purchase-vip`, {
                    user_id: user.user_id
                  });
                  
                  if (response.data.success) {
                    toast.success('🎉 Upgraded to GOLDEN TIER!');
                    fetchReferralData();
                  } else {
                    toast.error(response.data.message || 'Upgrade failed');
                  }
                } catch (error) {
                  toast.error('Failed to upgrade');
                }
              }}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                border: 'none',
                borderRadius: '12px',
                color: '#000',
                fontSize: '16px',
                fontWeight: '900',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(255, 215, 0, 0.4)'
              }}
            >
              🏆 UPGRADE NOW
            </button>
          </div>
        )}

        {/* 5. REFERRAL STATS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}>
          <div 
            onClick={() => setShowUsersList(showUsersList === 'active' ? null : 'active')}
            style={{
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(0, 240, 255, 0.05))',
              borderRadius: '12px',
              padding: '1rem',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
              <IoPeopleOutline size={16} color="#00F0FF" />
              <span style={{ color: '#888', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase' }}>Active Referrals</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#00F0FF' }}>
              {stats.completed}
            </div>
          </div>

          <div 
            onClick={() => setShowUsersList(showUsersList === 'pending' ? null : 'pending')}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 165, 0, 0.1), rgba(255, 165, 0, 0.05))',
              borderRadius: '12px',
              padding: '1rem',
              border: '1px solid rgba(255, 165, 0, 0.3)',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
              <IoTimeOutline size={16} color="#FFA500" />
              <span style={{ color: '#888', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase' }}>Pending Sign-ups</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#FFA500' }}>
              {stats.pending}
            </div>
          </div>
        </div>

        {/* User List Modal */}
        {showUsersList && (
          <div style={{
            background: 'rgba(26, 31, 58, 0.95)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1rem',
            border: '1px solid rgba(0, 240, 255, 0.3)'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#00F0FF', marginBottom: '0.75rem' }}>
              {showUsersList === 'active' ? 'Active Referrals' : 'Pending Sign-ups'}
            </div>
            {commissions.length === 0 ? (
              <div style={{ color: '#888', fontSize: '12px', textAlign: 'center', padding: '1rem' }}>
                No referrals yet. Start sharing your link!
              </div>
            ) : (
              commissions.slice(0, 5).map((c, idx) => (
                <div key={idx} style={{
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                  fontSize: '12px',
                  color: '#fff'
                }}>
                  <div style={{ fontWeight: '600' }}>User {idx + 1}</div>
                  <div style={{ color: '#888', fontSize: '11px' }}>Last activity: {new Date(c.created_at).toLocaleDateString()}</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 6. SHARE SECTION */}
        <div style={{
          background: 'linear-gradient(135deg, #1a1f3a 0%, #13182a 100%)',
          borderRadius: '16px',
          padding: '1.25rem',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          marginBottom: '1rem'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#00F0FF', marginBottom: '0.5rem' }}>
            Share Your Link
          </div>
          <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '1rem' }}>
            Every friend who joins with your link earns you lifetime commission.
          </div>

          {/* Share Icons */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            marginBottom: '1rem',
            justifyContent: 'space-around'
          }}>
            <button
              onClick={() => shareVia('whatsapp')}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: '#25D366',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <IoLogoWhatsapp size={24} />
            </button>
            
            <button
              onClick={() => shareVia('telegram')}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: '#0088cc',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '20px',
                fontWeight: '700'
              }}
            >
              ✈️
            </button>
            
            <button
              onClick={() => shareVia('twitter')}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: '#1DA1F2',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <IoLogoTwitter size={24} />
            </button>
            
            <button
              onClick={() => shareVia('facebook')}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: '#1877F2',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <IoLogoFacebook size={24} />
            </button>
            
            <button
              onClick={() => copyToClipboard(referralData?.referral_link, 'link')}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: copySuccess === 'link' ? '#00FF88' : 'rgba(0, 240, 255, 0.2)',
                border: '1px solid #00F0FF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: copySuccess === 'link' ? '#000' : '#00F0FF'
              }}
            >
              {copySuccess === 'link' ? <IoCheckmarkCircleOutline size={24} /> : <IoCopyOutline size={24} />}
            </button>
          </div>

          {/* Referral Code */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase' }}>Your Referral Code</div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(0, 240, 255, 0.2)'
            }}>
              <div style={{ flex: 1, color: '#00F0FF', fontSize: '16px', fontWeight: '700' }}>
                {referralData?.referral_code || 'Loading...'}
              </div>
              <button
                onClick={() => copyToClipboard(referralData?.referral_code, 'code')}
                style={{
                  padding: '8px 16px',
                  background: copySuccess === 'code' ? '#00FF88' : 'rgba(0, 240, 255, 0.2)',
                  border: 'none',
                  borderRadius: '6px',
                  color: copySuccess === 'code' ? '#000' : '#00F0FF',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                {copySuccess === 'code' ? '✓' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Referral Link */}
          <div>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase' }}>Your Referral Link</div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(0, 240, 255, 0.2)'
            }}>
              <div style={{ flex: 1, color: '#00F0FF', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {referralData?.referral_link || 'Loading...'}
              </div>
              <button
                onClick={() => copyToClipboard(referralData?.referral_link, 'link')}
                style={{
                  padding: '8px 16px',
                  background: copySuccess === 'link' ? '#00FF88' : 'rgba(0, 240, 255, 0.2)',
                  border: 'none',
                  borderRadius: '6px',
                  color: copySuccess === 'link' ? '#000' : '#00F0FF',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                {copySuccess === 'link' ? '✓' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* 9. ACTIVITY TIMELINE */}
        {commissions.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #1a1f3a 0%, #13182a 100%)',
            borderRadius: '16px',
            padding: '1.25rem',
            border: '1px solid rgba(0, 240, 255, 0.3)'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#00F0FF', marginBottom: '1rem' }}>
              Recent Activity
            </div>
            {commissions.slice(0, 5).map((c, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                marginBottom: '0.5rem',
                fontSize: '12px'
              }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: '600' }}>
                    {c.transaction_type === 'trading' ? 'Trade completed' : 'Transaction'}
                  </div>
                  <div style={{ color: '#888', fontSize: '11px' }}>
                    {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
                <div style={{
                  color: '#00FF88',
                  fontWeight: '700',
                  fontSize: '14px'
                }}>
                  +£{c.commission_amount?.toFixed(2) || '0.00'}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}