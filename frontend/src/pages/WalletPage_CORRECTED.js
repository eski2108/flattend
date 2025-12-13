// WALLET PAGE - BINANCE/CRYPTO.COM PREMIUM STANDARD
// USING EXISTING COINHUBX BRAND COLORS ONLY

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoRefresh, IoWallet, IoTrendingUp, IoTrendingDown, IoArrowDown, IoArrowUp, IoSwapHorizontal } from 'react-icons/io5';
import { getCoinLogo } from '@/utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

// EXACT BRAND COLORS FROM global-design-system.css
const COLORS = {
  PRIMARY_BG: '#0B0E11',
  SECONDARY_BG: '#111418',
  ACCENT_NEON: '#00AEEF',  // Primary blue
  SUCCESS_GREEN: '#00C98D',
  WARNING_YELLOW: '#F5C542',
  DANGER_RED: '#E35355',
  GREY_TEXT: '#9FA6B2',
  WHITE_TEXT: '#FFFFFF'
};

export default function WalletPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const u = JSON.parse(userData);
    setUser(u);
    loadWalletData(u.user_id);

    const interval = setInterval(() => {
      loadWalletData(u.user_id);
    }, 15000);

    return () => clearInterval(interval);
  }, [navigate]);

  const loadWalletData = async (userId) => {
    try {
      // ENDPOINT: /api/wallets/balances/{user_id}
      const balRes = await axios.get(`${API}/api/wallets/balances/${userId}`);
      if (balRes.data.success) {
        setBalances(balRes.data.balances || []);
      }
      
      // ENDPOINT: /api/user/transactions/{wallet_address} (if we have wallet_address)
      // For now, skip transactions if no address available
      
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    if (!refreshing && user) {
      setRefreshing(true);
      loadWalletData(user.user_id);
      toast.success('Refreshing balances...');
    }
  };

  const totalValue = balances.reduce((sum, b) => sum + (b.gbp_value || 0), 0);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: COLORS.PRIMARY_BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ fontSize: '20px', color: COLORS.ACCENT_NEON, fontWeight: '600' }}>
          Loading wallet...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.PRIMARY_BG,
      padding: '24px 16px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: COLORS.WHITE_TEXT,
              margin: '0 0 8px 0'
            }}>
              Wallet
            </h1>
            <p style={{
              fontSize: '14px',
              color: COLORS.GREY_TEXT,
              margin: 0
            }}>
              Manage your crypto assets
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              padding: '12px 24px',
              background: `rgba(0, 174, 239, 0.1)`,
              border: `1px solid ${COLORS.ACCENT_NEON}`,
              borderRadius: '12px',
              color: COLORS.ACCENT_NEON,
              fontSize: '14px',
              fontWeight: '600',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <IoRefresh size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Portfolio Summary */}
        <div style={{
          background: COLORS.SECONDARY_BG,
          border: `1px solid rgba(0, 174, 239, 0.2)`,
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '24px'
          }}>
            <div>
              <div style={{
                fontSize: '14px',
                color: COLORS.GREY_TEXT,
                fontWeight: '500',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Total Portfolio Value
              </div>
              <div style={{
                fontSize: '48px',
                fontWeight: '600',
                color: COLORS.WHITE_TEXT,
                lineHeight: '1'
              }}>
                £{totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={{
                padding: '12px 24px',
                background: `linear-gradient(135deg, ${COLORS.ACCENT_NEON}, #0088CC)`,
                border: 'none',
                borderRadius: '12px',
                color: COLORS.WHITE_TEXT,
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                Deposit
              </button>
              <button style={{
                padding: '12px 24px',
                background: 'transparent',
                border: `1px solid ${COLORS.ACCENT_NEON}`,
                borderRadius: '12px',
                color: COLORS.ACCENT_NEON,
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                Withdraw
              </button>
            </div>
          </div>
        </div>

        {/* Asset List */}
        <div style={{
          background: COLORS.SECONDARY_BG,
          border: `1px solid rgba(0, 174, 239, 0.2)`,
          borderRadius: '16px',
          padding: '24px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '700',
            color: COLORS.WHITE_TEXT,
            marginBottom: '20px'
          }}>
            Assets
          </h3>

          {balances.length > 0 ? (
            balances.map((asset, index) => (
              <div
                key={`${asset.currency}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr 1fr 2fr',
                  gap: '16px',
                  alignItems: 'center',
                  padding: '16px',
                  background: COLORS.PRIMARY_BG,
                  borderRadius: '12px',
                  marginBottom: '12px',
                  border: `1px solid rgba(0, 174, 239, 0.1)`
                }}
              >
                {/* Coin Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img 
                    src={getCoinLogo(asset.currency)} 
                    alt={asset.currency}
                    style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                  />
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: COLORS.WHITE_TEXT }}>
                      {asset.currency}
                    </div>
                  </div>
                </div>

                {/* Balance */}
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: COLORS.WHITE_TEXT }}>
                    {asset.total_balance?.toFixed(8) || '0.00000000'}
                  </div>
                  <div style={{ fontSize: '13px', color: COLORS.GREY_TEXT }}>
                    Available: {asset.available_balance?.toFixed(8) || '0.00000000'}
                  </div>
                </div>

                {/* Value */}
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: COLORS.WHITE_TEXT }}>
                    £{(asset.gbp_value || 0).toFixed(2)}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: `1px solid ${COLORS.ACCENT_NEON}`,
                    borderRadius: '8px',
                    color: COLORS.ACCENT_NEON,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}>
                    <IoArrowDown size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    Deposit
                  </button>
                  <button style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: `1px solid ${COLORS.DANGER_RED}`,
                    borderRadius: '8px',
                    color: COLORS.DANGER_RED,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}>
                    <IoArrowUp size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    Withdraw
                  </button>
                  <button style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: `1px solid ${COLORS.WARNING_YELLOW}`,
                    borderRadius: '8px',
                    color: COLORS.WARNING_YELLOW,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}>
                    <IoSwapHorizontal size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    Swap
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: COLORS.GREY_TEXT }}>
              <IoWallet size={64} style={{ margin: '0 auto 20px' }} />
              <p>No assets found</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
