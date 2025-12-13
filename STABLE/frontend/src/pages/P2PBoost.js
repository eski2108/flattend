import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { IoFlash, IoTrendingUp as TrendingUp } from 'react-icons/io5';

export default function P2PBoost() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <IoFlash size={64} color="#FDBA74" style={{ margin: '0 auto 1rem' }} />
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fff', marginBottom: '1rem' }}>Boost Your Listings</h1>
          <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)' }}>Get more visibility and complete trades faster</p>
        </div>

        <div style={{
          background: 'linear-gradient(145deg, #3B1A0F, #210C06)',
          border: '2px solid rgba(249, 115, 22, 0.22)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#FDBA74', marginBottom: '1rem' }}>Boost Benefits</h2>
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ color: '#fff' }}>🚀 Appear at the top of marketplace listings</div>
            <div style={{ color: '#fff' }}>⚡ 3x more visibility to potential buyers</div>
            <div style={{ color: '#fff' }}>📈 Higher conversion rates</div>
            <div style={{ color: '#fff' }}>⏱️ Boost duration: 24 hours</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#22F2FF', textAlign: 'center', marginBottom: '1.5rem' }}>£10 per boost</div>
          <button style={{
            width: '100%',
            height: '50px',
            background: 'linear-gradient(145deg, #00F0FF, #7B2FFF)',
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '18px',
            fontWeight: '700',
            cursor: 'pointer'
          }}>
            Boost Now →
          </button>
        </div>
      </div>
    </Layout>
  );
}
