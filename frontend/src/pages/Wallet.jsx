/**
 * ============================================================================
 * ⚠️⚠️⚠️ DEPRECATED - DO NOT USE THIS FILE ⚠️⚠️⚠️
 * ============================================================================
 * 
 * This file is DEPRECATED and NOT USED in the application.
 * The active wallet page is: /app/frontend/src/pages/WalletPage.js
 * 
 * The authorized coin icon component is: Coin3DIcon.js
 * Do NOT copy the CoinIcon pattern from this file.
 * 
 * DATE: December 18, 2025
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '@/components/Layout';
import '../styles/globalSwapTheme.css';

// ⚠️ DEPRECATED: This file should not be used
console.warn('⚠️ Wallet.jsx is DEPRECATED. Use WalletPage.js instead.');

const API = process.env.REACT_APP_BACKEND_URL;

// MASSIVE emoji map - covers ALL coins
const COIN_EMOJI_MAP = {
  // Top cryptos
  'BTC': '₿', 'ETH': '◆', 'USDT': '💵', 'USDC': '💲', 'BNB': '🔶',
  'XRP': '✖️', 'SOL': '☀️', 'ADA': '🌐', 'DOGE': '🐶', 'TRX': '🔺',
  'DOT': '🎯', 'MATIC': '🔷', 'LTC': '🌕', 'SHIB': '🐕', 'AVAX': '🏔️',
  'LINK': '🔗', 'ATOM': '⚛️', 'UNI': '🦄', 'XLM': '⭐', 'XMR': '🕶️',
  'BCH': '💚', 'TON': '🔵', 'DAI': '🟡', 'ETC': '🟢', 'FIL': '📁',
  'VET': '♦️', 'ALGO': '◯', 'WBTC': '🔄', 'NEAR': '🌈', 'ICP': '∞',
  'PLX': '💎', 'NWC': '🌐', 'CHR': '⚡', 'GBP': '💷',
  
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

// Get emoji for ANY coin - always returns something
const getCoinEmoji = (symbol) => {
  if (!symbol) return '💎';
  const upperSymbol = symbol.toUpperCase();
  
  // Direct match
  if (COIN_EMOJI_MAP[upperSymbol]) return COIN_EMOJI_MAP[upperSymbol];
  
  // Partial matches for variants
  if (upperSymbol.includes('USDT')) return '💵';
  if (upperSymbol.includes('USDC')) return '💲';
  if (upperSymbol.includes('BTC')) return '₿';
  if (upperSymbol.includes('ETH')) return '◆';
  if (upperSymbol.includes('SHIB')) return '🐕';
  if (upperSymbol.includes('DOGE')) return '🐶';
  if (upperSymbol.includes('BNB')) return '🔶';
  if (upperSymbol.includes('SOL')) return '☀️';
  if (upperSymbol.includes('MATIC')) return '🔷';
  if (upperSymbol.includes('AVAX')) return '🏔️';
  
  // Default
  return '💎';
};

// CoinIcon component - ALWAYS shows emoji, no PNG loading
const CoinIcon = ({ symbol }) => {
  const emoji = getCoinEmoji(symbol);
  
  return (
    <div style={{
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, rgba(19, 215, 255, 0.25), rgba(122, 60, 255, 0.25))',
      border: '2px solid rgba(19, 215, 255, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '26px',
      boxShadow: '0 0 15px rgba(19, 215, 255, 0.3)'
    }}>
      {emoji}
    </div>
  );
};

export default function Wallet() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [balances, setBalances] = useState([]);

  const loadBalances = async (userId) => {
    try {
      // Get user's actual balances ONLY
      const balancesRes = await axios.get(`${API}/api/wallets/balances/${userId}`);
      
      if (balancesRes.data && balancesRes.data.balances) {
        const userBalances = balancesRes.data.balances || [];
        
        // Show ONLY coins the user actually has (balance > 0)
        const filteredBalances = userBalances.filter(bal => 
          parseFloat(bal.balance) > 0 || parseFloat(bal.total_balance) > 0
        );
        
        setBalances(filteredBalances);
      }
    } catch (error) {
      console.error('Error loading balances:', error);
      setBalances([]);
    }
  };

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
                      <CoinIcon symbol={bal.currency} />
                      <div>
                        <p className="swap-theme-text-secondary" style={{ fontSize: '14px', marginBottom: '4px' }}>{bal.currency}</p>
                        <h3 className="swap-theme-accent" style={{ fontSize: '24px', fontWeight: '700' }}>{parseFloat(bal.balance || bal.total_balance || 0).toFixed(8)}</h3>
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