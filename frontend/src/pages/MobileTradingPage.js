import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { getCoinName } from '@/config/tradingPairs';
import { getCryptoEmoji, getCryptoColor } from '@/utils/cryptoIcons';
import { IoArrowBack, IoTrendingUp, IoTrendingDown, IoChevronDown, IoSearch, IoClose } from 'react-icons/io5';
import DOMPurify from 'dompurify';

const API = process.env.REACT_APP_BACKEND_URL || '';

// All supported currencies with symbols
const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', popular: true },
  { code: 'EUR', symbol: '€', name: 'Euro', popular: true },
  { code: 'GBP', symbol: '£', name: 'British Pound', popular: true },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', popular: false },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', popular: false },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', popular: false },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', popular: false },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', popular: false },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', popular: false },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', popular: false },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', popular: false },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', popular: false },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', popular: false },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', popular: false },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', popular: false },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', popular: false },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', popular: false },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', popular: false },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', popular: false },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', popular: false },
];

export default function MobileTradingPage() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  
  // Market data
  const [marketStats, setMarketStats] = useState({
    lastPrice: 0,
    change24h: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    marketCap: 0
  });
  
  // Order state
  const [orderType, setOrderType] = useState('market'); // 'market' | 'limit'
  const [orderSide, setOrderSide] = useState('buy'); // 'buy' | 'sell'
  const [quoteCurrency, setQuoteCurrency] = useState('USD'); // Selected quote currency
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  
  // For MARKET orders: spend/receive mode
  const [marketMode, setMarketMode] = useState('spend'); // 'spend' (quote) | 'receive' (base)
  const [spendAmount, setSpendAmount] = useState(''); // Amount in quote currency
  const [receiveAmount, setReceiveAmount] = useState(''); // Amount in base asset
  
  // For LIMIT orders
  const [limitPrice, setLimitPrice] = useState('');
  const [limitAmount, setLimitAmount] = useState(''); // Base asset amount
  
  // Other state
  const [isLoading, setIsLoading] = useState(false);
  const [coinBase, setCoinBase] = useState('');
  const [coinName, setCoinName] = useState('');
  const [balance, setBalance] = useState({ quote: 0, base: 0 });
  const [tradingFee, setTradingFee] = useState(0.1);
  const [exchangeRates, setExchangeRates] = useState({ USD: 1 });
  
  // Fetch forex rates from backend
  useEffect(() => {
    const fetchForexRates = async () => {
      try {
        const response = await axios.get(`${API}/api/forex/rates`);
        if (response.data.success && response.data.rates) {
          setExchangeRates(response.data.rates);
          console.log('📊 Forex rates loaded from backend:', response.data.rates);
        }
      } catch (error) {
        console.error('Error fetching forex rates:', error);
      }
    };
    
    fetchForexRates();
    // Refresh forex rates every 60 seconds
    const interval = setInterval(fetchForexRates, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (symbol) {
      const base = symbol.replace('USD', '');
      setCoinBase(base);
      setCoinName(getCoinName(base));
      fetchMarketData(base);
      fetchBalance();
      fetchTradingFee();
      
      const interval = setInterval(() => fetchMarketData(base), 30000);
      
      setTimeout(() => {
        loadTradingViewChart(symbol);
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [symbol]);

  const fetchMarketData = async (base) => {
    try {
      const response = await axios.get(`${API}/api/prices/live`);
      if (response.data.success && response.data.prices) {
        const priceData = response.data.prices[base];
        if (priceData) {
          setMarketStats({
            lastPrice: priceData.price_usd || 0,
            change24h: priceData.change_24h || 0,
            high24h: priceData.high_24h || priceData.price_usd * 1.02,
            low24h: priceData.low_24h || priceData.price_usd * 0.98,
            volume24h: priceData.volume_24h || 0,
            marketCap: priceData.market_cap || 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  };

  const fetchBalance = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get(`${API}/api/wallet/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        const balances = response.data.balances || response.data;
        setBalance({
          quote: balances.USD || balances.usd || 0,
          base: balances[coinBase] || 0
        });
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchTradingFee = async () => {
    try {
      const response = await axios.get(`${API}/api/trading/fee`);
      if (response.data?.fee) {
        setTradingFee(response.data.fee);
      }
    } catch (error) {
      console.log('Using default trading fee');
    }
  };

  const loadTradingViewChart = (pair) => {
    const container = document.getElementById('tradingview_chart');
    if (!container) return;
    
    container.innerHTML = '';
    
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      "autosize": true,
      "symbol": `BINANCE:${pair}`,
      "interval": "15",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "backgroundColor": "rgba(5, 8, 18, 1)",
      "gridColor": "rgba(15, 242, 242, 0.06)",
      "hide_top_toolbar": true,
      "hide_legend": true,
      "allow_symbol_change": false,
      "save_image": false,
      "calendar": false,
      "hide_volume": true,
      "support_host": "https://www.tradingview.com"
    });
    
    container.appendChild(script);
  };

  // Get current currency info
  const getCurrency = () => CURRENCIES.find(c => c.code === quoteCurrency) || CURRENCIES[0];
  
  // Convert USD price to selected quote currency
  const convertPrice = (usdPrice) => {
    if (quoteCurrency === 'USD') return usdPrice;
    const rate = exchangeRates[quoteCurrency] || 1;
    return usdPrice * rate;
  };
  
  // Get price in quote currency
  const priceInQuote = convertPrice(marketStats.lastPrice);
  const high24hInQuote = convertPrice(marketStats.high24h);
  const low24hInQuote = convertPrice(marketStats.low24h);
  
  // Calculate estimates for market orders
  const getMarketEstimates = () => {
    if (marketMode === 'spend' && spendAmount && priceInQuote > 0) {
      const spend = parseFloat(spendAmount) || 0;
      const baseReceived = spend / priceInQuote;
      const fee = spend * (tradingFee / 100);
      return { baseAmount: baseReceived, fee, total: spend };
    } else if (marketMode === 'receive' && receiveAmount && priceInQuote > 0) {
      const receive = parseFloat(receiveAmount) || 0;
      const quoteNeeded = receive * priceInQuote;
      const fee = quoteNeeded * (tradingFee / 100);
      return { baseAmount: receive, fee, total: quoteNeeded + fee };
    }
    return { baseAmount: 0, fee: 0, total: 0 };
  };
  
  // Calculate total for limit orders
  const getLimitTotal = () => {
    const price = parseFloat(limitPrice) || 0;
    const amount = parseFloat(limitAmount) || 0;
    const subtotal = price * amount;
    const fee = subtotal * (tradingFee / 100);
    return { subtotal, fee, total: subtotal + fee };
  };
  
  const marketEstimates = getMarketEstimates();
  const limitCalc = getLimitTotal();
  
  // Get available balance in quote currency
  const getQuoteBalance = () => {
    if (quoteCurrency === 'USD') return balance.quote;
    const rate = exchangeRates[quoteCurrency] || 1;
    return balance.quote * rate;
  };

  const handleTrade = async (side) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Please login to trade');
        navigate('/login');
        return;
      }
      
      // Get user_id from token
      const userData = JSON.parse(localStorage.getItem('cryptobank_user') || '{}');
      const userId = userData.user_id;
      
      if (!userId) {
        toast.error('User session invalid. Please login again.');
        navigate('/login');
        return;
      }
      
      let tradeAmount;
      let tradePrice = null;
      
      if (orderType === 'market') {
        tradeAmount = marketEstimates.baseAmount;
      } else {
        tradeAmount = parseFloat(limitAmount) || 0;
        tradePrice = parseFloat(limitPrice) || 0;
      }
      
      if (!tradeAmount || tradeAmount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      
      // Use new backend-authoritative endpoint
      const response = await axios.post(
        `${API}/api/trading/order`,
        {
          user_id: userId,
          side: side,
          order_type: orderType,
          base_asset: coinBase,
          quote_currency: quoteCurrency,
          amount: tradeAmount,
          price: tradePrice
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        const exec = response.data.execution;
        toast.success(
          `${side.toUpperCase()} ${tradeAmount.toFixed(6)} ${coinBase} @ ${currency.symbol}${exec.price.toFixed(2)} (Fee: ${currency.symbol}${exec.fee.toFixed(2)})`
        );
        setSpendAmount('');
        setReceiveAmount('');
        setLimitAmount('');
        setLimitPrice('');
        fetchBalance();
      } else {
        toast.error(response.data.message || 'Order failed');
      }
    } catch (error) {
      console.error('Trading error:', error);
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle percent button click
  const handlePercentClick = (percent) => {
    if (orderSide === 'buy') {
      // Buying: use quote balance
      const available = getQuoteBalance();
      const targetAmount = (available * percent) / 100;
      if (orderType === 'market') {
        setMarketMode('spend');
        setSpendAmount(targetAmount.toFixed(2));
      } else {
        // For limit: calculate base amount from price
        const price = parseFloat(limitPrice) || priceInQuote;
        if (price > 0) {
          setLimitAmount((targetAmount / price).toFixed(6));
        }
      }
    } else {
      // Selling: use base balance
      const available = balance.base;
      const targetAmount = (available * percent) / 100;
      if (orderType === 'market') {
        setMarketMode('receive');
        setReceiveAmount(targetAmount.toFixed(6));
      } else {
        setLimitAmount(targetAmount.toFixed(6));
      }
    }
  };

  const rangePercentage = marketStats.high24h > 0 && marketStats.low24h > 0
    ? ((marketStats.lastPrice - marketStats.low24h) / (marketStats.high24h - marketStats.low24h)) * 100
    : 50;

  const currency = getCurrency();
  
  // Filter currencies for picker
  const filteredCurrencies = CURRENCIES.filter(c => 
    c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
    c.name.toLowerCase().includes(currencySearch.toLowerCase())
  );
  const popularCurrencies = filteredCurrencies.filter(c => c.popular);
  const otherCurrencies = filteredCurrencies.filter(c => !c.popular);

  return (
    <>
      <style>
        {`
          .main-content {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
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
          [class*="chat-widget"],
          [id*="chat-widget"],
          [class*="ChatWidget"],
          .tawk-min-container {
            bottom: 100px !important;
            right: 16px !important;
            z-index: 999 !important;
          }
        `}
      </style>
      <div style={{
        width: '100%',
        background: '#020617',
        minHeight: '100vh',
        paddingBottom: '100px'
      }}>
        {/* Header with Back Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          position: 'sticky',
          top: 0,
          background: 'linear-gradient(180deg, #020617 0%, #030A15 100%)',
          zIndex: 10
        }}>
          <button
            onClick={() => navigate('/markets')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0FF2F2',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            <IoArrowBack />
          </button>
          <div style={{ flex: 1, marginLeft: '8px' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>
              {coinName} / {quoteCurrency}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              Spot Trading
            </div>
          </div>
        </div>

        {/* PAIR HEADER */}
        <div style={{
          margin: '12px 16px',
          padding: '16px',
          borderRadius: '12px',
          background: 'linear-gradient(180deg, #0A0F1F 0%, #050812 100%)',
          border: '1px solid rgba(15,242,242,0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src={`/crypto-logos/${coinBase.toLowerCase()}.png`}
              alt={coinBase}
              style={{ width: '40px', height: '40px', objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#fff' }}>
                {currency.symbol}{priceInQuote > 0 
                  ? priceInQuote >= 1
                    ? priceInQuote.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : priceInQuote.toFixed(6)
                  : '—'}
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: marketStats.change24h >= 0 ? '#00FF94' : '#FF4B4B',
                fontWeight: '600'
              }}>
                {marketStats.change24h >= 0 ? '+' : ''}{marketStats.change24h.toFixed(2)}%
              </div>
            </div>
          </div>
          
          {/* 24h Range - INFORMATIONAL ONLY */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ 
              fontSize: '11px', 
              color: 'rgba(255,255,255,0.5)', 
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>24h Range</span>
              <span>{currency.symbol}{low24hInQuote.toFixed(2)} — {currency.symbol}{high24hInQuote.toFixed(2)}</span>
            </div>
            <div style={{
              position: 'relative',
              height: '6px',
              borderRadius: '3px',
              background: 'rgba(255,255,255,0.1)'
            }}>
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${rangePercentage}%`,
                background: 'linear-gradient(90deg, #FF4B4B, #FFD700, #00FF94)',
                borderRadius: '3px'
              }} />
              <div style={{
                position: 'absolute',
                left: `${rangePercentage}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '10px',
                height: '10px',
                background: '#0FF2F2',
                borderRadius: '50%',
                border: '2px solid #020617'
              }} />
            </div>
          </div>
        </div>

        {/* CHART */}
        <div style={{ height: '200px', margin: '0 16px 16px 16px', background: '#050812', borderRadius: '12px', overflow: 'hidden' }}>
          <div id="tradingview_chart" style={{ height: '100%', width: '100%' }} />
        </div>

        {/* ORDER FORM */}
        <div style={{
          margin: '0 16px',
          background: 'linear-gradient(180deg, #0A0F1F 0%, #050812 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '16px'
        }}>
          {/* Market / Limit Toggle */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={() => setOrderType('market')}
              style={{
                flex: 1,
                height: '40px',
                borderRadius: '10px',
                background: orderType === 'market'
                  ? 'linear-gradient(135deg, #0FF2F2 0%, #00B8D4 100%)'
                  : 'rgba(15,242,242,0.1)',
                color: orderType === 'market' ? '#020617' : '#0FF2F2',
                border: orderType === 'market' ? 'none' : '1px solid rgba(15,242,242,0.3)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Market
            </button>
            <button
              onClick={() => setOrderType('limit')}
              style={{
                flex: 1,
                height: '40px',
                borderRadius: '10px',
                background: orderType === 'limit'
                  ? 'linear-gradient(135deg, #0FF2F2 0%, #00B8D4 100%)'
                  : 'rgba(15,242,242,0.1)',
                color: orderType === 'limit' ? '#020617' : '#0FF2F2',
                border: orderType === 'limit' ? 'none' : '1px solid rgba(15,242,242,0.3)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Limit
            </button>
          </div>

          {/* Quote Currency Selector */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Quote Currency</div>
            <button
              onClick={() => setShowCurrencyPicker(true)}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '10px',
                background: '#0F172A',
                border: '1px solid rgba(15,242,242,0.3)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 14px'
              }}
            >
              <span>{currency.symbol} {quoteCurrency} — {currency.name}</span>
              <IoChevronDown color="#0FF2F2" />
            </button>
          </div>

          {/* Balance Display */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '12px',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.6)'
          }}>
            <div>Available: {currency.symbol}{getQuoteBalance().toFixed(2)} {quoteCurrency}</div>
            <div>Available: {balance.base.toFixed(6)} {coinBase}</div>
          </div>

          {/* ORDER TYPE SPECIFIC FIELDS */}
          {orderType === 'market' ? (
            // MARKET ORDER FIELDS
            <>
              {/* Spend/Receive Toggle */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                  onClick={() => setMarketMode('spend')}
                  style={{
                    flex: 1,
                    height: '32px',
                    borderRadius: '8px',
                    background: marketMode === 'spend' ? 'rgba(15,242,242,0.2)' : 'transparent',
                    border: `1px solid ${marketMode === 'spend' ? 'rgba(15,242,242,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    color: marketMode === 'spend' ? '#0FF2F2' : 'rgba(255,255,255,0.5)',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Spend ({quoteCurrency})
                </button>
                <button
                  onClick={() => setMarketMode('receive')}
                  style={{
                    flex: 1,
                    height: '32px',
                    borderRadius: '8px',
                    background: marketMode === 'receive' ? 'rgba(15,242,242,0.2)' : 'transparent',
                    border: `1px solid ${marketMode === 'receive' ? 'rgba(15,242,242,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    color: marketMode === 'receive' ? '#0FF2F2' : 'rgba(255,255,255,0.5)',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Receive ({coinBase})
                </button>
              </div>

              {/* Amount Input */}
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                  {marketMode === 'spend' ? `Spend (${quoteCurrency})` : `Receive (${coinBase})`}
                </div>
                <input
                  type="number"
                  placeholder={marketMode === 'spend' ? `0.00` : `0.000000`}
                  value={marketMode === 'spend' ? spendAmount : receiveAmount}
                  onChange={(e) => {
                    if (marketMode === 'spend') {
                      setSpendAmount(e.target.value);
                      setReceiveAmount('');
                    } else {
                      setReceiveAmount(e.target.value);
                      setSpendAmount('');
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '48px',
                    borderRadius: '10px',
                    background: '#0F172A',
                    border: '1px solid rgba(255,255,255,0.12)',
                    padding: '0 60px 0 16px',
                    color: '#fff',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
                <span style={{
                  position: 'absolute',
                  right: '16px',
                  bottom: '14px',
                  color: '#0FF2F2',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {marketMode === 'spend' ? quoteCurrency : coinBase}
                </span>
              </div>

              {/* Market Estimates */}
              {(spendAmount || receiveAmount) && marketEstimates.baseAmount > 0 && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(15,242,242,0.08)',
                  borderRadius: '10px',
                  marginBottom: '12px',
                  fontSize: '13px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Est. Price:</span>
                    <span style={{ color: '#fff' }}>{currency.symbol}{priceInQuote.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Est. {coinBase}:</span>
                    <span style={{ color: '#0FF2F2' }}>{marketEstimates.baseAmount.toFixed(6)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Fee ({tradingFee}%):</span>
                    <span style={{ color: '#fff' }}>{currency.symbol}{marketEstimates.fee.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            // LIMIT ORDER FIELDS
            <>
              {/* Limit Price */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                  Limit Price ({quoteCurrency})
                </div>
                <input
                  type="number"
                  placeholder={priceInQuote.toFixed(2)}
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  style={{
                    width: '100%',
                    height: '48px',
                    borderRadius: '10px',
                    background: '#0F172A',
                    border: '1px solid rgba(255,255,255,0.12)',
                    padding: '0 60px 0 16px',
                    color: '#fff',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
                <span style={{
                  position: 'absolute',
                  right: '32px',
                  marginTop: '-34px',
                  color: '#0FF2F2',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {quoteCurrency}
                </span>
              </div>

              {/* Amount (Base) */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                  Amount ({coinBase})
                </div>
                <input
                  type="number"
                  placeholder="0.000000"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  style={{
                    width: '100%',
                    height: '48px',
                    borderRadius: '10px',
                    background: '#0F172A',
                    border: '1px solid rgba(255,255,255,0.12)',
                    padding: '0 60px 0 16px',
                    color: '#fff',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
                <span style={{
                  position: 'absolute',
                  right: '32px',
                  marginTop: '-34px',
                  color: '#0FF2F2',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {coinBase}
                </span>
              </div>

              {/* Total (Read-only) */}
              {limitPrice && limitAmount && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(15,242,242,0.08)',
                  borderRadius: '10px',
                  marginBottom: '12px',
                  fontSize: '13px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Subtotal:</span>
                    <span style={{ color: '#fff' }}>{currency.symbol}{limitCalc.subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Fee ({tradingFee}%):</span>
                    <span style={{ color: '#fff' }}>{currency.symbol}{limitCalc.fee.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
                    <span style={{ color: '#0FF2F2', fontWeight: '700' }}>Total ({quoteCurrency}):</span>
                    <span style={{ color: '#0FF2F2', fontWeight: '700' }}>{currency.symbol}{limitCalc.total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Percent Buttons */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textAlign: 'center' }}>
              {orderSide === 'buy' ? `Using % of ${quoteCurrency} balance` : `Using % of ${coinBase} balance`}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[25, 50, 75, 100].map(percent => (
                <button
                  key={percent}
                  onClick={() => handlePercentClick(percent)}
                  style={{
                    flex: 1,
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(15,242,242,0.1)',
                    border: '1px solid rgba(15,242,242,0.3)',
                    color: '#0FF2F2',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {percent}%
                </button>
              ))}
            </div>
          </div>

          {/* ============================================================
              ⛔ VISUAL LOCK ACTIVE - DO NOT MODIFY ⛔
              Password required to change: 21083
              ============================================================ */}
          
          {/* BUY and SELL Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => { setOrderSide('buy'); handleTrade('buy'); }}
              disabled={isLoading}
              style={{
                flex: 1,
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(180deg, rgba(32, 227, 162, 0.15) 0%, rgba(32, 227, 162, 0.35) 100%)',
                border: '1px solid rgba(32, 227, 162, 0.5)',
                color: '#20E3A2',
                fontSize: '15px',
                fontWeight: '700',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.3)',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? 'Processing...' : `Buy ${coinBase}`}
            </button>
            <button
              onClick={() => { setOrderSide('sell'); handleTrade('sell'); }}
              disabled={isLoading}
              style={{
                flex: 1,
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(180deg, rgba(255, 50, 80, 0.15) 0%, rgba(255, 50, 80, 0.45) 100%)',
                border: '1px solid rgba(255, 50, 80, 0.5)',
                color: '#ff3250',
                fontSize: '15px',
                fontWeight: '700',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 15px rgba(255, 50, 80, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3)',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? 'Processing...' : `Sell ${coinBase}`}
            </button>
          </div>
        </div>
      </div>

      {/* Currency Picker Modal */}
      {showCurrencyPicker && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            background: '#0A0F1F',
            borderRadius: '16px 16px 0 0',
            marginTop: 'auto',
            maxHeight: '70vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>Select Currency</span>
              <button
                onClick={() => setShowCurrencyPicker(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}
              >
                <IoClose />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '12px 16px' }}>
              <div style={{ position: 'relative' }}>
                <IoSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type="text"
                  placeholder="Search currency"
                  value={currencySearch}
                  onChange={(e) => setCurrencySearch(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: '10px',
                    background: '#0F172A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '0 16px 0 40px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Currency List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px 16px' }}>
              {popularCurrencies.length > 0 && (
                <>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '600' }}>POPULAR</div>
                  {popularCurrencies.map(c => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setQuoteCurrency(c.code);
                        setShowCurrencyPicker(false);
                        setCurrencySearch('');
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: quoteCurrency === c.code ? 'rgba(15,242,242,0.15)' : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <span style={{ fontSize: '18px', width: '24px' }}>{c.symbol}</span>
                      <span style={{ fontWeight: '600' }}>{c.code}</span>
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>{c.name}</span>
                    </button>
                  ))}
                </>
              )}
              {otherCurrencies.length > 0 && (
                <>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', marginTop: '16px', fontWeight: '600' }}>ALL CURRENCIES</div>
                  {otherCurrencies.map(c => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setQuoteCurrency(c.code);
                        setShowCurrencyPicker(false);
                        setCurrencySearch('');
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: quoteCurrency === c.code ? 'rgba(15,242,242,0.15)' : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <span style={{ fontSize: '18px', width: '24px' }}>{c.symbol}</span>
                      <span style={{ fontWeight: '600' }}>{c.code}</span>
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>{c.name}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
