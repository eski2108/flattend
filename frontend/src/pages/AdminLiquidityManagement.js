import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const AdminLiquidityManagement = () => {
  const [liquidity, setLiquidity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState('add'); // 'add' or 'remove'
  const [processing, setProcessing] = useState(false);

  const SUPPORTED_COINS = [
    { symbol: 'GBP', name: 'British Pound', icon: '💷', decimals: 2 },
    { symbol: 'BTC', name: 'Bitcoin', icon: '₿', decimals: 8 },
    { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', decimals: 8 },
    { symbol: 'USDT', name: 'Tether', icon: '₮', decimals: 2 },
    { symbol: 'BNB', name: 'Binance Coin', icon: '🔶', decimals: 8 },
    { symbol: 'SOL', name: 'Solana', icon: '◎', decimals: 8 },
    { symbol: 'XRP', name: 'Ripple', icon: '✕', decimals: 6 },
    { symbol: 'LTC', name: 'Litecoin', icon: 'Ł', decimals: 8 }
  ];

  useEffect(() => {
    fetchLiquidity();
  }, []);

  const fetchLiquidity = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/admin/liquidity/status`);
      
      if (response.data.success) {
        // Merge with supported coins to show all
        const liquidityMap = {};
        response.data.liquidity.forEach(liq => {
          liquidityMap[liq.currency] = liq;
        });

        const allCoins = SUPPORTED_COINS.map(coin => ({
          ...coin,
          balance: liquidityMap[coin.symbol]?.balance || 0,
          available: liquidityMap[coin.symbol]?.available || 0,
          reserved: liquidityMap[coin.symbol]?.reserved || 0
        }));

        setLiquidity(allCoins);
      }
    } catch (error) {
      console.error('Error fetching liquidity:', error);
      toast.error('Failed to load liquidity data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLiquidity = async () => {
    if (!selectedCoin || !amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setProcessing(true);
      
      const response = await axios.post(`${API}/api/admin/liquidity/update`, {
        currency: selectedCoin.symbol,
        amount: parseFloat(amount),
        action: action // 'add' or 'remove'
      });

      if (response.data.success) {
        toast.success(`Successfully ${action === 'add' ? 'added' : 'removed'} ${amount} ${selectedCoin.symbol}`);
        setAmount('');
        setSelectedCoin(null);
        await fetchLiquidity();
      } else {
        toast.error(response.data.message || 'Failed to update liquidity');
      }
    } catch (error) {
      console.error('Error updating liquidity:', error);
      toast.error(error.response?.data?.detail || 'Failed to update liquidity');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{
          padding: '40px',
          color: '#fff',
          textAlign: 'center',
          fontSize: '18px'
        }}>
          Loading liquidity data...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{
        padding: '40px',
        maxWidth: '1400px',
        margin: '0 auto'
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
            💰 Liquidity Management
          </h1>
          <p style={{
            color: '#8F9BB3',
            fontSize: '16px'
          }}>
            Manage platform liquidity for instant buy/sell operations
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '30px'
        }}>
          {/* Liquidity Table */}
          <div style={{
            background: 'rgba(13, 23, 38, 0.6)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            padding: '30px',
            boxShadow: '0 8px 32px rgba(0, 240, 255, 0.1)'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#fff',
              marginBottom: '20px'
            }}>
              Current Liquidity
            </h2>

            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{
                    borderBottom: '2px solid rgba(0, 240, 255, 0.3)'
                  }}>
                    <th style={{
                      textAlign: 'left',
                      padding: '15px',
                      color: '#00F0FF',
                      fontSize: '14px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>Currency</th>
                    <th style={{
                      textAlign: 'right',
                      padding: '15px',
                      color: '#00F0FF',
                      fontSize: '14px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>Balance</th>
                    <th style={{
                      textAlign: 'right',
                      padding: '15px',
                      color: '#00F0FF',
                      fontSize: '14px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>Available</th>
                    <th style={{
                      textAlign: 'right',
                      padding: '15px',
                      color: '#00F0FF',
                      fontSize: '14px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>Reserved</th>
                    <th style={{
                      textAlign: 'center',
                      padding: '15px',
                      color: '#00F0FF',
                      fontSize: '14px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {liquidity.map((coin, index) => (
                    <tr key={coin.symbol} style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 240, 255, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{
                        padding: '15px',
                        color: '#fff'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '24px' }}>{coin.icon}</span>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '16px' }}>{coin.symbol}</div>
                            <div style={{ fontSize: '12px', color: '#8F9BB3' }}>{coin.name}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{
                        padding: '15px',
                        textAlign: 'right',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: '500'
                      }}>
                        {coin.balance.toFixed(coin.decimals)}
                      </td>
                      <td style={{
                        padding: '15px',
                        textAlign: 'right',
                        color: '#22C55E',
                        fontSize: '16px',
                        fontWeight: '500'
                      }}>
                        {coin.available.toFixed(coin.decimals)}
                      </td>
                      <td style={{
                        padding: '15px',
                        textAlign: 'right',
                        color: '#FFA500',
                        fontSize: '16px',
                        fontWeight: '500'
                      }}>
                        {coin.reserved.toFixed(coin.decimals)}
                      </td>
                      <td style={{
                        padding: '15px',
                        textAlign: 'center'
                      }}>
                        <button
                          onClick={() => setSelectedCoin(coin)}
                          style={{
                            background: 'linear-gradient(135deg, #00F0FF, #7B2CFF)',
                            color: '#fff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}  
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add/Remove Panel */}
          <div style={{
            background: 'rgba(13, 23, 38, 0.6)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            padding: '30px',
            boxShadow: '0 8px 32px rgba(0, 240, 255, 0.1)',
            height: 'fit-content'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#fff',
              marginBottom: '20px'
            }}>
              Update Liquidity
            </h2>

            {selectedCoin ? (
              <div>
                <div style={{
                  background: 'rgba(0, 240, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px',
                  border: '1px solid rgba(0, 240, 255, 0.3)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '32px' }}>{selectedCoin.icon}</span>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>
                        {selectedCoin.symbol}
                      </div>
                      <div style={{ fontSize: '14px', color: '#8F9BB3' }}>
                        {selectedCoin.name}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    marginTop: '15px'
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '5px' }}>Balance</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#fff' }}>
                        {selectedCoin.balance.toFixed(selectedCoin.decimals)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#8F9BB3', marginBottom: '5px' }}>Available</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#22C55E' }}>
                        {selectedCoin.available.toFixed(selectedCoin.decimals)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Selector */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#8F9BB3',
                    marginBottom: '10px'
                  }}>
                    Action
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setAction('add')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: action === 'add' ? '2px solid #22C55E' : '1px solid rgba(255,255,255,0.1)',
                        background: action === 'add' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)',
                        color: action === 'add' ? '#22C55E' : '#8F9BB3',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      ➕ Add
                    </button>
                    <button
                      onClick={() => setAction('remove')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: action === 'remove' ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
                        background: action === 'remove' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                        color: action === 'remove' ? '#EF4444' : '#8F9BB3',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      ➖ Remove
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#8F9BB3',
                    marginBottom: '10px'
                  }}>
                    Amount
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Enter amount in ${selectedCoin.symbol}`}
                    step={selectedCoin.decimals === 8 ? '0.00000001' : '0.01'}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setSelectedCoin(null);
                      setAmount('');
                    }}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#8F9BB3',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateLiquidity}
                    disabled={processing || !amount || parseFloat(amount) <= 0}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: processing ? 'rgba(255,255,255,0.1)' : 
                        (action === 'add' ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'linear-gradient(135deg, #EF4444, #DC2626)'),
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: processing ? 'not-allowed' : 'pointer',
                      opacity: processing || !amount || parseFloat(amount) <= 0 ? 0.5 : 1
                    }}
                  >
                    {processing ? 'Processing...' : `${action === 'add' ? 'Add' : 'Remove'} ${selectedCoin.symbol}`}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#8F9BB3'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>💰</div>
                <div style={{ fontSize: '16px' }}>Select a currency to manage liquidity</div>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div style={{
          marginTop: '30px',
          background: 'rgba(0, 240, 255, 0.05)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#00F0FF',
            marginBottom: '10px'
          }}>
            ℹ️ Important Information
          </h3>
          <ul style={{
            color: '#8F9BB3',
            fontSize: '14px',
            lineHeight: '1.8',
            paddingLeft: '20px'
          }}>
            <li><strong>Balance:</strong> Total liquidity available in admin wallet</li>
            <li><strong>Available:</strong> Liquidity available for instant buy/sell operations</li>
            <li><strong>Reserved:</strong> Liquidity currently locked in pending transactions</li>
            <li><strong>Add:</strong> Increases liquidity (use when you deposit funds to platform)</li>
            <li><strong>Remove:</strong> Decreases liquidity (use when withdrawing platform funds)</li>
            <li><strong>⚠️ Warning:</strong> Ensure you have actual funds before adding liquidity</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default AdminLiquidityManagement;