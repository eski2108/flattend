import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { IoAlertCircle as AlertCircle, IoBriefcase as Briefcase, IoCard as CreditCard, IoCash, IoCheckmark, IoCopy, IoFlash, IoPeople, IoShield as Shield, IoTrendingUp } from 'react-icons/io5';
const API = process.env.REACT_APP_BACKEND_URL;
import { toast } from 'react-hot-toast';

// API already defined

export default function ReferralsPage() {
  const navigate = useNavigate();
  const [referralData, setReferralData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedBonus, setCopiedBonus] = useState(false);
  const [copiedLifetime, setCopiedLifetime] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('user_id');
      const userEmail = localStorage.getItem('email') || 'DEMOUSER';
      const username = userEmail.split('@')[0].toUpperCase();
      
      if (!token || !userId) {
        // Show demo data for non-logged-in users
        setReferralData({
          username: username,
          bonusLink: `https://coinhubx.com/ref/bonus/${username}`,
          lifetimeLink: `https://coinhubx.com/ref/earn/${username}`,
          totalEarnings: 1247.50,
          activeReferrals: 23,
          monthEarnings: 385.00
        });
        setLoading(false);
        return;
      }

      // Fetch referral stats
      const statsResponse = await axios.get(`${API}/referral/stats/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setReferralData({
        username: username,
        bonusLink: `https://coinhubx.com/ref/bonus/${username}`,
        lifetimeLink: `https://coinhubx.com/ref/earn/${username}`,
        totalEarnings: statsResponse.data.total_earnings || 0,
        activeReferrals: statsResponse.data.total_referrals || 0,
        monthEarnings: statsResponse.data.month_earnings || 0
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      const username = 'DEMOUSER';
      setReferralData({
        username: username,
        bonusLink: `https://coinhubx.com/ref/bonus/${username}`,
        lifetimeLink: `https://coinhubx.com/ref/earn/${username}`,
        totalEarnings: 1247.50,
        activeReferrals: 23,
        monthEarnings: 385.00
      });
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'bonus') {
      setCopiedBonus(true);
      setTimeout(() => setCopiedBonus(false), 2000);
    } else {
      setCopiedLifetime(true);
      setTimeout(() => setCopiedLifetime(false), 2000);
    }
    toast.success('Link copied to clipboard!');
  };

  const copyReferralLink = () => {
    if (referralData?.referralLink) {
      navigator.clipboard.writeText(referralData.referralLink);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const revenueStreams = [
    { name: 'P2P Trades', icon: ArrowRightLeft, description: '20% of trading fees' },
    { name: 'Express Buy', icon: Zap, description: '20% of purchase fees' },
    { name: 'Fast Buy', icon: ShoppingCart, description: '20% of instant buy fees' },
    { name: 'Crypto Swaps', icon: ArrowRightLeft, description: '20% of swap fees' },
    { name: 'Spot Trading', icon: TrendingUp, description: '20% of spot fees' },
    { name: 'Buy Crypto Fees', icon: CreditCard, description: '20% of buy fees' },
    { name: 'Sell Crypto Fees', icon: DollarSign, description: '20% of sell fees' },
    { name: 'Withdrawal Fees', icon: ArrowRightLeft, description: '20% of withdrawal fees' },
    { name: 'Deposit Fees', icon: ArrowRightLeft, description: '20% of deposit fees' },
    { name: 'Escrow Fees', icon: Shield, description: '20% of escrow fees' },
    { name: 'Dispute Fees', icon: AlertCircle, description: '20% of dispute fees' },
    { name: 'Network Markup', icon: Network, description: '20% of network fees' },
    { name: 'Liquidity Spread', icon: Briefcase, description: '20% of spread' },
    { name: 'Future Features', icon: Sparkles, description: '20% of all new revenue' }
  ];

  const earningsExamples = [
    { referrals: 10, min: 300, max: 1200 },
    { referrals: 20, min: 600, max: 2400 },
    { referrals: 30, min: 900, max: 3600 },
    { referrals: 40, min: 1200, max: 4800 },
    { referrals: 100, min: 3000, max: 12000 }
  ];

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0B0E13',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(0, 224, 255, 0.2)',
            borderTop: '4px solid #00E0FF',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: '#A8A8A8' }}>Loading referral data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B0E13',
      paddingBottom: '4rem'
    }}>
      
      {/* Hero Banner */}
      <section style={{
        position: 'relative',
        padding: '4rem 1.5rem',
        background: 'linear-gradient(135deg, #00E8F7 0%, #7A3CFF 100%)',
        borderRadius: '0 0 32px 32px',
        marginBottom: '3rem',
        overflow: 'hidden',
        boxShadow: '0 0 60px rgba(0, 232, 247, 0.08), inset 0 1px 0 rgba(0, 232, 247, 0.2)',
        border: '1px solid rgba(0, 232, 247, 0.2)'
      }}>
        {/* Top bar highlight */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '5px',
          background: 'linear-gradient(90deg, #00E8F7 0%, #7A3CFF 100%)',
          boxShadow: '0 0 15px rgba(0, 232, 247, 0.6)',
          zIndex: 3
        }} />
        
        {/* Diagonal shine overlay */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none',
          zIndex: 1
        }} />
        
        {/* Animated particles */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          zIndex: 0
        }}>
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '2px',
                height: '2px',
                background: 'rgba(0, 232, 247, 0.4)',
                borderRadius: '50%',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 5}s`,
                boxShadow: '0 0 4px rgba(0, 232, 247, 0.6)'
              }}
            />
          ))}
        </div>
        
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(11, 14, 19, 0.25)',
          backdropFilter: 'blur(10px)',
          zIndex: 1
        }} />
        
        <div style={{
          position: 'relative',
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center',
          zIndex: 2
        }}>
          {/* Premium Icon + Headline */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <Sparkles size={48} style={{ 
              color: '#00E8F7',
              filter: 'drop-shadow(0 0 10px rgba(0, 232, 247, 0.8))'
            }} />
            <h1 style={{
              fontSize: 'clamp(2.8rem, 6vw, 4.5rem)',
              fontWeight: '900',
              color: '#FFFFFF',
              textShadow: '0 0 30px rgba(0, 232, 247, 0.15), 0 4px 20px rgba(0, 0, 0, 0.4)',
              letterSpacing: '-0.02em',
              margin: 0
            }}>
              Earn 20% For Life
            </h1>
          </div>
          
          <p style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
            color: '#FFFFFF',
            marginBottom: '1rem',
            opacity: 0.95,
            maxWidth: '600px',
            margin: '0 auto 1rem'
          }}>
            Invite people once. Earn every time they trade.
          </p>
          
          {/* New Tagline */}
          <p style={{
            fontSize: '1rem',
            color: '#00E8F7',
            marginBottom: '2.5rem',
            fontWeight: '600',
            textShadow: '0 0 20px rgba(0, 232, 247, 0.4)',
            letterSpacing: '0.05em'
          }}>
            One link. Fourteen revenue streams. Lifetime earnings.
          </p>

          {/* Referral Code Pill */}
          {referralData?.referralCode && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(20px)',
              padding: '0.75rem 1.5rem',
              borderRadius: '50px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              marginBottom: '2rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2)'
            }}>
              <span style={{
                fontSize: '0.875rem',
                color: '#FFFFFF',
                opacity: 0.9,
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Your Code:
              </span>
              <span style={{
                fontSize: '1.25rem',
                fontWeight: '900',
                color: '#FFFFFF',
                letterSpacing: '0.1em'
              }}>
                {referralData.referralCode}
              </span>
            </div>
          )}

          {/* Copy Link Button */}
          <button
            onClick={copyReferralLink}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 2.5rem',
              fontSize: '1.125rem',
              fontWeight: '700',
              color: '#FFFFFF',
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(255, 255, 255, 0.5)',
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 32px rgba(0, 224, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 48px rgba(0, 224, 255, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 6px 16px rgba(0, 0, 0, 0.4)';
              e.target.style.borderColor = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 32px rgba(0, 224, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
            }}
          >
            {copied ? <IoCheckmark size={20} /> : <IoCopy size={20} />}
            {copied ? 'Copied!' : 'Copy Referral Link'}
          </button>
        </div>
      </section>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 1.5rem'
      }}>
        
        {/* Live Earnings Panel */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* Total Earnings */}
            <div style={{
              background: 'linear-gradient(135deg, #11141A 0%, #1A1D26 100%)',
              borderRadius: '24px',
              padding: '2rem',
              border: '2px solid rgba(0, 224, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 224, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 224, 255, 0.8)';
              e.currentTarget.style.boxShadow = '0 12px 48px rgba(0, 224, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 224, 255, 0.3)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 224, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <IoCash size={32} style={{ color: '#00F6FF', marginBottom: '1rem' }} />
              <h3 style={{
                fontSize: '3rem',
                fontWeight: '900',
                color: '#00F6FF',
                marginBottom: '0.5rem',
                textShadow: '0 0 20px rgba(0, 246, 255, 0.5)'
              }}>
                £{referralData?.totalEarnings?.toFixed(2) || '0.00'}
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#A8A8A8',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Total Earnings
              </p>
            </div>

            {/* Active Referrals */}
            <div style={{
              background: 'linear-gradient(135deg, #11141A 0%, #1A1D26 100%)',
              borderRadius: '24px',
              padding: '2rem',
              border: '2px solid rgba(107, 0, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(107, 0, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(107, 0, 255, 0.8)';
              e.currentTarget.style.boxShadow = '0 12px 48px rgba(107, 0, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(107, 0, 255, 0.3)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(107, 0, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <IoPeople size={32} style={{ color: '#6B00FF', marginBottom: '1rem' }} />
              <h3 style={{
                fontSize: '3rem',
                fontWeight: '900',
                color: '#00F6FF',
                marginBottom: '0.5rem',
                textShadow: '0 0 20px rgba(0, 246, 255, 0.5)'
              }}>
                {referralData?.activeReferrals || 0}
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#A8A8A8',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Active Referrals
              </p>
            </div>

            {/* This Month's Earnings */}
            <div style={{
              background: 'linear-gradient(135deg, #11141A 0%, #1A1D26 100%)',
              borderRadius: '24px',
              padding: '2rem',
              border: '2px solid rgba(0, 224, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 224, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 224, 255, 0.8)';
              e.currentTarget.style.boxShadow = '0 12px 48px rgba(0, 224, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 224, 255, 0.3)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 224, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <IoTrendingUp size={32} style={{ color: '#00F6FF', marginBottom: '1rem' }} />
              <h3 style={{
                fontSize: '3rem',
                fontWeight: '900',
                color: '#00F6FF',
                marginBottom: '0.5rem',
                textShadow: '0 0 20px rgba(0, 246, 255, 0.5)'
              }}>
                £{referralData?.monthEarnings?.toFixed(2) || '0.00'}
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#A8A8A8',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                This Month's Earnings
              </p>
            </div>
          </div>
        </section>

        {/* Revenue Streams Breakdown */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '900',
            color: '#FFFFFF',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            14 Revenue Streams, One Link
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem'
          }}>
            {revenueStreams.map((stream, index) => {
              const Icon = stream.icon;
              return (
                <div
                  key={index}
                  style={{
                    background: '#11141A',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    border: '1px solid rgba(0, 224, 255, 0.2)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#00E0FF';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 224, 255, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 224, 255, 0.2)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(0, 224, 255, 0.2), rgba(107, 0, 255, 0.2))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon size={24} style={{ color: '#00F6FF' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{
                        fontSize: '1rem',
                        fontWeight: '700',
                        color: '#FFFFFF',
                        marginBottom: '0.25rem'
                      }}>
                        {stream.name}
                      </h4>
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#A8A8A8'
                      }}>
                        {stream.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Earnings Examples */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #11141A 0%, #1A1D26 100%)',
            borderRadius: '24px',
            padding: '2.5rem',
            borderTop: '4px solid #00E0FF',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '900',
              color: '#FFFFFF',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              How Much Can You Earn?
            </h2>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {earningsExamples.map((example, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.5rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '12px',
                    border: '1px solid rgba(0, 224, 255, 0.2)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#00E0FF';
                    e.currentTarget.style.background = 'rgba(0, 224, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 224, 255, 0.2)';
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                  }}
                >
                  <span style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#FFFFFF'
                  }}>
                    {example.referrals} people
                  </span>
                  <span style={{
                    fontSize: '1.5rem',
                    fontWeight: '900',
                    color: '#00F6FF',
                    textShadow: '0 0 20px rgba(0, 246, 255, 0.5)'
                  }}>
                    £{example.min.toLocaleString()} – £{example.max.toLocaleString()}/month
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Lifetime Commission Statement */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            background: 'linear-gradient(135deg, rgba(0, 224, 255, 0.1), rgba(107, 0, 255, 0.1))',
            borderRadius: '24px',
            border: '2px solid rgba(0, 224, 255, 0.3)'
          }}>
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: '900',
              color: '#FFFFFF',
              marginBottom: '1rem',
              textShadow: '0 0 30px rgba(0, 224, 255, 0.5)'
            }}>
              20% Lifetime Commission
            </h2>
            <p style={{
              fontSize: '1.125rem',
              color: '#A8A8A8',
              maxWidth: '700px',
              margin: '0 auto',
              lineHeight: '1.8'
            }}>
              Every time your referrals trade, deposit, withdraw or use any feature, you get paid instantly. 
              No limits. No expiry. Pure passive income.
            </p>
          </div>
        </section>

        {/* Bottom CTA */}
        <section>
          <button
            onClick={copyReferralLink}
            style={{
              width: '100%',
              maxWidth: '600px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              padding: '1.5rem 3rem',
              fontSize: '1.25rem',
              fontWeight: '900',
              color: '#FFFFFF',
              background: 'linear-gradient(135deg, #00E0FF 0%, #6B00FF 100%)',
              border: 'none',
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 12px 48px rgba(0, 224, 255, 0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-4px) scale(1.02)';
              e.target.style.boxShadow = '0 16px 64px rgba(0, 224, 255, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0) scale(1)';
              e.target.style.boxShadow = '0 12px 48px rgba(0, 224, 255, 0.4)';
            }}
          >
            <IoFlash size={24} />
            Start Earning Now
          </button>
        </section>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0);
            opacity: 0.4;
          }
          50% {
            transform: translate(10px, -20px);
            opacity: 0.8;
          }
        }
        
        @media (max-width: 768px) {
          section {
            padding: 0 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}
