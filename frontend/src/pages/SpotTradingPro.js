/**
 * SpotTradingPro.js - CANONICAL SPEC IMPLEMENTATION
 * 
 * THIS IS THE SPOT TRADING PAGE - NOT THE MARKETS PAGE
 * 
 * RULES:
 * - Desktop (>=1024px): 3-column layout (sidebar from Layout + chart + trade panel)
 *   - NO pair tabs on desktop
 *   - NO coin selector on desktop
 *   - NO footer inside this component
 * - Mobile (<1024px): Redirects to /trading/:symbol for mobile trading experience
 * - Footer is GLOBAL (in Layout.js), NOT in this file
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SpotTradingPro() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [selectedPair, setSelectedPair] = useState('BTCUSD');
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
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      
      // If mobile, redirect to mobile trading page
      if (!desktop) {
        const pair = searchParams.get('pair') || 'BTCUSD';
        navigate(`/trading/${pair}`, { replace: true });
      }
    };
    
    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, [navigate, searchParams]);

  // Get pair from URL params
  useEffect(() => {
    const pair = searchParams.get('pair');
    if (pair) setSelectedPair(pair);
  }, [searchParams]);

  // Fetch market stats for selected pair
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const base = selectedPair.replace('USD', '');
        const res = await axios.get(`${API}/api/prices/live`);
        if (res.data.success && res.data.prices[base]) {
          const d = res.data.prices[base];
          const price = d.price_usd || d.price || 0;
          setMarketStats({
            lastPrice: price,
            high24h: d.high_24h || price * 1.02,
            low24h: d.low_24h || price * 0.98,
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

  // Load TradingView chart
  useEffect(() => {
    if (!isDesktop) return;
    
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
  }, [selectedPair, isDesktop]);

  // Handle trade execution
  const handleTrade = useCallback(async (side) => {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    if (!userId && !token) {
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
      }, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
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

  // If not desktop, show loading while redirect happens
  if (!isDesktop) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0A0E17',
        color: '#00F0FF'
      }}>
        Redirecting to mobile trading...
      </div>
    );
  }

  // =====================================================
  // DESKTOP LAYOUT (>=1024px)
  // NO pair tabs, NO coin selector, NO footer
  // Sidebar is provided by MainLayout wrapper
  // =====================================================
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 100px)',
      background: '#0A0E17',
      padding: '16px',
      gap: '12px'
    }}>
      {/* PAGE TITLE */}
      <div style={{ marginBottom: '4px' }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: '700', 
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: 0
        }}>
          <span style={{ fontSize: '28px' }}>📈</span> Spot Trading
        </h1>
        <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0 0' }}>
          Advanced trading with TradingView charts and real-time data
        </p>
      </div>

      {/* TOP INFO BOXES - 4 boxes in a row (DESKTOP ONLY) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        width: '100%'
      }}>
        {/* Box 1: Last Price */}
        <div style={{
          background: 'linear-gradient(135deg, #0a0f1e, #101a33)',
          border: '1px solid rgba(120, 140, 255, 0.22)',
          boxShadow: '0 6px 22px rgba(0, 0, 0, 0.6)',
          borderRadius: '14px',
          padding: '16px 20px',
          height: '80px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '12px', color: '#8f9bbd', marginBottom: '6px', fontWeight: '400' }}>LAST PRICE</span>
          <span style={{ fontSize: '22px', fontWeight: '600', color: '#f5f7ff' }}>
            ${marketStats.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Box 2: 24h Change */}
        <div style={{
          background: 'linear-gradient(135deg, #0a0f1e, #101a33)',
          border: '1px solid rgba(120, 140, 255, 0.22)',
          boxShadow: '0 6px 22px rgba(0, 0, 0, 0.6)',
          borderRadius: '14px',
          padding: '16px 20px',
          height: '80px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '12px', color: '#8f9bbd', marginBottom: '6px', fontWeight: '400' }}>24H CHANGE</span>
          <span style={{ 
            fontSize: '22px', 
            fontWeight: '600', 
            color: marketStats.change24h >= 0 ? '#00e6a8' : '#ff5c5c',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {marketStats.change24h >= 0 ? '↗' : '↘'} {marketStats.change24h >= 0 ? '+' : ''}{marketStats.change24h.toFixed(2)}%
          </span>
        </div>

        {/* Box 3: 24h High */}
        <div style={{
          background: 'linear-gradient(135deg, #0a0f1e, #101a33)',
          border: '1px solid rgba(120, 140, 255, 0.22)',
          boxShadow: '0 6px 22px rgba(0, 0, 0, 0.6)',
          borderRadius: '14px',
          padding: '16px 20px',
          height: '80px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '12px', color: '#8f9bbd', marginBottom: '6px', fontWeight: '400' }}>24H HIGH</span>
          <span style={{ fontSize: '22px', fontWeight: '600', color: '#f5f7ff' }}>
            ${marketStats.high24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Box 4: 24h Low */}
        <div style={{
          background: 'linear-gradient(135deg, #0a0f1e, #101a33)',
          border: '1px solid rgba(120, 140, 255, 0.22)',
          boxShadow: '0 6px 22px rgba(0, 0, 0, 0.6)',
          borderRadius: '14px',
          padding: '16px 20px',
          height: '80px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '12px', color: '#8f9bbd', marginBottom: '6px', fontWeight: '400' }}>24H LOW</span>
          <span style={{ fontSize: '22px', fontWeight: '600', color: '#f5f7ff' }}>
            ${marketStats.low24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* SELECTED PAIR DISPLAY (TEXT ONLY - NO TABS) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 0'
      }}>
        <span 
          onClick={() => navigate('/markets')}
          style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#f5f7ff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          title="Click to change pair"
        >
          {selectedPair.replace('USD', '/USDT')}
          <span style={{ fontSize: '12px', color: '#8f9bbd' }}>▼</span>
        </span>
        <span style={{ fontSize: '12px', color: '#8f9bbd' }}>
          Click to change pair
        </span>
      </div>

      {/* MAIN GRID - Chart + Right Column (Trade Panel + Market Info) */}
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

        {/* RIGHT COLUMN - Trade Panel + Market Info */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* TRADE PANEL */}
          <div style={{
            background: 'rgba(13, 20, 33, 0.9)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            flex: 1
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

          {/* MARKET INFO PANEL */}
          <div style={{
            background: 'linear-gradient(135deg, #0a0f1e, #101a33)',
            border: '1px solid rgba(120, 140, 255, 0.22)',
            boxShadow: '0 6px 22px rgba(0, 0, 0, 0.6)',
            borderRadius: '14px',
            padding: '16px'
          }}>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#f5f7ff', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>📊</span> Market Info
            </div>
            
            {/* Pair */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: '#8f9bbd' }}>Pair</span>
              <span style={{ fontSize: '13px', color: '#f5f7ff', fontWeight: '500' }}>
                {selectedPair.replace('USD', '/USDT')}
              </span>
            </div>
            
            {/* Min Order */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: '#8f9bbd' }}>Min Order</span>
              <span style={{ fontSize: '13px', color: '#f5f7ff', fontWeight: '500' }}>$10.00</span>
            </div>
            
            {/* Order Type */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: '#8f9bbd' }}>Order Type</span>
              <span style={{ fontSize: '13px', color: '#f5f7ff', fontWeight: '500', textTransform: 'capitalize' }}>
                {orderType}
              </span>
            </div>
            
            {/* Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#8f9bbd' }}>Status</span>
              <span style={{ 
                fontSize: '13px', 
                color: '#00e6a8', 
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  background: '#00e6a8',
                  display: 'inline-block'
                }}></span>
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
