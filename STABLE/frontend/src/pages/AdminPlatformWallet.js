import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { IoAdd, IoCopy, IoRefresh as RefreshCw, IoTrendingDown as TrendingDown, IoTrendingUp as TrendingUp, IoWallet as Wallet } from 'react-icons/io5';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminPlatformWallet() {
  const [balances, setBalances] = useState({});
  const [totalGBPEquivalent, setTotalGBPEquivalent] = useState(0);
  const [stats, setStats] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [depositAddresses, setDepositAddresses] = useState({});
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpForm, setTopUpForm] = useState({ amount: '', currency: 'USDT', notes: '' });
  const [loading, setLoading] = useState(false);

  const supportedCoins = [
    { symbol: 'BTC', name: 'Bitcoin', icon: '₿' },
    { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ' },
    { symbol: 'USDT', name: 'Tether', icon: '₮' },
    { symbol: 'BNB', name: 'Binance Coin', icon: 'B' },
    { symbol: 'SOL', name: 'Solana', icon: 'S' },
    { symbol: 'XRP', name: 'Ripple', icon: 'X' },
    { symbol: 'LTC', name: 'Litecoin', icon: 'Ł' }
  ];

  useEffect(() => {
    fetchWalletData();
    fetchDepositAddresses();
    const interval = setInterval(fetchWalletData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchWalletData = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/admin/platform-wallet/balance`);
      if (response.data.success) {
        setBalances(response.data.balances);
        setTotalGBPEquivalent(response.data.total_gbp_equivalent);
        setStats(response.data.stats);
        setWarnings(response.data.active_warnings || []);
      }
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
    }
  };

  const fetchDepositAddresses = async () => {
    try {
      const addresses = {};
      for (const coin of supportedCoins) {
        const response = await axios.get(`${BACKEND_URL}/api/admin/platform-wallet/deposit-address/${coin.symbol}`);
        if (response.data.success) {
          addresses[coin.symbol] = response.data.address;
        }
      }
      setDepositAddresses(addresses);
    } catch (error) {
      console.error('Failed to fetch deposit addresses:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/admin/platform-wallet/transactions?limit=50`);
      if (response.data.success) {
        setTransactions(response.data.transactions);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const handleManualTopUp = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${BACKEND_URL}/api/admin/platform-wallet/top-up`, {
        amount: parseFloat(topUpForm.amount),
        currency: topUpForm.currency,
        admin_user_id: 'ADMIN',
        notes: topUpForm.notes
      });

      if (response.data.success) {
        toast.success(`Platform wallet topped up with ${topUpForm.amount} ${topUpForm.currency}`);
        setShowTopUpModal(false);
        setTopUpForm({ amount: '', currency: 'USDT', notes: '' });
        fetchWalletData();
        fetchTransactions();
      }
    } catch (error) {
      console.error('Failed to top up wallet:', error);
      toast.error('Failed to top up wallet');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Address copied to clipboard!');
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#00F0FF', marginBottom: '0.5rem' }}>
          Admin Top-Up Wallet
        </h1>
        <p style={{ color: '#888', fontSize: '14px' }}>
          Central treasury for all platform operations: referral bonuses, commissions, liquidity, fees
        </p>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          {warnings.map((warning) => (
            <div
              key={warning.warning_id}
              style={{
                padding: '1rem 1.5rem',
                background: warning.level === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 146, 60, 0.1)',
                border: `2px solid ${warning.level === 'critical' ? '#EF4444' : '#FB923C'}`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '0.75rem'
              }}
            >
              <AlertTriangle size={24} color={warning.level === 'critical' ? '#EF4444' : '#FB923C'} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: '700', color: warning.level === 'critical' ? '#EF4444' : '#FB923C' }}>
                  {warning.level === 'critical' ? 'CRITICAL' : 'WARNING'}: Low Balance Alert
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '14px', color: '#E2E8F0' }}>
                  {warning.currency} balance: {warning.balance} (£{warning.gbp_equivalent?.toFixed(2)} equivalent)
                </p>
              </div>
              <button
                onClick={() => toast.info('Top up required')}
                style={{
                  padding: '0.5rem 1rem',
                  background: warning.level === 'critical' ? '#EF4444' : '#FB923C',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Top Up Now
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Total Balance Overview */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(168, 85, 247, 0.15))',
        border: '2px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '16px',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, color: '#888', fontSize: '14px', fontWeight: '600' }}>
              Total Platform Balance
            </p>
            <h2 style={{ margin: '0.5rem 0 0', fontSize: '36px', fontWeight: '900', color: '#00F0FF' }}>
              £{totalGBPEquivalent.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <p style={{ margin: '0.5rem 0 0', color: '#888', fontSize: '13px' }}>
              GBP Equivalent • Updated every 30 seconds
            </p>
          </div>
          <button
            onClick={() => setShowTopUpModal(true)}
            style={{
              padding: '1rem 2rem',
              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
              border: 'none',
              borderRadius: '12px',
              color: '#000',
              fontWeight: '900',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <IoAdd size={20} />
            Manual Top-Up
          </button>
        </div>
      </div>

      {/* Coin Balances Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginBottom: '3rem'
      }}>
        {supportedCoins.map((coin) => {
          const balance = balances[coin.symbol] || 0;
          const isLow = balance < 10; // Simple threshold for demo
          
          return (
            <div
              key={coin.symbol}
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: `2px solid ${isLow ? '#EF4444' : 'rgba(0, 240, 255, 0.2)'}`,
                borderRadius: '12px',
                padding: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: '900'
                }}>
                  {coin.icon}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#E2E8F0' }}>
                    {coin.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                    {coin.symbol}
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <p style={{ margin: 0, fontSize: '28px', fontWeight: '900', color: isLow ? '#EF4444' : '#00F0FF' }}>
                  {balance.toLocaleString('en-GB', { minimumFractionDigits: 4, maximumFractionDigits: 8 })}
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '12px', color: '#888' }}>
                  {coin.symbol} Available
                </p>
              </div>

              {depositAddresses[coin.symbol] && (
                <div style={{
                  background: 'rgba(0, 240, 255, 0.05)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  marginBottom: '1rem'
                }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '11px', color: '#888', fontWeight: '600' }}>
                    DEPOSIT ADDRESS:
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <p style={{
                      margin: 0,
                      fontSize: '11px',
                      color: '#00F0FF',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                      flex: 1
                    }}>
                      {depositAddresses[coin.symbol]}
                    </p>
                    <button
                      onClick={() => copyToClipboard(depositAddresses[coin.symbol])}
                      style={{
                        background: 'rgba(0, 240, 255, 0.2)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <IoCopy size={14} color="#00F0FF" />
                    </button>
                  </div>
                </div>
              )}

              {isLow && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <AlertTriangle size={14} color="#EF4444" />
                  <span style={{ fontSize: '12px', color: '#EF4444', fontWeight: '600' }}>
                    Low Balance - Top Up Required
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Usage Statistics */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(0, 240, 255, 0.2)',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{ margin: '0 0 1.5rem', fontSize: '20px', fontWeight: '700', color: '#00F0FF' }}>
          Platform Wallet Usage
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: '#888', fontWeight: '600', textTransform: 'uppercase' }}>
              Referral Payouts
            </p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '24px', fontWeight: '900', color: '#22C55E' }}>
              £{(stats.total_referral_payouts?.[0]?.total || 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: '#888', fontWeight: '600', textTransform: 'uppercase' }}>
              Bonus Payouts
            </p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '24px', fontWeight: '900', color: '#A855F7' }}>
              £{(stats.total_bonus_payouts?.[0]?.total || 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: '#888', fontWeight: '600', textTransform: 'uppercase' }}>
              Liquidity Deployed
            </p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '24px', fontWeight: '900', color: '#3B82F6' }}>
              ${Object.values(stats.total_liquidity || {}).reduce((a, b) => a + b, 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: '#888', fontWeight: '600', textTransform: 'uppercase' }}>
              Withdrawal Fees Collected
            </p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '24px', fontWeight: '900', color: '#00F0FF' }}>
              3% on All Withdrawals
            </p>
          </div>
        </div>
      </div>

      {/* Information Box */}
      <div style={{
        background: 'rgba(0, 240, 255, 0.05)',
        border: '1px solid rgba(0, 240, 255, 0.2)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginTop: '2rem'
      }}>
        <h4 style={{ margin: '0 0 1rem', color: '#00F0FF', fontSize: '16px', fontWeight: '700' }}>
          💡 Admin Top-Up Wallet Powers Everything
        </h4>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#888', fontSize: '14px', lineHeight: '1.8' }}>
          <li>Paying £20 referral bonuses when users top up ≥£150</li>
          <li>Paying 20% lifetime commissions to referrers</li>
          <li>Receiving all 3% withdrawal fees automatically</li>
          <li>Funding trading liquidity for Spot Trading</li>
          <li>Funding P2P Express Buy liquidity</li>
          <li>All internal platform operations and payouts</li>
        </ul>
        <p style={{ margin: '1rem 0 0', color: '#888', fontSize: '13px' }}>
          🔒 <strong>Privacy:</strong> This wallet is completely private. No user can ever see these balances.
          Only visible in Admin Dashboard.
        </p>
      </div>

      {/* Manual Top-Up Modal */}
      {showTopUpModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowTopUpModal(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #0F172A, #1E293B)',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '24px', fontWeight: '900', color: '#00F0FF' }}>
              Manual Top-Up
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '14px', fontWeight: '600' }}>
                Currency
              </label>
              <select
                value={topUpForm.currency}
                onChange={(e) => setTopUpForm({ ...topUpForm, currency: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              >
                {supportedCoins.map(coin => (
                  <option key={coin.symbol} value={coin.symbol}>{coin.name} ({coin.symbol})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '14px', fontWeight: '600' }}>
                Amount
              </label>
              <input
                type="number"
                step="0.00000001"
                value={topUpForm.amount}
                onChange={(e) => setTopUpForm({ ...topUpForm, amount: e.target.value })}
                placeholder="Enter amount"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '14px', fontWeight: '600' }}>
                Notes (Optional)
              </label>
              <textarea
                value={topUpForm.notes}
                onChange={(e) => setTopUpForm({ ...topUpForm, notes: e.target.value })}
                placeholder="Add notes about this top-up..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowTopUpModal(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleManualTopUp}
                disabled={loading || !topUpForm.amount}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: loading ? '#666' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#000',
                  fontWeight: '900',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Processing...' : 'Top Up Wallet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
