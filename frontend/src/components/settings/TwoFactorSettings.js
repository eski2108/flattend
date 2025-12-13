import React, { useState, useEffect } from 'react';
import { IoClose, IoShield, IoCheckmarkCircle, IoCopy, IoRefresh } from 'react-icons/io5';
import { toast } from 'sonner';
import axios from 'axios';
import QRCode from 'qrcode';

const API = process.env.REACT_APP_BACKEND_URL;

const TwoFactorSettings = ({ user, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('check'); // 'check' | 'setup' | 'disable' | 'backup'
  const [twoFAData, setTwoFAData] = useState(null);
  const [qrCode, setQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  useEffect(() => {
    check2FAStatus();
  }, []);

  const check2FAStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/api/user/2fa/status`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { user_id: user.user_id }
        }
      );
      
      if (response.data.success) {
        setIs2FAEnabled(response.data.enabled);
        setStep(response.data.enabled ? 'disable' : 'setup');
      }
    } catch (error) {
      console.error('2FA status check error:', error);
      setStep('setup');
    }
  };

  const initiate2FASetup = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/api/user/2fa/setup`,
        { user_id: user.user_id },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setTwoFAData(response.data);
        
        // Generate QR code
        const qrData = `otpauth://totp/CoinHubX:${user.email}?secret=${response.data.secret}&issuer=CoinHubX`;
        const qrCodeUrl = await QRCode.toDataURL(qrData);
        setQrCode(qrCodeUrl);
      }
    } catch (error) {
      toast.error('Failed to initiate 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const enable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/api/user/2fa/enable`,
        {
          user_id: user.user_id,
          code: verificationCode
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setBackupCodes(response.data.backup_codes || []);
        setStep('backup');
        toast.success('✅ 2FA enabled successfully!');
        
        // Update user
        const updatedUser = { ...user, two_factor_enabled: true };
        localStorage.setItem('cryptobank_user', JSON.stringify(updatedUser));
        if (onUpdate) onUpdate(updatedUser);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    if (!password) {
      toast.error('Password is required');
      return;
    }

    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter your current 2FA code');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/api/user/2fa/disable`,
        {
          user_id: user.user_id,
          password: password,
          code: verificationCode
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success('2FA disabled successfully');
        
        // Update user
        const updatedUser = { ...user, two_factor_enabled: false };
        localStorage.setItem('cryptobank_user', JSON.stringify(updatedUser));
        if (onUpdate) onUpdate(updatedUser);
        
        setTimeout(() => onClose(), 1000);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  useEffect(() => {
    if (step === 'setup' && !twoFAData) {
      initiate2FASetup();
    }
  }, [step]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '2px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '20px',
        maxWidth: '550px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 0 40px rgba(0, 240, 255, 0.3)'
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
            color: '#000000',
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
            color: '#666',
            cursor: 'pointer',
            padding: '8px'
          }}>
            <IoClose size={28} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {step === 'setup' && twoFAData && (
            <div>
              <p style={{ color: '#B8C5D6', fontSize: '15px', marginBottom: '24px' }}>
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>

              <div style={{
                background: '#FFFFFF',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <img src={qrCode} alt="2FA QR Code" style={{ width: '200px', height: '200px' }} />
              </div>

              <div style={{
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <p style={{ color: '#00F0FF', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>
                  SECRET KEY (manual entry):
                </p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <code style={{
                    flex: 1,
                    background: '#F5F5F5',
                    padding: '12px',
                    borderRadius: '8px',
                    color: '#000000',
                    fontSize: '14px',
                    wordBreak: 'break-all'
                  }}>
                    {twoFAData.secret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(twoFAData.secret)}
                    style={{
                      background: 'rgba(0, 240, 255, 0.2)',
                      border: '1px solid rgba(0, 240, 255, 0.4)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#00F0FF',
                      cursor: 'pointer'
                    }}
                  >
                    <IoCopy size={20} />
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  color: '#000000',
                  fontSize: '13px',
                  fontWeight: '700',
                  marginBottom: '8px',
                  display: 'block',
                  textTransform: 'uppercase'
                }}>
                  Enter 6-Digit Code from App *
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength="6"
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: '#F5F5F5',
                    border: '2px solid rgba(0, 240, 255, 0.4)',
                    borderRadius: '12px',
                    color: '#000000',
                    fontSize: '24px',
                    fontWeight: '700',
                    textAlign: 'center',
                    letterSpacing: '8px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                onClick={enable2FA}
                disabled={loading || verificationCode.length !== 6}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: loading || verificationCode.length !== 6 ? 'rgba(0, 240, 255, 0.3)' : 'linear-gradient(135deg, #00F0FF 0%, #9B4DFF 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#000000',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: loading || verificationCode.length !== 6 ? 'not-allowed' : 'pointer',
                  boxShadow: loading || verificationCode.length !== 6 ? 'none' : '0 4px 20px rgba(0, 240, 255, 0.4)'
                }}
              >
                {loading ? 'Verifying...' : 'Enable 2FA'}
              </button>
            </div>
          )}

          {step === 'backup' && (
            <div>
              <div style={{
                textAlign: 'center',
                marginBottom: '24px'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: 'linear-gradient(135deg, #00F0FF, #9B4DFF)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 0 40px rgba(0, 240, 255, 0.5)'
                }}>
                  <IoCheckmarkCircle size={48} color="#FFFFFF" />
                </div>
                <h3 style={{ color: '#000000', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
                  2FA Enabled Successfully!
                </h3>
              </div>

              <div style={{
                background: 'rgba(255, 200, 0, 0.1)',
                border: '2px solid rgba(255, 200, 0, 0.4)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <p style={{ color: '#FFC800', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>
                  ⚠️ SAVE YOUR BACKUP CODES
                </p>
                <p style={{ color: '#B8C5D6', fontSize: '13px' }}>
                  Store these codes in a safe place. Use them to access your account if you lose your authenticator device.
                </p>
              </div>

              <div style={{
                background: '#F5F5F5',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px'
                }}>
                  {backupCodes.map((code, index) => (
                    <div key={index} style={{
                      background: 'rgba(0, 240, 255, 0.05)',
                      padding: '12px',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <code style={{ color: '#00F0FF', fontSize: '16px', fontWeight: '700' }}>
                        {code}
                      </code>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => copyToClipboard(backupCodes.join('\n'))}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'rgba(0, 240, 255, 0.2)',
                  border: '1px solid rgba(0, 240, 255, 0.4)',
                  borderRadius: '12px',
                  color: '#00F0FF',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <IoCopy size={20} />
                Copy All Codes
              </button>

              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #00F0FF 0%, #9B4DFF 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#000000',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(0, 240, 255, 0.4)'
                }}
              >
                Done
              </button>
            </div>
          )}

          {step === 'disable' && (
            <div>
              <div style={{
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <p style={{ color: '#00F0FF', fontSize: '14px', margin: 0 }}>
                  ✅ 2FA is currently <strong>ENABLED</strong> on your account
                </p>
              </div>

              <p style={{ color: '#B8C5D6', fontSize: '14px', marginBottom: '24px' }}>
                To disable 2FA, please enter your password and current 2FA code:
              </p>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  color: '#000000',
                  fontSize: '13px',
                  fontWeight: '700',
                  marginBottom: '8px',
                  display: 'block',
                  textTransform: 'uppercase'
                }}>
                  Password *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#F5F5F5',
                    border: '1px solid rgba(0, 240, 255, 0.4)',
                    borderRadius: '12px',
                    color: '#000000',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  color: '#000000',
                  fontSize: '13px',
                  fontWeight: '700',
                  marginBottom: '8px',
                  display: 'block',
                  textTransform: 'uppercase'
                }}>
                  Current 2FA Code *
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength="6"
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: '#F5F5F5',
                    border: '2px solid rgba(0, 240, 255, 0.4)',
                    borderRadius: '12px',
                    color: '#000000',
                    fontSize: '24px',
                    fontWeight: '700',
                    textAlign: 'center',
                    letterSpacing: '8px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={onClose}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    color: '#000000',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={disable2FA}
                  disabled={loading || !password || verificationCode.length !== 6}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: loading || !password || verificationCode.length !== 6 ? 'rgba(255, 68, 68, 0.3)' : 'linear-gradient(135deg, #FF4444 0%, #CC0000 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#000000',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: loading || !password || verificationCode.length !== 6 ? 'not-allowed' : 'pointer',
                    boxShadow: loading || !password || verificationCode.length !== 6 ? 'none' : '0 4px 20px rgba(255, 68, 68, 0.4)'
                  }}
                >
                  {loading ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoFactorSettings;
