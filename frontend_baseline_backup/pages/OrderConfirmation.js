import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '@/components/Layout';
import { ArrowLeft, Shield, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || 'https://p2p-trader-board.preview.emergentagent.com';

function OrderConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { offer, orderType, crypto } = location.state || {};

  const [amount, setAmount] = useState('');
  const [buyerWalletAddress, setBuyerWalletAddress] = useState('');
  const [walletNetwork, setWalletNetwork] = useState('');
  const [isValidatingWallet, setIsValidatingWallet] = useState(false);
  const [walletValid, setWalletValid] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (!offer || !orderType) {
      toast.error('Invalid order data');
      navigate('/p2p');
    }
  }, [offer, orderType, navigate]);

  // Validate wallet address in real-time
  useEffect(() => {
    if (buyerWalletAddress && buyerWalletAddress.length > 10 && orderType === 'buy') {
      validateWallet();
    }
  }, [buyerWalletAddress]);

  const validateWallet = async () => {
    setIsValidatingWallet(true);
    try {
      const response = await axios.post(`${API}/api/wallet/validate`, {
        address: buyerWalletAddress,
        currency: crypto || offer.ad_data?.crypto_currency,
        network: walletNetwork || 'mainnet'
      });

      if (response.data.valid) {
        setWalletValid(true);
      } else {
        setWalletValid(false);
      }
    } catch (error) {
      setWalletValid(false);
    } finally {
      setIsValidatingWallet(false);
    }
  };

  const calculateTotal = () => {
    const amountNum = parseFloat(amount) || 0;
    return (amountNum * offer.price_per_unit).toFixed(2);
  };

  const handleConfirmOrder = async () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum < offer.min_limit) {
      toast.error(`Minimum amount is ${offer.min_limit} GBP`);
      return;
    }

    if (amountNum > offer.max_limit) {
      toast.error(`Maximum amount is ${offer.max_limit} GBP`);
      return;
    }

    if (orderType === 'buy' && (!buyerWalletAddress || !walletValid)) {
      toast.error('Please enter a valid wallet address');
      return;
    }

    if (!termsAccepted) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    setProcessing(true);
    try {
      // Get user from localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        toast.error('Please login to create orders');
        navigate('/login');
        return;
      }
      const user = JSON.parse(userStr);

      // Calculate crypto amount from fiat
      const cryptoAmount = amountNum / offer.price_per_unit;

      // Create trade via backend
      const tradeData = {
        sell_order_id: offer.offer_id || offer.ad_data?.ad_id,
        buyer_id: user.user_id,
        crypto_amount: cryptoAmount,
        fiat_amount: parseFloat(calculateTotal()),
        buyer_wallet_address: buyerWalletAddress,
        buyer_wallet_network: walletNetwork || 'mainnet',
        payment_method: offer.payment_methods[0] // Use first payment method
      };

      const response = await axios.post(`${API}/api/p2p/create-trade`, tradeData);

      if (response.data.success) {
        toast.success('Order created successfully! Crypto locked in escrow.');
        navigate(`/trade/${response.data.trade.trade_id}`);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.response?.data?.detail || 'Failed to create order');
    } finally {
      setProcessing(false);
    }
  };

  if (!offer) {
    return (
      <Layout>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>
          Loading...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Back Button */}
        <button
          onClick={() => navigate('/p2p')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'rgba(26, 31, 58, 0.8)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '12px',
            color: '#00F0FF',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '2rem'
          }}
        >
          <ArrowLeft size={18} />
          Back to P2P Trading
        </button>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '900', 
            color: '#00F0FF', 
            marginBottom: '0.5rem',
            textTransform: 'uppercase'
          }}>
            {orderType === 'buy' ? 'Buy' : 'Sell'} {crypto || offer.ad_data?.crypto_currency}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
            Confirm your order details below
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Left Column - Order Form */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.8)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <h2 style={{ color: '#00F0FF', fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>
              Order Details
            </h2>

            {/* Amount Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '0.875rem', 
                marginBottom: '0.5rem',
                fontWeight: '600'
              }}>
                I want to {orderType === 'buy' ? 'spend' : 'receive'} (GBP)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min: £${offer.min_limit} - Max: £${offer.max_limit}`}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '2px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '1rem'
                }}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.6)'
              }}>
                <span>Min: £{offer.min_limit}</span>
                <span>Max: £{offer.max_limit}</span>
              </div>
            </div>

            {/* Crypto Amount Display */}
            <div style={{
              padding: '1rem',
              background: 'rgba(0, 240, 255, 0.1)',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '10px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>
                You will {orderType === 'buy' ? 'receive' : 'send'}:
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#00F0FF' }}>
                {amount ? (parseFloat(amount) / offer.price_per_unit).toFixed(8) : '0.00000000'} {crypto || offer.ad_data?.crypto_currency}
              </div>
            </div>

            {/* Buyer Wallet Address (only for buy orders) */}
            {orderType === 'buy' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  color: 'rgba(255,255,255,0.8)', 
                  fontSize: '0.875rem', 
                  marginBottom: '0.5rem',
                  fontWeight: '600'
                }}>
                  Your Wallet Address <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={buyerWalletAddress}
                  onChange={(e) => setBuyerWalletAddress(e.target.value)}
                  placeholder={`Enter your ${crypto || offer.ad_data?.crypto_currency} wallet address`}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: `2px solid ${walletValid === true ? '#22C55E' : walletValid === false ? '#EF4444' : 'rgba(0, 240, 255, 0.3)'}`,
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '0.875rem'
                  }}
                />
                {isValidatingWallet && (
                  <div style={{ fontSize: '0.75rem', color: '#00F0FF', marginTop: '0.5rem' }}>
                    Validating wallet address...
                  </div>
                )}
                {walletValid === true && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#22C55E', marginTop: '0.5rem' }}>
                    <CheckCircle size={14} />
                    Valid wallet address
                  </div>
                )}
                {walletValid === false && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#EF4444', marginTop: '0.5rem' }}>
                    <AlertCircle size={14} />
                    Invalid wallet address
                  </div>
                )}
              </div>
            )}

            {/* Payment Method */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '0.875rem', 
                marginBottom: '0.5rem',
                fontWeight: '600'
              }}>
                Payment Method
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {offer.payment_methods && offer.payment_methods.map((method, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(0, 240, 255, 0.2)',
                      border: '2px solid #00F0FF',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      color: '#00F0FF',
                      fontWeight: '600'
                    }}
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>

            {/* Terms & Conditions */}
            <div style={{
              padding: '1rem',
              background: 'rgba(168, 85, 247, 0.1)',
              border: '2px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '10px',
              marginBottom: '1.5rem'
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={{ marginTop: '0.25rem', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5' }}>
                  I agree to the terms and conditions. I understand that crypto will be locked in escrow until payment is confirmed.
                </span>
              </label>
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleConfirmOrder}
              disabled={processing || (orderType === 'buy' && !walletValid)}
              style={{
                width: '100%',
                padding: '1.25rem',
                background: processing || (orderType === 'buy' && !walletValid)
                  ? 'rgba(0, 240, 255, 0.3)'
                  : 'linear-gradient(135deg, #00F0FF, #00B8E6)',
                border: 'none',
                borderRadius: '12px',
                color: processing || (orderType === 'buy' && !walletValid) ? 'rgba(255,255,255,0.5)' : '#0a1628',
                fontSize: '1.125rem',
                fontWeight: '700',
                cursor: processing || (orderType === 'buy' && !walletValid) ? 'not-allowed' : 'pointer',
                boxShadow: processing || (orderType === 'buy' && !walletValid) ? 'none' : '0 4px 20px rgba(0, 240, 255, 0.4)'
              }}
            >
              {processing ? 'Creating Order...' : `${orderType === 'buy' ? 'Buy' : 'Sell'} ${crypto || offer.ad_data?.crypto_currency}`}
            </button>
          </div>

          {/* Right Column - Seller/Buyer Info & Summary */}
          <div>
            {/* Counterparty Info */}
            <div style={{
              background: 'rgba(26, 31, 58, 0.8)',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#00F0FF', fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>
                {orderType === 'buy' ? 'Seller' : 'Buyer'} Information
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#0a1628'
                }}>
                  {(offer.seller_name || offer.buyer_name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#fff' }}>
                    {offer.seller_name || offer.buyer_name || 'User'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                    ⭐ {offer.seller_rating || offer.buyer_rating || 4.8} | {offer.completed_trades || 0} trades
                  </div>
                </div>
              </div>
              {offer.verified && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#22C55E' }}>
                  <Shield size={16} />
                  Verified Trader
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div style={{
              background: 'rgba(26, 31, 58, 0.8)',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#00F0FF', fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>
                Order Summary
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>Price per {crypto || offer.ad_data?.crypto_currency}:</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>£{offer.price_per_unit?.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>Amount:</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>
                    {amount ? (parseFloat(amount) / offer.price_per_unit).toFixed(8) : '0.00000000'} {crypto || offer.ad_data?.crypto_currency}
                  </span>
                </div>
                <div style={{ height: '1px', background: 'rgba(0, 240, 255, 0.3)', margin: '0.5rem 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem' }}>
                  <span style={{ color: '#fff', fontWeight: '700' }}>Total:</span>
                  <span style={{ color: '#00F0FF', fontWeight: '700' }}>£{calculateTotal()}</span>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div style={{
              padding: '1rem',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '2px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '12px',
              display: 'flex',
              gap: '0.75rem'
            }}>
              <Shield size={20} color="#22C55E" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>
                <div style={{ fontWeight: '700', color: '#22C55E', marginBottom: '0.25rem' }}>
                  Secure Escrow Protection
                </div>
                Your crypto will be safely locked in escrow until payment is confirmed. Never send payment outside the platform.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default OrderConfirmation;
