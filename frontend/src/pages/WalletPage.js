import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoRefresh, IoSearch } from 'react-icons/io5';
import DepositModal from '@/components/modals/DepositModal';
import WithdrawModal from '@/components/modals/WithdrawModal';
import SwapModal from '@/components/modals/SwapModal';
import { getCoinLogo } from '@/utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

const COIN_COLORS = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  BNB: '#F3BA2F',
  SOL: '#A78BFA',
  XRP: '#00AAE4',
  ADA: '#0033AD',
  DOT: '#E6007A',
  USDT: '#26A17B',
  DOGE: '#C2A633',
  LTC: '#345D9D',
  MATIC: '#8247E5'
};

export default function WalletPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [allCoins, setAllCoins] = useState([]);
  const [balances, setBalances] = useState([]);
  const [priceData, setPriceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [depositModal, setDepositModal] = useState({ isOpen: false, currency: null });
  const [withdrawModal, setWithdrawModal] = useState({ isOpen: false, currency: null, balance: 0 });
  const [swapModal, setSwapModal] = useState({ isOpen: false, fromCurrency: null });
  const [activeTab, setActiveTab] = useState('Crypto'); // Only used for Crypto tab now

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) { navigate('/login'); return; }
    const u = JSON.parse(userData);
    setUser(u);
    loadAllData(u.user_id);
    const interval = setInterval(() => {
      loadBalances(u.user_id);
      loadPriceData();
    }, 15000);
    return () => clearInterval(interval);
  }, [navigate]);

  const loadAllData = async (userId) => {
    setLoading(true);
    await Promise.all([
      loadCoinMetadata(),
      loadBalances(userId),
      loadPriceData()
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
      const response = await axios.get(`${API}/api/wallets/balances/${userId}?_t=${Date.now()}`);
      if (response.data.success) {
        setBalances(response.data.balances || []);
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
      loadBalances(user.user_id);
      loadPriceData();
      toast.success('Refreshing...');
    }
  };

  const getCoinColor = (symbol) => COIN_COLORS[symbol] || '#00E5FF';

  const mergedAssets = allCoins.map(coin => {
    const balance = balances.find(b => b.currency === coin.symbol);
    const price = priceData[coin.symbol] || {};
    const totalBalance = balance?.total_balance || 0;
    const priceGbp = balance?.price_gbp || price.gbp || 0;
    const gbpValue = totalBalance * priceGbp;
    const change24h = price.change_24h || price.change_24h_gbp || 0;
    
    return {
      currency: coin.symbol,
      name: coin.name,
      logoUrl: getCoinLogo(coin.symbol),
      color: getCoinColor(coin.symbol),
      total_balance: totalBalance,
      available_balance: balance?.available_balance || 0,
      locked_balance: balance?.locked_balance || 0,
      gbp_value: gbpValue,
      price_gbp: priceGbp,
      change_24h: change24h,
      has_balance: totalBalance > 0
    };
  });

  const filteredAssets = searchTerm
    ? mergedAssets.filter(a =>
        a.currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : mergedAssets;

  const assetsWithBalance = mergedAssets.filter(a => a.total_balance > 0);
  const totalValue = assetsWithBalance.reduce((sum, a) => sum + a.gbp_value, 0);
  
  let portfolioChange24h = 0;
  if (totalValue > 0 && assetsWithBalance.length > 0) {
    portfolioChange24h = assetsWithBalance.reduce((sum, asset) => {
      const weight = asset.gbp_value / totalValue;
      return sum + (asset.change_24h * weight);
    }, 0);
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0B1220',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          fontSize: '20px',
          color: '#00E5FF',
          fontWeight: '600'
        }}>Loading wallet...</div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#060B1A',
      fontFamily: 'Inter, sans-serif',
      paddingBottom: 0
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px', paddingBottom: 0 }}>
        {/* HEADER */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div>
            <h1 style={{
              fontSize: '36px',
              fontWeight: '700',
              color: '#FFFFFF',
              margin: '0 0 8px 0'
            }}>Wallet</h1>
            <p style={{
              fontSize: '14px',
              color: '#8FA3BF',
              margin: 0,
              fontWeight: '400'
            }}>Manage your crypto assets</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1.5px solid #00E5FF',
              borderRadius: '12px',
              color: '#00E5FF',
              fontSize: '14px',
              fontWeight: '600',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              opacity: refreshing ? 0.6 : 1
            }}
          >
            <IoRefresh
              size={18}
              style={{
                animation: refreshing ? 'spin 1s linear infinite' : 'none'
              }}
            />
            Refresh
          </button>
        </div>

        {/* BALANCE AREA - FLAT, NO CARD */}
        <div style={{
          padding: '24px 20px 20px',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '11px',
            color: '#8FA3C8',
            fontWeight: '500',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>Total Portfolio Value</div>
          <div style={{
            fontSize: '40px',
            fontWeight: '700',
            color: '#FFFFFF',
            lineHeight: '1',
            marginBottom: '8px'
          }}>
            £{totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {assetsWithBalance.length > 0 ? (
            <div style={{
              fontSize: '15px',
              fontWeight: '600',
              color: portfolioChange24h >= 0 ? '#16C784' : '#EA3943'
            }}>
              {portfolioChange24h >= 0 ? '+' : ''}{portfolioChange24h.toFixed(2)}% today
            </div>
          ) : (
            <div style={{ fontSize: '14px', color: '#8FA3C8' }}>No holdings yet</div>
          )}
        </div>

        {/* ACTION BUTTONS - FLAT CIRCULAR */}
        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '24px',
          padding: '0 20px',
          justifyContent: 'flex-start'
        }}>
          <button
            onClick={() => navigate('/buy-crypto')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#0047D9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: '#fff',
              fontWeight: '600'
            }}>
              +
            </div>
            <div style={{ fontSize: '12px', color: '#8FA3C8', fontWeight: '400' }}>Buy</div>
          </button>

          <button
            onClick={() => navigate('/swap-crypto')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#0047D9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: '#fff',
              fontWeight: '600'
            }}>
              ⇄
            </div>
            <div style={{ fontSize: '12px', color: '#8FA3C8', fontWeight: '400' }}>Swap</div>
          </button>

          <button
            onClick={() => {
              // Send to first asset with balance, or BTC if none
              const firstAsset = balances.find(b => b.total_balance > 0);
              const currency = firstAsset ? firstAsset.currency.toLowerCase() : 'btc';
              navigate(`/send/${currency}`);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#0047D9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: '#fff',
              fontWeight: '600'
            }}>
              ↑
            </div>
            <div style={{ fontSize: '12px', color: '#8FA3C8', fontWeight: '400' }}>Send</div>
          </button>

          <button
            onClick={() => {
              // Receive to first asset or BTC
              const firstAsset = balances.find(b => b.total_balance > 0);
              const currency = firstAsset ? firstAsset.currency : 'BTC';
              navigate(`/receive?asset=${currency}`);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#0047D9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: '#fff',
              fontWeight: '600'
            }}>
              ↓
            </div>
            <div style={{ fontSize: '12px', color: '#8FA3C8', fontWeight: '400' }}>Receive</div>
          </button>
        </div>

        {/* TABS - FLAT WITH PROPER ROUTING */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          marginBottom: '16px'
        }}>
          {[
            { name: 'Crypto', route: '/wallet' },
            { name: 'Activity', route: '/transactions' },
            { name: 'Portfolio', route: '/dashboard' }
          ].map((tab) => (
            <button
              key={tab.name}
              onClick={() => {
                if (tab.route === '/wallet') {
                  setActiveTab('Crypto');
                } else {
                  navigate(tab.route);
                }
              }}
              style={{
                flex: 1,
                padding: '12px 0',
                background: 'none',
                border: 'none',
                borderBottom: (tab.route === '/wallet' && activeTab === 'Crypto') ? '1px solid #0047D9' : '1px solid transparent',
                color: (tab.route === '/wallet' && activeTab === 'Crypto') ? '#FFFFFF' : '#6B7A99',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'color 0.2s',
                opacity: (tab.route === '/wallet' && activeTab === 'Crypto') ? 1 : 0.7
              }}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* SEARCH - FLAT */}
        <div style={{
          padding: '0 20px',
          marginBottom: '16px'
        }}>
          <div style={{ position: 'relative' }}>
            <IoSearch
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6B7A99'
              }}
            />
            <input
              type="text"
              placeholder="Search assets"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 10px 10px 38px',
                background: 'rgba(255,255,255,0.03)',
                border: 'none',
                borderRadius: '10px',
                color: '#FFFFFF',
                fontSize: '14px',
                outline: 'none',
                fontWeight: '400'
              }}
            />
          </div>
        </div>

        {/* CRYPTO TAB */}
        {activeTab === 'Crypto' && (
          <div>
            {filteredAssets.length === 0 ? (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: '#8FA3C8'
            }}>
              <p style={{ fontSize: '14px', margin: 0 }}>
                No assets yet
              </p>
            </div>
          ) : (
            filteredAssets.map((asset, idx) => {
              const hasBalance = asset.total_balance > 0;
              
              return (
                <div
                  key={asset.currency}
                  onClick={() => navigate(`/asset/${asset.currency.toLowerCase()}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    background: 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {/* LEFT: ICON + NAME */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flex: 1
                  }}>
                    <img
                      src={asset.logoUrl}
                      alt={asset.currency}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%'
                      }}
                    />
                    <div>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#FFFFFF',
                        marginBottom: '2px'
                      }}>{asset.currency}</div>
                      <div style={{
                        fontSize: '13px',
                        color: '#6B7A99',
                        fontWeight: '400'
                      }}>{asset.name}</div>
                    </div>
                  </div>

                  {/* RIGHT: VALUES */}
                  <div style={{
                    textAlign: 'right'
                  }}>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#FFFFFF',
                      marginBottom: '2px'
                    }}>
                      £{asset.gbp_value.toFixed(2)}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#6B7A99',
                      fontWeight: '400'
                    }}>
                      {asset.total_balance.toFixed(4)} {asset.currency}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>
        )}

        {/* Activity and Portfolio tabs now navigate to their own pages */}
      </div>

      <DepositModal
        isOpen={depositModal.isOpen}
        onClose={() => setDepositModal({ isOpen: false, currency: null })}
        currency={depositModal.currency}
        userId={user?.user_id}
      />
      <WithdrawModal
        isOpen={withdrawModal.isOpen}
        onClose={() => setWithdrawModal({ isOpen: false, currency: null, balance: 0 })}
        currency={withdrawModal.currency}
        availableBalance={withdrawModal.balance}
        userId={user?.user_id}
        onSuccess={() => loadBalances(user?.user_id)}
      />
      <SwapModal
        isOpen={swapModal.isOpen}
        onClose={() => setSwapModal({ isOpen: false, fromCurrency: null })}
        fromCurrency={swapModal.fromCurrency}
        balances={balances}
        userId={user?.user_id}
        onSuccess={() => loadBalances(user?.user_id)}
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
