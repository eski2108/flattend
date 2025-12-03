import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoCash, IoCheckmark as Check, IoCheckmarkCircle, IoCopy, IoGift as Gift, IoPeople, IoPieChart as PieChart, IoShareSocial as Share2, IoTrendingUp, IoTrophy } from 'react-icons/io5';

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
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #020618 0%, #071327 100%)', 
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Effects */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(0, 240, 255, 0.15), transparent)',
        filter: 'blur(80px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '15%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12), transparent)',
        filter: 'blur(100px)',
        pointerEvents: 'none'
      }} />
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Company Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src="/logo.png" 
            alt="CoinHub X" 
            style={{ 
              height: '60px', 
              filter: 'drop-shadow(0 0 20px rgba(0, 240, 255, 0.6))'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              const fallback = document.createElement('div');
              fallback.innerHTML = '<div style="font-size: 40px; font-weight: 900; background: linear-gradient(135deg, #00F0FF, #7B2CFF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">COIN HUB X</div>';
              e.target.parentNode.appendChild(fallback);
            }}
          />
        </div>

        {/* Premium Header */}
        <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '1rem',
            padding: '12px 24px',
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '50px',
            boxShadow: '0 0 40px rgba(0, 240, 255, 0.3)'
          }}>
            <IoTrophy size={28} style={{ color: '#00F0FF', filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.8))' }} />
            <span style={{
              fontSize: '14px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Elite Referral Program
            </span>
          </div>
          
          <h1 style={{
            fontSize: '48px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 50%, #00F0FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1rem',
            textShadow: '0 0 30px rgba(0, 240, 255, 0.5)',
            letterSpacing: '-1px'
          }}>
            Referral Dashboard
          </h1>
          <p style={{ 
            color: '#A3AEC2', 
            fontSize: '18px',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Earn <span style={{ 
              color: '#00F0FF',
              fontWeight: '700',
              textShadow: '0 0 10px #00F0FF80'
            }}>
              20% commission
            </span> on every transaction your referrals make
          </p>
        </div>

        {/* Premium Tier Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 32px',
            background: referralData.referral_tier === 'golden' 
              ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)'
              : 'linear-gradient(135deg, #00F0FF 0%, #A855F7 50%, #7B2CFF 100%)',
            borderRadius: '50px',
            boxShadow: referralData.referral_tier === 'golden'
              ? '0 0 60px rgba(255, 215, 0, 0.8), inset 0 2px 20px rgba(255, 255, 255, 0.3)'
              : '0 0 50px rgba(0, 240, 255, 0.6), inset 0 2px 20px rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Animated glow effect */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: referralData.referral_tier === 'golden'
                ? 'conic-gradient(from 0deg, transparent, rgba(255, 215, 0, 0.4), transparent)'
                : 'conic-gradient(from 0deg, transparent, rgba(0, 240, 255, 0.3), transparent)',
              animation: 'spin 3s linear infinite',
              pointerEvents: 'none'
            }} />
            
            <IoTrophy size={24} color="#000" style={{ 
              filter: 'drop-shadow(0 0 8px rgba(0, 0, 0, 0.5))',
              zIndex: 1,
              position: 'relative'
            }} />
            <span style={{ 
              color: '#000', 
              fontWeight: '900', 
              fontSize: '16px',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
              zIndex: 1,
              position: 'relative',
              letterSpacing: '0.5px'
            }}>
              {referralData.referral_tier === 'golden' 
                ? '🌟 GOLDEN TIER • 50% Commission'
                : 'STANDARD TIER • 20% Commission'}
            </span>
          </div>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>

        {/* Premium Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 240, 255, 0.05) 100%)',
            border: '2px solid rgba(0, 240, 255, 0.4)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 0 40px rgba(0, 240, 255, 0.3), inset 0 0 30px rgba(0, 240, 255, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(0, 240, 255, 0.4), transparent)',
              filter: 'blur(30px)',
              pointerEvents: 'none'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1rem' }}>
              <IoPeople size={28} color="#00F0FF" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.8))' }} />
              <span style={{ color: '#A3AEC2', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Referrals</span>
            </div>
            <div style={{ 
              fontSize: '42px', 
              fontWeight: '900', 
              color: '#00F0FF',
              textShadow: '0 0 20px rgba(0, 240, 255, 0.8)',
              marginBottom: '0.5rem'
            }}>
              {referralData.total_referrals}
            </div>
            <div style={{ fontSize: '12px', color: '#8F9BB3' }}>
              Lifetime referrals registered
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)',
            border: '2px solid rgba(168, 85, 247, 0.4)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 0 40px rgba(168, 85, 247, 0.3), inset 0 0 30px rgba(168, 85, 247, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.4), transparent)',
              filter: 'blur(30px)',
              pointerEvents: 'none'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1rem' }}>
              <IoTrendingUp size={28} color="#A855F7" style={{ filter: 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.8))' }} />
              <span style={{ color: '#A3AEC2', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Referrals</span>
            </div>
            <div style={{ 
              fontSize: '42px', 
              fontWeight: '900', 
              color: '#A855F7',
              textShadow: '0 0 20px rgba(168, 85, 247, 0.8)',
              marginBottom: '0.5rem'
            }}>
              {referralData.active_referrals}
            </div>
            <div style={{ fontSize: '12px', color: '#8F9BB3' }}>
              Currently trading users
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)',
            border: '2px solid rgba(34, 197, 94, 0.4)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 0 40px rgba(34, 197, 94, 0.3), inset 0 0 30px rgba(34, 197, 94, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(34, 197, 94, 0.4), transparent)',
              filter: 'blur(30px)',
              pointerEvents: 'none'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1rem' }}>
              <IoCash size={28} color="#22C55E" style={{ filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.8))' }} />
              <span style={{ color: '#A3AEC2', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Earnings</span>
            </div>
            <div style={{ 
              fontSize: '42px', 
              fontWeight: '900', 
              color: '#22C55E',
              textShadow: '0 0 20px rgba(34, 197, 94, 0.8)',
              marginBottom: '0.5rem'
            }}>
              £{referralData.total_earnings.toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: '#8F9BB3' }}>
              Lifetime commission earned
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
            border: '2px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 0 40px rgba(245, 158, 11, 0.3), inset 0 0 30px rgba(245, 158, 11, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.4), transparent)',
              filter: 'blur(30px)',
              pointerEvents: 'none'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1rem' }}>
              <Gift size={28} color="#F59E0B" style={{ filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.8))' }} />
              <span style={{ color: '#A3AEC2', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Earnings</span>
            </div>
            <div style={{ 
              fontSize: '42px', 
              fontWeight: '900', 
              color: '#F59E0B',
              textShadow: '0 0 20px rgba(245, 158, 11, 0.8)',
              marginBottom: '0.5rem'
            }}>
              £{referralData.pending_earnings.toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: '#8F9BB3' }}>
              Processing commission
            </div>
          </div>
        </div>

        {/* Premium Referral Link Section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.98) 0%, rgba(7, 19, 39, 0.95) 100%)',
          border: '2px solid rgba(0, 240, 255, 0.4)',
          borderRadius: '24px',
          padding: '3rem',
          marginBottom: '3rem',
          boxShadow: '0 0 60px rgba(0, 240, 255, 0.2), inset 0 0 40px rgba(0, 240, 255, 0.05)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-40px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '300px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(0, 240, 255, 0.3), transparent)',
            filter: 'blur(50px)',
            pointerEvents: 'none'
          }} />
          
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ 
              fontSize: '32px', 
              fontWeight: '900', 
              background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '1rem',
              textShadow: '0 0 20px rgba(0, 240, 255, 0.5)'
            }}>
              Your Referral Arsenal
            </h2>
            <p style={{ 
              color: '#A3AEC2', 
              fontSize: '16px',
              maxWidth: '500px',
              margin: '0 auto',
              lineHeight: '1.6'
            }}>
              Share these premium links with friends and start earning commissions on every trade they make
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ 
                color: '#00F0FF', 
                fontSize: '14px', 
                marginBottom: '1rem', 
                display: 'block',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                🔗 Premium Referral Link
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={referralData.referral_link}
                  readOnly
                  style={{
                    flex: '1',
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(0, 240, 255, 0.05) 100%)',
                    border: '2px solid rgba(0, 240, 255, 0.4)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    boxShadow: '0 0 20px rgba(0, 240, 255, 0.2), inset 0 2px 10px rgba(0, 0, 0, 0.3)'
                  }}
                />
                <button
                  onClick={copyReferralLink}
                  style={{
                    padding: '16px 28px',
                    background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#000',
                    fontWeight: '900',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 0 30px rgba(0, 240, 255, 0.5)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 240, 255, 0.7)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 240, 255, 0.5)';
                  }}
                >
                  <IoCopy size={20} />
                  Copy Link
                </button>
              </div>
            </div>

            <div>
              <label style={{ 
                color: '#A855F7', 
                fontSize: '14px', 
                marginBottom: '1rem', 
                display: 'block',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                🎯 Quick Code
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={referralData.referral_code}
                  readOnly
                  style={{
                    flex: '1',
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)',
                    border: '2px solid rgba(168, 85, 247, 0.4)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '16px',
                    textAlign: 'center',
                    fontWeight: '900',
                    fontFamily: 'monospace',
                    letterSpacing: '2px',
                    boxShadow: '0 0 20px rgba(168, 85, 247, 0.2), inset 0 2px 10px rgba(0, 0, 0, 0.3)'
                  }}
                />
                <button
                  onClick={copyReferralCode}
                  style={{
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, #A855F7 0%, #7B2CFF 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontWeight: '900',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 0 30px rgba(168, 85, 247, 0.5)',
                    transition: 'all 0.3s ease'
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
                  <IoCopy size={20} />
                </button>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <button
              onClick={() => window.open(`https://twitter.com/intent/tweet?text=🚀 Join CoinHubX - The Future of Crypto Trading! 💎 Use my exclusive referral link: ${encodeURIComponent(referralData.referral_link)}`, '_blank')}
              style={{
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #1DA1F2 0%, #0d8bd9 100%)',
                border: '2px solid rgba(29, 161, 242, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 0 25px rgba(29, 161, 242, 0.4)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 0 35px rgba(29, 161, 242, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 0 25px rgba(29, 161, 242, 0.4)';
              }}
            >
              <Share2 size={18} />
              Share on Twitter
            </button>

            <button
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('🔥 Join CoinHubX - Premium Crypto Exchange! 💰 Start trading with my referral link: ' + referralData.referral_link)}`, '_blank')}
              style={{
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #25D366 0%, #1ebe57 100%)',
                border: '2px solid rgba(37, 211, 102, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 0 25px rgba(37, 211, 102, 0.4)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 0 35px rgba(37, 211, 102, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 0 25px rgba(37, 211, 102, 0.4)';
              }}
            >
              <Share2 size={18} />
              Share on WhatsApp
            </button>

            <button
              onClick={() => {
                const text = `🚀 CoinHubX - Elite Crypto Trading Platform\n💎 Join the future of digital finance\n🎯 Use my exclusive referral: ${referralData.referral_code}\n🔗 ${referralData.referral_link}`;
                navigator.clipboard.writeText(text);
                toast.success('Premium message copied to clipboard!');
              }}
              style={{
                padding: '14px 28px',
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                border: '2px solid rgba(0, 240, 255, 0.4)',
                borderRadius: '12px',
                color: '#00F0FF',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 0 25px rgba(0, 240, 255, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.6)';
                e.currentTarget.style.boxShadow = '0 0 35px rgba(0, 240, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.4)';
                e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 240, 255, 0.3)';
              }}
            >
              <IoCopy size={18} />
              Copy Message
            </button>
          </div>
        </div>

        {/* 🏆 GOLDEN TIER 50% UPGRADE SECTION */}
        {referralData.referral_tier === 'standard' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.1) 100%)',
            border: '2px solid rgba(255, 215, 0, 0.5)',
            borderRadius: '20px',
            padding: '2.5rem',
            marginBottom: '2rem',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 0 60px rgba(255, 215, 0, 0.3)'
          }}>
            {/* Golden Glow Effect */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-10%',
              width: '400px',
              height: '400px',
              background: 'radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, transparent 70%)',
              filter: 'blur(80px)',
              pointerEvents: 'none'
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
                <IoTrophy size={40} style={{ 
                  color: '#FFD700',
                  filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))'
                }} />
                <h2 style={{
                  fontSize: '36px',
                  fontWeight: '900',
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 30px rgba(255, 215, 0, 0.5)'
                }}>
                  🌟 Upgrade to GOLDEN TIER
                </h2>
              </div>

              <p style={{ 
                color: '#FFD700', 
                fontSize: '20px', 
                marginBottom: '0.5rem', 
                lineHeight: '1.6',
                fontWeight: '700',
                textShadow: '0 0 10px rgba(255, 215, 0, 0.3)'
              }}>
                Unlock <span style={{
                  fontSize: '28px',
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: '900'
                }}>50% COMMISSION</span> on ALL your referrals!
              </p>
              
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '16px', marginBottom: '2rem', lineHeight: '1.6' }}>
                2.5x MORE earnings than standard tier! Get lifetime 50% commission on every transaction your referrals make.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                {[
                  { icon: '💰', title: '50% Commission Rate', desc: '2.5x more than standard!', highlight: true },
                  { icon: '⚡', title: 'Priority Support', desc: 'Get help instantly' },
                  { icon: '🏆', title: 'Golden Badge', desc: 'Exclusive VIP status' },
                  { icon: '📈', title: 'Advanced Analytics', desc: 'Real-time earnings tracking' }
                ].map((benefit, idx) => (
                  <div key={idx} style={{
                    background: benefit.highlight 
                      ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.1))'
                      : 'rgba(0, 0, 0, 0.4)',
                    border: benefit.highlight 
                      ? '2px solid rgba(255, 215, 0, 0.5)'
                      : '1px solid rgba(255, 215, 0, 0.2)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    textAlign: 'center',
                    boxShadow: benefit.highlight ? '0 0 30px rgba(255, 215, 0, 0.3)' : 'none'
                  }}>
                    <div style={{ fontSize: '36px', marginBottom: '0.75rem' }}>{benefit.icon}</div>
                    <h4 style={{ 
                      color: benefit.highlight ? '#FFD700' : '#fff', 
                      fontSize: '15px', 
                      fontWeight: '700', 
                      marginBottom: '0.5rem',
                      textShadow: benefit.highlight ? '0 0 10px rgba(255, 215, 0, 0.5)' : 'none'
                    }}>
                      {benefit.title}
                    </h4>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px' }}>
                      {benefit.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div style={{
                background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(255, 215, 0, 0.1))',
                border: '3px solid rgba(255, 215, 0, 0.6)',
                borderRadius: '20px',
                padding: '2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '2rem',
                boxShadow: '0 0 40px rgba(255, 215, 0, 0.4), inset 0 0 30px rgba(255, 215, 0, 0.1)'
              }}>
                <div>
                  <div style={{ 
                    color: '#FFD700', 
                    fontSize: '16px', 
                    marginBottom: '0.75rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    🎯 One-Time Investment
                  </div>
                  <div style={{
                    fontSize: '64px',
                    fontWeight: '900',
                    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: '1',
                    marginBottom: '0.5rem',
                    textShadow: '0 0 30px rgba(255, 215, 0, 0.5)'
                  }}>
                    £150
                  </div>
                  <div style={{ 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>✅ Lifetime 50% Commission</span>
                    <span style={{ color: '#FFD700' }}>•</span>
                    <span>✅ No Recurring Fees</span>
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
                        loadReferralData(user.user_id);
                      } else {
                        toast.error(response.data.message || 'Upgrade failed');
                      }
                    } catch (error) {
                      console.error('Golden tier upgrade error:', error);
                      toast.error(error.response?.data?.detail || 'Failed to upgrade to Golden Tier');
                    }
                  }}
                  style={{
                    padding: '20px 60px',
                    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                    border: '3px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '15px',
                    color: '#000',
                    fontSize: '20px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    boxShadow: '0 0 50px rgba(255, 215, 0, 0.8), inset 0 2px 10px rgba(255, 255, 255, 0.3)',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 0 80px rgba(255, 215, 0, 1), inset 0 2px 15px rgba(255, 255, 255, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 0 50px rgba(255, 215, 0, 0.8), inset 0 2px 10px rgba(255, 255, 255, 0.3)';
                  }}
                >
                  <IoTrophy size={28} />
                  Upgrade to Golden Now
                </button>
              </div>

              <div style={{
                marginTop: '1.5rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 165, 0, 0.05))',
                border: '2px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '12px',
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '14px',
                lineHeight: '1.8'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>💡</span>
                  <div>
                    <strong style={{ color: '#FFD700', fontSize: '16px' }}>Why Golden Tier?</strong>
                    <p style={{ marginTop: '0.5rem', marginBottom: '0' }}>
                      Pay once, earn <strong style={{ color: '#FFD700' }}>50% FOREVER</strong>. If you refer just 3 active traders, this upgrade pays for itself. Every referral after that is pure profit at 2.5x the standard rate!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Premium Referred Users Table */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.98) 0%, rgba(7, 19, 39, 0.95) 100%)',
          border: '2px solid rgba(0, 240, 255, 0.4)',
          borderRadius: '24px',
          padding: '3rem',
          marginBottom: '3rem',
          boxShadow: '0 0 60px rgba(0, 240, 255, 0.2), inset 0 0 40px rgba(0, 240, 255, 0.05)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-40px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '300px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(0, 240, 255, 0.3), transparent)',
            filter: 'blur(50px)',
            pointerEvents: 'none'
          }} />
          
          <h2 style={{ 
            fontSize: '28px', 
            fontWeight: '900', 
            background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '2rem',
            textAlign: 'center',
            textShadow: '0 0 20px rgba(0, 240, 255, 0.5)'
          }}>
            Your Elite Network
          </h2>
          
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

        {/* Premium Earnings Breakdown */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)',
          border: '2px solid rgba(168, 85, 247, 0.4)',
          borderRadius: '24px',
          padding: '3rem',
          marginTop: '3rem',
          boxShadow: '0 0 60px rgba(168, 85, 247, 0.3), inset 0 0 40px rgba(168, 85, 247, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-40px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '300px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.4), transparent)',
            filter: 'blur(50px)',
            pointerEvents: 'none'
          }} />
          
          <h2 style={{ 
            fontSize: '28px', 
            fontWeight: '900', 
            color: '#A855F7',
            marginBottom: '2rem',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            textShadow: '0 0 20px rgba(168, 85, 247, 0.8)'
          }}>
            <PieChart size={28} style={{ filter: 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.8))' }} />
            Revenue Analytics Dashboard
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

        {/* Premium Commission History */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.98) 0%, rgba(7, 19, 39, 0.95) 100%)',
          border: '2px solid rgba(34, 197, 94, 0.4)',
          borderRadius: '24px',
          padding: '3rem',
          marginTop: '3rem',
          boxShadow: '0 0 60px rgba(34, 197, 94, 0.3), inset 0 0 40px rgba(34, 197, 94, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-40px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '300px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.4), transparent)',
            filter: 'blur(50px)',
            pointerEvents: 'none'
          }} />
          
          <h2 style={{ 
            fontSize: '28px', 
            fontWeight: '900', 
            color: '#22C55E',
            marginBottom: '2rem',
            textAlign: 'center',
            textShadow: '0 0 20px rgba(34, 197, 94, 0.8)'
          }}>
            💰 Commission Earnings History
          </h2>
          
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

        {/* Premium How It Works */}
        <div style={{
          marginTop: '3rem',
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 240, 255, 0.05) 100%)',
          border: '2px solid rgba(0, 240, 255, 0.4)',
          borderRadius: '24px',
          padding: '3rem',
          boxShadow: '0 0 60px rgba(0, 240, 255, 0.3), inset 0 0 40px rgba(0, 240, 255, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-40px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '300px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(0, 240, 255, 0.4), transparent)',
            filter: 'blur(50px)',
            pointerEvents: 'none'
          }} />
          
          <h3 style={{ 
            fontSize: '28px', 
            fontWeight: '900', 
            color: '#00F0FF', 
            marginBottom: '2rem',
            textAlign: 'center',
            textShadow: '0 0 20px rgba(0, 240, 255, 0.8)'
          }}>
            🚀 How The Elite Program Works
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            {[
              { 
                icon: '🔗', 
                title: 'Share Your Elite Link', 
                desc: 'Send your unique premium referral link to friends and family',
                color: '#00F0FF'
              },
              { 
                icon: '👥', 
                title: 'They Join The Elite', 
                desc: 'Your friends register using your exclusive link or code',
                color: '#A855F7'
              },
              { 
                icon: '💰', 
                title: 'You Earn Premium Rewards', 
                desc: 'Get 20% commission on every transaction they make',
                color: '#22C55E'
              },
              { 
                icon: '⚡', 
                title: 'Instant Elite Payouts', 
                desc: 'Commissions are paid directly to your wallet automatically',
                color: '#F59E0B'
              }
            ].map((step, index) => (
              <div key={index} style={{
                background: `linear-gradient(135deg, ${step.color}15 0%, ${step.color}05 100%)`,
                border: `2px solid ${step.color}40`,
                borderRadius: '16px',
                padding: '2rem',
                textAlign: 'center',
                boxShadow: `0 0 30px ${step.color}20`,
                position: 'relative'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '1rem' }}>{step.icon}</div>
                <h4 style={{ 
                  fontSize: '18px', 
                  fontWeight: '700', 
                  color: step.color, 
                  marginBottom: '1rem',
                  textShadow: `0 0 10px ${step.color}80`
                }}>
                  {step.title}
                </h4>
                <p style={{ 
                  color: '#A3AEC2', 
                  fontSize: '14px', 
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
