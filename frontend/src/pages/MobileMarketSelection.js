import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { generateTradingPairs, getCoinName } from '@/config/tradingPairs';
import { getCryptoEmoji, getCryptoColor } from '@/utils/cryptoIcons';
import { IoSearchOutline, IoStarOutline, IoStar, IoTrendingUp, IoSwapHorizontal, IoChevronUp, IoChevronDown } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL || '';

export default function MobileMarketSelection() {
  const navigate = useNavigate();
  const [tradingPairs, setTradingPairs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [isDesktop, setIsDesktop] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [sortColumn, setSortColumn] = useState('volume24h');
  const [sortDirection, setSortDirection] = useState('desc');
  const [quoteFilter, setQuoteFilter] = useState('USD');
  const [marketSummary, setMarketSummary] = useState({
    totalMarketCap: 0,
    totalVolume24h: 0,
    btcDominance: 0,
    topGainer: null,
    topLoser: null
  });

  // Detect desktop vs mobile
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth > 768);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

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
            marketCap: priceData?.market_cap || 0,
            circulatingSupply: priceData?.circulating_supply || 0
          };
        });
        
        setTradingPairs(enrichedPairs);
        
        // Calculate market summary from real data
        if (enrichedPairs.length > 0) {
          const totalMarketCap = enrichedPairs.reduce((sum, p) => sum + (p.marketCap || 0), 0);
          const totalVolume24h = enrichedPairs.reduce((sum, p) => sum + (p.volume24h || 0), 0);
          
          // Find BTC for dominance calculation
          const btcPair = enrichedPairs.find(p => p.base === 'BTC');
          const btcDominance = btcPair && totalMarketCap > 0 
            ? ((btcPair.marketCap / totalMarketCap) * 100) 
            : 0;
          
          // Find top gainer and loser
          const sortedByChange = [...enrichedPairs].sort((a, b) => b.change24h - a.change24h);
          const topGainer = sortedByChange[0];
          const topLoser = sortedByChange[sortedByChange.length - 1];
          
          setMarketSummary({
            totalMarketCap,
            totalVolume24h,
            btcDominance,
            topGainer,
            topLoser
          });
          
          // Set first coin as selected for info panel
          if (!selectedCoin) {
            setSelectedCoin(enrichedPairs[0]);
          }
        }
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

  // Handle column sorting
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
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

  // Sort pairs based on selected column
  const sortedPairs = [...filteredPairs].sort((a, b) => {
    if (activeTab === 'gainers') {
      return b.change24h - a.change24h;
    }
    
    let aVal = a[sortColumn] || 0;
    let bVal = b[sortColumn] || 0;
    
    if (sortDirection === 'asc') {
      return aVal - bVal;
    }
    return bVal - aVal;
  });

  const handlePairSelect = (pair) => {
    if (isDesktop) {
      setSelectedCoin(pair);
    }
    // Desktop goes to /spot-trading, Mobile goes to /trading/:symbol
    if (isDesktop) {
      navigate(`/spot-trading?pair=${pair.symbol}`);
    } else {
      navigate(`/trading/${pair.symbol}`);
    }
  };

  // Format large numbers
  const formatNumber = (num) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  // Sparkline component - taller and more visible
  const Sparkline = ({ positive, large = false }) => {
    const color = positive ? '#00E599' : '#FF5C5C';
    const height = large ? 48 : 32;
    const width = large ? 100 : 70;
    const points = positive 
      ? `0,${height-4} ${width*0.15},${height-8} ${width*0.3},${height-12} ${width*0.45},${height-10} ${width*0.6},${height-18} ${width*0.75},${height-14} ${width},4`
      : `0,4 ${width*0.15},8 ${width*0.3},14 ${width*0.45},10 ${width*0.6},${height-12} ${width*0.75},${height-8} ${width},${height-4}`;
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={`sparkGrad${positive ? 'Up' : 'Down'}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'gainers', label: 'Top Gainers' }
  ];

  // Column header component with sorting
  const SortableHeader = ({ column, label, width }) => (
    <div 
      onClick={() => handleSort(column)}
      style={{ 
        textAlign: 'right', 
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '4px',
        width: width || 'auto'
      }}
    >
      <span>{label}</span>
      {sortColumn === column && (
        sortDirection === 'desc' ? <IoChevronDown size={12} /> : <IoChevronUp size={12} />
      )}
    </div>
  );

  return (
    <>
      <div style={{
        maxWidth: isDesktop ? '100%' : '430px',
        width: '100%',
        margin: '0 auto',
        background: isDesktop ? 'radial-gradient(circle at top, #0E1626 0%, #070B14 60%)' : '#020617',
        minHeight: '100vh',
        paddingTop: '0',
        paddingBottom: '60px',
        display: isDesktop ? 'flex' : 'block'
      }}>
        {/* Main Content Area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Page Title - Desktop Only */}
          {isDesktop && (
            <div style={{
              padding: '24px 32px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#FFFFFF',
                margin: 0
              }}>Markets</h1>
              <p style={{
                fontSize: '14px',
                color: '#8F9BB3',
                margin: '8px 0 0'
              }}>Select a trading pair to view chart and trade</p>
            </div>
          )}

          {/* MARKET SUMMARY STRIP - Desktop Only */}
          {isDesktop && !loading && (
            <div style={{
              margin: '16px 32px',
              padding: '18px 24px',
              background: 'linear-gradient(180deg, #0B1220 0%, #0E1626 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '14px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              {/* Total Market Cap - only show if > 0 */}
              {marketSummary.totalMarketCap > 0 && (
                <div>
                  <div style={{ fontSize: '11px', color: '#8B9BB4', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Market Cap</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#FFFFFF' }}>
                    {formatNumber(marketSummary.totalMarketCap)}
                  </div>
                </div>
              )}
              
              {/* 24h Volume - only show if > 0 */}
              {marketSummary.totalVolume24h > 0 && (
                <div>
                  <div style={{ fontSize: '11px', color: '#8B9BB4', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>24h Volume</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#FFFFFF' }}>
                    {formatNumber(marketSummary.totalVolume24h)}
                  </div>
                </div>
              )}
              
              {/* BTC Dominance - only show if > 0 */}
              {marketSummary.btcDominance > 0 && (
                <div>
                  <div style={{ fontSize: '11px', color: '#8B9BB4', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>BTC Dominance</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#F7931A' }}>
                    {marketSummary.btcDominance.toFixed(1)}%
                  </div>
                </div>
              )}
              
              {/* Top Gainer - only show if exists and positive */}
              {marketSummary.topGainer && marketSummary.topGainer.change24h > 0 && (
                <div>
                  <div style={{ fontSize: '11px', color: '#8B9BB4', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top Gainer</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img 
                      src={`/crypto-logos/${marketSummary.topGainer.base.toLowerCase()}.png`}
                      alt={marketSummary.topGainer.base}
                      style={{ width: '24px', height: '24px' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <span style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF' }}>
                      {marketSummary.topGainer.base}
                    </span>
                    <span style={{ 
                      fontSize: '16px', 
                      fontWeight: '700', 
                      color: '#00E599',
                      background: 'rgba(0,229,153,0.15)',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}>
                      +{marketSummary.topGainer.change24h.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
              
              {/* Top Loser - only show if exists and negative */}
              {marketSummary.topLoser && marketSummary.topLoser.change24h < 0 && (
                <div>
                  <div style={{ fontSize: '11px', color: '#8B9BB4', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top Loser</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img 
                      src={`/crypto-logos/${marketSummary.topLoser.base.toLowerCase()}.png`}
                      alt={marketSummary.topLoser.base}
                      style={{ width: '24px', height: '24px' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <span style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF' }}>
                      {marketSummary.topLoser.base}
                    </span>
                    <span style={{ 
                      fontSize: '16px', 
                      fontWeight: '700', 
                      color: '#FF5C5C',
                      background: 'rgba(255,92,92,0.15)',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}>
                      {marketSummary.topLoser.change24h.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Search Bar */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: isDesktop ? 'transparent' : '#020617',
          padding: isDesktop ? '16px 32px' : '12px 16px',
          zIndex: 10,
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: isDesktop ? '400px' : '100%'
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
          
          {/* Quote Toggle - Desktop Only */}
          {isDesktop && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginLeft: '16px'
            }}>
              <IoSwapHorizontal size={16} color="#8B9BB4" />
              {['USD', 'USDT'].map(quote => (
                <button
                  key={quote}
                  onClick={() => setQuoteFilter(quote)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: quoteFilter === quote ? 'rgba(0,229,153,0.15)' : 'transparent',
                    border: quoteFilter === quote ? '1px solid #00E599' : '1px solid rgba(255,255,255,0.1)',
                    color: quoteFilter === quote ? '#00E599' : '#8B9BB4',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 120ms ease'
                  }}
                >
                  {quote}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: isDesktop ? '12px 32px' : '12px 16px',
          background: isDesktop ? 'transparent' : '#020617',
          position: 'sticky',
          top: isDesktop ? '80px' : '72px',
          zIndex: 9,
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: isDesktop ? 'none' : 1,
                minWidth: isDesktop ? '120px' : 'auto',
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
                transition: 'all 120ms ease',
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
          width: '100%',
          padding: isDesktop ? '0 32px' : '0'
        }}>
          {/* Desktop Table Header with Sorting */}
          {isDesktop && !loading && sortedPairs.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '40px 2fr 1fr 1fr 1fr 1fr 1fr 80px 100px',
              padding: '16px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              color: '#8B9BB4',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <div></div>
              <div>Pair</div>
              <SortableHeader column="lastPrice" label="Price" />
              <SortableHeader column="change24h" label="24h %" />
              <SortableHeader column="volume24h" label="24h Volume" />
              <SortableHeader column="high24h" label="24h High" />
              <SortableHeader column="low24h" label="24h Low" />
              <div style={{ textAlign: 'center' }}>Trend</div>
              <div style={{ textAlign: 'right' }}>Actions</div>
            </div>
          )}
          
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
                onMouseEnter={() => setHoveredRow(pair.symbol)}
                onMouseLeave={() => setHoveredRow(null)}
                style={isDesktop ? {
                  display: 'grid',
                  gridTemplateColumns: '40px 2fr 1fr 1fr 1fr 1fr 1fr 80px 120px',
                  alignItems: 'center',
                  padding: '16px 16px',
                  minHeight: '68px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                  background: hoveredRow === pair.symbol 
                    ? 'linear-gradient(90deg, rgba(0,229,153,0.08) 0%, rgba(0,229,153,0.02) 100%)' 
                    : 'transparent',
                  borderLeft: hoveredRow === pair.symbol ? '3px solid #00E599' : '3px solid transparent',
                  boxShadow: hoveredRow === pair.symbol ? '0 0 20px rgba(0,229,153,0.1)' : 'none',
                  position: 'relative'
                } : {
                  height: '68px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                  background: 'transparent',
                  position: 'relative'
                }}
              >
                {/* Favorite Star */}
                <div
                  onClick={(e) => toggleFavorite(pair.symbol, e)}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    marginRight: isDesktop ? '0' : '12px'
                  }}
                >
                  {favorites.includes(pair.symbol) ? (
                    <IoStar style={{ fontSize: '18px', color: '#FFD700' }} />
                  ) : (
                    <IoStarOutline style={{ fontSize: '18px', color: '#8B9BB4' }} />
                  )}
                </div>

                {/* Pair Info - Logo + Symbol + Name */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  flex: isDesktop ? 'none' : 1
                }}>
                  <img
                    src={`/crypto-logos/${pair.base.toLowerCase()}.png`}
                    alt={pair.base}
                    style={{
                      width: isDesktop ? '28px' : '28px',
                      height: isDesktop ? '28px' : '28px',
                      objectFit: 'contain',
                      marginRight: '10px'
                    }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#FFFFFF',
                      marginBottom: '2px'
                    }}>
                      {pair.base}/{quoteFilter}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.5)'
                    }}>
                      {pair.fullName}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#FFFFFF'
                  }}>
                    {pair.lastPrice > 0 
                      ? `$${pair.lastPrice >= 1 
                          ? pair.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : pair.lastPrice.toFixed(6)}`
                      : '—'}
                  </div>
                  {/* Show change below price on mobile only */}
                  {!isDesktop && (
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: pair.change24h >= 0 ? '#00E599' : '#FF5C5C',
                      marginTop: '2px'
                    }}>
                      {pair.change24h >= 0 ? '+' : ''}{pair.change24h.toFixed(2)}%
                    </div>
                  )}
                </div>

                {/* 24h Change - Desktop Only */}
                {isDesktop && (
                  <div style={{ 
                    textAlign: 'right',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: pair.change24h >= 0 ? '#00E599' : '#FF5C5C'
                  }}>
                    {pair.change24h >= 0 ? '+' : ''}{pair.change24h.toFixed(2)}%
                  </div>
                )}

                {/* 24h Volume - Desktop Only */}
                {isDesktop && (
                  <div style={{ 
                    textAlign: 'right',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#FFFFFF'
                  }}>
                    {formatNumber(pair.volume24h)}
                  </div>
                )}

                {/* 24h High - Desktop Only */}
                {isDesktop && (
                  <div style={{ 
                    textAlign: 'right',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#FFFFFF'
                  }}>
                    {pair.high24h > 0 ? `$${pair.high24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </div>
                )}

                {/* 24h Low - Desktop Only */}
                {isDesktop && (
                  <div style={{ 
                    textAlign: 'right',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#FFFFFF'
                  }}>
                    {pair.low24h > 0 ? `$${pair.low24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </div>
                )}

                {/* Trend Sparkline - Desktop Only */}
                {isDesktop && (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Sparkline positive={pair.change24h >= 0} />
                  </div>
                )}

                {/* Quick Actions - Desktop Only, Show on Hover */}
                {isDesktop && (
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    opacity: hoveredRow === pair.symbol ? 1 : 0,
                    transition: 'opacity 120ms ease'
                  }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(pair.symbol, e); }}
                      title="Add to Favorites"
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: favorites.includes(pair.symbol) ? '#FFD700' : '#8B9BB4',
                        transition: 'all 120ms ease'
                      }}
                    >
                      {favorites.includes(pair.symbol) ? <IoStar size={14} /> : <IoStarOutline size={14} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedCoin(pair); }}
                      title="View Chart"
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#8B9BB4',
                        transition: 'all 120ms ease'
                      }}
                    >
                      <IoTrendingUp size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/spot-trading?pair=${pair.symbol}`); }}
                      title="Trade"
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #00E599, #00B8D4)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#020617',
                        transition: 'all 120ms ease'
                      }}
                    >
                      Trade
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        </div>

        {/* RIGHT SIDE INFO PANEL - Desktop Only */}
        {isDesktop && selectedCoin && (
          <div style={{
            width: '320px',
            flexShrink: 0,
            padding: '24px 16px',
            borderLeft: '1px solid rgba(255,255,255,0.06)'
          }}>
            <div style={{
              background: 'linear-gradient(180deg, #0B1220 0%, #0E1626 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
              padding: '20px',
              position: 'sticky',
              top: '100px'
            }}>
              {/* Coin Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <img
                  src={`/crypto-logos/${selectedCoin.base.toLowerCase()}.png`}
                  alt={selectedCoin.base}
                  style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF' }}>
                    {selectedCoin.fullName}
                  </div>
                  <div style={{ fontSize: '13px', color: '#8B9BB4' }}>
                    {selectedCoin.base}/{quoteFilter}
                  </div>
                </div>
              </div>

              {/* Price */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#FFFFFF' }}>
                  ${selectedCoin.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: selectedCoin.change24h >= 0 ? '#00E599' : '#FF5C5C',
                  marginTop: '4px'
                }}>
                  {selectedCoin.change24h >= 0 ? '+' : ''}{selectedCoin.change24h.toFixed(2)}% (24h)
                </div>
              </div>

              {/* Mini Chart Placeholder */}
              <div style={{
                height: '80px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkline positive={selectedCoin.change24h >= 0} />
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#8B9BB4' }}>Market Cap</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF' }}>
                    {formatNumber(selectedCoin.marketCap)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#8B9BB4' }}>24h Volume</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF' }}>
                    {formatNumber(selectedCoin.volume24h)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#8B9BB4' }}>24h High</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF' }}>
                    ${selectedCoin.high24h?.toLocaleString() || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#8B9BB4' }}>24h Low</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF' }}>
                    ${selectedCoin.low24h?.toLocaleString() || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#8B9BB4' }}>Circulating Supply</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF' }}>
                    {selectedCoin.circulatingSupply > 0 
                      ? `${(selectedCoin.circulatingSupply / 1e6).toFixed(2)}M ${selectedCoin.base}`
                      : '—'}
                  </span>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => navigate(`/spot-trading?pair=${selectedCoin.symbol}`)}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #00E599 0%, #00B8D4 100%)',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#020617',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                  boxShadow: '0 4px 16px rgba(0,229,153,0.3)'
                }}
              >
                Open Trading View
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
