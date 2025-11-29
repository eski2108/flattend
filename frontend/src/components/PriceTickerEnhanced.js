import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Zap } from 'lucide-react';
import axios from 'axios';

const TICKER_COINS = [
  { id: 'bitcoin', symbol: 'BTC', color: '#F7931A' },
  { id: 'ethereum', symbol: 'ETH', color: '#627EEA' },
  { id: 'tether', symbol: 'USDT', color: '#26A17B' },
  { id: 'binancecoin', symbol: 'BNB', color: '#F3BA2F' },
  { id: 'solana', symbol: 'SOL', color: '#14F195' },
  { id: 'ripple', symbol: 'XRP', color: '#00AAE4' },
  { id: 'usd-coin', symbol: 'USDC', color: '#2775CA' },
  { id: 'cardano', symbol: 'ADA', color: '#0033AD' },
  { id: 'avalanche-2', symbol: 'AVAX', color: '#E84142' },
  { id: 'dogecoin', symbol: 'DOGE', color: '#C2A633' },
  { id: 'tron', symbol: 'TRX', color: '#FF0013' },
  { id: 'polkadot', symbol: 'DOT', color: '#E6007A' },
  { id: 'matic-network', symbol: 'MATIC', color: '#8247E5' },
  { id: 'litecoin', symbol: 'LTC', color: '#345D9D' },
  { id: 'chainlink', symbol: 'LINK', color: '#2A5ADA' },
  { id: 'stellar', symbol: 'XLM', color: '#14B6E7' },
  { id: 'monero', symbol: 'XMR', color: '#FF6600' },
  { id: 'cosmos', symbol: 'ATOM', color: '#2E3148' },
  { id: 'bitcoin-cash', symbol: 'BCH', color: '#8DC351' },
  { id: 'uniswap', symbol: 'UNI', color: '#FF007A' },
  { id: 'filecoin', symbol: 'FIL', color: '#0090FF' },
  { id: 'aptos', symbol: 'APT', color: '#00D4AA' },
  { id: 'algorand', symbol: 'ALGO', color: '#000000' },
  { id: 'vechain', symbol: 'VET', color: '#15BDFF' },
  { id: 'internet-computer', symbol: 'ICP', color: '#29ABE2' },
  { id: 'hedera-hashgraph', symbol: 'HBAR', color: '#000000' },
  { id: 'near', symbol: 'NEAR', color: '#000000' }
];

const API = process.env.REACT_APP_BACKEND_URL;

export default function PriceTickerEnhanced() {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPrices = async () => {    
    try {
      // Try backend first
      const backendRes = await axios.get(`${API}/api/prices/live`, { timeout: 5000 });
      if (backendRes.data.success && backendRes.data.prices) {
        const priceData = TICKER_COINS.map(coin => {
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
      console.warn('Backend prices unavailable, using CoinGecko');
    }
    
    // Fallback to CoinGecko
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${TICKER_COINS.map(c => c.id).join(',')}&vs_currencies=gbp&include_24hr_change=true`,
        { timeout: 5000 }
      );
      
      const priceData = TICKER_COINS.map(coin => {
        const data = response.data[coin.id];
        return {
          ...coin,
          price: data?.gbp || 0,
          change: data?.gbp_24h_change || 0
        };
      }).filter(c => c.price > 0);
      
      setPrices(priceData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching prices:', error);
      setLoading(false);
    }
  };

  if (loading || prices.length === 0) {
    return (
      <div style={{
        background: 'linear-gradient(90deg, rgba(5, 12, 30, 0.98), rgba(28, 21, 64, 0.98))',
        borderBottom: '2px solid rgba(56, 189, 248, 0.3)',
        height: '48px',
        minHeight: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: '0.5rem 0',
        boxShadow: '0 4px 20px rgba(56, 189, 248, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
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
      borderBottom: '2px solid rgba(56, 189, 248, 0.3)',
      height: '56px',
      overflow: 'visible',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 20px rgba(56, 189, 248, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
    }}>
      {/* Slow-moving neon gradient line at top */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(0, 217, 255, 0.6), rgba(56, 189, 248, 0.8), rgba(0, 217, 255, 0.6), transparent)',
        animation: 'gradientSlide 8s linear infinite',
        zIndex: 10
      }} />
      
      {/* Animated gradient background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.05), transparent)',
        animation: 'shimmer 3s infinite',
        pointerEvents: 'none'
      }} />
      
      <div style={{
        display: 'flex',
        animation: 'scroll 20s linear infinite',
        gap: '3rem',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Triple for seamless scroll */}
        {[...prices, ...prices, ...prices].map((coin, idx) => {
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
              {/* Coin Symbol with glow */}
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
              
              {/* Price with bright styling */}
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
              
              {/* Change indicator with glow */}
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
            transform: translateX(-33.33%);
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
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
