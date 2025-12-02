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

const API = API_BASE_URL;

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

// Coin icons/emojis
const COIN_ICONS = {
  'BTC': '₿',
  'ETH': 'Ξ',
  'USDT': '₮',
  'BNB': 'BNB',
  'SOL': '◎',
  'XRP': 'X',
  'LTC': 'Ł',
  'SHIB': '🐕',
  'OTHERS': '•••'
};

// Bright, vibrant chart colors
const CHART_COLORS = {
  'BTC': '#3B92FF',
  'ETH': '#7E8FFF',
  'USDT': '#2ECC71',
  'BNB': '#F3BA2F',
  'SOL': '#00FFA3',
  'XRP': '#FF8C5A',
  'LTC': '#4A7BC8',
  'SHIB': '#5DD39E',
  'OTHERS': '#8B95A8'
};

export default function AllocationsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allocations, setAllocations] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [currency, setCurrency] = useState('GBP');
  const [activeTab, setActiveTab] = useState('coins');
  const [showPercentages, setShowPercentages] = useState(true);

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
        <div style={{ minHeight: '100vh', background: '#0B0E13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#FFF' }}>Loading allocations...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ minHeight: '100vh', background: '#0B0E13', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h1 style={{ 
                fontSize: '2rem', 
                fontWeight: '900', 
                color: '#FFF'
              }}>
                Portfolio Allocations
              </h1>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {/* Currency Selector */}
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#1A1D26',
                    border: '1px solid rgba(0, 224, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#FFF',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="GBP">GBP (£)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
              <button
                onClick={() => setActiveTab('coins')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'coins' ? '3px solid #00F0FF' : '3px solid transparent',
                  color: activeTab === 'coins' ? '#00F0FF' : 'rgba(255, 255, 255, 0.6)',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Coins
              </button>
              <button
                onClick={() => setActiveTab('products')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'products' ? '3px solid #00F0FF' : '3px solid transparent',
                  color: activeTab === 'products' ? '#00F0FF' : 'rgba(255, 255, 255, 0.6)',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Products
              </button>
            </div>
          </div>

          {activeTab === 'coins' ? (
            <>
              {/* Total Portfolio Value Card */}
              {allocations.length > 0 && (
                <div style={{ 
                  background: 'linear-gradient(135deg, #2D82FF 0%, #1a5fd9 100%)', 
                  borderRadius: '20px', 
                  padding: '2rem',
                  marginBottom: '2rem',
                  textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(45, 130, 255, 0.4)'
                }}>
                  <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Total Portfolio Value
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#FFF', marginBottom: '0.5rem' }}>
                    {formatCurrency(totalValue)}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                    Across {allocations.length} assets
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
