import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import getCoinLogo from '../utils/coinLogos';
import './SavingsVault.css';

const API = process.env.REACT_APP_BACKEND_URL;

// ============ REFINED 3D FINTECH SVG ICONS ============
// Abstract, digital, glass/neon style - NOT physical objects

// Digital Account Node (replaces physical wallet)
const AccountIcon = ({ active }) => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="accGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1e3a5f" />
        <stop offset="100%" stopColor="#0f2744" />
      </linearGradient>
      <linearGradient id="accRing" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={active ? "#22d3ee" : "#475569"} />
        <stop offset="100%" stopColor={active ? "#0891b2" : "#334155"} />
      </linearGradient>
    </defs>
    <circle cx="24" cy="24" r="18" fill="url(#accGrad)" />
    <circle cx="24" cy="24" r="18" stroke="url(#accRing)" strokeWidth="2" fill="none" opacity={active ? 1 : 0.6} />
    <circle cx="24" cy="24" r="10" fill="#0f172a" />
    <circle cx="24" cy="24" r="4" fill={active ? "#22d3ee" : "#475569"} />
    <path d="M24 14v-4M24 38v-4M14 24h-4M38 24h-4" stroke={active ? "#22d3ee" : "#475569"} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
  </svg>
);

// Digital Vault Icon (abstract, not physical safe)
const VaultIcon = ({ active }) => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="vltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1e3a5f" />
        <stop offset="100%" stopColor="#0f2744" />
      </linearGradient>
    </defs>
    <rect x="10" y="10" width="28" height="28" rx="4" fill="url(#vltGrad)" />
    <rect x="10" y="10" width="28" height="28" rx="4" stroke={active ? "#22d3ee" : "#334155"} strokeWidth="1.5" fill="none" />
    <circle cx="24" cy="24" r="8" fill="#0f172a" stroke={active ? "#22d3ee" : "#475569"} strokeWidth="1.5" />
    <circle cx="24" cy="24" r="3" fill={active ? "#22d3ee" : "#475569"} />
    <path d="M24 16v-2M24 34v-2M16 24h-2M34 24h-2" stroke={active ? "#22d3ee" : "#475569"} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
  </svg>
);

// System Gear Icon (refined)
const GearIcon = ({ active }) => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gearG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#374151" />
        <stop offset="100%" stopColor="#1f2937" />
      </linearGradient>
    </defs>
    <path d="M24 10l2.5 3h5l1.5 5-3 2.5v5l3 2.5-1.5 5h-5l-2.5 3-2.5-3h-5l-1.5-5 3-2.5v-5l-3-2.5 1.5-5h5l2.5-3z" 
          fill="url(#gearG)" stroke={active ? "#22d3ee" : "#475569"} strokeWidth="1.5" />
    <circle cx="24" cy="24" r="5" fill="#0f172a" />
    <circle cx="24" cy="24" r="2" fill={active ? "#22d3ee" : "#6b7280"} />
  </svg>
);

// Digital Lock Icon
const LockIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lkBody" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0891b2" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
    </defs>
    <path d="M16 20V16a8 8 0 1116 0v4" stroke="#475569" strokeWidth="3" strokeLinecap="round" fill="none" />
    <rect x="12" y="20" width="24" height="18" rx="3" fill="url(#lkBody)" />
    <circle cx="24" cy="29" r="2.5" fill="#0f172a" />
    <rect x="22.5" y="29" width="3" height="5" rx="1" fill="#0f172a" />
  </svg>
);

// Minimal Warning Icon
const WarnIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 8L40 38H8L24 8Z" fill="none" stroke="#f59e0b" strokeWidth="2" />
    <rect x="22" y="18" width="4" height="10" rx="2" fill="#f59e0b" />
    <circle cx="24" cy="32" r="2" fill="#f59e0b" />
  </svg>
);

// Clock Icon (minimal)
const ClockIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="16" fill="none" stroke="#475569" strokeWidth="2" />
    <path d="M24 14v10l6 4" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Balance Chip Icon
const BalanceIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="14" width="32" height="20" rx="3" fill="#1e3a5f" stroke="#334155" strokeWidth="1.5" />
    <rect x="12" y="18" width="8" height="6" rx="1" fill="#22d3ee" opacity="0.3" />
    <rect x="12" y="26" width="12" height="2" rx="1" fill="#475569" />
    <rect x="12" y="30" width="8" height="2" rx="1" fill="#475569" />
    <circle cx="34" cy="24" r="6" fill="#0f172a" stroke="#22d3ee" strokeWidth="1" />
  </svg>
);

