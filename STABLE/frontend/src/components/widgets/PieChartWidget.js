import React, { useState } from 'react';

const PieChartWidget = ({ assets }) => {
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Filter out assets with zero value and calculate total
  const validAssets = assets.filter(asset => asset.value > 0);
  const total = validAssets.reduce((sum, asset) => sum + asset.value, 0);
  
  // If no valid assets or total is 0, return empty state
  if (validAssets.length === 0 || total === 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
        border: '1px solid rgba(0, 198, 255, 0.25)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 0 20px rgba(0, 198, 255, 0.15)',
        minHeight: '250px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: '#8F9BB3' }}>
          <p style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No Portfolio Data</p>
          <p style={{ fontSize: '13px' }}>Add assets to see allocation chart</p>
        </div>
      </div>
    );
  }
  
  const slices = validAssets.reduce((acc, asset) => {
    const percent = (asset.value / total) * 100;
    const angle = (percent / 100) * 360;
    const previousAngle = acc.length > 0 ? acc[acc.length - 1].endAngle : 0;
    const startAngle = previousAngle;
    const endAngle = previousAngle + angle;
    
    acc.push({
      ...asset,
      percent,
      startAngle,
      endAngle
    });
    
    return acc;
  }, []);

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const describeArc = (x, y, radius, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "L", x, y,
      "Z"
    ].join(" ");
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
      border: '1px solid rgba(0, 198, 255, 0.25)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 0 20px rgba(0, 198, 255, 0.15)',
      minHeight: '250px'
    }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Portfolio Allocation</h3>
      
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Pie Chart */}
        <svg width="200" height="200" viewBox="0 0 200 200" style={{ flexShrink: 0 }}>
          {/* Center circle for donut effect */}
          <circle cx="100" cy="100" r="30" fill="#0A1929" />
          
          {slices.map((slice, index) => {
            // Only render slice if it's visible (>0.5%)
            if (slice.percent < 0.5) return null;
            
            return (
              <path
                key={index}
                d={describeArc(100, 100, 85, slice.startAngle, slice.endAngle)}
                fill={slice.color}
                opacity={selectedAsset === slice.symbol ? 1 : 0.85}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  filter: `drop-shadow(0 0 ${selectedAsset === slice.symbol ? '15px' : '8px'} ${slice.color}88)`
                }}
                onClick={() => setSelectedAsset(slice.symbol === selectedAsset ? null : slice.symbol)}
                onMouseEnter={(e) => {
                  e.target.style.opacity = '1';
                  e.target.style.filter = `drop-shadow(0 0 18px ${slice.color}BB)`;
                }}
                onMouseLeave={(e) => {
                  e.target.style.opacity = selectedAsset === slice.symbol ? '1' : '0.85';
                  e.target.style.filter = `drop-shadow(0 0 ${selectedAsset === slice.symbol ? '15px' : '8px'} ${slice.color}88)`;
                }}
              />
            );
          })}
          
          {/* Center text showing total */}
          <text
            x="100"
            y="100"
            textAnchor="middle"
            fill="#00E5FF"
            fontSize="18"
            fontWeight="700"
            fontFamily="Inter, sans-serif"
          >
            {slices.length}
          </text>
          <text
            x="100"
            y="115"
            textAnchor="middle"
            fill="#8F9BB3"
            fontSize="11"
            fontWeight="500"
            fontFamily="Inter, sans-serif"
            letterSpacing="1"
          >
            ASSETS
          </text>
        </svg>

        {/* Legend */}
        <div style={{ flex: 1, minWidth: '150px' }}>
          {slices.map((slice, index) => (
            <div
              key={index}
              onClick={() => setSelectedAsset(slice.symbol === selectedAsset ? null : slice.symbol)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px',
                marginBottom: '6px',
                borderRadius: '8px',
                cursor: 'pointer',
                background: selectedAsset === slice.symbol ? 'rgba(0, 198, 255, 0.1)' : 'transparent',
                border: selectedAsset === slice.symbol ? '1px solid rgba(0, 198, 255, 0.3)' : '1px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: slice.color,
                boxShadow: `0 0 8px ${slice.color}66`
              }} />
              <span style={{ fontSize: '13px', color: '#FFFFFF', fontWeight: '500', flex: 1 }}>{slice.symbol}</span>
              <span style={{ fontSize: '13px', color: '#8F9BB3', fontWeight: '600' }}>{slice.percent.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PieChartWidget;
