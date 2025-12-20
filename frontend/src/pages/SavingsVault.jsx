import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import getCoinLogo from '../utils/coinLogos';
import MobileBottomNav from '../components/MobileBottomNav';
import './SavingsVault.css';

const API = process.env.REACT_APP_BACKEND_URL;

// Helper to get user_id consistently from localStorage
const getUserId = () => {
  const userData = localStorage.getItem('cryptobank_user');
  if (!userData) return null;
  try {
    const user = JSON.parse(userData);
    return user.user_id || null;
  } catch {
    return null;
  }
};

const SavingsVault = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalBalanceCrypto, setTotalBalanceCrypto] = useState('');
  const [lockedBalance, setLockedBalance] = useState(0);
  const [lockedBalanceCrypto, setLockedBalanceCrypto] = useState('');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [availableBalanceCrypto, setAvailableBalanceCrypto] = useState('');
  const [totalInterestEarned, setTotalInterestEarned] = useState(0);
  const [totalInterestCrypto, setTotalInterestCrypto] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [filterActive, setFilterActive] = useState(false);
  const [filterFlexible, setFilterFlexible] = useState(false);
  const [filterStaked, setFilterStaked] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState('Main');
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [graphPeriod, setGraphPeriod] = useState({});
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Modal state for deposit flow
  const [depositStep, setDepositStep] = useState(1); // 1-5 steps
  const [selectedCoin, setSelectedCoin] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedNoticePeriod, setSelectedNoticePeriod] = useState(30);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [showReferralBanner, setShowReferralBanner] = useState(true);
  const [availableCoins, setAvailableCoins] = useState([]);
  const [loadingCoins, setLoadingCoins] = useState(false);
  const [showNoticeRulesModal, setShowNoticeRulesModal] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);

  useEffect(() => {
    loadSavingsData();
    loadAvailableCoins();
    
    // Check for payment success/cancel from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const savingsId = urlParams.get('id');
    
    if (status === 'success' && savingsId) {
      toast.success('🎉 Payment successful! Your savings are being activated...');
      // Clean URL
      window.history.replaceState({}, document.title, '/savings');
      // Reload data after a short delay
      setTimeout(() => {
        loadSavingsData();
      }, 2000);
    } else if (status === 'cancelled') {
      toast.error('Payment was cancelled');
      window.history.replaceState({}, document.title, '/savings');
    }
  }, []);

  // Emoji mapping for coins - COMPREHENSIVE LIST
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
      'APT': '🔷', 'ARB': '🔵', 'OP': '🔴', 'SUI': '💧', 'SEI': '⚡',
      'TIA': '🌌', 'INJ': '💉', 'RUNE': '⚔️', 'OSMO': '🌊', 'KUJI': '🌪️',
      'LUNA': '🌙', 'LUNC': '🌑', 'UST': '💵', 'USTC': '💵',
      
      // Specific tokens from your list
      'MEW': '😺', 'USDR': '💲', 'USDTMATIC': '💵', 'USDCBSC': '💲',
      'SHIBBSC': '🐕', 'AVAXC': '🏔️', 'BERA': '🐻', 'RVN': '🦅',
      'WOLFERC20': '🐺', 'GUARD': '🛡️', 'AWEBASE': '⚡', 'USDTSOL': '💵',
      'VET': '💎', 'WETH': '◆', 'WBNB': '🔶', 'WMATIC': '🔷',
      
      // Base/Chain specific
      'BASE': '🔵', 'ARB': '🔷', 'OP': '🔴', 'ZKSYNC': '🔐',
      'POLYGON': '🔷', 'ARBITRUM': '🔷', 'OPTIMISM': '🔴',
      
      // Others
      'FTM': '👻', 'ONE': '1️⃣', 'HBAR': '♾️', 'THETA': '📺',
      'TFUEL': '⛽', 'EGLD': '⚡', 'FLOW': '🌊', 'ROSE': '🌹',
      'KDA': '⛓️', 'KLAY': '🎮', 'MINA': '🔐', 'ZIL': '⚡'
    };
    
    // Try exact match first
    const upperSymbol = symbol.toUpperCase();
    if (emojiMap[upperSymbol]) return emojiMap[upperSymbol];
    
    // Try partial matches for wrapped/chain-specific tokens
    if (upperSymbol.includes('USDT')) return '💵';
    if (upperSymbol.includes('USDC')) return '💲';
    if (upperSymbol.includes('BTC')) return '₿';
    if (upperSymbol.includes('ETH')) return '◆';
    if (upperSymbol.includes('SHIB')) return '🐕';
    if (upperSymbol.includes('DOGE')) return '🐶';
    
    // Default fallback
    return '💎';
  };

  const loadAvailableCoins = async () => {
    try {
      setLoadingCoins(true);
      // Try NowPayments first for 230+ coins
      const nowPaymentsResponse = await axios.get(`${API}/api/nowpayments/currencies`);
      if (nowPaymentsResponse.data.success && nowPaymentsResponse.data.currencies) {
        const currencies = nowPaymentsResponse.data.currencies;
        // Convert NowPayments format to our format
        const coinList = currencies.map(symbol => ({
          symbol: symbol.toUpperCase(),
          name: symbol.charAt(0).toUpperCase() + symbol.slice(1),
          emoji: getCoinEmoji(symbol)
        }));
        setAvailableCoins(coinList);
        setLoadingCoins(false);  // FIX: SET TO FALSE HERE
        console.log(`✅ Loaded ${coinList.length} coins from NowPayments`);
        return;
      }
    } catch (error) {
      console.error('NowPayments fetch failed, trying backend fallback:', error);
    }
    
    // Fallback to backend supported cryptocurrencies
    try {
      const response = await axios.get(`${API}/api/supported/cryptocurrencies`);
      if (response.data.success) {
        const cryptos = response.data.cryptocurrencies;
        const coinList = Object.keys(cryptos).map(symbol => ({
          symbol: symbol,
          name: cryptos[symbol].name,
          emoji: getCoinEmoji(symbol)
        }));
        setAvailableCoins(coinList);
        console.log(`✅ Loaded ${coinList.length} coins from backend`);
      }
    } catch (error) {
      console.error('Error loading coins:', error);
      // Final fallback to default list
      setAvailableCoins([
        { symbol: 'BTC', name: 'Bitcoin', emoji: '₿' },
        { symbol: 'ETH', name: 'Ethereum', emoji: '◆' },
        { symbol: 'USDT', name: 'Tether', emoji: '💵' },
        { symbol: 'USDC', name: 'USD Coin', emoji: '💲' },
        { symbol: 'BNB', name: 'Binance Coin', emoji: '🔶' },
        { symbol: 'SOL', name: 'Solana', emoji: '☀️' },
        { symbol: 'XRP', name: 'Ripple', emoji: '✖️' },
        { symbol: 'ADA', name: 'Cardano', emoji: '🌐' },
        { symbol: 'DOGE', name: 'Dogecoin', emoji: '🐶' },
        { symbol: 'DOT', name: 'Polkadot', emoji: '🎯' },
        { symbol: 'MATIC', name: 'Polygon', emoji: '🔷' },
        { symbol: 'LTC', name: 'Litecoin', emoji: '🌕' },
        { symbol: 'LINK', name: 'Chainlink', emoji: '🔗' },
        { symbol: 'AVAX', name: 'Avalanche', emoji: '🏔️' }
      ]);
      console.log('✅ Using fallback coin list');
    } finally {
      setLoadingCoins(false);
    }
  };

  useEffect(() => {
    loadSavingsData();
    loadAvailableCoins();  // LOAD COINS ON PAGE MOUNT
  }, []);

  const loadSavingsData = async () => {
    try {
      setLoading(true);
      const userId = getUserId();
      
      if (!userId) {
        console.error('No user_id found - user not logged in');
        setLoading(false);
        return;
      }
      
      // REAL BACKEND CALL
      const response = await axios.get(`${API}/api/savings/positions/${userId}`);
      
      if (response.data.success) {
        const data = response.data;
        setPositions(data.positions || []);
        setTotalBalance(data.total_balance_usd || 0);
        setTotalBalanceCrypto(data.total_balance_crypto || '0.00 BTC');
        setLockedBalance(data.locked_balance_usd || 0);
        setLockedBalanceCrypto(data.locked_balance_crypto || '0.00 BTC');
        setAvailableBalance(data.available_balance_usd || 0);
        setAvailableBalanceCrypto(data.available_balance_crypto || '0.00 BTC');
        setTotalInterestEarned(data.total_interest_earned_usd || 0);
        setTotalInterestCrypto(data.total_interest_earned_crypto || '0.00 BTC');
        
        // Initialize graph periods
        const periods = {};
        data.positions?.forEach((pos, idx) => {
          periods[idx] = '30d';
        });
        setGraphPeriod(periods);
      }
    } catch (error) {
      console.error('Error loading savings:', error);
      setPositions([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = (index) => {
    setExpandedCard(expandedCard === index ? null : index);
  };

  const handleSort = (criteria) => {
    setSortBy(criteria);
    setShowSortMenu(false);
    // Sort positions
    const sorted = [...positions].sort((a, b) => {
      if (criteria === 'name') return a.symbol.localeCompare(b.symbol);
      if (criteria === 'apy') return (b.apy || 0) - (a.apy || 0);
      if (criteria === 'earned') return (b.interest_earned_usd || 0) - (a.interest_earned_usd || 0);
      if (criteria === 'balance') return (b.balance_usd || 0) - (a.balance_usd || 0);
      return 0;
    });
    setPositions(sorted);
  };

  const getFilteredPositions = () => {
    let filtered = positions;
    
    if (filterActive) {
      filtered = filtered.filter(p => p.balance > 0);
    }
    
    if (filterFlexible && !filterStaked) {
      filtered = filtered.filter(p => p.type === 'flexible');
    } else if (filterStaked && !filterFlexible) {
      filtered = filtered.filter(p => p.type === 'staked');
    }
    
    return filtered;
  };

  const handleToggleFlexibleStaked = async (index, newType) => {
    try {
      const position = positions[index];
      const userId = getUserId();
      if (!userId) { toast.error('Please log in first'); return; }
      const response = await axios.post(`${API}/api/savings/toggle-type`, {
        user_id: userId,
        position_id: position.id,
        new_type: newType
      });
      if (response.data.success) {
        toast.success(`Changed to ${newType} savings`);
        loadSavingsData();
      }
    } catch (error) {
      console.error('Toggle type error:', error);
      toast.error('Failed to change savings type');
    }
  };

  const handleToggleAutoCompound = async (index) => {
    try {
      const position = positions[index];
      const userId = getUserId();
      if (!userId) { toast.error('Please log in first'); return; }
      const newValue = !position.auto_compound;
      const response = await axios.post(`${API}/api/savings/auto-compound`, {
        user_id: userId,
        position_id: position.id,
        enabled: newValue
      });
      if (response.data.success) {
        toast.success(`Auto-compound ${newValue ? 'enabled' : 'disabled'}`);
        loadSavingsData();
      }
    } catch (error) {
      console.error('Auto-compound error:', error);
      toast.error('Failed to update auto-compound setting');
    }
  };

  const handleLockPeriodChange = async (index, period) => {
    try {
      const position = positions[index];
      const userId = getUserId();
      if (!userId) { toast.error('Please log in first'); return; }
      const response = await axios.post(`${API}/api/savings/change-period`, {
        user_id: userId,
        position_id: position.id,
        new_period: period
      });
      if (response.data.success) {
        toast.success(`Lock period changed to ${period} days`);
        loadSavingsData();
      }
    } catch (error) {
      console.error('Lock period change error:', error);
      toast.error('Failed to change lock period');
    }
  };

  const filteredPositions = getFilteredPositions();

  return (
    <div className="savings-vault-container">
      {/* PAGE HEADER */}
      <header className="savings-vault-header">
        <div className="header-title-section">
          <h1 className="savings-vault-title">Savings Vault</h1>
          <p className="savings-vault-subtitle">Securely store your crypto in locked accounts. Choose 30, 60, or 90 day notice periods for withdrawals.</p>
        </div>
        
        <div className="header-actions">
          {/* Wallet Selector Dropdown */}
          <div className="wallet-selector-dropdown">
            <button 
              className="wallet-selector-btn"
              onClick={() => setShowWalletMenu(!showWalletMenu)}
            >
              <span className="wallet-label">Wallet: {selectedWallet}</span>
              <span className="dropdown-arrow">▼</span>
            </button>
            
            {showWalletMenu && (
              <div className="wallet-dropdown-menu">
                <div 
                  className={`dropdown-item ${selectedWallet === 'Main' ? 'active' : ''}`}
                  onClick={() => { 
                    navigate('/wallet');
                    setShowWalletMenu(false); 
                  }}
                >
                  Main Wallet
                </div>
                <div 
                  className={`dropdown-item ${selectedWallet === 'Trading' ? 'active' : ''}`}
                  onClick={() => { 
                    navigate('/trading');
                    setShowWalletMenu(false); 
                  }}
                >
                  Trading Wallet
                </div>
                <div 
                  className={`dropdown-item ${selectedWallet === 'Savings' ? 'active' : ''}`}
                  onClick={() => { 
                    setSelectedWallet('Savings');
                    setShowWalletMenu(false); 
                  }}
                >
                  Savings Wallet (Current)
                </div>
              </div>
            )}
          </div>
          
          {/* Add to Savings Button */}
          <button 
            className="transfer-from-wallet-btn"
            onClick={() => setShowTransferModal(true)}
          >
            Add to Savings
          </button>
        </div>
      </header>

      {/* SUMMARY CARDS - 4 cards in a row */}
      <div className="summary-cards-section">
        {/* Card 1: Total Savings */}
        <div className="summary-card glassmorphic-card">
          <div className="card-icon-bg wallet-icon"></div>
          <div className="card-label">
            Total Balance
            <span className="info-tooltip" title="Total value of all your savings deposits plus earned interest">ⓘ</span>
          </div>
          <div className="card-value-main">{totalBalance.toFixed(2)} <span className="crypto-symbol">USD</span></div>
          <div className="card-value-fiat">{totalBalanceCrypto || 'Mixed Assets'}</div>
          <div className="live-indicator">
            <span className="live-dot pulsing"></span>
            <span className="live-text">Live</span>
          </div>
        </div>

        {/* Card 2: Locked Balance */}
        <div className="summary-card glassmorphic-card">
          <div className="card-icon-bg lock-icon"></div>
          <div className="card-label">
            Locked Balance
            <span className="info-tooltip" title="Funds currently in notice period. Early withdrawal will incur penalty.">ⓘ</span>
          </div>
          <div className="card-value-main">{lockedBalance.toFixed(2)} <span className="crypto-symbol">USD</span></div>
          <div className="card-value-fiat">{lockedBalanceCrypto || 'Mixed Assets'}</div>
          <div className="live-indicator">
            <span className="live-dot pulsing"></span>
            <span className="live-text">Live</span>
          </div>
        </div>

        {/* Card 3: Available to Withdraw */}
        <div className="summary-card glassmorphic-card">
          <div className="card-icon-bg unlock-icon"></div>
          <div className="card-label">
            Available to Withdraw
            <span className="info-tooltip" title="Funds ready to withdraw without penalty. Notice period has ended.">ⓘ</span>
          </div>
          <div className="card-value-main">{availableBalance.toFixed(2)} <span className="crypto-symbol">USD</span></div>
          <div className="card-value-fiat">{availableBalanceCrypto || 'Mixed Assets'}</div>
          <div className="live-indicator">
            <span className="live-dot pulsing"></span>
            <span className="live-text">Live</span>
          </div>
        </div>

        {/* Card 4: Total Interest Earned */}
        <div className="summary-card glassmorphic-card">
          <div className="card-icon-bg interest-icon"></div>
          <div className="card-label">
            Total Interest Earned
            <span className="info-tooltip" title="Lifetime interest earned across all your savings accounts">ⓘ</span>
          </div>
          <div className="card-value-main">{totalInterestEarned.toFixed(2)} <span className="crypto-symbol">USD</span></div>
          <div className="card-value-fiat">{totalInterestCrypto || 'Mixed Assets'}</div>
          <div className="live-indicator">
            <span className="live-dot pulsing"></span>
            <span className="live-text">Live</span>
          </div>
        </div>
      </div>

      {/* LOCKED SAVINGS SECTION - Premium Redesign */}
      <div className="locked-savings-section">
        <div className="locked-savings-header">
          <h2 className="locked-savings-title">Notice Savings — Secure Storage</h2>
          <p className="locked-savings-subtitle">Lock your crypto for added security. Early withdrawals incur a fee.</p>
        </div>

        {/* Early Withdrawal Warning Banner */}
        <div className="early-withdrawal-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <span className="warning-title">Early Withdrawal Penalty</span>
            <span className="warning-text">Withdrawing before the lock period ends will result in a fee (see cards below). Locked funds cannot be withdrawn until the period ends without penalty.</span>
          </div>
        </div>
        
        {/* Premium Lock Period Cards */}
        <div className="savings-periods-container">
          {/* Card 1: 30-Day Lock - Purple Theme */}
          <div className={`savings-card savings-card-30 ${selectedNoticePeriod === 30 ? 'selected' : ''}`}>
            <div className="period-header">
              <div className="period-days">30</div>
              <div className="period-label">DAYS</div>
            </div>
            
            <div className="apy-container">
              <div className="apy-value">🔒</div>
              <div className="apy-label">Secure Storage</div>
            </div>
            
            <div className="fee-container">
              <div className="fee-header">
                <span className="fee-icon">⚠</span>
                <span className="fee-title">Early Withdrawal</span>
                <span className="tooltip-icon" title="If you withdraw before the lock period ends, this fee is deducted from your principal.">?</span>
              </div>
              <div className="fee-amount">1.5% Fee</div>
              <div className="fee-note">Deducted from principal</div>
            </div>
            
            <div className="tagline-container">
              <div className="tagline">💡 Short-term Goals</div>
            </div>
            
            <div className="progress-visual">
              <div className="progress-fill progress-30-day"></div>
            </div>
            <div className="time-label">33% of max term</div>
            
            <button 
              className="cta-button cta-30-day"
              onClick={() => {setSelectedNoticePeriod(30); setShowTransferModal(true);}}
            >
              <span className="button-icon">🔒</span>
              Lock for 30 Days
            </button>
          </div>

          {/* Card 2: 60-Day Lock - Pink Theme (Most Popular) */}
          <div className={`savings-card savings-card-60 most-popular ${selectedNoticePeriod === 60 ? 'selected' : ''}`}>
            <div className="popular-badge">⭐ Most Popular</div>
            <div className="most-popular-glow"></div>
            
            <div className="period-header">
              <div className="period-days">60</div>
              <div className="period-label">DAYS</div>
            </div>
            
            <div className="apy-container">
              <div className="apy-value">🔒</div>
              <div className="apy-label">Secure Storage</div>
            </div>
            
            <div className="fee-container">
              <div className="fee-header">
                <span className="fee-icon">⚠</span>
                <span className="fee-title">Early Withdrawal</span>
                <span className="tooltip-icon" title="If you withdraw before the lock period ends, this fee is deducted from your principal.">?</span>
              </div>
              <div className="fee-amount">1.0% Fee</div>
              <div className="fee-note">Deducted from principal</div>
            </div>
            
            <div className="tagline-container">
              <div className="tagline">⚖️ Balanced Option</div>
            </div>
            
            <div className="progress-visual">
              <div className="progress-fill progress-60-day"></div>
            </div>
            <div className="time-label">66% of max term</div>
            
            <button 
              className="cta-button cta-60-day"
              onClick={() => {setSelectedNoticePeriod(60); setShowTransferModal(true);}}
            >
              <span className="button-icon">🔒</span>
              Lock for 60 Days
            </button>
          </div>

          {/* Card 3: 90-Day Lock - Blue Theme (Lowest Fee) */}
          <div className={`savings-card savings-card-90 ${selectedNoticePeriod === 90 ? 'selected' : ''}`}>
            <div className="max-returns-badge">💎 Lowest Fee</div>
            
            <div className="period-header">
              <div className="period-days">90</div>
              <div className="period-label">DAYS</div>
            </div>
            
            <div className="apy-container apy-highest">
              <div className="apy-value">🔒</div>
              <div className="apy-label">Secure Storage</div>
            </div>
            
            <div className="fee-container fee-lowest">
              <div className="fee-header">
                <span className="fee-icon">⚠</span>
                <span className="fee-title">Early Withdrawal</span>
                <span className="tooltip-icon" title="If you withdraw before the lock period ends, this fee is deducted from your principal.">?</span>
              </div>
              <div className="fee-amount">0.5% Fee</div>
              <div className="fee-note">Lowest penalty rate</div>
            </div>
            
            <div className="tagline-container">
              <div className="tagline">💎 Maximum Security</div>
            </div>
            
            <div className="progress-visual">
              <div className="progress-fill progress-90-day"></div>
            </div>
            <div className="time-label">100% - Full term</div>
            
            <button 
              className="cta-button cta-90-day"
              onClick={() => {setSelectedNoticePeriod(90); setShowTransferModal(true);}}
            >
              <span className="button-icon">🔒</span>
              Lock for 90 Days
            </button>
          </div>
        </div>

        {/* Calculator Hint */}
        <div className="calculator-hint">
          <span className="calculator-icon">📊</span>
          <span className="calculator-text">Example: Lock $1,000 for 90 days for secure storage. Early withdrawal fee applies.</span>
        </div>

        {/* Security Footer */}
        <div className="security-footer">
          <span className="security-icon">🔒</span>
          <span className="security-text">Funds are secured and protected. Your principal is never at risk.</span>
          <button 
            className="notice-rules-btn"
            onClick={() => setShowNoticeRulesModal(true)}
          >
            View Terms & Conditions
          </button>
        </div>
      </div>

      {/* REFERRAL BANNER */}
      {showReferralBanner && (
        <div 
          className="referral-banner glassmorphic-card purple-accent clickable"
          onClick={() => navigate('/referrals')}
          style={{ cursor: 'pointer' }}
        >
          <div className="referral-content">
            <span className="referral-icon">🎁</span>
            <div className="referral-text-section">
              <span className="referral-title">Invite friends, earn more</span>
              <span className="referral-subtitle">Get 10% bonus when your referrals use CoinHubX</span>
            </div>
            <span className="referral-arrow">→</span>
          </div>
          <button 
            className="dismiss-banner-btn"
            onClick={(e) => { e.stopPropagation(); setShowReferralBanner(false); }}
          >
            ✕
          </button>
        </div>
      )}

      {/* SORTING & FILTERS BAR - Only show when user has savings positions */}
      {positions.length > 0 && (
        <div className="controls-toolbar">
          {/* Sort By Dropdown */}
          <div className="sort-control">
            <button 
              className="sort-btn"
              onClick={() => setShowSortMenu(!showSortMenu)}
            >
              <span className="sort-label">Sort: </span>
              <span className="sort-value">{sortBy === 'name' ? 'Token Name' : sortBy === 'balance' ? 'Balance' : 'Balance'}</span>
              <span className="dropdown-arrow">▼</span>
            </button>
            
            {showSortMenu && (
              <div className="sort-dropdown-menu">
                <div className="dropdown-item" onClick={() => handleSort('name')}>Token Name</div>
                <div className="dropdown-item" onClick={() => handleSort('balance')}>Balance (High to Low)</div>
                <div className="dropdown-item" onClick={() => handleSort('earned')}>Total Earned</div>
                <div className="dropdown-item" onClick={() => handleSort('balance')}>Balance</div>
              </div>
            )}
          </div>
          
          {/* Filter Toggles */}
          <div className="filter-toggles">
            <button 
              className={`filter-toggle-btn ${filterActive ? 'active' : ''}`}
              onClick={() => setFilterActive(!filterActive)}
            >
              Active {filterActive && '✓'}
            </button>
            <button 
              className={`filter-toggle-btn ${filterFlexible ? 'active' : ''}`}
              onClick={() => setFilterFlexible(!filterFlexible)}
            >
              30 Day {filterFlexible && '✓'}
            </button>
            <button 
              className={`filter-toggle-btn ${filterStaked ? 'active' : ''}`}
              onClick={() => setFilterStaked(!filterStaked)}
            >
              60/90 Day {filterStaked && '✓'}
            </button>
          </div>
          
          <div className="visible-count">{filteredPositions.length}/{positions.length} assets shown</div>
        </div>
      )}

      {/* YOUR SAVINGS - PORTFOLIO LIST */}
      <div className="portfolio-list-section">
        <div className="section-header-with-description">
          <h2 className="section-heading">Your Savings</h2>
          <p className="section-description">Monitor your locked funds. Each row shows amount, lock period, and time remaining.</p>
        </div>
        
        {loading ? (
          <div className="loading-state">
            <div className="skeleton-card"></div>
            <div className="skeleton-card"></div>
            <div className="skeleton-card"></div>
          </div>
        ) : filteredPositions.length === 0 ? (
          <div className="empty-state-card glassmorphic-card">
            <div className="empty-state-icon">🏦</div>
            <h3 className="empty-state-title">Start Earning with Notice Accounts</h3>
            <p className="empty-state-description">Lock your crypto for 30, 60, or 90 days for secure storage.</p>
            <div className="empty-state-steps">
              <div className="step-item">
                <span className="step-number">1</span>
                <span className="step-text">Choose lock period above</span>
              </div>
              <div className="step-item">
                <span className="step-number">2</span>
                <span className="step-text">Transfer from wallet</span>
              </div>
              <div className="step-item">
                <span className="step-number">3</span>
                <span className="step-text">Funds securely locked</span>
              </div>
            </div>
            <button className="empty-state-cta" onClick={() => setShowTransferModal(true)}>
              Add to Savings
            </button>
          </div>
        ) : (
          <div className="savings-table-container">
            {/* Table Header Row */}
            <div className="savings-table-header">
              <div className="header-cell asset-col">Asset</div>
              <div className="header-cell amount-col">Locked Amount</div>
              <div className="header-cell apy-col">Status</div>
              <div className="header-cell date-col">End Date</div>
              <div className="header-cell fee-col">Early Withdrawal Fee</div>
            </div>
            
            {/* Data Rows */}
            <div className="token-cards-list">
            {filteredPositions.map((position, index) => (
              <div 
                key={index} 
                className={`token-card glassmorphic-card ${expandedCard === index ? 'expanded' : ''}`}
              >
                {/* COLLAPSED VIEW - Card Header */}
                <div className="token-card-header">
                  <div className="token-identity">
                    <div className="token-icon-circle">
                      <img 
                        src={getCoinLogo(position.symbol)} 
                        alt={position.symbol}
                        onError={(e) => {
                          if (!e.target.dataset.triedSvg) {
                            e.target.dataset.triedSvg = 'true';
                            e.target.src = `/crypto-icons/${position.symbol.toLowerCase()}.svg`;
                          } else {
                            e.target.style.display = 'none';
                            const letter = position.symbol?.substring(0, 1) || '?';
                            e.target.parentElement.innerHTML = `<div class="fallback-icon">${letter}</div>`;
                          }
                        }}
                      />
                    </div>
                    <div className="token-name-label">
                      {position.name || position.symbol} ({position.symbol})
                    </div>
                  </div>
                  
                  <div className="token-balance-info">
                    <div className="balance-primary">{position.balance || '0.000'} {position.symbol}</div>
                    <div className="balance-fiat">≈ ${position.balance_usd || '0.00'}</div>
                  </div>
                  
                  <div className="token-apy-section">
                    <span className="apy-label">Status</span>
                    <span className="apy-value">{position.apy || 0}%</span>
                  </div>
                  
                  <div className="token-pnl-section">
                    <span className="pnl-label">P/L:</span>
                    <span className={`pnl-value ${position.pnl_percentage >= 0 ? 'positive' : 'negative'}`}>
                      {position.pnl_percentage >= 0 ? '↑ +' : '↓ '}{position.pnl_percentage || 0}%
                    </span>
                  </div>
                  
                  <div className="token-24h-section">
                    <span className="h24-label">24h:</span>
                    <span className={`h24-value ${position.price_change_24h >= 0 ? 'positive' : 'negative'}`}>
                      {position.price_change_24h >= 0 ? '+' : ''}{position.price_change_24h || 0}%
                    </span>
                  </div>
                  
                  <div className="token-interest-earned">
                    <span className="earned-label">Interest earned:</span>
                    <span className="earned-value">{position.interest_earned || '0.00'} {position.symbol}</span>
                  </div>
                  
                  <div className="token-est-monthly">
                    <span className="monthly-label">Est. Monthly:</span>
                    <span className="monthly-value">~${position.estimated_monthly || '0.00'}</span>
                  </div>
                  
                  <div className="token-sparkline">
                    <svg width="80" height="30" viewBox="0 0 80 30">
                      <path
                        d="M 0 20 L 20 18 L 40 15 L 60 12 L 80 10"
                        stroke={position.pnl_percentage >= 0 ? '#00FF85' : '#FF4D6D'}
                        strokeWidth="2"
                        fill="none"
                      />
                    </svg>
                  </div>
                  
                  <div className="token-status-badge">
                    <span className={`status-badge ${position.type === 'flexible' ? 'available' : 'locked'}`}>
                      {position.type === 'flexible' ? 'Available' : 'Locked'}
                    </span>
                  </div>
                  
                  <div className="token-toggles-section">
                    {/* Notice Period Display */}
                    <div className="notice-period-display">
                      <span className="notice-label">Notice Period:</span>
                      <span className="notice-value">{position.lock_period || 30} Days</span>
                    </div>
                    
                    {position.type !== 'flexible' && (
                      <div className="countdown-timer">
                        <span className="countdown-label">Days Remaining:</span>
                        <span className="countdown-value">23 Days</span>
                      </div>
                    )}
                    
                    {/* Auto-Compound Flip Switch */}
                    <div className="auto-compound-switch">
                      <label className="switch-label">
                        <span className="switch-text">Auto-Compound</span>
                        <input 
                          type="checkbox" 
                          className="switch-input"
                          checked={position.auto_compound || false}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleAutoCompound(index);
                          }}
                        />
                        <span className="switch-slider"></span>
                      </label>
                    </div>
                  </div>
                  
                  <button 
                    className="expand-collapse-btn"
                    onClick={() => toggleCard(index)}
                  >
                    {expandedCard === index ? '▲' : '▼'}
                  </button>
                </div>

                {/* EXPANDED VIEW */}
                {expandedCard === index && (
                  <div className="token-card-expanded">
                    {/* Price Information */}
                    <div className="price-info-section">
                      <div className="price-info-item">
                        <span className="price-label">Current Price</span>
                        <span className="price-value">${position.current_price || 'Loading...'}</span>
                      </div>
                      <div className="price-info-item">
                        <span className="price-label">P/L (Unrealised)</span>
                        <span className={`price-value ${position.pnl_percentage >= 0 ? 'positive' : 'negative'}`}>
                          {position.pnl_percentage >= 0 ? '↑' : '↓'} {position.pnl_percentage >= 0 ? '+' : ''}{position.pnl_percentage || '0.00'}%
                        </span>
                      </div>
                      <div className="price-info-item">
                        <span className="price-label">P/L Value</span>
                        <span className={`price-value ${position.pnl_usd >= 0 ? 'positive' : 'negative'}`}>
                          {position.pnl_usd >= 0 ? '+' : ''}${position.pnl_usd || '0.00'}
                        </span>
                      </div>
                      <div className="price-info-item">
                        <span className="price-label">Entry Price</span>
                        <span className="price-value secondary">${position.entry_price || 'N/A'}</span>
                      </div>
                    </div>
                    
                    {/* 30d/90d Earnings Graph */}
                    <div className="earnings-graph-section">
                      <div className="graph-period-toggle">
                        <button 
                          className={`period-btn ${(graphPeriod[index] || '30d') === '30d' ? 'active' : ''}`}
                          onClick={() => setGraphPeriod({...graphPeriod, [index]: '30d'})}
                        >
                          30D
                        </button>
                        <button 
                          className={`period-btn ${(graphPeriod[index] || '30d') === '90d' ? 'active' : ''}`}
                          onClick={() => setGraphPeriod({...graphPeriod, [index]: '90d'})}
                        >
                          90D
                        </button>
                      </div>
                      
                      <div className="graph-container">
                        <div className="graph-label">Price Movement (30D)</div>
                        <svg className="earnings-chart" viewBox="0 0 600 100" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id={`grad-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" style={{stopColor: position.pnl_percentage >= 0 ? '#00FF85' : '#FF4D4F', stopOpacity: 0.3}} />
                              <stop offset="100%" style={{stopColor: position.pnl_percentage >= 0 ? '#00FF85' : '#FF4D4F', stopOpacity: 0}} />
                            </linearGradient>
                          </defs>
                          <path 
                            className="earnings-line"
                            d="M 0 80 L 100 70 L 200 50 L 300 40 L 400 45 L 500 30 L 600 20" 
                            stroke={position.pnl_percentage >= 0 ? '#00FF85' : '#FF4D4F'}
                            strokeWidth="2" 
                            fill="none"
                          />
                          <path 
                            d="M 0 100 L 0 80 L 100 70 L 200 50 L 300 40 L 400 45 L 500 30 L 600 20 L 600 100 Z" 
                            fill={`url(#grad-${index})`}
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Early Withdrawal Warning */}
                    {position.type !== 'flexible' && (
                      <div className="early-withdrawal-warning">
                        <span className="warning-icon">⚠️</span>
                        <span className="warning-text">
                          Early withdrawal fee: {position.lock_period === 30 ? '1.5%' : position.lock_period === 60 ? '1.0%' : '0.5%'} will be deducted from principal
                        </span>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="action-buttons-row">
                      <button 
                        className="action-btn add-btn"
                        onClick={() => {
                          setSelectedPosition(position);
                          setShowAddModal(true);
                        }}
                      >
                        Add to Savings
                      </button>
                      <button 
                        className="action-btn withdraw-btn"
                        onClick={() => {
                          setSelectedPosition(position);
                          setShowWithdrawModal(true);
                        }}
                      >
                        {position.type === 'flexible' ? 'Withdraw' : 'Early Withdrawal'}
                      </button>
                      <button 
                        className="action-btn details-btn"
                        onClick={() => {
                          setSelectedPosition(position);
                          setShowHistoryModal(true);
                        }}
                      >
                        View Details
                      </button>
                    </div>

                    {/* Lock-up Period Selectors (only show if staked) */}
                    {position.type === 'staked' && (
                      <div className="lockup-period-selectors">
                        <button 
                          className={`lockup-pill ${position.lock_period === 7 ? 'active' : ''}`}
                          onClick={() => handleLockPeriodChange(index, 7)}
                        >
                          7d
                        </button>
                        <button 
                          className={`lockup-pill ${position.lock_period === 30 ? 'active' : ''}`}
                          onClick={() => handleLockPeriodChange(index, 30)}
                        >
                          30d
                        </button>
                        <button 
                          className={`lockup-pill ${position.lock_period === 90 ? 'active' : ''}`}
                          onClick={() => handleLockPeriodChange(index, 90)}
                        >
                          90d
                        </button>
                      </div>
                    )}

                    {/* Interest History Link/Button */}
                    <button 
                      className="interest-history-btn"
                      onClick={() => {
                        setSelectedPosition(position);
                        setShowHistoryModal(true);
                      }}
                    >
                      📑 Interest History
                    </button>
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
        )}
      </div>

      {/* MOBILE FOOTER - Clean SVG Icons */}
      <MobileBottomNav />

      {/* MODALS */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-content glassmorphic-card modal-large" onClick={(e) => e.stopPropagation()}>
            <h3>Add to Savings</h3>
            <button className="modal-close-btn" onClick={() => {setShowTransferModal(false); setDepositStep(1);}}>✕</button>
            
            <div className="deposit-flow-steps">
              <div className={`step-indicator ${depositStep >= 1 ? 'active' : ''} ${depositStep > 1 ? 'completed' : ''}`}>1</div>
              <div className="step-line"></div>
              <div className={`step-indicator ${depositStep >= 2 ? 'active' : ''} ${depositStep > 2 ? 'completed' : ''}`}>2</div>
              <div className="step-line"></div>
              <div className={`step-indicator ${depositStep >= 3 ? 'active' : ''} ${depositStep > 3 ? 'completed' : ''}`}>3</div>
              <div className="step-line"></div>
              <div className={`step-indicator ${depositStep >= 4 ? 'active' : ''} ${depositStep > 4 ? 'completed' : ''}`}>4</div>
              <div className="step-line"></div>
              <div className={`step-indicator ${depositStep >= 5 ? 'active' : ''}`}>5</div>
            </div>
            
            {depositStep === 1 && (
              <div className="deposit-step">
                <h4>Step 1: Select Wallet Source</h4>
                <p className="step-description">Select which wallet to transfer funds from</p>
                <div className="wallet-source-options">
                  <div 
                    className="wallet-source-card selected"
                    onClick={() => {}}
                  >
                    <svg className="wallet-svg-icon" width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="6" y="14" width="36" height="24" rx="4" fill="#1e3a5f"/>
                      <rect x="6" y="14" width="36" height="8" fill="#2563eb" opacity="0.3"/>
                      <rect x="28" y="22" width="14" height="10" rx="2" fill="#0f172a"/>
                      <circle cx="35" cy="27" r="3" fill="#22d3ee"/>
                    </svg>
                    <div className="wallet-info">
                      <span className="wallet-name">Main Wallet</span>
                      <span className="wallet-hint">Your primary wallet balance</span>
                    </div>
                    <span className="check-mark">✓</span>
                  </div>
                </div>
                <div className="step-actions">
                  <button 
                    className="modal-secondary-btn"
                    onClick={() => {
                      setShowTransferModal(false);
                      setDepositStep(1);
                      navigate('/wallet');
                    }}
                  >
                    Go to Main Wallet
                  </button>
                  <button className="modal-cta-btn" onClick={() => setDepositStep(2)}>Next</button>
                </div>
              </div>
            )}
            
            {depositStep === 2 && (
              <div className="deposit-step">
                <h4>Step 2: Select Coin</h4>
                <p className="step-subtitle">{availableCoins.length} cryptocurrencies available</p>
                {loadingCoins ? (
                  <div className="loading-coins">Loading coins...</div>
                ) : (
                  <div className="coin-grid">
                    {availableCoins.map(coin => (
                      <div 
                        key={coin.symbol}
                        className={`coin-option-card ${selectedCoin === coin.symbol ? 'selected' : ''}`}
                        onClick={() => setSelectedCoin(coin.symbol)}
                      >
                        <div className="coin-option-logo-wrapper">
                          <img 
                            src={getCoinLogo(coin.symbol)} 
                            alt={coin.symbol} 
                            className="coin-option-logo"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="coin-emoji-fallback" style={{display: 'none'}}>
                            {coin.symbol.charAt(0)}
                          </div>
                        </div>
                        <div className="coin-option-info">
                          <span className="coin-option-symbol">{coin.symbol}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button className="modal-cta-btn" onClick={() => setDepositStep(3)} disabled={!selectedCoin}>Next</button>
              </div>
            )}
            
            {depositStep === 3 && (
              <div className="deposit-step">
                <h4>Step 3: Enter Amount</h4>
                <input 
                  type="number" 
                  className="deposit-input" 
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
                <button className="modal-secondary-btn" onClick={() => setDepositAmount('1.0')}>Max</button>
                <button className="modal-cta-btn" onClick={() => setDepositStep(4)} disabled={!depositAmount}>Next</button>
              </div>
            )}
            
            {depositStep === 4 && (
              <div className="deposit-step">
                <h4>Step 4: Select Notice Period</h4>
                <div className="notice-selector-mini">
                  <button className={`notice-mini-btn ${selectedNoticePeriod === 30 ? 'active' : ''}`} onClick={() => setSelectedNoticePeriod(30)}>30 Days</button>
                  <button className={`notice-mini-btn ${selectedNoticePeriod === 60 ? 'active' : ''}`} onClick={() => setSelectedNoticePeriod(60)}>60 Days</button>
                  <button className={`notice-mini-btn ${selectedNoticePeriod === 90 ? 'active' : ''}`} onClick={() => setSelectedNoticePeriod(90)}>90 Days</button>
                </div>
                <button className="modal-cta-btn" onClick={() => setDepositStep(5)}>Next</button>
              </div>
            )}
            
            {depositStep === 5 && (
              <div className="deposit-step">
                <h4>Step 5: Confirm Summary</h4>
                <div className="summary-box">
                  <div className="summary-row"><span>Amount:</span><span>{depositAmount} {selectedCoin}</span></div>
                  <div className="summary-row"><span>Notice Period:</span><span>{selectedNoticePeriod} days</span></div>
                  <div className="summary-row"><span>Lock Period:</span><span className="success-text">{selectedNoticePeriod} Days</span></div>
                  <div className="summary-row"><span>Unlock Date:</span><span>{new Date(Date.now() + selectedNoticePeriod * 24 * 60 * 60 * 1000).toLocaleDateString()}</span></div>
                  <div className="summary-row"><span>Early Withdrawal Fee:</span><span className="danger-text">{selectedNoticePeriod === 30 ? '1.5%' : selectedNoticePeriod === 60 ? '1.0%' : '0.5%'} of principal</span></div>
                </div>
                <button 
                  className="modal-cta-btn" 
                  disabled={depositLoading}
                  onClick={async () => {
                    try {
                      setDepositLoading(true);
                      const userId = getUserId();
                      if (!userId) { 
                        toast.error('Please log in first'); 
                        setDepositLoading(false);
                        return; 
                      }
                      
                      // Call initiate endpoint - returns NowPayments URL
                      const response = await axios.post(`${API}/api/savings/initiate`, {
                        user_id: userId,
                        asset: selectedCoin,
                        amount: parseFloat(depositAmount),
                        lock_period_days: selectedNoticePeriod
                      });
                      
                      if (response.data.success && response.data.payment_url) {
                        toast.success('Redirecting to payment...');
                        // Redirect to NowPayments hosted checkout
                        window.location.href = response.data.payment_url;
                      } else {
                        toast.error('Failed to create payment');
                        setDepositLoading(false);
                      }
                    } catch (error) {
                      console.error('Deposit error:', error);
                      toast.error(error.response?.data?.detail || 'Deposit failed');
                      setDepositLoading(false);
                    }
                  }}
                >
                  {depositLoading ? 'Processing...' : 'Proceed to Payment'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="modal-overlay" onClick={() => setShowWithdrawModal(false)}>
          <div className="modal-content glassmorphic-card" onClick={(e) => e.stopPropagation()}>
            <h3>Withdraw from Savings</h3>
            <button className="modal-close-btn" onClick={() => setShowWithdrawModal(false)}>✕</button>
            
            {selectedPosition && selectedPosition.type !== 'flexible' && (
              <div className="modal-warning-box">
                <span className="modal-warning-icon">⚠️</span>
                <div className="modal-warning-content">
                  <p className="modal-warning-title">Early Withdrawal Penalty</p>
                  <p className="modal-warning-text">
                    Withdrawing before your notice period ends will incur a {selectedPosition?.lock_period === 30 ? '1.5%' : selectedPosition?.lock_period === 60 ? '1.0%' : '0.5%'} fee deducted from your principal.
                  </p>
                </div>
              </div>
            )}
            
            <div className="withdraw-form">
              <label>Amount to withdraw</label>
              <input 
                type="number" 
                className="deposit-input" 
                placeholder={`Max: ${selectedPosition?.balance || 0} ${selectedPosition?.symbol || ''}`}
                max={selectedPosition?.balance || 0}
              />
              <button className="modal-secondary-btn" onClick={(e) => {
                const input = e.target.previousElementSibling;
                input.value = selectedPosition?.balance || 0;
              }}>Max</button>
              
              <button className="modal-cta-btn" onClick={async (e) => {
                try {
                  const amount = parseFloat(e.target.parentElement.querySelector('input').value);
                  if (!amount || amount <= 0) {
                    alert('Please enter a valid amount');
                    return;
                  }
                  
                  const userId = getUserId();
                  if (!userId) { toast.error('Please log in first'); return; }
                  const response = await axios.post(`${API}/api/savings/withdraw`, {
                    user_id: userId,
                    coin: selectedPosition.symbol,
                    amount: amount
                  });
                  
                  if (response.data.success) {
                    const withdrawal = response.data.withdrawal;
                    if (withdrawal.penalty_applied > 0) {
                      alert(`Withdrawal completed. Penalty applied: ${withdrawal.penalty_applied.toFixed(6)} ${selectedPosition.symbol} (${withdrawal.penalty_percentage.toFixed(1)}%)`);
                    } else {
                      alert('Withdrawal completed successfully!');
                    }
                    setShowWithdrawModal(false);
                    loadSavingsData();
                  }
                } catch (error) {
                  alert('Withdrawal failed: ' + (error.response?.data?.detail || error.message));
                }
              }}>Confirm Withdrawal</button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content glassmorphic-card" onClick={(e) => e.stopPropagation()}>
            <h3>Add {selectedPosition?.symbol}</h3>
            <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            <p>Add more to your notice account deposit to increase your earnings</p>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content glassmorphic-card modal-large" onClick={(e) => e.stopPropagation()}>
            <h3>Interest History - {selectedPosition?.symbol}</h3>
            <button className="modal-close-btn" onClick={() => setShowHistoryModal(false)}>✕</button>
            <div className="history-list">
              <p>No interest history yet</p>
            </div>
          </div>
        </div>
      )}

      {/* NOTICE RULES MODAL */}
      {showNoticeRulesModal && (
        <div className="modal-overlay" onClick={() => setShowNoticeRulesModal(false)}>
          <div className="modal-content glassmorphic-card modal-large" onClick={(e) => e.stopPropagation()}>
            <h3>Notice Rules & Early Withdrawal Penalties</h3>
            <button className="modal-close-btn" onClick={() => setShowNoticeRulesModal(false)}>✕</button>
            
            <div className="notice-rules-content" style={{ padding: '20px 0', lineHeight: '1.8' }}>
              <h4 style={{ color: 'var(--accent)', marginTop: '0' }}>How Notice Accounts Work</h4>
              <p>When you deposit into a savings vault, you choose a <strong>notice period</strong> (30, 60, or 90 days). Your funds are locked for this duration for secure storage.</p>
              
              <h4 style={{ color: 'var(--accent)', marginTop: '24px' }}>Interest Rates</h4>
              <ul>
                <li><strong>30-day lock:</strong> 1.5% early withdrawal fee</li>
                <li><strong>60-day lock:</strong> 1.0% early withdrawal fee</li>
                <li><strong>90-day lock:</strong> 0.5% early withdrawal fee</li>
              </ul>
              
              <h4 style={{ color: 'var(--accent)', marginTop: '24px' }}>Early Withdrawal Penalties (OPTION A)</h4>
              <p style={{ color: '#ff6b6b', fontWeight: 600 }}>If you withdraw before the lock period ends:</p>
              <ul>
                <li><strong>30-day lock:</strong> 2% penalty on principal + forfeit 100% interest</li>
                <li><strong>60-day lock:</strong> 1.0% fee deducted from principal</li>
                <li><strong>90-day lock:</strong> 5% penalty on principal + forfeit 100% interest</li>
              </ul>
              
              <h4 style={{ color: 'var(--accent)', marginTop: '24px' }}>Important Notes</h4>
              <ul>
                <li>✅ Your principal is <strong>NEVER lost</strong> (you only pay a small percentage)</li>
                <li>✅ Penalty is taken from the withdrawal amount, not your total balance</li>
                <li>✅ After the lock period ends, withdraw anytime without penalty</li>
                <li>✅ Interest is calculated daily and paid at maturity</li>
              </ul>
              
              <h4 style={{ color: 'var(--accent)', marginTop: '24px' }}>Example</h4>
              <div style={{ background: 'rgba(19, 215, 255, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <p><strong>Scenario:</strong> You deposit 1 BTC in a 30-day lock</p>
                <p><strong>After 15 days:</strong> You earned 0.05 BTC interest</p>
                <p><strong>Early withdrawal:</strong></p>
                <ul style={{ marginLeft: '20px' }}>
                  <li>Penalty: 1 BTC × 2% = 0.02 BTC</li>
                  <li>Forfeit interest: 0.05 BTC</li>
                  <li><strong>You receive:</strong> 0.98 BTC</li>
                  <li><strong>Platform keeps:</strong> 0.07 BTC (penalty + interest)</li>
                </ul>
              </div>
            </div>
            
            <button 
              className="modal-cta-btn" 
              onClick={() => setShowNoticeRulesModal(false)}
              style={{ marginTop: '24px' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingsVault;