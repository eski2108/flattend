import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { TrendingDown, AlertCircle, Clock, Lock } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function InstantSell() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [balances, setBalances] = useState([]);
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [amount, setAmount] = useState('');
  const [selling, setSelling] = useState(false);
  const [livePrices, setLivePrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const u = JSON.parse(userData);
    setUser(u);
    loadBalances(u.user_id);
    fetchPrices();

    const interval = setInterval(fetchPrices, 10000);
    return () => clearInterval(interval);
  }, [navigate]);

  const loadBalances = async (userId) => {
    try {
      const response = await axios.get(`${API}/api/wallets/balances/${userId}`);
      if (response.data.success) {
        const bals = response.data.balances || [];
        setBalances(bals.filter(b => b.currency !== 'GBP' && b.available_balance > 0));
      }
    } catch (error) {
      console.error('Failed to load balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrices = async () => {
    try {
      const response = await axios.get(`${API}/api/prices/live`);
      if (response.data.success) {
        setLivePrices(response.data.prices);
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    }
  };

  const calculateSellAmount = () => {
    if (!amount || !livePrices[selectedCrypto]) return 0;
    const marketPrice = livePrices[selectedCrypto];
    const buySpread = 0.975; // Admin buys 2.5% below market
    const adjustedPrice = marketPrice * buySpread;
    const grossAmount = parseFloat(amount) * adjustedPrice;
    const fee = grossAmount * 0.01; // 1% transaction fee
    const netAmount = grossAmount - fee;
    return netAmount;
  };

  const handleSell = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const selectedBalance = balances.find(b => b.currency === selectedCrypto);
    if (!selectedBalance || parseFloat(amount) > selectedBalance.available_balance) {
      toast.error('Insufficient balance');
      return;
    }

    setSelling(true);
    try {
      // STEP 1: Get locked-price quote
      const quoteResponse = await axios.post(`${API}/api/admin-liquidity/quote`, {
        user_id: user.user_id,
        type: 'sell',
        crypto: selectedCrypto,
        amount: parseFloat(amount)
      });

      if (quoteResponse.data.success) {
        const quote = quoteResponse.data.quote;
        setCurrentQuote({
          ...quote,
          cryptoAmount: parseFloat(amount),
          currency: selectedCrypto
        });
        setShowQuoteModal(true);
        
        // Start countdown timer
        const expiresAt = new Date(quote.expires_at);
        const updateTimer = setInterval(() => {
          const now = new Date();
          const remaining = Math.floor((expiresAt - now) / 1000);
          if (remaining <= 0) {
            clearInterval(updateTimer);
            setShowQuoteModal(false);
            toast.error('Quote expired. Please try again.');
          } else {
            setCountdown(remaining);
          }
        }, 1000);
      } else {
        toast.error(quoteResponse.data.message || 'Failed to get quote');
      }
    } catch (error) {
      console.error('Quote error:', error);
      toast.error(error.response?.data?.message || 'Failed to get quote');
    } finally {
      setSelling(false);
    }
  };

  const confirmSell = async () => {
    if (!currentQuote) return;
    
    setSelling(true);
    try {
      // STEP 2: Execute with locked price
      const response = await axios.post(`${API}/api/admin-liquidity/execute`, {
        user_id: user.user_id,
        quote_id: currentQuote.quote_id
      });

      if (response.data.success) {
        const gbpReceived = currentQuote.cryptoAmount * currentQuote.locked_price;
        toast.success(`✅ Sold ${currentQuote.cryptoAmount} ${currentQuote.currency} for £${gbpReceived.toFixed(2)}!`);
        setAmount('');
        setShowQuoteModal(false);
        
        // Refresh balances and liquidity
        loadBalances(user.user_id);
        fetchPrices();
      } else {
        toast.error(response.data.message || 'Sell failed');
      }
    } catch (error) {
      console.error('Sell error:', error);
      toast.error(error.response?.data?.message || 'Failed to sell crypto');
    } finally {
      setSelling(false);
    }
  };

  const setMaxAmount = () => {
    const selectedBalance = balances.find(b => b.currency === selectedCrypto);
    if (selectedBalance) {
      setAmount(selectedBalance.available_balance.toString());
    }
  };

  const getCoinColor = (curr) => {
    const colors = {
      'BTC': '#F7931A',
      'ETH': '#627EEA',
      'USDT': '#26A17B',
      'BNB': '#F3BA2F',
      'SOL': '#9945FF'
    };
    return colors[curr] || '#00F0FF';
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #05060B 0%, #080B14 100%)' }}>
          <div style={{ fontSize: '20px', color: '#00F0FF', fontWeight: '700' }}>Loading...</div>
        </div>
      </Layout>
    );
  }

  const selectedBalance = balances.find(b => b.currency === selectedCrypto);
  const marketPrice = livePrices[selectedCrypto] || 0;
  const netAmount = calculateSellAmount();
  const profitMargin = ((marketPrice - (marketPrice * 0.975 * 0.99)) / marketPrice * 100).toFixed(2);

  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05060B 0%, #080B14 100%)',
        padding: '20px'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <TrendingDown size={48} color="#EF4444" style={{ margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#FFFFFF', marginBottom: '8px' }}>Instant Sell</h1>
            <p style={{ fontSize: '15px', color: '#A3AEC2' }}>Sell your crypto instantly to CoinHubX. Fast, secure, and guaranteed execution.</p>
          </div>

          {/* Main Sell Card */}
          <div style={{
            background: 'linear-gradient(135deg, #08192B 0%, #04101F 100%)',
            border: '2px solid rgba(239, 68, 68, 0.22)',
            borderRadius: '22px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.15)',
            opacity: 0.94
          }}>
            {/* Crypto Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', color: '#A3AEC2', marginBottom: '8px', display: 'block' }}>Select Cryptocurrency</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
                {balances.map(bal => (
                  <button
                    key={bal.currency}
                    onClick={() => setSelectedCrypto(bal.currency)}
                    style={{
                      padding: '12px',
                      background: selectedCrypto === bal.currency ? `linear-gradient(135deg, ${getCoinColor(bal.currency)}, ${getCoinColor(bal.currency)}CC)` : 'rgba(0, 0, 0, 0.3)',
                      border: `2px solid ${selectedCrypto === bal.currency ? getCoinColor(bal.currency) : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedCrypto !== bal.currency) {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCrypto !== bal.currency) {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                      }
                    }}
                  >
                    {bal.currency}
                  </button>
                ))}
              </div>
            </div>

            {/* Available Balance */}
            {selectedBalance && (
              <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                <div style={{ fontSize: '13px', color: '#A3AEC2', marginBottom: '4px' }}>Available Balance</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#00F0FF' }}>
                  {selectedBalance.available_balance.toFixed(8)} {selectedCrypto}
                </div>
              </div>
            )}

            {/* Amount Input */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', color: '#A3AEC2', marginBottom: '8px', display: 'block' }}>Amount to Sell</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00000000"
                  className="premium-input"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={setMaxAmount}
                  className="premium-btn-secondary"
                  style={{ padding: '0 20px', fontSize: '14px', fontWeight: '600' }}
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Price Calculation */}
            {amount && marketPrice > 0 && (
              <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#A3AEC2' }}>Market Price</span>
                  <span style={{ fontSize: '13px', color: '#FFFFFF' }}>£{marketPrice.toFixed(2)} / {selectedCrypto}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#A3AEC2' }}>We Buy At (-2.5%)</span>
                  <span style={{ fontSize: '13px', color: '#FBBF24' }}>£{(marketPrice * 0.975).toFixed(2)} / {selectedCrypto}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#A3AEC2' }}>Transaction Fee (1%)</span>
                  <span style={{ fontSize: '13px', color: '#EF4444' }}>£{((parseFloat(amount) * marketPrice * 0.975) * 0.01).toFixed(2)}</span>
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '600' }}>You Receive</span>
                  <span style={{ fontSize: '18px', color: '#22C55E', fontWeight: '700' }}>£{netAmount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Sell Button */}
            <button
              onClick={handleSell}
              disabled={selling || !amount || !selectedBalance}
              className="premium-btn-danger"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {selling ? 'Processing...' : `Sell ${selectedCrypto}`}
            </button>
          </div>

          {/* Info Box */}
          <div style={{
            background: 'rgba(251, 191, 36, 0.05)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            gap: '12px'
          }}>
            <AlertCircle size={20} color="#FBBF24" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#FBBF24', marginBottom: '4px' }}>Instant Settlement</div>
              <div style={{ fontSize: '13px', color: '#FDE68A', lineHeight: '1.5' }}>
                Your GBP will be credited to your wallet immediately. We buy at market price with a {profitMargin}% spread to cover operational costs.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quote Modal */}
      {showQuoteModal && currentQuote && (
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
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #08192B 0%, #04101F 100%)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 0 30px rgba(0, 240, 255, 0.2)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Lock size={32} color="#00F0FF" style={{ marginBottom: '8px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>
                Price Locked
              </h3>
              <p style={{ fontSize: '14px', color: '#A3AEC2' }}>
                Confirm your sell order within {countdown} seconds
              </p>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#A3AEC2' }}>Selling</span>
                <span style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600' }}>
                  {currentQuote.cryptoAmount} {currentQuote.currency}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#A3AEC2' }}>Locked Price</span>
                <span style={{ fontSize: '14px', color: '#00F0FF', fontWeight: '600' }}>
                  £{currentQuote.locked_price?.toFixed(2)} / {currentQuote.currency}
                </span>
              </div>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '600' }}>You Receive</span>
                <span style={{ fontSize: '18px', color: '#22C55E', fontWeight: '700' }}>
                  £{(currentQuote.cryptoAmount * currentQuote.locked_price).toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowQuoteModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmSell}
                disabled={selling}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: selling ? 'rgba(34, 197, 94, 0.5)' : 'linear-gradient(135deg, #22C55E, #16A34A)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: selling ? 'not-allowed' : 'pointer'
                }}
              >
                {selling ? 'Processing...' : 'Confirm Sell'}
              </button>
            </div>

            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(251, 191, 36, 0.1)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Clock size={16} color="#FBBF24" />
              <span style={{ fontSize: '12px', color: '#FBBF24' }}>
                Price expires in {countdown}s
              </span>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
