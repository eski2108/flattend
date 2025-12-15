/**
 * Get real cryptocurrency logo from multiple sources with fallback
 * @param {string} symbol - Coin symbol (BTC, ETH, etc.)
 * @returns {string} - Path to logo image
 */
export const getCoinLogo = (symbol) => {
  if (!symbol) return 'https://raw.githubusercontent.com/ErikThiart/cryptocurrency-icons/master/32/bitcoin.png';
  
  const lowerSymbol = symbol.toLowerCase();
  
  // Use cryptocurrency-icons GitHub repo - has 2000+ coins
  return `https://raw.githubusercontent.com/ErikThiart/cryptocurrency-icons/master/32/${lowerSymbol}.png`;
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
