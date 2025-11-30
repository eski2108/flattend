import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import axios from 'axios';

const COIN_EMOJIS = {
  'BTC': '₿', 'ETH': '🟣', 'USDT': '🟩', 'BNB': '🔶', 'SOL': '🔵',
  'XRP': '❎', 'ADA': '🔷', 'AVAX': '🔺', 'DOGE': '🐶', 'TRX': '🔻',
  'DOT': '🎯', 'MATIC': '🟪', 'LTC': '⚪', 'LINK': '🔗', 'XLM': '✴️',
  'XMR': '🟠', 'ATOM': '🪐', 'BCH': '💚', 'UNI': '🌸', 'FIL': '📁',
  'APT': '🅰️', 'USDC': '🟩', 'DAI': '💛', 'SHIB': '🐕'
};

const COIN_COLORS = {
  'BTC': '#F7931A', 'ETH': '#627EEA', 'USDT': '#26A17B', 'BNB': '#F3BA2F',
  'SOL': '#14F195', 'XRP': '#00AAE4', 'ADA': '#0033AD', 'AVAX': '#E84142',
  'DOGE': '#C2A633', 'TRX': '#FF0013', 'DOT': '#E6007A', 'MATIC': '#8247E5',
  'LTC': '#345D9D', 'LINK': '#2A5ADA', 'XLM': '#14B6E7', 'XMR': '#FF6600',
  'ATOM': '#2E3148', 'BCH': '#8DC351', 'UNI': '#FF007A', 'FIL': '#0090FF',
  'APT': '#00D4AA', 'USDC': '#2775CA'
};

const INITIAL_COINS = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOGE', 'TRX', 'DOT', 'MATIC', 'LTC', 'LINK', 'XLM', 'XMR', 'ATOM', 'BCH', 'UNI', 'FIL', 'APT', 'USDC', 'DAI', 'SHIB'];

const API = process.env.REACT_APP_BACKEND_URL;

export default function PriceTickerEnhanced() {
  const [coins] = useState(() => INITIAL_COINS.map(symbol => ({
    symbol,
    icon: COIN_EMOJIS[symbol] || '💎',
    color: COIN_COLORS[symbol] || '#00C6FF',
    price: 1000 + Math.random() * 500,
    change: (Math.random() - 0.5) * 10
  })));

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
      boxShadow: '0 4px 20px rgba(0, 229, 255, 0.15)',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.6), rgba(0, 229, 255, 0.9), rgba(0, 229, 255, 0.6), transparent)'
      }} />
      
      <div style={{
        display: 'flex',
        animation: 'tickerScroll 40s linear infinite',
        gap: '2rem',
        position: 'relative',
        zIndex: 1,
        willChange: 'transform'
      }}>
        {[...coins, ...coins, ...coins, ...coins, ...coins, ...coins, ...coins, ...coins, ...coins, ...coins].map((coin, idx) => {
          const isPositive = coin.change >= 0;
          
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
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <span style={{ fontSize: '18px', color: coin.color }}>
                {coin.icon}
              </span>
              
              <span style={{
                fontSize: '15px',
                fontWeight: '800',
                color: coin.color,
                letterSpacing: '0.5px'
              }}>
                {coin.symbol}
              </span>
              
              <span style={{
                fontSize: '15px',
                fontWeight: '700',
                color: '#FFFFFF'
              }}>
                £{coin.price.toFixed(2)}
              </span>
              
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '13px',
                fontWeight: '700',
                color: isPositive ? '#22C55E' : '#EF4444'
              }}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
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
            transform: translateX(-10%);
          }
        }
      `}</style>
    </div>
  );
}
