import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoRefresh, IoSearch, IoTrendingUp, IoTrendingDown, IoArrowDown, IoArrowUp, IoSwapHorizontal, IoWallet } from 'react-icons/io5';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
import DepositModal from '@/components/modals/DepositModal';
import WithdrawModal from '@/components/modals/WithdrawModal';
import SwapModal from '@/components/modals/SwapModal';
import StakeModal from '@/components/modals/StakeModal';
import MiniStatsBar from '@/components/MiniStatsBar';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const API = process.env.REACT_APP_BACKEND_URL;

// EXISTING BRAND COLORS
const COLORS = {
  PRIMARY_BG: '#0B0E11',
  SECONDARY_BG: '#111418',
  ACCENT: '#00AEEF',
  SUCCESS: '#00C98D',
  WARNING: '#F5C542',
  DANGER: '#E35355',
  GREY: '#9FA6B2',
  WHITE: '#FFFFFF',
  // Coin colors from backend
  BTC: '#F7931A',
  ETH: '#627EEA',
  USDT: '#26A17B',
  XRP: '#00AAE4',
  LTC: '#345D9D',
  ADA: '#0033AD',
  DOT: '#E6007A',
  DOGE: '#C2A633',
  BNB: '#F3BA2F',
  SOL: '#14F195'
};

