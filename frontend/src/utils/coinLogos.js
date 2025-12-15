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
export const CoinLogo = ({ symbol, size = 28, style = {} }) => (
  <img
    src={getCoinLogo(symbol)}
    alt={symbol}
    style={{
      width: `${size}px`,
      height: `${size}px`,
      objectFit: 'contain',
      ...style
    }}
    onError={(e) => {
      // Fallback to a default coin icon if logo not found
      e.target.style.display = 'none';
    }}
  />
);

export default getCoinLogo;
