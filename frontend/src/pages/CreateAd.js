import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IoArrowBack } from 'react-icons/io5';
import axiosInstance from '@/utils/axiosConfig';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function CreateAd() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [creating, setCreating] = useState(false);
  
  // Single source of truth for ad type - "sell" or "buy" (lowercase)
  const [adType, setAdType] = useState(null);
  
  const [formData, setFormData] = useState({
    crypto_currency: 'BTC',
    fiat_currency: 'GBP',
    price_type: 'fixed',  // 'fixed' or 'floating'
    price_value: '',
    min_amount: '',
    max_amount: '',
    payment_methods: [],
    terms: ''
  });

  const [availableCryptos, setAvailableCryptos] = useState(['BTC', 'ETH', 'USDT']);
  const availableFiats = ['GBP', 'USD', 'EUR'];
  const availablePaymentMethods = [
    'sepa', 'faster_payments', 'swift', 'ach',
    'local_bank_transfer', 'wire_transfer', 'pix', 'interac'
  ];

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setCurrentUser(JSON.parse(userData));
    
    // Fetch available cryptocurrencies dynamically
    fetchAvailableCryptos();
  }, [navigate]);

  const fetchAvailableCryptos = async () => {
    try {
      const response = await axiosInstance.get('/p2p/marketplace/available-coins');
      if (response.data.success && response.data.coins.length > 0) {
        setAvailableCryptos(response.data.coins);
      }
    } catch (error) {
      console.error('Error fetching available cryptos:', error);
      // Keep default fallback
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePaymentMethod = (method) => {
    setFormData(prev => ({
      ...prev,
      payment_methods: prev.payment_methods.includes(method)
        ? prev.payment_methods.filter(m => m !== method)
        : [...prev.payment_methods, method]
    }));
  };

  const validateForm = () => {
    // Requirement 4: Form must not submit until EVERYTHING is filled
    if (!adType) {
      toast.error('Please select an ad type (Sell or Buy)');
      return false;
    }
    if (!formData.crypto_currency) {
      toast.error('Please select crypto asset');
      return false;
    }
    if (!formData.fiat_currency) {
      toast.error('Please select fiat currency');
      return false;
    }
    if (!formData.price_value || parseFloat(formData.price_value) <= 0) {
      toast.error('Please enter a valid price');
      return false;
    }
    if (!formData.min_amount || parseFloat(formData.min_amount) <= 0) {
      toast.error('Please enter a valid minimum amount');
      return false;
    }
    if (!formData.max_amount || parseFloat(formData.max_amount) <= 0) {
      toast.error('Please enter a valid maximum amount');
      return false;
    }
    if (parseFloat(formData.min_amount) >= parseFloat(formData.max_amount)) {
      toast.error('Maximum amount must be greater than minimum amount');
      return false;
    }
    if (formData.payment_methods.length === 0) {
      toast.error('Please select at least one payment method');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setCreating(true);
    try {
      // Requirement 3: Frontend must send only "sell" or "buy" (lowercase)
      // Requirement 5: Backend must save COMPLETE ad object
      const response = await axiosInstance.post('/p2p/create-ad', {
        ad_type: adType, // Already lowercase: "sell" or "buy"
        crypto_currency: formData.crypto_currency,
        fiat_currency: formData.fiat_currency,
        price_type: formData.price_type,  // 'fixed' or 'floating'
        price_value: parseFloat(formData.price_value),
        min_amount: parseFloat(formData.min_amount),
        max_amount: parseFloat(formData.max_amount),
        payment_methods: formData.payment_methods,
        terms: formData.terms || ''
      });

      if (response.data.success) {
        toast.success('Ad created successfully!');
        // Requirement 6: Trigger reload from database
        navigate('/p2p/merchant', { state: { refreshAds: true, timestamp: Date.now() } });
      }
    } catch (error) {
      console.error('Error creating ad:', error);
      toast.error(error.response?.data?.detail || 'Failed to create ad');
    } finally {
      setCreating(false);
    }
  };

  // Handler for ad type selection - Requirement 1: Correct logic
  const handleAdTypeSelect = (type) => {
    // type will be "sell" or "buy" (lowercase)
    setAdType(type);
    // Requirement 8: Form reset when toggling
    // Keep existing form data, just update ad type
  };

  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Premium Header Section */}
        <button
          onClick={() => navigate('/p2p/merchant')}
          style={{
            background: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '8px',
            color: '#00F0FF',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            marginBottom: '1.5rem',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(0, 240, 255, 0.2)';
            e.target.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(0, 240, 255, 0.1)';
            e.target.style.boxShadow = 'none';
          }}
        >
          <IoArrowBack size={20} />
          Back to Merchant Center
        </button>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: '900', 
            background: 'linear-gradient(135deg, #00F0FF, #7B2CFF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem' 
          }}>
            Create New P2P Ad
          </h1>
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.6)', 
            fontSize: '1rem', 
            fontWeight: '400',
            letterSpacing: '0.02em'
          }}>
            Set your trading terms and start receiving orders from the marketplace
          </p>
        </div>

        {/* Premium Glass Panel Form Container */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(26, 31, 58, 0.95), rgba(15, 20, 40, 0.98))',
          border: '2px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '24px',
          padding: '2.5rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        }}>
          <form onSubmit={handleSubmit}>
            {/* Ad Type Section */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                fontSize: '0.75rem', 
                fontWeight: '700',
                display: 'block', 
                marginBottom: '12px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em' 
              }}>
                Ad Type <span style={{ color: '#EF4444', fontSize: '0.7rem' }}>● REQUIRED</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* SELL Button */}
                <button
                  type="button"
                  onClick={() => handleAdTypeSelect('sell')}
                  style={{
                    height: '56px',
                    padding: '0 1.5rem',
                    background: adType === 'sell' 
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(34, 197, 94, 0.15))' 
                      : 'rgba(0, 0, 0, 0.3)',
                    border: `2px solid ${adType === 'sell' ? '#22C55E' : 'rgba(100, 100, 100, 0.3)'}`,
                    borderRadius: '12px',
                    color: adType === 'sell' ? '#22C55E' : 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: adType === 'sell' ? '0 0 20px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : 'none',
                    transition: 'all 0.2s ease',
                    transform: adType === 'sell' ? 'scale(1.02)' : 'scale(1)'
                  }}
                >
                  I Want to SELL Crypto
                </button>
                
                {/* BUY Button */}
                <button
                  type="button"
                  onClick={() => handleAdTypeSelect('buy')}
                  style={{
                    height: '56px',
                    padding: '0 1.5rem',
                    background: adType === 'buy' 
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(34, 197, 94, 0.15))' 
                      : 'rgba(0, 0, 0, 0.3)',
                    border: `2px solid ${adType === 'buy' ? '#22C55E' : 'rgba(100, 100, 100, 0.3)'}`,
                    borderRadius: '12px',
                    color: adType === 'buy' ? '#22C55E' : 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: adType === 'buy' ? '0 0 20px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : 'none',
                    transition: 'all 0.2s ease',
                    transform: adType === 'buy' ? 'scale(1.02)' : 'scale(1)'
                  }}
                >
                  I Want to BUY Crypto
                </button>
              </div>
              
              {/* Selection Indicator */}
              {adType && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  borderRadius: '12px',
                  color: '#22C55E',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>✓</span>
                  <span>You are <strong>{adType === 'sell' ? 'SELLING' : 'BUYING'}</strong> {formData.crypto_currency}</span>
                </div>
              )}
            </div>

          {/* Asset Selection */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.9)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ color: '#888', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                  Crypto Asset
                </label>
                <select
                  value={formData.crypto_currency}
                  onChange={(e) => handleChange('crypto_currency', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  {availableCryptos.map(crypto => (
                    <option key={crypto} value={crypto}>{crypto}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ color: '#888', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                  Fiat Currency
                </label>
                <select
                  value={formData.fiat_currency}
                  onChange={(e) => handleChange('fiat_currency', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  {availableFiats.map(fiat => (
                    <option key={fiat} value={fiat}>{fiat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.9)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <label style={{ color: '#888', fontSize: '0.875rem', display: 'block', marginBottom: '0.75rem' }}>
              Pricing Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => handleChange('price_type', 'fixed')}
                style={{
                  padding: '0.75rem',
                  background: formData.price_type === 'fixed' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                  border: `2px solid ${formData.price_type === 'fixed' ? '#00F0FF' : 'rgba(0, 240, 255, 0.2)'}`,
                  borderRadius: '8px',
                  color: formData.price_type === 'fixed' ? '#00F0FF' : '#888',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Fixed Price
              </button>
              <button
                type="button"
                onClick={() => handleChange('price_type', 'floating')}
                style={{
                  padding: '0.75rem',
                  background: formData.price_type === 'floating' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                  border: `2px solid ${formData.price_type === 'floating' ? '#00F0FF' : 'rgba(0, 240, 255, 0.2)'}`,
                  borderRadius: '8px',
                  color: formData.price_type === 'floating' ? '#00F0FF' : '#888',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Floating (% Margin)
              </button>
            </div>

            <Input
              type="number"
              value={formData.price_value}
              onChange={(e) => handleChange('price_value', e.target.value)}
              placeholder={formData.price_type === 'fixed' ? 'Enter fixed price (e.g., 45000)' : 'Enter margin % (e.g., 2.5)'}
              style={{
                fontSize: '1.125rem',
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

          {/* Trade Limits */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.9)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <label style={{ color: '#888', fontSize: '0.875rem', display: 'block', marginBottom: '0.75rem' }}>
              Trade Limits ({formData.crypto_currency})
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ color: '#666', fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem' }}>
                  Minimum
                </label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={formData.min_amount}
                  onChange={(e) => handleChange('min_amount', e.target.value)}
                  placeholder="0.01"
                  style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#fff',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    width: '100%'
                  }}
                />
              </div>
              <div>
                <label style={{ color: '#666', fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem' }}>
                  Maximum
                </label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={formData.max_amount}
                  onChange={(e) => handleChange('max_amount', e.target.value)}
                  placeholder="1.0"
                  style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#fff',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    width: '100%'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.9)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <label style={{ color: '#888', fontSize: '0.875rem', display: 'block', marginBottom: '0.75rem' }}>
              Payment Methods (Select at least one)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {availablePaymentMethods.map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => togglePaymentMethod(method)}
                  style={{
                    padding: '0.75rem',
                    background: formData.payment_methods.includes(method) ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                    border: `2px solid ${formData.payment_methods.includes(method) ? '#00F0FF' : 'rgba(0, 240, 255, 0.2)'}`,
                    borderRadius: '8px',
                    color: formData.payment_methods.includes(method) ? '#00F0FF' : '#888',
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  {method.replace(/_/g, ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Terms (Optional) */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.9)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <label style={{ color: '#888', fontSize: '0.875rem', display: 'block', marginBottom: '0.75rem' }}>
              Terms & Conditions (Optional)
            </label>
            <textarea
              value={formData.terms}
              onChange={(e) => handleChange('terms', e.target.value)}
              placeholder="Enter any special terms or instructions for buyers..."
              rows={4}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '0.9375rem',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Submit Button - Requirement 4 */}
          <button
            type="submit"
            disabled={
              creating || 
              !adType || 
              !formData.crypto_currency || 
              !formData.fiat_currency || 
              !formData.price_value || 
              !formData.min_amount || 
              !formData.max_amount || 
              formData.payment_methods.length === 0
            }
            style={{
              width: '100%',
              minHeight: '60px',
              background: (
                creating || 
                !adType || 
                !formData.crypto_currency || 
                !formData.fiat_currency || 
                !formData.price_value || 
                !formData.min_amount || 
                !formData.max_amount || 
                formData.payment_methods.length === 0
              ) 
                ? 'rgba(100,100,100,0.5)' 
                : 'linear-gradient(135deg, #22C55E, #16A34A)',
              border: 'none',
              borderRadius: '16px',
              fontSize: '1.125rem',
              fontWeight: '900',
              color: (
                creating || 
                !adType || 
                !formData.crypto_currency || 
                !formData.fiat_currency || 
                !formData.price_value || 
                !formData.min_amount || 
                !formData.max_amount || 
                formData.payment_methods.length === 0
              ) ? '#666' : '#fff',
              cursor: (
                creating || 
                !adType || 
                !formData.crypto_currency || 
                !formData.fiat_currency || 
                !formData.price_value || 
                !formData.min_amount || 
                !formData.max_amount || 
                formData.payment_methods.length === 0
              ) ? 'not-allowed' : 'pointer',
              boxShadow: (
                creating || 
                !adType || 
                !formData.crypto_currency || 
                !formData.fiat_currency || 
                !formData.price_value || 
                !formData.min_amount || 
                !formData.max_amount || 
                formData.payment_methods.length === 0
              ) 
                ? 'none' 
                : '0 4px 24px rgba(34, 197, 94, 0.5), 0 0 40px rgba(34, 197, 94, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'all 0.3s',
              opacity: (
                creating || 
                !adType || 
                !formData.crypto_currency || 
                !formData.fiat_currency || 
                !formData.price_value || 
                !formData.min_amount || 
                !formData.max_amount || 
                formData.payment_methods.length === 0
              ) ? 0.6 : 1
            }}
          >
            {creating ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                Creating Ad...
              </>
            ) : (
              'Publish Ad'
            )}
          </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
