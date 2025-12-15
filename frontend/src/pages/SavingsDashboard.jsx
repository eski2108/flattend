import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoWallet, IoTrendingUp, IoTime, IoArrowUp, IoArrowDown } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SavingsDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [currentAPY, setCurrentAPY] = useState(0);
  const [totalInterestEarned, setTotalInterestEarned] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadDashboardData(parsedUser.user_id);
  }, [navigate]);

  const loadDashboardData = async (userId) => {
    setLoading(true);
    try {
      const [summaryRes, historyRes] = await Promise.all([
        axios.get(`${API}/api/savings/summary/${userId}`).catch(() => ({ data: { success: false } })),
        axios.get(`${API}/api/savings/history/${userId}`).catch(() => ({ data: { transactions: [] } }))
      ]);

      if (summaryRes.data.success) {
        const summary = summaryRes.data.summary;
        setPortfolioValue(summary.total_value_gbp || 0);
        setCurrentAPY(summary.average_apy || 5.0);
        setTotalInterestEarned(summary.total_earnings || 0);
      }

      if (historyRes.data.transactions) {
        setRecentTransactions(historyRes.data.transactions.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = () => {
    navigate('/savings/deposit');
  };

  const handleWithdraw = () => {
    navigate('/savings/withdraw');
  };

  const handleViewHistory = () => {
    navigate('/savings/history');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingText}>Loading Savings Dashboard...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logoArea}>
          <IoWallet size={28} style={{color: '#007AFF'}} />
          <span style={styles.logoText}>CoinHubX Savings</span>
        </div>
        <div style={styles.navLinks}>
          <button style={styles.navLink} onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button style={styles.navLink} onClick={handleDeposit}>Deposit</button>
          <button style={styles.navLink} onClick={handleWithdraw}>Withdraw</button>
          <button style={styles.navLink} onClick={handleViewHistory}>History</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Total Balance Card */}
        <div style={styles.totalBalanceCard}>
          <div style={styles.balanceLabel}>TOTAL SAVINGS PORTFOLIO VALUE</div>
          <div style={styles.balanceValue}>£{portfolioValue.toFixed(2)}</div>
        </div>

        {/* Key Metrics Cards */}
        <div style={styles.metricsContainer}>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>CURRENT ANNUAL YIELD (APY)</div>
            <div style={{...styles.metricValue, color: '#2ECC71'}}>
              <IoTrendingUp size={28} style={{marginRight: '8px'}} />
              {currentAPY.toFixed(1)}% APY
            </div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>TOTAL INTEREST EARNED</div>
            <div style={styles.metricValue}>
              <IoArrowUp size={28} style={{marginRight: '8px', color: '#2ECC71'}} />
              £{totalInterestEarned.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div style={styles.actionButtonsContainer}>
          <button style={styles.primaryButton} onClick={handleDeposit}>
            DEPOSIT CRYPTO
          </button>
          <button style={styles.secondaryButton} onClick={handleWithdraw}>
            WITHDRAW FUNDS
          </button>
        </div>

        {/* Transaction History Table */}
        <div style={styles.historySection}>
          <div style={styles.historySectionHeader}>
            <h3 style={styles.historySectionTitle}>Recent Transactions</h3>
            <button style={styles.viewAllButton} onClick={handleViewHistory}>View All</button>
          </div>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.tableHeader}>Date</th>
                  <th style={styles.tableHeader}>Asset</th>
                  <th style={styles.tableHeader}>Type</th>
                  <th style={styles.tableHeader}>Amount</th>
                  <th style={styles.tableHeader}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={styles.emptyState}>No transactions yet. Start by depositing crypto!</td>
                  </tr>
                ) : (
                  recentTransactions.map((tx, index) => (
                    <tr key={index} style={styles.tableRow}>
                      <td style={styles.tableCell}>{new Date(tx.date).toLocaleDateString()}</td>
                      <td style={styles.tableCell}>{tx.asset || 'N/A'}</td>
                      <td style={styles.tableCell}>
                        <span style={{
                          ...styles.typeBadge,
                          backgroundColor: tx.type === 'Deposit' ? '#007AFF22' : tx.type === 'Withdraw' ? '#FF3B3022' : '#2ECC7122',
                          color: tx.type === 'Deposit' ? '#007AFF' : tx.type === 'Withdraw' ? '#FF3B30' : '#2ECC71'
                        }}>
                          {tx.type}
                        </span>
                      </td>
                      <td style={styles.tableCell}>{tx.amount || '0.00'}</td>
                      <td style={styles.tableCell}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: tx.status === 'Completed' ? '#2ECC7122' : '#FFA50022',
                          color: tx.status === 'Completed' ? '#2ECC71' : '#FFA500'
                        }}>
                          {tx.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#1C1E2A',
    color: '#FFFFFF',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    height: '60px',
    backgroundColor: '#1C1E2A',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 40px',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#FFFFFF'
  },
  navLinks: {
    display: 'flex',
    gap: '24px'
  },
  navLink: {
    background: 'transparent',
    border: 'none',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '6px',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'rgba(0, 122, 255, 0.1)',
      color: '#007AFF'
    }
  },
  mainContent: {
    maxWidth: '1440px',
    margin: '0 auto',
    padding: '40px'
  },
  totalBalanceCard: {
    backgroundColor: '#252836',
    border: '1px solid rgba(0, 122, 255, 0.2)',
    borderRadius: '16px',
    padding: '48px',
    textAlign: 'center',
    marginBottom: '40px',
    boxShadow: '0 4px 24px rgba(0, 122, 255, 0.1)'
  },
  balanceLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: '1px',
    marginBottom: '16px'
  },
  balanceValue: {
    fontSize: '56px',
    fontWeight: 700,
    color: '#FFFFFF',
    letterSpacing: '-1px'
  },
  metricsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '40px'
  },
  metricCard: {
    backgroundColor: '#252836',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '32px'
  },
  metricLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: '0.5px',
    marginBottom: '12px'
  },
  metricValue: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center'
  },
  actionButtonsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '40px'
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    border: 'none',
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: 700,
    padding: '20px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    letterSpacing: '0.5px'
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    border: '2px solid #007AFF',
    color: '#007AFF',
    fontSize: '16px',
    fontWeight: 700,
    padding: '20px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    letterSpacing: '0.5px'
  },
  historySection: {
    backgroundColor: '#252836',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '32px'
  },
  historySectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  historySectionTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#FFFFFF',
    margin: 0
  },
  viewAllButton: {
    background: 'transparent',
    border: 'none',
    color: '#007AFF',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeaderRow: {
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  tableHeader: {
    textAlign: 'left',
    padding: '16px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase'
  },
  tableRow: {
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  tableCell: {
    padding: '20px 16px',
    fontSize: '14px',
    color: '#FFFFFF'
  },
  typeBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px'
  },
  loadingText: {
    textAlign: 'center',
    padding: '60px',
    fontSize: '18px',
    color: 'rgba(255,255,255,0.6)'
  }
};
