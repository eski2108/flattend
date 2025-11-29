import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { Wallet, ArrowDownLeft, ArrowUpRight, RefreshCw, Repeat } from 'lucide-react';

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
      'USD': '#85BB65',
      'LTC': '#345D9D',
      'DOGE': '#C3A634',
      'AVAX': '#E84142',
      'DOT': '#E6007A',
      'MATIC': '#8247E5'
    };
    return colors[currency] || '#00F0FF';
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #05121F 0%, #071E2C 50%, #03121E 100%)' }}>
          <div style={{ fontSize: '20px', color: '#00F0FF', fontWeight: '700' }}>Loading wallet...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #05121F 0%, #071E2C 50%, #03121E 100%)',
        padding: '24px 16px'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
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
          background: 'linear-gradient(135deg, #08192B 0%, #04101F 100%)',
          border: '1px solid rgba(0, 240, 255, 0.08)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 0 18px rgba(0, 255, 255, 0.08)'
        }}>
          <div style={{ fontSize: '13px', color: '#A3AEC2', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Portfolio Value</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>£{totalGBP.toFixed(2)}</div>
          <div style={{ fontSize: '14px', color: '#6EE7B7' }}>≈ ${(totalGBP * 1.27).toFixed(2)} USD</div>
        </div>

        {/* Assets List - FULLY DYNAMIC FOR ALL COINS */}
        {balances.length === 0 ? (
          <div style={{
            background: 'linear-gradient(135deg, #08192B 0%, #04101F 100%)',
            border: '1px solid rgba(0, 240, 255, 0.08)',
            borderRadius: '16px',
            padding: '40px 20px',
            textAlign: 'center'
          }}>
            <Wallet size={48} color="#A3AEC2" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: '18px', color: '#FFFFFF', fontWeight: '600', marginBottom: '8px' }}>No Assets Yet</div>
            <div style={{ fontSize: '14px', color: '#A3AEC2', marginBottom: '20px' }}>Start by depositing crypto</div>
            <button
              onClick={() => navigate('/deposit/btc')}
              style={{
                background: 'linear-gradient(135deg, #00E8FF 0%, #008CFF 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 32px',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 0 12px rgba(0, 255, 255, 0.15)'
              }}
            >
              Deposit Crypto
            </button>
          </div>
        ) : (
          balances.map((asset, index) => (
            <AssetCard 
              key={`${asset.currency}-${index}`} 
              asset={asset} 
              navigate={navigate} 
              getCoinColor={getCoinColor} 
              formatBalance={formatBalance}
              userId={user.user_id}
            />
          ))
        )}

        {/* Transaction History */}
        <TransactionHistory user={user} />
      </div>
    </Layout>
  );
}

