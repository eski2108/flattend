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
  const [coinMetadata, setCoinMetadata] = useState({});

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const u = JSON.parse(userData);
    setUser(u);
    loadCoinMetadata();
    loadBalances(u.user_id);
  }, [navigate]);

  const loadCoinMetadata = async () => {
    try {
      const response = await axios.get(`${API}/api/wallets/coin-metadata`);
      if (response.data.success) {
        // Convert array to object keyed by symbol for easy lookup
        const metadata = {};
        response.data.coins.forEach(coin => {
          metadata[coin.symbol] = coin;
        });
        setCoinMetadata(metadata);
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
    if (!refreshing && user) {
      setRefreshing(true);
      loadBalances(user.user_id);
    }
  };

  const formatBalance = (balance, currency) => {
    const config = coinMetadata[currency];
    const decimals = config?.decimals || (currency === 'GBP' || currency === 'USD' ? 2 : 8);
    return balance.toFixed(decimals);
  };

  const getCoinColor = (currency) => {
    return coinMetadata[currency]?.color || '#00F0FF';
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
        {/* Header - Exact Spacing */}
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
                cursor: refreshing ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                transform: refreshing ? 'rotate(360deg)' : 'rotate(0deg)',
                opacity: refreshing ? 0.6 : 1
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

        {/* Portfolio Summary - Exact Gradient & Shadow */}
        <div style={{
          background: 'linear-gradient(135deg, #08192B 0%, #04101F 100%)',
          border: '1px solid rgba(0, 240, 255, 0.08)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 0 18px rgba(0, 255, 255, 0.08)',
          opacity: 0.94
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
            textAlign: 'center',
            opacity: 0.94
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
                color: '#0A0A0A',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 0 12px rgba(0, 255, 255, 0.25)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.filter = 'brightness(1.1)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.filter = 'brightness(1.0)';
                e.target.style.transform = 'translateY(0)';
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
              coinMetadata={coinMetadata[asset.currency] || {}}
            />
          ))
        )}

        {/* Transaction History */}
        <TransactionHistory user={user} />
      </div>
    </Layout>
  );
}

