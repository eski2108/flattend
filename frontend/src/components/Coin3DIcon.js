import React, { useState, useEffect } from 'react';

/**
 * 🔒 LOCKED - 3D Coin Icon Component (OPTIMIZED)
 * 
 * OPTIMIZATIONS:
 * - No lazy loading for immediate render
 * - Preloaded major coin logos
 * - Instant fallback to prevent layout shift
 * - Cached in browser
 */

// Top coins to preload immediately
const PRIORITY_COINS = ['btc', 'eth', 'usdt', 'bnb', 'sol', 'xrp', 'usdc', 'ada', 'doge', 'dot'];

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

// Preload priority coins on module load
if (typeof window !== 'undefined') {
  PRIORITY_COINS.forEach(coin => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = `/assets/coins/3d/${coin}.png`;
    document.head.appendChild(link);
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
  doge: '#C2A633', dot: '#E6007A', ltc: '#345D9D', matic: '#8247E5'
};

const Coin3DIcon = ({ symbol, size = 40, style = {} }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const clean = cleanSymbol(symbol);
  const has3DLogo = COINS_WITH_3D_LOGOS.has(clean);
  const isPriority = PRIORITY_COINS.includes(clean);
  
  const logoSrc = has3DLogo 
    ? `/assets/coins/3d/${clean}.png`
    : null;
  
  const fallbackColor = COIN_COLORS[clean] || '#00E5FF';
  
  const badgeStyle = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
    borderRadius: '50%',
    background: error || !logoSrc ? fallbackColor : 'linear-gradient(145deg, #2a2f45, #1a1f35)',
    border: '1.5px solid rgba(0, 229, 255, 0.3)',
    boxShadow: '0 0 8px rgba(0,229,255,0.3), 0 0 16px rgba(0,229,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${Math.floor(size * 0.1)}px`,
    overflow: 'hidden',
    flexShrink: 0,
    ...style
  };
  
  // Instant text fallback while loading
  if (!loaded && !error && logoSrc) {
    return (
      <div style={badgeStyle}>
        <span style={{ 
          color: '#fff', 
          fontWeight: 'bold', 
          fontSize: `${size * 0.35}px`,
          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
        }}>
          {clean.substring(0, 3).toUpperCase()}
        </span>
        <img
          src={logoSrc}
          alt={clean.toUpperCase()}
          style={{ display: 'none' }}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      </div>
    );
  }
  
  if (error || !logoSrc) {
    return (
      <div style={badgeStyle}>
        <span style={{ 
          color: '#fff', 
          fontWeight: 'bold', 
          fontSize: `${size * 0.35}px`,
          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
        }}>
          {clean.substring(0, 3).toUpperCase()}
        </span>
      </div>
    );
  }
  
  return (
    <div style={badgeStyle}>
      <img
        src={logoSrc}
        alt={clean.toUpperCase()}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          borderRadius: '50%'
        }}
      />
    </div>
  );
};

export default Coin3DIcon;
