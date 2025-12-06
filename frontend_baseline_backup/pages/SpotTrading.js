import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '@/components/Layout';
import { createChart, CandlestickSeries, CrosshairMode } from 'lightweight-charts';
import { 
  TrendingUp, 
  TrendingDown,
  ChevronDown,
  Activity,
  Zap,
  ChevronUp
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || 'https://tradepanel-12.preview.emergentagent.com';

export default function SpotTrading() {
  const navigate = useNavigate();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  // State
  const [selectedPair, setSelectedPair] = useState('BTC/GBP');
  const [timeframe, setTimeframe] = useState('15m');
  const [orderType, setOrderType] = useState('buy');
  const [amount, setAmount] = useState('');
  const [balances, setBalances] = useState({ BTC: 0.5, ETH: 2.5, USDT: 1000, BNB: 5, SOL: 10, LTC: 15, GBP: 5000 });
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [recentTrades, setRecentTrades] = useState([]);
  const [userTrades, setUserTrades] = useState([]);
  const [showQuickBuyModal, setShowQuickBuyModal] = useState(false);
  const [availablePairs, setAvailablePairs] = useState([]);
  const [pairLiquidity, setPairLiquidity] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [showOrderBook, setShowOrderBook] = useState(true);
  const [showRecentTrades, setShowRecentTrades] = useState(false);
  const [coinsMetadata, setCoinsMetadata] = useState([]);
  const [tradingPairs, setTradingPairs] = useState([]);
  const [marketStats, setMarketStats] = useState({
    lastPrice: 47500,
    change24h: 2.34,
    high24h: 48200,
    low24h: 46800,
    volume24h: 1234.56
  });

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1200);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch coin metadata and trading pairs (FULLY DYNAMIC)
  useEffect(() => {
    fetchCoinsMetadata();
    fetchTradingPairs();
  }, []);

  const fetchCoinsMetadata = async () => {
    try {
      const response = await axios.get(`${API}/api/coins/metadata`);
      if (response.data.success) {
        setCoinsMetadata(response.data.coins);
      }
    } catch (error) {
      console.error('Error fetching coins metadata:', error);
    }
  };

  const fetchTradingPairs = async () => {
    try {
      const response = await axios.get(`${API}/api/trading/pairs`);
      if (response.data.success) {
        setAvailablePairs(response.data.pairs);
        
        const liquidityMap = {};
        response.data.pairs.forEach(pair => {
          liquidityMap[pair.symbol] = {
            available: pair.available_liquidity,
            is_tradable: pair.is_tradable,
            status: pair.status
          };
        });
        setPairLiquidity(liquidityMap);
      }
    } catch (error) {
      console.error('Error fetching trading pairs:', error);
    }
  };

  // Construct tradingPairs from dynamic data (metadata + available pairs)
  useEffect(() => {
    if (coinsMetadata.length > 0 && availablePairs.length > 0) {
      const constructedPairs = availablePairs.map(pair => {
        const coinMeta = coinsMetadata.find(c => c.symbol === pair.base);
        return {
          symbol: pair.symbol,
          base: pair.base,
          quote: pair.quote,
          icon: coinMeta?.icon || '◯',
          basePrice: 0 // Will be fetched dynamically or set via mock data
        };
      });
      setTradingPairs(constructedPairs);
    }
  }, [coinsMetadata, availablePairs]);


  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    try {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    } catch (e) {
      console.log('Chart cleanup error:', e);
    }

    const containerWidth = chartContainerRef.current.clientWidth;
    const chartHeight = isMobile ? 360 : 480;

    const chart = createChart(chartContainerRef.current, {
      width: containerWidth,
      height: chartHeight,
      layout: {
        background: { color: '#0A0F24' },
        textColor: 'rgba(255, 255, 255, 0.7)',
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { 
          color: 'rgba(255, 255, 255, 0.06)',
          style: 1,
          visible: true
        },
        horzLines: { 
          color: 'rgba(255, 255, 255, 0.06)',
          style: 1,
          visible: true
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#00F0FF',
          width: 1,
          style: 3,
          labelBackgroundColor: '#00F0FF',
        },
        horzLine: {
          color: '#00F0FF',
          width: 1,
          style: 3,
          labelBackgroundColor: '#00F0FF',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(0, 240, 255, 0.2)',
        textColor: 'rgba(255, 255, 255, 0.7)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: 'rgba(0, 240, 255, 0.2)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
      },
      localization: {
        locale: 'en-GB',
        dateFormat: 'dd MMM yyyy',
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00FF99',
      downColor: '#FF4D4D',
      borderUpColor: '#00FF99',
      borderDownColor: '#FF4D4D',
      wickUpColor: '#00FF99',
      wickDownColor: '#FF4D4D',
      borderVisible: true,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });

    const data = generateCandlestickData();
    candlestickSeries.setData(data);

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const newWidth = chartContainerRef.current.clientWidth;
        const newHeight = window.innerWidth <= 1200 ? 360 : 480;
        chartRef.current.applyOptions({
          width: newWidth,
          height: newHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }
      } catch (e) {
        console.log('Chart cleanup error:', e);
      }
    };
  }, [selectedPair, timeframe, isMobile]);

  const generateCandlestickData = () => {
    try {
      const pairData = tradingPairs.find(p => p.symbol === selectedPair);
      const basePrice = pairData?.basePrice || 47500;
      
      const now = Math.floor(Date.now() / 1000);
      const candles = [];
      
      const intervals = {
        '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400
      };
      
      const interval = intervals[timeframe] || 900;
      const numCandles = 100;
      
      for (let i = numCandles; i >= 0; i--) {
        const time = now - (i * interval);
        const randomChange = (Math.random() - 0.5) * 0.02;
        const open = basePrice * (1 + randomChange);
        const close = open * (1 + (Math.random() - 0.5) * 0.01);
        const high = Math.max(open, close) * (1 + Math.random() * 0.005);
        const low = Math.min(open, close) * (1 - Math.random() * 0.005);
        
        candles.push({
          time: time,
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2))
        });
      }
      
      return candles;
    } catch (e) {
      console.error('Error generating chart data:', e);
      return [];
    }
  };

  useEffect(() => {
    const fetchLivePriceForPair = async () => {
      try {
        // Extract base currency from pair (e.g., BTC from BTC/GBP)
        const baseCurrency = selectedPair.split('/')[0];
        
        // Fetch live price
        const response = await axios.get(`${API}/api/prices/live/${baseCurrency}`);
        if (response.data.success) {
          const livePrice = response.data.price_gbp;
          
          setMarketStats({
            lastPrice: livePrice,
            change24h: 0, // 24h change not available in current API
            high24h: livePrice * 1.02,
            low24h: livePrice * 0.98,
            volume24h: 0 // Volume not available in current API
          });

          generateOrderBook(livePrice);
          generateRecentTrades(livePrice);
        }
      } catch (error) {
        console.error('Error fetching live price:', error);
      }
    };

    fetchLivePriceForPair();
    // Update every minute
    const interval = setInterval(fetchLivePriceForPair, 60000);
    return () => clearInterval(interval);
  }, [selectedPair]);

  const generateOrderBook = (price) => {
    const bids = [];
    const asks = [];

    for (let i = 0; i < 15; i++) {
      bids.push({
        price: (price - i * (price * 0.0001)).toFixed(2),
        amount: (Math.random() * 2).toFixed(4),
        total: ((price - i * (price * 0.0001)) * (Math.random() * 2)).toFixed(2)
      });

      asks.push({
        price: (price + i * (price * 0.0001)).toFixed(2),
        amount: (Math.random() * 2).toFixed(4),
        total: ((price + i * (price * 0.0001)) * (Math.random() * 2)).toFixed(2)
      });
    }

    setOrderBook({ bids, asks });
  };

  const generateRecentTrades = (price) => {
    const trades = [];
    let time = Date.now();

    for (let i = 0; i < 20; i++) {
      const tradeDate = new Date(time - i * 10000);
      const hours = tradeDate.getHours().toString().padStart(2, '0');
      const minutes = tradeDate.getMinutes().toString().padStart(2, '0');
      const seconds = tradeDate.getSeconds().toString().padStart(2, '0');
      
      trades.push({
        price: (price + (Math.random() - 0.5) * (price * 0.001)).toFixed(2),
        amount: (Math.random() * 0.5).toFixed(4),
        time: `${hours}:${minutes}:${seconds}`,
        type: Math.random() > 0.5 ? 'buy' : 'sell'
      });
    }

    setRecentTrades(trades);
  };

  const handleTrade = async (fromModal = false) => {
    if (!fromModal) {
      if (!amount || parseFloat(amount) <= 0) {
        toast.error('Please enter an amount');
        return;
      }
      setShowQuickBuyModal(true);
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const pairData = tradingPairs.find(p => p.symbol === selectedPair);
      const baseAmount = parseFloat(amount);
      
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      const user_id = user?.user_id || 'demo_user';

      const response = await axios.post(`${API}/api/trading/execute`, {
        user_id: user_id,
        pair: selectedPair,
        type: orderType,
        amount: baseAmount,
        price: marketStats.lastPrice
      });

      if (!response.data.success) {
        toast.error(response.data.message || 'Trade failed');
        setShowQuickBuyModal(false);
        return;
      }

      const transaction = response.data.transaction;
      
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      
      const newTrade = {
        id: Date.now(),
        pair: selectedPair,
        type: orderType,
        price: transaction.price,
        amount: transaction.amount,
        total: transaction.total,
        fee: transaction.fee,
        time: `${hours}:${minutes}:${seconds}`
      };

      setUserTrades(prev => [newTrade, ...prev]);

      if (orderType === 'buy') {
        setBalances(prev => ({
          ...prev,
          [pairData.base]: prev[pairData.base] + baseAmount,
          [pairData.quote]: prev[pairData.quote] - transaction.final_amount
        }));
      } else {
        const receiveAmount = transaction.total - transaction.fee;
        setBalances(prev => ({
          ...prev,
          [pairData.base]: prev[pairData.base] - baseAmount,
          [pairData.quote]: prev[pairData.quote] + receiveAmount
        }));
      }

      toast.success(`✅ ${orderType === 'buy' ? 'Bought' : 'Sold'} ${amount} ${pairData.base}`);
      setAmount('');
      setShowQuickBuyModal(false);

    } catch (error) {
      console.error('Trade error:', error);
      toast.error('Failed to execute trade');
    }
  };

  const selectedPairData = tradingPairs.find(p => p.symbol === selectedPair);

  return (
    <Layout>
      <div style={{ padding: isMobile ? '0.75rem' : '1rem', background: '#0a0e1a', minHeight: '100vh', maxWidth: '100%', overflow: 'hidden' }}>
        {/* Header - Pair Selector & Stats */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(26, 31, 58, 0.8)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: isMobile ? '1rem' : '1.125rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {tradingPairs.map(pair => (
                <option key={pair.symbol} value={pair.symbol}>{pair.icon} {pair.symbol}</option>
              ))}
            </select>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: isMobile ? '0.65rem' : '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Last Price</div>
              <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '700', color: '#00F0FF' }}>
                £{marketStats.lastPrice.toLocaleString()}
              </div>
            </div>

            {!isMobile && (
              <>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>24h Change</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '700', color: marketStats.change24h >= 0 ? '#22C55E' : '#EF4444' }}>
                    {marketStats.change24h >= 0 ? '+' : ''}{marketStats.change24h.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>24h High</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff' }}>£{marketStats.high24h.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>24h Low</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff' }}>£{marketStats.low24h.toLocaleString()}</div>
                </div>
              </>
            )}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(34, 197, 94, 0.1)',
            borderRadius: '8px'
          }}>
            <Activity size={16} color="#22C55E" />
            <span style={{ fontSize: '0.75rem', color: '#22C55E', fontWeight: '600' }}>LIVE</span>
          </div>
        </div>

        {/* Main Layout - Responsive */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(220px, 280px) 1fr minmax(300px, 380px)',
          gap: isMobile ? '1rem' : '1.25rem',
          minHeight: isMobile ? 'auto' : '600px',
          maxWidth: '100%'
        }}>
          {/* Order Book - Desktop Left / Mobile Collapsible */}
          {!isMobile ? (
            <div style={{
              background: 'rgba(26, 31, 58, 0.9)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '12px',
              padding: '1rem',
              overflow: 'hidden',
              maxHeight: '700px'
            }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>Order Book</h3>
              
              <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                {orderBook.asks.slice(0, 10).reverse().map((ask, idx) => (
                  <div key={idx} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    fontSize: '0.75rem',
                    padding: '0.35rem 0.5rem',
                    position: 'relative'
                  }}>
                    <span style={{ color: '#EF4444', fontWeight: '600', fontFamily: 'monospace' }}>{ask.price}</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'right', fontFamily: 'monospace' }}>{ask.amount}</span>
                  </div>
                ))}
              </div>

              <div style={{
                padding: '0.75rem',
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(168, 85, 247, 0.15))',
                border: '2px solid rgba(0, 240, 255, 0.4)',
                borderRadius: '8px',
                textAlign: 'center',
                margin: '0.75rem 0',
                fontSize: '1.125rem',
                fontWeight: '800',
                color: '#00F0FF'
              }}>
                £{marketStats.lastPrice.toLocaleString()}
              </div>

              <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                {orderBook.bids.slice(0, 10).map((bid, idx) => (
                  <div key={idx} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    fontSize: '0.75rem',
                    padding: '0.35rem 0.5rem',
                    position: 'relative'
                  }}>
                    <span style={{ color: '#22C55E', fontWeight: '600', fontFamily: 'monospace' }}>{bid.price}</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'right', fontFamily: 'monospace' }}>{bid.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              background: 'rgba(26, 31, 58, 0.9)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '12px',
              padding: '0.75rem'
            }}>
              <button
                onClick={() => setShowOrderBook(!showOrderBook)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'transparent',
                  border: 'none',
                  color: '#00F0FF',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>Order Book</span>
                {showOrderBook ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {showOrderBook && (
                <div style={{ marginTop: '0.75rem', maxHeight: '300px', overflow: 'auto' }}>
                  {orderBook.asks.slice(0, 5).reverse().map((ask, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '0.7rem', padding: '0.35rem 0' }}>
                      <span style={{ color: '#EF4444', fontWeight: '600' }}>{ask.price}</span>
                      <span style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>{ask.amount}</span>
                    </div>
                  ))}
                  <div style={{ padding: '0.5rem', textAlign: 'center', fontSize: '1rem', fontWeight: '700', color: '#00F0FF', margin: '0.5rem 0' }}>
                    £{marketStats.lastPrice.toLocaleString()}
                  </div>
                  {orderBook.bids.slice(0, 5).map((bid, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '0.7rem', padding: '0.35rem 0' }}>
                      <span style={{ color: '#22C55E', fontWeight: '600' }}>{bid.price}</span>
                      <span style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>{bid.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Center: Chart + Recent Trades */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
            {/* Chart */}
            <div style={{
              background: 'rgba(26, 31, 58, 0.8)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '12px',
              padding: isMobile ? '0.75rem' : '1rem'
            }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {timeframes.map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: timeframe === tf ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
                      border: timeframe === tf ? '1px solid #00F0FF' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      color: timeframe === tf ? '#00F0FF' : 'rgba(255,255,255,0.6)',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              <div 
                ref={chartContainerRef} 
                style={{ 
                  width: '100%', 
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#0A0F24',
                  border: '1px solid rgba(0, 240, 255, 0.15)',
                  boxShadow: '0 0 25px rgba(0, 240, 255, 0.12)'
                }} 
              />
            </div>

            {/* Recent Trades - Desktop Only / Mobile Collapsible */}
            {!isMobile && (
              <div style={{
                background: 'rgba(26, 31, 58, 0.8)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: '12px',
                padding: '1rem'
              }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>Recent Trades</h3>
                <div style={{ maxHeight: '150px', overflow: 'auto' }}>
                  {recentTrades.slice(0, 10).map((trade, idx) => (
                    <div key={idx} style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      fontSize: '0.75rem',
                      padding: '0.4rem 0.5rem'
                    }}>
                      <span style={{ color: trade.type === 'buy' ? '#22C55E' : '#EF4444', fontWeight: '600' }}>{trade.price}</span>
                      <span style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>{trade.amount}</span>
                      <span style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right', fontSize: '0.7rem' }}>{trade.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Trading Panel */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.8)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '12px',
            padding: isMobile ? '1rem' : '1.5rem',
            minWidth: 0
          }}>
            <h3 style={{ fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>
              Spot Trading
            </h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Available:</span>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff' }}>
                  {balances[selectedPairData?.base] || 0} {selectedPairData?.base}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Available:</span>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff' }}>
                  £{(balances[selectedPairData?.quote] || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <button
                onClick={() => setOrderType('buy')}
                style={{
                  padding: isMobile ? '0.75rem' : '0.875rem',
                  background: orderType === 'buy' ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'rgba(0, 0, 0, 0.3)',
                  border: orderType === 'buy' ? '2px solid rgba(34, 197, 94, 0.6)' : 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: isMobile ? '0.875rem' : '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: orderType === 'buy' 
                    ? '0 0 20px rgba(34, 197, 94, 0.5), 0 0 40px rgba(34, 197, 94, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1)' 
                    : 'none',
                  transition: 'all 0.3s ease',
                  transform: orderType === 'buy' ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                BUY
              </button>
              <button
                onClick={() => setOrderType('sell')}
                style={{
                  padding: isMobile ? '0.75rem' : '0.875rem',
                  background: orderType === 'sell' ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'rgba(0, 0, 0, 0.3)',
                  border: orderType === 'sell' ? '2px solid rgba(239, 68, 68, 0.6)' : 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: isMobile ? '0.875rem' : '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: orderType === 'sell' 
                    ? '0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1)' 
                    : 'none',
                  transition: 'all 0.3s ease',
                  transform: orderType === 'sell' ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                SELL
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.7)',
                marginBottom: '0.5rem',
                fontWeight: '600'
              }}>
                Amount ({selectedPairData?.base})
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: isMobile ? '0.875rem' : '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: isMobile ? '1rem' : '1.125rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {['25%', '50%', '75%', '100%'].map(pct => (
                <button
                  key={pct}
                  onClick={() => {
                    const percentage = parseInt(pct) / 100;
                    if (orderType === 'buy') {
                      const availableFiat = balances[selectedPairData?.quote] || 0;
                      setAmount(((availableFiat * percentage) / marketStats.lastPrice).toFixed(6));
                    } else {
                      const availableCrypto = balances[selectedPairData?.base] || 0;
                      setAmount((availableCrypto * percentage).toFixed(6));
                    }
                  }}
                  style={{
                    padding: '0.5rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {pct}
                </button>
              ))}
            </div>

            {amount && parseFloat(amount) > 0 && (
              <div style={{
                padding: '0.75rem',
                background: 'rgba(0, 240, 255, 0.05)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: '6px',
                marginBottom: '1.5rem'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>Total</div>
                <div style={{ fontSize: isMobile ? '1.125rem' : '1.25rem', fontWeight: '700', color: '#00F0FF' }}>
                  £{(parseFloat(amount) * marketStats.lastPrice).toFixed(2)}
                </div>
              </div>
            )}

            {pairLiquidity[selectedPair] && !pairLiquidity[selectedPair].is_tradable && (
              <div style={{
                padding: '0.75rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                marginBottom: '1rem'
              }}>
                <div style={{ fontSize: '0.7rem', color: '#EF4444', lineHeight: '1.4', fontWeight: '700' }}>
                  ⚠️ Trading unavailable due to insufficient liquidity
                </div>
              </div>
            )}

            <button
              onClick={handleTrade}
              disabled={!amount || parseFloat(amount) <= 0 || (pairLiquidity[selectedPair] && !pairLiquidity[selectedPair].is_tradable)}
              style={{
                width: '100%',
                padding: isMobile ? '1rem' : '1.125rem',
                background: orderType === 'buy' ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                border: orderType === 'buy' ? '3px solid rgba(34, 197, 94, 0.7)' : '3px solid rgba(239, 68, 68, 0.7)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: isMobile ? '1.125rem' : '1.25rem',
                fontWeight: '700',
                cursor: 'pointer',
                opacity: (!amount || parseFloat(amount) <= 0 || (pairLiquidity[selectedPair] && !pairLiquidity[selectedPair].is_tradable)) ? 0.5 : 1,
                touchAction: 'manipulation',
                boxShadow: (!amount || parseFloat(amount) <= 0 || (pairLiquidity[selectedPair] && !pairLiquidity[selectedPair].is_tradable)) 
                  ? 'none'
                  : orderType === 'buy'
                    ? '0 0 25px rgba(34, 197, 94, 0.6), 0 0 50px rgba(34, 197, 94, 0.4), 0 4px 15px rgba(0, 0, 0, 0.3), inset 0 0 25px rgba(255, 255, 255, 0.15)'
                    : '0 0 25px rgba(239, 68, 68, 0.6), 0 0 50px rgba(239, 68, 68, 0.4), 0 4px 15px rgba(0, 0, 0, 0.3), inset 0 0 25px rgba(255, 255, 255, 0.15)',
                transition: 'all 0.3s ease',
                transform: (!amount || parseFloat(amount) <= 0 || (pairLiquidity[selectedPair] && !pairLiquidity[selectedPair].is_tradable)) ? 'scale(1)' : 'scale(1.01)'
              }}
            >
              {pairLiquidity[selectedPair] && !pairLiquidity[selectedPair].is_tradable 
                ? '⏸ Trading Paused' 
                : `${orderType === 'buy' ? 'BUY' : 'SELL'} ${selectedPairData?.base}`
              }
            </button>
          </div>
        </div>

        {/* Quick Buy Confirmation Modal */}
        {showQuickBuyModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: isMobile ? '1rem' : 0
          }}
          onClick={() => setShowQuickBuyModal(false)}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(26, 31, 58, 0.95), rgba(15, 20, 40, 0.95))',
              border: '2px solid rgba(0, 240, 255, 0.4)',
              borderRadius: '16px',
              padding: isMobile ? '1.5rem' : '2rem',
              maxWidth: '500px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}>
              <h3 style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                {orderType === 'buy' ? 'Confirm Buy' : 'Confirm Sell'}
              </h3>

              <div style={{
                padding: '1.5rem',
                background: 'rgba(0, 240, 255, 0.05)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: '12px',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Pair:</span>
                  <span style={{ fontWeight: '700', color: '#fff' }}>{selectedPair}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Price:</span>
                  <span style={{ fontWeight: '700', color: '#00F0FF' }}>£{marketStats.lastPrice.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Amount:</span>
                  <span style={{ fontWeight: '700', color: '#fff' }}>{amount} {selectedPairData?.base}</span>
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '1rem 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Total:</span>
                  <span style={{ fontWeight: '700', color: '#fff', fontSize: '1.25rem' }}>
                    £{(parseFloat(amount || 0) * marketStats.lastPrice).toFixed(2)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                <button
                  onClick={() => setShowQuickBuyModal(false)}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '2px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '12px',
                    color: '#EF4444',
                    fontWeight: '700',
                    cursor: 'pointer',
                    minWidth: isMobile ? '100%' : 'auto'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleTrade(true)}
                  style={{
                    flex: 2,
                    padding: '1rem',
                    background: orderType === 'buy' ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    minWidth: isMobile ? '100%' : 'auto'
                  }}
                >
                  <Zap size={20} />
                  Confirm {orderType === 'buy' ? 'BUY' : 'SELL'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
