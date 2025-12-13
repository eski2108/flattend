import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { toast } from 'sonner';
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

// Import crypto SVG icons
import btcIcon from '@/assets/coins/btc.svg';
import ethIcon from '@/assets/coins/eth.svg';
import usdtIcon from '@/assets/coins/usdt.svg';
import usdcIcon from '@/assets/coins/usdc.svg';
import bnbIcon from '@/assets/coins/bnb.svg';
import solIcon from '@/assets/coins/sol.svg';
import xrpIcon from '@/assets/coins/xrp.svg';
import adaIcon from '@/assets/coins/ada.svg';
import dogeIcon from '@/assets/coins/doge.svg';
import dotIcon from '@/assets/coins/dot.svg';
import maticIcon from '@/assets/coins/matic.svg';
import ltcIcon from '@/assets/coins/ltc.svg';
import linkIcon from '@/assets/coins/link.svg';
import avaxIcon from '@/assets/coins/avax.svg';
import trxIcon from '@/assets/coins/trx.svg';

const COIN_SVG_ICONS = {
  'BTC': btcIcon,
  'ETH': ethIcon,
  'USDT': usdtIcon,
  'USDC': usdcIcon,
  'BNB': bnbIcon,
  'SOL': solIcon,
  'XRP': xrpIcon,
  'ADA': adaIcon,
  'DOGE': dogeIcon,
  'DOT': dotIcon,
  'MATIC': maticIcon,
  'LTC': ltcIcon,
  'LINK': linkIcon,
  'AVAX': avaxIcon,
  'TRX': trxIcon
};

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
        // Map allocations to match component expectations AND FILTER OUT ZERO BALANCES
        const mappedAllocations = response.data.allocations
          .filter(a => a.balance > 0)  // ONLY show coins with actual balance
          .map(a => ({
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
            <div style={{ fontSize: '18px', fontWeight: '600' }}>Loading Portfolio Allocations...</div>
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

                {/* Premium Chart and Allocation Grid */}
                {allocations.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                    
                    {/* Stunning Pie Chart */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '20px',
                      padding: '24px',
                      boxShadow: '0 0 40px rgba(0, 0, 0, 0.5), inset 0 2px 20px rgba(0, 0, 0, 0.3)',
                      backdropFilter: 'blur(20px)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        right: '0',
                        bottom: '0',
                        background: 'radial-gradient(circle at 30% 30%, rgba(0, 240, 255, 0.1), transparent 50%)',
                        pointerEvents: 'none'
                      }} />
                      
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF', marginBottom: '20px', textAlign: 'center' }}>
                        Portfolio Distribution
                      </h3>
                      
                      <div style={{ height: '300px', position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={allocations}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={false}
                              outerRadius={100}
                              innerRadius={60}
                              fill="#8884d8"
                              dataKey="percent"
                              stroke="none"
                            >
                              {allocations.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={CHART_COLORS[entry.symbol] || '#8B95A8'}
                                  style={{
                                    filter: `drop-shadow(0 0 8px ${CHART_COLORS[entry.symbol] || '#8B95A8'}80)`,
                                    transition: 'all 0.3s ease'
                                  }}
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{
                                background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.7) 100%)',
                                border: '1px solid rgba(0, 240, 255, 0.3)',
                                borderRadius: '12px',
                                color: '#FFFFFF',
                                fontSize: '14px',
                                fontWeight: '600',
                                boxShadow: '0 0 20px rgba(0, 0, 0, 0.8)'
                              }}
                              formatter={(value, name, props) => [
                                `${value.toFixed(2)}%`,
                                COIN_NAMES[props.payload.symbol] || props.payload.symbol
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        
                        {/* Center Label */}
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          textAlign: 'center',
                          pointerEvents: 'none'
                        }}>
                          <div style={{ fontSize: '12px', color: '#8F9BB3', fontWeight: '600', marginBottom: '4px' }}>
                            Total Value
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: '700', color: '#00F0FF', textShadow: '0 0 10px rgba(0, 240, 255, 0.5)' }}>
                            {balanceVisible ? formatCurrency(totalValue) : '••••••'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Premium Allocation Cards */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: '12px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      paddingRight: '8px',
                      boxSizing: 'border-box'
                    }}>
                      {allocations.map((allocation, index) => (
                        <div
                          key={index}
                          style={{
                            background: CARD_GRADIENTS[allocation.symbol] || CARD_GRADIENTS['OTHERS'],
                            border: `1px solid ${CHART_COLORS[allocation.symbol] || '#8B95A8'}40`,
                            borderRadius: '16px',
                            padding: '16px',
                            boxShadow: `0 0 20px ${CHART_COLORS[allocation.symbol] || '#8B95A8'}20, inset 0 2px 10px rgba(0, 0, 0, 0.2)`,
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            backdropFilter: 'blur(10px)',
                            boxSizing: 'border-box',
                            width: '100%',
                            minHeight: 'fit-content'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateX(4px)';
                            e.currentTarget.style.borderColor = `${CHART_COLORS[allocation.symbol] || '#8B95A8'}80`;
                            e.currentTarget.style.boxShadow = `0 0 30px ${CHART_COLORS[allocation.symbol] || '#8B95A8'}40, inset 0 2px 10px rgba(0, 0, 0, 0.3)`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateX(0)';
                            e.currentTarget.style.borderColor = `${CHART_COLORS[allocation.symbol] || '#8B95A8'}40`;
                            e.currentTarget.style.boxShadow = `0 0 20px ${CHART_COLORS[allocation.symbol] || '#8B95A8'}20, inset 0 2px 10px rgba(0, 0, 0, 0.2)`;
                          }}
                        >
                          {/* Ambient glow */}
                          <div style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '-10px',
                            width: '40px',
                            height: '40px',
                            background: `radial-gradient(circle, ${CHART_COLORS[allocation.symbol] || '#8B95A8'}40, transparent)`,
                            filter: 'blur(15px)',
                            pointerEvents: 'none'
                          }} />

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {/* Coin icon */}
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: `${CHART_COLORS[allocation.symbol] || '#8B95A8'}20`,
                                border: `1px solid ${CHART_COLORS[allocation.symbol] || '#8B95A8'}60`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                fontWeight: '700',
                                color: CHART_COLORS[allocation.symbol] || '#8B95A8',
                                boxShadow: `0 0 10px ${CHART_COLORS[allocation.symbol] || '#8B95A8'}30`,
                                overflow: 'hidden'
                              }}>
                                {COIN_SVG_ICONS[allocation.symbol] ? (
                                  <img 
                                    src={COIN_SVG_ICONS[allocation.symbol]}
                                    alt={allocation.symbol}
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      objectFit: 'contain'
                                    }}
                                  />
                                ) : (
                                  COIN_ICONS[allocation.symbol] || allocation.symbol.charAt(0)
                                )}
                              </div>

                              <div>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF', marginBottom: '2px' }}>
                                  {COIN_NAMES[allocation.symbol] || allocation.coin}
                                </div>
                                {allocation.amount !== null && (
                                  <div style={{ fontSize: '12px', color: '#8F9BB3' }}>
                                    {formatAmount(allocation.amount, allocation.symbol)} {allocation.symbol}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Percentage badge */}
                            <div style={{
                              background: `${CHART_COLORS[allocation.symbol] || '#8B95A8'}20`,
                              border: `1px solid ${CHART_COLORS[allocation.symbol] || '#8B95A8'}60`,
                              color: CHART_COLORS[allocation.symbol] || '#8B95A8',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '14px',
                              fontWeight: '700',
                              boxShadow: `0 0 10px ${CHART_COLORS[allocation.symbol] || '#8B95A8'}30`
                            }}>
                              {allocation.percent.toFixed(1)}%
                            </div>
                          </div>

                          {/* Value */}
                          <div style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF', marginBottom: '8px' }}>
                            {balanceVisible ? formatCurrency(allocation.value) : '••••••'}
                          </div>

                          {/* Progress bar */}
                          <div style={{
                            width: '100%',
                            height: '4px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '2px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${allocation.percent}%`,
                              height: '100%',
                              background: `linear-gradient(90deg, ${CHART_COLORS[allocation.symbol] || '#8B95A8'}, ${CHART_COLORS[allocation.symbol] || '#8B95A8'}80)`,
                              borderRadius: '2px',
                              boxShadow: `0 0 8px ${CHART_COLORS[allocation.symbol] || '#8B95A8'}60`
                            }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 100%)', 
                    border: '1px solid rgba(0, 240, 255, 0.2)',
                    borderRadius: '20px', 
                    padding: isMobile ? '2rem 1.5rem' : '3rem 2rem',
                    marginBottom: '2rem',
                    textAlign: 'center',
                    boxShadow: '0 0 40px rgba(0, 240, 255, 0.1), inset 0 2px 20px rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'blur(20px)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '0',
                      left: '0',
                      right: '0',
                      bottom: '0',
                      background: 'radial-gradient(circle at 50% 50%, rgba(0, 240, 255, 0.05), transparent 70%)',
                      pointerEvents: 'none'
                    }} />
                    
                    <IoWallet size={64} color="#00F0FF" style={{ marginBottom: '24px', filter: 'drop-shadow(0 0 20px rgba(0, 240, 255, 0.5))' }} />
                    
                    <div style={{ color: '#FFFFFF', fontSize: isMobile ? '24px' : '28px', fontWeight: '700', marginBottom: '16px' }}>
                      No Portfolio Data
                    </div>
                    <div style={{ color: '#8F9BB3', fontSize: isMobile ? '14px' : '16px', marginBottom: '32px', lineHeight: '1.6', maxWidth: '400px', margin: '0 auto 32px' }}>
                      Start building your crypto portfolio by adding assets to your wallet or exploring our savings products
                    </div>
                    
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => navigate('/wallet')}
                        style={{
                          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(0, 240, 255, 0.1) 100%)',
                          border: '1px solid rgba(0, 240, 255, 0.4)',
                          color: '#00F0FF',
                          padding: '12px 24px',
                          borderRadius: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.3s',
                          boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 240, 255, 0.3) 0%, rgba(0, 240, 255, 0.15) 100%)';
                          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.6)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(0, 240, 255, 0.1) 100%)';
                          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.4)';
                        }}
                      >
                        <IoWallet size={16} />
                        Go to Wallet
                      </button>
                      
                      <button
                        onClick={() => navigate('/savings')}
                        style={{
                          background: 'linear-gradient(135deg, rgba(155, 77, 255, 0.2) 0%, rgba(155, 77, 255, 0.1) 100%)',
                          border: '1px solid rgba(155, 77, 255, 0.4)',
                          color: '#9B4DFF',
                          padding: '12px 24px',
                          borderRadius: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.3s',
                          boxShadow: '0 0 20px rgba(155, 77, 255, 0.2)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(155, 77, 255, 0.3) 0%, rgba(155, 77, 255, 0.15) 100%)';
                          e.currentTarget.style.borderColor = 'rgba(155, 77, 255, 0.6)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(155, 77, 255, 0.2) 0%, rgba(155, 77, 255, 0.1) 100%)';
                          e.currentTarget.style.borderColor = 'rgba(155, 77, 255, 0.4)';
                        }}
                      >
                        <IoShield size={16} />
                        Explore Savings
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Premium Products & Services Section
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                
                {/* Savings Vault */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, rgba(0, 240, 255, 0.03) 100%)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '20px',
                  padding: '28px',
                  boxShadow: '0 0 40px rgba(0, 240, 255, 0.15), inset 0 2px 20px rgba(0, 0, 0, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  backdropFilter: 'blur(20px)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 0 60px rgba(0, 240, 255, 0.25), inset 0 2px 20px rgba(0, 0, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 240, 255, 0.15), inset 0 2px 20px rgba(0, 0, 0, 0.3)';
                }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '100px',
                    height: '100px',
                    background: 'radial-gradient(circle, rgba(0, 240, 255, 0.3), transparent)',
                    filter: 'blur(30px)',
                    pointerEvents: 'none'
                  }} />
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <IoShield size={32} color="#00F0FF" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.8))' }} />
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF' }}>
                      Savings Vault
                    </div>
                  </div>
                  
                  <p style={{ color: '#8F9BB3', marginBottom: '24px', fontSize: '16px', lineHeight: '1.6' }}>
                    Secure your crypto assets with institutional-grade security. Earn competitive yields while maintaining full control of your funds.
                  </p>
                  
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ 
                      background: 'rgba(0, 240, 255, 0.1)', 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      color: '#00F0FF',
                      fontWeight: '600'
                    }}>
                      Zero Fees
                    </div>
                    <div style={{ 
                      background: 'rgba(0, 240, 255, 0.1)', 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      color: '#00F0FF',
                      fontWeight: '600'
                    }}>
                      Instant Access
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => navigate('/savings')}
                    style={{
                      background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(0, 240, 255, 0.1) 100%)',
                      border: '1px solid rgba(0, 240, 255, 0.4)',
                      color: '#00F0FF',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.3s',
                      width: '100%',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 240, 255, 0.3) 0%, rgba(0, 240, 255, 0.15) 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(0, 240, 255, 0.1) 100%)';
                    }}
                  >
                    Explore Savings
                    <IoArrowForward size={16} />
                  </button>
                </div>

                {/* Trading */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.03) 100%)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '20px',
                  padding: '28px',
                  boxShadow: '0 0 40px rgba(34, 197, 94, 0.15), inset 0 2px 20px rgba(0, 0, 0, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  backdropFilter: 'blur(20px)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 0 60px rgba(34, 197, 94, 0.25), inset 0 2px 20px rgba(0, 0, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(34, 197, 94, 0.15), inset 0 2px 20px rgba(0, 0, 0, 0.3)';
                }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '100px',
                    height: '100px',
                    background: 'radial-gradient(circle, rgba(34, 197, 94, 0.3), transparent)',
                    filter: 'blur(30px)',
                    pointerEvents: 'none'
                  }} />
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <IoTrendingUp size={32} color="#22C55E" style={{ filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.8))' }} />
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF' }}>
                      Advanced Trading
                    </div>
                  </div>
                  
                  <p style={{ color: '#8F9BB3', marginBottom: '24px', fontSize: '16px', lineHeight: '1.6' }}>
                    Professional trading tools with real-time charts, advanced order types, and institutional-grade execution.
                  </p>
                  
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ 
                      background: 'rgba(34, 197, 94, 0.1)', 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      color: '#22C55E',
                      fontWeight: '600'
                    }}>
                      Low Fees
                    </div>
                    <div style={{ 
                      background: 'rgba(34, 197, 94, 0.1)', 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      color: '#22C55E',
                      fontWeight: '600'
                    }}>
                      Pro Tools
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => navigate('/trading')}
                    style={{
                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      color: '#22C55E',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.3s',
                      width: '100%',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.15) 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)';
                    }}
                  >
                    Start Trading
                    <IoArrowForward size={16} />
                  </button>
                </div>

                {/* Swap & Exchange */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(155, 77, 255, 0.08) 0%, rgba(155, 77, 255, 0.03) 100%)',
                  border: '1px solid rgba(155, 77, 255, 0.3)',
                  borderRadius: '20px',
                  padding: '28px',
                  boxShadow: '0 0 40px rgba(155, 77, 255, 0.15), inset 0 2px 20px rgba(0, 0, 0, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  backdropFilter: 'blur(20px)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 0 60px rgba(155, 77, 255, 0.25), inset 0 2px 20px rgba(0, 0, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(155, 77, 255, 0.15), inset 0 2px 20px rgba(0, 0, 0, 0.3)';
                }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '100px',
                    height: '100px',
                    background: 'radial-gradient(circle, rgba(155, 77, 255, 0.3), transparent)',
                    filter: 'blur(30px)',
                    pointerEvents: 'none'
                  }} />
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <IoSwapHorizontal size={32} color="#9B4DFF" style={{ filter: 'drop-shadow(0 0 10px rgba(155, 77, 255, 0.8))' }} />
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF' }}>
                      Instant Swap
                    </div>
                  </div>
                  
                  <p style={{ color: '#8F9BB3', marginBottom: '24px', fontSize: '16px', lineHeight: '1.6' }}>
                    Seamlessly exchange between cryptocurrencies with the best rates and minimal slippage across multiple DEXs.
                  </p>
                  
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ 
                      background: 'rgba(155, 77, 255, 0.1)', 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      color: '#9B4DFF',
                      fontWeight: '600'
                    }}>
                      Best Rates
                    </div>
                    <div style={{ 
                      background: 'rgba(155, 77, 255, 0.1)', 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      color: '#9B4DFF',
                      fontWeight: '600'
                    }}>
                      Instant
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => navigate('/swap')}
                    style={{
                      background: 'linear-gradient(135deg, rgba(155, 77, 255, 0.2) 0%, rgba(155, 77, 255, 0.1) 100%)',
                      border: '1px solid rgba(155, 77, 255, 0.4)',
                      color: '#9B4DFF',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.3s',
                      width: '100%',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(155, 77, 255, 0.3) 0%, rgba(155, 77, 255, 0.15) 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(155, 77, 255, 0.2) 0%, rgba(155, 77, 255, 0.1) 100%)';
                    }}
                  >
                    Start Swapping
                    <IoArrowForward size={16} />
                  </button>
                </div>

                {/* Instant Buy */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.03) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '20px',
                  padding: '28px',
                  boxShadow: '0 0 40px rgba(245, 158, 11, 0.15), inset 0 2px 20px rgba(0, 0, 0, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  backdropFilter: 'blur(20px)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 0 60px rgba(245, 158, 11, 0.25), inset 0 2px 20px rgba(0, 0, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(245, 158, 11, 0.15), inset 0 2px 20px rgba(0, 0, 0, 0.3)';
                }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '100px',
                    height: '100px',
                    background: 'radial-gradient(circle, rgba(245, 158, 11, 0.3), transparent)',
                    filter: 'blur(30px)',
                    pointerEvents: 'none'
                  }} />
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <IoFlash size={32} color="#F59E0B" style={{ filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.8))' }} />
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF' }}>
                      Instant Buy
                    </div>
                  </div>
                  
                  <p style={{ color: '#8F9BB3', marginBottom: '24px', fontSize: '16px', lineHeight: '1.6' }}>
                    Purchase crypto instantly with your debit card, bank transfer, or other payment methods. Simple and secure.
                  </p>
                  
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ 
                      background: 'rgba(245, 158, 11, 0.1)', 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      color: '#F59E0B',
                      fontWeight: '600'
                    }}>
                      Instant
                    </div>
                    <div style={{ 
                      background: 'rgba(245, 158, 11, 0.1)', 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      color: '#F59E0B',
                      fontWeight: '600'
                    }}>
                      Secure
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => navigate('/instant-buy')}
                    style={{
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#F59E0B',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.3s',
                      width: '100%',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.15) 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)';
                    }}
                  >
                    Buy Crypto Now
                    <IoArrowForward size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    
  );
}
