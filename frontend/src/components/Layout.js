import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { IoBag, IoBarChart, IoCard, IoCash, IoChatbubbles, IoClose, IoDocument, IoFlash, IoGift, IoGrid, IoLogOut, IoMenu, IoNavigate, IoPieChart, IoTrendingDown, IoTrendingUp, IoWallet } from 'react-icons/io5';
import Logo from '@/components/Logo';
import PriceTickerEnhanced from '@/components/PriceTickerEnhanced';
import ExpressBuyModal from '@/components/ExpressBuyModal';
import NotificationBell from '@/components/NotificationBell';
import PromoBanner from '@/components/PromoBanner';
import ChatWidget from '@/components/ChatWidget';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import PremiumDownloadButtons from '@/components/PremiumDownloadButtons';

export default function Layout({ children }) {
  const { user, disconnectWallet } = useWallet();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showExpressBuy, setShowExpressBuy] = useState(false);

  // Filter out Instant Buy from nav when on trading page to avoid confusion
  const allNavItems = [
    { path: '/dashboard', label: t('nav.dashboard'), icon: IoPieChart },
    { path: '/wallet', label: t('nav.wallet'), icon: IoCash },
    { path: '/savings', label: t('nav.savings'), icon: IoWallet, highlight: true },
    { path: '/allocations', label: t('nav.allocations'), icon: IoNavigate, highlight: true },
    { path: '/instant-buy', label: t('nav.instant_buy'), icon: IoFlash, hideOnPaths: ['/trading'] },
    { path: '/p2p-express', label: t('nav.p2p_express'), icon: IoTrendingUp },
    { path: '/p2p-marketplace', label: t('nav.p2p_marketplace'), icon: IoBag },
    { path: '/trading', label: t('nav.trading'), icon: IoBarChart },
    { path: '/swap-crypto', label: t('nav.swap'), icon: IoFlash },
    { path: '/referrals', label: t('nav.referrals'), icon: IoGift },
    { path: '/my-orders', label: t('nav.transaction_history'), icon: IoDocument },
    { path: '/settings', label: t('nav.settings'), icon: IoCard }
  ];
  
  const navItems = allNavItems.filter(item => 
    !item.hideOnPaths || !item.hideOnPaths.includes(location.pathname)
  );

  const handleSupportClick = () => {
    const userId = user?.user_id || user?.id || 'unknown';
    const currentPage = location.pathname;
    const supportUrl = `mailto:support@coinhubx.com?subject=Support Request&body=User ID: ${userId}%0ACurrent Page: ${currentPage}%0A%0ADescribe your issue:`;
    window.location.href = supportUrl;
  };

  const handleDisconnect = () => {
    disconnectWallet();
    navigate('/');
  };

  const handleNavClick = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="layout" data-testid="layout">
      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="mobile-header-content">
          <div 
            className="mobile-logo" 
            onClick={() => navigate('/dashboard')}
            style={{
              height: '54px',
              padding: '10px',
              marginLeft: '18px',
              display: 'flex',
              alignItems: 'center',
              filter: 'drop-shadow(0 0 14px rgba(0, 198, 255, 0.8))'
            }}
          >
            <Logo size={48} showText={false} style={{ height: '48px', width: 'auto' }} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <LanguageSwitcher />
            <NotificationBell />
            <button
              className="mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {isMobileMenuOpen ? <IoClose size={24} /> : <IoMenu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-menu-overlay" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`} 
        data-testid="sidebar"
      >
          <div className="sidebar-header">
            <div className="sidebar-logo" data-testid="sidebar-logo">
              <Logo size={36} showText={true} />
            </div>
          </div>

          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`nav-item ${item.highlight ? 'nav-item-highlight' : ''} ${isActive ? 'active' : ''}`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  style={{
                    background: item.highlight && isActive
                      ? 'linear-gradient(135deg, #16A34A, #15803D)' 
                      : item.highlight 
                      ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                      : undefined,
                    color: item.highlight ? '#fff' : undefined,
                    fontWeight: item.highlight ? '700' : undefined
                  }}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="sidebar-footer" style={{ 
            marginTop: 'auto', 
            padding: '1rem',
            borderTop: '1px solid rgba(0, 240, 255, 0.2)'
          }}>
            {/* Mobile App Download - Compact Sidebar Version */}
            <div style={{ 
              marginBottom: '1rem',
              padding: '1rem 0.5rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#00F0FF', 
                fontWeight: '700', 
                marginBottom: '0.75rem',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                📱 Mobile App
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  onClick={() => window.open('/api/download-app', '_blank')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    background: 'linear-gradient(135deg, #00F0FF, #00D4E6)',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 240, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="m22 2-5 10-5-4-5 10"/>
                  </svg>
                  Android
                </button>
                <button
                  onClick={() => {
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                    if (isIOS) {
                      alert('To install on iPhone:\n\n1. Tap Share button\n2. Tap "Add to Home Screen"\n3. Tap "Add"');
                    } else {
                      window.open('https://coinfix.preview.emergentagent.com', '_blank');
                    }
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    background: 'linear-gradient(135deg, #A855F7, #8B5CF6)',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                    <line x1="12" y1="18" x2="12.01" y2="18"/>
                  </svg>
                  iPhone
                </button>
              </div>
            </div>

            <button
              onClick={handleSupportClick}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.9375rem',
                fontWeight: '600',
                color: '#000',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                marginBottom: '0.75rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 240, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <IoChatbubbles size={18} />
              <span>{t('nav.support')}</span>
            </button>
            <button
              onClick={handleDisconnect}
              data-testid="disconnect-btn"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.9375rem',
                fontWeight: '600',
                color: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <IoLogOut size={18} />
              <span>{t('auth.logout')}</span>
            </button>
          </div>
        </aside>

      {/* Main Content */}
      <main className="main-content" data-testid="main-content">
        <PriceTickerEnhanced />
        
        <PromoBanner />
        
        {/* Express Buy Modal */}
        <ExpressBuyModal 
          isOpen={showExpressBuy}
          onClose={() => setShowExpressBuy(false)}
        />
        
        {children}
      </main>

      {/* AI + Live Chat Widget */}
      <ChatWidget />
    </div>
  );
}