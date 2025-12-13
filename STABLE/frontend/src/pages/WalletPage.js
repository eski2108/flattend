import { BiArrowFromTop, BiArrowToTop, BiRepeat } from 'react-icons/bi';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CHXButton from '@/components/CHXButton';
import axios from 'axios';
import { toast } from 'sonner';
import { IoArrowDownCircle as ArrowDownLeft, IoArrowUpCircle as ArrowUpRight, IoRefresh, IoWallet } from 'react-icons/io5';

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

    // Auto-refresh balances every 10 seconds
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing wallet balances...');
      loadBalances(u.user_id);
    }, 10000); // 10 seconds

    // Listen for balance change events
    const handleBalanceChange = (e) => {
      if (e.key === 'wallet_balance_updated' && e.newValue) {
        console.log('🔄 Wallet balance update detected, refreshing...');
        loadBalances(u.user_id);
      }
    };

    // Listen for storage events (from other tabs/components)
    window.addEventListener('storage', handleBalanceChange);

    // Listen for custom events (from same tab)
    const handleCustomBalanceChange = () => {
      console.log('🔄 Wallet balance update triggered, refreshing...');
      loadBalances(u.user_id);
    };
    window.addEventListener('walletBalanceUpdated', handleCustomBalanceChange);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('storage', handleBalanceChange);
      window.removeEventListener('walletBalanceUpdated', handleCustomBalanceChange);
    };
  }, [navigate]);

  const loadCoinMetadata = async () => {
    try {
      const response = await axios.get(`${API}/api/wallets/coin-metadata`);
      if (response.data.success) {
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
      // Use BALANCES endpoint with cache-busting
      const response = await axios.get(`${API}/api/wallets/balances/${userId}?_t=${Date.now()}`);
      if (response.data.success) {
        const bals = response.data.balances || [];
        setBalances(bals);
        
        // Calculate total from gbp_value
        const total = bals.reduce((sum, bal) => sum + (bal.gbp_value || 0), 0);
        setTotalGBP(total);
        console.log('💵 WalletPage Total: £' + total.toFixed(2));
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
      toast.success('Refreshing balances...');
    }
  };

  const formatBalance = (balance, currency) => {
    const config = coinMetadata[currency];
    const decimals = config?.decimals || (currency === 'GBP' || currency === 'USD' ? 2 : 8);
    return balance.toFixed(decimals);
  };

  const getCoinColor = (currency) => {
    return coinMetadata[currency]?.color || '#00C6FF';
  };

  if (loading) {
    return (
      
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #05121F 0%, #071E2C 50%, #03121E 100%)' }}>
          <div style={{ fontSize: '20px', color: '#00C6FF', fontWeight: '700' }}>Loading wallet...</div>
        </div>
      
    );
  }

  return (
    
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #05121F 0%, #071E2C 50%, #03121E 100%)',
        padding: '24px 16px'
      }}>
        {/* Header with Refresh Button */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>Your Assets</h1>
            <CHXButton
              onClick={handleRefresh}
              disabled={refreshing}
              coinColor="#00C6FF"
              variant="secondary"
              size="small"
              icon={<IoRefresh size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />}
            >
              {refreshing ? '' : ''}
            </CHXButton>
          </div>
          <div style={{
            height: '2px',
            width: '100%',
            background: 'linear-gradient(90deg, #00C6FF 0%, transparent 100%)',
            boxShadow: '0 0 10px rgba(0, 198, 255, 0.5)'
          }} />
        </div>

        {/* Portfolio Summary */}
        <div style={{
          background: 'linear-gradient(135deg, #08192B 0%, #04101F 100%)',
          border: '1px solid rgba(0, 198, 255, 0.08)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 0 18px rgba(0, 198, 255, 0.08)',
          opacity: 0.94
        }}>
          <div style={{ fontSize: '13px', color: '#A3AEC2', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Portfolio Value</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>£{totalGBP.toFixed(2)}</div>
          <div style={{ fontSize: '14px', color: '#6EE7B7' }}>≈ ${(totalGBP * 1.27).toFixed(2)} USD</div>
        </div>

        {/* Assets List */}
        {balances.length > 0 && (
          <>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px' }}>Your Balances</div>
            {balances.map((asset, index) => (
              <AssetCard 
                key={`${asset.currency}-${index}`} 
                asset={asset} 
                navigate={navigate} 
                getCoinColor={getCoinColor} 
                formatBalance={formatBalance}
                userId={user.user_id}
                coinMetadata={coinMetadata[asset.currency] || {}}
              />
            ))}
          </>
        )}

        {/* Deposit Any Coin Section */}
        <div style={{ marginTop: balances.length > 0 ? '32px' : '0' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px' }}>
            {balances.length === 0 ? 'Start Depositing' : 'Deposit More Coins'}
          </div>
          <AllCoinsDepositGrid coinMetadata={coinMetadata} navigate={navigate} getCoinColor={getCoinColor} />
        </div>

        {/* Transaction History */}
        <TransactionHistory user={user} />
      </div>
    
  );
}

function AllCoinsDepositGrid({ coinMetadata, navigate, getCoinColor }) {
  const allCoins = Object.values(coinMetadata);

  if (allCoins.length === 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #08192B 0%, #04101F 100%)',
        border: '1px solid rgba(0, 198, 255, 0.08)',
        borderRadius: '16px',
        padding: '40px 20px',
        textAlign: 'center',
        opacity: 0.94
      }}>
        <IoWallet size={48} color="#A3AEC2" style={{ margin: '0 auto 16px' }} />
        <div style={{ fontSize: '18px', color: '#FFFFFF', fontWeight: '600', marginBottom: '8px' }}>Loading coins...</div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: '12px'
    }}>
      {allCoins.map((coin) => {
        const coinColor = getCoinColor(coin.symbol);
        return (
          <CoinDepositCard
            key={coin.symbol}
            coin={coin}
            coinColor={coinColor}
            navigate={navigate}
          />
        );
      })}
    </div>
  );
}

