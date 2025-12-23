import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoCheckmarkCircle, IoClose, IoSearch, IoChevronDown } from 'react-icons/io5';
import axiosInstance from '@/utils/axiosConfig';
import { toast } from 'sonner';
import Coin3DIcon from '@/components/Coin3DIcon';

// Crypto config
const CRYPTO_CONFIG = {
  BTC: { symbol: '₿', name: 'Bitcoin' },
  ETH: { symbol: 'Ξ', name: 'Ethereum' },
  USDT: { symbol: '₮', name: 'Tether' },
  USDC: { symbol: '$', name: 'USD Coin' },
  BNB: { symbol: '◆', name: 'BNB' },
  SOL: { symbol: '◎', name: 'Solana' },
  XRP: { symbol: '✕', name: 'Ripple' },
  ADA: { symbol: '₳', name: 'Cardano' },
  DOGE: { symbol: 'Ð', name: 'Dogecoin' },
  TRX: { symbol: '▲', name: 'Tron' },
};

// Fiat config
const FIAT_CONFIG = {
  GBP: { flag: '🇬🇧', name: 'British Pound' },
  EUR: { flag: '🇪🇺', name: 'Euro' },
  USD: { flag: '🇺🇸', name: 'US Dollar' },
  NGN: { flag: '🇳🇬', name: 'Nigerian Naira' },
  INR: { flag: '🇮🇳', name: 'Indian Rupee' },
  AED: { flag: '🇦🇪', name: 'UAE Dirham' },
  BRL: { flag: '🇧🇷', name: 'Brazilian Real' },
  CAD: { flag: '🇨🇦', name: 'Canadian Dollar' },
};

