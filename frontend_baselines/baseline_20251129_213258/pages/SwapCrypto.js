import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import CHXButton from '@/components/CHXButton';
import { ArrowDownUp, TrendingUp, Info, RefreshCw, Settings, Zap, Clock, ChevronDown, AlertCircle, CheckCircle, Shield, DollarSign } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || 'https://savingsflow-1.preview.emergentagent.com';

const COIN_LOGOS = {
  'BTC': '🟠',
  'ETH': '💎',
  'USDT': '💚',
  'USDC': '🔵',
  'BNB': '🟡',
  'SOL': '🟣',
  'XRP': '⚪',
  'ADA': '🔷',
  'DOGE': '🟤'
};

function SwapCrypto() {
  const [cryptos, setCryptos] = useState([
    { code: 'BTC', name: 'Bitcoin', color: '#F7931A', logo: '🟠' },
    { code: 'ETH', name: 'Ethereum', color: '#627EEA', logo: '💎' },
    { code: 'USDT', name: 'Tether', color: '#26A17B', logo: '💚' },
    { code: 'USDC', name: 'USD Coin', color: '#2775CA', logo: '🔵' },
    { code: 'BNB', name: 'Binance Coin', color: '#F3BA2F', logo: '🟡' },
    { code: 'SOL', name: 'Solana', color: '#14F195', logo: '🟣' }
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
  const [tickerData, setTickerData] = useState([]);
  const isMobile = window.innerWidth < 768;

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
          color: coin.color || '#00F0FF',
          logo: COIN_LOGOS[coin.symbol] || '💠'
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
        
        // Update ticker data
        const ticker = cryptos.map(crypto => ({
          ...crypto,
          price: response.data[`${crypto.code}_USD`] || 0,
          change: (Math.random() * 10 - 5).toFixed(2) // Mock 24h change
        }));
        setTickerData(ticker);
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

  const getFromCrypto = () => cryptos.find(c => c.code === fromCrypto) || cryptos[0];
  const getToCrypto = () => cryptos.find(c => c.code === toCrypto) || cryptos[1];
  const platformFee = 0.1;
  const estimatedReceive = toAmount ? (parseFloat(toAmount) * (1 - platformFee / 100)).toFixed(8) : '0.00';

  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #020618 0%, #071327 100%)',
        paddingBottom: '60px'
      }}>
        
        {/* Ticker removed - using global ticker from Layout */}

        <div style={{ padding: isMobile ? '16px' : '24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

            {/* Header */}
            <div style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '16px', gap: isMobile ? '16px' : '0' }}>
                <div>
                  <h1 style={{ fontSize: isMobile ? '32px' : '42px', fontWeight: '700', color: '#FFFFFF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Zap size={isMobile ? 32 : 42} color="#00F0FF" strokeWidth={2.5} />
                    Crypto Swap
                  </h1>
                  <p style={{ fontSize: isMobile ? '15px' : '17px', color: '#8F9BB3', margin: 0 }}>Instant exchange with best rates and zero hidden fees</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
                  <div style={{
                    padding: isMobile ? '10px 14px' : '12px 18px',
                    background: 'rgba(0, 240, 255, 0.1)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flex: isMobile ? 1 : 'auto',
                    boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)'
                  }}>
                    <Clock size={18} color="#00F0FF" />
                    <span style={{ fontSize: isMobile ? '12px' : '13px', color: '#00F0FF', fontWeight: '600' }}>
                      {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Live'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    style={{
                      padding: isMobile ? '10px' : '12px',
                      background: 'rgba(0, 240, 255, 0.1)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)'
                    }}
                  >
                    <Settings size={20} color="#00F0FF" />
                  </button>
                </div>
              </div>
              <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.6) 50%, transparent 100%)', boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', gap: isMobile ? '24px' : '32px' }}>
              
              {/* 3. REDESIGNED SWAP CARD */}
              <div>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.98) 0%, rgba(7, 19, 39, 0.95) 100%)',
                  border: '2px solid rgba(0, 240, 255, 0.4)',
                  borderRadius: '24px',
                  padding: isMobile ? '24px' : '32px',
                  marginBottom: isMobile ? '20px' : '32px',
                  boxShadow: '0 0 60px rgba(0, 240, 255, 0.3), inset 0 0 40px rgba(0, 240, 255, 0.08)',
                  position: 'relative'
                }}>
                  {/* Floating Glow */}
                  <div style={{
                    position: 'absolute',
                    top: '-40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '200px',
                    height: '80px',
                    background: 'radial-gradient(circle, rgba(0, 240, 255, 0.4), transparent)',
                    filter: 'blur(40px)',
                    pointerEvents: 'none'
                  }} />

                  {/* From Section with Logo */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '18px',
                    padding: isMobile ? '20px' : '24px',
                    marginBottom: '20px',
                    boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.3)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span style={{ fontSize: isMobile ? '13px' : '14px', color: '#8F9BB3', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From</span>
                      <span style={{ fontSize: isMobile ? '12px' : '13px', color: '#8F9BB3' }}>Balance: 0.0000</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '14px' : '16px', alignItems: isMobile ? 'stretch' : 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0, 240, 255, 0.1)', padding: isMobile ? '12px' : '14px', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.3)', minWidth: isMobile ? '100%' : '180px' }}>
                        <span style={{ fontSize: '28px' }}>{getFromCrypto().logo}</span>
                        <select
                          value={fromCrypto}
                          onChange={(e) => setFromCrypto(e.target.value)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#FFFFFF',
                            fontSize: isMobile ? '17px' : '19px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            outline: 'none',
                            flex: 1
                          }}
                        >
                          {cryptos.map(crypto => (
                            <option key={crypto.code} value={crypto.code}>{crypto.code}</option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="number"
                        value={fromAmount}
                        onChange={(e) => setFromAmount(e.target.value)}
                        placeholder="0.00"
                        style={{
                          flex: 1,
                          padding: isMobile ? '12px' : '14px',
                          background: 'transparent',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: isMobile ? '22px' : '26px',
                          fontWeight: '700',
                          outline: 'none',
                          textAlign: isMobile ? 'left' : 'right',
                          width: isMobile ? '100%' : 'auto'
                        }}
                      />
                    </div>
                    {prices && (
                      <div style={{ marginTop: '12px', textAlign: isMobile ? 'left' : 'right', fontSize: isMobile ? '13px' : '14px', color: '#8F9BB3' }}>
                        ≈ ${(parseFloat(fromAmount || 0) * (prices[`${fromCrypto}_USD`] || 0)).toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Center Reverse Button */}
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '-12px 0' }}>
                    <button
                      onClick={flipCurrencies}
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #00F0FF, #9B4DFF)',
                        border: '4px solid #071327',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s',
                        boxShadow: '0 0 30px rgba(0, 240, 255, 0.6), 0 0 60px rgba(155, 77, 255, 0.4)',
                        zIndex: 10,
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'rotate(180deg) scale(1.15)';
                        e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 240, 255, 0.8), 0 0 80px rgba(155, 77, 255, 0.6)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
                        e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 240, 255, 0.6), 0 0 60px rgba(155, 77, 255, 0.4)';
                      }}
                    >
                      <ArrowDownUp size={26} color="white" strokeWidth={3} />
                    </button>
                  </div>

                  {/* To Section with Logo */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(155, 77, 255, 0.3)',
                    borderRadius: '18px',
                    padding: isMobile ? '20px' : '24px',
                    marginTop: '20px',
                    boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.3)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span style={{ fontSize: isMobile ? '13px' : '14px', color: '#8F9BB3', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To</span>
                      <span style={{ fontSize: isMobile ? '12px' : '13px', color: '#8F9BB3' }}>Balance: 0.0000</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '14px' : '16px', alignItems: isMobile ? 'stretch' : 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(155, 77, 255, 0.1)', padding: isMobile ? '12px' : '14px', borderRadius: '12px', border: '1px solid rgba(155, 77, 255, 0.3)', minWidth: isMobile ? '100%' : '180px' }}>
                        <span style={{ fontSize: '28px' }}>{getToCrypto().logo}</span>
                        <select
                          value={toCrypto}
                          onChange={(e) => setToCrypto(e.target.value)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#FFFFFF',
                            fontSize: isMobile ? '17px' : '19px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            outline: 'none',
                            flex: 1
                          }}
                        >
                          {cryptos.map(crypto => (
                            <option key={crypto.code} value={crypto.code}>{crypto.code}</option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={toAmount}
                        readOnly
                        placeholder="0.00"
                        style={{
                          flex: 1,
                          padding: isMobile ? '12px' : '14px',
                          background: 'transparent',
                          border: 'none',
                          color: '#9B4DFF',
                          fontSize: isMobile ? '22px' : '26px',
                          fontWeight: '700',
                          outline: 'none',
                          textAlign: isMobile ? 'left' : 'right',
                          width: isMobile ? '100%' : 'auto'
                        }}
                      />
                    </div>
                    {prices && toAmount && (
                      <div style={{ marginTop: '12px', textAlign: isMobile ? 'left' : 'right', fontSize: isMobile ? '13px' : '14px', color: '#8F9BB3' }}>
                        ≈ ${(parseFloat(toAmount || 0) * (prices[`${toCrypto}_USD`] || 0)).toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Info Row: Live Rate, Fee, Slippage, Estimated Receive */}
                  {exchangeRate > 0 && (
                    <div style={{
                      marginTop: '28px',
                      padding: isMobile ? '18px' : '20px',
                      background: 'rgba(0, 240, 255, 0.05)',
                      border: '1px solid rgba(0, 240, 255, 0.2)',
                      borderRadius: '16px',
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                      gap: '16px',
                      boxShadow: 'inset 0 2px 10px rgba(0, 240, 255, 0.1)'
                    }}>
                      <div>
                        <div style={{ fontSize: isMobile ? '12px' : '13px', color: '#8F9BB3', marginBottom: '6px', fontWeight: '500' }}>Live Rate</div>
                        <div style={{ fontSize: isMobile ? '14px' : '15px', color: '#00F0FF', fontWeight: '700' }}>
                          1 {fromCrypto} = {exchangeRate.toFixed(6)} {toCrypto}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: isMobile ? '12px' : '13px', color: '#8F9BB3', marginBottom: '6px', fontWeight: '500' }}>Platform Fee</div>
                        <div style={{ fontSize: isMobile ? '14px' : '15px', color: '#8FFF4E', fontWeight: '700' }}>{platformFee}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: isMobile ? '12px' : '13px', color: '#8F9BB3', marginBottom: '6px', fontWeight: '500' }}>Slippage</div>
                        <div style={{ fontSize: isMobile ? '14px' : '15px', color: '#F5C542', fontWeight: '700' }}>{slippage}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: isMobile ? '12px' : '13px', color: '#8F9BB3', marginBottom: '6px', fontWeight: '500' }}>You Receive (estimated)</div>
                        <div style={{ fontSize: isMobile ? '14px' : '15px', color: '#9B4DFF', fontWeight: '700' }}>{estimatedReceive} {toCrypto}</div>
                      </div>
                    </div>
                  )}

                  {/* Swap Button with Floating Glow */}
                  <div style={{ marginTop: '28px', position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      top: '-20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '80%',
                      height: '60px',
                      background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.4), rgba(155, 77, 255, 0.4))',
                      filter: 'blur(30px)',
                      pointerEvents: 'none'
                    }} />
                    <CHXButton
                      onClick={handleSwap}
                      coinColor="#00F0FF"
                      variant="primary"
                      size="large"
                      fullWidth
                      disabled={swapping || !fromAmount || !toAmount}
                      icon={<Zap size={22} />}
                    >
                      {swapping ? 'Swapping...' : 'Swap Now'}
                    </CHXButton>
                  </div>
                </div>

                {/* Recent Swaps */}
                {recentSwaps.length > 0 && (
                  <div style={{
                    background: 'rgba(2, 6, 24, 0.8)',
                    border: '1px solid rgba(0, 240, 255, 0.25)',
                    borderRadius: '20px',
                    padding: isMobile ? '20px' : '24px',
                    boxShadow: '0 0 30px rgba(0, 240, 255, 0.15)'
                  }}>
                    <h3 style={{ fontSize: isMobile ? '17px' : '19px', fontWeight: '600', color: '#FFFFFF', marginBottom: '20px' }}>Recent Swaps</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {recentSwaps.map((swap, index) => (
                        <div key={index} style={{
                          padding: '16px',
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(0, 240, 255, 0.15)',
                          borderRadius: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontSize: isMobile ? '13px' : '14px', color: '#FFFFFF', fontWeight: '600', marginBottom: '4px' }}>
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

              {/* Sidebar */}
              <div>
                {/* 4. REDESIGNED MARKET PRICES WIDGET */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.95) 0%, rgba(7, 19, 39, 0.9) 100%)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '20px',
                  padding: isMobile ? '20px' : '24px',
                  marginBottom: '24px',
                  boxShadow: 'inset 0 2px 20px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 240, 255, 0.15)'
                }}>
                  <h3 style={{ fontSize: isMobile ? '17px' : '19px', fontWeight: '600', color: '#FFFFFF', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <TrendingUp size={22} color="#00F0FF" strokeWidth={2.5} />
                    Market Prices
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {cryptos.slice(0, 6).map(crypto => {
                      const price = prices ? (prices[`${crypto.code}_USD`] || 0) : 0;
                      const change = (Math.random() * 10 - 5).toFixed(2);
                      const isPositive = parseFloat(change) >= 0;
                      
                      return (
                        <div key={crypto.code} style={{
                          padding: '14px',
                          background: 'rgba(0, 0, 0, 0.3)',
                          borderRadius: '12px',
                          border: '1px solid rgba(0, 240, 255, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.3s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = crypto.color + '80';
                          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.15)';
                          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                        }}>
                          <span style={{ fontSize: '24px' }}>{crypto.logo}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#FFFFFF', marginBottom: '2px' }}>{crypto.code}</div>
                            <div style={{ fontSize: '11px', color: '#8F9BB3' }}>{crypto.name}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#00F0FF', marginBottom: '2px' }}>${price.toFixed(2)}</div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: isPositive ? '#22C55E' : '#EF4444' }}>
                              {isPositive ? '+' : ''}{change}%
                            </div>
                          </div>
                          {/* Sparkline */}
                          <svg width="60" height="24" style={{ opacity: 0.7 }}>
                            <polyline
                              points="0,18 12,15 24,16 36,10 48,12 60,8"
                              fill="none"
                              stroke={isPositive ? '#22C55E' : '#EF4444'}
                              strokeWidth="2"
                            />
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5. IMPROVED SWAP INFO SECTION */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.95) 0%, rgba(7, 19, 39, 0.9) 100%)',
                  border: '2px solid rgba(155, 77, 255, 0.3)',
                  borderRadius: '20px',
                  padding: isMobile ? '20px' : '24px',
                  boxShadow: '0 0 40px rgba(155, 77, 255, 0.2), inset 0 2px 20px rgba(0, 0, 0, 0.4)'
                }}>
                  <h3 style={{ fontSize: isMobile ? '17px' : '19px', fontWeight: '600', color: '#FFFFFF', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Info size={22} color="#9B4DFF" strokeWidth={2.5} />
                    Swap Info
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: isMobile ? '13px' : '14px', color: '#D1D5DB' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <CheckCircle size={20} color="#22C55E" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>Instant swaps with best market rates</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <Shield size={20} color="#00F0FF" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>Secure escrow protection on all swaps</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <DollarSign size={20} color="#8FFF4E" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{platformFee}% platform fee - no hidden charges</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <Zap size={20} color="#F5C542" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>Real-time price updates every 10 seconds</span>
                    </div>
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
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.98) 0%, rgba(7, 19, 39, 0.99) 100%)',
              border: '2px solid rgba(0, 240, 255, 0.4)',
              borderRadius: '24px',
              padding: '36px',
              maxWidth: '450px',
              width: '100%',
              boxShadow: '0 0 80px rgba(0, 240, 255, 0.4)'
            }}>
              <h2 style={{ fontSize: '26px', fontWeight: '700', color: '#FFFFFF', marginBottom: '28px' }}>Swap Settings</h2>
              
              <div style={{ marginBottom: '28px' }}>
                <label style={{ fontSize: '14px', color: '#8F9BB3', marginBottom: '14px', display: 'block', fontWeight: '600' }}>Slippage Tolerance</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  {[0.1, 0.5, 1.0, 3.0].map(value => (
                    <button
                      key={value}
                      onClick={() => setSlippage(value)}
                      style={{
                        padding: '14px',
                        background: slippage === value ? 'linear-gradient(135deg, #00F0FF, #0080FF)' : 'rgba(0, 0, 0, 0.4)',
                        border: `1px solid ${slippage === value ? 'rgba(0, 240, 255, 0.6)' : 'rgba(0, 240, 255, 0.2)'}`,
                        borderRadius: '12px',
                        color: slippage === value ? '#FFFFFF' : '#8F9BB3',
                        fontSize: '15px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        boxShadow: slippage === value ? '0 0 20px rgba(0, 240, 255, 0.4)' : 'none'
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
                    padding: '16px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '14px',
                    color: '#FFFFFF',
                    fontSize: '16px'
                  }}
                />
              </div>

              <CHXButton
                onClick={() => setShowSettings(false)}
                coinColor="#00F0FF"
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

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
      `}</style>
    </Layout>
  );
}

export default SwapCrypto;
