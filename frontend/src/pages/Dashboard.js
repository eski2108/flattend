import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
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
import { getCoinLogo } from '@/utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      // PHASE 1: Load portfolio value first (critical, fast)
      const res = await axios.get(`${API}/api/user/${userId}/portfolio?_t=${Date.now()}`);
      if (res.data.success) {
        const value = res.data.totalValue || res.data.current_value || 0;
        setTotalValue(value);
        setPortfolioData({
          change24h: res.data.change24h || res.data.plPercent || 0,
          totalAssets: res.data.totalAssets || 5,
          availableBalance: res.data.availableBalance || res.data.current_value || value,
          lockedBalance: res.data.lockedBalance || 0
        });
      }
      
      // STOP SPINNER - page is usable now
      setLoading(false);
      
      // PHASE 2: Load additional data in background (non-blocking)
      axios.get(`${API}/api/wallets/balances/${userId}?_t=${Date.now()}`)
        .then(assetsRes => {
          if (assetsRes.data.success) {
            setTopAssets(assetsRes.data.balances?.slice(0, 5) || []);
          }
        })
        .catch(() => {});
      
      axios.get(`${API}/api/transactions/${userId}?limit=5&_t=${Date.now()}`)
        .then(txRes => {
          if (txRes.data.success) {
            setRecentTransactions(txRes.data.transactions || []);
          }
        })
        .catch(() => {});
        
    } catch (error) {
      console.error('Error:', error);
      setLoading(false); // Always stop spinner
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

  // 🔒 LOCKED: Date formatter - DO NOT MODIFY
  // Fixes "Invalid Date" bug in Recent Activity
  // Handles null/undefined, validates dates, returns "Dec 3, 2025" format
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      // Format as: Dec 3, 2025
      return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };
  // 🔒 END LOCKED SECTION

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #020618 0%, #071327 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: '#00F0FF' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <div>{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  return (
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
                    {t('dashboard.title')}
                  </h1>
                  <p style={{ fontSize: isMobile ? '15px' : '17px', color: '#8F9BB3', margin: 0 }}>
                    {t('dashboard.welcome', { name: user?.first_name || 'Trader' })}
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
                  {t('common.refresh')}
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
                  <div style={{ fontSize: '12px', color: '#8F9BB3', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('dashboard.total_value')}</div>
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
                  {t('dashboard.available_balance')}: {balanceVisible ? formatCurrency(portfolioData.availableBalance) : '••••••'}
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
                <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('dashboard.change_24h')}</div>
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
                <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('dashboard.total_assets')}</div>
                <div style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '700', color: '#9B4DFF', textShadow: '0 0 15px rgba(155, 77, 255, 0.5)' }}>
                  {portfolioData.totalAssets}
                </div>
                <div style={{ fontSize: '12px', color: '#8F9BB3' }}>
                  {t('dashboard.locked_balance')}: {balanceVisible ? formatCurrency(portfolioData.lockedBalance) : '••••••'}
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
                <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('dashboard.quick_actions')}</div>
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
                    {t('dashboard.buy_crypto')}
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
                    {t('trading.title')}
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: isMobile ? '16px' : '32px' }}>
              
              {/* Left Column: Portfolio Allocation, Top Assets & Recent Activity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px' }}>
                
                {/* Portfolio Allocation Pie Chart */}
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
                      <IoAnalytics size={20} color="#00F0FF" />
                      {t('dashboard.portfolio_allocation')}
                    </h3>
                  </div>
                  
                  {/* Pie Chart Component */}
                  {(() => {
                    // Transform topAssets data for pie chart
                    const chartAssets = topAssets.map((asset, index) => ({
                      symbol: asset.currency,
                      value: asset.gbp_value || 0,
                      color: [
                        '#00F0FF', // Cyan
                        '#A855F7', // Purple  
                        '#22C55E', // Green
                        '#F59E0B', // Orange
                        '#EF4444', // Red
                        '#8B5CF6', // Violet
                        '#06B6D4', // Sky
                        '#F97316'  // Orange-red
                      ][index % 8]
                    }));

                    const total = chartAssets.reduce((sum, asset) => sum + asset.value, 0);
                    
                    if (chartAssets.length === 0 || total === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#8F9BB3' }}>
                          <IoAnalytics size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                          <div>{t('dashboard.no_portfolio_data')}</div>
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
                            {t('dashboard.start_investing')}
                          </button>
                        </div>
                      );
                    }

                    // Calculate slices for pie chart
                    const slices = chartAssets.reduce((acc, asset) => {
                      const percent = (asset.value / total) * 100;
                      const angle = (percent / 100) * 360;
                      const previousAngle = acc.length > 0 ? acc[acc.length - 1].endAngle : 0;
                      const startAngle = previousAngle;
                      const endAngle = previousAngle + angle;
                      
                      acc.push({
                        ...asset,
                        percent,
                        startAngle,
                        endAngle
                      });
                      
                      return acc;
                    }, []);

                    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
                      const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
                      return {
                        x: centerX + (radius * Math.cos(angleInRadians)),
                        y: centerY + (radius * Math.sin(angleInRadians))
                      };
                    };

                    const describeArc = (x, y, radius, startAngle, endAngle) => {
                      const start = polarToCartesian(x, y, radius, endAngle);
                      const end = polarToCartesian(x, y, radius, startAngle);
                      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
                      return [
                        "M", start.x, start.y,
                        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
                        "L", x, y,
                        "Z"
                      ].join(" ");
                    };

                    return (
                      <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {/* Pie Chart SVG */}
                        <svg width="200" height="200" viewBox="0 0 200 200" style={{ flexShrink: 0 }}>
                          {/* Outer glow ring */}
                          <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0, 240, 255, 0.2)" strokeWidth="2" />
                          
                          {/* Center circle for donut effect */}
                          <circle cx="100" cy="100" r="30" fill="rgba(2, 6, 24, 0.9)" />
                          
                          {slices.map((slice, index) => {
                            // Show all slices, even small ones
                            
                            return (
                              <path
                                key={index}
                                d={describeArc(100, 100, 85, slice.startAngle, slice.endAngle)}
                                fill={slice.color}
                                opacity="0.9"
                                style={{
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  filter: `drop-shadow(0 0 12px ${slice.color}88)`
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.opacity = '1';
                                  e.target.style.filter = `drop-shadow(0 0 20px ${slice.color}BB)`;
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.opacity = '0.9';
                                  e.target.style.filter = `drop-shadow(0 0 12px ${slice.color}88)`;
                                }}
                              />
                            );
                          })}
                          
                          {/* Center text */}
                          <text
                            x="100"
                            y="95"
                            textAnchor="middle"
                            fill="#00F0FF"
                            fontSize="20"
                            fontWeight="700"
                            fontFamily="Inter, sans-serif"
                            style={{ textShadow: '0 0 10px rgba(0, 240, 255, 0.8)' }}
                          >
                            {slices.length}
                          </text>
                          <text
                            x="100"
                            y="110"
                            textAnchor="middle"
                            fill="#8F9BB3"
                            fontSize="11"
                            fontWeight="500"
                            fontFamily="Inter, sans-serif"
                            letterSpacing="1"
                          >
                            ASSETS
                          </text>
                        </svg>

                        {/* Legend */}
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          {slices.map((slice, index) => (
                            <div
                              key={index}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 12px',
                                marginBottom: '8px',
                                borderRadius: '10px',
                                background: 'rgba(0, 240, 255, 0.05)',
                                border: '1px solid rgba(0, 240, 255, 0.15)',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                background: slice.color,
                                boxShadow: `0 0 10px ${slice.color}66`
                              }} />
                              <span style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600', flex: 1 }}>
                                {slice.symbol}
                              </span>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '13px', color: '#00F0FF', fontWeight: '700' }}>
                                  {slice.percent.toFixed(1)}%
                                </div>
                                <div style={{ fontSize: '11px', color: '#8F9BB3' }}>
                                  {balanceVisible ? formatCurrency(slice.value) : '••••••'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
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
                      {t('dashboard.top_holdings')}
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
                      {t('dashboard.view_all')}
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
                            overflow: 'hidden',
                            padding: '2px'
                          }}>
                            <img 
                              src={getCoinLogo(asset.currency)} 
                              alt={asset.currency}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain'
                              }}
                              onError={(e) => {
                                // Try SVG fallback first
                                if (!e.target.dataset.triedSvg) {
                                  e.target.dataset.triedSvg = 'true';
                                  e.target.src = `/crypto-icons/${asset.currency.toLowerCase()}.svg`;
                                } else {
                                  // Final fallback: show first letter
                                  e.target.style.display = 'none';
                                  const letter = asset.currency?.substring(0, 1) || '?';
                                  e.target.parentElement.innerHTML = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #00F0FF, #7B2CFF); border-radius: 50%; font-size: 16px; font-weight: 700; color: #FFF;">${letter}</div>`;
                                }
                              }}
                            />
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
                            {balanceVisible ? formatCurrency(asset.gbp_value || 0) : '••••••'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#22C55E' }}>
                            +2.4%
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#8F9BB3' }}>
                        <IoWallet size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <div>{t('dashboard.no_assets')}</div>
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
                          {t('dashboard.buy_first_crypto')}
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
                      {t('dashboard.recent_transactions')}
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
                      {t('dashboard.view_all')}
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
                            background: (tx.type?.includes('buy') || tx.type?.includes('deposit') || tx.transaction_type?.includes('buy') || tx.transaction_type?.includes('deposit')) ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {(tx.type?.includes('buy') || tx.type?.includes('deposit') || tx.transaction_type?.includes('buy') || tx.transaction_type?.includes('deposit')) ? <IoArrowDown size={20} color="#FFFFFF" /> : <IoArrowUp size={20} color="#FFFFFF" />}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF', textTransform: 'capitalize' }}>
                              {tx.transaction_type?.replace(/_/g, ' ') || tx.type || 'Transaction'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#8F9BB3' }}>
                              {formatDate(tx.created_at || tx.timestamp)}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: (tx.type?.includes('buy') || tx.type?.includes('deposit') || tx.transaction_type?.includes('buy') || tx.transaction_type?.includes('deposit')) ? '#22C55E' : '#EF4444' }}>
                            {(tx.type?.includes('buy') || tx.type?.includes('deposit') || tx.transaction_type?.includes('buy') || tx.transaction_type?.includes('deposit')) ? '+' : '-'}{formatCurrency(tx.amount || 0)}
                          </div>
                          <div style={{ fontSize: '12px', color: '#8F9BB3', textTransform: 'capitalize' }}>
                            {tx.status || 'Completed'}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#8F9BB3' }}>
                        <IoTime size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <div>{t('dashboard.no_transactions')}</div>
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
                    {t('dashboard.quick_actions')}
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
                        <div>{t('dashboard.buy_crypto')}</div>
                        <div style={{ fontSize: '12px', color: '#8F9BB3' }}>{t('dashboard.instant_purchase')}</div>
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
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '10px',
                      border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}>
                      <span style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600' }}>2FA Security</span>
                      <span style={{ fontSize: '12px', color: '#EF4444', fontWeight: '700' }}>Disabled</span>
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
    </div>
  );
}
