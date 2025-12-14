import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import CHXButton from '@/components/CHXButton';
import DualCurrencyInput from '@/components/DualCurrencyInput';
import { IoAlertCircle as AlertCircle, IoArrowDown as ArrowDownUp, IoCash, IoCheckmark as Check, IoCheckmarkCircle, IoChevronDown, IoFlash, IoInformationCircle, IoRefresh as RefreshCw, IoSettings, IoShield, IoTime, IoTrendingUp } from 'react-icons/io5';
import { notifyWalletBalanceUpdated } from '@/utils/walletEvents';

const API = process.env.REACT_APP_BACKEND_URL;

const getCoinLogo = (symbol) => `/crypto-logos/${symbol?.toLowerCase()}.png`;

// Custom Dropdown Component with Coin Logos
const CoinDropdown = ({ value, onChange, cryptos, label }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectedCrypto = cryptos.find(c => c.code === value) || cryptos[0];
  
  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '8px',
          background: isOpen ? 'rgba(255,255,255,0.05)' : 'transparent'
        }}
      >
        <img 
          src={getCoinLogo(selectedCrypto.code)} 
          alt={selectedCrypto.code}
          style={{ width: '28px', height: '28px', borderRadius: '50%' }}
          onError={(e) => e.target.style.display = 'none'}
        />
        <span style={{ color: '#FFF', fontSize: '20px', fontWeight: '700' }}>
          {selectedCrypto.code}
        </span>
        <IoChevronDown style={{ color: '#8FA3C8', marginLeft: '4px' }} />
      </div>
      
      {isOpen && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
            onClick={() => setIsOpen(false)}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '8px',
            background: '#1A1F2E',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}>
            {cryptos.map(crypto => (
              <div
                key={crypto.code}
                onClick={() => {
                  onChange(crypto.code);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: value === crypto.code ? 'rgba(0,71,217,0.2)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.05)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = value === crypto.code ? 'rgba(0,71,217,0.2)' : 'transparent'}
              >
                <img 
                  src={getCoinLogo(crypto.code)} 
                  alt={crypto.code}
                  style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                  onError={(e) => e.target.style.display = 'none'}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#FFF', fontSize: '15px', fontWeight: '600' }}>
                    {crypto.code}
                  </div>
                  <div style={{ color: '#6B7A99', fontSize: '12px' }}>
                    {crypto.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

function SwapCrypto() {
  const navigate = useNavigate();
  const [cryptos, setCryptos] = useState([
    { code: 'BTC', name: 'Bitcoin', color: '#F7931A' },
    { code: 'ETH', name: 'Ethereum', color: '#627EEA' },
    { code: 'USDT', name: 'Tether', color: '#26A17B' },
    { code: 'USDC', name: 'USD Coin', color: '#2775CA' },
    { code: 'BNB', name: 'Binance Coin', color: '#F3BA2F' },
    { code: 'SOL', name: 'Solana', color: '#14F195' },
    { code: 'XRP', name: 'Ripple', color: '#00AAE4' },
    { code: 'ADA', name: 'Cardano', color: '#0033AD' },
    { code: 'DOGE', name: 'Dogecoin', color: '#C2A633' }
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
  const [walletBalances, setWalletBalances] = useState({});
  const [inputType, setInputType] = useState('crypto'); // 'crypto' or 'fiat'
  const [selectedFiat, setSelectedFiat] = useState('GBP');
  const [swapSuccess, setSwapSuccess] = useState(null); // Local success message
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    fetchAvailableCryptos();
    fetchRecentSwaps();
    fetchWalletBalances();
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

  const fetchWalletBalances = async () => {
    try {
      const userData = localStorage.getItem('cryptobank_user');
      const user = userData ? JSON.parse(userData) : null;
      
      if (user?.user_id) {
        const response = await axios.get(`${API}/api/wallets/balances/${user.user_id}`);
        if (response.data.success) {
          const balances = {};
          response.data.balances.forEach(bal => {
            balances[bal.currency] = bal.available_balance || 0;
          });
          setWalletBalances(balances);
        }
      }
    } catch (error) {
      console.error('Error fetching wallet balances:', error);
    }
  };

  const fetchAvailableCryptos = async () => {
    try {
      const response = await axios.get(`${API}/api/swap/available-coins`);
      if (response.data.success && response.data.coins_detailed.length > 0) {
        const cryptoList = response.data.coins_detailed.map(coin => ({
          code: coin.symbol,
          name: coin.name,
          color: coin.color || '#00F0FF',
          logo: getCoinLogo(coin.symbol)
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
      if (response.data.success && response.data.prices) {
        setPrices(response.data.prices);
        setLastUpdate(new Date());
        
        // Update ticker data with REAL prices and changes
        const ticker = cryptos.map(crypto => {
          const priceData = response.data.prices[crypto.code];
          return {
            ...crypto,
            price: priceData?.price_gbp || 0,
            change: priceData?.change_24h || 0
          };
        });
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
    if (!fromAmount || !prices) return;
    
    const fromPriceData = prices[fromCrypto];
    const toPriceData = prices[toCrypto];
    
    const fromPrice = fromPriceData?.price_gbp || 0;
    const toPrice = toPriceData?.price_gbp || 0;
    
    if (fromPrice && toPrice) {
      const rate = fromPrice / toPrice;
      setExchangeRate(rate);
      const calculated = (parseFloat(fromAmount) * rate).toFixed(8);
      setToAmount(calculated);
    }
  };

  const handleSwap = async () => {
    // COMPREHENSIVE VALIDATION - Prevent all customer issues
    
    // 1. Validate amount exists and is valid
    if (!fromAmount || isNaN(parseFloat(fromAmount)) || parseFloat(fromAmount) <= 0) {
      toast.error('Please enter a valid amount');
      console.error('Invalid amount:', fromAmount);
      return;
    }

    // 2. fromAmount is already in crypto (converted by DualCurrencyInput)
    const actualCryptoAmount = parseFloat(fromAmount);
    console.log('Swap attempt:', {
      fromCrypto,
      toCrypto,
      actualCryptoAmount,
      fromAmount
    });

    // 3. Check if user has enough balance
    const availableBalance = walletBalances[fromCrypto] || 0;
    console.log('Balance check:', {
      availableBalance,
      required: actualCryptoAmount,
      hasSufficient: actualCryptoAmount <= availableBalance
    });
    
    // 4. Check zero balance
    if (availableBalance === 0) {
      toast.error(`You have no ${fromCrypto} to swap. Please select a currency you own or deposit ${fromCrypto} first.`);
      return;
    }

    // 5. Check insufficient balance with helpful message
    if (actualCryptoAmount > availableBalance) {
      const maxFiat = (availableBalance * (prices[fromCrypto]?.price_gbp || 0)).toFixed(2);
      toast.error(`Insufficient ${fromCrypto} balance. You have ${availableBalance.toFixed(8)} ${fromCrypto} (≈£${maxFiat}). Please enter a smaller amount.`);
      return;
    }

    // 6. Validate prices are available
    if (!prices || !prices[fromCrypto] || !prices[toCrypto]) {
      toast.error('Price data not available. Please wait and try again.');
      console.error('Price data missing:', { prices, fromCrypto, toCrypto });
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
        from_amount: actualCryptoAmount,
        slippage_percent: slippage
      });

      if (response.data.success) {
        // Show local success message in the swap box
        setSwapSuccess({
          message: `Swap completed! Received ${response.data.to_amount.toFixed(8)} ${toCrypto}`,
          fromAmount: actualCryptoAmount,
          toAmount: response.data.to_amount
        });
        
        // Clear after 5 seconds
        setTimeout(() => setSwapSuccess(null), 5000);
        
        setFromAmount('');
        setToAmount('');
        fetchRecentSwaps();
        fetchWalletBalances(); // Refresh balances
        notifyWalletBalanceUpdated(); // Notify other components to refresh
      } else {
        toast.error(response.data.message || 'Swap failed');
      }
    } catch (error) {
      console.error('Swap error:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Swap failed';
      toast.error(errorMsg);
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
    <>
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
                    <IoFlash size={isMobile ? 32 : 42} color="#00F0FF" strokeWidth={2.5} />
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
                    <IoTime size={18} color="#00F0FF" />
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
                    <IoSettings size={20} color="#00F0FF" />
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

                  {/* From Section with Dual Currency Input - CENTERED */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '18px',
                    padding: isMobile ? '20px' : '24px',
                    marginBottom: '24px',
                    boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.3)',
                    maxWidth: isMobile ? '100%' : '600px',
                    margin: '0 auto 24px auto'
                  }}>
                    {/* FROM Label */}
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ 
                        fontSize: isMobile ? '13px' : '14px', 
                        color: '#8F9BB3', 
                        fontWeight: '600', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.5px',
                        display: 'block'
                      }}>From</span>
                    </div>
                    
                    {/* BTC Selector - CENTERED */}
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'center',
                      marginBottom: '8px'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        background: 'rgba(0, 240, 255, 0.1)', 
                        padding: isMobile ? '10px 14px' : '12px 16px', 
                        borderRadius: '12px', 
                        border: '1px solid rgba(0, 240, 255, 0.3)' 
                      }}>
                        <img src={getCoinLogo(fromCrypto)} alt={fromCrypto} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                        <select
                          value={fromCrypto}
                          onChange={(e) => setFromCrypto(e.target.value)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#FFFFFF',
                            fontSize: isMobile ? '16px' : '18px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            outline: 'none',
                            appearance: 'none',
                            WebkitAppearance: 'none'
                          }}
                        >
                          {cryptos.map(crypto => (
                            <option 
                              key={crypto.code} 
                              value={crypto.code}
                              style={{
                                background: '#1A1F2E',
                                color: '#FFFFFF',
                                padding: '12px',
                                fontSize: '16px'
                              }}
                            >
                              {crypto.code} - {crypto.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Balance Display - PROMINENT */}
                    <div style={{ 
                      textAlign: 'center', 
                      marginBottom: '16px',
                      padding: '10px',
                      background: (walletBalances[fromCrypto] || 0) === 0 ? 'rgba(255, 59, 48, 0.1)' : 'rgba(0, 240, 255, 0.05)',
                      borderRadius: '10px',
                      border: `1px solid ${(walletBalances[fromCrypto] || 0) === 0 ? 'rgba(255, 59, 48, 0.3)' : 'rgba(0, 240, 255, 0.2)'}`
                    }}>
                      <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '4px' }}>Available Balance</div>
                      <div style={{ 
                        fontSize: isMobile ? '18px' : '20px', 
                        fontWeight: '700',
                        color: (walletBalances[fromCrypto] || 0) === 0 ? '#FF3B30' : '#00F0FF'
                      }}>
                        {(walletBalances[fromCrypto] || 0).toFixed(8)} {fromCrypto}
                      </div>
                      {prices && prices[fromCrypto] && (
                        <div style={{ fontSize: '13px', color: '#8F9BB3', marginTop: '4px' }}>
                          ≈ £{((walletBalances[fromCrypto] || 0) * prices[fromCrypto].price_gbp).toFixed(2)}
                        </div>
                      )}
                      {(walletBalances[fromCrypto] || 0) === 0 && (
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#FF3B30', 
                            marginBottom: '8px',
                            fontWeight: '600'
                          }}>
                            ⚠️ No {fromCrypto} to swap
                          </div>
                          <button
                            onClick={() => navigate('/p2p-express')}
                            style={{
                              background: 'linear-gradient(135deg, #00F0FF, #9B4DFF)',
                              border: 'none',
                              borderRadius: '10px',
                              padding: isMobile ? '10px 20px' : '8px 16px',
                              color: '#FFFFFF',
                              fontSize: isMobile ? '14px' : '13px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              boxShadow: '0 4px 15px rgba(0, 240, 255, 0.3)',
                              transition: 'all 0.3s',
                              width: isMobile ? '100%' : 'auto'
                            }}
                            onMouseEnter={(e) => {
                              if (!isMobile) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 240, 255, 0.5)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isMobile) {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 240, 255, 0.3)';
                              }
                            }}
                          >
                            Buy {fromCrypto} Now →
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Dual Currency Input - Will be centered by component */}
                    <DualCurrencyInput
                      cryptoSymbol={fromCrypto}
                      fiatCurrency={selectedFiat}
                      onFiatChange={(amount) => {
                        const cryptoAmt = amount && prices[fromCrypto] ? amount / prices[fromCrypto].price_gbp : 0;
                        setFromAmount(cryptoAmt.toString());
                      }}
                      onCryptoChange={(amount) => {
                        setFromAmount(amount.toString());
                      }}
                      initialFiatAmount=""
                      initialCryptoAmount={fromAmount}
                      fee={1.5}
                      availableBalance={walletBalances[fromCrypto] || 0}
                      balanceInCrypto={true}
                      label=""
                      showCurrencySelector={true}
                    />
                  </div>

                  {/* Center Reverse Button - SMALLER & CLEANER */}
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '-8px 0 -8px 0', position: 'relative', zIndex: 10 }}>
                    <button
                      onClick={flipCurrencies}
                      style={{
                        width: isMobile ? '42px' : '46px',
                        height: isMobile ? '42px' : '46px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #00F0FF, #9B4DFF)',
                        border: '3px solid #071327',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s',
                        boxShadow: '0 0 20px rgba(0, 240, 255, 0.5), 0 0 40px rgba(155, 77, 255, 0.3)',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'rotate(180deg) scale(1.1)';
                        e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 240, 255, 0.7), 0 0 60px rgba(155, 77, 255, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.5), 0 0 40px rgba(155, 77, 255, 0.3)';
                      }}
                    >
                      <ArrowDownUp size={isMobile ? 20 : 22} color="white" strokeWidth={3} />
                    </button>
                  </div>

                  {/* To Section with Logo - CENTERED */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(155, 77, 255, 0.3)',
                    borderRadius: '18px',
                    padding: isMobile ? '20px' : '24px',
                    marginTop: '24px',
                    boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.3)',
                    maxWidth: isMobile ? '100%' : '600px',
                    margin: '24px auto 0 auto'
                  }}>
                    {/* TO Label */}
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ 
                        fontSize: isMobile ? '13px' : '14px', 
                        color: '#8F9BB3', 
                        fontWeight: '600', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.5px',
                        display: 'block'
                      }}>To</span>
                    </div>
                    
                    {/* ETH Selector - CENTERED */}
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'center',
                      marginBottom: '16px'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        background: 'rgba(155, 77, 255, 0.1)', 
                        padding: isMobile ? '10px 14px' : '12px 16px', 
                        borderRadius: '12px', 
                        border: '1px solid rgba(155, 77, 255, 0.3)' 
                      }}>
                        <img src={getCoinLogo(toCrypto)} alt={toCrypto} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                        <select
                          value={toCrypto}
                          onChange={(e) => setToCrypto(e.target.value)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#FFFFFF',
                            fontSize: isMobile ? '16px' : '18px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            outline: 'none',
                            appearance: 'none',
                            WebkitAppearance: 'none'
                          }}
                        >
                          {cryptos.map(crypto => (
                            <option 
                              key={crypto.code} 
                              value={crypto.code}
                              style={{
                                background: '#1A1F2E',
                                color: '#FFFFFF',
                                padding: '12px',
                                fontSize: '16px'
                              }}
                            >
                              {crypto.code} - {crypto.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* To Amount Display - CENTERED */}
                    <div style={{ 
                      background: '#0B1B2A',
                      border: '1px solid rgba(155, 77, 255, 0.3)',
                      borderRadius: '12px',
                      padding: isMobile ? '16px' : '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      maxWidth: '100%',
                      margin: '0 auto'
                    }}>
                      <span style={{ 
                        fontSize: isMobile ? '12px' : '13px',
                        color: '#8F9BB3',
                        fontWeight: '600'
                      }}>You Receive:</span>
                      <input
                        type="text"
                        value={toAmount}
                        readOnly
                        placeholder="0.00"
                        style={{
                          flex: 1,
                          background: 'transparent',
                          border: 'none',
                          color: '#9B4DFF',
                          fontSize: isMobile ? '20px' : '24px',
                          fontWeight: '700',
                          outline: 'none',
                          textAlign: 'right'
                        }}
                      />
                      <span style={{ 
                        color: '#9B4DFF',
                        fontSize: isMobile ? '14px' : '16px',
                        fontWeight: '600'
                      }}>{toCrypto}</span>
                    </div>
                    
                    {prices && toAmount && prices[toCrypto] && (
                      <div style={{ marginTop: '8px', textAlign: 'center', fontSize: isMobile ? '12px' : '13px', color: '#8F9BB3' }}>
                        ≈ £{(parseFloat(toAmount || 0) * (prices[toCrypto]?.price_gbp || 0)).toFixed(2)}
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

                  {/* Success Message - Right Where They Made the Swap */}
                  {swapSuccess && (
                    <div style={{
                      marginTop: '20px',
                      padding: '16px 20px',
                      background: 'linear-gradient(135deg, rgba(0, 240, 0, 0.1), rgba(0, 180, 0, 0.15))',
                      border: '2px solid rgba(0, 240, 0, 0.4)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      boxShadow: '0 4px 20px rgba(0, 240, 0, 0.2)',
                      animation: 'slideIn 0.3s ease-out'
                    }}>
                      <IoCheckmarkCircle size={32} color="#00F000" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#00F000', marginBottom: '4px' }}>
                          Swap Successful!
                        </div>
                        <div style={{ fontSize: '13px', color: '#FFFFFF' }}>
                          {swapSuccess.message}
                        </div>
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
                      icon={<IoFlash size={22} />}
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
                    <IoTrendingUp size={22} color="#00F0FF" strokeWidth={2.5} />
                    Market Prices
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {cryptos.slice(0, 6).map(crypto => {
                      const priceData = prices ? prices[crypto.code] : null;
                      const price = priceData?.price_usd || 0;
                      const change = priceData?.change_24h || 0;
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
                          <img src={getCoinLogo(crypto.code)} alt={crypto.code} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
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
                    <IoInformationCircle size={22} color="#9B4DFF" strokeWidth={2.5} />
                    Swap Info
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: isMobile ? '13px' : '14px', color: '#D1D5DB' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <IoCheckmarkCircle size={20} color="#22C55E" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>Instant swaps with best market rates</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <IoShield size={20} color="#00F0FF" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>Secure escrow protection on all swaps</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <IoCash size={20} color="#8FFF4E" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{platformFee}% platform fee - no hidden charges</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <IoFlash size={20} color="#F5C542" style={{ flexShrink: 0, marginTop: '2px' }} />
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
    </>
  );
}

export default SwapCrypto;
