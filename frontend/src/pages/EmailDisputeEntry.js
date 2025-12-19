import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

export default function EmailDisputeEntry() {
  const { disputeId } = useParams();
  const [showPrompt, setShowPrompt] = useState(true); // ALWAYS show prompt first
  const [isIOS, setIsIOS] = useState(false);
  
  useEffect(() => {
    const ua = navigator.userAgent || '';
    setIsIOS(/iPhone|iPad|iPod/i.test(ua));
  }, []);
  
  const getFullUrl = () => {
    return `${window.location.origin}/admin/disputes/${disputeId}`;
  };
  
  const copyLink = () => {
    const url = getFullUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    } else {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    alert('Link copied! Paste in Chrome or Safari.');
  };
  
  const continueInApp = () => {
    const user = localStorage.getItem('cryptobank_user');
    if (user) {
      window.location.href = `/admin/disputes/${disputeId}`;
    } else {
      window.location.href = `/login?return=/admin/disputes/${disputeId}`;
    }
  };

  return (
    <div style={{
      background: '#0A1628',
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
        maxWidth: '380px',
        width: '100%',
        textAlign: 'center',
        border: '2px solid #F59E0B'
      }}>
        <div style={{
          width: '70px',
          height: '70px',
          background: '#F59E0B',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '35px'
        }}>
          ⚠️
        </div>
        
        <h1 style={{ color: '#F59E0B', fontSize: '20px', marginBottom: '15px' }}>
          Open in Browser
        </h1>
        
        <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '20px' }}>
          For best experience, open this link in {isIOS ? 'Safari' : 'Chrome'}.
        </p>
        
        <div style={{
          background: '#1F2937',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px'
        }}>
          <p style={{ color: '#6B7280', fontSize: '11px', marginBottom: '5px' }}>Dispute ID</p>
          <p style={{ color: '#F59E0B', fontSize: '13px', fontWeight: 'bold' }}>{disputeId}</p>
        </div>
        
        <button
          onClick={copyLink}
          style={{
            width: '100%',
            background: '#22C55E',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginBottom: '12px'
          }}
        >
          📋 COPY LINK
        </button>
        
        <button
          onClick={continueInApp}
          style={{
            width: '100%',
            background: 'transparent',
            color: '#9CA3AF',
            border: '1px solid #374151',
            borderRadius: '10px',
            padding: '14px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Continue here anyway
        </button>
        
        <p style={{ color: '#6B7280', fontSize: '11px', marginTop: '20px' }}>
          Tap "Copy Link" then paste in {isIOS ? 'Safari' : 'Chrome'}
        </p>
      </div>
    </div>
  );
}
