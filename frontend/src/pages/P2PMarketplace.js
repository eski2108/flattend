import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { IoCheckmarkCircle as CheckCircle, IoChevronDown, IoClose, IoFilter, IoFlash, IoLocation, IoOptions, IoPersonOutline as User, IoSearch as Search, IoShield, IoStar, IoTime as Clock, IoTrendingUp as TrendingUp, IoTrophy } from 'react-icons/io5';
import P2PNotifications from '@/components/P2PNotifications';
import TraderStats from '@/components/TraderStats';
import { COIN_EMOJIS } from '@/utils/coinConfig';
import '../styles/globalSwapTheme.css';

const API = process.env.REACT_APP_BACKEND_URL;

function P2PMarketplace() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
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
  const [coinsData, setCoinsData] = useState([]);
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);
  const [availableRegions, setAvailableRegions] = useState([]);
  const [selectedFiatCurrency, setSelectedFiatCurrency] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [showSellerProfile, setShowSellerProfile] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [processing, setProcessing] = useState(false);
  
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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
    
    // Load saved filters from localStorage
    const savedFilters = localStorage.getItem('p2p_saved_filters');
    if (savedFilters) {
      try {
        const parsedFilters = JSON.parse(savedFilters);
        setFilters(parsedFilters);
      } catch (error) {
        console.error('Error loading saved filters:', error);
      }
    }
    
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

  // Helper to get user_id from localStorage
  const getUserId = () => {
    const userStr = localStorage.getItem('cryptobank_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.user_id;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    return null;
  };

  const loadFavorites = async () => {
    try {
      const userId = getUserId();
      if (userId) {
        const response = await axios.get(`${API}/api/p2p/favourites/${userId}`);
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
    const userId = getUserId();
    if (!userId) {
      toast.error('Please login to save favorites');
      return;
    }

    try {
      if (favorites.includes(sellerId)) {
        await axios.post(`${API}/api/p2p/favourites/remove`, { user_id: userId, merchant_id: sellerId });
        setFavorites(favorites.filter(id => id !== sellerId));
        toast.success('Removed from favorites');
      } else {
        await axios.post(`${API}/api/p2p/favourites/add`, { user_id: userId, merchant_id: sellerId });
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
        setCoinsData(response.data.coins_data || []);
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
      const userId = getUserId();
      
      // Determine ad_type based on activeTab: if user wants to 'buy', they need 'sell' offers
      const adType = activeTab === 'buy' ? 'sell' : 'buy';
      
      const params = new URLSearchParams({
        ad_type: adType,
        crypto_currency: selectedCrypto,
        sort_by: sortBy,
        ...(userId && { user_id: userId }), // Always send user_id for block filtering
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
        ...(filters.favoritesOnly && { favorites_only: true }),
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

  const handleBuyOffer = async (offer) => {
    try {
      console.log('🔥 handleBuyOffer called!', offer);
      
      const userData = localStorage.getItem('cryptobank_user');
      if (!userData) {
        toast.error('Please login to continue');
        navigate('/login');
        return;
      }
      
      const user = JSON.parse(userData);
      setProcessing(true);
      
      const cryptoAmount = parseFloat(offer.crypto_amount || offer.amount || 0);
      
      if (!cryptoAmount || cryptoAmount <= 0) {
        toast.error('Invalid crypto amount');
        setProcessing(false);
        return;
      }
      
      // AUTO-MATCH: Find best counterparty
      try {
        const matchResponse = await axios.post(`${API}/api/p2p/auto-match`, {
          user_id: user.user_id,
          type: activeTab,
          crypto: selectedCrypto,
          amount: cryptoAmount,
          payment_method: offer.payment_method || null
        });
        
        if (matchResponse.data.success) {
          const tradeId = matchResponse.data.trade_id;
          toast.success(`✅ Matched! Redirecting to order page...`);
          
          // Navigate to P2P order page
          setTimeout(() => {
            navigate(`/p2p/order/${tradeId}`);
          }, 500);
        } else {
          // No match found - show clear error
          toast.error(
            'No suitable offer found. Please adjust amount, currency, or filters.',
            { duration: 5000 }
          );
        }
      } catch (error) {
        console.error('❌ Error in handleBuyOffer:', error);
        
        // Enhanced error messages
        const errorMsg = error.response?.data?.detail || error.message;
        
        if (errorMsg.includes('limit') || errorMsg.includes('amount')) {
          toast.error('Amount is outside seller limits. Please adjust your amount.');
        } else if (errorMsg.includes('payment')) {
          toast.error('Payment method not supported. Please select a different offer.');
        } else if (errorMsg.includes('liquidity') || errorMsg.includes('available')) {
          toast.error('No suitable offer found. Please adjust amount, currency, or filters.');
        } else {
          toast.error(`Failed to match: ${errorMsg}`);
        }
      }
    } catch (error) {
      console.error('❌ Outer error in handleBuyOffer:', error);
      toast.error('Failed to process request. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const confirmQuote = () => {
    // Placeholder function - modal is disabled
  };

  return (
      <div style={{ 
        padding: isMobile ? '16px' : '24px', 
        background: 'linear-gradient(135deg, #020618 0%, #071327 50%, #020618 100%)', 
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated orbital glow background */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle at center, rgba(0, 240, 255, 0.03) 0%, transparent 50%)',
          animation: 'orbitGlow 10s linear infinite',
          pointerEvents: 'none',
          zIndex: 0
        }} />
        <style>
          {`
            @keyframes orbitGlow {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes pulseGlow {
              0%, 100% { box-shadow: 0 0 20px rgba(0, 240, 255, 0.4); }
              50% { box-shadow: 0 0 35px rgba(0, 240, 255, 0.6); }
            }
            @keyframes shimmer {
              0% { background-position: -1000px 0; }
              100% { background-position: 1000px 0; }
            }
          `}
        </style>
        
        {/* Content wrapper with frosted glass */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header Section */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'flex-start' : 'center', 
            marginBottom: '32px',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '16px' : '0'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <h1 style={{ 
                  fontSize: isMobile ? '28px' : '36px', 
                  fontWeight: '700', 
                  background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  margin: 0,
                  textShadow: '0 0 30px rgba(0, 240, 255, 0.3)'
                }}>
                  {t('p2p.marketplace.title')}
                </h1>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(0, 240, 255, 0.15)',
                  border: '2px solid rgba(0, 240, 255, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)'
                }}>
                  <IoShield size={16} color="#00F0FF" />
                </div>
              </div>
              <p style={{ 
                margin: 0, 
                fontSize: '13px', 
                color: 'rgba(255, 255, 255, 0.6)',
                fontWeight: '400'
              }}>
                Buy and sell crypto with verified users. Fully escrow-protected.
              </p>
            </div>
            {/* Notification Bell */}
            {(() => {
              const userData = JSON.parse(localStorage.getItem('cryptobank_user') || '{}');
              return userData?.user_id ? (
                <P2PNotifications 
                  userId={userData.user_id}
                  onNotificationClick={(notification) => {
                    if (notification.trade_id) {
                      navigate(`/p2p/trade/${notification.trade_id}`);
                    }
                  }}
                />
              ) : null;
            })()}
          </div>

          {/* EXPRESS BUY SHORTCUT - Platform Liquidity Option */}
          <div 
            onClick={() => navigate('/p2p-express')}
            style={{
              display: 'flex',
              alignItems: isMobile ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '24px',
              padding: isMobile ? '16px' : '20px 24px',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '16px',
              marginBottom: '24px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(0, 240, 255, 0.15)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 240, 255, 0.25)';
              e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 240, 255, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)'
              }}>
                <IoFlash size={24} color="#fff" />
              </div>
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <span style={{ 
                    fontSize: '16px', 
                    fontWeight: '700', 
                    color: '#FFFFFF'
                  }}>
                    ⚡ Express Buy (2–5 min)
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#22C55E',
                    textTransform: 'uppercase'
                  }}>
                    Instant
                  </span>
                </div>
                <p style={{ 
                  margin: 0, 
                  fontSize: '13px', 
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  Fulfilled by CoinHubX • No other users involved
                </p>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #00F0FF, #0099CC)',
              borderRadius: '10px',
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)'
            }}>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '700', 
                color: '#000'
              }}>
                Buy Now
              </span>
              <IoFlash size={16} color="#000" />
            </div>
          </div>

          {/* Premium Frosted Glass Filter Container */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '8px' : '12px',
            padding: isMobile ? '16px' : '24px',
            background: 'rgba(2, 6, 24, 0.4)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '20px',
            marginBottom: '24px',
            flexWrap: 'wrap',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 40px rgba(0, 240, 255, 0.1)'
          }}>
            {/* Premium Crypto Selector Pill */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <select
                value={selectedCrypto}
                onChange={(e) => setSelectedCrypto(e.target.value)}
                style={{
                  padding: '10px 32px 10px 14px',
                  background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 240, 255, 0.05) 100%)',
                  border: '1px solid rgba(0, 240, 255, 0.4)',
                  borderRadius: '12px',
                  color: '#00F0FF',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)',
                  appearance: 'none',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 240, 255, 0.4)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.2)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {coinsData.length > 0 ? (
                  coinsData.map(coin => (
                    <option key={coin.symbol} value={coin.symbol} style={{ background: '#0f172a', color: '#fff' }}>
                      {coin.emoji} {coin.symbol}
                    </option>
                  ))
                ) : (
                  availableCoins.map(coin => (
                    <option key={coin} value={coin} style={{ background: '#0f172a', color: '#fff' }}>
                      {COIN_EMOJIS[coin] || '💰'} {coin}
                    </option>
                  ))
                )}
              </select>
              <IoChevronDown 
                size={14} 
                color="#00F0FF" 
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)', flexShrink: 0 }} />

            {/* Premium Currency Selector Pill */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <select
                value={selectedFiatCurrency}
                onChange={(e) => setSelectedFiatCurrency(e.target.value)}
                style={{
                  padding: '10px 32px 10px 14px',
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  borderRadius: '12px',
                  color: '#A855F7',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: '0 0 20px rgba(168, 85, 247, 0.2)',
                  appearance: 'none',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(168, 85, 247, 0.4)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.2)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <option value="" style={{ background: '#0f172a', color: '#fff' }}>🌍 All Currencies</option>
                {availableCurrencies.length > 0 ? (
                  availableCurrencies.map(currency => (
                    <option 
                      key={typeof currency === 'object' ? currency.code : currency} 
                      value={typeof currency === 'object' ? currency.code : currency} 
                      style={{ background: '#0f172a', color: '#fff' }}
                    >
                      💰 {typeof currency === 'object' ? `${currency.symbol} ${currency.code}` : currency}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="GBP" style={{ background: '#0f172a', color: '#fff' }}>💷 GBP</option>
                    <option value="USD" style={{ background: '#0f172a', color: '#fff' }}>💵 USD</option>
                    <option value="EUR" style={{ background: '#0f172a', color: '#fff' }}>💶 EUR</option>
                  </>
                )}
              </select>
              <IoChevronDown 
                size={14} 
                color="#A855F7" 
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)', flexShrink: 0 }} />

            {/* Premium Filter Chips */}
            <button
              onClick={() => {
                setSortBy('best_price');
                setFilters({...filters});
              }}
              style={{
                padding: '10px 16px',
                background: sortBy === 'best_price' 
                  ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(0, 240, 255, 0.1) 100%)' 
                  : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${sortBy === 'best_price' ? 'rgba(0, 240, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '12px',
                color: sortBy === 'best_price' ? '#00F0FF' : 'rgba(255, 255, 255, 0.5)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: sortBy === 'best_price' ? '0 0 20px rgba(0, 240, 255, 0.3)' : 'none',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (sortBy === 'best_price') {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 240, 255, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (sortBy === 'best_price') {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.3)';
                }
              }}
            >
              {sortBy === 'best_price' && <CheckCircle size={14} />}
              Best Price
            </button>

            <button
              onClick={() => setFilters({...filters, trustedOnly: !filters.trustedOnly})}
              style={{
                padding: '10px 16px',
                background: filters.trustedOnly 
                  ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(0, 240, 255, 0.1) 100%)' 
                  : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${filters.trustedOnly ? 'rgba(0, 240, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '12px',
                color: filters.trustedOnly ? '#00F0FF' : 'rgba(255, 255, 255, 0.5)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: filters.trustedOnly ? '0 0 20px rgba(0, 240, 255, 0.3)' : 'none',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (filters.trustedOnly) {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 240, 255, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (filters.trustedOnly) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.3)';
                }
              }}
            >
              {filters.trustedOnly && <CheckCircle size={14} />}
              <IoShield size={14} />
              Trusted
            </button>

            <button
              onClick={() => setFilters({...filters, fastPaymentOnly: !filters.fastPaymentOnly})}
              style={{
                padding: '10px 16px',
                background: filters.fastPaymentOnly 
                  ? 'linear-gradient(135deg, rgba(252, 211, 77, 0.2) 0%, rgba(252, 211, 77, 0.1) 100%)' 
                  : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${filters.fastPaymentOnly ? 'rgba(252, 211, 77, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '12px',
                color: filters.fastPaymentOnly ? '#FCD34D' : 'rgba(255, 255, 255, 0.5)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: filters.fastPaymentOnly ? '0 0 20px rgba(252, 211, 77, 0.3)' : 'none',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (filters.fastPaymentOnly) {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(252, 211, 77, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (filters.fastPaymentOnly) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(252, 211, 77, 0.3)';
                }
              }}
            >
              {filters.fastPaymentOnly && <CheckCircle size={14} />}
              <IoFlash size={14} />
              Fast Pay
            </button>

            {/* Advanced Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: '10px 16px',
                background: showFilters 
                  ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.1) 100%)' 
                  : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${showFilters ? 'rgba(168, 85, 247, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '12px',
                color: showFilters ? '#A855F7' : 'rgba(255, 255, 255, 0.5)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: showFilters ? '0 0 20px rgba(168, 85, 247, 0.3)' : 'none',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (showFilters) {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(168, 85, 247, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (showFilters) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.3)';
                }
              }}
            >
              <IoFilter size={14} />
              Advanced Filters
            </button>

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)', flexShrink: 0, marginLeft: isMobile ? '0' : 'auto' }} />

            {/* Premium BUY/SELL Toggle */}
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button
                onClick={() => setActiveTab('buy')}
                style={{
                  padding: '10px 20px',
                  background: activeTab === 'buy' 
                    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                    : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${activeTab === 'buy' ? 'rgba(16, 185, 129, 0.6)' : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '12px',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: activeTab === 'buy' ? '0 0 25px rgba(16, 185, 129, 0.4)' : 'none',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (activeTab === 'buy') {
                    e.currentTarget.style.transform = 'scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 0 35px rgba(16, 185, 129, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab === 'buy') {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(16, 185, 129, 0.4)';
                  }
                }}
              >
                BUY
              </button>

              <button
                onClick={() => setActiveTab('sell')}
                style={{
                  padding: '10px 20px',
                  background: activeTab === 'sell' 
                    ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' 
                    : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${activeTab === 'sell' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '12px',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: activeTab === 'sell' ? '0 0 25px rgba(239, 68, 68, 0.4)' : 'none',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (activeTab === 'sell') {
                    e.currentTarget.style.transform = 'scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 0 35px rgba(239, 68, 68, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab === 'sell') {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(239, 68, 68, 0.4)';
                  }
                }}
              >
                SELL
              </button>
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)', flexShrink: 0 }} />

            {/* PREMIUM BECOME A SELLER CTA */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/p2p/merchant');
              }}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
                border: 'none',
                borderRadius: '14px',
                color: '#fff',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
                boxShadow: '0 0 30px rgba(0, 240, 255, 0.5)',
                transition: 'all 0.3s ease',
                position: 'relative',
                zIndex: 9999,
                pointerEvents: 'auto',
                animation: 'pulseGlow 10s infinite'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.04) translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 40px rgba(0, 240, 255, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 240, 255, 0.5)';
              }}
            >
              <TrendingUp size={18} />
              Become a Seller
            </button>
          </div>
          
          {/* Helper text for BUY/SELL */}
          <div style={{ 
            marginTop: '-16px', 
            marginBottom: '24px', 
            padding: '0 8px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontWeight: '400'
          }}>
            {activeTab === 'buy' 
              ? '💡 Showing users who are selling ' + selectedCrypto + ' to you.'
              : '💡 Showing users who want to buy ' + selectedCrypto + ' from you.'
            }
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
                {availablePaymentMethods.length > 0 ? (
                  availablePaymentMethods.map(method => {
                    const methodName = typeof method === 'object' ? method.name : method;
                    const methodIcon = typeof method === 'object' ? method.icon : '';
                    return (
                      <option key={methodName} value={methodName}>
                        {methodIcon} {methodName}
                      </option>
                    );
                  })
                ) : (
                  <>
                    <option value="Bank Transfer">🏦 Bank Transfer</option>
                    <option value="PayPal">💳 PayPal</option>
                    <option value="Revolut">💳 Revolut</option>
                  </>
                )}
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
                {availableRegions.length > 0 ? (
                  availableRegions.map(region => (
                    <option key={region.code} value={region.code}>
                      {region.flag} {region.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="UK">🇬🇧 United Kingdom</option>
                    <option value="US">🇺🇸 United States</option>
                    <option value="NG">🇳🇬 Nigeria</option>
                    <option value="IN">🇮🇳 India</option>
                  </>
                )}
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

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div style={{
            marginTop: '1rem',
            padding: '20px',
            background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
            border: '1px solid rgba(0, 198, 255, 0.3)',
            borderRadius: '12px'
          }}>
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IoFilter size={18} color="#00C6FF" />
              <h3 style={{ margin: 0, color: '#00C6FF', fontSize: '16px', fontWeight: '700' }}>Advanced Filters</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              {/* Payment Methods Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#8F9BB3', marginBottom: '8px', fontWeight: '600' }}>
                  Payment Method
                </label>
                <select
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 198, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="">All Payment Methods</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                  <option value="paypal">💳 PayPal</option>
                  <option value="revolut">💜 Revolut</option>
                  <option value="wise">🌐 Wise</option>
                  <option value="cash_app">💵 Cash App</option>
                </select>
              </div>

              {/* Min Rating Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#8F9BB3', marginBottom: '8px', fontWeight: '600' }}>
                  Minimum Rating
                </label>
                <select
                  value={filters.minRating}
                  onChange={(e) => setFilters({...filters, minRating: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 198, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="">Any Rating</option>
                  <option value="4.5">⭐ 4.5 and above</option>
                  <option value="4.0">⭐ 4.0 and above</option>
                  <option value="3.5">⭐ 3.5 and above</option>
                  <option value="3.0">⭐ 3.0 and above</option>
                </select>
              </div>

              {/* Min Completion Rate */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#8F9BB3', marginBottom: '8px', fontWeight: '600' }}>
                  Min Completion Rate
                </label>
                <select
                  value={filters.minCompletionRate}
                  onChange={(e) => setFilters({...filters, minCompletionRate: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 198, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="">Any Rate</option>
                  <option value="95">✅ 95% and above</option>
                  <option value="90">✅ 90% and above</option>
                  <option value="80">✅ 80% and above</option>
                  <option value="70">✅ 70% and above</option>
                </select>
              </div>

              {/* Country Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#8F9BB3', marginBottom: '8px', fontWeight: '600' }}>
                  Country/Region
                </label>
                <select
                  value={filters.country}
                  onChange={(e) => setFilters({...filters, country: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 198, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="">All Countries</option>
                  <option value="GB">🇬🇧 United Kingdom</option>
                  <option value="US">🇺🇸 United States</option>
                  <option value="EU">🇪🇺 European Union</option>
                  <option value="IN">🇮🇳 India</option>
                  <option value="NG">🇳🇬 Nigeria</option>
                  <option value="CA">🇨🇦 Canada</option>
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#8F9BB3', marginBottom: '8px', fontWeight: '600' }}>
                  Price Range (Min)
                </label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                  placeholder="Min Price"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 198, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#8F9BB3', marginBottom: '8px', fontWeight: '600' }}>
                  Price Range (Max)
                </label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                  placeholder="Max Price"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 198, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Toggle Filters */}
            <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                background: filters.verifiedOnly ? 'rgba(0, 198, 255, 0.1)' : 'rgba(0, 0, 0, 0.2)',
                border: `1px solid ${filters.verifiedOnly ? 'rgba(0, 198, 255, 0.5)' : 'rgba(143, 155, 179, 0.3)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
                <input
                  type="checkbox"
                  checked={filters.verifiedOnly}
                  onChange={(e) => setFilters({...filters, verifiedOnly: e.target.checked})}
                  style={{ cursor: 'pointer' }}
                />
                <IoShield size={16} color={filters.verifiedOnly ? '#00C6FF' : '#8F9BB3'} />
                <span style={{ color: filters.verifiedOnly ? '#00C6FF' : '#8F9BB3', fontSize: '12px', fontWeight: '600' }}>
                  Verified Only
                </span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                background: filters.newSellerOnly ? 'rgba(0, 198, 255, 0.1)' : 'rgba(0, 0, 0, 0.2)',
                border: `1px solid ${filters.newSellerOnly ? 'rgba(0, 198, 255, 0.5)' : 'rgba(143, 155, 179, 0.3)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
                <input
                  type="checkbox"
                  checked={filters.newSellerOnly}
                  onChange={(e) => setFilters({...filters, newSellerOnly: e.target.checked})}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ color: filters.newSellerOnly ? '#00C6FF' : '#8F9BB3', fontSize: '12px', fontWeight: '600' }}>
                  New Sellers
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <button
                onClick={() => {
                  setFilters({
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
                  toast.success('Filters reset!');
                }}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(143, 155, 179, 0.1)',
                  border: '1px solid rgba(143, 155, 179, 0.3)',
                  borderRadius: '8px',
                  color: '#8F9BB3',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(143, 155, 179, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(143, 155, 179, 0.1)';
                }}
              >
                🔄 Reset Filters
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('p2p_saved_filters', JSON.stringify(filters));
                  toast.success('✅ Filters saved as default!');
                }}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #00C6FF, #0096CC)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(0, 198, 255, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(0, 198, 255, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 198, 255, 0.3)';
                }}
              >
                💾 Save as Default
              </button>
            </div>
          </div>
        )}

          {/* Offers List */}
          <div>
            <div style={{ 
              marginBottom: '20px', 
              fontSize: '13px',
              fontWeight: '600',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              Showing <span style={{ color: '#00F0FF', fontWeight: '700' }}>{offers.length}</span> {offers.length === 1 ? 'offer' : 'offers'}
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      padding: isMobile ? '20px' : '24px',
                      background: 'rgba(2, 6, 24, 0.4)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '24px',
                      height: '160px',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '200%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent)',
                      animation: 'shimmer 2s infinite'
                    }} />
                  </div>
                ))}
              </div>
            ) : offers.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: isMobile ? '40px 20px' : '60px 40px', 
                background: 'rgba(2, 6, 24, 0.4)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: '0.3' }}>🔍</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                  No offers available for {selectedCrypto}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px' }}>
                  Try selecting a different cryptocurrency or adjusting filters
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {offers.map((offer) => (
                  <div
                    key={offer.offer_id}
                    style={{
                      padding: isMobile ? '20px' : '24px',
                      background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.6) 0%, rgba(7, 19, 39, 0.4) 100%)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(0, 240, 255, 0.15)',
                      borderRadius: '24px',
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: isMobile ? '20px' : '24px',
                      alignItems: isMobile ? 'stretch' : 'center',
                      position: 'relative',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 240, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.15)';
                    }}
                  >
                    {/* Favorite Star */}
                    <button
                      onClick={(e) => toggleFavorite(offer.seller_id, e)}
                      style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: favorites.includes(offer.seller_id) 
                          ? 'rgba(168, 85, 247, 0.15)' 
                          : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${favorites.includes(offer.seller_id) ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        padding: '6px',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.background = favorites.includes(offer.seller_id) 
                          ? 'rgba(168, 85, 247, 0.25)' 
                          : 'rgba(255, 255, 255, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.background = favorites.includes(offer.seller_id) 
                          ? 'rgba(168, 85, 247, 0.15)' 
                          : 'rgba(255, 255, 255, 0.05)';
                      }}
                    >
                      <IoStar 
                        size={16} 
                        color={favorites.includes(offer.seller_id) ? '#A855F7' : 'rgba(255, 255, 255, 0.4)'} 
                        fill={favorites.includes(offer.seller_id) ? '#A855F7' : 'none'}
                      />
                    </button>

                    {/* Seller Info */}
                    <div style={{ flex: '1', minWidth: isMobile ? 'auto' : '220px' }}>
                      <div 
                        onClick={() => fetchSellerProfile(offer.seller_id)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          marginBottom: '8px', 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.querySelector('span').style.color = '#00F0FF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.querySelector('span').style.color = '#fff';
                        }}
                      >
                        <span style={{ 
                          fontSize: '16px', 
                          fontWeight: '700', 
                          color: '#fff', 
                          textDecoration: 'underline',
                          transition: 'color 0.2s ease'
                        }}>
                          {offer.seller_info?.username || 'Anonymous'}
                        </span>
                        {offer.seller_info?.is_verified && 
                          <div title="Verified Seller" style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            background: 'rgba(0, 240, 255, 0.15)',
                            padding: '4px',
                            borderRadius: '6px'
                          }}>
                            <IoShield size={14} color="#00F0FF" />
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
                          <IoShield size={9} />
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
                          <IoFlash size={9} />
                          FAST PAY
                        </div>
                      }
                    </div>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        padding: '4px 0',
                        marginBottom: '8px'
                      }}>
                        <IoStar size={16} color="#FCD34D" fill="#FCD34D" />
                        <span style={{ 
                          color: '#FCD34D', 
                          fontSize: '15px', 
                          fontWeight: '700',
                          textShadow: '0 0 10px rgba(252, 211, 77, 0.3)'
                        }}>
                          {offer.seller_info?.rating?.toFixed(1) || '5.0'}
                        </span>
                      </div>
                      {/* Real trader stats from backend API - NO MOCKS */}
                      <TraderStats userId={offer.seller_id} compact={true} />
                    </div>

                    {/* Price Section */}
                    <div style={{ flex: '1', minWidth: isMobile ? 'auto' : '180px' }}>
                      <div style={{ 
                        color: 'rgba(255, 255, 255, 0.5)', 
                        fontSize: '11px', 
                        marginBottom: '6px',
                        fontWeight: '600',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase'
                      }}>
                        Price
                      </div>
                      <div style={{ 
                        fontSize: '28px', 
                        fontWeight: '900', 
                        background: 'linear-gradient(135deg, #00F0FF 0%, #00C6FF 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        marginBottom: '6px',
                        textShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
                        lineHeight: '1'
                      }}>
                        £{offer.price_per_unit?.toLocaleString()}
                      </div>
                      <div style={{ 
                        color: 'rgba(255, 255, 255, 0.4)', 
                        fontSize: '12px',
                        fontWeight: '400'
                      }}>
                        Price per {selectedCrypto}
                      </div>
                      <div style={{
                        marginTop: '8px',
                        padding: '6px 10px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>Limits:</span>
                        <span style={{ fontSize: '12px', color: '#fff', fontWeight: '600' }}>
                          £{offer.min_order_limit} - £{offer.max_order_limit}
                        </span>
                      </div>
                    </div>

                    {/* Payment Methods */}
                    <div style={{ flex: '1', minWidth: isMobile ? 'auto' : '180px' }}>
                      <div style={{ 
                        color: 'rgba(255, 255, 255, 0.5)', 
                        fontSize: '11px', 
                        marginBottom: '10px',
                        fontWeight: '600',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase'
                      }}>
                        Payment Methods
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {offer.payment_methods?.slice(0, 2).map((method, idx) => (
                          <div
                            key={idx} 
                            style={{ 
                              padding: '8px 14px', 
                              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 240, 255, 0.05) 100%)', 
                              border: '1px solid rgba(0, 240, 255, 0.3)', 
                              borderRadius: '10px', 
                              color: '#00F0FF', 
                              fontSize: '12px', 
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 0 15px rgba(0, 240, 255, 0.1)',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.05)';
                              e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.1)';
                            }}
                          >
                            {method === 'bank_transfer' && '🏦'}
                            {method === 'paypal' && '💳'}
                            {method === 'revolut' && '💜'}
                            {method === 'wise' && '🌐'}
                            {method}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Premium Action Button */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: isMobile ? 'stretch' : 'flex-end', 
                      gap: '8px',
                      minWidth: isMobile ? 'auto' : '160px'
                    }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuyOffer(offer);
                        }}
                        disabled={processing}
                        style={{
                          padding: '14px 28px',
                          background: processing 
                            ? 'rgba(143, 155, 179, 0.3)'
                            : activeTab === 'buy' 
                              ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                              : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                          border: 'none',
                          borderRadius: '14px',
                          color: '#fff',
                          fontSize: '15px',
                          fontWeight: '700',
                          cursor: processing ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                          boxShadow: processing 
                            ? 'none'
                            : activeTab === 'buy' 
                              ? '0 0 25px rgba(16, 185, 129, 0.5)'
                              : '0 0 25px rgba(239, 68, 68, 0.5)',
                          flexShrink: 0,
                          opacity: processing ? 0.6 : 1,
                          transition: 'all 0.3s ease',
                          width: isMobile ? '100%' : 'auto'
                        }}
                        onMouseEnter={(e) => {
                          if (!processing) {
                            e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                            e.currentTarget.style.boxShadow = activeTab === 'buy'
                              ? '0 4px 35px rgba(16, 185, 129, 0.7)'
                              : '0 4px 35px rgba(239, 68, 68, 0.7)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!processing) {
                            e.currentTarget.style.transform = 'scale(1) translateY(0)';
                            e.currentTarget.style.boxShadow = activeTab === 'buy'
                              ? '0 0 25px rgba(16, 185, 129, 0.5)'
                              : '0 0 25px rgba(239, 68, 68, 0.5)';
                          }
                        }}
                      >
                        {processing ? 'Matching...' : `${activeTab === 'buy' ? 'Buy' : 'Sell'} ${selectedCrypto}`}
                      </button>
                      <div style={{
                        fontSize: '11px',
                        color: 'rgba(255, 255, 255, 0.4)',
                        textAlign: isMobile ? 'center' : 'right',
                        maxWidth: '200px',
                        lineHeight: '1.3',
                        fontWeight: '400',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        justifyContent: isMobile ? 'center' : 'flex-end'
                      }}>
                        <span style={{ fontSize: '12px' }}>✨</span>
                        Auto-matched by price & reputation
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                <IoClose size={24} />
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
                  <IoLocation size={14} color="#888" />
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
                      <IoShield size={12} />
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
                      <IoTrophy size={12} />
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
                      <IoFlash size={12} />
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
                    <IoStar size={16} color="#FCD34D" fill="#FCD34D" />
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
        
        {/* Modal removed - using auto-match now */}
        {false && showQuoteModal && currentQuote && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
              border: '1px solid rgba(0, 198, 255, 0.3)',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 0 40px rgba(0, 198, 255, 0.3), 0 8px 32px rgba(0, 0, 0, 0.5)'
            }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #00C6FF, #0099CC)',
                  borderRadius: '16px',
                  marginBottom: '16px',
                  boxShadow: '0 0 20px rgba(0, 198, 255, 0.4)'
                }}>
                  <IoShield size={20} color="#fff" />
                  <span style={{ color: '#fff', fontWeight: '700', fontSize: '16px' }}>
                    LOCKED PRICE QUOTE
                  </span>
                </div>
                <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#FFFFFF', marginBottom: '8px' }}>
                  {currentQuote.tradeType === 'buy' ? 'Confirm Purchase' : 'Confirm Sale'}
                </h2>
              </div>

              {/* Quote Details */}
              <div style={{
                background: 'rgba(0, 198, 255, 0.08)',
                border: '1px solid rgba(0, 198, 255, 0.2)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#8F9BB3', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {currentQuote.tradeType === 'buy' ? "You're Buying" : "You're Selling"}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF' }}>
                    {currentQuote.cryptoAmount} {currentQuote.currency}
                  </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(0, 198, 255, 0.2)', margin: '16px 0' }} />

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#8F9BB3', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Locked Price
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#22C55E' }}>
                    £{currentQuote.locked_price.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8F9BB3', marginTop: '4px' }}>
                    Market: £{currentQuote.market_price_at_quote.toLocaleString()} ({currentQuote.spread_percent}% spread)
                  </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(0, 198, 255, 0.2)', margin: '16px 0' }} />

                <div>
                  <div style={{ fontSize: '13px', color: '#8F9BB3', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {currentQuote.tradeType === 'buy' ? 'Total Cost' : 'You Receive'}
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#00C6FF' }}>
                    £{currentQuote.tradeType === 'buy' 
                      ? (currentQuote.cryptoAmount * currentQuote.locked_price).toFixed(2)
                      : (currentQuote.net_payout || (currentQuote.cryptoAmount * currentQuote.locked_price)).toFixed(2)
                    }
                  </div>
                </div>
              </div>

              {/* Countdown Timer */}
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Clock size={18} color="#EF4444" />
                  <span style={{ fontSize: '14px', color: '#EF4444', fontWeight: '600' }}>
                    Quote expires in: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowQuoteModal(false);
                    setCurrentQuote(null);
                  }}
                  disabled={processing}
                  style={{
                    padding: '16px',
                    background: 'rgba(143, 155, 179, 0.1)',
                    border: '1px solid rgba(143, 155, 179, 0.3)',
                    borderRadius: '12px',
                    color: '#8F9BB3',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmQuote}
                  disabled={processing}
                  style={{
                    padding: '16px',
                    background: processing 
                      ? 'rgba(143, 155, 179, 0.2)' 
                      : 'linear-gradient(135deg, #22C55E, #16A34A)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    boxShadow: processing ? 'none' : '0 0 20px rgba(34, 197, 94, 0.4)',
                    transition: 'all 0.2s'
                  }}
                >
                  {processing ? 'Processing...' : `Confirm ${currentQuote.tradeType === 'buy' ? 'Purchase' : 'Sale'}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}

export default P2PMarketplace;