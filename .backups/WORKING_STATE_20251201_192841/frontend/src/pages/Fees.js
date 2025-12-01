import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { IoArrowForward, IoCash, IoInformationCircle } from 'react-icons/io5';

export default function Fees() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: '900', 
            marginBottom: '1rem'
          }}>
            <span style={{ 
              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Fee Structure
            </span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.125rem' }}>
            Transparent, competitive fees for all transactions
          </p>
        </div>

        {/* Fee Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          {/* Deposit Fee */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.05))',
            border: '2px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '20px',
            padding: '2rem',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(245, 158, 11, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth={2}>
                <line x1={12} y1={19} x2={12} y2={5}></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#F59E0B', marginBottom: '0.5rem' }}>
              Deposit Fee
            </h3>
            <div style={{ fontSize: '3rem', fontWeight: '900', color: '#FFFFFF', marginBottom: '0.5rem' }}>
              FREE
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: '1.6' }}>
              No fees for depositing crypto into your Coin Hub IoClose as X wallet. Keep 100% of your deposits.
            </p>
          </div>

          {/* Trading Fee */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(0, 184, 230, 0.05))',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '20px',
            padding: '2rem',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 240, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #00F0FF, #00B8E6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <IoCash size={32} color="#000000" />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#00F0FF', marginBottom: '0.5rem' }}>
              Trading Fee
            </h3>
            <div style={{ fontSize: '3rem', fontWeight: '900', color: '#FFFFFF', marginBottom: '0.5rem' }}>
              0.5%
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: '1.6' }}>
              Per completed trade. One of the lowest fees in the industry. Both buyer and seller split the fee equally.
            </p>
          </div>

          {/* Withdrawal Fee */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.05))',
            border: '2px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '20px',
            padding: '2rem',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(34, 197, 94, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #22C55E, #16A34A)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2}>
                <line x1={12} y1={5} x2={12} y2={19}></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#22C55E', marginBottom: '0.5rem' }}>
              Withdrawal Fee
            </h3>
            <div style={{ fontSize: '3rem', fontWeight: '900', color: '#FFFFFF', marginBottom: '0.5rem' }}>
              1.5%
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: '1.6' }}>
              Automated fee deducted from withdrawal amount. Fee is automatically routed to platform wallet for security.
            </p>
          </div>
        </div>

        {/* Fee Comparison */}
        <div style={{
          background: 'rgba(30, 39, 73, 0.6)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '3rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <IoInformationCircle size={24} color="#00F0FF" />
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#FFFFFF' }}>
              Why Our Fees Are Lower
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
                Coin Hub X
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#00F0FF' }}>
                0.5% Trading Fee
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
                Competitor A
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'rgba(255,255,255,0.4)' }}>
                1.0% Trading Fee
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
                Competitor B
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'rgba(255,255,255,0.4)' }}>
                1.5% Trading Fee
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => navigate('/p2p-marketplace')}
            style={{
              padding: '1rem 2.5rem',
              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.125rem',
              fontWeight: '700',
              color: '#000000',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 240, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Start Trading Now
            <IoArrowForward size={24} />
          </button>
        </div>
      </div>
    </Layout>
  );
}
