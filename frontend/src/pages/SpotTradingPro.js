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
        backgroundColor: '#0B0F1A',
        gridColor: 'rgba(110, 140, 255, 0.08)',
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
  // DESKTOP LAYOUT - EXACT COLOR SPEC (LOCKED)
  // =====================================================
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: 'calc(100vh - 80px)',
      background: '#0B0F1A',
      padding: '16px',
      gap: '12px'
    }}>
      {/* PAGE TITLE */}
      <div style={{ marginBottom: '4px' }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: '700', 
          color: '#E9EEFF',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: 0
        }}>
          <span style={{ fontSize: '28px' }}>📈</span> Spot Trading
        </h1>
        <p style={{ fontSize: '13px', color: '#8FA3FF', opacity: 0.85, margin: '4px 0 0 0' }}>
          Advanced trading with TradingView charts and real-time data
        </p>
      </div>

      {/* TOP INFO BOXES - EXACT SPEC */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        width: '100%'
      }}>
        {/* Box 1: Last Price - CYAN GRADIENT FILL (lighter) */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(0, 212, 255, 0.08) 0%, rgba(0, 212, 255, 0.35) 100%)',
          border: '1px solid rgba(0, 212, 255, 0.5)',
          boxShadow: '0 0 35px rgba(0, 212, 255, 0.35), 0 0 70px rgba(0, 212, 255, 0.2), inset 0 0 40px rgba(0, 212, 255, 0.15)',
          borderRadius: '14px',
          padding: '16px 20px',
          height: '90px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: '10%',
            right: '10%',
            height: '4px',
            background: '#00d4ff',
            boxShadow: '0 0 20px #00d4ff, 0 0 40px #00d4ff, 0 0 60px #00d4ff',
            filter: 'blur(2px)'
          }}></div>
          <span style={{ fontSize: '12px', color: '#00d4ff', marginBottom: '8px', fontWeight: '600', letterSpacing: '1px' }}>LAST PRICE</span>
          <span style={{ fontSize: '26px', fontWeight: '700', color: '#ffffff' }}>
            ${marketStats.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Box 2: 24h Change - RED GRADIENT FILL (lighter) */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(255, 50, 80, 0.08) 0%, rgba(255, 50, 80, 0.35) 100%)',
          border: '1px solid rgba(255, 50, 80, 0.5)',
          boxShadow: '0 0 35px rgba(255, 50, 80, 0.35), 0 0 70px rgba(255, 50, 80, 0.2), inset 0 0 40px rgba(255, 50, 80, 0.15)',
          borderRadius: '14px',
          padding: '16px 20px',
          height: '90px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: '10%',
            right: '10%',
            height: '4px',
            background: '#ff3250',
            boxShadow: '0 0 20px #ff3250, 0 0 40px #ff3250, 0 0 60px #ff3250',
            filter: 'blur(2px)'
          }}></div>
          <span style={{ fontSize: '12px', color: '#ff3250', marginBottom: '8px', fontWeight: '600', letterSpacing: '1px' }}>24H CHANGE</span>
          <span style={{ 
            fontSize: '26px', 
            fontWeight: '700', 
            color: marketStats.change24h >= 0 ? '#20E3A2' : '#ff3250'
          }}>
            {marketStats.change24h >= 0 ? '+' : ''}{marketStats.change24h.toFixed(2)}%
          </span>
        </div>

        {/* Box 3: 24h High - PURPLE GRADIENT FILL (lighter) */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.08) 0%, rgba(168, 85, 247, 0.35) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.5)',
          boxShadow: '0 0 35px rgba(168, 85, 247, 0.35), 0 0 70px rgba(168, 85, 247, 0.2), inset 0 0 40px rgba(168, 85, 247, 0.15)',
          borderRadius: '14px',
          padding: '16px 20px',
          height: '90px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: '10%',
            right: '10%',
            height: '4px',
            background: '#a855f7',
            boxShadow: '0 0 20px #a855f7, 0 0 40px #a855f7, 0 0 60px #a855f7',
            filter: 'blur(2px)'
          }}></div>
          <span style={{ fontSize: '12px', color: '#a855f7', marginBottom: '8px', fontWeight: '600', letterSpacing: '1px' }}>24H HIGH</span>
          <span style={{ fontSize: '26px', fontWeight: '700', color: '#ffffff' }}>
            ${marketStats.high24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Box 4: 24h Low - YELLOW GRADIENT FILL (lighter) */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(250, 204, 21, 0.08) 0%, rgba(250, 204, 21, 0.35) 100%)',
          border: '1px solid rgba(250, 204, 21, 0.5)',
          boxShadow: '0 0 35px rgba(250, 204, 21, 0.35), 0 0 70px rgba(250, 204, 21, 0.2), inset 0 0 40px rgba(250, 204, 21, 0.15)',
          borderRadius: '14px',
          padding: '16px 20px',
          height: '90px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: '10%',
            right: '10%',
            height: '4px',
            background: '#facc15',
            boxShadow: '0 0 20px #facc15, 0 0 40px #facc15, 0 0 60px #facc15',
            filter: 'blur(2px)'
          }}></div>
          <span style={{ fontSize: '12px', color: '#facc15', marginBottom: '8px', fontWeight: '600', letterSpacing: '1px' }}>24H LOW</span>
          <span style={{ fontSize: '26px', fontWeight: '700', color: '#facc15' }}>
            ${marketStats.low24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* MAIN GRID - Chart + Right Column */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 360px',
        flex: 1,
        gap: '16px',
        minHeight: 0
      }}>
        {/* CHART CONTAINER - EXACT SPEC */}
        <div style={{
          background: 'linear-gradient(180deg, #0C1326 0%, #0A0F1E 100%)',
          borderRadius: '14px',
          border: '1px solid rgba(110,140,255,0.14)',
          boxShadow: '0 0 0 1px rgba(110,140,255,0.06), 0 8px 30px rgba(0,0,0,0.65)',
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
          {/* TRADE PANEL - EXACT SPEC */}
          <div style={{
            background: 'radial-gradient(120% 140% at 0% 0%, rgba(64,115,255,0.18) 0%, rgba(0,0,0,0) 45%), linear-gradient(180deg, #0F1A2E 0%, #0C1222 100%)',
            borderRadius: '14px',
            border: '1px solid rgba(110,140,255,0.18)',
            boxShadow: '0 0 0 1px rgba(110,140,255,0.06), 0 8px 30px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)',
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
                  background: orderType === 'market' ? 'rgba(110,140,255,0.15)' : 'transparent',
                  border: orderType === 'market' ? '1px solid rgba(110,140,255,0.4)' : '1px solid rgba(110,140,255,0.18)',
                  borderRadius: '10px',
                  color: orderType === 'market' ? '#E9EEFF' : '#8FA3FF',
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
                  background: orderType === 'limit' ? 'rgba(110,140,255,0.15)' : 'transparent',
                  border: orderType === 'limit' ? '1px solid rgba(110,140,255,0.4)' : '1px solid rgba(110,140,255,0.18)',
                  borderRadius: '10px',
                  color: orderType === 'limit' ? '#E9EEFF' : '#8FA3FF',
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
              <div style={{ fontSize: '12px', color: '#8FA3FF', marginBottom: '8px', opacity: 0.85 }}>Price (USD)</div>
              <div style={{
                padding: '12px',
                background: '#0E1424',
                border: '1px solid rgba(110,140,255,0.18)',
                borderRadius: '10px',
                color: '#E9EEFF',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                ${marketStats.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Amount Input */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#8FA3FF', marginBottom: '8px', opacity: 0.85 }}>
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
                  background: '#0E1424',
                  border: '1px solid rgba(110,140,255,0.18)',
                  borderRadius: '10px',
                  color: '#E9EEFF',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Total Display */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', color: '#8FA3FF', marginBottom: '8px', opacity: 0.85 }}>Total (USD)</div>
              <div style={{
                padding: '12px',
                background: '#0E1424',
                border: '1px solid rgba(110,140,255,0.18)',
                borderRadius: '10px',
                color: '#20E3A2',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                ${(parseFloat(amount || 0) * marketStats.lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* BUY / SELL Buttons - EXACT SPEC */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => handleTrade('buy')}
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: '48px',
                  background: 'linear-gradient(180deg, #20E3A2 0%, #14C98A 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#06291D',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  transition: 'all 0.2s',
                  boxShadow: '0 6px 20px rgba(32,227,162,0.35)'
                }}
              >
                {isLoading ? 'Processing...' : `BUY ${selectedPair.replace('USD', '')}`}
              </button>
              <button
                onClick={() => handleTrade('sell')}
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: '48px',
                  background: 'linear-gradient(180deg, #FF5C6A 0%, #E64654 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#2A060A',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  transition: 'all 0.2s',
                  boxShadow: '0 6px 20px rgba(255,92,106,0.35)'
                }}
              >
                {isLoading ? 'Processing...' : `SELL ${selectedPair.replace('USD', '')}`}
              </button>
            </div>
          </div>

          {/* MARKET INFO PANEL - EXACT SPEC */}
          <div style={{
            background: 'radial-gradient(100% 120% at 100% 0%, rgba(32,227,162,0.15) 0%, rgba(0,0,0,0) 40%), linear-gradient(180deg, #0F1A2E 0%, #0B1222 100%)',
            border: '1px solid rgba(110,140,255,0.18)',
            boxShadow: '0 0 0 1px rgba(110,140,255,0.06), 0 8px 30px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)',
            borderRadius: '14px',
            padding: '16px'
          }}>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#E9EEFF', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>📊</span> Market Info
            </div>
            
            {/* Pair */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: '#8FA3FF', opacity: 0.85 }}>Pair</span>
              <span style={{ fontSize: '13px', color: '#E9EEFF', fontWeight: '500' }}>
                {selectedPair.replace('USD', '/USDT')}
              </span>
            </div>
            
            {/* Min Order */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: '#8FA3FF', opacity: 0.85 }}>Min Order</span>
              <span style={{ fontSize: '13px', color: '#E9EEFF', fontWeight: '500' }}>$10.00</span>
            </div>
            
            {/* Order Type */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: '#8FA3FF', opacity: 0.85 }}>Order Type</span>
              <span style={{ fontSize: '13px', color: '#E9EEFF', fontWeight: '500', textTransform: 'capitalize' }}>
                {orderType}
              </span>
            </div>
            
            {/* Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#8FA3FF', opacity: 0.85 }}>Status</span>
              <span style={{ 
                fontSize: '13px', 
                color: '#20E3A2', 
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  background: '#20E3A2',
                  boxShadow: '0 0 8px rgba(32, 227, 162, 0.6)',
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
