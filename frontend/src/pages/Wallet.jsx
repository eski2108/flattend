import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '@/components/Layout';
import { getCoinLogo } from '@/utils/coinLogos';
import '../styles/globalSwapTheme.css';

const API = process.env.REACT_APP_BACKEND_URL;

// Emoji mapping for coins - SAME AS SAVINGS VAULT
const getCoinEmoji = (symbol) => {
  const emojiMap = {
    // Top cryptos
    'BTC': '₿', 'ETH': '◆', 'USDT': '💵', 'USDC': '💲', 'BNB': '🔶',
    'XRP': '✖️', 'SOL': '☀️', 'ADA': '🌐', 'DOGE': '🐶', 'TRX': '🔺',
    'DOT': '🎯', 'MATIC': '🔷', 'LTC': '🌕', 'SHIB': '🐕', 'AVAX': '🏔️',
    'LINK': '🔗', 'ATOM': '⚛️', 'UNI': '🦄', 'XLM': '⭐', 'XMR': '🕶️',
    'BCH': '💚', 'TON': '🔵', 'DAI': '🟡', 'ETC': '🟢', 'FIL': '📁',
    'VET': '♦️', 'ALGO': '◯', 'WBTC': '🔄', 'NEAR': '🌈', 'ICP': '∞',
    
    // Meme coins
    'PEPE': '🐸', 'FLOKI': '🐕', 'BONK': '💥', 'WIF': '🧢', 'MEME': '😂',
    'LEASH': '🦴', 'ELON': '🚀', 'BABYDOGE': '🐶', 'KISHU': '🐕', 
    
    // Stablecoins
    'BUSD': '💵', 'TUSD': '💵', 'USDP': '💲', 'GUSD': '🏦', 'USDD': '💵',
    'FRAX': '🏛️', 'LUSD': '💵', 'SUSD': '💵',
    
    // DeFi tokens
    'AAVE': '👻', 'COMP': '🏛️', 'MKR': '👑', 'SNX': '⚡', 'CRV': '🌊',
    'SUSHI': '🍣', 'CAKE': '🎂', '1INCH': '🦄', 'BAL': '⚖️', 'YFI': '💎',
    'RUNE': '⚔️', 'ALPHA': '🐺', 'CREAM': '🍦', 'BADGER': '🦡',
    
    // Gaming/Metaverse
    'AXS': '🎮', 'SAND': '🏖️', 'MANA': '🌍', 'ENJ': '🎮', 'GALA': '🎪',
    'IMX': '🎮', 'GODS': '⚔️', 'SUPER': '🦸', 'STARL': '🌟', 'RACA': '🎨',
    
    // Layer 2 & Scaling
    'ARB': '🔷', 'OP': '🔴', 'LRC': '⭕', 'ZK': '🔐', 'METIS': '⚡',
    
    // Exchange tokens
    'FTT': '📈', 'OKB': '⭕', 'HT': '🔥', 'KCS': '🎯', 'GT': '🎯',
    'CRO': '💎', 'LEO': '🦁', 'WOO': '🌊', 'MX': '💹',
    
    // AI & Tech
    'FET': '🤖', 'AGIX': '🧠', 'OCEAN': '🌊', 'GRT': '📊', 'RENDER': '🎨',
    'INJ': '💉', 'RNDR': '🎬', 'PAAL': '🤖',
    
    // Privacy coins
    'DASH': '💸', 'ZEC': '🔒', 'DCR': '🔐', 'SC': '☁️',
    
    // Other major coins
    'APT': '🔷', 'SUI': '💧', 'SEI': '⚡', 'TIA': '🌌',
    'KUJI': '🌪️', 'LUNA': '🌙', 'LUNC': '🌑', 'UST': '💵', 'USTC': '💵',
    
    // Specific tokens
    'MEW': '😺', 'USDR': '💲', 'USDTMATIC': '💵', 'USDCBSC': '💲',
    'SHIBBSC': '🐕', 'AVAXC': '🏔️', 'BERA': '🐻', 'RVN': '🦅',
    'WOLFERC20': '🐺', 'GUARD': '🛡️', 'AWEBASE': '⚡', 'USDTSOL': '💵',
    'WETH': '◆', 'WBNB': '🔶', 'WMATIC': '🔷',
    
    // Others
    'FTM': '👻', 'ONE': '1️⃣', 'HBAR': '♾️', 'THETA': '📺',
    'TFUEL': '⛽', 'EGLD': '⚡', 'FLOW': '🌊', 'ROSE': '🌹',
    'KDA': '⛓️', 'KLAY': '🎮', 'MINA': '🔐', 'ZIL': '⚡'
  };
  
  const upperSymbol = symbol.toUpperCase();
  if (emojiMap[upperSymbol]) return emojiMap[upperSymbol];
  
  // Partial matches
  if (upperSymbol.includes('USDT')) return '💵';
  if (upperSymbol.includes('USDC')) return '💲';
  if (upperSymbol.includes('BTC')) return '₿';
  if (upperSymbol.includes('ETH')) return '◆';
  if (upperSymbol.includes('SHIB')) return '🐕';
  if (upperSymbol.includes('DOGE')) return '🐶';
  
  return '💎';
};

