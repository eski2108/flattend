import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import API_BASE_URL from '@/config/api';
import { 
  IoWallet, 
  IoTrendingUp, 
  IoTrendingDown, 
  IoBarChart, 
  IoEye, 
  IoEyeOff, 
  IoRefresh,
  IoAnalytics,
  IoArrowForward,
  IoShield,
  IoFlash,
  IoSwapHorizontal
} from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

// Coin names mapping
const COIN_NAMES = {
  'BTC': 'Bitcoin',
  'ETH': 'Ethereum',
  'USDT': 'Tether',
  'BNB': 'BNB',
  'SOL': 'Solana',
  'XRP': 'XRP',
  'LTC': 'Litecoin',
  'SHIB': 'Shiba Inu',
  'OTHERS': 'Others'
};

// Premium coin icons with better symbols
const COIN_ICONS = {
  'BTC': '₿',
  'ETH': 'Ξ',
  'USDT': '₮',
  'BNB': '◆',
  'SOL': '◎',
  'XRP': '✕',
  'LTC': 'Ł',
  'SHIB': '🐕',
  'OTHERS': '◈'
};

// Premium neon gradient colors matching the theme
const CHART_COLORS = {
  'BTC': '#00E5FF', // Neon cyan
  'ETH': '#7B2CFF', // Neon purple
  'USDT': '#00F0FF', // Bright cyan
  'BNB': '#FFD700', // Gold
  'SOL': '#9B4DFF', // Purple
  'XRP': '#00FFA3', // Neon green
  'LTC': '#22C55E', // Green
  'SHIB': '#F59E0B', // Amber
  'OTHERS': '#8F9BB3' // Muted
};

// Premium gradient combinations for cards
const CARD_GRADIENTS = {
  'BTC': 'linear-gradient(135deg, rgba(0, 229, 255, 0.15) 0%, rgba(0, 229, 255, 0.05) 100%)',
  'ETH': 'linear-gradient(135deg, rgba(123, 44, 255, 0.15) 0%, rgba(123, 44, 255, 0.05) 100%)',
  'USDT': 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 240, 255, 0.05) 100%)',
  'BNB': 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.05) 100%)',
  'SOL': 'linear-gradient(135deg, rgba(155, 77, 255, 0.15) 0%, rgba(155, 77, 255, 0.05) 100%)',
  'XRP': 'linear-gradient(135deg, rgba(0, 255, 163, 0.15) 0%, rgba(0, 255, 163, 0.05) 100%)',
  'LTC': 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)',
  'SHIB': 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
  'OTHERS': 'linear-gradient(135deg, rgba(143, 155, 179, 0.15) 0%, rgba(143, 155, 179, 0.05) 100%)'
};

