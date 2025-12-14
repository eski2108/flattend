import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { IoNotificationsOutline, IoSearchOutline, IoTrendingUp, IoTrendingDown } from 'react-icons/io5';
import { MdOutlineQrCode2 } from 'react-icons/md';
import { getCoinLogo } from '@/utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

export default function AssetsHome() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'crypto';
  
  const [user, setUser] = useState(null);
  const [balances, setBalances] = useState([]);
  const [allCoins, setAllCoins] = useState([]);
  const [priceData, setPriceData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) { navigate('/login'); return; }
    const u = JSON.parse(userData);
    setUser(u);
    loadData(u.user_id);
  }, [navigate]);

  const loadData = async (userId) => {
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
      if (response.data.success) setAllCoins(response.data.coins || []);
    } catch (error) { console.error('Failed to load metadata:', error); }
  };

  const loadBalances = async (userId) => {
    try {
      const response = await axios.get(`${API}/api/wallets/balances/${userId}`);
      if (response.data.success) setBalances(response.data.balances || []);
    } catch (error) { console.error('Failed to load balances:', error); }
  };

  const loadPriceData = async () => {
    try {
      const response = await axios.get(`${API}/api/prices/live`);
      if (response.data.success) setPriceData(response.data.prices || {});
    } catch (error) { console.error('Failed to load prices:', error); }
  };

  const mergedAssets = allCoins.map(coin => {
    const balance = balances.find(b => b.currency === coin.symbol);
    const price = priceData[coin.symbol] || {};
    const totalBalance = balance?.total_balance || 0;
    const priceGbp = balance?.price_gbp || price.gbp || 0;
    const gbpValue = totalBalance * priceGbp;
    
    return {
      currency: coin.symbol,
      name: coin.name,
      logoUrl: getCoinLogo(coin.symbol),
      total_balance: totalBalance,
      gbp_value: gbpValue,
      has_balance: totalBalance > 0
    };
  });

  const assetsWithBalance = mergedAssets.filter(a => a.has_balance);
  const totalValue = assetsWithBalance.reduce((sum, a) => sum + a.gbp_value, 0);
  
  const filteredAssets = searchTerm
    ? mergedAssets.filter(a =>
        a.currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : mergedAssets;

  const actionButtons = [
    { label: 'Buy', icon: '+', route: '/buy', color: '#0052FF' },
    { label: 'Swap', icon: '⇄', route: '/swap', color: '#0052FF' },
    { label: 'Bridge', icon: '⟷', route: '/bridge', color: '#0052FF' },
    { label: 'Send', icon: '↑', route: '/send', color: '#0052FF' },
    { label: 'Receive', icon: '↓', route: '/receive', color: '#0052FF' }
  ];

  const tabs = [
    { label: 'Crypto', value: 'crypto' },
    { label: 'NFTs', value: 'nfts' },
    { label: 'DeFi', value: 'defi' }
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#fff' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', paddingBottom: '80px' }}>
      {/* A) TOP HEADER */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: '#000',
        borderBottom: '1px solid #1a1a1a',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>Wallet</div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={() => navigate('/notifications')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px' }}>
            <IoNotificationsOutline size={24} />
          </button>
          <button onClick={() => navigate('/receive')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px' }}>
            <MdOutlineQrCode2 size={24} />
          </button>
        </div>
      </div>

      {/* B) MAIN BALANCE AREA */}
      <div style={{ padding: '32px 20px 24px' }}>
        <div style={{ fontSize: '40px', fontWeight: '700', marginBottom: '8px' }}>
          £{totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: '14px', color: '#8FA3C8' }}>
          {assetsWithBalance.length > 0 ? '+ £0.00 (0.00%) today' : 'No holdings yet'}
        </div>
      </div>

      {/* C) ACTION BUTTON ROW */}
      <div style={{
        padding: '0 20px 24px',
        display: 'flex',
        gap: '16px',
        overflowX: 'auto',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none'
      }}>
        {actionButtons.map((btn) => (
          <button
            key={btn.label}
            onClick={() => navigate(btn.route)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              minWidth: '70px',
              padding: 0
            }}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: btn.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: '#fff',
              fontWeight: '700'
            }}>
              {btn.icon}
            </div>
            <div style={{ fontSize: '13px', color: '#fff', fontWeight: '500' }}>{btn.label}</div>
          </button>
        ))}
      </div>

      {/* D) TAB BAR */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #1a1a1a',
        padding: '0 20px'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSearchParams({ tab: tab.value })}
            style={{
              flex: 1,
              padding: '16px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.value ? '2px solid #0052FF' : '2px solid transparent',
              color: activeTab === tab.value ? '#fff' : '#8FA3C8',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* E) SEARCH + LIST */}
      <div style={{ padding: '20px' }}>
        {/* Search */}
        <div style={{
          position: 'relative',
          marginBottom: '20px'
        }}>
          <IoSearchOutline size={20} style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#8FA3C8'
          }} />
          <input
            type="text"
            placeholder="Search assets…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 14px 14px 48px',
              background: '#1a1a1a',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              outline: 'none'
            }}
          />
        </div>

        {/* Asset List */}
        {activeTab === 'crypto' && (
          <div>
            {filteredAssets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8FA3C8' }}>
                <p>Add crypto to get started</p>
                <button
                  onClick={() => navigate('/buy')}
                  style={{
                    marginTop: '16px',
                    padding: '12px 32px',
                    background: '#0052FF',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Buy
                </button>
              </div>
            ) : (
              filteredAssets.map((asset) => (
                <div
                  key={asset.currency}
                  onClick={() => navigate(`/asset/${asset.currency.toLowerCase()}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 0',
                    borderBottom: '1px solid #1a1a1a',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={asset.logoUrl} alt={asset.currency} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>{asset.currency}</div>
                      <div style={{ fontSize: '14px', color: '#8FA3C8' }}>{asset.name}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>
                      £{asset.gbp_value.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '14px', color: '#8FA3C8' }}>
                      {asset.total_balance.toFixed(8)} {asset.currency}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'nfts' && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8FA3C8' }}>
            <p>NFTs coming soon</p>
          </div>
        )}

        {activeTab === 'defi' && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8FA3C8' }}>
            <p>DeFi coming soon</p>
          </div>
        )}
      </div>

      {/* F) BOTTOM NAV */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#000',
        borderTop: '1px solid #1a1a1a',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '12px 0',
        zIndex: 100
      }}>
        {[
          { label: 'Assets', route: '/assets', active: true },
          { label: 'Transactions', route: '/transactions', active: false },
          { label: 'Explore', route: '/explore', active: false },
          { label: 'Settings', route: '/settings', active: false }
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.route)}
            style={{
              background: 'none',
              border: 'none',
              color: item.active ? '#0052FF' : '#8FA3C8',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '8px 16px'
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
