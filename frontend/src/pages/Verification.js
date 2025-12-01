import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { IoCheckmark as Check, IoCheckmarkCircle, IoShield } from 'react-icons/io5';

export default function Verification() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <IoShield size={64} color="#C084FC" style={{ margin: '0 auto 1rem' }} />
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fff', marginBottom: '1rem' }}>Get Verified</h1>
          <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)' }}>Build trust with buyers and unlock higher trading limits</p>
        </div>

        <div style={{
          background: 'linear-gradient(145deg, #2A0F45, #1C0B32)',
          border: '2px solid rgba(168, 85, 247, 0.22)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#C084FC', marginBottom: '1rem' }}>Verification Benefits</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <IoCheckmarkCircle size={24} color="#6EE7B7" />
              <span style={{ color: '#fff' }}>Verified Badge on your profile</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <IoCheckmarkCircle size={24} color="#6EE7B7" />
              <span style={{ color: '#fff' }}>Higher trading limits (up to £50,000/day)</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <IoCheckmarkCircle size={24} color="#6EE7B7" />
              <span style={{ color: '#fff' }}>Priority support access</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <IoCheckmarkCircle size={24} color="#6EE7B7" />
              <span style={{ color: '#fff' }}>Increased buyer confidence</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/kyc')}
          style={{
            width: '100%',
            height: '50px',
            background: 'linear-gradient(145deg, #00F0FF, #7B2FFF)',
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '18px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)'
          }}
        >
          Start Verification Process →
        </button>
      </div>
    </Layout>
  );
}
