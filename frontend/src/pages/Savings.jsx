import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
  IoTime
} from 'react-icons/io5';
import { getCoinLogo } from '../utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

// EXACT COLORS FROM SPEC
const COLORS = {
  background: '#0E0F1A',
  cardBg: '#151626',
  neonBlue: '#00F0FF',
  neonGreen: '#00FF85',
  purpleAccent: '#A64EFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#B5B5B5'
};

export default function Savings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [expandedAsset, setExpandedAsset] = useState(null);
  const [chartRange, setChartRange] = useState('30d');
  
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
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>Loading Savings Vault...</div>
      </div>
    );
  }

  const hasSavings = savingsAssets.length > 0;

  return (
    <div style={styles.container}>
      <div style={styles.contentWrapper}>
        
        {/* HEADER - Neon Title with Wallet Selector and Transfer Button */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.neonTitle}>Savings Vault</h1>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.walletSelector}>
              <IoWallet size={18} />
              <span>Main Wallet</span>
              <IoChevronDown size={16} />
            </button>
            <button 
              style={styles.transferButton}
              onClick={() => navigate('/savings/deposit')}
            >
              Transfer from Wallet
            </button>
          </div>
        </div>

        {/* TOP SUMMARY CARDS - Glassmorphic Design */}
        <div style={styles.summaryGrid}>
          {/* Total Balance */}
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>
              <span>Total Balance</span>
              <span style={styles.liveIndicator}>
                <span style={styles.liveDot} />
                Live
              </span>
            </div>
            <div style={styles.summaryValue}>
              {balanceVisible ? `£${totalSavings.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
            </div>
            <button
              onClick={() => setBalanceVisible(!balanceVisible)}
              style={styles.eyeButton}
            >
              {balanceVisible ? <IoEye size={16} /> : <IoEyeOff size={16} />}
            </button>
          </div>

          {/* Available to Transfer */}
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>
              <span>Available to Transfer</span>
              <span style={styles.liveIndicator}>
                <span style={styles.liveDot} />
                Live
              </span>
            </div>
            <div style={styles.summaryValue}>
              {balanceVisible ? `£${availableToTransfer.toFixed(2)}` : '••••••'}
            </div>
          </div>

          {/* Interest Earned */}
          <div style={{...styles.summaryCard, ...styles.summaryCardGreen}}>
            <div style={styles.summaryLabel}>
              <span>Interest Earned to Date</span>
              <span style={styles.liveIndicator}>
                <span style={styles.liveDot} />
                Live
              </span>
            </div>
            <div style={{...styles.summaryValue, color: COLORS.neonGreen}}>
              {balanceVisible ? `£${totalInterestEarned.toFixed(2)}` : '••••••'}
            </div>
          </div>
        </div>

        {/* REFERRAL BANNER */}
        <div style={styles.referralBanner}>
          <span>Invite friends, earn more</span>
          <IoArrowForward size={20} />
        </div>

        {/* YOUR SAVINGS SECTION */}
        {!hasSavings ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <IoTrendingUp size={64} />
            </div>
            <h3 style={styles.emptyTitle}>No assets earning yet</h3>
            <p style={styles.emptyText}>Transfer crypto from your wallet to start earning yield</p>
            <button 
              style={styles.emptyButton}
              onClick={() => navigate('/savings/deposit')}
            >
              Start Earning
            </button>
          </div>
        ) : (
          <div style={styles.portfolioSection}>
            <h2 style={styles.sectionTitle}>Your Savings</h2>
            
            {savingsAssets.map((asset, idx) => {
              const currency = asset.currency || asset.asset || 'BTC';
              const amount = parseFloat(asset.amount || asset.balance || 0);
              const gbpValue = parseFloat(asset.value_gbp || asset.balance_gbp || 0);
              const apy = parseFloat(asset.apy || 5.0);
              const interestEarned = parseFloat(asset.interest_earned || asset.earnings || 0);
              const isExpanded = expandedAsset === idx;

              return (
                <div key={idx} style={styles.assetCard}>
                  {/* Collapsed View */}
                  <div 
                    style={styles.assetHeader}
                    onClick={() => setExpandedAsset(isExpanded ? null : idx)}
                  >
                    <div style={styles.assetInfo}>
                      <img
                        src={getCoinLogo(currency)}
                        alt={currency}
                        style={styles.assetIcon}
                        onError={(e) => {
                          e.target.src = `https://lcw.nyc3.cdn.digitaloceanspaces.com/production/currencies/64/${currency.toLowerCase()}.png`;
                        }}
                      />
                      <div>
                        <div style={styles.assetName}>{currency}</div>
                        <div style={styles.assetBalance}>{amount.toFixed(8)}</div>
                      </div>
                    </div>

                    <div style={styles.assetStats}>
                      <div style={styles.assetStat}>
                        <span style={styles.assetStatLabel}>APY:</span>
                        <span style={{...styles.assetStatValue, color: COLORS.neonGreen}}>
                          {apy.toFixed(1)}%
                        </span>
                      </div>
                      <div style={styles.assetStat}>
                        <span style={styles.assetStatLabel}>Interest:</span>
                        <span style={{...styles.assetStatValue, color: COLORS.neonGreen}}>
                          £{interestEarned.toFixed(2)}
                        </span>
                      </div>
                      <div style={styles.assetStat}>
                        <span style={styles.assetStatValue}>£{gbpValue.toFixed(2)}</span>
                      </div>
                    </div>

                    {isExpanded ? <IoChevronUp size={20} /> : <IoChevronDown size={20} />}
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div style={styles.assetExpanded}>
                      {/* Chart Range Toggle */}
                      <div style={styles.chartToggle}>
                        <button
                          style={chartRange === '30d' ? styles.chartButtonActive : styles.chartButton}
                          onClick={() => setChartRange('30d')}
                        >
                          30D
                        </button>
                        <button
                          style={chartRange === '90d' ? styles.chartButtonActive : styles.chartButton}
                          onClick={() => setChartRange('90d')}
                        >
                          90D
                        </button>
                      </div>

                      {/* Placeholder Chart */}
                      <div style={styles.chartPlaceholder}>
                        <IoTrendingUp size={32} style={{color: COLORS.neonGreen, opacity: 0.3}} />
                        <span style={{color: COLORS.textSecondary, fontSize: '14px'}}>
                          {chartRange} Earnings Chart
                        </span>
                      </div>

                      {/* Actions */}
                      <div style={styles.assetActions}>
                        <button style={styles.actionButtonOutline}>
                          <IoRemove size={18} />
                          Withdraw
                        </button>
                        <button style={styles.actionButton}>
                          <IoAdd size={18} />
                          Add
                        </button>
                      </div>

                      {/* Lock Period Selectors */}
                      <div style={styles.lockPeriods}>
                        <span style={{fontSize: '14px', color: COLORS.textSecondary}}>Lock Period:</span>
                        <button style={styles.lockButton}>7d</button>
                        <button style={{...styles.lockButton, ...styles.lockButtonActive}}>30d</button>
                        <button style={styles.lockButton}>90d</button>
                      </div>

                      {/* Interest History Link */}
                      <button style={styles.historyLink}>
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
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: COLORS.background,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    color: COLORS.textPrimary,
    paddingBottom: '60px'
  },
  loadingContainer: {
    minHeight: '100vh',
    background: COLORS.background,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    fontSize: '20px',
    color: COLORS.neonBlue,
    fontWeight: '600',
    textShadow: `0 0 20px ${COLORS.neonBlue}`
  },
  contentWrapper: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px 20px'
  },
  
  // HEADER
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  neonTitle: {
    fontSize: '48px',
    fontWeight: '700',
    color: COLORS.neonBlue,
    textShadow: `0 0 30px ${COLORS.neonBlue}, 0 0 60px ${COLORS.neonBlue}`,
    margin: 0,
    animation: 'neonPulse 3s ease-in-out infinite'
  },
  headerActions: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center'
  },
  walletSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: 'rgba(0, 240, 255, 0.1)',
    border: `1px solid ${COLORS.neonBlue}`,
    borderRadius: '12px',
    color: COLORS.neonBlue,
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  transferButton: {
    padding: '12px 24px',
    background: `linear-gradient(135deg, ${COLORS.neonBlue}, ${COLORS.purpleAccent})`,
    border: 'none',
    borderRadius: '12px',
    color: COLORS.textPrimary,
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: `0 0 20px ${COLORS.neonBlue}`,
    transition: 'all 0.3s ease'
  },

  // SUMMARY CARDS
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },
  summaryCard: {
    background: `linear-gradient(135deg, rgba(0, 240, 255, 0.05), rgba(166, 78, 255, 0.05))`,
    backdropFilter: 'blur(10px)',
    border: `1px solid rgba(0, 240, 255, 0.2)`,
    borderRadius: '16px',
    padding: '24px',
    position: 'relative',
    boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px rgba(0, 240, 255, 0.1)`,
    transition: 'all 0.3s ease'
  },
  summaryCardGreen: {
    background: `linear-gradient(135deg, rgba(0, 255, 133, 0.05), rgba(0, 240, 255, 0.05))`,
    border: `1px solid rgba(0, 255, 133, 0.2)`,
    boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px rgba(0, 255, 133, 0.1)`
  },
  summaryLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '12px'
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: COLORS.neonGreen,
    fontSize: '11px'
  },
  liveDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: COLORS.neonGreen,
    boxShadow: `0 0 10px ${COLORS.neonGreen}`,
    animation: 'pulse 2s ease-in-out infinite'
  },
  summaryValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: '8px',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
  },
  eyeButton: {
    position: 'absolute',
    top: '24px',
    right: '24px',
    background: 'transparent',
    border: 'none',
    color: COLORS.textSecondary,
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    transition: 'all 0.2s ease'
  },

  // REFERRAL BANNER
  referralBanner: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 24px',
    background: `linear-gradient(135deg, rgba(166, 78, 255, 0.1), rgba(0, 240, 255, 0.1))`,
    border: `1px solid ${COLORS.purpleAccent}`,
    borderRadius: '16px',
    marginBottom: '32px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    color: COLORS.purpleAccent,
    boxShadow: `0 0 30px rgba(166, 78, 255, 0.3)`,
    transition: 'all 0.3s ease'
  },

  // EMPTY STATE
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
    background: `linear-gradient(135deg, rgba(21, 22, 38, 0.6), rgba(14, 15, 26, 0.8))`,
    borderRadius: '20px',
    border: `1px solid rgba(0, 240, 255, 0.1)`
  },
  emptyIcon: {
    width: '120px',
    height: '120px',
    margin: '0 auto 24px',
    background: `linear-gradient(135deg, ${COLORS.neonBlue}, ${COLORS.purpleAccent})`,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 40px ${COLORS.neonBlue}`
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: '12px'
  },
  emptyText: {
    fontSize: '16px',
    color: COLORS.textSecondary,
    marginBottom: '32px',
    maxWidth: '500px',
    margin: '0 auto 32px'
  },
  emptyButton: {
    padding: '14px 40px',
    background: `linear-gradient(135deg, ${COLORS.neonBlue}, ${COLORS.purpleAccent})`,
    border: 'none',
    borderRadius: '12px',
    color: COLORS.textPrimary,
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: `0 0 30px ${COLORS.neonBlue}`,
    transition: 'all 0.3s ease'
  },

  // PORTFOLIO SECTION
  portfolioSection: {
    marginTop: '40px'
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: '20px'
  },

  // ASSET CARDS
  assetCard: {
    background: `linear-gradient(135deg, rgba(21, 22, 38, 0.8), rgba(14, 15, 26, 0.9))`,
    backdropFilter: 'blur(10px)',
    border: `1px solid rgba(0, 240, 255, 0.15)`,
    borderRadius: '16px',
    marginBottom: '16px',
    overflow: 'hidden',
    transition: 'all 0.3s ease'
  },
  assetHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  assetInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1
  },
  assetIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    boxShadow: `0 0 20px rgba(0, 240, 255, 0.3)`
  },
  assetName: {
    fontSize: '18px',
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: '4px'
  },
  assetBalance: {
    fontSize: '14px',
    color: COLORS.textSecondary
  },
  assetStats: {
    display: 'flex',
    gap: '32px',
    alignItems: 'center'
  },
  assetStat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  assetStatLabel: {
    fontSize: '12px',
    color: COLORS.textSecondary
  },
  assetStatValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: COLORS.textPrimary
  },

  // EXPANDED VIEW
  assetExpanded: {
    padding: '0 24px 24px',
    borderTop: `1px solid rgba(0, 240, 255, 0.1)`,
    paddingTop: '24px'
  },
  chartToggle: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px'
  },
  chartButton: {
    padding: '8px 20px',
    background: 'transparent',
    border: `1px solid ${COLORS.textSecondary}`,
    borderRadius: '8px',
    color: COLORS.textSecondary,
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  chartButtonActive: {
    padding: '8px 20px',
    background: COLORS.neonBlue,
    border: `1px solid ${COLORS.neonBlue}`,
    borderRadius: '8px',
    color: COLORS.background,
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: `0 0 20px ${COLORS.neonBlue}`
  },
  chartPlaceholder: {
    height: '200px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '24px',
    border: `1px solid rgba(0, 240, 255, 0.1)`
  },
  assetActions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '20px'
  },
  actionButton: {
    padding: '12px 24px',
    background: `linear-gradient(135deg, ${COLORS.neonBlue}, ${COLORS.purpleAccent})`,
    border: 'none',
    borderRadius: '10px',
    color: COLORS.textPrimary,
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: `0 0 20px ${COLORS.neonBlue}`,
    transition: 'all 0.3s ease'
  },
  actionButtonOutline: {
    padding: '12px 24px',
    background: 'transparent',
    border: `1px solid ${COLORS.neonBlue}`,
    borderRadius: '10px',
    color: COLORS.neonBlue,
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  },
  lockPeriods: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px'
  },
  lockButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: `1px solid ${COLORS.textSecondary}`,
    borderRadius: '8px',
    color: COLORS.textSecondary,
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  lockButtonActive: {
    background: COLORS.purpleAccent,
    border: `1px solid ${COLORS.purpleAccent}`,
    color: COLORS.textPrimary,
    boxShadow: `0 0 15px ${COLORS.purpleAccent}`
  },
  historyLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: COLORS.neonBlue,
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }
};
