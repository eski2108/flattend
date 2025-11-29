import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import CHXButton from '@/components/CHXButton';
import { ArrowDownUp, TrendingUp, Info, RefreshCw, Settings, Zap, Clock, ChevronDown, AlertCircle } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || 'https://coinhubuix.preview.emergentagent.com';

const FIATS = [
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
];

function SwapCrypto() {
  const [cryptos, setCryptos] = useState([
    { code: 'BTC', name: 'Bitcoin', color: '#F7931A' },
    { code: 'ETH', name: 'Ethereum', color: '#627EEA' },
    { code: 'USDT', name: 'Tether', color: '#26A17B' }
  ]);
  
  const [fromCrypto, setFromCrypto] = useState('BTC');
  const [toCrypto, setToCrypto] = useState('ETH');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [prices, setPrices] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(0);
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [recentSwaps, setRecentSwaps] = useState([]);

  useEffect(() => {
    fetchAvailableCryptos();
    fetchRecentSwaps();
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (fromAmount && prices) {
      calculateToAmount();
    }
  }, [fromAmount, fromCrypto, toCrypto, prices]);

  const fetchAvailableCryptos = async () => {
    try {
      const response = await axios.get(`${API}/api/swap/available-coins`);
      if (response.data.success && response.data.coins_detailed.length > 0) {
        const cryptoList = response.data.coins_detailed.map(coin => ({
          code: coin.symbol,
          name: coin.name,
          color: coin.color || '#00E8FF'
        }));
        setCryptos(cryptoList);
      }
    } catch (error) {
      console.error('Error fetching available cryptos:', error);
    }
  };

  const fetchPrices = async () => {
    try {
      const response = await axios.get(`${API}/api/prices/live`);
      if (response.data.success) {
        setPrices(response.data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  const fetchRecentSwaps = async () => {
    try {
      const userData = localStorage.getItem('cryptobank_user');
      if (!userData) return;
      const user = JSON.parse(userData);
      
      const response = await axios.get(`${API}/api/swap/history/${user.user_id}?limit=5`);
      if (response.data.success) {
        setRecentSwaps(response.data.swaps || []);
      }
    } catch (error) {
      console.error('Error fetching recent swaps:', error);
    }
  };

  const calculateToAmount = () => {
    if (!prices || !fromAmount) {
      setToAmount('');
      return;
    }

    const fromPrice = prices[`${fromCrypto}_USD`] || 0;
    const toPrice = prices[`${toCrypto}_USD`] || 0;

    if (fromPrice === 0 || toPrice === 0) {
      setToAmount('0');
      setExchangeRate(0);
      return;
    }

    const rate = fromPrice / toPrice;
    setExchangeRate(rate);
    
    const calculatedAmount = parseFloat(fromAmount) * rate;
    const withSlippage = calculatedAmount * (1 - slippage / 100);
    setToAmount(withSlippage.toFixed(8));
  };

  const handleSwap = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setSwapping(true);
      const userData = localStorage.getItem('cryptobank_user');
      if (!userData) {
        toast.error('Please login to swap');
        return;
      }
      const user = JSON.parse(userData);

      const response = await axios.post(`${API}/api/swap/execute`, {
        user_id: user.user_id,
        from_currency: fromCrypto,
        to_currency: toCrypto,
        from_amount: parseFloat(fromAmount),
        slippage_percent: slippage
      });

      if (response.data.success) {
        toast.success('Swap completed successfully!');
        setFromAmount('');
        setToAmount('');
        fetchRecentSwaps();
      } else {
        toast.error(response.data.message || 'Swap failed');
      }
    } catch (error) {
      console.error('Swap error:', error);
      toast.error(error.response?.data?.message || 'Swap failed');
    } finally {
      setSwapping(false);
    }
  };

  const flipCurrencies = () => {
    const tempCrypto = fromCrypto;
    const tempAmount = fromAmount;
    setFromCrypto(toCrypto);
    setToCrypto(tempCrypto);
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };

  const getFromCryptoColor = () => cryptos.find(c => c.code === fromCrypto)?.color || '#00E8FF';
  const getToCryptoColor = () => cryptos.find(c => c.code === toCrypto)?.color || '#9B4DFF';

  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #07111A 0%, #0C1A27 100%)',
        padding: '20px',
        paddingBottom: '60px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#FFFFFF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Zap size={36} color="#00E8FF" strokeWidth={2.5} />
                  Crypto Swap
                </h1>
                <p style={{ fontSize: '16px', color: '#8F9BB3', margin: 0 }}>Instant crypto-to-crypto exchange with best rates</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{
                  padding: '10px 16px',
                  background: 'rgba(0, 232, 255, 0.1)',
                  border: '1px solid rgba(0, 232, 255, 0.3)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Clock size={16} color="#00E8FF" />
                  <span style={{ fontSize: '13px', color: '#00E8FF', fontWeight: '600' }}>
                    {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Loading...'}
                  </span>
                </div>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  style={{
                    padding: '10px',
                    background: 'rgba(0, 232, 255, 0.1)',
                    border: '1px solid rgba(0, 232, 255, 0.3)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  <Settings size={20} color="#00E8FF" />
                </button>
              </div>
            </div>
            <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent 0%, rgba(0, 232, 255, 0.5) 50%, transparent 100%)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 1024 ? '1fr' : '1fr 400px', gap: '20px' }}>
            
            {/* Main Swap Panel */}
            <div>
              {/* Swap Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(12, 26, 39, 0.95) 0%, rgba(7, 17, 26, 0.98) 100%)',
                border: '1px solid rgba(0, 232, 255, 0.3)',
                borderRadius: '20px',
                padding: '28px',
                marginBottom: '20px',
                boxShadow: '0 0 40px rgba(0, 232, 255, 0.2), inset 0 0 30px rgba(0, 232, 255, 0.05)'
              }}>
                {/* From Section */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 232, 255, 0.2)',
                  borderRadius: '16px',
                  padding: '20px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', color: '#8F9BB3', fontWeight: '600' }}>From</span>
                    <span style={{ fontSize: '13px', color: '#8F9BB3' }}>Balance: 0.0000</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <select
                      value={fromCrypto}
                      onChange={(e) => setFromCrypto(e.target.value)}
                      style={{
                        padding: '14px 40px 14px 14px',
                        background: 'rgba(0, 232, 255, 0.1)',
                        border: '1px solid rgba(0, 232, 255, 0.3)',
                        borderRadius: '12px',
                        color: '#FFFFFF',
                        fontSize: '18px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        minWidth: '140px',
                        outline: 'none'
                      }}
                    >
                      {cryptos.map(crypto => (
                        <option key={crypto.code} value={crypto.code}>{crypto.code}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={fromAmount}
                      onChange={(e) => setFromAmount(e.target.value)}
                      placeholder="0.00"
                      style={{
                        flex: 1,
                        padding: '14px',
                        background: 'transparent',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: '24px',
                        fontWeight: '700',
                        outline: 'none',
                        textAlign: 'right'
                      }}
                    />
                  </div>
                  {prices && (
                    <div style={{ marginTop: '12px', textAlign: 'right', fontSize: '13px', color: '#8F9BB3' }}>
                      ≈ ${(parseFloat(fromAmount || 0) * (prices[`${fromCrypto}_USD`] || 0)).toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Flip Button */}
                <div style={{ display: 'flex', justifyContent: 'center', margin: '-8px 0' }}>
                  <button
                    onClick={flipCurrencies}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #00E8FF, #9B4DFF)',
                      border: '3px solid #0C1A27',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s',
                      boxShadow: '0 0 20px rgba(0, 232, 255, 0.4)',
                      zIndex: 10
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'rotate(180deg) scale(1.1)';
                      e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 232, 255, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 232, 255, 0.4)';
                    }}
                  >
                    <ArrowDownUp size={24} color="white" strokeWidth={3} />
                  </button>
                </div>

                {/* To Section */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(155, 77, 255, 0.2)',
                  borderRadius: '16px',
                  padding: '20px',
                  marginTop: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', color: '#8F9BB3', fontWeight: '600' }}>To</span>
                    <span style={{ fontSize: '13px', color: '#8F9BB3' }}>Balance: 0.0000</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <select
                      value={toCrypto}
                      onChange={(e) => setToCrypto(e.target.value)}
                      style={{
                        padding: '14px 40px 14px 14px',
                        background: 'rgba(155, 77, 255, 0.1)',
                        border: '1px solid rgba(155, 77, 255, 0.3)',
                        borderRadius: '12px',
                        color: '#FFFFFF',
                        fontSize: '18px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        minWidth: '140px',
                        outline: 'none'
                      }}
                    >
                      {cryptos.map(crypto => (
                        <option key={crypto.code} value={crypto.code}>{crypto.code}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={toAmount}
                      readOnly
                      placeholder="0.00"
                      style={{
                        flex: 1,
                        padding: '14px',
                        background: 'transparent',
                        border: 'none',
                        color: '#9B4DFF',
                        fontSize: '24px',
                        fontWeight: '700',
                        outline: 'none',
                        textAlign: 'right'
                      }}
                    />
                  </div>
                  {prices && toAmount && (
                    <div style={{ marginTop: '12px', textAlign: 'right', fontSize: '13px', color: '#8F9BB3' }}>
                      ≈ ${(parseFloat(toAmount || 0) * (prices[`${toCrypto}_USD`] || 0)).toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Exchange Rate Info */}
                {exchangeRate > 0 && (
                  <div style={{
                    marginTop: '20px',
                    padding: '16px',
                    background: 'rgba(0, 232, 255, 0.05)',
                    border: '1px solid rgba(0, 232, 255, 0.15)',
                    borderRadius: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: '#8F9BB3' }}>Exchange Rate</span>
                      <span style={{ fontSize: '14px', color: '#00E8FF', fontWeight: '600' }}>
                        1 {fromCrypto} = {exchangeRate.toFixed(6)} {toCrypto}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: '#8F9BB3' }}>Slippage Tolerance</span>
                      <span style={{ fontSize: '14px', color: '#F5C542', fontWeight: '600' }}>{slippage}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: '#8F9BB3' }}>Estimated Fee</span>
                      <span style={{ fontSize: '14px', color: '#8FFF4E', fontWeight: '600' }}>0.1%</span>
                    </div>
                  </div>
                )}

                {/* Swap Button */}
                <div style={{ marginTop: '24px' }}>
                  <CHXButton
                    onClick={handleSwap}
                    coinColor="#00E8FF"
                    variant="primary"
                    size="large"
                    fullWidth
                    disabled={swapping || !fromAmount || !toAmount}
                    icon={<Zap size={20} />}
                  >
                    {swapping ? 'Swapping...' : 'Swap Now'}
                  </CHXButton>
                </div>
              </div>

              {/* Recent Swaps */}
              {recentSwaps.length > 0 && (
                <div style={{
                  background: 'rgba(12, 26, 39, 0.8)',
                  border: '1px solid rgba(0, 232, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '24px'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#FFFFFF', marginBottom: '20px' }}>Recent Swaps</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {recentSwaps.map((swap, index) => (
                      <div key={index} style={{
                        padding: '16px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 232, 255, 0.15)',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600', marginBottom: '4px' }}>
                            {swap.from_amount} {swap.from_currency} → {swap.to_amount} {swap.to_currency}
                          </div>
                          <div style={{ fontSize: '12px', color: '#8F9BB3' }}>
                            {new Date(swap.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{
                          padding: '6px 12px',
                          background: swap.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 197, 66, 0.1)',
                          border: `1px solid ${swap.status === 'completed' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 197, 66, 0.3)'}`,
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: swap.status === 'completed' ? '#22C55E' : '#F5C542'
                        }}>
                          {swap.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Info */}
            <div>
              {/* Market Info */}
              <div style={{
                background: 'rgba(12, 26, 39, 0.8)',
                border: '1px solid rgba(0, 232, 255, 0.25)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '16px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={20} color="#00E8FF" />
                  Market Prices
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {cryptos.slice(0, 5).map(crypto => (
                    <div key={crypto.code} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: crypto.color,
                          boxShadow: `0 0 10px ${crypto.color}`
                        }} />
                        <span style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600' }}>{crypto.code}</span>
                      </div>
                      <span style={{ fontSize: '14px', color: '#00E8FF', fontWeight: '700' }}>
                        ${prices ? (prices[`${crypto.code}_USD`] || 0).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Card */}
              <div style={{
                background: 'rgba(12, 26, 39, 0.8)',
                border: '1px solid rgba(0, 232, 255, 0.25)',
                borderRadius: '16px',
                padding: '20px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Info size={20} color="#00E8FF" />
                  Swap Info
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#8F9BB3' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>Instant swaps with best market rates</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>0.1% platform fee on all swaps</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>No hidden charges or price manipulation</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>Slippage protection included</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Settings Modal */}
        {showSettings && (
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
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(12, 26, 39, 0.98) 0%, rgba(7, 17, 26, 0.99) 100%)',
              border: '1px solid rgba(0, 232, 255, 0.3)',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 0 50px rgba(0, 232, 255, 0.3)'
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF', marginBottom: '24px' }}>Swap Settings</h2>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '14px', color: '#8F9BB3', marginBottom: '12px', display: 'block' }}>Slippage Tolerance</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {[0.1, 0.5, 1.0, 3.0].map(value => (
                    <button
                      key={value}
                      onClick={() => setSlippage(value)}
                      style={{
                        padding: '12px',
                        background: slippage === value ? 'rgba(0, 232, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                        border: `1px solid ${slippage === value ? 'rgba(0, 232, 255, 0.5)' : 'rgba(0, 232, 255, 0.2)'}`,
                        borderRadius: '10px',
                        color: slippage === value ? '#00E8FF' : '#8F9BB3',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(parseFloat(e.target.value))}
                  placeholder="Custom"
                  step="0.1"
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 232, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '16px'
                  }}
                />
              </div>

              <CHXButton
                onClick={() => setShowSettings(false)}
                coinColor="#00E8FF"
                variant="primary"
                size="medium"
                fullWidth
              >
                Save Settings
              </CHXButton>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default SwapCrypto;
