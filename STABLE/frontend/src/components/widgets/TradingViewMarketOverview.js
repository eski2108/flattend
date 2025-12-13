import React, { useEffect, useRef } from 'react';

const TradingViewMarketOverview = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      dateRange: '1D',
      showChart: true,
      locale: 'en',
      width: '100%',
      height: '600',
      largeChartUrl: '',
      isTransparent: true,
      showSymbolLogo: true,
      showFloatingTooltip: false,
      plotLineColorGrowing: 'rgba(0, 229, 255, 1)',
      plotLineColorFalling: 'rgba(239, 68, 68, 1)',
      gridLineColor: 'rgba(14, 27, 42, 0.15)',
      scaleFontColor: 'rgba(230, 241, 255, 1)',
      belowLineFillColorGrowing: 'rgba(0, 229, 255, 0.12)',
      belowLineFillColorFalling: 'rgba(239, 68, 68, 0.12)',
      belowLineFillColorGrowingBottom: 'rgba(0, 229, 255, 0)',
      belowLineFillColorFallingBottom: 'rgba(239, 68, 68, 0)',
      symbolActiveColor: 'rgba(0, 229, 255, 0.12)',
      tabs: [
        {
          title: 'Crypto',
          symbols: [
            { s: 'BITSTAMP:BTCUSD', d: 'Bitcoin' },
            { s: 'BITSTAMP:ETHUSD', d: 'Ethereum' },
            { s: 'BINANCE:USDTUSD', d: 'Tether' },
            { s: 'BINANCE:BNBUSD', d: 'BNB' },
            { s: 'BINANCE:SOLUSD', d: 'Solana' },
            { s: 'BITSTAMP:XRPUSD', d: 'XRP' },
            { s: 'BINANCE:ADAUSD', d: 'Cardano' },
            { s: 'BINANCE:AVAXUSD', d: 'Avalanche' },
            { s: 'BINANCE:DOGEUSD', d: 'Dogecoin' },
            { s: 'BINANCE:TRXUSD', d: 'TRON' },
            { s: 'BINANCE:DOTUSD', d: 'Polkadot' },
            { s: 'BINANCE:MATICUSD', d: 'Polygon' },
            { s: 'BITSTAMP:LTCUSD', d: 'Litecoin' },
            { s: 'BINANCE:LINKUSD', d: 'Chainlink' }
          ],
          originalTitle: 'Crypto'
        }
      ]
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
      border: '1px solid rgba(0, 229, 255, 0.25)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 0 28px rgba(0, 229, 255, 0.08)',
      marginBottom: '24px'
    }}>
      <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', marginBottom: '20px' }}>
        <span style={{ color: '#00E5FF' }}>•</span> Market Overview
      </h3>
      <div className="tradingview-widget-container" ref={containerRef}>
        <div className="tradingview-widget-container__widget"></div>
      </div>
    </div>
  );
};

export default TradingViewMarketOverview;
