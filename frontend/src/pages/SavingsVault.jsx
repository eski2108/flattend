import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import getCoinLogo from '../utils/coinLogos';
import './SavingsVault.css';

const API = process.env.REACT_APP_BACKEND_URL;

const SavingsVault = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalBalanceCrypto, setTotalBalanceCrypto] = useState('0.00 BTC');
  const [lockedBalance, setLockedBalance] = useState(0);
  const [lockedBalanceCrypto, setLockedBalanceCrypto] = useState('0.00 BTC');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [availableBalanceCrypto, setAvailableBalanceCrypto] = useState('0.00 BTC');
  const [totalInterestEarned, setTotalInterestEarned] = useState(0);
  const [totalInterestCrypto, setTotalInterestCrypto] = useState('0.00 BTC');
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

  useEffect(() => {
    loadSavingsData();
  }, []);

  const loadSavingsData = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('user_id');
      
      if (!userId) {
        console.error('No user_id found');
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
    console.log('Toggle type', index, newType);
    // API call here
  };

  const handleToggleAutoCompound = async (index) => {
    console.log('Toggle auto-compound', index);
    // API call here
  };

  const handleLockPeriodChange = async (index, period) => {
    console.log('Change lock period', index, period);
    // API call here
  };

  const filteredPositions = getFilteredPositions();

  return (
    <div className="savings-vault-container">
      {/* PAGE HEADER */}
      <header className="savings-vault-header">
        <div className="header-title-section">
          <h1 className="savings-vault-title">Savings Vault</h1>
          <p className="savings-vault-subtitle">Deposit crypto into notice accounts to earn guaranteed yields. Choose 30, 60, or 90 day notice periods. Early withdrawal incurs penalties.</p>
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
                <div className="dropdown-item" onClick={() => { setSelectedWallet('Main'); setShowWalletMenu(false); }}>Main Wallet</div>
                <div className="dropdown-item" onClick={() => { setSelectedWallet('Trading'); setShowWalletMenu(false); }}>Trading Wallet</div>
                <div className="dropdown-item" onClick={() => { setSelectedWallet('Savings'); setShowWalletMenu(false); }}>Savings Wallet</div>
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
          <div className="card-value-main">{totalBalanceCrypto.split(' ')[0]} <span className="crypto-symbol">{totalBalanceCrypto.split(' ')[1]}</span></div>
          <div className="card-value-fiat">≈ ${totalBalance.toFixed(2)}</div>
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
          <div className="card-value-main">{lockedBalanceCrypto.split(' ')[0]} <span className="crypto-symbol">{lockedBalanceCrypto.split(' ')[1]}</span></div>
          <div className="card-value-fiat">≈ ${lockedBalance.toFixed(2)}</div>
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
          <div className="card-value-main">{availableBalanceCrypto.split(' ')[0]} <span className="crypto-symbol">{availableBalanceCrypto.split(' ')[1]}</span></div>
          <div className="card-value-fiat">≈ ${availableBalance.toFixed(2)}</div>
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
          <div className="card-value-main">{totalInterestCrypto.split(' ')[0]} <span className="crypto-symbol">{totalInterestCrypto.split(' ')[1]}</span></div>
          <div className="card-value-fiat">≈ ${totalInterestEarned.toFixed(2)}</div>
          <div className="live-indicator">
            <span className="live-dot pulsing"></span>
            <span className="live-text">Live</span>
          </div>
        </div>
      </div>

      {/* NOTICE ACCOUNT SELECTOR */}
      <div className="notice-selector-section glassmorphic-card">
        <h3 className="notice-selector-title">Choose Notice Period</h3>
        <p className="notice-selector-description">Select how long you want to lock your deposit. Longer periods earn higher APY.</p>
        
        <div className="notice-period-options">
          <div className={`notice-option-card ${selectedNoticePeriod === 30 ? 'selected' : ''}`}>
            <div className="notice-option-header">
              <span className="notice-days">30 Days</span>
              <span className="notice-apy">5.2% APY</span>
            </div>
            <div className="notice-option-details">
              <div className="notice-detail-item">
                <span className="detail-label">Early Withdrawal:</span>
                <span className="detail-value penalty-text">2% interest penalty</span>
              </div>
              <div className="notice-detail-item">
                <span className="detail-label">Next Unlock:</span>
                <span className="detail-value">Jan 15, 2025</span>
              </div>
            </div>
            <button className="select-notice-btn" onClick={() => {setSelectedNoticePeriod(30); setShowTransferModal(true);}}>Lock Funds</button>
          </div>

          <div className={`notice-option-card ${selectedNoticePeriod === 60 ? 'selected' : ''}`}>
            <div className="notice-option-header">
              <span className="notice-days">60 Days</span>
              <span className="notice-apy">6.8% APY</span>
            </div>
            <div className="notice-option-details">
              <div className="notice-detail-item">
                <span className="detail-label">Early Withdrawal:</span>
                <span className="detail-value penalty-text">3.5% interest penalty</span>
              </div>
              <div className="notice-detail-item">
                <span className="detail-label">Next Unlock:</span>
                <span className="detail-value">Feb 14, 2025</span>
              </div>
            </div>
            <button className="select-notice-btn" onClick={() => {setSelectedNoticePeriod(60); setShowTransferModal(true);}}>Lock Funds</button>
          </div>

          <div className={`notice-option-card highlighted ${selectedNoticePeriod === 90 ? 'selected' : ''}`}>
            <div className="best-value-badge">Best Value</div>
            <div className="notice-option-header">
              <span className="notice-days">90 Days</span>
              <span className="notice-apy">8.5% APY</span>
            </div>
            <div className="notice-option-details">
              <div className="notice-detail-item">
                <span className="detail-label">Early Withdrawal:</span>
                <span className="detail-value penalty-text">5% interest penalty</span>
              </div>
              <div className="notice-detail-item">
                <span className="detail-label">Next Unlock:</span>
                <span className="detail-value">Mar 16, 2025</span>
              </div>
            </div>
            <button className="select-notice-btn primary" onClick={() => {setSelectedNoticePeriod(90); setShowTransferModal(true);}}>Lock Funds</button>
          </div>
        </div>
        
        <div className="notice-info-section">
          <button className="notice-info-btn">
            <span className="info-icon">ⓘ</span> Notice Rules & Early Withdrawal
          </button>
          <p className="notice-terms-footer">
            Early withdrawal: interest penalty applies. Principal is never lost.
          </p>
        </div>
      </div>

      {/* REFERRAL BANNER */}
      {showReferralBanner && (
        <div className="referral-banner glassmorphic-card purple-accent">
          <div className="referral-content">
            <span className="referral-icon">🎁</span>
            <div className="referral-text-section">
              <span className="referral-title">Invite friends, earn more</span>
              <span className="referral-subtitle">Get 10% of your referrals' interest earnings as bonus rewards</span>
            </div>
            <span className="referral-arrow">→</span>
          </div>
          <button 
            className="dismiss-banner-btn"
            onClick={() => setShowReferralBanner(false)}
          >
            ✕
          </button>
        </div>
      )}

      {/* SORTING & FILTERS BAR */}
      <div className="controls-toolbar">
        {/* Sort By Dropdown */}
        <div className="sort-control">
          <button 
            className="sort-btn"
            onClick={() => setShowSortMenu(!showSortMenu)}
          >
            <span className="sort-label">Sort: </span>
            <span className="sort-value">{sortBy === 'name' ? 'Token Name' : sortBy === 'apy' ? 'APY' : sortBy === 'earned' ? 'Total Earned' : 'Balance'}</span>
            <span className="dropdown-arrow">▼</span>
          </button>
          
          {showSortMenu && (
            <div className="sort-dropdown-menu">
              <div className="dropdown-item" onClick={() => handleSort('name')}>Token Name</div>
              <div className="dropdown-item" onClick={() => handleSort('apy')}>APY (High to Low)</div>
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

      {/* YOUR SAVINGS - PORTFOLIO LIST */}
      <div className="portfolio-list-section">
        <div className="section-header-with-description">
          <h2 className="section-heading">Your Savings</h2>
          <p className="section-description">Monitor your locked funds. Each row shows amount, APY, interest earned, and profit/loss since deposit.</p>
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
            <p className="empty-state-description">Lock your crypto for 30, 60, or 90 days to earn guaranteed interest.</p>
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
                <span className="step-text">Start earning interest</span>
              </div>
            </div>
            <button className="empty-state-cta" onClick={() => setShowTransferModal(true)}>
              Add to Savings
            </button>
          </div>
        ) : (
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
                    <span className="apy-label">APY</span>
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
                          Early withdrawal penalty: {position.lock_period === 30 ? '2%' : position.lock_period === 60 ? '3.5%' : '5%'} of deposit will be forfeited
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
        )}
      </div>

      {/* MOBILE FOOTER - Only visible on mobile */}
      <div className="mobile-bottom-nav">
        <button className="nav-tab" onClick={() => navigate('/wallet')}>
          <span className="tab-icon">💰</span>
          <span className="tab-label">Wallet</span>
        </button>
        <button className="nav-tab active">
          <span className="tab-icon">💲</span>
          <span className="tab-label">Savings</span>
        </button>
        <button className="nav-tab" onClick={() => navigate('/settings')}>
          <span className="tab-icon">⚙️</span>
          <span className="tab-label">Settings</span>
        </button>
      </div>

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
                <select className="deposit-input" defaultValue="main">
                  <option value="main">Wallet: Main</option>
                </select>
                <button className="modal-cta-btn" onClick={() => setDepositStep(2)}>Next</button>
              </div>
            )}
            
            {depositStep === 2 && (
              <div className="deposit-step">
                <h4>Step 2: Select Coin</h4>
                <div className="coin-grid">
                  {[
                    { symbol: 'BTC', name: 'Bitcoin' },
                    { symbol: 'ETH', name: 'Ethereum' },
                    { symbol: 'USDT', name: 'Tether' },
                    { symbol: 'USDC', name: 'USD Coin' },
                    { symbol: 'BNB', name: 'Binance Coin' },
                    { symbol: 'SOL', name: 'Solana' },
                    { symbol: 'XRP', name: 'Ripple' },
                    { symbol: 'ADA', name: 'Cardano' },
                    { symbol: 'DOGE', name: 'Dogecoin' },
                    { symbol: 'DOT', name: 'Polkadot' },
                    { symbol: 'MATIC', name: 'Polygon' },
                    { symbol: 'LTC', name: 'Litecoin' },
                    { symbol: 'LINK', name: 'Chainlink' },
                    { symbol: 'AVAX', name: 'Avalanche' }
                  ].map(coin => (
                    <div 
                      key={coin.symbol}
                      className={`coin-option-card ${selectedCoin === coin.symbol ? 'selected' : ''}`}
                      onClick={() => setSelectedCoin(coin.symbol)}
                    >
                      <img src={getCoinLogo(coin.symbol)} alt={coin.symbol} className="coin-option-logo" />
                      <div className="coin-option-info">
                        <span className="coin-option-symbol">{coin.symbol}</span>
                        <span className="coin-option-name">{coin.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <button className={`notice-mini-btn ${selectedNoticePeriod === 30 ? 'active' : ''}`} onClick={() => setSelectedNoticePeriod(30)}>30 Days (5.2% APY)</button>
                  <button className={`notice-mini-btn ${selectedNoticePeriod === 60 ? 'active' : ''}`} onClick={() => setSelectedNoticePeriod(60)}>60 Days (6.8% APY)</button>
                  <button className={`notice-mini-btn ${selectedNoticePeriod === 90 ? 'active' : ''}`} onClick={() => setSelectedNoticePeriod(90)}>90 Days (8.5% APY)</button>
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
                  <div className="summary-row"><span>Estimated APY:</span><span className="success-text">{selectedNoticePeriod === 30 ? '5.2%' : selectedNoticePeriod === 60 ? '6.8%' : '8.5%'}</span></div>
                  <div className="summary-row"><span>Unlock Date:</span><span>{new Date(Date.now() + selectedNoticePeriod * 24 * 60 * 60 * 1000).toLocaleDateString()}</span></div>
                  <div className="summary-row"><span>Early Withdrawal Penalty:</span><span className="danger-text">{selectedNoticePeriod === 30 ? '2%' : selectedNoticePeriod === 60 ? '3.5%' : '5%'} of interest</span></div>
                </div>
                <button className="modal-cta-btn" onClick={async () => {
                  try {
                    const userId = localStorage.getItem('user_id');
                    const response = await axios.post(`${API}/api/savings/deposit`, {
                      user_id: userId,
                      coin: selectedCoin,
                      amount: parseFloat(depositAmount),
                      notice_period: selectedNoticePeriod
                    });
                    if (response.data.success) {
                      alert('Deposit created successfully!');
                      setShowTransferModal(false);
                      setDepositStep(1);
                      loadSavingsData();
                    }
                  } catch (error) {
                    alert('Deposit failed: ' + error.message);
                  }
                }}>Confirm Deposit</button>
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
                    Withdrawing before your notice period ends will forfeit {selectedPosition?.lock_period === 30 ? '2%' : selectedPosition?.lock_period === 60 ? '3.5%' : '5%'} of earned interest. Your principal remains safe.
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
                  
                  const userId = localStorage.getItem('user_id');
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
    </div>
  );
};

export default SavingsVault;