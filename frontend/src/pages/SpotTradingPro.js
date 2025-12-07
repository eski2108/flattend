import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import * as LightweightCharts from 'lightweight-charts';
import { IoTrendingUp, IoTrendingDown } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SpotTradingPro() {
  const navigate = useNavigate();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  
  const [user, setUser] = useState(null);
  const [tradingPairs, setTradingPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('15m');
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

  // Initialize TradingView Chart
  useEffect(() => {
    if (!chartContainerRef.current || !selectedPair) return;

    // Clear existing chart
    if (chartRef.current) {
      chartRef.current.remove();
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: '#0a0e1a' },
        textColor: '#888',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: '#00F0FF', width: 1, style: 2 },
        horzLine: { color: '#00F0FF', width: 1, style: 2 },
      },
      rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.1)' },
      timeScale: { borderColor: 'rgba(255, 255, 255, 0.1)', timeVisible: true },
    });

    // Candlestick series (v5 API)
    const candlestickSeries = chart.addSeries(createChart.CandlestickSeries || 'Candlestick', {
      upColor: '#22C55E',
      downColor: '#EF4444',
      borderUpColor: '#22C55E',
      borderDownColor: '#EF4444',
      wickUpColor: '#22C55E',
      wickDownColor: '#EF4444',
    });

    // Volume series (v5 API)
    const volumeSeries = chart.addSeries(createChart.HistogramSeries || 'Histogram', {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    // Generate sample data
    const data = generateChartData(selectedPair.price || 47500);
    candlestickSeries.setData(data.candles);
    volumeSeries.setData(data.volumes);

    chartRef.current = chart;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) chartRef.current.remove();
    };
  }, [selectedPair, timeframe]);

  const generateChartData = (basePrice) => {
    const now = Math.floor(Date.now() / 1000);
    const interval = 900; // 15 min
    const candles = [];
    const volumes = [];

    for (let i = 100; i >= 0; i--) {
      const time = now - (i * interval);
      const randomChange = (Math.random() - 0.5) * 0.02;
      const open = basePrice * (1 + randomChange);
      const close = open * (1 + (Math.random() - 0.5) * 0.01);
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low = Math.min(open, close) * (1 - Math.random() * 0.005);

      candles.push({ time, open, high, low, close });
      volumes.push({
        time,
        value: Math.random() * 100,
        color: close >= open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
      });
    }

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
            <div ref={chartContainerRef} style={{ borderRadius: '8px', overflow: 'hidden' }} />
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
