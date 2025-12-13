import React, { useState, useEffect } from 'react';
import { IoClose, IoShield, IoCheckmarkCircle, IoCopy } from 'react-icons/io5';
import { toast } from 'sonner';
import axios from 'axios';
import QRCode from 'qrcode';

const API = process.env.REACT_APP_BACKEND_URL;

const TwoFactorSettings = ({ user, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.two_factor_enabled || false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    if (showSetup && !qrCodeUrl) {
      generateQRCode();
    }
  }, [showSetup]);

  const generateQRCode = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/api/auth/2fa/generate`,
        { user_id: user.user_id },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSecret(response.data.secret);
        const qr = await QRCode.toDataURL(response.data.qr_uri);
        setQrCodeUrl(qr);
      }
    } catch (error) {
      toast.error('Failed to generate 2FA code');
    }
  };

  const handleEnable2FA = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/api/auth/2fa/enable`,
        {
          user_id: user.user_id,
          token: verificationCode
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('✅ 2FA enabled successfully!');
        setTwoFactorEnabled(true);
        setShowSetup(false);
        
        const updatedUser = { ...user, two_factor_enabled: true };
        localStorage.setItem('cryptobank_user', JSON.stringify(updatedUser));
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to enable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/api/auth/2fa/disable`,
        { user_id: user.user_id },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('2FA disabled');
        setTwoFactorEnabled(false);
        
        const updatedUser = { ...user, two_factor_enabled: false };
        localStorage.setItem('cryptobank_user', JSON.stringify(updatedUser));
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      toast.error('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast.success('Secret copied to clipboard!');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px',
      overflow: 'auto'
    }}>
      <div style={{
        background: '#1a1f3a',
        border: '2px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '20px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 0 40px rgba(0, 240, 255, 0.3)',
        margin: 'auto'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '800',
            color: '#FFFFFF',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <IoShield size={28} color="#00F0FF" />
            Two-Factor Authentication
          </h2>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: '#aaa',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <IoClose size={28} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {!showSetup && !twoFactorEnabled && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(0, 240, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <IoShield size={40} color="#00F0FF" />
              </div>
              <h3 style={{ color: '#FFFFFF', fontSize: '20px', marginBottom: '12px' }}>
                Enable Two-Factor Authentication
              </h3>
              <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '32px', lineHeight: '1.6' }}>
                Add an extra layer of security to your account by enabling 2FA.
              </p>
              <button
                onClick={() => setShowSetup(true)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #00F0FF, #0099CC)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#000',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Set Up 2FA
              </button>
            </div>
          )}

          {showSetup && !twoFactorEnabled && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" style={{ width: '200px', height: '200px', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '12px' }} />}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#aaa', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                  Manual Entry Code
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '8px'
                }}>
                  <code style={{ flex: 1, color: '#00F0FF', fontSize: '13px', wordBreak: 'break-all' }}>
                    {secret}
                  </code>
                  <button onClick={copySecret} style={{ background: 'none', border: 'none', color: '#00F0FF', cursor: 'pointer', padding: '4px' }}>
                    <IoCopy size={20} />
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '700', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>
                  Verification Code
                </label>
                <input
                  type="text"
                  maxLength="6"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Enter 6-digit code"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(0, 240, 255, 0.4)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                    letterSpacing: '4px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowSetup(false)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnable2FA}
                  disabled={loading || verificationCode.length !== 6}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: (loading || verificationCode.length !== 6) ? '#666' : 'linear-gradient(135deg, #00F0FF, #0099CC)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#000',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: (loading || verificationCode.length !== 6) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Verifying...' : 'Enable 2FA'}
                </button>
              </div>
            </div>
          )}

          {twoFactorEnabled && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <IoCheckmarkCircle size={40} color="#22c55e" />
              </div>
              <h3 style={{ color: '#FFFFFF', fontSize: '20px', marginBottom: '12px' }}>
                2FA is Enabled
              </h3>
              <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '32px', lineHeight: '1.6' }}>
                Your account is protected with two-factor authentication.
              </p>
              <button
                onClick={handleDisable2FA}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: loading ? '#666' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoFactorSettings;