import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoCheckmarkCircle, IoClose, IoSearch, IoChevronDown, IoSwapHorizontal, IoPricetag, IoWallet, IoCard, IoSettings } from 'react-icons/io5';
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

// Payment methods
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
  africa: '🇦🇫 Africa',
  americas: '🇺🇸 Americas',
  asia_me: '🇦🇪 Asia / Middle East',
};

const getAllPaymentMethods = () => Object.values(PAYMENT_METHODS_CONFIG).flat();

// Styles
const ACCENT = { green: '#22C55E', teal: '#14B8A6', blue: '#3B82F6', purple: '#8B5CF6', amber: '#F59E0B', grey: '#6B7280' };

const cardStyle = (accent) => ({
  background: `linear-gradient(180deg, rgba(22, 30, 58, 0.98) 0%, rgba(14, 18, 42, 0.99) 100%)`,
  borderTop: `3px solid ${accent}`,
  border: `1px solid ${accent}35`,
  borderRadius: '12px',
  padding: '20px 22px',
  boxShadow: `0 4px 20px rgba(0,0,0,0.25), 0 0 40px ${accent}08`,
  position: 'relative',
});

const TITLE = (icon) => ({
  color: '#fff',
  fontSize: '0.875rem',
  fontWeight: '700',
  marginBottom: '14px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
});

