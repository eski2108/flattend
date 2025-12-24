import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SpotTradingPro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // State
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [tradingPairs, setTradingPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState('BTCUSD');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [orderType, setOrderType] = useState('market');
  const [tradingFee, setTradingFee] = useState(0.1);
  const [isLoading, setIsLoading] = useState(false);
  const [marketStats, setMarketStats] = useState({
    lastPrice: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    change24h: 0,
    marketCap: 0,
    circulatingSupply: 0
  });

  // STRICT breakpoint check - mutually exclusive
  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      setIsDesktop(width >= 1024);
    };
    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  // Get pair from URL
  useEffect(() => {
    const pairFromUrl = searchParams.get('pair');
    if (pairFromUrl) {
      setSelectedPair(pairFromUrl);
    }
  }, [searchParams]);

  // Fetch trading pairs
  useEffect(() => {
    fetchTradingPairs();
  }, []);

  // Fetch market stats when pair changes
  useEffect(() => {
    if (selectedPair) {
      fetchMarketStats();
      fetchTradingFee();
      const interval = setInterval(fetchMarketStats, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedPair]);

  // Load TradingView chart
  useEffect(() => {
    if (isDesktop && selectedPair) {
      const timer = setTimeout(() => {
        loadTradingViewChart();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedPair, isDesktop]);

  const fetchTradingPairs = async () => {
    const fallbackCoins = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'LINK', 'LTC'];
    try {
      const response = await axios.get(`${API}/api/prices/live`);
      if (response.data.success && response.data.prices) {
        const backendCoins = Object.keys(response.data.prices);
        const allPairs = backendCoins.map(coin => ({
          symbol: `${coin}USD`,
          name: `${coin}/USD`,
          base: coin,
          quote: 'USD'
        }));
        setTradingPairs(allPairs);
      } else {
        const fallbackPairs = fallbackCoins.map(coin => ({
          symbol: `${coin}USD`,
          name: `${coin}/USD`,
          base: coin,
          quote: 'USD'
        }));
        setTradingPairs(fallbackPairs);
      }
    } catch (error) {
      const fallbackPairs = fallbackCoins.map(coin => ({
        symbol: `${coin}USD`,
        name: `${coin}/USD`,
        base: coin,
        quote: 'USD'
      }));
      setTradingPairs(fallbackPairs);
    }
  };

  const fetchMarketStats = async () => {
    try {
      const base = selectedPair.replace('USD', '');
      const response = await axios.get(`${API}/api/prices/live`);
      if (response.data.success && response.data.prices[base]) {
        const data = response.data.prices[base];
        setMarketStats({
          lastPrice: data.price || 0,
          high24h: data.high_24h || data.price * 1.02,
          low24h: data.low_24h || data.price * 0.98,
          volume24h: data.volume_24h || 0,
          change24h: data.change_24h || 0,
          marketCap: data.market_cap || 0,
          circulatingSupply: data.circulating_supply || 0
        });
      }
    } catch (error) {
      console.error('Error fetching market stats:', error);
    }
  };

  const fetchTradingFee = async () => {
    try {
      const response = await axios.get(`${API}/api/platform-fees`);
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
    const base = selectedPair.replace('USD', '');
    const tvSymbol = base === 'BTC' ? 'BINANCE:BTCUSDT' : 
                     base === 'ETH' ? 'BINANCE:ETHUSDT' : 
                     `BINANCE:${base}USDT`;
    
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: '15',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: '#0A0E17',
      gridColor: 'rgba(255, 255, 255, 0.06)',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com'
    });
    
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';
    
    const widgetInner = document.createElement('div');
    widgetInner.className = 'tradingview-widget-container__widget';
    widgetInner.style.height = '100%';
    widgetInner.style.width = '100%';
    
    widgetContainer.appendChild(widgetInner);
    widgetContainer.appendChild(script);
    container.appendChild(widgetContainer);
  };

  const handleTrade = async (side) => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      toast.error('Please log in to trade');
      navigate('/login');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post(`${API}/api/trading/place-order`, {
        user_id: userId,
        pair: selectedPair,
        type: side,
        amount: parseFloat(amount),
        price: orderType === 'limit' ? parseFloat(price) : marketStats.lastPrice,
        fee_percent: tradingFee
      });
      
      if (response.data.success) {
        toast.success(`${side.toUpperCase()} order executed!`);
        setAmount('');
        setPrice('');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Trade failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // DESKTOP RENDER (>= 1024px) - NO PAIR TABS, NO FOOTER
  // ============================================================
  if (isDesktop) {
    return (
      <div style={{
        width: '100%',
        height: 'calc(100vh - 60px)',
        background: '#0A0E17',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        margin: '0'
      }}>
        {/* TOP BAR - ONLY ONE SELECTED PAIR TEXT + STATS */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          background: '#0D1421',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          gap: '32px',
          flexShrink: 0
        }}>
          {/* SINGLE PAIR TEXT - NO TABS */}
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF' }}>
            {selectedPair.replace('USD', ' / USD')}
          </div>
          
          {/* STATS ROW */}
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center', marginLeft: 'auto' }}>
            <div>
              <span style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF' }}>
                ${marketStats.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: '#6B7280' }}>24h Change</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: marketStats.change24h >= 0 ? '#00C853' : '#FF5252' }}>
                {marketStats.change24h >= 0 ? '+' : ''}{marketStats.change24h.toFixed(2)}%
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: '#6B7280' }}>24h High</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>${marketStats.high24h.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: '#6B7280' }}>24h Low</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>${marketStats.low24h.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: '#6B7280' }}>24h Volume</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>
                {marketStats.volume24h >= 1e9 ? `$${(marketStats.volume24h/1e9).toFixed(2)}B` : `$${(marketStats.volume24h/1e6).toFixed(2)}M`}
              </span>
            </div>
          </div>
        </div>

        {/* MAIN GRID - CHART + TRADE PANEL */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          flex: 1,
          minHeight: 0,
          gap: '16px',
          padding: '16px'
        }}>
          {/* LEFT: TRADINGVIEW CHART */}
          <div style={{
            background: '#0A0E17',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden'
          }}>
            <div id="tradingview-chart" style={{ width: '100%', height: '100%', minHeight: '500px' }}></div>
          </div>

          {/* RIGHT: TRADE PANEL */}
          <div style={{
            background: '#0D1421',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* ORDER TYPE */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                onClick={() => setOrderType('market')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: orderType === 'market' ? '#1E3A5F' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: orderType === 'market' ? '#00D4FF' : '#8B9AAB',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >Market</button>
              <button
                onClick={() => setOrderType('limit')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: orderType === 'limit' ? '#1E3A5F' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: orderType === 'limit' ? '#00D4FF' : '#8B9AAB',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >Limit</button>
            </div>

            {/* BUY SECTION */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>Amount ({selectedPair.replace('USD', '')})</div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0A0E17',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  marginBottom: '12px'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {['25%', '50%', '75%', '100%'].map(pct => (
                  <button key={pct} style={{
                    flex: 1,
                    padding: '6px',
                    background: '#1A2332',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: '#8B9AAB',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}>{pct}</button>
                ))}
              </div>
              <button
                onClick={() => handleTrade('buy')}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #00C853 0%, #00E676 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >BUY {selectedPair.replace('USD', '')}</button>
            </div>

            {/* SELL SECTION */}
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>Amount ({selectedPair.replace('USD', '')})</div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0A0E17',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  marginBottom: '12px'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {['25%', '50%', '75%', '100%'].map(pct => (
                  <button key={pct} style={{
                    flex: 1,
                    padding: '6px',
                    background: '#1A2332',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: '#8B9AAB',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}>{pct}</button>
                ))}
              </div>
              <button
                onClick={() => handleTrade('sell')}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #FF5252 0%, #FF1744 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >SELL {selectedPair.replace('USD', '')}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // MOBILE RENDER (< 1024px) - HAS PAIR TABS, NO FOOTER
  // ============================================================
  return (
    <div style={{ background: '#0A0E17', minHeight: '100vh', padding: '0' }}>
      {/* MOBILE PAIR TABS - ONLY ON MOBILE */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '12px 16px',
        overflowX: 'auto',
        background: '#0D1421',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        {tradingPairs.slice(0, 8).map(pair => (
          <button
            key={pair.symbol}
            onClick={() => setSelectedPair(pair.symbol)}
            style={{
              padding: '8px 16px',
              background: selectedPair === pair.symbol ? 'rgba(0,212,255,0.2)' : 'transparent',
              border: selectedPair === pair.symbol ? '1px solid #00D4FF' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              color: selectedPair === pair.symbol ? '#00D4FF' : '#8B9AAB',
              fontSize: '13px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >
            {pair.base}
          </button>
        ))}
      </div>

      {/* MOBILE PRICE */}
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '28px', fontWeight: '700', color: '#FFFFFF' }}>
          ${marketStats.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: '14px', color: marketStats.change24h >= 0 ? '#00C853' : '#FF5252' }}>
          {marketStats.change24h >= 0 ? '+' : ''}{marketStats.change24h.toFixed(2)}%
        </div>
      </div>

      {/* MOBILE CHART */}
      <div style={{ height: '300px', background: '#0D1421', margin: '0 16px', borderRadius: '8px' }}>
        <div id="tradingview-chart-mobile" style={{ width: '100%', height: '100%' }}></div>
      </div>

      {/* MOBILE TRADE BUTTONS */}
      <div style={{ padding: '16px', display: 'flex', gap: '12px' }}>
        <button
          onClick={() => handleTrade('buy')}
          style={{
            flex: 1,
            padding: '16px',
            background: 'linear-gradient(135deg, #00C853 0%, #00E676 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >BUY</button>
        <button
          onClick={() => handleTrade('sell')}
          style={{
            flex: 1,
            padding: '16px',
            background: 'linear-gradient(135deg, #FF5252 0%, #FF1744 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >SELL</button>
      </div>
    </div>
  );
}
