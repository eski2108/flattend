import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoCheckmarkCircle, IoClose, IoSearch, IoChevronDown } from 'react-icons/io5';
import axiosInstance from '@/utils/axiosConfig';
import { toast } from 'sonner';
import Coin3DIcon from '@/components/Coin3DIcon';

// Fiat config with flags
const FIAT_CONFIG = {
  GBP: { flag: '🇬🇧', name: 'British Pound' },
  USD: { flag: '🇺🇸', name: 'US Dollar' },
  EUR: { flag: '🇪🇺', name: 'Euro' },
  NGN: { flag: '🇳🇬', name: 'Nigerian Naira' },
  CAD: { flag: '🇨🇦', name: 'Canadian Dollar' },
  BRL: { flag: '🇧🇷', name: 'Brazilian Real' },
};

// Payment methods - FULL LIST grouped by region
const PAYMENT_METHODS_CONFIG = {
  uk: [
    { id: 'faster_payments', label: 'Faster Payments', icon: '⚡' },
    { id: 'bank_transfer_uk', label: 'Bank Transfer', icon: '🏦' },
  ],
  europe: [
    { id: 'sepa', label: 'SEPA', icon: '💶' },
    { id: 'sepa_instant', label: 'SEPA Instant', icon: '⚡' },
    { id: 'bank_transfer_eu', label: 'Bank Transfer', icon: '🏦' },
  ],
  global: [
    { id: 'swift', label: 'SWIFT', icon: '🌍' },
    { id: 'wise', label: 'Wise', icon: '🌐' },
    { id: 'paypal', label: 'PayPal', icon: '💳' },
  ],
  nigeria: [
    { id: 'bank_transfer_ng', label: 'Bank Transfer', icon: '🏦' },
    { id: 'opay', label: 'Opay', icon: '💚' },
    { id: 'moniepoint', label: 'Moniepoint', icon: '🟢' },
    { id: 'palmpay', label: 'PalmPay', icon: '🌴' },
  ],
  usa: [
    { id: 'ach', label: 'ACH', icon: '🇺🇸' },
    { id: 'wire_transfer', label: 'Wire Transfer', icon: '🏦' },
    { id: 'zelle', label: 'Zelle', icon: '⚡' },
  ],
  canada: [
    { id: 'interac', label: 'Interac', icon: '🍁' },
  ],
  brazil: [
    { id: 'pix', label: 'Pix', icon: '⚡' },
  ],
};

const REGION_LABELS = {
  uk: { label: '🇬🇧 UK', color: '#3B82F6' },
  europe: { label: '🇪🇺 Europe', color: '#8B5CF6' },
  global: { label: '🌍 Global', color: '#10B981' },
  nigeria: { label: '🇳🇬 Nigeria', color: '#22C55E' },
  usa: { label: '🇺🇸 USA', color: '#EF4444' },
  canada: { label: '🇨🇦 Canada', color: '#DC2626' },
  brazil: { label: '🇧🇷 Brazil', color: '#F59E0B' },
};

const getAllPaymentMethods = () => {
  const all = [];
  Object.values(PAYMENT_METHODS_CONFIG).flat().forEach(m => {
    if (!all.find(x => x.id === m.id)) all.push(m);
  });
  return all;
};

// Card accent colors
const ACCENT_COLORS = {
  adType: '#10B981',      // Green/teal
  tradingPair: '#3B82F6', // Blue
  pricingMode: '#14B8A6', // Teal
  tradeLimits: '#8B5CF6', // Purple
  paymentMethods: '#F59E0B', // Gold/amber
  advanced: '#6B7280',    // Grey
};

