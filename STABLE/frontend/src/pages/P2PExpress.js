import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import DualCurrencyInput from '@/components/DualCurrencyInput';
import { IoCash, IoCheckmark as Check, IoCheckmarkCircle, IoFlash, IoShield, IoTime, IoTrendingDown, IoTrendingUp } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

const COUNTRIES = [
  'United Kingdom', 'United States', 'Canada', 'Australia', 'Germany',
  'France', 'Spain', 'Italy', 'Netherlands', 'Switzerland', 'Sweden',
  'Norway', 'Denmark', 'Belgium', 'Austria', 'Ireland', 'Portugal',
  'Singapore', 'Hong Kong', 'Japan', 'South Korea', 'India', 'Nigeria'
];

export default function P2PExpress() {
  const navigate = useNavigate();
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [selectedCountry, setSelectedCountry] = useState('United Kingdom');
  const [fiatAmount, setFiatAmount] = useState('');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [coins, setCoins] = useState([]);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [livePrice, setLivePrice] = useState(null);
  const [hasAdminLiquidity, setHasAdminLiquidity] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(null);
  const [countdown, setCountdown] = useState(0);

  const EXPRESS_FEE_PERCENT = 2.5;

  // Handle window resize for mobile responsiveness
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchAvailableCoins();
  }, []);

  useEffect(() => {
    if (selectedCoin) {
      fetchLivePrice();
      const interval = setInterval(fetchLivePrice, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedCoin]);

  useEffect(() => {
    if (selectedCoin && cryptoAmount && parseFloat(cryptoAmount) > 0 && livePrice) {
      checkAdminLiquidity();
      calculateQuote();
    } else {
      setQuote(null);
      setHasAdminLiquidity(false);
    }
  }, [selectedCoin, cryptoAmount, livePrice]);

  const fetchAvailableCoins = async () => {
    try {
      const response = await axios.get(`${API}/api/nowpayments/currencies`);
      if (response.data.success && response.data.currencies) {
        const coinList = response.data.currencies.map(c => ({
          symbol: c.toUpperCase(),
          name: getCoinName(c.toUpperCase()),
          logo: getCoinLogo(c.toUpperCase())
        }));
        setCoins(coinList);
        if (coinList.length > 0 && !selectedCoin) {
          setSelectedCoin(coinList[0].symbol);
        }
      }
    } catch (error) {
      console.error('Error fetching coins:', error);
      const fallback = [
        { symbol: 'BTC', name: 'Bitcoin', logo: '₿' },
        { symbol: 'ETH', name: 'Ethereum', logo: 'Ξ' },
        { symbol: 'USDT', name: 'Tether', logo: '₮' },
        { symbol: 'USDC', name: 'USD Coin', logo: '$' },
        { symbol: 'BNB', name: 'Binance Coin', logo: 'Ⓑ' },
        { symbol: 'SOL', name: 'Solana', logo: '◎' },
        { symbol: 'XRP', name: 'Ripple', logo: 'Ɍ' },
        { symbol: 'ADA', name: 'Cardano', logo: '₳' },
        { symbol: 'LTC', name: 'Litecoin', logo: 'Ł' },
        { symbol: 'DOT', name: 'Polkadot', logo: '●' },
        { symbol: 'TRX', name: 'Tron', logo: '⊺' },
        { symbol: 'XLM', name: 'Stellar', logo: '*' },
        { symbol: 'MATIC', name: 'Polygon', logo: '⬡' },
        { symbol: 'DOGE', name: 'Dogecoin', logo: 'Ð' }
      ];
      setCoins(fallback);
    }
  };

  const getCoinName = (symbol) => {
    const names = {
      'BTC': 'Bitcoin', 'ETH': 'Ethereum', 'USDT': 'Tether', 'USDC': 'USD Coin',
      'BNB': 'Binance Coin', 'SOL': 'Solana', 'XRP': 'Ripple', 'ADA': 'Cardano',
      'LTC': 'Litecoin', 'DOT': 'Polkadot', 'TRX': 'Tron', 'XLM': 'Stellar',
      'MATIC': 'Polygon', 'DOGE': 'Dogecoin', 'AVAX': 'Avalanche', 'LINK': 'Chainlink',
      'UNI': 'Uniswap', 'ATOM': 'Cosmos', 'XMR': 'Monero', 'ETC': 'Ethereum Classic'
    };
    return names[symbol] || symbol;
  };

  const getCoinLogo = (symbol) => {
    const logos = {
      'BTC': '₿', 'ETH': 'Ξ', 'USDT': '₮', 'USDC': '$', 'BNB': 'Ⓑ',
      'SOL': '◎', 'XRP': 'Ɍ', 'ADA': '₳', 'LTC': 'Ł', 'DOT': '●',
      'TRX': '⊺', 'XLM': '*', 'MATIC': '⬡', 'DOGE': 'Ð'
    };
    return logos[symbol] || '◆';
  };

  const fetchLivePrice = async () => {
    try {
      const response = await axios.get(`${API}/api/prices/live`);
      if (response.data.success && response.data.prices) {
        const priceData = response.data.prices[selectedCoin];
        if (priceData) {
          setLivePrice({
            price_gbp: priceData.price_gbp,
            change_24h: priceData.change_24h || 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching live price:', error);
    }
  };

  const checkAdminLiquidity = async () => {
    if (!livePrice || !cryptoAmount || parseFloat(cryptoAmount) <= 0) return;

    try {
      const baseRate = livePrice.price_gbp;
      const expressFeeBP = cryptoAmount * (EXPRESS_FEE_PERCENT / 100);
      const netCryptoAmount = cryptoAmount - expressFeeBP;

      const response = await axios.post(`${API}/api/p2p/express/check-liquidity`, {
        crypto: selectedCoin,
        crypto_amount: netCryptoAmount
      });

      if (response.data.success) {
        setHasAdminLiquidity(response.data.has_liquidity);
      }
    } catch (error) {
      console.error('Error checking liquidity:', error);
      setHasAdminLiquidity(false);
    }
  };

  const calculateQuote = () => {
    if (!livePrice || !cryptoAmount) return;
    
    const baseRate = livePrice.price_gbp;
    const crypto = parseFloat(cryptoAmount);
    const cryptoFee = crypto * (EXPRESS_FEE_PERCENT / 100);
    const netCrypto = crypto - cryptoFee;
    const fiatValue = crypto * baseRate;
    const fiatFee = fiatValue * (EXPRESS_FEE_PERCENT / 100);
    const netFiat = fiatValue - fiatFee;

    setQuote({
      coin: selectedCoin,
      fiatAmount: fiatValue,
      baseRate: baseRate,
      expressFee: fiatFee,
      expressFeePct: EXPRESS_FEE_PERCENT,
      netAmount: netFiat,
      cryptoAmount: netCrypto,
      estimatedDelivery: hasAdminLiquidity ? 'Instant' : '2-5 minutes'
    });
  };

  const handleConfirmPurchase = async () => {
    if (!quote) return;

    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      toast.error('Please login to continue');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const user = JSON.parse(userData);

      // STEP 1: Generate Admin Liquidity Quote
      const quoteResponse = await axios.post(`${API}/api/admin-liquidity/quote`, {
        user_id: user.user_id,
        type: 'buy',
        crypto: selectedCoin,
        amount: parseFloat(cryptoAmount)
      });

      if (quoteResponse.data.success) {
        const adminQuote = quoteResponse.data.quote;
        setCurrentQuote({
          ...adminQuote,
          cryptoAmount: parseFloat(cryptoAmount),
          currency: selectedCoin
        });
        setShowQuoteModal(true);
        
        // Start countdown timer
        const expiresAt = new Date(adminQuote.expires_at);
        const updateTimer = setInterval(() => {
          const now = new Date();
          const remaining = Math.floor((expiresAt - now) / 1000);
          if (remaining <= 0) {
            clearInterval(updateTimer);
            setShowQuoteModal(false);
            toast.error('Quote expired. Please try again.');
          } else {
            setCountdown(remaining);
          }
        }, 1000);
      } else {
        toast.error(quoteResponse.data.message || 'Failed to get quote');
      }
    } catch (error) {
      console.error('Error getting quote:', error);
      toast.error(error.response?.data?.message || 'Failed to get quote');
    } finally {
      setLoading(false);
    }
  };

  const confirmQuote = async () => {
    if (!currentQuote) return;
    
    setLoading(true);
    try {
      const userData = localStorage.getItem('cryptobank_user');
      const user = JSON.parse(userData);
      
      // STEP 2: Execute with locked price
      const response = await axios.post(`${API}/api/admin-liquidity/execute`, {
        user_id: user.user_id,
        quote_id: currentQuote.quote_id
      });

      if (response.data.success) {
        // Show success state
        setPurchaseSuccess(true);
        setShowQuoteModal(false);
        
        toast.success(`✅ Bought ${currentQuote.cryptoAmount} ${currentQuote.currency}!`);
        
        // Clear the form after 5 seconds
        setTimeout(() => {
          setPurchaseSuccess(false);
          setFiatAmount('');
          setCryptoAmount('');
          setQuote(null);
        }, 8000);
      } else {
        toast.error(response.data.message || 'Failed to execute trade');
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      toast.error(error.response?.data?.message || 'Failed to execute trade');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #020618 0%, #071327 100%)',
        paddingBottom: '60px'
      }}>
        
        <div style={{ padding: isMobile ? '16px' : '24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

            {/* Header - Matching Swap exactly */}
            <div style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <div>
                <h1 style={{ 
                  fontSize: isMobile ? '32px' : '42px', 
                  fontWeight: '700', 
                  color: '#FFFFFF', 
                  marginBottom: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px'
                }}>
                  <IoFlash size={isMobile ? 32 : 42} color="#00F0FF" strokeWidth={2.5} />
                  P2P Express
                </h1>
                <p style={{ fontSize: isMobile ? '15px' : '17px', color: '#8F9BB3', margin: 0 }}>
                  Buy crypto with GBP instantly • 2-5 minute delivery
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '20px' : '32px' }}>
            
            <div style={{ flex: isMobile ? '1' : '1', minWidth: 0 }}>
              
              {livePrice && (
                <div style={{
                  background: 'rgba(12, 235, 255, 0.05)',
                  border: '2px solid rgba(12, 235, 255, 0.3)',
                  borderRadius: '20px',
                  padding: '24px',
                  marginBottom: '32px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '14px', color: '#8F9BB3', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Price</div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#0CEBFF' }}>
                      £{livePrice.price_gbp.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '14px', color: '#8F9BB3', marginTop: '4px' }}>per {selectedCoin}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', color: '#8F9BB3', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>24h Change</div>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: livePrice.change_24h >= 0 ? '#22C55E' : '#EF4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      justifyContent: 'flex-end'
                    }}>
                      {livePrice.change_24h >= 0 ? <IoTrendingUp size={24} /> : <IoTrendingDown size={24} />}
                      {livePrice.change_24h >= 0 ? '+' : ''}{livePrice.change_24h.toFixed(2)}%
                    </div>
                  </div>
                </div>
              )}

              {fiatAmount && parseFloat(fiatAmount) > 0 && quote && (
                <div style={{
                  background: hasAdminLiquidity ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 197, 66, 0.1)',
                  border: `2px solid ${hasAdminLiquidity ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 197, 66, 0.3)'}`,
                  borderRadius: '16px',
                  padding: '16px 20px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  {hasAdminLiquidity ? (
                    <>
                      <IoFlash size={20} color="#22C55E" />
                      <div>
                        <div style={{ fontSize: '15px', color: '#22C55E', fontWeight: '700' }}>Instant Delivery Available</div>
                        <div style={{ fontSize: '13px', color: '#D1D5DB', marginTop: '2px' }}>Crypto will be credited immediately</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <IoTime size={20} color="#F5C542" />
                      <div>
                        <div style={{ fontSize: '15px', color: '#F5C542', fontWeight: '700' }}>Express Seller (2-5 min)</div>
                        <div style={{ fontSize: '13px', color: '#D1D5DB', marginTop: '2px' }}>Matched with fastest qualified seller</div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {purchaseSuccess && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.1) 100%)',
                  border: '2px solid rgba(34, 197, 94, 0.5)',
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '24px',
                  textAlign: 'center',
                  boxShadow: '0 0 40px rgba(34, 197, 94, 0.3)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                    <IoCheckmarkCircle size={32} color="#22C55E" />
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#22C55E' }}>
                      Order Successful!
                    </div>
                  </div>
                  <div style={{ fontSize: '16px', color: '#FFFFFF', marginBottom: '8px' }}>
                    {hasAdminLiquidity 
                      ? 'Your crypto has been credited instantly to your wallet!'
                      : 'Your order has been matched with an express seller!'
                    }
                  </div>
                  <div style={{ fontSize: '14px', color: '#D1D5DB' }}>
                    You can make another purchase or check your wallet to see your new balance.
                  </div>
                </div>
              )}

              <div style={{
                background: 'linear-gradient(135deg, rgba(12, 235, 255, 0.08) 0%, rgba(0, 240, 255, 0.05) 100%)',
                border: '2px solid rgba(12, 235, 255, 0.3)',
                borderRadius: isMobile ? '16px' : '24px',
                padding: isMobile ? '20px' : '40px',
                boxShadow: '0 0 60px rgba(12, 235, 255, 0.2)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                
                <div style={{
                  position: 'absolute',
                  top: '-80px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '300px',
                  height: '160px',
                  background: 'radial-gradient(circle, rgba(12, 235, 255, 0.4), transparent)',
                  filter: 'blur(60px)',
                  pointerEvents: 'none'
                }} />

                <div style={{ marginBottom: '28px', position: 'relative', zIndex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#8F9BB3', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Select Cryptocurrency</label>
                  <select
                    value={selectedCoin}
                    onChange={(e) => setSelectedCoin(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '18px 20px',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '2px solid rgba(12, 235, 255, 0.3)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '16px',
                      fontWeight: '600',
                      outline: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {coins.map(coin => (
                      <option key={coin.symbol} value={coin.symbol}>
                        {coin.logo} {coin.name} ({coin.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '28px', position: 'relative', zIndex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#8F9BB3', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Select Country</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '18px 20px',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '2px solid rgba(12, 235, 255, 0.3)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '16px',
                      fontWeight: '600',
                      outline: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {COUNTRIES.map(country => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '32px', position: 'relative', zIndex: 1 }}>
                  <DualCurrencyInput
                    cryptoSymbol={selectedCoin}
                    fiatCurrency="GBP"
                    onFiatChange={(amount) => {
                      setFiatAmount(amount);
                    }}
                    onCryptoChange={(amount) => {
                      setCryptoAmount(amount);
                    }}
                    initialFiatAmount={fiatAmount}
                    initialCryptoAmount={cryptoAmount}
                    fee={EXPRESS_FEE_PERCENT}
                    availableBalance={userBalance}
                    balanceInCrypto={false}
                    label="Purchase Amount"
                    showCurrencySelector={true}
                  />
                </div>

                {quote && (
                  <div style={{
                    background: 'rgba(12, 235, 255, 0.08)',
                    border: '2px solid rgba(12, 235, 255, 0.3)',
                    borderRadius: '16px',
                    padding: '24px',
                    marginBottom: '32px',
                    boxShadow: 'inset 0 2px 10px rgba(12, 235, 255, 0.1)',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '20px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Price Breakdown</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span style={{ fontSize: '14px', color: '#D1D5DB' }}>Base Rate</span>
                      <span style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600' }}>£{quote.baseRate.toLocaleString()} per {quote.coin}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span style={{ fontSize: '14px', color: '#D1D5DB' }}>Your Amount</span>
                      <span style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600' }}>£{quote.fiatAmount.toFixed(2)}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span style={{ fontSize: '14px', color: '#F5C542' }}>Express Fee ({quote.expressFeePct}%)</span>
                      <span style={{ fontSize: '14px', color: '#F5C542', fontWeight: '700' }}>-£{quote.expressFee.toFixed(2)}</span>
                    </div>
                    
                    <div style={{ height: '1px', background: 'rgba(12, 235, 255, 0.3)', margin: '16px 0' }} />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: '600' }}>Net Amount</span>
                      <span style={{ fontSize: '15px', color: '#0CEBFF', fontWeight: '700' }}>£{quote.netAmount.toFixed(2)}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '17px', color: '#FFFFFF', fontWeight: '700' }}>You Receive</span>
                      <span style={{ fontSize: '20px', color: '#0CEBFF', fontWeight: '700' }}>{quote.cryptoAmount.toFixed(8)} {quote.coin}</span>
                    </div>
                  </div>
                )}

                {/* Desktop Buy Now Button - Hidden on mobile */}
                {!isMobile && (
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{
                      position: 'absolute',
                      top: '-20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '90%',
                      height: '60px',
                      background: 'linear-gradient(90deg, rgba(12, 235, 255, 0.5), rgba(0, 240, 255, 0.5))',
                      filter: 'blur(30px)',
                      pointerEvents: 'none'
                    }} />
                    <button
                      onClick={handleConfirmPurchase}
                      disabled={loading || !quote}
                      style={{
                        width: '100%',
                        padding: '20px',
                        background: loading || !quote ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #0CEBFF, #00F0FF)',
                        border: 'none',
                        borderRadius: '12px',
                        color: loading || !quote ? '#666' : '#000',
                        fontSize: '18px',
                        fontWeight: '700',
                        cursor: loading || !quote ? 'not-allowed' : 'pointer',
                        opacity: loading || !quote ? 0.5 : 1,
                        transition: 'all 0.3s',
                        boxShadow: loading || !quote ? 'none' : '0 0 40px rgba(12, 235, 255, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        position: 'relative'
                      }}
                    >
                      {loading ? 'Processing...' : (
                        <>
                          <IoFlash size={22} />
                          Buy Now
                        </>
                      )}
                    </button>
                  </div>
                )}
                
                {/* Mobile: Show simple message to scroll up for buy button */}
                {isMobile && quote && (
                  <div style={{
                    textAlign: 'center',
                    padding: '16px',
                    background: 'rgba(12, 235, 255, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid rgba(12, 235, 255, 0.3)'
                  }}>
                    <div style={{ fontSize: '14px', color: '#0CEBFF', fontWeight: '600' }}>
                      ↑ Scroll up to complete your purchase
                    </div>
                  </div>
                )}

              </div>

            </div>

            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: isMobile ? '16px' : '24px',
              flex: isMobile ? '0 0 auto' : '0 0 380px',
              order: isMobile ? -1 : 0
            }}>
              
              {/* Mobile Buy Now Button - Prominent at top */}
              {isMobile && quote && (
                <div style={{
                  position: 'sticky',
                  top: '80px',
                  zIndex: 100,
                  background: 'linear-gradient(135deg, rgba(12, 235, 255, 0.15) 0%, rgba(0, 240, 255, 0.1) 100%)',
                  border: '2px solid rgba(12, 235, 255, 0.5)',
                  borderRadius: '16px',
                  padding: '16px',
                  boxShadow: '0 0 40px rgba(12, 235, 255, 0.3), 0 8px 32px rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#8F9BB3', marginBottom: '4px' }}>You&apos;ll Receive</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#0CEBFF' }}>
                      {quote.cryptoAmount.toFixed(8)} {quote.coin}
                    </div>
                    <div style={{ fontSize: '16px', color: '#FFFFFF', marginTop: '2px' }}>
                      ≈ £{quote.netAmount.toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={handleConfirmPurchase}
                    disabled={loading || !quote}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: loading || !quote ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #0CEBFF, #00F0FF)',
                      border: 'none',
                      borderRadius: '12px',
                      color: loading || !quote ? '#666' : '#000',
                      fontSize: '18px',
                      fontWeight: '700',
                      cursor: loading || !quote ? 'not-allowed' : 'pointer',
                      opacity: loading || !quote ? 0.5 : 1,
                      transition: 'all 0.3s',
                      boxShadow: loading || !quote ? 'none' : '0 0 30px rgba(12, 235, 255, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px'
                    }}
                  >
                    {loading ? 'Processing...' : (
                      <>
                        <IoFlash size={20} />
                        Buy Now - Express Delivery
                      </>
                    )}
                  </button>
                </div>
              )}
              
              <div style={{
                background: 'linear-gradient(135deg, rgba(12, 235, 255, 0.1) 0%, rgba(0, 240, 255, 0.05) 100%)',
                border: '2px solid rgba(12, 235, 255, 0.4)',
                borderRadius: '20px',
                padding: isMobile ? '20px' : '28px',
                boxShadow: '0 0 40px rgba(12, 235, 255, 0.2)'
              }}>
                <h3 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <IoTime size={22} color="#0CEBFF" strokeWidth={2.5} />
                  Delivery Time
                </h3>
                <div style={{ fontSize: isMobile ? '32px' : '40px', fontWeight: '700', color: hasAdminLiquidity ? '#22C55E' : '#0CEBFF', marginBottom: '8px' }}>
                  {hasAdminLiquidity ? 'Instant' : '2-5 minutes'}
                </div>
                <div style={{ fontSize: '14px', color: '#D1D5DB' }}>
                  {hasAdminLiquidity ? 'Credited immediately' : 'Express delivery to your wallet'}
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, rgba(12, 235, 255, 0.1) 0%, rgba(0, 240, 255, 0.05) 100%)',
                border: '2px solid rgba(12, 235, 255, 0.4)',
                borderRadius: '20px',
                padding: '28px',
                boxShadow: '0 0 40px rgba(12, 235, 255, 0.2)'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <IoCheckmarkCircle size={22} color="#0CEBFF" strokeWidth={2.5} />
                  Express Features
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <IoFlash size={22} color="#0CEBFF" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: '700', marginBottom: '4px' }}>Instant Processing</div>
                      <div style={{ fontSize: '13px', color: '#8F9BB3', lineHeight: '1.5' }}>Your order is processed immediately</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <IoShield size={22} color="#22C55E" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: '700', marginBottom: '4px' }}>Secure Escrow</div>
                      <div style={{ fontSize: '13px', color: '#8F9BB3', lineHeight: '1.5' }}>Your funds are protected during the transaction</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <IoCash size={22} color="#F5C542" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: '700', marginBottom: '4px' }}>Fixed 2.5% Fee</div>
                      <div style={{ fontSize: '13px', color: '#8F9BB3', lineHeight: '1.5' }}>Transparent pricing, no hidden charges</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <IoCheckmarkCircle size={22} color="#0CEBFF" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: '700', marginBottom: '4px' }}>24/7 Support</div>
                      <div style={{ fontSize: '13px', color: '#8F9BB3', lineHeight: '1.5' }}>Get help anytime you need it</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            </div>

          </div>

        </div>

        {/* Admin Liquidity Quote Modal */}
        {showQuoteModal && currentQuote && (
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
                  Confirm Purchase
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
                    You're Buying
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
                    Total Cost
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#00C6FF' }}>
                    £{(currentQuote.cryptoAmount * currentQuote.locked_price).toFixed(2)}
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
                  <IoTime size={18} color="#EF4444" />
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
                  disabled={loading}
                  style={{
                    padding: '16px',
                    background: 'rgba(143, 155, 179, 0.1)',
                    border: '1px solid rgba(143, 155, 179, 0.3)',
                    borderRadius: '12px',
                    color: '#8F9BB3',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmQuote}
                  disabled={loading}
                  style={{
                    padding: '16px',
                    background: loading 
                      ? 'rgba(143, 155, 179, 0.2)' 
                      : 'linear-gradient(135deg, #22C55E, #16A34A)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 0 20px rgba(34, 197, 94, 0.4)',
                    transition: 'all 0.2s'
                  }}
                >
                  {loading ? 'Processing...' : 'Confirm Purchase'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
  );
}
