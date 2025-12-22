import React, { useState, useEffect } from 'react';
import { IoTrendingDown, IoTrendingUp, IoChevronDown } from 'react-icons/io5';
import Marquee from 'react-fast-marquee';
import axios from 'axios';

// Currency options
const CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar', field: 'price_usd' },
  GBP: { symbol: '£', name: 'British Pound', field: 'price_gbp' },
  EUR: { symbol: '€', name: 'Euro', field: 'price_eur' }
};

const COIN_EMOJIS = {
  'BTC': '₿', 'ETH': 'Ξ', 'USDT': '₮', 'USDC': '◈', 'BNB': '◆', 
  'XRP': '✕', 'SOL': '◎', 'LTC': 'Ł', 'DOGE': 'Ð', 'ADA': '₳', 
  'MATIC': '⬡', 'TRX': '◈', 'DOT': '●', 'AVAX': '▲', 'XLM': '✦', 
  'BCH': '₿', 'SHIB': '◆', 'TON': '◆', 'DAI': '◈', 'LINK': '⬡', 
  'ATOM': '⚛', 'XMR': '◈', 'FIL': '⬡', 'UNI': '◆', 'ETC': '◈', 
  'ALGO': '◎', 'VET': '◆', 'WBTC': '₿', 'APT': '◆', 'ARB': '◈',
  'OP': '◎', 'ICP': '∞', 'NEAR': '◈'
};

const COIN_COLORS = {
  'BTC': '#F7931A', 'ETH': '#627EEA', 'USDT': '#26A17B', 'BNB': '#F3BA2F',
  'SOL': '#14F195', 'XRP': '#00AAE4', 'ADA': '#0033AD', 'AVAX': '#E84142',
  'DOGE': '#C2A633', 'TRX': '#FF0013', 'DOT': '#E6007A', 'MATIC': '#8247E5',
  'LTC': '#345D9D', 'LINK': '#2A5ADA', 'XLM': '#14B6E7', 'XMR': '#FF6600',
  'ATOM': '#2E3148', 'BCH': '#8DC351', 'UNI': '#FF007A', 'FIL': '#0090FF',
  'APT': '#00D4AA', 'USDC': '#2775CA', 'DAI': '#F5AC37', 'SHIB': '#FFA409',
  'ARB': '#28A0F0', 'OP': '#FF0420', 'ICP': '#3B00B9', 'NEAR': '#00C08B',
  'ALGO': '#000000', 'VET': '#15BDFF'
};

const API = process.env.REACT_APP_BACKEND_URL;

