import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

const AdminLiquidityManager = () => {
  const [liquidity, setLiquidity] = useState([]);
  const [depositAddresses, setDepositAddresses] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editValues, setEditValues] = useState({});
  const [showAddresses, setShowAddresses] = useState(false);
  const [realSyncMode, setRealSyncMode] = useState(false);
  const [nowpaymentsEnabled, setNowpaymentsEnabled] = useState(false);
  const [liquidityBlocks, setLiquidityBlocks] = useState([]);

  useEffect(() => {
    fetchLiquidity();
    fetchDepositAddresses();
    fetchSyncMode();
    fetchLiquidityBlocks();
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

  const fetchDepositAddresses = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/deposit-addresses`);
      const data = await response.json();
      if (data.success) {
        setDepositAddresses(data.addresses);
      }
    } catch (error) {
      console.error('Error fetching deposit addresses:', error);
    }
  };

  const fetchSyncMode = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/liquidity-sync-mode`);
      const data = await response.json();
      if (data.success) {
        setRealSyncMode(data.use_real_sync);
        setNowpaymentsEnabled(data.nowpayments_enabled);
      }
    } catch (error) {
      console.error('Failed to fetch sync mode:', error);
    }
  };

  const fetchLiquidityBlocks = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/liquidity-blocks?limit=10`);
      const data = await response.json();
      if (data.success) {
        setLiquidityBlocks(data.blocks || []);
      }
    } catch (error) {
      console.error('Failed to fetch liquidity blocks:', error);
    }
  };

  const toggleSyncMode = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/toggle-real-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: !realSyncMode })
      });
      const data = await response.json();
      if (data.success) {
        setRealSyncMode(!realSyncMode);
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to toggle sync mode' });
    }
    setUpdating(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const verifyNOWPayments = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/nowpayments/verify`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: '✅ NOWPayments API key verified!' });
      } else {
        setMessage({ type: 'error', text: `❌ ${data.message}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Verification failed' });
    }
    setUpdating(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const generateNOWPaymentsAddresses = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/nowpayments/generate-addresses`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: `✅ Generated ${data.count} real deposit addresses!` });
        fetchDepositAddresses();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Address generation failed' });
    }
    setUpdating(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
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

        {/* 🔒 Liquidity Sync Mode Toggle */}
        <div style={{
          background: 'rgba(255, 152, 0, 0.1)',
          border: '1px solid rgba(255, 152, 0, 0.3)',
          borderRadius: '12px',
          padding: '25px',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#FFA500', marginBottom: '15px', fontSize: '18px' }}>
            🔒 Liquidity Sync Mode
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
            <label style={{ 
              color: '#fff', 
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={realSyncMode}
                onChange={toggleSyncMode}
                disabled={!nowpaymentsEnabled || updating}
                style={{ 
                  width: '20px',
                  height: '20px',
                  cursor: nowpaymentsEnabled && !updating ? 'pointer' : 'not-allowed'
                }}
              />
              <span style={{ fontWeight: '600' }}>
                Use Real NOWPayments Sync
              </span>
            </label>
          </div>
          {realSyncMode ? (
            <div style={{ 
              padding: '12px',
              background: 'rgba(0, 255, 136, 0.1)',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              borderRadius: '8px',
              color: '#00FF88',
              fontSize: '13px'
            }}>
              ✅ <strong>Real sync ENABLED</strong> - All deposits will be automatically credited from NOWPayments. Manual entry is disabled.
            </div>
          ) : (
            <div style={{ 
              padding: '12px',
              background: 'rgba(142, 155, 174, 0.1)',
              border: '1px solid rgba(142, 155, 174, 0.3)',
              borderRadius: '8px',
              color: '#8E9BAE',
              fontSize: '13px'
            }}>
              ℹ️ Manual mode active. Use the forms below to add liquidity manually.
            </div>
          )}
          
          {!nowpaymentsEnabled && (
            <div style={{ 
              marginTop: '15px',
              padding: '12px',
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.3)',
              borderRadius: '8px',
              color: '#FF6B6B',
              fontSize: '13px'
            }}>
              ⚠️ NOWPayments API key not configured. Set NOWPAYMENTS_API_KEY in environment variables.
            </div>
          )}

          {nowpaymentsEnabled && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button
                onClick={verifyNOWPayments}
                disabled={updating}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(0, 240, 255, 0.2)',
                  border: '1px solid #00F0FF',
                  borderRadius: '6px',
                  color: '#00F0FF',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: updating ? 'not-allowed' : 'pointer',
                  opacity: updating ? 0.6 : 1
                }}
              >
                {updating ? '⏳ Verifying...' : '🔍 Verify API Key'}
              </button>
              <button
                onClick={generateNOWPaymentsAddresses}
                disabled={updating}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #7B2CFF, #00F0FF)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: updating ? 'not-allowed' : 'pointer',
                  opacity: updating ? 0.6 : 1
                }}
              >
                {updating ? '⏳ Generating...' : '🔄 Generate Real Addresses'}
              </button>
            </div>
          )}
        </div>

        {/* 🚫 Recent Liquidity Blocks */}
        {liquidityBlocks.length > 0 && (
          <div style={{
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            borderRadius: '12px',
            padding: '25px',
            marginBottom: '30px'
          }}>
            <h3 style={{ color: '#FF6B6B', marginBottom: '15px', fontSize: '18px' }}>
              🚫 Recent Blocked Operations ({liquidityBlocks.length})
            </h3>
            <p style={{ color: '#8E9BAE', fontSize: '13px', marginBottom: '15px' }}>
              Operations blocked due to insufficient platform liquidity:
            </p>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {liquidityBlocks.map((block, idx) => (
                <div key={idx} style={{
                  padding: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 107, 107, 0.2)',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  fontSize: '12px',
                  color: '#fff'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ color: '#FF6B6B', fontWeight: '600' }}>
                      {block.operation_type}
                    </span>
                    <span style={{ color: '#8E9BAE' }}>
                      {new Date(block.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ color: '#8E9BAE' }}>
                    Required: <span style={{ color: '#FF6B6B' }}>{block.amount_required} {block.currency}</span>
                    {' '} | Available: {block.available_liquidity} {block.currency}
                    {' '} | Shortage: {block.shortage}
                  </div>
                  {block.user_id && (
                    <div style={{ color: '#8E9BAE', marginTop: '3px' }}>
                      User: {block.user_id}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={fetchLiquidityBlocks}
              style={{
                marginTop: '15px',
                padding: '8px 16px',
                background: 'rgba(255, 107, 107, 0.2)',
                border: '1px solid #FF6B6B',
                borderRadius: '6px',
                color: '#FF6B6B',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🔄 Refresh Blocks
            </button>
          </div>
        )}

        {/* Crypto Deposit Addresses */}
        <div style={{
          background: 'rgba(13, 23, 38, 0.6)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(123, 44, 255, 0.3)',
          padding: '25px',
          marginBottom: '30px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ color: '#7B2CFF', fontSize: '18px', margin: 0 }}>
              📥 Crypto Deposit Addresses
            </h3>
            <button
              onClick={() => setShowAddresses(!showAddresses)}
              style={{
                padding: '8px 20px',
                background: 'rgba(123, 44, 255, 0.2)',
                border: '1px solid #7B2CFF',
                borderRadius: '6px',
                color: '#7B2CFF',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {showAddresses ? '🔒 Hide Addresses' : '👁️ Show Addresses'}
            </button>
          </div>
          
          {showAddresses && Object.keys(depositAddresses).length > 0 && (
            <div>
              <p style={{ color: '#8E9BAE', fontSize: '14px', marginBottom: '20px' }}>
                💡 Send crypto to these addresses to automatically top up liquidity. Each deposit will be credited within minutes.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                {Object.entries(depositAddresses).slice(0, 8).map(([currency, address]) => (
                  <div key={currency} style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(123, 44, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '15px'
                  }}>
                    <div style={{ color: '#fff', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
                      {currency}
                    </div>
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: '#00FF88',
                      wordBreak: 'break-all',
                      marginBottom: '8px'
                    }}>
                      {address}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(address);
                        setMessage({ type: 'success', text: `${currency} address copied!` });
                        setTimeout(() => setMessage({ type: '', text: '' }), 2000);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: 'rgba(123, 44, 255, 0.2)',
                        border: '1px solid rgba(123, 44, 255, 0.4)',
                        borderRadius: '4px',
                        color: '#7B2CFF',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      📋 Copy Address
                    </button>
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: '20px',
                padding: '15px',
                background: 'rgba(255, 152, 0, 0.1)',
                border: '1px solid rgba(255, 152, 0, 0.3)',
                borderRadius: '8px',
                color: '#FFA500',
                fontSize: '13px'
              }}>
                ⚠️ <strong>DEMO MODE:</strong> These are example addresses. In production, integrate with NOWPayments or your own wallet infrastructure.
              </div>
            </div>
          )}
        </div>

        {/* Simulate Crypto Deposit (Testing) */}
        <div style={{
          background: 'rgba(13, 23, 38, 0.6)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 152, 0, 0.3)',
          padding: '25px',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#FFA500', marginBottom: '10px', fontSize: '18px' }}>
            🧪 Test Blockchain Deposit (Simulator)
          </h3>
          <p style={{ color: '#8E9BAE', fontSize: '13px', marginBottom: '15px' }}>
            Simulate receiving crypto deposits to test the automated crediting system. Deposits take 30-60 seconds to process.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            {['BTC', 'ETH', 'USDT_ERC20', 'LTC'].map(currency => (
              <div key={currency}>
                <label style={{ color: '#8E9BAE', fontSize: '14px', display: 'block', marginBottom: '5px' }}>
                  Simulate {currency} Deposit
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="number"
                    placeholder="Amount"
                    id={`simulate-${currency}`}
                    step="any"
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 152, 0, 0.3)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    onClick={async () => {
                      const input = document.getElementById(`simulate-${currency}`);
                      const amount = input.value;
                      if (amount && parseFloat(amount) > 0) {
                        setUpdating(true);
                        try {
                          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/simulate-deposit`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ currency, amount: parseFloat(amount) })
                          });
                          const data = await response.json();
                          if (data.success) {
                            setMessage({ 
                              type: 'success', 
                              text: `🧪 Simulating ${amount} ${currency} deposit. Check back in 30-60 seconds!` 
                            });
                            input.value = '';
                            // Auto-refresh after 60 seconds
                            setTimeout(() => {
                              fetchLiquidity();
                              setMessage({ type: 'success', text: '✅ Deposit should be credited now!' });
                            }, 60000);
                          } else {
                            setMessage({ type: 'error', text: data.message || 'Simulation failed' });
                          }
                        } catch (error) {
                          setMessage({ type: 'error', text: 'Network error' });
                        }
                        setUpdating(false);
                        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
                      }
                    }}
                    disabled={updating}
                    style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #FFA500, #FF6B35)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: updating ? 'not-allowed' : 'pointer',
                      opacity: updating ? 0.6 : 1
                    }}
                  >
                    🧪
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

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
            ⚡ Quick GBP Top-Up (Instant)
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