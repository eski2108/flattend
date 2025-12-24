/**
 * SpotTradingPro.js - LOCKED SPEC IMPLEMENTATION
 * 
 * RULES:
 * - Desktop (>=1024px): 3-column layout (sidebar from Layout + chart + trade panel)
 *   - NO pair tabs on desktop
 *   - NO footer inside this component
 * - Mobile (<1024px): Separate mobile layout WITH pair tabs
 * - Only ONE layout is mounted at a time (not both hidden)
 * - Footer is GLOBAL (in Layout.js), NOT in this file
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API = process.env.REACT_APP_BACKEND_URL;

// =====================================================
// DESKTOP COMPONENT (>=1024px)
// NO pair tabs, NO footer
// =====================================================
function DesktopSpotTrading({ 
  selectedPair, 
  setSelectedPair, 
  marketStats, 
  amount, 
  setAmount, 
  orderType, 
  setOrderType, 
  handleTrade, 
  isLoading 
}) {
  // Load TradingView chart
  useEffect(() => {
    const timer = setTimeout(() => {
      const container = document.getElementById('tv-chart-desktop');
      if (!container) return;
      container.innerHTML = '';
      
      const base = selectedPair.replace('USD', '');
      const sym = base === 'BTC' ? 'BINANCE:BTCUSDT' : `BINANCE:${base}USDT`;
      
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: sym,
        interval: '15',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        backgroundColor: '#0A0E17',
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false
      });
      
      const wrap = document.createElement('div');
      wrap.className = 'tradingview-widget-container';
      wrap.style.cssText = 'height:100%;width:100%';
      
      const inner = document.createElement('div');
      inner.className = 'tradingview-widget-container__widget';
      inner.style.cssText = 'height:100%;width:100%';
      
      wrap.appendChild(inner);
      wrap.appendChild(script);
      container.appendChild(wrap);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [selectedPair]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 100px)',
      background: '#0A0E17',
      padding: '16px',
      gap: '12px'
    }}>
      {/* TEMPORARY MARKER - REMOVE AFTER ACCEPTANCE */}
      <div style={{
        background: '#00FF00',
        color: '#000',
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: 'bold',
        textAlign: 'center',
        borderRadius: '4px'
      }}>
        DESKTOP-SPOT-OK
      </div>

      {/* TOP BAR - Selected pair + stats (NO PAIR TABS) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        background: 'rgba(13, 20, 33, 0.9)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)',
        gap: '24px'
      }}>
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#FFF' }}>
          {selectedPair.replace('USD', ' / USD')}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '24px', alignItems: 'center' }}>
          <span style={{ fontSize: '24px', fontWeight: '700', color: '#FFF' }}>
            ${marketStats.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: '#6B7280' }}>24h Change</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: marketStats.change24h >= 0 ? '#00C853' : '#FF5252' }}>
              {marketStats.change24h >= 0 ? '+' : ''}{marketStats.change24h.toFixed(2)}%
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: '#6B7280' }}>24h High</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#FFF' }}>
              ${marketStats.high24h.toLocaleString()}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: '#6B7280' }}>24h Low</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#FFF' }}>
              ${marketStats.low24h.toLocaleString()}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: '#6B7280' }}>24h Volume</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#FFF' }}>
              ${(marketStats.volume24h / 1000000).toFixed(2)}M
            </span>
          </div>
        </div>
      </div>

      {/* MAIN GRID - Chart (flex) + Trade Panel (360px fixed) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 360px',
        flex: 1,
        gap: '16px',
        minHeight: 0
      }}>
        {/* CHART CONTAINER */}
        <div style={{
          background: 'rgba(10, 14, 23, 0.9)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden',
          padding: '12px',
          minHeight: '500px'
        }}>
          <div id="tv-chart-desktop" style={{ width: '100%', height: '100%', minHeight: '480px' }}></div>
        </div>

        {/* TRADE PANEL */}
        <div style={{
          background: 'rgba(13, 20, 33, 0.9)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Order Type Toggle */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={() => setOrderType('market')}
              style={{
                flex: 1,
                padding: '10px',
                background: orderType === 'market' ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
                border: orderType === 'market' ? '1px solid #00D4FF' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: orderType === 'market' ? '#00D4FF' : '#8B9AAB',
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
                background: orderType === 'limit' ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
                border: orderType === 'limit' ? '1px solid #00D4FF' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: orderType === 'limit' ? '#00D4FF' : '#8B9AAB',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Limit
            </button>
          </div>

          {/* Price Display */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>Price (USD)</div>
            <div style={{
              padding: '12px',
              background: 'rgba(10, 14, 23, 0.8)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#FFF',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              ${marketStats.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Amount Input */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
              Amount ({selectedPair.replace('USD', '')})
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(10, 14, 23, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#FFF',
                fontSize: '16px',
                outline: 'none'
              }}
            />
          </div>

          {/* Total Display */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>Total (USD)</div>
            <div style={{
              padding: '12px',
              background: 'rgba(10, 14, 23, 0.8)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#00D4FF',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              ${(parseFloat(amount || 0) * marketStats.lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* BUY / SELL Buttons */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => handleTrade('buy')}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #00C853 0%, #00E676 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#FFF',
                fontSize: '16px',
                fontWeight: '700',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'all 0.2s'
              }}
            >
              {isLoading ? 'Processing...' : `BUY ${selectedPair.replace('USD', '')}`}
            </button>
            <button
              onClick={() => handleTrade('sell')}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #FF5252 0%, #FF1744 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#FFF',
                fontSize: '16px',
                fontWeight: '700',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'all 0.2s'
              }}
            >
              {isLoading ? 'Processing...' : `SELL ${selectedPair.replace('USD', '')}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MOBILE COMPONENT (<1024px)
// HAS pair tabs, NO footer
// =====================================================
function MobileSpotTrading({ 
  selectedPair, 
  setSelectedPair, 
  tradingPairs,
  marketStats, 
  amount, 
  setAmount, 
  handleTrade, 
  isLoading 
}) {
  return (
    <div style={{ background: '#0A0E17', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* TEMPORARY MARKER - REMOVE AFTER ACCEPTANCE */}
      <div style={{
        background: '#FF00FF',
        color: '#FFF',
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        MOBILE-SPOT-OK
      </div>

      {/* MOBILE PAIR TABS - ALLOWED ON MOBILE */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '12px 16px',
        overflowX: 'auto',
        background: 'rgba(13, 20, 33, 0.9)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        WebkitOverflowScrolling: 'touch'
      }}>
        {tradingPairs.slice(0, 8).map((p) => (
          <button
            key={p.symbol}
            onClick={() => setSelectedPair(p.symbol)}
            style={{
              padding: '8px 16px',
              background: selectedPair === p.symbol ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
              border: selectedPair === p.symbol ? '1px solid #00D4FF' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              color: selectedPair === p.symbol ? '#00D4FF' : '#8B9AAB',
              fontSize: '13px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {p.base}/USD
          </button>
        ))}
      </div>

      {/* MOBILE PRICE DISPLAY */}
      <div style={{ padding: '20px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '4px' }}>
          {selectedPair.replace('USD', '/USD')}
        </div>
        <div style={{ fontSize: '32px', fontWeight: '700', color: '#FFF', marginBottom: '8px' }}>
          ${marketStats.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          background: marketStats.change24h >= 0 ? 'rgba(0, 200, 83, 0.15)' : 'rgba(255, 82, 82, 0.15)',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '600',
          color: marketStats.change24h >= 0 ? '#00C853' : '#FF5252'
        }}>
          {marketStats.change24h >= 0 ? '▲' : '▼'} {Math.abs(marketStats.change24h).toFixed(2)}%
        </div>
      </div>

      {/* MOBILE STATS ROW */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        padding: '12px 16px',
        background: 'rgba(13, 20, 33, 0.5)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>24h High</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFF' }}>
            ${marketStats.high24h.toLocaleString()}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>24h Low</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFF' }}>
            ${marketStats.low24h.toLocaleString()}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>Volume</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFF' }}>
            ${(marketStats.volume24h / 1000000).toFixed(2)}M
          </div>
        </div>
      </div>

      {/* MOBILE AMOUNT INPUT */}
      <div style={{ padding: '20px 16px' }}>
        <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
          Amount ({selectedPair.replace('USD', '')})
        </div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          style={{
            width: '100%',
            padding: '16px',
            background: 'rgba(13, 20, 33, 0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            color: '#FFF',
            fontSize: '18px',
            textAlign: 'center',
            outline: 'none'
          }}
        />
        <div style={{ 
          fontSize: '14px', 
          color: '#6B7280', 
          textAlign: 'center', 
          marginTop: '8px' 
        }}>
          ≈ ${(parseFloat(amount || 0) * marketStats.lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
        </div>
      </div>

      {/* MOBILE BUY/SELL BUTTONS */}
      <div style={{ padding: '0 16px', display: 'flex', gap: '12px' }}>
        <button
          onClick={() => handleTrade('buy')}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '16px',
            background: 'linear-gradient(135deg, #00C853 0%, #00E676 100%)',
            border: 'none',
            borderRadius: '12px',
            color: '#FFF',
            fontSize: '16px',
            fontWeight: '700',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          BUY
        </button>
        <button
          onClick={() => handleTrade('sell')}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '16px',
            background: 'linear-gradient(135deg, #FF5252 0%, #FF1744 100%)',
            border: 'none',
            borderRadius: '12px',
            color: '#FFF',
            fontSize: '16px',
            fontWeight: '700',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          SELL
        </button>
      </div>
    </div>
  );
}

// =====================================================
// MAIN EXPORT - Renders ONLY Desktop OR Mobile
// =====================================================
export default function SpotTradingPro() {
  const [searchParams] = useSearchParams();
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [selectedPair, setSelectedPair] = useState('BTCUSD');
  const [tradingPairs, setTradingPairs] = useState([]);
  const [amount, setAmount] = useState('');
  const [orderType, setOrderType] = useState('market');
  const [isLoading, setIsLoading] = useState(false);
  const [marketStats, setMarketStats] = useState({
    lastPrice: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    change24h: 0
  });

  // Responsive breakpoint detection
  useEffect(() => {
    const checkBreakpoint = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  // Get pair from URL params
  useEffect(() => {
    const pair = searchParams.get('pair');
    if (pair) setSelectedPair(pair);
  }, [searchParams]);

  // Fetch trading pairs
  useEffect(() => {
    const fetchPairs = async () => {
      try {
        const res = await axios.get(`${API}/api/prices/live`);
        if (res.data.success && res.data.prices) {
          const pairs = Object.keys(res.data.prices).map(coin => ({
            symbol: `${coin}USD`,
            name: `${coin}/USD`,
            base: coin
          }));
          setTradingPairs(pairs);
        }
      } catch (e) {
        // Fallback pairs
        setTradingPairs(['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT'].map(c => ({
          symbol: `${c}USD`,
          name: `${c}/USD`,
          base: c
        })));
      }
    };
    fetchPairs();
  }, []);

  // Fetch market stats for selected pair
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const base = selectedPair.replace('USD', '');
        const res = await axios.get(`${API}/api/prices/live`);
        if (res.data.success && res.data.prices[base]) {
          const d = res.data.prices[base];
          setMarketStats({
            lastPrice: d.price || 0,
            high24h: d.high_24h || d.price * 1.02,
            low24h: d.low_24h || d.price * 0.98,
            volume24h: d.volume_24h || 0,
            change24h: d.change_24h || 0
          });
        }
      } catch (e) {
        console.error('Failed to fetch market stats:', e);
      }
    };

    if (selectedPair) {
      fetchStats();
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedPair]);

  // Handle trade execution
  const handleTrade = useCallback(async (side) => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      toast.error('Please log in to trade');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(`${API}/api/trading/place-order`, {
        user_id: userId,
        pair: selectedPair,
        type: side,
        amount: parseFloat(amount),
        price: marketStats.lastPrice,
        fee_percent: 0.1
      });

      if (res.data.success) {
        toast.success(`${side.toUpperCase()} order executed successfully!`);
        setAmount('');
      } else {
        toast.error(res.data.error || 'Trade failed');
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Trade failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [amount, selectedPair, marketStats.lastPrice]);

  // CRITICAL: Render ONLY ONE layout based on breakpoint
  // Do NOT mount both and hide with CSS
  if (isDesktop) {
    return (
      <DesktopSpotTrading
        selectedPair={selectedPair}
        setSelectedPair={setSelectedPair}
        marketStats={marketStats}
        amount={amount}
        setAmount={setAmount}
        orderType={orderType}
        setOrderType={setOrderType}
        handleTrade={handleTrade}
        isLoading={isLoading}
      />
    );
  }

  return (
    <MobileSpotTrading
      selectedPair={selectedPair}
      setSelectedPair={setSelectedPair}
      tradingPairs={tradingPairs}
      marketStats={marketStats}
      amount={amount}
      setAmount={setAmount}
      handleTrade={handleTrade}
      isLoading={isLoading}
    />
  );
}
