import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IoCloudDownload, IoFilter } from 'react-icons/io5';
import { BiArrowToTop, BiArrowFromTop } from 'react-icons/bi';;
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function Transactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [filterType, setFilterType] = useState('all'); // all, deposit, withdrawal
  const [filterCurrency, setFilterCurrency] = useState('all'); // all, BTC, ETH, USDT

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/');
      return;
    }
    
    const user = JSON.parse(userData);
    setCurrentUser(user);
    fetchTransactions(user.user_id);
  }, [navigate]);

  useEffect(() => {
    applyFilters();
  }, [transactions, filterType, filterCurrency]);

  const fetchTransactions = async (userId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/crypto-bank/transactions/${userId}?limit=100`);
      
      if (response.data.success) {
        setTransactions(response.data.transactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    if (filterType !== 'all') {
      filtered = filtered.filter(tx => tx.transaction_type === filterType);
    }

    if (filterCurrency !== 'all') {
      filtered = filtered.filter(tx => tx.currency === filterCurrency);
    }

    setFilteredTransactions(filtered);
  };

  const formatCurrency = (amount, currency) => {
    if (currency === 'USDT') {
      return `$${amount.toFixed(2)}`;
    }
    return `${amount.toFixed(6)} ${currency}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'status-completed';
      case 'pending':
        return 'status-pending';
      case 'failed':
        return 'status-failed';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="transactions-page" data-testid="transactions-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Transaction History</h1>
            <p className="page-subtitle">View all your deposits and withdrawals</p>
          </div>
          <Button className="download-btn" onClick={() => toast.info('Export feature coming soon!')}>
            <IoCloudDownload size={18} />
            Export
          </Button>
        </div>

        {/* Filters */}
        <Card className="filters-card">
          <div className="filters-content">
            <div className="filter-group">
              <IoFilter size={18} />
              <label>Type:</label>
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="withdrawal">Withdrawals</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Currency:</label>
              <select 
                value={filterCurrency} 
                onChange={(e) => setFilterCurrency(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Currencies</option>
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="ETH">Ethereum (ETH)</option>
                <option value="USDT">Tether (USDT)</option>
              </select>
            </div>

            <Button 
              variant="outline" 
              onClick={() => {
                setFilterType('all');
                setFilterCurrency('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </Card>

        {/* Transactions List */}
        {filteredTransactions.length > 0 ? (
          <div className="transactions-list-container">
            {filteredTransactions.map((tx) => (
              <Card key={tx.transaction_id} className="transaction-card" data-testid="transaction-card">
                <div className="transaction-card-content">
                  <div className="transaction-icon-wrapper">
                    {tx.transaction_type === 'deposit' ? (
                      <div className="transaction-icon-bg deposit">
                        <BiArrowFromTop size={24} />
                      </div>
                    ) : (
                      <div className="transaction-icon-bg withdrawal">
                        <BiArrowToTop size={24} />
                      </div>
                    )}
                  </div>

                  <div className="transaction-info">
                    <div className="transaction-main">
                      <h3 className="transaction-type">
                        {tx.transaction_type.charAt(0).toUpperCase() + tx.transaction_type.slice(1)}
                      </h3>
                      <p className="transaction-id">ID: {tx.transaction_id.substring(0, 8)}...</p>
                    </div>
                    <p className="transaction-date">{formatDate(tx.created_at)}</p>
                    {tx.reference && (
                      <p className="transaction-reference">To: {tx.reference.substring(0, 10)}...{tx.reference.substring(tx.reference.length - 10)}</p>
                    )}
                  </div>

                  <div className="transaction-amount-wrapper">
                    <p className={`transaction-amount ${tx.transaction_type}`}>
                      {tx.transaction_type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                    </p>
                    <span className={`transaction-status ${getStatusColor(tx.status)}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="empty-state">
            <div className="empty-icon-wrapper">
              <BiArrowFromTop size={48} className="empty-icon" />
            </div>
            <h3>No Transactions Found</h3>
            <p>
              {filterType !== 'all' || filterCurrency !== 'all'
                ? 'Try adjusting your filters'
                : 'Make your first deposit to get started'}
            </p>
            {filterType === 'all' && filterCurrency === 'all' && (
              <Button onClick={() => navigate('/wallet')}>
                Go to Wallet
              </Button>
            )}
          </Card>
        )}
      </div>
    </Layout>
  );
}
