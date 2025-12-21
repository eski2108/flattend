import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { IoEye, IoEyeOff, IoLockClosed, IoMail, IoPersonOutline, IoChevronDown, IoShield, IoCheckmarkCircle } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';
const API = process.env.REACT_APP_BACKEND_URL;

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref') || '';
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirmPassword: '',
    referral_code: referralCode,
    country_code: '+44'
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const countries = [
    { code: '+44', flag: '🇬🇧', name: 'UK' },
    { code: '+1', flag: '🇺🇸', name: 'US' },
    { code: '+91', flag: '🇮🇳', name: 'India' },
    { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔴 SUBMIT BUTTON CLICKED');
    console.log('API URL:', API);
    console.log('Form data:', formData);
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    console.log('🔴 Making API call...');
    
    try {
      const requestData = {
        full_name: formData.full_name,
        email: formData.email,
        phone_number: formData.country_code + formData.phone_number,
        password: formData.password,
        referral_code: formData.referral_code || undefined
      };
      
      console.log('🔴 Request data:', requestData);
      
      const response = await axios.post(`${API}/api/auth/register`, requestData);
      
      console.log('🔴 Response received:', response.data);
      
      if (response.data.success) {
        console.log('🔴 Registration successful!');
        
        if (response.data.phone_verification_required) {
          console.log('🔵 VERIFICATION REQUIRED - Setting up verification screen');
          console.log('🔵 Test code:', response.data.test_verification_code);
          
          // Store test code in state if provided
          if (response.data.test_verification_code) {
            console.log('🔵 Setting verification code in state');
            setVerificationCode(response.data.test_verification_code);
            
            toast.success(`📱 CODE: ${response.data.test_verification_code}`, { 
              duration: 30000,
              position: 'top-center',
              style: {
                background: '#00FF9D',
                color: '#000',
                fontSize: '24px',
                fontWeight: 'bold',
                padding: '30px'
              }
            });
          }
          
          // Show verification step - CRITICAL
          console.log('🔵 Setting user email:', formData.email);
          setUserEmail(formData.email);
          
          console.log('🔵 About to set verificationStep to TRUE');
          setVerificationStep(true);
          
          // Force React to re-render by updating multiple states
          console.log('🔵 Verification step set to TRUE');
          console.log('🔵 Current verificationStep state should be TRUE now');
        } else {
          console.log('🔴 No verification required, going to login');
          toast.success('✅ Account created successfully! Please login.');
          setTimeout(() => navigate('/login'), 1500);
        }
      } else {
        console.log('🔴 Registration response success=false');
        toast.error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('🔴 ERROR during registration:', error);
      console.error('🔴 Error response:', error.response?.data);
      toast.error(error.response?.data?.detail || error.message || 'Registration failed');
    } finally {
      console.log('🔴 Setting loading to false');
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    if (!verificationCode || verificationCode.length < 4) {
      toast.error('Please enter a valid verification code');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/api/auth/verify-phone`, {
        email: userEmail,
        code: verificationCode
      });
      
      if (response.data.success) {
        toast.success('✅ Phone verified! You can now login.');
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = `${API}/api/auth/google`;
  };

  // Phone Verification View
  if (verificationStep) {
    return (
      <div className="register-container">
        {/* Animated Background Elements */}
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />

        {/* Premium Glassmorphic Card */}
        <div className="auth-card">
          {/* Verification Header */}
          <div className="verification-header">
            <div className="verification-icon">
              <IoShield size={60} />
            </div>
            <h1 className="auth-title">Verify Your Phone</h1>
            <p className="auth-subtitle">
              We've sent a verification code to your phone.<br/>
              Please enter it below to complete registration.
            </p>
          </div>

          {/* Verification Form */}
          <form onSubmit={handleVerifyCode} className="verification-form">
            {/* Verification Code Input */}
            <div className="input-group">
              <label className="input-label">
                <IoCheckmarkCircle size={16} className="label-icon" />
                Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                disabled={loading}
                placeholder="Enter 6-digit code"
                maxLength="6"
                className="auth-input verification-input"
              />
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || verificationCode.length < 4}
              className={`auth-button primary ${(loading || verificationCode.length < 4) ? 'disabled' : ''}`}
            >
              {loading ? 'Verifying...' : 'Verify & Complete Registration'}
            </button>

            {/* Back Link */}
            <p className="auth-footer">
              Didn't receive the code?{' '}
              <button
                type="button"
                onClick={() => setVerificationStep(false)}
                className="auth-link-button"
              >
                Try again
              </button>
            </p>
          </form>
        </div>

        <style jsx>{getStyles()}</style>
      </div>
    );
  }

  return (
    <div className="register-container">
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
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join CoinHubX and start trading crypto</p>
        </div>

        {/* Google Sign Up */}
        <button
          onClick={handleGoogleSignup}
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

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Full Name */}
          <div className="input-group">
            <label className="input-label">
              <IoPersonOutline size={16} className="label-icon" />
              Full Name
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="John Doe"
              className="auth-input"
            />
          </div>

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

          {/* Phone with Country Selector */}
          <div className="input-group">
            <label className="input-label">
              📱 Phone Number
            </label>
            <div className="phone-input-wrapper">
              <div className="country-selector">
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="country-button"
                >
                  <span className="country-flag">{countries.find(c => c.code === formData.country_code)?.flag}</span>
                  <span className="country-code">{formData.country_code}</span>
                  <IoChevronDown size={14} className="dropdown-icon" />
                </button>
                {showCountryDropdown && (
                  <div className="country-dropdown">
                    {countries.map(country => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, country_code: country.code });
                          setShowCountryDropdown(false);
                        }}
                        className="country-option"
                      >
                        <span className="country-flag">{country.flag}</span>
                        <span className="country-code">{country.code}</span>
                        <span className="country-name">{country.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="7700 900000"
                className="auth-input phone-input"
              />
            </div>
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
                placeholder="Minimum 8 characters • Mix letters & numbers"
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

          {/* Confirm Password */}
          <div className="input-group">
            <label className="input-label">
              <IoCheckmarkCircle size={16} className="label-icon" />
              Confirm Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="Re-enter password to confirm"
                className={`auth-input password-input ${
                  formData.confirmPassword && formData.password !== formData.confirmPassword ? 'error' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="password-toggle"
              >
                {showConfirmPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
              </button>
            </div>
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <div className="error-message">
                ⚠️ Passwords do not match
              </div>
            )}
          </div>

          {/* Referral Code */}
          {formData.referral_code && (
            <div className="referral-badge">
              <span className="referral-text">
                🎁 Referral: {formData.referral_code}
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`auth-button primary ${loading ? 'disabled' : ''}`}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          {/* Login Link */}
          <p className="auth-footer">
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Login
            </Link>
          </p>
        </form>
      </div>

      <style jsx>{getStyles()}</style>
    </div>
  );
}

// Styles function to avoid duplication
function getStyles() {
  return `
    .register-container {
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
      max-width: 480px;
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

    .verification-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .verification-icon {
      margin-bottom: 20px;
      color: #00E5FF;
      filter: drop-shadow(0 0 20px rgba(0, 229, 255, 0.6));
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

    .auth-form, .verification-form {
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

    .auth-input.error {
      border-color: rgba(239, 68, 68, 0.6);
    }

    .auth-input.error:focus {
      border-color: rgba(239, 68, 68, 0.8);
      box-shadow: 
        0 0 0 3px rgba(239, 68, 68, 0.1),
        0 0 20px rgba(239, 68, 68, 0.2);
    }

    .verification-input {
      font-size: 20px;
      letter-spacing: 8px;
      text-align: center;
      font-weight: 700;
    }

    .phone-input-wrapper {
      display: flex;
      gap: 8px;
    }

    .country-selector {
      position: relative;
    }

    .country-button {
      padding: 16px 12px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(0, 229, 255, 0.3);
      border-radius: 16px;
      color: #FFFFFF;
      font-size: 15px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 100px;
      backdrop-filter: blur(10px);
      transition: all 0.3s;
    }

    .country-button:hover {
      border-color: rgba(0, 229, 255, 0.5);
    }

    .country-flag {
      font-size: 18px;
    }

    .country-code {
      font-size: 14px;
      font-weight: 600;
    }

    .dropdown-icon {
      margin-left: auto;
      color: #00E5FF;
    }

    .country-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      background: rgba(10, 25, 41, 0.98);
      border: 1px solid rgba(0, 229, 255, 0.4);
      border-radius: 16px;
      overflow: hidden;
      z-index: 100;
      min-width: 160px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(20px);
    }

    .country-option {
      width: 100%;
      padding: 12px 16px;
      background: transparent;
      border: none;
      color: #FFFFFF;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .country-option:hover {
      background: rgba(0, 229, 255, 0.1);
    }

    .country-name {
      color: rgba(143, 155, 179, 0.8);
      font-size: 12px;
      margin-left: auto;
    }

    .phone-input {
      flex: 1;
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

    .error-message {
      color: rgba(239, 68, 68, 0.9);
      font-size: 12px;
      margin-top: 6px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .referral-badge {
      margin-bottom: 20px;
      padding: 12px 16px;
      background: rgba(34, 197, 94, 0.12);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .referral-text {
      color: #22C55E;
      font-size: 13px;
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

    .auth-link-button {
      background: none;
      border: none;
      color: #00E5FF;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.3s;
      padding: 0;
      font-size: inherit;
    }

    .auth-link-button:hover {
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
        max-width: calc(100vw - 20px);
      }
      
      .auth-title {
        font-size: 28px;
      }
      
      .logo {
        height: 80px;
      }
      
      .phone-input-wrapper {
        flex-direction: column;
        gap: 12px;
      }
      
      .country-button {
        width: 100%;
        justify-content: space-between;
      }
    }
  `;
}