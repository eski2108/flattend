import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

const AdminLiquidityManager = () => {
  const [liquidity, setLiquidity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    fetchLiquidity();
  }, []);

  const fetchLiquidity = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/liquidity-all`);
      const data = await response.json();
      if (data.success) {
        setLiquidity(data.liquidity);
        // Initialize edit values
        const initialValues = {};
        data.liquidity.forEach(liq => {
          initialValues[liq.currency] = liq.balance;
        });
        setEditValues(initialValues);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching liquidity:', error);
      setMessage({ type: 'error', text: 'Failed to load liquidity data' });
      setLoading(false);
    }
  };

  const handleUpdateBalance = async (currency) => {
    setUpdating(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/liquidity/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency: currency,
          new_balance: parseFloat(editValues[currency])
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: `${currency} balance updated successfully!` });
        fetchLiquidity();
      } else {
        setMessage({ type: 'error', text: data.message || 'Update failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    }
    setUpdating(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleAddAmount = async (currency, amount) => {
    setUpdating(true);
    try {
      const currentBalance = liquidity.find(l => l.currency === currency)?.balance || 0;
      const newBalance = parseFloat(currentBalance) + parseFloat(amount);
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/liquidity/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency: currency,
          new_balance: newBalance
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Added ${amount} ${currency} successfully!` });
        fetchLiquidity();
      } else {
        setMessage({ type: 'error', text: data.message || 'Update failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    }
    setUpdating(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  if (loading) {
    return (
      <Layout>
        <div style={{padding: '40px', color: '#fff', textAlign: 'center'}}>
          <div style={{fontSize: '18px'}}>Loading liquidity data...</div>
        </div>
      </Layout>
    );
  }

  const currencyGroups = {
    'Trading Liquidity': ['GBP', 'BTC', 'ETH', 'USDT', 'USDC'],
    'Major Crypto Assets': ['BNB', 'XRP', 'SOL', 'ADA', 'DOGE'],
    'Stablecoins & Others': ['DAI', 'BUSD', 'LTC', 'TRX', 'MATIC']
  };

  return (
    <Layout>
      <div style={{
        padding: '40px',
        maxWidth: '1400px',
        margin: '0 auto',
        minHeight: '100vh'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            marginBottom: '10px',
            background: 'linear-gradient(135deg, #00F0FF, #7B2CFF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            💰 Admin Liquidity Manager
          </h1>
          <p style={{ color: '#8E9BAE', fontSize: '16px' }}>
            Manage all platform liquidity pools in one place. Add or adjust balances instantly.
          </p>
        </div>

        {/* Message */}
        {message.text && (
          <div style={{
            padding: '15px 20px',
            borderRadius: '8px',
            marginBottom: '30px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: message.type === 'success' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 107, 107, 0.1)',
            border: `1px solid ${message.type === 'success' ? '#00FF88' : '#FF6B6B'}`,
            color: message.type === 'success' ? '#00FF88' : '#FF6B6B'
          }}>
            {message.type === 'success' ? '✅' : '⚠️'}
            {message.text}
          </div>
        )}

        {/* Quick Actions */}
        <div style={{
          background: 'rgba(13, 23, 38, 0.6)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          padding: '25px',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#00F0FF', marginBottom: '15px', fontSize: '18px' }}>
            ⚡ Quick Top-Up
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            {['GBP', 'BTC', 'ETH', 'USDT'].map(currency => (
              <div key={currency}>
                <label style={{ color: '#8E9BAE', fontSize: '14px', display: 'block', marginBottom: '5px' }}>
                  Add {currency}
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="number"
                    placeholder="Amount"
                    id={`quick-${currency}`}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById(`quick-${currency}`);
                      const amount = input.value;
                      if (amount && parseFloat(amount) > 0) {
                        handleAddAmount(currency, amount);
                        input.value = '';
                      }
                    }}
                    disabled={updating}
                    style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #00F0FF, #7B2CFF)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: updating ? 'not-allowed' : 'pointer',
                      opacity: updating ? 0.6 : 1
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Liquidity Groups */}
        {Object.entries(currencyGroups).map(([groupName, currencies]) => {
          const groupLiquidity = liquidity.filter(liq => currencies.includes(liq.currency));
          
          if (groupLiquidity.length === 0) return null;

          return (
            <div key={groupName} style={{
              background: 'rgba(13, 23, 38, 0.6)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              padding: '30px',
              marginBottom: '30px',
              boxShadow: '0 8px 32px rgba(0, 240, 255, 0.1)'
            }}>
              <h2 style={{
                color: '#00F0FF',
                fontSize: '24px',
                fontWeight: '600',
                marginBottom: '25px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                📊 {groupName}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                {groupLiquidity.map((liq) => (
                  <div key={liq.currency} style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '20px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '15px'
                    }}>
                      <span style={{
                        color: '#fff',
                        fontSize: '18px',
                        fontWeight: '700'
                      }}>
                        {liq.currency}
                      </span>
                      <span style={{
                        color: '#00FF88',
                        fontSize: '14px',
                        background: 'rgba(0, 255, 136, 0.1)',
                        padding: '4px 12px',
                        borderRadius: '20px'
                      }}>
                        Available: {parseFloat(liq.available).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 8
                        })}
                      </span>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ color: '#8E9BAE', fontSize: '14px', marginBottom: '8px' }}>
                        Current Balance
                      </div>
                      <div style={{
                        color: '#fff',
                        fontSize: '24px',
                        fontWeight: '600',
                        fontFamily: 'monospace'
                      }}>
                        {parseFloat(liq.balance).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 8
                        })}
                      </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ color: '#8E9BAE', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                        Set New Balance
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={editValues[liq.currency] || ''}
                        onChange={(e) => setEditValues({
                          ...editValues,
                          [liq.currency]: e.target.value
                        })}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(0, 240, 255, 0.3)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '16px',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>

                    <button
                      onClick={() => handleUpdateBalance(liq.currency)}
                      disabled={updating || editValues[liq.currency] == liq.balance}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: editValues[liq.currency] == liq.balance 
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'linear-gradient(135deg, #00F0FF, #7B2CFF)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: (updating || editValues[liq.currency] == liq.balance) ? 'not-allowed' : 'pointer',
                        opacity: (updating || editValues[liq.currency] == liq.balance) ? 0.5 : 1,
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!(updating || editValues[liq.currency] == liq.balance)) {
                          e.currentTarget.style.transform = 'scale(1.02)';
                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 240, 255, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {updating ? '⏳ Updating...' : '💾 Update Balance'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Refresh Button */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button
            onClick={fetchLiquidity}
            style={{
              padding: '15px 40px',
              background: 'rgba(0, 240, 255, 0.1)',
              border: '2px solid #00F0FF',
              borderRadius: '8px',
              color: '#00F0FF',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 240, 255, 0.2)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🔄 Refresh All Liquidity
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default AdminLiquidityManager;