import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '@/components/Layout';
import '../styles/globalSwapTheme.css';

const API = process.env.REACT_APP_BACKEND_URL;

export default function DashboardThemed() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadData(parsedUser.user_id);
  }, []);

  const loadData = async (userId) => {
    try {
      const res = await axios.get(`${API}/api/portfolio/summary/${userId}`);
      if (res.data.success) {
        setTotalValue(res.data.current_value || 0);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="swap-theme-page">
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div className="swap-theme-card">
            <h1 className="swap-theme-text-primary" style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
              💎 Portfolio Dashboard
            </h1>
            <p className="swap-theme-text-secondary" style={{ fontSize: '16px', marginBottom: '32px' }}>
              Track your crypto investments in real-time
            </p>

            <div className="swap-theme-divider" />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '32px' }}>
              <div className="swap-theme-card">
                <p className="swap-theme-text-secondary" style={{ fontSize: '14px', marginBottom: '8px' }}>Total Portfolio Value</p>
                <h2 className="swap-theme-accent" style={{ fontSize: '36px', fontWeight: '700' }}>
                  £{totalValue.toFixed(2)}
                </h2>
              </div>

              <div className="swap-theme-card">
                <p className="swap-theme-text-secondary" style={{ fontSize: '14px', marginBottom: '8px' }}>24H Change</p>
                <h2 style={{ fontSize: '36px', fontWeight: '700', color: '#22C55E' }}>
                  +5.2%
                </h2>
              </div>

              <div className="swap-theme-card">
                <p className="swap-theme-text-secondary" style={{ fontSize: '14px', marginBottom: '8px' }}>Total Assets</p>
                <h2 className="swap-theme-text-primary" style={{ fontSize: '36px', fontWeight: '700' }}>
                  12
                </h2>
              </div>
            </div>

            <button 
              className="swap-theme-button" 
              style={{ width: '100%', marginTop: '32px' }}
              onClick={() => navigate('/wallet')}
            >
              ⚡ View Full Portfolio
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
