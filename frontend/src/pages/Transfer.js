import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

function Transfer() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Transfer form
  const [recipientId, setRecipientId] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('BTC');
  const [amount, setAmount] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [feePercent, setFeePercent] = useState(0.3);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetchUserData();
    fetchMonetizationSettings();
  }, [navigate]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('user_id');
      
      const userResponse = await axios.get(`${API}/api/user/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (userResponse.data.success) {
        setUserData(userResponse.data.user);
      }

      // Fetch balances
      const balanceResponse = await axios.get(`${API}/api/internal-balances/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (balanceResponse.data.balances) {
        setBalances(balanceResponse.data.balances);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setLoading(false);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const fetchMonetizationSettings = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/monetization/settings`);
      if (response.data.success) {
        setFeePercent(response.data.settings.internal_transfer_fee_percent || 0.3);
      }
    } catch (error) {
      console.error('Error fetching fee settings:', error);
    }
  };

  const handleTransfer = async () => {
    if (!recipientId || !amount || parseFloat(amount) <= 0) {
      alert('Please fill all fields with valid values');
      return;
    }

    const selectedBalance = balances.find(b => b.currency === selectedCurrency);
    if (!selectedBalance || selectedBalance.balance < parseFloat(amount)) {
      alert(`Insufficient ${selectedCurrency} balance`);
      return;
    }

    setTransferring(true);

    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('user_id');

      const response = await axios.post(
        `${API}/api/monetization/internal-transfer`,
        {
          from_user_id: userId,
          to_user_id: recipientId,
          currency: selectedCurrency,
          amount: parseFloat(amount)
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        alert(response.data.message);
        setRecipientId('');
        setAmount('');
        fetchUserData();
      }
    } catch (error) {
      console.error('Error transferring:', error);
      alert(error.response?.data?.detail || 'Failed to transfer');
    } finally {
      setTransferring(false);
    }
  };

  const calculateFee = () => {
    if (!amount || parseFloat(amount) <= 0) return 0;
    return (parseFloat(amount) * feePercent / 100).toFixed(6);
  };

  const calculateNetAmount = () => {
    if (!amount || parseFloat(amount) <= 0) return 0;
    return (parseFloat(amount) - parseFloat(calculateFee())).toFixed(6);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0A0E27' }}>
        <div style={{ fontSize: '24px', color: '#00F0FF', fontWeight: '700' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0A0E27 0%, #1A1F3A 100%)', padding: '2rem' }}>
      {/* Header */}
      <div style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            color: '#00F0FF',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '700',
            marginBottom: '1rem'
          }}
        >
          ← Back to Dashboard
        </button>

        <h1 style={{ fontSize: '48px', fontWeight: '900', color: '#fff', margin: 0, marginBottom: '0.5rem' }}>
          💸 Internal Transfer
        </h1>
        <p style={{ fontSize: '18px', color: '#888', margin: 0 }}>
          Send crypto to other Coin Hub IoClose as X users instantly
        </p>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Transfer Form */}
        <div style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '900', marginBottom: '1.5rem' }}>
            Send Funds
          </h2>

          {/* Fee Notice */}
          <div style={{ background: 'rgba(255, 165, 0, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(255, 165, 0, 0.3)' }}>
            <div style={{ color: '#FFA500', fontSize: '14px', fontWeight: '600' }}>
              ⚠️ Transfer Fee: {feePercent}% (automatically deducted)
            </div>
          </div>

          {/* Recipient User ID */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
              Recipient User ID
            </label>
            <input
              type="text"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              placeholder="Enter recipient's user ID"
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Currency Selection */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
              Currency
            </label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {balances.map(balance => (
                <option key={balance.currency} value={balance.currency}>
                  {balance.currency} (Available: {balance.balance.toFixed(6)})
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
              Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount to send"
              step="0.000001"
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '18px',
                fontWeight: '700'
              }}
            />
          </div>

          {/* Fee Breakdown */}
          {amount && parseFloat(amount) > 0 && (
            <div style={{ background: 'rgba(0, 240, 255, 0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#888', fontSize: '14px' }}>You send:</span>
                <span style={{ color: '#fff', fontWeight: '700' }}>{amount} {selectedCurrency}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#888', fontSize: '14px' }}>Transfer fee ({feePercent}%):</span>
                <span style={{ color: '#EF4444', fontWeight: '700' }}>-{calculateFee()} {selectedCurrency}</span>
              </div>
              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '0.5rem 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888', fontSize: '14px', fontWeight: '700' }}>Recipient receives:</span>
                <span style={{ color: '#00F0FF', fontWeight: '900', fontSize: '18px' }}>{calculateNetAmount()} {selectedCurrency}</span>
              </div>
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleTransfer}
            disabled={transferring}
            style={{
              width: '100%',
              padding: '1.25rem',
              background: transferring ? 'rgba(0, 240, 255, 0.3)' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
              border: 'none',
              borderRadius: '8px',
              color: transferring ? '#888' : '#000',
              fontSize: '18px',
              fontWeight: '900',
              cursor: transferring ? 'not-allowed' : 'pointer'
            }}
          >
            {transferring ? 'Sending...' : 'Send Now'}
          </button>
        </div>

        {/* Your Balances */}
        <div style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(168, 85, 247, 0.3)', borderRadius: '16px', padding: '2rem' }}>
          <h2 style={{ color: '#A855F7', fontSize: '24px', fontWeight: '900', marginBottom: '1.5rem' }}>
            Your Balances
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
            {balances.map(balance => (
              <div key={balance.currency} style={{ padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem' }}>{balance.currency}</div>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }}>
                  {balance.balance.toFixed(6)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Transfer;
