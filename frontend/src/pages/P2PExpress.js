import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '@/components/Layout';
import { Zap, ArrowRight, Info, CheckCircle, Clock, Shield, DollarSign } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || 'https://p2ptrade-1.preview.emergentagent.com';

export default function P2PExpress() {
  const navigate = useNavigate();
  const [selectedCoin, setSelectedCoin] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [coins, setCoins] = useState([]);
  const [countries, setCountries] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const EXPRESS_FEE_PERCENT = 2.5;

  useEffect(() => {
    fetchCoins();
    fetchCountries();
    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    if (selectedCoin && amount && parseFloat(amount) > 0) {
      calculateQuote();
    } else {
      setQuote(null);
    }
  }, [selectedCoin, amount]);

  const fetchCoins = async () => {
    try {
      const response = await axios.get(`${API}/api/nowpayments/currencies`);
      if (response.data.success) {
        const coinList = response.data.currencies.map(coin => ({
          symbol: coin.toUpperCase(),
          name: coin.toUpperCase(),
          logo: getCoinLogo(coin.toUpperCase())
        }));
        setCoins(coinList);
        if (coinList.length > 0) {
          setSelectedCoin(coinList[0].symbol);
        }
      }
    } catch (error) {
      console.error('Error fetching coins:', error);
      const fallback = [
        { symbol: 'BTC', name: 'Bitcoin', logo: '₿' },
        { symbol: 'ETH', name: 'Ethereum', logo: 'Ξ' },
        { symbol: 'USDT', name: 'Tether', logo: '₮' }
      ];
      setCoins(fallback);
      setSelectedCoin('BTC');
    }
  };

  const fetchCountries = async () => {
    const countryList = [
      'United Kingdom', 'United States', 'Canada', 'Australia', 'Germany', 
      'France', 'Spain', 'Italy', 'Netherlands', 'Switzerland', 'Sweden',
      'Norway', 'Denmark', 'Belgium', 'Austria', 'Ireland', 'Portugal',
      'Singapore', 'Hong Kong', 'Japan', 'South Korea', 'India', 'Nigeria'
    ];
    setCountries(countryList);
    setSelectedCountry('United Kingdom');
  };

  const fetchPaymentMethods = async () => {
    const methods = [
      'Bank Transfer', 'PayPal', 'Revolut', 'Wise', 'Cash App',
      'Venmo', 'Zelle', 'Apple Pay', 'Google Pay', 'Card Payment'
    ];
    setPaymentMethods(methods);
    setSelectedPaymentMethod('Bank Transfer');
  };

  const getCoinLogo = (symbol) => {
    const logos = {
      'BTC': '₿',
      'ETH': 'Ξ',
      'USDT': '₮',
      'USDC': '$',
      'BNB': 'Ⓑ',
      'SOL': '◎',
      'XRP': 'Ʀ',
      'ADA': '₳',
      'DOGE': 'Ð'
    };
    return logos[symbol] || '◆';
  };

  const calculateQuote = async () => {
    setCalculating(true);
    try {
      const response = await axios.get(`${API}/api/prices/live`);
      if (response.data.success && response.data.prices) {
        const priceData = response.data.prices[selectedCoin];
        if (priceData) {
          const baseRate = priceData.price_gbp;
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
            estimatedDelivery: '2-5 minutes'
          });
        }
      }
    } catch (error) {
      console.error('Error calculating quote:', error);
      toast.error('Failed to calculate quote');
    } finally {
      setCalculating(false);
    }
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
        payment_method: selectedPaymentMethod,
        fiat_amount: quote.fiatAmount,
        crypto_amount: quote.cryptoAmount,
        base_rate: quote.baseRate,
        express_fee: quote.expressFee,
        express_fee_percent: EXPRESS_FEE_PERCENT,
        net_amount: quote.netAmount
      };

      const response = await axios.post(`${API}/api/p2p/express/create`, orderData);

      if (response.data.success) {
        toast.success('Express order created successfully!');
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
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #020618 0%, #071327 100%)', paddingBottom: '60px' }}>
        
        <div style={{ padding: '24px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

            {/* Header */}
            <div style={{ marginBottom: '40px' }}>
              <h1 style={{ fontSize: '42px', fontWeight: '700', color: '#FFFFFF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Zap size={42} color="#00F0FF" strokeWidth={2.5} />
                P2P Express
              </h1>
              <p style={{ fontSize: '17px', color: '#8F9BB3', margin: 0 }}>Instant crypto purchase with express delivery</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px' }}>
              
              {/* Left Column: Form */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.98) 0%, rgba(7, 19, 39, 0.95) 100%)',
                border: '2px solid rgba(0, 240, 255, 0.4)',
                borderRadius: '24px',
                padding: '32px',
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

                {/* Select Coin */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', color: '#8F9BB3', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Cryptocurrency</label>
                  <select
                    value={selectedCoin}
                    onChange={(e) => setSelectedCoin(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '16px',
                      fontWeight: '600',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {coins.map(coin => (
                      <option key={coin.symbol} value={coin.symbol}>
                        {coin.logo} {coin.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Country */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', color: '#8F9BB3', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Country</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '16px',
                      fontWeight: '600',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {countries.map(country => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Payment Method */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', color: '#8F9BB3', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Method</label>
                  <select
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '16px',
                      fontWeight: '600',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {paymentMethods.map(method => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Enter Amount */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', color: '#8F9BB3', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount (GBP)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount in GBP"
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '22px',
                      fontWeight: '700',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Quote Breakdown */}
                {quote && (
                  <div style={{
                    background: 'rgba(0, 240, 255, 0.05)',
                    border: '1px solid rgba(0, 240, 255, 0.2)',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '28px',
                    boxShadow: 'inset 0 2px 10px rgba(0, 240, 255, 0.1)'
                  }}>
                    <div style={{ fontSize: '13px', color: '#8F9BB3', marginBottom: '16px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Price Breakdown</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', color: '#D1D5DB' }}>Base Rate</span>
                      <span style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600' }}>£{quote.baseRate.toFixed(2)} per {quote.coin}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', color: '#D1D5DB' }}>Your Amount</span>
                      <span style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600' }}>£{quote.fiatAmount.toFixed(2)}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', color: '#F5C542' }}>Express Fee ({quote.expressFeePct}%)</span>
                      <span style={{ fontSize: '14px', color: '#F5C542', fontWeight: '700' }}>-£{quote.expressFee.toFixed(2)}</span>
                    </div>
                    
                    <div style={{ height: '1px', background: 'rgba(0, 240, 255, 0.2)', margin: '12px 0' }} />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: '600' }}>Net Amount</span>
                      <span style={{ fontSize: '15px', color: '#00F0FF', fontWeight: '700' }}>£{quote.netAmount.toFixed(2)}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '700' }}>You Receive</span>
                      <span style={{ fontSize: '18px', color: '#9B4DFF', fontWeight: '700' }}>{quote.cryptoAmount.toFixed(8)} {quote.coin}</span>
                    </div>
                  </div>
                )}

                {/* Confirm Button */}
                <div style={{ position: 'relative' }}>
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
                  <button
                    onClick={handleConfirmPurchase}
                    disabled={loading || !quote || !selectedCountry || !selectedPaymentMethod}
                    style={{
                      width: '100%',
                      padding: '18px',
                      background: loading || !quote ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #00F0FF, #9B4DFF)',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '18px',
                      fontWeight: '700',
                      cursor: loading || !quote ? 'not-allowed' : 'pointer',
                      opacity: loading || !quote ? 0.5 : 1,
                      transition: 'all 0.3s',
                      boxShadow: loading || !quote ? 'none' : '0 0 40px rgba(0, 240, 255, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px'
                    }}
                  >
                    {loading ? 'Processing...' : (
                      <>
                        <Zap size={22} />
                        Confirm & Pay
                      </>
                    )}
                  </button>
                </div>

              </div>

              {/* Right Column: Info & Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Estimated Delivery */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.95) 0%, rgba(7, 19, 39, 0.9) 100%)',
                  border: '2px solid rgba(155, 77, 255, 0.3)',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: '0 0 40px rgba(155, 77, 255, 0.2)'
                }}>
                  <h3 style={{ fontSize: '19px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Clock size={22} color="#9B4DFF" strokeWidth={2.5} />
                    Delivery Time
                  </h3>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#9B4DFF', marginBottom: '8px' }}>2-5 minutes</div>
                  <div style={{ fontSize: '14px', color: '#D1D5DB' }}>Express delivery to your wallet</div>
                </div>

                {/* Express Features */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.95) 0%, rgba(7, 19, 39, 0.9) 100%)',
                  border: '2px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: '0 0 40px rgba(0, 240, 255, 0.2)'
                }}>
                  <h3 style={{ fontSize: '19px', fontWeight: '700', color: '#FFFFFF', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle size={22} color="#00F0FF" strokeWidth={2.5} />
                    Express Features
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <Zap size={20} color="#F5C542" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600', marginBottom: '2px' }}>Instant Processing</div>
                        <div style={{ fontSize: '13px', color: '#8F9BB3' }}>Your order is processed immediately</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <Shield size={20} color="#00F0FF" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600', marginBottom: '2px' }}>Secure Escrow</div>
                        <div style={{ fontSize: '13px', color: '#8F9BB3' }}>Your funds are protected during the transaction</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <DollarSign size={20} color="#8FFF4E" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600', marginBottom: '2px' }}>Fixed {EXPRESS_FEE_PERCENT}% Fee</div>
                        <div style={{ fontSize: '13px', color: '#8F9BB3' }}>Transparent pricing, no hidden charges</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <CheckCircle size={20} color="#22C55E" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600', marginBottom: '2px' }}>24/7 Support</div>
                        <div style={{ fontSize: '13px', color: '#8F9BB3' }}>Get help anytime you need it</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Instructions */}
                {quote && (
                  <div style={{
                    background: 'rgba(245, 197, 66, 0.1)',
                    border: '1px solid rgba(245, 197, 66, 0.3)',
                    borderRadius: '16px',
                    padding: '20px'
                  }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <Info size={20} color="#F5C542" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '14px', color: '#F5C542', fontWeight: '700', marginBottom: '8px' }}>Payment Instructions</div>
                        <div style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: '1.6' }}>
                          After confirming, you'll receive payment details for {selectedPaymentMethod}. Complete the payment within 15 minutes to lock in this rate.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        </div>

      </div>
    </Layout>
  );
}
