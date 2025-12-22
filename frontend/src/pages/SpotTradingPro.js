import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '@/components/Layout';
import CHXButton from '@/components/CHXButton';
import { IoTrendingUp, IoTrendingDown } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SpotTradingPro() {
  const navigate = useNavigate();
  const [selectedPair, setSelectedPair] = useState('BTCUSD');
  const [orderType, setOrderType] = useState('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [marketStats, setMarketStats] = useState({
    lastPrice: 0,
    change24h: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    marketCap: 0,
    circulatingSupply: 0
  });
  const [tradingFee, setTradingFee] = useState(0.1);
  const [isLoading, setIsLoading] = useState(false);
  const [tradingPairs, setTradingPairs] = useState([]);
  // Default to desktop (false) - useEffect will correct if needed
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      console.log('📱 Window width:', width, 'isMobile:', width <= 768);
      setIsMobile(width <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchAllTradingPairs();
  }, []);

  useEffect(() => {
    if (tradingPairs.length > 0) {
      fetchMarketStats();
      fetchTradingFee();
      const interval = setInterval(fetchMarketStats, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedPair, tradingPairs]);

  useEffect(() => {
    if (tradingPairs.length > 0) {
      const timer = setTimeout(() => {
        loadTradingViewChart();
        loadTradingViewMiniChart();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedPair, tradingPairs]);

  const fetchAllTradingPairs = async () => {
    const fallbackCoins = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'LINK', 'LTC', 'MATIC', 'AVAX', 'ATOM', 'UNI', 'TRX', 'BCH', 'SHIB', 'DAI', 'USDC', 'USDT'];
    
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
        if (allPairs.length > 0 && !selectedPair) {
          setSelectedPair(allPairs[0].symbol);
        }
      } else {
        const fallbackPairs = fallbackCoins.map(coin => ({
          symbol: `${coin}USD`,
          name: `${coin}/USD`,
          base: coin,
          quote: 'USD'
        }));
        setTradingPairs(fallbackPairs);
        if (fallbackPairs.length > 0 && !selectedPair) {
          setSelectedPair(fallbackPairs[0].symbol);
        }
      }
    } catch (error) {
      console.error('Error fetching pairs:', error);
      const fallbackPairs = fallbackCoins.map(coin => ({
        symbol: `${coin}USD`,
        name: `${coin}/USD`,
        base: coin,
        quote: 'USD'
      }));
      setTradingPairs(fallbackPairs);
      if (fallbackPairs.length > 0 && !selectedPair) {
        setSelectedPair(fallbackPairs[0].symbol);
      }
    }
  };

  const fetchMarketStats = async () => {
    try {
      const pairInfo = tradingPairs.find(p => p.symbol === selectedPair);
      if (!pairInfo) return;

      const response = await axios.get(`${API}/api/prices/live`);
      if (response.data.success && response.data.prices) {
        const priceData = response.data.prices[pairInfo.base];
        if (priceData) {
          setMarketStats({
            lastPrice: priceData.price_usd || 0,
            change24h: priceData.change_24h || 0,
            high24h: priceData.high_24h || priceData.price_usd * 1.02,
            low24h: priceData.low_24h || priceData.price_usd * 0.98,
            volume24h: priceData.volume_24h || 0,
            marketCap: priceData.market_cap || 0,
            circulatingSupply: priceData.circulating_supply || 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTradingFee = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/platform-settings`);
      if (response.data.success) {
        setTradingFee(response.data.settings.spot_trading_fee_percent || 0.1);
      }
    } catch (error) {
      console.error('Error fetching fee:', error);
    }
  };

  const loadTradingViewChart = () => {
    const container = document.getElementById('tradingview-chart');
    if (!container) return;
    container.innerHTML = '';

    const widgetHTML = `
      <div class="tradingview-widget-container" style="height:100%;width:100%;background:transparent">
        <div class="tradingview-widget-container__widget" style="height:100%;width:100%;background:transparent"></div>
        <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
        {
          "autosize": true,
          "symbol": "${selectedPair}",
          "interval": "15",
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "enable_publishing": false,
          "backgroundColor": "rgba(10, 22, 40, 0.8)",
          "gridColor": "rgba(15, 242, 242, 0.08)",
          "allow_symbol_change": false,
          "hide_top_toolbar": false,
          "hide_side_toolbar": false,
          "withdateranges": true,
          "hide_legend": false,
          "save_image": false,
          "support_host": "https://www.tradingview.com"
        }
        </script>
      </div>
    `;

    container.innerHTML = widgetHTML;
    const scripts = container.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].src) {
        const newScript = document.createElement('script');
        newScript.src = scripts[i].src;
        newScript.async = true;
        newScript.innerHTML = scripts[i].innerHTML;
        scripts[i].parentNode.replaceChild(newScript, scripts[i]);
      }
    }
  };

  const loadTradingViewMiniChart = () => {
    const container = document.getElementById('tradingview-mini');
    if (!container) return;
    container.innerHTML = '';

    const widgetHTML = `
      <div class="tradingview-widget-container" style="height:100%;width:100%">
        <div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>
        <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js" async>
        {
          "symbol": "${selectedPair}",
          "width": "100%",
          "height": "100%",
          "locale": "en",
          "dateRange": "1D",
          "colorTheme": "dark",
          "trendLineColor": "rgba(0, 240, 255, 1)",
          "underLineColor": "rgba(0, 240, 255, 0.3)",
          "underLineBottomColor": "rgba(0, 240, 255, 0)",
          "isTransparent": true,
          "autosize": true,
          "largeChartUrl": ""
        }
        </script>
      </div>
    `;

    container.innerHTML = widgetHTML;
    const scripts = container.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].src) {
        const newScript = document.createElement('script');
        newScript.src = scripts[i].src;
        newScript.async = true;
        newScript.innerHTML = scripts[i].innerHTML;
        scripts[i].parentNode.replaceChild(newScript, scripts[i]);
      }
    }
  };

  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API}/api/trading/place-order`, {
        pair: selectedPair,
        type: orderType,
        amount: parseFloat(amount),
        price: parseFloat(price) || marketStats.lastPrice
      });

      if (response.data.success) {
        toast.success(`${orderType.toUpperCase()} order placed!`);
        setAmount('');
        setPrice('');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Trade failed');
    } finally {
      setIsLoading(false);
    }
  };

  // DESKTOP VERSION - FULL PAGE TRADING LAYOUT LIKE BINANCE
  if (!isMobile) {
    return (
      <Layout>
        <div style={{
          width: '100%',
          height: 'calc(100vh - 60px)',
          background: '#0A0E17',
          padding: '0',
          margin: '0',
          fontFamily: 'Inter, sans-serif',
          display: 'flex',
          flexDirection: 'column'
        }}>
          
          {/* TOP BAR - PAIR SELECTOR + STATS */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 16px',
            background: '#0D1421',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            gap: '24px',
            flexShrink: 0
          }}>
            {/* PAIR SELECTOR */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingRight: '16px' }}>
              {tradingPairs.slice(0, 8).map(pair => (
                <button
                  key={pair.symbol}
                  onClick={() => setSelectedPair(pair.symbol)}
                  style={{
                    background: selectedPair === pair.symbol ? '#1E3A5F' : 'transparent',
                    border: selectedPair === pair.symbol ? '1px solid #00D4FF' : '1px solid transparent',
                    color: selectedPair === pair.symbol ? '#00D4FF' : '#8B9AAB',
                    padding: '6px 14px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {pair.name}
                </button>
              ))}
            </div>
            
            {/* STATS */}
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

          {/* MAIN TRADING AREA - FULL WIDTH */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            flex: 1,
            minHeight: 0
          }}>
            {/* LEFT: FULL HEIGHT CHART */}
            <div style={{
              background: '#0A0E17',
              borderRight: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* TRADINGVIEW CHART - FILLS AVAILABLE SPACE */}
              <div id="tradingview-chart" style={{ 
                width: '100%', 
                flex: 1,
                minHeight: '500px',
                background: '#0A0E17'
              }}></div>
            </div>

            {/* RIGHT: ORDER PANEL */}
            <div style={{ 
              background: '#0D1421',
              display: 'flex',
              flexDirection: 'column',
              padding: '16px'
            }}>
              {/* ORDER TYPE TABS */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button style={{
                  flex: 1,
                  padding: '10px',
                  background: orderType === 'market' ? '#1E3A5F' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: orderType === 'market' ? '#00D4FF' : '#8B9AAB',
                  fontWeight: '600',
                  cursor: 'pointer'
                }} onClick={() => setOrderType('market')}>Market</button>
                <button style={{
                  flex: 1,
                  padding: '10px',
                  background: orderType === 'limit' ? '#1E3A5F' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: orderType === 'limit' ? '#00D4FF' : '#8B9AAB',
                  fontWeight: '600',
                  cursor: 'pointer'
                }} onClick={() => setOrderType('limit')}>Limit</button>
              </div>

              {/* BUY SECTION */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>Amount ({selectedPair.split('/')[0]})</div>
                <input
                  type="number"
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#1A2332',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '14px',
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
                <button style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #00C853, #00E676)',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  marginBottom: '8px'
                }}>BUY {selectedPair.split('/')[0]}</button>
              </div>

              {/* SELL SECTION */}
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>Amount ({selectedPair.split('/')[0]})</div>
                <input
                  type="number"
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#1A2332',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '14px',
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
                <button style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #FF5252, #FF1744)',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}>SELL {selectedPair.split('/')[0]}</button>
              </div>

              {/* MARKET INFO */}
              <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>Market Info</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#8B9AAB', fontSize: '12px' }}>Market Cap</span>
                  <span style={{ color: '#FFFFFF', fontSize: '12px' }}>
                    {marketStats.marketCap >= 1e9 ? `$${(marketStats.marketCap/1e9).toFixed(2)}B` : `$${(marketStats.marketCap/1e6).toFixed(2)}M`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8B9AAB', fontSize: '12px' }}>Circulating Supply</span>
                  <span style={{ color: '#FFFFFF', fontSize: '12px' }}>
                    {marketStats.circulatingSupply >= 1e6 ? `${(marketStats.circulatingSupply/1e6).toFixed(2)}M` : marketStats.circulatingSupply.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div style={{
            background: '#0D1421',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            padding: '12px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <div style={{ color: '#6B7280', fontSize: '12px' }}>
              © 2025 CoinHubX. All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: '24px' }}>
              <a href="/terms" style={{ color: '#8B9AAB', fontSize: '12px', textDecoration: 'none' }}>Terms</a>
              <a href="/privacy" style={{ color: '#8B9AAB', fontSize: '12px', textDecoration: 'none' }}>Privacy</a>
              <a href="/support" style={{ color: '#8B9AAB', fontSize: '12px', textDecoration: 'none' }}>Support</a>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // MOBILE VERSION
  return (
    <Layout>
      <style>
        {`
          .main-content {
            padding: 0 !important;
            margin: 0 !important;
          }
          .tradingview-widget-container,
          .tradingview-widget-container__widget,
          .tradingview-widget-container iframe {
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          .tradingview-widget-copyright {
            display: none !important;
          }
        `}
      </style>
      <div style={{
        maxWidth: '100%',
        width: '100%',
        margin: '0 auto',
        marginTop: '0',
        background: '#060C1A',
        minHeight: '100vh',
        fontFamily: 'Inter, sans-serif',
        padding: '12px 16px 40px 16px'
      }}>
        {/* 1. FLOATING STATS CARD */}
        <div style={{
          height: '84px',
          width: '100%',
          borderRadius: '22px',
          background: 'rgba(6,12,26,0.60)',
          border: '1px solid rgba(15,242,242,0.45)',
          boxShadow: '0 0 18px rgba(0,255,255,0.35)',
          padding: '12px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px'
        }}>
          {/* Last Price */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.50)', marginBottom: '4px' }}>Last Price</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#FFFFFF', transition: 'opacity 120ms' }}>
              ${marketStats.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* 24h Change */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.50)', marginBottom: '4px' }}>24H Change</div>
            <div style={{ 
              fontSize: '15px', 
              fontWeight: '700',
              color: marketStats.change24h >= 0 ? '#00FF88' : '#FF4D4D',
              transition: 'opacity 120ms'
            }}>
              {marketStats.change24h >= 0 ? '+' : ''}{marketStats.change24h.toFixed(2)}%
            </div>
          </div>

          {/* 24h Volume */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.50)', marginBottom: '4px' }}>24H Volume</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#FFFFFF', transition: 'opacity 120ms' }}>
              {marketStats.volume24h >= 1e9 ? `$${(marketStats.volume24h / 1e9).toFixed(2)}B` : 
               marketStats.volume24h >= 1e6 ? `$${(marketStats.volume24h / 1e6).toFixed(2)}M` : 
               `$${(marketStats.volume24h / 1000).toFixed(1)}K`}
            </div>
          </div>
        </div>

        {/* BUY/SELL BUTTONS (under stats card) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '12px',
          marginTop: '0',
          marginBottom: '12px',
          paddingTop: '0'
        }}>
          {/* BUY Button */}
          <button
            onClick={() => { setOrderType('buy'); handleTrade(); }}
            disabled={isLoading && orderType === 'buy'}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            style={{ 
              height: '54px',
              borderRadius: '22px',
              background: 'linear-gradient(90deg, #52FF8A, #0FF2F2)',
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: '16px',
              textTransform: 'uppercase',
              boxShadow: '0 0 18px rgba(82,255,138,0.5)',
              border: 'none',
              cursor: isLoading && orderType === 'buy' ? 'not-allowed' : 'pointer',
              opacity: isLoading && orderType === 'buy' ? 0.6 : 1,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isLoading && orderType === 'buy' ? 'PROCESSING...' : 'BUY'}
          </button>

          {/* SELL Button */}
          <button
            onClick={() => { setOrderType('sell'); handleTrade(); }}
            disabled={isLoading && orderType === 'sell'}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            style={{ 
              height: '54px',
              borderRadius: '22px',
              background: 'linear-gradient(90deg, #9B4BFF, #FF3FD4)',
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: '16px',
              textTransform: 'uppercase',
              boxShadow: '0 0 18px rgba(155,75,255,0.5)',
              border: 'none',
              cursor: isLoading && orderType === 'sell' ? 'not-allowed' : 'pointer',
              opacity: isLoading && orderType === 'sell' ? 0.6 : 1,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isLoading && orderType === 'sell' ? 'PROCESSING...' : 'SELL'}
          </button>
        </div>

        {/* MULTI-COLOR GRADIENT BAR */}
        <div style={{
          width: '100%',
          height: '3px',
          background: 'linear-gradient(90deg, #52FF8A, #0FF2F2, #3A8DFF, #9B4BFF, #FF3FD4)',
          marginBottom: '12px',
          borderRadius: '2px',
          boxShadow: '0 0 12px rgba(15,242,242,0.3)'
        }}></div>

        {/* 2. COIN GRID - 4 COLUMN */}
        <div style={{ 
          width: '100%',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          rowGap: '14px',
          marginTop: '20px',
          marginBottom: '24px',
          maxHeight: '300px',
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(5,244,244,0.3) rgba(0,0,0,0.2)',
          boxShadow: '0 0 40px rgba(15,242,242,0.06)',
          borderRadius: '12px',
          padding: '4px'
        }}>
          {tradingPairs.map((pair, index) => {
            const rowIndex = Math.floor(index / 4);
            const rowColors = [
              { glow: 'rgba(15,242,242,0.5)', border: '#0FF2F2' }, // Row 1: Aqua
              { glow: 'rgba(58,141,255,0.5)', border: '#3A8DFF' }, // Row 2: Blue
              { glow: 'rgba(155,75,255,0.5)', border: '#9B4BFF' }, // Row 3: Purple
              { glow: 'rgba(255,63,212,0.5)', border: '#FF3FD4' }  // Row 4: Pink
            ];
            const rowColor = rowColors[rowIndex % 4];
            
            return (
              <button
                key={pair.symbol}
                onClick={() => setSelectedPair(pair.symbol)}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                style={{
                  width: 'calc(25% - 6px)',
                  height: '74px',
                  background: 'linear-gradient(180deg, rgba(14,22,44,0.95), rgba(14,22,44,0.75))',
                  border: selectedPair === pair.symbol 
                    ? '2px solid #0FF2F2'
                    : `1.5px solid ${rowColor.border}`,
                  color: '#0FF2F2',
                  padding: '0',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textShadow: '0 0 6px #0FF2F2',
                  transition: 'all 200ms ease',
                  boxShadow: selectedPair === pair.symbol 
                    ? '0 0 26px rgba(15,242,242,0.7), inset 0 0 15px rgba(15,242,242,0.15), inset 0 1px 0 rgba(255,255,255,0.07)' 
                    : `0 0 18px ${rowColor.glow}, 0 4px 12px rgba(0,0,0,0.4), inset 0 0 10px ${rowColor.glow}, inset 0 1px 0 rgba(255,255,255,0.07)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  filter: selectedPair === pair.symbol ? 'brightness(1.2)' : 'brightness(1)'
                }}
              >
                {pair.base || pair.name.split('/')[0]}
              </button>
            );
          })}
        </div>

        {/* 3. TRADINGVIEW CONTAINER */}
        <div style={{
          height: '480px',
          width: '100%',
          marginTop: '12px',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, rgba(10,22,40,0.9), rgba(14,27,46,0.9))',
          border: '1.5px solid rgba(15,242,242,0.3)',
          boxShadow: '0 0 25px rgba(15,242,242,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
          padding: '0',
          overflow: 'hidden',
          marginBottom: '12px'
        }}>
          <div id="tradingview-chart" style={{ 
            width: '100%', 
            height: '100%',
            background: 'transparent'
          }}></div>
        </div>

        {/* Amount input removed - buttons moved to top */}

        {/* MOBILE FOOTER */}
        <div style={{
          background: '#0D1421',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '16px',
          marginTop: '20px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#6B7280', fontSize: '11px', marginBottom: '8px' }}>
            © 2025 CoinHubX. All rights reserved.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <a href="/terms" style={{ color: '#8B9AAB', fontSize: '11px', textDecoration: 'none' }}>Terms</a>
            <a href="/privacy" style={{ color: '#8B9AAB', fontSize: '11px', textDecoration: 'none' }}>Privacy</a>
            <a href="/support" style={{ color: '#8B9AAB', fontSize: '11px', textDecoration: 'none' }}>Support</a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