export default function AllocationsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allocations, setAllocations] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [currency, setCurrency] = useState('GBP');
  const [activeTab, setActiveTab] = useState('coins');
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchAllocations = useCallback(async () => {
    try {
      const userData = localStorage.getItem('cryptobank_user');
      
      if (!userData) {
        navigate('/login');
        return;
      }
      
      const user = JSON.parse(userData);
      const userId = user.user_id;

      // Use unified wallet portfolio endpoint
      const response = await axios.get(`${API}/api/wallets/portfolio/${userId}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.data.success) {
        // Map allocations to match component expectations
        const mappedAllocations = response.data.allocations.map(a => ({
          symbol: a.currency,
          coin: COIN_NAMES[a.currency] || a.currency,
          amount: a.balance || 0,
          value: a.value || 0,
          percent: a.percentage || 0,
          // Keep original names for compatibility
          currency: a.currency,
          balance: a.balance,
          percentage: a.percentage
        }));
        setAllocations(mappedAllocations);
        setTotalValue(response.data.total_value_usd || 0);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching allocations:', error);
      setAllocations([]);
      setTotalValue(0);
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchAllocations();
  }, [currency, fetchAllocations]);

  const formatCurrency = (value) => {
    const symbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
    return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatAmount = (amount, symbol) => {
    if (!amount) return '';
    if (amount < 0.0001) {
      return amount.toLocaleString('en-US', { maximumFractionDigits: 8 });
    }
    if (amount < 1) {
      return amount.toLocaleString('en-US', { maximumFractionDigits: 6 });
    }
    return amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  // Remove external labels - show legend below instead
  const renderCustomLabel = () => null;

  const renderCenterLabel = ({ viewBox }) => {
    const { cx, cy } = viewBox;
    return (
      <g>
        <text 
          x={cx} 
          y={cy - 10} 
          textAnchor="middle" 
          dominantBaseline="middle"
          style={{ fontSize: '14px', fill: 'rgba(255,255,255,0.6)', fontWeight: '600' }}
        >
          Total Value
        </text>
        <text 
          x={cx} 
          y={cy + 20} 
          textAnchor="middle" 
          dominantBaseline="middle"
          style={{ fontSize: '32px', fill: '#FFF', fontWeight: '900' }}
        >
          {formatCurrency(totalValue)}
        </text>
      </g>
    );
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
            <div style={{ fontSize: '18px', fontWeight: '600' }}>Loading Portfolio Allocations...</div>
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
                    <IoAnalytics size={isMobile ? 32 : 42} color="#00F0FF" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.8))' }} />
                    Portfolio Allocations
                  </h1>
                  <p style={{ fontSize: isMobile ? '15px' : '17px', color: '#8F9BB3', margin: 0 }}>
                    Analyze your crypto distribution and asset performance across your portfolio
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Currency Selector */}
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={{
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, rgba(0, 240, 255, 0.03) 100%)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: '0 0 20px rgba(0, 240, 255, 0.1)'
                    }}
                  >
                    <option value="GBP" style={{ background: '#071327', color: '#FFFFFF' }}>GBP (£)</option>
                    <option value="USD" style={{ background: '#071327', color: '#FFFFFF' }}>USD ($)</option>
                    <option value="EUR" style={{ background: '#071327', color: '#FFFFFF' }}>EUR (€)</option>
                  </select>
                  
                  {/* Refresh Button */}
                  <button
                    onClick={() => fetchAllocations()}
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
              </div>
              <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.6) 50%, transparent 100%)', boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)' }} />
            </div>

            {/* Premium Tabs */}
            <div style={{ marginBottom: isMobile ? '24px' : '32px' }}>
              <div style={{ display: 'flex', gap: '8px', background: 'rgba(0, 0, 0, 0.3)', padding: '6px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
                <button
                  onClick={() => setActiveTab('coins')}
                  style={{
                    padding: '12px 24px',
                    background: activeTab === 'coins' 
                      ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(0, 240, 255, 0.1) 100%)'
                      : 'transparent',
                    border: activeTab === 'coins' ? '1px solid rgba(0, 240, 255, 0.4)' : '1px solid transparent',
                    borderRadius: '12px',
                    color: activeTab === 'coins' ? '#00F0FF' : '#8F9BB3',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: activeTab === 'coins' ? '0 0 20px rgba(0, 240, 255, 0.3)' : 'none'
                  }}
                >
                  <IoBarChart size={16} />
                  Asset Allocation
                </button>
                <button
                  onClick={() => setActiveTab('products')}
                  style={{
                    padding: '12px 24px',
                    background: activeTab === 'products' 
                      ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(0, 240, 255, 0.1) 100%)'
                      : 'transparent',
                    border: activeTab === 'products' ? '1px solid rgba(0, 240, 255, 0.4)' : '1px solid transparent',
                    borderRadius: '12px',
                    color: activeTab === 'products' ? '#00F0FF' : '#8F9BB3',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: activeTab === 'products' ? '0 0 20px rgba(0, 240, 255, 0.3)' : 'none'
                  }}
                >
                  <IoShield size={16} />
                  Products & Services
                </button>
              </div>
            </div>

          {activeTab === 'coins' ? (
            <>
              {/* Premium Portfolio Overview */}
              {allocations.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px', marginBottom: isMobile ? '24px' : '32px' }}>
                  
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
                      Across {allocations.length} different assets
                    </div>
                  </div>

                  {/* Asset Count */}
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
                    <div style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '700', color: '#9B4DFF', textShadow: '0 0 15px rgba(155, 77, 255, 0.5)', marginBottom: '8px' }}>
                      {allocations.length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8F9BB3' }}>
                      Diversified portfolio
                    </div>
                  </div>

                  {/* Largest Holding */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.03) 100%)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '16px',
                    padding: isMobile ? '20px' : '24px',
                    boxShadow: '0 0 30px rgba(34, 197, 94, 0.15), inset 0 2px 10px rgba(0, 0, 0, 0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-20px',
                      right: '-20px',
                      width: '80px',
                      height: '80px',
                      background: 'radial-gradient(circle, rgba(34, 197, 94, 0.3), transparent)',
                      filter: 'blur(25px)',
                      pointerEvents: 'none'
                    }} />
                    <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Largest Holding</div>
                    <div style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '700', color: '#22C55E', textShadow: '0 0 15px rgba(34, 197, 94, 0.5)', marginBottom: '8px' }}>
                      {allocations.length > 0 ? `${allocations[0]?.percent?.toFixed(1) || 0}%` : '0%'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8F9BB3' }}>
                      {allocations.length > 0 ? (COIN_NAMES[allocations[0]?.symbol] || allocations[0]?.symbol) : 'N/A'}
                    </div>
                  </div>
                </div>
              )}

              {/* Allocation Cards Grid */}
              {allocations.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1rem',
                  marginBottom: '2rem'
                }}>
                  {allocations.map((allocation, index) => (
                    <div
                      key={index}
                      style={{
                        background: `linear-gradient(135deg, ${CHART_COLORS[allocation.symbol] || '#6B6F76'}08 0%, ${CHART_COLORS[allocation.symbol] || '#6B6F76'}15 100%)`,
                        borderRadius: '20px',
                        padding: '1.5rem',
                        border: `2px solid ${CHART_COLORS[allocation.symbol] || '#6B6F76'}`,
                        boxShadow: `0 8px 24px ${CHART_COLORS[allocation.symbol] || '#6B6F76'}20, 0 4px 12px rgba(0,0,0,0.3)`,
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = `0 12px 32px ${CHART_COLORS[allocation.symbol] || '#6B6F76'}40, 0 8px 16px rgba(0,0,0,0.4)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = `0 8px 24px ${CHART_COLORS[allocation.symbol] || '#6B6F76'}20, 0 4px 12px rgba(0,0,0,0.3)`;
                      }}
                    >
                      {/* Percentage badge */}
                      <div style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: CHART_COLORS[allocation.symbol] || '#6B6F76',
                        color: '#000',
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        fontSize: '1rem',
                        fontWeight: '900'
                      }}>
                        {allocation.percent.toFixed(1)}%
                      </div>

                      {/* Coin icon */}
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: `${CHART_COLORS[allocation.symbol] || '#6B6F76'}20`,
                        border: `2px solid ${CHART_COLORS[allocation.symbol] || '#6B6F76'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: CHART_COLORS[allocation.symbol] || '#6B6F76',
                        marginBottom: '1rem'
                      }}>
                        {COIN_ICONS[allocation.symbol] || allocation.symbol.charAt(0)}
                      </div>

                      {/* Coin name */}
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#FFF', marginBottom: '0.5rem' }}>
                        {COIN_NAMES[allocation.symbol] || allocation.coin}
                      </div>

                      {/* Amount */}
                      {allocation.amount !== null && (
                        <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '1rem' }}>
                          {formatAmount(allocation.amount, allocation.symbol)} {allocation.symbol}
                        </div>
                      )}

                      {/* Value */}
                      <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#FFF', marginBottom: '0.5rem' }}>
                        {formatCurrency(allocation.value)}
                      </div>

                      {/* Progress bar */}
                      <div style={{
                        width: '100%',
                        height: '6px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        marginTop: '1rem'
                      }}>
                        <div style={{
                          width: `${allocation.percent}%`,
                          height: '100%',
                          background: CHART_COLORS[allocation.symbol] || '#6B6F76',
                          borderRadius: '3px'
                        }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  background: 'linear-gradient(135deg, #1a1f35 0%, #252b42 100%)', 
                  borderRadius: '20px', 
                  padding: '3rem 2rem',
                  marginBottom: '2rem',
                  border: '1px solid rgba(45, 130, 255, 0.3)',
                  textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}>
                  <div style={{ color: '#FFF', fontSize: '1.5rem', fontWeight: '800', marginBottom: '1rem' }}>
                    No Portfolio Data
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                    Add crypto to your wallet or savings to see your allocations
                  </div>
                  <button
                    onClick={() => navigate('/wallet')}
                    style={{
                      background: 'linear-gradient(135deg, #2D82FF, #1a5fd9)',
                      color: '#FFF',
                      border: 'none',
                      padding: '0.875rem 2rem',
                      borderRadius: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      boxShadow: '0 4px 12px rgba(45, 130, 255, 0.4)'
                    }}
                  >
                    Go to Wallet →
                  </button>
                </div>
              )}

              {/* Removed duplicate empty state */}
            </>
          ) : (
            // Products tab
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, #2D82FF 0%, #1a5fd9 100%)',
                borderRadius: '20px',
                padding: '2rem',
                border: '1px solid rgba(45, 130, 255, 0.5)',
                boxShadow: '0 8px 24px rgba(45, 130, 255, 0.3)'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#FFF', marginBottom: '0.5rem' }}>
                  💰 Savings Vault
                </div>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1rem' }}>
                  Secure your crypto with zero fees for internal transfers
                </p>
                <button 
                  onClick={() => navigate('/savings')}
                  style={{
                    background: '#FFF',
                    color: '#2D82FF',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Go to Savings →
                </button>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #5DD39E 0%, #2ECC71 100%)',
                borderRadius: '20px',
                padding: '2rem',
                border: '1px solid rgba(93, 211, 158, 0.5)',
                boxShadow: '0 8px 24px rgba(93, 211, 158, 0.3)'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#FFF', marginBottom: '0.5rem' }}>
                  📈 Trading
                </div>
                <p style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '1rem' }}>
                  Trade crypto with competitive fees and instant settlement
                </p>
                <button 
                  onClick={() => navigate('/trading')}
                  style={{
                    background: '#FFF',
                    color: '#2ECC71',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Start Trading →
                </button>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #FF8C5A 0%, #FF6B35 100%)',
                borderRadius: '20px',
                padding: '2rem',
                border: '1px solid rgba(255, 140, 90, 0.5)',
                boxShadow: '0 8px 24px rgba(255, 140, 90, 0.3)'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#FFF', marginBottom: '0.5rem' }}>
                  🎁 Referrals
                </div>
                <p style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '1rem' }}>
                  Earn 20% lifetime commission on every referral
                </p>
                <button 
                  onClick={() => navigate('/referrals')}
                  style={{
                    background: '#FFF',
                    color: '#FF6B35',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  View Referrals →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
