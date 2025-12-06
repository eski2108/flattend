import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '@/components/Layout';
import { Search, Filter, Star, Shield, Zap, Clock, TrendingUp, ChevronDown, X, User, MapPin, Award, CheckCircle } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || 'https://signupverify.preview.emergentagent.com';

function P2PMarketplace() {
  const navigate = useNavigate();
  
  // Add CSS animation for boosted badge
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.8;
          transform: scale(1.05);
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  const [activeTab, setActiveTab] = useState('buy');
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableCoins, setAvailableCoins] = useState(['BTC']);
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);
  const [availableRegions, setAvailableRegions] = useState([]);
  const [selectedFiatCurrency, setSelectedFiatCurrency] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [showSellerProfile, setShowSellerProfile] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
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
    trustedOnly: false,
    favoritesOnly: false,
    newSellerOnly: false,
    country: '',
    region: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const sortOptions = [
    { value: 'best_price', label: 'Best Price' },
    { value: 'highest_rating', label: 'Highest Rating' },
    { value: 'fast_payment', label: 'Fastest Payment' },
    { value: 'most_trades', label: 'Most Trades' },
    { value: 'lowest_fees', label: 'Lowest Fees' }
  ];

  useEffect(() => {
    fetchAvailableCoins();
    fetchMarketplaceFilters();
    loadFavorites();
    
    // Handle window resize for responsive layout
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [selectedCrypto, sortBy, activeTab, selectedFiatCurrency, filters.favoritesOnly, filters.trustedOnly, filters.fastPaymentOnly]);

  const loadFavorites = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      if (userId) {
        const response = await axios.get(`${API}/api/p2p/favorites/${userId}`);
        if (response.data.success) {
          setFavorites(response.data.favorites || []);
        }
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const toggleFavorite = async (sellerId, e) => {
    e.stopPropagation();
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      toast.error('Please login to save favorites');
      return;
    }

    try {
      if (favorites.includes(sellerId)) {
        await axios.post(`${API}/api/p2p/favorites/remove`, { user_id: userId, seller_id: sellerId });
        setFavorites(favorites.filter(id => id !== sellerId));
        toast.success('Removed from favorites');
      } else {
        await axios.post(`${API}/api/p2p/favorites/add`, { user_id: userId, seller_id: sellerId });
        setFavorites([...favorites, sellerId]);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const fetchSellerProfile = async (sellerId) => {
    try {
      const response = await axios.get(`${API}/api/p2p/seller/profile/${sellerId}`);
      if (response.data.success) {
        setSelectedSeller(response.data.profile);
        setShowSellerProfile(true);
      }
    } catch (error) {
      console.error('Error fetching seller profile:', error);
      toast.error('Failed to load seller profile');
    }
  };

  const fetchAvailableCoins = async () => {
    try {
      const response = await axios.get(`${API}/api/p2p/marketplace/available-coins`);
      if (response.data.success && response.data.coins.length > 0) {
        setAvailableCoins(response.data.coins);
        if (!response.data.coins.includes('BTC') && response.data.coins.length > 0) {
          setSelectedCrypto(response.data.coins[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching available coins:', error);
    }
  };

  const fetchMarketplaceFilters = async () => {
    try {
      const response = await axios.get(`${API}/api/p2p/marketplace/filters`);
      if (response.data.success) {
        setAvailableCurrencies(response.data.currencies || []);
        setAvailablePaymentMethods(response.data.payment_methods || []);
        setAvailableRegions(response.data.regions || []);
      }
    } catch (error) {
      console.error('Error fetching marketplace filters:', error);
    }
  };

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('user_id');
      // Determine ad_type based on activeTab: if user wants to 'buy', they need 'sell' offers
      const adType = activeTab === 'buy' ? 'sell' : 'buy';
      
      const params = new URLSearchParams({
        ad_type: adType,
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
        ...(filters.trustedOnly && { trusted_only: true }),
        ...(filters.favoritesOnly && { favorites_only: true, user_id: userId }),
        ...(filters.newSellerOnly && { new_seller_only: true }),
        ...(filters.country && { country: filters.country }),
        ...(filters.region && { region: filters.region })
      });

      const response = await axios.get(`${API}/api/p2p/offers?${params}`);
      if (response.data.success) {
        let fetchedOffers = response.data.offers || [];
        
        // Priority sorting: Boosted > Gold > Silver > Rest
        fetchedOffers.sort((a, b) => {
          // Check if boosted and not expired
          const aIsBoosted = a.is_boosted && a.boosted_until && new Date(a.boosted_until) > new Date();
          const bIsBoosted = b.is_boosted && b.boosted_until && new Date(b.boosted_until) > new Date();
          
          if (aIsBoosted && !bIsBoosted) return -1;
          if (!aIsBoosted && bIsBoosted) return 1;
          
          // Then by seller level
          const levelPriority = { gold: 3, silver: 2, bronze: 1 };
          const aLevel = levelPriority[a.seller_info?.seller_level] || 1;
          const bLevel = levelPriority[b.seller_info?.seller_level] || 1;
          
          if (aLevel !== bLevel) return bLevel - aLevel;
          
          // If same priority, maintain original order (price sorting from backend)
          return 0;
        });
        
        setOffers(fetchedOffers);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyOffer = (offer) => {
    try {
      console.log('🔥 handleBuyOffer called!', offer);
      
      const userData = localStorage.getItem('cryptobank_user');
      const user = userData ? JSON.parse(userData) : null;
      
      if (!user?.user_id) {
        toast.error('Please log in to buy');
        setTimeout(() => navigate('/login'), 100);
        return;
      }

      console.log('🚀 Navigating to order-preview with offer:', offer);
      
      // Store offer details for purchase flow
      localStorage.setItem('pending_offer', JSON.stringify(offer));
      
      // Navigate to order preview - use setTimeout to ensure it executes
      setTimeout(() => {
        navigate('/order-preview', { state: { offer: offer }, replace: false });
      }, 0);
      
      console.log('✅ Navigate queued');
    } catch (error) {
      console.error('❌ Error in handleBuyOffer:', error);
      toast.error('Failed to process offer');
    }
  };

  return (
    <Layout>
      <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', minHeight: '100vh' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#00F0FF', marginBottom: '1.5rem' }}>P2P Marketplace</h1>

        {/* ENHANCED FILTER ROW */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.45rem 0.65rem',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '6px',
          marginBottom: '0.75rem',
          flexWrap: 'wrap'
        }}>
          {/* Cryptocurrency Dropdown */}
          <div style={{ width: '85px', flexShrink: 0 }}>
            <select
              value={selectedCrypto}
              onChange={(e) => setSelectedCrypto(e.target.value)}
              style={{
                width: '100%',
                padding: '0.35rem 0.4rem',
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '4px',
                color: '#00F0FF',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {availableCoins.map(coin => (
                <option key={coin} value={coin} style={{ background: '#1a1f3a', color: '#fff' }}>
                  {coin}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.15)', flexShrink: 0 }} />

          {/* Fiat Currency Dropdown */}
          <div style={{ width: '95px', flexShrink: 0 }}>
            <select
              value={selectedFiatCurrency}
              onChange={(e) => setSelectedFiatCurrency(e.target.value)}
              style={{
                width: '100%',
                padding: '0.35rem 0.4rem',
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '4px',
                color: '#A855F7',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="" style={{ background: '#1a1f3a', color: '#fff' }}>All</option>
              <option value="GBP" style={{ background: '#1a1f3a', color: '#fff' }}>GBP</option>
              <option value="USD" style={{ background: '#1a1f3a', color: '#fff' }}>USD</option>
              <option value="EUR" style={{ background: '#1a1f3a', color: '#fff' }}>EUR</option>
              {availableCurrencies.filter(c => !['GBP', 'USD', 'EUR'].includes(c)).map(currency => (
                <option key={currency} value={currency} style={{ background: '#1a1f3a', color: '#fff' }}>
                  {currency}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.15)', flexShrink: 0 }} />

          {/* Sort Dropdown */}
          <div style={{ width: '105px', flexShrink: 0 }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                padding: '0.35rem 0.4rem',
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value} style={{ background: '#1a1f3a', color: '#fff' }}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.15)', flexShrink: 0 }} />

          {/* Quick Filter Toggles */}
          <button
            onClick={() => setFilters({...filters, trustedOnly: !filters.trustedOnly})}
            style={{
              padding: '0.35rem 0.6rem',
              background: filters.trustedOnly ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
              border: `1px solid ${filters.trustedOnly ? 'rgba(0, 240, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
              borderRadius: '4px',
              color: filters.trustedOnly ? '#00F0FF' : '#888',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <Shield size={10} />
            Trusted
          </button>

          <button
            onClick={() => setFilters({...filters, fastPaymentOnly: !filters.fastPaymentOnly})}
            style={{
              padding: '0.35rem 0.6rem',
              background: filters.fastPaymentOnly ? 'rgba(252, 211, 77, 0.2)' : 'transparent',
              border: `1px solid ${filters.fastPaymentOnly ? 'rgba(252, 211, 77, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
              borderRadius: '4px',
              color: filters.fastPaymentOnly ? '#FCD34D' : '#888',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <Zap size={10} />
            Fast Pay
          </button>

          <button
            onClick={() => setFilters({...filters, favoritesOnly: !filters.favoritesOnly})}
            style={{
              padding: '0.35rem 0.6rem',
              background: filters.favoritesOnly ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
              border: `1px solid ${filters.favoritesOnly ? 'rgba(168, 85, 247, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
              borderRadius: '4px',
              color: filters.favoritesOnly ? '#A855F7' : '#888',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <Star size={10} fill={filters.favoritesOnly ? '#A855F7' : 'none'} />
            Favorites
          </button>

          <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.15)', flexShrink: 0 }} />

          {/* Advanced Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '0.35rem 0.65rem',
              background: showFilters ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '4px',
              color: '#00F0FF',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <Filter size={10} />
            More Filters
          </button>

          <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.15)', flexShrink: 0 }} />

          {/* Buy/Sell Buttons */}
          <button
            onClick={() => setActiveTab('buy')}
            style={{
              padding: '0.35rem 0.75rem',
              background: activeTab === 'buy' ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'rgba(255, 255, 255, 0.05)',
              border: activeTab === 'buy' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              color: '#fff',
              fontWeight: '700',
              fontSize: '11px',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            BUY
          </button>

          <button
            onClick={() => setActiveTab('sell')}
            style={{
              padding: '0.35rem 0.75rem',
              background: activeTab === 'sell' ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'rgba(255, 255, 255, 0.05)',
              border: activeTab === 'sell' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              color: '#fff',
              fontWeight: '700',
              fontSize: '11px',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            SELL
          </button>
        </div>

        {/* EXPANDED FILTERS PANEL */}
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
            {/* Payment Method */}
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

            {/* Region */}
            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.5rem', fontWeight: '700' }}>Region/Country</label>
              <select
                value={filters.region}
                onChange={(e) => setFilters({...filters, region: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
              >
                <option value="">All Regions</option>
                {availableRegions.map(region => <option key={region.code} value={region.code}>{region.name}</option>)}
              </select>
            </div>

            {/* Min Amount */}
            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.5rem', fontWeight: '700' }}>Min Amount</label>
              <input
                type="number"
                value={filters.minAmount}
                onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
                placeholder="Min"
                style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
              />
            </div>

            {/* Max Amount */}
            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '11px', marginBottom: '0.5rem', fontWeight: '700' }}>Max Amount</label>
              <input
                type="number"
                value={filters.maxAmount}
                onChange={(e) => setFilters({...filters, maxAmount: e.target.value})}
                placeholder="Max"
                style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
              />
            </div>

            {/* Min Price */}
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

            {/* Max Price */}
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

            {/* Apply Button */}
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
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: '1.5rem',
                    alignItems: isMobile ? 'stretch' : 'center',
                    position: 'relative'
                  }}
                >
                  {/* Favorite Star */}
                  <button
                    onClick={(e) => toggleFavorite(offer.seller_id, e)}
                    style={{
                      position: 'absolute',
                      top: '0.75rem',
                      right: '0.75rem',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem'
                    }}
                  >
                    <Star 
                      size={18} 
                      color={favorites.includes(offer.seller_id) ? '#A855F7' : '#666'} 
                      fill={favorites.includes(offer.seller_id) ? '#A855F7' : 'none'}
                    />
                  </button>

                  {/* Seller Info */}
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <div 
                      onClick={() => fetchSellerProfile(offer.seller_id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}
                    >
                      <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff', textDecoration: 'underline' }}>
                        {offer.seller_info?.username || 'Anonymous'}
                      </span>
                      {offer.seller_info?.is_verified && 
                        <div title="Verified Seller" style={{ display: 'flex', alignItems: 'center' }}>
                          <Shield size={14} color="#00F0FF" />
                        </div>
                      }
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      {offer.is_boosted && 
                        <div 
                          title="Boosted Listing - Priority Placement"
                          style={{
                            padding: '2px 6px',
                            background: 'linear-gradient(135deg, #FFA500, #FF8C00)',
                            border: '1px solid rgba(255, 165, 0, 0.6)',
                            borderRadius: '4px',
                            fontSize: '9px',
                            fontWeight: '700',
                            color: '#FFF',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            boxShadow: '0 0 15px rgba(255, 165, 0, 0.5)',
                            animation: 'pulse 2s infinite'
                          }}
                        >
                          🚀 BOOSTED
                        </div>
                      }
                      {offer.seller_info?.is_verified_seller && 
                        <div 
                          title="Verified Seller"
                          style={{
                            padding: '2px 6px',
                            background: 'rgba(168, 85, 247, 0.15)',
                            border: '1px solid rgba(168, 85, 247, 0.5)',
                            borderRadius: '4px',
                            fontSize: '9px',
                            fontWeight: '700',
                            color: '#A855F7',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          ✓ VERIFIED
                        </div>
                      }
                      {offer.seller_info?.seller_level === 'gold' && 
                        <div 
                          title="Gold Seller - Top Priority & Lowest Fees"
                          style={{
                            padding: '2px 6px',
                            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1))',
                            border: '1px solid rgba(255, 215, 0, 0.6)',
                            borderRadius: '4px',
                            fontSize: '9px',
                            fontWeight: '700',
                            color: '#FFD700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            boxShadow: '0 0 10px rgba(255, 215, 0, 0.3)'
                          }}
                        >
                          👑 GOLD
                        </div>
                      }
                      {offer.seller_info?.seller_level === 'silver' && 
                        <div 
                          title="Silver Seller - Priority Ranking"
                          style={{
                            padding: '2px 6px',
                            background: 'rgba(192, 192, 192, 0.15)',
                            border: '1px solid rgba(192, 192, 192, 0.5)',
                            borderRadius: '4px',
                            fontSize: '9px',
                            fontWeight: '700',
                            color: '#C0C0C0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          ⭐ SILVER
                        </div>
                      }
                      {offer.seller_info?.is_trusted && 
                        <div 
                          title="Trusted Seller"
                          style={{
                            padding: '2px 6px',
                            background: 'rgba(0, 240, 255, 0.15)',
                            border: '1px solid rgba(0, 240, 255, 0.4)',
                            borderRadius: '4px',
                            fontSize: '9px',
                            fontWeight: '700',
                            color: '#00F0FF',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          <Shield size={9} />
                          TRUSTED
                        </div>
                      }
                      {(offer.fast_payment || offer.seller_info?.is_fast_payment) && 
                        <div 
                          title="Known for quick payment confirmations"
                          style={{
                            padding: '2px 6px',
                            background: 'rgba(252, 211, 77, 0.15)',
                            border: '1px solid rgba(252, 211, 77, 0.4)',
                            borderRadius: '4px',
                            fontSize: '9px',
                            fontWeight: '700',
                            color: '#FCD34D',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            boxShadow: '0 0 10px rgba(252, 211, 77, 0.3)'
                          }}
                        >
                          <Zap size={9} />
                          FAST PAY
                        </div>
                      }
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                      <Star size={12} color="#FCD34D" fill="#FCD34D" />
                      <span style={{ color: '#FCD34D', fontSize: '13px', fontWeight: '600' }}>
                        {offer.seller_info?.rating?.toFixed(1) || '5.0'}
                      </span>
                    </div>
                    <div style={{ color: '#888', fontSize: '11px' }}>
                      {offer.seller_info?.total_trades || 0} trades | {offer.seller_info?.completion_rate?.toFixed(1) || '100'}%
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ flex: '1', minWidth: '150px' }}>
                    <div style={{ color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>PRICE</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#00F0FF', marginBottom: '0.25rem' }}>
                      £{offer.price_per_unit?.toLocaleString()}
                    </div>
                    <div style={{ color: '#888', fontSize: '11px' }}>Limits: £{offer.min_order_limit} - £{offer.max_order_limit}</div>
                  </div>

                  {/* Payment Methods */}
                  <div style={{ flex: '1', minWidth: '150px' }}>
                    <div style={{ color: '#888', fontSize: '11px', marginBottom: '0.5rem' }}>PAYMENT</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {offer.payment_methods?.slice(0, 2).map((method, idx) => (
                        <span 
                          key={idx} 
                          style={{ 
                            padding: '0.25rem 0.5rem', 
                            background: 'rgba(0, 240, 255, 0.1)', 
                            border: '1px solid rgba(0, 240, 255, 0.3)', 
                            borderRadius: '8px', 
                            color: '#00F0FF', 
                            fontSize: '10px', 
                            fontWeight: '600' 
                          }}
                        >
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBuyOffer(offer);
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: activeTab === 'buy' ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: activeTab === 'buy' 
                        ? '0 0 15px rgba(34, 197, 94, 0.4)'
                        : '0 0 15px rgba(239, 68, 68, 0.4)',
                      flexShrink: 0,
                      minWidth: '120px'
                    }}
                  >
                    {activeTab === 'buy' ? 'Buy' : 'Sell'} {selectedCrypto}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seller Profile Modal */}
        {showSellerProfile && selectedSeller && (
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
              zIndex: 1000,
              padding: '1rem'
            }}
            onClick={() => setShowSellerProfile(false)}
          >
            <div 
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '16px',
                padding: '2rem',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 0 50px rgba(0, 240, 255, 0.3)',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowSellerProfile(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#888'
                }}
              >
                <X size={24} />
              </button>

              {/* Profile Header */}
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                  fontSize: '32px',
                  fontWeight: '900',
                  color: '#fff'
                }}>
                  {selectedSeller.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#fff', marginBottom: '0.5rem' }}>
                  {selectedSeller.username}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <MapPin size={14} color="#888" />
                  <span style={{ color: '#888', fontSize: '14px' }}>{selectedSeller.region || 'Global'}</span>
                </div>
                {/* Badges */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {selectedSeller.is_verified && (
                    <div style={{
                      padding: '4px 8px',
                      background: 'rgba(0, 240, 255, 0.15)',
                      border: '1px solid rgba(0, 240, 255, 0.4)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#00F0FF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Shield size={12} />
                      VERIFIED
                    </div>
                  )}
                  {selectedSeller.is_trusted && (
                    <div style={{
                      padding: '4px 8px',
                      background: 'rgba(0, 240, 255, 0.15)',
                      border: '1px solid rgba(0, 240, 255, 0.4)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#00F0FF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Award size={12} />
                      TRUSTED
                    </div>
                  )}
                  {selectedSeller.is_fast_payment && (
                    <div style={{
                      padding: '4px 8px',
                      background: 'rgba(252, 211, 77, 0.15)',
                      border: '1px solid rgba(252, 211, 77, 0.4)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#FCD34D',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 0 10px rgba(252, 211, 77, 0.3)'
                    }}>
                      <Zap size={12} />
                      FAST PAYMENT
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>RATING</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Star size={16} color="#FCD34D" fill="#FCD34D" />
                    <span style={{ fontSize: '20px', fontWeight: '900', color: '#FCD34D' }}>
                      {selectedSeller.rating?.toFixed(1) || '5.0'}
                    </span>
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>TOTAL TRADES</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#00F0FF' }}>
                    {selectedSeller.total_trades || 0}
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>COMPLETION RATE</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#22C55E' }}>
                    {selectedSeller.completion_rate?.toFixed(1) || '100'}%
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ color: '#888', fontSize: '11px', marginBottom: '0.25rem' }}>AVG RELEASE TIME</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#A855F7' }}>
                    {selectedSeller.average_release_time_minutes?.toFixed(0) || '15'}m
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div style={{
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#888', fontSize: '13px' }}>Total Volume Traded:</span>
                  <span style={{ color: '#fff', fontSize: '13px', fontWeight: '700' }}>
                    £{selectedSeller.total_volume?.toLocaleString() || '0'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888', fontSize: '13px' }}>Member Since:</span>
                  <span style={{ color: '#fff', fontSize: '13px', fontWeight: '700' }}>
                    {new Date(selectedSeller.join_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default P2PMarketplace;