function AssetCard({ asset, navigate, getCoinColor, formatBalance, userId }) {
  const coinColor = getCoinColor(asset.currency);
  const [expanded, setExpanded] = useState(false);
  
  // DYNAMIC COIN METADATA - NO HARDCODING
  const coinSymbol = asset.currency.toLowerCase();
  const coinNetwork = asset.network || `${asset.currency} Network`;
  const coinChain = asset.chain || asset.currency;
  const decimalPrecision = asset.decimals || 8;
  const nowpaymentsCode = asset.nowpayments_code || coinSymbol;

  // FULLY DYNAMIC HANDLERS - WORK FOR ANY COIN
  const handleDeposit = async (e) => {
    e.stopPropagation();
    // Navigate with full metadata
    navigate(`/deposit/${coinSymbol}`, { 
      state: { 
        currency: asset.currency,
        network: coinNetwork,
        chain: coinChain,
        decimals: decimalPrecision,
        nowpayments_currency: nowpaymentsCode
      } 
    });
  };

  const handleWithdraw = async (e) => {
    e.stopPropagation();
    // Navigate with full metadata
    navigate(`/withdraw/${coinSymbol}`, { 
      state: { 
        currency: asset.currency,
        network: coinNetwork,
        chain: coinChain,
        decimals: decimalPrecision,
        nowpayments_currency: nowpaymentsCode,
        available_balance: asset.available_balance
      } 
    });
  };

  const handleSwap = async (e) => {
    e.stopPropagation();
    // Navigate with full metadata
    navigate(`/swap/${coinSymbol}`, { 
      state: { 
        from_currency: asset.currency,
        from_balance: asset.available_balance,
        decimals: decimalPrecision
      } 
    });
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #08192B 0%, #04101F 100%)',
        border: `1px solid rgba(0, 255, 255, 0.08)`,
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '20px',
        boxShadow: `0 0 18px rgba(0, 255, 255, 0.08)`,
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
      onClick={() => setExpanded(!expanded)}
      onMouseEnter={(e) => {
        e.currentTarget.style.border = `1px solid rgba(0, 255, 255, 0.25)`;
        e.currentTarget.style.boxShadow = `inset 0 0 20px rgba(0, 255, 255, 0.05), 0 0 24px rgba(0, 255, 255, 0.15)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.border = `1px solid rgba(0, 255, 255, 0.08)`;
        e.currentTarget.style.boxShadow = `0 0 18px rgba(0, 255, 255, 0.08)`;
      }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: expanded ? '20px' : '0' }}>
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
            <div style={{ fontSize: '12px', color: '#8F9BB3' }}>{coinNetwork}</div>
          </div>
        </div>

        {/* Balance */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#FFFFFF', 
            marginBottom: '2px',
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
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
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: '#8F9BB3', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Balance Breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div style={{
                background: 'rgba(34, 197, 94, 0.05)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '13px', color: '#6EE7B7', marginBottom: '4px' }}>Available</div>
                <div style={{ 
                  fontSize: '22px', 
                  fontWeight: '700', 
                  color: '#FFFFFF',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>{formatBalance(asset.available_balance, asset.currency)}</div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>{asset.currency}</div>
              </div>
              
              <div style={{
                background: 'rgba(251, 191, 36, 0.05)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '13px', color: '#FBBF24', marginBottom: '4px' }}>Locked</div>
                <div style={{ 
                  fontSize: '22px', 
                  fontWeight: '700', 
                  color: '#FFFFFF',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>{formatBalance(asset.locked_balance, asset.currency)}</div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>{asset.currency}</div>
              </div>
              
              <div style={{
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '13px', color: '#60A5FA', marginBottom: '4px' }}>Total</div>
                <div style={{ 
                  fontSize: '22px', 
                  fontWeight: '700', 
                  color: '#FFFFFF',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>{formatBalance(asset.total_balance, asset.currency)}</div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>{asset.currency}</div>
              </div>
            </div>
          </div>

          {/* Actions - FULLY DYNAMIC BUTTONS */}
          <div>
            <div style={{ fontSize: '13px', color: '#8F9BB3', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Actions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {/* DEPOSIT BUTTON - FULLY DYNAMIC */}
              <WalletButton
                onClick={handleDeposit}
                icon={<ArrowDownLeft size={18} />}
                label="Deposit"
                type="primary"
              />

              {/* WITHDRAW BUTTON - FULLY DYNAMIC */}
              <WalletButton
                onClick={handleWithdraw}
                icon={<ArrowUpRight size={18} />}
                label="Withdraw"
                type="secondary"
              />

              {/* SWAP BUTTON - FULLY DYNAMIC */}
              <WalletButton
                onClick={handleSwap}
                icon={<Repeat size={18} />}
                label="Swap"
                type="secondary"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// GLOBAL WALLET BUTTON COMPONENT - FULL INTERACTIVE STATES
function WalletButton({ onClick, icon, label, type = 'primary' }) {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const getStyles = () => {
    if (type === 'primary') {
      return {
        default: {
          background: 'linear-gradient(135deg, #00E8FF 0%, #008CFF 100%)',
          boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.2), 0 0 12px rgba(0, 255, 255, 0.15)',
          filter: 'brightness(1.0)',
          transform: 'translateY(0)'
        },
        hover: {
          filter: 'brightness(1.15)',
          boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.3), 0 0 20px rgba(0, 255, 255, 0.35)',
          transform: 'translateY(-1px)'
        },
        pressed: {
          filter: 'brightness(0.88)',
          boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.35)',
          transform: 'translateY(0)'
        }
      };
    } else {
      return {
        default: {
          background: 'rgba(0, 232, 255, 0.1)',
          border: '1px solid rgba(0, 232, 255, 0.3)',
          boxShadow: '0 0 12px rgba(0, 255, 255, 0.15)',
          filter: 'brightness(1.0)',
          transform: 'translateY(0)'
        },
        hover: {
          filter: 'brightness(1.15)',
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.35)',
          transform: 'translateY(-1px)'
        },
        pressed: {
          filter: 'brightness(0.88)',
          boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.35)',
          transform: 'translateY(0)'
        }
      };
    }
  };

  const styles = getStyles();
  const currentStyle = isPressed ? styles.pressed : (isHovered ? styles.hover : styles.default);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      style={{
        width: '100%',
        borderRadius: '12px',
        padding: '18px 14px',
        color: '#FFFFFF',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        border: type === 'secondary' ? currentStyle.border : 'none',
        background: currentStyle.background,
        boxShadow: currentStyle.boxShadow,
        filter: currentStyle.filter,
        transform: currentStyle.transform,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {icon}
      <span style={{ transition: 'transform 0.2s ease' }}>{label}</span>
    </button>
  );
}

function TransactionHistory({ user }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const filters = ['All', 'Deposit', 'Withdraw', 'P2P', 'Swap'];

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user, activeFilter]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/transactions/${user.user_id}`);
      if (response.data.success) {
        let txs = response.data.transactions || [];
        
        if (activeFilter !== 'All') {
          txs = txs.filter(tx => tx.transaction_type.toLowerCase() === activeFilter.toLowerCase());
        }
        
        setTransactions(txs);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '32px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px' }}>Transaction History</h2>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {filters.map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={activeFilter === filter ? 'premium-tab-active' : 'premium-tab-inactive'}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {filter}
          </button>
        ))}
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #08192B 0%, #04101F 100%)',
        border: '1px solid rgba(0, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '20px'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#A3AEC2' }}>Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#A3AEC2' }}>No transactions yet</div>
        ) : (
          transactions.slice(0, 10).map((tx, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 0',
                borderBottom: index < transactions.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: tx.transaction_type === 'deposit' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {tx.transaction_type === 'deposit' ? (
                    <ArrowDownLeft size={20} color="#22C55E" />
                  ) : (
                    <ArrowUpRight size={20} color="#EF4444" />
                  )}
                </div>
                
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#FFFFFF', marginBottom: '2px' }}>
                    {tx.transaction_type.charAt(0).toUpperCase() + tx.transaction_type.slice(1)} {tx.currency}
                  </div>
                  <div style={{ fontSize: '13px', color: '#A3AEC2' }}>
                    {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: tx.transaction_type === 'deposit' ? '#22C55E' : '#EF4444' }}>
                  {tx.transaction_type === 'deposit' ? '+' : '-'}{tx.amount} {tx.currency}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: tx.status === 'completed' ? '#22C55E' : tx.status === 'pending' ? '#FBBF24' : '#EF4444',
                  marginTop: '2px'
                }}>
                  {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                </div>
              </div>
            </div>
          )))
        )}
      </div>
    </div>
  );
}