export default function Wallet() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [balances, setBalances] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadBalances(parsedUser.user_id);
  }, []);

  const loadBalances = async (userId) => {
    try {
      // Get ALL 236 NowPayments coins
      const coinsRes = await axios.get(`${API}/api/wallets/coin-metadata`);
      
      // Get user's actual balances
      const balancesRes = await axios.get(`${API}/api/wallets/balances/${userId}`);
      
      if (coinsRes.data.success) {
        const allCoins = coinsRes.data.coins || [];
        const userBalances = balancesRes.data.balances || [];
        
        // Create a map of user balances
        const balanceMap = {};
        userBalances.forEach(bal => {
          balanceMap[bal.currency] = bal.balance;
        });
        
        // Merge: show ALL coins with their balance (0 if user doesn't have any)
        const mergedBalances = allCoins.map(coin => ({
          currency: coin.symbol,
          balance: balanceMap[coin.symbol] || '0.00'
        }));
        
        setBalances(mergedBalances);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <Layout>
      <div className="swap-theme-page">
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div className="swap-theme-card">
            <h1 className="swap-theme-text-primary" style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
              💼 My Wallet
            </h1>
            <p className="swap-theme-text-secondary" style={{ fontSize: '16px', marginBottom: '32px' }}>
              Manage your crypto assets
            </p>

            <div className="swap-theme-divider" />

            <div style={{ display: 'grid', gap: '16px', marginTop: '32px' }}>
              {balances.map((bal) => (
                <div key={bal.currency} className="swap-theme-card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #00F0FF, #0080FF)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        padding: '4px'
                      }}>
                        <img 
                          src={getCoinLogo(bal.currency)} 
                          alt={bal.currency}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                          }}
                          onError={(e) => {
                            // Try SVG fallback first
                            if (!e.target.dataset.triedSvg) {
                              e.target.dataset.triedSvg = 'true';
                              e.target.src = `/crypto-icons/${bal.currency.toLowerCase()}.svg`;
                            } else {
                              // Final fallback: show first letter in colored circle
                              e.target.style.display = 'none';
                              const letter = bal.currency?.substring(0, 1) || '?';
                              e.target.parentElement.innerHTML = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #00F0FF, #7B2CFF); border-radius: 50%; font-size: 20px; font-weight: 700; color: #FFF;">${letter}</div>`;
                            }
                          }}
                        />
                      </div>
                      <div>
                        <p className="swap-theme-text-secondary" style={{ fontSize: '14px', marginBottom: '4px' }}>{bal.currency}</p>
                        <h3 className="swap-theme-accent" style={{ fontSize: '24px', fontWeight: '700' }}>{bal.balance}</h3>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="swap-theme-button" style={{ padding: '8px 16px' }}>Deposit</button>
                      <button className="swap-theme-button" style={{ padding: '8px 16px' }}>Withdraw</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}