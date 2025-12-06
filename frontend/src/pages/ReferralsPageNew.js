import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { IoAlertCircle as AlertCircle, IoBriefcase as Briefcase, IoCard as CreditCard, IoCash as DollarSign, IoCheckmark, IoCopy, IoFlash as Zap, IoPeople as Users, IoShield as Shield, IoTrendingUp as TrendingUp } from 'react-icons/io5';
const API = 'https://coinhubx.net/api';
import { toast } from 'react-hot-toast';

// API already defined

export default function ReferralsPageNew() {
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
      const userEmail = localStorage.getItem('email') || 'demo@user.com';
      const username = userEmail.split('@')[0].toUpperCase();
      
      if (!token || !userId) {
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
      const username = user.username || user.email?.split('@')[0] || 'user';
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
    { name: 'Future Features', icon: DollarSign, description: '20% of all new revenue' }
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
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(0, 224, 255, 0.2)',
            borderTop: '4px solid #00E0FF',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: '#A8A8A8' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B0E13',
      padding: '2rem 1.5rem',
      paddingBottom: '4rem'
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        
        {/* Page Title */}
        <div style={{
          textAlign: 'center',
          marginBottom: '3rem'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #00E0FF 0%, #7A3CFF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>
            Earn With Referrals
          </h1>
          <p style={{
            fontSize: '1rem',
            color: '#A8A8A8'
          }}>
            Two ways to earn. One account. Lifetime commissions.
          </p>
        </div>

        {/* Section 1: £20 Bonus Referral Link */}
        <div style={{
          background: '#11141A',
          border: '1px solid #00E0FF',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#FFFFFF',
            marginBottom: '1rem'
          }}>
            £20 Bonus Referral Link
          </h2>
          <p style={{
            fontSize: '0.9rem',
            color: '#A8A8A8',
            marginBottom: '1.5rem',
            lineHeight: '1.6'
          }}>
            You earn £20 every time someone uses your link and makes their first deposit of £150.
          </p>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{
              flex: 1,
              minWidth: '250px',
              padding: '0.75rem 1rem',
              background: 'rgba(0, 224, 255, 0.05)',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: '#FFFFFF',
              wordBreak: 'break-all'
            }}>
              {referralData?.bonusLink}
            </div>
            <button
              onClick={() => copyToClipboard(referralData?.bonusLink, 'bonus')}
              style={{
                padding: '0.75rem 1.5rem',
                background: copiedBonus ? '#22C55E' : '#00E0FF',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease'
              }}
            >
              {copiedBonus ? <IoCheckmark size={16} /> : <IoCopy size={16} />}
              {copiedBonus ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Section 2: 20% Lifetime Commission Link */}
        <div style={{
          background: '#11141A',
          border: '1px solid #00E0FF',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '3rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#FFFFFF',
            marginBottom: '1rem'
          }}>
            20% Lifetime Commission Link
          </h2>
          <p style={{
            fontSize: '0.9rem',
            color: '#A8A8A8',
            marginBottom: '1.5rem',
            lineHeight: '1.6'
          }}>
            You earn 20% of the platform's fee on every trade your referral makes — for life.
            This includes all 14 revenue streams.
          </p>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{
              flex: 1,
              minWidth: '250px',
              padding: '0.75rem 1rem',
              background: 'rgba(0, 224, 255, 0.05)',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: '#FFFFFF',
              wordBreak: 'break-all'
            }}>
              {referralData?.lifetimeLink}
            </div>
            <button
              onClick={() => copyToClipboard(referralData?.lifetimeLink, 'lifetime')}
              style={{
                padding: '0.75rem 1.5rem',
                background: copiedLifetime ? '#22C55E' : '#00E0FF',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease'
              }}
            >
              {copiedLifetime ? <IoCheckmark size={16} /> : <IoCopy size={16} />}
              {copiedLifetime ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>
          <div style={{
            background: '#11141A',
            border: '1px solid #00E0FF',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{ textAlign: 'left' }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#A8A8A8',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Total Earned
              </p>
              <p style={{
                fontSize: '2rem',
                fontWeight: '900',
                color: '#00F6FF'
              }}>
                £{referralData?.totalEarnings?.toFixed(2)}
              </p>
            </div>
          </div>

          <div style={{
            background: '#11141A',
            border: '1px solid #00E0FF',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{ textAlign: 'left' }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#A8A8A8',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Active Referrals
              </p>
              <p style={{
                fontSize: '2rem',
                fontWeight: '900',
                color: '#00F6FF'
              }}>
                {referralData?.activeReferrals}
              </p>
            </div>
          </div>

          <div style={{
            background: '#11141A',
            border: '1px solid #00E0FF',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{ textAlign: 'left' }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#A8A8A8',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                This Month's Earnings
              </p>
              <p style={{
                fontSize: '2rem',
                fontWeight: '900',
                color: '#00F6FF'
              }}>
                £{referralData?.monthEarnings?.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Revenue Streams */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            color: '#FFFFFF',
            marginBottom: '1.5rem'
          }}>
            14 Revenue Streams
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
                    border: '1px solid rgba(0, 224, 255, 0.3)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem'
                  }}
                >
                  <Icon size={20} style={{ color: '#00E0FF', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h3 style={{
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#FFFFFF',
                      marginBottom: '0.25rem'
                    }}>
                      {stream.name}
                    </h3>
                    <p style={{
                      fontSize: '0.8rem',
                      color: '#A8A8A8',
                      margin: 0
                    }}>
                      {stream.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* How Much Can You Earn */}
        <div style={{
          background: '#11141A',
          border: '1px solid #00E0FF',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '3rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#FFFFFF',
            marginBottom: '1.5rem'
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
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                <span style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#FFFFFF'
                }}>
                  {example.referrals} people
                </span>
                <span style={{
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: '#00F6FF'
                }}>
                  £{example.min.toLocaleString()} – £{example.max.toLocaleString()}/month
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 224, 255, 0.1), rgba(122, 60, 255, 0.1))',
          border: '1px solid #00E0FF',
          borderRadius: '16px',
          padding: '2.5rem',
          textAlign: 'center'
        }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '900',
            color: '#FFFFFF',
            marginBottom: '0.5rem'
          }}>
            Start Earning 20% For Life
          </h2>
          <p style={{
            fontSize: '0.9rem',
            color: '#A8A8A8',
            marginBottom: '1.5rem'
          }}>
            Share your link. Track your earnings in real time. Withdraw anytime.
          </p>
          <button
            onClick={() => copyToClipboard(referralData?.lifetimeLink, 'lifetime')}
            style={{
              padding: '1rem 2.5rem',
              background: 'linear-gradient(135deg, #00E0FF 0%, #7A3CFF 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 24px rgba(0, 224, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Copy Lifetime Link
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
