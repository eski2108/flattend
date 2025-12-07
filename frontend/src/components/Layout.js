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

      {/* Sidebar - Force hide on mobile with inline style */}
      <aside 
        className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`} 
        data-testid="sidebar"
        style={typeof window !== 'undefined' && window.innerWidth <= 1024 && !isMobileMenuOpen ? { display: 'none' } : {}}
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
            {/* 🔥 PREMIUM MOBILE APP DOWNLOAD SECTION - COMPLETELY REDESIGNED */}
            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
              borderTop: '2px solid rgba(0, 240, 255, 0.3)',
              borderBottom: '2px solid rgba(168, 85, 247, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Animated background glow */}
              <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'radial-gradient(circle, rgba(0, 240, 255, 0.1) 0%, transparent 70%)',
                animation: 'pulse 4s ease-in-out infinite',
                pointerEvents: 'none'
              }}></div>
              
              <div style={{ 
                fontSize: '13px', 
                fontWeight: '900', 
                marginBottom: '1rem',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                background: 'linear-gradient(135deg, #00F0FF 0%, #FFD700 50%, #A855F7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                position: 'relative',
                zIndex: 1,
                textShadow: '0 0 30px rgba(0, 240, 255, 0.5)'
              }}>
                📱 GET MOBILE APP
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
                {/* Android Button - PREMIUM VIBRANT */}
                <button
                  onClick={() => window.open('/api/download-app', '_blank')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: 'linear-gradient(135deg, #00F0FF 0%, #00D4E6 50%, #00C4D6 100%)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#000000',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0, 240, 255, 0.3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 240, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 240, 255, 0.3)';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,3H11V11H3V3M13,3H21V11H13V3M3,13H11V21H3V13M18,13H21V16H18V13M13,18H16V21H13V18M16,13H18V18H16V13M18,16H21V21H18V16Z"/>
                  </svg>
                  <span>Android App</span>
                </button>
                
                {/* iPhone Button - PREMIUM VIBRANT */}
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
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: 'linear-gradient(135deg, #FF6B9D 0%, #C084FC 50%, #A855F7 100%)',
                    border: '1px solid rgba(255, 107, 157, 0.3)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(255, 107, 157, 0.3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 157, 0.3)';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
                  </svg>
                  <span>iPhone App</span>
                </button>
              </div>
              
              <div style={{
                marginTop: '0.75rem',
                textAlign: 'center',
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.6)',
                fontWeight: '600',
                letterSpacing: '0.5px',
                position: 'relative',
                zIndex: 1
              }}>
                ⚡ Trade anytime, anywhere
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
        {/* Hide price ticker on spot trading page (it has its own ticker) */}
        {!(location.pathname === '/spot-trading' || location.pathname === '/trading' || 
           location.hash === '#/spot-trading' || location.hash === '#/trading') && <PriceTickerEnhanced />}
        
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