import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import CHXButton from '@/components/CHXButton';
import { IoTrendingUp, IoTrendingDown, IoFlash, IoCheckmarkCircle } from 'react-icons/io5';
import { HiChartBar, HiClock, HiCurrencyDollar } from 'react-icons/hi';

// FRESH API CONFIGURATION - USE ENVIRONMENT VARIABLE
const API_BASE = process.env.REACT_APP_BACKEND_URL + '/api';

export default function SpotTradingFresh() {
  console.log('🚀 SpotTradingFresh component loaded!');
  const navigate = useNavigate();
  
  // Core State
  const [user, setUser] = useState(null);
  const [tradingPairs, setTradingPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderBookData, setOrderBookData] = useState({ bids: [], asks: [] });
  const [userBalances, setUserBalances] = useState({});
  const [recentTrades, setRecentTrades] = useState([]);
  
  // Trading State
  const [tradeType, setTradeType] = useState('buy'); // 'buy' or 'sell'
  const [tradeAmount, setTradeAmount] = useState('');
  const [tradePrice, setTradePrice] = useState('');
  const [orderType, setOrderType] = useState('market'); // 'market' or 'limit'
  
  // Chart State
  const chartRef = useRef(null);
  const [priceData, setPriceData] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  
  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        console.log('✅ User loaded:', parsedUser.email);
      } else {
        console.log('❌ No user found - redirecting to auth');
        navigate('/auth');
        return;
      }
    } catch (error) {
      console.error('Error loading user:', error);
      navigate('/auth');
      return;
    }
  }, [navigate]);
  
  // Fetch trading pairs
  const fetchTradingPairs = async () => {
    try {
      console.log('🔄 Fetching trading pairs from:', `${API_BASE}/trading/pairs`);
      const response = await axios.get(`${API_BASE}/trading/pairs`);
      console.log('📊 Trading pairs response:', response.data);
      
      if (response.data.success && response.data.pairs) {
        const pairs = response.data.pairs;
        setTradingPairs(pairs);
        
        // Set default pair if none selected
        if (pairs.length > 0 && !selectedPair) {
          const defaultPair = pairs.find(p => p.symbol === 'BTC/USDT') || pairs[0];
          setSelectedPair(defaultPair);
          console.log('🎯 Default pair selected:', defaultPair.symbol);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching trading pairs:', error);
      toast.error('Failed to load trading pairs');
    }
  };
  
  // Fetch user balances
  const fetchUserBalances = async () => {
    if (!user?.user_id) return;
    
    try {
      const response = await axios.get(`${API_BASE}/wallet/balances?user_id=${user.user_id}`);
      if (response.data.success) {
        setUserBalances(response.data.balances);
        console.log('💰 User balances loaded');
      }
    } catch (error) {
      console.error('❌ Error fetching balances:', error);
    }
  };
  
  // Fetch order book data
  const fetchOrderBook = async () => {
    if (!selectedPair) return;
    
    try {
      // Simulate order book data for now
      const bids = [
        { price: 43250, amount: 0.5, total: 21625 },
        { price: 43240, amount: 1.2, total: 51888 },
        { price: 43230, amount: 0.8, total: 34584 },
        { price: 43220, amount: 2.1, total: 90762 },
        { price: 43210, amount: 0.3, total: 12963 },
      ];
      
      const asks = [
        { price: 43260, amount: 0.7, total: 30282 },
        { price: 43270, amount: 1.5, total: 64905 },
        { price: 43280, amount: 0.9, total: 38952 },
        { price: 43290, amount: 1.8, total: 77922 },
        { price: 43300, amount: 0.6, total: 25980 },
      ];
      
      setOrderBookData({ bids, asks });
    } catch (error) {
      console.error('❌ Error fetching order book:', error);
    }
  };
  
  // Fetch recent trades
  const fetchRecentTrades = async () => {
    try {
      // Simulate recent trades data
      const trades = [
        { price: 43255, amount: 0.025, time: '14:23:45', type: 'buy' },
        { price: 43250, amount: 0.150, time: '14:23:42', type: 'sell' },
        { price: 43260, amount: 0.075, time: '14:23:38', type: 'buy' },
        { price: 43245, amount: 0.200, time: '14:23:35', type: 'sell' },
        { price: 43255, amount: 0.100, time: '14:23:30', type: 'buy' },
      ];
      
      setRecentTrades(trades);
    } catch (error) {
      console.error('❌ Error fetching recent trades:', error);
    }
  };
  
  // Initialize data when user and pairs are ready
  useEffect(() => {
    if (user) {
      fetchTradingPairs();
      fetchUserBalances();
    }
  }, [user]);
  
  // Fetch additional data when pair is selected
  useEffect(() => {
    if (selectedPair) {
      fetchOrderBook();
      fetchRecentTrades();
      
      // Set current price from selected pair
      if (selectedPair.current_price) {
        setCurrentPrice(selectedPair.current_price);
        setTradePrice(selectedPair.current_price);
      }
    }
  }, [selectedPair]);
  
  // Mark loading as complete when data is ready
  useEffect(() => {
    if (user && tradingPairs.length > 0) {
      setLoading(false);
    }
  }, [user, tradingPairs]);
  
  // Handle pair selection
  const handlePairSelect = (pair) => {
    setSelectedPair(pair);
    setTradePrice(pair.current_price || '');
    console.log('🔄 Pair selected:', pair.symbol);
    toast.success(`Switched to ${pair.symbol}`);
  };
  
  // Handle trade submission
  const handleTradeSubmit = async () => {
    if (!selectedPair || !tradeAmount || (!tradePrice && orderType === 'limit')) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      const tradeData = {
        user_id: user.user_id,
        pair: selectedPair.symbol,
        type: tradeType,
        amount: parseFloat(tradeAmount),
        price: orderType === 'market' ? null : parseFloat(tradePrice),
        order_type: orderType
      };
      
      console.log('🚀 Submitting trade:', tradeData);
      
      const response = await axios.post(`${API_BASE}/trading/orders`, tradeData);
      
      if (response.data.success) {
        toast.success(`${tradeType.toUpperCase()} order placed successfully!`);
        setTradeAmount('');
        fetchUserBalances(); // Refresh balances
      } else {
        toast.error(response.data.message || 'Trade failed');
      }
    } catch (error) {
      console.error('❌ Trade error:', error);
      toast.error('Failed to place order');
    }
  };
  
  // Format currency values
  const formatCurrency = (value, currency = 'USD') => {
    if (!value) return '0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(value);
  };
  
  const formatPrice = (price) => {
    if (!price) return '0.00';
    return parseFloat(price).toFixed(2);
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading trading interface...</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="p-6 min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <IoFlash className="text-cyan-400 text-2xl" />
            <h1 className="text-3xl font-bold text-white">Spot Trading</h1>
          </div>
          <p className="text-gray-400">Trade crypto with professional-grade tools</p>
        </div>
        
        {/* Trading Pair Selector */}
        <div className="mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-cyan-400 mb-1">SELECT TRADING PAIR</h3>
                {selectedPair && (
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-white">{selectedPair.symbol}</span>
                    <span className="text-lg text-green-400">{formatPrice(currentPrice)}</span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      priceChange >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Trading Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* Trading Pairs List */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 h-96 overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <HiChartBar className="text-cyan-400" />
                  Trading Pairs
                </h3>
              </div>
              
              <div className="h-80 overflow-y-auto">
                {tradingPairs.map((pair) => (
                  <div
                    key={pair.symbol}
                    onClick={() => handlePairSelect(pair)}
                    className={`p-3 border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/30 transition-colors ${
                      selectedPair?.symbol === pair.symbol ? 'bg-cyan-500/10 border-l-4 border-l-cyan-400' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-white text-sm">{pair.base}/{pair.quote}</div>
                        <div className="text-xs text-gray-400">Vol: ${pair.available_liquidity?.toFixed(0) || '0'}</div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-white">{formatPrice(pair.current_price || 0)}</div>
                        <div className={`text-xs ${
                          (pair.price_change_24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {(pair.price_change_24h || 0) >= 0 ? '+' : ''}{(pair.price_change_24h || 0).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Chart Area */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 h-96">
              <div className="p-4 border-b border-slate-700">
                <h3 className="font-semibold text-white">
                  {selectedPair ? `${selectedPair.symbol} Chart` : 'Select a trading pair'}
                </h3>
              </div>
              
              <div className="h-80 flex items-center justify-center" ref={chartRef}>
                {selectedPair ? (
                  <div className="text-center">
                    <div className="text-4xl text-cyan-400 mb-2">{formatPrice(currentPrice)}</div>
                    <div className="text-gray-400">Chart integration coming soon</div>
                    <div className="mt-4 text-sm text-gray-500">
                      TradingView chart will be integrated here
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <HiChartBar className="text-4xl mx-auto mb-2 opacity-50" />
                    <p>Select a trading pair to view chart</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Order Book */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 h-96 overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <HiCurrencyDollar className="text-cyan-400" />
                  Order Book
                </h3>
              </div>
              
              <div className="h-80 overflow-y-auto">
                {/* Asks (Sell Orders) */}
                <div className="mb-2">
                  <div className="px-3 py-1 text-xs text-gray-400 bg-slate-900/50">
                    ASKS (SELL)
                  </div>
                  {orderBookData.asks.map((ask, idx) => (
                    <div key={`ask-${idx}`} className="px-3 py-1 text-xs hover:bg-slate-700/30">
                      <div className="flex justify-between text-red-400">
                        <span>{ask.price.toFixed(2)}</span>
                        <span>{ask.amount.toFixed(4)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Current Price */}
                <div className="px-3 py-2 text-center border-y border-slate-600">
                  <div className="text-lg font-bold text-white">{formatPrice(currentPrice)}</div>
                  <div className="text-xs text-gray-400">Current Price</div>
                </div>
                
                {/* Bids (Buy Orders) */}
                <div className="mt-2">
                  <div className="px-3 py-1 text-xs text-gray-400 bg-slate-900/50">
                    BIDS (BUY)
                  </div>
                  {orderBookData.bids.map((bid, idx) => (
                    <div key={`bid-${idx}`} className="px-3 py-1 text-xs hover:bg-slate-700/30">
                      <div className="flex justify-between text-green-400">
                        <span>{bid.price.toFixed(2)}</span>
                        <span>{bid.amount.toFixed(4)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Trading Panel & Recent Trades */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trading Panel */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700">
              <div className="p-4 border-b border-slate-700">
                <h3 className="font-semibold text-white">Place Order</h3>
              </div>
              
              <div className="p-4">
                {/* Order Type Tabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setTradeType('buy')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      tradeType === 'buy'
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    BUY
                  </button>
                  
                  <button
                    onClick={() => setTradeType('sell')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      tradeType === 'sell'
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    SELL
                  </button>
                  
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => setOrderType('market')}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        orderType === 'market'
                          ? 'bg-cyan-500 text-white'
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      Market
                    </button>
                    
                    <button
                      onClick={() => setOrderType('limit')}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        orderType === 'limit'
                          ? 'bg-cyan-500 text-white'
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      Limit
                    </button>
                  </div>
                </div>
                
                {/* Order Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Amount ({selectedPair?.base || 'BTC'})
                    </label>
                    <input
                      type="number"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  
                  {orderType === 'limit' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Price ({selectedPair?.quote || 'USDT'})
                      </label>
                      <input
                        type="number"
                        value={tradePrice}
                        onChange={(e) => setTradePrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  )}
                  
                  {orderType === 'market' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Market Price
                      </label>
                      <div className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-gray-400">
                        ~{formatPrice(currentPrice)}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Total and Submit */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-300 mb-3">
                    <span>Total:</span>
                    <span>
                      {tradeAmount && (orderType === 'market' ? currentPrice : tradePrice)
                        ? `${(parseFloat(tradeAmount) * parseFloat(orderType === 'market' ? currentPrice : tradePrice)).toFixed(2)} ${selectedPair?.quote || 'USDT'}`
                        : '0.00'}
                    </span>
                  </div>
                  
                  <CHXButton
                    onClick={handleTradeSubmit}
                    className={`w-full py-3 font-semibold ${
                      tradeType === 'buy'
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                    disabled={!selectedPair || !tradeAmount}
                  >
                    {tradeType === 'buy' ? 'BUY' : 'SELL'} {selectedPair?.base || 'BTC'}
                  </CHXButton>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recent Trades */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700">
              <div className="p-4 border-b border-slate-700">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <HiClock className="text-cyan-400" />
                  Recent Trades
                </h3>
              </div>
              
              <div className="p-4">
                <div className="space-y-2">
                  {recentTrades.map((trade, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <div className={`font-medium ${
                        trade.type === 'buy' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatPrice(trade.price)}
                      </div>
                      
                      <div className="text-gray-300">
                        {trade.amount.toFixed(4)}
                      </div>
                      
                      <div className="text-gray-400 text-xs">
                        {trade.time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Balance Display */}
        {Object.keys(userBalances).length > 0 && (
          <div className="mt-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
              <h3 className="font-semibold text-white mb-3">Available Balances</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Object.entries(userBalances).map(([currency, balance]) => (
                  <div key={currency} className="text-center">
                    <div className="text-sm text-gray-400">{currency}</div>
                    <div className="font-medium text-white">{balance?.toFixed(6) || '0.00'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}