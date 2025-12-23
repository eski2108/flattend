import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoCheckmarkCircle, IoClose, IoSearch, IoChevronDown } from 'react-icons/io5';
import axiosInstance from '@/utils/axiosConfig';
import { toast } from 'sonner';

// Payment methods config - grouped by region
const PAYMENT_METHODS_CONFIG = {
  popular: [
    { id: 'paypal', label: 'PayPal', icon: '🅿️' },
    { id: 'wise', label: 'Wise', icon: '📱' },
    { id: 'bank_transfer_uk', label: 'Bank Transfer (UK)', icon: '🏦' },
    { id: 'revolut', label: 'Revolut', icon: '🧾' },
    { id: 'sepa', label: 'SEPA Transfer', icon: '🏦' },
  ],
  uk: [
    { id: 'bank_transfer_uk', label: 'Bank Transfer (UK)', icon: '🏦' },
    { id: 'debit_card', label: 'Debit Card', icon: '💳' },
    { id: 'credit_card', label: 'Credit Card', icon: '💳' },
    { id: 'wise', label: 'Wise', icon: '📱' },
    { id: 'paypal', label: 'PayPal', icon: '🅿️' },
    { id: 'revolut', label: 'Revolut', icon: '🧾' },
    { id: 'monzo', label: 'Monzo', icon: '🏦' },
    { id: 'starling', label: 'Starling', icon: '🏦' },
  ],
  eu: [
    { id: 'sepa', label: 'SEPA Transfer', icon: '🏦' },
    { id: 'sepa_instant', label: 'SEPA Instant', icon: '🏦' },
    { id: 'revolut', label: 'Revolut', icon: '🧾' },
    { id: 'wise', label: 'Wise', icon: '📱' },
    { id: 'paypal', label: 'PayPal', icon: '🅿️' },
    { id: 'ideal', label: 'iDEAL', icon: '🇳🇱' },
    { id: 'blik', label: 'BLIK', icon: '🇵🇱' },
    { id: 'swish', label: 'Swish', icon: '🇸🇪' },
  ],
  nigeria: [
    { id: 'bank_transfer_ng', label: 'Bank Transfer (NG)', icon: '🇳🇬' },
    { id: 'opay', label: 'Opay', icon: '🧾' },
    { id: 'moniepoint', label: 'Moniepoint', icon: '🧾' },
    { id: 'palmpay', label: 'PalmPay', icon: '🧾' },
    { id: 'paga', label: 'Paga', icon: '🧾' },
  ],
  global: [
    { id: 'paypal', label: 'PayPal', icon: '🅿️' },
    { id: 'wise', label: 'Wise', icon: '📱' },
    { id: 'western_union', label: 'Western Union', icon: '🌍' },
    { id: 'moneygram', label: 'MoneyGram', icon: '🌍' },
    { id: 'cash_in_person', label: 'Cash (In-Person)', icon: '💵' },
    { id: 'skrill', label: 'Skrill', icon: '💳' },
    { id: 'neteller', label: 'Neteller', icon: '💳' },
  ],
};

const REGION_LABELS = {
  popular: '⭐ Popular',
  uk: '🇬🇧 United Kingdom',
  eu: '🇪🇺 Europe / SEPA',
  nigeria: '🇳🇬 Nigeria',
  global: '🌍 Global',
};

// Get all unique payment methods
const getAllPaymentMethods = () => {
  const seen = new Set();
  const all = [];
  Object.values(PAYMENT_METHODS_CONFIG).flat().forEach(m => {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      all.push(m);
    }
  });
  return all;
};

const BOX_STYLE = {
  background: 'rgba(10, 13, 28, 0.98)',
  border: '1px solid rgba(0, 255, 200, 0.08)',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.25)'
};

