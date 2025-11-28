import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/Layout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function DepositInstructions() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [instructions, setInstructions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [txHash, setTxHash] = useState('');
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
    fetchInstructions(selectedCrypto);
  }, [selectedCrypto]);

  const fetchInstructions = async (currency) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/wallet/deposit-instructions/${currency}`);
      setInstructions(response.data);
    } catch (error) {
      console.error('Error fetching instructions:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/wallet/submit-deposit`, {
        user_id: user.user_id,
        currency: selectedCrypto,
        amount: parseFloat(depositAmount),
        tx_hash: txHash.trim() || null
      });

      alert('Deposit submitted! You\'ll be credited once admin approves.');
      setDepositAmount('');
      setTxHash('');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to submit deposit');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCryptoInfo = cryptoList.find(c => c.code === selectedCrypto);

  return (
    <Layout>
      <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '800', 
          color: '#fff', 
          marginBottom: '0.5rem' 
        }}>
          Deposit Instructions
        </h1>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.7)', 
          marginBottom: '2rem' 
        }}>
          Select cryptocurrency and follow the deposit instructions
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
                border: selectedCrypto === crypto.code
                  ? '2px solid #00F0FF'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '0.5rem' }}>{crypto.symbol}</div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>
                {crypto.code}
              </div>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#fff', padding: '2rem' }}>
            Loading instructions...
          </div>
        ) : instructions && (
          <>
            {/* Deposit Address Card */}
            <Card style={{
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '16px',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '48px' }}>{selectedCryptoInfo.symbol}</span>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '0.25rem' }}>
                    Deposit {selectedCryptoInfo.name}
                  </h2>
                  <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Send {selectedCrypto} to this address
                  </span>
                </div>
              </div>

              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '1.5rem',
                borderRadius: '12px',
                marginBottom: '1.5rem'
              }}>
                <label style={{ 
                  fontSize: '12px', 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  marginBottom: '0.5rem', 
                  display: 'block' 
                }}>
                  DEPOSIT ADDRESS
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{
                    color: '#00F0FF',
                    fontSize: '16px',
                    fontFamily: 'monospace',
                    flex: 1,
                    wordBreak: 'break-all'
                  }}>
                    {instructions.deposit_address}
                  </span>
                  <button
                    onClick={() => copyToClipboard(instructions.deposit_address)}
                    style={{
                      background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontWeight: '600'
                    }}
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Important Info */}
              <div style={{
                background: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <AlertCircle size={20} color="#FFC107" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                  <div>
                    <div style={{ color: '#FFC107', fontWeight: '600', marginBottom: '0.5rem', fontSize: '14px' }}>
                      Important Information
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)' }}>
                      {instructions.instructions.map((instruction, idx) => (
                        <li key={idx} style={{ marginBottom: '0.25rem' }}>{instruction}</li>
                      ))}
                      <li>Minimum deposit: {instructions.min_deposit} {selectedCrypto}</li>
                      <li>Required confirmations: {instructions.confirmations_required}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.5)',
                textAlign: 'center'
              }}>
                Your User ID: <span style={{ color: '#00F0FF', fontFamily: 'monospace' }}>{user?.user_id}</span>
              </div>
            </Card>

            {/* Submit Deposit Proof */}
            <Card style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '16px',
              padding: '2rem'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>
                Submit Deposit for Verification
              </h3>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1.5rem' }}>
                After sending {selectedCrypto}, submit your deposit details for admin verification
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  fontSize: '14px', 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  marginBottom: '0.5rem', 
                  display: 'block' 
                }}>
                  Amount Sent
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder={`Enter amount in ${selectedCrypto}`}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  fontSize: '14px', 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  marginBottom: '0.5rem', 
                  display: 'block' 
                }}>
                  Transaction Hash (Optional)
                </label>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Enter transaction hash if available"
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

              <Button
                onClick={handleSubmitDeposit}
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
                {submitting ? 'Submitting...' : 'Submit for Verification'}
              </Button>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
