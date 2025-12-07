import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { IoTrendingUp, IoTrendingDown } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SpotTradingPro() {
  const navigate = useNavigate();
  const tvWidgetRef = useRef(null);
  
  const [user, setUser] = useState(null);
  const [tradingPairs, setTradingPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('60');
  const [tradeAmount, setTradeAmount] = useState('');
  const [orderType, setOrderType] = useState('market');
  const [tradeTab, setTradeTab] = useState('buy');
  
  const [marketStats, setMarketStats] = useState({
    lastPrice: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    change24h: 0
  });

  const timeframes = [
    { label: '1m', value: '1' },
    { label: '5m', value: '5' },
    { label: '15m', value: '15' },
    { label: '1h', value: '60' },
    { label: '4h', value: '240' },
    { label: '1D', value: 'D' }
  ];

  // Load user
  useEffect(() => {
    const userData = localStorage.getItem('user') || localStorage.getItem('cryptobank_user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Fetch trading pairs
  useEffect(() => {
    fetchTradingPairs();
  }, []);

  const fetchTradingPairs = async () => {
    try {
      const response = await axios.get(`${API}/api/trading/pairs`);
      if (response.data.success) {
        setTradingPairs(response.data.pairs);
        if (response.data.pairs.length > 0 && !selectedPair) {
          const btcPair = response.data.pairs.find(p => p.symbol === 'BTC/GBP') || response.data.pairs[0];
          setSelectedPair(btcPair);
          updateMarketStats(btcPair);
        }
      }
    } catch (error) {
      console.error('Error fetching pairs:', error);
      toast.error('Failed to load trading pairs');
    } finally {
      setLoading(false);
    }
  };

  const updateMarketStats = (pair) => {
    const price = pair.price || 0;
    const change = pair.change_24h || 0;
    setMarketStats({
      lastPrice: price,
      high24h: price * 1.05,
      low24h: price * 0.95,
      volume24h: pair.volume_24h || 0,
      change24h: change
    });
  };

  // Initialize TradingView widget
  useEffect(() => {
    if (!selectedPair) return;
    
    const symbolMap = {
      'BTC': 'BINANCE:BTCUSDT',
      'ETH': 'BINANCE:ETHUSDT',
      'ADA': 'BINANCE:ADAUSDT',
      'SOL': 'BINANCE:SOLUSDT',
      'XRP': 'BINANCE:XRPUSDT',
      'DOGE': 'BINANCE:DOGEUSDT',
      'DOT': 'BINANCE:DOTUSDT',
      'MATIC': 'BINANCE:MATICUSDT',
      'SHIB': 'BINANCE:SHIBUSDT',
      'LTC': 'BINANCE:LTCUSDT',
      'BCH': 'BINANCE:BCHUSDT',
      'LINK': 'BINANCE:LINKUSDT',
      'UNI': 'BINANCE:UNIUSDT',
      'ATOM': 'BINANCE:ATOMUSDT',
      'ETC': 'BINANCE:ETCUSDT',
      'XLM': 'BINANCE:XLMUSDT',
      'AVAX': 'BINANCE:AVAXUSDT',
      'TRX': 'BINANCE:TRXUSDT',
      'BNB': 'BINANCE:BNBUSDT'
    };
    
    const base = selectedPair.base;
    const tvSymbol = symbolMap[base] || 'BINANCE:BTCUSDT';
    
    const loadTradingView = () => {
      if (window.TradingView) {
        initWidget();
      } else {
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = initWidget;
        document.head.appendChild(script);
      }
    };
    
    const initWidget = () => {
      const container = document.getElementById('tv_chart_container');
      if (container) {
        container.innerHTML = '';
      }
      
      if (window.TradingView && container) {
        try {
          tvWidgetRef.current = new window.TradingView.widget({
            width: '100%',
            height: 600,
            symbol: tvSymbol,
            interval: timeframe,
            timezone: 'Etc/UTC',
            theme: 'dark',
            style: '1',
            locale: 'en',
            toolbar_bg: '#020817',
            enable_publishing: false,
            allow_symbol_change: true,
            container_id: 'tv_chart_container',
            studies: [
              'RSI@tv-basicstudies',
              'MASimple@tv-basicstudies',
              'MACD@tv-basicstudies'
            ],
            disabled_features: ['use_localstorage_for_settings'],
            enabled_features: ['study_templates'],
            overrides: {
              'mainSeriesProperties.candleStyle.upColor': '#00C176',
              'mainSeriesProperties.candleStyle.downColor': '#FF4976',
              'mainSeriesProperties.candleStyle.borderUpColor': '#00C176',
              'mainSeriesProperties.candleStyle.borderDownColor': '#FF4976',
              'mainSeriesProperties.candleStyle.wickUpColor': '#00C176',
              'mainSeriesProperties.candleStyle.wickDownColor': '#FF4976',
            }
          });
        } catch (error) {
          console.error('Error initializing TradingView:', error);
        }
      }
    };
    
    loadTradingView();
    
    return () => {
      if (tvWidgetRef.current && tvWidgetRef.current.remove) {
        tvWidgetRef.current.remove();
      }
    };
  }, [selectedPair, timeframe]);

  const handlePairSelect = (pair) => {
    setSelectedPair(pair);
    updateMarketStats(pair);
  };

  const handlePlaceOrder = () => {
    if (!tradeAmount) {
      toast.error('Please enter an amount');
      return;
    }
    toast.success(`${tradeTab.toUpperCase()} order placed for ${tradeAmount} ${selectedPair?.base}`);
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', background: '#0b0f19' }}>
          <p style={{ color: '#00E1FF', fontSize: '18px' }}>Loading Trading Platform...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ background: '#0b0f19', minHeight: '100vh', padding: '0' }}>
        {/* Top Ticker */}
        <div style={{
          background: 'linear-gradient(90deg, rgba(0,225,255,0.1), rgba(0,193,118,0.1))',
          borderBottom: '1px solid #1c1f26',
          padding: '12px 0',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            gap: '48px',
            animation: 'scroll 30s linear infinite',
            whiteSpace: 'nowrap',
            paddingLeft: '100%'
          }}>
            {[...tradingPairs, ...tradingPairs].map((pair, idx) => (
              <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#E5F2FF', fontWeight: '600', fontSize: '14px' }}>{pair.base}</span>
                <span style={{ color: '#00E1FF', fontWeight: '700', fontSize: '14px' }}>£{pair.price?.toFixed(2) || '0.00'}</span>
                <span style={{ color: pair.change_24h >= 0 ? '#00C176' : '#FF4976', fontSize: '13px', fontWeight: '500' }}>
                  {pair.change_24h >= 0 ? '+' : ''}{pair.change_24h}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Market Info Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '16px', 
          padding: '24px',
          maxWidth: '1600px',
          margin: '0 auto'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,225,255,0.05), rgba(0,193,118,0.05))',
            border: '1px solid #1c1f26',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '8px', fontWeight: '500' }}>LAST PRICE</p>
            <p style={{ color: '#00E1FF', fontSize: '28px', fontWeight: '700' }}>£{marketStats.lastPrice.toFixed(2)}</p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,73,118,0.05), rgba(220,38,38,0.05))',
            border: '1px solid #1c1f26',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '8px', fontWeight: '500' }}>24H HIGH</p>
            <p style={{ color: '#FF4976', fontSize: '28px', fontWeight: '700' }}>£{marketStats.high24h.toFixed(2)}</p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,193,118,0.05), rgba(22,163,74,0.05))',
            border: '1px solid #1c1f26',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '8px', fontWeight: '500' }}>24H LOW</p>
            <p style={{ color: '#00C176', fontSize: '28px', fontWeight: '700' }}>£{marketStats.low24h.toFixed(2)}</p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,225,255,0.05), rgba(139,92,246,0.05))',
            border: '1px solid #1c1f26',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '8px', fontWeight: '500' }}>24H VOLUME</p>
            <p style={{ color: '#E5F2FF', fontSize: '28px', fontWeight: '700' }}>{marketStats.volume24h.toFixed(2)}</p>
          </div>
        </div>

        {/* Main 3-Column Grid */}
        <div className="spot-trading-grid" style={{ 
          gap: '16px',
          padding: '0 24px 24px',
          maxWidth: '1600px',
          margin: '0 auto'
        }}>
          {/* Pairs List */}
          <div className="pairs-list-panel" style={{
            background: '#020817',
            border: '1px solid #1c1f26',
            borderRadius: '8px',
            overflowY: 'auto'
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #1c1f26' }}>
              <h3 style={{ color: '#E5F2FF', fontSize: '16px', fontWeight: '700', margin: 0 }}>Trading Pairs</h3>
            </div>
            {tradingPairs.map(pair => (
              <div
                key={pair.symbol}
                onClick={() => handlePairSelect(pair)}
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  background: selectedPair?.symbol === pair.symbol ? 'rgba(0,225,255,0.08)' : 'transparent',
                  borderBottom: '1px solid #1c1f26',
                  borderLeft: selectedPair?.symbol === pair.symbol ? '3px solid #00E1FF' : '3px solid transparent',
                  transition: 'all 0.2s',
                  ':hover': { background: 'rgba(0,225,255,0.05)' }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ color: '#E5F2FF', fontWeight: '600', fontSize: '14px' }}>{pair.symbol}</span>
                  <span style={{ color: pair.change_24h >= 0 ? '#00C176' : '#FF4976', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {pair.change_24h >= 0 ? <IoTrendingUp size={12} /> : <IoTrendingDown size={12} />}
                    {pair.change_24h}%
                  </span>
                </div>
                <div style={{ color: '#00E1FF', fontSize: '14px', fontWeight: '600' }}>£{pair.price?.toFixed(2) || '0.00'}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="chart-panel" style={{
            background: '#020817',
            border: '1px solid #1c1f26',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#E5F2FF', fontSize: '18px', fontWeight: '700', margin: 0 }}>{selectedPair?.symbol || 'BTC/GBP'}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {timeframes.map(tf => (
                  <button
                    key={tf.value}
                    onClick={() => setTimeframe(tf.value)}
                    style={{
                      padding: '8px 16px',
                      background: timeframe === tf.value ? 'rgba(0,225,255,0.15)' : 'transparent',
                      border: `1px solid ${timeframe === tf.value ? '#00E1FF' : '#1c1f26'}`,
                      borderRadius: '6px',
                      color: timeframe === tf.value ? '#00E1FF' : '#9CA3AF',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: timeframe === tf.value ? '0 0 12px rgba(0,225,255,0.3)' : 'none'
                    }}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
            <div 
              id="tv_chart_container" 
              style={{ 
                width: '100%', 
                height: '600px',
                borderRadius: '6px',
                overflow: 'hidden'
              }} 
            />
          </div>

          {/* Buy/Sell Panel */}
          <div style={{
            background: '#020817',
            border: '1px solid #1c1f26',
            borderRadius: '8px',
            height: window.innerWidth > 1024 ? '600px' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            order: window.innerWidth > 1024 ? 0 : 2
          }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1c1f26' }}>
              <button
                onClick={() => setTradeTab('buy')}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: tradeTab === 'buy' ? 'rgba(0,193,118,0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: tradeTab === 'buy' ? '2px solid #00C176' : '2px solid transparent',
                  color: tradeTab === 'buy' ? '#00C176' : '#9CA3AF',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                BUY
              </button>
              <button
                onClick={() => setTradeTab('sell')}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: tradeTab === 'sell' ? 'rgba(255,73,118,0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: tradeTab === 'sell' ? '2px solid #FF4976' : '2px solid transparent',
                  color: tradeTab === 'sell' ? '#FF4976' : '#9CA3AF',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                SELL
              </button>
            </div>

            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Order Type Toggle */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button
                    onClick={() => setOrderType('market')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: orderType === 'market' ? 'rgba(0,225,255,0.1)' : 'transparent',
                      border: `1px solid ${orderType === 'market' ? '#00E1FF' : '#1c1f26'}`,
                      borderRadius: '6px',
                      color: orderType === 'market' ? '#00E1FF' : '#9CA3AF',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Market
                  </button>
                  <button
                    onClick={() => setOrderType('limit')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: orderType === 'limit' ? 'rgba(0,225,255,0.1)' : 'transparent',
                      border: `1px solid ${orderType === 'limit' ? '#00E1FF' : '#1c1f26'}`,
                      borderRadius: '6px',
                      color: orderType === 'limit' ? '#00E1FF' : '#9CA3AF',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Limit
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#9CA3AF', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Amount</label>
                <input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: '#0b0f19',
                    border: `1px solid ${tradeTab === 'buy' ? 'rgba(0,193,118,0.3)' : 'rgba(255,73,118,0.3)'}`,
                    borderRadius: '6px',
                    color: '#E5F2FF',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                />
              </div>

              {/* Price Display */}
              <div style={{ marginBottom: '24px', padding: '16px', background: '#0b0f19', borderRadius: '6px', border: '1px solid #1c1f26' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#9CA3AF', fontSize: '13px' }}>Price</span>
                  <span style={{ color: '#E5F2FF', fontSize: '14px', fontWeight: '600' }}>£{marketStats.lastPrice.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9CA3AF', fontSize: '13px' }}>Total</span>
                  <span style={{ color: '#00E1FF', fontSize: '14px', fontWeight: '600' }}>£{(parseFloat(tradeAmount || 0) * marketStats.lastPrice).toFixed(2)}</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handlePlaceOrder}
                style={{
                  width: '100%',
                  padding: '18px',
                  background: tradeTab === 'buy' 
                    ? 'linear-gradient(135deg, #00C176, #00A85F)' 
                    : 'linear-gradient(135deg, #FF4976, #E0215E)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: tradeTab === 'buy' 
                    ? '0 4px 20px rgba(0, 193, 118, 0.4)' 
                    : '0 4px 20px rgba(255, 73, 118, 0.4)',
                  transition: 'all 0.3s',
                  marginTop: 'auto'
                }}
              >
                {tradeTab === 'buy' ? 'BUY' : 'SELL'} {selectedPair?.base}
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </div>
    </Layout>
  );
}
