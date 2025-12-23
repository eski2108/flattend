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
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #050816 0%, #0a0e27 50%, #0d1229 100%)',
        padding: '3rem 2rem 4rem',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {/* Back Button */}
        <button
          onClick={() => navigate('/p2p/merchant')}
          style={{
            background: 'linear-gradient(135deg, rgba(0, 255, 200, 0.08), rgba(0, 255, 200, 0.03))',
            border: '1px solid rgba(0, 255, 200, 0.25)',
            borderRadius: '12px',
            color: 'rgba(0, 255, 200, 0.9)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '12px 20px',
            marginBottom: '2.5rem',
            transition: 'all 0.25s ease',
            letterSpacing: '0.02em'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 200, 0.15), rgba(0, 255, 200, 0.08))';
            e.currentTarget.style.borderColor = 'rgba(0, 255, 200, 0.5)';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 200, 0.2)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 200, 0.08), rgba(0, 255, 200, 0.03))';
            e.currentTarget.style.borderColor = 'rgba(0, 255, 200, 0.25)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <IoArrowBack size={18} />
          Back to Merchant Center
        </button>

        {/* Page Header */}
        <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '2.75rem', 
            fontWeight: '800', 
            background: 'linear-gradient(135deg, #00FFD0 0%, #00E5FF 50%, #7B61FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1rem',
            letterSpacing: '-0.02em',
            textShadow: '0 0 80px rgba(0, 255, 200, 0.3)'
          }}>
            Create New P2P Ad
          </h1>
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.5)', 
            fontSize: '1.0625rem', 
            fontWeight: '400',
            letterSpacing: '0.01em',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            Set your trading terms and start receiving orders from buyers worldwide
          </p>
        </div>

        {/* Main Form Card */}
        <div style={{
          background: 'linear-gradient(165deg, rgba(15, 20, 45, 0.98), rgba(10, 15, 35, 0.99))',
          border: '1px solid rgba(0, 255, 200, 0.12)',
          borderRadius: '28px',
          padding: '2.5rem',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5), 0 0 60px rgba(0, 255, 200, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.03)'
        }}>
          <form onSubmit={handleSubmit}>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TIER 1: AD TYPE - Primary Box with strongest visual presence */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(0, 255, 200, 0.06), rgba(0, 255, 200, 0.02))',
              border: '2px solid rgba(0, 255, 200, 0.25)',
              borderRadius: '20px',
              padding: '2rem',
              marginBottom: '2rem',
              boxShadow: '0 8px 40px rgba(0, 255, 200, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
            }}>
              <label style={{ 
                color: 'rgba(255, 255, 255, 0.95)',
                fontSize: '0.9375rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '1.25rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Ad Type
                <span style={{ 
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                  color: '#fff',
                  fontSize: '0.625rem',
                  fontWeight: '700',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  letterSpacing: '0.08em'
                }}>REQUIRED</span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* SELL Button */}
                <button
                  type="button"
                  onClick={() => handleAdTypeSelect('sell')}
                  style={{
                    height: '70px',
                    padding: '0 2rem',
                    background: adType === 'sell' 
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(34, 197, 94, 0.1))' 
                      : 'rgba(0, 0, 0, 0.3)',
                    border: adType === 'sell' 
                      ? '2px solid rgba(34, 197, 94, 0.8)' 
                      : '2px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    color: adType === 'sell' ? '#22C55E' : 'rgba(255, 255, 255, 0.4)',
                    fontSize: '1rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: adType === 'sell' 
                      ? '0 0 40px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                      : 'none',
                    transition: 'all 0.3s ease',
                    transform: adType === 'sell' ? 'scale(1.02)' : 'scale(1)',
                    letterSpacing: '0.02em'
                  }}
                  onMouseEnter={(e) => {
                    if (adType !== 'sell') {
                      e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                      e.currentTarget.style.background = 'rgba(34, 197, 94, 0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (adType !== 'sell') {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)';
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
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
                    height: '70px',
                    padding: '0 2rem',
                    background: adType === 'buy' 
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(34, 197, 94, 0.1))' 
                      : 'rgba(0, 0, 0, 0.3)',
                    border: adType === 'buy' 
                      ? '2px solid rgba(34, 197, 94, 0.8)' 
                      : '2px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    color: adType === 'buy' ? '#22C55E' : 'rgba(255, 255, 255, 0.4)',
                    fontSize: '1rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: adType === 'buy' 
                      ? '0 0 40px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                      : 'none',
                    transition: 'all 0.3s ease',
                    transform: adType === 'buy' ? 'scale(1.02)' : 'scale(1)',
                    letterSpacing: '0.02em'
                  }}
                  onMouseEnter={(e) => {
                    if (adType !== 'buy') {
                      e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                      e.currentTarget.style.background = 'rgba(34, 197, 94, 0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (adType !== 'buy') {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)';
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                    }
                  }}
                >
                  I Want to BUY Crypto
                </button>
              </div>
              
              {/* Selection Indicator */}
              {adType && (
                <div style={{
                  marginTop: '1.25rem',
                  padding: '14px 20px',
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(34, 197, 94, 0.04))',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  borderRadius: '14px',
                  color: '#22C55E',
                  fontSize: '0.9375rem',
                  fontWeight: '600',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 20px rgba(34, 197, 94, 0.15)'
                }}>
                  <IoCheckmarkCircle size={20} />
                  <span>You are <strong style={{ fontWeight: '700' }}>{adType === 'sell' ? 'SELLING' : 'BUYING'}</strong> {formData.crypto_currency}</span>
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TIER 1: ASSET SELECTION - Primary Box */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(0, 255, 200, 0.06), rgba(0, 255, 200, 0.02))',
              border: '2px solid rgba(0, 255, 200, 0.25)',
              borderRadius: '20px',
              padding: '2rem',
              marginBottom: '2rem',
              boxShadow: '0 8px 40px rgba(0, 255, 200, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ 
                    color: 'rgba(255, 255, 255, 0.55)',
                    fontSize: '0.6875rem',
                    fontWeight: '600',
                    display: 'block',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em'
                  }}>
                    Crypto Asset
                  </label>
                  <select
                    value={formData.crypto_currency}
                    onChange={(e) => handleChange('crypto_currency', e.target.value)}
                    onFocus={() => setFocusedField('crypto')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      width: '100%',
                      padding: '18px 20px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: focusedField === 'crypto' 
                        ? '2px solid rgba(0, 255, 200, 0.6)' 
                        : '2px solid rgba(0, 255, 200, 0.15)',
                      borderRadius: '14px',
                      color: '#fff',
                      fontSize: '1.125rem',
                      fontWeight: '700',
                      outline: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: focusedField === 'crypto' 
                        ? '0 0 30px rgba(0, 255, 200, 0.15), inset 0 2px 4px rgba(0, 0, 0, 0.2)' 
                        : 'none'
                    }}
                  >
                    {availableCryptos.map(crypto => (
                      <option key={crypto} value={crypto} style={{ background: '#0a0e27', color: '#fff' }}>{crypto}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ 
                    color: 'rgba(255, 255, 255, 0.55)',
                    fontSize: '0.6875rem',
                    fontWeight: '600',
                    display: 'block',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em'
                  }}>
                    Fiat Currency
                  </label>
                  <select
                    value={formData.fiat_currency}
                    onChange={(e) => handleChange('fiat_currency', e.target.value)}
                    onFocus={() => setFocusedField('fiat')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      width: '100%',
                      padding: '18px 20px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: focusedField === 'fiat' 
                        ? '2px solid rgba(0, 255, 200, 0.6)' 
                        : '2px solid rgba(0, 255, 200, 0.15)',
                      borderRadius: '14px',
                      color: '#fff',
                      fontSize: '1.125rem',
                      fontWeight: '700',
                      outline: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: focusedField === 'fiat' 
                        ? '0 0 30px rgba(0, 255, 200, 0.15), inset 0 2px 4px rgba(0, 0, 0, 0.2)' 
                        : 'none'
                    }}
                  >
                    {availableFiats.map(fiat => (
                      <option key={fiat} value={fiat} style={{ background: '#0a0e27', color: '#fff' }}>{fiat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TIER 1: PRICING - Primary Box */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(0, 255, 200, 0.06), rgba(0, 255, 200, 0.02))',
              border: '2px solid rgba(0, 255, 200, 0.25)',
              borderRadius: '20px',
              padding: '2rem',
              marginBottom: '2rem',
              boxShadow: '0 8px 40px rgba(0, 255, 200, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
            }}>
              <label style={{ 
                color: 'rgba(255, 255, 255, 0.95)',
                fontSize: '0.9375rem',
                fontWeight: '700',
                display: 'block',
                marginBottom: '1.25rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Pricing Mode
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => handleChange('price_type', 'fixed')}
                  style={{
                    padding: '18px',
                    background: formData.price_type === 'fixed' 
                      ? 'linear-gradient(135deg, rgba(0, 255, 200, 0.18), rgba(0, 255, 200, 0.08))' 
                      : 'transparent',
                    border: formData.price_type === 'fixed' 
                      ? '2px solid rgba(0, 255, 200, 0.6)' 
                      : '2px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '14px',
                    color: formData.price_type === 'fixed' ? '#00FFD0' : 'rgba(255, 255, 255, 0.45)',
                    fontSize: '0.9375rem',
                    fontWeight: formData.price_type === 'fixed' ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    boxShadow: formData.price_type === 'fixed' 
                      ? '0 0 30px rgba(0, 255, 200, 0.2)' 
                      : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (formData.price_type !== 'fixed') {
                      e.currentTarget.style.borderColor = 'rgba(0, 255, 200, 0.4)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (formData.price_type !== 'fixed') {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)';
                    }
                  }}
                >
                  Fixed Price
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('price_type', 'floating')}
                  style={{
                    padding: '18px',
                    background: formData.price_type === 'floating' 
                      ? 'linear-gradient(135deg, rgba(0, 255, 200, 0.18), rgba(0, 255, 200, 0.08))' 
                      : 'transparent',
                    border: formData.price_type === 'floating' 
                      ? '2px solid rgba(0, 255, 200, 0.6)' 
                      : '2px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '14px',
                    color: formData.price_type === 'floating' ? '#00FFD0' : 'rgba(255, 255, 255, 0.45)',
                    fontSize: '0.9375rem',
                    fontWeight: formData.price_type === 'floating' ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    boxShadow: formData.price_type === 'floating' 
                      ? '0 0 30px rgba(0, 255, 200, 0.2)' 
                      : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (formData.price_type !== 'floating') {
                      e.currentTarget.style.borderColor = 'rgba(0, 255, 200, 0.4)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (formData.price_type !== 'floating') {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)';
                    }
                  }}
                >
                  Floating (% Margin)
                </button>
              </div>

              <input
                type="number"
                value={formData.price_value}
                onChange={(e) => handleChange('price_value', e.target.value)}
                onFocus={() => setFocusedField('price')}
                onBlur={() => setFocusedField(null)}
                placeholder={formData.price_type === 'fixed' ? 'Enter price (e.g., 45000)' : 'Enter margin % (e.g., 2.5 or -1.5)'}
                style={{
                  width: '100%',
                  padding: '20px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: focusedField === 'price' 
                    ? '2px solid rgba(0, 255, 200, 0.6)' 
                    : '2px solid rgba(0, 255, 200, 0.15)',
                  borderRadius: '14px',
                  color: '#fff',
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: focusedField === 'price' 
                    ? '0 0 30px rgba(0, 255, 200, 0.15), inset 0 2px 4px rgba(0, 0, 0, 0.2)' 
                    : 'none'
                }}
              />
              {formData.price_type === 'floating' && (
                <p style={{ 
                  marginTop: '12px', 
                  fontSize: '0.8125rem', 
                  color: 'rgba(255, 255, 255, 0.4)',
                  letterSpacing: '0.02em'
                }}>
                  Positive = above market rate | Negative = below market rate
                </p>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TIER 2: TRADE LIMITS - Secondary Box with lighter styling */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <div style={{
              background: 'rgba(0, 255, 200, 0.02)',
              border: '1.5px solid rgba(0, 255, 200, 0.15)',
              borderRadius: '18px',
              padding: '1.75rem',
              marginBottom: '1.75rem',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)'
            }}>
              <label style={{ 
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: '0.875rem',
                fontWeight: '700',
                display: 'block',
                marginBottom: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Trade Limits ({formData.crypto_currency})
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={{ 
                    color: 'rgba(255, 255, 255, 0.45)',
                    fontSize: '0.625rem',
                    fontWeight: '600',
                    display: 'block',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em'
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
                      padding: '16px 18px',
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: focusedField === 'min' 
                        ? '2px solid rgba(0, 255, 200, 0.5)' 
                        : '1.5px solid rgba(0, 255, 200, 0.12)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '1.0625rem',
                      fontWeight: '600',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxShadow: focusedField === 'min' 
                        ? '0 0 20px rgba(0, 255, 200, 0.1)' 
                        : 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    color: 'rgba(255, 255, 255, 0.45)',
                    fontSize: '0.625rem',
                    fontWeight: '600',
                    display: 'block',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em'
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
                      padding: '16px 18px',
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: focusedField === 'max' 
                        ? '2px solid rgba(0, 255, 200, 0.5)' 
                        : '1.5px solid rgba(0, 255, 200, 0.12)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '1.0625rem',
                      fontWeight: '600',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxShadow: focusedField === 'max' 
                        ? '0 0 20px rgba(0, 255, 200, 0.1)' 
                        : 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TIER 2: PAYMENT METHODS - Secondary Box */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <div style={{
              background: 'rgba(0, 255, 200, 0.02)',
              border: '1.5px solid rgba(0, 255, 200, 0.15)',
              borderRadius: '18px',
              padding: '1.75rem',
              marginBottom: '1.75rem',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)'
            }}>
              <label style={{ 
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: '0.875rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '1.25rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Payment Methods
                <span style={{ 
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#EF4444',
                  fontSize: '0.5625rem',
                  fontWeight: '700',
                  padding: '4px 8px',
                  borderRadius: '5px',
                  letterSpacing: '0.06em'
                }}>SELECT AT LEAST ONE</span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
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
                          ? 'linear-gradient(135deg, rgba(0, 255, 200, 0.2), rgba(0, 255, 200, 0.1))' 
                          : isHovered 
                            ? 'rgba(0, 255, 200, 0.05)' 
                            : 'transparent',
                        border: isSelected 
                          ? '2px solid rgba(0, 255, 200, 0.7)' 
                          : isHovered 
                            ? '1.5px solid rgba(0, 255, 200, 0.4)' 
                            : '1.5px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: isSelected 
                          ? '#00FFD0' 
                          : isHovered 
                            ? 'rgba(255, 255, 255, 0.75)' 
                            : 'rgba(255, 255, 255, 0.45)',
                        fontSize: '0.8125rem',
                        fontWeight: isSelected ? '700' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected 
                          ? '0 0 25px rgba(0, 255, 200, 0.25)' 
                          : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        letterSpacing: '0.02em'
                      }}
                    >
                      {isSelected && <IoCheckmarkCircle size={16} />}
                      {method.replace(/_/g, ' ').toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TIER 3: TERMS - Optional Box with muted styling */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <label style={{ 
                color: 'rgba(255, 255, 255, 0.55)',
                fontSize: '0.8125rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}>
                Terms & Conditions
                <span style={{ 
                  color: 'rgba(255, 255, 255, 0.3)',
                  fontSize: '0.5625rem',
                  fontWeight: '500',
                  letterSpacing: '0.06em'
                }}>OPTIONAL</span>
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
                  padding: '16px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: focusedField === 'terms' 
                    ? '1.5px solid rgba(0, 255, 200, 0.35)' 
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '0.9375rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  minHeight: '90px',
                  transition: 'all 0.2s ease',
                  boxShadow: focusedField === 'terms' 
                    ? '0 0 15px rgba(0, 255, 200, 0.08)' 
                    : 'none'
                }}
              />
            </div>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* SUBMIT BUTTON */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <button
              type="submit"
              disabled={creating || !isFormValid()}
              style={{
                width: '100%',
                minHeight: '68px',
                background: (creating || !isFormValid())
                  ? 'rgba(60, 60, 60, 0.4)' 
                  : 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                border: (creating || !isFormValid())
                  ? '2px solid rgba(100, 100, 100, 0.2)'
                  : 'none',
                borderRadius: '18px',
                fontSize: '1.125rem',
                fontWeight: '800',
                color: (creating || !isFormValid()) ? 'rgba(255, 255, 255, 0.25)' : '#fff',
                cursor: (creating || !isFormValid()) ? 'not-allowed' : 'pointer',
                boxShadow: (creating || !isFormValid()) 
                  ? 'none' 
                  : '0 8px 40px rgba(34, 197, 94, 0.5), 0 0 60px rgba(34, 197, 94, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                transition: 'all 0.3s ease',
                opacity: (creating || !isFormValid()) ? 0.5 : 1,
                transform: 'scale(1)'
              }}
              onMouseEnter={(e) => {
                if (!creating && isFormValid()) {
                  e.currentTarget.style.boxShadow = '0 12px 50px rgba(34, 197, 94, 0.6), 0 0 80px rgba(34, 197, 94, 0.35)';
                  e.currentTarget.style.transform = 'scale(1.02) translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!creating && isFormValid()) {
                  e.currentTarget.style.boxShadow = '0 8px 40px rgba(34, 197, 94, 0.5), 0 0 60px rgba(34, 197, 94, 0.25)';
                  e.currentTarget.style.transform = 'scale(1) translateY(0)';
                }
              }}
            >
              {creating ? (
                <>
                  <div style={{
                    width: '22px',
                    height: '22px',
                    border: '3px solid rgba(255,255,255,0.2)',
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

            {/* Validation hint */}
            {!isFormValid() && !creating && (
              <p style={{
                textAlign: 'center',
                marginTop: '16px',
                fontSize: '0.8125rem',
                color: 'rgba(255, 255, 255, 0.35)',
                letterSpacing: '0.02em'
              }}>
                Complete all required fields to publish
              </p>
            )}
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
