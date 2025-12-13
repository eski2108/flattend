import React, { useState, useEffect } from 'react';
import { IoTrendingDown, IoTrendingUp } from 'react-icons/io5';
import axios from 'axios';

const TICKER_COINS = ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple', 'tether'];

const PriceTicker = () => {
  const [prices, setPrices] = useState([]);

  const fetchPrices = async () => {
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${TICKER_COINS.join(',')}&vs_currencies=usd&include_24hr_change=true`
      );
      
      const priceData = TICKER_COINS.map(id => {
        const data = response.data[id];
        const symbol = id === 'bitcoin' ? 'BTC' : 
                      id === 'ethereum' ? 'ETH' :
                      id === 'binancecoin' ? 'BNB' :
                      id === 'solana' ? 'SOL' :
                      id === 'ripple' ? 'XRP' : 'USDT';
        
        return {
          id,
          symbol,
          price: data?.usd || 0,
          change: data?.usd_24h_change || 0
        };
      });
      
      setPrices(priceData);
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (prices.length === 0) return null;

  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(0, 13, 26, 0.95), rgba(10, 14, 39, 0.95))',
      borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
      padding: '0.75rem 0',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={{
        display: 'flex',
        animation: 'scroll 30s linear infinite',
        gap: '3rem'
      }}>
        {/* Duplicate for seamless scroll */}
        {[...prices, ...prices].map((coin, idx) => (
          <div
            key={`${coin.symbol}-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
              minWidth: 'fit-content'
            }}
          >
            <img 
              src={`/crypto-logos/${coin.symbol.toLowerCase()}.png`}
              alt={coin.symbol}
              style={{
                width: '20px',
                height: '20px',
                objectFit: 'contain'
              }}
            />
            <span style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#00F0FF',
              letterSpacing: '0.5px'
            }}>
              {coin.symbol}
            </span>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#fff'
            }}>
              ${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '12px',
              fontWeight: '600',
              color: coin.change >= 0 ? '#22C55E' : '#EF4444'
            }}>
              {coin.change >= 0 ? <IoTrendingUp size={14} /> : <IoTrendingDown size={14} />}
              {Math.abs(coin.change).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>

      <style>
        {`
          @keyframes scroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
        `}
      </style>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export default React.memo(PriceTicker);
