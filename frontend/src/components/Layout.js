/**
 * 🔒 LOCKED FILE - DO NOT MODIFY WITHOUT EXPLICIT APPROVAL 🔒
 * 
 * File: Layout.js
 * Purpose: Main layout wrapper with sidebar and mobile responsiveness
 * Lock Date: December 7, 2024
 * Version: v1.0-LOCKED-PERMANENT
 * 
 * PROTECTED ELEMENTS:
 * - Line 104-110: Sidebar with mobile hide logic
 * - Inline style with window.innerWidth check
 * - Line 350: PriceTickerEnhanced conditional rendering
 * 
 * CRITICAL MOBILE FIX:
 * The sidebar MUST be hidden on mobile (width <= 1024px) to prevent
 * duplicate trading pair labels appearing on the right side of the screen.
 * 
 * NEVER MODIFY:
 * - Sidebar hide logic: style={typeof window !== 'undefined' && window.innerWidth <= 1024 && !isMobileMenuOpen ? { display: 'none' } : {}}
 * - Window width threshold (1024px)
 * - Mobile menu toggle behavior
 * 
 * See /app/LOCKED_BUILD.md for complete documentation
 */

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
    { path: '/profile', label: 'Profile', icon: IoGrid },
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginRight: '12px' }}>
            <LanguageSwitcher style={{ marginRight: '6px' }} />
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

      {/* Sidebar - Mobile visibility controlled by CSS classes */}
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
            {/* MOBILE APP SECTION - COMPACT */}
            <div style={{
              padding: '0.5rem',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08), rgba(168, 85, 247, 0.08))',
              borderTop: '1px solid rgba(0, 240, 255, 0.2)',
              borderBottom: '1px solid rgba(168, 85, 247, 0.2)',
              marginBottom: '0.5rem'
            }}>
              <div style={{ 
                fontSize: '10px', 
                fontWeight: '700', 
                marginBottom: '0.4rem',
                textAlign: 'center',
                color: '#00F0FF',
                letterSpacing: '0.5px'
              }}>
                📱 GET APP
              </div>
              
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={() => window.open('/api/download-app', '_blank')}
                  style={{
                    flex: 1,
                    padding: '0.35rem',
                    background: 'linear-gradient(135deg, #00F0FF, #00D4E6)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '9px',
                    fontWeight: '600',
                    color: '#000',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 0 25px rgba(0, 240, 255, 0.8), 0 0 50px rgba(0, 240, 255, 0.6), 0 0 75px rgba(0, 240, 255, 0.4), 0 4px 20px rgba(0, 0, 0, 0.4)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 35px rgba(0, 240, 255, 1), 0 0 60px rgba(0, 240, 255, 0.8), 0 0 90px rgba(0, 240, 255, 0.6), 0 4px 25px rgba(0, 0, 0, 0.5)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 240, 255, 0.8), 0 0 50px rgba(0, 240, 255, 0.6), 0 0 75px rgba(0, 240, 255, 0.4), 0 4px 20px rgba(0, 0, 0, 0.4)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  Android
                </button>
                
                <button
                  onClick={() => {
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                    if (isIOS) {
                      alert('📱 Install on iPhone:\n\n1. Tap Share button (bottom)\n2. Tap "Add to Home Screen"\n3. Tap "Add"\n\n✨ Instant access from your home screen!');
                    } else {
                      window.open(process.env.REACT_APP_FRONTEND_URL || window.location.origin, '_blank');
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.35rem',
                    background: 'linear-gradient(135deg, #FF6B9D, #A855F7)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '9px',
                    fontWeight: '600',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 0 25px rgba(168, 85, 247, 0.8), 0 0 50px rgba(255, 107, 157, 0.6), 0 0 75px rgba(168, 85, 247, 0.4), 0 4px 20px rgba(0, 0, 0, 0.4)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 35px rgba(168, 85, 247, 1), 0 0 60px rgba(255, 107, 157, 0.8), 0 0 90px rgba(168, 85, 247, 0.6), 0 4px 25px rgba(0, 0, 0, 0.5)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(168, 85, 247, 0.8), 0 0 50px rgba(255, 107, 157, 0.6), 0 0 75px rgba(168, 85, 247, 0.4), 0 4px 20px rgba(0, 0, 0, 0.4)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
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
        {/* Show price ticker - hide only on admin dispute pages */}
        {!location.pathname.startsWith('/admin/disputes') && <PriceTickerEnhanced />}
        
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