// Payment methods - grouped by region
const PAYMENT_METHODS_CONFIG = {
  uk_europe: [
    { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
    { id: 'faster_payments', label: 'Faster Payments', icon: '⚡' },
    { id: 'sepa', label: 'SEPA', icon: '🇪🇺' },
    { id: 'sepa_instant', label: 'SEPA Instant', icon: '🌍' },
    { id: 'swift', label: 'SWIFT', icon: '🌐' },
    { id: 'card_transfer', label: 'Card Transfer', icon: '💳' },
  ],
  global: [
    { id: 'wise', label: 'Wise', icon: '💼' },
    { id: 'paypal', label: 'PayPal', icon: '💸' },
    { id: 'revolut', label: 'Revolut', icon: '📱' },
    { id: 'skrill', label: 'Skrill', icon: '💵' },
    { id: 'neteller', label: 'Neteller', icon: '💵' },
  ],
  africa: [
    { id: 'bank_transfer_ng', label: 'Bank Transfer (NG)', icon: '🇳🇬' },
    { id: 'opay', label: 'OPay', icon: '🇳🇬' },
    { id: 'palmpay', label: 'PalmPay', icon: '🇳🇬' },
    { id: 'paga', label: 'Paga', icon: '🇳🇬' },
    { id: 'mobile_money', label: 'Mobile Money', icon: '📲' },
  ],
  americas: [
    { id: 'ach', label: 'ACH', icon: '🇺🇸' },
    { id: 'interac', label: 'Interac', icon: '🇨🇦' },
    { id: 'pix', label: 'PIX', icon: '🇧🇷' },
  ],
  asia_me: [
    { id: 'upi', label: 'UPI', icon: '🇮🇳' },
    { id: 'local_bank_ae', label: 'Local Bank Transfer', icon: '🇦🇪' },
    { id: 'mobile_wallets', label: 'Mobile Wallets', icon: '📲' },
  ],
};

const REGION_LABELS = {
  uk_europe: '🇬🇧 UK / Europe',
  global: '🌍 Global',
  africa: '🇬🇧 Africa',
  americas: '🇺🇸 Americas',
  asia_me: '🇦🇪 Asia / Middle East',
};

const getAllPaymentMethods = () => Object.values(PAYMENT_METHODS_CONFIG).flat();

// Styles
const ACCENT = { green: '#22C55E', teal: '#14B8A6', blue: '#3B82F6', purple: '#8B5CF6', amber: '#F59E0B', grey: '#6B7280' };

const cardStyle = (accent) => ({
  background: `linear-gradient(180deg, rgba(20, 28, 55, 0.95) 0%, rgba(12, 16, 38, 0.98) 100%)`,
  borderTop: `3px solid ${accent}`,
  border: `1px solid ${accent}25`,
  borderRadius: '14px',
  padding: '22px 26px',
  boxShadow: `0 4px 24px rgba(0,0,0,0.3), 0 0 60px ${accent}10, inset 0 1px 0 rgba(255,255,255,0.03)`,
  position: 'relative',
});

const LABEL = { color: 'rgba(255,255,255,0.55)', fontSize: '0.6875rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', display: 'block' };
const TITLE = { color: '#fff', fontSize: '0.9375rem', fontWeight: '700', marginBottom: '16px', letterSpacing: '0.01em' };
const INPUT = { width: '100%', padding: '14px 16px', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '1rem', fontWeight: '600', outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' };
const INPUT_FOCUS = { border: '1px solid rgba(0, 255, 200, 0.4)', boxShadow: '0 0 0 3px rgba(0, 255, 200, 0.08)' };

export default function CreateAd() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [adType, setAdType] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [cryptoDropdownOpen, setCryptoDropdownOpen] = useState(false);
  const [fiatDropdownOpen, setFiatDropdownOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const paymentRef = useRef(null);
  
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

  const cryptos = Object.keys(CRYPTO_CONFIG);
  const fiats = Object.keys(FIAT_CONFIG);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) navigate('/login');
  }, [navigate]);

  useEffect(() => {
    const handleClick = (e) => {
      if (paymentRef.current && !paymentRef.current.contains(e.target)) setPaymentDropdownOpen(false);
      if (!e.target.closest('.crypto-dropdown')) setCryptoDropdownOpen(false);
      if (!e.target.closest('.fiat-dropdown')) setFiatDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const togglePayment = (id) => setFormData(prev => ({ ...prev, payment_methods: prev.payment_methods.includes(id) ? prev.payment_methods.filter(m => m !== id) : [...prev.payment_methods, id] }));
  const removePayment = (id) => setFormData(prev => ({ ...prev, payment_methods: prev.payment_methods.filter(m => m !== id) }));
  const getMethod = (id) => getAllPaymentMethods().find(m => m.id === id);
  const filterMethods = (methods) => !paymentSearch ? methods : methods.filter(m => m.label.toLowerCase().includes(paymentSearch.toLowerCase()));

  const isValid = () => adType && formData.price_value && parseFloat(formData.price_value) > 0 && formData.min_amount && formData.max_amount && parseFloat(formData.min_amount) < parseFloat(formData.max_amount) && formData.payment_methods.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid()) { toast.error('Please complete all required fields'); return; }
    setCreating(true);
    try {
      const res = await axiosInstance.post('/p2p/create-ad', {
        ad_type: adType, crypto_currency: formData.crypto_currency, fiat_currency: formData.fiat_currency,
        price_type: formData.price_type, price_value: parseFloat(formData.price_value),
        min_amount: parseFloat(formData.min_amount), max_amount: parseFloat(formData.max_amount),
        payment_methods: formData.payment_methods, terms: formData.terms || ''
      });
      if (res.data.success) { setShowSuccess(true); setTimeout(() => navigate('/p2p/merchant'), 2000); }
    } catch (err) { toast.error('Failed to create ad'); }
    finally { setCreating(false); }
  };

  const pillStyle = (active, color = ACCENT.green) => ({
    flex: 1, height: '52px',
    background: active ? `linear-gradient(135deg, ${color}20, ${color}10)` : 'rgba(0,0,0,0.4)',
    border: active ? `2px solid ${color}` : '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', color: active ? '#fff' : 'rgba(255,255,255,0.4)',
    fontSize: '0.9375rem', fontWeight: '700', cursor: 'pointer',
    boxShadow: active ? `0 0 25px ${color}35` : 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    transition: 'all 0.2s'
  });

  const dropdownStyle = { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'rgba(10,14,32,0.98)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', maxHeight: '280px', overflowY: 'auto', zIndex: 300, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' };
  const dropdownItem = (active) => ({ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: active ? 'rgba(59,130,246,0.12)' : 'transparent', borderLeft: active ? '3px solid #3B82F6' : '3px solid transparent' });

  return (
    <>
      {showSuccess && (
        <div style={{ position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #22C55E, #16A34A)', borderRadius: '12px', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 9999, boxShadow: '0 8px 32px rgba(34,197,94,0.4)' }}>
          <IoCheckmarkCircle size={22} color="#fff" />
          <span style={{ color: '#fff', fontWeight: '600' }}>Ad created successfully!</span>
        </div>
      )}

      {/* MAIN CONTAINER - NO DEAD SPACE */}
      <div style={{ width: '100%' }}>
        
        {/* HEADER WITH VISUAL ANCHOR - TIGHT TO TOP */}
        <div style={{ 
          background: 'linear-gradient(180deg, rgba(20, 30, 60, 0.6) 0%, transparent 100%)',
          borderBottom: '1px solid rgba(0, 255, 200, 0.1)',
          padding: '14px 32px',
          marginBottom: '0'
        }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: '700', color: '#fff', marginBottom: '2px' }}>Create new P2P ad</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem', margin: 0 }}>Set your trading terms and start receiving orders</p>
        </div>

        {/* FORM AREA - FULL WIDTH */}
        <div style={{ padding: '20px 32px 0 32px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
              
              {/* LEFT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 1. AD TYPE */}
                <div style={cardStyle(ACCENT.green)}>
                  <div style={TITLE}>Ad type</div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => setAdType('sell')} style={pillStyle(adType === 'sell')}>
                      {adType === 'sell' && <IoCheckmarkCircle size={16} />} SELL
                    </button>
                    <button type="button" onClick={() => setAdType('buy')} style={pillStyle(adType === 'buy')}>
                      {adType === 'buy' && <IoCheckmarkCircle size={16} />} BUY
                    </button>
                  </div>
                </div>

                {/* 2. TRADING PAIR */}
                <div style={cardStyle(ACCENT.blue)}>
                  <div style={TITLE}>Trading pair</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {/* Crypto */}
                    <div className="crypto-dropdown">
                      <label style={LABEL}>Crypto</label>
                      <div style={{ position: 'relative' }}>
                        <div onClick={() => { setCryptoDropdownOpen(!cryptoDropdownOpen); setFiatDropdownOpen(false); }}
                          style={{ ...INPUT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(0,0,0,0.4))', border: '1px solid rgba(59,130,246,0.25)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Coin3DIcon symbol={formData.crypto_currency} size={28} />
                            <span style={{ fontWeight: '700' }}>{formData.crypto_currency}</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>— {CRYPTO_CONFIG[formData.crypto_currency]?.name}</span>
                          </div>
                          <IoChevronDown size={18} style={{ color: 'rgba(255,255,255,0.4)', transform: cryptoDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                        </div>
                        {cryptoDropdownOpen && (
                          <div style={dropdownStyle}>
                            {cryptos.map(c => (
                              <div key={c} onClick={() => { handleChange('crypto_currency', c); setCryptoDropdownOpen(false); }} style={dropdownItem(formData.crypto_currency === c)}>
                                <Coin3DIcon symbol={c} size={24} />
                                <span style={{ fontWeight: '600', color: formData.crypto_currency === c ? '#fff' : 'rgba(255,255,255,0.8)' }}>{c}</span>
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>— {CRYPTO_CONFIG[c]?.name}</span>
                                {formData.crypto_currency === c && <IoCheckmarkCircle size={16} color="#3B82F6" style={{ marginLeft: 'auto' }} />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Fiat */}
                    <div className="fiat-dropdown">
                      <label style={LABEL}>Fiat</label>
                      <div style={{ position: 'relative' }}>
                        <div onClick={() => { setFiatDropdownOpen(!fiatDropdownOpen); setCryptoDropdownOpen(false); }}
                          style={{ ...INPUT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(0,0,0,0.4))', border: '1px solid rgba(59,130,246,0.25)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.5rem' }}>{FIAT_CONFIG[formData.fiat_currency]?.flag}</span>
                            <span style={{ fontWeight: '700' }}>{formData.fiat_currency}</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>— {FIAT_CONFIG[formData.fiat_currency]?.name}</span>
                          </div>
                          <IoChevronDown size={18} style={{ color: 'rgba(255,255,255,0.4)', transform: fiatDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                        </div>
                        {fiatDropdownOpen && (
                          <div style={dropdownStyle}>
                            {fiats.map(f => (
                              <div key={f} onClick={() => { handleChange('fiat_currency', f); setFiatDropdownOpen(false); }} style={dropdownItem(formData.fiat_currency === f)}>
                                <span style={{ fontSize: '1.5rem' }}>{FIAT_CONFIG[f]?.flag}</span>
                                <span style={{ fontWeight: '600', color: formData.fiat_currency === f ? '#fff' : 'rgba(255,255,255,0.8)' }}>{f}</span>
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>— {FIAT_CONFIG[f]?.name}</span>
                                {formData.fiat_currency === f && <IoCheckmarkCircle size={16} color="#3B82F6" style={{ marginLeft: 'auto' }} />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. TRADE LIMITS */}
                <div style={cardStyle(ACCENT.purple)}>
                  <div style={TITLE}>Trade limits</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={LABEL}>Minimum</label>
                      <div style={{ position: 'relative' }}>
                        <input type="number" step="0.00000001" value={formData.min_amount} onChange={(e) => handleChange('min_amount', e.target.value)} placeholder="0.001" style={{ ...INPUT, paddingRight: '55px' }} />
                        <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '600' }}>{formData.crypto_currency}</span>
                      </div>
                    </div>
                    <div>
                      <label style={LABEL}>Maximum</label>
                      <div style={{ position: 'relative' }}>
                        <input type="number" step="0.00000001" value={formData.max_amount} onChange={(e) => handleChange('max_amount', e.target.value)} placeholder="10" style={{ ...INPUT, paddingRight: '55px' }} />
                        <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '600' }}>{formData.crypto_currency}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. ADVANCED OPTIONS - COLLAPSED BY DEFAULT */}
                <div style={cardStyle(ACCENT.grey)}>
                  <div onClick={() => setAdvancedOpen(!advancedOpen)} style={{ ...TITLE, marginBottom: advancedOpen ? '16px' : '0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Advanced options <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '400', fontSize: '0.8125rem' }}>(optional)</span></span>
                    <IoChevronDown size={18} style={{ color: 'rgba(255,255,255,0.4)', transform: advancedOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>
                  {advancedOpen && (
                    <textarea value={formData.terms} onChange={(e) => handleChange('terms', e.target.value)} placeholder="Special terms, instructions, or routing notes..." rows={3} style={{ ...INPUT, resize: 'none', minHeight: '80px', fontSize: '0.875rem' }} />
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 5. PRICING MODE */}
                <div style={cardStyle(ACCENT.teal)}>
                  <div style={TITLE}>Pricing mode</div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => handleChange('price_type', 'fixed')} style={pillStyle(formData.price_type === 'fixed', ACCENT.teal)}>
                      Fixed price
                    </button>
                    <button type="button" onClick={() => handleChange('price_type', 'floating')} style={pillStyle(formData.price_type === 'floating', ACCENT.teal)}>
                      Floating %
                    </button>
                  </div>
                </div>

                {/* 6. PRICE */}
                <div style={cardStyle(ACCENT.teal)}>
                  <div style={TITLE}>Price</div>
                  <div style={{ position: 'relative' }}>
                    <input type="number" value={formData.price_value} onChange={(e) => handleChange('price_value', e.target.value)}
                      placeholder={formData.price_type === 'fixed' ? '45,500' : '+2.5'}
                      style={{ ...INPUT, fontSize: '1.25rem', fontWeight: '700', height: '58px', paddingRight: '70px' }} />
                    <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', fontWeight: '600' }}>
                      {formData.price_type === 'fixed' ? formData.fiat_currency : '%'}
                    </span>
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                    {formData.price_type === 'fixed' ? `Price per 1 ${formData.crypto_currency}` : 'Percentage above/below market rate'}
                  </p>
                </div>

                {/* 7. PAYMENT METHODS - CONTENT HEIGHT ONLY */}
                <div style={cardStyle(ACCENT.amber)} ref={paymentRef}>
                  <div style={{ ...TITLE, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    Payment methods
                    <span style={{ background: 'rgba(220,38,38,0.15)', color: '#DC2626', fontSize: '0.5625rem', fontWeight: '600', padding: '3px 8px', borderRadius: '4px' }}>REQUIRED</span>
                  </div>
                  
                  {/* Selected chips */}
                  {formData.payment_methods.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      {formData.payment_methods.map(id => {
                        const m = getMethod(id);
                        return m ? (
                          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '20px', padding: '6px 12px', fontSize: '0.8125rem', color: '#F59E0B' }}>
                            <span>{m.icon}</span><span>{m.label}</span>
                            <IoClose size={14} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => removePayment(id)} />
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}

                  {/* Dropdown trigger */}
                  <div onClick={() => setPaymentDropdownOpen(!paymentDropdownOpen)} style={{ ...INPUT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'rgba(255,255,255,0.4)', ...(paymentDropdownOpen ? { border: '1px solid #F59E0B' } : {}) }}>
                    <span>Search payment methods...</span>
                    <IoChevronDown size={16} style={{ transform: paymentDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                  </div>

                  {/* Dropdown - OVERLAYS, does not expand card */}
                  {paymentDropdownOpen && (
                    <div style={{ position: 'absolute', left: '26px', right: '26px', marginTop: '4px', background: 'rgba(10,14,32,0.98)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', maxHeight: '320px', overflowY: 'auto', zIndex: 300, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
                      <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: 'rgba(10,14,32,0.98)' }}>
                        <div style={{ position: 'relative' }}>
                          <IoSearch size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                          <input type="text" value={paymentSearch} onChange={(e) => setPaymentSearch(e.target.value)} placeholder="Search..." autoFocus style={{ ...INPUT, padding: '10px 12px 10px 36px', fontSize: '0.875rem' }} />
                        </div>
                      </div>
                      {Object.entries(PAYMENT_METHODS_CONFIG).map(([region, methods]) => {
                        const filtered = filterMethods(methods);
                        if (!filtered.length) return null;
                        return (
                          <div key={region}>
                            <div style={{ padding: '10px 16px 6px', fontSize: '0.6875rem', fontWeight: '700', color: ACCENT.amber, textTransform: 'uppercase', background: 'rgba(0,0,0,0.2)' }}>{REGION_LABELS[region]}</div>
                            {filtered.map(m => {
                              const sel = formData.payment_methods.includes(m.id);
                              return (
                                <div key={m.id} onClick={() => togglePayment(m.id)} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: sel ? 'rgba(245,158,11,0.1)' : 'transparent', borderLeft: sel ? '3px solid #F59E0B' : '3px solid transparent' }}>
                                  <span style={{ fontSize: '1.125rem' }}>{m.icon}</span>
                                  <span style={{ color: sel ? '#F59E0B' : 'rgba(255,255,255,0.85)', fontWeight: sel ? '600' : '400' }}>{m.label}</span>
                                  {sel && <IoCheckmarkCircle size={16} color="#F59E0B" style={{ marginLeft: 'auto' }} />}
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

            {/* STICKY ACTION FOOTER */}
            <div style={{
              marginTop: '24px',
              marginLeft: '-32px',
              marginRight: '-32px',
              padding: '20px 32px',
              background: 'linear-gradient(180deg, rgba(15, 20, 40, 0.98) 0%, rgba(8, 12, 28, 0.99) 100%)',
              borderTop: '1px solid rgba(0, 255, 200, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.8125rem' }}>
                {isValid() ? (
                  <span style={{ color: '#22C55E' }}>✓ Ready to publish</span>
                ) : (
                  <span>Complete all required fields to publish your ad</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button type="button" onClick={() => navigate('/p2p/merchant')} style={{
                  padding: '12px 28px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating || !isValid()} style={{
                  padding: '12px 36px',
                  background: (creating || !isValid()) 
                    ? 'rgba(40, 40, 50, 0.6)' 
                    : 'linear-gradient(135deg, #22C55E 0%, #14B8A6 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: (creating || !isValid()) ? 'rgba(255, 255, 255, 0.25)' : '#fff',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  cursor: (creating || !isValid()) ? 'not-allowed' : 'pointer',
                  boxShadow: (creating || !isValid()) 
                    ? 'none' 
                    : '0 4px 20px rgba(34, 197, 94, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {creating && <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
                  Publish ad
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 1024px) { form > div:first-child { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}
