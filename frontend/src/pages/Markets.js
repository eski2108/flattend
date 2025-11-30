import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '@/components/Layout';
import '../styles/globalSwapTheme.css';

const API = process.env.REACT_APP_BACKEND_URL;

export default function Markets() {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState([]);

  useEffect(() => {
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    try {
      const res = await axios.get(`${API}/api/prices/live`);
      if (res.data.success && res.data.prices) {
        const marketList = Object.entries(res.data.prices).map(([symbol, data]) => ({
          symbol,
          price: data.price_gbp,
          change: data.change_24h
        }));
        setMarkets(marketList);
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
              📊 Live Markets
            </h1>
            <p className="swap-theme-text-secondary" style={{ fontSize: '16px', marginBottom: '32px' }}>
              Real-time crypto market prices
            </p>

            <div className="swap-theme-divider" />

            <div style={{ display: 'grid', gap: '12px', marginTop: '32px' }}>
              {markets.map((market) => (
                <div key={market.symbol} className="swap-theme-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 className="swap-theme-text-primary" style={{ fontSize: '18px', fontWeight: '700' }}>{market.symbol}</h3>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="swap-theme-accent" style={{ fontSize: '18px', fontWeight: '700' }}>£{market.price?.toFixed(2)}</p>
                      <p style={{ color: market.change >= 0 ? '#22C55E' : '#EF4444', fontSize: '14px' }}>
                        {market.change >= 0 ? '+' : ''}{market.change?.toFixed(2)}%
                      </p>
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