const cardStyle = (accentColor) => ({
  background: `linear-gradient(180deg, rgba(20, 28, 58, 0.98) 0%, rgba(12, 18, 40, 0.98) 100%)`,
  border: `1px solid ${accentColor}25`,
  borderTop: `3px solid ${accentColor}`,
  borderRadius: '14px',
  padding: '0',
  overflow: 'hidden',
  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), 0 4px 24px rgba(0, 0, 0, 0.25), 0 0 40px ${accentColor}08`,
  position: 'relative',
});

const cardAccent = (color) => ({
  display: 'none', // Now using border-top instead
});

const cardContent = {
  padding: '22px 26px',
};

const SECTION_TITLE = {
  color: 'rgba(255, 255, 255, 0.95)',
  fontSize: '0.9375rem',
  fontWeight: '600',
  marginBottom: '14px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
};

const LABEL_STYLE = {
  color: 'rgba(255, 255, 255, 0.4)',
  fontSize: '0.6875rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '8px',
  display: 'block'
};

const INPUT_STYLE = {
  width: '100%',
  padding: '14px 16px',
  background: 'rgba(0, 0, 0, 0.4)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '10px',
  color: '#fff',
  fontSize: '1rem',
  fontWeight: '600',
  outline: 'none',
  transition: 'all 0.2s ease',
  boxSizing: 'border-box',
};

export default function CreateAd() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [adType, setAdType] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [cryptoDropdownOpen, setCryptoDropdownOpen] = useState(false);
  const [fiatDropdownOpen, setFiatDropdownOpen] = useState(false);
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
  const [availableCryptos] = useState(['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'LTC', 'MATIC']);
  const availableFiats = ['GBP', 'USD', 'EUR', 'NGN', 'CAD', 'BRL'];

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) { navigate('/login'); return; }
  }, [navigate]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setPaymentDropdownOpen(false);
      }
      setCryptoDropdownOpen(false);
      setFiatDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  
  const togglePaymentMethod = (methodId) => {
    setFormData(prev => ({
      ...prev,
      payment_methods: prev.payment_methods.includes(methodId)
        ? prev.payment_methods.filter(m => m !== methodId)
        : [...prev.payment_methods, methodId]
    }));
  };

  const removePaymentMethod = (methodId) => {
    setFormData(prev => ({ ...prev, payment_methods: prev.payment_methods.filter(m => m !== methodId) }));
  };

  const getMethodById = (id) => getAllPaymentMethods().find(m => m.id === id);

  const filterMethods = (methods) => {
    if (!paymentSearch) return methods;
    return methods.filter(m => m.label.toLowerCase().includes(paymentSearch.toLowerCase()));
  };

  const isFormValid = () => (
    adType && formData.price_value && parseFloat(formData.price_value) > 0 &&
    formData.min_amount && parseFloat(formData.min_amount) > 0 &&
    formData.max_amount && parseFloat(formData.max_amount) > 0 &&
    formData.payment_methods.length > 0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) { toast.error('Complete all required fields'); return; }
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
        setTimeout(() => { setShowSuccess(false); navigate('/p2p/merchant'); }, 2500);
      }
    } catch (error) {
      toast.error(error.response?.status === 400 ? 'Complete all fields' : 'Failed to create ad');
    } finally { setCreating(false); }
  };

  const getPillStyle = (isSelected, color = '#22C55E') => ({
    flex: 1,
    height: '54px',
    background: isSelected 
      ? `linear-gradient(135deg, ${color}25 0%, ${color}15 100%)` 
      : 'rgba(0, 0, 0, 0.4)',
    border: isSelected ? `2px solid ${color}` : '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    color: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.4)',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: isSelected 
      ? `0 0 25px ${color}40, inset 0 1px 0 rgba(255,255,255,0.1)` 
      : 'inset 0 1px 0 rgba(255,255,255,0.02)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    textShadow: isSelected ? `0 0 20px ${color}` : 'none',
  });

  return (
    <>
      {showSuccess && (
        <div style={{
          position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #22C55E, #16A34A)',
          borderRadius: '12px', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: '12px',
          zIndex: 9999, boxShadow: '0 8px 32px rgba(34, 197, 94, 0.4)'
        }}>
          <IoCheckmarkCircle size={22} color="#fff" />
          <span style={{ color: '#fff', fontWeight: '600' }}>P2P Ad Created Successfully!</span>
        </div>
      )}

      <div style={{ width: '100%', minHeight: '100vh', padding: '0' }}>
        <div style={{ maxWidth: '1600px', width: '100%', margin: '0 auto', padding: '24px 32px' }}>
          
          <button onClick={() => navigate('/p2p/merchant')} style={{
            background: 'rgba(0, 255, 200, 0.06)', border: '1px solid rgba(0, 255, 200, 0.15)',
            borderRadius: '8px', color: '#00FFD0', display: 'inline-flex',
            alignItems: 'center', gap: '8px', fontSize: '0.8125rem', fontWeight: '600',
            cursor: 'pointer', padding: '10px 16px', marginBottom: '20px',
            transition: 'all 0.2s'
          }}>
            <IoArrowBack size={16} /> Back to Merchant
          </button>

          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>Create new P2P ad</h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.9375rem' }}>Set your trading terms and start receiving orders</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* ROW 1: Ad Type + Pricing Mode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              {/* AD TYPE */}
              <div style={cardStyle(ACCENT_COLORS.adType)}>
                <div style={cardAccent(ACCENT_COLORS.adType)} />
                <div style={cardContent}>
                  <div style={SECTION_TITLE}>
                    Ad type
                    <span style={{ background: '#DC2626', color: '#fff', fontSize: '0.5625rem', fontWeight: '700', padding: '3px 8px', borderRadius: '4px' }}>REQUIRED</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => setAdType('sell')} style={getPillStyle(adType === 'sell')}>
                      {adType === 'sell' && <IoCheckmarkCircle size={16} />} SELL
                    </button>
                    <button type="button" onClick={() => setAdType('buy')} style={getPillStyle(adType === 'buy')}>
                      {adType === 'buy' && <IoCheckmarkCircle size={16} />} BUY
                    </button>
                  </div>
                </div>
              </div>

              {/* PRICING MODE */}
              <div style={cardStyle(ACCENT_COLORS.pricingMode)}>
                <div style={cardAccent(ACCENT_COLORS.pricingMode)} />
                <div style={cardContent}>
                  <div style={SECTION_TITLE}>Pricing mode</div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                    <button type="button" onClick={() => handleChange('price_type', 'fixed')} style={getPillStyle(formData.price_type === 'fixed', '#14B8A6')}>
                      Fixed price
                    </button>
                    <button type="button" onClick={() => handleChange('price_type', 'floating')} style={getPillStyle(formData.price_type === 'floating', '#14B8A6')}>
                      Floating %
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 2: Trading Pair + Price Input */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              {/* TRADING PAIR */}
              <div style={cardStyle(ACCENT_COLORS.tradingPair)}>
                <div style={cardAccent(ACCENT_COLORS.tradingPair)} />
                <div style={cardContent}>
                  <div style={SECTION_TITLE}>Trading pair</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={LABEL_STYLE}>Crypto</label>
                      <div style={{ position: 'relative' }}>
                        <div onClick={(e) => { e.stopPropagation(); setCryptoDropdownOpen(!cryptoDropdownOpen); setFiatDropdownOpen(false); }}
                          style={{ 
                            ...INPUT_STYLE, 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            height: '58px',
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(0,0,0,0.4) 100%)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)'
                          }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Coin3DIcon symbol={formData.crypto_currency} size={32} />
                            <span style={{ fontSize: '1.125rem', fontWeight: '700' }}>{formData.crypto_currency}</span>
                          </div>
                          <IoChevronDown size={18} style={{ color: 'rgba(255,255,255,0.5)', transform: cryptoDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </div>
                        {cryptoDropdownOpen && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'rgba(10, 15, 30, 0.98)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', maxHeight: '260px', overflowY: 'auto', zIndex: 200, boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)' }}>
                            {availableCryptos.map(c => (
                              <div key={c} onClick={() => { handleChange('crypto_currency', c); setCryptoDropdownOpen(false); }}
                                style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', background: formData.crypto_currency === c ? 'rgba(59, 130, 246, 0.15)' : 'transparent', borderLeft: formData.crypto_currency === c ? '3px solid #3B82F6' : '3px solid transparent', transition: 'all 0.15s' }}>
                                <Coin3DIcon symbol={c} size={26} />
                                <span style={{ color: formData.crypto_currency === c ? '#fff' : 'rgba(255,255,255,0.8)', fontWeight: formData.crypto_currency === c ? '600' : '500', fontSize: '0.9375rem' }}>{c}</span>
                                {formData.crypto_currency === c && <IoCheckmarkCircle size={16} color="#3B82F6" style={{ marginLeft: 'auto' }} />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>Fiat</label>
                      <div style={{ position: 'relative' }}>
                        <div onClick={(e) => { e.stopPropagation(); setFiatDropdownOpen(!fiatDropdownOpen); setCryptoDropdownOpen(false); }}
                          style={{ 
                            ...INPUT_STYLE, 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            height: '58px',
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(0,0,0,0.4) 100%)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)'
                          }}>
                          style={{ ...INPUT_STYLE, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.25rem' }}>{FIAT_CONFIG[formData.fiat_currency]?.flag}</span>
                            <span>{formData.fiat_currency}</span>
                          </div>
                          <IoChevronDown size={16} style={{ color: 'rgba(255,255,255,0.4)', transform: fiatDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                        </div>
                        {fiatDropdownOpen && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'rgba(10, 15, 30, 0.98)', border: '1px solid rgba(0, 255, 200, 0.2)', borderRadius: '10px', maxHeight: '240px', overflowY: 'auto', zIndex: 200, boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)' }}>
                            {availableFiats.map(f => (
                              <div key={f} onClick={() => { handleChange('fiat_currency', f); setFiatDropdownOpen(false); }}
                                style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: formData.fiat_currency === f ? 'rgba(0, 255, 200, 0.1)' : 'transparent', borderLeft: formData.fiat_currency === f ? '3px solid #00FFD0' : '3px solid transparent' }}>
                                <span style={{ fontSize: '1.25rem' }}>{FIAT_CONFIG[f]?.flag}</span>
                                <span style={{ color: formData.fiat_currency === f ? '#00FFD0' : '#fff', fontWeight: '500' }}>{f}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PRICE INPUT */}
              <div style={cardStyle(ACCENT_COLORS.pricingMode)}>
                <div style={cardAccent(ACCENT_COLORS.pricingMode)} />
                <div style={cardContent}>
                  <div style={SECTION_TITLE}>Price</div>
                  <input type="number" value={formData.price_value} onChange={(e) => handleChange('price_value', e.target.value)}
                    onFocus={() => setFocusedField('price')} onBlur={() => setFocusedField(null)}
                    placeholder={formData.price_type === 'fixed' ? '48,500' : 'e.g. 2.5'}
                    style={{ ...INPUT_STYLE, fontSize: '1.25rem', fontWeight: '700', height: '56px', ...(focusedField === 'price' ? { border: '1px solid #14B8A6', boxShadow: '0 0 0 3px rgba(20, 184, 166, 0.15)' } : {}) }} />
                  <p style={{ marginTop: '8px', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.35)' }}>
                    {formData.price_type === 'fixed' ? `Price per 1 ${formData.crypto_currency} in ${formData.fiat_currency}` : 'Percentage above/below market rate'}
                  </p>
                </div>
              </div>
            </div>

            {/* ROW 3: Trade Limits + Payment Methods */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              {/* TRADE LIMITS */}
              <div style={cardStyle(ACCENT_COLORS.tradeLimits)}>
                <div style={cardAccent(ACCENT_COLORS.tradeLimits)} />
                <div style={cardContent}>
                  <div style={SECTION_TITLE}>Trade limits</div>
                  <p style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.35)', marginBottom: '12px', marginTop: '-8px' }}>Limits are set in the selected crypto</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={LABEL_STYLE}>Minimum</label>
                      <div style={{ position: 'relative' }}>
                        <input type="number" step="0.00000001" value={formData.min_amount}
                          onChange={(e) => handleChange('min_amount', e.target.value)}
                          onFocus={() => setFocusedField('min')} onBlur={() => setFocusedField(null)}
                          placeholder="0.01"
                          style={{ ...INPUT_STYLE, paddingRight: '55px', ...(focusedField === 'min' ? { border: '1px solid #8B5CF6', boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.15)' } : {}) }} />
                        <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.75rem', fontWeight: '600' }}>{formData.crypto_currency}</span>
                      </div>
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>Maximum</label>
                      <div style={{ position: 'relative' }}>
                        <input type="number" step="0.00000001" value={formData.max_amount}
                          onChange={(e) => handleChange('max_amount', e.target.value)}
                          onFocus={() => setFocusedField('max')} onBlur={() => setFocusedField(null)}
                          placeholder="10"
                          style={{ ...INPUT_STYLE, paddingRight: '55px', ...(focusedField === 'max' ? { border: '1px solid #8B5CF6', boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.15)' } : {}) }} />
                        <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.75rem', fontWeight: '600' }}>{formData.crypto_currency}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PAYMENT METHODS */}
              <div style={cardStyle(ACCENT_COLORS.paymentMethods)} ref={dropdownRef}>
                <div style={cardAccent(ACCENT_COLORS.paymentMethods)} />
                <div style={cardContent}>
                  <div style={SECTION_TITLE}>
                    Payment methods
                    <span style={{ background: 'rgba(220, 38, 38, 0.15)', color: '#DC2626', fontSize: '0.5625rem', fontWeight: '600', padding: '3px 8px', borderRadius: '4px' }}>SELECT AT LEAST ONE</span>
                  </div>
                  
                  {/* Selected chips */}
                  {formData.payment_methods.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      {formData.payment_methods.map(id => {
                        const method = getMethodById(id);
                        return method ? (
                          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.8125rem', color: '#F59E0B' }}>
                            <span>{method.icon}</span>
                            <span>{method.label}</span>
                            <IoClose size={14} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => removePaymentMethod(id)} />
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}

                  {/* Dropdown trigger */}
                  <div onClick={() => setPaymentDropdownOpen(!paymentDropdownOpen)} style={{ ...INPUT_STYLE, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'rgba(255, 255, 255, 0.4)', ...(paymentDropdownOpen ? { border: '1px solid #F59E0B', boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.15)' } : {}) }}>
                    <span>Search payment methods...</span>
                    <IoChevronDown size={16} style={{ transform: paymentDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>

                  {/* Dropdown */}
                  {paymentDropdownOpen && (
                    <div style={{ position: 'absolute', left: '24px', right: '24px', marginTop: '4px', background: 'rgba(10, 15, 30, 0.98)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '12px', maxHeight: '320px', overflowY: 'auto', zIndex: 200, boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)' }}>
                      {/* Search */}
                      <div style={{ padding: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', position: 'sticky', top: 0, background: 'rgba(10, 15, 30, 0.98)' }}>
                        <div style={{ position: 'relative' }}>
                          <IoSearch size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.3)' }} />
                          <input type="text" value={paymentSearch} onChange={(e) => setPaymentSearch(e.target.value)} placeholder="Search..." autoFocus
                            style={{ ...INPUT_STYLE, padding: '10px 12px 10px 36px', fontSize: '0.875rem' }} />
                        </div>
                      </div>
                      {/* Grouped options */}
                      {Object.entries(PAYMENT_METHODS_CONFIG).map(([region, methods]) => {
                        const filtered = filterMethods(methods);
                        if (filtered.length === 0) return null;
                        return (
                          <div key={region}>
                            <div style={{ padding: '10px 14px 6px', fontSize: '0.6875rem', fontWeight: '700', color: REGION_LABELS[region]?.color || '#888', textTransform: 'uppercase', letterSpacing: '0.04em', background: 'rgba(0,0,0,0.2)' }}>
                              {REGION_LABELS[region]?.label}
                            </div>
                            {filtered.map(method => {
                              const isSelected = formData.payment_methods.includes(method.id);
                              return (
                                <div key={method.id} onClick={() => togglePaymentMethod(method.id)} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: isSelected ? 'rgba(245, 158, 11, 0.1)' : 'transparent', borderLeft: isSelected ? '3px solid #F59E0B' : '3px solid transparent', transition: 'all 0.15s' }}>
                                  <span style={{ fontSize: '1.125rem' }}>{method.icon}</span>
                                  <span style={{ color: isSelected ? '#F59E0B' : 'rgba(255, 255, 255, 0.85)', fontWeight: isSelected ? '600' : '400' }}>{method.label}</span>
                                  {isSelected && <IoCheckmarkCircle size={16} color="#F59E0B" style={{ marginLeft: 'auto' }} />}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ROW 4: Advanced Options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div style={cardStyle(ACCENT_COLORS.advanced)}>
                <div style={cardAccent(ACCENT_COLORS.advanced)} />
                <div style={cardContent}>
                  <div style={{ ...SECTION_TITLE, color: 'rgba(255, 255, 255, 0.6)' }}>
                    Advanced options
                    <span style={{ color: 'rgba(255, 255, 255, 0.25)', fontSize: '0.5625rem' }}>OPTIONAL</span>
                  </div>
                  <textarea value={formData.terms} onChange={(e) => handleChange('terms', e.target.value)}
                    placeholder="Add any special terms or instructions for traders..."
                    rows={3} style={{ ...INPUT_STYLE, resize: 'none', fontFamily: 'inherit', minHeight: '80px', fontSize: '0.875rem' }} />
                </div>
              </div>
              <div>{/* Empty for balance */}</div>
            </div>

            {/* ROW 5: PUBLISH BUTTON */}
            <button type="submit" disabled={creating || !isFormValid()} style={{
              width: '100%',
              height: '60px',
              background: (creating || !isFormValid()) ? 'rgba(50, 50, 50, 0.6)' : 'linear-gradient(135deg, #22C55E 0%, #14B8A6 100%)',
              border: 'none',
              borderRadius: '14px',
              fontSize: '1rem',
              fontWeight: '700',
              color: (creating || !isFormValid()) ? 'rgba(255, 255, 255, 0.25)' : '#fff',
              cursor: (creating || !isFormValid()) ? 'not-allowed' : 'pointer',
              boxShadow: (creating || !isFormValid()) ? 'none' : '0 6px 30px rgba(34, 197, 94, 0.35), 0 0 60px rgba(34, 197, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              transition: 'all 0.3s ease'
            }}>
              {creating ? (
                <><div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Creating...</>
              ) : 'Publish Ad'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 1024px) {
          form > div { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
