/**
 * Get real cryptocurrency logo from cryptologos.cc
 * @param {string} symbol - Coin symbol (BTC, ETH, etc.)
 * @returns {string} - Path to logo image
 */
export const getCoinLogo = (symbol) => {
  const upperSymbol = symbol?.toUpperCase();
  return `/crypto-logos/${upperSymbol?.toLowerCase() || 'btc'}.png`;
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
