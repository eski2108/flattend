import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getCoinLogo } from '@/utils/coinLogos';
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
          <p className="savings-vault-subtitle">Lock your crypto to earn guaranteed yields. Watch your savings grow with every block.</p>
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
          <div className="card-label">Total Savings</div>
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
          <div className="card-label">Locked Balance</div>
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
          <div className="card-label">Available to Withdraw</div>
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
          <div className="card-label">Total Interest Earned</div>
          <div className="card-value-main">{totalInterestCrypto.split(' ')[0]} <span className="crypto-symbol">{totalInterestCrypto.split(' ')[1]}</span> Earned</div>
          <div className="card-value-fiat">≈ ${totalInterestEarned.toFixed(2)}</div>
          <div className="live-indicator">
            <span className="live-dot pulsing"></span>
            <span className="live-text">Live</span>
          </div>
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
            Flexible {filterFlexible && '✓'}
          </button>
          <button 
            className={`filter-toggle-btn ${filterStaked ? 'active' : ''}`}
            onClick={() => setFilterStaked(!filterStaked)}
          >
            Staked {filterStaked && '✓'}
          </button>
        </div>
        
        <div className="visible-count">{filteredPositions.length}/{positions.length} assets shown</div>
      </div>

      {/* YOUR SAVINGS - PORTFOLIO LIST */}
      <div className="portfolio-list-section">
        <div className="section-header-with-description">
          <h2 className="section-heading">Your Savings</h2>
          <p className="section-description">Lock your crypto for fixed periods to earn competitive yields. Track your earnings and unlock dates in real-time.</p>
        </div>
        
        {loading ? (
          <div className="loading-state">Loading your savings...</div>
        ) : filteredPositions.length === 0 ? (
          <div className="empty-state glassmorphic-card">
            <p>You don't have any savings yet.</p>
            <button className="transfer-from-wallet-btn" onClick={() => navigate('/wallet')}>
              Start Saving Now
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
                  
                  <div className="token-interest-earned">
                    <span className="earned-label">Interest earned:</span>
                    <span className="earned-value">{position.interest_earned || '0.00'} {position.symbol}</span>
                  </div>
                  
                  <div className="token-est-monthly">
                    <span className="monthly-label">Est. Monthly:</span>
                    <span className="monthly-value">~${position.estimated_monthly || '0.00'}</span>
                  </div>
                  
                  <div className="token-toggles-section">
                    {/* Flexible/Staked Segmented Control */}
                    <div className="flexible-staked-control">
                      <button 
                        className={`toggle-segment ${position.type === 'flexible' ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFlexibleStaked(index, 'flexible');
                        }}
                      >
                        Flexible
                      </button>
                      <button 
                        className={`toggle-segment ${position.type === 'staked' ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFlexibleStaked(index, 'staked');
                        }}
                      >
                        Staked
                      </button>
                    </div>
                    
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
                        <div className="graph-label">Interest Earned ({position.symbol})</div>
                        <svg className="earnings-chart" viewBox="0 0 600 100" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id={`grad-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" style={{stopColor: '#00FF85', stopOpacity: 0.3}} />
                              <stop offset="100%" style={{stopColor: '#00FF85', stopOpacity: 0}} />
                            </linearGradient>
                          </defs>
                          <path 
                            className="earnings-line"
                            d="M 0 80 L 100 70 L 200 50 L 300 40 L 400 45 L 500 30 L 600 20" 
                            stroke="#00FF85" 
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

                    {/* Action Buttons - Withdraw & Add */}
                    <div className="action-buttons-row">
                      <button 
                        className="action-btn withdraw-btn"
                        onClick={() => {
                          setSelectedPosition(position);
                          setShowWithdrawModal(true);
                        }}
                      >
                        Withdraw
                      </button>
                      <button 
                        className="action-btn add-btn"
                        onClick={() => {
                          setSelectedPosition(position);
                          setShowAddModal(true);
                        }}
                      >
                        Add
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
          <div className="modal-content glassmorphic-card" onClick={(e) => e.stopPropagation()}>
            <h3>Add to Savings</h3>
            <button className="modal-close-btn" onClick={() => setShowTransferModal(false)}>✕</button>
            <p>Lock your crypto to start earning guaranteed yields</p>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="modal-overlay" onClick={() => setShowWithdrawModal(false)}>
          <div className="modal-content glassmorphic-card" onClick={(e) => e.stopPropagation()}>
            <h3>Withdraw {selectedPosition?.symbol}</h3>
            <button className="modal-close-btn" onClick={() => setShowWithdrawModal(false)}>✕</button>
            <p>Unlock and withdraw your crypto. Early withdrawal may incur penalties.</p>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content glassmorphic-card" onClick={(e) => e.stopPropagation()}>
            <h3>Add {selectedPosition?.symbol}</h3>
            <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            <p>Lock additional crypto to increase your earnings</p>
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