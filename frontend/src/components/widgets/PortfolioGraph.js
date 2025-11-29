import React, { useState, useEffect } from 'react';
import CHXButton from '../CHXButton';

const PortfolioGraph = ({ data, totalValue }) => {
  const [timeRange, setTimeRange] = useState('7D');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const timeRanges = ['24H', '7D', '30D', '90D', '1Y', 'ALL'];

  // Mock data for demonstration - should be replaced with real data
  const generateMockData = () => {
    const points = timeRange === '24H' ? 24 : timeRange === '7D' ? 7 : 30;
    return Array.from({ length: points }, (_, i) => ({
      date: new Date(Date.now() - (points - i) * 3600000),
      value: totalValue * (0.95 + Math.random() * 0.1)
    }));
  };

  const graphData = data || generateMockData();
  const maxValue = Math.max(...graphData.map(d => d.value));
  const minValue = Math.min(...graphData.map(d => d.value));

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
      border: '1px solid rgba(0, 198, 255, 0.25)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 0 20px rgba(0, 198, 255, 0.15)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#FFFFFF', margin: 0 }}>Portfolio Value</h3>
        <div style={{ display: 'flex', gap: '6px' }}>
          {timeRanges.map(range => (
            <CHXButton
              key={range}
              onClick={() => setTimeRange(range)}
              coinColor="#00C6FF"
              variant={timeRange === range ? 'primary' : 'secondary'}
              size="small"
            >
              {range}
            </CHXButton>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', height: '240px', marginTop: '16px' }}>
        <svg width="100%" height="240" viewBox="0 0 800 240" preserveAspectRatio="none" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="graphGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#00C6FF', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: '#00C6FF', stopOpacity: 0 }} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Graph area fill */}
          <path
            d={`${graphData.map((point, i) => {
              const x = (i / (graphData.length - 1)) * 800;
              const y = 240 - ((point.value - minValue) / (maxValue - minValue)) * 200;
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')} L 800 240 L 0 240 Z`}
            fill="url(#graphGradient)"
          />
          
          {/* Graph line */}
          <path
            d={graphData.map((point, i) => {
              const x = (i / (graphData.length - 1)) * 800;
              const y = 240 - ((point.value - minValue) / (maxValue - minValue)) * 200;
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')}
            fill="none"
            stroke="#00C6FF"
            strokeWidth="3"
            filter="url(#glow)"
          />
          
          {/* Data points */}
          {graphData.map((point, i) => {
            const x = (i / (graphData.length - 1)) * 800;
            const y = 240 - ((point.value - minValue) / (maxValue - minValue)) * 200;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                fill="#00C6FF"
                stroke="#FFFFFF"
                strokeWidth="2"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          })}
        </svg>

        {hoveredPoint && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 198, 255, 0.95)',
            padding: '10px 16px',
            borderRadius: '10px',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: '600',
            boxShadow: '0 0 20px rgba(0, 198, 255, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            zIndex: 10
          }}>
            <div style={{ marginBottom: '4px' }}>{hoveredPoint.date.toLocaleDateString()}</div>
            <div style={{ fontSize: '16px', fontWeight: '700' }}>£{hoveredPoint.value.toFixed(2)}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioGraph;
