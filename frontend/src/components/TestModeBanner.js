import React, { useState, useEffect } from 'react';
import { IoWarning, IoClose } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

export default function TestModeBanner() {
  const [testMode, setTestMode] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkTestMode = async () => {
    try {
      const response = await fetch(`${API}/api/system/test-mode`);
      const data = await response.json();
      setTestMode(data.test_mode || false);
    } catch (error) {
      console.error('Failed to check test mode:', error);
    }
  };

  useEffect(() => {
    checkTestMode();
    const dismissedSession = sessionStorage.getItem('test_mode_dismissed');
    if (dismissedSession) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('test_mode_dismissed', 'true');
  };

  if (!testMode || dismissed) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(90deg, #EF4444, #DC2626)',
      color: '#FFFFFF',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      zIndex: 9999,
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.5)',
      animation: 'pulse 2s infinite'
    }}>
      <IoWarning size={24} />
      <span style={{ fontWeight: '700', fontSize: '16px' }}>
        ⚠️ TEST MODE ACTIVE - This is a testing environment. No real transactions will occur.
      </span>
      <button
        onClick={handleDismiss}
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          borderRadius: '6px',
          padding: '6px 12px',
          color: '#FFFFFF',
          cursor: 'pointer',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <IoClose size={16} />
        Dismiss
      </button>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
