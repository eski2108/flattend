import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '@/components/Layout';
import { generateTradingPairs, getCoinName } from '@/config/tradingPairs';
import { getCryptoEmoji, getCryptoColor } from '@/utils/cryptoIcons';
import { IoSearchOutline, IoStarOutline, IoStar } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL || '';

export default function MobileMarketSelection() {
  const navigate = useNavigate();
  const [tradingPairs, setTradingPairs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem('favoritePairs');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
    fetchTradingPairs();
  }, []);

  const fetchTradingPairs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/prices/live`);
      
      if (response.data.success && response.data.prices) {
        const pairs = generateTradingPairs(response.data.prices);
        
        // Enrich pairs with live price data
        const enrichedPairs = pairs.map(pair => {
          const priceData = response.data.prices[pair.base];
          return {
            ...pair,
            lastPrice: priceData?.price_usd || 0,
            change24h: priceData?.change_24h || 0,
            volume24h: priceData?.volume_24h || 0,
            high24h: priceData?.high_24h || 0,
            low24h: priceData?.low_24h || 0,
            marketCap: priceData?.market_cap || 0
          };
        });
        
        setTradingPairs(enrichedPairs);
      }
    } catch (error) {
      console.error('Error fetching trading pairs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (symbol, event) => {
    event.stopPropagation();
    let newFavorites;
    if (favorites.includes(symbol)) {
      newFavorites = favorites.filter(fav => fav !== symbol);
    } else {
      newFavorites = [...favorites, symbol];
    }
    setFavorites(newFavorites);
    localStorage.setItem('favoritePairs', JSON.stringify(newFavorites));
  };

  // Filter pairs based on search and active tab
  const filteredPairs = tradingPairs.filter(pair => {
    const matchesSearch = searchQuery === '' || 
      pair.base.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pair.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeTab === 'favorites') {
      return favorites.includes(pair.symbol);
    }
    // For 'gainers' and 'all' tabs, show all matching coins
    return true;
  });

  // Sort by different criteria based on active tab
  const sortedPairs = [...filteredPairs].sort((a, b) => {
    if (activeTab === 'gainers') {
      // Sort by highest % change (top 20 gainers)
      return b.change24h - a.change24h;
    }
    return b.volume24h - a.volume24h; // Default: sort by volume
  });

  const handlePairSelect = (pair) => {
    navigate(`/trading/${pair.symbol}`);
  };

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'gainers', label: 'Top Gainers' }
  ];

  return (
    <Layout>
      <style>
        {`
          .main-content {
            padding: 0 !important;
            margin: 0 !important;
          }
        `}
      </style>
      <div style={{
        maxWidth: '430px',
        width: '100%',
        margin: '0 auto',
        background: '#020617',
        minHeight: '100vh',
        paddingTop: '0',
        paddingBottom: '60px'
      }}>
        {/* Search Bar */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: '#020617',
          padding: '12px 16px',
          zIndex: 10,
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{
            position: 'relative',
            width: '100%'
          }}>
            <IoSearchOutline style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '20px',
              color: '#0FF2F2',
              pointerEvents: 'none'
            }} />
            <input
              type="text"
              placeholder="Search coins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '14px',
                background: '#0A0F1F',
                border: '1px solid rgba(15,242,242,0.2)',
                padding: '0 16px 0 48px',
                color: '#FFFFFF',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 200ms ease'
              }}
              onFocus={(e) => {
                e.target.style.border = '1px solid rgba(15,242,242,0.5)';
                e.target.style.boxShadow = '0 0 16px rgba(15,242,242,0.2)';
              }}
              onBlur={(e) => {
                e.target.style.border = '1px solid rgba(15,242,242,0.2)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 16px',
          background: '#020617',
          position: 'sticky',
          top: '72px',
          zIndex: 9,
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                height: '36px',
                borderRadius: '10px',
                background: activeTab === tab.id 
                  ? 'linear-gradient(135deg, #0FF2F2 0%, #00B8D4 100%)'
                  : '#0A0F1F',
                color: activeTab === tab.id ? '#020617' : '#8F9BB3',
                border: activeTab === tab.id 
                  ? 'none' 
                  : '1px solid rgba(255,255,255,0.12)',
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? '700' : '600',
                cursor: 'pointer',
                transition: 'all 200ms ease',
                boxShadow: activeTab === tab.id 
                  ? '0 0 16px rgba(15,242,242,0.4)'
                  : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Coin List */}
        <div style={{
          width: '100%'
        }}>
          {loading ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#0FF2F2',
              padding: '60px 20px',
              fontSize: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(15,242,242,0.2)',
                borderTop: '3px solid #0FF2F2',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 1s linear infinite'
              }}></div>
              Loading markets...
              <style>
                {`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}
              </style>
            </div>
          ) : sortedPairs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#8F9BB3',
              padding: '60px 20px',
              fontSize: '15px'
            }}>
              {activeTab === 'favorites' 
                ? 'No favorites yet. Tap the star icon to add pairs.'
                : 'No markets found'}
            </div>
          ) : (
            sortedPairs.map((pair) => (
              <div
                key={pair.symbol}
                onClick={() => handlePairSelect(pair)}
                style={{
                  height: '68px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  background: 'transparent',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(15,242,242,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Favorite Star */}
                <div
                  onClick={(e) => toggleFavorite(pair.symbol, e)}
                  style={{
                    marginRight: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px'
                  }}
                >
                  {favorites.includes(pair.symbol) ? (
                    <IoStar style={{ fontSize: '20px', color: '#FFD700' }} />
                  ) : (
                    <IoStarOutline style={{ fontSize: '20px', color: '#8F9BB3' }} />
                  )}
                </div>

                {/* Official Crypto Logo */}
                <img
                  src={`/crypto-logos/${pair.base.toLowerCase()}.png`}
                  alt={pair.base}
                  style={{
                    width: '28px',
                    height: '28px',
                    objectFit: 'contain',
                    marginRight: '12px'
                  }}
                />

                {/* Symbol & Name */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#FFFFFF',
                    marginBottom: '3px'
                  }}>
                    {pair.base}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.5)'
                  }}>
                    {pair.fullName}
                  </div>
                </div>

                {/* Price & Change */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#FFFFFF',
                    marginBottom: '3px'
                  }}>
                    {pair.lastPrice > 0 
                      ? `$${pair.lastPrice >= 1 
                          ? pair.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : pair.lastPrice.toFixed(6)}`
                      : '—'}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: pair.change24h >= 0 ? '#00FF94' : '#FF4B4B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '2px'
                  }}>
                    <span>{pair.change24h >= 0 ? '▲' : '▼'}</span>
                    <span>{pair.change24h >= 0 ? '+' : ''}{pair.change24h.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
