import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { IoAdd as Plus, IoNotifications } from 'react-icons/io5';

export default function PriceAlerts() {
  const [alerts, setAlerts] = useState([]);

  return (
    <Layout>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <IoNotifications size={64} color="#7DD3FC" style={{ margin: '0 auto 1rem' }} />
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fff', marginBottom: '1rem' }}>Price Alerts</h1>
          <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)' }}>Get notified when prices hit your target</p>
        </div>

        <div style={{
          background: 'linear-gradient(145deg, #052A3B, #02171F)',
          border: '2px solid rgba(34, 211, 238, 0.22)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#7DD3FC', marginBottom: '1rem' }}>Premium Feature</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem' }}>Set unlimited price alerts and arbitrage notifications</p>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#22F2FF', marginBottom: '1.5rem' }}>£10/month</div>
          <button style={{
            width: '78%',
            height: '45px',
            background: 'linear-gradient(145deg, #00F0FF, #7B2FFF)',
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            Subscribe Now →
          </button>
        </div>

        {alerts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' }}>
            <p>No alerts set yet. Subscribe to start creating alerts.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
