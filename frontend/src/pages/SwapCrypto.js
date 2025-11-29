import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Layout from '@/components/Layout';
import { ArrowDownUp, TrendingUp, Info, RefreshCw } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || 'https://coinhubuix.preview.emergentagent.com';

// Fiat currencies remain static (managed separately)
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
  // DYNAMIC: Crypto list fetched from backend
  const [cryptos, setCryptos] = useState([
    { code: 'BTC', name: 'Bitcoin' },
    { code: 'ETH', name: 'Ethereum' },
    { code: 'USDT', name: 'Tether' }
  ]);
  
  const [fromCrypto, setFromCrypto] = useState('BTC');
  const [toCrypto, setToCrypto] = useState('ETH');
  const [fromFiat, setFromFiat] = useState('USD');
  const [toFiat, setToFiat] = useState('USD');
  
  const [fromInputMode, setFromInputMode] = useState('crypto'); // 'crypto' or 'fiat'
  const [toInputMode, setToInputMode] = useState('crypto');
  
  const [fromCryptoAmount, setFromCryptoAmount] = useState('');
  const [fromFiatAmount, setFromFiatAmount] = useState('');
  const [toCryptoAmount, setToCryptoAmount] = useState('');
  const [toFiatAmount, setToFiatAmount] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [prices, setPrices] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Fetch available swap coins (DYNAMIC)
  useEffect(() => {
    fetchAvailableCryptos();
  }, []);

  const fetchAvailableCryptos = async () => {
    try {
      const response = await axios.get(`${API}/api/swap/available-coins`);
      if (response.data.success && response.data.coins_detailed.length > 0) {
        const cryptoList = response.data.coins_detailed.map(coin => ({
          code: coin.symbol,
          name: coin.name
        }));
        setCryptos(cryptoList);
      }
    } catch (error) {
      console.error('Error fetching available cryptos:', error);
      // Keep default fallback
    }
  };

  // Fetch live prices every 10 seconds
  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-convert when 'from' amounts change
  useEffect(() => {
    if (fromInputMode === 'crypto' && fromCryptoAmount) {
      convertFromAmount();
    } else if (fromInputMode === 'fiat' && fromFiatAmount) {
      convertFromAmount();
    }
  }, [fromCryptoAmount, fromFiatAmount, fromCrypto, toCrypto, fromFiat, toFiat, fromInputMode, toInputMode, prices]);

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

  const convertFromAmount = async () => {
    if (!prices) return;
    
    const amount = fromInputMode === 'crypto' ? parseFloat(fromCryptoAmount) : parseFloat(fromFiatAmount);
    if (!amount || amount <= 0) {
      setToCryptoAmount('');
      setToFiatAmount('');
      setFromCryptoAmount(fromInputMode === 'fiat' ? '' : fromCryptoAmount);
      setFromFiatAmount(fromInputMode === 'crypto' ? '' : fromFiatAmount);
      return;
    }

    try {
      // Use the swap preview endpoint for accurate crypto-to-crypto conversion with hidden fees
      if (fromInputMode === 'crypto') {
        // User entered crypto amount - use swap preview
        const previewRes = await axios.post(`${API}/api/swap/preview`, {
          from_currency: fromCrypto,
          to_currency: toCrypto,
          from_amount: amount
        });
        
        if (previewRes.data.success) {
          // Set the output crypto amount
          setToCryptoAmount(previewRes.data.to_amount.toFixed(8));
          
          // Calculate fiat equivalents
          setFromFiatAmount((previewRes.data.from_value_gbp * 1.27).toFixed(2)); // GBP to USD approx
          setToFiatAmount((previewRes.data.to_value_gbp * 1.27).toFixed(2));
        }
      } else {
        // User entered fiat - convert to crypto first
        const res = await axios.post(`${API}/api/prices/convert`, {
          from_type: 'fiat',
          to_type: 'crypto',
          from_currency: fromFiat,
          to_currency: fromCrypto,
          amount: amount
        });
        const fromCryptoValue = res.data.converted_amount;
        setFromCryptoAmount(fromCryptoValue.toFixed(8));
        
        // Now use swap preview for the crypto-to-crypto conversion
        const previewRes = await axios.post(`${API}/api/swap/preview`, {
          from_currency: fromCrypto,
          to_currency: toCrypto,
          from_amount: fromCryptoValue
        });
        
        if (previewRes.data.success) {
          setToCryptoAmount(previewRes.data.to_amount.toFixed(8));
          setToFiatAmount((previewRes.data.to_value_gbp * 1.27).toFixed(2));
        }
      }

    } catch (error) {
      console.error('Conversion error:', error);
    }
  };

  const convertFromToAmount = async () => {
    if (!prices) return;
    
    const amount = toInputMode === 'crypto' ? parseFloat(toCryptoAmount) : parseFloat(toFiatAmount);
    if (!amount || amount <= 0) {
      setFromCryptoAmount('');
      setFromFiatAmount('');
      setToCryptoAmount(toInputMode === 'fiat' ? '' : toCryptoAmount);
      setToFiatAmount(toInputMode === 'crypto' ? '' : toFiatAmount);
      return;
    }

    try {
      // Convert TO input to TO crypto amount
      let toCryptoValue = amount;
      if (toInputMode === 'fiat') {
        const res = await axios.post(`${API}/api/prices/convert`, {
          from_type: 'fiat',
          to_type: 'crypto',
          from_currency: toFiat,
          to_currency: toCrypto,
          amount: amount
        });
        toCryptoValue = res.data.converted_amount;
        setToCryptoAmount(toCryptoValue.toFixed(8));
      } else {
        const res = await axios.post(`${API}/api/prices/convert`, {
          from_type: 'crypto',
          to_type: 'fiat',
          from_currency: toCrypto,
          to_currency: toFiat,
          amount: amount
        });
        setToFiatAmount(res.data.converted_amount.toFixed(2));
      }

      // Convert TO crypto to FROM crypto
      const fromCryptoRes = await axios.post(`${API}/api/prices/convert`, {
        from_type: 'crypto',
        to_type: 'crypto',
        from_currency: toCrypto,
        to_currency: fromCrypto,
        amount: toCryptoValue
      });
      const fromCryptoValue = fromCryptoRes.data.converted_amount;
      setFromCryptoAmount(fromCryptoValue.toFixed(8));

      // Convert FROM crypto to FROM fiat
      const fromFiatRes = await axios.post(`${API}/api/prices/convert`, {
        from_type: 'crypto',
        to_type: 'fiat',
        from_currency: fromCrypto,
        to_currency: fromFiat,
        amount: fromCryptoValue
      });
      setFromFiatAmount(fromFiatRes.data.converted_amount.toFixed(2));

    } catch (error) {
      console.error('Conversion error:', error);
    }
  };

  const handleFlipCurrencies = () => {
    setFromCrypto(toCrypto);
    setToCrypto(fromCrypto);
    setFromFiat(toFiat);
    setToFiat(fromFiat);
    setFromCryptoAmount(toCryptoAmount);
    setFromFiatAmount(toFiatAmount);
    setToCryptoAmount(fromCryptoAmount);
    setToFiatAmount(fromFiatAmount);
  };

  const handleSwap = async () => {
    if (!fromCryptoAmount || parseFloat(fromCryptoAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSwapping(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        toast.error('Please login first');
        return;
      }
      const user = JSON.parse(userStr);

      const response = await axios.post(`${API}/api/swap/execute`, {
        user_id: user.user_id,
        from_currency: fromCrypto,
        to_currency: toCrypto,
        from_amount: parseFloat(fromCryptoAmount)
      });

      if (response.data.success) {
        toast.success('Swap completed successfully!');
        setFromCryptoAmount('');
        setFromFiatAmount('');
        setToCryptoAmount('');
        setToFiatAmount('');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Swap failed');
    } finally {
      setSwapping(false);
    }
  };

  const getRateDisplay = () => {
    if (!prices || !fromCryptoAmount || parseFloat(fromCryptoAmount) <= 0) return '';
    const rate = parseFloat(toCryptoAmount) / parseFloat(fromCryptoAmount);
    return `1 ${fromCrypto} = ${rate.toFixed(8)} ${toCrypto}`;
  };

  return (
    <Layout>
      <style>{`
        select option {
          background: #1a1f3a !important;
          color: #fff !important;
          padding: 12px !important;
        }
        select option:hover {
          background: rgba(0, 240, 255, 0.2) !important;
        }
        select option:checked {
          background: rgba(0, 240, 255, 0.3) !important;
        }
      `}</style>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', padding: '2rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '800', background: 'linear-gradient(135deg, #00F0FF, #A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
              Crypto Swap
            </h1>
            <p style={{ color: '#888', fontSize: '14px' }}>
              Instant cryptocurrency exchange
            </p>
          </div>

          {/* Swap Card */}
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
            {/* FROM Section */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ color: '#888', fontSize: '14px', fontWeight: '600' }}>From</label>
                <button
                  onClick={() => setFromInputMode(fromInputMode === 'crypto' ? 'fiat' : 'crypto')}
                  style={{ color: '#00F0FF', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Switch to {fromInputMode === 'crypto' ? 'Fiat' : 'Crypto'}
                </button>
              </div>
              
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '16px', padding: '1rem', border: '2px solid rgba(0, 240, 255, 0.2)' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                  <select
                    value={fromInputMode === 'crypto' ? fromCrypto : fromFiat}
                    onChange={(e) => fromInputMode === 'crypto' ? setFromCrypto(e.target.value) : setFromFiat(e.target.value)}
                    style={{ 
                      flex: 1, 
                      padding: '12px', 
                      background: 'rgba(0, 0, 0, 0.4)', 
                      border: '1px solid rgba(0, 240, 255, 0.3)', 
                      borderRadius: '12px', 
                      color: '#00F0FF', 
                      fontSize: '16px',
                      cursor: 'pointer'
                    }}
                  >
                    {fromInputMode === 'crypto' ? (
                      cryptos.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)
                    ) : (
                      FIATS.map(f => <option key={f.code} value={f.code}>{f.symbol} {f.code} - {f.name}</option>)
                    )}
                  </select>
                </div>
                <input
                  type="number"
                  value={fromInputMode === 'crypto' ? fromCryptoAmount : fromFiatAmount}
                  onChange={(e) => fromInputMode === 'crypto' ? setFromCryptoAmount(e.target.value) : setFromFiatAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '12px', background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', fontWeight: '700', outline: 'none' }}
                />
                <div style={{ color: '#888', fontSize: '13px', marginTop: '0.5rem' }}>
                  {fromInputMode === 'crypto' && fromFiatAmount && (
                    <span>≈ {FIATS.find(f => f.code === fromFiat)?.symbol}{fromFiatAmount} {fromFiat}</span>
                  )}
                  {fromInputMode === 'fiat' && fromCryptoAmount && (
                    <span>≈ {fromCryptoAmount} {fromCrypto}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Flip Button */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
              <button
                onClick={handleFlipCurrencies}
                style={{ background: 'rgba(0, 240, 255, 0.1)', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.target.style.transform = 'rotate(180deg)'}
                onMouseLeave={(e) => e.target.style.transform = 'rotate(0deg)'}
              >
                <ArrowDownUp size={24} color="#00F0FF" />
              </button>
            </div>

            {/* TO Section */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ color: '#888', fontSize: '14px', fontWeight: '600' }}>To</label>
                <button
                  onClick={() => setToInputMode(toInputMode === 'crypto' ? 'fiat' : 'crypto')}
                  style={{ color: '#00F0FF', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Switch to {toInputMode === 'crypto' ? 'Fiat' : 'Crypto'}
                </button>
              </div>
              
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '16px', padding: '1rem', border: '2px solid rgba(168, 85, 247, 0.2)' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                  <select
                    value={toInputMode === 'crypto' ? toCrypto : toFiat}
                    onChange={(e) => toInputMode === 'crypto' ? setToCrypto(e.target.value) : setToFiat(e.target.value)}
                    style={{ 
                      flex: 1, 
                      padding: '12px', 
                      background: 'rgba(0, 0, 0, 0.4)', 
                      border: '1px solid rgba(168, 85, 247, 0.3)', 
                      borderRadius: '12px', 
                      color: '#A855F7', 
                      fontSize: '16px',
                      cursor: 'pointer'
                    }}
                  >
                    {toInputMode === 'crypto' ? (
                      cryptos.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)
                    ) : (
                      FIATS.map(f => <option key={f.code} value={f.code}>{f.symbol} {f.code} - {f.name}</option>)
                    )}
                  </select>
                </div>
                <input
                  type="number"
                  value={toInputMode === 'crypto' ? toCryptoAmount : toFiatAmount}
                  onChange={(e) => {
                    if (toInputMode === 'crypto') {
                      setToCryptoAmount(e.target.value);
                    } else {
                      setToFiatAmount(e.target.value);
                    }
                    convertFromToAmount();
                  }}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '12px', background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', fontWeight: '700', outline: 'none' }}
                />
                <div style={{ color: '#888', fontSize: '13px', marginTop: '0.5rem' }}>
                  {toInputMode === 'crypto' && toFiatAmount && (
                    <span>≈ {FIATS.find(f => f.code === toFiat)?.symbol}{toFiatAmount} {toFiat}</span>
                  )}
                  {toInputMode === 'fiat' && toCryptoAmount && (
                    <span>≈ {toCryptoAmount} {toCrypto}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Rate Info */}
            {getRateDisplay() && (
              <div style={{ background: 'rgba(0, 240, 255, 0.05)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid rgba(0, 240, 255, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={16} color="#00F0FF" />
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>{getRateDisplay()}</span>
                </div>
                {lastUpdate && (
                  <div style={{ color: '#666', fontSize: '12px', marginTop: '0.25rem' }}>
                    Last updated: {lastUpdate.toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}

            {/* Swap Button */}
            <button
              onClick={handleSwap}
              disabled={swapping || !fromCryptoAmount || parseFloat(fromCryptoAmount) <= 0}
              style={{
                width: '100%',
                padding: '18px',
                background: swapping || !fromCryptoAmount || parseFloat(fromCryptoAmount) <= 0 ? 'rgba(0, 240, 255, 0.2)' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                border: 'none',
                borderRadius: '16px',
                color: '#000',
                fontSize: '18px',
                fontWeight: '800',
                cursor: swapping || !fromCryptoAmount || parseFloat(fromCryptoAmount) <= 0 ? 'not-allowed' : 'pointer',
                opacity: swapping || !fromCryptoAmount || parseFloat(fromCryptoAmount) <= 0 ? 0.5 : 1,
                transition: 'all 0.3s'
              }}
            >
              {swapping ? 'Swapping...' : 'Swap Now'}
            </button>
          </div>

          {/* Info */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <Info size={16} color="#00F0FF" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ color: '#888', fontSize: '13px', lineHeight: '1.5' }}>
                <p style={{ margin: 0 }}>Live prices updated every 10 seconds from Binance</p>
                <p style={{ margin: '0.5rem 0 0 0' }}>Rates include real-time market spreads</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default SwapCrypto;