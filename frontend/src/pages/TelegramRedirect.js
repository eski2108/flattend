import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

/**
 * TelegramRedirect - Handles Telegram WebView session issues
 * 
 * When users click links in Telegram, they open in Telegram's in-app browser
 * which doesn't share cookies/session with their main browser.
 * 
 * This page detects this and offers to open in their default browser.
 */
const TelegramRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isWebView, setIsWebView] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  
  useEffect(() => {
    const to = searchParams.get('to') || '/';
    const fullUrl = `${window.location.origin}${to}`;
    setTargetUrl(fullUrl);
    
    // Detect Telegram WebView
    const ua = navigator.userAgent || '';
    const isTelegramWebView = ua.includes('Telegram') || 
                               ua.includes('TelegramBot') ||
                               window.TelegramWebviewProxy !== undefined;
    
    // Also check if we have a valid session
    const hasSession = localStorage.getItem('token') || 
                       sessionStorage.getItem('token');
    
    if (isTelegramWebView || !hasSession) {
      setIsWebView(true);
    } else {
      // Has session and not in WebView - redirect directly
      navigate(to, { replace: true });
    }
  }, [searchParams, navigate]);
  
  const handleOpenInBrowser = () => {
    // Try multiple methods to open in external browser
    
    // Method 1: Use intent for Android
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      window.location.href = `intent://${targetUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      return;
    }
    
    // Method 2: For iOS, just open the URL (will prompt to open in Safari)
    // Method 3: Generic - open in new tab
    window.open(targetUrl, '_blank');
  };
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      alert('Link copied! Paste it in Chrome or Safari.');
    } catch (err) {
      // Fallback for WebView
      const textArea = document.createElement('textarea');
      textArea.value = targetUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Link copied! Paste it in Chrome or Safari.');
    }
  };
  
  if (!isWebView) {
    return (
      <div style={styles.container}>
        <div style={styles.spinner}></div>
        <p>Redirecting...</p>
      </div>
    );
  }
  
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>🔐</div>
        <h1 style={styles.title}>Open in Browser</h1>
        <p style={styles.subtitle}>
          For security, please open this link in Chrome or Safari to access your CoinHubX account.
        </p>
        
        <button style={styles.primaryButton} onClick={handleOpenInBrowser}>
          🌐 Open in Browser
        </button>
        
        <button style={styles.secondaryButton} onClick={handleCopyLink}>
          📋 Copy Link
        </button>
        
        <p style={styles.hint}>
          Telegram's in-app browser cannot access your logged-in session.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
    padding: '20px',
  },
  card: {
    background: 'rgba(30, 30, 50, 0.9)',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
    border: '1px solid rgba(0, 229, 255, 0.2)',
    boxShadow: '0 0 40px rgba(0, 229, 255, 0.1)',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  title: {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '12px',
  },
  subtitle: {
    color: '#a0a0a0',
    fontSize: '14px',
    lineHeight: '1.6',
    marginBottom: '30px',
  },
  primaryButton: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#000',
    background: 'linear-gradient(135deg, #00E5FF, #00F0FF)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    marginBottom: '12px',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  secondaryButton: {
    width: '100%',
    padding: '14px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#00E5FF',
    background: 'transparent',
    border: '1px solid rgba(0, 229, 255, 0.3)',
    borderRadius: '12px',
    cursor: 'pointer',
    marginBottom: '20px',
  },
  hint: {
    color: '#666',
    fontSize: '12px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(0, 229, 255, 0.2)',
    borderTop: '3px solid #00E5FF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

export default TelegramRedirect;
