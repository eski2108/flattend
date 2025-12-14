import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export default function Sparkline({ currency, color }) {
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPriceHistory();
  }, [currency]);

  const loadPriceHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/savings/price-history/${currency}`);
      if (response.data.success && response.data.prices) {
        setPriceHistory(response.data.prices);
      } else {
        // No data available
        setPriceHistory([]);
      }
    } catch (error) {
      console.error(`Failed to load price history for ${currency}:`, error);
      setPriceHistory([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '10px', color: '#6B7390' }}>...</div>
      </div>
    );
  }

  if (!priceHistory || priceHistory.length < 2) {
    // Show flat grey line when no data
    return (
      <svg width="100%" height="100%" viewBox="0 0 120 40" preserveAspectRatio="none">
        <line
          x1="0"
          y1="20"
          x2="120"
          y2="20"
          stroke="#2A2F3A"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    );
  }

  // Normalize prices to fit in SVG viewBox
  const minPrice = Math.min(...priceHistory);
  const maxPrice = Math.max(...priceHistory);
  const priceRange = maxPrice - minPrice || 1; // Avoid division by zero

  const points = priceHistory.map((price, i) => {
    const x = (i / (priceHistory.length - 1)) * 120;
    const y = 40 - ((price - minPrice) / priceRange) * 30 - 5; // Scale to 5-35 range
    return `${x},${y}`;
  }).join(' ');

  // Determine if trend is positive (last > first)
  const isPositive = priceHistory[priceHistory.length - 1] >= priceHistory[0];
  const strokeColor = isPositive ? '#2DFF9A' : '#FF5C5C';

  return (
    <svg width="100%" height="100%" viewBox="0 0 120 40" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
