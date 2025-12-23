import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoCheckmarkCircle, IoClose, IoSearch, IoChevronDown, IoSwapHorizontal, IoPricetag, IoWallet, IoCard, IoSettings, IoArrowBack } from 'react-icons/io5';
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
  bank_transfers: [
    { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
    { id: 'faster_payments', label: 'Faster Payments', icon: '⚡' },
    { id: 'sepa', label: 'SEPA', icon: '🇪🇺' },
    { id: 'sepa_instant', label: 'SEPA Instant', icon: '🌍' },
    { id: 'swift', label: 'SWIFT', icon: '🌐' },
    { id: 'ach', label: 'ACH Transfer', icon: '🇺🇸' },
    { id: 'wire', label: 'Wire Transfer', icon: '💸' },
  ],
  cards: [
    { id: 'card_transfer', label: 'Card Transfer', icon: '💳' },
    { id: 'visa', label: 'Visa', icon: '💳' },
    { id: 'mastercard', label: 'Mastercard', icon: '💳' },
  ],
  wallets: [
    { id: 'wise', label: 'Wise', icon: '💼' },
    { id: 'paypal', label: 'PayPal', icon: '🅿️' },
    { id: 'revolut', label: 'Revolut', icon: '📱' },
    { id: 'skrill', label: 'Skrill', icon: '💵' },
    { id: 'neteller', label: 'Neteller', icon: '💵' },
    { id: 'venmo', label: 'Venmo', icon: '📲' },
    { id: 'cashapp', label: 'Cash App', icon: '💲' },
    { id: 'zelle', label: 'Zelle', icon: '⚡' },
  ],
  regional: [
    { id: 'bank_transfer_ng', label: 'Bank Transfer (NG)', icon: '🇳🇬' },
    { id: 'opay', label: 'OPay', icon: '🇳🇬' },
    { id: 'palmpay', label: 'PalmPay', icon: '🇳🇬' },
    { id: 'paga', label: 'Paga', icon: '🇳🇬' },
    { id: 'mobile_money', label: 'Mobile Money', icon: '📲' },
    { id: 'upi', label: 'UPI', icon: '🇮🇳' },
    { id: 'imps', label: 'IMPS', icon: '🇮🇳' },
    { id: 'pix', label: 'PIX', icon: '🇧🇷' },
    { id: 'interac', label: 'Interac e-Transfer', icon: '🇨🇦' },
    { id: 'local_bank_ae', label: 'UAE Bank Transfer', icon: '🇦🇪' },
  ],
  cash: [
    { id: 'cash_deposit', label: 'Cash Deposit', icon: '💵' },
    { id: 'cash_in_person', label: 'Cash (In Person)', icon: '🤝' },
  ],
  other: [
    { id: 'gift_card', label: 'Gift Card', icon: '🎁' },
    { id: 'crypto', label: 'Other Crypto', icon: '🪙' },
  ],
};

const REGION_LABELS = {
  bank_transfers: '🏦 Bank transfers',
  cards: '💳 Cards',
  wallets: '📱 Digital wallets',
  regional: '🌍 Regional methods',
  cash: '💵 Cash',
  other: '📦 Other',
};

const getAllPaymentMethods = () => Object.values(PAYMENT_METHODS_CONFIG).flat();

