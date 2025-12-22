import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IoArrowBack, IoCheckmarkCircle } from 'react-icons/io5';
import axiosInstance from '@/utils/axiosConfig';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

// ═══════════════════════════════════════════════════════════════════════════════
// UI POLISH STYLES - Box Hierarchy Tiers
// ═══════════════════════════════════════════════════════════════════════════════
const BOX_STYLES = {
  // Tier 1 (Primary): Ad Type, Asset, Pricing - strongest visual weight
  primary: {
    background: 'rgba(26, 31, 58, 0.95)',
    border: '2px solid rgba(0, 255, 200, 0.28)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 4px 20px rgba(0, 255, 200, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    transition: 'all 0.2s ease'
  },
  // Tier 2 (Secondary): Limits, Payment Methods - medium visual weight
  secondary: {
    background: 'rgba(26, 31, 58, 0.9)',
    border: '1.5px solid rgba(0, 255, 200, 0.18)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 2px 12px rgba(0, 255, 200, 0.04)',
    transition: 'all 0.2s ease'
  },
  // Tier 3 (Optional): Terms - muted visual weight
  optional: {
    background: 'rgba(26, 31, 58, 0.85)',
    border: '1px solid rgba(0, 255, 200, 0.12)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: 'none',
    transition: 'all 0.2s ease'
  }
};

// Typography styles
const TYPOGRAPHY = {
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '0.8125rem',
    fontWeight: '600',
    display: 'block',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  },
  label: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: '0.6875rem',
    fontWeight: '500',
    display: 'block',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  requiredTag: {
    color: '#EF4444',
    fontSize: '0.625rem',
    fontWeight: '600',
    marginLeft: '6px',
    letterSpacing: '0.04em'
  }
};

