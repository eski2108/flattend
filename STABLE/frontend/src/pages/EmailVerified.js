import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const EmailVerified = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        const response = await axios.get(`${API}/auth/verify-email?token=${token}`);
        
        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.message);
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.detail || 'Verification failed');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000D1A 0%, #1a1f3a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(26, 31, 58, 0.8)',
        border: '2px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '20px',
        padding: '3rem',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center'
      }}>
        {status === 'verifying' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>⏳</div>
            <h1 style={{ color: '#00F0FF', marginBottom: '1rem' }}>Verifying...</h1>
            <p style={{ color: '#888' }}>Please wait while we verify your email address</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>✅</div>
            <h1 style={{ color: '#22C55E', marginBottom: '1rem' }}>Email Verified!</h1>
            <p style={{ color: '#fff', marginBottom: '1rem' }}>{message}</p>
            <p style={{ color: '#888' }}>Redirecting to login...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>❌</div>
            <h1 style={{ color: '#EF4444', marginBottom: '1rem' }}>Verification Failed</h1>
            <p style={{ color: '#fff', marginBottom: '2rem' }}>{message}</p>
            <button
              onClick={() => navigate('/register')}
              style={{
                background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                color: '#000',
                padding: '1rem 2rem',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Go to Register
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailVerified;
