import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function EmailDisputeEntry() {
  const { disputeId } = useParams();
  
  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('cryptobank_user');
    
    if (user) {
      // User is logged in - hard redirect to dispute page
      window.location.replace(`/admin/disputes/${disputeId}`);
    } else {
      // User is not logged in - redirect to login with return URL
      window.location.replace(`/login?return=/admin/disputes/${disputeId}`);
    }
  }, [disputeId]);
  
  // Show nothing while redirecting
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