function CoinDepositCard({ coin, coinColor, navigate }) {
  const handleDeposit = () => {
    navigate(`/deposit/${coin.symbol.toLowerCase()}`, {
      state: {
        currency: coin.symbol,
        name: coin.name,
        network: coin.network,
        decimals: coin.decimals,
        nowpayments_currency: coin.nowpayments_code,
        color: coinColor
      }
    });
  };

  return (
    <div style={{ position: 'relative' }}>
      <CHXButton
        onClick={handleDeposit}
        coinColor={coinColor}
        variant="secondary"
        fullWidth
        size="small"
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
          <div style={{
            width: '40px',
            height: '40px',
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
            {coin.icon || coin.symbol[0]}
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600' }}>{coin.symbol}</div>
          <div style={{ fontSize: '11px', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
            {coin.name}
          </div>
        </div>
      </CHXButton>
    </div>
  );
}

function AssetCard({ asset, navigate, getCoinColor, formatBalance, userId, coinMetadata }) {
  const coinColor = getCoinColor(asset.currency);
  const [expanded, setExpanded] = useState(false);
  
  const coinSymbol = asset.currency.toLowerCase();
  const coinName = coinMetadata.name || asset.currency;
  const coinNetwork = coinMetadata.network || `${asset.currency} Network`;
  const coinIcon = coinMetadata.icon || asset.currency.substring(0, 1);
  const decimalPrecision = coinMetadata.decimals || 8;
  const nowpaymentsCode = coinMetadata.nowpayments_code || coinSymbol;

  const handleDeposit = (e) => {
    e.stopPropagation();
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
        border: `1px solid rgba(0, 198, 255, 0.08)`,
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '20px',
        boxShadow: `0 0 18px rgba(0, 198, 255, 0.08)`,
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        opacity: 0.94
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          
          <div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#FFFFFF', marginBottom: '2px' }}>{coinName}</div>
            <div style={{ fontSize: '12px', color: '#8F9BB3' }}>{coinNetwork}</div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF', marginBottom: '2px' }}>
            {formatBalance(asset.total_balance, asset.currency)} {asset.currency}
          </div>
          <div style={{ fontSize: '13px', color: '#A3AEC2' }}>
            ≈ £{(asset.total_balance * (asset.price_gbp || 0)).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      {!expanded && (
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <CHXButton onClick={handleDeposit} coinColor={coinColor} variant="secondary" size="small" fullWidth icon={<BiArrowFromTop size={16} />}>
            Deposit
          </CHXButton>
          <CHXButton onClick={handleWithdraw} coinColor={coinColor} variant="secondary" size="small" fullWidth icon={<BiArrowToTop size={16} />}>
            Withdraw
          </CHXButton>
          <CHXButton onClick={handleSwap} coinColor={coinColor} variant="secondary" size="small" fullWidth icon={<BiRepeat size={16} />}>
            Swap
          </CHXButton>
        </div>
      )}

      {/* Expanded Section with 180ms Animation */}
      <div style={{
        maxHeight: expanded ? '1000px' : '0',
        overflow: 'hidden',
        transition: 'max-height 0.18s ease-in-out',
        opacity: expanded ? 1 : 0,
        transitionProperty: 'max-height, opacity'
      }}>
        {expanded && (
          <div onClick={(e) => e.stopPropagation()} style={{ paddingTop: '18px' }}>
            {/* Balance Breakdown */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', color: '#8F9BB3', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>Balance Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#6EE7B7', marginBottom: '4px' }}>Available</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#FFFFFF' }}>{formatBalance(asset.available_balance, asset.currency)}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>{asset.currency}</div>
                </div>
                
                <div style={{ background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#FBBF24', marginBottom: '4px' }}>Locked</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#FFFFFF' }}>{formatBalance(asset.locked_balance, asset.currency)}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>{asset.currency}</div>
                </div>
                
                <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#60A5FA', marginBottom: '4px' }}>Total</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#FFFFFF' }}>{formatBalance(asset.total_balance, asset.currency)}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>{asset.currency}</div>
                </div>
              </div>
            </div>

            {/* Expanded Action Buttons */}
            <div>
              <div style={{ fontSize: '13px', color: '#8F9BB3', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Actions</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <CHXButton onClick={handleDeposit} coinColor={coinColor} variant="primary" size="medium" icon={<BiArrowFromTop size={18} />}>
                  Deposit
                </CHXButton>
                <CHXButton onClick={handleWithdraw} coinColor={coinColor} variant="secondary" size="medium" icon={<BiArrowToTop size={18} />}>
                  Withdraw
                </CHXButton>
                <CHXButton onClick={handleSwap} coinColor={coinColor} variant="secondary" size="medium" icon={<BiRepeat size={18} />}>
                  Swap
                </CHXButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
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
        // Filter out invalid transactions and apply filter
        txs = txs.filter(tx => tx.transaction_type); // Remove transactions without type
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
          <CHXButton
            key={filter}
            onClick={() => setActiveFilter(filter)}
            coinColor="#00C6FF"
            variant={activeFilter === filter ? 'primary' : 'secondary'}
            size="small"
          >
            {filter}
          </CHXButton>
        ))}
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #08192B 0%, #04101F 100%)',
        border: '1px solid rgba(0, 198, 255, 0.08)',
        borderRadius: '16px',
        padding: '20px',
        opacity: 0.94
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#A3AEC2' }}>Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#A3AEC2' }}>No transactions yet</div>
        ) : (
          transactions.slice(0, 10).map((tx, index) => {
            // Safe access with defaults
            const txType = tx.transaction_type || 'unknown';
            const txStatus = tx.status || 'unknown';
            const txCurrency = tx.currency || '';
            const txAmount = tx.amount || 0;
            
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: index < transactions.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: txType === 'deposit' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {txType === 'deposit' ? <BiArrowFromTop size={20} color="#22C55E" /> : <BiArrowToTop size={20} color="#EF4444" />}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#FFFFFF', marginBottom: '2px' }}>
                      {txType.charAt(0).toUpperCase() + txType.slice(1)} {txCurrency}
                    </div>
                    <div style={{ fontSize: '13px', color: '#A3AEC2' }}>
                      {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: txType === 'deposit' ? '#22C55E' : '#EF4444' }}>
                    {txType === 'deposit' ? '+' : '-'}{txAmount} {txCurrency}
                  </div>
                  <div style={{ fontSize: '12px', color: txStatus === 'completed' ? '#22C55E' : txStatus === 'pending' ? '#FBBF24' : '#EF4444', marginTop: '2px' }}>
                    {txStatus.charAt(0).toUpperCase() + txStatus.slice(1)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
