import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '@/components/Layout';
import { 
  IoTrendingUp, 
  IoTrendingDown, 
  IoWallet, 
  IoFlash, 
  IoSwapHorizontal, 
  IoCard, 
  IoBarChart, 
  IoEye,
  IoEyeOff,
  IoArrowUp,
  IoArrowDown,
  IoAdd,
  IoRefresh,
  IoAnalytics,
  IoShield,
  IoTime,
  IoStar
} from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [portfolioData, setPortfolioData] = useState({
    change24h: 0,
    totalAssets: 0,
    availableBalance: 0,
    lockedBalance: 0
  });
  const [topAssets, setTopAssets] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadData(parsedUser.user_id);
  }, [navigate]);

  const loadData = async (userId) => {
    try {
      const res = await axios.get(`${API}/api/portfolio/summary/${userId}`);
      if (res.data.success) {
        setTotalValue(res.data.current_value || 0);
        setPortfolioData({
          change24h: res.data.change_24h || 0,
          totalAssets: res.data.total_assets || 0,
          availableBalance: res.data.available_balance || 0,
          lockedBalance: res.data.locked_balance || 0
        });
      }
      
      // Load top assets
      const assetsRes = await axios.get(`${API}/api/wallets/balances/${userId}`);
      if (assetsRes.data.success) {
        setTopAssets(assetsRes.data.balances?.slice(0, 5) || []);
      }
      
      // Load recent transactions
      const txRes = await axios.get(`${API}/api/transactions/${userId}?limit=5`);
      if (txRes.data.success) {
        setRecentTransactions(txRes.data.transactions || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatCrypto = (amount, symbol) => {
    return `${parseFloat(amount).toFixed(8)} ${symbol}`;
  };

  if (loading) {
    return (
      <Layout>
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #020618 0%, #071327 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center', color: '#00F0FF' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            <div>Loading Portfolio...</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #020618 0%, #071327 100%)',
        paddingBottom: '60px'
      }}>
        <div style={{ padding: isMobile ? '16px' : '24px' }}>
          <div style={{ maxWidth: '1800px', margin: '0 auto' }}>
            
            {/* Premium Header */}
            <div style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '16px', gap: isMobile ? '16px' : '0' }}>
                <div>
                  <h1 style={{ fontSize: isMobile ? '32px' : '42px', fontWeight: '700', color: '#FFFFFF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <IoBarChart size={isMobile ? 32 : 42} color="#00F0FF" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.8))' }} />
                    Portfolio Dashboard
                  </h1>
                  <p style={{ fontSize: isMobile ? '15px' : '17px', color: '#8F9BB3', margin: 0 }}>
                    Welcome back, {user?.first_name || 'Trader'}! Track your crypto investments in real-time
                  </p>
                </div>
                <button
                  onClick={() => loadData(user?.user_id)}
                  style={{
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 240, 255, 0.05) 100%)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#00F0FF',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.6)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(0, 240, 255, 0.1) 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 240, 255, 0.05) 100%)';
                  }}
                >
                  <IoRefresh size={16} />
                  Refresh
                </button>
              </div>
              <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.6) 50%, transparent 100%)', boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)' }} />
            </div>

            {/* Portfolio Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px', marginBottom: isMobile ? '20px' : '32px' }}>
              
              {/* Total Portfolio Value */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, rgba(0, 240, 255, 0.03) 100%)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '16px',
                padding: isMobile ? '20px' : '24px',
                boxShadow: '0 0 30px rgba(0, 240, 255, 0.15), inset 0 2px 10px rgba(0, 0, 0, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '80px',
                  height: '80px',
                  background: 'radial-gradient(circle, rgba(0, 240, 255, 0.3), transparent)',
                  filter: 'blur(25px)',
                  pointerEvents: 'none'
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#8F9BB3', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Portfolio Value</div>
                  <button
                    onClick={() => setBalanceVisible(!balanceVisible)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#8F9BB3',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    {balanceVisible ? <IoEye size={16} /> : <IoEyeOff size={16} />}
                  </button>
                </div>
                <div style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '700', color: '#00F0FF', textShadow: '0 0 15px rgba(0, 240, 255, 0.5)', marginBottom: '8px' }}>
                  {balanceVisible ? formatCurrency(totalValue) : '••••••'}
                </div>
                <div style={{ fontSize: '12px', color: '#8F9BB3' }}>
                  Available: {balanceVisible ? formatCurrency(portfolioData.availableBalance) : '••••••'}
                </div>
              </div>
              
              {/* 24h Change */}
              <div style={{
                background: portfolioData.change24h >= 0 
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.03) 100%)'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.03) 100%)',
                border: `1px solid ${portfolioData.change24h >= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: '16px',
                padding: isMobile ? '20px' : '24px',
                boxShadow: portfolioData.change24h >= 0 
                  ? '0 0 30px rgba(34, 197, 94, 0.15), inset 0 2px 10px rgba(0, 0, 0, 0.3)'
                  : '0 0 30px rgba(239, 68, 68, 0.15), inset 0 2px 10px rgba(0, 0, 0, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '80px',
                  height: '80px',
                  background: portfolioData.change24h >= 0 
                    ? 'radial-gradient(circle, rgba(34, 197, 94, 0.3), transparent)'
                    : 'radial-gradient(circle, rgba(239, 68, 68, 0.3), transparent)',
                  filter: 'blur(25px)',
                  pointerEvents: 'none'
                }} />
                <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>24h Change</div>
                <div style={{ 
                  fontSize: isMobile ? '28px' : '32px', 
                  fontWeight: '700', 
                  color: portfolioData.change24h >= 0 ? '#22C55E' : '#EF4444',
                  textShadow: portfolioData.change24h >= 0 ? '0 0 15px rgba(34, 197, 94, 0.5)' : '0 0 15px rgba(239, 68, 68, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {portfolioData.change24h >= 0 ? <IoTrendingUp size={24} /> : <IoTrendingDown size={24} />}
                  {portfolioData.change24h >= 0 ? '+' : ''}{portfolioData.change24h.toFixed(2)}%
                </div>
              </div>
              
              {/* Total Assets */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(155, 77, 255, 0.08) 0%, rgba(155, 77, 255, 0.03) 100%)',
                border: '1px solid rgba(155, 77, 255, 0.3)',
                borderRadius: '16px',
                padding: isMobile ? '20px' : '24px',
                boxShadow: '0 0 30px rgba(155, 77, 255, 0.15), inset 0 2px 10px rgba(0, 0, 0, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '80px',
                  height: '80px',
                  background: 'radial-gradient(circle, rgba(155, 77, 255, 0.3), transparent)',
                  filter: 'blur(25px)',
                  pointerEvents: 'none'
                }} />
                <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Assets</div>
                <div style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '700', color: '#9B4DFF', textShadow: '0 0 15px rgba(155, 77, 255, 0.5)' }}>
                  {portfolioData.totalAssets}
                </div>
                <div style={{ fontSize: '12px', color: '#8F9BB3' }}>
                  Locked: {balanceVisible ? formatCurrency(portfolioData.lockedBalance) : '••••••'}
                </div>
              </div>
              
              {/* Quick Actions */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(245, 197, 66, 0.08) 0%, rgba(245, 197, 66, 0.03) 100%)',
                border: '1px solid rgba(245, 197, 66, 0.3)',
                borderRadius: '16px',
                padding: isMobile ? '20px' : '24px',
                boxShadow: '0 0 30px rgba(245, 197, 66, 0.15), inset 0 2px 10px rgba(0, 0, 0, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '80px',
                  height: '80px',
                  background: 'radial-gradient(circle, rgba(245, 197, 66, 0.3), transparent)',
                  filter: 'blur(25px)',
                  pointerEvents: 'none'
                }} />
                <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Actions</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => navigate('/instant-buy')}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(245, 197, 66, 0.2)',
                      border: '1px solid rgba(245, 197, 66, 0.4)',
                      borderRadius: '8px',
                      color: '#F5C542',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.3s'
                    }}
                  >
                    <IoAdd size={12} />
                    Buy
                  </button>
                  <button
                    onClick={() => navigate('/trading')}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(245, 197, 66, 0.2)',
                      border: '1px solid rgba(245, 197, 66, 0.4)',
                      borderRadius: '8px',
                      color: '#F5C542',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.3s'
                    }}
                  >
                    <IoBarChart size={12} />
                    Trade
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: isMobile ? '16px' : '32px' }}>
              
              {/* Left Column: Top Assets & Recent Activity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px' }}>
                
                {/* Top Assets */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.98) 0%, rgba(7, 19, 39, 0.95) 100%)',
                  border: '2px solid rgba(0, 240, 255, 0.4)',
                  borderRadius: '20px',
                  padding: isMobile ? '20px' : '28px',
                  boxShadow: '0 0 60px rgba(0, 240, 255, 0.3), inset 0 0 40px rgba(0, 240, 255, 0.08)',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '200px',
                    height: '60px',
                    background: 'radial-gradient(circle, rgba(0, 240, 255, 0.4), transparent)',
                    filter: 'blur(40px)',
                    pointerEvents: 'none'
                  }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ 
                      fontSize: isMobile ? '18px' : '20px', 
                      fontWeight: '700', 
                      color: '#FFFFFF', 
                      margin: 0,
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      textShadow: '0 0 15px rgba(0, 240, 255, 0.5)'
                    }}>
                      <IoStar size={20} color="#00F0FF" />
                      Top Assets
                    </h3>
                    <button
                      onClick={() => navigate('/wallet')}
                      style={{
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 240, 255, 0.05) 100%)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#00F0FF',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                    >
                      View All
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {topAssets.length > 0 ? topAssets.map((asset, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px',
                        background: 'rgba(0, 240, 255, 0.05)',
                        borderRadius: '12px',
                        border: '1px solid rgba(0, 240, 255, 0.15)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #00F0FF, #0080FF)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '700',
                            color: '#000000'
                          }}>
                            {asset.currency?.substring(0, 2) || 'CR'}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>
                              {asset.currency || 'Unknown'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#8F9BB3' }}>
                              {formatCrypto(asset.total_balance || 0, asset.currency || '')}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#00F0FF' }}>
                            {balanceVisible ? formatCurrency(asset.fiat_value || 0) : '••••••'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#22C55E' }}>
                            +2.4%
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#8F9BB3' }}>
                        <IoWallet size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <div>No assets found</div>
                        <button
                          onClick={() => navigate('/instant-buy')}
                          style={{
                            marginTop: '16px',
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #00F0FF, #0080FF)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#000000',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Buy Your First Crypto
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Activity */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.98) 0%, rgba(7, 19, 39, 0.95) 100%)',
                  border: '2px solid rgba(155, 77, 255, 0.4)',
                  borderRadius: '20px',
                  padding: isMobile ? '20px' : '28px',
                  boxShadow: '0 0 60px rgba(155, 77, 255, 0.3), inset 0 0 40px rgba(155, 77, 255, 0.08)',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '200px',
                    height: '60px',
                    background: 'radial-gradient(circle, rgba(155, 77, 255, 0.4), transparent)',
                    filter: 'blur(40px)',
                    pointerEvents: 'none'
                  }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ 
                      fontSize: isMobile ? '18px' : '20px', 
                      fontWeight: '700', 
                      color: '#FFFFFF', 
                      margin: 0,
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      textShadow: '0 0 15px rgba(155, 77, 255, 0.5)'
                    }}>
                      <IoTime size={20} color="#9B4DFF" />
                      Recent Activity
                    </h3>
                    <button
                      onClick={() => navigate('/transactions')}
                      style={{
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, rgba(155, 77, 255, 0.15) 0%, rgba(155, 77, 255, 0.05) 100%)',
                        border: '1px solid rgba(155, 77, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#9B4DFF',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                    >
                      View All
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {recentTransactions.length > 0 ? recentTransactions.map((tx, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px',
                        background: 'rgba(155, 77, 255, 0.05)',
                        borderRadius: '12px',
                        border: '1px solid rgba(155, 77, 255, 0.15)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: tx.type === 'deposit' ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {tx.type === 'deposit' ? <IoArrowDown size={20} color="#FFFFFF" /> : <IoArrowUp size={20} color="#FFFFFF" />}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF', textTransform: 'capitalize' }}>
                              {tx.type || 'Transaction'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#8F9BB3' }}>
                              {new Date(tx.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: tx.type === 'deposit' ? '#22C55E' : '#EF4444' }}>
                            {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount || 0)}
                          </div>
                          <div style={{ fontSize: '12px', color: '#8F9BB3', textTransform: 'capitalize' }}>
                            {tx.status || 'Completed'}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#8F9BB3' }}>
                        <IoTime size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <div>No recent activity</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Quick Actions & Market Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px' }}>
                
                {/* Quick Actions Panel */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.98) 0%, rgba(7, 19, 39, 0.95) 100%)',
                  border: '2px solid rgba(245, 197, 66, 0.4)',
                  borderRadius: '20px',
                  padding: isMobile ? '20px' : '28px',
                  boxShadow: '0 0 60px rgba(245, 197, 66, 0.3), inset 0 0 40px rgba(245, 197, 66, 0.08)',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '150px',
                    height: '60px',
                    background: 'radial-gradient(circle, rgba(245, 197, 66, 0.4), transparent)',
                    filter: 'blur(35px)',
                    pointerEvents: 'none'
                  }} />
                  
                  <h3 style={{ 
                    fontSize: isMobile ? '18px' : '20px', 
                    fontWeight: '700', 
                    color: '#FFFFFF', 
                    marginBottom: '20px',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    textShadow: '0 0 15px rgba(245, 197, 66, 0.5)'
                  }}>
                    <IoFlash size={20} color="#F5C542" />
                    Quick Actions
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                      onClick={() => navigate('/instant-buy')}
                      style={{
                        padding: '16px',
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '12px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.3s',
                        width: '100%'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.6)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(34, 197, 94, 0.1) 100%)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)';
                      }}
                    >
                      <IoAdd size={20} color="#22C55E" />
                      <div style={{ textAlign: 'left' }}>
                        <div>Buy Crypto</div>
                        <div style={{ fontSize: '12px', color: '#8F9BB3' }}>Instant purchase with GBP</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => navigate('/trading')}
                      style={{
                        padding: '16px',
                        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 240, 255, 0.05) 100%)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '12px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.3s',
                        width: '100%'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.6)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(0, 240, 255, 0.1) 100%)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 240, 255, 0.05) 100%)';
                      }}
                    >
                      <IoBarChart size={20} color="#00F0FF" />
                      <div style={{ textAlign: 'left' }}>
                        <div>Spot Trading</div>
                        <div style={{ fontSize: '12px', color: '#8F9BB3' }}>Advanced trading with charts</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => navigate('/swap-crypto')}
                      style={{
                        padding: '16px',
                        background: 'linear-gradient(135deg, rgba(155, 77, 255, 0.15) 0%, rgba(155, 77, 255, 0.05) 100%)',
                        border: '1px solid rgba(155, 77, 255, 0.3)',
                        borderRadius: '12px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.3s',
                        width: '100%'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(155, 77, 255, 0.6)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(155, 77, 255, 0.25) 0%, rgba(155, 77, 255, 0.1) 100%)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(155, 77, 255, 0.3)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(155, 77, 255, 0.15) 0%, rgba(155, 77, 255, 0.05) 100%)';
                      }}
                    >
                      <IoSwapHorizontal size={20} color="#9B4DFF" />
                      <div style={{ textAlign: 'left' }}>
                        <div>Swap Crypto</div>
                        <div style={{ fontSize: '12px', color: '#8F9BB3' }}>Exchange between currencies</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => navigate('/p2p-express')}
                      style={{
                        padding: '16px',
                        background: 'linear-gradient(135deg, rgba(245, 197, 66, 0.15) 0%, rgba(245, 197, 66, 0.05) 100%)',
                        border: '1px solid rgba(245, 197, 66, 0.3)',
                        borderRadius: '12px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.3s',
                        width: '100%'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(245, 197, 66, 0.6)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245, 197, 66, 0.25) 0%, rgba(245, 197, 66, 0.1) 100%)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(245, 197, 66, 0.3)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245, 197, 66, 0.15) 0%, rgba(245, 197, 66, 0.05) 100%)';
                      }}
                    >
                      <IoFlash size={20} color="#F5C542" />
                      <div style={{ textAlign: 'left' }}>
                        <div>P2P Express</div>
                        <div style={{ fontSize: '12px', color: '#8F9BB3' }}>Fast peer-to-peer trading</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Security & Account Status */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.98) 0%, rgba(7, 19, 39, 0.95) 100%)',
                  border: '2px solid rgba(34, 197, 94, 0.4)',
                  borderRadius: '20px',
                  padding: isMobile ? '20px' : '28px',
                  boxShadow: '0 0 60px rgba(34, 197, 94, 0.3), inset 0 0 40px rgba(34, 197, 94, 0.08)',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '150px',
                    height: '60px',
                    background: 'radial-gradient(circle, rgba(34, 197, 94, 0.4), transparent)',
                    filter: 'blur(35px)',
                    pointerEvents: 'none'
                  }} />
                  
                  <h3 style={{ 
                    fontSize: isMobile ? '18px' : '20px', 
                    fontWeight: '700', 
                    color: '#FFFFFF', 
                    marginBottom: '20px',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    textShadow: '0 0 15px rgba(34, 197, 94, 0.5)'
                  }}>
                    <IoShield size={20} color="#22C55E" />
                    Account Status
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: 'rgba(34, 197, 94, 0.1)',
                      borderRadius: '10px',
                      border: '1px solid rgba(34, 197, 94, 0.2)'
                    }}>
                      <span style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600' }}>Verification</span>
                      <span style={{ fontSize: '12px', color: '#22C55E', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#22C55E',
                          boxShadow: '0 0 10px rgba(34, 197, 94, 0.8)'
                        }} />
                        Verified
                      </span>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: 'rgba(34, 197, 94, 0.1)',
                      borderRadius: '10px',
                      border: '1px solid rgba(34, 197, 94, 0.2)'
                    }}>
                      <span style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600' }}>2FA Security</span>
                      <span style={{ fontSize: '12px', color: '#22C55E', fontWeight: '700' }}>Enabled</span>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: 'rgba(34, 197, 94, 0.1)',
                      borderRadius: '10px',
                      border: '1px solid rgba(34, 197, 94, 0.2)'
                    }}>
                      <span style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600' }}>Account Level</span>
                      <span style={{ fontSize: '12px', color: '#F5C542', fontWeight: '700' }}>Premium</span>
                    </div>
                    
                    <button
                      onClick={() => navigate('/settings')}
                      style={{
                        padding: '12px',
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '8px',
                        color: '#22C55E',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        width: '100%',
                        transition: 'all 0.3s'
                      }}
                    >
                      Manage Security Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(0, 240, 255, 0.3);
          border-top: 3px solid #00F0FF;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
}
