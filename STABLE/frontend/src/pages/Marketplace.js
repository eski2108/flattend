import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Filter, IoSearch, IoShield, IoStar, IoTrendingDown, IoTrendingUp, Search, Star } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

// Payment method icons mapping
const PAYMENT_ICONS = {
  // UK & Europe
  'faster_payments': '🏦',
  'sepa': '🇪🇺',
  'sepa_instant': '⚡',
  
  // Global
  'swift': '🌍',
  'wire_transfer': '💳',
  
  // US
  'ach': '🇺🇸',
  'zelle': '⚡',
  'venmo': '💙',
  'cash_app': '💵',
  
  // Canada
  'interac': '🇨🇦',
  
  // Digital Wallets
  'wise': '💸',
  'revolut': '🔄',
  'paypal': '💰',
  'skrill': '💳',
  'neteller': '💼',
  'payoneer': '🌐',
  
  // Latin America
  'pix': '🇧🇷',
  'mercado_pago': '💙',
  'nequi': '🇨🇴',
  
  // Asia
  'upi': '🇮🇳',
  'paytm': '💳',
  'imps': '⚡',
  'alipay': '🇨🇳',
  'wechat_pay': '💚',
  'gcash': '🇵🇭',
  'paymaya': '💳',
  'grabpay': '🚗',
  
  // Africa
  'm_pesa': '🇰🇪',
  'airtel_money': '📱',
  'mtn_mobile_money': '💛',
  'chipper_cash': '🐿️',
  
  // Australia
  'osko': '🇦🇺',
  
  // Middle East
  'sadad': '🇸🇦',
  
  // Cash & Others
  'cash_in_person': '💵',
  'gift_cards': '🎁',
  'western_union': '🌎',
  'moneygram': '💸',
  
  // Legacy
  'bank_transfer': '🏦',
  'local_bank_transfer': '🏦'
};

