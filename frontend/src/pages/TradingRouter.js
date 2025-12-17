import React, { useState, useEffect } from 'react';
import SpotTradingPro from './SpotTradingPro';
import MobileMarketSelection from './MobileMarketSelection';

/**
 * TradingRouter - Responsive component that shows:
 * - MobileMarketSelection on mobile (width <= 768px)
 * - SpotTradingPro on desktop (width > 768px)
 */
export default function TradingRouter() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile: Show clean market selection list
  if (isMobile) {
    return <MobileMarketSelection />;
  }

  // Desktop: Show full trading view with charts
  return <SpotTradingPro />;
}
