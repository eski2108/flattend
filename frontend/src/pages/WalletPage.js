import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoRefresh, IoSearch } from 'react-icons/io5';
import DepositModal from '@/components/modals/DepositModal';
import WithdrawModal from '@/components/modals/WithdrawModal';
import SwapModal from '@/components/modals/SwapModal';
import MiniStatsBar from '@/components/MiniStatsBar';
import Sparkline from '@/components/Sparkline';
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
      minHeight: '100vh',
      background: '#060B1A',
      padding: '32px 20px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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

        {/* TOTAL PORTFOLIO CARD */}
        <div style={{
          background: 'linear-gradient(180deg, #0B1C3A 0%, #08142B 100%)',
          border: 'none',
          borderRadius: '22px',
          padding: '36px',
          marginBottom: '24px',
          boxShadow: '0 8px 24px rgba(0, 170, 255, 0.08), inset 0 1px 0 rgba(255,255,255,0.04)'
        }}>
          <div>
            <div style={{
              fontSize: '12px',
              color: '#8FA3C8',
              fontWeight: '600',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>Total Portfolio Value</div>
            <div style={{
              fontSize: '48px',
              fontWeight: '800',
              color: '#FFFFFF',
              lineHeight: '1',
              marginBottom: '16px'
            }}>
              £{totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {assetsWithBalance.length > 0 ? (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '18px',
                fontWeight: '700',
                color: portfolioChange24h >= 0 ? '#16C784' : '#EA3943'
              }}>
                {portfolioChange24h >= 0 ? '+' : ''}{portfolioChange24h.toFixed(2)}%
                <span style={{
                  fontSize: '14px',
                  color: '#8FA3C8',
                  fontWeight: '500'
                }}>24h</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* MINI STATS BAR */}
        <MiniStatsBar
          assetsWithBalance={assetsWithBalance}
          totalValue={totalValue}
          portfolioChange24h={portfolioChange24h}
          priceData={priceData}
        />

        {/* SEARCH BAR */}
        <div style={{
          background: '#081227',
          border: 'none',
          borderRadius: '14px',
          padding: '16px',
          marginBottom: '24px',
          boxShadow: '0 8px 24px rgba(0, 170, 255, 0.08), inset 0 1px 0 rgba(255,255,255,0.04)'
        }}>
          <div style={{ position: 'relative' }}>
            <IoSearch
              size={20}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#8FA3C8'
              }}
            />
            <input
              type="text"
              placeholder="Search coins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 14px 14px 46px',
                background: 'rgba(16, 26, 54, 0.5)',
                border: '1px solid rgba(255,255,255,0.03)',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '14px',
                outline: 'none',
                fontWeight: '400'
              }}
            />
          </div>
        </div>

        {/* ASSET LIST - ONE CONTAINER */}
        <div style={{
          background: '#0A1633',
          border: 'none',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0, 170, 255, 0.08), inset 0 1px 0 rgba(255,255,255,0.04)'
        }}>
          {filteredAssets.length === 0 ? (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: '#8FA3C8'
            }}>
              <p style={{ fontSize: '16px', margin: 0 }}>
                You don't have any assets yet. Use Deposit to add funds.
              </p>
            </div>
          ) : (
            filteredAssets.map((asset, idx) => {
              const hasBalance = asset.total_balance > 0;
              
              return (
                <div
                  key={asset.currency}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '26px 24px',
                    paddingLeft: '26px',
                    background: 'transparent',
                    borderBottom: idx < filteredAssets.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    borderLeft: `2px solid ${hasBalance ? 'rgba(0, 229, 255, 0.8)' : 'rgba(0, 229, 255, 0.4)'}`,
                    transition: 'all 0.2s ease',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}
                >
                  {/* COIN ICON + NAME */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    flex: '0 0 200px',
                    minWidth: '200px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px',
                      opacity: hasBalance ? 1 : 0.7
                    }}>
                      <img
                        src={asset.logoUrl}
                        alt={asset.currency}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                    <div>
                      <div style={{
                        fontSize: '17px',
                        fontWeight: '700',
                        color: '#E6ECFF',
                        marginBottom: '4px'
                      }}>{asset.currency}</div>
                      <div style={{
                        fontSize: '13px',
                        color: '#8FA3C8',
                        fontWeight: '400'
                      }}>{asset.name}</div>
                    </div>
                  </div>

                  {/* BALANCE */}
                  <div style={{
                    flex: '0 0 160px',
                    textAlign: 'right'
                  }}>
                    <div style={{
                      fontSize: '17px',
                      fontWeight: '700',
                      color: '#FFFFFF',
                      marginBottom: '4px'
                    }}>
                      {asset.total_balance.toFixed(8)}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#8FA3C8',
                      fontWeight: '500'
                    }}>
                      £{asset.gbp_value.toFixed(2)}
                    </div>
                  </div>

                  {/* 24H CHANGE - ONLY IF BALANCE > 0 */}
                  <div style={{
                    flex: '0 0 90px',
                    textAlign: 'right'
                  }}>
                    {hasBalance ? (
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '700',
                        color: asset.change_24h >= 0 ? '#16C784' : '#EA3943'
                      }}>
                        {asset.change_24h >= 0 ? '+' : ''}{asset.change_24h.toFixed(2)}%
                      </div>
                    ) : null}
                  </div>

                  {/* SPARKLINE - ONLY IF BALANCE > 0 */}
                  <div style={{
                    flex: '0 0 120px',
                    height: '40px'
                  }}>
                    {hasBalance && <Sparkline currency={asset.currency} />}
                  </div>

                  {/* ACTION BUTTONS */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    flex: '0 0 auto'
                  }}>
                    {/* DEPOSIT - PRIMARY */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDepositModal({ isOpen: true, currency: asset.currency });
                      }}
                      style={{
                        padding: '10px 20px',
                        background: '#00E5FF',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#001018',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Deposit
                    </button>
                    {/* WITHDRAW - NO GLOW */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setWithdrawModal({
                          isOpen: true,
                          currency: asset.currency,
                          balance: asset.available_balance
                        });
                      }}
                      style={{
                        padding: '10px 20px',
                        background: 'transparent',
                        border: '2px solid #00E5FF',
                        borderRadius: '12px',
                        color: '#00E5FF',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Withdraw
                    </button>
                    {/* SWAP - YELLOW, NO PURPLE */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSwapModal({ isOpen: true, fromCurrency: asset.currency });
                      }}
                      style={{
                        padding: '10px 20px',
                        background: 'transparent',
                        border: '2px solid #F0B90B',
                        borderRadius: '12px',
                        color: '#F0B90B',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Swap
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
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
