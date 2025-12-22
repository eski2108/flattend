import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { IoCash as DollarSign, IoCheckmarkCircle as CheckCircle, IoFilter as Filter, IoFlash, IoPersonOutline, IoSearch as Search, IoShield as Shield, IoStar as Star, IoTime as Clock, IoTrendingDown, IoTrendingUp } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';
import { TraderBadgeList } from '@/components/TraderBadge';
import { getCryptoEmoji, getCryptoColor } from '@/utils/cryptoIcons';
import { getCoinLogo } from '@/utils/coinLogos';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function MarketplaceExpress() {
  const navigate = useNavigate();
  
  // Core states
  const [currentUser, setCurrentUser] = useState(null);
  const [mode, setMode] = useState('express'); // 'express' or 'manual'
  const [activeTab, setActiveTab] = useState('buy'); // 'buy' or 'sell'
  
  // Express Mode states
  const [expressAmount, setExpressAmount] = useState('');
  const [expressLoading, setExpressLoading] = useState(false);
  const [expressMatch, setExpressMatch] = useState(null);
  
  // Manual Mode states
  const [manualAdverts, setManualAdverts] = useState([]);
  const [manualLoading, setManualLoading] = useState(false);
  
  // Filter states
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [selectedFiat, setSelectedFiat] = useState('USD');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [sortBy, setSortBy] = useState('price_asc');
  
  // Config states
  const [cryptos, setCryptos] = useState(['BTC', 'ETH', 'USDT']);
  const [fiats] = useState(['USD', 'GBP', 'EUR']);
  const [paymentMethods] = useState([
    { id: 'bank_transfer', name: 'Bank Transfer' },
    { id: 'wise', name: 'Wise' },
    { id: 'revolut', name: 'Revolut' },
    { id: 'paypal', name: 'PayPal' }
  ]);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
    
    // Fetch available cryptocurrencies dynamically
    fetchAvailableCryptos();
  }, []);

  const fetchAvailableCryptos = async () => {
    try {
      const response = await axios.get(`${API}/api/coins/enabled`);
      if (response.data.success && response.data.symbols.length > 0) {
        // Filter for coins that support instant buy
        const instantBuyCoins = response.data.coins
          .filter(coin => coin.supports_instant_buy || coin.supports_express_buy)
          .map(coin => coin.symbol);
        if (instantBuyCoins.length > 0) {
          setCryptos(instantBuyCoins);
        }
      }
    } catch (error) {
      console.error('Error fetching available cryptos:', error);
      // Keep default fallback
    }
  };

  // Load manual mode adverts when in manual mode
  useEffect(() => {
    if (mode === 'manual') {
      loadManualAdverts();
    }
  }, [mode, activeTab, selectedCrypto, selectedFiat, selectedPayment, onlyOnline, sortBy]);

  const handleExpressMatch = async () => {
    if (!expressAmount || parseFloat(expressAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!currentUser) {
      toast.error('Please log in to trade');
      navigate('/login');
      return;
    }

    setExpressLoading(true);
    setExpressMatch(null);

    try {
      const response = await axios.post(`${API}/api/p2p/express-match`, {
        user_id: currentUser.user_id,
        action: activeTab,
        cryptocurrency: selectedCrypto,
        fiat_currency: selectedFiat,
        amount_fiat: parseFloat(expressAmount),
        payment_method: selectedPayment
      });

      if (response.data.success && response.data.matched) {
        setExpressMatch(response.data);
        toast.success('Match found! Review the details below.');
      } else {
        toast.warning(response.data.message || 'No traders available. Try Manual Mode.');
      }
    } catch (error) {
      console.error('Express match error:', error);
      toast.error(error.response?.data?.detail || 'Failed to find a match');
    } finally {
      setExpressLoading(false);
    }
  };

  const loadManualAdverts = async () => {
    setManualLoading(true);

    try {
      const params = {
        action: activeTab,
        cryptocurrency: selectedCrypto,
        fiat_currency: selectedFiat,
        only_online: onlyOnline,
        sort_by: sortBy
      };

      if (selectedPayment) params.payment_method = selectedPayment;
      if (minAmount) params.min_amount = parseFloat(minAmount);
      if (maxAmount) params.max_amount = parseFloat(maxAmount);

      const response = await axios.get(`${API}/api/p2p/manual-mode/adverts`, { params });

      if (response.data.success) {
        setManualAdverts(response.data.adverts || []);
      }
    } catch (error) {
      console.error('Load adverts error:', error);
      toast.error('Failed to load traders');
    } finally {
      setManualLoading(false);
    }
  };

  const proceedWithTrade = (advert) => {
    // Navigate to trade creation with advert details
    toast.info('Trade creation integration coming soon...');
  };

  return (
    <Layout>
      <div style={{
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        
        {/* Header */}
        <div style={{
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '800',
            background: 'linear-gradient(135deg, var(--electric-cyan) 0%, var(--neon-purple) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>
            P2P Marketplace
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            Trade crypto directly with other users
          </p>
        </div>

        {/* Mode Toggle */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => setMode('express')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: '700',
              borderRadius: '12px',
              border: mode === 'express' ? '2px solid var(--electric-cyan)' : '2px solid transparent',
              background: mode === 'express' 
                ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(0, 217, 255, 0.1))' 
                : 'var(--card-bg)',
              color: mode === 'express' ? 'var(--electric-cyan)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            <IoFlash size={20} />
            Express Mode
          </button>

          <button
            onClick={() => setMode('manual')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: '700',
              borderRadius: '12px',
              border: mode === 'manual' ? '2px solid var(--neon-purple)' : '2px solid transparent',
              background: mode === 'manual' 
                ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.1))' 
                : 'var(--card-bg)',
              color: mode === 'manual' ? 'var(--neon-purple)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            <List size={20} />
            Manual Mode
          </button>
        </div>

        {/* Buy/Sell Tabs */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => {
              setActiveTab('buy');
              setExpressMatch(null);
            }}
            style={{
              padding: '0.75rem 2.5rem',
              fontSize: '1rem',
              fontWeight: '700',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'buy' 
                ? 'linear-gradient(135deg, var(--success) 0%, #059669 100%)' 
                : 'var(--card-bg)',
              color: activeTab === 'buy' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            <IoTrendingUp size={18} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Buy {selectedCrypto}
          </button>

          <button
            onClick={() => {
              setActiveTab('sell');
              setExpressMatch(null);
            }}
            style={{
              padding: '0.75rem 2.5rem',
              fontSize: '1rem',
              fontWeight: '700',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'sell' 
                ? 'linear-gradient(135deg, var(--error) 0%, #DC2626 100%)' 
                : 'var(--card-bg)',
              color: activeTab === 'sell' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            <IoTrendingDown size={18} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Sell {selectedCrypto}
          </button>
        </div>

        {/* Currency Selectors */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
              Cryptocurrency
            </label>
            <select
              value={selectedCrypto}
              onChange={(e) => {
                setSelectedCrypto(e.target.value);
                setExpressMatch(null);
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
            >
              {cryptos.map(crypto => (
                <option key={crypto} value={crypto}>{crypto}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
              Fiat Currency
            </label>
            <select
              value={selectedFiat}
              onChange={(e) => {
                setSelectedFiat(e.target.value);
                setExpressMatch(null);
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
            >
              {fiats.map(fiat => (
                <option key={fiat} value={fiat}>{fiat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Express Mode UI */}
        {mode === 'express' && (
          <Card style={{
            padding: '2rem',
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '16px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <IoFlash size={48} style={{ color: 'var(--electric-cyan)', marginBottom: '1rem' }} />
              <h2 style={{ 
                fontSize: '1.8rem', 
                fontWeight: '700', 
                color: 'var(--text-primary)',
                marginBottom: '0.5rem'
              }}>
                Express Mode - Instant Matching
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                Enter your amount and we'll find the best trader for you automatically
              </p>
            </div>

            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.75rem',
                color: 'var(--text-secondary)',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                Amount ({selectedFiat})
              </label>
              <input
                type="number"
                value={expressAmount}
                onChange={(e) => setExpressAmount(e.target.value)}
                placeholder={`Enter amount in ${selectedFiat}`}
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.2rem',
                  borderRadius: '12px',
                  border: '2px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  marginBottom: '1.5rem'
                }}
              />

              <button
                onClick={handleExpressMatch}
                disabled={expressLoading}
                style={{
                  width: '100%',
                  padding: '1.25rem',
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--electric-cyan) 0%, var(--neon-cyan) 100%)',
                  color: '#000000',
                  cursor: expressLoading ? 'not-allowed' : 'pointer',
                  opacity: expressLoading ? 0.6 : 1,
                  transition: 'all 0.3s ease'
                }}
              >
                {expressLoading ? 'Finding best match...' : 'Find Best Trader'}
              </button>
            </div>

            {/* Express Match Result */}
            {expressMatch && expressMatch.advert && (
              <div style={{
                marginTop: '2rem',
                padding: '1.5rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
                border: '2px solid var(--electric-cyan)'
              }}>
                <h3 style={{ 
                  fontSize: '1.3rem', 
                  fontWeight: '700', 
                  color: 'var(--electric-cyan)',
                  marginBottom: '1rem'
                }}>
                  ✨ Match Found!
                </h3>

                <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Price:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                      {expressMatch.advert.price_per_unit} {selectedFiat}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Completion Rate:</span>
                    <span style={{ color: 'var(--success)', fontWeight: '600' }}>
                      {expressMatch.trader_profile?.completion_rate?.toFixed(1) || 0}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Rating:</span>
                    <span style={{ color: 'var(--warning)', fontWeight: '600' }}>
                      ⭐ {expressMatch.trader_profile?.rating?.toFixed(1) || 0}/5
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                    <span style={{ 
                      color: expressMatch.trader_profile?.is_online ? 'var(--success)' : 'var(--text-secondary)',
                      fontWeight: '600' 
                    }}>
                      {expressMatch.trader_profile?.is_online ? '🟢 Online' : '🔴 Offline'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => proceedWithTrade(expressMatch.advert)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)',
                    color: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  Proceed with Trade
                </button>
              </div>
            )}
          </Card>
        )}

        {/* Manual Mode UI */}
        {mode === 'manual' && (
          <div>
            {/* Filters */}
            <div style={{
              marginBottom: '1.5rem',
              padding: '1.5rem',
              background: 'var(--card-bg)',
              borderRadius: '12px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem'
                  }}>
                    Min Amount
                  </label>
                  <input
                    type="number"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="Min"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem'
                  }}>
                    Max Amount
                  </label>
                  <input
                    type="number"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="Max"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem'
                  }}>
                    Payment Method
                  </label>
                  <select
                    value={selectedPayment || ''}
                    onChange={(e) => setSelectedPayment(e.target.value || null)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="">All Methods</option>
                    {paymentMethods.map(method => (
                      <option key={method.id} value={method.id}>{method.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem'
                  }}>
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="rating">Rating</option>
                    <option value="completion_rate">Completion Rate</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={onlyOnline}
                    onChange={(e) => setOnlyOnline(e.target.checked)}
                  />
                  <span style={{ color: 'var(--text-secondary)' }}>Only show online traders</span>
                </label>
              </div>
            </div>

            {/* Trader List */}
            {manualLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Loading traders...</p>
              </div>
            ) : manualAdverts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: 'var(--text-secondary)' }}>
                  No traders available. Be the first to create an advert!
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {manualAdverts.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '1.5rem',
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => proceedWithTrade(item.advert)}
                    onMouseEnter={(e) => e.currentTarget.style.border = '1px solid var(--electric-cyan)'}
                    onMouseLeave={(e) => e.currentTarget.style.border = '1px solid var(--border)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <IoPersonOutline size={20} style={{ color: 'var(--electric-cyan)' }} />
                          <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                            {item.trader_name}
                          </span>
                          {item.trader.is_online && (
                            <span style={{ 
                              fontSize: '0.8rem', 
                              color: 'var(--success)',
                              background: 'rgba(16, 185, 129, 0.1)',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px'
                            }}>
                              🟢 Online
                            </span>
                          )}
                          {/* Phase 2: Display Trader Badges */}
                          {item.badges && item.badges.length > 0 && (
                            <TraderBadgeList badges={item.badges} size="small" maxDisplay={3} />
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          <span>✅ {item.trader.completion_rate?.toFixed(0) || 0}% completion</span>
                          <span>⭐ {item.trader.rating?.toFixed(1) || 0}/5</span>
                          <span>🔄 {item.trader.total_trades || 0} trades</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: '1.5rem', 
                          fontWeight: '700', 
                          color: 'var(--electric-cyan)',
                          marginBottom: '0.25rem'
                        }}>
                          <img src={getCoinLogo(selectedCrypto)} alt={selectedCrypto} style={{ width: '20px', height: '20px', marginRight: '6px', objectFit: 'contain' }} />
                          {item.advert.price_per_unit} {selectedFiat}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Limits: {item.advert.min_order_amount} - {item.advert.max_order_amount} {selectedFiat}
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      marginTop: '1rem', 
                      paddingTop: '1rem', 
                      borderTop: '1px solid var(--border)',
                      display: 'flex',
                      gap: '0.5rem',
                      flexWrap: 'wrap'
                    }}>
                      {item.advert.payment_methods?.map(method => (
                        <span key={method} style={{
                          fontSize: '0.8rem',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '4px',
                          background: 'rgba(168, 85, 247, 0.1)',
                          color: 'var(--neon-purple)'
                        }}>
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
