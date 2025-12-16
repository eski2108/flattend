#!/bin/bash
# Download 3D logos from CoinGecko/CryptoLogos for missing coins
# These are high quality 3D style logos

# Missing coins we need
COINS="pepe xlm om nwc sidus icx zent vlx near algo aave fil ftm grt hbar icp kcs ksm luna mana mkr near neo okb one ont qnt ren rune sand theta vet waves xem xmr xtz zec zil"

for coin in $COINS; do
  echo "Downloading $coin..."
  # Try CoinGecko first (has good quality)
  curl -s -o "${coin}.png" "https://assets.coingecko.com/coins/images/1/large/${coin}.png" 2>/dev/null || true
done
