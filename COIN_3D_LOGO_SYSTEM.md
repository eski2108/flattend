# 🔒 COIN 3D LOGO SYSTEM - LOCKED

## DO NOT MODIFY WITHOUT APPROVAL

---

## WHERE TO GET 3D LOGOS

### 1. BUY LICENSED 3D CRYPTO LOGO PACK
- **Platforms:** UI8 / Envato Elements / Creative Market
- **Search:** "3D Crypto Coin Icons" or "3D Crypto Logos"
- **Format:** PNG or WebP, transparent background
- **Coverage:** Usually 50-300 coins with consistent lighting

### 2. COMMISSION BULK 3D RENDER SET (BEST LONG-TERM)
- **Tool:** Blender or Cinema4D
- **Method:** One master coin model → swap textures per coin
- **Output:** Individual PNG/WebP per coin, same angle, same lighting
- **Benefit:** 100% consistency and ownership

---

## MANDATORY IMPLEMENTATION RULES

| Rule | Requirement |
|------|-------------|
| Every coin | Its own local 3D image file |
| Path format | `/assets/coins/3d/{symbol}.png` |
| NO CDNs | ✅ Enforced |
| NO random downloads | ✅ Enforced |
| NO CSS "fake 3D" | ✅ Enforced |
| Missing logo | Show placeholder, DO NOT ship |

---

## STYLE LOCK (NON-NEGOTIABLE)

- ✅ Same camera angle
- ✅ Same lighting
- ✅ Same glow strength
- ✅ Components LOCKED - agents cannot change

---

## CURRENT 3D LOGOS (19 coins)

| Coin | File | Status |
|------|------|--------|
| ADA | `/assets/coins/3d/ada.png` | ✅ DONE |
| ATOM | `/assets/coins/3d/atom.png` | ✅ DONE |
| BCH | `/assets/coins/3d/bch.png` | ✅ DONE |
| BNB | `/assets/coins/3d/bnb.png` | ✅ DONE |
| BTC | `/assets/coins/3d/btc.png` | ✅ DONE |
| DAI | `/assets/coins/3d/dai.png` | ✅ DONE |
| DOGE | `/assets/coins/3d/doge.png` | ✅ DONE |
| DOT | `/assets/coins/3d/dot.png` | ✅ DONE |
| ETH | `/assets/coins/3d/eth.png` | ✅ DONE |
| LINK | `/assets/coins/3d/link.png` | ✅ DONE |
| LTC | `/assets/coins/3d/ltc.png` | ✅ DONE |
| MATIC | `/assets/coins/3d/matic.png` | ✅ DONE |
| SHIB | `/assets/coins/3d/shib.png` | ✅ DONE |
| SOL | `/assets/coins/3d/sol.png` | ✅ DONE |
| TRX | `/assets/coins/3d/trx.png` | ✅ DONE |
| UNI | `/assets/coins/3d/uni.png` | ✅ DONE |
| USDC | `/assets/coins/3d/usdc.png` | ✅ DONE |
| USDT | `/assets/coins/3d/usdt.png` | ✅ DONE |
| XRP | `/assets/coins/3d/xrp.png` | ✅ DONE |

---

## COINS NEEDING 3D LOGOS

All other 200+ coins show placeholder until 3D PNG/WebP provided.

---

## TO ADD NEW 3D LOGO

1. Get 3D-rendered PNG/WebP from licensed pack or commissioned render
2. Save to `/frontend/public/assets/coins/3d/{symbol}.png`
3. Add symbol to `COINS_WITH_3D_LOGOS` array in `Coin3DIcon.js`
4. Add symbol to `LOCAL_LOGOS` array in `coinLogos.js`
5. Update this document

---

## LOCKED FILES

- `/frontend/src/components/Coin3DIcon.js` - LOCKED
- `/frontend/src/utils/coinLogos.js` - LOCKED
- `/frontend/public/assets/coins/3d/` - LOCKED
- `/COIN_3D_LOGO_SYSTEM.md` - LOCKED

---

## ⚠️ WARNING TO FUTURE AGENTS

DO NOT:
- Pull logos from CDNs
- Download random icons
- Apply CSS "fake 3D" effects
- Change the glow/lighting style
- Modify locked components

ONLY:
- Add new 3D logos from licensed packs
- Follow the exact path format
- Maintain consistent styling
