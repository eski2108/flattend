import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IoCheckmark as Check, IoCheckmarkCircle, IoShield } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function AdminSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Register the user
      const response = await axios.post(`${API}/auth/register`, {
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName
      });

      if (response.data.success) {
        toast.success('Account created successfully!');
        setStep(2);
      }
    } catch (error) {
      console.error('Error registering:', error);
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-setup-page">
      <Toaster position="top-right" richColors />
      
      <div className="setup-container">
        <Card className="setup-card">
          {step === 1 ? (
            <>
              <div className="setup-header">
                <IoShield size={64} className="setup-icon" />
                <h1 className="setup-title">Create Admin Account</h1>
                <p className="setup-subtitle">Set up your business owner account</p>
              </div>

              <form onSubmit={handleRegister} className="setup-form">
                <div className="input-group">
                  <label htmlFor="fullName">Full Name *</label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    required
                    className="setup-input"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="email">Email Address *</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@yourcompany.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                    className="setup-input"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="password">Password *</label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    className="setup-input"
                  />
                  <p className="input-hint">At least 6 characters</p>
                </div>

                <div className="input-group">
                  <label htmlFor="confirmPassword">Confirm Password *</label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    required
                    className="setup-input"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="setup-btn"
                >
                  {loading ? 'Creating Account...' : 'Create Admin Account'}
                </Button>
              </form>

              <div className="setup-footer">
                <p className="footer-note">Already have an account?</p>
                <Button variant="link" onClick={() => navigate('/admin/login')}>
                  Go to Admin Login
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="success-header">
                <IoCheckmarkCircle size={64} className="success-icon" />
                <h1 className="success-title">Account Created!</h1>
                <p className="success-subtitle">You can now access the admin dashboard</p>
              </div>

              <div className="credentials-box">
                <h3>Your Login Credentials:</h3>
                <div className="credential-item">
                  <span className="credential-label">Email:</span>
                  <span className="credential-value">{formData.email}</span>
                </div>
                <div className="credential-item">
                  <span className="credential-label">Password:</span>
                  <span className="credential-value">(the one you just created)</span>
                </div>
                <div className="credential-item">
                  <span className="credential-label">Admin Code:</span>
                  <span className="credential-value code">CRYPTOLEND_ADMIN_2025</span>
                </div>
              </div>

              <div className="important-note">
                <h4>⚠️ Important:</h4>
                <p>Save these credentials securely. You'll need the admin code to access the business dashboard.</p>
              </div>

              <Button
                onClick={() => navigate('/admin/login')}
                className="goto-login-btn"
              >
                Go to Admin Login →
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
