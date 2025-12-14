import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoRefresh, IoSearch, IoTrendingUp, IoTrendingDown, IoArrowDown, IoArrowUp, IoSwapHorizontal } from 'react-icons/io5';
import DepositModal from '@/components/modals/DepositModal';
import WithdrawModal from '@/components/modals/WithdrawModal';
import SwapModal from '@/components/modals/SwapModal';
import StakeModal from '@/components/modals/StakeModal';
import MiniStatsBar from '@/components/MiniStatsBar';

const API = process.env.REACT_APP_BACKEND_URL;

const COLORS = {
  BTC: '#F7931A', ETH: '#627EEA', BNB: '#F0B90B', SOL: '#14F195',
  ADA: '#0033AD', XRP: '#00AAE4', DOT: '#E6007A', USDT: '#26A17B',
  DOGE: '#C2A633', LTC: '#345D9D', MATIC: '#8247E5'
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

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) { navigate('/login'); return; }
    const u = JSON.parse(userData);
    setUser(u);
    loadAllData(u.user_id);
    const interval = setInterval(() => loadBalances(u.user_id), 15000);
    return () => clearInterval(interval);
  }, [navigate]);

  const loadAllData = async (userId) => {
    setLoading(true);
    await Promise.all([loadCoinMetadata(), loadBalances(userId)]);
    setLoading(false);
  };

  const loadCoinMetadata = async () => {
    try {
      const response = await axios.get(`${API}/api/wallets/coin-metadata`);
      if (response.data.success) setAllCoins(response.data.coins || []);
    } catch (error) { console.error('Failed to load coin metadata:', error); }
  };

  const loadBalances = async (userId) => {
    try {
      const response = await axios.get(`${API}/api/wallets/balances/${userId}?_t=${Date.now()}`);
      if (response.data.success) setBalances(response.data.balances || []);
    } catch (error) { console.error('Failed to load balances:', error); }
    finally { setRefreshing(false); }
  };

  const handleRefresh = () => {
    if (!refreshing && user) { setRefreshing(true); loadBalances(user.user_id); toast.success('Refreshing...'); }
  };

  const getCoinIcon = (symbol) => {
    const icons = { BTC: '₿', ETH: 'Ξ', USDT: '₮', XRP: 'X', LTC: 'Ł', ADA: '₳', DOT: '●', DOGE: 'Ð', BNB: 'B', SOL: 'S', MATIC: 'M', AVAX: 'A', LINK: 'L', UNI: 'U', ATOM: '⚛' };
    return icons[symbol] || symbol[0];
  };

  const getCoinColor = (symbol) => COLORS[symbol] || '#1E90FF';

  const mergedAssets = allCoins.map(coin => {
    const balance = balances.find(b => b.currency === coin.symbol);
    return {
      currency: coin.symbol, name: coin.name, icon: coin.icon || getCoinIcon(coin.symbol),
      color: coin.color || getCoinColor(coin.symbol), total_balance: balance?.total_balance || 0,
      available_balance: balance?.available_balance || 0, locked_balance: balance?.locked_balance || 0,
      gbp_value: balance?.gbp_value || 0, price_gbp: balance?.price_gbp || 0
    };
  });

  const filteredAssets = searchTerm ? mergedAssets.filter(a => a.currency.toLowerCase().includes(searchTerm.toLowerCase()) || a.name.toLowerCase().includes(searchTerm.toLowerCase())) : mergedAssets;
  const totalValue = balances.reduce((sum, b) => sum + (b.gbp_value || 0), 0);
  const change24h = 2.45;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ fontSize: '20px', color: '#FCD535', fontWeight: '600', textShadow: '0 0 20px rgba(252, 213, 53, 0.5)' }}>Loading wallet...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', padding: '32px 20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '36px', fontWeight: '800', background: 'linear-gradient(135deg, #FCD535 0%, #F0B90B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Wallet</h1>
            <p style={{ fontSize: '14px', color: '#8B92B2', margin: 0, fontWeight: '500' }}>Manage your crypto portfolio</p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #FCD535 0%, #F0B90B 100%)', border: 'none', borderRadius: '12px', color: '#000', fontSize: '14px', fontWeight: '700', cursor: refreshing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 24px rgba(252, 213, 53, 0.3)', transition: 'all 0.3s ease', transform: refreshing ? 'scale(0.95)' : 'scale(1)' }}>
            <IoRefresh size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Portfolio Card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(28, 32, 56, 0.95) 0%, rgba(20, 24, 44, 0.95) 100%)', backdropFilter: 'blur(20px)', border: '1px solid rgba(252, 213, 53, 0.1)', borderRadius: '24px', padding: '40px', marginBottom: '24px', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#8B92B2', fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Total Portfolio Value</div>
              <div style={{ fontSize: '56px', fontWeight: '800', background: 'linear-gradient(135deg, #FFFFFF 0%, #E0E7FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: '1', marginBottom: '16px', letterSpacing: '-1px' }}>£{totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: change24h >= 0 ? 'rgba(14, 203, 129, 0.1)' : 'rgba(246, 70, 93, 0.1)', padding: '8px 16px', borderRadius: '12px', width: 'fit-content' }}>
                {change24h >= 0 ? <IoTrendingUp size={24} color="#0ECB81" /> : <IoTrendingDown size={24} color="#F6465D" />}
                <span style={{ fontSize: '18px', fontWeight: '700', color: change24h >= 0 ? '#0ECB81' : '#F6465D' }}>{change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%</span>
                <span style={{ fontSize: '14px', color: '#8B92B2', fontWeight: '600' }}>24h</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => setDepositModal({ isOpen: true, currency: 'BTC' })} style={{ padding: '16px 32px', background: 'linear-gradient(135deg, #FCD535 0%, #F0B90B 100%)', border: 'none', borderRadius: '12px', color: '#000', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 24px rgba(252, 213, 53, 0.3)', transition: 'all 0.3s ease' }}>Deposit</button>
              <button onClick={() => toast.info('Select an asset')} style={{ padding: '16px 32px', background: 'rgba(252, 213, 53, 0.1)', border: '2px solid #FCD535', borderRadius: '12px', color: '#FCD535', fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.3s ease' }}>Withdraw</button>
              <button onClick={() => navigate('/instant-buy')} style={{ padding: '16px 32px', background: 'rgba(14, 203, 129, 0.1)', border: '2px solid #0ECB81', borderRadius: '12px', color: '#0ECB81', fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.3s ease' }}>Buy</button>
            </div>
          </div>
        </div>

        <MiniStatsBar balances={balances} totalValue={totalValue} />

        {/* Search */}
        <div style={{ background: 'rgba(28, 32, 56, 0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(252, 213, 53, 0.1)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ position: 'relative' }}>
            <IoSearch size={22} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#8B92B2' }} />
            <input type="text" placeholder="Search coins..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '16px 16px 16px 52px', background: 'rgba(10, 14, 39, 0.5)', border: '1px solid rgba(252, 213, 53, 0.1)', borderRadius: '12px', color: '#FFF', fontSize: '15px', outline: 'none', fontWeight: '500' }} />
          </div>
        </div>

        {/* Assets */}
        <div style={{ background: 'rgba(28, 32, 56, 0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(252, 213, 53, 0.1)', borderRadius: '16px', padding: '4px', overflow: 'hidden' }}>
          {filteredAssets.map((asset, idx) => (
            <div key={asset.currency} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', background: idx % 2 === 0 ? 'rgba(20, 24, 44, 0.4)' : 'transparent', borderBottom: idx < filteredAssets.length - 1 ? '1px solid rgba(139, 146, 178, 0.1)' : 'none', transition: 'all 0.3s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1.5' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `linear-gradient(135deg, ${asset.color}40, ${asset.color}20)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800', color: asset.color, boxShadow: `0 0 20px ${asset.color}40` }}>{asset.icon}</div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: '700', color: '#FFF', marginBottom: '4px' }}>{asset.currency}</div>
                  <div style={{ fontSize: '13px', color: '#8B92B2', fontWeight: '500' }}>{asset.name}</div>
                </div>
              </div>
              <div style={{ flex: '1', textAlign: 'right' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#FFF', marginBottom: '4px' }}>{asset.total_balance?.toFixed(8) || '0.00000000'}</div>
                <div style={{ fontSize: '13px', color: '#8B92B2', fontWeight: '500' }}>£{(asset.gbp_value || 0).toFixed(2)}</div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setDepositModal({ isOpen: true, currency: asset.currency })} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #FCD535, #F0B90B)', border: 'none', borderRadius: '10px', color: '#000', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(252, 213, 53, 0.3)', transition: 'all 0.3s ease' }}>Deposit</button>
                <button onClick={() => setWithdrawModal({ isOpen: true, currency: asset.currency, balance: asset.available_balance })} style={{ padding: '10px 20px', background: 'rgba(252, 213, 53, 0.1)', border: '2px solid #FCD535', borderRadius: '10px', color: '#FCD535', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.3s ease' }}>Withdraw</button>
                <button onClick={() => setSwapModal({ isOpen: true, fromCurrency: asset.currency })} style={{ padding: '10px 20px', background: 'rgba(139, 146, 178, 0.1)', border: '2px solid #8B92B2', borderRadius: '10px', color: '#8B92B2', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.3s ease' }}>Swap</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <DepositModal isOpen={depositModal.isOpen} onClose={() => setDepositModal({ isOpen: false, currency: null })} currency={depositModal.currency} userId={user?.user_id} />
      <WithdrawModal isOpen={withdrawModal.isOpen} onClose={() => setWithdrawModal({ isOpen: false, currency: null, balance: 0 })} currency={withdrawModal.currency} availableBalance={withdrawModal.balance} userId={user?.user_id} onSuccess={() => loadBalances(user?.user_id)} />
      <SwapModal isOpen={swapModal.isOpen} onClose={() => setSwapModal({ isOpen: false, fromCurrency: null })} fromCurrency={swapModal.fromCurrency} balances={balances} userId={user?.user_id} onSuccess={() => loadBalances(user?.user_id)} />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