const SECTION_TITLE = {
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: '0.8125rem',
  fontWeight: '600',
  letterSpacing: '0.02em',
  marginBottom: '12px',
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
  padding: '16px 18px',
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
  const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState('');
  const dropdownRef = useRef(null);
  
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
  const [availableCryptos, setAvailableCryptos] = useState(['BTC', 'ETH', 'USDT']);
  const availableFiats = ['GBP', 'USD', 'EUR'];

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setCurrentUser(JSON.parse(userData));
    fetchAvailableCryptos();
  }, [navigate]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setPaymentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const togglePaymentMethod = (methodId) => {
    setFormData(prev => ({
      ...prev,
      payment_methods: prev.payment_methods.includes(methodId)
        ? prev.payment_methods.filter(m => m !== methodId)
        : [...prev.payment_methods, methodId]
    }));
  };

  const removePaymentMethod = (methodId) => {
    setFormData(prev => ({
      ...prev,
      payment_methods: prev.payment_methods.filter(m => m !== methodId)
    }));
  };

  const getMethodById = (id) => getAllPaymentMethods().find(m => m.id === id);

  const filterMethods = (methods) => {
    if (!paymentSearch) return methods;
    return methods.filter(m => 
      m.label.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(paymentSearch.toLowerCase())
    );
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
    if (!adType) { toast.error('Please select an ad type'); return false; }
    if (!formData.price_value || parseFloat(formData.price_value) <= 0) { toast.error('Please enter a valid price'); return false; }
    if (!formData.min_amount || parseFloat(formData.min_amount) <= 0) { toast.error('Please enter minimum amount'); return false; }
    if (!formData.max_amount || parseFloat(formData.max_amount) <= 0) { toast.error('Please enter maximum amount'); return false; }
    if (parseFloat(formData.min_amount) >= parseFloat(formData.max_amount)) { toast.error('Maximum must be greater than minimum'); return false; }
    if (formData.payment_methods.length === 0) { toast.error('Select at least one payment method'); return false; }
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

  const getPillStyle = (isSelected) => ({
    height: '52px',
    padding: '0 24px',
    background: isSelected ? 'rgba(34, 197, 94, 0.12)' : 'rgba(0, 0, 0, 0.3)',
    border: isSelected ? '1px solid rgba(34, 197, 94, 0.45)' : '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '10px',
    color: isSelected ? '#22C55E' : 'rgba(255, 255, 255, 0.4)',
    fontSize: '0.9375rem',
    fontWeight: isSelected ? '600' : '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: isSelected ? '0 0 12px rgba(34, 197, 94, 0.15)' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  });

  const getPricingPillStyle = (isSelected) => ({
    height: '40px',
    padding: '0 14px',
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

  return (
    <>
      {showSuccess && (
        <div style={{
          position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(22, 163, 74, 0.95))',
          border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '12px',
          padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '12px',
          zIndex: 9999, boxShadow: '0 8px 32px rgba(34, 197, 94, 0.25)'
        }}>
          <IoCheckmarkCircle size={20} color="#fff" />
          <div>
            <div style={{ color: '#fff', fontWeight: '600', fontSize: '0.875rem' }}>P2P Ad Created</div>
            <div style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.75rem' }}>Your ad is now live.</div>
          </div>
        </div>
      )}

      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #050816 0%, #0a0e27 100%)', padding: '20px' }}>
        <div style={{ maxWidth: '1800px', margin: '0 auto', padding: '0 20px' }}>
          
          <button onClick={() => navigate('/p2p/merchant')} style={{
            background: 'rgba(0, 255, 200, 0.05)', border: '1px solid rgba(0, 255, 200, 0.12)',
            borderRadius: '8px', color: 'rgba(0, 255, 200, 0.75)', display: 'inline-flex',
            alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '600',
            cursor: 'pointer', padding: '8px 14px', marginBottom: '16px'
          }}>
            <IoArrowBack size={14} /> Back
          </button>

          <div style={{ marginBottom: '20px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>Create new P2P ad</h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.8125rem' }}>Set your trading terms and start receiving orders</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* 2-COLUMN GRID LAYOUT - FULL WIDTH */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
              
              {/* LEFT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* AD TYPE */}
                <div style={BOX_STYLE}>
                  <div style={SECTION_TITLE}>
                    Ad type
                    <span style={{ background: '#DC2626', color: '#fff', fontSize: '0.5rem', fontWeight: '700', padding: '2px 6px', borderRadius: '3px' }}>REQUIRED</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button type="button" onClick={() => setAdType('sell')} style={getPillStyle(adType === 'sell')}>
                      {adType === 'sell' && <IoCheckmarkCircle size={14} />} SELL
                    </button>
                    <button type="button" onClick={() => setAdType('buy')} style={getPillStyle(adType === 'buy')}>
                      {adType === 'buy' && <IoCheckmarkCircle size={14} />} BUY
                    </button>
                  </div>
                </div>

                {/* TRADING PAIR */}
                <div style={BOX_STYLE}>
                  <div style={SECTION_TITLE}>Trading pair</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={LABEL_STYLE}>Crypto</label>
                      <select value={formData.crypto_currency} onChange={(e) => handleChange('crypto_currency', e.target.value)}
                        style={{ ...INPUT_STYLE, cursor: 'pointer' }}>
                        {availableCryptos.map(c => <option key={c} value={c} style={{ background: '#0a0e27' }}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>Fiat</label>
                      <select value={formData.fiat_currency} onChange={(e) => handleChange('fiat_currency', e.target.value)}
                        style={{ ...INPUT_STYLE, cursor: 'pointer' }}>
                        {availableFiats.map(f => <option key={f} value={f} style={{ background: '#0a0e27' }}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* TRADE LIMITS */}
                <div style={BOX_STYLE}>
                  <div style={SECTION_TITLE}>Trade limits</div>
                  <p style={{ fontSize: '0.5rem', color: 'rgba(255, 255, 255, 0.3)', marginBottom: '10px', marginTop: '-8px' }}>Limits shown in base asset</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={LABEL_STYLE}>Minimum</label>
                      <div style={{ position: 'relative' }}>
                        <input type="number" step="0.00000001" value={formData.min_amount}
                          onChange={(e) => handleChange('min_amount', e.target.value)}
                          onFocus={() => setFocusedField('min')} onBlur={() => setFocusedField(null)}
                          placeholder="0.01" style={{ ...INPUT_STYLE, paddingRight: '50px', ...(focusedField === 'min' ? INPUT_FOCUS : {}) }} />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.7rem', fontWeight: '600' }}>{formData.crypto_currency}</span>
                      </div>
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>Maximum</label>
                      <div style={{ position: 'relative' }}>
                        <input type="number" step="0.00000001" value={formData.max_amount}
                          onChange={(e) => handleChange('max_amount', e.target.value)}
                          onFocus={() => setFocusedField('max')} onBlur={() => setFocusedField(null)}
                          placeholder="10" style={{ ...INPUT_STYLE, paddingRight: '50px', ...(focusedField === 'max' ? INPUT_FOCUS : {}) }} />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.7rem', fontWeight: '600' }}>{formData.crypto_currency}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* PRICING MODE */}
                <div style={BOX_STYLE}>
                  <div style={SECTION_TITLE}>Pricing mode</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <button type="button" onClick={() => handleChange('price_type', 'fixed')} style={getPricingPillStyle(formData.price_type === 'fixed')}>Fixed price</button>
                    <button type="button" onClick={() => handleChange('price_type', 'floating')} style={getPricingPillStyle(formData.price_type === 'floating')}>Floating %</button>
                  </div>
                  <input type="number" value={formData.price_value} onChange={(e) => handleChange('price_value', e.target.value)}
                    onFocus={() => setFocusedField('price')} onBlur={() => setFocusedField(null)}
                    placeholder={formData.price_type === 'fixed' ? '48,500' : 'Enter margin %'}
                    style={{ ...INPUT_STYLE, fontSize: '1rem', fontWeight: '700', ...(focusedField === 'price' ? INPUT_FOCUS : {}) }} />
                </div>

                {/* PAYMENT METHODS - SEARCHABLE DROPDOWN */}
                <div style={BOX_STYLE} ref={dropdownRef}>
                  <div style={SECTION_TITLE}>
                    Payment methods
                    <span style={{ background: 'rgba(220, 38, 38, 0.15)', color: '#DC2626', fontSize: '0.5rem', fontWeight: '600', padding: '2px 6px', borderRadius: '3px' }}>SELECT AT LEAST ONE</span>
                  </div>
                  
                  {/* Selected chips */}
                  {formData.payment_methods.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                      {formData.payment_methods.map(id => {
                        const method = getMethodById(id);
                        return method ? (
                          <div key={id} style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'rgba(0, 255, 200, 0.1)', border: '1px solid rgba(0, 255, 200, 0.3)',
                            borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', color: '#00FFD0'
                          }}>
                            <span>{method.icon}</span>
                            <span>{method.label}</span>
                            <IoClose size={14} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => removePaymentMethod(id)} />
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}

                  {/* Dropdown trigger */}
                  <div onClick={() => setPaymentDropdownOpen(!paymentDropdownOpen)} style={{
                    ...INPUT_STYLE, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.8125rem',
                    ...(paymentDropdownOpen ? INPUT_FOCUS : {})
                  }}>
                    <span>Search payment methods (Wise, PayPal, SEPA...)</span>
                    <IoChevronDown size={16} style={{ transform: paymentDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>

                  {/* Dropdown content */}
                  {paymentDropdownOpen && (
                    <div style={{
                      position: 'absolute', left: 0, right: 0, marginTop: '4px',
                      background: 'rgba(10, 13, 28, 0.98)', border: '1px solid rgba(0, 255, 200, 0.15)',
                      borderRadius: '10px', maxHeight: '280px', overflowY: 'auto', zIndex: 100,
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                    }}>
                      {/* Search input */}
                      <div style={{ padding: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', position: 'sticky', top: 0, background: 'rgba(10, 13, 28, 0.98)' }}>
                        <div style={{ position: 'relative' }}>
                          <IoSearch size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.3)' }} />
                          <input type="text" value={paymentSearch} onChange={(e) => setPaymentSearch(e.target.value)}
                            placeholder="Search..." autoFocus
                            style={{ ...INPUT_STYLE, padding: '8px 10px 8px 30px', fontSize: '0.8125rem' }} />
                        </div>
                      </div>

                      {/* Grouped options */}
                      {Object.entries(PAYMENT_METHODS_CONFIG).map(([region, methods]) => {
                        const filtered = filterMethods(methods);
                        if (filtered.length === 0) return null;
                        return (
                          <div key={region}>
                            <div style={{ padding: '8px 12px', fontSize: '0.625rem', fontWeight: '700', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {REGION_LABELS[region]}
                            </div>
                            {filtered.map(method => {
                              const isSelected = formData.payment_methods.includes(method.id);
                              return (
                                <div key={method.id} onClick={() => togglePaymentMethod(method.id)} style={{
                                  padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px',
                                  cursor: 'pointer', background: isSelected ? 'rgba(0, 255, 200, 0.08)' : 'transparent',
                                  borderLeft: isSelected ? '2px solid #00FFD0' : '2px solid transparent',
                                  transition: 'all 0.15s'
                                }}>
                                  <span style={{ fontSize: '1rem' }}>{method.icon}</span>
                                  <span style={{ color: isSelected ? '#00FFD0' : 'rgba(255, 255, 255, 0.8)', fontSize: '0.8125rem', fontWeight: isSelected ? '600' : '400' }}>{method.label}</span>
                                  {isSelected && <IoCheckmarkCircle size={14} color="#00FFD0" style={{ marginLeft: 'auto' }} />}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ADVANCED OPTIONS */}
                <div style={{ ...BOX_STYLE, background: 'rgba(8, 10, 20, 0.95)', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                  <div style={{ ...SECTION_TITLE, color: 'rgba(255, 255, 255, 0.45)' }}>
                    Advanced options
                    <span style={{ color: 'rgba(255, 255, 255, 0.2)', fontSize: '0.5rem' }}>OPTIONAL</span>
                  </div>
                  <textarea value={formData.terms} onChange={(e) => handleChange('terms', e.target.value)}
                    placeholder="Special terms or instructions..." rows={2}
                    style={{ ...INPUT_STYLE, resize: 'none', fontFamily: 'inherit', minHeight: '50px', fontSize: '0.8125rem' }} />
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button type="submit" disabled={creating || !isFormValid()} style={{
              width: '100%', height: '52px', marginTop: '16px',
              background: (creating || !isFormValid()) ? 'rgba(50, 50, 50, 0.5)' : 'linear-gradient(135deg, #22C55E, #16A34A)',
              border: 'none', borderRadius: '12px', fontSize: '0.875rem', fontWeight: '700',
              color: (creating || !isFormValid()) ? 'rgba(255, 255, 255, 0.2)' : '#fff',
              cursor: (creating || !isFormValid()) ? 'not-allowed' : 'pointer',
              boxShadow: (creating || !isFormValid()) ? 'none' : '0 4px 16px rgba(34, 197, 94, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              textTransform: 'uppercase', letterSpacing: '0.04em',
              opacity: (creating || !isFormValid()) ? 0.6 : 1
            }}>
              {creating ? (
                <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Creating...</>
              ) : 'Publish Ad'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          form > div:first-child { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
