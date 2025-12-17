import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { getCoinName } from '@/config/tradingPairs';
import { getCryptoEmoji, getCryptoColor } from '@/utils/cryptoIcons';
import { IoArrowBack, IoTrendingUp, IoTrendingDown } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL || '';

export default function MobileTradingPage() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [marketStats, setMarketStats] = useState({
    lastPrice: 0,
    change24h: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    marketCap: 0
  });
  const [amount, setAmount] = useState('');
  const [orderType, setOrderType] = useState('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [coinBase, setCoinBase] = useState('');
  const [coinName, setCoinName] = useState('');
  const [balance, setBalance] = useState({ usd: 0, coin: 0, gbp: 0 });
  const [tradingFee, setTradingFee] = useState(0.1);
  const [inputCurrency, setInputCurrency] = useState('USD');
  const [currencyAmount, setCurrencyAmount] = useState('');
  const [exchangeRates, setExchangeRates] = useState({ GBP: 0.79, EUR: 0.92 });

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
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const balances = response.data.balances || {};
        setBalance({
          usd: balances.USD || 0,
          coin: balances[coinBase] || 0
        });
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
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

  const loadTradingViewChart = (pairSymbol) => {
    const container = document.getElementById('tradingview-chart-mobile');
    if (!container) return;
    container.innerHTML = '';

    const tvSymbol = pairSymbol.replace('USD', 'USDT');

    const widgetHTML = `
      <div class="tradingview-widget-container" style="height:100%;width:100%;background:transparent">
        <div class="tradingview-widget-container__widget" style="height:100%;width:100%;background:transparent"></div>
        <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
        {
          "autosize": true,
          "symbol": "BINANCE:${tvSymbol}",
          "interval": "15",
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "enable_publishing": false,
          "backgroundColor": "rgba(2, 6, 23, 1)",
          "gridColor": "rgba(255, 255, 255, 0.05)",
          "hide_top_toolbar": false,
          "hide_legend": true,
          "save_image": false,
          "hide_volume": false,
          "support_host": "https://www.tradingview.com",
          "studies": [
            "RSI@tv-basicstudies",
            "MASimple@tv-basicstudies"
          ]
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

  const handleTrade = async (side) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to trade');
      navigate('/login');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      toast.error('Please enter a valid limit price');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        pair: symbol,
        side: side,
        amount: parseFloat(amount),
        order_type: orderType,
        price: orderType === 'limit' ? parseFloat(limitPrice) : marketStats.lastPrice
      };

      const response = await axios.post(
        `${API}/api/trading/spot/order`,
        payload,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(`${side.toUpperCase()} order placed successfully!`);
        setAmount('');
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

  const calculateTotal = () => {
    const amt = parseFloat(amount) || 0;
    const price = orderType === 'limit' ? (parseFloat(limitPrice) || 0) : marketStats.lastPrice;
    const subtotal = amt * price;
    const fee = subtotal * (tradingFee / 100);
    return { subtotal, fee, total: subtotal + fee };
  };

  const { subtotal, fee, total } = calculateTotal();

  const rangePercentage = marketStats.high24h > 0 && marketStats.low24h > 0
    ? ((marketStats.lastPrice - marketStats.low24h) / (marketStats.high24h - marketStats.low24h)) * 100
    : 50;

  return (
    <Layout>
      <style>
        {`
          .main-content {
            padding: 0 !important;
            margin: 0 !important;
            overflow: hidden !important;
          }
          .trading-layout {
            display: flex;
            flex-direction: row;
            height: calc(100vh - 48px);
            width: 100%;
            overflow: hidden;
            background: #020617;
          }
          .trading-main {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .chart-wrap {
            flex: 1;
            min-height: 500px;
            width: 100%;
            overflow: hidden;
          }
          .chart-wrap > *,
          .chart-wrap iframe {
            width: 100% !important;
            height: 100% !important;
          }
          .trading-panel {
            width: 320px;
            flex: 0 0 320px;
            overflow-y: auto;
            background: #0A0F1F;
            border-left: 1px solid rgba(255,255,255,0.1);
          }
          .tradingview-widget-container,
          .tradingview-widget-container__widget,
          .tradingview-widget-container iframe {
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            background: transparent !important;
            width: 100% !important;
            height: 100% !important;
          }
          .tradingview-widget-copyright {
            display: none !important;
          }
          @media (max-width: 1024px) {
            .trading-layout {
              flex-direction: column;
              height: auto;
            }
            .trading-panel {
              width: 100%;
              flex: none;
              border-left: none;
              border-top: 1px solid rgba(255,255,255,0.1);
            }
            .chart-wrap {
              height: 500px;
              flex: none;
            }
          }
        `}
      </style>
      <div className="trading-layout">
        {/* MAIN TRADING AREA - CHART */}
        <div className="trading-main">
          {/* Top Bar with pair info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 20px',
            background: '#0A0F1F',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            gap: '20px'
          }}>
            <button
              onClick={() => navigate('/trading')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#0FF2F2',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <IoArrowBack />
            </button>
            <img
              src={`/crypto-logos/${coinBase.toLowerCase()}.png`}
              alt={coinBase}
              style={{ width: '28px', height: '28px', objectFit: 'contain' }}
            />
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>
                {coinName} / USD
              </div>
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#FFFFFF' }}>
              ${marketStats.lastPrice > 0 
                ? marketStats.lastPrice >= 1
                  ? marketStats.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : marketStats.lastPrice.toFixed(6)
                : '—'}
            </div>
            <div style={{
              padding: '4px 10px',
              borderRadius: '6px',
              background: marketStats.change24h >= 0 ? 'rgba(0,255,148,0.15)' : 'rgba(255,75,75,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {marketStats.change24h >= 0 ? (
                <IoTrendingUp style={{ fontSize: '14px', color: '#00FF94' }} />
              ) : (
                <IoTrendingDown style={{ fontSize: '14px', color: '#FF4B4B' }} />
              )}
              <span style={{
                fontSize: '13px',
                fontWeight: '700',
                color: marketStats.change24h >= 0 ? '#00FF94' : '#FF4B4B'
              }}>
                {marketStats.change24h >= 0 ? '+' : ''}{marketStats.change24h.toFixed(2)}%
              </span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '24px', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>24h High: </span>
                <span style={{ color: '#FFFFFF', fontWeight: '600' }}>
                  ${marketStats.high24h >= 1 ? marketStats.high24h.toLocaleString('en-US', { maximumFractionDigits: 2 }) : marketStats.high24h.toFixed(6)}
                </span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>24h Low: </span>
                <span style={{ color: '#FFFFFF', fontWeight: '600' }}>
                  ${marketStats.low24h >= 1 ? marketStats.low24h.toLocaleString('en-US', { maximumFractionDigits: 2 }) : marketStats.low24h.toFixed(6)}
                </span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>24h Vol: </span>
                <span style={{ color: '#FFFFFF', fontWeight: '600' }}>
                  {marketStats.volume24h >= 1e9 ? `$${(marketStats.volume24h/1e9).toFixed(2)}B` : `$${(marketStats.volume24h/1e6).toFixed(2)}M`}
                </span>
              </div>
            </div>
          </div>

          {/* CHART - fills remaining space */}
          <div className="chart-wrap">
            <div 
              id="tradingview-chart-mobile" 
              style={{ width: '100%', height: '100%', background: '#020617' }}
            ></div>
          </div>
        </div>

        {/* RIGHT PANEL - Order Form */}
        <div className="trading-panel" style={{ padding: '16px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '14px', 
            marginBottom: '16px' 
          }}>
            <div>
              <div style={{ 
                fontSize: '11px', 
                color: 'rgba(255,255,255,0.5)', 
                marginBottom: '5px',
                fontWeight: '600'
              }}>24h High</div>
              <div style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '700' }}>
                ${marketStats.high24h > 0
                  ? marketStats.high24h >= 1
                    ? marketStats.high24h.toLocaleString('en-US', { maximumFractionDigits: 2 })
                    : marketStats.high24h.toFixed(6)
                  : '—'}
              </div>
            </div>
            <div>
              <div style={{ 
                fontSize: '11px', 
                color: 'rgba(255,255,255,0.5)', 
                marginBottom: '5px',
                fontWeight: '600'
              }}>24h Low</div>
              <div style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '700' }}>
                ${marketStats.low24h > 0
                  ? marketStats.low24h >= 1
                    ? marketStats.low24h.toLocaleString('en-US', { maximumFractionDigits: 2 })
                    : marketStats.low24h.toFixed(6)
                  : '—'}
              </div>
            </div>
            <div>
              <div style={{ 
                fontSize: '11px', 
                color: 'rgba(255,255,255,0.5)', 
                marginBottom: '5px',
                fontWeight: '600'
              }}>24h Volume</div>
              <div style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '700' }}>
                {marketStats.volume24h >= 1e9 
                  ? `$${(marketStats.volume24h / 1e9).toFixed(2)}B`
                  : marketStats.volume24h >= 1e6 
                    ? `$${(marketStats.volume24h / 1e6).toFixed(2)}M`
                    : marketStats.volume24h >= 1e3
                      ? `$${(marketStats.volume24h / 1e3).toFixed(1)}K`
                      : `$${marketStats.volume24h.toFixed(0)}`}
              </div>
            </div>
            {marketStats.marketCap > 0 && (
              <div>
                <div style={{ 
                  fontSize: '11px', 
                  color: 'rgba(255,255,255,0.5)', 
                  marginBottom: '5px',
                  fontWeight: '600'
                }}>Market Cap</div>
                <div style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '700' }}>
                  {marketStats.marketCap >= 1e9 
                    ? `$${(marketStats.marketCap / 1e9).toFixed(2)}B`
                    : marketStats.marketCap >= 1e6 
                      ? `$${(marketStats.marketCap / 1e6).toFixed(2)}M`
                      : `$${marketStats.marketCap.toLocaleString()}`}
                </div>
              </div>
            )}
          </div>

          {/* 24h Range Bar - Brand Theme Colors */}
          <div>
            <div style={{ 
              fontSize: '11px', 
              color: 'rgba(255,255,255,0.5)', 
              marginBottom: '10px',
              fontWeight: '600'
            }}>24h Price Range</div>
            <div style={{
              position: 'relative',
              height: '10px',
              borderRadius: '5px',
              background: 'linear-gradient(90deg, #FF4B4B 0%, #FFD700 50%, #00FF94 100%)',
              overflow: 'visible'
            }}>
              <div style={{
                position: 'absolute',
                left: `${rangePercentage}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '14px',
                height: '14px',
                background: '#0FF2F2',
                borderRadius: '50%',
                border: '3px solid #020617',
                boxShadow: '0 0 16px rgba(15,242,242,0.8)'
              }}></div>
            </div>
          </div>
        </div>

        {/* ORDER TYPE TABS */}
        <div style={{
          width: '100%',
          padding: '0 16px 16px 16px',
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={() => setOrderType('market')}
            style={{
              flex: 1,
              height: '38px',
              borderRadius: '12px',
              background: orderType === 'market'
                ? 'linear-gradient(135deg, #0FF2F2 0%, #00B8D4 100%)'
                : 'linear-gradient(180deg, #0A0F1F 0%, #050812 100%)',
              color: orderType === 'market' ? '#020617' : '#8F9BB3',
              border: orderType === 'market' ? 'none' : '1px solid rgba(255,255,255,0.12)',
              fontSize: '14px',
              fontWeight: orderType === 'market' ? '700' : '600',
              cursor: 'pointer',
              transition: 'all 200ms ease',
              boxShadow: orderType === 'market' 
                ? '0 0 20px rgba(15,242,242,0.5), inset 0 1px 0 rgba(255,255,255,0.2)'
                : 'none'
            }}
          >
            Market
          </button>
          <button
            onClick={() => setOrderType('limit')}
            style={{
              flex: 1,
              height: '38px',
              borderRadius: '12px',
              background: orderType === 'limit'
                ? 'linear-gradient(135deg, #0FF2F2 0%, #00B8D4 100%)'
                : 'linear-gradient(180deg, #0A0F1F 0%, #050812 100%)',
              color: orderType === 'limit' ? '#020617' : '#8F9BB3',
              border: orderType === 'limit' ? 'none' : '1px solid rgba(255,255,255,0.12)',
              fontSize: '14px',
              fontWeight: orderType === 'limit' ? '700' : '600',
              cursor: 'pointer',
              transition: 'all 200ms ease',
              boxShadow: orderType === 'limit' 
                ? '0 0 20px rgba(15,242,242,0.5), inset 0 1px 0 rgba(255,255,255,0.2)'
                : 'none'
            }}
          >
            Limit
          </button>
        </div>

        {/* BUY/SELL BOX */}
        <div style={{
          width: '100%',
          background: '#0A0F1F',
          padding: '18px'
        }}>
          {/* Balance Display */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '14px',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.6)'
          }}>
            <div>Available: {balance.usd.toFixed(2)} USD</div>
            <div>Available: {balance.coin.toFixed(6)} {coinBase}</div>
          </div>

          {/* Limit Price Input */}
          {orderType === 'limit' && (
            <input
              type="number"
              placeholder="Limit Price (USD)"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '14px',
                background: '#0F172A',
                border: '1px solid rgba(255,255,255,0.12)',
                padding: '0 16px',
                color: '#FFFFFF',
                fontSize: '15px',
                marginBottom: '12px',
                outline: 'none'
              }}
            />
          )}

          {/* Currency Selector */}
          <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
            {['USD', 'GBP', 'EUR'].map(curr => (
              <button
                key={curr}
                onClick={() => setInputCurrency(curr)}
                style={{
                  flex: 1,
                  height: '36px',
                  borderRadius: '10px',
                  background: inputCurrency === curr ? 'linear-gradient(135deg, #0FF2F2 0%, #00B8D4 100%)' : '#0F172A',
                  color: inputCurrency === curr ? '#020617' : '#8F9BB3',
                  border: inputCurrency === curr ? 'none' : '1px solid rgba(255,255,255,0.12)',
                  fontSize: '13px',
                  fontWeight: inputCurrency === curr ? '700' : '600',
                  cursor: 'pointer',
                  boxShadow: inputCurrency === curr ? '0 0 16px rgba(15,242,242,0.4)' : 'none'
                }}
              >
                {curr}
              </button>
            ))}
          </div>

          {/* Amount Input with Currency */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input
              type="number"
              placeholder={`Amount in ${inputCurrency}`}
              value={currencyAmount}
              onChange={(e) => {
                setCurrencyAmount(e.target.value);
                // Auto-convert to coin amount
                if (e.target.value && marketStats.lastPrice > 0) {
                  let usdValue = parseFloat(e.target.value);
                  if (inputCurrency === 'GBP') usdValue = usdValue / exchangeRates.GBP;
                  if (inputCurrency === 'EUR') usdValue = usdValue / exchangeRates.EUR;
                  setAmount((usdValue / marketStats.lastPrice).toFixed(6));
                } else {
                  setAmount('');
                }
              }}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '14px',
                background: '#0F172A',
                border: '1px solid rgba(255,255,255,0.12)',
                padding: '0 16px 0 48px',
                color: '#FFFFFF',
                fontSize: '15px',
                outline: 'none'
              }}
            />
            <span style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#0FF2F2',
              fontSize: '15px',
              fontWeight: '700'
            }}>
              {inputCurrency === 'USD' ? '$' : inputCurrency === 'GBP' ? '£' : '€'}
            </span>
          </div>

          {/* Calculated Coin Amount Display */}
          {amount && parseFloat(amount) > 0 && (
            <div style={{
              marginBottom: '12px',
              padding: '12px',
              background: 'rgba(15,242,242,0.08)',
              borderRadius: '10px',
              fontSize: '13px',
              color: '#0FF2F2'
            }}>
              ≈ {amount} {coinBase}
            </div>
          )}

          {/* Quick Amount Buttons */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '14px'
          }}>
            {[25, 50, 75, 100].map(percent => (
              <button
                key={percent}
                onClick={() => {
                  // Calculate based on USD balance
                  const availableUSD = balance.usd;
                  const targetUSD = (availableUSD * percent) / 100;
                  
                  // Convert to selected currency
                  let displayAmount = targetUSD;
                  if (inputCurrency === 'GBP') displayAmount = targetUSD * exchangeRates.GBP;
                  if (inputCurrency === 'EUR') displayAmount = targetUSD * exchangeRates.EUR;
                  
                  setCurrencyAmount(displayAmount.toFixed(2));
                  
                  // Calculate coin amount
                  if (marketStats.lastPrice > 0) {
                    setAmount((targetUSD / marketStats.lastPrice).toFixed(6));
                  }
                }}
                style={{
                  flex: 1,
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(15,242,242,0.1)',
                  border: '1px solid rgba(15,242,242,0.3)',
                  color: '#0FF2F2',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 200ms ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(15,242,242,0.2)';
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(15,242,242,0.1)';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                {percent}%
              </button>
            ))}
          </div>

          {/* Order Summary */}
          {amount && parseFloat(amount) > 0 && (
            <div style={{
              background: 'rgba(15,242,242,0.05)',
              border: '1px solid rgba(15,242,242,0.15)',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '14px',
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Subtotal:</span>
                <span style={{ color: '#FFFFFF', fontWeight: '600' }}>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Fee ({tradingFee}%):</span>
                <span style={{ color: '#FFFFFF', fontWeight: '600' }}>${fee.toFixed(2)}</span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                paddingTop: '8px',
                borderTop: '1px solid rgba(255,255,255,0.1)'
              }}>
                <span style={{ color: '#0FF2F2', fontWeight: '700' }}>Total:</span>
                <span style={{ color: '#0FF2F2', fontWeight: '700' }}>${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* BUY and SELL Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={() => handleTrade('buy')}
              disabled={isLoading}
              style={{
                height: '56px',
                borderRadius: '16px',
                background: isLoading 
                  ? 'rgba(0,255,148,0.5)'
                  : 'linear-gradient(135deg, #00FF94 0%, #0ACB72 100%)',
                color: '#020617',
                fontWeight: '800',
                fontSize: '16px',
                textTransform: 'uppercase',
                border: 'none',
                boxShadow: isLoading 
                  ? 'none'
                  : '0 0 28px rgba(0,255,148,0.65), inset 0 1px 0 rgba(255,255,255,0.3)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.5px',
                transition: 'all 200ms ease'
              }}
            >
              {isLoading ? 'PROCESSING...' : 'BUY'}
            </button>

            <button
              onClick={() => handleTrade('sell')}
              disabled={isLoading}
              style={{
                height: '56px',
                borderRadius: '16px',
                background: isLoading 
                  ? 'rgba(255,75,75,0.5)'
                  : 'linear-gradient(135deg, #FF4B4B 0%, #C22222 100%)',
                color: '#FFFFFF',
                fontWeight: '800',
                fontSize: '16px',
                textTransform: 'uppercase',
                border: 'none',
                boxShadow: isLoading 
                  ? 'none'
                  : '0 0 28px rgba(255,75,75,0.65), inset 0 1px 0 rgba(255,255,255,0.2)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.5px',
                transition: 'all 200ms ease'
              }}
            >
              {isLoading ? 'PROCESSING...' : 'SELL'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
