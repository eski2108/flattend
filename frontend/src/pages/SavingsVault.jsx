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

// SVG Icons
const LockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const WalletIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4"/>
    <path d="M12 8h.01"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const SavingsVault = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [lockedBalance, setLockedBalance] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [positions, setPositions] = useState([]);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [selectedCoin, setSelectedCoin] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [noticePeriod, setNoticePeriod] = useState(30);
  const [availableCoins, setAvailableCoins] = useState([]);
  const [loadingCoins, setLoadingCoins] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const [showBalances, setShowBalances] = useState(false);

  useEffect(() => {
    loadSavingsData();
    loadAvailableCoins();
    
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    if (status === 'success') {
      toast.success('Payment successful! Your funds are now locked.');
      window.history.replaceState({}, document.title, '/savings');
      setTimeout(() => loadSavingsData(), 2000);
    } else if (status === 'cancelled') {
      toast.error('Payment was cancelled');
      window.history.replaceState({}, document.title, '/savings');
    }
  }, []);

  const loadAvailableCoins = async () => {
    try {
      setLoadingCoins(true);
      const response = await axios.get(`${API}/api/nowpayments/currencies`);
      if (response.data.success && response.data.currencies) {
        const coinList = response.data.currencies.map(symbol => ({
          symbol: symbol.toUpperCase(),
          name: symbol.charAt(0).toUpperCase() + symbol.slice(1)
        }));
        setAvailableCoins(coinList);
      }
    } catch (error) {
      console.error('Error loading coins:', error);
      setAvailableCoins([
        { symbol: 'BTC', name: 'Bitcoin' },
        { symbol: 'ETH', name: 'Ethereum' },
        { symbol: 'USDT', name: 'Tether' },
        { symbol: 'USDC', name: 'USD Coin' }
      ]);
    } finally {
      setLoadingCoins(false);
    }
  };

  const loadSavingsData = async () => {
    try {
      setLoading(true);
      const userId = getUserId();
      if (!userId) {
        setLoading(false);
        return;
      }
      const response = await axios.get(`${API}/api/savings/positions/${userId}`);
      if (response.data.success) {
        const data = response.data;
        setPositions(data.positions || []);
        setTotalBalance(data.total_balance_usd || 0);
        setLockedBalance(data.locked_balance_usd || 0);
        setAvailableBalance(data.available_balance_usd || 0);
      }
    } catch (error) {
      console.error('Error loading savings:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setShowModal(true);
    setModalStep(1);
    setSelectedCoin('');
    setDepositAmount('');
    setNoticePeriod(30);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalStep(1);
  };

  const nextStep = () => {
    if (modalStep < 5) setModalStep(modalStep + 1);
  };

  const prevStep = () => {
    if (modalStep > 1) setModalStep(modalStep - 1);
  };

  const handleConfirm = async () => {
    try {
      setDepositLoading(true);
      const userId = getUserId();
      if (!userId) {
        toast.error('Please log in first');
        setDepositLoading(false);
        return;
      }
      
      const response = await axios.post(`${API}/api/savings/initiate`, {
        user_id: userId,
        asset: selectedCoin,
        amount: parseFloat(depositAmount),
        lock_period_days: noticePeriod
      });
      
      if (response.data.success && response.data.payment_url) {
        toast.success('Redirecting to payment...');
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
  };

  const getUnlockDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + noticePeriod);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getEarlyWithdrawalFee = () => {
    if (noticePeriod === 30) return '1.5%';
    if (noticePeriod === 60) return '1.0%';
    return '0.5%';
  };

  return (
    <div className="savings-mobile-container">
      {/* HERO SECTION */}
      <div className="savings-hero">
        <h1 className="savings-title">Notice Savings Account</h1>
        <p className="savings-subtitle">Lock funds for 30 / 60 / 90 days. Withdraw only after notice period.</p>
      </div>

      {/* HOW IT WORKS - Simple 3 steps */}
      <div className="savings-explainer">
        <div className="explainer-step">
          <div className="step-icon"><ClockIcon /></div>
          <span className="step-text">Choose notice period (30 / 60 / 90 days)</span>
        </div>
        <div className="explainer-step">
          <div className="step-icon"><LockIcon /></div>
          <span className="step-text">Funds are locked</span>
        </div>
        <div className="explainer-step">
          <div className="step-icon"><WalletIcon /></div>
          <span className="step-text">Withdraw after notice period</span>
        </div>
      </div>

      {/* BALANCE CARDS - Collapsed by default */}
      <div className="balance-section">
        <button 
          className="balance-toggle"
          onClick={() => setShowBalances(!showBalances)}
        >
          <span>View Balances</span>
          <span className={`toggle-arrow ${showBalances ? 'open' : ''}`}>▼</span>
        </button>
        
        {showBalances && (
          <div className="balance-cards">
            <div className="balance-card">
              <div className="balance-label">
                Total Balance
                <span className="info-tip" title="Total value of all your notice account deposits">
                  <InfoIcon />
                </span>
              </div>
              <div className="balance-value">${totalBalance.toFixed(2)}</div>
            </div>
            
            <div className="balance-card">
              <div className="balance-label">
                Locked Balance
                <span className="info-tip" title="Funds currently in notice period">
                  <InfoIcon />
                </span>
              </div>
              <div className="balance-value">${lockedBalance.toFixed(2)}</div>
            </div>
            
            <div className="balance-card">
              <div className="balance-label">
                Available to Withdraw
                <span className="info-tip" title="Funds ready to withdraw - notice period ended">
                  <InfoIcon />
                </span>
              </div>
              <div className="balance-value">${availableBalance.toFixed(2)}</div>
            </div>
          </div>
        )}
      </div>

      {/* YOUR POSITIONS */}
      {positions.length > 0 && (
        <div className="positions-section">
          <h2 className="section-title">Your Notice Accounts</h2>
          {positions.map((pos, idx) => (
            <div key={idx} className="position-card">
              <div className="position-header">
                <img 
                  src={getCoinLogo(pos.symbol)} 
                  alt={pos.symbol}
                  className="position-icon"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="position-info">
                  <span className="position-symbol">{pos.symbol}</span>
                  <span className="position-amount">{pos.balance} {pos.symbol}</span>
                </div>
              </div>
              <div className="position-details">
                <div className="detail-row">
                  <span>Notice Period</span>
                  <span>{pos.lock_period || 30} days</span>
                </div>
                <div className="detail-row">
                  <span>Status</span>
                  <span className={`status-badge ${pos.status === 'locked' ? 'locked' : 'available'}`}>
                    {pos.status === 'locked' ? 'Locked' : 'Available'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Spacer for bottom button */}
      <div className="bottom-spacer"></div>

      {/* STICKY CTA BUTTON */}
      <div className="sticky-cta">
        <button className="cta-button" onClick={openModal}>
          Add to Savings
        </button>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <MobileBottomNav />

      {/* MODAL - Step Flow */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <h2>Add to Savings</h2>
              <button className="modal-close" onClick={closeModal}>
                <CloseIcon />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="step-indicator">
              {[1, 2, 3, 4, 5].map((step) => (
                <div 
                  key={step} 
                  className={`step-dot ${modalStep >= step ? 'active' : ''} ${modalStep === step ? 'current' : ''}`}
                />
              ))}
            </div>

            {/* Step Content */}
            <div className="modal-content">
              {/* STEP 1: Select Wallet */}
              {modalStep === 1 && (
                <div className="step-content">
                  <h3>Select Wallet</h3>
                  <div className="wallet-option selected">
                    <WalletIcon />
                    <div className="wallet-info">
                      <span className="wallet-name">Main Wallet</span>
                      <span className="wallet-desc">Your primary wallet</span>
                    </div>
                    <CheckIcon />
                  </div>
                  <button className="next-btn" onClick={nextStep}>Next</button>
                </div>
              )}

              {/* STEP 2: Enter Amount */}
              {modalStep === 2 && (
                <div className="step-content">
                  <h3>Select Coin</h3>
                  {loadingCoins ? (
                    <div className="loading-text">Loading coins...</div>
                  ) : (
                    <div className="coin-list">
                      {availableCoins.slice(0, 20).map((coin) => (
                        <div 
                          key={coin.symbol}
                          className={`coin-option ${selectedCoin === coin.symbol ? 'selected' : ''}`}
                          onClick={() => setSelectedCoin(coin.symbol)}
                        >
                          <img 
                            src={getCoinLogo(coin.symbol)} 
                            alt={coin.symbol}
                            className="coin-icon"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <span className="coin-symbol">{coin.symbol}</span>
                          {selectedCoin === coin.symbol && <CheckIcon />}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="step-buttons">
                    <button className="back-btn" onClick={prevStep}>Back</button>
                    <button className="next-btn" onClick={nextStep} disabled={!selectedCoin}>Next</button>
                  </div>
                </div>
              )}

              {/* STEP 3: Amount */}
              {modalStep === 3 && (
                <div className="step-content">
                  <h3>Enter Amount</h3>
                  <div className="amount-input-container">
                    <input
                      type="number"
                      className="amount-input"
                      placeholder="0.00"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                    <span className="amount-currency">{selectedCoin}</span>
                  </div>
                  <div className="step-buttons">
                    <button className="back-btn" onClick={prevStep}>Back</button>
                    <button className="next-btn" onClick={nextStep} disabled={!depositAmount || parseFloat(depositAmount) <= 0}>Next</button>
                  </div>
                </div>
              )}

              {/* STEP 4: Notice Period */}
              {modalStep === 4 && (
                <div className="step-content">
                  <h3>Select Notice Period</h3>
                  <div className="period-options">
                    {[30, 60, 90].map((days) => (
                      <button
                        key={days}
                        className={`period-btn ${noticePeriod === days ? 'selected' : ''}`}
                        onClick={() => setNoticePeriod(days)}
                      >
                        {days} Days
                      </button>
                    ))}
                  </div>
                  <div className="period-warning">
                    <InfoIcon />
                    <span>Funds cannot be withdrawn before notice period ends</span>
                  </div>
                  <div className="step-buttons">
                    <button className="back-btn" onClick={prevStep}>Back</button>
                    <button className="next-btn" onClick={nextStep}>Next</button>
                  </div>
                </div>
              )}

              {/* STEP 5: Review & Confirm */}
              {modalStep === 5 && (
                <div className="step-content">
                  <h3>Review</h3>
                  <div className="review-box">
                    <div className="review-row">
                      <span>Amount</span>
                      <span>{depositAmount} {selectedCoin}</span>
                    </div>
                    <div className="review-row">
                      <span>Notice Period</span>
                      <span>{noticePeriod} days</span>
                    </div>
                    <div className="review-row">
                      <span>Lock Date</span>
                      <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="review-row">
                      <span>Unlock Date</span>
                      <span>{getUnlockDate()}</span>
                    </div>
                    <div className="review-row warning">
                      <span>Early Withdrawal Fee</span>
                      <span>{getEarlyWithdrawalFee()}</span>
                    </div>
                  </div>
                  <div className="step-buttons">
                    <button className="back-btn" onClick={prevStep}>Back</button>
                    <button 
                      className="confirm-btn" 
                      onClick={handleConfirm}
                      disabled={depositLoading}
                    >
                      {depositLoading ? 'Processing...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingsVault;
