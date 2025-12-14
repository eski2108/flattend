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
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(180deg, #0A0F1E 0%, #050810 100%)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#fff' 
      }}>
        <div style={{
          fontSize: '16px',
          fontWeight: '500',
          color: '#6B7A99',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '3px solid rgba(0,229,255,0.2)',
            borderTop: '3px solid #00E5FF',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Loading...
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(180deg, #0A0F1E 0%, #050810 100%)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#fff' 
      }}>
        Asset not found
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #0A0F1E 0%, #050810 100%)', 
      color: '#fff', 
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      paddingBottom: '32px'
    }}>
      {/* Premium Header with Glassmorphism */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: 'rgba(10, 15, 30, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        zIndex: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <button 
          onClick={() => navigate('/wallet')} 
          style={{ 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            color: '#fff', 
            cursor: 'pointer', 
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255,255,255,0.08)';
            e.target.style.borderColor = 'rgba(255,255,255,0.12)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255,255,255,0.05)';
            e.target.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
        >
          <IoArrowBack size={22} />
        </button>
        <div style={{
          position: 'relative',
          width: '40px',
          height: '40px'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(123,44,255,0.2))',
            borderRadius: '50%',
            filter: 'blur(8px)',
            opacity: 0.6
          }} />
          <img 
            src={asset.logoUrl} 
            alt={asset.currency} 
            style={{ 
              position: 'relative',
              width: '40px', 
              height: '40px', 
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.1)'
            }} 
          />
        </div>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.01em' }}>
            {asset.currency}
          </div>
          <div style={{ fontSize: '13px', color: '#6B7A99', fontWeight: '500' }}>
            {asset.name}
          </div>
        </div>
      </div>

      {/* Premium Balance Card with Gradient Glow */}
      <div style={{ padding: '24px' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,71,217,0.08) 0%, rgba(123,44,255,0.08) 100%)',
          borderRadius: '24px',
          padding: '32px 28px',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Ambient Glow Effect */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(0,229,255,0.15) 0%, transparent 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-30%',
            left: '-10%',
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle, rgba(123,44,255,0.12) 0%, transparent 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ 
              fontSize: '13px', 
              color: '#6B7A99', 
              marginBottom: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Balance
            </div>
            <div style={{ 
              fontSize: '44px', 
              fontWeight: '700', 
              marginBottom: '8px',
              background: 'linear-gradient(135deg, #00E5FF 0%, #FFFFFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em'
            }}>
              £{asset.gbp_value.toFixed(2)}
            </div>
            <div style={{ 
              fontSize: '17px', 
              color: '#8FA3C8',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>{asset.total_balance.toFixed(8)}</span>
              <span style={{
                color: '#6B7A99',
                fontSize: '15px'
              }}>{asset.currency}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Action Buttons - Redesigned Grid */}
      <div style={{ padding: '0 24px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: '14px'
        }}>
          {/* Buy Button - Primary Neon */}
          <button
            onClick={() => navigate('/buy-crypto')}
            style={{
              padding: '18px',
              background: 'linear-gradient(135deg, #00E5FF 0%, #00B8D4 100%)',
              border: 'none',
              borderRadius: '16px',
              color: '#001018',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,229,255,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
              transition: 'all 0.2s',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 32px rgba(0,229,255,0.45), inset 0 1px 0 rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 24px rgba(0,229,255,0.35), inset 0 1px 0 rgba(255,255,255,0.2)';
            }}
          >
            Buy
          </button>

          {/* Swap Button - Secondary Neon Outline */}
          <button
            onClick={() => navigate('/swap-crypto')}
            style={{
              padding: '18px',
              background: 'rgba(0,229,255,0.08)',
              border: '2px solid #00E5FF',
              borderRadius: '16px',
              color: '#00E5FF',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,229,255,0.15), inset 0 1px 0 rgba(0,229,255,0.1)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.background = 'rgba(0,229,255,0.12)';
              e.target.style.boxShadow = '0 12px 32px rgba(0,229,255,0.25), inset 0 1px 0 rgba(0,229,255,0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.background = 'rgba(0,229,255,0.08)';
              e.target.style.boxShadow = '0 8px 24px rgba(0,229,255,0.15), inset 0 1px 0 rgba(0,229,255,0.1)';
            }}
          >
            Swap
          </button>

          {/* Send Button - Blue Outline */}
          <button
            onClick={() => navigate('/send', { state: { asset: asset.currency } })}
            style={{
              padding: '18px',
              background: 'rgba(0,71,217,0.08)',
              border: '2px solid #0047D9',
              borderRadius: '16px',
              color: '#5D9EFF',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,71,217,0.15), inset 0 1px 0 rgba(0,71,217,0.1)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.background = 'rgba(0,71,217,0.12)';
              e.target.style.boxShadow = '0 12px 32px rgba(0,71,217,0.25), inset 0 1px 0 rgba(0,71,217,0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.background = 'rgba(0,71,217,0.08)';
              e.target.style.boxShadow = '0 8px 24px rgba(0,71,217,0.15), inset 0 1px 0 rgba(0,71,217,0.1)';
            }}
          >
            Send
          </button>

          {/* Receive Button - Blue Solid */}
          <button
            onClick={() => navigate(`/receive?asset=${asset.currency}`, { state: { asset: asset.currency } })}
            style={{
              padding: '18px',
              background: 'linear-gradient(135deg, #0047D9 0%, #003BA8 100%)',
              border: 'none',
              borderRadius: '16px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,71,217,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 32px rgba(0,71,217,0.45), inset 0 1px 0 rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 24px rgba(0,71,217,0.35), inset 0 1px 0 rgba(255,255,255,0.15)';
            }}
          >
            Receive
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
