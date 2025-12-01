import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { IoCash as DollarSign, IoLockClosed, IoRefresh, IoTrendingUp, IoWallet } from 'react-icons/io5';
import { BiArrowToTop } from 'react-icons/bi';;
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function TraderBalance() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [balances, setBalances] = useState([]);
  const [totalUSD, setTotalUSD] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUser(user);
      loadBalances(user.user_id);
    } else {
      navigate('/login');
    }
  }, []);

  const loadBalances = async (userId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/trader/my-balances/${userId}`);
      
      if (response.data.success) {
        setBalances(response.data.balances || []);
        setTotalUSD(response.data.total_usd_estimate || 0);
      }
    } catch (error) {
      console.error('Load balances error:', error);
      toast.error('Failed to load balances');
    } finally {
      setLoading(false);
    }
  };

  const getCurrencyIcon = (currency) => {
    switch(currency) {
      case 'BTC': return '₿';
      case 'ETH': return 'Ξ';
      case 'USDT': return '$';
      default: return '●';
    }
  };

  const getCurrencyColor = (currency) => {
    switch(currency) {
      case 'BTC': return '#F7931A';
      case 'ETH': return '#627EEA';
      case 'USDT': return '#26A17B';
      default: return '#00F0FF';
    }
  };

  return (
    <Layout>
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{
                fontSize: '2.5rem',
                fontWeight: '800',
                background: 'linear-gradient(135deg, var(--electric-cyan) 0%, var(--neon-purple) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '0.5rem'
              }}>
                My Trading Balance
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                View your available crypto for P2P trading
              </p>
            </div>
            
            <button
              onClick={() => loadBalances(currentUser?.user_id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              <IoRefresh size={18} />
              Refresh
            </button>
          </div>
        </div>

        {/* Total Value Card */}
        <Card style={{
          padding: '2rem',
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
          border: '2px solid var(--electric-cyan)',
          borderRadius: '16px',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '0.5rem' }}>
                Total Portfolio Value
              </p>
              <h2 style={{ 
                fontSize: '3rem', 
                fontWeight: '700', 
                color: 'var(--electric-cyan)',
                marginBottom: '0.5rem'
              }}>
                ${totalUSD.toLocaleString()}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Estimated USD value
              </p>
            </div>
            
            <button
              onClick={() => navigate('/wallet')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1rem 2rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--electric-cyan) 0%, var(--neon-cyan) 100%)',
                color: '#000000',
                cursor: 'pointer',
                fontSize: '1.1rem',
                fontWeight: '700'
              }}
            >
              <BiArrowToTop size={20} />
              Deposit Crypto
            </button>
          </div>
        </Card>

        {/* Balances Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Loading balances...</p>
          </div>
        ) : balances.length === 0 ? (
          <Card style={{
            padding: '3rem',
            textAlign: 'center',
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '16px'
          }}>
            <IoWallet size={64} style={{ color: 'var(--text-secondary)', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              No Balances Yet
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Deposit crypto to start trading on the P2P marketplace
            </p>
            <button
              onClick={() => navigate('/wallet')}
              style={{
                padding: '0.75rem 2rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--electric-cyan) 0%, var(--neon-cyan) 100%)',
                color: '#000000',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '700'
              }}
            >
              Make Your First Deposit
            </button>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {balances.map((balance, index) => (
              <Card key={index} style={{
                padding: '1.5rem',
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                transition: 'all 0.3s ease'
              }}>
                {/* Currency Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: `${getCurrencyColor(balance.currency)}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      color: getCurrencyColor(balance.currency)
                    }}>
                      {getCurrencyIcon(balance.currency)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {balance.currency}
                      </h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {balance.currency === 'BTC' ? 'Bitcoin' : balance.currency === 'ETH' ? 'Ethereum' : 'Tether USD'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Balance Breakdown */}
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {/* Total Balance */}
                  <div style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    background: 'rgba(0, 240, 255, 0.05)',
                    border: '1px solid rgba(0, 240, 255, 0.2)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <IoWallet size={16} style={{ color: 'var(--electric-cyan)' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Balance</span>
                      </div>
                      <span style={{ 
                        fontSize: '1.2rem', 
                        fontWeight: '700', 
                        color: 'var(--electric-cyan)'
                      }}>
                        {balance.total_balance?.toFixed(8)} {balance.currency}
                      </span>
                    </div>
                  </div>

                  {/* Locked Balance */}
                  <div style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 165, 0, 0.05)',
                    border: '1px solid rgba(255, 165, 0, 0.2)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <IoLockClosed size={16} style={{ color: 'var(--warning)' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Locked (In Trades)</span>
                      </div>
                      <span style={{ 
                        fontSize: '1.2rem', 
                        fontWeight: '700', 
                        color: 'var(--warning)'
                      }}>
                        {balance.locked_balance?.toFixed(8)} {balance.currency}
                      </span>
                    </div>
                  </div>

                  {/* Available Balance */}
                  <div style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.05)',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <IoTrendingUp size={16} style={{ color: 'var(--success)' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Available to Trade</span>
                      </div>
                      <span style={{ 
                        fontSize: '1.2rem', 
                        fontWeight: '700', 
                        color: 'var(--success)'
                      }}>
                        {balance.available_balance?.toFixed(8)} {balance.currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Last Updated */}
                <div style={{ 
                  marginTop: '1rem', 
                  paddingTop: '1rem', 
                  borderTop: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)'
                }}>
                  Last updated: {new Date(balance.last_updated).toLocaleString()}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Info Box */}
        <Card style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'rgba(168, 85, 247, 0.05)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          borderRadius: '12px'
        }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--neon-purple)', marginBottom: '0.75rem' }}>
            ℹ️ About Your Trading Balance
          </h4>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
            <li><strong>Total Balance:</strong> All crypto you have deposited to the platform</li>
            <li><strong>Locked:</strong> Amount currently in active P2P trades (escrow)</li>
            <li><strong>Available:</strong> Free balance you can use for new trades</li>
            <li>Deposits via NOWPayments automatically credit your trading balance</li>
            <li>Platform fees (1%) are deducted when you complete trades</li>
          </ul>
        </Card>
      </div>
    </Layout>
  );
}
