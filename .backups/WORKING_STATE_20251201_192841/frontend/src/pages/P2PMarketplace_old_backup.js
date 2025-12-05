import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '@/components/Layout';
import { IoChevronDown, IoFilter, IoFlash, IoSearch as Search, IoShield, IoStar, IoTime as Clock, IoTrendingUp as TrendingUp } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL || 'https://cryptovault-29.preview.emergentagent.com';

function P2PMarketplace() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('buy');
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableCoins, setAvailableCoins] = useState(['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'LTC', 'XRP', 'ADA']);
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);
  const [selectedFiatCurrency, setSelectedFiatCurrency] = useState('');
  
  const [sortBy, setSortBy] = useState('best_price');
  const [filters, setFilters] = useState({
    paymentMethod: '',
    minPrice: '',
    maxPrice: '',
    minAmount: '',
    maxAmount: '',
    minRating: '',
    minCompletionRate: '',
    verifiedOnly: false,
    fastPaymentOnly: false,
    newSellerOnly: false,
    country: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const sortOptions = [
    { value: 'best_price', label: 'Best Price' },
    { value: 'highest_rating', label: 'Highest Rating' },
    { value: 'fast_payment', label: 'Fastest Payment' },
    { value: 'most_trades', label: 'Most Trades' },
    { value: 'highest_completion', label: 'Highest Completion Rate' }
  ];

  useEffect(() => {
    fetchMarketplaceFilters();
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [selectedCrypto, sortBy, activeTab, selectedFiatCurrency]);

  const fetchMarketplaceFilters = async () => {
    try {
      const response = await axios.get(`${API}/api/p2p/marketplace/filters`);
      if (response.data.success) {
        setAvailableCurrencies(response.data.currencies || []);
        setAvailablePaymentMethods(response.data.payment_methods || []);
      }
    } catch (error) {
      console.error('Error fetching marketplace filters:', error);
    }
  };

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        crypto_currency: selectedCrypto,
        sort_by: sortBy,
        ...(selectedFiatCurrency && { fiat_currency: selectedFiatCurrency }),
        ...(filters.paymentMethod && { payment_method: filters.paymentMethod }),
        ...(filters.minPrice && { min_price: filters.minPrice }),
        ...(filters.maxPrice && { max_price: filters.maxPrice }),
        ...(filters.minAmount && { min_amount: filters.minAmount }),
        ...(filters.maxAmount && { max_amount: filters.maxAmount }),
        ...(filters.minRating && { min_rating: filters.minRating }),
        ...(filters.minCompletionRate && { min_completion_rate: filters.minCompletionRate }),
        ...(filters.verifiedOnly && { verified_only: true }),
        ...(filters.fastPaymentOnly && { fast_payment_only: true }),
        ...(filters.newSellerOnly && { new_seller_only: true }),
        ...(filters.country && { country: filters.country })
      });

      const response = await axios.get(`${API}/api/p2p/offers?${params}`);
      if (response.data.success) {
        setOffers(response.data.offers || []);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyOffer = (offer) => {
    navigate(`/p2p/trade/${offer.offer_id}`);
  };

  return (
    <Layout>
      <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', minHeight: '100vh' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#00F0FF', marginBottom: '1.5rem' }}>P2P Marketplace</h1>

        {/* COMPACT FILTERS ROW */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '12px'
        }}>
          {/* Cryptocurrency Dropdown */}
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.5rem', fontWeight: '700', textTransform: 'uppercase' }}>Cryptocurrency</label>
            <select
              value={selectedCrypto}
              onChange={(e) => setSelectedCrypto(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(0, 240, 255, 0.4)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {availableCoins.map(coin => (
                <option key={coin} value={coin}>{coin}</option>
              ))}
            </select>
          </div>

          {/* Fiat Currency Dropdown */}
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.5rem', fontWeight: '700', textTransform: 'uppercase' }}>Fiat Currency</label>
            <select
              value={selectedFiatCurrency}
              onChange={(e) => setSelectedFiatCurrency(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <option value="">All Currencies</option>
              <option value="GBP">GBP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              {availableCurrencies.map(currency => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.5rem', fontWeight: '700', textTransform: 'uppercase' }}>Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(0, 240, 255, 0.4)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Advanced Filters Button */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                width: '100%',
                padding: '0.6rem 1rem',
                background: showFilters ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(0, 240, 255, 0.4)',
                borderRadius: '8px',
                color: '#00F0FF',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              <IoFilter size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
              {showFilters ? 'Hide Filters' : 'More Filters'}
            </button>
          </div>
        </div>

        {/* Buy/Sell Toggle */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setActiveTab('buy')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: activeTab === 'buy' ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontWeight: '700',
              fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            BUY {selectedCrypto}
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: activeTab === 'sell' ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontWeight: '700',
              fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            SELL {selectedCrypto}
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.5rem', fontWeight: '700' }}>Payment Method</label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
              >
                <option value="">All Methods</option>
                {availablePaymentMethods.map(method => <option key={method} value={method}>{method}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.5rem', fontWeight: '700' }}>Min Price</label>
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                placeholder="Min"
                style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.5rem', fontWeight: '700' }}>Max Price</label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                placeholder="Max"
                style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={fetchOffers}
                style={{
                  width: '100%',
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#000',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Offers List */}
        <div>
          <div style={{ marginBottom: '1rem', color: '#888', fontSize: '13px' }}>Showing {offers.length} offers</div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>Loading offers...</div>
          ) : offers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px' }}>
              <div style={{ color: '#888', fontSize: '16px', marginBottom: '0.5rem' }}>No offers available for {selectedCrypto}</div>
              <div style={{ color: '#666', fontSize: '13px' }}>Try selecting a different cryptocurrency or adjusting filters</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {offers.map((offer) => (
                <div
                  key={offer.offer_id}
                  style={{
                    padding: '1.25rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(0, 240, 255, 0.2)',
                    borderRadius: '12px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr auto',
                    gap: '1.5rem',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>{offer.seller_info?.username || 'Anonymous'}</span>
                      {offer.seller_info?.is_verified && <IoShield size={14} color="#00F0FF" />}
                      {offer.fast_payment && <IoFlash size={14} color="#FCD34D" />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                      <IoStar size={12} color="#FCD34D" fill="#FCD34D" />
                      <span style={{ color: '#FCD34D', fontSize: '13px', fontWeight: '600' }}>{offer.seller_info?.rating?.toFixed(1) || '5.0'}</span>
                    </div>
                    <div style={{ color: '#888', fontSize: '11px' }}>{offer.seller_info?.total_trades || 0} trades | {offer.seller_info?.completion_rate?.toFixed(1) || '100'}%</div>
                  </div>

                  <div>
                    <div style={{ color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>PRICE</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#00F0FF', marginBottom: '0.25rem' }}>£{offer.price_per_unit?.toLocaleString()}</div>
                    <div style={{ color: '#888', fontSize: '11px' }}>Limits: £{offer.min_order_limit} - £{offer.max_order_limit}</div>
                  </div>

                  <div>
                    <div style={{ color: '#888', fontSize: '11px', marginBottom: '0.5rem' }}>PAYMENT</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {offer.payment_methods?.slice(0, 2).map((method, idx) => (
                        <span key={idx} style={{ padding: '0.25rem 0.5rem', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '8px', color: '#00F0FF', fontSize: '10px', fontWeight: '600' }}>{method}</span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleBuyOffer(offer)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: activeTab === 'buy' ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {activeTab === 'buy' ? 'BUY' : 'SELL'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default P2PMarketplace;