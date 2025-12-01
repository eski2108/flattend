import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { IoFlash as Zap, IoStar, IoTrendingUp as TrendingUp } from 'react-icons/io5';

export default function AccountUpgrade() {
  const navigate = useNavigate();

  const tiers = [
    { name: 'Bronze', price: '£20', color: '#CD7F32', features: ['Lower fees (0.8%)', 'Priority support', '£10,000/day limit'] },
    { name: 'Silver', price: '£50', color: '#C0C0C0', features: ['Lower fees (0.6%)', '24/7 support', '£25,000/day limit', 'Express trading'] },
    { name: 'Gold', price: '£100', color: '#FFD700', features: ['Lowest fees (0.4%)', 'Dedicated manager', '£100,000/day limit', 'All features'] }
  ];

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <IoStar size={64} color="#FACC15" style={{ margin: '0 auto 1rem' }} />
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fff', marginBottom: '1rem' }}>Upgrade Your Account</h1>
          <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)' }}>Unlock priority features and lower trading fees</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {tiers.map(tier => (
            <div key={tier.name} style={{
              background: 'linear-gradient(145deg, #2A3B0F, #11220B)',
              border: `2px solid ${tier.color}44`,
              borderRadius: '20px',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '700', color: tier.color, marginBottom: '1rem' }}>{tier.name}</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#22F2FF', marginBottom: '1.5rem' }}>{tier.price}</div>
              <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                {tier.features.map((feature, i) => (
                  <div key={i} style={{ color: 'rgba(255,255,255,0.8)' }}>• {feature}</div>
                ))}
              </div>
              <button style={{
                width: '100%',
                height: '45px',
                background: 'linear-gradient(145deg, #00F0FF, #7B2FFF)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                Upgrade to {tier.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
