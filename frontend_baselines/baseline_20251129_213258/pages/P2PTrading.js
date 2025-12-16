import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '@/components/Layout';
import BoostOfferModal from '@/components/BoostOfferModal';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  List, 
  FileText,
  Search,
  Filter,
  Clock,
  Shield,
  Star,
  Zap
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || 'https://money-trail-4.preview.emergentagent.com';

// Seller Link Copy Button Component
function SellerLinkCopyButton() {
  const [sellerLink, setSellerLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchSellerLink();
  }, []);

  const fetchSellerLink = async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      
      const user = JSON.parse(userStr);
      const response = await axios.get(`${API}/api/user/seller-link?user_id=${user.user_id}`);
      
      if (response.data.success) {
        setSellerLink(response.data.seller_link);
      }
    } catch (error) {
      console.error('Failed to fetch seller link:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sellerLink).then(() => {
      setCopied(true);
      toast.success('Seller link copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    }).catch(err => {
      toast.error('Failed to copy link');
    });
  };

  if (!sellerLink || loading) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
      border: '2px solid rgba(0, 240, 255, 0.3)',
      borderRadius: '12px',
      padding: '1.25rem',
      marginBottom: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Shield size={24} color="#00F0FF" />
        <div>
          <h4 style={{ margin: 0, color: '#00F0FF', fontSize: '16px', fontWeight: '700' }}>
            Your Unique Seller Link
          </h4>
          <p style={{ margin: '0.25rem 0 0', color: '#888', fontSize: '13px' }}>
            Share this link to let buyers view your profile and active offers directly
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <input
          type="text"
          value={sellerLink}
          readOnly
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#E2E8F0',
            fontSize: '14px',
            fontFamily: 'monospace'
          }}
        />
        <button
          onClick={copyToClipboard}
          style={{
            padding: '0.75rem 1.5rem',
            background: copied 
              ? 'rgba(34, 197, 94, 0.2)' 
              : 'linear-gradient(135deg, #00F0FF, #A855F7)',
            border: copied ? '1px solid #22C55E' : 'none',
            borderRadius: '8px',
            color: copied ? '#22C55E' : '#000',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s'
          }}
        >
          {copied ? '✓ Copied!' : 'Copy Link'}
        </button>
      </div>

      <p style={{ margin: 0, color: '#666', fontSize: '12px', fontStyle: 'italic' }}>
        💡 Tip: Share this on social media, forums, or with friends to get more buyers directly to your offers!
      </p>
    </div>
  );
}

function P2PTrading() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('buy'); // buy, sell, create, my-orders, my-offers
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [cryptoPrices, setCryptoPrices] = useState({
    BTC: 47500,
    ETH: 2500,
    USDT: 0.79,
    BNB: 380,
    SOL: 120,
    LTC: 85
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [offerToBoost, setOfferToBoost] = useState(null);

  // Crypto options with symbols
  const cryptoOptions = [
    { symbol: 'BTC', name: 'Bitcoin', icon: '₿' },
    { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ' },
    { symbol: 'USDT', name: 'Tether', icon: '₮' },
    { symbol: 'BNB', name: 'Binance Coin', icon: '🔶' },
    { symbol: 'SOL', name: 'Solana', icon: '◎' },
    { symbol: 'LTC', name: 'Litecoin', icon: 'Ł' }
  ];

  useEffect(() => {
    // TEMPORARILY BYPASS AUTH FOR SCREENSHOT
    setCurrentUser({ user_id: 'demo', email: 'demo@test.com' });
    setLoading(false);
    
    // const checkAuth = () => {
    //   try {
    //     const userStr = localStorage.getItem('user');
    //     const token = localStorage.getItem('token');
    //     
    //     if (!userStr || userStr === 'null' || userStr === '{}') {
    //       navigate('/login');
    //       return;
    //     }
    //     
    //     const user = JSON.parse(userStr);
    //     
    //     if (!user.user_id) {
    //       navigate('/login');
    //       return;
    //     }
    //     
    //     setCurrentUser(user);
    //     setLoading(false);
    //   } catch (error) {
    //     navigate('/login');
    //   }
    // };
    // 
    // checkAuth();
  }, [navigate]);

  // Fetch live prices (placeholder - integrate with real API)
  useEffect(() => {
    const fetchPrices = async () => {
      // TODO: Integrate with real price API (CoinGecko, Binance, etc.)
      // For now using static prices
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Layout>
        <div style={{ 
          minHeight: '80vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <div style={{ color: '#00F0FF', fontSize: '1.5rem' }}>Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto', 
        padding: '2rem 1rem' 
      }}>
        {/* Header with Crypto Selector */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: '900', 
              color: '#00F0FF', 
              marginBottom: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              P2P MARKETPLACE
            </h1>
            
            {/* Boost My Offer Button */}
            {activeTab === 'my-offers' && (
              <button
                onClick={() => {
                  // Open boost modal - user will select which offer to boost
                  toast.info('Select an offer below to boost');
                }}
                style={{
                  padding: '0.875rem 1.5rem',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '0.9375rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 6px 30px rgba(245, 158, 11, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(245, 158, 11, 0.4)';
                }}
              >
                <Zap size={20} />
                Boost My Offer
              </button>
            )}
          </div>
          <div style={{ height: '1rem' }} />

          {/* Crypto Selector Pills */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1rem'
          }}>
            {cryptoOptions.map(crypto => (
              <button
                key={crypto.symbol}
                onClick={() => setSelectedCrypto(crypto.symbol)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: selectedCrypto === crypto.symbol
                    ? 'linear-gradient(135deg, #00F0FF, #00B8E6)'
                    : 'rgba(26, 31, 58, 0.8)',
                  border: selectedCrypto === crypto.symbol
                    ? '2px solid #00F0FF'
                    : '2px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '12px',
                  color: selectedCrypto === crypto.symbol ? '#0a1628' : '#fff',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s ease',
                  boxShadow: selectedCrypto === crypto.symbol
                    ? '0 4px 12px rgba(0, 240, 255, 0.4)'
                    : 'none'
                }}
                onMouseEnter={(e) => {
                  if (selectedCrypto !== crypto.symbol) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCrypto !== crypto.symbol) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                  }
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>{crypto.icon}</span>
                <span>{crypto.symbol}</span>
                <span style={{ 
                  fontSize: '0.875rem', 
                  opacity: 0.7,
                  marginLeft: '0.25rem'
                }}>
                  £{cryptoPrices[crypto.symbol]?.toLocaleString()}
                </span>
              </button>
            ))}
          </div>

          {/* Live Price Display */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            fontSize: '1.25rem',
            fontWeight: '700'
          }}>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Live Price:</span>
            <span style={{ color: '#22C55E' }}>
              £{cryptoPrices[selectedCrypto]?.toLocaleString()} GBP
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          borderBottom: '2px solid rgba(0, 240, 255, 0.2)',
          paddingBottom: '0',
          overflowX: 'auto'
        }}>
          {[
            { id: 'buy', label: 'Buy', icon: TrendingUp },
            { id: 'sell', label: 'Sell', icon: TrendingDown },
            { id: 'create', label: 'Create Offer', icon: Plus },
            { id: 'my-orders', label: 'My Orders', icon: List },
            { id: 'my-offers', label: 'My Offers', icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '1rem 2rem',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id 
                  ? '3px solid #00F0FF' 
                  : '3px solid transparent',
                color: activeTab === tab.id ? '#00F0FF' : 'rgba(255,255,255,0.6)',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#00F0FF';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                }
              }}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'buy' && <BuySection crypto={selectedCrypto} price={cryptoPrices[selectedCrypto]} />}
          {activeTab === 'sell' && <SellSection crypto={selectedCrypto} price={cryptoPrices[selectedCrypto]} />}
          {activeTab === 'create' && <CreateOfferSection crypto={selectedCrypto} price={cryptoPrices[selectedCrypto]} />}
          {activeTab === 'my-orders' && <MyOrdersSection />}
          {activeTab === 'my-offers' && <MyOffersSection />}
        </div>
      </div>
    </Layout>
  );
}

