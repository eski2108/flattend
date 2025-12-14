import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';

export default function SendPage() {
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
        <div style={{ fontSize: '20px', fontWeight: '700' }}>Send Crypto</div>
      </div>
      <div style={{ padding: '24px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: '16px', color: '#8FA3C8', marginTop: '60px' }}>Send page coming soon</p>
      </div>
    </div>
  );
}
