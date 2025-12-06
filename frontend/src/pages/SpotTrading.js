import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import CHXButton from '@/components/CHXButton';
import { IoTrendingUp, IoTrendingDown, IoFlash, IoCheckmarkCircle } from 'react-icons/io5';

// Force correct API URL regardless of environment
const API = 'https://coinhubx.net/api';

export default function SpotTrading() {
  console.log('🔥🔥🔥 SPOT TRADING COMPONENT LOADING! 🔥🔥🔥');
  console.log('🔥 API URL:', API);
  console.log('🔥 Timestamp:', new Date().toISOString());
  
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tradingPairs, setTradingPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState(null);
  const [orderType, setOrderType] = useState('buy');
  const [amount, setAmount] = useState('');
  const [inputMode, setInputMode] = useState('fiat'); // 'fiat' or 'crypto'
  const [marketStats, setMarketStats] = useState({
    lastPrice: 0,
    change24h: 0,
    high24h: 0,
    low24h: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState(null);
  const [availableLiquidity, setAvailableLiquidity] = useState(0);
  const [userBalances, setUserBalances] = useState({});

  // Auth check
  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/auth');
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  // Fetch trading pairs dynamically from backend
  useEffect(() => {
    if (user) {
      fetchTradingPairs();
      fetchUserBalances();
    }
  }, [user]);

  // Update market stats when pair changes
  useEffect(() => {
    if (selectedPair) {
      localStorage.setItem('spotTradingPair', selectedPair);
      fetchMarketStats();
      fetchLiquidity();
      loadTradingViewChart();
      const interval = setInterval(fetchMarketStats, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedPair]);

  const fetchTradingPairs = async () => {
    try {
      const response = await axios.get(`${API}/trading/pairs`);
      if (response.data.success) {
        // Filter only tradable pairs
        const tradablePairs = response.data.pairs.filter(p => p.is_tradable);
        setTradingPairs(tradablePairs);
        // Set first pair as default
        if (tradablePairs.length > 0 && !selectedPair) {
          // Check localStorage for last selected pair
          const savedPair = localStorage.getItem('spotTradingPair');
          if (savedPair && tradablePairs.find(p => p.symbol === savedPair)) {
            setSelectedPair(savedPair);
          } else {
            setSelectedPair(tradablePairs[0].symbol);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching trading pairs:', error);
      toast.error('Failed to load trading pairs');
    }
  };

  const fetchUserBalances = async () => {
    try {
      const response = await axios.get(`${API}/wallet/balances`, {
        params: { user_id: user.user_id }
      });
      if (response.data.success) {
        const balances = {};
        response.data.balances.forEach(b => {
          balances[b.currency] = b.available;
        });
        setUserBalances(balances);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  const fetchMarketStats = async () => {
    try {
      if (!selectedPair) return;
      const [base, quote] = selectedPair.split('/');

      const response = await axios.get(`${API}/prices/live`);
      if (response.data.success && response.data.prices) {
        const priceData = response.data.prices[base];
        if (priceData) {
          // Get price in the quote currency
          let livePrice = 0;
          if (quote === 'GBP') {
            livePrice = priceData.price_gbp || (priceData.price_usd * 0.79); // USD to GBP approx
          } else if (quote === 'USDT') {
            livePrice = priceData.price_usd || 0; // USDT ~ USD
          } else {
            livePrice = priceData.price_usd || 0;
          }

          const change24h = priceData.change_24h || 0;
          const changeMultiplier = Math.abs(change24h) / 100;

          setMarketStats({
            lastPrice: livePrice,
            change24h: change24h,
            high24h: livePrice * (1 + changeMultiplier),
            low24h: livePrice * (1 - changeMultiplier)
          });
        }
      }
    } catch (error) {
      console.error('Error fetching market stats:', error);
    }
  };

  const fetchLiquidity = async () => {
    try {
      if (!selectedPair) return;
      const [base, quote] = selectedPair.split('/');

      const response = await axios.get(`${API}/admin/liquidity-status`, {
        params: { currency: base }
      });
      if (response.data.success) {
        setAvailableLiquidity(response.data.available || 0);
      }
    } catch (error) {
      console.error('Error fetching liquidity:', error);
    }
  };

  const calculateAmount = () => {
    if (!amount || !marketStats.lastPrice) return { crypto: 0, fiat: 0 };

    // Apply spread: +0.5% on BUY, -0.5% on SELL
    const spread = orderType === 'buy' ? 1.005 : 0.995;
    const priceWithSpread = marketStats.lastPrice * spread;

    if (inputMode === 'fiat') {
      // User entered fiat -> calculate crypto
      const cryptoAmount = parseFloat(amount) / priceWithSpread;
      return {
        crypto: cryptoAmount,
        fiat: parseFloat(amount)
      };
    } else {
      // User entered crypto -> calculate fiat
      const fiatAmount = parseFloat(amount) * priceWithSpread;
      return {
        crypto: parseFloat(amount),
        fiat: fiatAmount
      };
    }
  };

  const handleExecuteTrade = async () => {
    if (!selectedPair || !amount || !user) {
      toast.error('Please select a pair and enter amount');
      return;
    }

    const [base, quote] = selectedPair.split('/');
    const calculated = calculateAmount();

    // Validate balances
    if (orderType === 'buy') {
      const requiredFiat = calculated.fiat;
      const userFiatBalance = userBalances[quote] || 0;
      if (userFiatBalance < requiredFiat) {
        toast.error(`Insufficient ${quote} balance. Need ${requiredFiat.toFixed(2)}, have ${userFiatBalance.toFixed(2)}`);
        return;
      }
    } else {
      const requiredCrypto = calculated.crypto;
      const userCryptoBalance = userBalances[base] || 0;
      if (userCryptoBalance < requiredCrypto) {
        toast.error(`Insufficient ${base} balance. Need ${requiredCrypto.toFixed(8)}, have ${userCryptoBalance.toFixed(8)}`);
        return;
      }
    }

    setIsLoading(true);

    try {
      // Use the LOCKED trading engine endpoint
      const payload = {
        user_id: user.user_id,
        pair: selectedPair,
        type: orderType
      };

      if (orderType === 'buy') {
        payload.gbp_amount = calculated.fiat; // Or quote amount
      } else {
        payload.crypto_amount = calculated.crypto;
      }

      console.log('🔥 EXECUTING TRADE VIA /api/trading/execute-v2:', payload);

      const response = await axios.post(`${API}/trading/execute-v2`, payload);

      if (response.data.success) {
        toast.success(`${orderType.toUpperCase()} order executed successfully!`);
        setOrderSuccess(true);
        setLastOrderDetails(response.data);
        setAmount('');

        // Refresh balances and liquidity
        await fetchUserBalances();
        await fetchLiquidity();

        console.log('✅ TRADE SUCCESS:', response.data);
      } else {
        toast.error(response.data.message || 'Trade failed');
        console.error('❌ TRADE FAILED:', response.data);
      }
    } catch (error) {
      console.error('Trade execution error:', error);
      toast.error(error.response?.data?.message || 'Failed to execute trade');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTradingViewChart = () => {
    const container = document.getElementById('tradingview-chart');
    if (!container || !selectedPair) return;

    container.innerHTML = '';

    // Convert pair format for TradingView (e.g., BTC/GBP -> BTCGBP)
    const tvSymbol = selectedPair.replace('/', '');

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (window.TradingView) {
        new window.TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: '15',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#0a0b1a',
          enable_publishing: false,
          container_id: 'tradingview-chart'
        });
      }
    };
    document.head.appendChild(script);
  };

  const toggleInputMode = () => {
    setInputMode(inputMode === 'fiat' ? 'crypto' : 'fiat');
    setAmount('');
  };

  const calculated = calculateAmount();
  const [base, quote] = selectedPair ? selectedPair.split('/') : ['', ''];
  const userFiatBalance = userBalances[quote] || 0;
  const userCryptoBalance = userBalances[base] || 0;

  return (
    <Layout>
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 4px 14px rgba(0, 240, 255, 0.4), 0 0 20px rgba(168, 85, 247, 0.3); }
          50% { box-shadow: 0 4px 18px rgba(0, 240, 255, 0.6), 0 0 30px rgba(168, 85, 247, 0.5); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes ripple {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        .trading-pair-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
          width: 100%;
        }
        .trading-pair-grid button {
          width: 100%;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
        }
        .trading-pair-grid button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .trading-pair-grid button:hover::before {
          opacity: 1;
        }
        .trading-pair-grid button.active {
          animation: pulse 2s infinite;
        }
        .trading-pair-grid button::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(0, 240, 255, 0.4);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }
        .trading-pair-grid button:active::after {
          width: 300px;
          height: 300px;
          opacity: 0;
        }
        @media (min-width: 1200px) {
          .trading-pair-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (min-width: 768px) and (max-width: 1199px) {
          .trading-pair-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (min-width: 480px) and (max-width: 767px) {
          .trading-pair-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 479px) {
          .trading-pair-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        html {
          scroll-behavior: smooth;
        }
      `}</style>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0b1a 0%, #1a1f3a 50%, #0a0b1a 100%)',
        padding: '1rem',
        paddingTop: '80px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(0, 240, 255, 0.03), transparent 50%), radial-gradient(circle at 80% 50%, rgba(168, 85, 247, 0.03), transparent 50%)',
          transform: 'translateZ(0)',
          willChange: 'transform',
          zIndex: 0
        }}></div>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{
              fontSize: '34px',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #00F0FF, #FFD700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem',
              position: 'relative',
              paddingBottom: '1rem'
            }}>
              ⚡ Spot Trading
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, #00F0FF, #FFD700, #A855F7)',
                borderRadius: '1px'
              }}></div>
            </h1>
            <div style={{ 
              color: '#888', 
              fontSize: '14px',
              position: 'relative',
              paddingBottom: '0.5rem'
            }}>
              Trade crypto with locked pricing engine
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100px',
                height: '1px',
                background: '#00F0FF',
                boxShadow: '0 0 10px rgba(0, 240, 255, 0.6)'
              }}></div>
            </div>
          </div>

          {/* Pair selector */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(26, 31, 58, 0.95), rgba(15, 23, 42, 0.95))',
            borderRadius: '12px',
            padding: '1.5rem 1rem 1rem',
            marginBottom: '1.5rem',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(0, 240, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            position: 'relative'
          }}>
            <div style={{ 
              fontSize: '11px', 
              color: '#00F0FF', 
              marginBottom: '16px', 
              fontWeight: '800',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>SELECT TRADING PAIR</div>
            <div className="trading-pair-grid">
              {tradingPairs.map(pair => (
                <button
                  key={pair.symbol}
                  onClick={() => setSelectedPair(pair.symbol)}
                  className={selectedPair === pair.symbol ? 'active' : ''}
                  style={{
                    padding: '13px 16px',
                    background: selectedPair === pair.symbol
                      ? 'linear-gradient(135deg, #00F0FF 0%, #7B2CFF 50%, #A855F7 100%)'
                      : 'rgba(10, 15, 30, 0.85)',
                    border: selectedPair === pair.symbol 
                      ? '1px solid rgba(0, 240, 255, 0.6)' 
                      : '1px solid rgba(0, 240, 255, 0.25)',
                    borderRadius: '10px',
                    color: selectedPair === pair.symbol ? '#000' : '#fff',
                    fontSize: window.innerWidth >= 1200 ? '15px' : '14px',
                    fontWeight: '800',
                    cursor: pair.is_tradable ? 'pointer' : 'not-allowed',
                    opacity: pair.is_tradable ? 1 : 0.5,
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: selectedPair === pair.symbol 
                      ? '0 4px 14px rgba(0, 240, 255, 0.4), 0 0 20px rgba(168, 85, 247, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)' 
                      : '0 2px 8px rgba(0, 0, 0, 0.3)',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (pair.is_tradable) {
                      e.target.style.transform = 'translateY(-2px) scale(1.02)';
                      e.target.style.boxShadow = selectedPair === pair.symbol
                        ? '0 6px 18px rgba(0, 240, 255, 0.5), 0 0 30px rgba(168, 85, 247, 0.4)'
                        : '0 4px 16px rgba(0, 240, 255, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0) scale(1)';
                    e.target.style.boxShadow = selectedPair === pair.symbol
                      ? '0 4px 14px rgba(0, 240, 255, 0.4), 0 0 20px rgba(168, 85, 247, 0.3)'
                      : '0 2px 8px rgba(0, 0, 0, 0.3)';
                  }}
                  onTouchStart={(e) => {
                    if (pair.is_tradable) {
                      e.target.style.transform = 'scale(0.95)';
                    }
                  }}
                  onTouchEnd={(e) => {
                    e.target.style.transform = 'scale(1)';
                  }}
                  disabled={!pair.is_tradable}
                >
                  {pair.symbol}
                  {!pair.is_tradable && ' 🔒'}
                </button>
              ))}
            </div>
          </div>

          {/* Main trading area */}
          {selectedPair && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1.5rem' }}>
              {/* Chart */}
              <div style={{
                background: 'rgba(26, 31, 58, 0.8)',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                minHeight: '500px'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#00F0FF' }}>
                    {selectedPair}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '8px' }}>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#fff' }}>
                      {quote === 'GBP' ? '£' : '$'}{marketStats.lastPrice.toFixed(2)}
                    </div>
                    <div style={{
                      color: marketStats.change24h >= 0 ? '#00FF88' : '#FF4444',
                      fontSize: '14px',
                      fontWeight: '700'
                    }}>
                      {marketStats.change24h >= 0 ? '↑' : '↓'} {Math.abs(marketStats.change24h).toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div 
                  id="tradingview-chart" 
                  style={{ 
                    height: '400px', 
                    width: '100%',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '12px',
                    boxShadow: '0 0 20px rgba(0, 240, 255, 0.15)',
                    overflow: 'hidden'
                  }}
                ></div>
              </div>

              {/* Trading panel */}
              <div style={{
                background: 'rgba(26, 31, 58, 0.8)',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '1px solid rgba(0, 240, 255, 0.2)'
              }}>
                {/* Buy/Sell tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
                  <button
                    onClick={() => setOrderType('buy')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: orderType === 'buy' ? '#00FF88' : 'rgba(0, 0, 0, 0.3)',
                      border: 'none',
                      borderRadius: '8px',
                      color: orderType === 'buy' ? '#000' : '#fff',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    BUY
                  </button>
                  <button
                    onClick={() => setOrderType('sell')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: orderType === 'sell' ? '#FF4444' : 'rgba(0, 0, 0, 0.3)',
                      border: 'none',
                      borderRadius: '8px',
                      color: orderType === 'sell' ? '#fff' : '#fff',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    SELL
                  </button>
                </div>

                {/* Balances */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '1.5rem',
                  fontSize: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#888' }}>Available {quote}:</span>
                    <span style={{ color: '#00F0FF', fontWeight: '700' }}>{userFiatBalance.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Available {base}:</span>
                    <span style={{ color: '#00F0FF', fontWeight: '700' }}>{userCryptoBalance.toFixed(8)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ color: '#888' }}>Platform Liquidity:</span>
                    <span style={{ color: availableLiquidity > 0 ? '#00FF88' : '#FF4444', fontWeight: '700' }}>
                      {availableLiquidity.toFixed(8)} {base}
                    </span>
                  </div>
                </div>

                {/* Amount input */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', fontWeight: '700' }}>
                    {inputMode === 'fiat' ? `AMOUNT (${quote})` : `AMOUNT (${base})`}
                  </div>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={inputMode === 'fiat' ? `Enter ${quote} amount` : `Enter ${base} amount`}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '16px',
                      fontWeight: '700'
                    }}
                  />
                  <button
                    onClick={toggleInputMode}
                    style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      background: 'rgba(0, 240, 255, 0.1)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '6px',
                      color: '#00F0FF',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Switch to {inputMode === 'fiat' ? 'Crypto' : 'Fiat'} Input
                  </button>
                </div>

                {/* Calculation preview */}
                {amount && (
                  <div style={{
                    background: 'rgba(0, 240, 255, 0.05)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '1rem',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#888' }}>You {orderType === 'buy' ? 'get' : 'pay'}:</span>
                      <span style={{ color: '#fff', fontWeight: '700' }}>
                        {orderType === 'buy' ? calculated.crypto.toFixed(8) : calculated.fiat.toFixed(2)}
                        {' '}
                        {orderType === 'buy' ? base : quote}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#888' }}>Price with spread:</span>
                      <span style={{ color: '#00F0FF', fontWeight: '700' }}>
                        {(marketStats.lastPrice * (orderType === 'buy' ? 1.005 : 0.995)).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#888' }}>Spread:</span>
                      <span style={{ color: '#FFD700', fontWeight: '700' }}>0.5%</span>
                    </div>
                  </div>
                )}

                {/* Execute button */}
                <button
                  onClick={handleExecuteTrade}
                  disabled={isLoading || !amount || availableLiquidity <= 0}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: orderType === 'buy'
                      ? 'linear-gradient(135deg, #00FF88, #00D870)'
                      : 'linear-gradient(135deg, #FF4444, #DD2222)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#000',
                    fontSize: '16px',
                    fontWeight: '900',
                    cursor: isLoading || !amount || availableLiquidity <= 0 ? 'not-allowed' : 'pointer',
                    opacity: isLoading || !amount || availableLiquidity <= 0 ? 0.5 : 1
                  }}
                >
                  {isLoading ? '⏳ EXECUTING...' : `${orderType.toUpperCase()} ${base}`}
                </button>

                {availableLiquidity <= 0 && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    background: 'rgba(255, 68, 68, 0.1)',
                    border: '1px solid rgba(255, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: '#FF4444',
                    fontSize: '12px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    ⚠️ Insufficient platform liquidity for {base}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success message */}
          {orderSuccess && lastOrderDetails && (
            <div style={{
              marginTop: '1.5rem',
              background: 'rgba(0, 255, 136, 0.1)',
              border: '2px solid #00FF88',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <IoCheckmarkCircle size={48} color="#00FF88" />
              <h3 style={{ color: '#00FF88', fontSize: '20px', fontWeight: '900', margin: '12px 0' }}>
                Trade Executed Successfully!
              </h3>
              <p style={{ color: '#888', fontSize: '13px' }}>
                Transaction ID: {lastOrderDetails.trade_id}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
