/* eslint-disable */
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
  IoTrophyOutline,
  IoQrCodeOutline,
  IoScanOutline,
  IoPhonePortraitOutline
} from 'react-icons/io5';
import QRCode from 'qrcode';
const API = process.env.REACT_APP_BACKEND_URL;

// API already defined

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
  const [qrCodeUrl, setQrCodeUrl] = useState('');

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
  }, [user?.user_id]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      
      // 🔥 USE COMPREHENSIVE ENDPOINT - 100% REAL DATA FROM ALL SOURCES
      const comprehensiveRes = await axios.get(`${API}/referral/dashboard/comprehensive/${user.user_id}`);
      const data = comprehensiveRes.data;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load dashboard');
      }
      
      // Set referral basic info
      setReferralData({
        referral_code: data.referral_code,
        referral_link: data.referral_link,
        tier: data.tier
      });
      
      // Set real-time stats from ALL revenue streams
      setStats({
        total_earned: data.total_earnings?.total_gbp || 0,
        this_month: data.earnings_by_period?.month?.amount || 0,
        completed: data.referral_stats?.active_referrals || 0,
        pending: data.referral_stats?.pending_signups || 0,
        today: data.earnings_by_period?.today?.amount || 0,
        week: data.earnings_by_period?.week?.amount || 0,
        year: data.earnings_by_period?.year?.amount || 0
      });
      
      // Set activity timeline (real transactions)
      setCommissions(data.activity_timeline || []);
      
      // Store comprehensive data for advanced features
      window.referralAnalytics = {
        earnings_by_stream: data.earnings_by_stream || [],
        referral_tree: data.referral_tree || {},
        conversion_metrics: data.conversion_metrics || {},
        geographic_breakdown: data.geographic_breakdown || [],
        tier_progress: data.tier_progress || {}
      };

      // Generate QR code for referral link
      if (data.referral_link) {
        try {
          const qrUrl = await QRCode.toDataURL(data.referral_link, {
            width: 300,
            margin: 2,
            color: {
              dark: '#00F0FF',
              light: '#0a0b1a'
            },
            errorCorrectionLevel: 'M'
          });
          setQrCodeUrl(qrUrl);
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      }
      
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
    // Use REAL tier progress data from backend
    const tierProgress = window.referralAnalytics?.tier_progress || {};
    
    return {
      goldenEarnings: tierProgress.golden_potential_earnings || (stats.total_earned * 2.5),
      difference: tierProgress.difference || (stats.total_earned * 1.5),
      breakEvenNeeded: tierProgress.break_even_needed || Math.max(0, 150 - (stats.total_earned * 1.5)),
      progress_percentage: tierProgress.progress_percentage || 0,
      is_worth_upgrading: tierProgress.is_worth_upgrading || false
    };
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
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0.8; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-10px) rotate(1deg); }
            66% { transform: translateY(5px) rotate(-1deg); }
          }
          @keyframes scan {
            0% { top: 2rem; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: calc(100% - 4rem); opacity: 0; }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
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
                    ✅ You&apos;ve already earned enough to justify the upgrade!
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

        {/* User List Modal - REAL DATA FROM REFERRAL TREE */}
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
            {(() => {
              const referralTree = window.referralAnalytics?.referral_tree || {};
              const referrals = referralTree.referrals || [];
              const filteredReferrals = showUsersList === 'active' 
                ? referrals.filter(r => r.status === 'active')
                : referrals.filter(r => r.status === 'pending');
              
              if (filteredReferrals.length === 0) {
                return (
                  <div style={{ color: '#888', fontSize: '12px', textAlign: 'center', padding: '1rem' }}>
                    No {showUsersList} referrals yet. Start sharing your link!
                  </div>
                );
              }
              
              return filteredReferrals.slice(0, 10).map((referral, idx) => (
                <div key={idx} style={{
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                  fontSize: '12px',
                  color: '#fff'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600' }}>{referral.username || `User ${idx + 1}`}</div>
                      <div style={{ color: '#888', fontSize: '11px' }}>
                        {referral.email_masked}
                      </div>
                      <div style={{ color: '#888', fontSize: '11px' }}>
                        {referral.last_activity ? `Last: ${new Date(referral.last_activity).toLocaleDateString()}` : 'Joined: ' + new Date(referral.joined_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#00FF88', fontWeight: '700' }}>
                        £{referral.total_earned_from_user?.toFixed(2) || '0.00'}
                      </div>
                      <div style={{ color: '#888', fontSize: '10px' }}>
                        {referral.transaction_count || 0} txns
                      </div>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

        {/* 6. PREMIUM QR CODE & SHARE SECTION */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08), rgba(168, 85, 247, 0.08))',
          borderRadius: '20px',
          padding: '2rem',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          marginBottom: '1rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Animated background particles */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 80%, rgba(0,240,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(168,85,247,0.1) 0%, transparent 50%)',
            animation: 'float 6s ease-in-out infinite',
            pointerEvents: 'none'
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 40px rgba(0,240,255,0.6)',
                animation: 'pulse 2s ease-in-out infinite'
              }}>
                <IoQrCodeOutline size={32} style={{ color: '#000' }} />
              </div>
              <div>
                <h3 style={{
                  fontSize: '28px',
                  fontWeight: '900',
                  background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: 0,
                  textShadow: '0 0 30px rgba(0,240,255,0.3)'
                }}>
                  Share & Earn
                </h3>
                <p style={{ 
                  color: '#A3AEC2', 
                  fontSize: '16px', 
                  margin: 0,
                  fontWeight: '600'
                }}>
                  Scan to join • Lifetime commission
                </p>
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '300px 1fr', 
              gap: '2rem', 
              alignItems: 'center' 
            }}>
              {/* Premium QR Code Section */}
              <div style={{
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '20px',
                padding: '2rem',
                border: '3px solid transparent',
                backgroundImage: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), linear-gradient(135deg, #00F0FF, #A855F7)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'content-box, border-box',
                position: 'relative',
                textAlign: 'center'
              }}>
                {/* Scanning animation overlay */}
                <div style={{
                  position: 'absolute',
                  top: '2rem',
                  left: '2rem',
                  right: '2rem',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #00F0FF, transparent)',
                  animation: 'scan 3s ease-in-out infinite',
                  zIndex: 2
                }} />

                <div style={{
                  fontSize: '18px',
                  fontWeight: '900',
                  color: '#00F0FF',
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  textShadow: '0 0 20px rgba(0,240,255,0.5)'
                }}>
                  SCAN TO JOIN
                </div>

                {qrCodeUrl ? (
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={qrCodeUrl} 
                      alt="Referral QR Code" 
                      style={{
                        width: '200px',
                        height: '200px',
                        borderRadius: '12px',
                        border: '2px solid rgba(0,240,255,0.3)',
                        boxShadow: '0 0 30px rgba(0,240,255,0.3)',
                        background: '#0a0b1a'
                      }}
                    />
                    {/* Corner decorations */}
                    <div style={{
                      position: 'absolute',
                      top: '-5px',
                      left: '-5px',
                      width: '30px',
                      height: '30px',
                      border: '3px solid #00F0FF',
                      borderRight: 'none',
                      borderBottom: 'none',
                      borderRadius: '8px 0 0 0'
                    }} />
                    <div style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      width: '30px',
                      height: '30px',
                      border: '3px solid #00F0FF',
                      borderLeft: 'none',
                      borderBottom: 'none',
                      borderRadius: '0 8px 0 0'
                    }} />
                    <div style={{
                      position: 'absolute',
                      bottom: '-5px',
                      left: '-5px',
                      width: '30px',
                      height: '30px',
                      border: '3px solid #00F0FF',
                      borderRight: 'none',
                      borderTop: 'none',
                      borderRadius: '0 0 0 8px'
                    }} />
                    <div style={{
                      position: 'absolute',
                      bottom: '-5px',
                      right: '-5px',
                      width: '30px',
                      height: '30px',
                      border: '3px solid #00F0FF',
                      borderLeft: 'none',
                      borderTop: 'none',
                      borderRadius: '0 0 8px 0'
                    }} />
                  </div>
                ) : (
                  <div style={{
                    width: '200px',
                    height: '200px',
                    borderRadius: '12px',
                    border: '2px dashed rgba(0,240,255,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00F0FF',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    Generating QR...
                  </div>
                )}

                <div style={{
                  fontSize: '14px',
                  color: '#A855F7',
                  marginTop: '1rem',
                  fontWeight: '700',
                  textShadow: '0 0 15px rgba(168,85,247,0.5)'
                }}>
                  Point camera here
                </div>
              </div>

              {/* Share Options & Links */}
              <div>
                {/* Social Share Buttons */}
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '900',
                    color: '#FFFFFF',
                    marginBottom: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    Share on Social Media
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '1rem'
                  }}>
                    <button
                      onClick={() => shareVia('whatsapp')}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #25D366, #128C7E)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 8px 32px rgba(37,211,102,0.4)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <IoLogoWhatsapp size={28} />
                    </button>
                    
                    <button
                      onClick={() => shareVia('telegram')}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #0088cc, #005577)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '24px',
                        fontWeight: '700',
                        boxShadow: '0 8px 32px rgba(0,136,204,0.4)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      ✈️
                    </button>
                    
                    <button
                      onClick={() => shareVia('twitter')}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #1DA1F2, #0d8bd9)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 8px 32px rgba(29,161,242,0.4)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <IoLogoTwitter size={28} />
                    </button>
                    
                    <button
                      onClick={() => shareVia('facebook')}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #1877F2, #166fe5)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 8px 32px rgba(24,119,242,0.4)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <IoLogoFacebook size={28} />
                    </button>
                    
                    <button
                      onClick={() => copyToClipboard(referralData?.referral_link, 'link')}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '16px',
                        background: copySuccess === 'link' ? 'linear-gradient(135deg, #00FF88, #00cc6a)' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000',
                        boxShadow: copySuccess === 'link' ? '0 8px 32px rgba(0,255,136,0.4)' : '0 8px 32px rgba(0,240,255,0.4)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      {copySuccess === 'link' ? <IoCheckmarkCircleOutline size={28} /> : <IoCopyOutline size={28} />}
                    </button>
                  </div>
                </div>

                {/* Referral Code */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{
                    fontSize: '14px',
                    color: '#A3AEC2',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: '700'
                  }}>
                    Your Referral Code
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '2px solid rgba(0,240,255,0.3)'
                  }}>
                    <div style={{
                      flex: 1,
                      fontSize: '20px',
                      fontWeight: '900',
                      background: 'linear-gradient(135deg, #00F0FF, #FFFFFF)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: '0 0 20px rgba(0,240,255,0.5)'
                    }}>
                      {referralData?.referral_code || 'Loading...'}
                    </div>
                    <button
                      onClick={() => copyToClipboard(referralData?.referral_code, 'code')}
                      style={{
                        padding: '12px 20px',
                        background: copySuccess === 'code' ? 'linear-gradient(135deg, #00FF88, #00cc6a)' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#000',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        boxShadow: '0 4px 16px rgba(0,240,255,0.3)'
                      }}
                    >
                      {copySuccess === 'code' ? '✓ COPIED' : 'COPY'}
                    </button>
                  </div>
                </div>

                {/* Referral Link */}
                <div>
                  <div style={{
                    fontSize: '14px',
                    color: '#A3AEC2',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: '700'
                  }}>
                    Your Referral Link
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '2px solid rgba(168,85,247,0.3)'
                  }}>
                    <div style={{
                      flex: 1,
                      color: '#A855F7',
                      fontSize: '14px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: '600'
                    }}>
                      {referralData?.referral_link || 'Loading...'}
                    </div>
                    <button
                      onClick={() => copyToClipboard(referralData?.referral_link, 'link')}
                      style={{
                        padding: '12px 20px',
                        background: copySuccess === 'link' ? 'linear-gradient(135deg, #00FF88, #00cc6a)' : 'linear-gradient(135deg, #A855F7, #00F0FF)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#000',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        boxShadow: '0 4px 16px rgba(168,85,247,0.3)'
                      }}
                    >
                      {copySuccess === 'link' ? '✓ COPIED' : 'COPY'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 9. ACTIVITY TIMELINE - REAL TRANSACTION DATA */}
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
            {commissions.slice(0, 10).map((activity, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                marginBottom: '0.5rem',
                fontSize: '12px',
                border: '1px solid rgba(0, 240, 255, 0.1)'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: '600', marginBottom: '4px' }}>
                    {activity.transaction_type || 'Transaction'}
                  </div>
                  <div style={{ color: '#888', fontSize: '11px' }}>
                    {activity.referred_user || 'User'} • {(() => {
                      try {
                        const date = new Date(activity.date);
                        if (isNaN(date.getTime())) {
                          return 'Recent';
                        }
                        return date.toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      } catch (e) {
                        return 'Recent';
                      }
                    })()}
                  </div>
                  <div style={{ 
                    color: activity.status === 'completed' ? '#00FF88' : '#FFA500',
                    fontSize: '10px',
                    marginTop: '4px',
                    textTransform: 'uppercase',
                    fontWeight: '600'
                  }}>
                    {activity.status || 'completed'}
                  </div>
                </div>
                <div style={{
                  color: '#00FF88',
                  fontWeight: '900',
                  fontSize: '16px',
                  textAlign: 'right'
                }}>
                  +£{activity.amount?.toFixed(2) || '0.00'}
                </div>
              </div>
            ))}
            
            {commissions.length > 10 && (
              <div style={{ 
                textAlign: 'center', 
                marginTop: '1rem',
                color: '#888',
                fontSize: '12px'
              }}>
                Showing 10 of {commissions.length} transactions
              </div>
            )}
          </div>
        )}

      </div>
    </div>
    </>
  );
}