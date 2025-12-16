# 🔒 COIN LOGO STYLES - LOCKED

## DO NOT MODIFY WITHOUT APPROVAL

---

## Locked Date: December 2025
## Locked By: CoinHubX Master Engineer

---

## RULES

1. **EVERY COIN HAS ITS OWN UNIQUE LOGO**
   - Top coins: Local 3D PNGs from `/public/crypto-logos/`
   - All other coins: NOWPayments CDN (`https://nowpayments.io/images/coins/{symbol}.svg`)
   - Fallback: CoinCap CDN
   - Last resort: Styled placeholder with same 3D effect

2. **ALL LOGOS APPEAR 3D**
   - Strong gradient badge background
   - Heavy drop shadows (multiple layers)
   - Bright top highlight
   - Cyan glow effect (30px, 60px, 100px spread)
   - Glowing cyan border

3. **CONSISTENT ACROSS ENTIRE APP**
   - Same `Coin3DIcon` component used everywhere
   - Same CSS styling locked in `coin3d-locked.css`
   - Footer, Wallet, Instant Buy, all pages use same component

---

## LOCKED FILES

- `/frontend/src/components/Coin3DIcon.js` - Main component
- `/frontend/src/styles/coin3d-locked.css` - CSS backup
- `/frontend/src/utils/coinLogos.js` - Logo URL utilities

---

## 3D EFFECT SPECIFICATIONS

### Badge Style
```css
background: 
  radial-gradient(ellipse at 30% 20%, rgba(100, 120, 180, 0.4) 0%, transparent 50%),
  linear-gradient(145deg, #3a4065 0%, #1a1f35 40%, #0a0f1a 100%);
border: 2px solid rgba(0, 229, 255, 0.4);
box-shadow: 
  inset 0 4px 8px rgba(255,255,255,0.15),
  inset 0 -4px 8px rgba(0,0,0,0.5),
  0 4px 8px rgba(0,0,0,0.4),
  0 8px 24px rgba(0,0,0,0.6),
  0 0 30px rgba(0,229,255,0.35),
  0 0 60px rgba(0,229,255,0.2),
  0 0 100px rgba(0,229,255,0.1);
```

### Image Filter
```css
filter: 
  drop-shadow(0 2px 4px rgba(0,0,0,0.8))
  drop-shadow(0 4px 8px rgba(0,0,0,0.6))
  drop-shadow(0 8px 16px rgba(0,0,0,0.4))
  drop-shadow(0 0 8px rgba(0,255,200,0.4))
  drop-shadow(0 0 16px rgba(0,229,255,0.3));
```

---

## ⚠️ WARNING

DO NOT:
- Change the 3D styling
- Remove the glow effects
- Use different logo sources
- Modify fallback chain
- Replace logos without approval

---

## APPROVED LOGO SOURCES

1. Local: `/public/crypto-logos/{symbol}.png`
2. NOWPayments: `https://nowpayments.io/images/coins/{symbol}.svg`
3. CoinCap: `https://assets.coincap.io/assets/icons/{symbol}@2x.png`

NO OTHER SOURCES ALLOWED.
