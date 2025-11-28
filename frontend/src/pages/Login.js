import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Zap, Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

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

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
        if (response.data.id) {
          // Already logged in
          navigate('/dashboard');
        }
      } catch (error) {
        // Not logged in, continue
      }
    };
    
    // Handle Google OAuth callback
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('google_success') === 'true') {
      const token = urlParams.get('token');
      const userParam = urlParams.get('user');
      
      if (token && userParam) {
        try {
          const userData = JSON.parse(userParam);
          
          // Store user data and token
          localStorage.setItem('user', JSON.stringify(userData));
          localStorage.setItem('cryptobank_user', JSON.stringify(userData));
          localStorage.setItem('token', token);
          
          console.log('✅ Google login successful - stored user:', userData);
          toast.success('Logged in successfully with Google!');
          
          // Small delay then redirect
          setTimeout(() => {
            navigate('/wallet');
          }, 100);
        } catch (error) {
          console.error('Error parsing Google login data:', error);
          toast.error('Login failed. Please try again.');
        }
      }
    } else {
      checkSession();
    }
  }, [navigate, location]);

  // Google OAuth handling

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
      
      if (response.data.success && response.data.token) {
        // Store user data and token in localStorage
        const userData = {
          user_id: response.data.user.user_id,
          email: response.data.user.email,
          full_name: response.data.user.full_name || response.data.user.email,
          role: response.data.user.role || 'user'
        };
        
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('cryptobank_user', JSON.stringify(userData));
        localStorage.setItem('token', response.data.token);
        
        console.log('✅ Login successful - stored user:', userData);
        toast.success('Login successful!');
        
        // Small delay to ensure localStorage is written
        setTimeout(() => {
          navigate('/wallet');
        }, 100);
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

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      // Get the backend URL without /api, then add the full path
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://coinhubxrepo.preview.emergentagent.com';
      const redirectUrl = encodeURIComponent(`${backendUrl}/api/auth/google/callback`);
      const clientId = '823558232364-e4b48l01o9frh6vbltic2633fn3pgs0o.apps.googleusercontent.com';
      const scope = encodeURIComponent('openid email profile');
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUrl}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
      
      console.log('Google OAuth redirect URL:', redirectUrl);
      console.log('Redirecting to Google sign-in');
      window.location.href = authUrl;
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast.error('Failed to initiate Google sign-in');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-gradient"></div>
      
      <div className="auth-container">
        <div className="auth-header">
          <div className="logo" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="Coin Hub X" style={{ width: '40px', height: '40px', objectFit: 'contain', background: 'transparent', mixBlendMode: 'lighten' }} />
            <span>Coin Hub X</span>
          </div>
        </div>

        <Card className="auth-card" style={{ 
          background: 'linear-gradient(135deg, rgba(0, 30, 60, 0.95) 0%, rgba(0, 15, 35, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 217, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 217, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        }}>
          <div className="auth-card-content">
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #00D9FF 0%, #0099FF 100%)',
                marginBottom: '20px',
                boxShadow: '0 8px 24px rgba(0, 217, 255, 0.3)'
              }}>
                <ShieldCheck size={32} color="white" />
              </div>
              <h1 className="auth-title" style={{ 
                fontSize: '32px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #00D9FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '12px'
              }}>Welcome Back</h1>
              <p className="auth-subtitle" style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '15px',
                fontWeight: '400'
              }}>Log in to your Coin Hub X account</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
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
                    style={{ paddingRight: '45px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#888',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#00D9FF'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'right', marginTop: '-8px', marginBottom: '8px' }}>
                <Link 
                  to="/forgot-password" 
                  style={{ 
                    color: '#00D9FF', 
                    fontSize: '14px', 
                    textDecoration: 'none',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.target.style.opacity = '1'}
                >
                  Forgot Password?
                </Link>
              </div>

              <Button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Log In'}
              </Button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
              <span style={{ color: '#888', fontSize: '14px' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: '#fff',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                color: '#1A1F3A',
                fontSize: '16px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                transition: 'all 0.3s ease',
                opacity: loading ? 0.5 : 1
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
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>

            <div className="auth-footer">
              <p>
                Don't have an account?{' '}
                <Link to="/register" className="auth-link">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