export default function WalletPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [balances, setBalances] = useState([]);
  const [coinMetadata, setCoinMetadata] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('value');
  const [sortDirection, setSortDirection] = useState('desc');
  
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

    const interval = setInterval(() => loadBalances(u.user_id), 15000);
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
      toast.success('Refreshing...');
    }
  };

  const getCoinIcon = (symbol) => {
    const icons = {
      BTC: '₿', ETH: 'Ξ', USDT: '₮', XRP: 'X', LTC: 'Ł',
      ADA: '₳', DOT: '●', DOGE: 'Ð', BNB: 'B', SOL: 'S',
      MATIC: 'M', AVAX: 'A', LINK: 'L', UNI: 'U', ATOM: '⚛'
    };
    return coinMetadata[symbol]?.icon || icons[symbol] || symbol[0];
  };

  const getCoinColor = (symbol) => COLORS[symbol] || COLORS.ACCENT;

  const filteredBalances = balances
    .filter(asset => {
      if (!searchTerm) return asset.total_balance > 0;
      const search = searchTerm.toLowerCase();
      return (asset.currency.toLowerCase().includes(search) || 
              coinMetadata[asset.currency]?.name?.toLowerCase().includes(search)) &&
             asset.total_balance > 0;
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
        default:
          compareA = a.gbp_value || 0;
          compareB = b.gbp_value || 0;
      }
      return sortDirection === 'asc' 
        ? (compareA > compareB ? 1 : -1)
        : (compareA < compareB ? 1 : -1);
    });

  const totalValue = balances.reduce((sum, b) => sum + (b.gbp_value || 0), 0);
  const change24h = 2.45; // Mock for now

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.PRIMARY_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ fontSize: '20px', color: COLORS.ACCENT, fontWeight: '600' }}>Loading wallet...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.PRIMARY_BG, padding: '24px 16px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '700', color: COLORS.WHITE, margin: '0 0 8px 0' }}>Wallet</h1>
            <p style={{ fontSize: '14px', color: COLORS.GREY, margin: 0 }}>Manage your crypto assets</p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} style={{ padding: '12px 24px', background: `rgba(0, 174, 239, 0.1)`, border: `1px solid ${COLORS.ACCENT}`, borderRadius: '12px', color: COLORS.ACCENT, fontSize: '14px', fontWeight: '600', cursor: refreshing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IoRefresh size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Portfolio Summary */}
        <div style={{ background: COLORS.SECONDARY_BG, border: `1px solid rgba(0, 174, 239, 0.2)`, borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '14px', color: COLORS.GREY, fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Portfolio Value</div>
              <div style={{ fontSize: '48px', fontWeight: '600', color: COLORS.WHITE, lineHeight: '1', marginBottom: '12px' }}>£{totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {change24h >= 0 ? <IoTrendingUp size={20} color={COLORS.SUCCESS} /> : <IoTrendingDown size={20} color={COLORS.DANGER} />}
                <span style={{ fontSize: '16px', fontWeight: '600', color: change24h >= 0 ? COLORS.SUCCESS : COLORS.DANGER }}>{change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%</span>
                <span style={{ fontSize: '14px', color: COLORS.GREY, marginLeft: '4px' }}>24h</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => setDepositModal({ isOpen: true, currency: 'BTC' })} style={{ padding: '12px 24px', background: `linear-gradient(135deg, ${COLORS.ACCENT}, #0088CC)`, border: 'none', borderRadius: '12px', color: COLORS.WHITE, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Deposit</button>
              <button onClick={() => toast.info('Select an asset to withdraw')} style={{ padding: '12px 24px', background: 'transparent', border: `1px solid ${COLORS.ACCENT}`, borderRadius: '12px', color: COLORS.ACCENT, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Withdraw</button>
              <button onClick={() => navigate('/instant-buy')} style={{ padding: '12px 24px', background: 'transparent', border: `1px solid ${COLORS.SUCCESS}`, borderRadius: '12px', color: COLORS.SUCCESS, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Buy</button>
            </div>
          </div>

          {/* Top 5 Assets Breakdown */}
          {balances.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
              <div style={{ fontSize: '14px', color: COLORS.GREY, fontWeight: '500', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Portfolio Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {balances.slice(0, 5).map((asset, index) => {
                  const percentage = totalValue > 0 ? ((asset.gbp_value || 0) / totalValue) * 100 : 0;
                  const color = getCoinColor(asset.currency);
                  return (
                    <div key={asset.currency} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: COLORS.PRIMARY_BG, borderRadius: '12px', border: `1px solid rgba(0, 174, 239, 0.1)` }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}CC)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: COLORS.WHITE }}>{getCoinIcon(asset.currency)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: COLORS.WHITE, marginBottom: '4px' }}>{asset.currency}</div>
                        <div style={{ fontSize: '12px', color: COLORS.GREY }}>{percentage.toFixed(1)}% • £{(asset.gbp_value || 0).toFixed(2)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ background: COLORS.SECONDARY_BG, border: `1px solid rgba(0, 174, 239, 0.2)`, borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
              <IoSearch size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.GREY }} />
              <input type="text" placeholder="Search coins..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 44px', background: COLORS.PRIMARY_BG, border: `1px solid rgba(0, 174, 239, 0.1)`, borderRadius: '12px', color: COLORS.WHITE, fontSize: '14px', outline: 'none' }} />
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '12px 16px', background: COLORS.PRIMARY_BG, border: `1px solid rgba(0, 174, 239, 0.1)`, borderRadius: '12px', color: COLORS.WHITE, fontSize: '14px', cursor: 'pointer', outline: 'none', minWidth: '150px', fontWeight: '500' }}>
              <option value="value">Sort by Value</option>
              <option value="name">Sort by Name</option>
            </select>
            <button onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')} style={{ padding: '12px', background: `rgba(0, 174, 239, 0.1)`, border: `1px solid ${COLORS.ACCENT}`, borderRadius: '12px', color: COLORS.ACCENT, cursor: 'pointer', fontWeight: '600', fontSize: '16px' }}>{sortDirection === 'asc' ? '↑' : '↓'}</button>
          </div>
        </div>

        {/* Asset List Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr 100px 2fr', gap: '16px', padding: '12px 20px', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.GREY, textTransform: 'uppercase' }}>Asset</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.GREY, textTransform: 'uppercase' }}>Balance</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.GREY, textTransform: 'uppercase' }}>Value</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.GREY, textTransform: 'uppercase' }}>Locked</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.GREY, textTransform: 'uppercase' }}>24h Chart</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.GREY, textTransform: 'uppercase', textAlign: 'right' }}>Actions</div>
        </div>

        {/* Asset List */}
        {filteredBalances.length > 0 ? (
          filteredBalances.map((asset, index) => {
            const color = getCoinColor(asset.currency);
            const icon = getCoinIcon(asset.currency);
            const sparklineData = Array.from({ length: 24 }, () => 100 + (Math.random() - 0.5) * 20);
            const canStake = ['ETH', 'ADA', 'DOT', 'SOL'].includes(asset.currency);
            
            return (
              <div key={`${asset.currency}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr 100px 2fr', gap: '16px', alignItems: 'center', padding: '16px 20px', background: COLORS.SECONDARY_BG, borderRadius: '14px', marginBottom: '8px', border: `1px solid rgba(0, 174, 239, 0.1)`, transition: 'all 0.2s ease', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}CC)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: COLORS.WHITE, boxShadow: `0 0 12px ${color}66` }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: COLORS.WHITE, marginBottom: '4px' }}>{asset.currency}</div>
                    <div style={{ fontSize: '13px', color: COLORS.GREY }}>{coinMetadata[asset.currency]?.name || asset.currency}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: COLORS.WHITE, marginBottom: '4px' }}>{asset.total_balance?.toFixed(8) || '0.00000000'}</div>
                  <div style={{ fontSize: '13px', color: COLORS.GREY }}>Available: {asset.available_balance?.toFixed(8) || '0.00000000'}</div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: COLORS.WHITE }}>£{(asset.gbp_value || 0).toFixed(2)}</div>
                <div style={{ fontSize: '13px', color: asset.locked_balance > 0 ? COLORS.WARNING : COLORS.GREY }}>{asset.locked_balance > 0 ? asset.locked_balance.toFixed(8) : '-'}</div>
                <div style={{ height: '40px', width: '100%' }}>
                  <Line data={{ labels: Array(24).fill(''), datasets: [{ data: sparklineData, borderColor: color, borderWidth: 2, fill: false, tension: 0.4, pointRadius: 0 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={(e) => { e.stopPropagation(); setDepositModal({ isOpen: true, currency: asset.currency }); }} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${COLORS.ACCENT}`, borderRadius: '8px', color: COLORS.ACCENT, fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><IoArrowDown size={14} />Deposit</button>
                  <button onClick={(e) => { e.stopPropagation(); setWithdrawModal({ isOpen: true, currency: asset.currency, balance: asset.available_balance }); }} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${COLORS.DANGER}`, borderRadius: '8px', color: COLORS.DANGER, fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><IoArrowUp size={14} />Withdraw</button>
                  <button onClick={(e) => { e.stopPropagation(); setSwapModal({ isOpen: true, fromCurrency: asset.currency }); }} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${COLORS.WARNING}`, borderRadius: '8px', color: COLORS.WARNING, fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><IoSwapHorizontal size={14} />Swap</button>
                  {canStake && <button onClick={(e) => { e.stopPropagation(); setStakeModal({ isOpen: true, currency: asset.currency, balance: asset.available_balance }); }} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${COLORS.SUCCESS}`, borderRadius: '8px', color: COLORS.SUCCESS, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Stake</button>}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ background: COLORS.SECONDARY_BG, border: `1px solid rgba(0, 174, 239, 0.1)`, borderRadius: '14px', padding: '60px 20px', textAlign: 'center' }}>
            <IoWallet size={64} color={COLORS.GREY} style={{ margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: COLORS.WHITE, marginBottom: '8px' }}>No assets found</h3>
            <p style={{ fontSize: '14px', color: COLORS.GREY, marginBottom: '24px' }}>Start by depositing crypto to your wallet</p>
            <button onClick={() => setDepositModal({ isOpen: true, currency: 'BTC' })} style={{ padding: '12px 32px', background: `linear-gradient(135deg, ${COLORS.ACCENT}, #0088CC)`, border: 'none', borderRadius: '12px', color: COLORS.WHITE, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Deposit Crypto</button>
          </div>
        )}
      </div>

      {/* Modals */}
      <DepositModal isOpen={depositModal.isOpen} onClose={() => setDepositModal({ isOpen: false, currency: null })} currency={depositModal.currency} userId={user?.user_id} />
      <WithdrawModal isOpen={withdrawModal.isOpen} onClose={() => setWithdrawModal({ isOpen: false, currency: null, balance: 0 })} currency={withdrawModal.currency} availableBalance={withdrawModal.balance} userId={user?.user_id} onSuccess={() => loadBalances(user?.user_id)} />
      <SwapModal isOpen={swapModal.isOpen} onClose={() => setSwapModal({ isOpen: false, fromCurrency: null })} fromCurrency={swapModal.fromCurrency} balances={balances} userId={user?.user_id} onSuccess={() => loadBalances(user?.user_id)} />
      <StakeModal isOpen={stakeModal.isOpen} onClose={() => setStakeModal({ isOpen: false, currency: null, balance: 0 })} currency={stakeModal.currency} availableBalance={stakeModal.balance} />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
