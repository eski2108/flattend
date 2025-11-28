import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import API_BASE_URL from '@/config/api';

const API = API_BASE_URL;

export default function SavingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingsBalances, setSavingsBalances] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferDirection, setTransferDirection] = useState('to_savings'); // or 'to_spot'
  const [selectedCurrency, setSelectedCurrency] = useState('BTC');
  const [transferAmount, setTransferAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchSavings();
  }, []);

  const fetchSavings = async () => {
    try {
      const userData = localStorage.getItem('cryptobank_user');
      if (!userData) {
        navigate('/login');
        return;
      }
      const user = JSON.parse(userData);
      const userId = user.user_id;

      const response = await axios.get(`${API}/api/savings/balances/${userId}`);
      if (response.data.success) {
        setSavingsBalances(response.data.balances);
        setTotalValue(response.data.total_value_usd);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching savings:', error);
      toast.error('Failed to load savings');
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    try {
      if (!transferAmount || parseFloat(transferAmount) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      setProcessing(true);
      const userData = localStorage.getItem('cryptobank_user');
      const user = JSON.parse(userData);
      const userId = user.user_id;

      const response = await axios.post(`${API}/api/savings/transfer`, {
        user_id: userId,
        currency: selectedCurrency,
        amount: parseFloat(transferAmount),
        direction: transferDirection
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setShowTransferModal(false);
        setTransferAmount('');
        fetchSavings(); // Refresh balances
      } else {
        toast.error(response.data.message || 'Transfer failed');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error(error.response?.data?.message || 'Transfer failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ minHeight: '100vh', background: '#0B0E13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#FFF' }}>Loading savings...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ minHeight: '100vh', background: '#0B0E13', padding: '2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#FFF', marginBottom: '0.5rem' }}>
            Crypto Savings
          </h1>
          <p style={{ color: '#A8A8A8' }}>
            Store your crypto safely and track your portfolio performance
          </p>
        </div>

        {/* Total Savings Card */}
        <div style={{
          background: 'linear-gradient(135deg, #11141A 0%, #1A1D26 100%)',
          border: '2px solid #00E0FF',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#A8A8A8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Total Savings Balance
          </div>
          <div style={{ fontSize: '3rem', fontWeight: '900', color: '#00F6FF', marginBottom: '1rem' }}>
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <button
            onClick={() => {
              setTransferDirection('to_savings');
              setShowTransferModal(true);
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #00E0FF, #7A3CFF)',
              color: '#FFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '700',
              cursor: 'pointer',
              marginRight: '1rem'
            }}
          >
            Transfer to Savings
          </button>
          <button
            onClick={() => {
              setTransferDirection('to_spot');
              setShowTransferModal(true);
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #A855F7, #8B5CF6)',
              color: '#FFF',
              border: 'none',
              borderRadius: '12px',
              fontSize: '0.875rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(168, 85, 247, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(168, 85, 247, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.4)';
            }}
          >
            ← Move Back to Wallet
          </button>
        </div>

        {/* Savings Balances */}
        {savingsBalances.length === 0 ? (
          <div style={{
            background: '#11141A',
            border: '1px solid rgba(0, 224, 255, 0.3)',
            borderRadius: '16px',
            padding: '3rem',
            textAlign: 'center'
          }}>
            <p style={{ color: '#A8A8A8', marginBottom: '1rem' }}>
              No savings yet. Transfer crypto from your Spot wallet to start saving!
            </p>
            <button
              onClick={() => {
                setTransferDirection('to_savings');
                setShowTransferModal(true);
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#00E0FF',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Start Saving
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {savingsBalances.map((saving, index) => {
              const isProfit = saving.unrealized_pl_usd >= 0;
              return (
                <div
                  key={index}
                  style={{
                    background: '#11141A',
                    border: '1px solid rgba(0, 224, 255, 0.3)',
                    borderRadius: '16px',
                    padding: '1.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#FFF' }}>
                        {saving.currency}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#A8A8A8' }}>
                        {saving.amount?.toFixed(8)} {saving.currency}
                      </div>
                    </div>
                    {isProfit ? (
                      <TrendingUp size={32} style={{ color: '#22C55E' }} />
                    ) : (
                      <TrendingDown size={32} style={{ color: '#EF4444' }} />
                    )}
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#A8A8A8', marginBottom: '0.25rem' }}>
                      Current Value
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#00F6FF' }}>
                      ${saving.current_value_usd?.toFixed(2)}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#A8A8A8' }}>Avg Buy Price</div>
                      <div style={{ fontSize: '0.875rem', color: '#FFF' }}>
                        ${saving.avg_buy_price?.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#A8A8A8' }}>Current Price</div>
                      <div style={{ fontSize: '0.875rem', color: '#FFF' }}>
                        ${saving.current_price?.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    padding: '0.75rem',
                    background: isProfit ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '8px',
                    border: `1px solid ${isProfit ? '#22C55E' : '#EF4444'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#A8A8A8', marginBottom: '0.25rem' }}>
                          Unrealized P/L
                        </div>
                        <div style={{ fontSize: '1.125rem', fontWeight: '700', color: isProfit ? '#22C55E' : '#EF4444' }}>
                          {isProfit ? '+' : ''} ${saving.unrealized_pl_usd?.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: isProfit ? '#22C55E' : '#EF4444' }}>
                        {isProfit ? '+' : ''}{saving.unrealized_pl_percent?.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Transfer Modal */}
        {showTransferModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}>
            <div style={{
              background: '#11141A',
              border: '2px solid #00E0FF',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#FFF', marginBottom: '1.5rem' }}>
                {transferDirection === 'to_savings' ? (
                  <>
                    <ArrowUpRight style={{ display: 'inline', marginRight: '0.5rem' }} />
                    Transfer to Savings
                  </>
                ) : (
                  <>
                    <ArrowDownLeft style={{ display: 'inline', marginRight: '0.5rem' }} />
                    Move Back to Wallet
                  </>
                )}
              </h2>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.875rem', color: '#A8A8A8', display: 'block', marginBottom: '0.5rem' }}>
                  Currency
                </label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1A1D26',
                    border: '1px solid #00E0FF',
                    borderRadius: '8px',
                    color: '#FFF',
                    fontSize: '1rem'
                  }}
                >
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="ETH">Ethereum (ETH)</option>
                  <option value="USDT">Tether (USDT)</option>
                  <option value="BNB">BNB</option>
                  <option value="SOL">Solana (SOL)</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: '#A8A8A8', display: 'block', marginBottom: '0.5rem' }}>
                  Amount
                </label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1A1D26',
                    border: '1px solid #00E0FF',
                    borderRadius: '8px',
                    color: '#FFF',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={handleTransfer}
                  disabled={processing}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: processing ? '#666' : 'linear-gradient(135deg, #00E0FF, #7A3CFF)',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '700',
                    cursor: processing ? 'not-allowed' : 'pointer'
                  }}
                >
                  {processing ? 'Processing...' : 'Confirm Transfer'}
                </button>
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferAmount('');
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#FFF',
                    border: '1px solid #00E0FF',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </Layout>
  );
}