// Colors
const ACCENT = { 
  green: '#22C55E', 
  red: '#EF4444',
  teal: '#14B8A6', 
  blue: '#3B82F6', 
  purple: '#8B5CF6', 
  amber: '#F59E0B', 
  grey: '#64748B' 
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
  const [touched, setTouched] = useState(false);
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

  const handleChange = (field, value) => { setTouched(true); setFormData(prev => ({ ...prev, [field]: value })); };
  const togglePayment = (id) => { setTouched(true); setFormData(prev => ({ ...prev, payment_methods: prev.payment_methods.includes(id) ? prev.payment_methods.filter(m => m !== id) : [...prev.payment_methods, id] })); };
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

  // Card style
  const cardStyle = (accent, highlight = false) => ({
    background: highlight 
      ? `linear-gradient(145deg, rgba(40, 50, 85, 0.95) 0%, rgba(25, 32, 58, 0.98) 50%, rgba(18, 22, 42, 1) 100%)`
      : `linear-gradient(145deg, rgba(28, 36, 65, 0.92) 0%, rgba(18, 24, 48, 0.96) 50%, rgba(12, 16, 36, 1) 100%)`,
    border: highlight ? `1px solid ${accent}60` : `1px solid ${accent}35`,
    borderTop: `3px solid ${accent}`,
    borderRadius: '12px',
    padding: '16px 20px',
    boxShadow: highlight 
      ? `0 8px 32px rgba(0,0,0,0.35), 0 0 40px ${accent}12, inset 0 1px 0 rgba(255,255,255,0.08)`
      : `0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)`,
  });

  // Section title
  const titleStyle = (accent) => ({
    color: '#fff',
    fontSize: '0.8rem',
    fontWeight: '700',
    marginBottom: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textShadow: `0 0 20px ${accent}30`
  });

  // Label
  const labelStyle = { 
    color: 'rgba(255,255,255,0.5)', 
    fontSize: '0.6rem', 
    fontWeight: '600', 
    textTransform: 'uppercase', 
    letterSpacing: '0.06em', 
    marginBottom: '6px', 
    display: 'block' 
  };

  // Input
  const inputStyle = { 
    width: '100%', 
    padding: '12px 14px', 
    background: 'rgba(0,0,0,0.45)', 
    border: '1px solid rgba(255,255,255,0.1)', 
    borderRadius: '8px', 
    color: '#fff', 
    fontSize: '0.875rem', 
    fontWeight: '600', 
    outline: 'none', 
    boxSizing: 'border-box', 
    transition: 'all 0.2s' 
  };

  // Toggle button
  const toggleStyle = (active, color) => ({
    flex: 1,
    height: '46px',
    background: active 
      ? `linear-gradient(135deg, ${color}35 0%, ${color}18 100%)` 
      : 'rgba(0,0,0,0.4)',
    border: active 
      ? `2px solid ${color}` 
      : '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    color: active ? '#fff' : 'rgba(255,255,255,0.4)',
    fontSize: '0.8rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: active 
      ? `0 0 20px ${color}35, 0 4px 12px ${color}20, inset 0 1px 0 rgba(255,255,255,0.15)` 
      : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.2s ease'
  });

  // Dropdown
  const dropdownStyle = { 
    position: 'absolute', 
    top: '100%', 
    left: 0, 
    right: 0, 
    marginTop: '4px', 
    background: 'rgba(12,16,36,0.99)', 
    border: '1px solid rgba(59,130,246,0.4)', 
    borderRadius: '10px', 
    maxHeight: '240px', 
    overflowY: 'auto', 
    zIndex: 500, 
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)' 
  };

  const dropdownItem = (active) => ({ 
    padding: '10px 14px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px', 
    cursor: 'pointer', 
    background: active ? 'rgba(59,130,246,0.15)' : 'transparent', 
    borderLeft: active ? '3px solid #3B82F6' : '3px solid transparent', 
    fontSize: '0.8rem',
    transition: 'background 0.15s'
  });

  return (
    <>
      {showSuccess && (
        <div style={{ position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #22C55E, #16A34A)', borderRadius: '10px', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 9999, boxShadow: '0 8px 32px rgba(34,197,94,0.4)' }}>
          <IoCheckmarkCircle size={20} color="#fff" />
          <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.85rem' }}>Ad created successfully!</span>
        </div>
      )}

      {/* PAGE - Full width, no wrapper */}
      <div style={{ 
        width: '100%',
        minHeight: 'calc(100vh - 64px)',
        background: 'linear-gradient(180deg, rgba(12,16,32,1) 0%, rgba(16,22,44,1) 100%)',
        paddingBottom: '70px'
      }}>
        
        {/* HEADER - Compact */}
        <div style={{ 
          borderBottom: '1px solid rgba(59, 130, 246, 0.12)',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <button 
            onClick={() => navigate('/p2p/merchant')} 
            style={{ 
              background: 'rgba(255,255,255,0.04)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '6px', 
              padding: '6px 10px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.75rem'
            }}
          >
            <IoArrowBack size={12} /> Back
          </button>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', margin: 0 }}>Create new P2P ad</h1>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', margin: 0 }}>Set your trading terms and start receiving orders</p>
          </div>
        </div>

        {/* FORM - Full width grid */}
        <div style={{ padding: '16px 24px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '16px',
              alignItems: 'start'
            }}>
              
              {/* LEFT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* AD TYPE */}
                <div style={cardStyle(ACCENT.green)}>
                  <div style={titleStyle(ACCENT.green)}>
                    <IoSwapHorizontal size={16} color={ACCENT.green} />
                    Ad type
                    <span style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontSize: '0.5rem', fontWeight: '700', padding: '2px 6px', borderRadius: '3px' }}>REQUIRED</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={() => setAdType('sell')} style={toggleStyle(adType === 'sell', ACCENT.red)}>
                      {adType === 'sell' && <IoCheckmarkCircle size={14} />} I want to SELL
                    </button>
                    <button type="button" onClick={() => setAdType('buy')} style={toggleStyle(adType === 'buy', ACCENT.green)}>
                      {adType === 'buy' && <IoCheckmarkCircle size={14} />} I want to BUY
                    </button>
                  </div>
                </div>

                {/* TRADING PAIR */}
                <div style={cardStyle(ACCENT.blue)}>
                  <div style={titleStyle(ACCENT.blue)}>
                    <IoSwapHorizontal size={16} color={ACCENT.blue} />
                    Trading pair
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="crypto-dropdown">
                      <label style={labelStyle}>Crypto asset</label>
                      <div style={{ position: 'relative' }}>
                        <div 
                          onClick={() => { setCryptoDropdownOpen(!cryptoDropdownOpen); setFiatDropdownOpen(false); }}
                          style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '46px', border: cryptoDropdownOpen ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.1)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Coin3DIcon symbol={formData.crypto_currency} size={22} />
                            <span>{formData.crypto_currency}</span>
                          </div>
                          <IoChevronDown size={14} style={{ color: 'rgba(255,255,255,0.4)', transform: cryptoDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </div>
                        {cryptoDropdownOpen && (
                          <div style={dropdownStyle}>
                            {cryptos.map(c => (
                              <div key={c} onClick={() => { handleChange('crypto_currency', c); setCryptoDropdownOpen(false); }} style={dropdownItem(formData.crypto_currency === c)}>
                                <Coin3DIcon symbol={c} size={20} />
                                <span style={{ fontWeight: '600', color: formData.crypto_currency === c ? '#fff' : 'rgba(255,255,255,0.85)' }}>{c}</span>
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', marginLeft: 'auto' }}>{CRYPTO_CONFIG[c]?.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="fiat-dropdown">
                      <label style={labelStyle}>Fiat currency</label>
                      <div style={{ position: 'relative' }}>
                        <div 
                          onClick={() => { setFiatDropdownOpen(!fiatDropdownOpen); setCryptoDropdownOpen(false); }}
                          style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '46px', border: fiatDropdownOpen ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.1)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.2rem' }}>{FIAT_CONFIG[formData.fiat_currency]?.flag}</span>
                            <span>{formData.fiat_currency}</span>
                          </div>
                          <IoChevronDown size={14} style={{ color: 'rgba(255,255,255,0.4)', transform: fiatDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </div>
                        {fiatDropdownOpen && (
                          <div style={dropdownStyle}>
                            {fiats.map(f => (
                              <div key={f} onClick={() => { handleChange('fiat_currency', f); setFiatDropdownOpen(false); }} style={dropdownItem(formData.fiat_currency === f)}>
                                <span style={{ fontSize: '1.2rem' }}>{FIAT_CONFIG[f]?.flag}</span>
                                <span style={{ fontWeight: '600', color: formData.fiat_currency === f ? '#fff' : 'rgba(255,255,255,0.85)' }}>{f}</span>
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', marginLeft: 'auto' }}>{FIAT_CONFIG[f]?.name}</span>
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
                  <div style={titleStyle(ACCENT.purple)}>
                    <IoWallet size={16} color={ACCENT.purple} />
                    Trade limits
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Minimum amount</label>
                      <div style={{ position: 'relative' }}>
                        <input type="number" step="0.00000001" value={formData.min_amount} onChange={(e) => handleChange('min_amount', e.target.value)} placeholder="0.001" style={{ ...inputStyle, paddingRight: '50px' }} />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', fontWeight: '600' }}>{formData.crypto_currency}</span>
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Maximum amount</label>
                      <div style={{ position: 'relative' }}>
                        <input type="number" step="0.00000001" value={formData.max_amount} onChange={(e) => handleChange('max_amount', e.target.value)} placeholder="10" style={{ ...inputStyle, paddingRight: '50px' }} />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', fontWeight: '600' }}>{formData.crypto_currency}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ADVANCED OPTIONS */}
                <div style={cardStyle(ACCENT.grey)}>
                  <div style={titleStyle(ACCENT.grey)}>
                    <IoSettings size={16} color={ACCENT.grey} />
                    Advanced options
                    <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.25)', fontSize: '0.55rem', fontWeight: '500' }}>OPTIONAL</span>
                  </div>
                  <label style={labelStyle}>Terms & instructions</label>
                  <textarea 
                    value={formData.terms} 
                    onChange={(e) => handleChange('terms', e.target.value)} 
                    placeholder="Add special terms, payment instructions, or requirements..." 
                    rows={3} 
                    style={{ ...inputStyle, resize: 'none', minHeight: '80px', fontSize: '0.8rem' }} 
                  />
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* PRICING MODE */}
                <div style={cardStyle(ACCENT.teal)}>
                  <div style={titleStyle(ACCENT.teal)}>
                    <IoPricetag size={16} color={ACCENT.teal} />
                    Pricing mode
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={() => handleChange('price_type', 'fixed')} style={toggleStyle(formData.price_type === 'fixed', ACCENT.teal)}>
                      {formData.price_type === 'fixed' && <IoCheckmarkCircle size={14} />} Fixed price
                    </button>
                    <button type="button" onClick={() => handleChange('price_type', 'floating')} style={toggleStyle(formData.price_type === 'floating', ACCENT.teal)}>
                      {formData.price_type === 'floating' && <IoCheckmarkCircle size={14} />} Floating %
                    </button>
                  </div>
                  <p style={{ marginTop: '10px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>
                    {formData.price_type === 'fixed' ? 'Set a specific price per coin' : 'Price adjusts with market rate'}
                  </p>
                </div>

                {/* PRICE */}
                <div style={cardStyle(ACCENT.teal)}>
                  <div style={titleStyle(ACCENT.teal)}>
                    <IoPricetag size={16} color={ACCENT.teal} />
                    Your price
                    <span style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontSize: '0.5rem', fontWeight: '700', padding: '2px 6px', borderRadius: '3px' }}>REQUIRED</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="number" 
                      value={formData.price_value} 
                      onChange={(e) => handleChange('price_value', e.target.value)}
                      placeholder={formData.price_type === 'fixed' ? '45,500' : '+2.5'}
                      style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: '700', height: '54px', paddingRight: '60px' }} 
                    />
                    <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontWeight: '600' }}>
                      {formData.price_type === 'fixed' ? formData.fiat_currency : '%'}
                    </span>
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>
                    {formData.price_type === 'fixed' ? `Price per 1 ${formData.crypto_currency} in ${formData.fiat_currency}` : 'Percentage above/below market'}
                  </p>
                </div>

                {/* PAYMENT METHODS - Highlighted card */}
                <div style={{ ...cardStyle(ACCENT.teal, true), position: 'relative' }} ref={paymentRef}>
                  <div style={titleStyle(ACCENT.teal)}>
                    <IoCard size={16} color={ACCENT.teal} />
                    Payment methods
                    <span style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontSize: '0.5rem', fontWeight: '700', padding: '2px 6px', borderRadius: '3px' }}>REQUIRED</span>
                  </div>
                  
                  {/* Selected chips */}
                  <div style={{ 
                    minHeight: '44px', 
                    marginBottom: '10px', 
                    padding: '8px 10px', 
                    background: 'rgba(0,0,0,0.4)', 
                    borderRadius: '8px', 
                    border: '1px solid rgba(20,184,166,0.2)' 
                  }}>
                    {formData.payment_methods.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {formData.payment_methods.map(id => {
                          const m = getMethod(id);
                          return m ? (
                            <div key={id} style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '5px', 
                              background: 'linear-gradient(135deg, rgba(20,184,166,0.3) 0%, rgba(20,184,166,0.15) 100%)', 
                              border: '1px solid rgba(20,184,166,0.5)', 
                              borderRadius: '16px', 
                              padding: '5px 10px', 
                              fontSize: '0.75rem', 
                              color: '#14B8A6',
                              fontWeight: '500'
                            }}>
                              <span>{m.icon}</span>
                              <span>{m.label}</span>
                              <IoClose size={12} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => removePayment(id)} />
                            </div>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>No payment methods selected</span>
                    )}
                  </div>

                  {/* Dropdown trigger */}
                  <div 
                    onClick={() => setPaymentDropdownOpen(!paymentDropdownOpen)} 
                    style={{ 
                      ...inputStyle, 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      color: 'rgba(255,255,255,0.5)', 
                      fontSize: '0.8rem',
                      height: '44px',
                      background: 'rgba(0,0,0,0.5)',
                      border: paymentDropdownOpen ? '1px solid #14B8A6' : '1px solid rgba(20,184,166,0.3)'
                    }}
                  >
                    <span>+ Add payment methods...</span>
                    <IoChevronDown size={14} style={{ transform: paymentDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>

                  {/* Dropdown panel */}
                  {paymentDropdownOpen && (
                    <div style={{ 
                      position: 'absolute', 
                      left: '20px', 
                      right: '20px', 
                      marginTop: '4px', 
                      background: 'rgba(14,18,38,0.99)', 
                      border: '1px solid rgba(20,184,166,0.4)', 
                      borderRadius: '10px', 
                      maxHeight: '280px', 
                      overflowY: 'auto', 
                      zIndex: 500, 
                      boxShadow: '0 12px 40px rgba(0,0,0,0.5)' 
                    }}>
                      {/* Search */}
                      <div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: 'rgba(14,18,38,0.99)', zIndex: 1 }}>
                        <div style={{ position: 'relative' }}>
                          <IoSearch size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                          <input 
                            type="text" 
                            value={paymentSearch} 
                            onChange={(e) => setPaymentSearch(e.target.value)} 
                            placeholder="Search..." 
                            autoFocus 
                            style={{ ...inputStyle, padding: '8px 10px 8px 32px', fontSize: '0.8rem', height: '38px' }} 
                          />
                        </div>
                      </div>
                      {/* Groups */}
                      {Object.entries(PAYMENT_METHODS_CONFIG).map(([group, methods]) => {
                        const filtered = filterMethods(methods);
                        if (!filtered.length) return null;
                        return (
                          <div key={group}>
                            <div style={{ padding: '8px 14px 4px', fontSize: '0.6rem', fontWeight: '700', color: ACCENT.teal, textTransform: 'uppercase', letterSpacing: '0.04em', background: 'rgba(0,0,0,0.2)' }}>
                              {REGION_LABELS[group]}
                            </div>
                            {filtered.map(m => {
                              const selected = formData.payment_methods.includes(m.id);
                              return (
                                <div 
                                  key={m.id} 
                                  onClick={() => togglePayment(m.id)} 
                                  style={{ 
                                    padding: '10px 14px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '10px', 
                                    cursor: 'pointer', 
                                    background: selected ? 'rgba(20,184,166,0.12)' : 'transparent', 
                                    borderLeft: selected ? '3px solid #14B8A6' : '3px solid transparent', 
                                    fontSize: '0.8rem',
                                    transition: 'background 0.15s'
                                  }}
                                >
                                  <span style={{ fontSize: '1rem' }}>{m.icon}</span>
                                  <span style={{ color: selected ? '#14B8A6' : 'rgba(255,255,255,0.85)', fontWeight: selected ? '600' : '400' }}>{m.label}</span>
                                  {selected && <IoCheckmarkCircle size={14} color="#14B8A6" style={{ marginLeft: 'auto' }} />}
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

      {/* STICKY FOOTER - Compact */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 24px',
        background: 'linear-gradient(180deg, rgba(18, 24, 48, 0.98) 0%, rgba(12, 16, 36, 1) 100%)',
        borderTop: '1px solid rgba(59, 130, 246, 0.15)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100
      }}>
        <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.8rem' }}>
          {isValid() ? (
            <span style={{ color: '#22C55E', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IoCheckmarkCircle size={16} /> Ready to publish your ad
            </span>
          ) : (
            <span>Complete all required fields to publish</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button" 
            onClick={() => navigate('/p2p/merchant')} 
            style={{
              padding: '10px 22px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: 'rgba(255, 255, 255, 0.65)',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={creating || !isValid()} 
            onClick={handleSubmit} 
            style={{
              padding: '10px 28px',
              background: (creating || !isValid()) 
                ? 'rgba(40, 45, 60, 0.6)' 
                : 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
              border: 'none',
              borderRadius: '8px',
              color: (creating || !isValid()) ? 'rgba(255, 255, 255, 0.25)' : '#fff',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: (creating || !isValid()) ? 'not-allowed' : 'pointer',
              boxShadow: (creating || !isValid()) ? 'none' : '0 4px 16px rgba(34, 197, 94, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {creating && <div style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
            Publish ad
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, textarea:focus { border-color: rgba(59,130,246,0.5) !important; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        @media (max-width: 1024px) { form > div { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}