function AssetCard({ asset, navigate, getCoinColor, formatBalance, userId, coinMetadata }) {
  const coinColor = getCoinColor(asset.currency);
  const [expanded, setExpanded] = useState(false);
  
  // FULLY DYNAMIC METADATA - ALL FROM BACKEND
  const coinSymbol = asset.currency.toLowerCase();
  const coinName = coinMetadata.name || asset.currency;
  const coinNetwork = coinMetadata.network || `${asset.currency} Network`;
  const coinIcon = coinMetadata.icon || asset.currency.substring(0, 1);
  const decimalPrecision = coinMetadata.decimals || 8;
  const nowpaymentsCode = coinMetadata.nowpayments_code || coinSymbol;

  // FULLY DYNAMIC HANDLERS - WORK FOR ANY COIN - GUARANTEED ROUTING
  const handleDeposit = (e) => {
    e.stopPropagation();
    console.log(`[WALLET] Deposit clicked for ${asset.currency}`);
    navigate(`/deposit/${coinSymbol}`, { 
      state: { 
        currency: asset.currency,
        name: coinName,
        network: coinNetwork,
        decimals: decimalPrecision,
        nowpayments_currency: nowpaymentsCode,
        color: coinColor
      } 
    });
  };

  const handleWithdraw = (e) => {
    e.stopPropagation();
    console.log(`[WALLET] Withdraw clicked for ${asset.currency}`);
    navigate(`/withdraw/${coinSymbol}`, { 
      state: { 
        currency: asset.currency,
        name: coinName,
        network: coinNetwork,
        decimals: decimalPrecision,
        nowpayments_currency: nowpaymentsCode,
        available_balance: asset.available_balance,
        color: coinColor
      } 
    });
  };

  const handleSwap = (e) => {
    e.stopPropagation();
    console.log(`[WALLET] Swap clicked for ${asset.currency}`);
    // Route to /swap?from={coin} as per requirements
    navigate(`/swap-crypto?from=${coinSymbol}`, { 
      state: { 
        from_currency: asset.currency,
        from_balance: asset.available_balance,
        decimals: decimalPrecision,
        color: coinColor
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
        cursor: 'pointer',
        opacity: 0.94
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: expanded ? '20px' : '12px' }}>
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
            {coinIcon}
          </div>
          
          {/* Name & Network */}
          <div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#FFFFFF', marginBottom: '2px' }}>{coinName}</div>
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

      {/* Quick Action Buttons - ALWAYS VISIBLE */}
      {!expanded && (
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <QuickActionButton
            onClick={handleDeposit}
            icon={<ArrowDownLeft size={16} />}
            label="Deposit"
            coinColor={coinColor}
          />
          <QuickActionButton
            onClick={handleWithdraw}
            icon={<ArrowUpRight size={16} />}
            label="Withdraw"
            coinColor={coinColor}
          />
          <QuickActionButton
            onClick={handleSwap}
            icon={<Repeat size={16} />}
            label="Swap"
            coinColor={coinColor}
          />
        </div>
      )}

      {/* Expanded Section */}
      {expanded && (
        <div onClick={(e) => e.stopPropagation()}>
          {/* Balance Breakdown - Exact Spacing */}
          <div style={{ paddingTop: '18px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: '#8F9BB3', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>Balance Breakdown</div>
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

          {/* Actions - FULLY DYNAMIC BUTTONS WITH EXACT SPECS */}
          <div>
            <div style={{ fontSize: '13px', color: '#8F9BB3', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Actions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {/* DEPOSIT BUTTON - FULLY DYNAMIC - EXACT SPECS */}
              <WalletButton
                onClick={handleDeposit}
                icon={<ArrowDownLeft size={18} />}
                label="Deposit"
                type="primary"
                coinColor={coinColor}
              />

              {/* WITHDRAW BUTTON - FULLY DYNAMIC - EXACT SPECS */}
              <WalletButton
                onClick={handleWithdraw}
                icon={<ArrowUpRight size={18} />}
                label="Withdraw"
                type="secondary"
                coinColor={coinColor}
              />

              {/* SWAP BUTTON - FULLY DYNAMIC - EXACT SPECS */}
              <WalletButton
                onClick={handleSwap}
                icon={<Repeat size={18} />}
                label="Swap"
                type="secondary"
                coinColor={coinColor}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// QUICK ACTION BUTTON - COMPACT VERSION FOR COLLAPSED CARDS
function QuickActionButton({ onClick, icon, label, coinColor = '#00F0FF' }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '10px 12px',
        background: isHovered ? 'rgba(0, 240, 255, 0.15)' : 'rgba(0, 240, 255, 0.08)',
        border: `1px solid ${isHovered ? 'rgba(0, 240, 255, 0.4)' : 'rgba(0, 240, 255, 0.2)'}`,
        borderRadius: '10px',
        color: '#00F0FF',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isHovered ? `0 0 12px ${coinColor}44` : 'none'
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// GLOBAL WALLET BUTTON COMPONENT - EXACT USER SPECIFICATIONS
function WalletButton({ onClick, icon, label, type = 'primary', coinColor = '#00F0FF' }) {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const getStyles = () => {
    if (type === 'primary') {
      return {
        default: {
          background: 'linear-gradient(135deg, #00E8FF 0%, #008CFF 100%)',
          border: `1px solid ${coinColor}22`,
          boxShadow: `0 0 2px ${coinColor}`,
          color: '#0A0A0A',
          filter: 'brightness(1.0)',
          transform: 'translateY(0) scale(1)'
        },
        hover: {
          filter: 'brightness(1.1)',
          boxShadow: `0 0 8px ${coinColor}`,
          transform: 'translateY(-1px) scale(1)'
        },
        pressed: {
          filter: 'brightness(0.9)',
          boxShadow: `inset 0 2px 8px rgba(0, 0, 0, 0.2)`,
          transform: 'translateY(0) scale(0.96)'
        }
      };
    } else {
      return {
        default: {
          background: 'rgba(0, 232, 255, 0.1)',
          border: `1px solid ${coinColor}44`,
          boxShadow: `0 0 2px ${coinColor}55`,
          color: '#FFFFFF',
          filter: 'brightness(1.0)',
          transform: 'translateY(0) scale(1)'
        },
        hover: {
          filter: 'brightness(1.1)',
          boxShadow: `0 0 8px ${coinColor}77`,
          transform: 'translateY(-1px) scale(1)'
        },
        pressed: {
          filter: 'brightness(0.9)',
          boxShadow: `inset 0 2px 8px rgba(0, 0, 0, 0.2)`,
          transform: 'translateY(0) scale(0.96)'
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
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        border: currentStyle.border,
        background: currentStyle.background,
        boxShadow: currentStyle.boxShadow,
        filter: currentStyle.filter,
        transform: currentStyle.transform,
        color: currentStyle.color,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function TransactionHistory({ user }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const filters = ['All', 'Deposit', 'Withdraw', 'P2P', 'Swap'];

  const loadTransactions = React.useCallback(async () => {
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
  }, [user, activeFilter]);

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user, loadTransactions]);

  return (
    <div style={{ marginTop: '32px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px' }}>Transaction History</h2>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {filters.map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              borderRadius: '12px',
              border: activeFilter === filter ? '1px solid rgba(0, 240, 255, 0.5)' : '1px solid rgba(0, 240, 255, 0.2)',
              background: activeFilter === filter ? 'rgba(0, 240, 255, 0.15)' : 'rgba(0, 240, 255, 0.05)',
              color: activeFilter === filter ? '#00F0FF' : '#A3AEC2',
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
        padding: '20px',
        opacity: 0.94
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
          ))
        )}
      </div>
    </div>
  );
}
