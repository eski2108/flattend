import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '@/components/Layout';
import { IoCash, IoCheckmark as Check, IoCheckmarkCircle, IoFlash, IoShield, IoTime, IoTrendingDown, IoTrendingUp } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL || 'https://p2p-market-1.preview.emergentagent.com';

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
  const [amount, setAmount] = useState('');
  const [coins, setCoins] = useState([]);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [livePrice, setLivePrice] = useState(null);
  const [hasAdminLiquidity, setHasAdminLiquidity] = useState(false);

  const EXPRESS_FEE_PERCENT = 2.5;

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
    if (selectedCoin && amount && parseFloat(amount) > 0 && livePrice) {
      checkAdminLiquidity();
      calculateQuote();
    } else {
      setQuote(null);
      setHasAdminLiquidity(false);
    }
  }, [selectedCoin, amount, livePrice]);

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
    if (!livePrice || !amount || parseFloat(amount) <= 0) return;

    try {
      const baseRate = livePrice.price_gbp;
      const fiatAmount = parseFloat(amount);
      const expressFeeBP = fiatAmount * (EXPRESS_FEE_PERCENT / 100);
      const netAmount = fiatAmount - expressFeeBP;
      const cryptoAmount = netAmount / baseRate;

      const response = await axios.post(`${API}/api/p2p/express/check-liquidity`, {
        crypto: selectedCoin,
        crypto_amount: cryptoAmount
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
    if (!livePrice) return;
    
    const baseRate = livePrice.price_gbp;
    const fiatAmount = parseFloat(amount);
    const expressFeeBP = fiatAmount * (EXPRESS_FEE_PERCENT / 100);
    const netAmount = fiatAmount - expressFeeBP;
    const cryptoAmount = netAmount / baseRate;

    setQuote({
      coin: selectedCoin,
      fiatAmount: fiatAmount,
      baseRate: baseRate,
      expressFee: expressFeeBP,
      expressFeePct: EXPRESS_FEE_PERCENT,
      netAmount: netAmount,
      cryptoAmount: cryptoAmount,
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

      const orderData = {
        user_id: user.user_id,
        crypto: selectedCoin,
        country: selectedCountry,
        fiat_amount: quote.fiatAmount,
        crypto_amount: quote.cryptoAmount,
        base_rate: quote.baseRate,
        express_fee: quote.expressFee,
        express_fee_percent: EXPRESS_FEE_PERCENT,
        net_amount: quote.netAmount,
        has_admin_liquidity: hasAdminLiquidity
      };

      const response = await axios.post(`${API}/api/p2p/express/create`, orderData);

      if (response.data.success) {
        if (hasAdminLiquidity) {
          toast.success('Express order completed! Crypto credited instantly.');
        } else {
          toast.success('Express order created! Matched with seller.');
        }
        navigate(`/p2p/trade-detail/${response.data.trade_id}`);
      } else {
        toast.error(response.data.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating express order:', error);
      toast.error(error.response?.data?.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #05121F 0%, #0A1929 100%)', padding: '40px 20px' }}>
        
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          <div style={{ marginBottom: '48px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '48px', fontWeight: '700', color: '#FFFFFF', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <IoFlash size={48} color="#0CEBFF" strokeWidth={2.5} />
              P2P Express
            </h1>
            <p style={{ fontSize: '18px', color: '#8F9BB3', margin: 0 }}>Instant crypto purchase • 2-5 minute delivery</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '40px', alignItems: 'start' }}>
            
            <div>
              
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

              {amount && parseFloat(amount) > 0 && quote && (
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

              <div style={{
                background: 'linear-gradient(135deg, rgba(12, 235, 255, 0.08) 0%, rgba(0, 240, 255, 0.05) 100%)',
                border: '2px solid rgba(12, 235, 255, 0.3)',
                borderRadius: '24px',
                padding: '40px',
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
                  <label style={{ display: 'block', fontSize: '13px', color: '#8F9BB3', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Amount (GBP)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount in GBP"
                    style={{
                      width: '100%',
                      padding: '20px',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '2px solid rgba(12, 235, 255, 0.3)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '24px',
                      fontWeight: '700',
                      outline: 'none',
                      transition: 'all 0.3s',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                    }}
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

              </div>

            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div style={{
                background: 'linear-gradient(135deg, rgba(12, 235, 255, 0.1) 0%, rgba(0, 240, 255, 0.05) 100%)',
                border: '2px solid rgba(12, 235, 255, 0.4)',
                borderRadius: '20px',
                padding: '28px',
                boxShadow: '0 0 40px rgba(12, 235, 255, 0.2)'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <IoTime size={22} color="#0CEBFF" strokeWidth={2.5} />
                  Delivery Time
                </h3>
                <div style={{ fontSize: '40px', fontWeight: '700', color: hasAdminLiquidity ? '#22C55E' : '#0CEBFF', marginBottom: '8px' }}>
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
    </Layout>
  );
}
