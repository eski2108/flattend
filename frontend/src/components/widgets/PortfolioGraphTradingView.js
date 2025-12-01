import React, { useEffect, useRef, useState } from 'react';
import { Calendar, IoCalendar, IoTrendingUp } from 'react-icons/io5';

const PortfolioGraphTradingView = ({ totalValue, userId }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [timeframe, setTimeframe] = useState('7D');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Generate realistic portfolio data based on current value
  const generatePortfolioData = (days) => {
    const data = [];
    const now = Date.now() / 1000;
    const interval = (24 * 60 * 60); // 1 day in seconds
    const startValue = totalValue * 0.85; // Start 15% lower
    
    for (let i = days; i >= 0; i--) {
      const timestamp = now - (i * interval);
      // Add some realistic volatility
      const volatility = (Math.random() - 0.5) * (totalValue * 0.05);
      const trend = ((days - i) / days) * (totalValue - startValue);
      const value = startValue + trend + volatility;
      
      data.push({
        time: timestamp,
        value: value > 0 ? value : totalValue * 0.5
      });
    }
    
    return data;
  };

  useEffect(() => {
    // Generate data based on timeframe
    const days = timeframe === '24H' ? 1 : timeframe === '7D' ? 7 : timeframe === '30D' ? 30 : 90;
    const data = generatePortfolioData(days);
    setChartData(data);
    setLoading(false);
  }, [timeframe, totalValue]);

  useEffect(() => {
    if (!chartContainerRef.current || chartData.length === 0) return;

    // Load TradingView Lightweight Charts library
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';
    script.async = true;
    script.onload = () => {
      if (!window.LightweightCharts) return;

      // Clear previous chart
      chartContainerRef.current.innerHTML = '';

      // Create chart
      const chart = window.LightweightCharts.createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 320,
        layout: {
          background: { type: 'solid', color: 'transparent' },
          textColor: '#E6F1FF',
        },
        grid: {
          vertLines: { color: 'rgba(14, 27, 42, 0.15)' },
          horzLines: { color: 'rgba(14, 27, 42, 0.15)' },
        },
        crosshair: {
          mode: window.LightweightCharts.CrosshairMode.Normal,
          vertLine: {
            color: '#00E5FF',
            width: 1,
            style: window.LightweightCharts.LineStyle.Dashed,
            labelBackgroundColor: '#00E5FF',
          },
          horzLine: {
            color: '#00E5FF',
            width: 1,
            style: window.LightweightCharts.LineStyle.Dashed,
            labelBackgroundColor: '#00E5FF',
          },
        },
        rightPriceScale: {
          borderColor: 'rgba(0, 229, 255, 0.2)',
          textColor: '#E6F1FF',
        },
        timeScale: {
          borderColor: 'rgba(0, 229, 255, 0.2)',
          timeVisible: true,
          secondsVisible: false,
          textColor: '#E6F1FF',
        },
        handleScale: {
          axisPressedMouseMove: {
            time: true,
            price: true,
          },
        },
      });

      // Create area series
      const areaSeries = chart.addAreaSeries({
        topColor: 'rgba(0, 229, 255, 0.4)',
        bottomColor: 'rgba(0, 229, 255, 0.0)',
        lineColor: '#00E5FF',
        lineWidth: 3,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 6,
        crosshairMarkerBorderColor: '#00E5FF',
        crosshairMarkerBackgroundColor: '#ffffff',
      });

      // Set data
      areaSeries.setData(chartData);

      // Fit content
      chart.timeScale().fitContent();

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current) {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);
      chartRef.current = chart;

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    };

    document.head.appendChild(script);

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [chartData]);

  const timeframes = ['24H', '7D', '30D', '90D'];

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
      border: '1px solid rgba(0, 229, 255, 0.25)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 0 28px rgba(0, 229, 255, 0.08)',
      marginBottom: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <IoTrendingUp size={24} color="#00E5FF" strokeWidth={2.5} />
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>Portfolio Performance</h3>
        </div>
        
        {/* Timeframe Buttons */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0, 0, 0, 0.3)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(0, 229, 255, 0.15)' }}>
          {timeframes.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: timeframe === tf ? 'linear-gradient(135deg, #00E5FF 0%, #00C6FF 100%)' : 'transparent',
                color: timeframe === tf ? '#000000' : '#A3AEC2',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: timeframe === tf ? '0 0 20px rgba(0, 229, 255, 0.4)' : 'none'
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      {loading ? (
        <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00E5FF' }}>
          <div style={{ textAlign: 'center' }}>
            <IoCalendar className="w-8 h-8 text-cyan-400 animate-pulse mx-auto mb-2" />
            <p>Loading chart data...</p>
          </div>
        </div>
      ) : (
        <div 
          ref={chartContainerRef} 
          style={{ 
            width: '100%', 
            height: '320px',
            borderRadius: '12px',
            overflow: 'hidden'
          }} 
        />
      )}

      {/* Decorative Elements */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.6), transparent)',
        boxShadow: '0 0 10px rgba(0, 229, 255, 0.3)'
      }} />
    </div>
  );
};

export default PortfolioGraphTradingView;