export default function PriceTickerEnhanced() {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('USD'); // Default to USD
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [rawPrices, setRawPrices] = useState({});

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // Fetch NOWPayments currencies
        const nowResponse = await axios.get(`${API}/api/nowpayments/currencies`);
        const nowCoins = nowResponse.data?.currencies || [];

        // Fetch live prices
        const pricesResponse = await axios.get(`${API}/api/prices/live`);
        const livePrices = pricesResponse.data?.prices || {};
        setRawPrices(livePrices);

        // Merge data - ONLY include coins that have REAL prices (no random fallbacks)
        const currencyField = CURRENCIES[currency].field;
        const mergedCoins = nowCoins
          .filter(coin => COIN_EMOJIS[coin.toUpperCase()])
          .map(coin => {
            const symbol = coin.toUpperCase();
            const priceData = livePrices[symbol] || {};
            // Only use real prices - no random fallbacks
            const price = priceData[currencyField] || priceData.price_usd || 0;
            const change = priceData.change_24h || 0;

            return {
              symbol,
              icon: COIN_EMOJIS[symbol] || '💎',
              color: COIN_COLORS[symbol] || '#00C6FF',
              price: parseFloat(price),
              change: parseFloat(change)
            };
          })
          // Filter out coins with no price data
          .filter(coin => coin.price > 0);

        // Sort by market cap (BTC, ETH, etc. first)
        const order = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA'];
        mergedCoins.sort((a, b) => {
          const aIndex = order.indexOf(a.symbol);
          const bIndex = order.indexOf(b.symbol);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return 0;
        });

        setCoins(mergedCoins);
        setLoading(false);
      } catch (error) {
        console.error('❌ Failed to fetch ticker data:', error);
        // Show loading state on error - don't show fake random prices
        setCoins([]);
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [currency]); // Re-fetch when currency changes

  if (loading || coins.length === 0) {
    return (
      <div style={{
        width: '100%',
        background: 'linear-gradient(90deg, rgba(5, 12, 30, 0.98), rgba(28, 21, 64, 0.98))',
        borderBottom: '2px solid rgba(0, 229, 255, 0.3)',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#00F0FF'
      }}>
        Loading prices...
      </div>
    );
  }

  return (
    <div className="price-ticker-single" style={{
      width: '100%',
      background: 'linear-gradient(90deg, rgba(5, 12, 30, 0.98), rgba(28, 21, 64, 0.98))',
      borderBottom: '2px solid rgba(0, 229, 255, 0.3)',
      height: '48px',
      maxHeight: '48px',
      overflow: 'hidden',
      padding: 0,
      margin: 0,
      boxShadow: '0 4px 20px rgba(0, 229, 255, 0.15)',
      position: 'relative',
      flexShrink: 0
    }}>
      <style>{`
        .price-ticker-single {
          height: 48px !important;
          max-height: 48px !important;
          overflow: hidden !important;
        }
        .price-ticker-single .rfm-marquee-container {
          height: 48px !important;
          max-height: 48px !important;
          overflow: hidden !important;
          display: flex !important;
          flex-wrap: nowrap !important;
        }
        .price-ticker-single .rfm-marquee-container > .rfm-marquee:nth-child(2) {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          width: 0 !important;
          overflow: hidden !important;
        }
        .price-ticker-single .rfm-marquee {
          height: 48px !important;
          max-height: 48px !important;
          display: flex !important;
          flex-wrap: nowrap !important;
        }
        .price-ticker-single .rfm-initial-child-container {
          height: 48px !important;
          display: flex !important;
          flex-wrap: nowrap !important;
          align-items: center !important;
          white-space: nowrap !important;
        }
        .price-ticker-single .rfm-child {
          height: 48px !important;
          display: inline-flex !important;
          align-items: center !important;
          white-space: nowrap !important;
          flex-shrink: 0 !important;
        }
        .price-ticker-single .rfm-child > div {
          display: inline-flex !important;
          flex-shrink: 0 !important;
        }
      `}</style>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.6), rgba(0, 229, 255, 0.9), rgba(0, 229, 255, 0.6), transparent)'
      }} />
      
      <div className="ticker-scroll-container" style={{ height: '48px', maxHeight: '48px', overflow: 'hidden', position: 'relative' }}>
        <style>{`
          @keyframes tickerScroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .ticker-scroll-track {
            display: inline-flex !important;
            flex-wrap: nowrap !important;
            animation: tickerScroll 30s linear infinite;
            white-space: nowrap !important;
            width: max-content !important;
          }
          .ticker-scroll-track:hover {
            animation-play-state: paused;
          }
        `}</style>
        <div className="ticker-scroll-track" style={{ display: 'inline-flex', flexWrap: 'nowrap', alignItems: 'center', height: '48px', whiteSpace: 'nowrap', width: 'max-content' }}>
        {[...coins, ...coins, ...coins].map((coin, idx) => {
          const isPositive = coin.change >= 0;
          
          return (
            <div
              key={`${coin.symbol}-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                whiteSpace: 'nowrap',
                padding: '0.5rem 0.875rem',
                marginRight: '2rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                flexShrink: 0
              }}
            >
              <img 
                src={`/crypto-logos/${coin.symbol.toLowerCase()}.png`}
                alt={coin.symbol}
                style={{
                  width: '24px',
                  height: '24px',
                  objectFit: 'contain'
                }}
              />
              
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
                {CURRENCIES[currency].symbol}{coin.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </span>
              
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '13px',
                fontWeight: '700',
                color: isPositive ? '#22C55E' : '#EF4444'
              }}>
                {isPositive ? <IoTrendingUp size={12} /> : <IoTrendingDown size={12} />}
                {Math.abs(coin.change).toFixed(2)}%
              </span>
            </div>
          );
        })}
        </div>
      </div>
      
    </div>
  );
}
