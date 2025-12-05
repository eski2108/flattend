import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import API_BASE_URL from '@/config/api';

const API = API_BASE_URL;

function PremiumAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState('signin'); // signin, phone, otp, profile
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+44');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [googleData, setGoogleData] = useState(null);
  const [profileData, setProfileData] = useState({
    fullName: '',
    username: ''
  });

  useEffect(() => {
    // Check if redirected from Google OAuth
    const params = new URLSearchParams(location.search);
    const googleDataParam = params.get('google_data');
    const token = params.get('token');
    
    if (token) {
      // User logged in successfully via Google
      localStorage.setItem('user_token', token);
      navigate('/dashboard');
    } else if (googleDataParam) {
      // New Google user needs to complete signup
      try {
        const decoded = JSON.parse(atob(googleDataParam));
        setGoogleData(decoded);
        setStep('phone');
      } catch (e) {
        console.error('Failed to decode Google data');
      }
    }
  }, [location, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      console.log('Initiating Google sign-in...');
      const response = await axios.get(`${API}/auth/google`);
      console.log('Google auth response:', response.data);
      if (response.data.auth_url) {
        console.log('Redirecting to:', response.data.auth_url);
        window.location.href = response.data.auth_url;
      } else {
        toast.error('No auth URL received');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast.error('Failed to initiate Google sign-in: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = () => {
    setStep('phone');
  };

  const handleEmailSignIn = () => {
    navigate('/register');
  };

  const handleSendOTP = async () => {
    if (!phoneNumber) {
      toast.error('Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `${countryCode}${phoneNumber}`;
      console.log('Sending OTP to:', fullPhone);
      const response = await axios.post(`${API}/auth/phone/send-otp`, {
        phone_number: fullPhone
      });
      console.log('OTP response:', response.data);

      if (response.data.success) {
        toast.success(`Verification code sent to ${fullPhone}! Check your messages. (Status: ${response.data.status})`);
        setStep('otp');
      } else {
        toast.error('Failed to send code');
      }
    } catch (error) {
      console.error('OTP send error:', error);
      const errorMsg = error.response?.data?.detail || error.message;
      toast.error(`Failed to send verification code: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `${countryCode}${phoneNumber}`;
      const response = await axios.post(`${API}/auth/phone/verify-otp`, {
        phone_number: fullPhone,
        code: code
      });

      if (response.data.verified) {
        toast.success('Phone verified!');
        setStep('profile');
      } else {
        toast.error('Invalid or expired code');
        setOtpCode(['', '', '', '', '', '']);
      }
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (!profileData.fullName) {
      toast.error('Please enter your full name');
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `${countryCode}${phoneNumber}`;
      
      // Choose endpoint based on signup method
      const endpoint = googleData ? '/auth/complete-google-signup' : '/auth/complete-phone-signup';
      const payload = googleData 
        ? {
            google_data: googleData,
            phone_number: fullPhone,
            full_name: profileData.fullName,
            username: profileData.username
          }
        : {
            phone_number: fullPhone,
            full_name: profileData.fullName,
            username: profileData.username
          };
      
      const response = await axios.post(`${API}${endpoint}`, payload);

      if (response.data.success && response.data.token) {
        // Store token and user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('cryptobank_user', JSON.stringify(response.data.user));
        toast.success('Welcome to Coin Hub X!');
        navigate('/dashboard');
      } else {
        toast.error('Failed to create account');
      }
    } catch (error) {
      console.error('Profile completion error:', error);
      toast.error(error.response?.data?.detail || 'Failed to complete signup');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (index, value) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newOTP = [...otpCode];
    newOTP[index] = value;
    setOtpCode(newOTP);

    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000D1A 0%, #0a0f1e 50%, #1a1f3a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(0, 240, 255, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        top: '-200px',
        left: '-200px',
        animation: 'pulse 4s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        bottom: '-150px',
        right: '-150px',
        animation: 'pulse 4s ease-in-out infinite 2s'
      }} />

      {/* Main container */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(26, 31, 58, 0.8)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(0, 240, 255, 0.2)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 240, 255, 0.1)',
        padding: '48px 40px',
        position: 'relative',
        zIndex: 1,
        boxSizing: 'border-box'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            Coin Hub X
          </h1>
          <p style={{ color: '#888', fontSize: '14px' }}>
            {step === 'signin' && 'Create your account or sign in'}
            {step === 'phone' && 'Verify your phone'}
            {step === 'otp' && 'Enter verification code'}
            {step === 'profile' && 'Complete your profile'}
          </p>
        </div>

        {/* Sign In Screen */}
        {step === 'signin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: '100%',
                padding: '18px',
                background: '#fff',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '16px',
                color: '#000',
                fontSize: '16px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                transition: 'all 0.3s ease',
                opacity: loading ? 0.5 : 1,
                marginBottom: '16px'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 24px rgba(0, 240, 255, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              onClick={handlePhoneSignIn}
              style={{
                width: '100%',
                padding: '18px',
                background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                border: 'none',
                borderRadius: '16px',
                color: '#000',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 16px rgba(0, 240, 255, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 24px rgba(0, 240, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 16px rgba(0, 240, 255, 0.3)';
              }}
            >
              📱 Continue with Phone Number
            </button>

            <button
              onClick={handleEmailSignIn}
              style={{
                width: '100%',
                padding: '18px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              ✉️ Continue with Email
            </button>

            <p style={{ textAlign: 'center', color: '#888', fontSize: '14px', marginTop: '24px' }}>
              Already have an account? <a href="/login" style={{ color: '#00F0FF', textDecoration: 'none', fontWeight: '600' }}>Sign in</a>
            </p>
          </div>
        )}

        {/* Phone Verification Screen */}
        {step === 'phone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                Phone Number
              </label>
              <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'stretch' }}>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  style={{
                    width: '100px',
                    minWidth: '100px',
                    maxWidth: '100px',
                    padding: '16px 12px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    flexShrink: 0
                  }}
                >
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+234">🇳🇬 +234</option>
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+33">🇫🇷 +33</option>
                  <option value="+49">🇩🇪 +49</option>
                </select>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="7XXX XXX XXX"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '16px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleSendOTP}
              disabled={loading}
              style={{
                width: '100%',
                padding: '18px',
                background: loading ? 'rgba(0, 240, 255, 0.3)' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                border: 'none',
                borderRadius: '16px',
                color: loading ? '#888' : '#000',
                fontSize: '16px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>

            <button
              onClick={() => setStep('signin')}
              style={{
                width: '100%',
                padding: '16px',
                background: 'transparent',
                border: 'none',
                color: '#888',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              ← Back
            </button>
          </div>
        )}

        {/* OTP Verification Screen */}
        {step === 'otp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>
                We sent a code to {countryCode} {phoneNumber}
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', maxWidth: '360px', margin: '0 auto' }}>
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOTPChange(index, e.target.value)}
                    style={{
                      width: '52px',
                      height: '60px',
                      padding: '0',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '2px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '24px',
                      fontWeight: '700',
                      textAlign: 'center',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#00F0FF';
                      e.target.style.transform = 'scale(1.05)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                      e.target.style.transform = 'scale(1)';
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleVerifyOTP}
              disabled={loading}
              style={{
                width: '100%',
                padding: '18px',
                background: loading ? 'rgba(0, 240, 255, 0.3)' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                border: 'none',
                borderRadius: '16px',
                color: loading ? '#888' : '#000',
                fontSize: '16px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>

            <button
              onClick={handleSendOTP}
              style={{
                width: '100%',
                padding: '16px',
                background: 'transparent',
                border: 'none',
                color: '#00F0FF',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Resend Code
            </button>
          </div>
        )}

        {/* Profile Completion Screen */}
        {step === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={profileData.fullName}
                onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                placeholder="John Doe"
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '2px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                Username <span style={{ color: '#888', fontSize: '12px' }}>(Optional)</span>
              </label>
              <input
                type="text"
                value={profileData.username}
                onChange={(e) => setProfileData({...profileData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                placeholder="johndoe (optional)"
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '2px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>

            <button
              onClick={handleCompleteProfile}
              disabled={loading}
              style={{
                width: '100%',
                padding: '18px',
                background: loading ? 'rgba(0, 240, 255, 0.3)' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                border: 'none',
                borderRadius: '16px',
                color: loading ? '#888' : '#000',
                fontSize: '16px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

export default PremiumAuth;
