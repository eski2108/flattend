import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoArrowBack, IoArrowDown, IoArrowUp, IoSwapHorizontal, IoLockClosed } from 'react-icons/io5';
import { getCoinLogo } from '../utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SavingsHistory() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadHistory(parsedUser.user_id);
  }, [navigate]);

  const loadHistory = async (userId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/savings/history/${userId}`);
      if (res.data.success) {
        setTransactions(res.data.transactions);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'deposit':
        return <IoArrowDown size={20} style={{color: '#22C55E'}} />;
      case 'withdrawal':
        return <IoArrowUp size={20} style={{color: '#EF4444'}} />;
      case 'vault_lock':
        return <IoLockClosed size={20} style={{color: '#6C5CE7'}} />;
      case 'vault_redeem':
        return <IoLockClosed size={20} style={{color: '#22C55E'}} />;
      case 'vault_early_exit':
        return <IoLockClosed size={20} style={{color: '#F59E0B'}} />;
      default:
        return <IoSwapHorizontal size={20} style={{color: '#00D2FF'}} />;
    }
  };

  const getTransactionLabel = (type) => {
    const labels = {
      deposit: 'Deposit to Savings',
      withdrawal: 'Withdrawal to Wallet',
      vault_lock: 'Locked Vault Created',
      vault_redeem: 'Vault Redeemed',
      vault_early_exit: 'Early Vault Exit'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/savings')}>
          <IoArrowBack size={20} />
          Back to Savings
        </button>
        <h1 style={styles.title}>Transaction History</h1>
      </div>

      {transactions.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No transactions yet</p>
        </div>
      ) : (
        <div style={styles.transactionsList}>
          {transactions.map(tx => (
            <div key={tx.transaction_id} style={styles.transactionCard}>
              <div style={styles.transactionLeft}>
                <div style={styles.iconCircle}>
                  {getTransactionIcon(tx.type)}
                </div>
                <div>
                  <p style={styles.transactionType}>{getTransactionLabel(tx.type)}</p>
                  <p style={styles.transactionDate}>
                    {new Date(tx.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div style={styles.transactionRight}>
                <div style={styles.amountContainer}>
                  <img src={getCoinLogo(tx.currency)} alt={tx.currency} style={styles.coinIcon} />
                  <span style={styles.amount}>{tx.amount.toFixed(8)} {tx.currency}</span>
                </div>
                {tx.earnings && (
                  <p style={styles.earnings}>+{tx.earnings.toFixed(8)} {tx.currency} earned</p>
                )}
                {tx.penalty && (
                  <p style={styles.penalty}>-{tx.penalty.toFixed(8)} {tx.currency} penalty</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
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
    marginBottom: '24px'
  },
  backBtn: {
    background: 'transparent',
    border: '1px solid rgba(234, 240, 255, 0.18)',
    color: '#EAF0FF',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '16px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    margin: 0
  },
  transactionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  transactionCard: {
    background: 'rgba(16, 22, 38, 0.72)',
    border: '1px solid rgba(120, 170, 255, 0.14)',
    borderRadius: '14px',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 0 24px rgba(90, 140, 255, 0.10)'
  },
  transactionLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  iconCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(16, 22, 38, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  transactionType: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#EAF0FF',
    marginBottom: '4px'
  },
  transactionDate: {
    fontSize: '12px',
    color: 'rgba(234, 240, 255, 0.72)'
  },
  transactionRight: {
    textAlign: 'right'
  },
  amountContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'flex-end',
    marginBottom: '4px'
  },
  coinIcon: {
    width: '20px',
    height: '20px',
    borderRadius: '50%'
  },
  amount: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#EAF0FF'
  },
  earnings: {
    fontSize: '12px',
    color: '#22C55E'
  },
  penalty: {
    fontSize: '12px',
    color: '#EF4444'
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
    color: 'rgba(234, 240, 255, 0.72)'
  }
};
