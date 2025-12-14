import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoArrowBack, IoCheckmarkCircle, IoAlertCircle } from 'react-icons/io5';
import axios from 'axios';
import { getCoinLogo } from '@/utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SendPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedAsset = location.state?.asset || 'BTC';

  const [selectedCurrency, setSelectedCurrency] = useState(preselectedAsset);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [allCoins, setAllCoins] = useState([]);
  const [userBalance, setUserBalance] = useState(0);

  useEffect(() => {
    loadCoinsAndBalance();
  }, [selectedCurrency]);

  const loadCoinsAndBalance = async () => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) { navigate('/login'); return; }
    const user = JSON.parse(userData);

    try {
      const [metaRes, balanceRes] = await Promise.all([
        axios.get(`${API}/api/wallets/coin-metadata`),
        axios.get(`${API}/api/wallets/balances/${user.user_id}`)
      ]);

      if (metaRes.data.success) {
        setAllCoins(metaRes.data.coins || []);
      }

      if (balanceRes.data.success) {
        const balance = balanceRes.data.balances?.find(
          b => b.currency.toLowerCase() === selectedCurrency.toLowerCase()
        );
        setUserBalance(balance?.total_balance || 0);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleSend = async () => {
    if (!recipientAddress || !amount) {
      setError('Please fill in all fields');
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (parseFloat(amount) > userBalance) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userData = localStorage.getItem('cryptobank_user');
      const user = JSON.parse(userData);

      // Call NowPayments payout API
      const response = await axios.post(`${API}/api/nowpayments/create-payout`, {
        user_id: user.user_id,
        currency: selectedCurrency.toLowerCase(),
        amount: parseFloat(amount),
        address: recipientAddress
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/wallet');
        }, 3000);
      } else {
        setError(response.data.message || 'Failed to send crypto');
      }
    } catch (err) {
      console.error('Send error:', err);
      setError(err.response?.data?.detail || 'Failed to send crypto. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCoin = allCoins.find(c => c.symbol === selectedCurrency) || { name: selectedCurrency };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #0A0F1E 0%, #050810 100%)', 
      color: '#fff', 
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Glow */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '-10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(0,229,255,0.15) 0%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        animation: 'float 8s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '-10%',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(123,44,255,0.12) 0%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        animation: 'float 10s ease-in-out infinite reverse'
      }} />

      {/* Premium Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: 'rgba(10, 15, 30, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '18px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        zIndex: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            color: '#fff', 
            cursor: 'pointer', 
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
        >
          <IoArrowBack size={22} />
        </button>
        <div style={{ 
          fontSize: '20px', 
          fontWeight: '700',
          background: 'linear-gradient(135deg, #00E5FF 0%, #FFFFFF 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.01em'
        }}>
          Send {selectedCurrency}
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Success Message */}
        {success && (
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(22,199,132,0.15) 0%, rgba(16,174,110,0.1) 100%)',
            border: '1px solid rgba(22,199,132,0.3)',
            borderRadius: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 24px rgba(22,199,132,0.2)'
          }}>
            <IoCheckmarkCircle size={28} color="#16C784" />
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#16C784', marginBottom: '4px' }}>
                Transaction Sent!
              </div>
              <div style={{ fontSize: '14px', color: '#C5D0E6' }}>
                Your crypto is being processed. You'll be redirected shortly.
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(234,57,67,0.15) 0%, rgba(200,40,50,0.1) 100%)',
            border: '1px solid rgba(234,57,67,0.3)',
            borderRadius: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 24px rgba(234,57,67,0.2)'
          }}>
            <IoAlertCircle size={28} color="#EA3943" />
            <div style={{ fontSize: '14px', color: '#EA3943' }}>{error}</div>
          </div>
        )}

        {/* Balance Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,71,217,0.08) 0%, rgba(123,44,255,0.08) 100%)',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}>
          <div style={{ fontSize: '13px', color: '#6B7A99', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
            Available Balance
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#00E5FF' }}>
            {userBalance.toFixed(8)} {selectedCurrency}
          </div>
        </div>

        {/* Currency Selector */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#6B7A99', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Select Asset
          </label>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            disabled={loading || success}
            style={{
              width: '100%',
              padding: '16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              cursor: 'pointer',
              outline: 'none',
              fontWeight: '500'
            }}
          >
            {allCoins.map(coin => (
              <option key={coin.symbol} value={coin.symbol}>
                {coin.symbol} - {coin.name}
              </option>
            ))}
          </select>
        </div>

        {/* Recipient Address */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#6B7A99', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Recipient Address
          </label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            disabled={loading || success}
            placeholder={`Enter ${selectedCurrency} address`}
            style={{
              width: '100%',
              padding: '16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              outline: 'none',
              fontFamily: 'monospace',
              fontWeight: '500'
            }}
          />
        </div>

        {/* Amount */}
        <div style={{ marginBottom: '28px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#6B7A99', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Amount
          </label>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading || success}
            placeholder="0.00"
            style={{
              width: '100%',
              padding: '16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              outline: 'none',
              fontWeight: '500'
            }}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={loading || success}
          style={{
            width: '100%',
            padding: '18px',
            background: loading || success ? 'rgba(0,229,255,0.3)' : 'linear-gradient(135deg, #00E5FF 0%, #00B8D4 100%)',
            border: 'none',
            borderRadius: '16px',
            color: loading || success ? '#6B7A99' : '#001018',
            fontSize: '16px',
            fontWeight: '700',
            cursor: loading || success ? 'not-allowed' : 'pointer',
            boxShadow: loading || success ? 'none' : '0 8px 24px rgba(0,229,255,0.35)',
            transition: 'all 0.2s'
          }}
        >
          {loading ? 'Processing...' : success ? 'Transaction Sent!' : 'Send Crypto'}
        </button>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
      `}</style>
    </div>
  );
}
