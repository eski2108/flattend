import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { Wallet, ArrowDownLeft, ArrowUpRight, RefreshCw, Copy, TrendingUp, TrendingDown } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function WalletPage() {
  const navigate = useNavigate();
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [totalGBP, setTotalGBP] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const u = JSON.parse(userData);
    setUser(u);
    loadBalances(u.user_id);
  }, [navigate]);

  const loadBalances = async (userId) => {
    try {
      const response = await axios.get(`${API}/api/wallets/balances/${userId}`);
      if (response.data.success) {
        const bals = response.data.balances || [];
        setBalances(bals);
        
        const total = bals.reduce((sum, bal) => {
          return sum + (bal.total_balance * (bal.price_gbp || 0));
        }, 0);
        setTotalGBP(total);
      }
    } catch (error) {
      console.error('Failed to load balances:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBalances(user.user_id);
  };

  const formatBalance = (balance, currency) => {
    if (currency === 'GBP' || currency === 'USD') {
      return balance.toFixed(2);
    }
    return balance.toFixed(8);
  };

  const getCoinColor = (currency) => {
    const colors = {
      'BTC': '#F7931A',
      'ETH': '#627EEA',
      'USDT': '#26A17B',
      'BNB': '#F3BA2F',
      'SOL': '#9945FF',
      'ADA': '#0033AD',
      'XRP': '#23292F',
      'GBP': '#00F0FF',
      'USD': '#85BB65'
    };
    return colors[currency] || '#00F0FF';
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #05060B 0%, #080B14 100%)' }}>
          <div style={{ fontSize: '20px', color: '#00F0FF', fontWeight: '700' }}>Loading wallet...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05060B 0%, #080B14 100%)',
        padding: '16px'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>Your Assets</h1>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                padding: '8px 12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                transform: refreshing ? 'rotate(360deg)' : 'rotate(0deg)'
              }}
            >
              <RefreshCw size={18} color="#00F0FF" />
            </button>
          </div>
          <div style={{
            height: '2px',
            width: '100%',
            background: 'linear-gradient(90deg, #00F0FF 0%, transparent 100%)',
            boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
          }} />
        </div>

        {/* Portfolio Summary */}
        <div style={{
          background: 'linear-gradient(135deg, #0B1220 0%, #101828 100%)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '22px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 0 18px rgba(0, 240, 255, 0.15)'
        }}>
          <div style={{ fontSize: '13px', color: '#A3AEC2', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Portfolio Value</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>£{totalGBP.toFixed(2)}</div>
          <div style={{ fontSize: '14px', color: '#6EE7B7' }}>≈ ${(totalGBP * 1.27).toFixed(2)} USD</div>
        </div>

        {/* Assets List */}
        {balances.length === 0 ? (
          <div style={{
            background: 'linear-gradient(135deg, #0B1220 0%, #101828 100%)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '22px',
            padding: '40px 20px',
            textAlign: 'center'
          }}>
            <Wallet size={48} color="#A3AEC2" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: '18px', color: '#FFFFFF', fontWeight: '600', marginBottom: '8px' }}>No Assets Yet</div>
            <div style={{ fontSize: '14px', color: '#A3AEC2', marginBottom: '20px' }}>Start by depositing crypto</div>
            <button
              onClick={() => navigate('/deposit/btc')}
              style={{
                background: 'linear-gradient(145deg, #00F0FF, #7B2FFF)',
                border: 'none',
                borderRadius: '16px',
                padding: '12px 32px',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 0 12px rgba(0, 240, 255, 0.4)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 0 18px rgba(0, 240, 255, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1.0)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 240, 255, 0.4)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.96)';
                e.currentTarget.style.boxShadow = 'inset 0 0 8px rgba(0,0,0,0.45)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 0 18px rgba(0, 240, 255, 0.6)';
              }}
            >
              Deposit Crypto
            </button>
          </div>
        ) : (
          balances.map((asset, index) => (
            <AssetCard key={index} asset={asset} navigate={navigate} getCoinColor={getCoinColor} formatBalance={formatBalance} />
          ))
        )}
      </div>
    </Layout>
  );
}

