import React, { useState, useEffect } from 'react';
import './FiatOnRamp.css';

const FiatOnRamp = ({ userId, userEmail }) => {
  const [amount, setAmount] = useState('');
  const [fiatCurrency, setFiatCurrency] = useState('GBP');
  const [cryptoCurrency, setCryptoCurrency] = useState('BTC');
  const [loading, setLoading] = useState(false);
  const [widgetUrl, setWidgetUrl] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  const cryptoOptions = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'XRP', 'DOGE'];
  const fiatOptions = ['GBP', 'EUR', 'USD'];

  const handleBuy = async () => {
    if (!amount || parseFloat(amount) < 20) {
      alert('Minimum purchase amount is £20 / €20 / $20');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/fiat/onramp/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          amount: parseFloat(amount),
          fiat_currency: fiatCurrency,
          crypto_currency: cryptoCurrency
        })
      });

      const data = await response.json();

      if (data.success && data.widget_url) {
        // Open in new window or iframe
        setWidgetUrl(data.widget_url);
      } else {
        alert(data.detail || data.message || 'Fiat purchase not available');
      }
    } catch (error) {
      console.error('Fiat onramp error:', error);
      alert('Failed to initiate purchase. Please try P2P instead.');
    } finally {
      setLoading(false);
    }
  };

  if (widgetUrl) {
    return (
      <div className="fiat-onramp-widget">
        <div className="widget-header">
          <h3>Complete Your Purchase</h3>
          <button onClick={() => setWidgetUrl(null)} className="close-widget">×</button>
        </div>
        <iframe
          src={widgetUrl}
          title="Buy Crypto"
          allow="accelerometer; autoplay; camera; gyroscope; payment"
          frameBorder="0"
          style={{ width: '100%', height: '600px', borderRadius: '12px' }}
        />
        <p className="widget-note">Complete the purchase in the widget above. Your crypto will be credited automatically.</p>
      </div>
    );
  }

  return (
    <div className="fiat-onramp">
      <div className="onramp-header">
        <h3>💳 Buy Crypto Instantly</h3>
        <p>Purchase crypto with your debit/credit card</p>
      </div>

      <div className="onramp-form">
        <div className="form-row">
          <div className="form-group">
            <label>You Pay</label>
            <div className="input-with-select">
              <input
                type="number"
                min="20"
                placeholder="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <select value={fiatCurrency} onChange={(e) => setFiatCurrency(e.target.value)}>
                {fiatOptions.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="swap-icon">↓</div>

        <div className="form-row">
          <div className="form-group">
            <label>You Receive</label>
            <div className="input-with-select receive">
              <span className="estimated">≈ Estimated at checkout</span>
              <select value={cryptoCurrency} onChange={(e) => setCryptoCurrency(e.target.value)}>
                {cryptoOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <button 
          className="buy-btn"
          onClick={handleBuy}
          disabled={loading || !amount}
        >
          {loading ? 'Processing...' : `Buy ${cryptoCurrency}`}
        </button>

        <div className="onramp-info">
          <p>✓ Instant delivery to your CoinHubX wallet</p>
          <p>✓ Visa, Mastercard, Apple Pay accepted</p>
          <p>✓ Powered by regulated payment providers</p>
        </div>
      </div>
    </div>
  );
};

export default FiatOnRamp;
