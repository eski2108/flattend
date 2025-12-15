/**
 * Get real cryptocurrency logo from multiple sources
 * @param {string} symbol - Coin symbol (BTC, ETH, etc.)
 * @returns {string} - Path to logo image
 */
export const getCoinLogo = (symbol) => {
  if (!symbol) return 'https://cryptologos.cc/logos/bitcoin-btc-logo.png';
  
  const upperSymbol = symbol.toUpperCase();
  const lowerSymbol = symbol.toLowerCase();
  
  // Try CryptoCompare first (has most coins)
  return `https://www.cryptocompare.com/media/37746251/${lowerSymbol}.png`;
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
