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
    
    // ============================================================================
    // SECURITY: Check if verification is required (for Google users)
    // ============================================================================
    if (urlParams.get('verification_required') === 'true') {
      const userParam = urlParams.get('user');
      const emailVerified = urlParams.get('email_verified') === 'true';
      const phoneVerified = urlParams.get('phone_verified') === 'true';
      
      try {
        const userData = userParam ? JSON.parse(decodeURIComponent(userParam)) : {};
        
        // Store user data temporarily for verification flow
        localStorage.setItem('pending_verification_user', JSON.stringify(userData));
        
        // Show appropriate message
        if (!emailVerified && !phoneVerified) {
          toast.warning('⚠️ Please verify your email and phone number to continue.');
        } else if (!emailVerified) {
          toast.warning('⚠️ Please verify your email to continue. Check your inbox.');
        } else if (!phoneVerified) {
          toast.warning('⚠️ Please verify your phone number to continue.');
        }
        
        // DO NOT redirect to dashboard - user must verify first
        // Redirect to registration page to complete verification
        setTimeout(() => {
          navigate('/register?complete_verification=true&email=' + encodeURIComponent(userData.email || ''));
        }, 1500);
      } catch (error) {
        console.error('Error parsing verification data:', error);
        toast.error('Please complete registration to continue.');
      }
      return;
    }
    
    // Handle successful Google login (only for VERIFIED users)
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
          
          // Redirect to intended destination or dashboard
          const returnUrl = urlParams.get('return');
          const from = returnUrl || location.state?.from?.pathname || location.state?.from || '/dashboard';
          setTimeout(() => window.location.replace(from), 500);
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
      // console.log('Login attempt with:', { email: formData.email, API });
      // USE OLD AUTH ENDPOINT FOR NOW (working)
      const response = await axios.post(`${API}/api/auth/login`, formData);
      // console.log('Login response:', response.data);
      
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
          
          // Redirect to intended destination or dashboard
          const urlParams = new URLSearchParams(location.search);
          const returnUrl = urlParams.get('return');
          const from = returnUrl || location.state?.from?.pathname || location.state?.from || '/dashboard';
          window.location.replace(from);
        }
      } else {
        toast.error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || 'Login failed. Please try again.';
      toast.error(errorMsg);
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
      const response = await axios.post(`${API}/api/auth/2fa/login-verify`, {
        user_id: tempUserId,
        code: twoFactorCode
      });
      
      if (response.data.success) {
        localStorage.setItem('cryptobank_user', JSON.stringify(response.data.user));
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
        toast.success('✅ Logged in successfully!');
        
        // Redirect to intended destination or dashboard
        const urlParams = new URLSearchParams(location.search);
        const returnUrl = urlParams.get('return');
        const from = returnUrl || location.state?.from?.pathname || location.state?.from || '/dashboard';
        window.location.replace(from);
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
      const googleAuthUrl = `${API}/api/auth/google`;
      // console.log('🔍 Redirecting to Google OAuth:', googleAuthUrl);
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
      <div className="login-container">
        {/* Animated Background Elements */}
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />

        {/* Premium Glassmorphic Card */}
        <div className="auth-card">
          {/* Logo Section */}
          <div className="logo-section">
            <img 
              src="/logo1-transparent.png" 
              alt="CoinHubX Logo" 
              className="logo"
            />
            <h1 className="auth-title">Two-Factor Authentication</h1>
            <p className="auth-subtitle">Enter the 6-digit code from your authenticator app</p>
          </div>

          {/* 2FA Code Input */}
          <div className="input-group">
            <label className="input-label">
              <IoShield size={16} className="label-icon" />
              Verification Code
            </label>
            <input
              type="text"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              className="auth-input code-input"
            />
          </div>

          {/* Verify Button */}
          <button
            onClick={handleVerify2FA}
            disabled={loading || twoFactorCode.length !== 6}
            className={`auth-button primary ${(loading || twoFactorCode.length !== 6) ? 'disabled' : ''}`}
          >
            {loading ? 'Verifying...' : 'Verify & Login'}
          </button>

          {/* Back Button */}
          <button
            onClick={() => setShow2FA(false)}
            className="auth-button secondary"
          >
            Back to Login
          </button>
        </div>

        <style jsx>{`
          .login-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #0A0E27 0%, #1a1f3a 30%, #2d1b69 60%, #0A0E27 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            position: relative;
            overflow: hidden;
          }

          .bg-orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.6;
            animation: float 20s ease-in-out infinite;
          }

          .bg-orb-1 {
            top: -10%;
            right: -10%;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(0, 229, 255, 0.4) 0%, rgba(123, 44, 255, 0.2) 50%, transparent 70%);
            animation-delay: 0s;
          }

          .bg-orb-2 {
            bottom: -15%;
            left: -15%;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(123, 44, 255, 0.4) 0%, rgba(0, 240, 255, 0.2) 50%, transparent 70%);
            animation-delay: -10s;
          }

          .bg-orb-3 {
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 300px;
            height: 300px;
            background: radial-gradient(circle, rgba(0, 240, 255, 0.2) 0%, rgba(123, 44, 255, 0.1) 50%, transparent 70%);
            animation-delay: -5s;
          }

          .auth-card {
            width: 100%;
            max-width: 460px;
            background: rgba(10, 14, 39, 0.85);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(0, 229, 255, 0.2);
            border-radius: 24px;
            padding: 40px;
            position: relative;
            z-index: 1;
            box-shadow: 
              0 20px 60px rgba(0, 0, 0, 0.4),
              0 0 80px rgba(0, 229, 255, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
          }

          .logo-section {
            text-align: center;
            margin-bottom: 32px;
          }

          .logo {
            height: 100px;
            width: auto;
            object-fit: contain;
            margin-bottom: 24px;
            filter: drop-shadow(0 0 20px rgba(0, 229, 255, 0.3));
          }

          .auth-title {
            font-size: 28px;
            font-weight: 800;
            background: linear-gradient(135deg, #00E5FF 0%, #7B2CFF 50%, #00F0FF 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
          }

          .auth-subtitle {
            color: rgba(184, 197, 214, 0.8);
            font-size: 14px;
            font-weight: 500;
            line-height: 1.5;
          }

          .input-group {
            margin-bottom: 24px;
          }

          .input-label {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #FFFFFF;
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .label-icon {
            color: #00E5FF;
          }

          .auth-input {
            width: 100%;
            padding: 16px 20px;
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(0, 229, 255, 0.3);
            border-radius: 16px;
            color: #FFFFFF;
            font-size: 15px;
            outline: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-sizing: border-box;
            backdrop-filter: blur(10px);
          }

          .auth-input:focus {
            border-color: rgba(0, 229, 255, 0.8);
            box-shadow: 
              0 0 0 3px rgba(0, 229, 255, 0.1),
              0 0 20px rgba(0, 229, 255, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
            transform: translateY(-1px);
          }

          .code-input {
            font-size: 20px;
            letter-spacing: 8px;
            text-align: center;
            font-weight: 700;
          }

          .auth-button {
            width: 100%;
            padding: 16px 24px;
            border: none;
            border-radius: 16px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            letter-spacing: 0.5px;
            text-transform: uppercase;
            position: relative;
            overflow: hidden;
          }

          .auth-button.primary {
            background: linear-gradient(135deg, #00E5FF 0%, #7B2CFF 50%, #00F0FF 100%);
            color: #FFFFFF;
            box-shadow: 
              0 8px 32px rgba(0, 229, 255, 0.4),
              0 0 40px rgba(123, 44, 255, 0.2);
            margin-bottom: 16px;
          }

          .auth-button.primary:hover:not(.disabled) {
            transform: translateY(-2px);
            box-shadow: 
              0 12px 40px rgba(0, 229, 255, 0.5),
              0 0 60px rgba(123, 44, 255, 0.3);
          }

          .auth-button.primary.disabled {
            background: rgba(143, 155, 179, 0.3);
            cursor: not-allowed;
            box-shadow: none;
          }

          .auth-button.secondary {
            background: transparent;
            border: 1px solid rgba(0, 229, 255, 0.3);
            color: #00E5FF;
          }

          .auth-button.secondary:hover {
            background: rgba(0, 229, 255, 0.1);
            border-color: rgba(0, 229, 255, 0.5);
            transform: translateY(-1px);
          }

          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            33% { transform: translateY(-20px) rotate(2deg); }
            66% { transform: translateY(10px) rotate(-2deg); }
          }

          @media (max-width: 480px) {
            .auth-card {
              padding: 24px;
              margin: 10px;
            }
            
            .auth-title {
              font-size: 24px;
            }
            
            .logo {
              height: 80px;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="login-container">
      {/* Animated Background Elements */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* Premium Glassmorphic Card */}
      <div className="auth-card">
        {/* Logo Section */}
        <div className="logo-section">
          <img 
            src="/logo1-transparent.png" 
            alt="CoinHubX Logo" 
            className="logo"
          />
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to continue trading</p>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          type="button"
          disabled={loading}
          className="google-button"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" className="google-icon">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        {/* OR Divider */}
        <div className="divider">
          <div className="divider-line" />
          <span className="divider-text">OR</span>
          <div className="divider-line" />
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Email */}
          <div className="input-group">
            <label className="input-label">
              <IoMail size={16} className="label-icon" />
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
              className="auth-input"
            />
          </div>

          {/* Password */}
          <div className="input-group">
            <label className="input-label">
              <IoLockClosed size={16} className="label-icon" />
              Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="Enter your password"
                className="auth-input password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
              >
                {showPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="forgot-password">
            <Link to="/forgot-password" className="forgot-link">
              Forgot Password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`auth-button primary ${loading ? 'disabled' : ''}`}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          {/* Register Link */}
          <p className="auth-footer">
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">
              Create Account
            </Link>
          </p>
        </form>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0A0E27 0%, #1a1f3a 30%, #2d1b69 60%, #0A0E27 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.6;
          animation: float 20s ease-in-out infinite;
        }

        .bg-orb-1 {
          top: -10%;
          right: -10%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(0, 229, 255, 0.4) 0%, rgba(123, 44, 255, 0.2) 50%, transparent 70%);
          animation-delay: 0s;
        }

        .bg-orb-2 {
          bottom: -15%;
          left: -15%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(123, 44, 255, 0.4) 0%, rgba(0, 240, 255, 0.2) 50%, transparent 70%);
          animation-delay: -10s;
        }

        .bg-orb-3 {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(0, 240, 255, 0.2) 0%, rgba(123, 44, 255, 0.1) 50%, transparent 70%);
          animation-delay: -5s;
        }

        .auth-card {
          width: 100%;
          max-width: 460px;
          background: rgba(10, 14, 39, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 229, 255, 0.2);
          border-radius: 24px;
          padding: 40px;
          position: relative;
          z-index: 1;
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.4),
            0 0 80px rgba(0, 229, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .logo-section {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo {
          height: 100px;
          width: auto;
          object-fit: contain;
          margin-bottom: 24px;
          filter: drop-shadow(0 0 20px rgba(0, 229, 255, 0.3));
        }

        .auth-title {
          font-size: 32px;
          font-weight: 800;
          background: linear-gradient(135deg, #00E5FF 0%, #7B2CFF 50%, #00F0FF 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }

        .auth-subtitle {
          color: rgba(184, 197, 214, 0.8);
          font-size: 14px;
          font-weight: 500;
          line-height: 1.5;
        }

        .google-button {
          width: 100%;
          padding: 14px 20px;
          background: rgba(10, 25, 41, 0.8);
          border: 1px solid rgba(0, 229, 255, 0.2);
          border-radius: 16px;
          color: #FFFFFF;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
        }

        .google-button:hover:not(:disabled) {
          background: rgba(10, 25, 41, 0.95);
          border-color: rgba(0, 229, 255, 0.4);
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .google-icon {
          flex-shrink: 0;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.4), transparent);
        }

        .divider-text {
          color: #00E5FF;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .auth-form {
          width: 100%;
        }

        .input-group {
          margin-bottom: 20px;
        }

        .input-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .label-icon {
          color: #00E5FF;
        }

        .auth-input {
          width: 100%;
          padding: 16px 20px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(0, 229, 255, 0.3);
          border-radius: 16px;
          color: #FFFFFF;
          font-size: 15px;
          outline: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
          backdrop-filter: blur(10px);
        }

        .auth-input::placeholder {
          color: rgba(184, 197, 214, 0.6);
          font-weight: 500;
        }

        .auth-input:focus {
          border-color: rgba(0, 229, 255, 0.8);
          box-shadow: 
            0 0 0 3px rgba(0, 229, 255, 0.1),
            0 0 20px rgba(0, 229, 255, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          transform: translateY(-1px);
        }

        .password-input-wrapper {
          position: relative;
        }

        .password-input {
          padding-right: 50px;
        }

        .password-toggle {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: #00E5FF;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: all 0.2s;
        }

        .password-toggle:hover {
          color: #7B2CFF;
        }

        .forgot-password {
          text-align: right;
          margin-bottom: 24px;
        }

        .forgot-link {
          color: #00E5FF;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s;
        }

        .forgot-link:hover {
          color: #7B2CFF;
          text-shadow: 0 0 10px rgba(123, 44, 255, 0.5);
        }

        .auth-button {
          width: 100%;
          padding: 16px 24px;
          border: none;
          border-radius: 16px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          letter-spacing: 0.5px;
          text-transform: uppercase;
          position: relative;
          overflow: hidden;
        }

        .auth-button.primary {
          background: linear-gradient(135deg, #00E5FF 0%, #7B2CFF 50%, #00F0FF 100%);
          color: #FFFFFF;
          box-shadow: 
            0 8px 32px rgba(0, 229, 255, 0.4),
            0 0 40px rgba(123, 44, 255, 0.2);
          margin-bottom: 20px;
        }

        .auth-button.primary:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: 
            0 12px 40px rgba(0, 229, 255, 0.5),
            0 0 60px rgba(123, 44, 255, 0.3);
        }

        .auth-button.primary.disabled {
          background: rgba(143, 155, 179, 0.3);
          cursor: not-allowed;
          box-shadow: none;
        }

        .auth-footer {
          text-align: center;
          color: rgba(143, 155, 179, 0.8);
          font-size: 14px;
          font-weight: 500;
          margin: 0;
        }

        .auth-link {
          color: #00E5FF;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.3s;
        }

        .auth-link:hover {
          color: #7B2CFF;
          text-shadow: 0 0 10px rgba(123, 44, 255, 0.5);
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(2deg); }
          66% { transform: translateY(10px) rotate(-2deg); }
        }

        @media (max-width: 480px) {
          .auth-card {
            padding: 24px;
            margin: 10px;
          }
          
          .auth-title {
            font-size: 28px;
          }
          
          .logo {
            height: 80px;
          }
        }
      `}</style>
    </div>
  );
}