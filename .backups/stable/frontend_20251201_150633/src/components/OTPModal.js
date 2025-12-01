import React, { useState, useEffect } from 'react';
import { IoClose, IoRefresh, IoShield, RefreshCw } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function OTPModal({ 
  isOpen, 
  onClose, 
  onVerify, 
  title = 'Verify OTP',
  description = 'Enter the 6-digit code sent to your email',
  userId,
  action = 'generic'
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (isOpen && userId) {
      sendOTP();
    }
  }, [isOpen, userId]);

  const sendOTP = async () => {
    if (!userId) {
      toast.error('User ID required');
      return;
    }

    setSendingOTP(true);
    try {
      const response = await axios.post(`${API}/api/auth/send-otp`, {
        user_id: userId,
        action: action
      });

      if (response.data.success) {
        toast.success('OTP sent to your email');
        setCountdown(60);
      } else {
        toast.error(response.data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setSendingOTP(false);
    }
  };

  const handleOTPChange = (index, value) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }

    if (!/^\d*$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/auth/verify-otp`, {
        user_id: userId,
        otp_code: otpCode,
        action: action
      });

      if (response.data.success) {
        toast.success('OTP verified successfully');
        onVerify(otpCode);
        handleClose();
      } else {
        toast.error(response.data.message || 'Invalid OTP');
        setOtp(['', '', '', '', '', '']);
        document.getElementById('otp-0')?.focus();
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error(error.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOtp(['', '', '', '', '', '']);
    setCountdown(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(8px)'
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(2, 6, 24, 0.98) 0%, rgba(7, 19, 39, 0.95) 100%)',
          borderRadius: '24px',
          padding: '2.5rem',
          width: '90%',
          maxWidth: '500px',
          border: '2px solid rgba(0, 240, 255, 0.4)',
          boxShadow: '0 0 60px rgba(0, 240, 255, 0.4), 0 20px 80px rgba(0, 0, 0, 0.8)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <IoShield size={28} color="#00F0FF" strokeWidth={2.5} />
            <h2 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: '700', margin: 0 }}>{title}</h2>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9FA6B2',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#9FA6B2';
            }}
          >
            <IoClose size={24} />
          </button>
        </div>

        {/* Description */}
        <p style={{ color: '#8F9BB3', fontSize: '0.9375rem', marginBottom: '2rem', lineHeight: '1.6' }}>{description}</p>

        {/* OTP Input */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '2rem' }}>
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              inputMode="numeric"
              maxLength="1"
              value={digit}
              onChange={(e) => handleOTPChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              style={{
                width: '3.5rem',
                height: '4rem',
                fontSize: '1.75rem',
                fontWeight: '700',
                textAlign: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '14px',
                color: '#00F0FF',
                outline: 'none',
                transition: 'all 0.3s',
                fontFamily: 'monospace'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#00F0FF';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.5)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            />
          ))}
        </div>

        {/* Resend OTP */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {countdown > 0 ? (
            <p style={{ color: '#8F9BB3', fontSize: '0.9375rem' }}>
              Resend OTP in <span style={{ color: '#00F0FF', fontWeight: '700' }}>{countdown}s</span>
            </p>
          ) : (
            <button
              onClick={sendOTP}
              disabled={sendingOTP}
              style={{
                background: 'none',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                color: '#00F0FF',
                fontSize: '0.9375rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: '0 auto',
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 240, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.6)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <IoRefresh size={18} style={{ animation: sendingOTP ? 'spin 1s linear infinite' : 'none' }} />
              {sendingOTP ? 'Sending...' : 'Resend OTP'}
            </button>
          )}
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={loading || otp.join('').length !== 6}
          style={{
            width: '100%',
            padding: '1.125rem',
            background: otp.join('').length === 6 ? 'linear-gradient(135deg, #00F0FF, #0080FF)' : 'rgba(40, 40, 40, 0.5)',
            color: '#fff',
            border: 'none',
            borderRadius: '14px',
            fontSize: '1.0625rem',
            fontWeight: '700',
            cursor: otp.join('').length === 6 ? 'pointer' : 'not-allowed',
            opacity: otp.join('').length === 6 ? 1 : 0.4,
            transition: 'all 0.3s',
            boxShadow: otp.join('').length === 6 ? '0 0 30px rgba(0, 240, 255, 0.4)' : 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            if (otp.join('').length === 6) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 240, 255, 0.6)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = otp.join('').length === 6 ? '0 0 30px rgba(0, 240, 255, 0.4)' : 'none';
          }}
        >
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>
        
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
