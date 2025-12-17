# 🔄 HOW TO RESTORE COIN LOGOS IF LOST

## Quick Reference Guide

---

## STEP 1: Check What's Missing

```bash
cd /app/frontend/public/assets/coins/3d
ls *.png | wc -l
# Should show 227
```

---

## STEP 2: Download from IconScout

### Option A: Manual Download
1. Go to https://iconscout.com/3d-icons/crypto
2. Search for coin name (e.g., "bitcoin", "ethereum")
3. Download PNG with transparent background
4. Save as `/app/frontend/public/assets/coins/3d/{symbol}.png`

### Option B: Automated Script

```bash
#!/bin/bash
cd /app/frontend/public/assets/coins/3d

download_coin() {
  local search=$1
  local symbol=$2
  url=$(curl -sL "https://iconscout.com/3d-icons/${search}" 2>/dev/null | grep -o "https://cdn3d.iconscout.com[^\"]*\.png" | head -1)
  if [ -n "$url" ]; then
    curl -sL "$url" -o "${symbol}.png" 2>/dev/null
    echo "✅ ${symbol}"
  else
    echo "❌ ${symbol} - not found"
  fi
}

# Download major coins
download_coin "bitcoin" "btc"
download_coin "ethereum" "eth"
download_coin "solana" "sol"
download_coin "cardano" "ada"
download_coin "dogecoin" "doge"
download_coin "polkadot" "dot"
download_coin "chainlink" "link"
download_coin "litecoin" "ltc"
download_coin "avalanche" "avax"
download_coin "cosmos" "atom"
download_coin "uniswap" "uni"
download_coin "tron" "trx"
download_coin "shiba" "shib"
download_coin "tether" "usdt"
download_coin "usdc" "usdc"
download_coin "binance" "bnb"
download_coin "ripple" "xrp"
download_coin "polygon" "matic"
download_coin "stellar" "xlm"
download_coin "monero" "xmr"
# Add more as needed...
```

---

## STEP 3: Update Component (if needed)

If `Coin3DIcon.js` is missing, recreate it:

```javascript
import React from 'react';

const COINS_WITH_3D_LOGOS = [
  // Add all 227 coin symbols here
  'btc', 'eth', 'sol', 'ada', 'doge', /* ... */
];

const cleanSymbol = (symbol) => {
  if (!symbol) return 'btc';
  return symbol
    .replace(/ERC20|TRC20|BEP20|MAINNET|BSC|ARBITRUM|POLYGON|SOL|ARB|OP|BASE|ARC20|MATIC|CELO|LNA|USDCE|TON|ALGO|-.*$/gi, '')
    .trim()
    .toLowerCase();
};

const Coin3DIcon = ({ symbol, size = 40, style = {} }) => {
  const clean = cleanSymbol(symbol);
  const has3DLogo = COINS_WITH_3D_LOGOS.includes(clean);
  
  const logoSrc = has3DLogo 
    ? `/assets/coins/3d/${clean}.png`
    : '/assets/coins/3d/placeholder.svg';
  
  const badgeStyle = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
    borderRadius: '50%',
    background: 'linear-gradient(145deg, #2a2f45, #1a1f35)',
    border: '1.5px solid rgba(0, 229, 255, 0.3)',
    boxShadow: '0 0 8px rgba(0,229,255,0.3), 0 0 16px rgba(0,229,255,0.15), 0 2px 8px rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${Math.floor(size * 0.1)}px`,
    overflow: 'hidden',
    flexShrink: 0,
    ...style
  };
  
  return (
    <div style={badgeStyle}>
      <img
        src={logoSrc}
        alt={clean.toUpperCase()}
        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
        loading="lazy"
      />
    </div>
  );
};

export default Coin3DIcon;
```

---

## STEP 4: Restart Frontend

```bash
sudo supervisorctl restart frontend
```

---

## STEP 5: Verify

Check the Instant Buy page - all coins should show unique 3D logos.

---

## ICON SCOUT SEARCH MAPPING

| Symbol | Search Term |
|--------|-------------|
| BTC | bitcoin |
| ETH | ethereum |
| SOL | solana |
| ADA | cardano |
| DOGE | dogecoin |
| DOT | polkadot |
| LINK | chainlink |
| LTC | litecoin |
| AVAX | avalanche |
| ATOM | cosmos |
| UNI | uniswap |
| TRX | tron |
| SHIB | shiba |
| USDT | tether |
| BNB | binance |
| XRP | ripple |
| MATIC | polygon |
| XLM | stellar |
| XMR | monero |
| PEPE | pepe |
| FLOKI | floki |
| ARB | arbitrum |
| OP | optimism |
| TON | toncoin |
| SUI | sui |
| APT | aptos |

---

## 📞 SUPPORT

If issues persist, refer to `/COIN_LOGOS_MASTER_GUIDE.md` for full documentation.
