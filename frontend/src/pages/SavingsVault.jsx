import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import getCoinLogo from '../utils/coinLogos';
import './SavingsVault.css';

const API = process.env.REACT_APP_BACKEND_URL;

// ============ 3D FINTECH SVG ICONS ============

// 3D Digital Wallet Icon
const WalletIcon3D = ({ active }) => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="walletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1e3a5f" />
        <stop offset="50%" stopColor="#2d4a6f" />
        <stop offset="100%" stopColor="#1a2d4a" />
      </linearGradient>
      <linearGradient id="walletShine" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
      </linearGradient>
      <filter id="walletGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <rect x="6" y="12" width="36" height="26" rx="4" fill="url(#walletGrad)" filter={active ? "url(#walletGlow)" : ""} />
    <rect x="6" y="12" width="36" height="8" rx="4" fill="url(#walletShine)" />
    <rect x="30" y="22" width="12" height="10" rx="2" fill="#0f172a" />
    <circle cx="36" cy="27" r="3" fill={active ? "#22d3ee" : "#475569"} />
    <path d="M6 18h36" stroke="#0f172a" strokeWidth="1" opacity="0.3" />
    {active && <rect x="6" y="12" width="36" height="26" rx="4" stroke="#22d3ee" strokeWidth="1.5" fill="none" />}
  </svg>
);

// 3D Vault/Lock Icon
const VaultIcon3D = ({ active }) => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="vaultGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1e3a5f" />
        <stop offset="50%" stopColor="#2d4a6f" />
        <stop offset="100%" stopColor="#0f2744" />
      </linearGradient>
      <linearGradient id="vaultDoor" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#374151" />
        <stop offset="100%" stopColor="#1f2937" />
      </linearGradient>
      <filter id="vaultGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <rect x="8" y="10" width="32" height="30" rx="3" fill="url(#vaultGrad)" filter={active ? "url(#vaultGlow)" : ""} />
    <rect x="12" y="14" width="24" height="22" rx="2" fill="url(#vaultDoor)" />
    <circle cx="24" cy="25" r="6" fill="#0f172a" stroke={active ? "#22d3ee" : "#475569"} strokeWidth="2" />
    <circle cx="24" cy="25" r="2" fill={active ? "#22d3ee" : "#475569"} />
    <rect x="32" y="20" width="3" height="4" rx="1" fill="#6b7280" />
    <rect x="32" y="26" width="3" height="4" rx="1" fill="#6b7280" />
    {active && <rect x="8" y="10" width="32" height="30" rx="3" stroke="#22d3ee" strokeWidth="1.5" fill="none" />}
  </svg>
);

// 3D Settings/Gear Icon
const SettingsIcon3D = ({ active }) => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#374151" />
        <stop offset="50%" stopColor="#4b5563" />
        <stop offset="100%" stopColor="#1f2937" />
      </linearGradient>
      <filter id="gearGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <path d="M24 8l3 4h6l2 6-4 3v6l4 3-2 6h-6l-3 4-3-4h-6l-2-6 4-3v-6l-4-3 2-6h6l3-4z" fill="url(#gearGrad)" filter={active ? "url(#gearGlow)" : ""} />
    <circle cx="24" cy="24" r="6" fill="#0f172a" />
    <circle cx="24" cy="24" r="3" fill={active ? "#22d3ee" : "#6b7280"} />
    {active && <path d="M24 8l3 4h6l2 6-4 3v6l4 3-2 6h-6l-3 4-3-4h-6l-2-6 4-3v-6l-4-3 2-6h6l3-4z" stroke="#22d3ee" strokeWidth="1.5" fill="none" />}
  </svg>
);

// 3D Lock Icon (for lock cards)
const LockIcon3D = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lockBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0ea5e9" />
        <stop offset="50%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
      <linearGradient id="lockShackle" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#64748b" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>
    </defs>
    <path d="M16 20V16C16 11.6 19.6 8 24 8C28.4 8 32 11.6 32 16V20" stroke="url(#lockShackle)" strokeWidth="4" strokeLinecap="round" fill="none" />
    <rect x="12" y="20" width="24" height="20" rx="3" fill="url(#lockBodyGrad)" />
    <circle cx="24" cy="30" r="3" fill="#0f172a" />
    <rect x="22" y="30" width="4" height="6" rx="1" fill="#0f172a" />
  </svg>
);

