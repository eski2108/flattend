import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './MobileBottomNav.css';

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
    className={`nav-icon ${active ? 'active' : ''}`}
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
    className={`nav-icon ${active ? 'active' : ''}`}
  >
    {/* Vault/Safe icon */}
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
    className={`nav-icon ${active ? 'active' : ''}`}
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine active tab based on current route
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
  
  return (
    <nav className="mobile-bottom-nav-container">
      {tabs.map(({ id, label, path, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            className={`nav-tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => navigate(path)}
            aria-label={label}
          >
            <div className={`icon-wrapper ${isActive ? 'active' : ''}`}>
              <Icon active={isActive} />
              {isActive && <div className="glow-effect" />}
            </div>
            <span className={`tab-label ${isActive ? 'active' : ''}`}>{label}</span>
            {isActive && <div className="active-indicator" />}
          </button>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
