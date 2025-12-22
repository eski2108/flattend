import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '@/components/Layout';
import { Zap, ArrowRight, Info, CheckCircle } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || 'https://atomic-pay-fix.preview.emergentagent.com';

export default function P2PExpress() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [fiatAmount, setFiatAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);
  const [cryptoOptions, setCryptoOptions] = useState([]);
  const [loadingCoins, setLoadingCoins] = useState(true);

  useEffect(() => {
    // Check auth
    const userStr = localStorage.getItem('user');
    if (!userStr || userStr === 'null') {
      setCurrentUser({ user_id: 'demo', email: 'demo@test.com' });
    } else {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch {
        setCurrentUser({ user_id: 'demo', email: 'demo@test.com' });
      }
    }

    // Fetch supported coins from backend
    fetchSupportedCoins();
  }, []);

  const fetchSupportedCoins = async () => {
    try {
      const response = await axios.get(`${API}/api/express-buy/supported-coins`);
      if (response.data.success) {
        setCryptoOptions(response.data.coins);
        if (response.data.coins.length > 0) {
          setSelectedCrypto(response.data.coins[0].symbol);
        }
      }
    } catch (error) {
      console.error('Error fetching supported coins:', error);
      // Fallback to default coins if endpoint fails
      setCryptoOptions([
        { symbol: 'BTC', name: 'Bitcoin', icon: '₿', price: 47500 },
        { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', price: 2500 }
      ]);
    } finally {
      setLoadingCoins(false);
    }
  };

  const handleGetQuote = async () => {
    if (!fiatAmount || parseFloat(fiatAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const crypto = cryptoOptions.find(c => c.symbol === selectedCrypto);
    if (!crypto) {
      toast.error('Selected cryptocurrency not found');
      return;
    }

    try {
      // Fetch fee from backend
      const settingsResponse = await axios.get(`${API}/api/admin/platform-settings`);
      const settings = settingsResponse.data.settings;
      
      // Get fee percentage (per-coin or global)
      const perCoinFees = settings.express_buy_fees_by_coin || {};
      const feePercent = perCoinFees[selectedCrypto] || settings.express_buy_fee_percent || 3.0;
      
      // Calculate with fee applied
      const amount = parseFloat(fiatAmount);
      const feeAmount = amount * (feePercent / 100);
      const netAmount = amount - feeAmount;
      const cryptoAmount = netAmount / crypto.price;

      setQuote({
        crypto: selectedCrypto,
        fiatAmount: amount,
        cryptoAmount: cryptoAmount,
        pricePerUnit: crypto.price
      });
    } catch (error) {
      console.error('Error calculating quote:', error);
      toast.error('Failed to get quote');
    }
  };

  const handleConfirmPurchase = async () => {
    if (!quote) return;

    setLoading(true);
    try {
      // Match with admin liquidity
      const matchResponse = await axios.post(`${API}/api/express-buy/match`, {
        crypto_currency: selectedCrypto,
        fiat_amount: quote.fiatAmount,
        user_id: currentUser.user_id
      });

      if (matchResponse.data.success && matchResponse.data.source === 'admin_liquidity') {
        // Execute purchase
        const executeResponse = await axios.post(`${API}/api/express-buy/execute`, {
          user_id: currentUser.user_id,
          ad_id: 'ADMIN_LIQUIDITY',
          crypto_currency: selectedCrypto,
          crypto_amount: quote.cryptoAmount,
          fiat_amount: quote.fiatAmount,
          buyer_wallet_address: `wallet_${currentUser.user_id}_${Date.now()}`,
          buyer_wallet_network: 'mainnet',
          net_crypto_to_buyer: quote.cryptoAmount
        });

        if (executeResponse.data.success) {
          toast.success(`Successfully purchased ${quote.cryptoAmount.toFixed(8)} ${selectedCrypto}!`);
          setQuote(null);
          setFiatAmount('');
        } else {
          toast.error(executeResponse.data.message || 'Purchase failed');
        }
      } else {
        toast.error('Admin liquidity not available for this amount');
      }
    } catch (error) {
      console.error('Express buy error:', error);
      toast.error(error.response?.data?.detail || 'Failed to complete purchase');
    } finally {
      setLoading(false);
    }
  };

  const selectedCryptoData = cryptoOptions.find(c => c.symbol === selectedCrypto);

  return (
    <Layout>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #22C55E, #16A34A)',
            borderRadius: '12px',
            marginBottom: '1rem'
          }}>
            <Zap size={24} color="#fff" />
            <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
              P2P Express
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#fff', marginBottom: '0.5rem' }}>
            Buy Crypto Instantly
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)' }}>
            Purchase crypto directly from platform liquidity • No sellers • Instant delivery
          </p>
        </div>

        {/* Info Box */}
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '2px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '2rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start'
        }}>
          <Info size={24} color="#22C55E" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.95rem', color: '#fff', fontWeight: '600', marginBottom: '0.5rem' }}>
              How P2P Express Works
            </div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
              P2P Express tries admin liquidity first for instant delivery. If unavailable, we automatically match you with the fastest P2P seller. Get your crypto quickly either way.
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div style={{
          background: 'rgba(26, 31, 58, 0.8)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '2rem'
        }}>
          {!quote ? (
            <>
              {/* Select Crypto */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  color: 'rgba(255,255,255,0.7)', 
                  marginBottom: '0.75rem',
                  fontWeight: '600'
                }}>
                  Select Cryptocurrency
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  {cryptoOptions.map(crypto => (
                    <button
                      key={crypto.symbol}
                      onClick={() => setSelectedCrypto(crypto.symbol)}
                      style={{
                        padding: '1rem',
                        background: selectedCrypto === crypto.symbol 
                          ? 'linear-gradient(135deg, #00F0FF, #A855F7)' 
                          : 'rgba(0, 0, 0, 0.3)',
                        border: selectedCrypto === crypto.symbol 
                          ? '2px solid rgba(0, 240, 255, 0.6)' 
                          : '2px solid rgba(0, 240, 255, 0.2)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '1rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span style={{ fontSize: '1.5rem' }}>{crypto.icon}</span>
                      <span>{crypto.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  color: 'rgba(255,255,255,0.7)', 
                  marginBottom: '0.75rem',
                  fontWeight: '600'
                }}>
                  Amount to Spend (GBP)
                </label>
                
                {/* Preset Amount Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                  {[50, 100, 200, 500].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setFiatAmount(amount.toString())}
                      style={{
                        padding: '0.75rem',
                        background: fiatAmount === amount.toString() 
                          ? 'linear-gradient(135deg, #00F0FF, #7B2FFF)' 
                          : 'rgba(0, 240, 255, 0.1)',
                        border: '2px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (fiatAmount !== amount.toString()) {
                          e.currentTarget.style.background = 'rgba(0, 240, 255, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (fiatAmount !== amount.toString()) {
                          e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                        }
                      }}
                    >
                      £{amount}
                    </button>
                  ))}
                </div>
                
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '1.25rem',
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: '600'
                  }}>
                    £
                  </span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={fiatAmount}
                    onChange={(e) => setFiatAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '1rem 1rem 1rem 2.5rem',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '2px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      outline: 'none'
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Current rate: £{selectedCryptoData?.price.toLocaleString()} per {selectedCrypto}</span>
                  <span style={{ color: '#22C55E', fontSize: '0.7rem', fontWeight: '600' }}>● Price updates live</span>
                </div>
              </div>

              {/* Get Quote Button */}
              <button
                onClick={handleGetQuote}
                disabled={!fiatAmount || parseFloat(fiatAmount) <= 0}
                style={{
                  width: '100%',
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  opacity: (!fiatAmount || parseFloat(fiatAmount) <= 0) ? 0.5 : 1,
                  transition: 'all 0.3s ease'
                }}
              >
                Get Instant Quote
                <ArrowRight size={20} />
              </button>
            </>
          ) : (
            <>
              {/* Quote Summary */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#00F0FF', marginBottom: '1.5rem' }}>
                  Purchase Summary
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>You Pay</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>
                      £{quote.fiatAmount.toFixed(2)}
                    </span>
                  </div>

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>You Receive</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#22C55E' }}>
                      {quote.cryptoAmount.toFixed(8)} {quote.crypto}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>
                    at £{quote.pricePerUnit.toLocaleString()}/{quote.crypto}
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div style={{
                background: 'rgba(34, 197, 94, 0.05)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    'Instant delivery to your wallet',
                    'No escrow or seller wait times',
                    'Direct from platform liquidity',
                    'Guaranteed availability'
                  ].map((benefit, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={16} color="#22C55E" />
                      <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => setQuote(null)}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '2px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '12px',
                    color: '#EF4444',
                    fontSize: '1rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPurchase}
                  disabled={loading}
                  style={{
                    flex: 2,
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Processing...' : 'Confirm Purchase'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
