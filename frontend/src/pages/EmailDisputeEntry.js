import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

export default function EmailDisputeEntry() {
  const { disputeId } = useParams();
  const [showTelegramPrompt, setShowTelegramPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  useEffect(() => {
    // Detect Telegram in-app browser (Android + iOS + generic WebView)
    const ua = navigator.userAgent || '';
    const isTelegram = /Telegram/i.test(ua) || 
                       /TelegramBot/i.test(ua) ||
                       (ua.includes('Mobile') && ua.includes('WebView')) ||
                       (window.TelegramWebviewProxy !== undefined);
    
    // Also detect generic in-app browsers
    const isInAppBrowser = /FBAN|FBAV|Instagram|Twitter|Line|WhatsApp|Snapchat/i.test(ua) ||
                           (ua.includes('wv') && ua.includes('Android'));
    
    // Detect iOS
    const iosDevice = /iPhone|iPad|iPod/i.test(ua);
    setIsIOS(iosDevice);
    
    // Check if user is logged in
    const user = localStorage.getItem('cryptobank_user');
    
    if (isTelegram || isInAppBrowser) {
      // Show prompt to open in external browser
      setShowTelegramPrompt(true);
    } else if (user) {
      // User is logged in and not in Telegram - go directly to dispute
      window.location.replace(`/admin/disputes/${disputeId}`);
    } else {
      // User is not logged in - redirect to login with return URL
      window.location.replace(`/login?return=/admin/disputes/${disputeId}`);
    }
  }, [disputeId]);
  
  const getFullUrl = () => {
    return `${window.location.origin}/admin/disputes/${disputeId}`;
  };
  
  const copyLink = () => {
    navigator.clipboard.writeText(getFullUrl());
    toast.success('Link copied! Paste in your browser');
  };
  
  const openInChrome = () => {
    const url = getFullUrl();
    // Try Android intent for Chrome
    const chromeIntent = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = chromeIntent;
    
    // Fallback - copy link after delay
    setTimeout(() => {
      copyLink();
    }, 1000);
  };
  
  const openInSafari = () => {
    const url = getFullUrl();
    // iOS Safari - try x-safari scheme
    window.location.href = `x-safari-${url}`;
    
    // Fallback - copy link
    setTimeout(() => {
      copyLink();
    }, 500);
  };
  
  const openExternal = () => {
    const url = getFullUrl();
    // Try to open in default browser
    window.open(url, '_system');
    
    // Also copy as fallback
    setTimeout(() => {
      copyLink();
    }, 500);
  };

  // Show Telegram/In-App Browser Prompt
  if (showTelegramPrompt) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #0A1929 0%, #1a1a2e 50%, #0A1929 100%)',
        color: '#fff',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Arial, sans-serif',
        padding: '20px'
      }}>
        <div style={{
          background: '#111827',
          borderRadius: '16px',
          padding: '30px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          border: '2px solid #F59E0B',
          boxShadow: '0 0 30px rgba(245, 158, 11, 0.3)'
        }}>
          {/* Warning Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #F59E0B 0%, #DC2626 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '40px'
          }}>
            ⚠️
          </div>
          
          <h1 style={{
            color: '#F59E0B',
            fontSize: '22px',
            fontWeight: 'bold',
            marginBottom: '15px'
          }}>
            Open in Browser
          </h1>
          
          <p style={{
            color: '#9CA3AF',
            fontSize: '15px',
            lineHeight: '1.6',
            marginBottom: '25px'
          }}>
            You're viewing this inside <strong style={{color: '#fff'}}>Telegram</strong>.<br/>
            Please open in {isIOS ? 'Safari' : 'Chrome'} to continue.
          </p>
          
          {/* Dispute Info */}
          <div style={{
            background: '#1F2937',
            borderRadius: '10px',
            padding: '15px',
            marginBottom: '25px',
            border: '1px solid #374151'
          }}>
            <p style={{ color: '#6B7280', fontSize: '12px', marginBottom: '5px' }}>Dispute ID</p>
            <p style={{ color: '#F59E0B', fontSize: '14px', fontWeight: 'bold', wordBreak: 'break-all' }}>
              {disputeId}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {isIOS ? (
              <button
                onClick={openInSafari}
                style={{
                  background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '16px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                🧭 Open in Safari
              </button>
            ) : (
              <button
                onClick={openInChrome}
                style={{
                  background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '16px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                🌐 Open in Chrome
              </button>
            )}
            
            <button
              onClick={copyLink}
              style={{
                background: 'transparent',
                color: '#9CA3AF',
                border: '2px solid #374151',
                borderRadius: '10px',
                padding: '14px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              📋 Copy Link
            </button>
            
            <button
              onClick={() => {
                setShowTelegramPrompt(false);
                const user = localStorage.getItem('cryptobank_user');
                if (user) {
                  window.location.replace(`/admin/disputes/${disputeId}`);
                } else {
                  window.location.replace(`/login?return=/admin/disputes/${disputeId}`);
                }
              }}
              style={{
                background: 'transparent',
                color: '#6B7280',
                border: 'none',
                padding: '10px',
                fontSize: '13px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Continue anyway (may not work)
            </button>
          </div>
          
          {/* Instructions */}
          <div style={{
            marginTop: '25px',
            padding: '15px',
            background: '#1F2937',
            borderRadius: '10px',
            textAlign: 'left'
          }}>
            <p style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '10px' }}>
              <strong style={{color: '#fff'}}>Alternative:</strong> Tap the ⋮ menu at the top right and select "Open in {isIOS ? 'Safari' : 'Chrome'}"
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Default loading state while redirecting
  return (
    <div style={{
      background: '#0A1929',
      color: '#fff',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(255,165,0,0.3)',
          borderTop: '3px solid #FFA500',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <p>Opening dispute...</p>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
