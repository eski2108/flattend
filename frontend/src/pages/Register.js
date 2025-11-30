import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Zap, Mail, Lock, User, Gift } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

import API_BASE_URL from '@/config/api';
const API = API_BASE_URL;
const AUTH_URL = 'https://auth.emergentagent.com';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref') || '';
  const googleData = searchParams.get('google_data') || '';
  const requirePhone = searchParams.get('require_phone') === 'true';
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirmPassword: '',
    referral_code: referralCode,
    google_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [processingAuth, setProcessingAuth] = useState(false);
  const [showReferralPopup, setShowReferralPopup] = useState(false);
  const [userReferralData, setUserReferralData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);

  // Handle Google OAuth data from redirect
  useEffect(() => {
    if (googleData && requirePhone) {
      try {
        const decodedData = JSON.parse(atob(googleData));
        setFormData(prev => ({
          ...prev,
          email: decodedData.email,
          full_name: decodedData.name,
          google_id: decodedData.google_id
        }));
        setIsGoogleSignup(true);
        toast.info('Please verify your phone number to complete Google sign-up');
      } catch (error) {
        console.error('Error decoding Google data:', error);
        toast.error('Invalid Google sign-up data');
      }
    }
  }, [googleData, requirePhone]);

  // Handle Google OAuth redirect
  useEffect(() => {
    const processSessionId = async () => {
      const hash = window.location.hash;
      if (!hash.includes('session_id=')) return;

      setProcessingAuth(true);
      const sessionId = hash.split('session_id=')[1].split('&')[0];

      try {
        const response = await axios.get(`${API}/auth/session-data?session_id=${sessionId}`, {
          headers: { 'X-Session-ID': sessionId },
          withCredentials: true
        });

        if (response.data.id) {
          document.cookie = `session_token=${response.data.session_token}; path=/; max-age=604800; secure; samesite=none`;
          localStorage.setItem('cryptobank_user', JSON.stringify(response.data));
          
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Get user's referral data
          try {
            const refResponse = await axios.get(`${API}/referral/dashboard/${response.data.id}`);
            setUserReferralData(refResponse.data);
            setShowReferralPopup(true);
          } catch (error) {
            console.error('Failed to get referral data:', error);
            // If referral fetch fails, redirect to dashboard anyway
            navigate('/dashboard');
          }
          
          toast.success('Account created successfully with Google!');
          
          // If no referral popup shown, redirect to dashboard
          if (!setShowReferralPopup) {
            navigate('/dashboard');
          }
        }
      } catch (error) {
        console.error('Google auth error:', error);
        toast.error('Google Sign-In failed. Please try again.');
        window.history.replaceState({}, document.title, window.location.pathname);
      } finally {
        setProcessingAuth(false);
      }
    };

    processSessionId();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Skip password validation for Google signup
    if (!isGoogleSignup) {
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        phone_number: formData.phone_number
      };
      
      // Add password only for regular signup
      if (!isGoogleSignup) {
        payload.password = formData.password;
      }
      
      // Add Google ID if Google signup
      if (isGoogleSignup && formData.google_id) {
        payload.google_id = formData.google_id;
        payload.email_verified = true;
      }
      
      const response = await axios.post(`${API}/auth/register`, payload);
      
      if (response.data.success) {
        const userId = response.data.user.user_id;
        
        // Show phone verification modal
        setShowPhoneVerification(true);
        toast.success('📱 Check your phone! We sent you a 6-digit verification code.', {
          duration: 8000
        });
        
        // Apply referral code if provided
        if (formData.referral_code) {
          try {
            await axios.post(`${API}/referral/apply`, {
              referred_user_id: userId,
              referral_code: formData.referral_code
            });
            toast.info('📧 Referral code will be applied after email verification', {
              duration: 6000
            });
          } catch (error) {
            console.error('Referral application failed:', error);
          }
        }
        
        // Get user's referral data
        try {
          const refResponse = await axios.get(`${API}/referral/dashboard/${userId}`);
          setUserReferralData(refResponse.data);
          setShowReferralPopup(true);
        } catch (error) {
          // If referral fetch fails, just redirect to login
          setTimeout(() => navigate('/login'), 1500);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Use environment variable for redirect URL (API already includes /api)
    const redirectUrl = encodeURIComponent(`${API}/auth/google/callback`);
    const clientId = '823558232364-e4b48l01o9frh6vbltic2633fn3pgs0o.apps.googleusercontent.com';
    const scope = encodeURIComponent('email profile');
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUrl}&response_type=code&scope=${scope}`;
    
    window.location.href = authUrl;
  };

  const closePopupAndNavigate = () => {
    setShowReferralPopup(false);
    // After Google OAuth registration, go to dashboard, not login
    navigate('/dashboard');
  };

  if (processingAuth) {


  const handleVerifyPhone = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API}/auth/verify-phone`, {
        email: formData.email,
        code: verificationCode
      });

      if (response.data.success) {
        toast.success('✅ Phone verified! You can now log in.');
        setShowPhoneVerification(false);
        
        // Apply referral if provided
        if (formData.referral_code) {
          // Referral code application logic here if needed
        }
        
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (error) {
      console.error('Phone verification error:', error);
      toast.error(error.response?.data?.detail || 'Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

    return (
      <div className="auth-page">
        <div className="auth-gradient"></div>
        <div className="auth-container">
          <Card className="auth-card">
            <div className="auth-card-content" style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" style={{
                border: '4px solid rgba(0, 240, 255, 0.1)',
                borderTop: '4px solid #00F0FF',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1.5rem'
              }}></div>
              <h2 style={{ color: '#00F0FF', marginBottom: '0.5rem' }}>Creating your account...</h2>
              <p style={{ color: '#a0a0a0' }}>Please wait</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="auth-page">
        <div className="auth-gradient"></div>
        
        <div className="auth-container">
          <div className="auth-header">
            <div className="logo" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="/logo.png" alt="Coin Hub X" style={{ width: '40px', height: '40px', objectFit: 'contain', background: 'transparent', mixBlendMode: 'lighten' }} />
              <span>Coin Hub X</span>
            </div>
          </div>

          <Card className="auth-card">
            <div className="auth-card-content">
              <h1 className="auth-title">Create Your Account</h1>
              <p className="auth-subtitle">Join Coin Hub X and start trading crypto P2P</p>

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="full_name">
                    <User size={18} />
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">
                    <Mail size={18} />
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group" style={{
                  background: 'rgba(0, 240, 255, 0.03)',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 240, 255, 0.15)'
                }}>
                  <label htmlFor="phone_number" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#00F0FF'
                  }}>
                    📱 Phone Number
                    <span style={{
                      fontSize: '11px',
                      color: '#22C55E',
                      background: 'rgba(34, 197, 94, 0.1)',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>Required for SMS verification</span>
                  </label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="+44 7XXX XXXXXX"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">
                    <Lock size={18} />
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      style={{ paddingRight: '50px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#00F0FF',
                        cursor: 'pointer',
                        fontSize: '20px',
                        padding: '0 8px'
                      }}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">
                    <Lock size={18} />
                    Confirm Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      style={{ paddingRight: '50px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#00F0FF',
                        cursor: 'pointer',
                        fontSize: '20px',
                        padding: '0 8px'
                      }}
                    >
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                {/* Referral code detected automatically from URL - no input needed */}

                {/* Google reCAPTCHA */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  marginTop: '1.5rem',
                  marginBottom: '1rem'
                }}>
                  <div 
                    className="g-recaptcha" 
                    data-sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                    data-theme="dark"
                  ></div>
                </div>

                <Button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>

              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                margin: '20px 0',
                color: '#888',
                fontSize: '14px'
              }}>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, #00D9FF40, transparent)' }}></div>
                <span>OR</span>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, #00D9FF40, transparent)' }}></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#fff',
                  border: '2px solid #00D9FF40',
                  borderRadius: '12px',
                  color: '#1A1F3A',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.3s ease',
                  marginBottom: '20px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f0f0f0';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#fff';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <path fill="#4285F4" d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"/>
                  <path fill="#34A853" d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"/>
                  <path fill="#FBBC05" d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 000 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"/>
                  <path fill="#EA4335" d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"/>
                </svg>
                Sign up with Google
              </button>

              <div className="auth-footer">
                <p>
                  Already have an account?{' '}
                  <Link to="/login" className="auth-link">
                    Log in
                  </Link>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Referral Popup */}
      {showReferralPopup && userReferralData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1f3a 0%, #13182a 100%)',
            borderRadius: '24px',
            padding: '2.5rem',
            maxWidth: '500px',
            width: '90%',
            border: '2px solid #00F0FF',
            boxShadow: '0 0 50px rgba(0, 240, 255, 0.5)',
            animation: 'fadeInScale 0.3s ease-out'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                fontSize: '64px',
                marginBottom: '1rem'
              }}>🎉</div>
              <h2 style={{
                color: '#00F0FF',
                fontSize: '28px',
                fontWeight: '900',
                marginBottom: '0.5rem'
              }}>
                Welcome to Coin Hub X!
              </h2>
              <p style={{
                color: '#a0a0a0',
                fontSize: '16px'
              }}>
                Your account has been created successfully
              </p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              border: '1px solid rgba(0, 240, 255, 0.3)'
            }}>
              <h3 style={{
                color: '#fff',
                fontSize: '20px',
                fontWeight: '700',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Gift size={24} color="#00F0FF" />
                Invite Friends & Earn 20% Commission!
              </h3>
              <p style={{
                color: '#ccc',
                fontSize: '14px',
                lineHeight: '1.6',
                marginBottom: '1rem'
              }}>
                Share your referral link and earn <strong style={{ color: '#00F0FF' }}>20% of all platform fees</strong> generated by your referrals for 12 months!
              </p>
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <code style={{
                  color: '#00F0FF',
                  fontSize: '16px',
                  fontWeight: '700',
                  letterSpacing: '2px'
                }}>
                  {userReferralData.referral_code}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(userReferralData.referral_code);
                    toast.success('Referral code copied!');
                  }}
                  style={{
                    background: '#00F0FF',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  COPY
                </button>
              </div>
              <p style={{
                color: '#888',
                fontSize: '12px',
                textAlign: 'center'
              }}>
                Your unique referral code
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                background: 'rgba(0, 240, 255, 0.05)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center',
                border: '1px solid rgba(0, 240, 255, 0.2)'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '0.5rem' }}>💰</div>
                <div style={{ color: '#00F0FF', fontSize: '24px', fontWeight: '900' }}>20%</div>
                <div style={{ color: '#888', fontSize: '13px' }}>Commission Rate</div>
              </div>
              <div style={{
                background: 'rgba(168, 85, 247, 0.05)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center',
                border: '1px solid rgba(168, 85, 247, 0.2)'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '0.5rem' }}>📅</div>
                <div style={{ color: '#A855F7', fontSize: '24px', fontWeight: '900' }}>12</div>
                <div style={{ color: '#888', fontSize: '13px' }}>Months Duration</div>
              </div>
            </div>

            <button
              onClick={closePopupAndNavigate}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                color: '#000',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '900',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(0, 240, 255, 0.5)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.02)';
                e.target.style.boxShadow = '0 0 30px rgba(0, 240, 255, 0.7)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.5)';
              }}
            >
              Get Started Now
            </button>
          </div>
        </div>
      )}

      {/* Phone Verification Modal */}
      {showPhoneVerification && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1f37 0%, #0f1420 100%)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '20px',
            padding: '2.5rem',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '64px', marginBottom: '1rem' }}>📱</div>
              <h2 style={{ color: '#00F0FF', fontSize: '28px', fontWeight: '900', marginBottom: '0.5rem' }}>
                Verify Your Phone
              </h2>
              <p style={{ color: '#888', fontSize: '14px' }}>
                Enter the 6-digit code sent to<br/>
                <strong style={{ color: '#fff' }}>{formData.phone_number}</strong>
              </p>
            </div>

            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength="6"
              style={{
                width: '100%',
                padding: '20px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '32px',
                fontWeight: '700',
                textAlign: 'center',
                letterSpacing: '0.5rem',
                marginBottom: '1.5rem'
              }}
            />

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowPhoneVerification(false)}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyPhone}
                disabled={loading || verificationCode.length !== 6}
                style={{
                  flex: 2,
                  padding: '14px',
                  background: verificationCode.length === 6 
                    ? 'linear-gradient(135deg, #00F0FF, #A855F7)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  color: verificationCode.length === 6 ? '#000' : '#666',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '900',
                  cursor: verificationCode.length === 6 ? 'pointer' : 'not-allowed'
                }}
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
