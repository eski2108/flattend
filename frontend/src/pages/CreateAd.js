import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IoArrowBack, IoCheckmarkCircle } from 'react-icons/io5';
import axiosInstance from '@/utils/axiosConfig';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function CreateAd() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [creating, setCreating] = useState(false);
  const [adType, setAdType] = useState(null);
  
  const [formData, setFormData] = useState({
    crypto_currency: 'BTC',
    fiat_currency: 'GBP',
    price_type: 'fixed',
    price_value: '',
    min_amount: '',
    max_amount: '',
    payment_methods: [],
    terms: ''
  });

  const [focusedField, setFocusedField] = useState(null);
  const [hoveredPill, setHoveredPill] = useState(null);

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

  const validateForm = () => {
    if (!adType) {
      toast.error('Please select an ad type (Sell or Buy)');
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
      toast.error('Maximum must be greater than minimum');
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
      const response = await axiosInstance.post('/p2p/create-ad', {
        ad_type: adType,
        crypto_currency: formData.crypto_currency,
        fiat_currency: formData.fiat_currency,
        price_type: formData.price_type,
        price_value: parseFloat(formData.price_value),
        min_amount: parseFloat(formData.min_amount),
        max_amount: parseFloat(formData.max_amount),
        payment_methods: formData.payment_methods,
        terms: formData.terms || ''
      });

      if (response.data.success) {
        toast.success(
          <div style={{ lineHeight: '1.6' }}>
            <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '6px', color: '#22C55E' }}>
              P2P Ad Created
            </div>
            <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
              Your ad is now live in the marketplace.
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '6px' }}>
              Manage it anytime from your Merchant page.
            </div>
          </div>,
          { duration: 4000 }
        );
        navigate('/p2p/merchant', { state: { refreshAds: true, timestamp: Date.now() } });
      }
    } catch (error) {
      console.error('Error creating ad:', error);
      let errorMessage = "Couldn't create ad. Check your connection and try again.";
      if (error.response?.status === 400) {
        errorMessage = 'Please complete all required fields.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You need to activate your seller account first.';
      }
      toast.error(
        <div style={{ lineHeight: '1.5' }}>
          <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
            {errorMessage}
          </div>
        </div>
      );
    } finally {
      setCreating(false);
    }
  };

  const handleAdTypeSelect = (type) => {
    setAdType(type);
  };

  return (
    <>
      {/* WIDE DESKTOP CONTAINER - Exchange-grade layout */}
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #050816 0%, #0a0e27 100%)',
        padding: '24px 32px 40px'
      }}>
        {/* MAX WIDTH 1600px for desktop - proper exchange width */}
        <div style={{
          maxWidth: '1600px',
          margin: '0 auto',
          width: '100%'
        }}>
          {/* Back Button */}
          <button
            onClick={() => navigate('/p2p/merchant')}
            style={{
              background: 'linear-gradient(135deg, rgba(0, 255, 200, 0.08), rgba(0, 255, 200, 0.03))',
              border: '1px solid rgba(0, 255, 200, 0.25)',
              borderRadius: '10px',
              color: 'rgba(0, 255, 200, 0.9)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '10px 18px',
              marginBottom: '24px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 200, 0.15), rgba(0, 255, 200, 0.08))';
              e.currentTarget.style.borderColor = 'rgba(0, 255, 200, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 200, 0.08), rgba(0, 255, 200, 0.03))';
              e.currentTarget.style.borderColor = 'rgba(0, 255, 200, 0.25)';
            }}
          >
            <IoArrowBack size={18} />
            Back to Merchant Center
          </button>

          {/* Page Header - Left aligned for wide layout */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ 
              fontSize: '2.25rem', 
              fontWeight: '800', 
              background: 'linear-gradient(135deg, #00FFD0 0%, #00E5FF 50%, #7B61FF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px',
              letterSpacing: '-0.02em'
            }}>
              Create New P2P Ad
            </h1>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.5)', 
              fontSize: '1rem', 
              fontWeight: '400'
            }}>
              Set your trading terms and start receiving orders from buyers worldwide
            </p>
          </div>

          {/* MAIN FORM - Wide layout with 2-column grid for desktop */}
          <form onSubmit={handleSubmit}>
            
            {/* TOP ROW: Ad Type + Asset Selection side by side */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '24px',
              marginBottom: '24px'
            }}>
              {/* TIER 1: AD TYPE */}
              <div style={{
                background: 'linear-gradient(145deg, rgba(0, 255, 200, 0.05), rgba(0, 255, 200, 0.02))',
                border: '1.5px solid rgba(0, 255, 200, 0.2)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 4px 30px rgba(0, 255, 200, 0.06)'
              }}>
                <label style={{ 
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.8125rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  Ad Type
                  <span style={{ 
                    background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                    color: '#fff',
                    fontSize: '0.5625rem',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}>REQUIRED</span>
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => handleAdTypeSelect('sell')}
                    style={{
                      height: '56px',
                      background: adType === 'sell' 
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.08))' 
                        : 'rgba(0, 0, 0, 0.25)',
                      border: adType === 'sell' 
                        ? '2px solid rgba(34, 197, 94, 0.7)' 
                        : '1.5px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: adType === 'sell' ? '#22C55E' : 'rgba(255, 255, 255, 0.4)',
                      fontSize: '0.9375rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: adType === 'sell' ? '0 0 30px rgba(34, 197, 94, 0.3)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (adType !== 'sell') {
                        e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.4)';
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (adType !== 'sell') {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)';
                      }
                    }}
                  >
                    SELL Crypto
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleAdTypeSelect('buy')}
                    style={{
                      height: '56px',
                      background: adType === 'buy' 
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.08))' 
                        : 'rgba(0, 0, 0, 0.25)',
                      border: adType === 'buy' 
                        ? '2px solid rgba(34, 197, 94, 0.7)' 
                        : '1.5px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: adType === 'buy' ? '#22C55E' : 'rgba(255, 255, 255, 0.4)',
                      fontSize: '0.9375rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: adType === 'buy' ? '0 0 30px rgba(34, 197, 94, 0.3)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (adType !== 'buy') {
                        e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.4)';
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (adType !== 'buy') {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)';
                      }
                    }}
                  >
                    BUY Crypto
                  </button>
                </div>
                
                {adType && (
                  <div style={{
                    marginTop: '14px',
                    padding: '12px 16px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '10px',
                    color: '#22C55E',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    <IoCheckmarkCircle size={18} />
                    You are {adType === 'sell' ? 'SELLING' : 'BUYING'} {formData.crypto_currency}
                  </div>
                )}
              </div>

              {/* TIER 1: ASSET SELECTION */}
              <div style={{
                background: 'linear-gradient(145deg, rgba(0, 255, 200, 0.05), rgba(0, 255, 200, 0.02))',
                border: '1.5px solid rgba(0, 255, 200, 0.2)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 4px 30px rgba(0, 255, 200, 0.06)'
              }}>
                <label style={{ 
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.8125rem',
                  fontWeight: '700',
                  display: 'block',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  Trading Pair
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ 
                      color: 'rgba(255, 255, 255, 0.45)',
                      fontSize: '0.625rem',
                      fontWeight: '600',
                      display: 'block',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>
                      Crypto
                    </label>
                    <select
                      value={formData.crypto_currency}
                      onChange={(e) => handleChange('crypto_currency', e.target.value)}
                      onFocus={() => setFocusedField('crypto')}
                      onBlur={() => setFocusedField(null)}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: focusedField === 'crypto' 
                          ? '2px solid rgba(0, 255, 200, 0.5)' 
                          : '1.5px solid rgba(0, 255, 200, 0.12)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        outline: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: focusedField === 'crypto' ? '0 0 20px rgba(0, 255, 200, 0.1)' : 'none'
                      }}
                    >
                      {availableCryptos.map(crypto => (
                        <option key={crypto} value={crypto} style={{ background: '#0a0e27', color: '#fff' }}>{crypto}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ 
                      color: 'rgba(255, 255, 255, 0.45)',
                      fontSize: '0.625rem',
                      fontWeight: '600',
                      display: 'block',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>
                      Fiat
                    </label>
                    <select
                      value={formData.fiat_currency}
                      onChange={(e) => handleChange('fiat_currency', e.target.value)}
                      onFocus={() => setFocusedField('fiat')}
                      onBlur={() => setFocusedField(null)}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: focusedField === 'fiat' 
                          ? '2px solid rgba(0, 255, 200, 0.5)' 
                          : '1.5px solid rgba(0, 255, 200, 0.12)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        outline: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: focusedField === 'fiat' ? '0 0 20px rgba(0, 255, 200, 0.1)' : 'none'
                      }}
                    >
                      {availableFiats.map(fiat => (
                        <option key={fiat} value={fiat} style={{ background: '#0a0e27', color: '#fff' }}>{fiat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* SECOND ROW: Pricing + Trade Limits side by side */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '24px',
              marginBottom: '24px'
            }}>
              {/* TIER 1: PRICING */}
              <div style={{
                background: 'linear-gradient(145deg, rgba(0, 255, 200, 0.05), rgba(0, 255, 200, 0.02))',
                border: '1.5px solid rgba(0, 255, 200, 0.2)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 4px 30px rgba(0, 255, 200, 0.06)'
              }}>
                <label style={{ 
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.8125rem',
                  fontWeight: '700',
                  display: 'block',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  Pricing Mode
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() => handleChange('price_type', 'fixed')}
                    style={{
                      padding: '14px',
                      background: formData.price_type === 'fixed' 
                        ? 'linear-gradient(135deg, rgba(0, 255, 200, 0.15), rgba(0, 255, 200, 0.06))' 
                        : 'transparent',
                      border: formData.price_type === 'fixed' 
                        ? '2px solid rgba(0, 255, 200, 0.5)' 
                        : '1.5px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: formData.price_type === 'fixed' ? '#00FFD0' : 'rgba(255, 255, 255, 0.4)',
                      fontSize: '0.875rem',
                      fontWeight: formData.price_type === 'fixed' ? '700' : '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: formData.price_type === 'fixed' ? '0 0 20px rgba(0, 255, 200, 0.15)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (formData.price_type !== 'fixed') {
                        e.currentTarget.style.borderColor = 'rgba(0, 255, 200, 0.3)';
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (formData.price_type !== 'fixed') {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)';
                      }
                    }}
                  >
                    Fixed Price
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('price_type', 'floating')}
                    style={{
                      padding: '14px',
                      background: formData.price_type === 'floating' 
                        ? 'linear-gradient(135deg, rgba(0, 255, 200, 0.15), rgba(0, 255, 200, 0.06))' 
                        : 'transparent',
                      border: formData.price_type === 'floating' 
                        ? '2px solid rgba(0, 255, 200, 0.5)' 
                        : '1.5px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: formData.price_type === 'floating' ? '#00FFD0' : 'rgba(255, 255, 255, 0.4)',
                      fontSize: '0.875rem',
                      fontWeight: formData.price_type === 'floating' ? '700' : '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: formData.price_type === 'floating' ? '0 0 20px rgba(0, 255, 200, 0.15)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (formData.price_type !== 'floating') {
                        e.currentTarget.style.borderColor = 'rgba(0, 255, 200, 0.3)';
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (formData.price_type !== 'floating') {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)';
                      }
                    }}
                  >
                    Floating %
                  </button>
                </div>

                <input
                  type="number"
                  value={formData.price_value}
                  onChange={(e) => handleChange('price_value', e.target.value)}
                  onFocus={() => setFocusedField('price')}
                  onBlur={() => setFocusedField(null)}
                  placeholder={formData.price_type === 'fixed' ? 'Enter price (e.g., 45000)' : 'Enter margin % (e.g., 2.5)'}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: focusedField === 'price' 
                      ? '2px solid rgba(0, 255, 200, 0.5)' 
                      : '1.5px solid rgba(0, 255, 200, 0.12)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: focusedField === 'price' ? '0 0 20px rgba(0, 255, 200, 0.1)' : 'none'
                  }}
                />
                {formData.price_type === 'floating' && (
                  <p style={{ marginTop: '10px', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                    Positive = above market | Negative = below market
                  </p>
                )}
              </div>

              {/* TIER 2: TRADE LIMITS */}
              <div style={{
                background: 'rgba(0, 255, 200, 0.02)',
                border: '1px solid rgba(0, 255, 200, 0.12)',
                borderRadius: '16px',
                padding: '24px'
              }}>
                <label style={{ 
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.8125rem',
                  fontWeight: '700',
                  display: 'block',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  Trade Limits ({formData.crypto_currency})
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ 
                      color: 'rgba(255, 255, 255, 0.4)',
                      fontSize: '0.5625rem',
                      fontWeight: '600',
                      display: 'block',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>
                      Minimum
                    </label>
                    <input
                      type="number"
                      step="0.00000001"
                      value={formData.min_amount}
                      onChange={(e) => handleChange('min_amount', e.target.value)}
                      onFocus={() => setFocusedField('min')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="0.01"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: focusedField === 'min' 
                          ? '2px solid rgba(0, 255, 200, 0.4)' 
                          : '1px solid rgba(0, 255, 200, 0.1)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '1.0625rem',
                        fontWeight: '600',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: focusedField === 'min' ? '0 0 15px rgba(0, 255, 200, 0.08)' : 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      color: 'rgba(255, 255, 255, 0.4)',
                      fontSize: '0.5625rem',
                      fontWeight: '600',
                      display: 'block',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>
                      Maximum
                    </label>
                    <input
                      type="number"
                      step="0.00000001"
                      value={formData.max_amount}
                      onChange={(e) => handleChange('max_amount', e.target.value)}
                      onFocus={() => setFocusedField('max')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="1.0"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: focusedField === 'max' 
                          ? '2px solid rgba(0, 255, 200, 0.4)' 
                          : '1px solid rgba(0, 255, 200, 0.1)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '1.0625rem',
                        fontWeight: '600',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: focusedField === 'max' ? '0 0 15px rgba(0, 255, 200, 0.08)' : 'none'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* THIRD ROW: Payment Methods - Full Width */}
            <div style={{
              background: 'rgba(0, 255, 200, 0.02)',
              border: '1px solid rgba(0, 255, 200, 0.12)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <label style={{ 
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.8125rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '18px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}>
                Payment Methods
                <span style={{ 
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#EF4444',
                  fontSize: '0.5rem',
                  fontWeight: '700',
                  padding: '3px 6px',
                  borderRadius: '4px'
                }}>SELECT AT LEAST ONE</span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {availablePaymentMethods.map(method => {
                  const isSelected = formData.payment_methods.includes(method);
                  const isHovered = hoveredPill === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => togglePaymentMethod(method)}
                      onMouseEnter={() => setHoveredPill(method)}
                      onMouseLeave={() => setHoveredPill(null)}
                      style={{
                        padding: '14px 16px',
                        background: isSelected 
                          ? 'linear-gradient(135deg, rgba(0, 255, 200, 0.18), rgba(0, 255, 200, 0.08))' 
                          : isHovered 
                            ? 'rgba(0, 255, 200, 0.04)' 
                            : 'transparent',
                        border: isSelected 
                          ? '2px solid rgba(0, 255, 200, 0.6)' 
                          : isHovered 
                            ? '1.5px solid rgba(0, 255, 200, 0.3)' 
                            : '1.5px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        color: isSelected 
                          ? '#00FFD0' 
                          : isHovered 
                            ? 'rgba(255, 255, 255, 0.7)' 
                            : 'rgba(255, 255, 255, 0.4)',
                        fontSize: '0.8125rem',
                        fontWeight: isSelected ? '700' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 0 20px rgba(0, 255, 200, 0.2)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      {isSelected && <IoCheckmarkCircle size={15} />}
                      {method.replace(/_/g, ' ').toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FOURTH ROW: Terms (Optional) + Submit Button side by side */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '24px',
              alignItems: 'end'
            }}>
              {/* TIER 3: TERMS */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '14px',
                padding: '20px'
              }}>
                <label style={{ 
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em'
                }}>
                  Terms & Conditions
                  <span style={{ color: 'rgba(255, 255, 255, 0.25)', fontSize: '0.5rem' }}>OPTIONAL</span>
                </label>
                <textarea
                  value={formData.terms}
                  onChange={(e) => handleChange('terms', e.target.value)}
                  onFocus={() => setFocusedField('terms')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter any special terms or instructions for buyers..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: focusedField === 'terms' 
                      ? '1.5px solid rgba(0, 255, 200, 0.25)' 
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    minHeight: '80px',
                    transition: 'all 0.2s ease'
                  }}
                />
              </div>

              {/* SUBMIT BUTTON */}
              <div>
                <button
                  type="submit"
                  disabled={creating || !isFormValid()}
                  style={{
                    width: '100%',
                    height: '60px',
                    background: (creating || !isFormValid())
                      ? 'rgba(60, 60, 60, 0.4)' 
                      : 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                    border: (creating || !isFormValid())
                      ? '1.5px solid rgba(100, 100, 100, 0.2)'
                      : 'none',
                    borderRadius: '14px',
                    fontSize: '1rem',
                    fontWeight: '800',
                    color: (creating || !isFormValid()) ? 'rgba(255, 255, 255, 0.2)' : '#fff',
                    cursor: (creating || !isFormValid()) ? 'not-allowed' : 'pointer',
                    boxShadow: (creating || !isFormValid()) 
                      ? 'none' 
                      : '0 6px 30px rgba(34, 197, 94, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    transition: 'all 0.25s ease',
                    opacity: (creating || !isFormValid()) ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!creating && isFormValid()) {
                      e.currentTarget.style.boxShadow = '0 8px 40px rgba(34, 197, 94, 0.55)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!creating && isFormValid()) {
                      e.currentTarget.style.boxShadow = '0 6px 30px rgba(34, 197, 94, 0.45)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {creating ? (
                    <>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }}></div>
                      Creating...
                    </>
                  ) : (
                    'Publish Ad'
                  )}
                </button>
                {!isFormValid() && !creating && (
                  <p style={{
                    textAlign: 'center',
                    marginTop: '10px',
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.3)'
                  }}>
                    Complete all fields to publish
                  </p>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
}
