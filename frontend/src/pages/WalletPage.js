import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoRefresh, IoWallet } from 'react-icons/io5';
import PortfolioSummary from '@/components/PortfolioSummary';
import AssetRow from '@/components/AssetRow';
import WalletFilters from '@/components/WalletFilters';
import DepositModal from '@/components/modals/DepositModal';
import WithdrawModal from '@/components/modals/WithdrawModal';
import SwapModal from '@/components/modals/SwapModal';
import StakeModal from '@/components/modals/StakeModal';
import { getCoinLogo } from '@/utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

export default function WalletPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [balances, setBalances] = useState([]);
  const [coinMetadata, setCoinMetadata] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState('value');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currency, setCurrency] = useState('GBP');
  
  // Modal states
  const [depositModal, setDepositModal] = useState({ isOpen: false, currency: null });
  const [withdrawModal, setWithdrawModal] = useState({ isOpen: false, currency: null, balance: 0 });
  const [swapModal, setSwapModal] = useState({ isOpen: false, fromCurrency: null });
  const [stakeModal, setStakeModal] = useState({ isOpen: false, currency: null, balance: 0 });

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

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      loadBalances(u.user_id);
    }, 10000);

    return () => clearInterval(interval);
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
      const response = await axios.get(`${API}/api/wallets/balances/${userId}?_t=${Date.now()}`);
      if (response.data.success) {
        setBalances(response.data.balances || []);
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

  // Filter and sort balances
  const filteredBalances = balances
    .filter(asset => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const name = coinMetadata[asset.currency]?.name?.toLowerCase() || '';
        const symbol = asset.currency.toLowerCase();
        if (!name.includes(searchLower) && !symbol.includes(searchLower)) {
          return false;
        }
      }
      
      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes('all')) {
        // Implement category logic (favorites, gainers, losers)
        // For now, just pass through
      }
      
      return asset.total_balance > 0;
    })
    .sort((a, b) => {
      let compareA, compareB;
      
      switch (sortBy) {
        case 'value':
          compareA = a.gbp_value || 0;
          compareB = b.gbp_value || 0;
          break;
        case 'name':
          compareA = a.currency;
          compareB = b.currency;
          break;
        case 'balance':
          compareA = a.total_balance || 0;
          compareB = b.total_balance || 0;
          break;
        default:
          compareA = a.gbp_value || 0;
          compareB = b.gbp_value || 0;
      }
      
      if (sortDirection === 'asc') {
        return compareA > compareB ? 1 : -1;
      } else {
        return compareA < compareB ? 1 : -1;
      }
    });

  const totalValue = balances.reduce((sum, b) => sum + (b.gbp_value || 0), 0);
  const currencySymbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '€';

  // Action handlers
  const handleDeposit = (curr) => {
    setDepositModal({ isOpen: true, currency: curr });
  };

  const handleWithdraw = (curr) => {
    const asset = balances.find(b => b.currency === curr);
    setWithdrawModal({ 
      isOpen: true, 
      currency: curr, 
      balance: asset?.available_balance || 0 
    });
  };

  const handleSwap = (curr) => {
    setSwapModal({ isOpen: true, fromCurrency: curr });
  };

  const handleStake = (curr) => {
    const asset = balances.find(b => b.currency === curr);
    setStakeModal({ 
      isOpen: true, 
      currency: curr, 
      balance: asset?.available_balance || 0 
    });
  };

  const handleCategoryToggle = (categoryId) => {
    if (categoryId === 'all') {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(prev => 
        prev.includes(categoryId) 
          ? prev.filter(id => id !== categoryId)
          : [...prev, categoryId]
      );
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0B0E11',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          fontSize: '20px', 
          color: '#F0B90B', 
          fontWeight: '600',
          fontFamily: 'Inter, sans-serif'
        }}>
          Loading wallet...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B0E11',
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
              color: '#EAECEF',
              margin: '0 0 8px 0'
            }}>
              Wallet
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#B7BDC6',
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
              background: 'rgba(240, 185, 11, 0.1)',
              border: '1px solid #F0B90B',
              borderRadius: '12px',
              color: '#F0B90B',
              fontSize: '14px',
              fontWeight: '600',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: refreshing ? 'none' : '0 0 20px rgba(240, 185, 11, 0.2)'
            }}
            onMouseEnter={(e) => {
              if (!refreshing) {
                e.currentTarget.style.background = 'rgba(240, 185, 11, 0.2)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(240, 185, 11, 0.35)';
                e.currentTarget.style.transform = 'scale(1.02)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(240, 185, 11, 0.1)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(240, 185, 11, 0.2)';
              e.currentTarget.style.transform = 'scale(1)';
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

        {/* Portfolio Summary */}
        <PortfolioSummary
          totalValue={totalValue}
          currency={currency}
          balances={balances}
          change24h={2.45}
          onDeposit={() => setDepositModal({ isOpen: true, currency: 'BTC' })}
          onWithdraw={() => toast.info('Select an asset to withdraw')}
          onBuy={() => navigate('/instant-buy')}
          onSell={() => navigate('/instant-buy')}
        />

        {/* Filters */}
        <WalletFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedCategories={selectedCategories}
          onCategoryToggle={handleCategoryToggle}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={(sort, dir) => {
            setSortBy(sort);
            setSortDirection(dir);
          }}
        />

        {/* Asset List Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.5fr 1fr 1fr 120px 2fr',
          gap: '16px',
          padding: '12px 20px',
          marginBottom: '12px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#B7BDC6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Asset</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#B7BDC6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Balance</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#B7BDC6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Value</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#B7BDC6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Locked</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#B7BDC6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>24h Chart</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#B7BDC6', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</div>
        </div>

        {/* Asset List */}
        {filteredBalances.length > 0 ? (
          filteredBalances.map((asset, index) => (
            <AssetRow
              key={`${asset.currency}-${index}`}
              asset={asset}
              coinMetadata={coinMetadata}
              onDeposit={handleDeposit}
              onWithdraw={handleWithdraw}
              onSwap={handleSwap}
              onStake={handleStake}
              currencySymbol={currencySymbol}
            />
          ))
        ) : (
          <div style={{
            background: 'rgba(18, 22, 28, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #1E2329',
            borderRadius: '14px',
            padding: '60px 20px',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)'
          }}>
            <IoWallet size={64} color="#6B7280" style={{ margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#EAECEF', marginBottom: '8px' }}>
              No assets found
            </h3>
            <p style={{ fontSize: '14px', color: '#B7BDC6', marginBottom: '24px' }}>
              Start by depositing crypto to your wallet
            </p>
            <button
              onClick={() => setDepositModal({ isOpen: true, currency: 'BTC' })}
              style={{
                padding: '12px 32px',
                background: '#F0B90B',
                border: 'none',
                borderRadius: '12px',
                color: '#000000',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(240, 185, 11, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Deposit Crypto
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
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
      />
      <SwapModal
        isOpen={swapModal.isOpen}
        onClose={() => setSwapModal({ isOpen: false, fromCurrency: null })}
        fromCurrency={swapModal.fromCurrency}
        balances={balances}
        userId={user?.user_id}
      />
      <StakeModal
        isOpen={stakeModal.isOpen}
        onClose={() => setStakeModal({ isOpen: false, currency: null, balance: 0 })}
        currency={stakeModal.currency}
        availableBalance={stakeModal.balance}
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
