import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { IoRefresh, IoWalletOutline, IoSwapHorizontalOutline, IoPaperPlaneOutline, IoDownloadOutline, IoTrendingUpOutline, IoTrendingDownOutline } from 'react-icons/io5';
import { getCoinLogo } from '@/utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

export default function WalletPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('crypto'); // crypto, activity, portfolio
  
  // Data states
  const [allCoins, setAllCoins] = useState([]);
  const [balances, setBalances] = useState([]);
  const [priceData, setPriceData] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Totals
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [totalChange24h, setTotalChange24h] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) { navigate('/login'); return; }
    const u = JSON.parse(userData);
    setUser(u);
    loadAllData(u.user_id);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (u.user_id) {
        loadBalances(u.user_id);
        loadPriceData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  const loadAllData = async (userId) => {
    setLoading(true);
    await Promise.all([
      loadCoinMetadata(),
      loadBalances(userId),
      loadPriceData(),
      loadTransactions(userId)
    ]);
    setLoading(false);
  };

  const loadCoinMetadata = async () => {
    try {
      const response = await axios.get(`${API}/api/wallets/coin-metadata`);
      if (response.data.success) {
        setAllCoins(response.data.coins || []);
      }
    } catch (error) {
      console.error('Failed to load coin metadata:', error);
    }
  };

  const loadBalances = async (userId) => {
    try {
      const response = await axios.get(`${API}/api/wallets/balances/${userId}`);
      if (response.data.success) {
        const bals = response.data.balances || [];
        setBalances(bals);
        
        // Calculate total portfolio value
        let total = 0;
        bals.forEach(bal => {
          total += bal.gbp_value || 0;
        });
        setTotalPortfolioValue(total);
      }
    } catch (error) {
      console.error('Failed to load balances:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadPriceData = async () => {
    try {
      const response = await axios.get(`${API}/api/prices/live`);
      if (response.data.success) {
        setPriceData(response.data.prices || {});
      }
    } catch (error) {
      console.error('Failed to load price data:', error);
    }
  };

  const loadTransactions = async (userId) => {
    try {
      const response = await axios.get(`${API}/api/transactions/${userId}`);
      if (response.data.success) {
        setTransactions(response.data.transactions || []);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const handleRefresh = () => {
    if (!refreshing && user) {
      setRefreshing(true);
      loadAllData(user.user_id);
    }
  };

  const getAssetAllocation = (assetGbpValue) => {
    if (totalPortfolioValue === 0) return 0;
    return ((assetGbpValue / totalPortfolioValue) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0B1120 0%, #060A14 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6B7A99'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '18px',
            height: '18px',
            border: '2px solid rgba(0,229,255,0.2)',
            borderTop: '2px solid #00E5FF',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          Loading wallet...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0B1120 0%, #060A14 100%)',
      color: '#fff',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      paddingBottom: '80px'
    }}>
      {/* Header */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Wallet</div>
              <div style={{ fontSize: '14px', color: '#6B7A99' }}>Manage your crypto assets</div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <IoRefresh size={20} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>

          {/* Portfolio Summary */}
          <div style={{
            padding: '24px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, rgba(0,71,217,0.08) 0%, rgba(0,229,255,0.08) 100%)',
            border: '1px solid rgba(0,229,255,0.15)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,229,255,0.05)',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '13px', color: '#6B7A99', marginBottom: '8px', fontWeight: '600' }}>Total Balance</div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#00E5FF', marginBottom: '4px' }}>
              £{totalPortfolioValue.toFixed(2)}
            </div>
            <div style={{ fontSize: '14px', color: totalChange24h >= 0 ? '#16C784' : '#EA3943', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {totalChange24h >= 0 ? <IoTrendingUpOutline size={16} /> : <IoTrendingDownOutline size={16} />}
              {totalChange24h >= 0 ? '+' : ''}{totalChange24h.toFixed(2)}% (24h)
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <button
              onClick={() => navigate('/buy-crypto')}
              style={{
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(0,229,255,0.08)',
                border: '1px solid rgba(0,229,255,0.2)',
                color: '#00E5FF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(0,229,255,0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(0,229,255,0.12)';
                e.target.style.boxShadow = '0 6px 16px rgba(0,229,255,0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(0,229,255,0.08)';
                e.target.style.boxShadow = '0 4px 12px rgba(0,229,255,0.1)';
              }}
            >
              <IoWalletOutline size={22} />
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Buy</span>
            </button>

            <button
              onClick={() => navigate('/swap-crypto')}
              style={{
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(123,44,255,0.08)',
                border: '1px solid rgba(123,44,255,0.2)',
                color: '#9F7AEA',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(123,44,255,0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(123,44,255,0.12)';
                e.target.style.boxShadow = '0 6px 16px rgba(123,44,255,0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(123,44,255,0.08)';
                e.target.style.boxShadow = '0 4px 12px rgba(123,44,255,0.1)';
              }}
            >
              <IoSwapHorizontalOutline size={22} />
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Swap</span>
            </button>

            <button
              onClick={() => {
                if (balances.length > 0) {
                  const firstAsset = balances[0].currency.toLowerCase();
                  navigate(`/send/${firstAsset}`);
                }
              }}
              style={{
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(0,71,217,0.08)',
                border: '1px solid rgba(0,71,217,0.2)',
                color: '#5D9EFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(0,71,217,0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(0,71,217,0.12)';
                e.target.style.boxShadow = '0 6px 16px rgba(0,71,217,0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(0,71,217,0.08)';
                e.target.style.boxShadow = '0 4px 12px rgba(0,71,217,0.1)';
              }}
            >
              <IoPaperPlaneOutline size={22} />
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Send</span>
            </button>

            <button
              onClick={() => navigate('/receive?asset=BTC')}
              style={{
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(22,199,132,0.08)',
                border: '1px solid rgba(22,199,132,0.2)',
                color: '#16C784',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(22,199,132,0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(22,199,132,0.12)';
                e.target.style.boxShadow = '0 6px 16px rgba(22,199,132,0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(22,199,132,0.08)';
                e.target.style.boxShadow = '0 4px 12px rgba(22,199,132,0.1)';
              }}
            >
              <IoDownloadOutline size={22} />
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Receive</span>
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['crypto', 'activity', 'portfolio'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 0',
                  background: 'none',
                  border: 'none',
                  color: activeTab === tab ? '#fff' : '#6B7A99',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  position: 'relative',
                  opacity: activeTab === tab ? 1 : 0.7,
                  transition: 'all 0.2s'
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, #00E5FF 0%, #7B2CFF 100%)',
                    boxShadow: '0 0 8px rgba(0,229,255,0.5)'
                  }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
        {/* CRYPTO TAB */}
        {activeTab === 'crypto' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {balances.map(balance => {
              const coinMeta = allCoins.find(c => c.symbol === balance.currency);
              const price = priceData[balance.currency] || {};
              const hasBalance = balance.total_balance > 0;
              
              return (
                <div
                  key={balance.currency}
                  onClick={() => navigate(`/asset/${balance.currency.toLowerCase()}`)}
                  style={{
                    padding: '18px 20px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)';
                    e.currentTarget.style.borderColor = 'rgba(0,229,255,0.15)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <img src={getCoinLogo(balance.currency)} alt={balance.currency} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{balance.currency}</div>
                        <div style={{ fontSize: '13px', color: '#6B7A99' }}>{coinMeta?.name || balance.currency}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                        {balance.total_balance.toFixed(8)}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6B7A99' }}>
                        £{balance.gbp_value?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {transactions.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#6B7A99',
                fontSize: '14px'
              }}>
                No transactions yet
              </div>
            ) : (
              transactions.map((tx, idx) => (
                <div
                  key={tx.transaction_id || idx}
                  style={{
                    padding: '18px 20px',
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px', textTransform: 'capitalize' }}>
                        {tx.type || 'Transaction'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6B7A99' }}>
                        {new Date(tx.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: tx.type === 'deposit' ? '#16C784' : '#fff' }}>
                        {tx.type === 'deposit' ? '+' : '-'}{tx.amount} {tx.currency}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: tx.status === 'completed' ? '#16C784' : tx.status === 'pending' ? '#F0B90B' : '#EA3943',
                        textTransform: 'uppercase',
                        marginTop: '4px'
                      }}>
                        {tx.status || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PORTFOLIO TAB */}
        {activeTab === 'portfolio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {balances
              .filter(b => b.total_balance > 0)
              .sort((a, b) => (b.gbp_value || 0) - (a.gbp_value || 0))
              .map(balance => {
                const coinMeta = allCoins.find(c => c.symbol === balance.currency);
                const allocation = getAssetAllocation(balance.gbp_value || 0);
                
                return (
                  <div
                    key={balance.currency}
                    style={{
                      padding: '20px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src={getCoinLogo(balance.currency)} alt={balance.currency} style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
                        <div>
                          <div style={{ fontSize: '17px', fontWeight: '700', marginBottom: '4px' }}>{balance.currency}</div>
                          <div style={{ fontSize: '13px', color: '#6B7A99' }}>{coinMeta?.name || balance.currency}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#00E5FF', marginBottom: '4px' }}>
                          £{balance.gbp_value?.toFixed(2) || '0.00'}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6B7A99' }}>
                          {balance.total_balance.toFixed(8)} {balance.currency}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderTop: '1px solid rgba(255,255,255,0.06)'
                    }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6B7A99', marginBottom: '4px' }}>Allocation</div>
                        <div style={{ fontSize: '15px', fontWeight: '600' }}>{allocation}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6B7A99', marginBottom: '4px' }}>24h Change</div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#6B7A99' }}>-</div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
