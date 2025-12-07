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
  const [tradeType, setTradeType] = useState('buy');
  
  const [marketStats, setMarketStats] = useState({
    lastPrice: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    change24h: 0
  });

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

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
    
    // Map our crypto symbols to TradingView symbols
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
    
    console.log('🔵 Initializing TradingView widget for', tvSymbol);
    
    // Load TradingView script if not already loaded
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
      // Clear previous widget
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
            toolbar_bg: '#0a0e1a',
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
              'mainSeriesProperties.candleStyle.upColor': '#22C55E',
              'mainSeriesProperties.candleStyle.downColor': '#EF4444',
              'mainSeriesProperties.candleStyle.borderUpColor': '#22C55E',
              'mainSeriesProperties.candleStyle.borderDownColor': '#EF4444',
              'mainSeriesProperties.candleStyle.wickUpColor': '#22C55E',
              'mainSeriesProperties.candleStyle.wickDownColor': '#EF4444',
            }
          });
          console.log('✅ TradingView widget initialized');
        } catch (error) {
          console.error('❌ Error initializing TradingView widget:', error);
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

  const calculateMA = (data, period) => {
    const maData = [];
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      maData.push({
        time: data[i].time,
        value: sum / period,
      });
    }
    return maData;
  };

  const generateChartData = (basePrice) => {
    const now = Math.floor(Date.now() / 1000);
    const interval = 900; // 15 min
    const candles = [];
    const volumes = [];

    for (let i = 100; i >= 0; i--) {
      const time = now - (i * interval);
      const randomChange = (Math.random() - 0.5) * 0.02;
      const open = parseFloat((basePrice * (1 + randomChange)).toFixed(2));
      const close = parseFloat((open * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2));
      const high = parseFloat((Math.max(open, close) * (1 + Math.random() * 0.005)).toFixed(2));
      const low = parseFloat((Math.min(open, close) * (1 - Math.random() * 0.005)).toFixed(2));

      candles.push({ time, open, high, low, close });
      volumes.push({
        time,
        value: parseFloat((Math.random() * 100).toFixed(2)),
        color: close >= open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
      });
    }

    console.log('Generated chart data:', { candles: candles.length, sample: candles[0] });
    return { candles, volumes };
  };

  const handlePairSelect = (pair) => {
    setSelectedPair(pair);
    updateMarketStats(pair);
  };

  const handlePlaceOrder = () => {
    if (!tradeAmount) {
      toast.error('Please enter an amount');
      return;
    }
    toast.success(`${tradeType.toUpperCase()} order placed for ${tradeAmount} ${selectedPair?.base}`);
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <p style={{ color: '#00F0FF', fontSize: '18px' }}>Loading Trading Platform...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ background: '#0a0e1a', minHeight: '100vh', padding: '1rem' }}>
        {/* Top Ticker */}
        <div style={{
          background: 'linear-gradient(90deg, rgba(0,240,255,0.1), rgba(155,77,255,0.1))',
          border: '1px solid rgba(0,240,255,0.2)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '1.5rem',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            gap: '2rem',
            animation: 'scroll 30s linear infinite',
            whiteSpace: 'nowrap'
          }}>
            {tradingPairs.map(pair => (
              <div key={pair.symbol} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#FFFFFF', fontWeight: '600' }}>{pair.base}</span>
                <span style={{ color: '#00F0FF', fontWeight: '700' }}>£{pair.price?.toFixed(2) || '0.00'}</span>
                <span style={{ color: pair.change_24h >= 0 ? '#22C55E' : '#EF4444', fontSize: '13px' }}>
                  {pair.change_24h >= 0 ? '+' : ''}{pair.change_24h}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#FFFFFF', marginBottom: '0.5rem' }}>
            ⚡ Spot Trading
          </h1>
          <p style={{ color: '#888', fontSize: '15px' }}>
            Advanced trading with TradingView charts and real-time data
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,240,255,0.1), rgba(0,150,255,0.1))',
            border: '1px solid rgba(0,240,255,0.3)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <p style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>LAST PRICE</p>
            <p style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '800' }}>£{marketStats.lastPrice.toFixed(2)}</p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(220,38,38,0.1))',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <p style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>HIGH/24H</p>
            <p style={{ color: '#EF4444', fontSize: '24px', fontWeight: '800' }}>£{marketStats.high24h.toFixed(2)}</p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(22,163,74,0.1))',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <p style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>LOW/24H</p>
            <p style={{ color: '#22C55E', fontSize: '24px', fontWeight: '800' }}>£{marketStats.low24h.toFixed(2)}</p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(155,77,255,0.1), rgba(139,92,246,0.1))',
            border: '1px solid rgba(155,77,255,0.3)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <p style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>24H VOLUME</p>
            <p style={{ color: '#9B4DFF', fontSize: '24px', fontWeight: '800' }}>{marketStats.volume24h.toFixed(2)}</p>
          </div>
        </div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr 300px', gap: '1.5rem' }}>
          {/* Pairs List */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.6)',
            border: '1px solid rgba(0,240,255,0.2)',
            borderRadius: '12px',
            padding: '16px',
            height: '600px',
            overflowY: 'auto'
          }}>
            <h3 style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>Trading Pairs</h3>
            {tradingPairs.map(pair => (
              <div
                key={pair.symbol}
                onClick={() => handlePairSelect(pair)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  background: selectedPair?.symbol === pair.symbol ? 'rgba(0,240,255,0.1)' : 'transparent',
                  border: `1px solid ${selectedPair?.symbol === pair.symbol ? 'rgba(0,240,255,0.3)' : 'transparent'}`,
                  transition: 'all 0.3s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#FFFFFF', fontWeight: '600' }}>{pair.symbol}</span>
                  <span style={{ color: pair.change_24h >= 0 ? '#22C55E' : '#EF4444', fontSize: '13px' }}>
                    {pair.change_24h >= 0 ? <IoTrendingUp size={14} /> : <IoTrendingDown size={14} />}
                    {pair.change_24h}%
                  </span>
                </div>
                <div style={{ color: '#00F0FF', fontSize: '14px', marginTop: '4px' }}>£{pair.price?.toFixed(2) || '0.00'}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.6)',
            border: '1px solid rgba(0,240,255,0.2)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '700' }}>{selectedPair?.symbol || 'BTC/GBP'}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {timeframes.map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    style={{
                      padding: '6px 12px',
                      background: timeframe === tf ? 'rgba(0,240,255,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${timeframe === tf ? '#00F0FF' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '6px',
                      color: timeframe === tf ? '#00F0FF' : '#888',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ width: '100%', height: '600px' }}>
              <ReactApexChart
                options={{
                  chart: {
                    type: 'candlestick',
                    height: 600,
                    background: '#0a0e1a',
                    toolbar: {
                      show: true,
                      tools: {
                        download: true,
                        zoom: true,
                        zoomin: true,
                        zoomout: true,
                        pan: true,
                        reset: true
                      }
                    }
                  },
                  theme: {
                    mode: 'dark'
                  },
                  xaxis: {
                    type: 'datetime',
                    labels: {
                      style: {
                        colors: '#d1d4dc'
                      }
                    }
                  },
                  yaxis: {
                    tooltip: {
                      enabled: true
                    },
                    labels: {
                      style: {
                        colors: '#d1d4dc'
                      },
                      formatter: (value) => `£${value.toFixed(2)}`
                    }
                  },
                  grid: {
                    borderColor: 'rgba(42, 46, 57, 0.5)',
                    strokeDashArray: 0,
                    xaxis: {
                      lines: {
                        show: true
                      }
                    },
                    yaxis: {
                      lines: {
                        show: true
                      }
                    }
                  },
                  plotOptions: {
                    candlestick: {
                      colors: {
                        upward: '#22C55E',
                        downward: '#EF4444'
                      },
                      wick: {
                        useFillColor: true
                      }
                    }
                  },
                  tooltip: {
                    theme: 'dark'
                  }
                }}
                series={[{
                  name: selectedPair?.symbol || 'BTC/GBP',
                  data: chartData
                }]}
                type="candlestick"
                height={600}
              />
            </div>
          </div>

          {/* Market Info */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.6)',
            border: '1px solid rgba(0,240,255,0.2)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <h3 style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Market Info</h3>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ color: '#888', fontSize: '13px', marginBottom: '4px' }}>Pair</p>
              <p style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '700' }}>{selectedPair?.symbol}</p>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ color: '#888', fontSize: '13px', marginBottom: '4px' }}>Asset Class</p>
              <p style={{ color: '#00F0FF', fontSize: '15px', fontWeight: '600' }}>Crypto</p>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ color: '#888', fontSize: '13px', marginBottom: '4px' }}>Order Type</p>
              <p style={{ color: '#FFFFFF', fontSize: '15px' }}>Spot</p>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ color: '#888', fontSize: '13px', marginBottom: '4px' }}>Status</p>
              <p style={{ color: '#22C55E', fontSize: '15px', fontWeight: '600' }}>• Active</p>
            </div>
          </div>
        </div>

        {/* Trading Panel */}
        <div style={{
          marginTop: '1.5rem',
          background: 'rgba(26, 31, 58, 0.6)',
          border: '1px solid rgba(0,240,255,0.2)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Buy Panel */}
            <div>
              <h3 style={{ color: '#22C55E', fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>BUY {selectedPair?.base}</h3>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '8px' }}>Amount</label>
                <input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <button
                onClick={() => { setTradeType('buy'); handlePlaceOrder(); }}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '18px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
                  transition: 'all 0.3s'
                }}
              >
                BUY {selectedPair?.base}
              </button>
            </div>

            {/* Sell Panel */}
            <div>
              <h3 style={{ color: '#EF4444', fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>SELL {selectedPair?.base}</h3>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '8px' }}>Amount</label>
                <input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <button
                onClick={() => { setTradeType('sell'); handlePlaceOrder(); }}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '18px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
                  transition: 'all 0.3s'
                }}
              >
                SELL {selectedPair?.base}
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
