import React, { useState, useEffect } from 'react';

// Dynamically import ApexCharts
let Chart = null;
try {
  Chart = require('react-apexcharts').default;
} catch (e) {
  console.warn('ApexCharts not loaded:', e);
}

const CoinSparkline = ({ symbol, color = '#00C6FF', height = 40 }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    loadSparklineData();
    // Refresh every 5 minutes
    const interval = setInterval(loadSparklineData, 300000);
    return () => clearInterval(interval);
  }, [symbol]);

  const loadSparklineData = async () => {
    try {
      if (!Chart) {
        setHasError(true);
        setLoading(false);
        return;
      }

      // Generate realistic 24H price movement
      // In production, this would fetch from a price feed API
      const points = 24;
      const now = Date.now();
      const data = [];
      
      for (let i = 0; i < points; i++) {
        const timestamp = now - (points - i - 1) * 3600000; // 1 hour intervals
        const variance = 0.98 + Math.random() * 0.04; // ±2% variance
        const value = 100 * variance; // Normalized to 100
        data.push([timestamp, value]);
      }
      
      setChartData(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load sparkline data:', error);
      setHasError(true);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        height: `${height}px`,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.3
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          border: `2px solid ${color}33`,
          borderTop: `2px solid ${color}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  const options = {
    chart: {
      type: 'line',
      sparkline: {
        enabled: true
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      }
    },
    stroke: {
      curve: 'smooth',
      width: 2,
      colors: [color]
    },
    tooltip: {
      enabled: false
    },
    fill: {
      opacity: 0
    },
    markers: {
      size: 0
    },
    xaxis: {
      type: 'datetime'
    },
    yaxis: {
      show: false
    },
    grid: {
      show: false
    },
    colors: [color]
  };

  const series = [{
    name: symbol,
    data: chartData
  }];

  return (
    <div style={{
      height: `${height}px`,
      width: '100%',
      opacity: 0.9
    }}>
      <Chart
        options={options}
        series={series}
        type="line"
        height={height}
      />
    </div>
  );
};

export default CoinSparkline;
