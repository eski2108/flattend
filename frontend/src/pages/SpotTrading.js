import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '@/components/Layout';
import { TrendingUp, TrendingDown, Zap, Info } from 'lucide-react';

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

  return (
    <Layout>
      <div style={{ minHeight: '100vh', background: '#05121F', padding: '20px' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#FFFFFF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TrendingUp size={32} color="#0CEBFF" strokeWidth={2.5} />
            Spot Trading
          </h1>
          <p style={{ fontSize: '16px', color: '#8F9BB3' }}>Trade crypto with advanced charts and indicators</p>
        </div>

        {/* Market Stats Bar */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', background: 'rgba(12, 235, 255, 0.05)', border: '1px solid rgba(12, 235, 255, 0.2)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '4px' }}>Last Price</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#0CEBFF' }}>${marketStats.lastPrice.toLocaleString()}</div>
          </div>
          <div style={{ flex: 1, minWidth: '200px', background: 'rgba(12, 235, 255, 0.05)', border: '1px solid rgba(12, 235, 255, 0.2)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '4px' }}>24h Change</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: marketStats.change24h >= 0 ? '#22C55E' : '#EF4444' }}>
              {marketStats.change24h >= 0 ? '+' : ''}{marketStats.change24h.toFixed(2)}%
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '200px', background: 'rgba(12, 235, 255, 0.05)', border: '1px solid rgba(12, 235, 255, 0.2)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '4px' }}>24h High</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#FFFFFF' }}>${marketStats.high24h.toLocaleString()}</div>
          </div>
          <div style={{ flex: 1, minWidth: '200px', background: 'rgba(12, 235, 255, 0.05)', border: '1px solid rgba(12, 235, 255, 0.2)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '4px' }}>24h Low</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#FFFFFF' }}>${marketStats.low24h.toLocaleString()}</div>
          </div>
        </div>

        {/* Main Trading Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
          
          {/* Left Column: Chart + Order Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Pair Selector */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {tradingPairs.map(pair => (
                <button
                  key={pair.symbol}
                  onClick={() => setSelectedPair(pair.symbol)}
                  style={{
                    padding: '10px 16px',
                    background: selectedPair === pair.symbol ? 'linear-gradient(135deg, #0CEBFF, #00F0FF)' : 'rgba(12, 235, 255, 0.1)',
                    border: `1px solid ${selectedPair === pair.symbol ? '#0CEBFF' : 'rgba(12, 235, 255, 0.2)'}`,
                    borderRadius: '12px',
                    color: selectedPair === pair.symbol ? '#000' : '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: selectedPair === pair.symbol ? '0 0 20px rgba(12, 235, 255, 0.4)' : 'none'
                  }}
                >
                  {pair.name}
                </button>
              ))}
            </div>

            {/* TradingView Advanced Chart */}
            <div style={{ background: 'rgba(12, 235, 255, 0.05)', border: '2px solid rgba(12, 235, 255, 0.3)', borderRadius: '16px', padding: '4px', height: '600px', boxShadow: '0 0 40px rgba(12, 235, 255, 0.2)' }}>
              <div id="tradingview-chart" style={{ width: '100%', height: '100%' }}></div>
            </div>

            {/* Order Panel */}
            <div style={{ background: 'rgba(12, 235, 255, 0.05)', border: '2px solid rgba(12, 235, 255, 0.3)', borderRadius: '16px', padding: '24px', boxShadow: '0 0 40px rgba(12, 235, 255, 0.2)' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <button
                  onClick={() => setOrderType('buy')}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: orderType === 'buy' ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${orderType === 'buy' ? '#22C55E' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: orderType === 'buy' ? '0 0 30px rgba(34, 197, 94, 0.4)' : 'none'
                  }}
                >
                  BUY
                </button>
                <button
                  onClick={() => setOrderType('sell')}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: orderType === 'sell' ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${orderType === 'sell' ? '#EF4444' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: orderType === 'sell' ? '0 0 30px rgba(239, 68, 68, 0.4)' : 'none'
                  }}
                >
                  SELL
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#8F9BB3', marginBottom: '8px', fontWeight: '600' }}>Amount</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(12, 235, 255, 0.3)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#8F9BB3', marginBottom: '8px', fontWeight: '600' }}>Price (USD)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder={`Market: $${marketStats.lastPrice.toFixed(2)}`}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(12, 235, 255, 0.3)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(12, 235, 255, 0.2)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#8F9BB3' }}>Total</span>
                    <span style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600' }}>${calculateTotal().toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#8F9BB3' }}>Fee ({tradingFee}%)</span>
                    <span style={{ fontSize: '14px', color: '#F5C542', fontWeight: '600' }}>${calculateFee().toFixed(2)}</span>
                  </div>
                  <div style={{ height: '1px', background: 'rgba(12, 235, 255, 0.2)', margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: '600' }}>Final Amount</span>
                    <span style={{ fontSize: '16px', color: '#0CEBFF', fontWeight: '700' }}>${calculateFinalTotal().toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={isLoading || !amount}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: orderType === 'buy' ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: isLoading || !amount ? 'not-allowed' : 'pointer',
                    opacity: isLoading || !amount ? 0.5 : 1,
                    transition: 'all 0.3s',
                    boxShadow: orderType === 'buy' ? '0 0 30px rgba(34, 197, 94, 0.4)' : '0 0 30px rgba(239, 68, 68, 0.4)'
                  }}
                >
                  {isLoading ? 'Processing...' : `${orderType.toUpperCase()} ${tradingPairs.find(p => p.symbol === selectedPair)?.base || 'Crypto'}`}
                </button>
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