const LABEL = { color: 'rgba(255,255,255,0.55)', fontSize: '0.625rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' };
const INPUT = { width: '100%', padding: '12px 14px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.9375rem', fontWeight: '600', outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' };

export default function CreateAd() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [adType, setAdType] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [cryptoDropdownOpen, setCryptoDropdownOpen] = useState(false);
  const [fiatDropdownOpen, setFiatDropdownOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(true);
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
    flex: 1, height: '48px',
    background: active ? `linear-gradient(135deg, ${color}25, ${color}15)` : 'rgba(0,0,0,0.5)',
    border: active ? `2px solid ${color}` : '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', color: active ? '#fff' : 'rgba(255,255,255,0.45)',
    fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer',
    boxShadow: active ? `0 0 20px ${color}30, inset 0 1px 0 rgba(255,255,255,0.1)` : 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    transition: 'all 0.2s'
  });

  const dropdownStyle = { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'rgba(12,16,36,0.99)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', maxHeight: '240px', overflowY: 'auto', zIndex: 300, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' };
  const dropdownItem = (active) => ({ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: active ? 'rgba(59,130,246,0.12)' : 'transparent', borderLeft: active ? '3px solid #3B82F6' : '3px solid transparent', fontSize: '0.875rem' });

  return (
    <>
      {showSuccess && (
        <div style={{ position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #22C55E, #16A34A)', borderRadius: '10px', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 9999, boxShadow: '0 8px 32px rgba(34,197,94,0.4)' }}>
          <IoCheckmarkCircle size={20} color="#fff" />
          <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.875rem' }}>Ad created successfully!</span>
        </div>
      )}

      {/* MAIN - GRADIENT BACKGROUND */}
      <div style={{ 
        width: '100%', 
        minHeight: 'calc(100vh - 60px)',
        background: 'linear-gradient(180deg, rgba(8,12,28,1) 0%, rgba(12,18,38,1) 50%, rgba(8,12,28,1) 100%)',
        paddingBottom: '80px'
      }}>
        
        {/* HEADER */}
        <div style={{ 
          background: 'linear-gradient(180deg, rgba(25, 35, 65, 0.8) 0%, transparent 100%)',
          borderBottom: '1px solid rgba(0, 255, 200, 0.1)',
          padding: '12px 28px'
        }}>
          <h1 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#fff', marginBottom: '2px' }}>Create new P2P ad</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', margin: 0 }}>Set your trading terms and start receiving orders</p>
        </div>

        {/* FORM */}
        <div style={{ padding: '16px 28px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
              
              {/* LEFT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* AD TYPE */}
                <div style={cardStyle(ACCENT.green)}>
                  <div style={TITLE()}><IoSwapHorizontal size={16} color={ACCENT.green} /> Ad type</div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={() => setAdType('sell')} style={pillStyle(adType === 'sell')}>
                      {adType === 'sell' && <IoCheckmarkCircle size={14} />} SELL
                    </button>
                    <button type="button" onClick={() => setAdType('buy')} style={pillStyle(adType === 'buy')}>
                      {adType === 'buy' && <IoCheckmarkCircle size={14} />} BUY
                    </button>
                  </div>
                </div>

                {/* TRADING PAIR */}
                <div style={cardStyle(ACCENT.blue)}>
                  <div style={TITLE()}><IoSwapHorizontal size={16} color={ACCENT.blue} /> Trading pair</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="crypto-dropdown">
                      <label style={LABEL}>Crypto</label>
                      <div style={{ position: 'relative' }}>
                        <div onClick={() => { setCryptoDropdownOpen(!cryptoDropdownOpen); setFiatDropdownOpen(false); }}
                          style={{ ...INPUT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '48px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Coin3DIcon symbol={formData.crypto_currency} size={22} />
                            <span>{formData.crypto_currency}</span>
                          </div>
                          <IoChevronDown size={14} style={{ color: 'rgba(255,255,255,0.4)', transform: cryptoDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                        </div>
                        {cryptoDropdownOpen && (
                          <div style={dropdownStyle}>
                            {cryptos.map(c => (
                              <div key={c} onClick={() => { handleChange('crypto_currency', c); setCryptoDropdownOpen(false); }} style={dropdownItem(formData.crypto_currency === c)}>
                                <Coin3DIcon symbol={c} size={20} />
                                <span style={{ fontWeight: '600', color: formData.crypto_currency === c ? '#fff' : 'rgba(255,255,255,0.8)' }}>{c}</span>
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>{CRYPTO_CONFIG[c]?.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="fiat-dropdown">
                      <label style={LABEL}>Fiat</label>
                      <div style={{ position: 'relative' }}>
                        <div onClick={() => { setFiatDropdownOpen(!fiatDropdownOpen); setCryptoDropdownOpen(false); }}
                          style={{ ...INPUT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '48px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.25rem' }}>{FIAT_CONFIG[formData.fiat_currency]?.flag}</span>
                            <span>{formData.fiat_currency}</span>
                          </div>
                          <IoChevronDown size={14} style={{ color: 'rgba(255,255,255,0.4)', transform: fiatDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                        </div>
                        {fiatDropdownOpen && (
                          <div style={dropdownStyle}>
                            {fiats.map(f => (
                              <div key={f} onClick={() => { handleChange('fiat_currency', f); setFiatDropdownOpen(false); }} style={dropdownItem(formData.fiat_currency === f)}>
                                <span style={{ fontSize: '1.25rem' }}>{FIAT_CONFIG[f]?.flag}</span>
                                <span style={{ fontWeight: '600', color: formData.fiat_currency === f ? '#fff' : 'rgba(255,255,255,0.8)' }}>{f}</span>
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>{FIAT_CONFIG[f]?.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* TRADE LIMITS */}
                <div style={cardStyle(ACCENT.purple)}>
                  <div style={TITLE()}><IoWallet size={16} color={ACCENT.purple} /> Trade limits</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={LABEL}>Minimum</label>
                      <div style={{ position: 'relative' }}>
                        <input type="number" step="0.00000001" value={formData.min_amount} onChange={(e) => handleChange('min_amount', e.target.value)} placeholder="0.001" style={{ ...INPUT, paddingRight: '50px' }} />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', fontSize: '0.6875rem', fontWeight: '600' }}>{formData.crypto_currency}</span>
                      </div>
                    </div>
                    <div>
                      <label style={LABEL}>Maximum</label>
                      <div style={{ position: 'relative' }}>
                        <input type="number" step="0.00000001" value={formData.max_amount} onChange={(e) => handleChange('max_amount', e.target.value)} placeholder="10" style={{ ...INPUT, paddingRight: '50px' }} />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', fontSize: '0.6875rem', fontWeight: '600' }}>{formData.crypto_currency}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ADVANCED OPTIONS - EXPANDED */}
                <div style={cardStyle(ACCENT.grey)}>
                  <div style={TITLE()}><IoSettings size={16} color={ACCENT.grey} /> Advanced options</div>
                  <textarea value={formData.terms} onChange={(e) => handleChange('terms', e.target.value)} placeholder="Add special terms, payment instructions, or requirements for traders..." rows={4} style={{ ...INPUT, resize: 'none', minHeight: '90px', fontSize: '0.8125rem' }} />
                  <p style={{ marginTop: '8px', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)' }}>Optional: Add any special instructions for buyers/sellers</p>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* PRICING MODE */}
                <div style={cardStyle(ACCENT.teal)}>
                  <div style={TITLE()}><IoPricetag size={16} color={ACCENT.teal} /> Pricing mode</div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={() => handleChange('price_type', 'fixed')} style={pillStyle(formData.price_type === 'fixed', ACCENT.teal)}>
                      Fixed price
                    </button>
                    <button type="button" onClick={() => handleChange('price_type', 'floating')} style={pillStyle(formData.price_type === 'floating', ACCENT.teal)}>
                      Floating %
                    </button>
                  </div>
                </div>

                {/* PRICE */}
                <div style={cardStyle(ACCENT.teal)}>
                  <div style={TITLE()}><IoPricetag size={16} color={ACCENT.teal} /> Price</div>
                  <div style={{ position: 'relative' }}>
                    <input type="number" value={formData.price_value} onChange={(e) => handleChange('price_value', e.target.value)}
                      placeholder={formData.price_type === 'fixed' ? '45,500' : '+2.5'}
                      style={{ ...INPUT, fontSize: '1.125rem', fontWeight: '700', height: '52px', paddingRight: '60px' }} />
                    <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', fontWeight: '600' }}>
                      {formData.price_type === 'fixed' ? formData.fiat_currency : '%'}
                    </span>
                  </div>
                  <p style={{ marginTop: '6px', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)' }}>
                    {formData.price_type === 'fixed' ? `Price per 1 ${formData.crypto_currency}` : 'Percentage above/below market'}
                  </p>
                </div>

                {/* PAYMENT METHODS - TALLER */}
                <div style={{ ...cardStyle(ACCENT.amber), minHeight: '220px' }} ref={paymentRef}>
                  <div style={{ ...TITLE(), marginBottom: '12px' }}>
                    <IoCard size={16} color={ACCENT.amber} /> Payment methods
                    <span style={{ marginLeft: 'auto', background: 'rgba(220,38,38,0.15)', color: '#DC2626', fontSize: '0.5rem', fontWeight: '600', padding: '2px 6px', borderRadius: '4px' }}>REQUIRED</span>
                  </div>
                  
                  {/* Selected chips inside */}
                  <div style={{ minHeight: '40px', marginBottom: '10px', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {formData.payment_methods.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {formData.payment_methods.map(id => {
                          const m = getMethod(id);
                          return m ? (
                            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '16px', padding: '4px 10px', fontSize: '0.75rem', color: '#F59E0B' }}>
                              <span>{m.icon}</span><span>{m.label}</span>
                              <IoClose size={12} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => removePayment(id)} />
                            </div>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>No payment methods selected</span>
                    )}
                  </div>

                  {/* Dropdown trigger */}
                  <div onClick={() => setPaymentDropdownOpen(!paymentDropdownOpen)} style={{ ...INPUT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', ...(paymentDropdownOpen ? { border: '1px solid #F59E0B' } : {}) }}>
                    <span>+ Add payment methods...</span>
                    <IoChevronDown size={14} style={{ transform: paymentDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                  </div>

                  {/* Dropdown */}
                  {paymentDropdownOpen && (
                    <div style={{ position: 'absolute', left: '22px', right: '22px', marginTop: '4px', background: 'rgba(12,16,36,0.99)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', maxHeight: '280px', overflowY: 'auto', zIndex: 300, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
                      <div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, background: 'rgba(12,16,36,0.99)' }}>
                        <div style={{ position: 'relative' }}>
                          <IoSearch size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                          <input type="text" value={paymentSearch} onChange={(e) => setPaymentSearch(e.target.value)} placeholder="Search..." autoFocus style={{ ...INPUT, padding: '8px 10px 8px 32px', fontSize: '0.8125rem' }} />
                        </div>
                      </div>
                      {Object.entries(PAYMENT_METHODS_CONFIG).map(([region, methods]) => {
                        const filtered = filterMethods(methods);
                        if (!filtered.length) return null;
                        return (
                          <div key={region}>
                            <div style={{ padding: '8px 14px 4px', fontSize: '0.625rem', fontWeight: '700', color: ACCENT.amber, textTransform: 'uppercase', background: 'rgba(0,0,0,0.2)' }}>{REGION_LABELS[region]}</div>
                            {filtered.map(m => {
                              const sel = formData.payment_methods.includes(m.id);
                              return (
                                <div key={m.id} onClick={() => togglePayment(m.id)} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: sel ? 'rgba(245,158,11,0.1)' : 'transparent', borderLeft: sel ? '3px solid #F59E0B' : '3px solid transparent', fontSize: '0.8125rem' }}>
                                  <span style={{ fontSize: '1rem' }}>{m.icon}</span>
                                  <span style={{ color: sel ? '#F59E0B' : 'rgba(255,255,255,0.85)', fontWeight: sel ? '600' : '400' }}>{m.label}</span>
                                  {sel && <IoCheckmarkCircle size={14} color="#F59E0B" style={{ marginLeft: 'auto' }} />}
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
          </form>
        </div>
      </div>

      {/* STICKY FOOTER */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 250,
        right: 0,
        padding: '14px 28px',
        background: 'linear-gradient(180deg, rgba(18, 24, 48, 0.98) 0%, rgba(12, 16, 36, 1) 100%)',
        borderTop: '1px solid rgba(0, 255, 200, 0.1)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100
      }}>
        <div style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.8125rem' }}>
          {isValid() ? (
            <span style={{ color: '#22C55E', fontWeight: '600' }}>✓ Ready to publish your ad</span>
          ) : (
            <span>Complete all required fields</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" onClick={() => navigate('/p2p/merchant')} style={{
            padding: '10px 24px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.8125rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            Cancel
          </button>
          <button type="submit" form="create-ad-form" disabled={creating || !isValid()} onClick={handleSubmit} style={{
            padding: '10px 32px',
            background: (creating || !isValid()) 
              ? 'rgba(40, 40, 50, 0.6)' 
              : 'linear-gradient(135deg, #22C55E 0%, #14B8A6 100%)',
            border: 'none',
            borderRadius: '8px',
            color: (creating || !isValid()) ? 'rgba(255, 255, 255, 0.25)' : '#fff',
            fontSize: '0.8125rem',
            fontWeight: '700',
            cursor: (creating || !isValid()) ? 'not-allowed' : 'pointer',
            boxShadow: (creating || !isValid()) 
              ? 'none' 
              : '0 4px 16px rgba(34, 197, 94, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {creating && <div style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
            Publish ad
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 1024px) { form > div { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}
