import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export default function Sparkline({ currency }) {
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
        <div style={{ fontSize: '10px', color: '#5E6A7D' }}>...</div>
      </div>
    );
  }

  // If no data available, show NOTHING (empty space)
  if (!priceHistory || priceHistory.length < 2) {
    return <div style={{ width: '100%', height: '100%' }} />;
  }

  // Normalize prices to fit in SVG viewBox
  const minPrice = Math.min(...priceHistory);
  const maxPrice = Math.max(...priceHistory);
  const priceRange = maxPrice - minPrice || 1;

  const points = priceHistory.map((price, i) => {
    const x = (i / (priceHistory.length - 1)) * 120;
    const y = 40 - ((price - minPrice) / priceRange) * 30 - 5;
    return `${x},${y}`;
  }).join(' ');

  // Determine if trend is positive (last > first)
  const isPositive = priceHistory[priceHistory.length - 1] >= priceHistory[0];
  const strokeColor = isPositive ? '#16C784' : '#EA3943';

  return (
    <svg width="100%" height="100%" viewBox="0 0 120 40" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}
