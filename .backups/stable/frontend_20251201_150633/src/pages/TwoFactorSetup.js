import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import CHXButton from '@/components/CHXButton';
import { IoAlertCircle, IoCheckmark as Check, IoCheckmarkCircle, IoCloudDownload, IoCopy, IoKey, IoMail as Mail, IoPhonePortrait, IoShield } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL || 'https://p2p-market-1.preview.emergentagent.com';

export default function TwoFactorSetup() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      toast.error('Please login first');
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    setIs2FAEnabled(parsedUser.is_two_factor_enabled || false);
  }, [navigate]);

  const handleSetup2FA = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/auth/2fa/setup`, {
        user_id: user.user_id,
        email: user.email
      });
      
      if (response.data.success) {
        setSetupData(response.data);
        setBackupCodes(response.data.backup_codes || []);
        toast.success('2FA setup initiated. Please scan the QR code.');
      } else {
        toast.error(response.data.message || 'Failed to setup 2FA');
      }
    } catch (error) {
      console.error('2FA setup error:', error);
      toast.error(error.response?.data?.message || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/auth/2fa/verify`, {
        user_id: user.user_id,
        code: verificationCode
      });
      
      if (response.data.success) {
        setIs2FAEnabled(true);
        setShowBackupCodes(true);
        
        // Update local user data
        const updatedUser = { ...user, is_two_factor_enabled: true };
        localStorage.setItem('cryptobank_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        toast.success('🎉 2FA enabled successfully!');
      } else {
        toast.error(response.data.message || 'Verification failed');
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/auth/2fa/disable`, {
        user_id: user.user_id
      });
      
      if (response.data.success) {
        setIs2FAEnabled(false);
        setSetupData(null);
        setBackupCodes([]);
        setShowBackupCodes(false);
        
        // Update local user data
        const updatedUser = { ...user, is_two_factor_enabled: false };
        localStorage.setItem('cryptobank_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        toast.success('2FA disabled');
      } else {
        toast.error(response.data.message || 'Failed to disable 2FA');
      }
    } catch (error) {
      console.error('2FA disable error:', error);
      toast.error(error.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    toast.success('Backup codes copied to clipboard');
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coinhubx-backup-codes-${user.user_id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded');
  };

  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05121F 0%, #0A1F2E 50%, #051018 100%)',
        padding: '24px'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <IoShield size={40} color="#00F0FF" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.8))' }} />
              <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>
                Two-Factor Authentication
              </h1>
            </div>
            <p style={{ fontSize: '16px', color: '#8F9BB3', margin: 0 }}>
              Add an extra layer of security to your account
            </p>
          </div>

          {/* Status Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(123, 44, 255, 0.05) 100%)',
            border: is2FAEnabled ? '1px solid rgba(0, 229, 69, 0.3)' : '1px solid rgba(255, 165, 0, 0.3)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: is2FAEnabled ? '0 0 20px rgba(0, 229, 69, 0.2)' : '0 0 20px rgba(255, 165, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {is2FAEnabled ? (
                  <IoCheckmarkCircle size={32} color="#00E545" />
                ) : (
                  <IoAlertCircle size={32} color="#FFA500" />
                )}
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#FFFFFF', margin: 0, marginBottom: '4px' }}>
                    {is2FAEnabled ? '2FA Enabled' : '2FA Disabled'}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#8F9BB3', margin: 0 }}>
                    {is2FAEnabled 
                      ? 'Your account is protected with two-factor authentication'
                      : 'Enable 2FA to secure your account'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2FA Not Enabled - Setup Section */}
          {!is2FAEnabled && !setupData && (
            <div style={{
              background: 'rgba(10, 20, 40, 0.6)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '16px',
              padding: '32px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <IoPhonePortrait size={64} color="#00F0FF" style={{ margin: '0 auto 16px', filter: 'drop-shadow(0 0 12px rgba(0, 240, 255, 0.6))' }} />
                <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#FFFFFF', marginBottom: '12px' }}>
                  Secure Your Account
                </h2>
                <p style={{ fontSize: '16px', color: '#8F9BB3', marginBottom: '8px' }}>
                  Two-factor authentication adds an extra layer of security by requiring a code from your phone in addition to your password.
                </p>
                <p style={{ fontSize: '14px', color: '#00F0FF', margin: 0 }}>
                  Supports: Google Authenticator, Microsoft Authenticator, Authy
                </p>
              </div>

              <CHXButton
                onClick={handleSetup2FA}
                disabled={loading}
                style={{ width: '100%', padding: '16px', fontSize: '16px' }}
              >
                {loading ? 'Setting up...' : 'Enable 2FA'}
              </CHXButton>
            </div>
          )}

          {/* Setup in Progress - QR Code */}
          {!is2FAEnabled && setupData && (
            <div style={{
              background: 'rgba(10, 20, 40, 0.6)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '16px',
              padding: '32px',
              backdropFilter: 'blur(10px)'
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#FFFFFF', marginBottom: '24px', textAlign: 'center' }}>
                Scan QR Code
              </h2>

              {/* QR Code */}
              {setupData.qr_code && (
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{
                    background: '#FFFFFF',
                    padding: '16px',
                    borderRadius: '12px',
                    display: 'inline-block',
                    boxShadow: '0 4px 20px rgba(0, 240, 255, 0.3)'
                  }}>
                    <img 
                      src={setupData.qr_code} 
                      alt="2FA QR Code" 
                      style={{ width: '250px', height: '250px', display: 'block' }}
                    />
                  </div>
                  <p style={{ fontSize: '14px', color: '#8F9BB3', marginTop: '16px' }}>
                    Scan this QR code with your authenticator app
                  </p>
                </div>
              )}

              {/* Manual Entry */}
              {setupData.secret && (
                <div style={{
                  background: 'rgba(0, 240, 255, 0.05)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px'
                }}>
                  <p style={{ fontSize: '14px', color: '#8F9BB3', marginBottom: '8px' }}>Or enter this code manually:</p>
                  <code style={{ 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    color: '#00F0FF',
                    letterSpacing: '2px',
                    display: 'block',
                    textAlign: 'center'
                  }}>
                    {setupData.secret}
                  </code>
                </div>
              )}

              {/* Verification Code Input */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#FFFFFF', marginBottom: '8px' }}>
                  Enter 6-digit code from your app
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength="6"
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'rgba(10, 20, 40, 0.8)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '20px',
                    textAlign: 'center',
                    letterSpacing: '8px',
                    fontWeight: '600'
                  }}
                />
              </div>

              <CHXButton
                onClick={handleVerifyAndEnable}
                disabled={loading || verificationCode.length !== 6}
                style={{ width: '100%', padding: '16px', fontSize: '16px' }}
              >
                {loading ? 'Verifying...' : 'Verify and Enable 2FA'}
              </CHXButton>
            </div>
          )}

          {/* Backup Codes Display */}
          {(showBackupCodes || (is2FAEnabled && backupCodes.length > 0)) && (
            <div style={{
              background: 'rgba(255, 165, 0, 0.1)',
              border: '1px solid rgba(255, 165, 0, 0.3)',
              borderRadius: '16px',
              padding: '24px',
              marginTop: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <IoKey size={24} color="#FFA500" />
                <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#FFFFFF', margin: 0 }}>
                  Backup Codes
                </h3>
              </div>
              <p style={{ fontSize: '14px', color: '#8F9BB3', marginBottom: '16px' }}>
                Save these codes in a secure location. Each code can be used once if you lose access to your authenticator app.
              </p>

              <div style={{
                background: 'rgba(10, 20, 40, 0.8)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                fontFamily: 'monospace'
              }}>
                {backupCodes.map((code, index) => (
                  <div key={index} style={{
                    fontSize: '16px',
                    color: '#00F0FF',
                    padding: '8px',
                    borderBottom: index < backupCodes.length - 1 ? '1px solid rgba(0, 240, 255, 0.1)' : 'none'
                  }}>
                    {code}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <CHXButton
                  onClick={copyBackupCodes}
                  style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <IoCopy size={18} /> Copy
                </CHXButton>
                <CHXButton
                  onClick={downloadBackupCodes}
                  style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <IoCloudDownload size={18} /> Download
                </CHXButton>
              </div>
            </div>
          )}

          {/* 2FA Enabled - Management */}
          {is2FAEnabled && (
            <div style={{
              background: 'rgba(10, 20, 40, 0.6)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '16px',
              padding: '24px',
              marginTop: '24px'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#FFFFFF', marginBottom: '16px' }}>
                Manage 2FA
              </h3>
              <p style={{ fontSize: '14px', color: '#8F9BB3', marginBottom: '24px' }}>
                Your account is currently protected with two-factor authentication. You can disable it at any time.
              </p>

              <button
                onClick={handleDisable2FA}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'rgba(255, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 0, 0, 0.4)',
                  borderRadius: '8px',
                  color: '#FF4444',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 0, 0, 0.3)';
                  e.target.style.borderColor = 'rgba(255, 0, 0, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 0, 0, 0.2)';
                  e.target.style.borderColor = 'rgba(255, 0, 0, 0.4)';
                }}
              >
                {loading ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