// 3D Warning Icon
const WarningIcon3D = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="warnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>
    <path d="M24 6L42 40H6L24 6Z" fill="url(#warnGrad)" />
    <path d="M24 6L42 40H6L24 6Z" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.5" />
    <rect x="22" y="18" width="4" height="12" rx="2" fill="#0f172a" />
    <circle cx="24" cy="34" r="2" fill="#0f172a" />
  </svg>
);

// 3D Clock Icon
const ClockIcon3D = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="clockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1e3a5f" />
        <stop offset="100%" stopColor="#0f2744" />
      </linearGradient>
    </defs>
    <circle cx="24" cy="24" r="18" fill="url(#clockGrad)" stroke="#3b82f6" strokeWidth="2" />
    <circle cx="24" cy="24" r="14" fill="#0f172a" />
    <path d="M24 14V24L30 28" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
    <circle cx="24" cy="24" r="2" fill="#22d3ee" />
  </svg>
);

// 3D Balance/Coins Icon
const BalanceIcon3D = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="coinGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#0891b2" />
      </linearGradient>
      <linearGradient id="coinGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
    <ellipse cx="20" cy="32" rx="12" ry="6" fill="url(#coinGrad2)" />
    <ellipse cx="20" cy="28" rx="12" ry="6" fill="url(#coinGrad1)" />
    <ellipse cx="28" cy="24" rx="12" ry="6" fill="url(#coinGrad2)" />
    <ellipse cx="28" cy="20" rx="12" ry="6" fill="url(#coinGrad1)" />
    <ellipse cx="24" cy="16" rx="12" ry="6" fill="url(#coinGrad2)" />
    <ellipse cx="24" cy="12" rx="12" ry="6" fill="url(#coinGrad1)" />
  </svg>
);

// 3D Calendar Icon
const CalendarIcon3D = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1e3a5f" />
        <stop offset="100%" stopColor="#0f2744" />
      </linearGradient>
    </defs>
    <rect x="8" y="12" width="32" height="28" rx="4" fill="url(#calGrad)" />
    <rect x="8" y="12" width="32" height="10" rx="4" fill="#3b82f6" />
    <rect x="14" y="8" width="4" height="8" rx="2" fill="#64748b" />
    <rect x="30" y="8" width="4" height="8" rx="2" fill="#64748b" />
    <circle cx="18" cy="30" r="3" fill="#22d3ee" />
    <circle cx="30" cy="30" r="3" fill="#475569" />
    <circle cx="18" cy="36" r="2" fill="#475569" />
    <circle cx="30" cy="36" r="2" fill="#475569" />
  </svg>
);

// 3D Lightbulb/Tip Icon
const TipIcon3D = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bulbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
    <path d="M24 6C16.268 6 10 12.268 10 20C10 25.5 13.5 30 18 32V38C18 39.1 18.9 40 20 40H28C29.1 40 30 39.1 30 38V32C34.5 30 38 25.5 38 20C38 12.268 31.732 6 24 6Z" fill="url(#bulbGrad)" />
    <rect x="18" y="40" width="12" height="4" rx="2" fill="#64748b" />
    <path d="M20 32H28" stroke="#0f172a" strokeWidth="2" />
    <path d="M24 12V18M18 20H30" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
  </svg>
);

