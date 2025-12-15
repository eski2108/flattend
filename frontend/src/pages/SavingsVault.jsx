import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { 
  IoEye, 
  IoEyeOff, 
  IoArrowUp, 
  IoAdd,
  IoRemove,
  IoTrendingUp
} from 'react-icons/io5';
import { getCoinLogo } from '@/utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SavingsVault() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);
  
  // REAL DATA FROM BACKEND ONLY
  const [totalSavings, setTotalSavings] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [savingsAssets, setSavingsAssets] = useState([]);
  const [supportedCoins, setSupportedCoins] = useState([]);

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
      // Fetch ALL data from REAL backend endpoints
      const [summaryRes, positionsRes, balancesRes, coinsRes] = await Promise.all([
        axios.get(`${API}/api/savings/summary/${userId}`).catch(() => ({ data: { success: false } })),
        axios.get(`${API}/api/savings/positions/${userId}`).catch(() => ({ data: { success: false, positions: [] } })),
        axios.get(`${API}/api/savings/balances/${userId}`).catch(() => ({ data: { balances: [] } })),
        axios.get(`${API}/api/savings/supported-coins`).catch(() => ({ data: { coins: [] } }))
      ]);

      // Set REAL total savings from backend
      if (summaryRes.data.success && summaryRes.data.summary) {
        const summary = summaryRes.data.summary;
        setTotalSavings(summary.total_value_gbp || 0);
        setTotalInterest(summary.total_earnings || 0);
      }

      // Set REAL positions/balances
      if (positionsRes.data.success && positionsRes.data.positions) {
        setSavingsAssets(positionsRes.data.positions);
      } else if (balancesRes.data.balances) {
        setSavingsAssets(balancesRes.data.balances);
      }

      // Set supported coins
      if (coinsRes.data.coins) {
        setSupportedCoins(coinsRes.data.coins);
      }

      // Calculate available balance from wallet
      const walletRes = await axios.get(`${API}/api/crypto/${userId}`).catch(() => ({ data: { balances: [] } }));
      if (walletRes.data.balances) {
        const total = walletRes.data.balances.reduce((sum, asset) => {
          return sum + (parseFloat(asset.balance_gbp) || 0);
        }, 0);
        setAvailableBalance(total);
      }
    } catch (error) {
      console.error('Error loading savings:', error);
      toast.error('Failed to load savings data');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferFromWallet = () => {
    navigate('/savings/deposit');
  };

  const handleAddToSavings = (asset) => {
    navigate('/savings/deposit', { state: { preselectedCoin: asset.currency } });
  };

  const handleWithdraw = (asset) => {
    navigate('/savings/withdraw', { state: { preselectedCoin: asset.currency } });
  };

  if (loading) {
    return (
      <Layout>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingText}>Loading Savings Vault...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={styles.container}>
        {/* HEADER SECTION */}
        <div style={styles.headerSection}>
          <div style={styles.titleContainer}>
            <h1 style={styles.title}>Savings Vault</h1>
            <p style={styles.subtitle}>Grow your crypto with passive yield</p>
          </div>
          <button style={styles.primaryCTA} onClick={handleTransferFromWallet}>
            Transfer from Wallet
          </button>
        </div>

        {/* TOTAL SAVINGS OVERVIEW - 3 SOFT CARDS */}
        <div style={styles.overviewGrid}>
          {/* Total Savings Card */}
          <div style={styles.overviewCard}>
            <div style={styles.cardHeader}>
              <span style={styles.cardLabel}>Total Savings</span>
              <button 
                style={styles.eyeButton}
                onClick={() => setBalanceVisible(!balanceVisible)}
              >
                {balanceVisible ? <IoEye size={20} /> : <IoEyeOff size={20} />}
              </button>
            </div>
            <div style={styles.cardValue}>
              {balanceVisible ? `£${totalSavings.toFixed(2)}` : '••••••'}
            </div>
            <div style={styles.cardSubtext}>Combined balance</div>
          </div>

          {/* Available Card */}
          <div style={{...styles.overviewCard, ...styles.purpleAccent}}>
            <div style={styles.cardHeader}>
              <span style={styles.cardLabel}>Available</span>
            </div>
            <div style={styles.cardValue}>
              {balanceVisible ? `£${availableBalance.toFixed(2)}` : '••••••'}
            </div>
            <div style={styles.cardSubtext}>Ready to transfer</div>
          </div>

          {/* Interest Earned Card */}
          <div style={{...styles.overviewCard, ...styles.greenAccent}}>
            <div style={styles.cardHeader}>
              <span style={styles.cardLabel}>Total Interest Earned</span>
              <IoArrowUp size={20} style={{color: '#00C98D'}} />
            </div>
            <div style={{...styles.cardValue, color: '#00C98D'}}>
              {balanceVisible ? `£${totalInterest.toFixed(2)}` : '••••••'}
            </div>
            <div style={styles.cardSubtext}>Lifetime earnings</div>
          </div>
        </div>

        {/* SAVINGS ASSETS LIST */}
        <div style={styles.assetsSection}>
          <h2 style={styles.sectionTitle}>Your Savings</h2>
          
          {savingsAssets.length === 0 ? (
            <div style={styles.emptyState}>
              <IoTrendingUp size={48} style={{color: '#00AEEF', opacity: 0.3, marginBottom: '16px'}} />
              <p style={styles.emptyText}>No assets in savings yet</p>
              <p style={styles.emptySubtext}>Transfer crypto from your wallet to start earning</p>
              <button style={styles.emptyStateButton} onClick={handleTransferFromWallet}>
                Get Started
              </button>
            </div>
          ) : (
            <div style={styles.assetsList}>
              {savingsAssets.map((asset, index) => (
                <div key={index} style={styles.assetRow}>
                  {/* Coin Logo & Name */}
                  <div style={styles.assetInfo}>
                    <img 
                      src={getCoinLogo(asset.currency || asset.asset)} 
                      alt={asset.currency || asset.asset}
                      style={styles.coinLogo}
                      onError={(e) => {
                        e.target.src = `https://lcw.nyc3.cdn.digitaloceanspaces.com/production/currencies/64/${(asset.currency || asset.asset).toLowerCase()}.png`;
                        e.target.onerror = (err) => {
                          err.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iIzAwQUVFRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj4kPC90ZXh0Pjwvc3ZnPg==';
                        };
                      }}
                    />
                    <div>
                      <div style={styles.assetName}>{asset.currency || asset.asset}</div>
                      <div style={styles.assetAmount}>
                        {parseFloat(asset.amount || asset.balance || 0).toFixed(8)}
                      </div>
                    </div>
                  </div>

                  {/* Fiat Value */}
                  <div style={styles.assetFiat}>
                    £{(parseFloat(asset.value_gbp || 0)).toFixed(2)}
                  </div>

                  {/* APY */}
                  <div style={styles.assetAPY}>
                    <span style={styles.apyBadge}>
                      {(parseFloat(asset.apy || 5.0)).toFixed(1)}% APY
                    </span>
                  </div>

                  {/* Interest Earned */}
                  <div style={styles.assetInterest}>
                    <div style={styles.interestLabel}>Interest</div>
                    <div style={styles.interestValue}>
                      £{(parseFloat(asset.interest_earned || 0)).toFixed(2)}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={styles.assetActions}>
                    <button 
                      style={styles.actionButton}
                      onClick={() => handleAddToSavings(asset)}
                    >
                      <IoAdd size={16} /> Add
                    </button>
                    <button 
                      style={styles.actionButtonOutline}
                      onClick={() => handleWithdraw(asset)}
                    >
                      <IoRemove size={16} /> Withdraw
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh'
  },
  loadingText: {
    fontSize: '18px',
    color: 'var(--grey-text)'
  },
  
  // HEADER SECTION
  headerSection: {
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px'
  },
  titleContainer: {
    flex: 1
  },
  title: {
    fontSize: '36px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #00AEEF, #00C98D)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '16px',
    color: 'var(--grey-text)',
    margin: 0
  },
  primaryCTA: {
    background: 'linear-gradient(135deg, #00AEEF, #00C98D)',
    border: 'none',
    borderRadius: '24px',
    padding: '14px 32px',
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0, 174, 239, 0.3)',
    transition: 'all 0.2s ease'
  },

  // OVERVIEW CARDS
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  },
  overviewCard: {
    background: 'linear-gradient(145deg, rgba(17, 20, 24, 0.95), rgba(11, 14, 17, 0.95))',
    border: '1px solid rgba(0, 174, 239, 0.15)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0, 174, 239, 0.08)',
    transition: 'all 0.2s ease'
  },
  purpleAccent: {
    border: '1px solid rgba(138, 92, 246, 0.15)',
    boxShadow: '0 4px 20px rgba(138, 92, 246, 0.08)'
  },
  greenAccent: {
    border: '1px solid rgba(0, 201, 141, 0.15)',
    boxShadow: '0 4px 20px rgba(0, 201, 141, 0.08)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  cardLabel: {
    fontSize: '13px',
    color: 'var(--grey-text)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  eyeButton: {
    background: 'transparent',
    border: 'none',
    color: 'var(--grey-text)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center'
  },
  cardValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#FFFFFF',
    marginBottom: '8px'
  },
  cardSubtext: {
    fontSize: '13px',
    color: 'var(--grey-text)'
  },

  // ASSETS SECTION
  assetsSection: {
    marginTop: '40px'
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#FFFFFF',
    marginBottom: '20px'
  },
  assetsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    background: 'rgba(0, 174, 239, 0.05)',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  assetRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 2fr',
    gap: '16px',
    alignItems: 'center',
    background: 'rgba(17, 20, 24, 0.95)',
    padding: '20px 24px',
    transition: 'all 0.2s ease'
  },
  assetInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  coinLogo: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover'
  },
  assetName: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#FFFFFF',
    marginBottom: '4px'
  },
  assetAmount: {
    fontSize: '13px',
    color: 'var(--grey-text)'
  },
  assetFiat: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#FFFFFF'
  },
  assetAPY: {
    display: 'flex',
    justifyContent: 'center'
  },
  apyBadge: {
    background: 'rgba(0, 201, 141, 0.15)',
    color: '#00C98D',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 700
  },
  assetInterest: {
    textAlign: 'right'
  },
  interestLabel: {
    fontSize: '12px',
    color: 'var(--grey-text)',
    marginBottom: '4px'
  },
  interestValue: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#00C98D'
  },
  assetActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end'
  },
  actionButton: {
    background: 'rgba(0, 174, 239, 0.15)',
    border: '1px solid #00AEEF',
    color: '#00AEEF',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease'
  },
  actionButtonOutline: {
    background: 'transparent',
    border: '1px solid rgba(0, 174, 239, 0.3)',
    color: 'var(--grey-text)',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease'
  },

  // EMPTY STATE
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
    background: 'linear-gradient(145deg, rgba(17, 20, 24, 0.5), rgba(11, 14, 17, 0.5))',
    borderRadius: '16px',
    border: '1px solid rgba(0, 174, 239, 0.1)'
  },
  emptyText: {
    fontSize: '18px',
    color: '#FFFFFF',
    marginBottom: '8px'
  },
  emptySubtext: {
    fontSize: '14px',
    color: 'var(--grey-text)',
    marginBottom: '24px'
  },
  emptyStateButton: {
    background: 'linear-gradient(135deg, #00AEEF, #00C98D)',
    border: 'none',
    borderRadius: '24px',
    padding: '12px 32px',
    color: '#FFFFFF',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0, 174, 239, 0.3)'
  }
};
