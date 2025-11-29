import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Zap, Mail, Lock, Chrome } from 'lucide-react';
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
      const response = await axios.post(`${API}/api/auth/login`, formData);
      
      if (response.data.success && response.data.token) {
        const userData = {
          user_id: response.data.user.user_id,
          email: response.data.user.email,
          full_name: response.data.user.full_name || response.data.user.email,
          role: response.data.user.role || 'user'
        };
        
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('cryptobank_user', JSON.stringify(userData));
        localStorage.setItem('token', response.data.token);
        
        toast.success('✅ Login successful!');
        setTimeout(() => navigate('/dashboard'), 500);
      } else {
        toast.error('Login failed - no authentication token received');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    try {
      setLoading(true);
      const backendUrl = API.replace('/api', '');
      window.location.href = `${backendUrl}/api/auth/google`;
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
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        animation: 'float 10s ease-in-out infinite reverse'
      }} />

      {/* Login Card */}
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: 'linear-gradient(135deg, rgba(10, 25, 41, 0.95) 0%, rgba(5, 16, 24, 0.98) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 198, 255, 0.25)',
        borderRadius: '24px',
        padding: '48px 40px',
        boxShadow: '0 0 40px rgba(0, 198, 255, 0.2), 0 20px 60px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div 
            onClick={() => navigate('/')} 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              cursor: 'pointer'
            }}
          >
            <img 
              src="/logo1-transparent.png" 
              alt="Coin Hub X" 
              style={{ 
                height: '64px', 
                width: 'auto',
                filter: 'drop-shadow(0 0 20px rgba(0, 198, 255, 0.6))'
              }} 
            />
          </div>
          
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #00C6FF 0%, #0080FF 100%)',
            marginBottom: '24px',
            boxShadow: '0 0 30px rgba(0, 198, 255, 0.4), 0 8px 24px rgba(0, 198, 255, 0.3)'
          }}>
            <ShieldCheck size={40} color="white" strokeWidth={2.5} />
          </div>
          
          <h1 style={{ 
            fontSize: '36px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #00C6FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '12px',
            letterSpacing: '-0.5px'
          }}>Welcome Back</h1>
          
          <p style={{
            color: 'rgba(255, 255, 255, 0.65)',
            fontSize: '16px',
            fontWeight: '400',
            lineHeight: '1.5'
          }}>Secure access to your crypto portfolio</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
          {/* Email Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '8px'
            }}>
              <Mail size={16} color="#00C6FF" />
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
                padding: '16px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(0, 198, 255, 0.2)',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s',
                fontFamily: 'Inter, sans-serif'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(0, 198, 255, 0.5)';
                e.target.style.boxShadow = '0 0 20px rgba(0, 198, 255, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(0, 198, 255, 0.2)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '8px'
            }}>
              <Lock size={16} color="#00C6FF" />
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
                  padding: '16px',
                  paddingRight: '50px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 198, 255, 0.2)',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  fontFamily: 'Inter, sans-serif'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(0, 198, 255, 0.5)';
                  e.target.style.boxShadow = '0 0 20px rgba(0, 198, 255, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(0, 198, 255, 0.2)';
                  e.target.style.boxShadow = 'none';
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
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#8F9BB3',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#00C6FF'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#8F9BB3'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div style={{ textAlign: 'right', marginBottom: '24px' }}>
            <Link 
              to="/forgot-password" 
              style={{ 
                color: '#00C6FF', 
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.7'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              Forgot Password?
            </Link>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '18px 20px',
              background: loading ? 'rgba(0, 198, 255, 0.5)' : 'linear-gradient(135deg, #00C6FF, #0080FF)',
              border: 'none',
              borderRadius: '14px',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 0 20px rgba(0, 198, 255, 0.4)',
              fontFamily: 'Inter, sans-serif'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.filter = 'brightness(1.1)';
                e.target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.filter = 'brightness(1.0)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '32px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: '#8F9BB3', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Google Sign In */}
        <CHXButton
          onClick={handleGoogleSignIn}
          disabled={loading}
          coinColor="#FFFFFF"
          variant="secondary"
          size="large"
          fullWidth
          icon={<Chrome size={20} />}
        >
          Continue with Google
        </CHXButton>

        {/* Sign Up Link */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <span style={{ color: '#8F9BB3', fontSize: '15px' }}>Don&apos;t have an account? </span>
          <Link 
            to="/register" 
            style={{ 
              color: '#00C6FF', 
              fontSize: '15px',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.7'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            Sign Up
          </Link>
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
      `}</style>
    </div>
  );
}