// Calendar Icon (minimal)
const CalIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="14" width="32" height="26" rx="3" fill="none" stroke="#475569" strokeWidth="2" />
    <path d="M8 22h32" stroke="#475569" strokeWidth="2" />
    <rect x="14" y="8" width="4" height="10" rx="2" fill="#475569" />
    <rect x="30" y="8" width="4" height="10" rx="2" fill="#475569" />
    <circle cx="18" cy="30" r="2" fill="#22d3ee" />
  </svg>
);

// Tip Icon (minimal lightbulb)
const TipIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 8a12 12 0 00-6 22.4V36a2 2 0 002 2h8a2 2 0 002-2v-5.6A12 12 0 0024 8z" fill="none" stroke="#fbbf24" strokeWidth="2" />
    <path d="M20 40h8" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Step Node (glass-like, refined)
const StepNode = ({ number, active, completed }) => {
  const isLit = active || completed;
  return (
    <div className="step-node">
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="18" fill="#0f172a" />
        <circle 
          cx="24" cy="24" r="16" 
          fill="none" 
          stroke={isLit ? "#22d3ee" : "#334155"} 
          strokeWidth={active ? "2" : "1"}
          opacity={active ? 1 : isLit ? 0.8 : 0.4}
        />
        {active && <circle cx="24" cy="24" r="18" fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.3" />}
        <text 
          x="24" y="28" 
          textAnchor="middle" 
          fill={isLit ? "#22d3ee" : "#64748b"} 
          fontSize="14" 
          fontWeight="500"
        >
          {number}
        </text>
      </svg>
    </div>
  );
};

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

  const nextStep = () => { if (modalStep < 5) setModalStep(modalStep + 1); };
  const prevStep = () => { if (modalStep > 1) setModalStep(modalStep - 1); };

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
    <div className="savings-container">
      {/* HEADER */}
      <header className="savings-header">
        <h1>Notice Savings</h1>
        <p>Lock funds for 30, 60, or 90 days. Withdraw only after the notice period ends.</p>
      </header>

      {/* LOCK PERIOD CARDS */}
      <section className="lock-section">
        <div className="lock-cards">
          {[30, 60, 90].map((days) => (
            <button 
              key={days}
              className={`lock-card ${noticePeriod === days ? 'selected' : ''}`}
              onClick={() => { setNoticePeriod(days); openModal(); }}
            >
              <LockIcon size={24} />
              <div className="lock-info">
                <span className="lock-days">{days} Days</span>
                <span className="lock-fee">Fee: {days === 30 ? '1.5%' : days === 60 ? '1.0%' : '0.5%'}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* EARLY WITHDRAWAL NOTICE */}
      <div className="notice-box">
        <WarnIcon size={22} />
        <div className="notice-text">
          <span className="notice-title">Early Withdrawal</span>
          <span className="notice-desc">A fee applies if withdrawn before the lock period ends.</span>
        </div>
      </div>

      {/* BALANCES */}
      <section className="balance-section">
        <button className="balance-toggle" onClick={() => setShowBalances(!showBalances)}>
          <span>View Balances</span>
          <span className={`toggle-icon ${showBalances ? 'open' : ''}`}>&#9662;</span>
        </button>
        
        {showBalances && (
          <div className="balance-list">
            <div className="balance-item">
              <div className="balance-header"><BalanceIcon size={20} /><span>Total Balance</span></div>
              <span className="balance-amount">${totalBalance.toFixed(2)}</span>
            </div>
            <div className="balance-item">
              <div className="balance-header"><VaultIcon active={false} /><span>Locked</span></div>
              <span className="balance-amount">${lockedBalance.toFixed(2)}</span>
            </div>
            <div className="balance-item">
              <div className="balance-header"><ClockIcon size={20} /><span>Available</span></div>
              <span className="balance-amount">${availableBalance.toFixed(2)}</span>
              <span className="balance-note">After notice period</span>
            </div>
          </div>
        )}
      </section>

      {/* POSITIONS */}
      {positions.length > 0 && (
        <section className="positions-section">
          <h2>Your Locked Funds</h2>
          {positions.map((pos, idx) => (
            <div key={idx} className="position-item">
              <div className="position-row"><span>Asset</span><span className="position-val">{pos.balance} {pos.symbol}</span></div>
              <div className="position-row"><span>Period</span><span className="position-val">{pos.lock_period || 30} days</span></div>
              <div className="position-row"><span>Status</span><span className={`status ${pos.status}`}>{pos.status === 'locked' ? 'Locked' : 'Available'}</span></div>
            </div>
          ))}
        </section>
      )}

      <div className="spacer"></div>

      {/* STICKY CTA */}
      <div className="sticky-cta">
        <button className="primary-btn" onClick={openModal}>Add to Savings</button>
      </div>

      {/* BOTTOM NAV */}
      <nav className="bottom-nav">
        <button className="nav-item" onClick={() => navigate('/wallet')}>
          <AccountIcon active={false} />
          <span>Wallet</span>
        </button>
        <button className="nav-item active" onClick={() => navigate('/savings')}>
          <VaultIcon active={true} />
          <span>Savings</span>
          <div className="nav-indicator"></div>
        </button>
        <button className="nav-item" onClick={() => navigate('/settings')}>
          <GearIcon active={false} />
          <span>Settings</span>
        </button>
      </nav>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span>Add to Savings</span>
              <button className="close-btn" onClick={closeModal}>&#10005;</button>
            </div>

            {/* STEP INDICATOR */}
            <div className="steps-row">
              {[1, 2, 3, 4, 5].map((n) => (
                <React.Fragment key={n}>
                  <StepNode number={n} active={modalStep === n} completed={modalStep > n} />
                  {n < 5 && <div className={`step-line ${modalStep > n ? 'lit' : ''}`} />}
                </React.Fragment>
              ))}
            </div>

            <div className="modal-body">
              {/* STEP 1 */}
              {modalStep === 1 && (
                <div className="step">
                  <h3>Select Source</h3>
                  <div className="source-card selected">
                    <AccountIcon active={true} />
                    <div><span className="source-name">Main Account</span><span className="source-desc">Primary balance</span></div>
                  </div>
                  <div className="step-actions">
                    <button className="secondary-btn" onClick={() => navigate('/wallet')}>Go to Wallet</button>
                    <button className="primary-btn" onClick={nextStep}>Next</button>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {modalStep === 2 && (
                <div className="step">
                  <h3>Select Asset</h3>
                  {loadingCoins ? <p className="loading">Loading...</p> : (
                    <div className="coin-grid">
                      {availableCoins.slice(0, 16).map((c) => (
                        <button key={c.symbol} className={`coin-item ${selectedCoin === c.symbol ? 'selected' : ''}`} onClick={() => setSelectedCoin(c.symbol)}>
                          <img src={getCoinLogo(c.symbol)} alt={c.symbol} onError={(e) => e.target.style.display = 'none'} />
                          <span>{c.symbol}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="step-actions">
                    <button className="secondary-btn" onClick={prevStep}>Back</button>
                    <button className="primary-btn" onClick={nextStep} disabled={!selectedCoin}>Next</button>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {modalStep === 3 && (
                <div className="step">
                  <h3>Enter Amount</h3>
                  <div className="amount-field">
                    <input type="number" placeholder="0.00" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
                    <span className="currency-label">{selectedCoin}</span>
                  </div>
                  <div className="tip-row"><TipIcon size={16} /><span>Funds will be locked for the full notice period.</span></div>
                  <div className="step-actions">
                    <button className="secondary-btn" onClick={prevStep}>Back</button>
                    <button className="primary-btn" onClick={nextStep} disabled={!depositAmount || parseFloat(depositAmount) <= 0}>Next</button>
                  </div>
                </div>
              )}

              {/* STEP 4 */}
              {modalStep === 4 && (
                <div className="step">
                  <h3>Lock Period</h3>
                  <div className="period-list">
                    {[30, 60, 90].map((d) => (
                      <button key={d} className={`period-item ${noticePeriod === d ? 'selected' : ''}`} onClick={() => setNoticePeriod(d)}>
                        <LockIcon size={20} />
                        <span>{d} Days</span>
                      </button>
                    ))}
                  </div>
                  <div className="step-actions">
                    <button className="secondary-btn" onClick={prevStep}>Back</button>
                    <button className="primary-btn" onClick={nextStep}>Next</button>
                  </div>
                </div>
              )}

              {/* STEP 5 */}
              {modalStep === 5 && (
                <div className="step">
                  <h3>Review</h3>
                  <div className="review-card">
                    <div className="review-row"><span>Amount</span><span className="review-val">{depositAmount} {selectedCoin}</span></div>
                    <div className="review-row"><span>Lock Date</span><span className="review-val">{getLockDate()}</span></div>
                    <div className="review-row"><span><CalIcon size={16} /> Unlock Date</span><span className="review-val">{getUnlockDate()}</span></div>
                    <div className="review-row"><span>Early Withdrawal</span><span className="review-val fee">{getEarlyFee()} fee</span></div>
                  </div>
                  <div className="step-actions">
                    <button className="secondary-btn" onClick={prevStep}>Back</button>
                    <button className="confirm-btn" onClick={handleConfirm} disabled={depositLoading}>
                      {depositLoading ? 'Processing...' : 'Confirm Lock'}
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
