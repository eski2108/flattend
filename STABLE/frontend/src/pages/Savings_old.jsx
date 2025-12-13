import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import '../styles/globalSwapTheme.css';

export default function Savings() {
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
  }, []);

  return (
    <Layout>
      <div className="swap-theme-page">
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div className="swap-theme-card">
            <h1 className="swap-theme-text-primary" style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
              💰 Savings Vault
            </h1>
            <p className="swap-theme-text-secondary" style={{ fontSize: '16px', marginBottom: '32px' }}>
              Earn rewards on your crypto holdings
            </p>

            <div className="swap-theme-divider" />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '32px' }}>
              <div className="swap-theme-card">
                <p className="swap-theme-text-secondary" style={{ fontSize: '14px', marginBottom: '8px' }}>BTC Savings</p>
                <h2 className="swap-theme-accent" style={{ fontSize: '28px', fontWeight: '700' }}>5.2% APY</h2>
              </div>
              <div className="swap-theme-card">
                <p className="swap-theme-text-secondary" style={{ fontSize: '14px', marginBottom: '8px' }}>ETH Savings</p>
                <h2 className="swap-theme-accent" style={{ fontSize: '28px', fontWeight: '700' }}>4.8% APY</h2>
              </div>
              <div className="swap-theme-card">
                <p className="swap-theme-text-secondary" style={{ fontSize: '14px', marginBottom: '8px' }}>USDT Savings</p>
                <h2 className="swap-theme-accent" style={{ fontSize: '28px', fontWeight: '700' }}>8.5% APY</h2>
              </div>
            </div>

            <button className="swap-theme-button" style={{ width: '100%', marginTop: '32px' }}>🚀 Start Earning</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}