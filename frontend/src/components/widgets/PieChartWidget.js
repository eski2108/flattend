import React, { useState } from 'react';

const PieChartWidget = ({ assets }) => {
  const [selectedAsset, setSelectedAsset] = useState(null);

  const total = assets.reduce((sum, asset) => sum + asset.value, 0);
  
  const slices = assets.reduce((acc, asset) => {
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
      
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Pie Chart */}
        <svg width="180" height="180" style={{ flexShrink: 0 }}>
          {slices.map((slice, index) => (
            <path
              key={index}
              d={describeArc(90, 90, 80, slice.startAngle, slice.endAngle)}
              fill={slice.color}
              opacity={selectedAsset === slice.symbol ? 1 : 0.8}
              style={{
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                filter: `drop-shadow(0 0 ${selectedAsset === slice.symbol ? '12px' : '6px'} ${slice.color}66)`
              }}
              onClick={() => setSelectedAsset(slice.symbol === selectedAsset ? null : slice.symbol)}
              onMouseEnter={(e) => e.target.style.opacity = '1'}
              onMouseLeave={(e) => e.target.style.opacity = selectedAsset === slice.symbol ? '1' : '0.8'}
            />
          ))}
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