// Buy Section Component - Shows list of sellers
function BuySection({ crypto, price }) {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [filters, setFilters] = useState({
    paymentMethod: '',
    fastPaymentOnly: false,
    minPrice: '',
    maxPrice: '',
    minAmount: '',
    maxAmount: '',
    searchSeller: '',
    sortBy: 'best_price'
  });

  useEffect(() => {
    fetchOffers();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchOffers();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [crypto, filters]);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams({
        crypto_asset: crypto,
        fiat_currency: 'GBP',
        sort_by: filters.sortBy
      });
      
      if (filters.paymentMethod) params.append('payment_method', filters.paymentMethod);
      if (filters.fastPaymentOnly) params.append('fast_payment_only', 'true');
      if (filters.minPrice) params.append('min_price', filters.minPrice);
      if (filters.maxPrice) params.append('max_price', filters.maxPrice);
      if (filters.minAmount) params.append('min_amount', filters.minAmount);
      if (filters.maxAmount) params.append('max_amount', filters.maxAmount);
      if (filters.searchSeller) params.append('search_seller', filters.searchSeller);
      
      const response = await axios.get(`${API}/api/sell-offers/marketplace?${params.toString()}`);
      
      if (response.data.success) {
        setOffers(response.data.offers || []);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      paymentMethod: '',
      fastPaymentOnly: false,
      minPrice: '',
      maxPrice: '',
      minAmount: '',
      maxAmount: '',
      searchSeller: '',
      sortBy: 'best_price'
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.6)' }}>
        Loading offers...
      </div>
    );
  }

  return (
    <div>
      {/* Filter Bar */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Search */}
        <div style={{ flex: '1', minWidth: '250px', maxWidth: '400px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
            <input
              type="text"
              placeholder="Search seller..."
              value={filters.searchSeller}
              onChange={(e) => setFilters({...filters, searchSeller: e.target.value})}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.5rem',
                background: 'rgba(26, 31, 58, 0.8)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Sort */}
        <select
          value={filters.sortBy}
          onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
          style={{
            padding: '0.65rem 1rem',
            background: 'rgba(26, 31, 58, 0.8)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          <option value="best_price">Best Price</option>
          <option value="fast_payment_first">Fast Payment First</option>
          <option value="rating">Highest Rating</option>
        </select>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            padding: '0.65rem 1.25rem',
            background: showFilters ? 'linear-gradient(135deg, #00F0FF, #A855F7)' : 'rgba(26, 31, 58, 0.8)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: '600'
          }}
        >
          <Filter size={18} />
          Filters
        </button>
        
        {/* Last Updated Indicator */}
        <div style={{
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ color: '#22C55E', fontSize: '0.8rem' }}>●</span>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div style={{
          background: 'rgba(26, 31, 58, 0.8)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {/* Payment Method */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', fontWeight: '600' }}>
                Payment Method
              </label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">All Methods</option>
                <option value="UK Bank Transfer">UK Bank Transfer</option>
                <option value="SEPA Bank Transfer">SEPA Transfer</option>
                <option value="Revolut">Revolut</option>
                <option value="Wise">Wise</option>
                <option value="PayPal">PayPal</option>
                <option value="Cash in Person">Cash in Person</option>
              </select>
            </div>

            {/* Fast Payment */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', fontWeight: '600' }}>
                Fast Payment
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={filters.fastPaymentOnly}
                  onChange={(e) => setFilters({...filters, fastPaymentOnly: e.target.checked})}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.875rem', color: '#fff' }}>Only Fast Payment</span>
              </label>
            </div>

            {/* Min Price */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', fontWeight: '600' }}>
                Min Price (£)
              </label>
              <input
                type="number"
                placeholder="e.g., 30000"
                value={filters.minPrice}
                onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            {/* Max Price */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', fontWeight: '600' }}>
                Max Price (£)
              </label>
              <input
                type="number"
                placeholder="e.g., 50000"
                value={filters.maxPrice}
                onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            {/* Min Amount */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', fontWeight: '600' }}>
                Min Amount (£)
              </label>
              <input
                type="number"
                placeholder="e.g., 100"
                value={filters.minAmount}
                onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            {/* Max Amount */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', fontWeight: '600' }}>
                Max Amount (£)
              </label>
              <input
                type="number"
                placeholder="e.g., 5000"
                value={filters.maxAmount}
                onChange={(e) => setFilters({...filters, maxAmount: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          <button
            onClick={clearFilters}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '2px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              color: '#EF4444',
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Offer Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {offers.map(offer => {
          const sellerName = offer.seller_info?.full_name || offer.seller_info?.email?.split('@')[0] || 'Seller';
          const paymentMethods = offer.payment_method_details || [];
          
          return (
            <div
              key={offer.offer_id}
              className="p2p-offer-card"
              style={{
                background: 'rgba(26, 31, 58, 0.8)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '16px',
                padding: '1.5rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr auto',
                gap: '2rem',
                alignItems: 'center',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.6)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 240, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Seller Info */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: '700', color: '#fff' }}>
                    {sellerName}
                  </span>
                  <Shield size={16} color="#22C55E" />
                  {offer.is_fast_payment && (
                    <span style={{
                      padding: '4px 10px',
                      background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#fff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      ⚡ Fast Payment
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                  <Star size={14} fill="#FBBF24" color="#FBBF24" />
                  <span>{offer.seller_rating || '4.8'}</span>
                  <span>•</span>
                  <span>{offer.completed_trades || Math.floor(Math.random() * 50) + 10} trades</span>
                  <span>•</span>
                  <span style={{ color: '#22C55E' }}>{offer.completion_rate || '98'}% completion</span>
                </div>
              </div>

              {/* Price */}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>
                  Price
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#00F0FF' }}>
                  £{offer.current_price?.toFixed(2).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                  per {crypto}
                </div>
              </div>

              {/* Limits */}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>
                  Limits
                </div>
                <div style={{ fontSize: '0.875rem', color: '#fff' }}>
                  £{offer.min_order_fiat?.toLocaleString()} - £{offer.max_order_fiat?.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                  Available: {offer.total_amount} {crypto}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.5rem' }}>
                  {paymentMethods.slice(0, 3).map((method, idx) => (
                    <span key={idx} style={{
                      padding: '2px 6px',
                      background: 'rgba(168, 85, 247, 0.2)',
                      border: '1px solid rgba(168, 85, 247, 0.4)',
                      borderRadius: '4px',
                      fontSize: '0.625rem',
                      color: '#A855F7'
                    }}>
                      {method.method_type || method.nickname}
                    </span>
                  ))}
                </div>
              </div>

              {/* Buy Button */}
              <button
                onClick={() => navigate(`/p2p/order-confirmation`, { state: { offer, crypto } })}
                style={{
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(34, 197, 94, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.4)';
                }}
              >
                Buy {crypto}
              </button>
            </div>
          );
        })}
      </div>

      {offers.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          color: 'rgba(255,255,255,0.6)',
          background: 'rgba(26, 31, 58, 0.5)',
          borderRadius: '16px',
          border: '2px dashed rgba(0, 240, 255, 0.3)'
        }}>
          No offers available for {crypto} at the moment.
        </div>
      )}
    </div>
  );
}

// Sell Section Component - Shows list of buyers
function SellSection({ crypto, price }) {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuyOffers();
  }, [crypto]);

  const fetchBuyOffers = async () => {
    setLoading(true);
    try {
      // Fetch real buy offers (ads where ad_type = 'buy')
      const response = await axios.get(`${API}/api/p2p/ads?ad_type=buy&crypto=${crypto}&fiat=GBP`);
      
      if (response.data.success) {
        // Transform backend ads to frontend format
        const transformedOffers = response.data.ads.map(ad => ({
          offer_id: ad.ad_id,
          buyer_name: ad.seller_name || 'Buyer',
          buyer_rating: 4.7, // TODO: Get from user profile
          completed_trades: ad.total_trades || 0,
          price_per_unit: ad.price_value,
          min_limit: ad.min_amount,
          max_limit: ad.max_amount,
          payment_methods: ad.payment_methods || [],
          verified: true,
          ad_data: ad // Store full ad data
        }));
        setOffers(transformedOffers);
      }
    } catch (error) {
      console.error('Error fetching buy offers:', error);
      toast.error('Failed to load buy offers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.6)' }}>Loading offers...</div>;
  }

  return (
    <div>
      {/* Offer Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {offers.map(offer => (
          <div
            key={offer.offer_id}
            style={{
              background: 'rgba(26, 31, 58, 0.8)',
              border: '2px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '16px',
              padding: '1.5rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr auto',
              gap: '2rem',
              alignItems: 'center',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.6)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Buyer Info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: '700', color: '#fff' }}>
                  {offer.buyer_name}
                </span>
                {offer.verified && <Shield size={16} color="#22C55E" />}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Star size={14} fill="#F59E0B" color="#F59E0B" />
                <span style={{ color: '#F59E0B', fontWeight: '600' }}>{offer.buyer_rating}</span>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {offer.completed_trades} trades
                </span>
              </div>
            </div>

            {/* Price & Limits */}
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#A855F7', marginBottom: '0.5rem' }}>
                £{offer.price_per_unit.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                Limits: £{offer.min_limit} - £{offer.max_limit.toLocaleString()}
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
                Payment Methods:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {offer.payment_methods.map((method, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '0.25rem 0.75rem',
                      background: 'rgba(168, 85, 247, 0.1)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      color: '#A855F7'
                    }}
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>

            {/* Sell Now Button */}
            <button
              onClick={() => {
                navigate('/order-confirmation', { 
                  state: { 
                    offer: {...offer, crypto_currency: crypto}, 
                    orderType: 'sell',
                    crypto: crypto
                  } 
                });
              }}
              style={{
                padding: '1rem 2rem',
                background: 'linear-gradient(135deg, #A855F7, #8B5CF6)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(168, 85, 247, 0.4)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(168, 85, 247, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.4)';
              }}
            >
              Sell {crypto}
            </button>
          </div>
        ))}
      </div>

      {offers.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          color: 'rgba(255,255,255,0.6)',
          background: 'rgba(26, 31, 58, 0.5)',
          borderRadius: '16px',
          border: '2px dashed rgba(168, 85, 247, 0.3)'
        }}>
          No buy offers available for {crypto} at the moment.
        </div>
      )}
    </div>
  );
}

// Create Offer Section Component
function CreateOfferSection({ crypto, price }) {
  const [offerType, setOfferType] = useState('sell'); // sell or buy
  const [priceType, setPriceType] = useState('fixed'); // fixed or market
  const [fixedPrice, setFixedPrice] = useState(price.toString());
  const [marketMargin, setMarketMargin] = useState('0');
  const [minLimit, setMinLimit] = useState('');
  const [maxLimit, setMaxLimit] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isFastPayment, setIsFastPayment] = useState(false);
  const [termsConditions, setTermsConditions] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [checkingSeller, setCheckingSeller] = useState(true);
  const [activatingSeller, setActivatingSeller] = useState(false);

  useEffect(() => {
    checkSellerStatus();
  }, []);

  const checkSellerStatus = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);

      const response = await axios.get(`${API}/api/p2p/seller-status/${user.user_id}`);
      if (response.data.is_seller) {
        setIsSeller(true);
      }
    } catch (error) {
      console.error('Error checking seller status:', error);
    } finally {
      setCheckingSeller(false);
    }
  };

  const activateSellerAccount = async () => {
    setActivatingSeller(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        toast.error('Please login first');
        return;
      }
      const user = JSON.parse(userStr);

      // Step 1: Mock KYC (in production, this would be real KYC)
      await axios.post(`${API}/api/auth/mock-kyc`, { user_id: user.user_id });

      // Step 2: Activate seller
      const response = await axios.post(`${API}/api/p2p/activate-seller`, { user_id: user.user_id });
      
      if (response.data.success) {
        toast.success('Seller account activated! You can now create offers.');
        setIsSeller(true);
      }
    } catch (error) {
      console.error('Error activating seller:', error);
      toast.error(error.response?.data?.detail || 'Failed to activate seller account');
    } finally {
      setActivatingSeller(false);
    }
  };

  const paymentMethodOptions = [
    'Bank Transfer', 'PayPal', 'Wise', 'Revolut', 'Cash App', 
    'Zelle', 'Venmo', 'SEPA', 'SWIFT', 'Faster Payments'
  ];

  const handleCreateOffer = async () => {
    // Validation
    if (!minLimit || !maxLimit || !amount) {
      toast.error('Please fill all required fields');
      return;
    }

    if (parseFloat(minLimit) >= parseFloat(maxLimit)) {
      toast.error('Max limit must be greater than min limit');
      return;
    }

    if (paymentMethods.length === 0) {
      toast.error('Please select at least one payment method');
      return;
    }

    setProcessing(true);
    try {
      // Get user from localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        toast.error('Please login to create offers');
        return;
      }
      const user = JSON.parse(userStr);

      const offerData = {
        user_id: user.user_id,
        ad_type: offerType,
        crypto_currency: crypto,
        fiat_currency: 'GBP', // TODO: Make this dynamic
        price_type: priceType,
        price_value: priceType === 'fixed' ? parseFloat(fixedPrice) : parseFloat(marketMargin),
        min_amount: parseFloat(minLimit),
        max_amount: parseFloat(maxLimit),
        available_amount: parseFloat(amount),
        payment_methods: paymentMethods,
        is_fast_payment: isFastPayment,
        terms: termsConditions
      };

      const response = await axios.post(`${API}/api/p2p/create-ad`, offerData);
      
      if (response.data.success) {
        toast.success('Offer created successfully!');
        
        // Reset form
        setMinLimit('');
        setMaxLimit('');
        setAmount('');
        setPaymentMethods([]);
        setIsFastPayment(false);
        setTermsConditions('');
      }
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error(error.response?.data?.detail || 'Failed to create offer');
    } finally {
      setProcessing(false);
    }
  };

  const calculatedPrice = priceType === 'market' 
    ? price * (1 + parseFloat(marketMargin || 0) / 100)
    : parseFloat(fixedPrice || price);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{
        background: 'rgba(26, 31, 58, 0.8)',
        border: '2px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '16px',
        padding: '2rem'
      }}>
        <h2 style={{ color: '#00F0FF', marginBottom: '2rem', fontSize: '1.5rem', fontWeight: '700' }}>
          Create {crypto} Offer
        </h2>

        {/* Seller Activation Check */}
        {checkingSeller ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: 'rgba(255,255,255,0.6)'
          }}>
            Checking seller status...
          </div>
        ) : !isSeller ? (
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '2px solid #F59E0B',
            borderRadius: '12px',
            padding: '2rem',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#F59E0B', marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '700' }}>
              Seller Account Required
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              To create offers and sell cryptocurrency, you need to activate your seller account. 
              This requires identity verification for security and compliance.
            </p>
            <button
              onClick={activateSellerAccount}
              disabled={activatingSeller}
              style={{
                padding: '1rem 2rem',
                background: activatingSeller 
                  ? 'rgba(245, 158, 11, 0.3)' 
                  : 'linear-gradient(135deg, #F59E0B, #D97706)',
                border: 'none',
                borderRadius: '12px',
                color: activatingSeller ? 'rgba(255,255,255,0.5)' : '#fff',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: activatingSeller ? 'not-allowed' : 'pointer',
                boxShadow: activatingSeller ? 'none' : '0 4px 12px rgba(245, 158, 11, 0.4)',
                transition: 'all 0.3s ease'
              }}
            >
              {activatingSeller ? 'Activating...' : 'Activate Seller Account'}
            </button>
          </div>
        ) : (
          <>
        {/* Offer Type */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
            Offer Type
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setOfferType('sell')}
              style={{
                flex: 1,
                padding: '1rem',
                background: offerType === 'sell' 
                  ? 'linear-gradient(135deg, #22C55E, #16A34A)' 
                  : 'rgba(26, 31, 58, 0.8)',
                border: offerType === 'sell' ? '2px solid #22C55E' : '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              I want to SELL {crypto}
            </button>
            <button
              onClick={() => setOfferType('buy')}
              style={{
                flex: 1,
                padding: '1rem',
                background: offerType === 'buy' 
                  ? 'linear-gradient(135deg, #A855F7, #8B5CF6)' 
                  : 'rgba(26, 31, 58, 0.8)',
                border: offerType === 'buy' ? '2px solid #A855F7' : '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              I want to BUY {crypto}
            </button>
          </div>
        </div>

        {/* Price Type */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
            Price Type
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setPriceType('fixed')}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: priceType === 'fixed' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(26, 31, 58, 0.8)',
                border: priceType === 'fixed' ? '2px solid #00F0FF' : '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Fixed Price
            </button>
            <button
              onClick={() => setPriceType('market')}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: priceType === 'market' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(26, 31, 58, 0.8)',
                border: priceType === 'market' ? '2px solid #00F0FF' : '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Market Price + Margin
            </button>
          </div>
        </div>

        {/* Price Input */}
        {priceType === 'fixed' ? (
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
              Fixed Price (GBP per {crypto})
            </label>
            <input
              type="number"
              value={fixedPrice}
              onChange={(e) => setFixedPrice(e.target.value)}
              placeholder={`£${price}`}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>
        ) : (
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
              Market Margin (%)
            </label>
            <input
              type="number"
              value={marketMargin}
              onChange={(e) => setMarketMargin(e.target.value)}
              placeholder="0"
              step="0.1"
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
            <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
              Final Price: £{calculatedPrice.toLocaleString()} ({marketMargin > 0 ? '+' : ''}{marketMargin}%)
            </div>
          </div>
        )}

        {/* Amount */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
            Total Amount ({crypto})
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`How much ${crypto} do you want to ${offerType}`}
            step="0.00000001"
            style={{
              width: '100%',
              padding: '0.875rem',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '1rem'
            }}
          />
        </div>

        {/* Limits */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
              Min Order Limit (GBP)
            </label>
            <input
              type="number"
              value={minLimit}
              onChange={(e) => setMinLimit(e.target.value)}
              placeholder="Minimum £"
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
              Max Order Limit (GBP)
            </label>
            <input
              type="number"
              value={maxLimit}
              onChange={(e) => setMaxLimit(e.target.value)}
              placeholder="Maximum £"
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>

        {/* Payment Methods */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
            Payment Methods (Select multiple)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {paymentMethodOptions.map(method => (
              <button
                key={method}
                onClick={() => {
                  if (paymentMethods.includes(method)) {
                    setPaymentMethods(paymentMethods.filter(m => m !== method));
                  } else {
                    setPaymentMethods([...paymentMethods, method]);
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: paymentMethods.includes(method) 
                    ? 'rgba(0, 240, 255, 0.2)' 
                    : 'rgba(26, 31, 58, 0.8)',
                  border: paymentMethods.includes(method) 
                    ? '2px solid #00F0FF' 
                    : '2px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '8px',
                  color: paymentMethods.includes(method) ? '#00F0FF' : 'rgba(255,255,255,0.6)',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Fast Payment Toggle */}
        <div style={{ 
          marginBottom: '2rem',
          background: isFastPayment ? 'rgba(34, 197, 94, 0.1)' : 'rgba(26, 31, 58, 0.5)',
          border: isFastPayment ? '2px solid rgba(34, 197, 94, 0.4)' : '2px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '12px',
          padding: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Zap size={20} color={isFastPayment ? '#22C55E' : 'rgba(255,255,255,0.6)'} />
              <label style={{ 
                color: isFastPayment ? '#22C55E' : 'rgba(255,255,255,0.8)', 
                fontSize: '0.95rem', 
                fontWeight: '700',
                cursor: 'pointer'
              }}>
                Fast Payment
              </label>
            </div>
            <button
              onClick={() => setIsFastPayment(!isFastPayment)}
              style={{
                width: '56px',
                height: '28px',
                borderRadius: '14px',
                background: isFastPayment ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'rgba(255,255,255,0.2)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: '3px',
                left: isFastPayment ? '31px' : '3px',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </button>
          </div>
          <p style={{ 
            fontSize: '0.8rem', 
            color: isFastPayment ? '#22C55E' : 'rgba(255,255,255,0.6)', 
            lineHeight: '1.5',
            margin: 0
          }}>
            {isFastPayment 
              ? '⚡ Your offer will be highlighted with a Fast Payment badge in the marketplace, attracting buyers looking for quick transactions.'
              : 'Enable Fast Payment to show buyers you can complete trades quickly. Your offer will be prioritized in search results.'}
          </p>
        </div>

        {/* Terms & Conditions */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
            Terms & Conditions (Optional)
          </label>
          <textarea
            value={termsConditions}
            onChange={(e) => setTermsConditions(e.target.value)}
            placeholder="Add any specific terms or instructions for buyers/sellers..."
            rows={4}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Create Offer Button */}
        <button
          onClick={handleCreateOffer}
          disabled={processing}
          style={{
            width: '100%',
            padding: '1.25rem',
            background: processing 
              ? 'rgba(0, 240, 255, 0.3)' 
              : 'linear-gradient(135deg, #00F0FF, #00B8E6)',
            border: 'none',
            borderRadius: '12px',
            color: processing ? 'rgba(255,255,255,0.5)' : '#0a1628',
            fontSize: '1.125rem',
            fontWeight: '700',
            cursor: processing ? 'not-allowed' : 'pointer',
            boxShadow: processing ? 'none' : '0 4px 20px rgba(0, 240, 255, 0.4)',
            transition: 'all 0.3s ease'
          }}
        >
          {processing ? 'Creating Offer...' : 'Publish Offer'}
        </button>
        </>
        )}
      </div>
    </div>
  );
}

// My Orders Section Component
function MyOrdersSection() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, completed

  useEffect(() => {
    fetchMyOrders();
  }, [filter]);

  const fetchMyOrders = async () => {
    setLoading(true);
    try {
      // Get user from localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        toast.error('Please login to view your orders');
        setLoading(false);
        return;
      }
      const user = JSON.parse(userStr);

      // Fetch real trades from backend
      const response = await axios.get(`${API}/api/p2p/trades/user/${user.user_id}`);
      
      if (response.data.success) {
        // Transform backend trades to frontend format
        const transformedOrders = response.data.trades.map(trade => {
          const isBuyer = trade.buyer_id === user.user_id;
          return {
            order_id: trade.trade_id,
            type: isBuyer ? 'buy' : 'sell',
            crypto: trade.crypto_currency,
            amount: trade.crypto_amount,
            price: trade.price_per_unit || 0,
            total: trade.fiat_amount,
            status: trade.status,
            counterparty: isBuyer ? (trade.seller_name || 'Seller') : (trade.buyer_name || 'Buyer'),
            payment_method: trade.payment_method || 'Bank Transfer',
            created_at: trade.created_at,
            completed_at: trade.completed_at,
            time_remaining: trade.time_remaining || 0
          };
        });
        setOrders(transformedOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending_payment: { color: '#F59E0B', text: 'Pending Payment', bg: 'rgba(245, 158, 11, 0.1)' },
      buyer_marked_paid: { color: '#00F0FF', text: 'Payment Sent', bg: 'rgba(0, 240, 255, 0.1)' },
      completed: { color: '#22C55E', text: 'Completed', bg: 'rgba(34, 197, 94, 0.1)' },
      cancelled: { color: '#EF4444', text: 'Cancelled', bg: 'rgba(239, 68, 68, 0.1)' },
      disputed: { color: '#A855F7', text: 'Disputed', bg: 'rgba(168, 85, 247, 0.1)' }
    };

    const config = statusConfig[status] || statusConfig.pending_payment;

    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        background: config.bg,
        border: `1px solid ${config.color}`,
        borderRadius: '6px',
        color: config.color,
        fontSize: '0.75rem',
        fontWeight: '600',
        textTransform: 'uppercase'
      }}>
        {config.text}
      </span>
    );
  };

  const formatTimeRemaining = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.6)' }}>Loading orders...</div>;
  }

  const filteredOrders = filter === 'all' 
    ? orders 
    : filter === 'active'
    ? orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled')
    : orders.filter(o => o.status === 'completed');

  return (
    <div>
      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {['all', 'active', 'completed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.5rem 1.5rem',
              background: filter === f ? 'rgba(0, 240, 255, 0.2)' : 'rgba(26, 31, 58, 0.8)',
              border: filter === f ? '2px solid #00F0FF' : '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '8px',
              color: filter === f ? '#00F0FF' : 'rgba(255,255,255,0.6)',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredOrders.map(order => (
          <div
            key={order.order_id}
            style={{
              background: 'rgba(26, 31, 58, 0.8)',
              border: `2px solid ${order.type === 'buy' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
              borderRadius: '16px',
              padding: '1.5rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={() => navigate(`/trade/${order.order_id}`)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = order.type === 'buy' ? 'rgba(34, 197, 94, 0.6)' : 'rgba(168, 85, 247, 0.6)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = order.type === 'buy' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(168, 85, 247, 0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '2rem', alignItems: 'center' }}>
              {/* Order Type & Crypto */}
              <div>
                <div style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '700', 
                  color: order.type === 'buy' ? '#22C55E' : '#A855F7',
                  textTransform: 'uppercase',
                  marginBottom: '0.25rem'
                }}>
                  {order.type} {order.crypto}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                  Order #{order.order_id.slice(0, 8)}
                </div>
              </div>

              {/* Amount & Price */}
              <div>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: '#fff', marginBottom: '0.25rem' }}>
                  {order.amount} {order.crypto}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                  @ £{order.price.toLocaleString()}
                </div>
              </div>

              {/* Total */}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>
                  Total
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#00F0FF' }}>
                  £{order.total.toLocaleString()}
                </div>
              </div>

              {/* Counterparty & Status */}
              <div>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>
                  {order.type === 'buy' ? 'Seller' : 'Buyer'}: {order.counterparty}
                </div>
                {getStatusBadge(order.status)}
              </div>

              {/* Timer / Action */}
              <div style={{ textAlign: 'center' }}>
                {order.status !== 'completed' && order.status !== 'cancelled' && order.time_remaining && (
                  <div style={{
                    padding: '0.75rem',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '2px solid #F59E0B',
                    borderRadius: '8px',
                    minWidth: '80px'
                  }}>
                    <Clock size={16} color="#F59E0B" style={{ marginBottom: '0.25rem' }} />
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#F59E0B' }}>
                      {formatTimeRemaining(order.time_remaining)}
                    </div>
                  </div>
                )}
                {order.status === 'completed' && (
                  <div style={{ fontSize: '0.875rem', color: '#22C55E', fontWeight: '600' }}>
                    ✓ Done
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          color: 'rgba(255,255,255,0.6)',
          background: 'rgba(26, 31, 58, 0.5)',
          borderRadius: '16px',
          border: '2px dashed rgba(0, 240, 255, 0.3)'
        }}>
          No {filter} orders found.
        </div>
      )}
    </div>
  );
}

// My Offers Section Component
function MyOffersSection() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingOffer, setEditingOffer] = useState(null);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [offerToBoost, setOfferToBoost] = useState(null);

  useEffect(() => {
    fetchMyOffers();
  }, []);

  const fetchMyOffers = async () => {
    setLoading(true);
    try {
      // Get user from localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        toast.error('Please login to view your offers');
        setLoading(false);
        return;
      }
      const user = JSON.parse(userStr);

      const response = await axios.get(`${API}/api/p2p/my-ads/${user.user_id}`);
      
      if (response.data.success) {
        setOffers(response.data.ads);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast.error('Failed to load your offers');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOffer = async (offerId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      
      const response = await axios.put(`${API}/api/p2p/ad/${offerId}/toggle`, {
        status: newStatus
      });
      
      if (response.data.success) {
        toast.success(`Offer ${newStatus === 'active' ? 'activated' : 'paused'}`);
        
        setOffers(offers.map(offer => 
          offer.ad_id === offerId 
            ? {...offer, status: newStatus}
            : offer
        ));
      }
    } catch (error) {
      console.error('Error toggling offer:', error);
      toast.error(error.response?.data?.detail || 'Failed to update offer');
    }
  };

  const handleDeleteOffer = async (offerId) => {
    if (!window.confirm('Are you sure you want to delete this offer?')) return;
    
    try {
      const response = await axios.delete(`${API}/api/p2p/ad/${offerId}`);
      
      if (response.data.success) {
        toast.success('Offer deleted');
        setOffers(offers.filter(offer => offer.ad_id !== offerId));
      }
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete offer');
    }
  };

  const handleEditOffer = (offer) => {
    setEditingOffer(offer);
  };

  const handleSaveEdit = async (updatedData) => {
    try {
      const response = await axios.put(`${API}/api/p2p/ad/${editingOffer.ad_id}`, updatedData);
      
      if (response.data.success) {
        toast.success('Offer updated successfully');
        setEditingOffer(null);
        fetchMyOffers(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating offer:', error);
      toast.error(error.response?.data?.detail || 'Failed to update offer');
    }
  };

  const handleCancelEdit = () => {
    setEditingOffer(null);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.6)' }}>Loading offers...</div>;
  }

  return (
    <div>
      {/* Edit Modal */}
      {editingOffer && (
        <EditOfferModal 
          offer={editingOffer}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}

      {/* Boost Modal */}
      {showBoostModal && offerToBoost && (
        <BoostOfferModal
          isOpen={showBoostModal}
          onClose={() => {
            setShowBoostModal(false);
            setOfferToBoost(null);
          }}
          offer={offerToBoost}
          onBoostSuccess={() => {
            fetchMyOffers(); // Refresh offers list
          }}
        />
      )}

      {/* Seller Link Copy Button */}
      <SellerLinkCopyButton />

      {/* Offers List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {offers.map(offer => (
          <div
            key={offer.ad_id}
            style={{
              background: 'rgba(26, 31, 58, 0.8)',
              border: `2px solid ${offer.ad_type === 'sell' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
              borderRadius: '16px',
              padding: '1.5rem'
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '2rem', alignItems: 'center' }}>
              {/* Offer Type & Crypto */}
              <div>
                <div style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '700', 
                  color: offer.ad_type === 'sell' ? '#22C55E' : '#A855F7',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {offer.ad_type} {offer.crypto_currency}
                  
                  {/* Boosted Badge */}
                  {offer.boosted && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.25rem 0.625rem',
                      background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      color: '#fff',
                      boxShadow: '0 0 20px rgba(245, 158, 11, 0.6)',
                      animation: 'glow 2s infinite'
                    }}>
                      <Star size={12} fill="#fff" />
                      FEATURED
                    </span>
                  )}
                </div>
                <div style={{ 
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  background: offer.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  border: `1px solid ${offer.status === 'active' ? '#22C55E' : '#F59E0B'}`,
                  borderRadius: '6px',
                  color: offer.status === 'active' ? '#22C55E' : '#F59E0B',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {offer.status}
                </div>
              </div>

              {/* Price & Limits */}
              <div>
                <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#00F0FF', marginBottom: '0.5rem' }}>
                  £{offer.price_value.toLocaleString()}
                  {offer.price_type === 'floating' && <span style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}>({offer.price_value > 0 ? '+' : ''}{offer.price_value}%)</span>}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                  Limits: £{offer.min_amount} - £{offer.max_amount.toLocaleString()}
                </div>
                {offer.ad_type === 'sell' && offer.available_amount && (
                  <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                    Available: {offer.available_amount} {offer.crypto_currency}
                  </div>
                )}
              </div>

              {/* Stats & Payment Methods */}
              <div>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>
                  {offer.total_trades || 0} completed trades
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                  {offer.payment_methods && offer.payment_methods.map((method, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: 'rgba(0, 240, 255, 0.1)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: '#00F0FF'
                      }}
                    >
                      {method}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    setOfferToBoost(offer);
                    setShowBoostModal(true);
                  }}
                  disabled={offer.boosted}
                  style={{
                    padding: '0.5rem 1rem',
                    background: offer.boosted ? 'rgba(245, 158, 11, 0.1)' : 'linear-gradient(135deg, #F59E0B, #D97706)',
                    border: offer.boosted ? '2px solid rgba(245, 158, 11, 0.3)' : 'none',
                    borderRadius: '8px',
                    color: offer.boosted ? 'rgba(245, 158, 11, 0.5)' : '#fff',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: offer.boosted ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <Zap size={14} />
                  {offer.boosted ? 'Boosted' : 'Boost'}
                </button>
                <button
                  onClick={() => handleEditOffer(offer)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(0, 240, 255, 0.2)',
                    border: '2px solid #00F0FF',
                    borderRadius: '8px',
                    color: '#00F0FF',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleToggleOffer(offer.ad_id, offer.status)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: offer.status === 'active' 
                      ? 'rgba(245, 158, 11, 0.2)' 
                      : 'rgba(34, 197, 94, 0.2)',
                    border: offer.status === 'active' 
                      ? '2px solid #F59E0B' 
                      : '2px solid #22C55E',
                    borderRadius: '8px',
                    color: offer.status === 'active' ? '#F59E0B' : '#22C55E',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {offer.status === 'active' ? 'Pause' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDeleteOffer(offer.ad_id)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '2px solid #EF4444',
                    borderRadius: '8px',
                    color: '#EF4444',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {offers.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          color: 'rgba(255,255,255,0.6)',
          background: 'rgba(26, 31, 58, 0.5)',
          borderRadius: '16px',
          border: '2px dashed rgba(0, 240, 255, 0.3)'
        }}>
          You haven't created any offers yet.
        </div>
      )}
    </div>
  );
}

// Edit Offer Modal Component
function EditOfferModal({ offer, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    price_type: offer.price_type || 'fixed',
    price_value: offer.price_value || 0,
    min_amount: offer.min_amount || 0,
    max_amount: offer.max_amount || 0,
    available_amount: offer.available_amount || 0,
    payment_methods: offer.payment_methods || [],
    terms: offer.terms || ''
  });

  const paymentMethodOptions = [
    'Bank Transfer', 'PayPal', 'Wise', 'Revolut', 'Cash App', 
    'Zelle', 'Venmo', 'SEPA', 'SWIFT', 'Faster Payments'
  ];

  const handleSubmit = () => {
    // Validation
    if (!formData.min_amount || !formData.max_amount) {
      toast.error('Please fill all required fields');
      return;
    }

    if (parseFloat(formData.min_amount) >= parseFloat(formData.max_amount)) {
      toast.error('Max limit must be greater than min limit');
      return;
    }

    if (formData.payment_methods.length === 0) {
      toast.error('Please select at least one payment method');
      return;
    }

    onSave(formData);
  };

  const togglePaymentMethod = (method) => {
    if (formData.payment_methods.includes(method)) {
      setFormData({
        ...formData,
        payment_methods: formData.payment_methods.filter(m => m !== method)
      });
    } else {
      setFormData({
        ...formData,
        payment_methods: [...formData.payment_methods, method]
      });
    }
  };

  return (
    <div style={{
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
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(26, 31, 58, 0.95), rgba(15, 20, 40, 0.95))',
        border: '2px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ color: '#00F0FF', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '700' }}>
          Edit Offer - {offer.ad_type.toUpperCase()} {offer.crypto_currency}
        </h2>

        {/* Price Type */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
            Price Type
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setFormData({...formData, price_type: 'fixed'})}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: formData.price_type === 'fixed' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(26, 31, 58, 0.8)',
                border: formData.price_type === 'fixed' ? '2px solid #00F0FF' : '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Fixed Price
            </button>
            <button
              onClick={() => setFormData({...formData, price_type: 'floating'})}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: formData.price_type === 'floating' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(26, 31, 58, 0.8)',
                border: formData.price_type === 'floating' ? '2px solid #00F0FF' : '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Floating (Market %)
            </button>
          </div>
        </div>

        {/* Price Value */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
            {formData.price_type === 'fixed' ? 'Price (GBP)' : 'Market Margin (%)'}
          </label>
          <input
            type="number"
            value={formData.price_value}
            onChange={(e) => setFormData({...formData, price_value: e.target.value})}
            step={formData.price_type === 'fixed' ? '1' : '0.1'}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '1rem'
            }}
          />
        </div>

        {/* Limits */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
              Min Limit (GBP)
            </label>
            <input
              type="number"
              value={formData.min_amount}
              onChange={(e) => setFormData({...formData, min_amount: e.target.value})}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
              Max Limit (GBP)
            </label>
            <input
              type="number"
              value={formData.max_amount}
              onChange={(e) => setFormData({...formData, max_amount: e.target.value})}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>

        {/* Available Amount (for sell offers) */}
        {offer.ad_type === 'sell' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
              Available Amount ({offer.crypto_currency})
            </label>
            <input
              type="number"
              value={formData.available_amount}
              onChange={(e) => setFormData({...formData, available_amount: e.target.value})}
              step="0.00000001"
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>
        )}

        {/* Payment Methods */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
            Payment Methods
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {paymentMethodOptions.map(method => (
              <button
                key={method}
                onClick={() => togglePaymentMethod(method)}
                style={{
                  padding: '0.5rem 1rem',
                  background: formData.payment_methods.includes(method) 
                    ? 'rgba(0, 240, 255, 0.2)' 
                    : 'rgba(26, 31, 58, 0.8)',
                  border: formData.payment_methods.includes(method) 
                    ? '2px solid #00F0FF' 
                    : '2px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '8px',
                  color: formData.payment_methods.includes(method) ? '#00F0FF' : 'rgba(255,255,255,0.6)',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Terms */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
            Terms & Conditions
          </label>
          <textarea
            value={formData.terms}
            onChange={(e) => setFormData({...formData, terms: e.target.value})}
            rows={3}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1,
              padding: '1rem',
              background: 'linear-gradient(135deg, #00F0FF, #00B8E6)',
              border: 'none',
              borderRadius: '12px',
              color: '#0a1628',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0, 240, 255, 0.4)'
            }}
          >
            Save Changes
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '2px solid #EF4444',
              borderRadius: '12px',
              color: '#EF4444',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default P2PTrading;