// Input/Select base styles
const getInputStyle = (isFocused = false, hasError = false) => ({
  width: '100%',
  padding: '0.875rem 1rem',
  background: 'rgba(0, 0, 0, 0.35)',
  border: hasError 
    ? '2px solid rgba(239, 68, 68, 0.7)' 
    : isFocused 
      ? '2px solid rgba(0, 255, 200, 0.5)' 
      : '1.5px solid rgba(0, 255, 200, 0.2)',
  borderRadius: '10px',
  color: '#fff',
  fontSize: '1rem',
  fontWeight: '600',
  outline: 'none',
  transition: 'all 0.2s ease',
  boxShadow: isFocused ? '0 0 0 3px rgba(0, 255, 200, 0.1), inset 0 1px 2px rgba(0, 0, 0, 0.2)' : 'none'
});

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

  // Focus states for inputs
  const [focusedField, setFocusedField] = useState(null);

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

  // Check if form is valid for button state
  const isFormValid = () => {
    return (
      adType &&
      formData.crypto_currency &&
      formData.fiat_currency &&
      formData.price_value &&
      parseFloat(formData.price_value) > 0 &&
      formData.min_amount &&
      parseFloat(formData.min_amount) > 0 &&
      formData.max_amount &&
      parseFloat(formData.max_amount) > 0 &&
      formData.payment_methods.length > 0
    );
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
        // ═══════════════════════════════════════════════════════════════
        // SUCCESS TOAST - Premium styling
        // ═══════════════════════════════════════════════════════════════
        toast.success(
          <div style={{ lineHeight: '1.5' }}>
            <div style={{ fontWeight: '600', fontSize: '0.9375rem', marginBottom: '4px' }}>
              P2P Ad Created
            </div>
            <div style={{ fontSize: '0.8125rem', opacity: 0.85 }}>
              Your ad is now live in the marketplace.
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.65, marginTop: '4px' }}>
              Manage it from your P2P Ads page.
            </div>
          </div>,
          { duration: 4000 }
        );
        // Requirement 6: Trigger reload from database
        navigate('/p2p/merchant', { state: { refreshAds: true, timestamp: Date.now() } });
      }
    } catch (error) {
      console.error('Error creating ad:', error);
      // ═══════════════════════════════════════════════════════════════
      // ERROR TOAST - Clean user-friendly messages
      // ═══════════════════════════════════════════════════════════════
      let errorMessage = "Couldn't create ad. Check your connection and try again.";
      if (error.response?.status === 400) {
        errorMessage = 'Please complete all required fields.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You need to activate your seller account first.';
      }
      toast.error(
        <div style={{ lineHeight: '1.4' }}>
          <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
            {errorMessage}
          </div>
        </div>
      );
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

  // Payment method pill style generator
  const getPaymentPillStyle = (method, isHovered = false) => {
    const isSelected = formData.payment_methods.includes(method);
    return {
      padding: '0.75rem 1rem',
      background: isSelected 
        ? 'rgba(0, 255, 200, 0.15)' 
        : isHovered 
          ? 'rgba(0, 255, 200, 0.05)' 
          : 'transparent',
      border: isSelected 
        ? '2px solid rgba(0, 255, 200, 0.5)' 
        : isHovered 
          ? '1.5px solid rgba(0, 255, 200, 0.35)' 
          : '1.5px solid rgba(0, 255, 200, 0.18)',
      borderRadius: '10px',
      color: isSelected ? 'rgba(0, 255, 200, 1)' : isHovered ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.5)',
      fontSize: '0.8125rem',
      fontWeight: isSelected ? '600' : '500',
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.15s ease',
      boxShadow: isSelected ? '0 0 12px rgba(0, 255, 200, 0.2)' : 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px'
    };
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
            fontSize: '2.25rem', 
            fontWeight: '700', 
            background: 'linear-gradient(135deg, #00F0FF, #7B2CFF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem',
            letterSpacing: '-0.01em'
          }}>
            Create New P2P Ad
          </h1>
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.5)', 
            fontSize: '0.9375rem', 
            fontWeight: '400',
            letterSpacing: '0.01em'
          }}>
            Set your trading terms and start receiving orders from the marketplace
          </p>
        </div>

        {/* Premium Glass Panel Form Container */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(26, 31, 58, 0.95), rgba(15, 20, 40, 0.98))',
          border: '1.5px solid rgba(0, 255, 200, 0.15)',
          borderRadius: '20px',
          padding: '2rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        }}>
          <form onSubmit={handleSubmit}>
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TIER 1: Ad Type Section (Primary) */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div style={BOX_STYLES.primary}>
              <label style={TYPOGRAPHY.sectionTitle}>
                Ad Type <span style={TYPOGRAPHY.requiredTag}>REQUIRED</span>
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
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(34, 197, 94, 0.1))' 
                      : 'rgba(0, 0, 0, 0.25)',
                    border: `2px solid ${adType === 'sell' ? 'rgba(34, 197, 94, 0.7)' : 'rgba(100, 100, 100, 0.25)'}`,
                    borderRadius: '12px',
                    color: adType === 'sell' ? '#22C55E' : 'rgba(255, 255, 255, 0.45)',
                    fontSize: '0.9375rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: adType === 'sell' ? '0 0 20px rgba(34, 197, 94, 0.3)' : 'none',
                    transition: 'all 0.2s ease',
                    transform: adType === 'sell' ? 'scale(1.01)' : 'scale(1)'
                  }}
                  onMouseEnter={(e) => {
                    if (adType !== 'sell') {
                      e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.4)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (adType !== 'sell') {
                      e.currentTarget.style.borderColor = 'rgba(100, 100, 100, 0.25)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)';
                    }
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
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(34, 197, 94, 0.1))' 
                      : 'rgba(0, 0, 0, 0.25)',
                    border: `2px solid ${adType === 'buy' ? 'rgba(34, 197, 94, 0.7)' : 'rgba(100, 100, 100, 0.25)'}`,
                    borderRadius: '12px',
                    color: adType === 'buy' ? '#22C55E' : 'rgba(255, 255, 255, 0.45)',
                    fontSize: '0.9375rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: adType === 'buy' ? '0 0 20px rgba(34, 197, 94, 0.3)' : 'none',
                    transition: 'all 0.2s ease',
                    transform: adType === 'buy' ? 'scale(1.01)' : 'scale(1)'
                  }}
                  onMouseEnter={(e) => {
                    if (adType !== 'buy') {
                      e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.4)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (adType !== 'buy') {
                      e.currentTarget.style.borderColor = 'rgba(100, 100, 100, 0.25)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)';
                    }
                  }}
                >
                  I Want to BUY Crypto
                </button>
              </div>
              
              {/* Selection Indicator */}
              {adType && (
                <div style={{
                  marginTop: '16px',
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(34, 197, 94, 0.04))',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  borderRadius: '10px',
                  color: '#22C55E',
                  fontSize: '0.8125rem',
                  fontWeight: '500',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <IoCheckmarkCircle size={16} />
                  <span>You are <strong style={{ fontWeight: '600' }}>{adType === 'sell' ? 'SELLING' : 'BUYING'}</strong> {formData.crypto_currency}</span>
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TIER 1: Asset Selection (Primary) */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div style={BOX_STYLES.primary}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={TYPOGRAPHY.label}>
                    Crypto Asset
                  </label>
                  <select
                    value={formData.crypto_currency}
                    onChange={(e) => handleChange('crypto_currency', e.target.value)}
                    onFocus={() => setFocusedField('crypto')}
                    onBlur={() => setFocusedField(null)}
                    style={getInputStyle(focusedField === 'crypto')}
                  >
                    {availableCryptos.map(crypto => (
                      <option key={crypto} value={crypto} style={{ background: '#1a1f3a', color: '#fff' }}>{crypto}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={TYPOGRAPHY.label}>
                    Fiat Currency
                  </label>
                  <select
                    value={formData.fiat_currency}
                    onChange={(e) => handleChange('fiat_currency', e.target.value)}
                    onFocus={() => setFocusedField('fiat')}
                    onBlur={() => setFocusedField(null)}
                    style={getInputStyle(focusedField === 'fiat')}
                  >
                    {availableFiats.map(fiat => (
                      <option key={fiat} value={fiat} style={{ background: '#1a1f3a', color: '#fff' }}>{fiat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TIER 1: Pricing (Primary) */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div style={BOX_STYLES.primary}>
              <label style={TYPOGRAPHY.sectionTitle}>
                Pricing Mode
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => handleChange('price_type', 'fixed')}
                  style={{
                    padding: '0.875rem',
                    background: formData.price_type === 'fixed' ? 'rgba(0, 255, 200, 0.12)' : 'transparent',
                    border: formData.price_type === 'fixed' 
                      ? '2px solid rgba(0, 255, 200, 0.5)' 
                      : '1.5px solid rgba(0, 255, 200, 0.18)',
                    borderRadius: '10px',
                    color: formData.price_type === 'fixed' ? 'rgba(0, 255, 200, 1)' : 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.875rem',
                    fontWeight: formData.price_type === 'fixed' ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: formData.price_type === 'fixed' ? '0 0 12px rgba(0, 255, 200, 0.15)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (formData.price_type !== 'fixed') {
                      e.currentTarget.style.borderColor = 'rgba(0, 255, 200, 0.35)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (formData.price_type !== 'fixed') {
                      e.currentTarget.style.borderColor = 'rgba(0, 255, 200, 0.18)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                    }
                  }}
                >
                  Fixed Price
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('price_type', 'floating')}
                  style={{
                    padding: '0.875rem',
                    background: formData.price_type === 'floating' ? 'rgba(0, 255, 200, 0.12)' : 'transparent',
                    border: formData.price_type === 'floating' 
                      ? '2px solid rgba(0, 255, 200, 0.5)' 
                      : '1.5px solid rgba(0, 255, 200, 0.18)',
                    borderRadius: '10px',
                    color: formData.price_type === 'floating' ? 'rgba(0, 255, 200, 1)' : 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.875rem',
                    fontWeight: formData.price_type === 'floating' ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: formData.price_type === 'floating' ? '0 0 12px rgba(0, 255, 200, 0.15)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (formData.price_type !== 'floating') {
                      e.currentTarget.style.borderColor = 'rgba(0, 255, 200, 0.35)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (formData.price_type !== 'floating') {
                      e.currentTarget.style.borderColor = 'rgba(0, 255, 200, 0.18)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                    }
                  }}
                >
                  Floating (% Margin)
                </button>
              </div>

              <Input
                type="number"
                value={formData.price_value}
                onChange={(e) => handleChange('price_value', e.target.value)}
                onFocus={() => setFocusedField('price')}
                onBlur={() => setFocusedField(null)}
                placeholder={formData.price_type === 'fixed' ? 'Enter fixed price (e.g., 45000)' : 'Enter margin % (e.g., 2.5 or -1.5)'}
                style={{
                  ...getInputStyle(focusedField === 'price'),
                  fontSize: '1.125rem',
                  fontWeight: '600'
                }}
              />
              {formData.price_type === 'floating' && (
                <p style={{ 
                  marginTop: '8px', 
                  fontSize: '0.75rem', 
                  color: 'rgba(255, 255, 255, 0.45)',
                  letterSpacing: '0.02em'
                }}>
                  Positive = above market rate | Negative = below market rate
                </p>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TIER 2: Trade Limits (Secondary) */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div style={BOX_STYLES.secondary}>
              <label style={TYPOGRAPHY.sectionTitle}>
                Trade Limits ({formData.crypto_currency})
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={TYPOGRAPHY.label}>
                    Minimum
                  </label>
                  <Input
                    type="number"
                    step="0.00000001"
                    value={formData.min_amount}
                    onChange={(e) => handleChange('min_amount', e.target.value)}
                    onFocus={() => setFocusedField('min')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="0.01"
                    style={getInputStyle(focusedField === 'min')}
                  />
                </div>
                <div>
                  <label style={TYPOGRAPHY.label}>
                    Maximum
                  </label>
                  <Input
                    type="number"
                    step="0.00000001"
                    value={formData.max_amount}
                    onChange={(e) => handleChange('max_amount', e.target.value)}
                    onFocus={() => setFocusedField('max')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="1.0"
                    style={getInputStyle(focusedField === 'max')}
                  />
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TIER 2: Payment Methods (Secondary) */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div style={BOX_STYLES.secondary}>
              <label style={TYPOGRAPHY.sectionTitle}>
                Payment Methods <span style={TYPOGRAPHY.requiredTag}>SELECT AT LEAST ONE</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                {availablePaymentMethods.map(method => {
                  const isSelected = formData.payment_methods.includes(method);
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => togglePaymentMethod(method)}
                      style={getPaymentPillStyle(method)}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'rgba(0, 255, 200, 0.35)';
                          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                          e.currentTarget.style.background = 'rgba(0, 255, 200, 0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'rgba(0, 255, 200, 0.18)';
                          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {isSelected && <IoCheckmarkCircle size={14} />}
                      {method.replace(/_/g, ' ').toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TIER 3: Terms (Optional) */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div style={BOX_STYLES.optional}>
              <label style={{ ...TYPOGRAPHY.sectionTitle, opacity: 0.7 }}>
                Terms & Conditions <span style={{ ...TYPOGRAPHY.requiredTag, color: 'rgba(255,255,255,0.4)' }}>OPTIONAL</span>
              </label>
              <textarea
                value={formData.terms}
                onChange={(e) => handleChange('terms', e.target.value)}
                onFocus={() => setFocusedField('terms')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter any special terms or instructions for buyers..."
                rows={3}
                style={{
                  ...getInputStyle(focusedField === 'terms'),
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  minHeight: '80px'
                }}
              />
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* Submit Button - Disabled state must be obvious */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <button
              type="submit"
              disabled={creating || !isFormValid()}
              style={{
                width: '100%',
                minHeight: '56px',
                background: (creating || !isFormValid())
                  ? 'rgba(80, 80, 80, 0.4)' 
                  : 'linear-gradient(135deg, #22C55E, #16A34A)',
                border: (creating || !isFormValid())
                  ? '1.5px solid rgba(100, 100, 100, 0.3)'
                  : 'none',
                borderRadius: '14px',
                fontSize: '1rem',
                fontWeight: '700',
                color: (creating || !isFormValid()) ? 'rgba(255, 255, 255, 0.35)' : '#fff',
                cursor: (creating || !isFormValid()) ? 'not-allowed' : 'pointer',
                boxShadow: (creating || !isFormValid()) 
                  ? 'none' 
                  : '0 4px 20px rgba(34, 197, 94, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                transition: 'all 0.25s ease',
                opacity: (creating || !isFormValid()) ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!creating && isFormValid()) {
                  e.currentTarget.style.boxShadow = '0 6px 28px rgba(34, 197, 94, 0.5)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!creating && isFormValid()) {
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(34, 197, 94, 0.4)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {creating ? (
                <>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}></div>
                  Creating Ad...
                </>
              ) : (
                'Publish Ad'
              )}
            </button>

            {/* Validation hint when button is disabled */}
            {!isFormValid() && !creating && (
              <p style={{
                textAlign: 'center',
                marginTop: '12px',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.4)',
                letterSpacing: '0.02em'
              }}>
                Complete all required fields to publish
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
}
