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
  grey: '#6B7280' 
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

  // Card with premium gradient
  const cardStyle = (accent) => ({
    background: `linear-gradient(145deg, rgba(30, 40, 70, 0.95) 0%, rgba(18, 24, 48, 0.98) 50%, rgba(12, 16, 36, 1) 100%)`,
    border: `1px solid ${accent}40`,
    borderTop: `3px solid ${accent}`,
    borderRadius: '14px',
    padding: '20px 24px',
    boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 60px ${accent}08, inset 0 1px 0 rgba(255,255,255,0.05)`,
  });

  // Section title with icon
  const titleStyle = {
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: '700',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  };

  // Label
  const labelStyle = { 
    color: 'rgba(255,255,255,0.5)', 
    fontSize: '0.65rem', 
    fontWeight: '600', 
    textTransform: 'uppercase', 
    letterSpacing: '0.06em', 
    marginBottom: '8px', 
    display: 'block' 
  };

  // Input
  const inputStyle = { 
    width: '100%', 
    padding: '14px 16px', 
    background: 'rgba(0,0,0,0.4)', 
    border: '1px solid rgba(255,255,255,0.1)', 
    borderRadius: '10px', 
    color: '#fff', 
    fontSize: '0.9375rem', 
    fontWeight: '600', 
    outline: 'none', 
    boxSizing: 'border-box', 
    transition: 'all 0.2s' 
  };

  // Toggle button (BUY/SELL)
  const toggleStyle = (active, color) => ({
    flex: 1,
    height: '52px',
    background: active 
      ? `linear-gradient(135deg, ${color}30 0%, ${color}15 100%)` 
      : 'rgba(0,0,0,0.4)',
    border: active 
      ? `2px solid ${color}` 
      : '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    color: active ? '#fff' : 'rgba(255,255,255,0.4)',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: active 
      ? `0 0 24px ${color}40, 0 4px 16px ${color}20, inset 0 1px 0 rgba(255,255,255,0.15)` 
      : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.25s ease'
  });

  // Dropdown panel
  const dropdownStyle = { 
    position: 'absolute', 
    top: '100%', 
    left: 0, 
    right: 0, 
    marginTop: '6px', 
    background: 'rgba(12,16,36,0.99)', 
    border: '1px solid rgba(59,130,246,0.35)', 
    borderRadius: '12px', 
    maxHeight: '260px', 
    overflowY: 'auto', 
    zIndex: 500, 
    boxShadow: '0 16px 48px rgba(0,0,0,0.5)' 
  };

  const dropdownItem = (active) => ({ 
    padding: '12px 16px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px', 
    cursor: 'pointer', 
    background: active ? 'rgba(59,130,246,0.15)' : 'transparent', 
    borderLeft: active ? '3px solid #3B82F6' : '3px solid transparent', 
    fontSize: '0.875rem',
    transition: 'background 0.15s'
  });

  return (
    <>
      {showSuccess && (
        <div style={{ position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #22C55E, #16A34A)', borderRadius: '12px', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 9999, boxShadow: '0 8px 32px rgba(34,197,94,0.4)' }}>
          <IoCheckmarkCircle size={22} color="#fff" />
          <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.9rem' }}>Ad created successfully!</span>
        </div>
      )}

      {/* MAIN CONTAINER - Full width */}
      <div style={{ 
        width: '100%',
        minHeight: 'calc(100vh - 64px)',
        background: 'linear-gradient(180deg, rgba(10,14,30,1) 0%, rgba(14,20,42,1) 40%, rgba(10,14,30,1) 100%)',
        paddingBottom: '100px'
      }}>
        
        {/* PAGE HEADER */}
        <div style={{ 
          background: 'linear-gradient(180deg, rgba(30, 42, 80, 0.5) 0%, transparent 100%)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
          padding: '20px 32px'
        }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
              <button 
                onClick={() => navigate('/p2p/merchant')} 
                style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '8px', 
                  padding: '8px 12px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.8rem'
                }}
              >
                <IoArrowBack size={14} /> Back
              </button>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff', margin: 0 }}>Create new P2P ad</h1>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: 0, marginLeft: '90px' }}>Set your trading terms and start receiving orders</p>
          </div>
        </div>

        {/* FORM CONTENT - Full width with max constraint */}
        <div style={{ 
          width: '100%',
          maxWidth: '1600px', 
          margin: '0 auto',
          padding: '24px 32px'
        }}>
          <form onSubmit={handleSubmit}>
            {/* TWO COLUMN GRID */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '24px',
              alignItems: 'start'
            }}>
              
              {/* ========== LEFT COLUMN ========== */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 1. AD TYPE */}
                <div style={cardStyle(ACCENT.green)}>
                  <div style={titleStyle}>
                    <IoSwapHorizontal size={18} color={ACCENT.green} />
                    Ad type
                    <span style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontSize: '0.55rem', fontWeight: '700', padding: '3px 8px', borderRadius: '4px' }}>REQUIRED</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => setAdType('sell')} style={toggleStyle(adType === 'sell', ACCENT.red)}>
                      {adType === 'sell' && <IoCheckmarkCircle size={16} />} I want to SELL
                    </button>
                    <button type="button" onClick={() => setAdType('buy')} style={toggleStyle(adType === 'buy', ACCENT.green)}>
                      {adType === 'buy' && <IoCheckmarkCircle size={16} />} I want to BUY
                    </button>
                  </div>
                </div>

                {/* 2. TRADING PAIR */}
                <div style={cardStyle(ACCENT.blue)}>
                  <div style={titleStyle}>
                    <IoSwapHorizontal size={18} color={ACCENT.blue} />
                    Trading pair
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Crypto */}
                    <div className="crypto-dropdown">
                      <label style={labelStyle}>Crypto asset</label>
                      <div style={{ position: 'relative' }}>
                        <div 
                          onClick={() => { setCryptoDropdownOpen(!cryptoDropdownOpen); setFiatDropdownOpen(false); }}
                          style={{ 
                            ...inputStyle, 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            height: '52px',
                            border: cryptoDropdownOpen ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.1)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Coin3DIcon symbol={formData.crypto_currency} size={24} />
                            <span>{formData.crypto_currency}</span>
                          </div>
                          <IoChevronDown size={16} style={{ color: 'rgba(255,255,255,0.4)', transform: cryptoDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </div>
                        {cryptoDropdownOpen && (
                          <div style={dropdownStyle}>
                            {cryptos.map(c => (
                              <div key={c} onClick={() => { handleChange('crypto_currency', c); setCryptoDropdownOpen(false); }} style={dropdownItem(formData.crypto_currency === c)}>
                                <Coin3DIcon symbol={c} size={22} />
                                <span style={{ fontWeight: '600', color: formData.crypto_currency === c ? '#fff' : 'rgba(255,255,255,0.85)' }}>{c}</span>
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginLeft: 'auto' }}>{CRYPTO_CONFIG[c]?.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Fiat */}
                    <div className="fiat-dropdown">
                      <label style={labelStyle}>Fiat currency</label>
                      <div style={{ position: 'relative' }}>
                        <div 
                          onClick={() => { setFiatDropdownOpen(!fiatDropdownOpen); setCryptoDropdownOpen(false); }}
                          style={{ 
                            ...inputStyle, 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            height: '52px',
                            border: fiatDropdownOpen ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.1)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.4rem' }}>{FIAT_CONFIG[formData.fiat_currency]?.flag}</span>
                            <span>{formData.fiat_currency}</span>
                          </div>
                          <IoChevronDown size={16} style={{ color: 'rgba(255,255,255,0.4)', transform: fiatDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </div>
                        {fiatDropdownOpen && (
                          <div style={dropdownStyle}>
                            {fiats.map(f => (
                              <div key={f} onClick={() => { handleChange('fiat_currency', f); setFiatDropdownOpen(false); }} style={dropdownItem(formData.fiat_currency === f)}>
                                <span style={{ fontSize: '1.4rem' }}>{FIAT_CONFIG[f]?.flag}</span>
                                <span style={{ fontWeight: '600', color: formData.fiat_currency === f ? '#fff' : 'rgba(255,255,255,0.85)' }}>{f}</span>
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginLeft: 'auto' }}>{FIAT_CONFIG[f]?.name}</span>
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
                  <div style={titleStyle}>
                    <IoWallet size={18} color={ACCENT.purple} />
                    Trade limits
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>Minimum amount</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="number" 
                          step="0.00000001" 
                          value={formData.min_amount} 
                          onChange={(e) => handleChange('min_amount', e.target.value)} 
                          placeholder="0.001" 
                          style={{ ...inputStyle, paddingRight: '55px' }} 
                        />
                        <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontWeight: '600' }}>{formData.crypto_currency}</span>
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Maximum amount</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="number" 
                          step="0.00000001" 
                          value={formData.max_amount} 
                          onChange={(e) => handleChange('max_amount', e.target.value)} 
                          placeholder="10" 
                          style={{ ...inputStyle, paddingRight: '55px' }} 
                        />
                        <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontWeight: '600' }}>{formData.crypto_currency}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. ADVANCED OPTIONS */}
                <div style={cardStyle(ACCENT.grey)}>
                  <div style={titleStyle}>
                    <IoSettings size={18} color={ACCENT.grey} />
                    Advanced options
                    <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: '500' }}>OPTIONAL</span>
                  </div>
                  <label style={labelStyle}>Terms & instructions</label>
                  <textarea 
                    value={formData.terms} 
                    onChange={(e) => handleChange('terms', e.target.value)} 
                    placeholder="Add special terms, payment instructions, or requirements for traders..." 
                    rows={4} 
                    style={{ ...inputStyle, resize: 'none', minHeight: '100px', fontSize: '0.85rem' }} 
                  />
                  <p style={{ marginTop: '10px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>These will be shown to traders before they initiate an order</p>
                </div>
              </div>

              {/* ========== RIGHT COLUMN ========== */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 5. PRICING MODE */}
                <div style={cardStyle(ACCENT.teal)}>
                  <div style={titleStyle}>
                    <IoPricetag size={18} color={ACCENT.teal} />
                    Pricing mode
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => handleChange('price_type', 'fixed')} style={toggleStyle(formData.price_type === 'fixed', ACCENT.teal)}>
                      {formData.price_type === 'fixed' && <IoCheckmarkCircle size={16} />} Fixed price
                    </button>
                    <button type="button" onClick={() => handleChange('price_type', 'floating')} style={toggleStyle(formData.price_type === 'floating', ACCENT.teal)}>
                      {formData.price_type === 'floating' && <IoCheckmarkCircle size={16} />} Floating %
                    </button>
                  </div>
                  <p style={{ marginTop: '12px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>
                    {formData.price_type === 'fixed' ? 'Set a specific price per coin' : 'Price adjusts with market rate'}
                  </p>
                </div>

                {/* 6. PRICE */}
                <div style={cardStyle(ACCENT.teal)}>
                  <div style={titleStyle}>
                    <IoPricetag size={18} color={ACCENT.teal} />
                    Your price
                    <span style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontSize: '0.55rem', fontWeight: '700', padding: '3px 8px', borderRadius: '4px' }}>REQUIRED</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="number" 
                      value={formData.price_value} 
                      onChange={(e) => handleChange('price_value', e.target.value)}
                      placeholder={formData.price_type === 'fixed' ? '45,500' : '+2.5'}
                      style={{ ...inputStyle, fontSize: '1.25rem', fontWeight: '700', height: '60px', paddingRight: '70px' }} 
                    />
                    <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', fontWeight: '600' }}>
                      {formData.price_type === 'fixed' ? formData.fiat_currency : '%'}
                    </span>
                  </div>
                  <p style={{ marginTop: '10px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>
                    {formData.price_type === 'fixed' ? `Price per 1 ${formData.crypto_currency} in ${formData.fiat_currency}` : 'Percentage above/below market price'}
                  </p>
                </div>

                {/* 7. PAYMENT METHODS */}
                <div style={{ ...cardStyle(ACCENT.amber), position: 'relative' }} ref={paymentRef}>
                  <div style={titleStyle}>
                    <IoCard size={18} color={ACCENT.amber} />
                    Payment methods
                    <span style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontSize: '0.55rem', fontWeight: '700', padding: '3px 8px', borderRadius: '4px' }}>REQUIRED</span>
                  </div>
                  
                  {/* Selected chips */}
                  <div style={{ 
                    minHeight: '48px', 
                    marginBottom: '12px', 
                    padding: '10px 12px', 
                    background: 'rgba(0,0,0,0.35)', 
                    borderRadius: '10px', 
                    border: '1px solid rgba(255,255,255,0.06)' 
                  }}>
                    {formData.payment_methods.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {formData.payment_methods.map(id => {
                          const m = getMethod(id);
                          return m ? (
                            <div key={id} style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              background: 'linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(245,158,11,0.15) 100%)', 
                              border: '1px solid rgba(245,158,11,0.5)', 
                              borderRadius: '20px', 
                              padding: '6px 12px', 
                              fontSize: '0.8rem', 
                              color: '#F59E0B',
                              fontWeight: '500'
                            }}>
                              <span>{m.icon}</span>
                              <span>{m.label}</span>
                              <IoClose size={14} style={{ cursor: 'pointer', opacity: 0.8, marginLeft: '2px' }} onClick={() => removePayment(id)} />
                            </div>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}>No payment methods selected yet</span>
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
                      color: 'rgba(255,255,255,0.4)', 
                      fontSize: '0.85rem',
                      border: paymentDropdownOpen ? '1px solid #F59E0B' : '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <span>+ Add payment methods...</span>
                    <IoChevronDown size={16} style={{ transform: paymentDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>

                  {/* Dropdown panel */}
                  {paymentDropdownOpen && (
                    <div style={{ 
                      position: 'absolute', 
                      left: '24px', 
                      right: '24px', 
                      marginTop: '6px', 
                      background: 'rgba(12,16,36,0.99)', 
                      border: '1px solid rgba(245,158,11,0.35)', 
                      borderRadius: '12px', 
                      maxHeight: '320px', 
                      overflowY: 'auto', 
                      zIndex: 500, 
                      boxShadow: '0 16px 48px rgba(0,0,0,0.5)' 
                    }}>
                      {/* Search */}
                      <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: 'rgba(12,16,36,0.99)', zIndex: 1 }}>
                        <div style={{ position: 'relative' }}>
                          <IoSearch size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                          <input 
                            type="text" 
                            value={paymentSearch} 
                            onChange={(e) => setPaymentSearch(e.target.value)} 
                            placeholder="Search payment methods..." 
                            autoFocus 
                            style={{ ...inputStyle, padding: '10px 12px 10px 36px', fontSize: '0.85rem' }} 
                          />
                        </div>
                      </div>
                      {/* Groups */}
                      {Object.entries(PAYMENT_METHODS_CONFIG).map(([group, methods]) => {
                        const filtered = filterMethods(methods);
                        if (!filtered.length) return null;
                        return (
                          <div key={group}>
                            <div style={{ 
                              padding: '10px 16px 6px', 
                              fontSize: '0.65rem', 
                              fontWeight: '700', 
                              color: ACCENT.amber, 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.05em',
                              background: 'rgba(0,0,0,0.25)' 
                            }}>
                              {REGION_LABELS[group]}
                            </div>
                            {filtered.map(m => {
                              const selected = formData.payment_methods.includes(m.id);
                              return (
                                <div 
                                  key={m.id} 
                                  onClick={() => togglePayment(m.id)} 
                                  style={{ 
                                    padding: '12px 16px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '12px', 
                                    cursor: 'pointer', 
                                    background: selected ? 'rgba(245,158,11,0.12)' : 'transparent', 
                                    borderLeft: selected ? '3px solid #F59E0B' : '3px solid transparent', 
                                    fontSize: '0.85rem',
                                    transition: 'background 0.15s'
                                  }}
                                >
                                  <span style={{ fontSize: '1.1rem' }}>{m.icon}</span>
                                  <span style={{ color: selected ? '#F59E0B' : 'rgba(255,255,255,0.85)', fontWeight: selected ? '600' : '400' }}>{m.label}</span>
                                  {selected && <IoCheckmarkCircle size={16} color="#F59E0B" style={{ marginLeft: 'auto' }} />}
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
        left: 0,
        right: 0,
        padding: '16px 32px',
        background: 'linear-gradient(180deg, rgba(20, 28, 55, 0.98) 0%, rgba(12, 16, 36, 1) 100%)',
        borderTop: '1px solid rgba(59, 130, 246, 0.2)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100
      }}>
        <div style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.85rem' }}>
          {isValid() ? (
            <span style={{ color: '#22C55E', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IoCheckmarkCircle size={18} /> Ready to publish your ad
            </span>
          ) : (
            <span>Complete all required fields to publish</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '14px' }}>
          <button 
            type="button" 
            onClick={() => navigate('/p2p/merchant')} 
            style={{
              padding: '12px 28px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255,0.15)',
              borderRadius: '10px',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={creating || !isValid()} 
            onClick={handleSubmit} 
            style={{
              padding: '12px 36px',
              background: (creating || !isValid()) 
                ? 'rgba(40, 45, 60, 0.6)' 
                : 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
              border: 'none',
              borderRadius: '10px',
              color: (creating || !isValid()) ? 'rgba(255, 255, 255, 0.25)' : '#fff',
              fontSize: '0.875rem',
              fontWeight: '700',
              cursor: (creating || !isValid()) ? 'not-allowed' : 'pointer',
              boxShadow: (creating || !isValid()) 
                ? 'none' 
                : '0 6px 20px rgba(34, 197, 94, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            {creating && <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
            Publish ad
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, textarea:focus { border-color: rgba(59,130,246,0.5) !important; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25); }
        @media (max-width: 1024px) { 
          form > div { grid-template-columns: 1fr !important; } 
        }
      `}</style>
    </>
  );
}