// 3D Step Node
const StepNode = ({ number, active, completed }) => (
  <div className={`step-node ${active ? 'active' : ''} ${completed ? 'completed' : ''}`}>
    <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`stepGrad${number}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={active || completed ? "#22d3ee" : "#374151"} />
          <stop offset="100%" stopColor={active || completed ? "#0891b2" : "#1f2937"} />
        </linearGradient>
        <filter id="stepGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <circle cx="24" cy="24" r="20" fill="#0f172a" />
      <circle cx="24" cy="24" r="16" fill={`url(#stepGrad${number})`} filter={active ? "url(#stepGlow)" : ""} />
      <text x="24" y="29" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="600">{number}</text>
    </svg>
  </div>
);

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
          <LockIcon3D size={28} />
          <span className="lock-text">Lock for 30 Days</span>
        </button>
        
        <button 
          className={`lock-card ${noticePeriod === 60 ? 'selected' : ''}`}
          onClick={() => { setNoticePeriod(60); openModal(); }}
        >
          <LockIcon3D size={28} />
          <span className="lock-text">Lock for 60 Days</span>
        </button>
        
        <button 
          className={`lock-card ${noticePeriod === 90 ? 'selected' : ''}`}
          onClick={() => { setNoticePeriod(90); openModal(); }}
        >
          <LockIcon3D size={28} />
          <span className="lock-text">Lock for 90 Days</span>
        </button>
      </div>

      {/* EARLY WITHDRAWAL WARNING */}
      <div className="warning-card">
        <WarningIcon3D size={28} />
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
              <div className="balance-card-header">
                <BalanceIcon3D size={24} />
                <span className="balance-label">Total Balance</span>
              </div>
              <span className="balance-value">${totalBalance.toFixed(2)}</span>
            </div>
            
            <div className="balance-card">
              <div className="balance-card-header">
                <VaultIcon3D active={false} />
                <span className="balance-label">Locked Balance</span>
              </div>
              <span className="balance-value">${lockedBalance.toFixed(2)}</span>
            </div>
            
            <div className="balance-card">
              <div className="balance-card-header">
                <ClockIcon3D size={24} />
                <span className="balance-label">Available to Withdraw</span>
              </div>
              <span className="balance-value">${availableBalance.toFixed(2)}</span>
              <span className="balance-helper">Available after notice period ends</span>
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
                  {pos.status === 'locked' ? 'Locked' : 'Available'}
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

      {/* BOTTOM NAV - 3D Icons */}
      <nav className="bottom-nav">
        <button className="nav-btn" onClick={() => navigate('/wallet')}>
          <WalletIcon3D active={false} />
          <span className="nav-label">Wallet</span>
        </button>
        <button className="nav-btn active" onClick={() => navigate('/savings')}>
          <VaultIcon3D active={true} />
          <span className="nav-label">Savings</span>
          <span className="nav-indicator"></span>
        </button>
        <button className="nav-btn" onClick={() => navigate('/settings')}>
          <SettingsIcon3D active={false} />
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

            {/* 3D Step Indicator */}
            <div className="step-indicator-3d">
              {[1, 2, 3, 4, 5].map((step) => (
                <React.Fragment key={step}>
                  <StepNode 
                    number={step} 
                    active={modalStep === step} 
                    completed={modalStep > step} 
                  />
                  {step < 5 && <div className={`step-line ${modalStep > step ? 'active' : ''}`} />}
                </React.Fragment>
              ))}
            </div>

            {/* STEP 1: Select Wallet */}
            {modalStep === 1 && (
              <div className="modal-step">
                <h3>Select Wallet</h3>
                <div className="wallet-card selected">
                  <WalletIcon3D active={true} />
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

            {/* STEP 2: Select Coin */}
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
                <div className="helper-row">
                  <TipIcon3D size={18} />
                  <span className="helper-text">Funds will be locked for the full notice period</span>
                </div>
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
                    <LockIcon3D size={22} />
                    <span>30 Days</span>
                  </button>
                  <button 
                    className={`period-btn ${noticePeriod === 60 ? 'selected' : ''}`}
                    onClick={() => setNoticePeriod(60)}
                  >
                    <LockIcon3D size={22} />
                    <span>60 Days</span>
                  </button>
                  <button 
                    className={`period-btn ${noticePeriod === 90 ? 'selected' : ''}`}
                    onClick={() => setNoticePeriod(90)}
                  >
                    <LockIcon3D size={22} />
                    <span>90 Days</span>
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
                    <div className="review-label-icon">
                      <CalendarIcon3D size={18} />
                      <span>Unlock Date</span>
                    </div>
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
                    <LockIcon3D size={18} />
                    <span>{depositLoading ? 'Processing...' : 'Confirm Lock'}</span>
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
