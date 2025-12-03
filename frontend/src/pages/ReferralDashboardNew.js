import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  IoCopyOutline, 
  IoShareSocialOutline, 
  IoTrendingUpOutline, 
  IoPeopleOutline,
  IoGiftOutline,
  IoStatsChartOutline,
  IoTimeOutline,
  IoCheckmarkCircleOutline,
  IoHourglassOutline,
  IoRocketOutline,
  IoSparklesOutline,
  IoTrophyOutline,
  IoStarOutline
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
  const [animatedStats, setAnimatedStats] = useState({
    total_earned: 0,
    pending: 0,
    completed: 0,
    this_month: 0
  });
  const [copySuccess, setCopySuccess] = useState('');
  const [upgradeHover, setUpgradeHover] = useState(false);
  const particlesRef = useRef(null);

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
      
      // Fetch referral dashboard data
      const dashboardRes = await axios.get(`${API}/api/referral/dashboard/${user.user_id}`);
      setReferralData(dashboardRes.data);
      
      // Fetch commissions
      const commissionsRes = await axios.get(`${API}/api/referral/commissions/${user.user_id}`);
      setCommissions(commissionsRes.data.commissions || []);
      
      // Calculate stats
      const totalEarned = commissionsRes.data.commissions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;
      const completed = commissionsRes.data.commissions?.filter(c => c.status === 'completed').length || 0;
      const pending = commissionsRes.data.commissions?.filter(c => c.status === 'pending').length || 0;
      
      // Calculate this month earnings
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonth = commissionsRes.data.commissions?.filter(c => {
        const date = new Date(c.created_at);
        return date >= thisMonthStart;
      }).reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;
      
      // Calculate last 30 days for chart
      const last30Days = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStr = date.toISOString().split('T')[0];
        const dayEarnings = commissionsRes.data.commissions?.filter(c => {
          return c.created_at?.startsWith(dayStr);
        }).reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;
        last30Days.push({ date: dayStr, amount: dayEarnings });
      }
      
      setStats({
        total_earned: totalEarned,
        pending: pending,
        completed: completed,
        this_month: thisMonth,
        last_30_days: last30Days
      });

      // Animate numbers
      animateNumbers({
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

  // Animate numbers function
  const animateNumbers = (targetStats) => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      setAnimatedStats({
        total_earned: targetStats.total_earned * easeOutQuart,
        pending: Math.floor(targetStats.pending * easeOutQuart),
        completed: Math.floor(targetStats.completed * easeOutQuart),
        this_month: targetStats.this_month * easeOutQuart
      });
      
      if (currentStep >= steps) {
        clearInterval(interval);
        setAnimatedStats(targetStats);
      }
    }, stepDuration);
  };

  const copyReferralLink = () => {
    if (referralData?.referral_link) {
      navigator.clipboard.writeText(referralData.referral_link);
      setCopySuccess('link');
      toast.success('🎉 Referral link copied to clipboard!');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  const copyReferralCode = () => {
    if (referralData?.referral_code) {
      navigator.clipboard.writeText(referralData.referral_code);
      setCopySuccess('code');
      toast.success('🎉 Referral code copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  const getTierInfo = (tier) => {
    if (!tier) return { name: 'Standard', rate: '20%', color: '#00F0FF' };
    
    const tierLower = tier.toLowerCase();
    if (tierLower === 'vip') return { name: 'VIP', rate: '20%', color: '#A855F7' };
    if (tierLower === 'golden') return { name: 'Golden', rate: '50%', color: '#FFD700' };
    return { name: 'Standard', rate: '20%', color: '#00F0FF' };
  };

  const tierInfo = getTierInfo(referralData?.tier);

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
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          
          @keyframes glow-pulse {
            0%, 100% { box-shadow: 0 0 20px rgba(0, 240, 255, 0.5); }
            50% { box-shadow: 0 0 40px rgba(0, 240, 255, 0.8), 0 0 60px rgba(0, 240, 255, 0.4); }
          }
          
          @keyframes gradient-shift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          
          @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
            50% { opacity: 1; transform: scale(1) rotate(180deg); }
          }
          
          @keyframes golden-rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes particle-float {
            0% { transform: translateY(0px) translateX(0px); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
          }
          
          @keyframes bounce-in {
            0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
            50% { transform: scale(1.05) rotate(5deg); }
            70% { transform: scale(0.9) rotate(-2deg); }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          
          @keyframes slide-in-up {
            0% { transform: translateY(50px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          
          @keyframes rocket-fly {
            0% { transform: translateX(-20px) translateY(0px) rotate(-10deg); }
            100% { transform: translateX(20px) translateY(-20px) rotate(10deg); }
          }
          
          @keyframes crown-glow {
            0%, 100% { filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8)); }
            50% { filter: drop-shadow(0 0 25px rgba(255, 215, 0, 1)) drop-shadow(0 0 35px rgba(255, 165, 0, 0.8)); }
          }
          
          @keyframes moving-bg {
            0% { background-position: 0% 0%; }
            50% { background-position: 100% 100%; }
            100% { background-position: 0% 0%; }
          }
          
          .premium-card {
            animation: bounce-in 0.8s ease-out;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .premium-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 60px rgba(0, 240, 255, 0.3) !important;
          }
          
          .golden-upgrade {
            animation: glow-pulse 3s ease-in-out infinite;
          }
          
          .sparkle-effect {
            animation: sparkle 2s ease-in-out infinite;
          }
          
          .floating-icon {
            animation: float 3s ease-in-out infinite;
          }
          
          .gradient-text {
            background: linear-gradient(135deg, #00F0FF, #A855F7, #FFD700);
            background-size: 200% 200%;
            animation: gradient-shift 3s ease infinite;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          
          .copy-success {
            animation: bounce-in 0.5s ease-out;
          }
        `}
      </style>
      
      <div style={{
        minHeight: '100vh',
        background: `
          radial-gradient(circle at 20% 80%, rgba(0, 240, 255, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
          linear-gradient(135deg, #0a0b1a 0%, #1a1f3a 50%, #0a0b1a 100%)
        `,
        backgroundSize: '100% 100%, 100% 100%, 100% 100%, 100% 100%',
        animation: 'moving-bg 20s ease infinite',
        padding: '2rem',
        paddingTop: '100px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Floating Particles Background */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0
        }}>
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: Math.random() * 6 + 2 + 'px',
                height: Math.random() * 6 + 2 + 'px',
                background: `linear-gradient(45deg, ${['#00F0FF', '#A855F7', '#FFD700'][Math.floor(Math.random() * 3)]}, transparent)`,
                borderRadius: '50%',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                animation: `particle-float ${Math.random() * 10 + 15}s linear infinite`,
                animationDelay: Math.random() * 5 + 's'
              }}
            />
          ))}
        </div>

        {/* Company Logo */}
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto', 
          textAlign: 'center', 
          marginBottom: '2rem',
          position: 'relative',
          zIndex: 1
        }}>
          <div className="floating-icon">
            <img 
              src="/logo.png" 
              alt="CoinHub X" 
              style={{ 
                height: '60px',
                filter: 'drop-shadow(0 0 30px rgba(0, 240, 255, 0.8)) drop-shadow(0 0 60px rgba(168, 85, 247, 0.4))'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.innerHTML = '<div class="gradient-text" style="font-size: 40px; font-weight: 900;">COIN HUB X</div>';
                e.target.parentNode.appendChild(fallback);
              }}
            />
          </div>
        </div>

        {/* Header */}
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto', 
          marginBottom: '3rem',
          position: 'relative',
          zIndex: 1
        }}>
          <h1 className="gradient-text" style={{
            fontSize: '48px',
            fontWeight: '900',
            marginBottom: '1rem',
            textAlign: 'center',
            textShadow: '0 0 30px rgba(0, 240, 255, 0.5)'
          }}>
            🎁 Referral Dashboard
          </h1>
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.8)', 
            fontSize: '18px', 
            textAlign: 'center',
            fontWeight: '500'
          }}>
            Invite friends and earn commission on every transaction ✨
          </p>
        </div>

      {/* Stats Cards */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Total Earned */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
          borderRadius: '20px',
          padding: '1.5rem',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 240, 255, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
            <IoTrendingUpOutline size={28} color="#00F0FF" />
            <span style={{ color: '#888', fontSize: '14px', fontWeight: '600' }}>TOTAL EARNED</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#00F0FF' }}>
            £{stats.total_earned.toFixed(2)}
          </div>
        </div>

        {/* Completed Commissions */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
          borderRadius: '20px',
          padding: '1.5rem',
          border: '2px solid rgba(34, 197, 94, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
            <IoCheckmarkCircleOutline size={28} color="#22C55E" />
            <span style={{ color: '#888', fontSize: '14px', fontWeight: '600' }}>COMPLETED</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#22C55E' }}>
            {stats.completed}
          </div>
        </div>

        {/* Pending Commissions */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.1))',
          borderRadius: '20px',
          padding: '1.5rem',
          border: '2px solid rgba(251, 191, 36, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
            <IoHourglassOutline size={28} color="#FBBF24" />
            <span style={{ color: '#888', fontSize: '14px', fontWeight: '600' }}>PENDING</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#FBBF24' }}>
            {stats.pending}
          </div>
        </div>

        {/* This Month */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(139, 92, 246, 0.1))',
          borderRadius: '20px',
          padding: '1.5rem',
          border: '2px solid rgba(168, 85, 247, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
            <IoTimeOutline size={28} color="#A855F7" />
            <span style={{ color: '#888', fontSize: '14px', fontWeight: '600' }}>THIS MONTH</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#A855F7' }}>
            £{stats.this_month.toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Column */}
        <div>
          {/* Tier Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1f3a 0%, #13182a 100%)',
            borderRadius: '24px',
            padding: '2rem',
            border: `2px solid ${tierInfo.color}`,
            boxShadow: `0 8px 32px ${tierInfo.color}40`,
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ color: '#888', fontSize: '14px', marginBottom: '0.5rem' }}>YOUR TIER</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: tierInfo.color }}>
                  {tierInfo.name}
                </div>
              </div>
              <div style={{
                background: `${tierInfo.color}20`,
                borderRadius: '50%',
                width: '80px',
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px'
              }}>
                {tierInfo.name === 'VIP' ? '👑' : tierInfo.name === 'Golden' ? '⭐' : '🎯'}
              </div>
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ color: '#888', fontSize: '13px', marginBottom: '0.5rem' }}>COMMISSION RATE</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: tierInfo.color }}>
                {tierInfo.rate}
              </div>
              <div style={{ color: '#888', fontSize: '12px', marginTop: '0.5rem' }}>
                You earn {tierInfo.rate} of all fees generated by your referrals
              </div>
            </div>
          </div>

          {/* 🌟 GOLDEN TIER UPGRADE SECTION */}
          {referralData?.tier?.toLowerCase() !== 'golden' && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.1) 100%)',
              border: '2px solid rgba(255, 215, 0, 0.5)',
              borderRadius: '20px',
              padding: '2rem',
              marginBottom: '2rem',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 0 60px rgba(255, 215, 0, 0.3)'
            }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '32px' }}>🏆</span>
                  <h3 style={{
                    fontSize: '24px',
                    fontWeight: '900',
                    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    Upgrade to GOLDEN TIER
                  </h3>
                </div>
                
                <p style={{ color: '#FFD700', fontSize: '18px', marginBottom: '0.5rem', fontWeight: '700' }}>
                  Unlock <span style={{ fontSize: '24px' }}>50% COMMISSION</span> on ALL referrals!
                </p>
                
                <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', marginBottom: '1.5rem' }}>
                  2.5x MORE earnings than standard tier!
                </p>

                <div style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(255, 215, 0, 0.1))',
                  border: '2px solid rgba(255, 215, 0, 0.6)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div>
                    <div style={{ color: '#FFD700', fontSize: '14px', marginBottom: '0.5rem', fontWeight: '700' }}>
                      One-Time Payment
                    </div>
                    <div style={{
                      fontSize: '48px',
                      fontWeight: '900',
                      background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      £150
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>
                      Lifetime 50% • No recurring fees
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      try {
                        const response = await axios.post(`${API}/api/referrals/purchase-vip`, {
                          user_id: user.user_id
                        });
                        
                        if (response.data.success) {
                          toast.success('🎉 Upgraded to GOLDEN TIER! You now earn 50% commission!');
                          fetchReferralData();
                        } else {
                          toast.error(response.data.message || 'Upgrade failed');
                        }
                      } catch (error) {
                        console.error('Golden tier upgrade error:', error);
                        toast.error(error.response?.data?.detail || 'Failed to upgrade');
                      }
                    }}
                    style={{
                      padding: '16px 40px',
                      background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '12px',
                      color: '#000',
                      fontSize: '16px',
                      fontWeight: '900',
                      cursor: 'pointer',
                      boxShadow: '0 0 40px rgba(255, 215, 0, 0.8)',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 0 60px rgba(255, 215, 0, 1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = '0 0 40px rgba(255, 215, 0, 0.8)';
                    }}
                  >
                    🏆 Upgrade Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Referral Link Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1f3a 0%, #13182a 100%)',
            borderRadius: '24px',
            padding: '2rem',
            border: '2px solid rgba(0, 240, 255, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <IoShareSocialOutline size={28} color="#00F0FF" />
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>Share Your Link</h3>
            </div>

            {/* Referral Code */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ color: '#888', fontSize: '13px', marginBottom: '0.5rem' }}>YOUR REFERRAL CODE</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '12px',
                padding: '1rem',
                border: '1px solid rgba(0, 240, 255, 0.2)'
              }}>
                <code style={{
                  flex: 1,
                  color: '#00F0FF',
                  fontSize: '18px',
                  fontWeight: '700',
                  letterSpacing: '2px'
                }}>
                  {referralData?.referral_code || 'Loading...'}
                </code>
                <button
                  onClick={copyReferralCode}
                  style={{
                    background: '#00F0FF',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <IoCopyOutline size={18} />
                  COPY
                </button>
              </div>
            </div>

            {/* Referral Link */}
            <div>
              <div style={{ color: '#888', fontSize: '13px', marginBottom: '0.5rem' }}>YOUR REFERRAL LINK</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '12px',
                padding: '1rem',
                border: '1px solid rgba(0, 240, 255, 0.2)'
              }}>
                <div style={{
                  flex: 1,
                  color: '#00F0FF',
                  fontSize: '14px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {referralData?.referral_link || 'Loading...'}
                </div>
                <button
                  onClick={copyReferralLink}
                  style={{
                    background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <IoCopyOutline size={18} />
                  COPY
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Referral Stats */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1f3a 0%, #13182a 100%)',
            borderRadius: '24px',
            padding: '2rem',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <IoPeopleOutline size={28} color="#00F0FF" />
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>Referral Stats</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{
                background: 'rgba(0, 240, 255, 0.05)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#00F0FF' }}>
                  {referralData?.total_signups || 0}
                </div>
                <div style={{ color: '#888', fontSize: '13px', marginTop: '0.5rem' }}>Total Signups</div>
              </div>
              <div style={{
                background: 'rgba(168, 85, 247, 0.05)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#A855F7' }}>
                  {referralData?.active_referrals || 0}
                </div>
                <div style={{ color: '#888', fontSize: '13px', marginTop: '0.5rem' }}>Active Referrals</div>
              </div>
            </div>
          </div>

          {/* Recent Commissions */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1f3a 0%, #13182a 100%)',
            borderRadius: '24px',
            padding: '2rem',
            border: '2px solid rgba(0, 240, 255, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <IoStatsChartOutline size={28} color="#00F0FF" />
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>Recent Commissions</h3>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {commissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                  <IoGiftOutline size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <p>No commissions yet</p>
                  <p style={{ fontSize: '14px', marginTop: '0.5rem' }}>Start referring friends to earn commissions!</p>
                </div>
              ) : (
                commissions.slice(0, 10).map((commission, index) => (
                  <div key={index} style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: '1px solid rgba(0, 240, 255, 0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ color: '#00F0FF', fontSize: '16px', fontWeight: '700' }}>
                        £{commission.commission_amount?.toFixed(2) || '0.00'}
                      </div>
                      <div style={{
                        background: commission.status === 'completed' ? '#22C55E20' : '#FBBF2420',
                        color: commission.status === 'completed' ? '#22C55E' : '#FBBF24',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {commission.status || 'pending'}
                      </div>
                    </div>
                    <div style={{ color: '#888', fontSize: '13px', marginBottom: '0.25rem' }}>
                      {commission.fee_type || 'Trading'}
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>
                      {new Date(commission.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
