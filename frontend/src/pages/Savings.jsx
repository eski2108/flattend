import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  IoLockClosed, 
  IoWallet, 
  IoArrowForward,
  IoArrowDown,
  IoArrowUp,
  IoTime,
  IoTrendingUp,
  IoClose,
  IoCheckmarkCircle,
  IoWarning,
  IoSearch
} from 'react-icons/io5';
import { getCoinLogo } from '../utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SavingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Data
  const [positions, setPositions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [walletBalances, setWalletBalances] = useState([]);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [selectedVaultTerm, setSelectedVaultTerm] = useState(30);
  
  // Debug modal state
  useEffect(() => {
    console.log('Modal state changed:', showDepositModal, 'Selected coin:', selectedCoin);
  }, [showDepositModal, selectedCoin]);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadAllData(parsedUser.user_id);
  }, [navigate]);

  const loadAllData = async (userId) => {
    setLoading(true);
    try {
      console.log('Loading savings data for user:', userId);
      
      const [positionsRes, summaryRes, walletsRes, currenciesRes] = await Promise.all([
        axios.get(`${API}/api/savings/positions/${userId}`).catch(err => {
          console.error('Positions API error:', err);
          return { data: { success: false, positions: [] } };
        }),
        axios.get(`${API}/api/savings/summary/${userId}`).catch(err => {
          console.error('Summary API error:', err);
          return { data: { success: false } };
        }),
        axios.get(`${API}/api/crypto/${userId}`).catch(err => {
          console.error('Wallets API error:', err);
          return { data: { balances: [] } };
        }),
        axios.get(`${API}/api/nowpayments/currencies`).catch(err => {
          console.error('Currencies API error:', err);
          return { data: { currencies: [] } };
        })
      ]);
      
      console.log('Currencies loaded:', currenciesRes.data.currencies?.length || 0);
      
      if (positionsRes.data.success) setPositions(positionsRes.data.positions);
      if (summaryRes.data.success) setSummary(summaryRes.data.summary);
      if (walletsRes.data.balances) setWalletBalances(walletsRes.data.balances);
      
      // Set all supported currencies
      if (currenciesRes.data.currencies && currenciesRes.data.currencies.length > 0) {
        const coins = currenciesRes.data.currencies.map(c => ({
          currency: c.toUpperCase(),
          balance: 0
        }));
        setWalletBalances(coins);
        console.log('Set', coins.length, 'currencies');
      }
    } catch (error) {
      console.error('Error loading savings:', error);
      toast.error('Failed to load savings data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (currency, amount) => {
    try {
      const res = await axios.post(`${API}/api/savings/transfer`, {
        user_id: user.user_id,
        currency,
        amount: parseFloat(amount),
        direction: 'to_savings'
      });
      
      if (res.data.success) {
        toast.success(`Deposited ${amount} ${currency} to Flexible Savings`);
        setShowDepositModal(false);
        loadAllData(user.user_id);
      } else {
        toast.error(res.data.error || 'Deposit failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Deposit failed');
    }
  };

  const handleLockVault = async (currency, amount, lockDays) => {
    try {
      const res = await axios.post(`${API}/api/vaults/create`, {
        user_id: user.user_id,
        currency,
        amount: parseFloat(amount),
        lock_days: parseInt(lockDays)
      });
      
      if (res.data.success) {
        toast.success(`Locked ${amount} ${currency} for ${lockDays} days`);
        setShowVaultModal(false);
        loadAllData(user.user_id);
      } else {
        toast.error(res.data.error || 'Vault creation failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create vault');
    }
  };

  const handleWithdraw = async (positionId, currency, amount) => {
    try {
      const res = await axios.post(`${API}/api/savings/withdraw`, {
        user_id: user.user_id,
        currency,
        amount: parseFloat(amount)
      });
      
      if (res.data.success) {
        toast.success(`Withdrawn ${amount} ${currency}`);
        loadAllData(user.user_id);
      } else {
        toast.error(res.data.error || 'Withdrawal failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Withdrawal failed');
    }
  };

  const handleRedeemVault = async (vaultId) => {
    try {
      const res = await axios.post(`${API}/api/vaults/redeem`, {
        user_id: user.user_id,
        vault_id: vaultId
      });
      
      if (res.data.success) {
        toast.success(`Vault redeemed! Earned: ${res.data.earnings.toFixed(8)} ${res.data.currency}`);
        loadAllData(user.user_id);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Redemption failed');
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('Wallet balances loaded:', walletBalances.length);
  }, [walletBalances]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading Savings...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Savings</h1>
          <p style={styles.subtitle}>Deposit crypto to start earning</p>
        </div>
        <button style={styles.historyBtn} onClick={() => navigate('/savings/history')}>
          <IoTime size={20} />
          History
        </button>
      </div>

      {/* SUMMARY CARD */}
      <div style={styles.summaryCard}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryTile}>
            <p style={styles.summaryLabel}>Total Balance</p>
            <h2 style={styles.summaryValue}>£{summary?.total_value_gbp?.toFixed(2) || '0.00'}</h2>
          </div>
          <div style={styles.summaryTile}>
            <p style={styles.summaryLabel}>Today's Earnings</p>
            <h2 style={{...styles.summaryValue, color: '#22C55E'}}>+£{summary?.today_earnings_gbp?.toFixed(2) || '0.00'}</h2>
          </div>
          <div style={styles.summaryTile}>
            <p style={styles.summaryLabel}>30D Earnings</p>
            <h2 style={{...styles.summaryValue, color: '#22C55E'}}>+£{summary?.earnings_30d_gbp?.toFixed(2) || '0.00'}</h2>
          </div>
          <div style={styles.summaryTile}>
            <p style={styles.summaryLabel}>Avg APY</p>
            <h2 style={{...styles.summaryValue, color: '#00D2FF'}}>{summary?.average_apy?.toFixed(2) || '0.00'}%</h2>
          </div>
        </div>
      </div>

      {/* MY POSITIONS */}
      {positions.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>My Positions</h2>
          <div style={styles.positionsGrid}>
            {positions.map(pos => (
              <div key={pos.position_id} style={styles.positionCard}>
                <div style={styles.positionHeader}>
                  <div style={styles.coinInfo}>
                    <img src={getCoinLogo(pos.currency)} alt={pos.currency} style={styles.coinIcon} />
                    <div>
                      <h3 style={styles.positionCoin}>{pos.currency}</h3>
                      <p style={styles.positionType}>{pos.product_name}</p>
                    </div>
                  </div>
                  <span style={{
                    ...styles.statusBadge,
                    background: pos.status === 'matured' ? '#22C55E' : pos.status === 'locked' ? '#F59E0B' : '#00D2FF'
                  }}>
                    {pos.status}
                  </span>
                </div>
                <div style={styles.positionBody}>
                  <div style={styles.positionRow}>
                    <span style={styles.positionLabel}>Deposited</span>
                    <span style={styles.positionValue}>{pos.principal.toFixed(8)}</span>
                  </div>
                  <div style={styles.positionRow}>
                    <span style={styles.positionLabel}>Earned</span>
                    <span style={{...styles.positionValue, color: '#22C55E'}}>+{pos.accrued_earnings.toFixed(8)}</span>
                  </div>
                  <div style={styles.positionRow}>
                    <span style={styles.positionLabel}>APY</span>
                    <span style={{...styles.positionValue, color: '#00D2FF'}}>{pos.apy}%</span>
                  </div>
                  {pos.product_type === 'vault' && pos.maturity_date && (
                    <div style={styles.positionRow}>
                      <span style={styles.positionLabel}>Unlocks</span>
                      <span style={styles.positionValue}>{new Date(pos.maturity_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <div style={styles.positionActions}>
                  {pos.can_withdraw ? (
                    <button style={styles.actionBtn} onClick={() => pos.product_type === 'vault' ? handleRedeemVault(pos.position_id) : handleWithdraw(pos.position_id, pos.currency, pos.principal)}>
                      <IoCheckmarkCircle size={18} />
                      Redeem
                    </button>
                  ) : (
                    <button style={{...styles.actionBtn, opacity: 0.5}} disabled>
                      <IoLockClosed size={18} />
                      Locked
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LOCKED VAULTS - TEMPORARILY HIDDEN UNTIL REAL APY SOURCE */}
      {false && (
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <IoLockClosed size={24} style={{marginRight: '8px'}} />
          Locked Vaults
        </h2>
        <p style={styles.sectionDesc}>Coming soon - Lock funds for higher returns</p>
      </div>
      )}

      {/* FLEXIBLE SAVINGS */}
      <div style={styles.section}>
        <div style={styles.flexibleHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Flexible Savings</h2>
            <p style={styles.sectionDesc}>Deposit any supported coin to start earning - {walletBalances.length} coins available</p>
          </div>
          <div style={styles.searchBox}>
            <IoSearch size={20} style={{color: 'rgba(234,240,255,0.5)'}} />
            <input 
              type="text" 
              placeholder="Search coin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px'}}>
          {walletBalances
            .filter(coin => coin.currency.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((coin, index) => {
              return (
                <button
                  key={index}
                  type="button"
                  style={{
                    background: 'rgba(16, 22, 38, 0.72)',
                    border: '1px solid rgba(120, 170, 255, 0.14)',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    height: '72px',
                    WebkitTapHighlightColor: 'transparent',
                    width: '100%',
                    textAlign: 'left'
                  }}
                  onClick={() => {
                    console.log('CLICKED:', coin.currency);
                    setSelectedCoin(coin.currency);
                    setShowDepositModal(true);
                  }}
                >
                  <img src={getCoinLogo(coin.currency)} alt="" style={{width: '36px', height: '36px', borderRadius: '50%'}} />
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '15px', fontWeight: 700, color: '#EAF0FF'}}>{coin.currency}</div>
                    <div style={{fontSize: '13px', color: 'rgba(234, 240, 255, 0.72)'}}>Tap to deposit</div>
                  </div>
                  <IoArrowForward size={20} style={{color: 'rgba(234,240,255,0.5)'}} />
                </button>
              );
            })}
        </div>
      </div>

      {/* MODALS */}
      {showDepositModal && (
        <DepositModal 
          onClose={() => setShowDepositModal(false)}
          onDeposit={handleDeposit}
          walletBalances={walletBalances}
          preselectedCoin={selectedCoin}
        />
      )}
      {showVaultModal && (
        <VaultModal 
          onClose={() => setShowVaultModal(false)}
          onLock={handleLockVault}
          walletBalances={walletBalances}
          lockDays={selectedVaultTerm}
        />
      )}
    </div>
  );
}

// DEPOSIT MODAL
function DepositModal({ onClose, onDeposit, walletBalances, preselectedCoin }) {
  const [currency, setCurrency] = useState(preselectedCoin || 'BTC');
  const [amount, setAmount] = useState('');
  
  const selectedBalance = walletBalances.find(b => b.currency === currency);
  const availableBalance = selectedBalance?.balance || 0;
  
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Deposit to Flexible Savings</h2>
          <button style={styles.modalClose} onClick={onClose}>
            <IoClose size={24} />
          </button>
        </div>
        <div style={styles.modalBody}>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Asset</label>
            <select style={styles.select} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {walletBalances.map(b => (
                <option key={b.currency} value={b.currency}>{b.currency}</option>
              ))}
            </select>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Amount</label>
            <input 
              type="number"
              style={styles.input}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <p style={styles.balanceText}>Available: {availableBalance.toFixed(8)} {currency}</p>
          </div>
        </div>
        <div style={styles.modalFooter}>
          <button style={styles.modalBtnSecondary} onClick={onClose}>Cancel</button>
          <button 
            style={styles.modalBtnPrimary} 
            onClick={() => onDeposit(currency, amount)}
            disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > availableBalance}
          >
            Deposit
          </button>
        </div>
      </div>
    </div>
  );
}

// VAULT MODAL
function VaultModal({ onClose, onLock, walletBalances, lockDays }) {
  const [currency, setCurrency] = useState('BTC');
  const [amount, setAmount] = useState('');
  
  const selectedBalance = walletBalances.find(b => b.currency === currency);
  const availableBalance = selectedBalance?.balance || 0;
  
  const apyMap = { 30: 10, 60: 15, 90: 20 };
  const penaltyMap = { 30: 50, 60: 60, 90: 70 };
  
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Lock Vault - {lockDays} Days</h2>
          <button style={styles.modalClose} onClick={onClose}>
            <IoClose size={24} />
          </button>
        </div>
        <div style={styles.modalBody}>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Asset</label>
            <select style={styles.select} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {walletBalances.map(b => (
                <option key={b.currency} value={b.currency}>{b.currency}</option>
              ))}
            </select>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Amount</label>
            <input 
              type="number"
              style={styles.input}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <p style={styles.balanceText}>Available: {availableBalance.toFixed(8)} {currency}</p>
          </div>
          <div style={styles.vaultInfo}>
            <div style={styles.vaultInfoRow}>
              <span>Lock Period</span>
              <span style={{fontWeight: 700}}>{lockDays} days</span>
            </div>
            <div style={styles.vaultInfoRow}>
              <span>APY</span>
              <span style={{fontWeight: 700, color: '#00D2FF'}}>{apyMap[lockDays]}%</span>
            </div>
            <div style={styles.vaultInfoRow}>
              <span>Early Exit Penalty</span>
              <span style={{fontWeight: 700, color: '#EF4444'}}>{penaltyMap[lockDays]}%</span>
            </div>
          </div>
          <div style={styles.warningBox}>
            <IoWarning size={20} style={{color: '#F59E0B', marginRight: '8px', flexShrink: 0}} />
            <p style={styles.warningText}>Funds will be locked for {lockDays} days. Early withdrawal incurs a {penaltyMap[lockDays]}% penalty.</p>
          </div>
        </div>
        <div style={styles.modalFooter}>
          <button style={styles.modalBtnSecondary} onClick={onClose}>Cancel</button>
          <button 
            style={styles.modalBtnPrimary} 
            onClick={() => onLock(currency, amount, lockDays)}
            disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > availableBalance}
          >
            Lock {lockDays} Days
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: '#0B0F1A',
    minHeight: '100vh',
    padding: '24px',
    paddingTop: '80px',
    color: '#EAF0FF'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid rgba(234, 240, 255, 0.1)',
    borderTop: '4px solid #6C5CE7',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '16px',
    color: 'rgba(234, 240, 255, 0.72)'
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    margin: 0,
    marginBottom: '4px'
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(234, 240, 255, 0.72)',
    margin: 0
  },
  historyBtn: {
    background: 'transparent',
    border: '1px solid rgba(234, 240, 255, 0.18)',
    color: '#EAF0FF',
    padding: '12px 20px',
    borderRadius: '14px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    height: '48px'
  },
  
  summaryCard: {
    background: 'rgba(16, 22, 38, 0.72)',
    border: '1px solid rgba(120, 170, 255, 0.14)',
    borderRadius: '18px',
    padding: '24px',
    marginBottom: '32px',
    boxShadow: '0 0 24px rgba(90, 140, 255, 0.10)'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px'
  },
  summaryTile: {
    padding: '16px',
    background: 'rgba(16, 22, 38, 0.55)',
    borderRadius: '14px',
    border: '1px solid rgba(120, 170, 255, 0.1)'
  },
  summaryLabel: {
    fontSize: '12px',
    color: 'rgba(234, 240, 255, 0.72)',
    marginBottom: '8px',
    fontWeight: 600,
    textTransform: 'uppercase'
  },
  summaryValue: {
    fontSize: '24px',
    fontWeight: 700,
    margin: 0,
    fontVariantNumeric: 'tabular-nums'
  },
  
  section: {
    marginBottom: '48px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center'
  },
  sectionDesc: {
    fontSize: '14px',
    color: 'rgba(234, 240, 255, 0.72)',
    marginBottom: '20px'
  },
  
  positionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px'
  },
  positionCard: {
    background: 'rgba(16, 22, 38, 0.72)',
    border: '1px solid rgba(120, 170, 255, 0.14)',
    borderRadius: '18px',
    padding: '20px',
    boxShadow: '0 0 24px rgba(90, 140, 255, 0.10)',
    minHeight: '220px',
    display: 'flex',
    flexDirection: 'column'
  },
  positionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(120, 170, 255, 0.1)'
  },
  coinInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  coinIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%'
  },
  positionCoin: {
    fontSize: '16px',
    fontWeight: 700,
    margin: 0
  },
  positionType: {
    fontSize: '12px',
    color: 'rgba(234, 240, 255, 0.72)',
    margin: 0
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#FFF',
    textTransform: 'uppercase'
  },
  positionBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  positionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  positionLabel: {
    fontSize: '13px',
    color: 'rgba(234, 240, 255, 0.72)'
  },
  positionValue: {
    fontSize: '15px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums'
  },
  positionActions: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(120, 170, 255, 0.1)'
  },
  actionBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #6C5CE7 0%, #00D2FF 100%)',
    color: '#EAF0FF',
    border: 'none',
    padding: '14px',
    borderRadius: '14px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    height: '52px',
    boxShadow: '0 0 20px rgba(108, 92, 231, 0.35)'
  },
  
  vaultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px'
  },
  vaultCard: {
    background: 'rgba(16, 22, 38, 0.72)',
    border: '1px solid rgba(120, 170, 255, 0.14)',
    borderRadius: '18px',
    padding: '24px',
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column'
  },
  vaultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  vaultDays: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#EAF0FF'
  },
  vaultApy: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#00D2FF'
  },
  vaultBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px'
  },
  vaultDetail: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  vaultLabel: {
    fontSize: '13px',
    color: 'rgba(234, 240, 255, 0.72)'
  },
  vaultValue: {
    fontSize: '14px',
    fontWeight: 600
  },
  vaultBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #6C5CE7 0%, #00D2FF 100%)',
    color: '#EAF0FF',
    border: 'none',
    padding: '14px',
    borderRadius: '14px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    height: '52px',
    boxShadow: '0 0 20px rgba(108, 92, 231, 0.35)'
  },
  
  flexibleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(16, 22, 38, 0.55)',
    border: '1px solid rgba(120, 170, 255, 0.14)',
    borderRadius: '14px',
    padding: '10px 16px',
    width: '300px'
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#EAF0FF',
    fontSize: '14px',
    outline: 'none'
  },
  flexibleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
    minHeight: '200px',
    position: 'relative',
    zIndex: 10
  },
  emptyState: {
    background: 'rgba(16, 22, 38, 0.72)',
    border: '1px solid rgba(120, 170, 255, 0.14)',
    borderRadius: '18px',
    padding: '60px 20px',
    textAlign: 'center'
  },
  emptyText: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#EAF0FF',
    marginBottom: '8px'
  },
  emptySubtext: {
    fontSize: '14px',
    color: 'rgba(234, 240, 255, 0.72)'
  },
  flexibleCard: {
    background: 'rgba(16, 22, 38, 0.72)',
    border: '1px solid rgba(120, 170, 255, 0.14)',
    borderRadius: '14px',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer !important',
    transition: 'all 0.2s',
    height: '72px',
    width: '100%',
    textAlign: 'left',
    color: '#EAF0FF',
    fontFamily: 'inherit',
    pointerEvents: 'all !important',
    position: 'relative',
    zIndex: 100,
    touchAction: 'manipulation'
  },
  flexibleIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    pointerEvents: 'none'
  },
  flexibleInfo: {
    flex: 1,
    pointerEvents: 'none'
  },
  flexibleCoin: {
    fontSize: '15px',
    fontWeight: 700,
    margin: 0,
    marginBottom: '2px',
    pointerEvents: 'none'
  },
  flexibleBalance: {
    fontSize: '13px',
    color: 'rgba(234, 240, 255, 0.72)',
    margin: 0,
    fontWeight: 500,
    pointerEvents: 'none'
  },
  
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    background: '#101626',
    border: '1px solid rgba(120, 170, 255, 0.14)',
    borderRadius: '18px',
    width: '90%',
    maxWidth: '500px',
    boxShadow: '0 0 48px rgba(90, 140, 255, 0.2)'
  },
  modalHeader: {
    padding: '24px',
    borderBottom: '1px solid rgba(120, 170, 255, 0.14)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
    color: '#EAF0FF'
  },
  modalClose: {
    background: 'transparent',
    border: 'none',
    color: '#EAF0FF',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex'
  },
  modalBody: {
    padding: '24px'
  },
  modalFooter: {
    padding: '20px 24px',
    borderTop: '1px solid rgba(120, 170, 255, 0.14)',
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  inputGroup: {
    marginBottom: '20px'
  },
  inputLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'rgba(234, 240, 255, 0.72)',
    marginBottom: '8px',
    display: 'block',
    textTransform: 'uppercase'
  },
  input: {
    width: '100%',
    background: 'rgba(16, 22, 38, 0.55)',
    border: '1px solid rgba(120, 170, 255, 0.14)',
    borderRadius: '14px',
    padding: '14px',
    color: '#EAF0FF',
    fontSize: '15px',
    fontFamily: 'inherit',
    height: '52px'
  },
  select: {
    width: '100%',
    background: 'rgba(16, 22, 38, 0.55)',
    border: '1px solid rgba(120, 170, 255, 0.14)',
    borderRadius: '14px',
    padding: '14px',
    color: '#EAF0FF',
    fontSize: '15px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    height: '52px'
  },
  balanceText: {
    fontSize: '12px',
    color: 'rgba(234, 240, 255, 0.72)',
    marginTop: '8px'
  },
  modalBtnSecondary: {
    background: 'transparent',
    border: '1px solid rgba(234, 240, 255, 0.18)',
    color: '#EAF0FF',
    padding: '14px 24px',
    borderRadius: '14px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    height: '52px'
  },
  modalBtnPrimary: {
    background: 'linear-gradient(135deg, #6C5CE7 0%, #00D2FF 100%)',
    color: '#EAF0FF',
    border: 'none',
    padding: '14px 24px',
    borderRadius: '14px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 0 20px rgba(108, 92, 231, 0.35)',
    height: '52px'
  },
  vaultInfo: {
    background: 'rgba(16, 22, 38, 0.55)',
    borderRadius: '14px',
    padding: '16px',
    marginBottom: '16px'
  },
  vaultInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    fontSize: '14px',
    color: 'rgba(234, 240, 255, 0.72)'
  },
  warningBox: {
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: '14px',
    padding: '14px',
    display: 'flex',
    alignItems: 'flex-start'
  },
  warningText: {
    fontSize: '13px',
    color: 'rgba(234, 240, 255, 0.72)',
    lineHeight: '1.5',
    margin: 0
  }
};
