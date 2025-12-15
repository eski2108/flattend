/**
 * Get real cryptocurrency logo from multiple sources with fallback
 * @param {string} symbol - Coin symbol (BTC, ETH, etc.)
 * @returns {string} - Path to logo image
 */
export const getCoinLogo = (symbol) => {
  if (!symbol) return 'https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=029';
  
  const upperSymbol = symbol.toUpperCase();
  const lowerSymbol = symbol.toLowerCase();
  
  // Map of special cases
  const specialMappings = {
    'USDT': 'tether',
    'USDC': 'usd-coin',
    'BNB': 'bnb',
    'MATIC': 'polygon',
    'WBTC': 'wrapped-bitcoin',
    'DAI': 'multi-collateral-dai',
    'SHIB': 'shiba-inu',
    'UNI': 'uniswap',
    'LINK': 'chainlink',
    'AVAX': 'avalanche',
    'ATOM': 'cosmos',
    'XRP': 'xrp'
  };
  
  const coinName = specialMappings[upperSymbol] || lowerSymbol;
  
  // Use CryptoLogos.cc - most reliable
  return `https://cryptologos.cc/logos/${coinName}-${lowerSymbol}-logo.png?v=029`;
};

/**
 * Render crypto logo as img tag (for use in JSX)
 * @param {string} symbol - Coin symbol
 * @param {number} size - Size in pixels (default 28)
 * @returns {JSX} - Image element
 */
export const CoinLogo = ({ symbol, size = 28, style = {} }) => {
  const handleError = (e) => {
    // Fallback to cryptocurrency.link icons
    e.target.src = `https://lcw.nyc3.cdn.digitaloceanspaces.com/production/currencies/64/${symbol?.toLowerCase() || 'btc'}.png`;
    e.target.onerror = (err) => {
      // Final fallback - generic coin icon
      err.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iIzM0OEFBNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj4kPC90ZXh0Pjwvc3ZnPg==';
    };
  };
  
  return (
    <img
      src={getCoinLogo(symbol)}
      alt={symbol}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        ...style
      }}
      onError={handleError}
    />
  );
};

export default getCoinLogo;
