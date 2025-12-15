import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Savings.css';
import { 
  IoEye, 
  IoEyeOff, 
  IoChevronDown, 
  IoChevronUp,
  IoWallet,
  IoAdd,
  IoRemove,
  IoArrowForward,
  IoTrendingUp,
  IoTime,
  IoFilter,
  IoSwapHorizontal
} from 'react-icons/io5';
import { getCoinLogo } from '../utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

export default function Savings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [expandedAsset, setExpandedAsset] = useState(null);
  const [chartRange, setChartRange] = useState('30d');
  const [sortBy, setSortBy] = useState('name');
  const [filters, setFilters] = useState({ active: false, flexible: false, staked: false });
  
  // Real backend data
  const [totalSavings, setTotalSavings] = useState(0);
  const [availableToTransfer, setAvailableToTransfer] = useState(0);
  const [totalInterestEarned, setTotalInterestEarned] = useState(0);
  const [savingsAssets, setSavingsAssets] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadSavingsData(parsedUser.user_id);
  }, [navigate]);

  const loadSavingsData = async (userId) => {
    setLoading(true);
    try {
      const [summaryRes, positionsRes] = await Promise.all([
        axios.get(`${API}/api/savings/summary/${userId}`).catch(() => ({ data: { success: false } })),
        axios.get(`${API}/api/savings/positions/${userId}`).catch(() => ({ data: { success: false, positions: [] } }))
      ]);

      if (summaryRes.data.success && summaryRes.data.summary) {
        const summary = summaryRes.data.summary;
        setTotalSavings(summary.total_value_gbp || 0);
        setAvailableToTransfer(summary.available_balance_gbp || 0);
        setTotalInterestEarned(summary.total_earnings || 0);
      }

      if (positionsRes.data.success && positionsRes.data.positions) {
        setSavingsAssets(positionsRes.data.positions);
      }
    } catch (error) {
      console.error('Error loading savings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="savings-container">
        <div className="loading-text">Loading Savings Vault...</div>
      </div>
    );
  }

  const hasSavings = savingsAssets.length > 0;

  return (
    <div className="savings-container">
      <div className="savings-content">
        
        {/* HEADER */}
        <div className="savings-header">
          <h1 className="savings-title neon-glow-blue">Savings Vault</h1>
          <div className="header-actions">
            <button className="wallet-selector">
              <IoWallet size={18} />
              <span>Main Wallet</span>
              <IoChevronDown size={16} />
            </button>
            <button 
              className="transfer-button neon-glow-button"
              onClick={() => navigate('/savings/deposit')}
            >
              Transfer from Wallet
            </button>
          </div>
        </div>

        {/* TOP SUMMARY CARDS - Glassmorphic */}
        <div className="summary-grid">
          {/* Total Balance */}
          <div className="summary-card glass-card">
            <div className="summary-label">
              <span>Total Balance</span>
              <span className="live-indicator">
                <span className="live-dot pulse-animation" />
                Live
              </span>
            </div>
            <div className="summary-value">
              {balanceVisible ? `£${totalSavings.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
            </div>
            <div className="summary-crypto">≈ 0.000 BTC</div>
            <button onClick={() => setBalanceVisible(!balanceVisible)} className="eye-button">
              {balanceVisible ? <IoEye size={16} /> : <IoEyeOff size={16} />}
            </button>
          </div>

          {/* Available to Transfer */}
          <div className="summary-card glass-card">
            <div className="summary-label">
              <span>Available to Transfer</span>
              <span className="live-indicator">
                <span className="live-dot pulse-animation" />
                Live
              </span>
            </div>
            <div className="summary-value">
              {balanceVisible ? `£${availableToTransfer.toFixed(2)}` : '••••••'}
            </div>
            <div className="summary-crypto">≈ 0.000 BTC</div>
          </div>

          {/* Interest Earned */}
          <div className="summary-card glass-card green-accent">
            <div className="summary-label">
              <span>Interest Earned to Date</span>
              <span className="live-indicator">
                <span className="live-dot pulse-animation" />
                Live
              </span>
            </div>
            <div className="summary-value green-text">
              {balanceVisible ? `£${totalInterestEarned.toFixed(2)}` : '••••••'}
            </div>
            <div className="summary-crypto green-text">≈ 0.000 BTC</div>
          </div>
        </div>

        {/* REFERRAL BANNER */}
        <div className="referral-banner glass-card purple-glow" onClick={() => {}}>
          <span>Invite friends, earn more</span>
          <IoArrowForward size={20} />
        </div>

        {/* YOUR SAVINGS SECTION */}
        {!hasSavings ? (
          <div className="empty-state glass-card">
            <div className="empty-icon">
              <IoTrendingUp size={64} />
            </div>
            <h3 className="empty-title">No assets earning yet</h3>
            <p className="empty-text">Transfer crypto from your wallet to start earning yield</p>
            <button 
              className="empty-button neon-glow-button"
              onClick={() => navigate('/savings/deposit')}
            >
              Start Earning
            </button>
          </div>
        ) : (
          <div className="portfolio-section">
            {/* Sort & Filter Controls */}
            <div className="controls-bar">
              <div className="sort-control">
                <IoSwapHorizontal size={16} />
                <span>Sort: Token Name</span>
                <IoChevronDown size={14} />
              </div>
              <div className="filter-control">
                <IoFilter size={16} />
                <span>Filters</span>
              </div>
            </div>

            <h2 className="section-title">Your Savings</h2>
            
            {savingsAssets.map((asset, idx) => {
              const currency = asset.currency || asset.asset || 'BTC';
              const amount = parseFloat(asset.amount || asset.balance || 0);
              const gbpValue = parseFloat(asset.value_gbp || asset.balance_gbp || 0);
              const apy = parseFloat(asset.apy || 5.0);
              const interestEarned = parseFloat(asset.interest_earned || asset.earnings || 0);
              const monthlyEst = (amount * (apy / 100)) / 12;
              const isExpanded = expandedAsset === idx;

              return (
                <div key={idx} className={`asset-card glass-card ${isExpanded ? 'expanded' : ''}`}>
                  {/* Collapsed View */}
                  <div 
                    className="asset-header"
                    onClick={() => setExpandedAsset(isExpanded ? null : idx)}
                  >
                    <div className="asset-info">
                      <img
                        src={getCoinLogo(currency)}
                        alt={currency}
                        className="asset-icon"
                        onError={(e) => {
                          e.target.src = `https://lcw.nyc3.cdn.digitaloceanspaces.com/production/currencies/64/${currency.toLowerCase()}.png`;
                        }}
                      />
                      <div>
                        <div className="asset-name">{currency}</div>
                        <div className="asset-balance">{amount.toFixed(8)}</div>
                      </div>
                    </div>

                    <div className="asset-middle">
                      <div className="asset-stat">
                        <span className="stat-label">APY:</span>
                        <span className="stat-value green-text">{apy.toFixed(1)}%</span>
                      </div>
                      <div className="asset-stat">
                        <span className="stat-label">Interest:</span>
                        <span className="stat-value green-text">£{interestEarned.toFixed(2)}</span>
                      </div>
                      <div className="asset-stat">
                        <span className="stat-label">Est. Monthly:</span>
                        <span className="stat-value">{monthlyEst.toFixed(8)} {currency}</span>
                      </div>
                    </div>

                    <div className="asset-right">
                      <div className="asset-fiat">£{gbpValue.toFixed(2)}</div>
                      <div className="toggles-row">
                        <div className="toggle-pill">
                          <button className="pill-option active">Flexible</button>
                          <button className="pill-option">Staked</button>
                        </div>
                        <div className="auto-compound-toggle">
                          <label className="toggle-switch">
                            <input type="checkbox" />
                            <span className="toggle-slider"></span>
                          </label>
                          <span className="toggle-label">Auto-Compound</span>
                        </div>
                      </div>
                      {isExpanded ? <IoChevronUp size={20} /> : <IoChevronDown size={20} />}
                    </div>
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="asset-expanded">
                      {/* Chart Range Toggle */}
                      <div className="chart-controls">
                        <button
                          className={chartRange === '30d' ? 'chart-btn active' : 'chart-btn'}
                          onClick={() => setChartRange('30d')}
                        >
                          30D
                        </button>
                        <button
                          className={chartRange === '90d' ? 'chart-btn active' : 'chart-btn'}
                          onClick={() => setChartRange('90d')}
                        >
                          90D
                        </button>
                      </div>

                      {/* Chart Placeholder */}
                      <div className="chart-area glass-inner">
                        <div className="chart-placeholder">
                          <IoTrendingUp size={32} className="green-text" style={{opacity: 0.3}} />
                          <span className="chart-label">Interest Earned ({currency})</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="action-buttons">
                        <button className="action-btn outline">
                          <IoRemove size={18} />
                          Withdraw
                        </button>
                        <button className="action-btn filled neon-glow-button">
                          <IoAdd size={18} />
                          Add
                        </button>
                      </div>

                      {/* Lock Period Selectors */}
                      <div className="lock-periods">
                        <span className="lock-label">Lock Period:</span>
                        <button className="lock-btn">7d</button>
                        <button className="lock-btn active">30d</button>
                        <button className="lock-btn">90d</button>
                      </div>

                      {/* Interest History Link */}
                      <button className="history-link">
                        <IoTime size={16} />
                        <span>Interest History</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-nav">
        <div className="nav-tab">
          <IoWallet size={24} />
          <span>Wallet</span>
        </div>
        <div className="nav-tab active">
          <IoTrendingUp size={24} />
          <span>Savings</span>
        </div>
        <div className="nav-tab">
          <IoChevronDown size={24} />
          <span>Settings</span>
        </div>
      </div>
    </div>
  );
}
