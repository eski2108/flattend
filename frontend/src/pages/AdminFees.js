import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import Layout from '../components/Layout';
import { DollarSign, IoCash, IoSend, IoSettings, IoTrendingUp, IoWallet, Send, Settings, Wallet } from 'react-icons/io5';
import './AdminFees.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function AdminFees() {
  const [adminBalance, setAdminBalance] = useState({});
  const [feeSettings, setFeeSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [payoutModal, setPayoutModal] = useState(false);
  const [editFeeModal, setEditFeeModal] = useState(false);
  
  const [payoutData, setPayoutData] = useState({
    currency: 'BTC',
    amount: '',
    external_address: ''
  });
  
  const [externalWallets, setExternalWallets] = useState({});
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletFormData, setWalletFormData] = useState({});
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [confirmModal, setConfirmModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [txHash, setTxHash] = useState('');
  
  const [editFeeData, setEditFeeData] = useState({
    fee_type: '',
    value: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch admin wallet balance
      const balanceRes = await axios.get(`${API}/admin/wallet/balance`);
      if (balanceRes.data.success) {
        setAdminBalance(balanceRes.data);
      }
      
      // Fetch fee settings
      const feeRes = await axios.get(`${API}/admin/fee-settings`);
      if (feeRes.data.success) {
        setFeeSettings(feeRes.data.fees);
      }
      
      // Fetch saved external wallets
      const walletsRes = await axios.get(`${API}/admin/external-wallets`);
      if (walletsRes.data.success) {
        setExternalWallets(walletsRes.data.wallets);
        setWalletFormData(walletsRes.data.wallets);
      }
      
      // Fetch pending payouts
      const pendingRes = await axios.get(`${API}/admin/pending-payouts`);
      if (pendingRes.data.success) {
        setPendingPayouts(pendingRes.data.pending_payouts);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFee = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(`${API}/admin/update-fee`, editFeeData);
      
      if (response.data.success) {
        toast.success(response.data.message);
        setEditFeeModal(false);
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update fee');
    }
  };

  const handleSaveWallets = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(`${API}/admin/save-external-wallet`, {
        wallets: walletFormData
      });
      
      if (response.data.success) {
        toast.success('External wallet addresses saved!');
        setExternalWallets(walletFormData);
        setShowWalletModal(false);
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save wallet addresses');
    }
  };

  const handlePayout = async (e) => {
    e.preventDefault();
    
    // Use saved wallet address if available
    const addressToUse = payoutData.external_address || externalWallets[payoutData.currency];
    
    if (!addressToUse) {
      toast.error('Please save your external wallet address first or enter one manually');
      return;
    }
    
    try {
      const response = await axios.post(`${API}/admin/wallet/payout`, {
        ...payoutData,
        external_address: addressToUse
      });
      
      if (response.data.success) {
        toast.success('Payout request created! Now send crypto manually from your wallet.');
        setPayoutModal(false);
        setPayoutData({ currency: 'BTC', amount: '', external_address: '' });
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Payout failed');
    }
  };

  const handleConfirmPayout = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(`${API}/admin/confirm-payout`, {
        transaction_id: selectedPayout.transaction_id,
        tx_hash: txHash
      });
      
      if (response.data.success) {
        toast.success('Payout confirmed!');
        setConfirmModal(false);
        setTxHash('');
        setSelectedPayout(null);
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to confirm payout');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="admin-fees-container">
          <p style={{ color: '#fff', textAlign: 'center' }}>Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="admin-fees-container">
        <div className="admin-fees-header">
          <h1 className="page-title">
            <IoWallet size={32} />
            Admin Fee Management
          </h1>
          <p className="page-subtitle">Manage platform fees and admin wallet</p>
        </div>

        {/* Admin Wallet Balance */}
        <div className="admin-wallet-section">
          <div className="section-header">
            <h2>
              <IoCash size={24} />
              Admin Wallet Balance
            </h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="wallet-settings-btn"
                onClick={() => setShowWalletModal(true)}
              >
                <IoSettings size={18} />
                Manage Wallet Addresses
              </button>
              <button 
                className="payout-btn"
                onClick={() => setPayoutModal(true)}
              >
                <IoSend size={18} />
                Withdraw to External Wallet
              </button>
            </div>
          </div>

          <div className="balance-grid">
            <div className="total-value-card">
              <div className="value-label">Total Value (USD)</div>
              <div className="value-amount">${(adminBalance.total_value_usd || 0).toLocaleString()}</div>
            </div>

            {adminBalance.balances && Object.entries(adminBalance.balances).map(([currency, balance]) => (
              <div key={currency} className="balance-card">
                <div className="currency-name">{currency}</div>
                <div className="currency-amount">{parseFloat(balance).toFixed(8)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Payouts */}
        {pendingPayouts.length > 0 && (
          <div className="pending-payouts-section" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', border: '1px solid rgba(245, 158, 11, 0.5)' }}>
            <div className="section-header">
              <h2 style={{ color: '#fff' }}>
                ⚠️ Pending Manual Payouts ({pendingPayouts.length})
              </h2>
            </div>

            <div style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              These payouts have been deducted from the admin wallet. Send crypto manually from YOUR wallet, then mark as completed.
            </div>

            <div className="pending-payouts-list">
              {pendingPayouts.map((payout, index) => (
                <div key={index} className="pending-payout-card">
                  <div className="payout-info">
                    <div className="payout-amount">{payout.amount} {payout.currency}</div>
                    <div className="payout-address">To: {payout.external_address}</div>
                    <div className="payout-date">Created: {new Date(payout.created_at).toLocaleString()}</div>
                  </div>
                  <button
                    className="confirm-payout-btn"
                    onClick={() => {
                      setSelectedPayout(payout);
                      setConfirmModal(true);
                    }}
                  >
                    Mark as Sent
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fee Settings */}
        <div className="fee-settings-section">
          <div className="section-header">
            <h2>
              <IoSettings size={24} />
              Platform Fee Settings
            </h2>
          </div>

          <div className="fee-settings-grid">
            <div className="fee-card">
              <div className="fee-card-header">
                <div className="fee-name">P2P Trade Fee</div>
                <div className="fee-value">{feeSettings.p2p_trade_fee_percent || 1}%</div>
              </div>
              <div className="fee-description">Collected from seller on each P2P trade</div>
              <button 
                className="edit-fee-btn"
                onClick={() => {
                  setEditFeeData({ fee_type: 'p2p_trade_fee_percent', value: feeSettings.p2p_trade_fee_percent || 1 });
                  setEditFeeModal(true);
                }}
              >
                Edit
              </button>
            </div>

            <div className="fee-card">
              <div className="fee-card-header">
                <div className="fee-name">Withdrawal Fee</div>
                <div className="fee-value">{feeSettings.withdraw_fee_percent || 1}%</div>
              </div>
              <div className="fee-description">Applied on crypto withdrawals</div>
              <button 
                className="edit-fee-btn"
                onClick={() => {
                  setEditFeeData({ fee_type: 'withdraw_fee_percent', value: feeSettings.withdraw_fee_percent || 1 });
                  setEditFeeModal(true);
                }}
              >
                Edit
              </button>
            </div>

            <div className="fee-card">
              <div className="fee-card-header">
                <div className="fee-name">Deposit Fee</div>
                <div className="fee-value">{feeSettings.deposit_fee_percent || 0.5}%</div>
              </div>
              <div className="fee-description">Optional deposit fee</div>
              <button 
                className="edit-fee-btn"
                onClick={() => {
                  setEditFeeData({ fee_type: 'deposit_fee_percent', value: feeSettings.deposit_fee_percent || 0.5 });
                  setEditFeeModal(true);
                }}
              >
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Recent Fee Transactions */}
        <div className="recent-fees-section">
          <h2>
            <IoTrendingUp size={24} />
            Recent Fee Collections
          </h2>

          <div className="transactions-list">
            {adminBalance.recent_fee_transactions && adminBalance.recent_fee_transactions.length > 0 ? (
              adminBalance.recent_fee_transactions.map((tx, index) => (
                <div key={index} className="transaction-item">
                  <div className="tx-type">{tx.transaction_type.replace('_', ' ').toUpperCase()}</div>
                  <div className="tx-amount">+{tx.amount} {tx.currency}</div>
                  <div className="tx-date">{new Date(tx.created_at).toLocaleString()}</div>
                </div>
              ))
            ) : (
              <p style={{ color: '#888', textAlign: 'center' }}>No recent fee transactions</p>
            )}
          </div>
        </div>

        {/* Payout Modal */}
        {payoutModal && (
          <div className="modal-overlay" onClick={() => setPayoutModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Withdraw to External Wallet</h3>
                <button onClick={() => setPayoutModal(false)}>&times;</button>
              </div>

              <form onSubmit={handlePayout}>
                <div className="form-group">
                  <label>Currency</label>
                  <select
                    value={payoutData.currency}
                    onChange={(e) => setPayoutData({...payoutData, currency: e.target.value})}
                    required
                  >
                    {adminBalance.balances && Object.keys(adminBalance.balances).map(curr => (
                      <option key={curr} value={curr}>{curr}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={payoutData.amount}
                    onChange={(e) => setPayoutData({...payoutData, amount: e.target.value})}
                    placeholder="0.00000000"
                    required
                  />
                  <div className="available-balance">
                    Available: {adminBalance.balances?.[payoutData.currency] || 0} {payoutData.currency}
                  </div>
                </div>

                <div className="form-group">
                  <label>Your External Wallet Address</label>
                  <input
                    type="text"
                    value={payoutData.external_address}
                    onChange={(e) => setPayoutData({...payoutData, external_address: e.target.value})}
                    placeholder="Enter your personal wallet address"
                    required
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" onClick={() => setPayoutModal(false)} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    <IoSend size={18} />
                    Send Payout
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirm Payout Modal */}
        {confirmModal && selectedPayout && (
          <div className="modal-overlay" onClick={() => setConfirmModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Confirm Manual Payout</h3>
                <button onClick={() => setConfirmModal(false)}>&times;</button>
              </div>

              <div className="info-box" style={{ marginBottom: '1.5rem', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                <p style={{ color: '#F59E0B', fontSize: '0.9rem', margin: 0 }}>
                  ⚠️ Make sure you've sent <strong>{selectedPayout.amount} {selectedPayout.currency}</strong> to <strong>{selectedPayout.external_address}</strong> from YOUR personal wallet before confirming.
                </p>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div style={{ color: '#8B9DC3', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Amount:</div>
                <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                  {selectedPayout.amount} {selectedPayout.currency}
                </div>
                
                <div style={{ color: '#8B9DC3', fontSize: '0.85rem', marginBottom: '0.5rem' }}>To Address:</div>
                <div style={{ color: '#00D9FF', fontSize: '0.9rem', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {selectedPayout.external_address}
                </div>
              </div>

              <form onSubmit={handleConfirmPayout}>
                <div className="form-group">
                  <label>Blockchain Transaction Hash (Optional)</label>
                  <input
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="Paste TX hash from your wallet (e.g., 0x123... or tx123...)"
                  />
                  <div style={{ fontSize: '0.8rem', color: '#8B9DC3', marginTop: '0.5rem' }}>
                    Enter the transaction hash from your wallet to keep a record
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" onClick={() => setConfirmModal(false)} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                    Confirm I Sent This
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Wallet Management Modal */}
        {showWalletModal && (
          <div className="modal-overlay" onClick={() => setShowWalletModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Manage External Wallet Addresses</h3>
                <button onClick={() => setShowWalletModal(false)}>&times;</button>
              </div>

              <div className="info-box" style={{ marginBottom: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <p style={{ color: '#10B981', fontSize: '0.9rem', margin: 0 }}>
                  💡 Save your external wallet addresses here. When you withdraw fees, they'll be sent to these addresses automatically.
                </p>
              </div>

              <form onSubmit={handleSaveWallets}>
                {['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL'].map(currency => (
                  <div key={currency} className="form-group">
                    <label>{currency} Wallet Address</label>
                    <input
                      type="text"
                      value={walletFormData[currency] || ''}
                      onChange={(e) => setWalletFormData({...walletFormData, [currency]: e.target.value})}
                      placeholder={`Enter your ${currency} wallet address`}
                    />
                    {externalWallets[currency] && (
                      <div style={{ fontSize: '0.8rem', color: '#10B981', marginTop: '0.25rem' }}>
                        ✓ Saved
                      </div>
                    )}
                  </div>
                ))}

                <div className="modal-actions">
                  <button type="button" onClick={() => setShowWalletModal(false)} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    Save Wallet Addresses
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Fee Modal */}
        {editFeeModal && (
          <div className="modal-overlay" onClick={() => setEditFeeModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Update Fee Percentage</h3>
                <button onClick={() => setEditFeeModal(false)}>&times;</button>
              </div>

              <form onSubmit={handleUpdateFee}>
                <div className="form-group">
                  <label>Fee Type</label>
                  <input
                    type="text"
                    value={editFeeData.fee_type.replace('_', ' ').toUpperCase()}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label>New Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={editFeeData.value}
                    onChange={(e) => setEditFeeData({...editFeeData, value: e.target.value})}
                    placeholder="1.5"
                    required
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" onClick={() => setEditFeeModal(false)} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    Update Fee
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
