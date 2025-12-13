import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoCheckmarkCircle, IoCloseCircle, IoTime, IoWallet, IoArrowBack } from 'react-icons/io5';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import Layout from '@/components/Layout';
import CHXButton from '@/components/CHXButton';

const API = process.env.REACT_APP_BACKEND_URL;

export default function AdminWithdrawals() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState([]);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/admin/login');
      return;
    }
    
    const user = JSON.parse(userData);
    if (!user.is_admin) {
      toast.error('Access denied');
      navigate('/dashboard');
      return;
    }

    loadWithdrawals();
  }, [navigate]);

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      // Load all transactions with withdrawal type
      const response = await axios.get(`${API}/api/admin/withdrawals/pending`);
      
      if (response.data.success) {
        setWithdrawals(response.data.withdrawals || []);
      }
    } catch (error) {
      console.error('Failed to load withdrawals:', error);
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (withdrawal) => {
    if (!window.confirm(`Approve withdrawal of ${withdrawal.amount} ${withdrawal.currency} to ${withdrawal.withdrawal_address}?`)) {
      return;
    }

    setProcessing({ ...processing, [withdrawal.transaction_id]: true });
    try {
      const userData = JSON.parse(localStorage.getItem('cryptobank_user'));
      const response = await axios.post(`${API}/api/admin/withdrawals/review`, {
        withdrawal_id: withdrawal.transaction_id,
        admin_id: userData.user_id,
        action: 'approve',
        notes: 'Approved by admin'
      });

      if (response.data.success) {
        toast.success('Withdrawal approved! Please send the crypto manually.');
        loadWithdrawals(); // Reload list
      } else {
        toast.error(response.data.message || 'Failed to approve');
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast.error(error.response?.data?.message || 'Failed to approve withdrawal');
    } finally {
      setProcessing({ ...processing, [withdrawal.transaction_id]: false });
    }
  };

  const handleReject = async (withdrawal) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;

    setProcessing({ ...processing, [withdrawal.transaction_id]: true });
    try {
      const userData = JSON.parse(localStorage.getItem('cryptobank_user'));
      const response = await axios.post(`${API}/api/admin/withdrawals/review`, {
        withdrawal_id: withdrawal.transaction_id,
        admin_id: userData.user_id,
        action: 'reject',
        notes: reason
      });

      if (response.data.success) {
        toast.success('Withdrawal rejected. User balance restored.');
        loadWithdrawals();
      } else {
        toast.error(response.data.message || 'Failed to reject');
      }
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error(error.response?.data?.message || 'Failed to reject withdrawal');
    } finally {
      setProcessing({ ...processing, [withdrawal.transaction_id]: false });
    }
  };

  const handleMarkComplete = async (withdrawal) => {
    if (!window.confirm(`Mark withdrawal as completed? This confirms you've sent ${withdrawal.amount} ${withdrawal.currency} to the user.`)) {
      return;
    }

    setProcessing({ ...processing, [withdrawal.transaction_id]: true });
    try {
      const userData = JSON.parse(localStorage.getItem('cryptobank_user'));
      const response = await axios.post(`${API}/api/admin/withdrawals/complete/${withdrawal.transaction_id}`, {
        admin_id: userData.user_id
      });

      if (response.data.success) {
        toast.success('Withdrawal marked as completed!');
        loadWithdrawals();
      } else {
        toast.error(response.data.message || 'Failed to complete');
      }
    } catch (error) {
      console.error('Complete error:', error);
      toast.error(error.response?.data?.message || 'Failed to mark as complete');
    } finally {
      setProcessing({ ...processing, [withdrawal.transaction_id]: false });
    }
  };

  const getCoinColor = (currency) => {
    const colors = {
      'BTC': '#F7931A',
      'ETH': '#627EEA',
      'USDT': '#26A17B',
      'BNB': '#F3BA2F',
      'SOL': '#9945FF',
      'LTC': '#345D9D',
      'DOGE': '#C3A634',
      'GBP': '#00C6FF',
      'USD': '#85BB65',
      'EUR': '#003399'
    };
    return colors[currency] || '#00F0FF';
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { color: '#FBBF24', icon: <IoTime size={16} />, text: 'Pending' },
      'approved': { color: '#22C55E', icon: <IoCheckmarkCircle size={16} />, text: 'Approved' },
      'rejected': { color: '#EF4444', icon: <IoCloseCircle size={16} />, text: 'Rejected' },
      'completed': { color: '#10B981', icon: <IoCheckmarkCircle size={16} />, text: 'Completed' }
    };
    const badge = badges[status] || badges['pending'];
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 12px',
        borderRadius: '20px',
        background: `${badge.color}22`,
        border: `1px solid ${badge.color}`,
        color: badge.color,
        fontSize: '13px',
        fontWeight: '600'
      }}>
        {badge.icon}
        {badge.text}
      </div>
    );
  };

  const filteredWithdrawals = withdrawals.filter(w => {
    if (filter === 'all') return true;
    return w.status === filter;
  });

  if (loading) {
    return (
      <Layout>
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #05121F 0%, #071E2C 50%, #03121E 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ fontSize: '20px', color: '#00C6FF', fontWeight: '700' }}>Loading withdrawals...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #05121F 0%, #071E2C 50%, #03121E 100%)',
        padding: '24px 16px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={() => navigate('/admin/dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'transparent',
                border: '1px solid rgba(0, 198, 255, 0.3)',
                borderRadius: '12px',
                color: '#00C6FF',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '16px',
                transition: 'all 0.2s ease'
              }}
            >
              <IoArrowBack size={18} />
              Back to Admin Dashboard
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>Withdrawal Requests</h1>
              <CHXButton
                onClick={loadWithdrawals}
                coinColor="#00C6FF"
                variant="secondary"
                size="small"
              >
                Refresh
              </CHXButton>
            </div>
            <div style={{
              height: '2px',
              width: '100%',
              background: 'linear-gradient(90deg, #00C6FF 0%, transparent 100%)',
              boxShadow: '0 0 10px rgba(0, 198, 255, 0.5)'
            }} />
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #08192B 0%, #04101F 100%)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 0 18px rgba(251, 191, 36, 0.08)'
            }}>
              <div style={{ fontSize: '13px', color: '#A3AEC2', marginBottom: '8px' }}>Pending</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#FBBF24' }}>
                {withdrawals.filter(w => w.status === 'pending').length}
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #08192B 0%, #04101F 100%)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 0 18px rgba(34, 197, 94, 0.08)'
            }}>
              <div style={{ fontSize: '13px', color: '#A3AEC2', marginBottom: '8px' }}>Approved</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#22C55E' }}>
                {withdrawals.filter(w => w.status === 'approved').length}
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #08192B 0%, #04101F 100%)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 0 18px rgba(239, 68, 68, 0.08)'
            }}>
              <div style={{ fontSize: '13px', color: '#A3AEC2', marginBottom: '8px' }}>Rejected</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#EF4444' }}>
                {withdrawals.filter(w => w.status === 'rejected').length}
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #08192B 0%, #04101F 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 0 18px rgba(16, 185, 129, 0.08)'
            }}>
              <div style={{ fontSize: '13px', color: '#A3AEC2', marginBottom: '8px' }}>Completed</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#10B981' }}>
                {withdrawals.filter(w => w.status === 'completed').length}
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {['pending', 'approved', 'rejected', 'completed', 'all'].map(f => (
              <CHXButton
                key={f}
                onClick={() => setFilter(f)}
                coinColor="#00C6FF"
                variant={filter === f ? 'primary' : 'secondary'}
                size="small"
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </CHXButton>
            ))}
          </div>

          {/* Withdrawals List */}
          {filteredWithdrawals.length === 0 ? (
            <div style={{
              background: 'linear-gradient(135deg, #08192B 0%, #04101F 100%)',
              border: '1px solid rgba(0, 198, 255, 0.08)',
              borderRadius: '16px',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <IoWallet size={48} color="#A3AEC2" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: '18px', color: '#FFFFFF', fontWeight: '600', marginBottom: '8px' }}>No {filter} withdrawals</div>
              <div style={{ fontSize: '14px', color: '#A3AEC2' }}>There are no withdrawals with this status</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {filteredWithdrawals.map((withdrawal) => {
                const coinColor = getCoinColor(withdrawal.currency);
                const isProcessing = processing[withdrawal.transaction_id];

                return (
                  <div
                    key={withdrawal.transaction_id}
                    style={{
                      background: 'linear-gradient(135deg, #08192B 0%, #04101F 100%)',
                      border: `1px solid ${coinColor}22`,
                      borderRadius: '16px',
                      padding: '20px',
                      boxShadow: `0 0 18px ${coinColor}11`,
                      opacity: 0.94
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ flex: 1, minWidth: '250px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${coinColor}, ${coinColor}CC)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            fontWeight: '700',
                            color: '#FFFFFF',
                            boxShadow: `0 0 16px ${coinColor}66`
                          }}>
                            {withdrawal.currency}
                          </div>
                          <div>
                            <div style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF' }}>
                              {withdrawal.amount} {withdrawal.currency}
                            </div>
                            <div style={{ fontSize: '13px', color: '#A3AEC2' }}>
                              Fee: {withdrawal.fee} {withdrawal.currency} · Total: {(withdrawal.amount + withdrawal.fee).toFixed(8)}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: '13px', color: '#8F9BB3', marginTop: '8px' }}>
                          User ID: <span style={{ color: '#00C6FF', fontFamily: 'monospace' }}>{withdrawal.user_id}</span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#8F9BB3', marginTop: '4px' }}>
                          TX ID: <span style={{ color: '#A3AEC2', fontFamily: 'monospace', fontSize: '12px' }}>{withdrawal.transaction_id}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {getStatusBadge(withdrawal.status)}
                        <div style={{ fontSize: '12px', color: '#8F9BB3', marginTop: '8px' }}>
                          {new Date(withdrawal.created_at).toLocaleDateString()} {new Date(withdrawal.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    {/* Withdrawal Address */}
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '12px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ fontSize: '12px', color: '#A3AEC2', marginBottom: '4px' }}>Withdrawal Address</div>
                      <div style={{
                        fontSize: '13px',
                        color: '#FFFFFF',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all'
                      }}>
                        {withdrawal.withdrawal_address}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {withdrawal.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <CHXButton
                          onClick={() => handleApprove(withdrawal)}
                          disabled={isProcessing}
                          coinColor="#22C55E"
                          variant="primary"
                          size="medium"
                          icon={isProcessing ? <AiOutlineLoading3Quarters size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <IoCheckmarkCircle size={16} />}
                          style={{ flex: 1, minWidth: '150px' }}
                        >
                          {isProcessing ? 'Processing...' : 'Approve'}
                        </CHXButton>
                        <CHXButton
                          onClick={() => handleReject(withdrawal)}
                          disabled={isProcessing}
                          coinColor="#EF4444"
                          variant="secondary"
                          size="medium"
                          icon={<IoCloseCircle size={16} />}
                          style={{ flex: 1, minWidth: '150px' }}
                        >
                          Reject
                        </CHXButton>
                      </div>
                    )}

                    {withdrawal.status === 'approved' && (
                      <div style={{
                        background: 'rgba(34, 197, 94, 0.05)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '12px'
                      }}>
                        <div style={{ fontSize: '14px', color: '#22C55E', fontWeight: '600', marginBottom: '8px' }}>⚠️ Action Required</div>
                        <div style={{ fontSize: '13px', color: '#A3AEC2', marginBottom: '12px' }}>
                          This withdrawal is approved. Please send {withdrawal.amount} {withdrawal.currency} to the address above manually, then mark as completed.
                        </div>
                        <CHXButton
                          onClick={() => handleMarkComplete(withdrawal)}
                          disabled={isProcessing}
                          coinColor="#10B981"
                          variant="primary"
                          size="medium"
                          icon={isProcessing ? <AiOutlineLoading3Quarters size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <IoCheckmarkCircle size={16} />}
                        >
                          {isProcessing ? 'Processing...' : 'Mark as Completed'}
                        </CHXButton>
                      </div>
                    )}

                    {withdrawal.notes && (
                      <div style={{
                        fontSize: '13px',
                        color: '#8F9BB3',
                        padding: '8px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        marginTop: '12px'
                      }}>
                        <strong>Notes:</strong> {withdrawal.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
