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

// OFFICIAL BINANCE COLORS
const COLORS = {
  PRIMARY_BG: '#0B0F14',
  SECONDARY_BG: '#0B1220',
  CARD_BG: '#111827',
  HOVER_BG: '#1F2937',
  BINANCE_BLUE: '#1E90FF',
  BINANCE_YELLOW: '#F0B90B',
  SUCCESS: '#16C784',
  DANGER: '#EA3943',
  GREY: '#9CA3AF',
  GREY_DARK: '#6B7280',
  WHITE: '#FFFFFF',
  DIVIDER: '#1F2937',
  // Official coin colors
  BTC: '#F7931A',
  ETH: '#627EEA',
  BNB: '#F0B90B',
  SOL: '#14F195',
  ADA: '#0033AD',
  XRP: '#00AAE4',
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
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
    loadAllData(u.user_id);

    const interval = setInterval(() => loadBalances(u.user_id), 15000);
    return () => clearInterval(interval);
  }, [navigate]);

  const loadAllData = async (userId) => {
    setLoading(true);
    await Promise.all([
      loadCoinMetadata(),
      loadBalances(userId)
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
    return icons[symbol] || symbol[0];
  };

  const getCoinColor = (symbol) => COLORS[symbol] || COLORS.BINANCE_BLUE;

  // MERGE coins with balances - show ALL coins even with 0 balance
  const mergedAssets = allCoins.map(coin => {
    const balance = balances.find(b => b.currency === coin.symbol);
    return {
      currency: coin.symbol,
      name: coin.name,
      icon: coin.icon || getCoinIcon(coin.symbol),
      color: coin.color || getCoinColor(coin.symbol),
      total_balance: balance?.total_balance || 0,
      available_balance: balance?.available_balance || 0,
      locked_balance: balance?.locked_balance || 0,
      gbp_value: balance?.gbp_value || 0,
      price_gbp: balance?.price_gbp || 0
    };
  });

  const filteredAssets = searchTerm
    ? mergedAssets.filter(asset => 
        asset.currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : mergedAssets;

  const totalValue = balances.reduce((sum, b) => sum + (b.gbp_value || 0), 0);
  const change24h = 2.45;
  const isPositive = change24h >= 0;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.PRIMARY_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ fontSize: '20px', color: COLORS.BINANCE_BLUE, fontWeight: '600' }}>Loading wallet...</div>
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
          <button onClick={handleRefresh} disabled={refreshing} style={{ padding: '12px 24px', background: `rgba(30, 144, 255, 0.1)`, border: `1px solid ${COLORS.BINANCE_BLUE}`, borderRadius: '12px', color: COLORS.BINANCE_BLUE, fontSize: '14px', fontWeight: '600', cursor: refreshing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IoRefresh size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Portfolio Summary */}
        <div style={{ background: `linear-gradient(135deg, ${COLORS.CARD_BG}, ${COLORS.PRIMARY_BG})`, border: `1px solid ${COLORS.DIVIDER}`, borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '14px', color: COLORS.GREY, fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL PORTFOLIO VALUE</div>
              <div style={{ fontSize: '48px', fontWeight: '700', color: COLORS.WHITE, lineHeight: '1', marginBottom: '12px' }}>£{totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isPositive ? <IoTrendingUp size={20} color={COLORS.SUCCESS} /> : <IoTrendingDown size={20} color={COLORS.DANGER} />}
                <span style={{ fontSize: '16px', fontWeight: '600', color: isPositive ? COLORS.SUCCESS : COLORS.DANGER }}>{isPositive ? '+' : ''}{change24h.toFixed(2)}%</span>
                <span style={{ fontSize: '14px', color: COLORS.GREY, marginLeft: '4px' }}>24h</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => setDepositModal({ isOpen: true, currency: 'BTC' })} style={{ padding: '12px 24px', background: COLORS.BINANCE_BLUE, border: 'none', borderRadius: '12px', color: COLORS.WHITE, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Deposit</button>
              <button onClick={() => toast.info('Select an asset to withdraw')} style={{ padding: '12px 24px', background: 'transparent', border: `1px solid ${COLORS.BINANCE_BLUE}`, borderRadius: '12px', color: COLORS.BINANCE_BLUE, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Withdraw</button>
              <button onClick={() => navigate('/instant-buy')} style={{ padding: '12px 24px', background: 'transparent', border: `1px solid ${COLORS.SUCCESS}`, borderRadius: '12px', color: COLORS.SUCCESS, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Buy</button>
            </div>
          </div>
        </div>

        {/* Mini Stats Bar */}
        <MiniStatsBar balances={balances} totalValue={totalValue} />

        {/* Search */}
        <div style={{ background: COLORS.SECONDARY_BG, border: `1px solid ${COLORS.DIVIDER}`, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ position: 'relative' }}>
            <IoSearch size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLORS.GREY }} />
            <input type="text" placeholder="Search coins..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 44px', background: COLORS.PRIMARY_BG, border: `1px solid ${COLORS.DIVIDER}`, borderRadius: '12px', color: COLORS.WHITE, fontSize: '14px', outline: 'none' }} />
          </div>
        </div>

        {/* Asset List Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 100px 2fr', gap: '16px', padding: '12px 20px', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.GREY, textTransform: 'uppercase' }}>ASSET</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.GREY, textTransform: 'uppercase' }}>BALANCE</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.GREY, textTransform: 'uppercase' }}>VALUE</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.GREY, textTransform: 'uppercase' }}>LOCKED</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.GREY, textTransform: 'uppercase' }}>24H CHART</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.GREY, textTransform: 'uppercase', textAlign: 'right' }}>ACTIONS</div>
        </div>

        {/* Asset List - ALWAYS RENDER ALL COINS */}
        {filteredAssets.map((asset, index) => {
          const color = asset.color;
          const icon = asset.icon;
          const sparklineData = Array.from({ length: 24 }, () => 100 + (Math.random() - 0.5) * 20);
          const canStake = ['ETH', 'ADA', 'DOT', 'SOL'].includes(asset.currency);
          
          return (
            <div key={asset.currency} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 100px 2fr', gap: '16px', alignItems: 'center', padding: '16px 20px', background: COLORS.SECONDARY_BG, borderRadius: '14px', marginBottom: '8px', border: `1px solid ${COLORS.DIVIDER}`, transition: 'all 0.2s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color }}>{icon}</div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: COLORS.WHITE, marginBottom: '4px' }}>{asset.currency}</div>
                  <div style={{ fontSize: '13px', color: COLORS.GREY }}>{asset.name}</div>
                </div>
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: COLORS.WHITE }}>{asset.total_balance?.toFixed(8) || '0.00000000'}</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: COLORS.WHITE }}>£{(asset.gbp_value || 0).toFixed(2)}</div>
              <div style={{ fontSize: '13px', color: asset.locked_balance > 0 ? COLORS.BINANCE_YELLOW : COLORS.GREY_DARK }}>{asset.locked_balance > 0 ? asset.locked_balance.toFixed(8) : '-'}</div>
              <div style={{ height: '40px', width: '100%' }}>
                <Line data={{ labels: Array(24).fill(''), datasets: [{ data: sparklineData, borderColor: color, borderWidth: 2, fill: false, tension: 0.4, pointRadius: 0 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={(e) => { e.stopPropagation(); setDepositModal({ isOpen: true, currency: asset.currency }); }} style={{ padding: '8px 16px', background: COLORS.BINANCE_BLUE, border: 'none', borderRadius: '8px', color: COLORS.WHITE, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Deposit</button>
                <button onClick={(e) => { e.stopPropagation(); setWithdrawModal({ isOpen: true, currency: asset.currency, balance: asset.available_balance }); }} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${COLORS.BINANCE_BLUE}`, borderRadius: '8px', color: COLORS.BINANCE_BLUE, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Withdraw</button>
                <button onClick={(e) => { e.stopPropagation(); setSwapModal({ isOpen: true, fromCurrency: asset.currency }); }} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${COLORS.BINANCE_YELLOW}`, borderRadius: '8px', color: COLORS.BINANCE_YELLOW, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Swap</button>
              </div>
            </div>
          );
        })}
      </div>

      <DepositModal isOpen={depositModal.isOpen} onClose={() => setDepositModal({ isOpen: false, currency: null })} currency={depositModal.currency} userId={user?.user_id} />
      <WithdrawModal isOpen={withdrawModal.isOpen} onClose={() => setWithdrawModal({ isOpen: false, currency: null, balance: 0 })} currency={withdrawModal.currency} availableBalance={withdrawModal.balance} userId={user?.user_id} onSuccess={() => loadBalances(user?.user_id)} />
      <SwapModal isOpen={swapModal.isOpen} onClose={() => setSwapModal({ isOpen: false, fromCurrency: null })} fromCurrency={swapModal.fromCurrency} balances={balances} userId={user?.user_id} onSuccess={() => loadBalances(user?.user_id)} />
      <StakeModal isOpen={stakeModal.isOpen} onClose={() => setStakeModal({ isOpen: false, currency: null, balance: 0 })} currency={stakeModal.currency} availableBalance={stakeModal.balance} />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
