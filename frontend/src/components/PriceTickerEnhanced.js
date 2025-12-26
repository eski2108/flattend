import React, { useState, useEffect } from 'react';
import { IoTrendingDown, IoTrendingUp } from 'react-icons/io5';
import axios from 'axios';

const COIN_COLORS = {
  'BTC': '#F7931A', 'ETH': '#627EEA', 'USDT': '#26A17B', 'BNB': '#F3BA2F',
  'SOL': '#14F195', 'XRP': '#00AAE4', 'ADA': '#0033AD', 'AVAX': '#E84142',
  'DOGE': '#C2A633', 'TRX': '#FF0013', 'DOT': '#E6007A', 'MATIC': '#8247E5',
  'LTC': '#345D9D', 'LINK': '#2A5ADA', 'XLM': '#14B6E7', 'XMR': '#FF6600',
  'ATOM': '#2E3148', 'BCH': '#8DC351', 'UNI': '#FF007A', 'FIL': '#0090FF',
  'APT': '#00D4AA', 'USDC': '#2775CA', 'DAI': '#F5AC37', 'SHIB': '#FFA409'
};

const API = process.env.REACT_APP_BACKEND_URL;

export default function PriceTickerEnhanced() {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await axios.get(`${API}/api/prices/live`);
        const prices = response.data?.prices || {};
        
        const coinList = Object.entries(prices)
          .filter(([symbol]) => COIN_COLORS[symbol])
          .slice(0, 12)  // Reduced to prevent overflow
          .map(([symbol, data]) => ({
            symbol,
            price: data.price_usd || data.price || 0,
            change: data.change_24h || 0,
            color: COIN_COLORS[symbol] || '#00E5FF'
          }));
        
        setCoins(coinList);
        setLoading(false);
      } catch (error) {
        console.error('Ticker error:', error);
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || coins.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '44px',
        maxHeight: '44px',
        background: 'linear-gradient(90deg, #050C1E, #1C1540)',
        borderBottom: '1px solid rgba(0, 229, 255, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#00F0FF',
        fontSize: '14px',
        overflow: 'hidden',
        flexShrink: 0
      }}>
        Loading prices...
      </div>
    );
  }

  return (
    <div id="price-ticker-root" style={{
      width: '100%',
      height: '44px',
      maxHeight: '44px',
      minHeight: '44px',
      background: 'linear-gradient(90deg, #050C1E, #1C1540)',
      borderBottom: '1px solid rgba(0, 229, 255, 0.3)',
      overflow: 'hidden',
      position: 'relative',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center'
    }}>
      <style>{`
        #price-ticker-root {
          height: 44px !important;
          max-height: 44px !important;
          min-height: 44px !important;
          overflow: hidden !important;
        }
        @keyframes tickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .single-ticker-track {
          display: inline-flex !important;
          flex-wrap: nowrap !important;
          animation: tickerScroll 35s linear infinite;
          width: max-content !important;
          height: 44px !important;
          align-items: center !important;
          white-space: nowrap !important;
        }
        .single-ticker-track:hover {
          animation-play-state: paused;
        }
        .ticker-coin-item {
          display: inline-flex !important;
          flex-shrink: 0 !important;
          align-items: center !important;
          height: 44px !important;
          white-space: nowrap !important;
        }
      `}</style>
      <div className="single-ticker-track">
        {[...coins, ...coins].map((coin, idx) => (
          <div
            key={`${coin.symbol}-${idx}`}
            className="ticker-coin-item"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 20px',
              height: '44px',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <span style={{ 
              color: coin.color, 
              fontWeight: '700',
              fontSize: '14px'
            }}>
              {coin.symbol}
            </span>
            <span style={{ color: '#FFFFFF', fontSize: '14px' }}>
              ${coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{ 
              color: coin.change >= 0 ? '#22C55E' : '#EF4444',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px'
            }}>
              {coin.change >= 0 ? <IoTrendingUp size={12} /> : <IoTrendingDown size={12} />}
              {Math.abs(coin.change).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
