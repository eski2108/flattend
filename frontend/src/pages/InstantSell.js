import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || '';

function InstantSell() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [balances, setBalances] = useState([]);
  const [livePrices, setLivePrices] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Sell form
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [selling, setSelling] = useState(false);
  
  // Fee settings
  const [instantSellFee, setInstantSellFee] = useState(1.0);
  const [adminBuySpread, setAdminBuySpread] = useState(-2.5);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetchUserData();
    fetchLivePrices();
    fetchMonetizationSettings();
    
    // Refresh prices every 30 seconds
    const interval = setInterval(fetchLivePrices, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('user_id');
      
      const userResponse = await axios.get(`${API}/api/user/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (userResponse.data.success) {
        setUserData(userResponse.data.user);
      }

      const balanceResponse = await axios.get(`${API}/api/internal-balances/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (balanceResponse.data.balances) {
        const cryptoBalances = balanceResponse.data.balances.filter(b => b.currency !== 'GBP' && b.currency !== 'USD');
        setBalances(cryptoBalances);
        if (cryptoBalances.length > 0) {
          setSelectedCrypto(cryptoBalances[0].currency);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setLoading(false);
    }
  };

  const fetchLivePrices = async () => {
    try {
      const response = await axios.get(`${API}/api/prices/live`);
      if (response.data.success) {
        setLivePrices(response.data.prices);
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  const fetchMonetizationSettings = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/monetization/settings`);
      if (response.data.success) {
        setInstantSellFee(response.data.settings.instant_sell_fee_percent || 1.0);
        setAdminBuySpread(response.data.settings.admin_buy_spread_percent || -2.5);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleInstantSell = async () => {
    if (!cryptoAmount || parseFloat(cryptoAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const selectedBalance = balances.find(b => b.currency === selectedCrypto);
    if (!selectedBalance || selectedBalance.balance < parseFloat(cryptoAmount)) {
      alert(`Insufficient ${selectedCrypto} balance`);
      return;
    }

    setSelling(true);

    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('user_id');

      const response = await axios.post(
        `${API}/api/monetization/instant-sell`,
        {
          user_id: userId,
          crypto_currency: selectedCrypto,
          crypto_amount: parseFloat(cryptoAmount)
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        alert(response.data.message);
        setCryptoAmount('');
        fetchUserData();
      }
    } catch (error) {
      console.error('Error selling:', error);
      alert(error.response?.data?.detail || 'Failed to sell crypto');
    } finally {
      setSelling(false);
    }
  };

  const calculateGrossGBP = () => {
    if (!cryptoAmount || !livePrices[selectedCrypto]) return 0;
    const price = livePrices[selectedCrypto];
    const spreadAdjustedPrice = price * (1 + adminBuySpread / 100);
    return (parseFloat(cryptoAmount) * spreadAdjustedPrice).toFixed(2);
  };

  const calculateFee = () => {
    const gross = parseFloat(calculateGrossGBP());
    return (gross * instantSellFee / 100).toFixed(2);
  };

  const calculateNetGBP = () => {
    const gross = parseFloat(calculateGrossGBP());
    const fee = parseFloat(calculateFee());
    return (gross - fee).toFixed(2);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0A0E27' }}>
        <div style={{ fontSize: '24px', color: '#00F0FF', fontWeight: '700' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0A0E27 0%, #1A1F3A 100%)', padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            color: '#00F0FF',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '700',
            marginBottom: '1rem'
          }}
        >
          ← Back to Dashboard
        </button>

        <h1 style={{ fontSize: '48px', fontWeight: '900', color: '#fff', margin: 0, marginBottom: '0.5rem' }}>
          ⚡ Instant Sell
        </h1>
        <p style={{ fontSize: '18px', color: '#888', margin: 0 }}>
          Sell crypto instantly to admin at live market prices
        </p>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Sell Form */}
        <div style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ color: '#EF4444', fontSize: '24px', fontWeight: '900', marginBottom: '1.5rem' }}>
            Sell Crypto
          </h2>

          {/* Fee Notice */}
          <div style={{ background: 'rgba(255, 165, 0, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(255, 165, 0, 0.3)' }}>
            <div style={{ color: '#FFA500', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
              ⚠️ Instant Sell Fee: {instantSellFee}%
            </div>
            <div style={{ color: '#888', fontSize: '13px' }}>
              Admin buys at {Math.abs(adminBuySpread)}% below market price (spread is hidden in the price shown)
            </div>
          </div>

          {/* Crypto Selection */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
              Cryptocurrency
            </label>
            <select
              value={selectedCrypto}
              onChange={(e) => setSelectedCrypto(e.target.value)}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {balances.map(balance => (
                <option key={balance.currency} value={balance.currency}>
                  {balance.currency} (Available: {balance.balance.toFixed(6)})
                </option>
              ))}
            </select>
          </div>

          {/* Live Price Display */}
          {livePrices[selectedCrypto] && (
            <div style={{ background: 'rgba(0, 240, 255, 0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem' }}>Current Market Price</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#00F0FF' }}>
                £{livePrices[selectedCrypto].toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '0.5rem' }}>
                You receive: £{(livePrices[selectedCrypto] * (1 + adminBuySpread / 100)).toFixed(2)} per {selectedCrypto}
              </div>
            </div>
          )}

          {/* Amount */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
              Amount to Sell
            </label>
            <input
              type="number"
              value={cryptoAmount}
              onChange={(e) => setCryptoAmount(e.target.value)}
              placeholder="Enter amount"
              step="0.000001"
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '18px',
                fontWeight: '700'
              }}
            />
          </div>

          {/* Calculation Breakdown */}
          {cryptoAmount && parseFloat(cryptoAmount) > 0 && livePrices[selectedCrypto] && (
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: '#888', fontSize: '14px' }}>You sell:</span>
                <span style={{ color: '#fff', fontWeight: '700' }}>{cryptoAmount} {selectedCrypto}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: '#888', fontSize: '14px' }}>Price per unit:</span>
                <span style={{ color: '#fff', fontWeight: '700' }}>£{(livePrices[selectedCrypto] * (1 + adminBuySpread / 100)).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: '#888', fontSize: '14px' }}>Gross amount:</span>
                <span style={{ color: '#fff', fontWeight: '700' }}>£{calculateGrossGBP()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: '#888', fontSize: '14px' }}>Instant sell fee ({instantSellFee}%):</span>
                <span style={{ color: '#EF4444', fontWeight: '700' }}>-£{calculateFee()}</span>
              </div>
              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '1rem 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888', fontSize: '16px', fontWeight: '700' }}>You receive:</span>
                <span style={{ color: '#22C55E', fontWeight: '900', fontSize: '24px' }}>£{calculateNetGBP()}</span>
              </div>
            </div>
          )}

          {/* Sell Button */}
          <button
            onClick={handleInstantSell}
            disabled={selling}
            style={{
              width: '100%',
              padding: '1.25rem',
              background: selling ? 'rgba(239, 68, 68, 0.3)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '18px',
              fontWeight: '900',
              cursor: selling ? 'not-allowed' : 'pointer'
            }}
          >
            {selling ? 'Selling...' : 'Sell Now'}
          </button>
        </div>

        {/* Info */}
        <div style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '2rem' }}>
          <h3 style={{ color: '#00F0FF', fontSize: '18px', fontWeight: '700', marginBottom: '1rem' }}>
            How Instant Sell Works
          </h3>
          <ul style={{ color: '#888', fontSize: '14px', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
            <li>Sell any crypto instantly at live market prices</li>
            <li>Admin buys your crypto at {Math.abs(adminBuySpread)}% below market (spread built into price)</li>
            <li>{instantSellFee}% instant sell fee automatically deducted</li>
            <li>GBP credited to your wallet immediately</li>
            <li>No waiting for buyers - instant liquidity</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default InstantSell;