export default function Marketplace() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('buy'); // 'buy' or 'sell'
  const [offers, setOffers] = useState([]);
  const [filteredOffers, setFilteredOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOfferPayments, setSelectedOfferPayments] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);
  
  // Filter states
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [selectedFiat, setSelectedFiat] = useState('USD');
  const [selectedPayment, setSelectedPayment] = useState('all');
  const [sortBy, setSortBy] = useState('price_asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [cryptos, setCryptos] = useState(['BTC', 'ETH', 'USDT']); // Default, will be loaded from backend
  const [fiats, setFiats] = useState(['USD', 'GBP', 'EUR']);
  const [paymentMethods, setPaymentMethods] = useState([
    { value: 'all', label: 'All Payment Methods' }
  ]);

  // Load platform config (currencies and payment methods)
  useEffect(() => {
    loadPlatformConfig();
  }, []);

  const loadPlatformConfig = async () => {
    try {
      const response = await axios.get(`${API}/api/p2p/config`);
      if (response.data.success) {
        // Load cryptocurrencies
        if (response.data.cryptocurrencies) {
          const cryptoList = Object.keys(response.data.cryptocurrencies);
          setCryptos(cryptoList);
        }
        
        // Load fiat currencies
        if (response.data.fiat_currencies) {
          const fiatList = Object.keys(response.data.fiat_currencies);
          setFiats(fiatList);
        }

        // Load payment methods
        if (response.data.payment_methods) {
          const methods = Object.values(response.data.payment_methods).map(pm => ({
            value: pm.id,
            label: pm.name,
            icon: pm.icon
          }));
          setPaymentMethods([{ value: 'all', label: 'All Payment Methods' }, ...methods]);
        }
      }
    } catch (error) {
      console.error('Failed to load platform config:', error);
    }
  };

  useEffect(() => {
    loadOffers();
  }, [selectedCrypto, selectedFiat]);

  useEffect(() => {
    applyFilters();
  }, [offers, selectedPayment, sortBy, searchTerm]);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        crypto_currency: selectedCrypto,
        fiat_currency: selectedFiat
      });
      
      const response = await axios.get(`${API}/api/p2p/offers?${params}`);
      setOffers(response.data.offers || []);
    } catch (error) {
      console.error('Failed to load offers:', error);
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...offers];

    // Filter by payment method
    if (selectedPayment !== 'all') {
      filtered = filtered.filter(offer => 
        offer.payment_methods && offer.payment_methods.includes(selectedPayment)
      );
    }

    // Search by seller name
    if (searchTerm) {
      filtered = filtered.filter(offer =>
        offer.seller_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    switch (sortBy) {
      case 'price_asc':
        filtered.sort((a, b) => a.price_per_unit - b.price_per_unit);
        break;
      case 'price_desc':
        filtered.sort((a, b) => b.price_per_unit - a.price_per_unit);
        break;
      case 'rating':
        filtered.sort((a, b) => (b.completion_rate || 0) - (a.completion_rate || 0));
        break;
      default:
        break;
    }

    setFilteredOffers(filtered);
  };

  const maskSellerName = (name) => {
    if (!name) return 'User***';
    if (name.length <= 3) return name;
    return name.substring(0, 2) + '***' + name.substring(name.length - 1);
  };

  const renderOfferCard = (offer) => {
    const sellerRating = offer.completion_rate || 100;
    const totalTrades = offer.total_trades || 0;

    return (
      <div
        key={offer.order_id}
        style={{
          background: 'linear-gradient(135deg, rgba(26, 31, 58, 0.8), rgba(19, 24, 41, 0.6))',
          border: '2px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1rem',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 0 20px rgba(0, 240, 255, 0.1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)';
          e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 240, 255, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.2)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.1)';
        }}
        onClick={() => navigate('/preview-order', { state: { offer } })}
      >
        {/* Header: Seller Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: '900',
              color: '#000'
            }}>
              {maskSellerName(offer.seller_name).substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>
                  {maskSellerName(offer.seller_name)}
                </span>
                {offer.is_verified && (
                  <IoShield size={16} color="#22C55E" />
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IoStar size={14} color="#F59E0B" fill="#F59E0B" />
                  <span style={{ color: '#F59E0B', fontSize: '13px', fontWeight: '600' }}>
                    {sellerRating}%
                  </span>
                </div>
                <span style={{ color: '#888', fontSize: '13px' }}>
                  {totalTrades} trades
                </span>
              </div>
            </div>
          </div>
          
          {/* Verified Badge */}
          {offer.is_verified && (
            <div style={{
              background: 'rgba(34, 197, 94, 0.2)',
              border: '1px solid rgba(34, 197, 94, 0.5)',
              borderRadius: '8px',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#22C55E'
            }}>
              VERIFIED
            </div>
          )}
        </div>

        {/* Price & Amount */}
        <div style={{ marginBottom: '1rem' }}>
          {/* Price Section */}
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
              Price per {selectedCrypto}
            </span>
            <span style={{ color: '#00F0FF', fontSize: '28px', fontWeight: '900', display: 'block' }}>
              {offer.fiat_currency === 'USD' ? '$' : ''}
              {offer.price_per_unit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Available Section - Left Aligned */}
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
              Available
            </span>
            <span style={{ color: '#fff', fontSize: '16px', fontWeight: '700', display: 'block', wordBreak: 'break-word' }}>
              {(offer.crypto_amount - (offer.locked_amount || 0)).toFixed(8)} {selectedCrypto}
            </span>
          </div>
        </div>

        {/* Limits */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '0.75rem',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Limit
            </span>
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>
              {offer.fiat_currency === 'USD' ? '$' : ''}
              {(offer.min_purchase * offer.price_per_unit).toLocaleString()} - {offer.fiat_currency === 'USD' ? '$' : ''}
              {(offer.max_purchase * offer.price_per_unit).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Payment Methods */}
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
            Payment Methods
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {offer.payment_methods && offer.payment_methods.slice(0, 3).map((method, idx) => (
              <div
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedOfferPayments(offer.payment_methods);
                  setShowPaymentModal(true);
                }}
                style={{
                  background: 'rgba(0, 240, 255, 0.1)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#00F0FF',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 240, 255, 0.2)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <span>{PAYMENT_ICONS[method] || '💳'}</span>
                <span>{method.replace(/_/g, ' ').toUpperCase()}</span>
              </div>
            ))}
            {offer.payment_methods && offer.payment_methods.length > 3 && (
              <div style={{
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#A855F7'
              }}>
                +{offer.payment_methods.length - 3} more
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          style={{
            width: '100%',
            padding: '14px',
            background: activeTab === 'buy' 
              ? 'linear-gradient(135deg, #22C55E, #16A34A)' 
              : 'linear-gradient(135deg, #EF4444, #DC2626)',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '900',
            color: '#fff',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: activeTab === 'buy' 
              ? '0 0 20px rgba(34, 197, 94, 0.4)' 
              : '0 0 20px rgba(239, 68, 68, 0.4)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.boxShadow = activeTab === 'buy'
              ? '0 0 30px rgba(34, 197, 94, 0.6)'
              : '0 0 30px rgba(239, 68, 68, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = activeTab === 'buy'
              ? '0 0 20px rgba(34, 197, 94, 0.4)'
              : '0 0 20px rgba(239, 68, 68, 0.4)';
          }}
        >
          {activeTab === 'buy' ? 'BUY' : 'SELL'} {selectedCrypto}
        </button>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '0.5rem'
          }}>
            P2P Marketplace
          </h1>
          <p style={{ color: '#b0b0b0', fontSize: '16px', fontWeight: '500' }}>
            Trade directly with verified users. Every transaction protected by smart escrow.
          </p>
        </div>

        {/* Buy/Sell Tabs */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          background: 'rgba(26, 31, 58, 0.5)',
          padding: '8px',
          borderRadius: '16px',
          border: '1px solid rgba(0, 240, 255, 0.2)'
        }}>
          <button
            onClick={() => setActiveTab('buy')}
            style={{
              flex: 1,
              padding: '14px',
              background: activeTab === 'buy' 
                ? 'linear-gradient(135deg, #22C55E, #16A34A)' 
                : 'transparent',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '900',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === 'buy' ? '0 0 20px rgba(34, 197, 94, 0.4)' : 'none'
            }}
          >
            <IoTrendingUp size={20} style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
            BUY CRYPTO
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            style={{
              flex: 1,
              padding: '14px',
              background: activeTab === 'sell' 
                ? 'linear-gradient(135deg, #EF4444, #DC2626)' 
                : 'transparent',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '900',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === 'sell' ? '0 0 20px rgba(239, 68, 68, 0.4)' : 'none'
            }}
          >
            <IoTrendingDown size={20} style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
            SELL CRYPTO
          </button>
        </div>

        {/* Post Ad Button */}
        {currentUser && (
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => navigate('/p2p/merchant')}
              style={{
                padding: '1rem 2rem',
                background: 'linear-gradient(135deg, #F59E0B, #EAB308)',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '900',
                color: '#000',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)',
                transition: 'all 0.3s',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(245, 158, 11, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.4)';
              }}
            >
              + Create Sell Order
            </button>
          </div>
        )}

        {/* Filters Bar */}
        <div style={{
          background: 'rgba(26, 31, 58, 0.8)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            {/* Crypto Filter */}
            <div>
              <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                Cryptocurrency
              </label>
              <select
                value={selectedCrypto}
                onChange={(e) => setSelectedCrypto(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {cryptos.map(crypto => (
                  <option key={crypto} value={crypto}>{crypto}</option>
                ))}
              </select>
            </div>

            {/* Fiat Filter */}
            <div>
              <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                Fiat Currency
              </label>
              <select
                value={selectedFiat}
                onChange={(e) => setSelectedFiat(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {fiats.map(fiat => (
                  <option key={fiat} value={fiat}>{fiat}</option>
                ))}
              </select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                Payment Method
              </label>
              <select
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {paymentMethods.map(method => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div>
              <label style={{ color: '#888', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Highest Rating</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <IoSearch size={20} color="#888" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by seller name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 44px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* Results Count */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          padding: '0 4px'
        }}>
          <span style={{ color: '#888', fontSize: '14px' }}>
            Showing {filteredOffers.length} {filteredOffers.length === 1 ? 'offer' : 'offers'}
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <IoShield size={16} color="#22C55E" />
            <span style={{ color: '#22C55E', fontSize: '13px', fontWeight: '600' }}>
              Protected by Escrow
            </span>
          </div>
        </div>

        {/* Offers List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div className="spinner" style={{
              border: '4px solid rgba(0, 240, 255, 0.1)',
              borderTop: '4px solid #00F0FF',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <p style={{ color: '#888' }}>Loading offers...</p>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem',
            background: 'rgba(26, 31, 58, 0.5)',
            border: '2px dashed rgba(0, 240, 255, 0.2)',
            borderRadius: '16px'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '1rem' }}>🔍</div>
            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '0.5rem' }}>
              No offers found
            </h3>
            <p style={{ color: '#888', fontSize: '14px' }}>
              Try adjusting your filters or check back later
            </p>
          </div>
        ) : (
          <div>
            {filteredOffers.map(renderOfferCard)}
          </div>
        )}

        {/* Create Offer Button */}
        <button
          onClick={() => navigate('/create-offer')}
          style={{
            position: 'fixed',
            right: '2rem',
            bottom: '2rem',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #A855F7, #7E3DFF)',
            border: 'none',
            color: '#fff',
            fontSize: '28px',
            cursor: 'pointer',
            boxShadow: '0 0 30px rgba(168, 85, 247, 0.5)',
            transition: 'all 0.3s ease',
            zIndex: 1000
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
            e.currentTarget.style.boxShadow = '0 0 40px rgba(168, 85, 247, 0.7)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(168, 85, 247, 0.5)';
          }}
        >
          +
        </button>

        {/* Payment Methods Modal */}
        {showPaymentModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem'
            }}
            onClick={() => setShowPaymentModal(false)}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
                border: '2px solid rgba(0, 240, 255, 0.5)',
                borderRadius: '20px',
                padding: '2rem',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 0 50px rgba(0, 240, 255, 0.3)',
                maxHeight: '80vh',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{
                color: '#00F0FF',
                fontSize: '24px',
                fontWeight: '900',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                Available Payment Methods
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {selectedOfferPayments && selectedOfferPayments.map((method, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(168, 85, 247, 0.15))',
                      border: '2px solid rgba(0, 240, 255, 0.4)',
                      borderRadius: '12px',
                      padding: '1rem 1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      cursor: 'default',
                      boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)'
                    }}
                  >
                    <span style={{ fontSize: '32px' }}>{PAYMENT_ICONS[method] || '💳'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        color: '#00F0FF',
                        fontSize: '18px',
                        fontWeight: '700',
                        marginBottom: '4px'
                      }}>
                        {method.replace(/_/g, ' ').toUpperCase()}
                      </div>
                      <div style={{
                        color: '#888',
                        fontSize: '13px'
                      }}>
                        Accepted by this seller
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(34, 197, 94, 0.2)',
                      border: '1px solid #22C55E',
                      borderRadius: '6px',
                      padding: '4px 12px',
                      color: '#22C55E',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>
                      ✓ AVAILABLE
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowPaymentModal(false)}
                style={{
                  width: '100%',
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#000',
                  fontSize: '16px',
                  fontWeight: '900',
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 240, 255, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.4)';
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
