import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { IoCheckmark as Check, IoCheckmarkCircle, IoFilter as Filter, IoPeople, IoRefresh, IoSearch, IoShield, IoStar as Star, IoTime, IoTrendingDown as TrendingDown, IoTrendingUp } from 'react-icons/io5';
import { BiArrowToTop, BiArrowFromTop } from 'react-icons/bi';;
import { Sparklines, SparklinesLine } from 'react-sparklines';

const API = process.env.REACT_APP_BACKEND_URL;

export default function P2PMarketplacePremium() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCrypto, setSelectedCrypto] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('best_price');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    total_volume: 0,
    active_trades: 0,
    total_users: 0,
    avg_completion: '7 min'
  });

  const cryptos = ['all', 'BTC', 'ETH', 'USDT', 'BNB'];

  useEffect(() => {
    loadMarketplace();
    loadStats();
    
    const interval = setInterval(() => {
      loadMarketplace(true);
    }, 15000);
    
    return () => clearInterval(interval);
  }, [selectedCrypto]);

  const loadMarketplace = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const res = await axios.get(`${API}/api/p2p/marketplace/offers`, {
        params: {
          crypto_currency: selectedCrypto === 'all' ? undefined : selectedCrypto
        }
      });
      
      if (res.data.success) {
        setOrders(res.data.offers || []);
      }
    } catch (error) {
      console.error('Failed to load marketplace:', error);
      if (!silent) {
        toast.error('Failed to load marketplace');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Load platform stats
      const res = await axios.get(`${API}/api/p2p/stats`);
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchQuery || 
      order.seller_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.crypto_currency?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === 'best_price') {
      return a.price_per_unit - b.price_per_unit;
    } else if (sortBy === 'highest_amount') {
      return b.crypto_amount - a.crypto_amount;
    }
    return 0;
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(to bottom, #05060B, #050814)' }}>
          <div className="text-center">
            <IoRefresh className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
            <div className="text-white text-xl">Loading marketplace...</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen pb-12" style={{ background: 'linear-gradient(to bottom, #05060B, #050814)' }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-8">
          
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">P2P Marketplace</h1>
                <p className="text-sm sm:text-base text-gray-400">Trade directly with other users at the best rates</p>
              </div>
              <button 
                onClick={() => navigate('/p2p/create-offer')}
                className="px-6 py-3 rounded-xl font-medium text-white transition-all w-full sm:w-auto"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)' }}
              >
                + Create Offer
              </button>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <div 
                className="rounded-xl p-5"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center">
                    <IoTrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">24h Volume</div>
                </div>
                <div className="text-2xl font-bold text-white">£{stats.total_volume?.toLocaleString() || 0}</div>
              </div>
              
              <div 
                className="rounded-xl p-5"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                    <IoShield className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Active Trades</div>
                </div>
                <div className="text-2xl font-bold text-white">{stats.active_trades || 0}</div>
              </div>
              
              <div 
                className="rounded-xl p-5"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
                    <IoPeople className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Total Users</div>
                </div>
                <div className="text-2xl font-bold text-white">{stats.total_users || 0}</div>
              </div>
              
              <div 
                className="rounded-xl p-5"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center">
                    <IoTime className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Avg Time</div>
                </div>
                <div className="text-2xl font-bold text-white">{stats.avg_completion}</div>
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div 
            className="rounded-2xl p-6 mb-6"
            style={{
              background: '#0B1020',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <div className="flex flex-col md:flex-row gap-4">
              {/* Crypto Filter Pills */}
              <div className="flex flex-wrap gap-2 flex-1">
                {cryptos.map(crypto => (
                  <button
                    key={crypto}
                    onClick={() => setSelectedCrypto(crypto)}
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      selectedCrypto === crypto 
                        ? 'text-white shadow-lg' 
                        : 'text-gray-400 hover:bg-white/5'
                    }`}
                    style={{
                      background: selectedCrypto === crypto 
                        ? 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${selectedCrypto === crypto ? 'transparent' : 'rgba(255, 255, 255, 0.05)'}` 
                    }}
                  >
                    {crypto === 'all' ? 'All Coins' : crypto}
                  </button>
                ))}
              </div>
              
              {/* Search */}
              <div className="relative">
                <IoSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by seller or coin..."
                  className="pl-12 pr-4 py-2.5 rounded-lg text-white w-80"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                />
              </div>
              
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2.5 rounded-lg text-white font-medium"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <option value="best_price">Best Price</option>
                <option value="highest_amount">Highest Amount</option>
              </select>
            </div>
          </div>

          {/* Offers List */}
          <div 
            className="rounded-2xl p-6"
            style={{
              background: '#0B1020',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <h2 className="text-xl font-bold text-white mb-6">Available Offers ({sortedOrders.length})</h2>
            
            {sortedOrders.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center mx-auto mb-4">
                  <IoShield className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No offers available</h3>
                <p className="text-gray-400 text-sm mb-6">Be the first to create an offer</p>
                <button 
                  onClick={() => navigate('/p2p/create-offer')}
                  className="px-6 py-3 rounded-full font-medium text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)' }}
                >
                  Create Offer
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedOrders.map((order, index) => {
                  const priceChange = (Math.random() * 10 - 5);
                  const isPositive = priceChange >= 0;
                  
                  return (
                    <div 
                      key={index}
                      className="rounded-xl p-5 cursor-pointer transition-all duration-200"
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      }}
                      onClick={() => navigate(`/p2p/trade/${order.order_id}`)}
                    >
                      <div className="flex items-center justify-between">
                        {/* Left: Seller Info */}
                        <div className="flex items-center gap-4 flex-1">
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #9333EA 100%)' }}
                          >
                            {order.seller_username?.substring(0, 1) || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-white font-semibold">{order.seller_username || 'Anonymous'}</div>
                              <IoCheckmarkCircle className="w-4 h-4 text-green-400" />
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <span>{order.crypto_currency}</span>
                              <span>•</span>
                              <span>Min: {order.min_purchase} {order.crypto_currency}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Middle: Price & Amount */}
                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <div className="text-xs text-gray-400 mb-1">Price</div>
                            <div className="text-white font-semibold text-lg">£{order.price_per_unit?.toLocaleString()}</div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-xs text-gray-400 mb-1">Available</div>
                            <div className="text-white font-semibold">{order.crypto_amount} {order.crypto_currency}</div>
                          </div>
                          
                          <div>
                            <Sparklines data={Array.from({ length: 20 }, () => Math.random() * 100 + 50)} width={100} height={32}>
                              <SparklinesLine color={isPositive ? '#22C55E' : '#EF4444'} style={{ strokeWidth: 2, fill: 'none' }} />
                            </Sparklines>
                          </div>
                        </div>
                        
                        {/* Right: Action Button */}
                        <button 
                          className="px-6 py-3 rounded-xl font-medium text-white transition-all ml-6"
                          style={{ background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/p2p/trade/${order.order_id}`);
                          }}
                        >
                          Buy {order.crypto_currency}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}