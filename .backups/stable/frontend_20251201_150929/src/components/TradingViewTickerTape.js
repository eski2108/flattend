import React, { useEffect, useRef } from 'react';

const TradingViewTickerTape = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' },
        { proName: 'BITSTAMP:ETHUSD', title: 'Ethereum' },
        { proName: 'BINANCE:USDTUSD', title: 'Tether' },
        { proName: 'BINANCE:BNBUSD', title: 'BNB' },
        { proName: 'BINANCE:SOLUSD', title: 'Solana' },
        { proName: 'BITSTAMP:XRPUSD', title: 'XRP' },
        { proName: 'BINANCE:ADAUSD', title: 'Cardano' },
        { proName: 'BINANCE:AVAXUSD', title: 'Avalanche' },
        { proName: 'BINANCE:DOGEUSD', title: 'Dogecoin' },
        { proName: 'BINANCE:TRXUSD', title: 'TRON' },
        { proName: 'BINANCE:DOTUSD', title: 'Polkadot' },
        { proName: 'BINANCE:MATICUSD', title: 'Polygon' },
        { proName: 'BITSTAMP:LTCUSD', title: 'Litecoin' },
        { proName: 'BINANCE:LINKUSD', title: 'Chainlink' }
      ],
      showSymbolLogo: false,
      colorTheme: 'dark',
      isTransparent: true,
      displayMode: 'adaptive',
      locale: 'en'
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
      width: '100%',
      background: 'linear-gradient(90deg, rgba(5, 12, 30, 0.98), rgba(28, 21, 64, 0.98))',
      borderTop: '2px solid rgba(0, 229, 255, 0.3)',
      padding: '0',
      margin: '0',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.6), rgba(0, 229, 255, 0.9), rgba(0, 229, 255, 0.6), transparent)'
      }} />
      <div className="tradingview-widget-container" ref={containerRef} style={{ minHeight: '48px' }}>
        <div className="tradingview-widget-container__widget"></div>
      </div>
    </div>
  );
};

export default TradingViewTickerTape;
