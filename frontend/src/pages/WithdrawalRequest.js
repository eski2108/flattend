import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import OTPModal from '@/components/OTPModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function WithdrawalRequest() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [amount, setAmount] = useState('');
  const [addresses, setAddresses] = useState({});
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // DYNAMIC: Fetch crypto list from backend
  const [cryptoList, setCryptoList] = useState([
    { code: 'BTC', name: 'Bitcoin', symbol: '₿' },
    { code: 'ETH', name: 'Ethereum', symbol: 'Ξ' },
    { code: 'USDT', name: 'Tether', symbol: '₮' }
  ]);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/');
      return;
    }
    setUser(JSON.parse(userData));
    
    // Fetch available cryptocurrencies dynamically
    fetchAvailableCryptos();
  }, [navigate]);
  
  const fetchAvailableCryptos = async () => {
    try {
      const response = await axios.get(`${API}/api/coins/metadata`);
      if (response.data.success) {
        const cryptos = response.data.coins.map(coin => ({
          code: coin.symbol,
          name: coin.name,
          symbol: coin.icon
        }));
        setCryptoList(cryptos);
      }
    } catch (error) {
      console.error('Error fetching available cryptos:', error);
      // Keep default fallback
    }
  };

  useEffect(() => {
    if (user?.user_id) {
      fetchAddresses();
    }
  }, [user]);

  useEffect(() => {
    // Auto-select saved address when crypto changes
    if (addresses[selectedCrypto]) {
      setWithdrawalAddress(addresses[selectedCrypto]);
    } else {
      setWithdrawalAddress('');
    }
  }, [selectedCrypto, addresses]);

  const fetchAddresses = async () => {
    try {
      const response = await axios.get(`${API}/wallet/addresses/${user.user_id}`);
      setAddresses(response.data.addresses || {});
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const handleSubmitWithdrawal = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!withdrawalAddress.trim()) {
      alert('Please enter a withdrawal address');
      return;
    }

    const fee = parseFloat(amount) * 0.01;
    const total = parseFloat(amount) + fee;

    if (!confirm(`Withdraw ${amount} ${selectedCrypto}?\n\nFee (1%): ${fee.toFixed(8)} ${selectedCrypto}\nTotal deducted: ${total.toFixed(8)} ${selectedCrypto}`)) {
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/wallet/request-withdrawal`, {
        user_id: user.user_id,
        currency: selectedCrypto,
        amount: parseFloat(amount),
        withdrawal_address: withdrawalAddress.trim()
      });

      alert('Withdrawal request submitted! Pending admin approval.');
      setAmount('');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to submit withdrawal');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCryptoInfo = cryptoList.find(c => c.code === selectedCrypto);
  const fee = amount ? (parseFloat(amount) * 0.01).toFixed(8) : '0';
  const netAmount = amount ? parseFloat(amount).toFixed(8) : '0';

  return (
    <Layout>
      <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#fff', marginBottom: '0.5rem' }}>
          Withdraw Crypto
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '2rem' }}>
          Request a withdrawal to your wallet (1% fee applies)
        </p>

        {/* Crypto Selector */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {cryptoList.map((crypto) => (
            <button
              key={crypto.code}
              onClick={() => setSelectedCrypto(crypto.code)}
              style={{
                padding: '1rem',
                background: selectedCrypto === crypto.code
                  ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(168, 85, 247, 0.2))'
                  : 'rgba(0, 0, 0, 0.3)',
                border: selectedCrypto === crypto.code ? '2px solid #00F0FF' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '0.5rem' }}>{crypto.symbol}</div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>{crypto.code}</div>
            </button>
          ))}
        </div>

        <Card style={{
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.05), rgba(168, 85, 247, 0.05))',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '16px',
          padding: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <span style={{ fontSize: '48px' }}>{selectedCryptoInfo.symbol}</span>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>
                Withdraw {selectedCryptoInfo.name}
              </h2>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
              Amount
            </label>
            <input
              type="number"
              step="0.00000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Enter amount in ${selectedCrypto}`}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '18px'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
              Withdrawal Address
            </label>
            {addresses[selectedCrypto] && (
              <div style={{ fontSize: '12px', color: '#00F0FF', marginBottom: '0.5rem' }}>
                Using saved address
              </div>
            )}
            <input
              type="text"
              value={withdrawalAddress}
              onChange={(e) => setWithdrawalAddress(e.target.value)}
              placeholder={`Enter ${selectedCrypto} address`}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontFamily: 'monospace'
              }}
            />
          </div>

          {/* Fee Summary */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Amount:</span>
              <span style={{ color: '#fff', fontWeight: '600' }}>{netAmount} {selectedCrypto}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Fee (1%):</span>
              <span style={{ color: '#FFC107', fontWeight: '600' }}>{fee} {selectedCrypto}</span>
            </div>
            <div style={{ 
              borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
              paddingTop: '0.5rem', 
              display: 'flex', 
              justifyContent: 'space-between' 
            }}>
              <span style={{ color: '#fff', fontWeight: '600' }}>You'll receive:</span>
              <span style={{ color: '#00F0FF', fontWeight: '700', fontSize: '18px' }}>{netAmount} {selectedCrypto}</span>
            </div>
          </div>

          {/* Warning */}
          <div style={{
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <AlertCircle size={20} color="#FFC107" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
              <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)' }}>
                Withdrawal requests require admin approval. Once approved, crypto will be sent to your address within 24 hours.
              </div>
            </div>
          </div>

          <Button
            onClick={handleSubmitWithdrawal}
            disabled={submitting}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
              border: 'none',
              padding: '1rem',
              fontSize: '16px',
              fontWeight: '700',
              opacity: submitting ? 0.5 : 1
            }}
          >
            {submitting ? 'Submitting...' : 'Request Withdrawal'}
          </Button>
        </Card>
      </div>
    </Layout>
  );
}
