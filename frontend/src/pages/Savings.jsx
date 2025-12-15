import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Savings.css';

const API = process.env.REACT_APP_BACKEND_URL;

const Savings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [totalInterestEarned, setTotalInterestEarned] = useState(0);
  const [expandedCard, setExpandedCard] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [filterActive, setFilterActive] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [selectedWallet, setSelectedWallet] = useState('main');
  const [graphPeriod, setGraphPeriod] = useState('30d');

  useEffect(() => {
    loadSavingsData();
  }, []);

  const loadSavingsData = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('user_id');
      
      // Get user's savings positions
      const response = await axios.get(`${API}/api/savings/positions/${userId}`);
      
      if (response.data.success) {
        const data = response.data;
        setPositions(data.positions || []);
        setTotalBalance(data.total_balance_usd || 0);
        setAvailableBalance(data.available_balance_usd || 0);
        setTotalInterestEarned(data.total_interest_earned_usd || 0);
      }
    } catch (error) {
      console.error('Error loading savings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = (index) => {
    setExpandedCard(expandedCard === index ? null : index);
  };

  const handleToggleFlexibleStaked = (index, newType) => {
    // Handle toggle
    console.log('Toggle flexible/staked', index, newType);
  };

  const handleToggleAutoCompound = (index) => {
    // Handle auto-compound toggle
    console.log('Toggle auto-compound', index);
  };

  return (
    <div className="savings-vault">
      {/* PAGE HEADER */}
      <header className="savings-header">
        <h1 className="savings-title">Savings Vault</h1>
        
        <div className="header-actions">
          {/* Wallet Selector */}
          <div className="wallet-selector">
            <span>Wallet: {selectedWallet}</span>
            <span className="dropdown-arrow">▼</span>
          </div>
          
          {/* Transfer Button */}
          <button className="transfer-button">
            Transfer from Wallet
          </button>
        </div>
      </header>

      {/* SUMMARY CARDS */}
      <div className="summary-cards">
        {/* Total Balance Card */}
        <div className="summary-card">
          <div className="card-label">Total Balance</div>
          <div className="card-value">${totalBalance.toFixed(2)}</div>
          <div className="live-indicator">
            <span className="live-dot"></span>
            <span className="live-text">Live</span>
          </div>
        </div>

        {/* Available to Transfer Card */}
        <div className="summary-card">
          <div className="card-label">Available to Transfer</div>
          <div className="card-value">${availableBalance.toFixed(2)}</div>
          <div className="live-indicator">
            <span className="live-dot"></span>
            <span className="live-text">Live</span>
          </div>
        </div>

        {/* Interest Earned Card */}
        <div className="summary-card">
          <div className="card-label">Interest Earned to Date</div>
          <div className="card-value">${totalInterestEarned.toFixed(2)}</div>
          <div className="live-indicator">
            <span className="live-dot"></span>
            <span className="live-text">Live</span>
          </div>
        </div>
      </div>

      {/* REFERRAL BANNER */}
      <div className="referral-banner">
        <span className="referral-text">Invite friends, earn more ➜</span>
      </div>

      {/* SORTING & FILTERS */}
      <div className="controls-bar">
        <div className="sort-control">
          <span>Sort: {sortBy}</span>
          <span className="dropdown-arrow">▼</span>
        </div>
        
        <div className="filter-controls">
          <button 
            className={`filter-btn ${filterActive ? 'active' : ''}`}
            onClick={() => setFilterActive(!filterActive)}
          >
            Active {filterActive && '✓'}
          </button>
          <button 
            className={`filter-btn ${filterType === 'flexible' ? 'active' : ''}`}
            onClick={() => setFilterType(filterType === 'flexible' ? 'all' : 'flexible')}
          >
            Flexible
          </button>
          <button 
            className={`filter-btn ${filterType === 'staked' ? 'active' : ''}`}
            onClick={() => setFilterType(filterType === 'staked' ? 'all' : 'staked')}
          >
            Staked
          </button>
        </div>
      </div>

      {/* YOUR SAVINGS - PORTFOLIO LIST */}
      <div className="portfolio-section">
        <h2 className="section-title">Your Savings</h2>
        
        {loading ? (
          <div className="loading-state">Loading your savings...</div>
        ) : positions.length === 0 ? (
          <div className="empty-state">
            <p>You don't have any savings yet.</p>
            <button className="transfer-button" onClick={() => navigate('/wallet')}>
              Start Saving Now
            </button>
          </div>
        ) : (
          <div className="token-cards">
            {positions.map((position, index) => (
              <div 
                key={index} 
                className={`token-card ${expandedCard === index ? 'expanded' : ''}`}
              >
                {/* COLLAPSED VIEW */}
                <div className="card-header" onClick={() => toggleCard(index)}>
                  <div className="token-info">
                    <div className="token-icon">{position.symbol.substring(0, 1)}</div>
                    <div className="token-name">
                      {position.name} ({position.symbol})
                    </div>
                  </div>
                  
                  <div className="token-stats">
                    <div className="balance">
                      {position.balance} {position.symbol}
                      <span className="fiat-value">≈ ${position.balance_usd}</span>
                    </div>
                    
                    <div className="apy-info">
                      <span className="apy-label">APY:</span>
                      <span className="apy-value">{position.apy}%</span>
                    </div>
                    
                    <div className="interest-earned">
                      Interest: {position.interest_earned} {position.symbol}
                    </div>
                    
                    <div className="est-monthly">
                      Est. Monthly: ~${position.estimated_monthly}
                    </div>
                  </div>
                  
                  <div className="card-toggles">
                    <div className="flexible-staked-toggle">
                      <button 
                        className={position.type === 'flexible' ? 'active' : ''}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFlexibleStaked(index, 'flexible');
                        }}
                      >
                        Flexible
                      </button>
                      <button 
                        className={position.type === 'staked' ? 'active' : ''}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFlexibleStaked(index, 'staked');
                        }}
                      >
                        Staked
                      </button>
                    </div>
                    
                    <div className="auto-compound-toggle">
                      <label>
                        Auto-Compound
                        <input 
                          type="checkbox" 
                          checked={position.auto_compound}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleAutoCompound(index);
                          }}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="expand-arrow">
                    {expandedCard === index ? '▲' : '▼'}
                  </div>
                </div>

                {/* EXPANDED VIEW */}
                {expandedCard === index && (
                  <div className="card-expanded">
                    {/* Graph Section */}
                    <div className="graph-section">
                      <div className="graph-controls">
                        <button 
                          className={graphPeriod === '30d' ? 'active' : ''}
                          onClick={() => setGraphPeriod('30d')}
                        >
                          30D
                        </button>
                        <button 
                          className={graphPeriod === '90d' ? 'active' : ''}
                          onClick={() => setGraphPeriod('90d')}
                        >
                          90D
                        </button>
                      </div>
                      
                      <div className="earnings-graph">
                        {/* Placeholder for graph */}
                        <div className="graph-placeholder">
                          <svg width="100%" height="100" viewBox="0 0 600 100">
                            <path 
                              d="M 0 80 L 100 70 L 200 50 L 300 40 L 400 45 L 500 30 L 600 20" 
                              stroke="#00FF85" 
                              strokeWidth="2" 
                              fill="none"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="action-buttons">
                      <button className="action-btn withdraw-btn">Withdraw</button>
                      <button className="action-btn add-btn">Add</button>
                    </div>

                    {/* Lock-up Period Selectors (if staked) */}
                    {position.type === 'staked' && (
                      <div className="lockup-selectors">
                        <button className="lockup-btn">7d</button>
                        <button className="lockup-btn active">30d</button>
                        <button className="lockup-btn">90d</button>
                      </div>
                    )}

                    {/* Interest History Link */}
                    <div className="interest-history-link">
                      <button>📑 Interest History</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MOBILE FOOTER */}
      <div className="mobile-footer">
        <button className="footer-tab" onClick={() => navigate('/wallet')}>
          <span className="tab-icon">💰</span>
          <span className="tab-label">Wallet</span>
        </button>
        <button className="footer-tab active">
          <span className="tab-icon">💲</span>
          <span className="tab-label">Savings</span>
        </button>
        <button className="footer-tab" onClick={() => navigate('/settings')}>
          <span className="tab-icon">⚙️</span>
          <span className="tab-label">Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Savings;