function AssetCard({ asset, navigate, getCoinColor, formatBalance }) {
  const coinColor = getCoinColor(asset.currency);
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0B1220 0%, #101828 100%)',
        border: `1px solid ${coinColor}33`,
        borderRadius: '22px',
        padding: '18px',
        marginBottom: '16px',
        boxShadow: `0 0 12px ${coinColor}22`,
        transition: 'all 0.15s ease',
        cursor: 'pointer'
      }}
      onClick={() => setExpanded(!expanded)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.015)';
        e.currentTarget.style.boxShadow = `0 0 18px ${coinColor}55`;
        e.currentTarget.style.border = `1px solid ${coinColor}66`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1.0)';
        e.currentTarget.style.boxShadow = `0 0 12px ${coinColor}22`;
        e.currentTarget.style.border = `1px solid ${coinColor}33`;
      }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: expanded ? '16px' : '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Icon */}
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${coinColor}, ${coinColor}CC)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: '700',
            color: '#FFFFFF',
            boxShadow: `0 0 12px ${coinColor}66`
          }}>
            {asset.currency.substring(0, 1)}
          </div>
          
          {/* Name & Network */}
          <div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#FFFFFF', marginBottom: '2px' }}>{asset.currency}</div>
            <div style={{ fontSize: '12px', color: '#8F9BB3' }}>{asset.currency} Network</div>
          </div>
        </div>

        {/* Balance */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF', marginBottom: '2px' }}>
            {formatBalance(asset.total_balance, asset.currency)} {asset.currency}
          </div>
          <div style={{ fontSize: '13px', color: '#A3AEC2' }}>
            ≈ £{(asset.total_balance * (asset.price_gbp || 0)).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Expanded Section */}
      {expanded && (
        <div onClick={(e) => e.stopPropagation()}>
          {/* Balance Breakdown */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#8F9BB3', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Balance Breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div style={{
                background: 'rgba(34, 197, 94, 0.05)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', color: '#6EE7B7', marginBottom: '4px' }}>Available</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#FFFFFF' }}>{formatBalance(asset.available_balance, asset.currency)}</div>
                <div style={{ fontSize: '10px', color: '#6B7280' }}>{asset.currency}</div>
              </div>
              
              <div style={{
                background: 'rgba(251, 191, 36, 0.05)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', color: '#FBBF24', marginBottom: '4px' }}>Locked</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#FFFFFF' }}>{formatBalance(asset.locked_balance, asset.currency)}</div>
                <div style={{ fontSize: '10px', color: '#6B7280' }}>{asset.currency}</div>
              </div>
              
              <div style={{
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', color: '#60A5FA', marginBottom: '4px' }}>Total</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#FFFFFF' }}>{formatBalance(asset.total_balance, asset.currency)}</div>
                <div style={{ fontSize: '10px', color: '#6B7280' }}>{asset.currency}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div>
            <div style={{ fontSize: '12px', color: '#8F9BB3', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Actions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {/* Deposit Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/deposit/${asset.currency.toLowerCase()}`);
                }}
                style={{
                  background: 'linear-gradient(135deg, #22D3EE, #38BDF8)',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px',
                  color: '#020617',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 0 12px rgba(34, 211, 238, 0.4)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 0 18px rgba(34, 211, 238, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1.0)';
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(34, 211, 238, 0.4)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.96)';
                  e.currentTarget.style.boxShadow = 'inset 0 0 8px rgba(0,0,0,0.45)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
              >
                <ArrowDownLeft size={16} />
                Deposit
              </button>

              {/* Withdraw Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/withdraw/${asset.currency.toLowerCase()}`);
                }}
                style={{
                  background: 'rgba(34, 211, 238, 0.1)',
                  border: '1px solid rgba(34, 211, 238, 0.5)',
                  borderRadius: '14px',
                  padding: '12px',
                  color: '#22D3EE',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 0 8px rgba(34, 211, 238, 0.2)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(34, 211, 238, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1.0)';
                  e.currentTarget.style.boxShadow = '0 0 8px rgba(34, 211, 238, 0.2)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.96)';
                  e.currentTarget.style.boxShadow = 'inset 0 0 8px rgba(0,0,0,0.45)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
              >
                <ArrowUpRight size={16} />
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
