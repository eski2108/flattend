import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import CHXButton from '@/components/CHXButton';

import API_BASE_URL from '@/config/api';
const API = API_BASE_URL;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        localStorage.setItem('cryptobank_user', JSON.stringify(response.data.user));
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
        toast.success('✅ Logged in successfully!');
        navigate('/dashboard');
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #05121F 0%, #0A1F2E 50%, #051018 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Elements */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(0, 198, 255, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        animation: 'float 8s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '10%',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(123, 44, 255, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        animation: 'float 10s ease-in-out infinite reverse'
      }} />

      {/* Login Card */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: 'linear-gradient(135deg, rgba(10, 25, 41, 0.95) 0%, rgba(5, 16, 24, 0.95) 100%)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        border: '1px solid rgba(0, 229, 255, 0.3)',
        borderRadius: '28px',
        padding: '40px 44px',
        boxShadow: '0 0 50px rgba(0, 229, 255, 0.25), 0 25px 80px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden'
      }}>
        {/* Top Glow Decoration */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          height: '3px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(0, 229, 255, 0.8) 50%, transparent 100%)',
          boxShadow: '0 0 20px rgba(0, 229, 255, 0.6)',
          borderRadius: '0 0 50% 50%'
        }} />
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '28px' }}>
          {/* Main Logo with Premium Glow */}
          <div 
            onClick={() => navigate('/')} 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              cursor: 'pointer',
              position: 'relative',
              padding: '10px'
            }}
          >
            {/* Glow Effect Circle Behind Logo */}
            <div style={{
              position: 'absolute',
              width: '180px',
              height: '180px',
              background: 'radial-gradient(circle, rgba(0, 229, 255, 0.25) 0%, rgba(0, 198, 255, 0.1) 40%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(30px)',
              animation: 'pulse 3s ease-in-out infinite',
              zIndex: 0
            }} />
            
            <img 
              src="/logo1-transparent.png" 
              alt="Coin Hub X" 
              style={{ 
                height: '95px', 
                width: 'auto',
                filter: 'drop-shadow(0 0 35px rgba(0, 229, 255, 0.9)) drop-shadow(0 0 70px rgba(0, 198, 255, 0.6)) drop-shadow(0 10px 40px rgba(0, 0, 0, 0.5))',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                zIndex: 1
              }} 
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.08) translateY(-5px)';
                e.target.style.filter = 'drop-shadow(0 0 50px rgba(0, 229, 255, 1)) drop-shadow(0 0 100px rgba(0, 198, 255, 0.8)) drop-shadow(0 15px 50px rgba(0, 0, 0, 0.6))';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1) translateY(0)';
                e.target.style.filter = 'drop-shadow(0 0 35px rgba(0, 229, 255, 0.9)) drop-shadow(0 0 70px rgba(0, 198, 255, 0.6)) drop-shadow(0 10px 40px rgba(0, 0, 0, 0.5))';
              }}
            />
          </div>
          
          {/* Welcome Text with Enhanced Styling */}
          <h1 style={{ 
            fontSize: '36px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #00E5FF 40%, #00C6FF 70%, #0080FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '6px',
            letterSpacing: '0.8px',
            lineHeight: '1.2',
            textShadow: '0 0 40px rgba(0, 229, 255, 0.3)'
          }}>
            Welcome Back
          </h1>
          <p style={{ 
            color: '#A3AEC2',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '26px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            opacity: 0.9
          }}>
            Premium Crypto Exchange Platform
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          {/* Email Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: '600',
              marginBottom: '10px',
              letterSpacing: '0.2px'
            }}>
              <Mail size={18} color="#00E5FF" strokeWidth={2.8} style={{ filter: 'brightness(1.15)', transform: 'translateY(-2px)' }} />
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '18px 20px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                borderRadius: '14px',
                color: '#FFFFFF',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontFamily: 'Inter, sans-serif',
                fontWeight: '500',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(0, 229, 255, 0.6)';
                e.target.style.boxShadow = '0 0 25px rgba(0, 229, 255, 0.2), inset 0 0 20px rgba(0, 229, 255, 0.05)';
                e.target.style.background = 'rgba(0, 0, 0, 0.5)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(0, 229, 255, 0.25)';
                e.target.style.boxShadow = 'none';
                e.target.style.background = 'rgba(0, 0, 0, 0.4)';
              }}
            />
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: '600',
              marginBottom: '10px',
              letterSpacing: '0.2px'
            }}>
              <Lock size={18} color="#00E5FF" strokeWidth={2.8} style={{ filter: 'brightness(1.15)', transform: 'translateY(-2px)' }} />
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '18px 55px 18px 20px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(0, 229, 255, 0.25)',
                  borderRadius: '14px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '500',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(0, 229, 255, 0.6)';
                  e.target.style.boxShadow = '0 0 25px rgba(0, 229, 255, 0.2), inset 0 0 20px rgba(0, 229, 255, 0.05)';
                  e.target.style.background = 'rgba(0, 0, 0, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(0, 229, 255, 0.25)';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = 'rgba(0, 0, 0, 0.4)';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0, 229, 255, 0.1)',
                  border: '1px solid rgba(0, 229, 255, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: '#00E5FF',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  width: '36px',
                  height: '36px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 229, 255, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.5)';
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 229, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 229, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.3)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {showPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div style={{ textAlign: 'right', marginBottom: '20px' }}>
            <Link 
              to="/forgot-password" 
              style={{ 
                color: '#00C6FF', 
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
                textShadow: '0 0 10px rgba(0, 198, 255, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#00E5FF';
                e.target.style.textShadow = '0 0 15px rgba(0, 229, 255, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#00C6FF';
                e.target.style.textShadow = '0 0 10px rgba(0, 198, 255, 0.3)';
              }}
            >
              Forgot Password?
            </Link>
          </div>

          {/* Login Button */}
          <CHXButton
            type="submit"
            disabled={loading}
            coinColor="#00C6FF"
            variant="primary"
            size="large"
            fullWidth
          >
            {loading ? 'Logging in...' : 'Log In'}
          </CHXButton>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', margin: '24px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(0, 229, 255, 0.3) 50%, transparent 100%)' }} />
          <span style={{ 
            color: '#00E5FF', 
            fontSize: '13px', 
            fontWeight: '700', 
            textTransform: 'uppercase', 
            letterSpacing: '1.5px',
            padding: '0 8px',
            textShadow: '0 0 15px rgba(0, 229, 255, 0.5)'
          }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(0, 229, 255, 0.3) 50%, transparent 100%)' }} />
        </div>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #0A1929 0%, #0D2137 100%)',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            borderRadius: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 20px rgba(0, 229, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '16px',
            fontWeight: '600',
            color: '#FFFFFF',
            opacity: loading ? 0.6 : 1,
            boxSizing: 'border-box'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = 'linear-gradient(135deg, #0D2137 0%, #0A1929 100%)';
              e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.6)';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 229, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.background = 'linear-gradient(135deg, #0A1929 0%, #0D2137 100%)';
              e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.3)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 229, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span style={{ letterSpacing: '0.3px' }}>Continue with Google</span>
        </button>

        {/* Sign Up Link */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ color: '#8F9BB3', fontSize: '15px', marginBottom: 0 }}>
            Don't have an account?{' '}
            <Link 
              to="/register" 
              style={{ 
                color: '#00C6FF',
                fontWeight: '700',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
                textShadow: '0 0 10px rgba(0, 198, 255, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#00E5FF';
                e.target.style.textShadow = '0 0 15px rgba(0, 229, 255, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#00C6FF';
                e.target.style.textShadow = '0 0 10px rgba(0, 198, 255, 0.3)';
              }}
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, 20px); }
        }
        
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.6;
          }
          50% { 
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
        
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #FFFFFF !important;
          -webkit-box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.4) inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
}
