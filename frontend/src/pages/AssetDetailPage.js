import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import axios from 'axios';
import { getCoinLogo } from '@/utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

export default function AssetDetailPage() {
  const navigate = useNavigate();
  const { symbol } = useParams();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssetData();
  }, [symbol]);

  const loadAssetData = async () => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) { navigate('/login'); return; }
    const user = JSON.parse(userData);

    try {
      const [metaRes, balanceRes, priceRes] = await Promise.all([
        axios.get(`${API}/api/wallets/coin-metadata`),
        axios.get(`${API}/api/wallets/balances/${user.user_id}`),
        axios.get(`${API}/api/prices/live`)
      ]);

      const coinMeta = metaRes.data.coins?.find(c => c.symbol.toLowerCase() === symbol.toLowerCase());
      const balance = balanceRes.data.balances?.find(b => b.currency.toLowerCase() === symbol.toLowerCase());
      const price = priceRes.data.prices?.[symbol.toUpperCase()];

      setAsset({
        currency: symbol.toUpperCase(),
        name: coinMeta?.name || symbol,
        logoUrl: getCoinLogo(symbol.toUpperCase()),
        total_balance: balance?.total_balance || 0,
        gbp_value: (balance?.total_balance || 0) * (price?.gbp || 0),
        price_gbp: price?.gbp || 0
      });
    } catch (error) {
      console.error('Failed to load asset:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#060B1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading...</div>;
  }

  if (!asset) {
    return <div style={{ minHeight: '100vh', background: '#060B1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Asset not found</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060B1A', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{
        position: 'sticky',
        top: 0,
        background: '#060B1A',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <button onClick={() => navigate('/wallet')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px' }}>
          <IoArrowBack size={24} />
        </button>
        <img src={asset.logoUrl} alt={asset.currency} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>{asset.currency}</div>
          <div style={{ fontSize: '14px', color: '#8FA3C8' }}>{asset.name}</div>
        </div>
      </div>

      <div style={{ padding: '32px 20px' }}>
        <div style={{ fontSize: '14px', color: '#8FA3C8', marginBottom: '8px' }}>Balance</div>
        <div style={{ fontSize: '36px', fontWeight: '700', marginBottom: '4px' }}>
          £{asset.gbp_value.toFixed(2)}
        </div>
        <div style={{ fontSize: '16px', color: '#8FA3C8' }}>
          {asset.total_balance.toFixed(8)} {asset.currency}
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', gap: '12px' }}>
        <button
          onClick={() => navigate('/buy')}
          style={{
            flex: 1,
            padding: '14px',
            background: '#00E5FF',
            border: 'none',
            borderRadius: '12px',
            color: '#001018',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Buy
        </button>
        <button
          onClick={() => navigate('/swap')}
          style={{
            flex: 1,
            padding: '14px',
            background: 'transparent',
            border: '1.5px solid #00E5FF',
            borderRadius: '12px',
            color: '#00E5FF',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Swap
        </button>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', gap: '12px', marginTop: '12px' }}>
        <button
          onClick={() => navigate('/send')}
          style={{
            flex: 1,
            padding: '14px',
            background: 'transparent',
            border: '1.5px solid #F5C542',
            borderRadius: '12px',
            color: '#F5C542',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Send
        </button>
        <button
          onClick={() => navigate('/receive')}
          style={{
            flex: 1,
            padding: '14px',
            background: 'transparent',
            border: '1.5px solid #F5C542',
            borderRadius: '12px',
            color: '#F5C542',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Receive
        </button>
      </div>
    </div>
  );
}
