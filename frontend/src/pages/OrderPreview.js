import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IoCard, IoCheckmarkCircle as CheckCircle2, IoShield, IoStar } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';
import DualCurrencyInput from '@/components/DualCurrencyInput';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function OrderPreview() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const offer = location.state?.offer || null;
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [fiatAmount, setFiatAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // NEW: Wallet address fields
  const [walletAddress, setWalletAddress] = useState('');
  const [walletNetwork, setWalletNetwork] = useState('');
  const [walletValidation, setWalletValidation] = useState(null);
  const [validatingWallet, setValidatingWallet] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Handle window resize for mobile responsiveness
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // console.log('🔍 OrderPreview loaded. Offer:', offer);
    
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    
    const user = JSON.parse(userData);
    setCurrentUser(user);
    
    if (!offer) {
      // console.log('❌ No offer found!');
      toast.error('No offer data received');
      navigate('/p2p-marketplace');
      return;
    }
    
    // console.log('📊 Offer fields:', {
      min_purchase: offer.min_purchase,
      max_purchase: offer.max_purchase,
      price_per_unit: offer.price_per_unit
    });
    
    if (!offer.min_purchase || !offer.max_purchase || !offer.price_per_unit) {
      // console.log('❌ Missing required fields!');
      toast.error('Invalid or incomplete offer data');
      navigate('/p2p-marketplace');
      return;
    }
    
    // console.log('✅ Offer is valid!');
    
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

  // NEW: Validate wallet address (optional, non-blocking)
  const validateWalletAddress = async () => {
    if (!walletAddress.trim()) {
      // console.log('No wallet address provided');
      return;
    }
    
    setValidatingWallet(true);
    try {
      const response = await axios.post(`${API}/api/wallet/validate`, null, {
        params: {
          address: walletAddress,
          cryptocurrency: offer.crypto_currency,
          network: walletNetwork || null
        }
      });
      
      if (response.data.valid) {
        setWalletValidation(response.data);
      } else {
        // console.log('Wallet validation returned invalid');
      }
    } catch (error) {
      // console.log('Wallet validation skipped - endpoint may not exist');
      // Don't block trade creation
    } finally {
      setValidatingWallet(false);
    }
  };
  
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
    
    // NEW: Optional wallet validation (non-blocking)
    try {
      await validateWalletAddress();
    } catch (err) {
      // console.log('Wallet validation skipped:', err);
      // Continue anyway - validation is optional
    }

    setProcessing(true);
    try {
      const tradePayload = {
        sell_order_id: offer.order_id,
        buyer_id: currentUser.user_id,
        crypto_amount: parseFloat(cryptoAmount),
        payment_method: offer.payment_methods[0],
        buyer_wallet_address: walletAddress,
        buyer_wallet_network: walletNetwork || null
      };
      
      // console.log('🚀 Creating trade with payload:', tradePayload);
      // console.log('📊 Offer data:', {
        order_id: offer.order_id,
        payment_methods: offer.payment_methods,
        crypto_currency: offer.crypto_currency
      });
      
      const response = await axios.post(`${API}/api/p2p/create-trade`, tradePayload);

      // console.log('✅ API Response:', response.data);
      
      if (response.data.success) {
        const tradeId = response.data.trade_id || response.data.trade?.trade_id || response.data.id;
        // console.log('🚀 Navigating to trade:', tradeId);
        
        if (!tradeId) {
          console.error('❌ No trade_id in response!', response.data);
          toast.error('Trade created but ID missing');
          return;
        }
        
        toast.success('Trade created! Crypto locked in escrow.');
        setTimeout(() => {
          navigate(`/p2p/trade/${tradeId}`);
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

        {/* Seller Card - No Overflow */}
        <div style={{
          background: 'rgba(26, 31, 58, 0.9)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: '700', color: '#fff' }}>
                  {offer.seller_name || 'Seller****'}
                </span>
                <CheckCircle2 size={18} style={{ color: '#10B981', flexShrink: 0 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <IoStar size={14} fill="#FFD700" stroke="#FFD700" />
                  <span style={{ color: '#fff', fontWeight: '600' }}>4.8</span>
                </div>
                <span style={{ color: '#888' }}>156 trades</span>
                <span style={{ color: '#10B981', fontWeight: '600' }}>98.5% completion</span>
              </div>
            </div>
          </div>
        </div>

        {/* Price & Limits - Clean Layout */}
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
              <div>
                <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Minimum</div>
                <div style={{ color: '#fff', fontSize: '0.9375rem', fontWeight: '700' }}>
                  {symbol}{minFiat}
                </div>
                <div style={{ color: '#888', fontSize: '0.75rem' }}>
                  {offer.min_purchase} {cryptoCurrency}
                </div>
              </div>
              <div>
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

        {/* Amount Input with Dual Currency */}
        <div style={{
          background: 'rgba(26, 31, 58, 0.9)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ color: '#888', fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            Enter Amount
          </div>

          <DualCurrencyInput
            cryptoSymbol={cryptoCurrency}
            fiatCurrency={currency}
            onFiatChange={(amount) => setFiatAmount(amount.toString())}
            onCryptoChange={(amount) => setCryptoAmount(amount.toString())}
            initialFiatAmount={fiatAmount}
            initialCryptoAmount={cryptoAmount}
            fee={0}
            showCurrencySelector={false}
            label=""
          />
        </div>

        {/* Payment Methods - Always Visible */}
        <div style={{
          background: 'rgba(26, 31, 58, 0.9)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '1.25rem',
          marginBottom: '1.5rem'
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
                  gap: '0.5rem'
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
          <div style={{ color: '#888', fontSize: '0.8125rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your {cryptoCurrency} Wallet Address
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder={`Enter your ${cryptoCurrency} wallet address`}
              style={{
                width: '100%',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#fff',
                background: 'rgba(0, 0, 0, 0.4)',
                border: walletValidation?.valid ? '2px solid #22C55E' : '2px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '10px',
                padding: '1rem',
                fontFamily: 'monospace'
              }}
            />
          </div>
          
          {/* Wallet Network Selection */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ color: '#888', fontSize: '0.8125rem', display: 'block', marginBottom: '0.5rem' }}>
              Network (Optional)
            </label>
            <select
              value={walletNetwork}
              onChange={(e) => setWalletNetwork(e.target.value)}
              style={{
                width: '100%',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#fff',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem'
              }}
            >
              <option value="">Select Network</option>
              <option value="mainnet">Mainnet</option>
              <option value="legacy">Legacy</option>
              <option value="segwit">SegWit</option>
            </select>
          </div>

          {/* Validation Status */}
          {validatingWallet && (
            <div style={{ color: '#F59E0B', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              🔄 Validating wallet address...
            </div>
          )}
          
          {walletValidation?.valid && (
            <div style={{ color: '#22C55E', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ✓ Valid {cryptoCurrency} {walletValidation.address_type || 'Legacy'} address
            </div>
          )}
          
          {walletValidation && !walletValidation.valid && (
            <div style={{ color: '#EF4444', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              ❌ Invalid wallet address format
            </div>
          )}
          
          <div style={{ color: '#888', fontSize: '0.75rem', lineHeight: '1.5' }}>
            💡 Enter the wallet address where you want to receive your {cryptoCurrency}. Double-check for accuracy.
          </div>
        </div>

        {/* Confirm Button */}
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
