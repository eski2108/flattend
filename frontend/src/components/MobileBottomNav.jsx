import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// SVG Icons - Lucide style, clean and modern
const WalletIcon = ({ active }) => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={active ? '#00F0FF' : '#6B7280'}
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{ transition: 'all 0.2s ease', filter: active ? 'drop-shadow(0 0 6px rgba(0, 240, 255, 0.6))' : 'none' }}
  >
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);

const SavingsIcon = ({ active }) => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={active ? '#00F0FF' : '#6B7280'}
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{ transition: 'all 0.2s ease', filter: active ? 'drop-shadow(0 0 6px rgba(0, 240, 255, 0.6))' : 'none' }}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 9V6" />
    <path d="M12 18v-3" />
    <path d="M9 12H6" />
    <path d="M18 12h-3" />
  </svg>
);

const SettingsIcon = ({ active }) => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={active ? '#00F0FF' : '#6B7280'}
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{ transition: 'all 0.2s ease', filter: active ? 'drop-shadow(0 0 6px rgba(0, 240, 255, 0.6))' : 'none' }}
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/wallet')) return 'wallet';
    if (path.startsWith('/savings')) return 'savings';
    if (path.startsWith('/settings')) return 'settings';
    return null;
  };
  
  const activeTab = getActiveTab();
  
  const tabs = [
    { id: 'wallet', label: 'Wallet', path: '/wallet', Icon: WalletIcon },
    { id: 'savings', label: 'Savings', path: '/savings', Icon: SavingsIcon },
    { id: 'settings', label: 'Settings', path: '/settings', Icon: SettingsIcon },
  ];
  
  const navStyles = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70px',
    background: 'linear-gradient(180deg, rgba(10, 15, 30, 0.98) 0%, rgba(5, 10, 20, 1) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: '1px solid rgba(0, 240, 255, 0.2)',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '0 16px',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    zIndex: 99999,
    boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.6)',
  };
  
  const tabBtnStyles = (isActive) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    minWidth: '70px',
    minHeight: '54px',
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
  });
  
  const iconWrapperStyles = (isActive) => ({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    transition: 'all 0.2s ease',
    background: isActive ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
    transform: isActive ? 'scale(1.05)' : 'scale(1)',
  });
  
  const labelStyles = (isActive) => ({
    fontSize: '11px',
    fontWeight: isActive ? 600 : 500,
    color: isActive ? '#00F0FF' : '#6B7280',
    transition: 'all 0.2s ease',
    letterSpacing: '0.3px',
    textShadow: isActive ? '0 0 8px rgba(0, 240, 255, 0.5)' : 'none',
  });
  
  const indicatorStyles = {
    position: 'absolute',
    bottom: '4px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '24px',
    height: '3px',
    background: 'linear-gradient(90deg, #00F0FF, #7A3CFF)',
    borderRadius: '2px',
    boxShadow: '0 0 10px rgba(0, 240, 255, 0.6)',
  };

  const glowStyles = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '32px',
    height: '32px',
    background: 'radial-gradient(circle, rgba(0, 240, 255, 0.4) 0%, transparent 70%)',
    borderRadius: '50%',
    filter: 'blur(8px)',
    zIndex: -1,
  };
  
  return (
    <nav style={navStyles}>
      {tabs.map(({ id, label, path, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            style={tabBtnStyles(isActive)}
            onClick={() => navigate(path)}
            aria-label={label}
          >
            <div style={iconWrapperStyles(isActive)}>
              <Icon active={isActive} />
              {isActive && <div style={glowStyles} />}
            </div>
            <span style={labelStyles(isActive)}>{label}</span>
            {isActive && <div style={indicatorStyles} />}
          </button>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
