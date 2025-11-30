import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Zap } from 'lucide-react';
import axios from 'axios';

// Emoji mapping for major coins
const COIN_EMOJIS = {
  'BTC': '₿', 'ETH': '🟣', 'USDT': '🟩', 'BNB': '🔶', 'SOL': '🔵',
  'XRP': '❎', 'ADA': '🔷', 'AVAX': '🔺', 'DOGE': '🐶', 'TRX': '🔻',
  'DOT': '🎯', 'MATIC': '🟪', 'LTC': '⚪', 'LINK': '🔗', 'XLM': '✴️',
  'XMR': '🟠', 'ATOM': '🪐', 'BCH': '💚', 'UNI': '🌸', 'FIL': '📁',
  'APT': '🅰️', 'USDC': '🟩', 'DAI': '💛', 'SHIB': '🐕', 'ALGO': '🔺',
  'VET': '✅', 'ICP': '♾️', 'NEAR': '🔵', 'FTM': '👻', 'SAND': '🏝️',
  'MANA': '🎮', 'XTZ': '🔷', 'AAVE': '👻', 'GRT': '📊', 'EOS': '⚫',
  'THETA': '📺', 'AXS': '🎮', 'MKR': '🏦', 'ZEC': '🔐', 'DASH': '💨'
};

// Color mapping for coins
const COIN_COLORS = {
  'BTC': '#F7931A', 'ETH': '#627EEA', 'USDT': '#26A17B', 'BNB': '#F3BA2F',
  'SOL': '#14F195', 'XRP': '#00AAE4', 'ADA': '#0033AD', 'AVAX': '#E84142',
  'DOGE': '#C2A633', 'TRX': '#FF0013', 'DOT': '#E6007A', 'MATIC': '#8247E5',
  'LTC': '#345D9D', 'LINK': '#2A5ADA', 'XLM': '#14B6E7', 'XMR': '#FF6600',
  'ATOM': '#2E3148', 'BCH': '#8DC351', 'UNI': '#FF007A', 'FIL': '#0090FF',
  'APT': '#00D4AA', 'USDC': '#2775CA'
};

const API = process.env.REACT_APP_BACKEND_URL;

export default function PriceTickerEnhanced() {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allCoins, setAllCoins] = useState([]);

  useEffect(() => {
    fetchNOWPaymentsCurrencies();
  }, []);

  useEffect(() => {
    if (allCoins.length > 0) {
      fetchPrices();
      const interval = setInterval(fetchPrices, 10000);
      return () => clearInterval(interval);
    }
  }, [allCoins]);

  const fetchNOWPaymentsCurrencies = async () => {
    try {
      const response = await axios.get(`${API}/api/nowpayments/currencies`, { timeout: 10000 });
      if (response.data.success && response.data.currencies) {
        const currencies = response.data.currencies;
        // Map ALL currencies (no limit)
        const coins = currencies.map(symbol => ({
          symbol: symbol.toUpperCase(),
          icon: COIN_EMOJIS[symbol.toUpperCase()] || '💎',
          color: COIN_COLORS[symbol.toUpperCase()] || '#00C6FF'
        }));
        setAllCoins(coins);
        console.log(`✅ Loaded ${coins.length} coins from NOWPayments`);
      }
    } catch (error) {
      console.error('Error fetching NOWPayments currencies:', error);
      // Fallback to major coins
      const fallback = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'MATIC', 'LTC'].map(symbol => ({
        symbol,
        icon: COIN_EMOJIS[symbol] || '💎',
        color: COIN_COLORS[symbol] || '#00C6FF'
      }));
      setAllCoins(fallback);
    }
  };

  const fetchPrices = async () => {    
    try {
      const backendRes = await axios.get(`${API}/api/prices/live`, { timeout: 5000 });
      if (backendRes.data.success && backendRes.data.prices) {
        const priceData = allCoins.map(coin => {
          const data = backendRes.data.prices[coin.symbol];
          return {
            ...coin,
            price: data?.price_gbp || 0,
            change: data?.change_24h || 0
          };
        }).filter(c => c.price > 0);
        
        if (priceData.length > 0) {
          setPrices(priceData);
          setLoading(false);
          return;
        }
      }
    } catch (error) {
      console.warn('Backend prices unavailable');
    }
    
    // Fallback: use allCoins with dummy data
    const fallbackData = allCoins.map(coin => ({
      ...coin,
      price: Math.random() * 1000 + 100,
      change: (Math.random() - 0.5) * 10
    }));
    setPrices(fallbackData);
    setLoading(false);
  };

  if (loading || prices.length === 0) {
    return (
      <div style={{
        width: '100%',
        background: 'linear-gradient(90deg, rgba(5, 12, 30, 0.98), rgba(28, 21, 64, 0.98))',
        borderBottom: '2px solid rgba(0, 229, 255, 0.3)',
        height: '48px',
        minHeight: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: 0,
        boxShadow: '0 4px 20px rgba(0, 229, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        position: 'relative'
      }}>
        <div className="flex items-center justify-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-cyan-400 text-sm font-medium animate-pulse">Loading live prices...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      background: 'linear-gradient(90deg, rgba(5, 12, 30, 0.98), rgba(28, 21, 64, 0.98))',
      borderBottom: '2px solid rgba(0, 229, 255, 0.3)',
      height: '48px',
      overflow: 'hidden',
      padding: 0,
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 20px rgba(0, 229, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      position: 'relative'
    }}>
      {/* Neon gradient line at top - centered and clean */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.6), rgba(0, 229, 255, 0.9), rgba(0, 229, 255, 0.6), transparent)',
        animation: 'gradientSlide 6s linear infinite',
        zIndex: 10
      }} />
      
      {/* Animated gradient background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.05), transparent)',
        animation: 'shimmer 3s infinite',
        pointerEvents: 'none'
      }} />
      
      <div style={{
        display: 'flex',
        animation: 'scroll 90s linear infinite',
        gap: '2rem',
        position: 'relative',
        zIndex: 1
      }}>
        {[...prices, ...prices, ...prices, ...prices, ...prices, ...prices, ...prices, ...prices, ...prices, ...prices, ...prices, ...prices].map((coin, idx) => {
          const isPositive = coin.change >= 0;
          const glowColor = isPositive ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
          
          return (
            <div
              key={`${coin.symbol}-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                whiteSpace: 'nowrap',
                minWidth: 'fit-content',
                padding: '0.5rem 0.875rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.3s ease'
              }}
            >
              <span style={{
                fontSize: '18px',
                color: coin.color,
                textShadow: `0 0 10px ${coin.color}40`,
                filter: 'brightness(1.3)'
              }}>
                {coin.icon || coin.symbol.charAt(0)}
              </span>
              
              <span style={{
                fontSize: '15px',
                fontWeight: '800',
                color: coin.color,
                letterSpacing: '0.5px',
                textShadow: `0 0 10px ${coin.color}40, 0 0 20px ${coin.color}20`,
                filter: 'brightness(1.2)'
              }}>
                {coin.symbol}
              </span>
              
              <span style={{
                fontSize: '15px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #E0F2FE 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'brightness(1.3)'
              }}>
                £{coin.price.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '13px',
                fontWeight: '700',
                color: isPositive ? '#22C55E' : '#EF4444',
                textShadow: `0 0 8px ${glowColor}`,
                padding: '0.125rem 0.375rem',
                borderRadius: '4px',
                background: isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${isPositive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}>
                {isPositive ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
                {Math.abs(coin.change).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-8.33%);
          }
        }
        
        @keyframes gradientSlide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes shimmer {
          0%, 100% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}