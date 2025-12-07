import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoEye, IoEyeOff, IoLockClosed, IoMail, IoShield, IoCheckmarkCircle } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [tempUserId, setTempUserId] = useState(null);

  useEffect(() => {
    // Handle Google OAuth callback
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('google_success') === 'true') {
      const token = urlParams.get('token');
      const userParam = urlParams.get('user');
      
      if (token && userParam) {
        try {
          const userData = JSON.parse(decodeURIComponent(userParam));
          
          localStorage.setItem('user', JSON.stringify(userData));
          localStorage.setItem('cryptobank_user', JSON.stringify(userData));
          localStorage.setItem('token', token);
          
          toast.success('✅ Logged in successfully with Google!');
          setTimeout(() => navigate('/dashboard'), 500);
        } catch (error) {
          console.error('Error parsing Google login data:', error);
          toast.error('Login failed. Please try again.');
        }
      }
    }
  }, [navigate, location]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, formData);
      
      if (response.data.success) {
        // Check if 2FA is required
        if (response.data.two_factor_required) {
          setShow2FA(true);
          setTempUserId(response.data.user_id);
          toast.info('Please enter your 2FA code');
        } else {
          // No 2FA required, login complete
          localStorage.setItem('cryptobank_user', JSON.stringify(response.data.user));
          localStorage.setItem('user', JSON.stringify(response.data.user));
          localStorage.setItem('token', response.data.token);
          toast.success('✅ Logged in successfully!');
          navigate('/dashboard');
        }
      } else {
        toast.error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/2fa/login-verify`, {
        user_id: tempUserId,
        code: twoFactorCode
      });
      
      if (response.data.success) {
        localStorage.setItem('cryptobank_user', JSON.stringify(response.data.user));
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
        toast.success('✅ Logged in successfully!');
        navigate('/dashboard');
      } else {
        toast.error(response.data.message || 'Invalid 2FA code');
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    try {
      setLoading(true);
      const googleAuthUrl = `${API}/auth/google`;
      console.log('🔍 Redirecting to Google OAuth:', googleAuthUrl);
      window.location.href = googleAuthUrl;
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast.error('Failed to initiate Google sign-in');
      setLoading(false);
    }
  };

  // 2FA Modal View
  if (show2FA) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0A0E27 0%, #1a1f3a 50%, #0A0E27 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated Background */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, rgba(0, 240, 255, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          animation: 'float 20s ease-in-out infinite'
        }} />
        
        <div style={{
          position: 'absolute',
          bottom: '-30%',
          left: '-10%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(155, 77, 255, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          animation: 'float 25s ease-in-out infinite reverse'
        }} />

        <div style={{
          width: '100%',
          maxWidth: '460px',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <img 
              src="/logo1-transparent.png" 
              alt="CoinHubX Logo" 
              style={{
                height: '120px',
                width: 'auto',
                objectFit: 'contain',
                imageRendering: 'crisp-edges',
                marginBottom: '24px',
                margin: '0 auto 24px auto',
                display: 'block'
              }}
            />
            <h1 style={{
              fontSize: '36px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #00F0FF 0%, #00C6FF 50%, #9B4DFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '10px',
              letterSpacing: '-1px',
              textShadow: '0 0 40px rgba(0, 240, 255, 0.3)'
            }}>Two-Factor Authentication</h1>
            <p style={{ color: '#B8C5D6', fontSize: '15px', fontWeight: '500' }}>Enter the 6-digit code from your authenticator app</p>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <IoShield size={16} color="#00F0FF" />
              Verification Code
            </label>
            <input
              type="text"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              style={{
                width: '100%',
                padding: '13px 16px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(0, 240, 255, 0.4)',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '18px',
                letterSpacing: '4px',
                textAlign: 'center',
                outline: 'none',
                transition: 'all 0.3s',
                boxSizing: 'border-box',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(0, 240, 255, 0.8)';
                e.target.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(0, 240, 255, 0.4)';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.2)';
              }}
            />
          </div>

          <button
            onClick={handleVerify2FA}
            disabled={loading || twoFactorCode.length !== 6}
            style={{
              width: '100%',
              padding: '15px',
              background: loading || twoFactorCode.length !== 6 ? 'rgba(143, 155, 179, 0.3)' : 'linear-gradient(135deg, #00F0FF 0%, #00C6FF 50%, #9B4DFF 100%)',
              border: 'none',
              borderRadius: '14px',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: '800',
              cursor: loading || twoFactorCode.length !== 6 ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              boxShadow: loading || twoFactorCode.length !== 6 ? 'none' : '0 6px 24px rgba(0, 240, 255, 0.5), 0 0 40px rgba(155, 77, 255, 0.3)',
              marginBottom: '18px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}
            onMouseEnter={(e) => {
              if (!loading && twoFactorCode.length === 6) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 32px rgba(0, 240, 255, 0.6), 0 0 60px rgba(155, 77, 255, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 6px 24px rgba(0, 240, 255, 0.5), 0 0 40px rgba(155, 77, 255, 0.3)';
            }}
          >
            {loading ? 'Verifying...' : 'Verify & Login'}
          </button>

          <button
            onClick={() => setShow2FA(false)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'transparent',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '12px',
              color: '#00F0FF',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Back to Login
          </button>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A0E27 0%, #1a1f3a 50%, #0A0E27 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-20%',
        width: '800px',
        height: '800px',
        background: 'radial-gradient(circle, rgba(0, 240, 255, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        animation: 'float 20s ease-in-out infinite'
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        left: '-10%',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(155, 77, 255, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        animation: 'float 25s ease-in-out infinite reverse'
      }} />

      {/* Login Form */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* CHX Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src="/logo1-transparent.png" 
            alt="CoinHubX Logo" 
            style={{
              height: '120px',
              width: 'auto',
              objectFit: 'contain',
              imageRendering: 'crisp-edges',
              marginBottom: '24px',
              margin: '0 auto 24px auto',
              display: 'block'
            }}
          />
          <h1 style={{
            fontSize: '36px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #00F0FF 0%, #00C6FF 50%, #9B4DFF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '10px',
            letterSpacing: '-1px',
            textShadow: '0 0 40px rgba(0, 240, 255, 0.3)'
          }}>Welcome Back</h1>
          <p style={{ color: '#B8C5D6', fontSize: '15px', fontWeight: '500' }}>Sign in to continue trading</p>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          type="button"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(10, 25, 41, 0.8)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '14px',
            color: '#FFFFFF',
            fontSize: '15px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.3s',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.target.style.background = 'rgba(10, 25, 41, 0.95)';
              e.target.style.borderColor = 'rgba(0, 240, 255, 0.5)';
              e.target.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(10, 25, 41, 0.8)';
            e.target.style.borderColor = 'rgba(0, 240, 255, 0.3)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        {/* OR Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            flex: 1,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.5), transparent)',
            boxShadow: '0 0 8px rgba(0, 240, 255, 0.3)'
          }} />
          <span style={{
            color: '#00F0FF',
            fontSize: '13px',
            fontWeight: '700',
            textShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
          }}>OR</span>
          <div style={{
            flex: 1,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.5), transparent)',
            boxShadow: '0 0 8px rgba(0, 240, 255, 0.3)'
          }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <IoMail size={16} color="#00F0FF" />
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '13px 16px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(0, 240, 255, 0.4)',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.3s',
                boxSizing: 'border-box',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(0, 240, 255, 0.8)';
                e.target.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(0, 240, 255, 0.4)';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.2)';
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <IoLockClosed size={16} color="#00F0FF" />
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: '13px 50px 13px 16px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(0, 240, 255, 0.4)',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'all 0.3s',
                  boxSizing: 'border-box',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(0, 240, 255, 0.8)';
                  e.target.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(0, 240, 255, 0.4)';
                  e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.2)';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#00F0FF',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div style={{ marginBottom: '20px', textAlign: 'right' }}>
            <Link
              to="/forgot-password"
              style={{
                color: '#00F0FF',
                fontSize: '13px',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.3s',
                textShadow: '0 0 10px rgba(0, 240, 255, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#9B4DFF';
                e.target.style.textShadow = '0 0 10px rgba(155, 77, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#00F0FF';
                e.target.style.textShadow = '0 0 10px rgba(0, 240, 255, 0.3)';
              }}
            >
              Forgot Password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              background: loading ? 'rgba(143, 155, 179, 0.3)' : 'linear-gradient(135deg, #00F0FF 0%, #00C6FF 50%, #9B4DFF 100%)',
              border: 'none',
              borderRadius: '14px',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: '800',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              boxShadow: loading ? 'none' : '0 6px 24px rgba(0, 240, 255, 0.5), 0 0 40px rgba(155, 77, 255, 0.3)',
              marginBottom: '18px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 32px rgba(0, 240, 255, 0.6), 0 0 60px rgba(155, 77, 255, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 6px 24px rgba(0, 240, 255, 0.5), 0 0 40px rgba(155, 77, 255, 0.3)';
            }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          {/* Register Link */}
          <p style={{
            textAlign: 'center',
            color: '#8F9BB3',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Don't have an account?{' '}
            <Link
              to="/register"
              style={{
                color: '#00F0FF',
                fontWeight: '700',
                textDecoration: 'none',
                transition: 'all 0.3s',
                textShadow: '0 0 10px rgba(0, 240, 255, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#9B4DFF';
                e.target.style.textShadow = '0 0 10px rgba(155, 77, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#00F0FF';
                e.target.style.textShadow = '0 0 10px rgba(0, 240, 255, 0.3)';
              }}
            >
              Create Account
            </Link>
          </p>
        </form>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        input::placeholder {
          color: rgba(184, 197, 214, 0.6) !important;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
