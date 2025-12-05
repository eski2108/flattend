import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '@/components/Layout';
import * as LightweightCharts from 'lightweight-charts';
import { 
  TrendingUp, 
  TrendingDown,
  ChevronDown,
  Activity,
  Clock,
  DollarSign,
  Zap,
  Menu,
  X
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || 'https://cryptovault-29.preview.emergentagent.com';

// Responsive Styles
const styles = {
  container: {
    padding: '1rem',
    background: '#0a0e1a',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  statsRow: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap'
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr 380px',
    gap: '1.5rem',
    minHeight: '600px'
  },
  // Mobile responsive breakpoints
  '@media (max-width: 1200px)': {
    mainGrid: {
      gridTemplateColumns: '1fr',
      gap: '1rem'
    }
  },
  '@media (max-width: 768px)': {
    container: {
      padding: '0.75rem'
    },
    statsRow: {
      gap: '0.75rem',
      fontSize: '0.875rem'
    }
  }
};

export default function SpotTrading() {
  const navigate = useNavigate();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);

  // State
  const [selectedPair, setSelectedPair] = useState('BTC/GBP');
  const [currentUser, setCurrentUser] = useState(null);
  const [timeframe, setTimeframe] = useState('15m');
  const [orderType, setOrderType] = useState('buy');
  const [amount, setAmount] = useState('');
  const [balances, setBalances] = useState({ BTC: 0.5, ETH: 2.5, USDT: 1000, BNB: 5, SOL: 10, LTC: 15, GBP: 5000 });
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [recentTrades, setRecentTrades] = useState([]);
  const [userTrades, setUserTrades] = useState([]);
  const [showQuickBuyModal, setShowQuickBuyModal] = useState(false);
  const [candlestickData, setCandlestickData] = useState([]);
  const [availablePairs, setAvailablePairs] = useState([]);
  const [pairLiquidity, setPairLiquidity] = useState({});
  const [showOrderBook, setShowOrderBook] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [marketStats, setMarketStats] = useState({
    lastPrice: 47500,
    change24h: 2.34,
    high24h: 48200,
    low24h: 46800,
    volume24h: 1234.56
  });

  const tradingPairs = [
    { symbol: 'BTC/GBP', base: 'BTC', quote: 'GBP', icon: '₿', basePrice: 47500 },
    { symbol: 'ETH/GBP', base: 'ETH', quote: 'GBP', icon: '⟠', basePrice: 2500 },
    { symbol: 'USDT/GBP', base: 'USDT', quote: 'GBP', icon: '₮', basePrice: 0.79 },
    { symbol: 'BNB/GBP', base: 'BNB', quote: 'GBP', icon: '◆', basePrice: 380 },
    { symbol: 'SOL/GBP', base: 'SOL', quote: 'GBP', icon: '◎', basePrice: 120 },
    { symbol: 'LTC/GBP', base: 'LTC', quote: 'GBP', icon: 'Ł', basePrice: 85 }
  ];

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

  // Fetch available trading pairs and liquidity status
  useEffect(() => {
    fetchTradingPairs();
  }, []);

  const fetchTradingPairs = async () => {
    try {
      const response = await axios.get(`${API}/api/trading/pairs`);
      if (response.data.success) {
        setAvailablePairs(response.data.pairs);
        
        // Create liquidity map
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

  // Initialize TradingView Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clear any existing chart safely
    try {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    } catch (e) {
      console.log('Chart cleanup error:', e);
    }

    // Get container width
    const containerWidth = chartContainerRef.current.clientWidth;
    const chartHeight = isMobile ? 300 : 400;

    // Create chart (v5 API) with locale override to prevent en-US@posix errors
    const chart = LightweightCharts.createChart(chartContainerRef.current, {
      width: containerWidth,
      height: chartHeight,
      layout: {
        background: { color: 'transparent' },
        textColor: '#888',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: '#00F0FF',
          width: 1,
          style: 2,
          labelBackgroundColor: '#00F0FF',
        },
        horzLine: {
          color: '#00F0FF',
          width: 1,
          style: 2,
          labelBackgroundColor: '#00F0FF',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        locale: 'en-US',
        dateFormat: 'yyyy-MM-dd',
      },
    });

    // Add candlestick series (v5 API)
    const candlestickSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
      upColor: '#22C55E',
      downColor: '#EF4444',
      borderUpColor: '#22C55E',
      borderDownColor: '#EF4444',
      wickUpColor: '#22C55E',
      wickDownColor: '#EF4444',
    });

    // Add volume series (v5 API)
    const volumeSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    // Generate sample data
    const data = generateCandlestickData();
    candlestickSeries.setData(data.candles);
    volumeSeries.setData(data.volumes);

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Handle window resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const newWidth = chartContainerRef.current.clientWidth;
        const newHeight = window.innerWidth <= 1200 ? 300 : 400;
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
  }, [selectedPair, timeframe, tradingPairs, isMobile]);

  // Generate candlestick data
  const generateCandlestickData = () => {
    try {
      const pairData = tradingPairs.find(p => p.symbol === selectedPair);
      const basePrice = pairData?.basePrice || 47500;
      
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      const candles = [];
      const volumes = [];
      
      // Generate data based on timeframe
      const intervals = {
        '1m': 60,
        '5m': 300,
        '15m': 900,
        '1h': 3600,
        '4h': 14400,
        '1d': 86400
      };
      
      const interval = intervals[timeframe] || 900;
      const numCandles = 100;
      
      for (let i = numCandles; i >= 0; i--) {
        const time = now - (i * interval);
        const randomChange = (Math.random() - 0.5) * 0.02; // +/- 2%
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
        
        volumes.push({
          time: time,
          value: parseFloat((Math.random() * 100).toFixed(2)),
          color: close >= open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
        });
      }
      
      return { candles, volumes };
    } catch (e) {
      console.error('Error generating chart data:', e);
      return { candles: [], volumes: [] };
    }
  };

  // Update chart when pair changes
  useEffect(() => {
    const pairData = tradingPairs.find(p => p.symbol === selectedPair);
    if (pairData) {
      const prices = {
        'BTC/GBP': 47500,
        'ETH/GBP': 2500,
        'USDT/GBP': 0.79,
        'BNB/GBP': 380,
        'SOL/GBP': 120,
        'LTC/GBP': 85
      };
      
      setMarketStats({
        lastPrice: prices[selectedPair],
        change24h: (Math.random() - 0.5) * 10,
        high24h: prices[selectedPair] * 1.02,
        low24h: prices[selectedPair] * 0.98,
        volume24h: Math.random() * 10000
      });

      generateOrderBook(prices[selectedPair]);
      generateRecentTrades(prices[selectedPair]);
    }
  }, [selectedPair]);

  // Generate simulated order book
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

  // Generate simulated recent trades
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

  // Execute trade
  const handleTrade = async (fromModal = false) => {
    // If not from modal, show modal first (prevent instant execution)
    if (!fromModal) {
      if (!amount || parseFloat(amount) <= 0) {
        toast.error('Please enter an amount');
        return;
      }
      setShowQuickBuyModal(true);
      return;
    }

    // Only execute after user confirms in modal
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const pairData = tradingPairs.find(p => p.symbol === selectedPair);
      const baseAmount = parseFloat(amount);
      
      // Get user_id from localStorage
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      const user_id = user?.user_id || 'demo_user';

      // Call backend API to execute trade with full protection
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
      
      // Create trade record
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear();
      
      const newTrade = {
        id: Date.now(),
        pair: selectedPair,
        type: orderType,
        price: transaction.price,
        amount: transaction.amount,
        total: transaction.total,
        fee: transaction.fee,
        time: `${hours}:${minutes}:${seconds}`,
        date: `${day}/${month}/${year}`
      };

      setUserTrades(prev => [newTrade, ...prev]);

      // Update balances (simplified - in production this would come from backend)
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

      toast.success(`✅ ${orderType === 'buy' ? 'Bought' : 'Sold'} ${amount} ${pairData.base} at £${transaction.price.toLocaleString()}`);
      setAmount('');
      setShowQuickBuyModal(false);

    } catch (error) {
      console.error('Trade error:', error);
      toast.error('Failed to execute trade');
    }
  };

  const selectedPairData = tradingPairs.find(p => p.symbol === selectedPair);

  // Order Book Component
  const OrderBookSection = () => (
    <div style={{
      background: 'rgba(26, 31, 58, 0.9)',
      border: '1px solid rgba(0, 240, 255, 0.3)',
      borderRadius: '12px',
      padding: isMobile ? '1rem' : '1.25rem',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      width: '100%'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#fff', margin: 0 }}>
          Order Book
        </h3>
        {isMobile && (
          <button
            onClick={() => setShowOrderBook(!showOrderBook)}
            style={{
              padding: '0.25rem 0.5rem',
              background: 'rgba(0, 240, 255, 0.2)',
              border: '1px solid rgba(0, 240, 255, 0.4)',
              borderRadius: '6px',
              color: '#00F0FF',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            {showOrderBook ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      
      {(!isMobile || showOrderBook) && (
        <>
          {/* Asks (Sell Orders) - RED */}
          <div style={{ marginBottom: '0.5rem' }}>
            {orderBook.asks.slice(0, isMobile ? 5 : 10).reverse().map((ask, idx) => {
              const depth = parseFloat(ask.amount) * 10; // Simulated depth percentage
              return (
                <div key={idx} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  fontSize: isMobile ? '0.7rem' : '0.75rem',
                  padding: '0.35rem 0.5rem',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  {/* Depth shading */}
                  <div style={{ 
                    background: `linear-gradient(to left, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) ${depth}%, transparent ${depth}%)`, 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0 
                  }} />
                  <span style={{ 
                    color: '#EF4444', 
                    position: 'relative', 
                    fontWeight: '600',
                    fontFamily: 'monospace'
                  }}>
                    {ask.price}
                  </span>
                  <span style={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    textAlign: 'right', 
                    position: 'relative',
                    fontFamily: 'monospace'
                  }}>
                    {ask.amount}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Current Price - HIGHLIGHTED */}
          <div style={{
            padding: isMobile ? '0.5rem' : '0.75rem',
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(168, 85, 247, 0.15))',
            border: '2px solid rgba(0, 240, 255, 0.4)',
            borderRadius: '8px',
            textAlign: 'center',
            margin: '0.75rem 0',
            fontSize: isMobile ? '1rem' : '1.125rem',
            fontWeight: '800',
            color: '#00F0FF',
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)',
            letterSpacing: '0.5px'
          }}>
            £{marketStats.lastPrice.toLocaleString()}
          </div>

          {/* Bids (Buy Orders) - GREEN */}
          <div>
            {orderBook.bids.slice(0, isMobile ? 5 : 10).map((bid, idx) => {
              const depth = parseFloat(bid.amount) * 10; // Simulated depth percentage
              return (
                <div key={idx} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  fontSize: isMobile ? '0.7rem' : '0.75rem',
                  padding: '0.35rem 0.5rem',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  {/* Depth shading */}
                  <div style={{ 
                    background: `linear-gradient(to left, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) ${depth}%, transparent ${depth}%)`, 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0 
                  }} />
                  <span style={{ 
                    color: '#22C55E', 
                    position: 'relative', 
                    fontWeight: '600',
                    fontFamily: 'monospace'
                  }}>
                    {bid.price}
                  </span>
                  <span style={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    textAlign: 'right', 
                    position: 'relative',
                    fontFamily: 'monospace'
                  }}>
                    {bid.amount}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  // Trading Panel Component
  const TradingPanel = () => (
    <div style={{
      background: 'rgba(26, 31, 58, 0.8)',
      border: '1px solid rgba(0, 240, 255, 0.2)',
      borderRadius: '12px',
      padding: isMobile ? '1rem' : '1.5rem',
      width: '100%'
    }}>
      <h3 style={{ fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>
        Spot Trading
      </h3>

      {/* Balances */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Available:</span>
          <span style={{ fontSize: isMobile ? '0.8125rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>
            {balances[selectedPairData?.base] || 0} {selectedPairData?.base}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Available:</span>
          <span style={{ fontSize: isMobile ? '0.8125rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>
            £{(balances[selectedPairData?.quote] || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Buy/Sell Toggle */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.5rem',
        marginBottom: '1.5rem'
      }}>
        <button
          onClick={() => setOrderType('buy')}
          style={{
            padding: isMobile ? '0.65rem' : '0.75rem',
            background: orderType === 'buy'
              ? 'linear-gradient(135deg, #22C55E, #16A34A)'
              : 'rgba(0, 0, 0, 0.3)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          BUY
        </button>
        <button
          onClick={() => setOrderType('sell')}
          style={{
            padding: isMobile ? '0.65rem' : '0.75rem',
            background: orderType === 'sell'
              ? 'linear-gradient(135deg, #EF4444, #DC2626)'
              : 'rgba(0, 0, 0, 0.3)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          SELL
        </button>
      </div>

      {/* Amount Input */}
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
            padding: isMobile ? '0.65rem' : '0.75rem',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: isMobile ? '0.875rem' : '1rem',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Quick Percentage Buttons */}
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
              padding: isMobile ? '0.4rem' : '0.5rem',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              color: 'rgba(255,255,255,0.7)',
              fontSize: isMobile ? '0.7rem' : '0.75rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {pct}
          </button>
        ))}
      </div>

      {/* Total Cost */}
      {amount && parseFloat(amount) > 0 && (
        <div style={{
          padding: '0.75rem',
          background: 'rgba(0, 240, 255, 0.05)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '6px',
          marginBottom: '1.5rem'
        }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>
            Total
          </div>
          <div style={{ fontSize: isMobile ? '1.125rem' : '1.25rem', fontWeight: '700', color: '#00F0FF' }}>
            £{(parseFloat(amount) * marketStats.lastPrice).toFixed(2)}
          </div>
        </div>
      )}

      {/* Info Note */}
      <div style={{
        padding: '0.75rem',
        background: 'rgba(34, 197, 94, 0.05)',
        border: '1px solid rgba(34, 197, 94, 0.2)',
        borderRadius: '6px',
        marginBottom: '1.5rem'
      }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
          Order executes at current market price
        </div>
      </div>

      {/* Liquidity Warning */}
      {pairLiquidity[selectedPair] && !pairLiquidity[selectedPair].is_tradable && (
        <div style={{
          padding: '0.75rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '6px',
          marginBottom: '1rem'
        }}>
          <div style={{ fontSize: '0.7rem', color: '#EF4444', lineHeight: '1.4', fontWeight: '700' }}>
            ⚠️ Trading unavailable for this pair due to insufficient platform liquidity
          </div>
        </div>
      )}

      {/* Execute Button */}
      <button
        onClick={handleTrade}
        disabled={!amount || parseFloat(amount) <= 0 || (pairLiquidity[selectedPair] && !pairLiquidity[selectedPair].is_tradable)}
        style={{
          width: '100%',
          padding: isMobile ? '0.875rem' : '1rem',
          background: orderType === 'buy'
            ? 'linear-gradient(135deg, #22C55E, #16A34A)'
            : 'linear-gradient(135deg, #EF4444, #DC2626)',
          border: 'none',
          borderRadius: '12px',
          color: '#fff',
          fontSize: isMobile ? '1rem' : '1.125rem',
          fontWeight: '700',
          cursor: 'pointer',
          opacity: (!amount || parseFloat(amount) <= 0 || (pairLiquidity[selectedPair] && !pairLiquidity[selectedPair].is_tradable)) ? 0.5 : 1,
          touchAction: 'manipulation'
        }}
      >
        {pairLiquidity[selectedPair] && !pairLiquidity[selectedPair].is_tradable 
          ? '⏸ Trading Paused' 
          : `${orderType === 'buy' ? 'BUY' : 'SELL'} ${selectedPairData?.base}`
        }
      </button>

      {/* User Trades History */}
      {userTrades.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#fff', marginBottom: '0.75rem' }}>
            Your Recent Trades
          </h4>
          <div style={{ maxHeight: '150px', overflow: 'auto' }}>
            {userTrades.map((trade) => (
              <div key={trade.id} style={{
                padding: '0.5rem',
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '6px',
                marginBottom: '0.5rem',
                fontSize: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: trade.type === 'buy' ? '#22C55E' : '#EF4444', fontWeight: '600' }}>
                    {trade.type.toUpperCase()}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{trade.time}</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {trade.amount} {selectedPairData?.base} @ £{trade.price}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Layout>
      <div style={styles.container}>
        {/* Header with Pair Selector and Stats */}
        <div style={styles.header}>
          {/* Pair Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <button style={{
                padding: isMobile ? '0.6rem 1rem' : '0.75rem 1.5rem',
                background: 'rgba(26, 31, 58, 0.8)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: isMobile ? '1rem' : '1.125rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>{selectedPairData?.icon}</span>
                <span>{selectedPair}</span>
                <ChevronDown size={18} />
              </button>
            </div>

            {/* 24h Stats */}
            <div style={styles.statsRow}>
              <div>
                <div style={{ fontSize: isMobile ? '0.65rem' : '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Last Price</div>
                <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '700', color: '#00F0FF' }}>
                  £{marketStats.lastPrice.toLocaleString()}
                </div>
              </div>
              {!isMobile && (
                <>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>24h Change</div>
                    <div style={{ 
                      fontSize: '1rem', 
                      fontWeight: '700', 
                      color: marketStats.change24h >= 0 ? '#22C55E' : '#EF4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      {marketStats.change24h >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      {marketStats.change24h >= 0 ? '+' : ''}{marketStats.change24h.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>24h High</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#fff' }}>
                      £{marketStats.high24h.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>24h Low</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#fff' }}>
                      £{marketStats.low24h.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>24h Volume</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#fff' }}>
                      {marketStats.volume24h.toFixed(2)} {selectedPairData?.base}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Live Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(34, 197, 94, 0.1)',
            borderRadius: '8px'
          }}>
            <Activity size={16} color="#22C55E" />
            <span style={{ fontSize: isMobile ? '0.7rem' : '0.75rem', color: '#22C55E', fontWeight: '600' }}>
              LIVE MARKET
            </span>
          </div>
        </div>

        {/* Main Trading Layout - RESPONSIVE */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '280px 1fr 380px',
          gap: isMobile ? '1rem' : '1.5rem',
          minHeight: isMobile ? 'auto' : '600px'
        }}>
          {/* Order Book - First on mobile */}
          {isMobile && <OrderBookSection />}

          {/* Left: Order Book - Desktop only in original position */}
          {!isMobile && <OrderBookSection />}

          {/* Center: Chart and Trades */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Chart */}
            <div style={{
              background: 'rgba(26, 31, 58, 0.8)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '12px',
              padding: isMobile ? '0.75rem' : '1rem'
            }}>
              {/* Timeframe Selector */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {timeframes.map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    style={{
                      padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1rem',
                      background: timeframe === tf ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
                      border: timeframe === tf ? '1px solid #00F0FF' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      color: timeframe === tf ? '#00F0FF' : 'rgba(255,255,255,0.6)',
                      fontSize: isMobile ? '0.7rem' : '0.75rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* Chart Container */}
              <div ref={chartContainerRef} style={{ 
                width: '100%', 
                height: isMobile ? '300px' : '400px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Simulated Chart Lines */}
                <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                  <polyline
                    points="0,200 50,180 100,190 150,160 200,140 250,170 300,150 350,130 400,160 450,140 500,120 550,110 600,130 650,100 700,90 750,110 800,80"
                    fill="none"
                    stroke="#22C55E"
                    strokeWidth="2"
                    opacity="0.7"
                  />
                </svg>
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', color: '#00F0FF', fontWeight: '700', marginBottom: '0.5rem' }}>
                    £{marketStats.lastPrice.toLocaleString()}
                  </div>
                  <div style={{ fontSize: isMobile ? '0.8rem' : '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                    Live Price Chart • {timeframe} timeframe
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Trades - Hide on mobile to save space */}
            {!isMobile && (
              <div style={{
                background: 'rgba(26, 31, 58, 0.8)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: '12px',
                padding: '1rem'
              }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>
                  Recent Trades
                </h3>
                <div style={{ maxHeight: '150px', overflow: 'auto' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    fontSize: '0.7rem',
                    padding: '0.5rem 0.5rem',
                    color: 'rgba(255,255,255,0.5)',
                    fontWeight: '600',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    textTransform: 'uppercase'
                  }}>
                    <span>Price (£)</span>
                    <span style={{ textAlign: 'center' }}>Amount</span>
                    <span style={{ textAlign: 'right' }}>Time</span>
                  </div>
                  {recentTrades.map((trade, idx) => (
                    <div key={idx} style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      fontSize: '0.75rem',
                      padding: '0.4rem 0.5rem',
                      background: idx % 2 === 0 ? 'rgba(0, 0, 0, 0.2)' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 240, 255, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(0, 0, 0, 0.2)' : 'transparent'}>
                      <span style={{ 
                        color: trade.type === 'buy' ? '#22C55E' : '#EF4444',
                        fontWeight: '600',
                        fontFamily: 'monospace'
                      }}>
                        {trade.price}
                      </span>
                      <span style={{ 
                        color: 'rgba(255,255,255,0.8)', 
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }}>
                        {trade.amount}
                      </span>
                      <span style={{ 
                        color: 'rgba(255,255,255,0.5)', 
                        textAlign: 'right', 
                        fontSize: '0.7rem' 
                      }}>
                        {trade.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Trading Panel */}
          <TradingPanel />
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
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 240, 255, 0.3)'
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
                {orderType === 'buy' ? '⚡ Quick Buy' : '⚡ Quick Sell'}
              </h3>

              {/* Order Details */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                  padding: '1.5rem',
                  background: 'rgba(0, 240, 255, 0.05)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  borderRadius: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Pair:</span>
                    <span style={{ fontWeight: '700', color: '#fff', fontSize: isMobile ? '1rem' : '1.125rem' }}>
                      {selectedPairData?.icon} {selectedPair}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Current Price:</span>
                    <span style={{ fontWeight: '700', color: '#00F0FF', fontSize: isMobile ? '1rem' : '1.125rem' }}>
                      £{marketStats.lastPrice.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Amount:</span>
                    <span style={{ fontWeight: '700', color: '#fff', fontSize: isMobile ? '1rem' : '1.125rem' }}>
                      {amount} {selectedPairData?.base}
                    </span>
                  </div>
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '1rem 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Total:</span>
                    <span style={{ fontWeight: '700', color: '#fff', fontSize: isMobile ? '1.125rem' : '1.25rem' }}>
                      £{(parseFloat(amount || 0) * marketStats.lastPrice).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Trading Fee (0.1%):</span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                      £{((parseFloat(amount || 0) * marketStats.lastPrice) * 0.001).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: isMobile ? '0.8rem' : '0.85rem', color: '#22C55E', lineHeight: '1.5' }}>
                    <strong>Instant Execution:</strong> Your order will execute immediately at the current market price using platform liquidity.
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
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
                    fontSize: isMobile ? '0.875rem' : '1rem',
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
                    background: orderType === 'buy'
                      ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                      : 'linear-gradient(135deg, #EF4444, #DC2626)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
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
