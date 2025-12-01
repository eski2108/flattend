import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IoCard, IoShield, IoStar } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function PreviewOrder() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const offer = location.state?.offer || null;
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [fiatAmount, setFiatAmount] = useState('');
  const [inputMode, setInputMode] = useState('fiat'); // 'fiat' or 'crypto' - GBP is default
  const [processing, setProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Wallet address fields
  const [walletAddress, setWalletAddress] = useState('');
  const [walletNetwork, setWalletNetwork] = useState('');
  const [walletValidation, setWalletValidation] = useState(null);
  const [validatingWallet, setValidatingWallet] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    
    const user = JSON.parse(userData);
    setCurrentUser(user);
    
    if (!offer) {
      toast.error('No offer selected');
      navigate('/p2p-marketplace');
      return;
    }
    
    // Set default to mid-range
    const midCrypto = (offer.min_purchase + offer.max_purchase) / 2;
    const midFiat = (midCrypto * offer.price_per_unit).toFixed(2);
    setCryptoAmount(midCrypto.toFixed(8));
    setFiatAmount(midFiat);
  }, [offer, navigate]);

  const handleFiatInputChange = (value) => {
    setFiatAmount(value);
    if (value && offer && parseFloat(value) > 0) {
      const crypto = parseFloat(value) / offer.price_per_unit;
      setCryptoAmount(crypto.toFixed(8));
    } else {
      setCryptoAmount('');
    }
  };

  const handleCryptoInputChange = (value) => {
    setCryptoAmount(value);
    if (value && offer && parseFloat(value) > 0) {
      const fiat = parseFloat(value) * offer.price_per_unit;
      setFiatAmount(fiat.toFixed(2));
    } else {
      setFiatAmount('');
    }
  };

  const getCurrencySymbol = (currency) => {
    const symbols = { 'USD': '$', 'GBP': '£', 'EUR': '€' };
    return symbols[currency] || '$';
  };

  // Validate wallet address
  const validateWalletAddress = async (address, currency, network = '') => {
    if (!address || address.length < 20) {
      setWalletValidation({ valid: false, message: 'Address too short' });
      return;
    }

    setValidatingWallet(true);
    try {
      const response = await axios.post(`${API}/wallet/validate`, {
        address,
        currency,
        network: network || undefined
      });

      if (response.data.success) {
        setWalletValidation({
          valid: response.data.valid,
          message: response.data.message,
          network: response.data.detected_network
        });
      }
    } catch (error) {
      setWalletValidation({
        valid: false,
        message: 'Validation failed. Please check your address.'
      });
    } finally {
      setValidatingWallet(false);
    }
  };

  // Debounced wallet validation
  useEffect(() => {
    if (walletAddress && walletAddress.length >= 20 && offer?.crypto_currency) {
      const timer = setTimeout(() => {
        validateWalletAddress(walletAddress, offer.crypto_currency, walletNetwork);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setWalletValidation(null);
    }
  }, [walletAddress, walletNetwork, offer?.crypto_currency]);

  const validateAmount = () => {
    const crypto = parseFloat(cryptoAmount);
    if (!crypto || crypto <= 0) {
      toast.error('Please enter a valid amount');
      return false;
    }
    if (crypto < offer.min_purchase) {
      toast.error(`Minimum order is ${offer.min_purchase} ${offer.crypto_currency}`);
      return false;
    }
    if (crypto > offer.max_purchase) {
      toast.error(`Maximum order is ${offer.max_purchase} ${offer.crypto_currency}`);
      return false;
    }
    return true;
  };

  const handleConfirmOrder = async () => {
    if (!validateAmount()) return;

    // Validate wallet address
    if (!walletAddress || !walletAddress.trim()) {
      toast.error('Please enter your wallet address');
      return;
    }

    if (walletValidation && !walletValidation.valid) {
      toast.error('Please enter a valid wallet address');
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post(`${API}/p2p/create-trade`, {
        sell_order_id: offer.order_id,
        buyer_id: currentUser.user_id,
        crypto_amount: parseFloat(cryptoAmount),
        payment_method: offer.payment_methods[0],
        buyer_wallet_address: walletAddress.trim(),
        buyer_wallet_network: walletNetwork || undefined
      });

      if (response.data.success) {
        toast.success('Trade created! Crypto locked in escrow.');
        setTimeout(() => {
          navigate(`/trade/${response.data.trade.trade_id}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating trade:', error);
      toast.error(error.response?.data?.detail || 'Failed to create trade');
    } finally {
      setProcessing(false);
    }
  };

  if (!offer) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: '#888', fontSize: '18px' }}>No offer selected</p>
          <Button onClick={() => navigate('/p2p-marketplace')}>Back to Marketplace</Button>
        </div>
      </Layout>
    );
  }

  const currency = offer.fiat_currency || 'GBP';
  const symbol = getCurrencySymbol(currency);
  const minFiat = (offer.min_purchase * offer.price_per_unit).toFixed(2);
  const maxFiat = (offer.max_purchase * offer.price_per_unit).toFixed(2);
  const cryptoCurrency = offer.crypto_currency || 'BTC';

  return (
    <Layout>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: '#00F0FF', marginBottom: '0.5rem' }}>
            Order Preview
          </h1>
          <p style={{ color: '#888', fontSize: '0.875rem' }}>
            Review details before confirming your purchase
          </p>
        </div>

        {/* Seller Card - No Overflow, Proper Text Wrapping */}
        <div style={{
          background: 'rgba(26, 31, 58, 0.9)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#000',
              flexShrink: 0
            }}>
              {offer.seller_name?.substring(0, 2).toUpperCase() || 'SE'}
            </div>
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                <span style={{ 
                  fontSize: '1.125rem', 
                  fontWeight: '700', 
                  color: '#fff',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '200px'
                }}>
                  {offer.seller_name || 'Seller****'}
                </span>
                <CheckCircle2 size={18} style={{ color: '#10B981', flexShrink: 0 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                  <IoStar size={14} fill="#FFD700" stroke="#FFD700" />
                  <span style={{ color: '#fff', fontWeight: '600' }}>4.8</span>
                </div>
                <span style={{ color: '#888', flexShrink: 0 }}>156 trades</span>
                <span style={{ color: '#10B981', fontWeight: '600', flexShrink: 0 }}>98.5%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Price & Limits - Clean Layout with Both Currencies */}
        <div style={{
          background: 'rgba(26, 31, 58, 0.9)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ color: '#888', fontSize: '0.8125rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Price per {cryptoCurrency}
            </div>
            <div style={{ color: '#00F0FF', fontSize: '1.75rem', fontWeight: '900' }}>
              {symbol}{offer.price_per_unit?.toLocaleString()}
            </div>
          </div>

          <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(0, 240, 255, 0.15)' }}>
            <div style={{ color: '#888', fontSize: '0.8125rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Order Limits
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Minimum</div>
                <div style={{ color: '#fff', fontSize: '0.9375rem', fontWeight: '700' }}>
                  {symbol}{minFiat}
                </div>
                <div style={{ color: '#888', fontSize: '0.75rem' }}>
                  {offer.min_purchase} {cryptoCurrency}
                </div>
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Maximum</div>
                <div style={{ color: '#fff', fontSize: '0.9375rem', fontWeight: '700' }}>
                  {symbol}{maxFiat}
                </div>
                <div style={{ color: '#888', fontSize: '0.75rem' }}>
                  {offer.max_purchase} {cryptoCurrency}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Amount Input with GBP/BTC Toggle - GBP is DEFAULT for UK */}
        <div style={{
          background: 'rgba(26, 31, 58, 0.9)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ color: '#888', fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Enter Amount
            </div>
            <button
              onClick={() => setInputMode(inputMode === 'fiat' ? 'crypto' : 'fiat')}
              style={{
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '8px',
                padding: '0.375rem 0.75rem',
                color: '#00F0FF',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 240, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)';
              }}
            >
              <ArrowRightLeft size={14} />
              Switch to {inputMode === 'fiat' ? cryptoCurrency : currency}
            </button>
          </div>

          {inputMode === 'fiat' ? (
            <>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ color: '#888', fontSize: '0.8125rem', display: 'block', marginBottom: '0.5rem' }}>
                  Amount ({currency})
                </label>
                <Input
                  type="number"
                  value={fiatAmount}
                  onChange={(e) => handleFiatInputChange(e.target.value)}
                  placeholder="0.00"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#fff',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '10px',
                    padding: '1rem',
                    width: '100%'
                  }}
                />
              </div>
              <div style={{ color: '#888', fontSize: '0.875rem' }}>
                ≈ <span style={{ color: '#A855F7', fontWeight: '600' }}>{cryptoAmount || '0.00000000'} {cryptoCurrency}</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ color: '#888', fontSize: '0.8125rem', display: 'block', marginBottom: '0.5rem' }}>
                  Amount ({cryptoCurrency})
                </label>
                <Input
                  type="number"
                  value={cryptoAmount}
                  onChange={(e) => handleCryptoInputChange(e.target.value)}
                  placeholder="0.00000000"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#fff',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '10px',
                    padding: '1rem',
                    width: '100%'
                  }}
                />
              </div>
              <div style={{ color: '#888', fontSize: '0.875rem' }}>
                ≈ <span style={{ color: '#A855F7', fontWeight: '600' }}>{symbol}{fiatAmount || '0.00'}</span>
              </div>
            </>
          )}
        </div>

        {/* Payment Methods - Always Visible */}
        <div style={{
          background: 'rgba(26, 31, 58, 0.9)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          overflow: 'hidden'
        }}>
          <div style={{ color: '#888', fontSize: '0.8125rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Payment Methods Available
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {offer.payment_methods?.slice(0, 3).map((method, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(0, 240, 255, 0.1)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  color: '#00F0FF',
                  fontSize: '0.8125rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexShrink: 0
                }}
              >
                <IoCard size={16} />
                {method.replace(/_/g, ' ').toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        {/* Wallet Address Input Section */}
        <div style={{
          background: 'rgba(26, 31, 58, 0.9)',
          border: '2px solid rgba(168, 85, 247, 0.4)',
          borderRadius: '16px',
          padding: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ 
            color: '#A855F7', 
            fontSize: '0.875rem', 
            marginBottom: '0.75rem', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <IoShield size={18} />
            Your Wallet Address (Where you'll receive {cryptoCurrency})
          </div>
          
          <div style={{ marginBottom: '0.75rem' }}>
            <Input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder={`Enter your ${cryptoCurrency} wallet address`}
              disabled={processing}
              style={{
                fontSize: '0.875rem',
                color: '#fff',
                background: 'rgba(0, 0, 0, 0.4)',
                border: walletValidation?.valid ? '2px solid #22C55E' : '2px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '10px',
                padding: '0.875rem',
                width: '100%',
                fontFamily: 'monospace'
              }}
            />
          </div>
          
          {/* Network selector for USDT */}
          {offer?.crypto_currency === 'USDT' && (
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ color: '#888', fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem' }}>
                Network (Optional - defaults to ERC20)
              </label>
              <select
                value={walletNetwork}
                onChange={(e) => setWalletNetwork(e.target.value)}
                disabled={processing}
                style={{
                  fontSize: '0.875rem',
                  color: '#fff',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '2px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  width: '100%',
                  cursor: 'pointer'
                }}
              >
                <option value="">ERC20 (Ethereum)</option>
                <option value="TRC20">TRC20 (TRON)</option>
                <option value="BEP20">BEP20 (BSC)</option>
              </select>
            </div>
          )}
          
          {validatingWallet && (
            <div style={{
              padding: '0.75rem',
              background: 'rgba(0, 240, 255, 0.1)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '8px',
              color: '#00F0FF',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
              Validating address...
            </div>
          )}
          
          {walletValidation && !validatingWallet && (
            <div style={{
              padding: '0.75rem',
              background: walletValidation.valid ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${walletValidation.valid ? '#22C55E' : '#EF4444'}`,
              borderRadius: '8px',
              color: walletValidation.valid ? '#22C55E' : '#EF4444',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {walletValidation.valid ? <CheckCircle2 size={16} /> : '❌'}
              {walletValidation.message}
              {walletValidation.network && ` (${walletValidation.network})`}
            </div>
          )}
          
          <div style={{ 
            color: '#888', 
            fontSize: '0.75rem', 
            marginTop: '0.75rem',
            lineHeight: '1.5'
          }}>
            ⚠️ Important: Double-check your wallet address. Crypto sent to wrong address cannot be recovered.
          </div>
        </div>

        {/* Confirm Button - Mobile Friendly */}
        <button
          onClick={handleConfirmOrder}
          disabled={processing || !cryptoAmount || parseFloat(cryptoAmount) <= 0 || !walletAddress.trim()}
          style={{
            width: '100%',
            minHeight: '60px',
            background: processing || !cryptoAmount || parseFloat(cryptoAmount) <= 0 || !walletAddress.trim()
              ? 'rgba(100,100,100,0.5)' 
              : 'linear-gradient(135deg, #22C55E, #16A34A)',
            border: 'none',
            borderRadius: '16px',
            fontSize: '1.125rem',
            fontWeight: '900',
            color: '#fff',
            cursor: processing || !cryptoAmount || parseFloat(cryptoAmount) <= 0 || !walletAddress.trim() ? 'not-allowed' : 'pointer',
            boxShadow: processing || !cryptoAmount || parseFloat(cryptoAmount) <= 0 || !walletAddress.trim()
              ? 'none'
              : '0 4px 24px rgba(34, 197, 94, 0.5), 0 0 40px rgba(34, 197, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            opacity: processing || !cryptoAmount || parseFloat(cryptoAmount) <= 0 || !walletAddress.trim() ? 0.5 : 1,
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            if (!processing && cryptoAmount && parseFloat(cryptoAmount) > 0) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 40px rgba(34, 197, 94, 0.7), 0 0 60px rgba(34, 197, 94, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (!processing && cryptoAmount && parseFloat(cryptoAmount) > 0) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(34, 197, 94, 0.5), 0 0 40px rgba(34, 197, 94, 0.3)';
            }
          }}
        >
          {processing ? (
            <>
              <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
              Processing...
            </>
          ) : (
            <>
              <IoShield size={24} />
              Confirm & Lock in Escrow
            </>
          )}
        </button>
      </div>
    </Layout>
  );
}
