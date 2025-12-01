import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '@/components/Layout';
import '../styles/globalSwapTheme.css';

const API = process.env.REACT_APP_BACKEND_URL;

export default function Wallet() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [balances, setBalances] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadBalances(parsedUser.user_id);
  }, []);

  const loadBalances = async (userId) => {
    try {
      const res = await axios.get(`${API}/api/wallets/balances/${userId}`);
      if (res.data.success) {
        setBalances(res.data.balances || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <Layout>
      <div className="swap-theme-page">
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div className="swap-theme-card">
            <h1 className="swap-theme-text-primary" style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
              💼 My Wallet
            </h1>
            <p className="swap-theme-text-secondary" style={{ fontSize: '16px', marginBottom: '32px' }}>
              Manage your crypto assets
            </p>

            <div className="swap-theme-divider" />

            <div style={{ display: 'grid', gap: '16px', marginTop: '32px' }}>
              {balances.map((bal) => (
                <div key={bal.currency} className="swap-theme-card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p className="swap-theme-text-secondary" style={{ fontSize: '14px', marginBottom: '4px' }}>{bal.currency}</p>
                      <h3 className="swap-theme-accent" style={{ fontSize: '24px', fontWeight: '700' }}>{bal.balance}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="swap-theme-button" style={{ padding: '8px 16px' }}>Deposit</button>
                      <button className="swap-theme-button" style={{ padding: '8px 16px' }}>Withdraw</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}