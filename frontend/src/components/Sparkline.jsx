import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export default function Sparkline({ currency, color, hasBalance }) {
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only load real data if user has balance
    if (hasBalance) {
      loadPriceHistory();
    } else {
      setLoading(false);
    }
  }, [currency, hasBalance]);

  const loadPriceHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/savings/price-history/${currency}`);
      if (response.data.success && response.data.prices) {
        setPriceHistory(response.data.prices);
      } else {
        setPriceHistory([]);
      }
    } catch (error) {
      console.error(`Failed to load price history for ${currency}:`, error);
      setPriceHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // If no balance, show flat muted line (inactive asset)
  if (!hasBalance) {
    return (
      <svg width="100%" height="100%" viewBox="0 0 100 35" preserveAspectRatio="none">
        <line
          x1="0"
          y1="17.5"
          x2="100"
          y2="17.5"
          stroke="#2A2F3A"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    );
  }

  if (loading) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '10px', color: '#6B7390' }}>...</div>
      </div>
    );
  }

  // If no data available, show flat grey line
  if (!priceHistory || priceHistory.length < 2) {
    return (
      <svg width="100%" height="100%" viewBox="0 0 100 35" preserveAspectRatio="none">
        <line
          x1="0"
          y1="17.5"
          x2="100"
          y2="17.5"
          stroke="#2A2F3A"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    );
  }

  // Normalize prices to fit in SVG viewBox
  const minPrice = Math.min(...priceHistory);
  const maxPrice = Math.max(...priceHistory);
  const priceRange = maxPrice - minPrice || 1;

  const points = priceHistory.map((price, i) => {
    const x = (i / (priceHistory.length - 1)) * 100;
    const y = 35 - ((price - minPrice) / priceRange) * 25 - 5;
    return `${x},${y}`;
  }).join(' ');

  // Determine if trend is positive (last > first)
  const isPositive = priceHistory[priceHistory.length - 1] >= priceHistory[0];
  const strokeColor = isPositive ? '#2DFF9A' : '#FF5C5C';

  return (
    <svg width="100%" height="100%" viewBox="0 0 100 35" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
