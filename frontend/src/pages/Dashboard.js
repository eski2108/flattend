import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownLeft, Wallet as WalletIcon, Clock, TrendingUp, Zap } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function Dashboard() {
  const navigate = useNavigate();
  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMessages, setShowMessages] = useState(false);

  useEffect(() => {
    const handleAuth = async () => {
      // Check for session_id in URL fragment (from Google Sign-In)
      const hash = window.location.hash;
      if (hash && hash.includes('session_id=')) {
        const sessionId = hash.split('session_id=')[1].split('&')[0];
        
        try {
          // Exchange session_id for user data and session_token
          const response = await axios.get('https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data', {
            headers: { 'X-Session-ID': sessionId }
          });
          
          if (response.data) {
            const { id, email, name, picture, session_token } = response.data;
            
            // Store session_token via backend (sets httpOnly cookie)
            await axios.post(`${API}/api/auth/emergent-session`, {
              session_token,
              user_data: { id, email, name, picture }
            });
            
            // Store user data locally
            const userData = { user_id: id, email, full_name: name };
            localStorage.setItem('cryptobank_user', JSON.stringify(userData));
            setCurrentUser(userData);
            
            // Clean URL
            window.history.replaceState(null, '', window.location.pathname);
            
            // Fetch dashboard data
            fetchDashboardData(id);
            return;
          }
        } catch (error) {
          console.error('Authentication error:', error);
          toast.error('Authentication failed. Please try again.');
          navigate('/');
          return;
        }
      }
      
      // Check if user is already logged in (traditional email/password)
      const userData = localStorage.getItem('cryptobank_user');
      if (!userData) {
        navigate('/');
        return;
      }
      
      const user = JSON.parse(userData);
      setCurrentUser(user);
      fetchDashboardData(user.user_id);
    };
    
    handleAuth();
  }, [navigate]);

  const fetchDashboardData = async (userId) => {
    try {
      setLoading(true);
      
      // Fetch balances
      const balancesResponse = await axios.get(`${API}/crypto-bank/balances/${userId}`);
      if (balancesResponse.data.success) {
        setBalances(balancesResponse.data.balances);
      }
      
      // Fetch recent transactions (limit 5)
      const transactionsResponse = await axios.get(`${API}/crypto-bank/transactions/${userId}?limit=5`);
      if (transactionsResponse.data.success) {
        setTransactions(transactionsResponse.data.transactions);
      }

      // Fetch messages
      const messagesResponse = await axios.get(`${API}/user/messages?user_id=${userId}`);
      if (messagesResponse.data.success) {
        setMessages(messagesResponse.data.messages);
        setUnreadCount(messagesResponse.data.unread_count);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Silently handle error - don't show annoying toast
    } finally {
      setLoading(false);
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      await axios.post(`${API}/user/messages/${messageId}/read`);
      // Refresh messages
      if (currentUser) {
        const messagesResponse = await axios.get(`${API}/user/messages?user_id=${currentUser.user_id}`);
        if (messagesResponse.data.success) {
          setMessages(messagesResponse.data.messages);
          setUnreadCount(messagesResponse.data.unread_count);
        }
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };


  const [liveMarketPrices, setLiveMarketPrices] = useState({
    BTC: { price: 0, change: 0 },
    ETH: { price: 0, change: 0 },
    USDT: { price: 0, change: 0 }
  });

  // Fetch live prices
  useEffect(() => {
    const fetchLivePrices = async () => {
      try {
        const response = await axios.get(`${API}/api/prices/live`);
        if (response.data.success) {
          const prices = response.data.prices;
          setLiveMarketPrices({
            BTC: { 
              price: prices.BTC?.price_gbp || 0,
              change: 0 // 24h change not provided by current API
            },
            ETH: { 
              price: prices.ETH?.price_gbp || 0,
              change: 0
            },
            USDT: { 
              price: prices.USDT?.price_gbp || 0,
              change: 0
            }
          });
        }
      } catch (error) {
        console.error('Error fetching live prices:', error);
      }
    };

    fetchLivePrices();
    // Update prices every minute
    const interval = setInterval(fetchLivePrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const getTotalBalance = () => {
    return balances.reduce((total, b) => {
      // Use live market prices
      const usdValue = {
        'BTC': b.balance * liveMarketPrices.BTC.price,
        'ETH': b.balance * liveMarketPrices.ETH.price,
        'USDT': b.balance * liveMarketPrices.USDT.price
      };
      return total + (usdValue[b.currency] || 0);
    }, 0);
  };

  const formatCurrency = (amount, currency) => {
    if (currency === 'USDT') {
      return `$${amount.toFixed(2)}`;
    }
    return `${amount.toFixed(6)} ${currency}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container" data-testid="loading-spinner">
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dashboard-page premium-dashboard" data-testid="dashboard-page">
        <div style={{ 
          padding: '0',
          margin: '0'
        }}>
          <h2 style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: '600',
            fontSize: '16px',
            color: '#FFFFFF',
            margin: '0',
            marginTop: '6px',
            marginBottom: '2px',
            lineHeight: '19px'
          }}>
            Account Overview
          </h2>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: '500',
            fontSize: '13px',
            color: '#B5B5B5',
            margin: '0',
            marginBottom: '6px',
            lineHeight: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>Open Orders: 0</span>
            <span>•</span>
            <span>Completed Trades: 0</span>
          </p>
          <div style={{
            height: '1px',
            backgroundColor: '#1A1A1A',
            opacity: '0.35',
            marginTop: '8px',
            marginBottom: '10px'
          }} />
        </div>

        <div className="dashboard-header-premium" style={{ display: 'none' }}>
          <div className="header-content-animated">
            <h1 className="page-title-premium" data-testid="dashboard-title">
              <span className="gradient-text">Welcome Back</span>
            </h1>
            <p className="page-subtitle-premium">
              {(currentUser?.full_name || currentUser?.name || 'Trader').replace(/admin/gi, '').replace(/CoinHubEx/gi, '').replace(/Coin Hub X/gi, '').trim() || 'Trader'}
            </p>
          </div>
          <div className="quick-stats-mini">
            <div className="mini-stat">
              <span className="mini-stat-label">Active Orders:</span>
              <span className="mini-stat-value" style={{ marginLeft: '0.5rem' }}>0</span>
            </div>
            <div className="mini-stat">
              <span className="mini-stat-label">Completed:</span>
              <span className="mini-stat-value" style={{ marginLeft: '0.5rem' }}>0</span>
            </div>
          </div>
          {/* Messages/Notifications Badge */}
          {unreadCount > 0 && (
            <div 
              onClick={() => setShowMessages(true)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(168, 85, 247, 0.15))',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 240, 255, 0.25), rgba(168, 85, 247, 0.25))';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(168, 85, 247, 0.15))';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: '16px' }}>💬</span>
              <span style={{ color: '#00F0FF', fontWeight: '600', fontSize: '14px' }}>
                {unreadCount} message{unreadCount > 1 ? 's' : ''}
              </span>
              {unreadCount > 0 && (
                <span style={{
                  width: '8px',
                  height: '8px',
                  background: '#00F0FF',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'pulse 2s infinite'
                }} />
              )}
            </div>
          )}
        </div>

        {/* Messages Inbox Modal */}
        {showMessages && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1a1f3a, #0a0f1e)',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '900', margin: 0 }}>
                  📬 Your Messages
                </h2>
                <button
                  onClick={() => setShowMessages(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: '#fff',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '700'
                  }}
                >
                  Close
                </button>
              </div>

              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                  <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📭</div>
                  <div style={{ fontSize: '18px' }}>No messages yet</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {messages.map(message => (
                    <div
                      key={message.message_id}
                      onClick={() => !message.read && markMessageAsRead(message.message_id)}
                      style={{
                        padding: '1.5rem',
                        background: message.read ? 'rgba(0, 0, 0, 0.3)' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05))',
                        border: `2px solid ${message.read ? 'rgba(255, 255, 255, 0.1)' : 'rgba(239, 68, 68, 0.3)'}`,
                        borderRadius: '12px',
                        cursor: message.read ? 'default' : 'pointer',
                        position: 'relative'
                      }}
                    >
                      {!message.read && (
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          width: '12px',
                          height: '12px',
                          background: '#EF4444',
                          borderRadius: '50%',
                          animation: 'pulse 2s infinite'
                        }} />
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                        <h3 style={{ color: '#00F0FF', fontSize: '18px', fontWeight: '700', margin: 0 }}>
                          {message.title}
                        </h3>
                        <span style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                          {new Date(message.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ color: '#fff', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </div>
                      {!message.read && (
                        <div style={{ marginTop: '1rem', fontSize: '12px', color: '#EF4444', fontWeight: '600' }}>
                          Click to mark as read
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Total Balance Card - Premium */}
        <div 
          className="total-balance-card-premium animated-card" 
          data-testid="total-balance"
          style={{
            background: 'rgba(5, 15, 30, 0.95)',
            border: '2px solid #00D9FF',
            borderRadius: '20px',
            padding: '24px 20px',
            marginBottom: '16px',
            marginTop: '0',
            boxShadow: '0 0 30px rgba(0, 217, 255, 0.25)',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ 
                color: 'rgba(255,255,255,0.4)', 
                fontSize: '10px', 
                textTransform: 'uppercase', 
                letterSpacing: '1.5px',
                margin: '0',
                marginBottom: '12px',
                fontWeight: '500',
                fontFamily: 'Inter, sans-serif'
              }}>
                TOTAL PORTFOLIO VALUE
              </p>
              <p style={{ 
                fontSize: '3rem', 
                fontWeight: '700', 
                color: '#00D9FF', 
                textShadow: '0 0 30px rgba(0, 217, 255, 0.8)',
                margin: '0',
                lineHeight: '1',
                marginBottom: '10px',
                fontFamily: 'Inter, sans-serif'
              }}>
                ${getTotalBalance().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p style={{ 
                color: '#10B981', 
                fontSize: '13px', 
                fontWeight: '600', 
                margin: '0',
                fontFamily: 'Inter, sans-serif'
              }}>
                +0.00% (24h)
              </p>
            </div>
            <div style={{ marginTop: '4px' }}>
              <WalletIcon size={56} style={{ color: '#00D9FF', opacity: 0.7, strokeWidth: 1.5 }} />
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={() => navigate('/wallet')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '18px',
                background: '#00D9FF',
                border: 'none',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: '600',
                color: '#000000',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 20px rgba(0, 217, 255, 0.4)',
                fontFamily: 'Inter, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 28px rgba(0, 217, 255, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 217, 255, 0.4)';
              }}
            >
              <ArrowDownLeft size={18} strokeWidth={2.5} />
              Deposit
            </button>
            <button 
              onClick={() => navigate('/wallet')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '18px',
                background: '#A855F7',
                border: 'none',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: '600',
                color: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4)',
                fontFamily: 'Inter, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 28px rgba(168, 85, 247, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(168, 85, 247, 0.4)';
              }}
            >
              <ArrowUpRight size={18} strokeWidth={2.5} />
              Withdraw
            </button>
          </div>
        </div>

        {/* Referral Earnings Widget */}
        <div 
          className="referral-widget animated-card"
          onClick={() => navigate('/referrals')}
          style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(0, 240, 255, 0.05))',
            border: '2px solid rgba(168, 85, 247, 0.4)',
            borderRadius: '20px',
            padding: '2rem',
            marginBottom: '2.5rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 30px rgba(168, 85, 247, 0.2)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 0 40px rgba(168, 85, 247, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(168, 85, 247, 0.2)';
          }}
        >
          <div style={{ display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row', justifyContent: 'space-between', alignItems: window.innerWidth < 768 ? 'stretch' : 'center', gap: '1.5rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                <div style={{ fontSize: '32px' }}>🎁</div>
                <h3 style={{ color: '#A855F7', fontSize: '20px', fontWeight: '900', margin: 0 }}>
                  Referral Program
                </h3>
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '1rem' }}>
                Invite friends and earn <strong style={{ color: '#00F0FF' }}>20% commission</strong> on their trading fees for 12 months
              </p>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '900' }}>0</div>
                  <div style={{ color: '#888', fontSize: '13px' }}>Signups</div>
                </div>
                <div>
                  <div style={{ color: '#22C55E', fontSize: '24px', fontWeight: '900' }}>$0.00</div>
                  <div style={{ color: '#888', fontSize: '13px' }}>Earned</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                style={{
                  background: 'linear-gradient(135deg, #A855F7, #7E3DFF)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)',
                  transition: 'all 0.3s ease',
                  width: window.innerWidth < 768 ? '100%' : 'auto'
                }}
              >
                View Dashboard →
              </button>
            </div>
          </div>
        </div>


        {/* Live Market Prices - Professional */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '900',
            marginBottom: '1.5rem',
            color: '#fff'
          }}>
            Live Market Prices
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* BTC Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(247, 147, 26, 0.1), rgba(0, 0, 0, 0.4))',
              border: '2px solid rgba(247, 147, 26, 0.3)',
              borderRadius: '16px',
              padding: '1.5rem',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = 'rgba(247, 147, 26, 0.6)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(247, 147, 26, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(247, 147, 26, 0.3)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #F7931A, #FF9F00)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: '900',
                    color: '#000',
                    boxShadow: '0 4px 12px rgba(247, 147, 26, 0.4)'
                  }}>
                    ₿
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>Bitcoin</div>
                    <div style={{ fontSize: '13px', color: '#888' }}>BTC</div>
                  </div>
                </div>
                <div style={{
                  background: liveMarketPrices.BTC.change >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: liveMarketPrices.BTC.change >= 0 ? '#22C55E' : '#EF4444',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '700'
                }}>
                  {liveMarketPrices.BTC.change >= 0 ? '+' : ''}{liveMarketPrices.BTC.change}%
                </div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#F7931A', marginBottom: '0.5rem' }}>
                £{liveMarketPrices.BTC.price.toLocaleString()}
              </div>
              <div style={{ fontSize: '13px', color: '#888' }}>
                Last 24 hours
              </div>
            </div>

            {/* ETH Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(98, 126, 234, 0.1), rgba(0, 0, 0, 0.4))',
              border: '2px solid rgba(98, 126, 234, 0.3)',
              borderRadius: '16px',
              padding: '1.5rem',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = 'rgba(98, 126, 234, 0.6)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(98, 126, 234, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(98, 126, 234, 0.3)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #627EEA, #8A9EFF)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: '900',
                    color: '#fff',
                    boxShadow: '0 4px 12px rgba(98, 126, 234, 0.4)'
                  }}>
                    Ξ
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>Ethereum</div>
                    <div style={{ fontSize: '13px', color: '#888' }}>ETH</div>
                  </div>
                </div>
                <div style={{
                  background: liveMarketPrices.ETH.change >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: liveMarketPrices.ETH.change >= 0 ? '#22C55E' : '#EF4444',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '700'
                }}>
                  {liveMarketPrices.ETH.change >= 0 ? '+' : ''}{liveMarketPrices.ETH.change}%
                </div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#627EEA', marginBottom: '0.5rem' }}>
                £{liveMarketPrices.ETH.price.toLocaleString()}
              </div>
              <div style={{ fontSize: '13px', color: '#888' }}>
                Last 24 hours
              </div>
            </div>

            {/* USDT Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(38, 161, 123, 0.1), rgba(0, 0, 0, 0.4))',
              border: '2px solid rgba(38, 161, 123, 0.3)',
              borderRadius: '16px',
              padding: '1.5rem',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = 'rgba(38, 161, 123, 0.6)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(38, 161, 123, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(38, 161, 123, 0.3)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #26A17B, #2FD899)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '900',
                    color: '#fff',
                    boxShadow: '0 4px 12px rgba(38, 161, 123, 0.4)'
                  }}>
                    ₮
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>Tether</div>
                    <div style={{ fontSize: '13px', color: '#888' }}>USDT</div>
                  </div>
                </div>
                <div style={{
                  background: liveMarketPrices.USDT.change >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: liveMarketPrices.USDT.change >= 0 ? '#22C55E' : '#EF4444',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '700'
                }}>
                  {liveMarketPrices.USDT.change >= 0 ? '+' : ''}{liveMarketPrices.USDT.change}%
                </div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#26A17B', marginBottom: '0.5rem' }}>
                £{liveMarketPrices.USDT.price.toFixed(2)}
              </div>
              <div style={{ fontSize: '13px', color: '#888' }}>
                Last 24 hours
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Professional */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '900',
            marginBottom: '1.5rem',
            color: '#fff'
          }}>
            Quick Actions
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <button
              onClick={() => navigate('/marketplace')}
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(0, 0, 0, 0.4))',
                border: '2px solid rgba(34, 197, 94, 0.4)',
                borderRadius: '16px',
                padding: '1.5rem',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.8)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(34, 197, 94, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.4)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <TrendingUp size={24} color="#22C55E" />
              <span>Buy Crypto</span>
              <span style={{ fontSize: '13px', color: '#888' }}>Start trading now</span>
            </button>

            <button
              onClick={() => navigate('/marketplace')}
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(0, 0, 0, 0.4))',
                border: '2px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '16px',
                padding: '1.5rem',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.8)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(239, 68, 68, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <TrendingUp size={24} color="#EF4444" style={{ transform: 'rotate(180deg)' }} />
              <span>Sell Crypto</span>
              <span style={{ fontSize: '13px', color: '#888' }}>Create sell order</span>
            </button>

            <button
              onClick={() => navigate('/my-orders')}
              style={{
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(0, 0, 0, 0.4))',
                border: '2px solid rgba(0, 240, 255, 0.4)',
                borderRadius: '16px',
                padding: '1.5rem',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.8)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 240, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.4)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Clock size={24} color="#00F0FF" />
              <span>My Orders</span>
              <span style={{ fontSize: '13px', color: '#888' }}>View active orders</span>
            </button>

            <button
              onClick={() => navigate('/referrals')}
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(0, 0, 0, 0.4))',
                border: '2px solid rgba(168, 85, 247, 0.4)',
                borderRadius: '16px',
                padding: '1.5rem',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.8)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(168, 85, 247, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: '24px' }}>🎁</span>
              <span>Referrals</span>
              <span style={{ fontSize: '13px', color: '#888' }}>Earn 20% commission</span>
            </button>
          </div>
        </div>

        {/* Crypto Balances - Premium */}
        <div className="balances-section-premium">
          <h2 className="section-title-premium">
            <span className="gradient-text">Your Crypto Assets</span>
          </h2>
          <div className="balances-grid-premium">
            {balances.map((balance, index) => (
              <div 
                key={balance.currency} 
                className="balance-card-premium animated-card" 
                data-testid={`balance-${balance.currency}`}
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  background: 'rgba(30, 39, 73, 0.8)',
                  border: '2px solid rgba(0, 217, 255, 0.3)',
                  borderRadius: '16px',
                  padding: '2rem',
                  transition: 'all 0.3s ease'
                }}
              >
                <div className="balance-card-content-premium">
                  <div className="balance-card-header-premium">
                    <div className={`crypto-icon ${balance.currency.toLowerCase()}`}>
                      {balance.currency}
                    </div>
                    <span className="currency-label-premium">
                      {balance.currency === 'BTC' ? 'Bitcoin' : balance.currency === 'ETH' ? 'Ethereum' : 'Tether'}
                    </span>
                  </div>
                  <p style={{ 
                    fontSize: '1.75rem', 
                    fontWeight: '800', 
                    color: '#FFFFFF',
                    textShadow: '0 0 10px rgba(0, 217, 255, 0.4)',
                    margin: '0.5rem 0'
                  }}>{formatCurrency(balance.balance, balance.currency)}</p>
                  {balance.locked_balance > 0 && (
                    <p className="locked-balance-premium">🔒 Locked: {formatCurrency(balance.locked_balance, balance.currency)}</p>
                  )}
                  <div className="balance-usd-value">
                    ≈ ${({
                      'BTC': balance.balance * 45000,
                      'ETH': balance.balance * 2500,
                      'USDT': balance.balance * 1
                    }[balance.currency] || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions - Redesigned */}
        <div className="quick-actions-section-premium" style={{ marginBottom: '2.5rem' }}>
          <h2 className="section-title-premium">
            <span className="gradient-text">Quick Actions</span>
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            marginTop: '1.5rem'
          }}>
            {/* Instant Buy */}
            <button 
              onClick={() => navigate('/instant-buy')}
              data-testid="instant-buy-btn"
              style={{
                background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                border: '2px solid rgba(34, 197, 94, 0.4)',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                minHeight: '80px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
                color: '#ffffff'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(34, 197, 94, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(34, 197, 94, 0.4)';
              }}
            >
              <Zap size={32} style={{ flexShrink: 0, color: '#ffffff' }} fill="#ffffff" />
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>
                  Instant Buy
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)' }}>
                  One-click purchases
                </div>
              </div>
            </button>

            {/* P2P Express */}
            <button 
              onClick={() => navigate('/p2p-express')}
              data-testid="p2p-express-btn"
              style={{
                background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                border: '2px solid rgba(14, 165, 233, 0.4)',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                minHeight: '80px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 20px rgba(14, 165, 233, 0.4)',
                color: '#ffffff'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(14, 165, 233, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(14, 165, 233, 0.4)';
              }}
            >
              <TrendingUp size={32} style={{ flexShrink: 0, color: '#ffffff' }} />
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>
                  P2P Express
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)' }}>
                  Fast P2P matching
                </div>
              </div>
            </button>

            {/* Instant Sell */}
            <button
              onClick={() => navigate('/instant-sell')}
              style={{
                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                border: '2px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                minHeight: '80px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.3)',
                color: '#FFFFFF'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(239, 68, 68, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(239, 68, 68, 0.3)';
              }}
            >
              <div style={{ fontSize: '32px', flexShrink: 0 }}>⚡</div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>
                  Instant Sell
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)' }}>
                  Sell to admin instantly
                </div>
              </div>
            </button>

            {/* P2P Marketplace */}
            <button 
              onClick={() => navigate('/p2p-marketplace')}
              data-testid="marketplace-btn"
              style={{
                background: 'linear-gradient(135deg, #A855F7, #7E3DFF)',
                border: '2px solid rgba(168, 85, 247, 0.4)',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                minHeight: '80px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 20px rgba(168, 85, 247, 0.3)',
                color: '#FFFFFF'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(168, 85, 247, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(168, 85, 247, 0.3)';
              }}
            >
              <TrendingUp size={32} style={{ flexShrink: 0, color: '#FFFFFF' }} />
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>
                  P2P Marketplace
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)' }}>
                  Buy & sell with traders
                </div>
              </div>
            </button>

            {/* OTC Desk - Large Volume Trading */}
            <button 
              onClick={() => navigate('/otc-desk')}
              style={{
                background: 'linear-gradient(135deg, #FFA500, #FF8C00)',
                border: '2px solid rgba(255, 165, 0, 0.4)',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                minHeight: '80px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 20px rgba(255, 165, 0, 0.3)',
                color: '#FFFFFF'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 165, 0, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 165, 0, 0.3)';
              }}
            >
              <div style={{ fontSize: '24px', flexShrink: 0, fontWeight: '700' }}>OTC</div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>
                  OTC Desk
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)' }}>
                  Large volume trades (£2000+)
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Premium Features Quick Access */}
        <div className="market-overview-section" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="section-title-premium">
              <span className="gradient-text">Premium Features</span>
            </h2>
            <button
              onClick={() => navigate('/subscriptions')}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              View All Features
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {/* Seller Verification */}
            <button
              onClick={() => navigate('/subscriptions')}
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(168, 85, 247, 0.05))',
                border: '2px solid rgba(168, 85, 247, 0.4)',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(168, 85, 247, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '0.5rem', fontWeight: '700' }}></div>
              <div style={{ color: '#A855F7', fontSize: '18px', fontWeight: '700', marginBottom: '0.25rem' }}>
                Get Verified
              </div>
              <div style={{ color: '#888', fontSize: '13px', marginBottom: '0.5rem' }}>
                Build trust with buyers
              </div>
              <div style={{ color: '#00F0FF', fontSize: '20px', fontWeight: '900' }}>
                £25
              </div>
            </button>

            {/* Seller Levels */}
            <button
              onClick={() => navigate('/subscriptions')}
              style={{
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.05))',
                border: '2px solid rgba(255, 215, 0, 0.4)',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 215, 0, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '0.5rem', fontWeight: '700' }}></div>
              <div style={{ color: '#FFD700', fontSize: '18px', fontWeight: '700', marginBottom: '0.25rem' }}>
                Upgrade Level
              </div>
              <div style={{ color: '#888', fontSize: '13px', marginBottom: '0.5rem' }}>
                Priority + Lower fees
              </div>
              <div style={{ color: '#00F0FF', fontSize: '20px', fontWeight: '900' }}>
                From £20
              </div>
            </button>

            {/* Boost Listings */}
            <button
              onClick={() => navigate('/p2p/merchant')}
              style={{
                background: 'linear-gradient(135deg, rgba(255, 165, 0, 0.2), rgba(255, 165, 0, 0.05))',
                border: '2px solid rgba(255, 165, 0, 0.4)',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 165, 0, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '0.5rem', fontWeight: '700' }}></div>
              <div style={{ color: '#FFA500', fontSize: '18px', fontWeight: '700', marginBottom: '0.25rem' }}>
                Boost Listings
              </div>
              <div style={{ color: '#888', fontSize: '13px', marginBottom: '0.5rem' }}>
                Get more visibility
              </div>
              <div style={{ color: '#00F0FF', fontSize: '20px', fontWeight: '900' }}>
                From £10
              </div>
            </button>

            {/* Arbitrage Alerts */}
            <button
              onClick={() => navigate('/subscriptions')}
              style={{
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(0, 240, 255, 0.05))',
                border: '2px solid rgba(0, 240, 255, 0.4)',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 240, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '0.5rem', fontWeight: '700' }}></div>
              <div style={{ color: '#00F0FF', fontSize: '18px', fontWeight: '700', marginBottom: '0.25rem' }}>
                Price Alerts
              </div>
              <div style={{ color: '#888', fontSize: '13px', marginBottom: '0.5rem' }}>
                Arbitrage opportunities
              </div>
              <div style={{ color: '#00F0FF', fontSize: '20px', fontWeight: '900' }}>
                £10/month
              </div>
            </button>

            {/* Internal Transfer */}
            <button
              onClick={() => navigate('/transfer')}
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.05))',
                border: '2px solid rgba(34, 197, 94, 0.4)',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(34, 197, 94, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '0.5rem', fontWeight: '700' }}></div>
              <div style={{ color: '#22C55E', fontSize: '18px', fontWeight: '700', marginBottom: '0.25rem' }}>
                Send Crypto
              </div>
              <div style={{ color: '#888', fontSize: '13px', marginBottom: '0.5rem' }}>
                Instant internal transfer
              </div>
              <div style={{ color: '#22C55E', fontSize: '20px', fontWeight: '900' }}>
                0.3% fee
              </div>
            </button>
          </div>
        </div>

        {/* Market Overview - Live Prices */}
        <div className="market-overview-section">
          <h2 className="section-title-premium">
            <span className="gradient-text">Live Market Prices</span>
          </h2>
          <div className="market-prices-grid">
            <div className="price-card" style={{
              background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(251, 146, 60, 0.05))',
              border: '2px solid rgba(249, 115, 22, 0.4)',
              borderRadius: '16px',
              padding: '1.5rem',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div className="crypto-icon btc">BTC</div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Bitcoin</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#F59E0B' }}>£72,500</p>
                </div>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#10B981' }}>+2.4% (24h)</p>
            </div>

            <div className="price-card" style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(167, 139, 250, 0.05))',
              border: '2px solid rgba(139, 92, 246, 0.4)',
              borderRadius: '16px',
              padding: '1.5rem',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div className="crypto-icon eth">ETH</div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Ethereum</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#8B5CF6' }}>£2,400</p>
                </div>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#EF4444' }}>-0.8% (24h)</p>
            </div>

            <div className="price-card" style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(74, 222, 128, 0.05))',
              border: '2px solid rgba(34, 197, 94, 0.4)',
              borderRadius: '16px',
              padding: '1.5rem',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div className="crypto-icon usdt">USDT</div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Tether</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#22C55E' }}>£0.79</p>
                </div>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#10B981' }}>+0.1% (24h)</p>
            </div>
          </div>
        </div>

        {/* Trading Stats */}
        <div className="trading-stats-section">
          <h2 className="section-title-premium">
            <span className="gradient-text">Your Trading Stats</span>
          </h2>
          <div className="stats-grid">
            <div className="stat-card-premium" style={{
              background: 'rgba(30, 39, 73, 0.8)',
              border: '2px solid rgba(0, 217, 255, 0.3)',
              borderRadius: '16px',
              padding: '1.5rem'
            }}>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Total Trades</p>
              <p style={{ fontSize: '2rem', fontWeight: '800', color: '#00D9FF' }}>0</p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>All time</p>
            </div>
            <div className="stat-card-premium" style={{
              background: 'rgba(30, 39, 73, 0.8)',
              border: '2px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '16px',
              padding: '1.5rem'
            }}>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Trading Volume</p>
              <p style={{ fontSize: '2rem', fontWeight: '800', color: '#A855F7' }}>£0.00</p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>30 days</p>
            </div>
            <div className="stat-card-premium" style={{
              background: 'rgba(30, 39, 73, 0.8)',
              border: '2px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '16px',
              padding: '1.5rem'
            }}>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Success Rate</p>
              <p style={{ fontSize: '2rem', fontWeight: '800', color: '#22C55E' }}>—</p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Start trading!</p>
            </div>
          </div>
        </div>

        {/* Features & Benefits */}
        <div className="features-section">
          <h2 className="section-title-premium">
            <span className="gradient-text">Why Trade on Coin Hub X?</span>
          </h2>
          <div className="features-grid">
            <div className="feature-card" style={{
              background: 'rgba(30, 39, 73, 0.6)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              borderRadius: '16px',
              padding: '1.5rem',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔒</div>
              <h3 style={{ color: '#00D9FF', fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.5rem' }}>Secure Escrow</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Your funds are protected with our secure escrow system until trade completion</p>
            </div>
            <div className="feature-card" style={{
              background: 'rgba(30, 39, 73, 0.6)',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              borderRadius: '16px',
              padding: '1.5rem',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚡</div>
              <h3 style={{ color: '#A855F7', fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.5rem' }}>Instant Trading</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Connect directly with buyers and sellers for fast, peer-to-peer trading</p>
            </div>
            <div className="feature-card" style={{
              background: 'rgba(30, 39, 73, 0.6)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: '16px',
              padding: '1.5rem',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💰</div>
              <h3 style={{ color: '#22C55E', fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.5rem' }}>Low Fees</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Competitive trading fees with no hidden charges or surprises</p>
            </div>
            <div className="feature-card" style={{
              background: 'rgba(30, 39, 73, 0.6)',
              border: '1px solid rgba(249, 115, 22, 0.2)',
              borderRadius: '16px',
              padding: '1.5rem',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌍</div>
              <h3 style={{ color: '#F59E0B', fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.5rem' }}>Multiple Payment Methods</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Bank transfer, Revolut, Monzo, Wise and more payment options available</p>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="transactions-section">
          <div className="section-header">
            <h2 className="section-title-premium">
              <span className="gradient-text">Recent Activity</span>
            </h2>
            <Button variant="link" onClick={() => navigate('/transactions')} data-testid="view-all-btn" style={{ color: '#00D9FF' }}>
              View All →
            </Button>
          </div>
          
          {transactions.length > 0 ? (
            <div 
              onClick={() => navigate('/my-orders')}
              style={{
                background: 'rgba(30, 39, 73, 0.6)',
                border: '2px solid rgba(0, 217, 255, 0.3)',
                borderRadius: '16px',
                padding: '1.5rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.6)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 217, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.3)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {transactions.map((tx) => (
                  <div 
                    key={tx.transaction_id} 
                    data-testid="transaction-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      background: 'rgba(10, 20, 45, 0.6)',
                      borderRadius: '12px',
                      border: '1px solid rgba(0, 217, 255, 0.2)'
                    }}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: tx.transaction_type === 'deposit' 
                        ? 'rgba(34, 197, 94, 0.2)' 
                        : 'rgba(168, 85, 247, 0.2)',
                      border: tx.transaction_type === 'deposit'
                        ? '2px solid rgba(34, 197, 94, 0.4)'
                        : '2px solid rgba(168, 85, 247, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {tx.transaction_type === 'deposit' ? (
                        <ArrowDownLeft size={24} style={{ color: '#22C55E' }} />
                      ) : (
                        <ArrowUpRight size={24} style={{ color: '#A855F7' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ 
                        fontSize: '1rem', 
                        fontWeight: '600', 
                        color: '#FFFFFF',
                        marginBottom: '0.25rem'
                      }}>
                        {tx.transaction_type.charAt(0).toUpperCase() + tx.transaction_type.slice(1)}
                      </p>
                      <p style={{ 
                        fontSize: '0.8125rem', 
                        color: 'rgba(255,255,255,0.6)'
                      }}>
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        color: tx.transaction_type === 'deposit' ? '#22C55E' : '#A855F7',
                        marginBottom: '0.25rem'
                      }}>
                        {tx.transaction_type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                      </p>
                      <p style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        background: 'rgba(0, 217, 255, 0.15)',
                        border: '1px solid rgba(0, 217, 255, 0.3)',
                        borderRadius: '6px',
                        color: '#00D9FF',
                        fontWeight: '600',
                        display: 'inline-block'
                      }}>
                        {tx.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              background: 'rgba(30, 39, 73, 0.6)',
              border: '2px dashed rgba(0, 217, 255, 0.3)',
              borderRadius: '16px',
              padding: '3rem 2rem',
              textAlign: 'center'
            }} data-testid="empty-transactions">
              <Clock size={48} style={{ color: '#00D9FF', marginBottom: '1rem', opacity: 0.6 }} />
              <h3 style={{ color: '#FFFFFF', fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>No Activity Yet</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem' }}>Start trading to see your transaction history here</p>
              <Button onClick={() => navigate('/marketplace')} data-testid="start-trading-btn" style={{
                background: 'linear-gradient(135deg, #00D9FF, #A855F7)',
                border: 'none',
                padding: '0.75rem 2rem',
                borderRadius: '10px',
                color: '#FFFFFF',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                Explore Marketplace
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}