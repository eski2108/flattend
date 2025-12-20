import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import getCoinLogo from '../utils/coinLogos';
import './SavingsVault.css';

const API = process.env.REACT_APP_BACKEND_URL;

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
  const [totalBalance, setTotalBalance] = useState(0);
  const [lockedBalance, setLockedBalance] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [positions, setPositions] = useState([]);
  
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
      toast.success('Funds locked successfully');
      window.history.replaceState({}, document.title, '/savings');
      setTimeout(() => loadSavingsData(), 2000);
    } else if (status === 'cancelled') {
      toast.error('Payment cancelled');
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
      toast.error(error.response?.data?.detail || 'Failed');
      setDepositLoading(false);
    }
  };

  const getUnlockDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + noticePeriod);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getLockDate = () => {
    return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getEarlyFee = () => {
    if (noticePeriod === 30) return '1.5%';
    if (noticePeriod === 60) return '1.0%';
    return '0.5%';
  };

  return (
    <div className="notice-savings-container">
      {/* HEADER */}
      <div className="notice-header">
        <h1>Notice Savings</h1>
        <p>Lock funds for 30, 60, or 90 days. Withdraw after notice period.</p>
      </div>

      {/* LOCK PERIOD CARDS */}
      <div className="lock-cards">
        <button 
          className={`lock-card ${noticePeriod === 30 ? 'selected' : ''}`}
          onClick={() => { setNoticePeriod(30); openModal(); }}
        >
          <span className="lock-icon">🔒</span>
          <span className="lock-text">Lock for 30 Days</span>
        </button>
        
        <button 
          className={`lock-card ${noticePeriod === 60 ? 'selected' : ''}`}
          onClick={() => { setNoticePeriod(60); openModal(); }}
        >
          <span className="lock-icon">🔒</span>
          <span className="lock-text">Lock for 60 Days</span>
        </button>
        
        <button 
          className={`lock-card ${noticePeriod === 90 ? 'selected' : ''}`}
          onClick={() => { setNoticePeriod(90); openModal(); }}
        >
          <span className="lock-icon">🔒</span>
          <span className="lock-text">Lock for 90 Days</span>
        </button>
      </div>

      {/* EARLY WITHDRAWAL WARNING */}
      <div className="warning-card">
        <span className="warning-icon">⚠️</span>
        <div className="warning-text">
          <span className="warning-title">Early Withdrawal</span>
          <span className="warning-desc">Fee: {getEarlyFee()} of withdrawn amount</span>
        </div>
      </div>

      {/* BALANCE SECTION */}
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
              <span className="balance-label">Total Balance</span>
              <span className="balance-value">${totalBalance.toFixed(2)}</span>
            </div>
            
            <div className="balance-card">
              <span className="balance-label">Locked Balance</span>
              <span className="balance-value">${lockedBalance.toFixed(2)}</span>
            </div>
            
            <div className="balance-card">
              <span className="balance-label">Available to Withdraw</span>
              <span className="balance-value">${availableBalance.toFixed(2)}</span>
              <span className="balance-helper">🕒 Available after notice period ends</span>
            </div>
          </div>
        )}
      </div>

      {/* POSITIONS */}
      {positions.length > 0 && (
        <div className="positions-section">
          <h2>Your Locked Funds</h2>
          {positions.map((pos, idx) => (
            <div key={idx} className="position-card">
              <div className="position-row">
                <span className="position-label">Asset</span>
                <span className="position-value">{pos.balance} {pos.symbol}</span>
              </div>
              <div className="position-row">
                <span className="position-label">Notice Period</span>
                <span className="position-value">{pos.lock_period || 30} days</span>
              </div>
              <div className="position-row">
                <span className="position-label">Status</span>
                <span className={`status-tag ${pos.status}`}>
                  {pos.status === 'locked' ? '🔒 Locked' : 'Available'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SPACER */}
      <div className="bottom-spacer"></div>

      {/* STICKY CTA */}
      <div className="sticky-cta">
        <button className="cta-btn" onClick={openModal}>Add to Savings</button>
      </div>

      {/* BOTTOM NAV */}
      <nav className="bottom-nav">
        <button 
          className="nav-btn"
          onClick={() => navigate('/wallet')}
        >
          <span className="nav-icon">👛</span>
          <span className="nav-label">Wallet</span>
        </button>
        <button 
          className="nav-btn active"
          onClick={() => navigate('/savings')}
        >
          <span className="nav-icon">🔒</span>
          <span className="nav-label">Savings</span>
          <span className="nav-indicator"></span>
        </button>
        <button 
          className="nav-btn"
          onClick={() => navigate('/settings')}
        >
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">Settings</span>
        </button>
      </nav>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <span className="modal-title">Add to Savings</span>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            {/* Step Text */}
            <div className="step-text">Step {modalStep} of 5</div>

            {/* STEP 1: Select Wallet */}
            {modalStep === 1 && (
              <div className="modal-step">
                <h3>Select Wallet</h3>
                <div className="wallet-card selected">
                  <span className="wallet-icon">👛</span>
                  <div className="wallet-info">
                    <span className="wallet-name">Main Wallet</span>
                    <span className="wallet-desc">Your primary balance</span>
                  </div>
                </div>
                <div className="step-btns">
                  <button className="btn-secondary" onClick={() => navigate('/wallet')}>Go to Wallet</button>
                  <button className="btn-primary" onClick={nextStep}>Next</button>
                </div>
              </div>
            )}

            {/* STEP 2: Amount */}
            {modalStep === 2 && (
              <div className="modal-step">
                <h3>Select Coin</h3>
                {loadingCoins ? (
                  <p className="loading-text">Loading...</p>
                ) : (
                  <div className="coin-grid">
                    {availableCoins.slice(0, 16).map((coin) => (
                      <button
                        key={coin.symbol}
                        className={`coin-btn ${selectedCoin === coin.symbol ? 'selected' : ''}`}
                        onClick={() => setSelectedCoin(coin.symbol)}
                      >
                        <img 
                          src={getCoinLogo(coin.symbol)} 
                          alt={coin.symbol}
                          className="coin-img"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <span>{coin.symbol}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="step-btns">
                  <button className="btn-secondary" onClick={prevStep}>Back</button>
                  <button className="btn-primary" onClick={nextStep} disabled={!selectedCoin}>Next</button>
                </div>
              </div>
            )}

            {/* STEP 3: Amount */}
            {modalStep === 3 && (
              <div className="modal-step">
                <h3>Enter Amount</h3>
                <div className="amount-box">
                  <input
                    type="number"
                    className="amount-input"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                  <span className="amount-currency">{selectedCoin}</span>
                </div>
                <p className="helper-text">💡 Funds will be locked for the full notice period</p>
                <div className="step-btns">
                  <button className="btn-secondary" onClick={prevStep}>Back</button>
                  <button className="btn-primary" onClick={nextStep} disabled={!depositAmount || parseFloat(depositAmount) <= 0}>Next</button>
                </div>
              </div>
            )}

            {/* STEP 4: Notice Period */}
            {modalStep === 4 && (
              <div className="modal-step">
                <h3>Select Notice Period</h3>
                <div className="period-btns">
                  <button 
                    className={`period-btn ${noticePeriod === 30 ? 'selected' : ''}`}
                    onClick={() => setNoticePeriod(30)}
                  >
                    🔒 30 Days
                  </button>
                  <button 
                    className={`period-btn ${noticePeriod === 60 ? 'selected' : ''}`}
                    onClick={() => setNoticePeriod(60)}
                  >
                    🔒 60 Days
                  </button>
                  <button 
                    className={`period-btn ${noticePeriod === 90 ? 'selected' : ''}`}
                    onClick={() => setNoticePeriod(90)}
                  >
                    🔒 90 Days
                  </button>
                </div>
                <div className="step-btns">
                  <button className="btn-secondary" onClick={prevStep}>Back</button>
                  <button className="btn-primary" onClick={nextStep}>Next</button>
                </div>
              </div>
            )}

            {/* STEP 5: Review */}
            {modalStep === 5 && (
              <div className="modal-step">
                <h3>Review</h3>
                <div className="review-box">
                  <div className="review-row">
                    <span>Amount</span>
                    <span>{depositAmount} {selectedCoin}</span>
                  </div>
                  <div className="review-row">
                    <span>Lock Date</span>
                    <span>{getLockDate()}</span>
                  </div>
                  <div className="review-row">
                    <span>📅 Unlock Date</span>
                    <span>{getUnlockDate()}</span>
                  </div>
                  <div className="review-row">
                    <span>Early Withdrawal Fee</span>
                    <span>{getEarlyFee()}</span>
                  </div>
                </div>
                <div className="step-btns">
                  <button className="btn-secondary" onClick={prevStep}>Back</button>
                  <button 
                    className="btn-confirm" 
                    onClick={handleConfirm}
                    disabled={depositLoading}
                  >
                    {depositLoading ? 'Processing...' : '🔒 Confirm Lock'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingsVault;
