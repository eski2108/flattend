import React, { useEffect, useRef } from 'react';

const TradingViewSparkline = ({ symbol }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: `BITSTAMP:${symbol}USD`,
      width: '100%',
      height: '60',
      locale: 'en',
      dateRange: '1D',
      colorTheme: 'dark',
      trendLineColor: 'rgba(0, 229, 255, 1)',
      underLineColor: 'rgba(0, 229, 255, 0.3)',
      underLineBottomColor: 'rgba(0, 229, 255, 0)',
      isTransparent: true,
      autosize: false,
      largeChartUrl: '',
      noTimeScale: true,
      chartOnly: true
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol]);

  return (
    <div className="tradingview-widget-container" ref={containerRef} style={{ height: '60px', width: '120px' }}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
};

export default TradingViewSparkline;
