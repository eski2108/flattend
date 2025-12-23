import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoCheckmarkCircle } from 'react-icons/io5';
import axiosInstance from '@/utils/axiosConfig';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

// Unified box style
const BOX_STYLE = {
  background: 'rgba(10, 13, 28, 0.98)',
  border: '1px solid rgba(0, 255, 200, 0.08)',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '16px',
  boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.25)'
};

const SECTION_TITLE = {
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: '0.6875rem',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  marginBottom: '14px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
};

const LABEL_STYLE = {
  color: 'rgba(255, 255, 255, 0.35)',
  fontSize: '0.5625rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '8px',
  display: 'block'
};

const INPUT_STYLE = {
  width: '100%',
  padding: '14px 16px',
  background: 'rgba(0, 0, 0, 0.35)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  borderRadius: '10px',
  color: '#fff',
  fontSize: '1rem',
  fontWeight: '600',
  outline: 'none',
  transition: 'all 0.2s ease'
};

const INPUT_FOCUS = {
  border: '1px solid rgba(0, 255, 200, 0.35)',
  boxShadow: '0 0 0 3px rgba(0, 255, 200, 0.06)'
};

export default function CreateAd() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [creating, setCreating] = useState(false);
  const [adType, setAdType] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
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
    { id: 'sepa', label: 'SEPA' },
    { id: 'faster_payments', label: 'FASTER PAYMENTS' },
    { id: 'swift', label: 'SWIFT' },
    { id: 'ach', label: 'ACH' },
    { id: 'local_bank_transfer', label: 'BANK TRANSFER' },
    { id: 'wire_transfer', label: 'WIRE TRANSFER' },
    { id: 'pix', label: 'PIX' },
    { id: 'interac', label: 'INTERAC' }
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
      toast.error('Please select an ad type');
      return false;
    }
    if (!formData.price_value || parseFloat(formData.price_value) <= 0) {
      toast.error('Please enter a valid price');
      return false;
    }
    if (!formData.min_amount || parseFloat(formData.min_amount) <= 0) {
      toast.error('Please enter minimum amount');
      return false;
    }
    if (!formData.max_amount || parseFloat(formData.max_amount) <= 0) {
      toast.error('Please enter maximum amount');
      return false;
    }
    if (parseFloat(formData.min_amount) >= parseFloat(formData.max_amount)) {
      toast.error('Maximum must be greater than minimum');
      return false;
    }
    if (formData.payment_methods.length === 0) {
      toast.error('Select at least one payment method');
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
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          navigate('/p2p/merchant', { state: { refreshAds: true } });
        }, 2500);
      }
    } catch (error) {
      let errorMessage = "Couldn't create ad. Please try again.";
      if (error.response?.status === 400) errorMessage = 'Complete all required fields.';
      else if (error.response?.status === 401) errorMessage = 'Session expired. Log in again.';
      else if (error.response?.status === 403) errorMessage = 'Activate your seller account first.';
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const getAdTypePillStyle = (isSelected) => ({
    height: '48px',
    padding: '0 16px',
    background: isSelected ? 'rgba(34, 197, 94, 0.12)' : 'rgba(0, 0, 0, 0.3)',
    border: isSelected ? '1px solid rgba(34, 197, 94, 0.45)' : '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '10px',
    color: isSelected ? '#22C55E' : 'rgba(255, 255, 255, 0.4)',
    fontSize: '0.8125rem',
    fontWeight: isSelected ? '600' : '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: isSelected ? '0 0 12px rgba(34, 197, 94, 0.15)' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  });

  const getPricingPillStyle = (isSelected) => ({
    height: '44px',
    padding: '0 16px',
    background: isSelected ? 'rgba(0, 255, 200, 0.08)' : 'rgba(0, 0, 0, 0.3)',
    border: isSelected ? '1px solid rgba(0, 255, 200, 0.35)' : '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '10px',
    color: isSelected ? '#00FFD0' : 'rgba(255, 255, 255, 0.4)',
    fontSize: '0.8125rem',
    fontWeight: isSelected ? '600' : '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: isSelected ? '0 0 10px rgba(0, 255, 200, 0.1)' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });

  const getPaymentPillStyle = (isSelected, isHovered) => ({
    height: '38px',
    padding: '0 12px',
    background: isSelected ? 'rgba(0, 255, 200, 0.08)' : isHovered ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
    border: isSelected ? '1px solid rgba(0, 255, 200, 0.35)' : '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
    color: isSelected ? '#00FFD0' : isHovered ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.4)',
    fontSize: '0.625rem',
    fontWeight: isSelected ? '600' : '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: isSelected ? '0 0 8px rgba(0, 255, 200, 0.1)' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    whiteSpace: 'nowrap'
  });

  return (
    <>
      {/* SUCCESS BANNER */}
      {showSuccess && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(22, 163, 74, 0.95))',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          borderRadius: '12px',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 9999,
          boxShadow: '0 8px 32px rgba(34, 197, 94, 0.25)'
        }}>
          <IoCheckmarkCircle size={20} color="#fff" />
          <div>
            <div style={{ color: '#fff', fontWeight: '600', fontSize: '0.875rem' }}>P2P Ad Created</div>
            <div style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.75rem' }}>Your ad is now live.</div>
          </div>
        </div>
      )}

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #050816 0%, #0a0e27 100%)',
        padding: '20px'
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          
          {/* Back Button */}
          <button
            onClick={() => navigate('/p2p/merchant')}
            style={{
              background: 'rgba(0, 255, 200, 0.05)',
              border: '1px solid rgba(0, 255, 200, 0.12)',
              borderRadius: '8px',
              color: 'rgba(0, 255, 200, 0.75)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '8px 14px',
              marginBottom: '16px'
            }}
          >
            <IoArrowBack size={14} />
            Back
          </button>

          {/* Header */}
          <div style={{ marginBottom: '20px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
              Create P2P Ad
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.8125rem' }}>
              Set your trading terms
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            
            {/* SECTION 1: AD TYPE - First thing user sees */}
            <div style={BOX_STYLE}>
              <div style={SECTION_TITLE}>
                Ad Type
                <span style={{ background: '#DC2626', color: '#fff', fontSize: '0.5rem', fontWeight: '700', padding: '2px 6px', borderRadius: '3px' }}>REQUIRED</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button type="button" onClick={() => setAdType('sell')} style={getAdTypePillStyle(adType === 'sell')}>
                  {adType === 'sell' && <IoCheckmarkCircle size={14} />}
                  SELL
                </button>
                <button type="button" onClick={() => setAdType('buy')} style={getAdTypePillStyle(adType === 'buy')}>
                  {adType === 'buy' && <IoCheckmarkCircle size={14} />}
                  BUY
                </button>
              </div>
              {adType && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px',
                  background: 'rgba(34, 197, 94, 0.06)',
                  border: '1px solid rgba(34, 197, 94, 0.15)',
                  borderRadius: '8px',
                  color: '#22C55E',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  textAlign: 'center'
                }}>
                  You are {adType === 'sell' ? 'selling' : 'buying'} {formData.crypto_currency}
                </div>
              )}
            </div>

            {/* SECTION 2: TRADING PAIR */}
            <div style={BOX_STYLE}>
              <div style={SECTION_TITLE}>Trading Pair</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={LABEL_STYLE}>Crypto</label>
                  <select
                    value={formData.crypto_currency}
                    onChange={(e) => handleChange('crypto_currency', e.target.value)}
                    onFocus={() => setFocusedField('crypto')}
                    onBlur={() => setFocusedField(null)}
                    style={{ ...INPUT_STYLE, cursor: 'pointer', ...(focusedField === 'crypto' ? INPUT_FOCUS : {}) }}
                  >
                    {availableCryptos.map(c => <option key={c} value={c} style={{ background: '#0a0e27' }}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LABEL_STYLE}>Fiat</label>
                  <select
                    value={formData.fiat_currency}
                    onChange={(e) => handleChange('fiat_currency', e.target.value)}
                    onFocus={() => setFocusedField('fiat')}
                    onBlur={() => setFocusedField(null)}
                    style={{ ...INPUT_STYLE, cursor: 'pointer', ...(focusedField === 'fiat' ? INPUT_FOCUS : {}) }}
                  >
                    {availableFiats.map(f => <option key={f} value={f} style={{ background: '#0a0e27' }}>{f}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 3: PAYMENT METHODS - EARLY, VISIBLE, IMPORTANT */}
            <div style={BOX_STYLE}>
              <div style={SECTION_TITLE}>
                Payment Methods
                <span style={{ background: 'rgba(220, 38, 38, 0.15)', color: '#DC2626', fontSize: '0.5rem', fontWeight: '600', padding: '2px 6px', borderRadius: '3px' }}>SELECT AT LEAST ONE</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {availablePaymentMethods.map(method => {
                  const isSelected = formData.payment_methods.includes(method.id);
                  const isHovered = hoveredPill === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => togglePaymentMethod(method.id)}
                      onMouseEnter={() => setHoveredPill(method.id)}
                      onMouseLeave={() => setHoveredPill(null)}
                      style={getPaymentPillStyle(isSelected, isHovered)}
                    >
                      {isSelected && <IoCheckmarkCircle size={12} />}
                      {method.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 4: PRICING MODE */}
            <div style={BOX_STYLE}>
              <div style={SECTION_TITLE}>Pricing</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <button type="button" onClick={() => handleChange('price_type', 'fixed')} style={getPricingPillStyle(formData.price_type === 'fixed')}>
                  Fixed Price
                </button>
                <button type="button" onClick={() => handleChange('price_type', 'floating')} style={getPricingPillStyle(formData.price_type === 'floating')}>
                  Floating %
                </button>
              </div>
              <input
                type="number"
                value={formData.price_value}
                onChange={(e) => handleChange('price_value', e.target.value)}
                onFocus={() => setFocusedField('price')}
                onBlur={() => setFocusedField(null)}
                placeholder={formData.price_type === 'fixed' ? 'Enter price' : 'Enter margin %'}
                style={{ ...INPUT_STYLE, fontSize: '1.125rem', fontWeight: '700', ...(focusedField === 'price' ? INPUT_FOCUS : {}) }}
              />
              {formData.price_type === 'floating' && (
                <p style={{ marginTop: '6px', fontSize: '0.625rem', color: 'rgba(255, 255, 255, 0.3)' }}>
                  Positive = above market • Negative = below
                </p>
              )}
            </div>

            {/* SECTION 5: TRADE LIMITS */}
            <div style={BOX_STYLE}>
              <div style={SECTION_TITLE}>Trade Limits ({formData.crypto_currency})</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={LABEL_STYLE}>Minimum</label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={formData.min_amount}
                    onChange={(e) => handleChange('min_amount', e.target.value)}
                    onFocus={() => setFocusedField('min')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="0.01"
                    style={{ ...INPUT_STYLE, ...(focusedField === 'min' ? INPUT_FOCUS : {}) }}
                  />
                  <p style={{ marginTop: '4px', fontSize: '0.5rem', color: 'rgba(255, 255, 255, 0.25)' }}>Min per trade</p>
                </div>
                <div>
                  <label style={LABEL_STYLE}>Maximum</label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={formData.max_amount}
                    onChange={(e) => handleChange('max_amount', e.target.value)}
                    onFocus={() => setFocusedField('max')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="1.0"
                    style={{ ...INPUT_STYLE, ...(focusedField === 'max' ? INPUT_FOCUS : {}) }}
                  />
                  <p style={{ marginTop: '4px', fontSize: '0.5rem', color: 'rgba(255, 255, 255, 0.25)' }}>Max per trade</p>
                </div>
              </div>
            </div>

            {/* SECTION 6: TERMS (Optional) */}
            <div style={{ ...BOX_STYLE, background: 'rgba(8, 10, 20, 0.95)', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
              <div style={{ ...SECTION_TITLE, color: 'rgba(255, 255, 255, 0.45)' }}>
                Terms
                <span style={{ color: 'rgba(255, 255, 255, 0.2)', fontSize: '0.5rem' }}>OPTIONAL</span>
              </div>
              <textarea
                value={formData.terms}
                onChange={(e) => handleChange('terms', e.target.value)}
                placeholder="Special terms or instructions..."
                rows={2}
                style={{ ...INPUT_STYLE, resize: 'none', fontFamily: 'inherit', minHeight: '50px', fontSize: '0.8125rem' }}
              />
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={creating || !isFormValid()}
              style={{
                width: '100%',
                height: '52px',
                background: (creating || !isFormValid()) ? 'rgba(50, 50, 50, 0.5)' : 'linear-gradient(135deg, #22C55E, #16A34A)',
                border: 'none',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: '700',
                color: (creating || !isFormValid()) ? 'rgba(255, 255, 255, 0.2)' : '#fff',
                cursor: (creating || !isFormValid()) ? 'not-allowed' : 'pointer',
                boxShadow: (creating || !isFormValid()) ? 'none' : '0 4px 16px rgba(34, 197, 94, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginTop: '8px',
                opacity: (creating || !isFormValid()) ? 0.6 : 1
              }}
            >
              {creating ? (
                <>
                  <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Creating...
                </>
              ) : (
                'Publish Ad'
              )}
            </button>
            {!isFormValid() && !creating && (
              <p style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.625rem', color: 'rgba(255, 255, 255, 0.25)' }}>
                Complete all fields
              </p>
            )}
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
