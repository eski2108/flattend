import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import QRCode from 'qrcode';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SimpleDeposit() {
  const { coin } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState(coin?.toUpperCase() || 'BTC');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Always set a user to allow deposit address generation
    const userData = localStorage.getItem('cryptobank_user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      // Use guest user for testing/demo
      setUser({ user_id: 'demo_deposit_user' });
    }
  }, []);

  useEffect(() => {
    if (user && currency) {
      generateAddress();
    }
  }, [user, currency]);

  const generateAddress = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Generating address for:', currency);
      
      const response = await axios.post(`${API}/api/nowpayments/create-deposit`, {
        user_id: user?.user_id || 'demo_deposit_user',
        amount: 50,
        currency: 'gbp',
        pay_currency: currency.toLowerCase()
      }, {
        timeout: 15000 // 15 second timeout
      });

      console.log('API Response:', response.data);

      if (response.data.success && response.data.deposit_address) {
        const addr = response.data.deposit_address || response.data.address || response.data.pay_address;
        setAddress(addr);
        
        // Generate QR code
        const qr = await QRCode.toDataURL(addr);
        setQrCode(qr);
        
        console.log('Address generated successfully:', addr);
        toast.success('Deposit address generated!');
      } else {
        setError(response.data.message || 'Failed to generate address');
        toast.error('Failed to generate address');
      }
    } catch (err) {
      console.error('Error generating address:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to generate address';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      console.log('Loading complete');
    }
  };

  if (loading && !address) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        color: '#fff',
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid rgba(0,240,255,0.2)',
          borderTop: '4px solid #00F0FF',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Generating {currency} Deposit Address...</h2>
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#8FA3C7' }}>Please wait...</div>
      </div>
    );
  }

  if (error && !address) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        color: '#fff',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '20px'
        }}>⚠️</div>
        <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Error</h2>
        <p style={{ color: '#FF6B6B', fontSize: '15px', marginBottom: '24px' }}>{error}</p>
        <button 
          onClick={generateAddress} 
          style={{ 
            padding: '12px 32px', 
            background: 'linear-gradient(135deg, #0FFFCF, #00D4E6)',
            border: 'none',
            borderRadius: '8px',
            color: '#000',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,240,255,0.3)'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: window.innerWidth > 768 ? '40px' : '20px',
      maxWidth: '600px',
      margin: '0 auto',
      background: 'linear-gradient(135deg, #0B1220, #0A1628)',
      borderRadius: '16px',
      marginTop: window.innerWidth > 768 ? '40px' : '20px',
      border: '1px solid rgba(0,255,207,0.2)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
    }}>
      <h1 style={{ 
        color: '#fff', 
        marginBottom: '30px', 
        textAlign: 'center',
        fontSize: window.innerWidth > 768 ? '28px' : '22px',
        fontWeight: '700',
        textShadow: '0 0 20px rgba(0,255,207,0.5)'
      }}>
        Deposit {currency}
      </h1>

      {qrCode && (
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img 
            src={qrCode} 
            alt="QR Code" 
            style={{ 
              width: '200px', 
              height: '200px',
              border: '4px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              background: '#fff',
              padding: '12px'
            }} 
          />
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <label style={{ 
          color: '#8FA3C7', 
          fontSize: '13px', 
          display: 'block', 
          marginBottom: '8px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Deposit Address:
        </label>
        <div style={{
          background: '#07111C',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid rgba(0,255,207,0.3)',
          wordBreak: 'break-all',
          color: '#00F0FF',
          fontSize: '14px',
          fontFamily: 'monospace',
          boxShadow: '0 0 20px rgba(0,255,207,0.1)'
        }}>
          {address}
        </div>
      </div>

      <button
        onClick={() => {
          navigator.clipboard.writeText(address);
          toast.success('Address copied to clipboard!');
        }}
        style={{
          width: '100%',
          padding: '16px',
          background: 'linear-gradient(135deg, #0FFFCF, #00D4E6)',
          border: 'none',
          borderRadius: '8px',
          color: '#000',
          fontSize: '16px',
          fontWeight: '700',
          cursor: 'pointer',
          marginTop: '8px',
          boxShadow: '0 4px 20px rgba(0,255,207,0.4)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,255,207,0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,255,207,0.4)';
        }}
      >
        📋 Copy Address
      </button>

      <div style={{ 
        marginTop: '30px', 
        padding: '16px', 
        background: 'rgba(0,255,207,0.08)', 
        borderRadius: '8px',
        border: '1px solid rgba(0,255,207,0.2)'
      }}>
        <h3 style={{ 
          color: '#0FFFCF', 
          fontSize: '14px', 
          marginBottom: '12px',
          fontWeight: '700'
        }}>📝 Instructions:</h3>
        <ol style={{ 
          color: '#8FA3C7', 
          fontSize: '13px', 
          paddingLeft: '20px',
          lineHeight: '1.6'
        }}>
          <li>Copy the address above or scan the QR code</li>
          <li>Send {currency} to this address from your external wallet</li>
          <li>Your deposit will appear after network confirmation (typically 1-3 confirmations)</li>
          <li>Minimum deposit: 0.0001 {currency}</li>
        </ol>
      </div>

      <button
        onClick={() => navigate('/wallet')}
        style={{
          width: '100%',
          padding: '12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          color: '#8FA3C7',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          marginTop: '16px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.color = '#8FA3C7';
        }}
      >
        ← Back to Wallet
      </button>
    </div>
  );
}

// Add spinner animation
const style = document.createElement('style');
style.textContent = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;
document.head.appendChild(style);
