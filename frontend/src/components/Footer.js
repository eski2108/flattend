import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoFlash, IoLogoGithub as Github, IoLogoTwitter as Twitter, IoMail } from 'react-icons/io5';

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
              <IoFlash size={28} color="#00F0FF" />
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
                <IoMail size={18} color="#00F0FF" />
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

          {/* Mobile App Download */}
          <div>
            <h4 style={{ color: '#00F0FF', fontSize: '16px', fontWeight: '700', marginBottom: '1rem' }}>Mobile App</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                onClick={() => window.open('/api/download-app', '_blank')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(0, 240, 255, 0.05))',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  color: '#00F0FF',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(0, 240, 255, 0.1))';
                  e.target.style.borderColor = '#00F0FF';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(0, 240, 255, 0.05))';
                  e.target.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="m22 2-5 10-5-4-5 10"/>
                </svg>
                Android APK
              </button>
              
              <button 
                onClick={() => {
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                  if (isIOS) {
                    alert('To install on iPhone:\n\n1. Tap Share button\n2. Tap "Add to Home Screen"\n3. Tap "Add"');
                  } else {
                    window.open(process.env.REACT_APP_FRONTEND_URL || window.location.origin, '_blank');
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(168, 85, 247, 0.05))',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  color: '#A855F7',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(168, 85, 247, 0.1))';
                  e.target.style.borderColor = '#A855F7';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(168, 85, 247, 0.05))';
                  e.target.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                  <line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
                iPhone PWA
              </button>
            </div>
          </div>
        </div>

        {/* Supported Cryptocurrencies */}
        <div style={{
          borderTop: '1px solid rgba(0, 240, 255, 0.1)',
          paddingTop: '2rem',
          marginBottom: '2rem'
        }}>
          <h4 style={{ color: '#00F0FF', fontSize: '14px', fontWeight: '700', marginBottom: '1rem', textAlign: 'center' }}>
            SUPPORTED CRYPTOCURRENCIES
          </h4>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1.5rem'
          }}>
            {['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'MATIC', 'LTC', 'LINK', 'AVAX'].map(coin => (
              <div key={coin} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: 0.8,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(145deg, #2a2f45, #1a1f35)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.3), 0 0 12px rgba(0,229,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px'
                }}>
                  <img 
                    src={`/crypto-logos/${coin.toLowerCase()}.png`}
                    alt={coin}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.4)) drop-shadow(0 0 6px rgba(0,255,200,0.12))',
                      borderRadius: '50%'
                    }}
                  />
                </div>
                <span style={{ color: '#888', fontSize: '11px', fontWeight: '600' }}>{coin}</span>
              </div>
            ))}
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
