import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';

export default function BridgePage() {
  const navigate = useNavigate();

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
        <div style={{ fontSize: '20px', fontWeight: '700' }}>Bridge</div>
      </div>
      <div style={{ padding: '24px 20px' }}>
        <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '24px' }}>🌉</div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px', color: '#fff' }}>Bridge Coming Soon</h2>
          <p style={{ fontSize: '16px', color: '#8FA3C8', lineHeight: '1.6' }}>
            Bridge lets you move crypto between different blockchain networks.
            <br /><br />
            For example, transfer ETH from Ethereum to Arbitrum, or USDC from Polygon to Optimism.
          </p>
          <button
            onClick={() => navigate('/wallet')}
            style={{
              marginTop: '32px',
              padding: '14px 32px',
              background: '#0052FF',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Back to Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
