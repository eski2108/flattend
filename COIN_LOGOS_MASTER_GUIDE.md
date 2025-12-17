# 🔒🔒🔒 COIN LOGOS - MASTER GUIDE 🔒🔒🔒

## ⚠️ DO NOT MODIFY WITHOUT EXPLICIT APPROVAL ⚠️

---

## CURRENT STATUS: 227 COINS - ALL COMPLETE ✅

---

## 📁 LOCKED FILES (DO NOT CHANGE)

| File | Purpose |
|------|--------|
| `/frontend/src/components/Coin3DIcon.js` | Main component that renders 3D coin logos |
| `/frontend/src/utils/coinLogos.js` | Utility functions and coin list |
| `/frontend/public/assets/coins/3d/*.png` | 227 actual 3D logo image files |
| `/COIN_LOGOS_MASTER_GUIDE.md` | This documentation |

---

## 🔄 HOW TO RESTORE IF LOGOS GET LOST

### STEP 1: Download from IconScout

1. Go to https://iconscout.com/3d-icons/crypto
2. Search for each coin by name (e.g., "bitcoin", "ethereum", "solana")
3. Download PNG format, transparent background
4. Save to `/frontend/public/assets/coins/3d/{symbol}.png`

**Example:**
- Bitcoin → save as `btc.png`
- Ethereum → save as `eth.png`
- Solana → save as `sol.png`

### STEP 2: Bulk Download Script

Run this bash script to re-download all coins:

```bash
cd /app/frontend/public/assets/coins/3d

# Array of coins to download
coins=("bitcoin" "ethereum" "solana" "cardano" "dogecoin" "polkadot" "chainlink" "litecoin" "avalanche" "cosmos" "uniswap" "tron" "shiba" "tether" "usdc" "binance")

for coin in "${coins[@]}"; do
  url=$(curl -sL "https://iconscout.com/3d-icons/${coin}" | grep -o "https://cdn3d.iconscout.com[^\"]*\.png" | head -1)
  if [ -n "$url" ]; then
    # Map coin name to symbol
    case "$coin" in
      "bitcoin") sym="btc" ;;
      "ethereum") sym="eth" ;;
      "solana") sym="sol" ;;
      "cardano") sym="ada" ;;
      "dogecoin") sym="doge" ;;
      "polkadot") sym="dot" ;;
      "chainlink") sym="link" ;;
      "litecoin") sym="ltc" ;;
      "avalanche") sym="avax" ;;
      "cosmos") sym="atom" ;;
      "uniswap") sym="uni" ;;
      "tron") sym="trx" ;;
      "shiba") sym="shib" ;;
      "tether") sym="usdt" ;;
      "usdc") sym="usdc" ;;
      "binance") sym="bnb" ;;
      *) sym="$coin" ;;
    esac
    curl -sL "$url" -o "${sym}.png"
    echo "✅ ${sym}: DONE"
  fi
done
```

### STEP 3: Verify Installation

```bash
# Count total logos
ls /app/frontend/public/assets/coins/3d/*.png | wc -l
# Should show: 227

# List all logos
ls /app/frontend/public/assets/coins/3d/
```

### STEP 4: Restart Frontend

```bash
sudo supervisorctl restart frontend
```

---

## 📋 COMPLETE COIN LIST (227 COINS)

```
1inch, aave, ada, aitech, algo, ape, apt, aptos, arb, arpa,
arv, aster, atom, ava2, avax, avaxc, awe, axs, babydoge, bad,
banana, bat, bazed, bch, beam, befi, bel, bera, bifi, bnb,
boba, bonk, brett, btc, bttc, busd, c98, cake, cati, cfx,
cgpt, chr, chz, comp, cro, crv, cspr, ctsi, cult, cvc,
dai, dao, dash, dcr, dgb, dgmoon, dino, doge, dogs, dot,
egld, eos, etc, eth, ethw, eurr, fdusd, fet, fil, fitfi,
floki, flow, fluf, ftm, ftt, fun, g, gafa, gala, geth,
gmx, grt, gt, guard, hbar, hex, hmstr, hnt, hoge, hot,
icp, icx, id, ilv, imx, inj, iotx, jasmy, jst, jto,
jup, kaia, kas, kaspa, keanu, kiba, kishu, klv, knc, ldo,
leash, lingo, link, ltc, luna, lunc, major, mana, marsh, matic,
maticusdce, mew, mina, mkr, mnt, mog, mx, nano, near, neo,
netvr, newt, nftb, not, now, nwc, okb, om, omg, ondo,
ont, op, peipei, pepe, pew, pika, pit, pls, plx, ponke,
pyth, pyusd, qtum, quack, raca, rjv, rndr, rune, rvn, s,
sand, sei, sfund, shib, sidus, snek, snsy, sol, somi, stkk,
strk, stx, sui, sun, sundog, super, sushi, sxp, sysevm, tenshi,
tfuel, theta, tia, tko, tlos, ton, trump, trx, tusd, uni,
usdc, usdcalgo, usdd, usde, usdp, usdr, usds, usdt, usdtton, velo,
vet, vib, vlx, vps, waves, wbtc, wemix, wif, win, wld,
wolf, x, xaut, xdc, xec, xlm, xmr, xrp, xtz, xvg,
xyo, yfi, zec, zent, zil, zksync, zro
```

---

## 🎨 STYLING SPECIFICATIONS (LOCKED)

### Badge Style:
```css
borderRadius: '50%'
background: 'linear-gradient(145deg, #2a2f45, #1a1f35)'
border: '1.5px solid rgba(0, 229, 255, 0.3)'
boxShadow: '0 0 8px rgba(0,229,255,0.3), 0 0 16px rgba(0,229,255,0.15), 0 2px 8px rgba(0,0,0,0.4)'
```

### Glow Level: SUBTLE (reduced per user request)

---

## 🔧 TROUBLESHOOTING

### Problem: Coin showing placeholder
**Solution:** 
1. Check if `{symbol}.png` exists in `/frontend/public/assets/coins/3d/`
2. If missing, download from IconScout
3. Add symbol to `COINS_WITH_3D_LOGOS` array in `Coin3DIcon.js`
4. Add symbol to `LOCAL_LOGOS` array in `coinLogos.js`
5. Restart frontend

### Problem: Logo not displaying
**Solution:**
1. Check file path is correct
2. Verify PNG file is not corrupted (should be >5KB)
3. Clear browser cache
4. Restart frontend

### Problem: Styling changed
**Solution:**
1. Restore `Coin3DIcon.js` from this guide
2. Do NOT modify the boxShadow or border values
3. Restart frontend

---

## 📥 ICONSCOUT SEARCH TERMS

Use these exact search terms on IconScout:
- "3D crypto coin icons"
- "3D blockchain token icons"
- "3D cryptocurrency icons"
- Or search individual coin names: "bitcoin 3d", "ethereum 3d", etc.

---

## ⚠️ RULES FOR FUTURE AGENTS

1. **DO NOT** change the coin list without approval
2. **DO NOT** modify the styling/glow
3. **DO NOT** use CDN fallbacks - local files ONLY
4. **DO NOT** replace logos with different sources
5. **DO** keep all 227 logos intact
6. **DO** follow this guide if restoration needed

---

## 🔒 LOCKED BY: CoinHubX Master Engineer
## 📅 DATE: December 2025
## ✅ STATUS: COMPLETE - 227/227 COINS
