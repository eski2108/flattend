import React, { useState, useRef, useEffect, memo } from 'react';

/**
 * 🔒 LOCKED - 3D Coin Icon Component (PRODUCTION OPTIMIZED v2)
 * 
 * OPTIMIZATIONS:
 * - Zero visual jitter - stable container renders immediately
 * - Images load in background without layout shift
 * - CSS transition for smooth fade-in (no React state flicker)
 * - Preloaded major coin logos on module init
 * - Memoized for performance in large lists
 */

// Top coins to preload immediately
const PRIORITY_COINS = ['btc', 'eth', 'usdt', 'bnb', 'sol', 'xrp', 'usdc', 'ada', 'doge', 'dot', 'ltc', 'link'];

// 227 coins with 3D logos
const COINS_WITH_3D_LOGOS = new Set([
  '1inch', 'aave', 'ada', 'aitech', 'algo', 'ape', 'apt', 'aptos', 'arb', 'arpa',
  'arv', 'aster', 'atom', 'ava2', 'avax', 'avaxc', 'awe', 'axs', 'babydoge', 'bad',
  'banana', 'bat', 'bazed', 'bch', 'beam', 'befi', 'bel', 'bera', 'bifi', 'bnb',
  'boba', 'bonk', 'brett', 'btc', 'bttc', 'busd', 'c98', 'cake', 'cati', 'cfx',
  'cgpt', 'chr', 'chz', 'comp', 'cro', 'crv', 'cspr', 'ctsi', 'cult', 'cvc',
  'dai', 'dao', 'dash', 'dcr', 'dgb', 'dgmoon', 'dino', 'doge', 'dogs', 'dot',
  'egld', 'eos', 'etc', 'eth', 'ethw', 'eurr', 'fdusd', 'fet', 'fil', 'fitfi',
  'floki', 'flow', 'fluf', 'ftm', 'ftt', 'fun', 'g', 'gafa', 'gala', 'geth',
  'gmx', 'grt', 'gt', 'guard', 'hbar', 'hex', 'hmstr', 'hnt', 'hoge', 'hot',
  'icp', 'icx', 'id', 'ilv', 'imx', 'inj', 'iotx', 'jasmy', 'jst', 'jto',
  'jup', 'kaia', 'kas', 'kaspa', 'keanu', 'kiba', 'kishu', 'klv', 'knc', 'ldo',
  'leash', 'lingo', 'link', 'ltc', 'luna', 'lunc', 'major', 'mana', 'marsh', 'matic',
  'maticusdce', 'mew', 'mina', 'mkr', 'mnt', 'mog', 'mx', 'nano', 'near', 'neo',
  'netvr', 'newt', 'nftb', 'not', 'now', 'nwc', 'okb', 'om', 'omg', 'ondo',
  'ont', 'op', 'peipei', 'pepe', 'pew', 'pika', 'pit', 'pls', 'plx', 'ponke',
  'pyth', 'pyusd', 'qtum', 'quack', 'raca', 'rjv', 'rndr', 'rune', 'rvn', 's',
  'sand', 'sei', 'sfund', 'shib', 'sidus', 'snek', 'snsy', 'sol', 'somi', 'stkk',
  'strk', 'stx', 'sui', 'sun', 'sundog', 'super', 'sushi', 'sxp', 'sysevm', 'tenshi',
  'tfuel', 'theta', 'tia', 'tko', 'tlos', 'ton', 'trump', 'trx', 'tusd', 'uni',
  'usdc', 'usdcalgo', 'usdd', 'usde', 'usdp', 'usdr', 'usds', 'usdt', 'usdtton', 'velo',
  'vet', 'vib', 'vlx', 'vps', 'waves', 'wbtc', 'wemix', 'wif', 'win', 'wld',
  'wolf', 'x', 'xaut', 'xdc', 'xec', 'xlm', 'xmr', 'xrp', 'xtz', 'xvg',
  'xyo', 'yfi', 'zec', 'zent', 'zil', 'zksync', 'zro'
]);

