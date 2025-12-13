import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

function OTCDesk() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // OTC Config
  const [otcConfig, setOtcConfig] = useState(null);
  
  // Quote Form
  const [tradeType, setTradeType] = useState('buy');
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [amountGBP, setAmountGBP] = useState('');
  const [creatingQuote, setCreatingQuote] = useState(false);
  
  // Active Quote
  const [activeQuote, setActiveQuote] = useState(null);
  const [quoteHistory, setQuoteHistory] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetchUserData();
    fetchOTCConfig();
    fetchQuoteHistory();
  }, [navigate]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/user/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setUserData(response.data.user);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setLoading(false);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const fetchOTCConfig = async () => {
    try {
      const response = await axios.get(`${API}/api/otc/config`);
      if (response.data.success) {
        setOtcConfig(response.data.config);
      }
    } catch (error) {
      console.error('Error fetching OTC config:', error);
      alert('Failed to load OTC configuration');
    }
  };

  const fetchQuoteHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('user_id');
      
      const response = await axios.get(`${API}/api/otc/quotes/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setQuoteHistory(response.data.quotes || []);
      }
    } catch (error) {
      console.error('Error fetching quote history:', error);
    }
  };

  const handleCreateQuote = async () => {
    if (!amountGBP || parseFloat(amountGBP) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!otcConfig) {
      alert('OTC configuration not loaded');
      return;
    }

    if (parseFloat(amountGBP) < otcConfig.otc_minimum_amount_gbp) {
      alert(`Minimum OTC trade amount is £${otcConfig.otc_minimum_amount_gbp.toLocaleString()}`);
      return;
    }

    setCreatingQuote(true);

    try {
      const userId = localStorage.getItem('user_id');
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${API}/api/otc/quote`,
        {
          user_id: userId,
          crypto_currency: selectedCrypto,
          fiat_currency: 'GBP',
          amount_gbp: parseFloat(amountGBP),
          trade_type: tradeType
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setActiveQuote(response.data.quote);
        alert('Quote created successfully! Valid for 15 minutes.');
        fetchQuoteHistory();
      }
    } catch (error) {
      console.error('Error creating quote:', error);
      alert(error.response?.data?.detail || 'Failed to create quote');
    } finally {
      setCreatingQuote(false);
    }
  };

  const handleExecuteQuote = async () => {
    if (!activeQuote) return;

    try {
      const userId = localStorage.getItem('user_id');
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${API}/api/otc/execute`,
        {
          quote_id: activeQuote.quote_id,
          user_id: userId
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        alert('OTC trade executed successfully!');
        setActiveQuote(null);
        setAmountGBP('');
        fetchUserData();
        fetchQuoteHistory();
      }
    } catch (error) {
      console.error('Error executing OTC trade:', error);
      alert(error.response?.data?.detail || 'Failed to execute trade');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0A0E27' }}>
        <div style={{ fontSize: '24px', color: '#00F0FF', fontWeight: '700' }}>Loading OTC Desk...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0A0E27 0%, #1A1F3A 100%)', padding: '2rem' }}>
      {/* Header */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', marginBottom: '2rem' }}>
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
          🏦 OTC Desk
        </h1>
        <p style={{ fontSize: '18px', color: '#888', margin: 0 }}>
          Large-volume crypto trading with institutional pricing
        </p>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Quote Creator */}
        <div style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '2rem' }}>
          <h2 style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '900', marginBottom: '1.5rem' }}>
            Create OTC Quote
          </h2>

          {otcConfig && (
            <div style={{ background: 'rgba(0, 240, 255, 0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem' }}>Minimum Trade Amount</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#00F0FF' }}>
                £{otcConfig.otc_minimum_amount_gbp.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '0.5rem' }}>
                Fee: {otcConfig.otc_fee_percent}% • Quote valid for 15 minutes
              </div>
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
              Trade Type
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setTradeType('buy')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: tradeType === 'buy' ? 'linear-gradient(135deg, #00F0FF, #A855F7)' : 'rgba(255, 255, 255, 0.05)',
                  border: tradeType === 'buy' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: tradeType === 'buy' ? '#000' : '#fff',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Buy Crypto
              </button>
              <button
                onClick={() => setTradeType('sell')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: tradeType === 'sell' ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'rgba(255, 255, 255, 0.05)',
                  border: tradeType === 'sell' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Sell Crypto
              </button>
            </div>
          </div>

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
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {otcConfig && otcConfig.supported_currencies.map(currency => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#888', fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
              Amount (GBP)
            </label>
            <input
              type="number"
              value={amountGBP}
              onChange={(e) => setAmountGBP(e.target.value)}
              placeholder="Enter amount in GBP"
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '18px',
                fontWeight: '700'
              }}
            />
          </div>

          <button
            onClick={handleCreateQuote}
            disabled={creatingQuote}
            style={{
              width: '100%',
              padding: '1.25rem',
              background: creatingQuote ? 'rgba(0, 240, 255, 0.3)' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
              border: 'none',
              borderRadius: '8px',
              color: creatingQuote ? '#888' : '#000',
              fontSize: '18px',
              fontWeight: '900',
              cursor: creatingQuote ? 'not-allowed' : 'pointer'
            }}
          >
            {creatingQuote ? 'Creating Quote...' : 'Get Quote'}
          </button>
        </div>

        {/* Active Quote */}
        <div style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(168, 85, 247, 0.3)', borderRadius: '16px', padding: '2rem' }}>
          <h2 style={{ color: '#A855F7', fontSize: '24px', fontWeight: '900', marginBottom: '1.5rem' }}>
            Active Quote
          </h2>

          {activeQuote ? (
            <div>
              <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ color: '#888', fontSize: '14px' }}>Trade Type</span>
                  <span style={{ color: '#fff', fontWeight: '700', textTransform: 'uppercase' }}>
                    {activeQuote.trade_type}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ color: '#888', fontSize: '14px' }}>Cryptocurrency</span>
                  <span style={{ color: '#00F0FF', fontWeight: '900', fontSize: '18px' }}>
                    {activeQuote.crypto_currency}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ color: '#888', fontSize: '14px' }}>Crypto Amount</span>
                  <span style={{ color: '#fff', fontWeight: '700' }}>
                    {activeQuote.crypto_amount.toFixed(6)} {activeQuote.crypto_currency}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ color: '#888', fontSize: '14px' }}>Price per Unit</span>
                  <span style={{ color: '#fff', fontWeight: '700' }}>
                    £{activeQuote.crypto_price_gbp.toFixed(2)}
                  </span>
                </div>

                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '1rem 0' }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ color: '#888', fontSize: '14px' }}>Base Amount</span>
                  <span style={{ color: '#fff', fontWeight: '700' }}>
                    £{activeQuote.gross_amount_gbp.toFixed(2)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ color: '#888', fontSize: '14px' }}>Fee ({activeQuote.fee_percent}%)</span>
                  <span style={{ color: '#EF4444', fontWeight: '700' }}>
                    £{activeQuote.fee_amount_gbp.toFixed(2)}
                  </span>
                </div>

                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '1rem 0' }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888', fontSize: '16px', fontWeight: '700' }}>
                    {activeQuote.trade_type === 'buy' ? 'Total Cost' : 'You Receive'}
                  </span>
                  <span style={{ color: '#00F0FF', fontWeight: '900', fontSize: '24px' }}>
                    £{(activeQuote.trade_type === 'buy' ? activeQuote.total_cost_gbp : activeQuote.total_received_gbp).toFixed(2)}
                  </span>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 165, 0, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(255, 165, 0, 0.3)' }}>
                <div style={{ fontSize: '13px', color: '#FFA500' }}>
                  ⏱️ Quote expires in 15 minutes
                </div>
              </div>

              <button
                onClick={handleExecuteQuote}
                style={{
                  width: '100%',
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '18px',
                  fontWeight: '900',
                  cursor: 'pointer'
                }}
              >
                ✓ Execute Trade
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#888' }}>
              <div style={{ fontSize: '64px', marginBottom: '1rem' }}>📋</div>
              <div style={{ fontSize: '16px' }}>No active quote</div>
              <div style={{ fontSize: '14px', marginTop: '0.5rem' }}>Create a quote to get started</div>
            </div>
          )}
        </div>
      </div>

      {/* Quote History */}
      {quoteHistory.length > 0 && (
        <div style={{ maxWidth: '1400px', margin: '2rem auto 0', background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '2rem' }}>
          <h2 style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '900', marginBottom: '1.5rem' }}>
            Quote History
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(0, 240, 255, 0.3)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#888', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#888', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>Crypto</th>
                  <th style={{ padding: '1rem', textAlign: 'right', color: '#888', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>Amount</th>
                  <th style={{ padding: '1rem', textAlign: 'right', color: '#888', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>Total</th>
                  <th style={{ padding: '1rem', textAlign: 'center', color: '#888', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'right', color: '#888', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {quoteHistory.map((quote, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '1rem', color: '#fff', fontWeight: '700', textTransform: 'uppercase' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '4px', 
                        background: quote.trade_type === 'buy' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: quote.trade_type === 'buy' ? '#22C55E' : '#EF4444'
                      }}>
                        {quote.trade_type}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#00F0FF', fontWeight: '700' }}>{quote.crypto_currency}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#fff', fontWeight: '600' }}>
                      {quote.crypto_amount.toFixed(6)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#fff', fontWeight: '700' }}>
                      £{(quote.total_cost_gbp || quote.total_received_gbp || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '700',
                        background: quote.status === 'completed' ? 'rgba(34, 197, 94, 0.2)' : quote.status === 'expired' ? 'rgba(255, 165, 0, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                        color: quote.status === 'completed' ? '#22C55E' : quote.status === 'expired' ? '#FFA500' : '#A855F7'
                      }}>
                        {quote.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#888', fontSize: '14px' }}>
                      {new Date(quote.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default OTCDesk;
