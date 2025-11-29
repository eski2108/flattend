import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Twitter, Github, Mail } from 'lucide-react';

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer style={{
      background: 'linear-gradient(135deg, #0a0e27 0%, #13182a 100%)',
      borderTop: '1px solid rgba(0, 240, 255, 0.2)',
      padding: '3rem 2rem 2rem 2rem',
      marginTop: '4rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '3rem',
          marginBottom: '3rem'
        }}>
          {/* Company */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <Zap size={28} color="#00F0FF" />
              <h3 style={{ color: '#fff', fontSize: '24px', fontWeight: '900', margin: 0 }}>Coin Hub X</h3>
            </div>
            <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              Your trusted P2P crypto marketplace with escrow protection, 24/7 support, and zero-fee introductory period.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}>
                <Twitter size={18} color="#00F0FF" />
              </a>
              <a href="mailto:support@coinhubx.com" style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}>
                <Mail size={18} color="#00F0FF" />
              </a>
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 style={{ color: '#00F0FF', fontSize: '16px', fontWeight: '700', marginBottom: '1rem' }}>Products</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button onClick={() => navigate('/p2p-marketplace')} style={{
                background: 'none',
                border: 'none',
                color: '#888',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'color 0.3s ease'
              }} onMouseOver={(e) => e.target.style.color = '#00F0FF'} onMouseOut={(e) => e.target.style.color = '#888'}>
                P2P Marketplace
              </button>
              <button onClick={() => navigate('/p2p/merchant')} style={{
                background: 'none',
                border: 'none',
                color: '#888',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'color 0.3s ease'
              }} onMouseOver={(e) => e.target.style.color = '#00F0FF'} onMouseOut={(e) => e.target.style.color = '#888'}>
                Merchant Center
              </button>
              <button onClick={() => navigate('/referrals')} style={{
                background: 'none',
                border: 'none',
                color: '#888',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'color 0.3s ease'
              }} onMouseOver={(e) => e.target.style.color = '#00F0FF'} onMouseOut={(e) => e.target.style.color = '#888'}>
                Referral Program
              </button>
              <button onClick={() => navigate('/wallet')} style={{
                background: 'none',
                border: 'none',
                color: '#888',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'color 0.3s ease'
              }} onMouseOver={(e) => e.target.style.color = '#00F0FF'} onMouseOut={(e) => e.target.style.color = '#888'}>
                Wallet
              </button>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 style={{ color: '#00F0FF', fontSize: '16px', fontWeight: '700', marginBottom: '1rem' }}>Support</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button onClick={() => navigate('/faq')} style={{
                background: 'none',
                border: 'none',
                color: '#888',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'color 0.3s ease'
              }} onMouseOver={(e) => e.target.style.color = '#00F0FF'} onMouseOut={(e) => e.target.style.color = '#888'}>
                FAQ / Help Center
              </button>
              <a href="mailto:support@coinhubx.com" style={{
                color: '#888',
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'color 0.3s ease'
              }} onMouseOver={(e) => e.target.style.color = '#00F0FF'} onMouseOut={(e) => e.target.style.color = '#888'}>
                Contact Support
              </a>
              <button onClick={() => navigate('/fees')} style={{
                background: 'none',
                border: 'none',
                color: '#888',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'color 0.3s ease'
              }} onMouseOver={(e) => e.target.style.color = '#00F0FF'} onMouseOut={(e) => e.target.style.color = '#888'}>
                Fees & Limits
              </button>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 style={{ color: '#00F0FF', fontSize: '16px', fontWeight: '700', marginBottom: '1rem' }}>Legal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button onClick={() => navigate('/terms')} style={{
                background: 'none',
                border: 'none',
                color: '#888',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'color 0.3s ease'
              }} onMouseOver={(e) => e.target.style.color = '#00F0FF'} onMouseOut={(e) => e.target.style.color = '#888'}>
                Terms of Service
              </button>
              <button onClick={() => navigate('/privacy')} style={{
                background: 'none',
                border: 'none',
                color: '#888',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'color 0.3s ease'
              }} onMouseOver={(e) => e.target.style.color = '#00F0FF'} onMouseOut={(e) => e.target.style.color = '#888'}>
                Privacy Policy
              </button>
              <span style={{ color: '#888', fontSize: '14px' }}>KYC & AML Policy</span>
              <span style={{ color: '#888', fontSize: '14px' }}>Risk Notice</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          borderTop: '1px solid rgba(0, 240, 255, 0.1)',
          paddingTop: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
            © 2024 Coin Hub X. All rights reserved.
          </p>
          <p style={{ color: '#666', fontSize: '12px', margin: 0 }}>
            Cryptocurrency trading involves risk. Trade responsibly.
          </p>
        </div>
      </div>
    </footer>
  );
}
