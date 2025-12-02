import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { IoBag, IoBarChart, IoCard, IoCash, IoChatbubbles, IoClose, IoDocument, IoFlash, IoGift, IoGrid, IoLogOut, IoMenu, IoNavigate, IoPieChart, IoTrendingDown, IoTrendingUp, IoWallet } from 'react-icons/io5';
import Logo from '@/components/Logo';
import PriceTickerEnhanced from '@/components/PriceTickerEnhanced';
import ExpressBuyModal from '@/components/ExpressBuyModal';
import NotificationBell from '@/components/NotificationBell';
import PromoBanner from '@/components/PromoBanner';
import ChatWidget from '@/components/ChatWidget';

export default function Layout({ children }) {
  const { user, disconnectWallet } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showExpressBuy, setShowExpressBuy] = useState(false);

  // Filter out Instant Buy from nav when on trading page to avoid confusion
  const allNavItems = [
    { path: '/dashboard', label: 'Portfolio', icon: IoPieChart },
    { path: '/wallet', label: 'Wallet', icon: IoCash },
    { path: '/savings', label: 'Savings Vault', icon: IoWallet, highlight: true },
    { path: '/allocations', label: 'Allocations', icon: IoNavigate, highlight: true },
    { path: '/instant-buy', label: 'Instant Buy', icon: IoFlash, hideOnPaths: ['/trading'] },
    { path: '/p2p-express', label: 'P2P Express', icon: IoTrendingUp },
    { path: '/p2p-marketplace', label: 'P2P Marketplace', icon: IoBag },
    { path: '/trading', label: 'Trading', icon: IoBarChart },
    { path: '/swap-crypto', label: 'Swap Crypto', icon: IoFlash },
    { path: '/referrals', label: 'Referrals', icon: IoGift },
    { path: '/my-orders', label: 'Transaction History', icon: IoDocument },
    { path: '/settings', label: 'Settings', icon: IoCard }
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
              <span>Support / Chat</span>
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
              <span>Logout</span>
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