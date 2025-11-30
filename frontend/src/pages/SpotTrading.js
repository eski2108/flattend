import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '@/components/Layout';
import CHXButton from '@/components/CHXButton';
import { TrendingUp, TrendingDown, Zap, Info, BarChart3, Activity, DollarSign, TrendingUpDown } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || 'https://crypto-fixbugs.preview.emergentagent.com';

export default function SpotTrading() {
  const navigate = useNavigate();
  const [selectedPair, setSelectedPair] = useState('BTCUSD');
  const [orderType, setOrderType] = useState('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [marketStats, setMarketStats] = useState({
    lastPrice: 0,
    change24h: 0,
    high24h: 0,
    low24h: 0
  });
  const [tradingFee, setTradingFee] = useState(0.1);
  const [userBalance, setUserBalance] = useState({ crypto: 0, fiat: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const tradingPairs = [
    { symbol: 'BTCUSD', name: 'BTC/USD', base: 'BTC', quote: 'USD' },
    { symbol: 'ETHUSD', name: 'ETH/USD', base: 'ETH', quote: 'USD' },
    { symbol: 'SOLUSD', name: 'SOL/USD', base: 'SOL', quote: 'USD' },
    { symbol: 'XRPUSD', name: 'XRP/USD', base: 'XRP', quote: 'USD' },
    { symbol: 'BNBUSD', name: 'BNB/USD', base: 'BNB', quote: 'USD' }
  ];

  useEffect(() => {
    fetchMarketStats();
    fetchTradingFee();
    const interval = setInterval(fetchMarketStats, 60000);
    return () => clearInterval(interval);
  }, [selectedPair]);

  useEffect(() => {
    loadTradingViewChart();
    loadTradingViewOrderBook();
  }, [selectedPair]);

  const fetchMarketStats = async () => {
    try {
      const pairInfo = tradingPairs.find(p => p.symbol === selectedPair);
      if (!pairInfo) return;

      const response = await axios.get(`${API}/api/prices/live`);
      if (response.data.success && response.data.prices) {
        const priceData = response.data.prices[pairInfo.base];
        if (priceData) {
          const livePrice = priceData.price_usd;
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

  const fetchTradingFee = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/platform-settings`);
      if (response.data.success) {
        setTradingFee(response.data.settings.spot_trading_fee_percent || 0.1);
      }
    } catch (error) {
      console.error('Error fetching trading fee:', error);
    }
  };

  const loadTradingViewChart = () => {
    const container = document.getElementById('tradingview-chart');
    if (!container) return;

    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (window.TradingView) {
        new window.TradingView.widget({
          autosize: true,
          symbol: selectedPair,
          interval: '15',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#05121F',
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: 'tradingview-chart',
          studies: [
            'MASimple@tv-basicstudies',
            'MAExp@tv-basicstudies',
            'RSI@tv-basicstudies',
            'MACD@tv-basicstudies',
            'BB@tv-basicstudies'
          ],
          backgroundColor: '#05121F',
          gridColor: 'rgba(12, 235, 255, 0.1)',
          allow_symbol_change: true,
          details: true,
          hotlist: true,
          calendar: false,
          show_popup_button: true,
          popup_width: '1000',
          popup_height: '650'
        });
      }
    };
    document.head.appendChild(script);
  };

  const loadTradingViewOrderBook = () => {
    const container = document.getElementById('tradingview-orderbook');
    if (!container) return;

    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
    script.async = true;
    script.type = 'text/javascript';
    script.innerHTML = JSON.stringify({
      symbols: [[selectedPair]],
      chartOnly: false,
      width: '100%',
      height: '100%',
      locale: 'en',
      colorTheme: 'dark',
      autosize: true,
      showVolume: true,
      showMA: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: 'right',
      scaleMode: 'Normal',
      fontFamily: 'Inter, sans-serif',
      fontSize: '12',
      noTimeScale: false,
      valuesTracking: '1',
      changeMode: 'price-and-percent',
      chartType: 'area',
      backgroundColor: '#05121F',
      lineColor: '#0CEBFF',
      topColor: 'rgba(12, 235, 255, 0.4)',
      bottomColor: 'rgba(12, 235, 255, 0.0)',
      lineWidth: 2
    });
    container.appendChild(script);
  };

  const handlePlaceOrder = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      const userData = localStorage.getItem('cryptobank_user');
      if (!userData) {
        toast.error('Please login to trade');
        navigate('/login');
        return;
      }

      const user = JSON.parse(userData);
      const pairInfo = tradingPairs.find(p => p.symbol === selectedPair);
      
      const orderData = {
        user_id: user.user_id,
        pair: selectedPair,
        type: orderType,
        amount: parseFloat(amount),
        price: price ? parseFloat(price) : marketStats.lastPrice,
        fee_percent: tradingFee
      };

      const response = await axios.post(`${API}/api/trading/place-order`, orderData);
      
      if (response.data.success) {
        toast.success(`${orderType.toUpperCase()} order placed successfully!`);
        setAmount('');
        setPrice('');
      } else {
        toast.error(response.data.message || 'Order failed');
      }
    } catch (error) {
      console.error('Order error:', error);
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!amount) return 0;
    const baseAmount = parseFloat(amount) * (price ? parseFloat(price) : marketStats.lastPrice);
    return baseAmount;
  };

  const calculateFee = () => {
    return calculateTotal() * (tradingFee / 100);
  };

  const calculateFinalTotal = () => {
    if (orderType === 'buy') {
      return calculateTotal() + calculateFee();
    } else {
      return calculateTotal() - calculateFee();
    }
  };

  const isMobile = window.innerWidth < 768;

  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #020618 0%, #071327 100%)',
        paddingBottom: '60px'
      }}>
        <div style={{ padding: isMobile ? '16px' : '24px' }}>
          <div style={{ maxWidth: '1800px', margin: '0 auto' }}>
            
            {/* Premium Header with Neon Glow */}
            <div style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '16px', gap: isMobile ? '16px' : '0' }}>
                <div>
                  <h1 style={{ fontSize: isMobile ? '32px' : '42px', fontWeight: '700', color: '#FFFFFF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Activity size={isMobile ? 32 : 42} color="#00F0FF" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.8))' }} />
                    Spot Trading
                  </h1>
                  <p style={{ fontSize: isMobile ? '15px' : '17px', color: '#8F9BB3', margin: 0 }}>Advanced trading with TradingView charts and real-time data</p>
                </div>
              </div>
              <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.6) 50%, transparent 100%)', boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)' }} />
            </div>

            {/* Premium Market Stats with Neon Glow */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px', marginBottom: isMobile ? '20px' : '32px' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, rgba(0, 240, 255, 0.03) 100%)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '16px',
                padding: isMobile ? '16px' : '20px',
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
                <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Price</div>
                <div style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: '700', color: '#00F0FF', textShadow: '0 0 15px rgba(0, 240, 255, 0.5)' }}>
                  ${marketStats.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              
              <div style={{
                background: marketStats.change24h >= 0 
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.03) 100%)'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.03) 100%)',
                border: `1px solid ${marketStats.change24h >= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: '16px',
                padding: isMobile ? '16px' : '20px',
                boxShadow: marketStats.change24h >= 0 
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
                  background: marketStats.change24h >= 0 
                    ? 'radial-gradient(circle, rgba(34, 197, 94, 0.3), transparent)'
                    : 'radial-gradient(circle, rgba(239, 68, 68, 0.3), transparent)',
                  filter: 'blur(25px)',
                  pointerEvents: 'none'
                }} />
                <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>24h Change</div>
                <div style={{ 
                  fontSize: isMobile ? '22px' : '26px', 
                  fontWeight: '700', 
                  color: marketStats.change24h >= 0 ? '#22C55E' : '#EF4444',
                  textShadow: marketStats.change24h >= 0 ? '0 0 15px rgba(34, 197, 94, 0.5)' : '0 0 15px rgba(239, 68, 68, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {marketStats.change24h >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                  {marketStats.change24h >= 0 ? '+' : ''}{marketStats.change24h.toFixed(2)}%
                </div>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, rgba(155, 77, 255, 0.08) 0%, rgba(155, 77, 255, 0.03) 100%)',
                border: '1px solid rgba(155, 77, 255, 0.3)',
                borderRadius: '16px',
                padding: isMobile ? '16px' : '20px',
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
                <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>24h High</div>
                <div style={{ fontSize: isMobile ? '20px' : '22px', fontWeight: '700', color: '#9B4DFF', textShadow: '0 0 15px rgba(155, 77, 255, 0.5)' }}>
                  ${marketStats.high24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, rgba(245, 197, 66, 0.08) 0%, rgba(245, 197, 66, 0.03) 100%)',
                border: '1px solid rgba(245, 197, 66, 0.3)',
                borderRadius: '16px',
                padding: isMobile ? '16px' : '20px',
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
                <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>24h Low</div>
                <div style={{ fontSize: isMobile ? '20px' : '22px', fontWeight: '700', color: '#F5C542', textShadow: '0 0 15px rgba(245, 197, 66, 0.5)' }}>
                  ${marketStats.low24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Main Trading Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 400px', gap: isMobile ? '20px' : '32px' }}>
              
              {/* Left Column: Chart + Order Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px' }}>
                
                {/* Premium Pair Selector */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {tradingPairs.map(pair => (
                    <button
                      key={pair.symbol}
                      onClick={() => setSelectedPair(pair.symbol)}
                      style={{
                        padding: isMobile ? '10px 14px' : '12px 18px',
                        background: selectedPair === pair.symbol 
                          ? 'linear-gradient(135deg, #00F0FF, #0080FF)' 
                          : 'rgba(0, 240, 255, 0.08)',
                        border: `1px solid ${selectedPair === pair.symbol ? '#00F0FF' : 'rgba(0, 240, 255, 0.2)'}`,
                        borderRadius: '12px',
                        color: selectedPair === pair.symbol ? '#000000' : '#FFFFFF',
                        fontSize: isMobile ? '13px' : '14px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        boxShadow: selectedPair === pair.symbol ? '0 0 25px rgba(0, 240, 255, 0.5)' : 'none',
                        textShadow: selectedPair === pair.symbol ? 'none' : '0 0 8px rgba(0, 240, 255, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedPair !== pair.symbol) {
                          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)';
                          e.currentTarget.style.background = 'rgba(0, 240, 255, 0.15)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedPair !== pair.symbol) {
                          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.2)';
                          e.currentTarget.style.background = 'rgba(0, 240, 255, 0.08)';
                        }
                      }}
                    >
                      {pair.name}
                    </button>
                  ))}
                </div>

                {/* Premium TradingView Chart with Neon Glow */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.98) 0%, rgba(7, 19, 39, 0.95) 100%)',
                  border: '2px solid rgba(0, 240, 255, 0.4)',
                  borderRadius: '20px',
                  padding: '6px',
                  height: isMobile ? '400px' : '600px',
                  boxShadow: '0 0 60px rgba(0, 240, 255, 0.3), inset 0 0 40px rgba(0, 240, 255, 0.08)',
                  position: 'relative'
                }}>
                  {/* Floating Glow Effect */}
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
                  <div id="tradingview-chart" style={{ width: '100%', height: '100%', borderRadius: '16px' }}></div>
                </div>

                {/* Premium Order Panel */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.98) 0%, rgba(7, 19, 39, 0.95) 100%)',
                  border: '2px solid rgba(0, 240, 255, 0.4)',
                  borderRadius: '20px',
                  padding: isMobile ? '20px' : '28px',
                  boxShadow: '0 0 60px rgba(0, 240, 255, 0.3), inset 0 0 40px rgba(0, 240, 255, 0.08)',
                  position: 'relative'
                }}>
                  {/* Floating Glow */}
                  <div style={{
                    position: 'absolute',
                    top: '-30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '150px',
                    height: '60px',
                    background: 'radial-gradient(circle, rgba(0, 240, 255, 0.4), transparent)',
                    filter: 'blur(35px)',
                    pointerEvents: 'none'
                  }} />

                  {/* Buy/Sell Toggle */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <button
                      onClick={() => setOrderType('buy')}
                      style={{
                        flex: 1,
                        padding: isMobile ? '14px' : '16px',
                        background: orderType === 'buy' 
                          ? 'linear-gradient(135deg, #22C55E, #16A34A)' 
                          : 'rgba(34, 197, 94, 0.08)',
                        border: `1px solid ${orderType === 'buy' ? '#22C55E' : 'rgba(34, 197, 94, 0.2)'}`,
                        borderRadius: '12px',
                        color: '#FFFFFF',
                        fontSize: isMobile ? '15px' : '16px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        boxShadow: orderType === 'buy' ? '0 0 35px rgba(34, 197, 94, 0.5)' : 'none',
                        textShadow: orderType === 'buy' ? 'none' : '0 0 8px rgba(34, 197, 94, 0.5)'
                      }}
                    >
                      BUY
                    </button>
                    <button
                      onClick={() => setOrderType('sell')}
                      style={{
                        flex: 1,
                        padding: isMobile ? '14px' : '16px',
                        background: orderType === 'sell' 
                          ? 'linear-gradient(135deg, #EF4444, #DC2626)' 
                          : 'rgba(239, 68, 68, 0.08)',
                        border: `1px solid ${orderType === 'sell' ? '#EF4444' : 'rgba(239, 68, 68, 0.2)'}`,
                        borderRadius: '12px',
                        color: '#FFFFFF',
                        fontSize: isMobile ? '15px' : '16px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        boxShadow: orderType === 'sell' ? '0 0 35px rgba(239, 68, 68, 0.5)' : 'none',
                        textShadow: orderType === 'sell' ? 'none' : '0 0 8px rgba(239, 68, 68, 0.5)'
                      }}
                    >
                      SELL
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* Amount Input */}
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', color: '#8F9BB3', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Amount ({tradingPairs.find(p => p.symbol === selectedPair)?.base})
                      </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        style={{
                          width: '100%',
                          padding: isMobile ? '14px' : '16px',
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(0, 240, 255, 0.3)',
                          borderRadius: '12px',
                          color: '#FFFFFF',
                          fontSize: isMobile ? '16px' : '18px',
                          fontWeight: '600',
                          outline: 'none',
                          transition: 'all 0.3s'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.6)';
                          e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.3)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    {/* Price Input */}
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', color: '#8F9BB3', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Price (USD)
                      </label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder={`Market: $${marketStats.lastPrice.toFixed(2)}`}
                        style={{
                          width: '100%',
                          padding: isMobile ? '14px' : '16px',
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(0, 240, 255, 0.3)',
                          borderRadius: '12px',
                          color: '#FFFFFF',
                          fontSize: isMobile ? '16px' : '18px',
                          fontWeight: '600',
                          outline: 'none',
                          transition: 'all 0.3s'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.6)';
                          e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.3)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    {/* Total Display (NO FEE DISPLAY) */}
                    <div style={{
                      background: 'rgba(0, 240, 255, 0.05)',
                      border: '1px solid rgba(0, 240, 255, 0.2)',
                      borderRadius: '14px',
                      padding: isMobile ? '16px' : '18px',
                      boxShadow: 'inset 0 2px 10px rgba(0, 240, 255, 0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: isMobile ? '15px' : '16px', color: '#8F9BB3', fontWeight: '600' }}>Total Amount</span>
                        <span style={{ fontSize: isMobile ? '20px' : '22px', color: '#00F0FF', fontWeight: '700', textShadow: '0 0 15px rgba(0, 240, 255, 0.5)' }}>
                          ${calculateTotal().toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Premium Action Button with Glow */}
                    <div style={{ marginTop: '8px', position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        top: '-15px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '70%',
                        height: '50px',
                        background: orderType === 'buy' 
                          ? 'linear-gradient(90deg, rgba(34, 197, 94, 0.4), rgba(22, 163, 74, 0.4))'
                          : 'linear-gradient(90deg, rgba(239, 68, 68, 0.4), rgba(220, 38, 38, 0.4))',
                        filter: 'blur(25px)',
                        pointerEvents: 'none'
                      }} />
                      <CHXButton
                        onClick={handlePlaceOrder}
                        coinColor={orderType === 'buy' ? '#22C55E' : '#EF4444'}
                        variant="primary"
                        size="large"
                        fullWidth
                        disabled={isLoading || !amount}
                        icon={<Zap size={20} />}
                      >
                        {isLoading ? 'Processing Order...' : `${orderType.toUpperCase()} ${tradingPairs.find(p => p.symbol === selectedPair)?.base || 'Crypto'}`}
                      </CHXButton>
                    </div>
                  </div>
                </div>

              </div>

          {/* Right Column: Order Book & Market Data */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* TradingView Symbol Overview (Order Book) */}
            <div style={{ background: 'rgba(12, 235, 255, 0.05)', border: '2px solid rgba(12, 235, 255, 0.3)', borderRadius: '16px', padding: '4px', height: '400px', boxShadow: '0 0 40px rgba(12, 235, 255, 0.2)' }}>
              <div id="tradingview-orderbook" style={{ width: '100%', height: '100%' }}></div>
            </div>

            {/* Market Info */}
            <div style={{ background: 'rgba(12, 235, 255, 0.05)', border: '2px solid rgba(12, 235, 255, 0.3)', borderRadius: '16px', padding: '20px', boxShadow: '0 0 40px rgba(12, 235, 255, 0.2)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={20} color="#0CEBFF" />
                Market Info
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', color: '#8F9BB3' }}>Trading Fee</span>
                  <span style={{ fontSize: '14px', color: '#0CEBFF', fontWeight: '600' }}>{tradingFee}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', color: '#8F9BB3' }}>Min Order</span>
                  <span style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600' }}>$10</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', color: '#8F9BB3' }}>Order Type</span>
                  <span style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600' }}>Market / Limit</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </Layout>
  );
}
