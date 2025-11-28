import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Zap, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password || !adminCode) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/admin/login`, {
        email,
        password,
        admin_code: adminCode,
      });

      if (response.data.success) {
        localStorage.setItem('admin_user', JSON.stringify(response.data.admin));
        toast.success('Admin login successful!');
        navigate('/admin/dashboard');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <Toaster position="top-right" richColors />
      
      <div className="admin-login-container">
        <Card className="admin-login-card">
          <div className="admin-login-header">
            <div className="admin-logo">
              <Shield size={48} className="admin-shield-icon" />
            </div>
            <h1 className="admin-login-title">Admin Access</h1>
            <p className="admin-login-subtitle">Business Owner Dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <Input
                id="email"
                type="email"
                placeholder="admin@cryptolend.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="admin-input"
                data-testid="admin-email-input"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="admin-input"
                  data-testid="admin-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="admin-code">Admin Code</label>
              <div className="password-input-wrapper">
                <Input
                  id="admin-code"
                  type={showCode ? 'text' : 'password'}
                  placeholder="Enter admin access code"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  className="admin-input"
                  data-testid="admin-code-input"
                />
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="password-toggle"
                >
                  {showCode ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="input-hint">Admin code: CRYPTOLEND_ADMIN_2025</p>
            </div>

            <div className="admin-notice">
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <strong>Note:</strong> Use your registered account email ({email || 'gads21083@gmail.com'}) and password.
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--warning)' }}>
                First time? Register an account first, then login here with the admin code.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="admin-login-btn"
              data-testid="admin-login-btn"
            >
              {loading ? 'Logging in...' : 'Access Dashboard'}
            </Button>
          </form>

          <div className="admin-login-footer">
            <button onClick={() => navigate('/register')} className="register-link" style={{ marginRight: '1rem', color: 'var(--accent-blue)' }}>
              Create Account First →
            </button>
            <button onClick={() => navigate('/')} className="back-link">
              ← Back to Platform
            </button>
          </div>
        </Card>

        <div className="admin-login-info">
          <div className="info-card">
            <Zap size={24} />
            <h3>Business Owner Portal</h3>
            <p>View all customers, manage disputes, and monitor platform activity</p>
          </div>
        </div>
      </div>
    </div>
  );
}