// Cache for loaded image status
const imageCache = new Map();

// Preload priority coins on module load - using Image() for better caching
if (typeof window !== 'undefined') {
  PRIORITY_COINS.forEach(coin => {
    const img = new Image();
    img.src = `/assets/coins/3d/${coin}.png`;
    img.onload = () => imageCache.set(coin, true);
    img.onerror = () => imageCache.set(coin, false);
  });
}

const cleanSymbol = (symbol) => {
  if (!symbol) return 'btc';
  return symbol
    .replace(/ERC20|TRC20|BEP20|MAINNET|BSC|ARBITRUM|POLYGON|SOL|ARB|OP|BASE|ARC20|MATIC|CELO|LNA|USDCE|TON|ALGO|-.*$/gi, '')
    .trim()
    .toLowerCase();
};

// Color fallbacks for instant render
const COIN_COLORS = {
  btc: '#F7931A', eth: '#627EEA', bnb: '#F3BA2F', sol: '#A78BFA',
  xrp: '#00AAE4', usdt: '#26A17B', usdc: '#2775CA', ada: '#0033AD',
  doge: '#C2A633', dot: '#E6007A', ltc: '#345D9D', matic: '#8247E5',
  link: '#2A5ADA', xlm: '#000000', trx: '#FF0013', avax: '#E84142'
};

const Coin3DIcon = memo(({ symbol, size = 40, style = {} }) => {
  const clean = cleanSymbol(symbol);
  const has3DLogo = COINS_WITH_3D_LOGOS.has(clean);
  const fallbackColor = COIN_COLORS[clean] || '#00E5FF';
  const logoSrc = has3DLogo ? `/assets/coins/3d/${clean}.png` : null;
  
  // Use ref to track image load without causing re-render
  const imgRef = useRef(null);
  const [imgReady, setImgReady] = useState(imageCache.get(clean) === true);
  
  // Container style - ALWAYS the same size, never changes
  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
    borderRadius: '50%',
    background: 'linear-gradient(145deg, #2a2f45, #1a1f35)',
    border: '1.5px solid rgba(0, 229, 255, 0.3)',
    boxShadow: '0 0 8px rgba(0,229,255,0.3), 0 0 16px rgba(0,229,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
    ...style
  };

  // Text fallback style - always present but hidden when image loads
  const textStyle = {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: `${size * 0.32}px`,
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    letterSpacing: '-0.5px',
    position: 'absolute',
    transition: 'opacity 0.15s ease-out',
    opacity: imgReady ? 0 : 1,
    pointerEvents: 'none'
  };

  // Image style - always rendered, fades in when loaded
  const imgStyle = {
    width: '85%',
    height: '85%',
    objectFit: 'contain',
    borderRadius: '50%',
    position: 'absolute',
    transition: 'opacity 0.15s ease-out',
    opacity: imgReady ? 1 : 0
  };

  const handleLoad = () => {
    imageCache.set(clean, true);
    setImgReady(true);
  };

  const handleError = () => {
    imageCache.set(clean, false);
    // Keep text visible on error
  };

  // If no logo available, just show text
  if (!logoSrc) {
    return (
      <div style={{...containerStyle, background: fallbackColor}}>
        <span style={{...textStyle, opacity: 1}}>
          {clean.substring(0, 3).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Text fallback - always rendered, fades out */}
      <span style={textStyle}>
        {clean.substring(0, 3).toUpperCase()}
      </span>
      {/* Image - always rendered, fades in */}
      <img
        ref={imgRef}
        src={logoSrc}
        alt={clean.toUpperCase()}
        style={imgStyle}
        onLoad={handleLoad}
        onError={handleError}
        loading="eager"
        decoding="async"
      />
    </div>
  );
});

Coin3DIcon.displayName = 'Coin3DIcon';

export default Coin3DIcon;
