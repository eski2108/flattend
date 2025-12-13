import React, { useState } from 'react';
import { IoClose, IoMail, IoLockClosed, IoCheckmarkCircle } from 'react-icons/io5';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const EmailSettings = ({ user, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('input'); // 'input' | 'verification'
  const [formData, setFormData] = useState({
    newEmail: '',
    password: ''
  });
  const [errors, setErrors] = useState({});

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.newEmail) {
      newErrors.newEmail = 'Email is required';
    } else if (!validateEmail(formData.newEmail)) {
      newErrors.newEmail = 'Invalid email format';
    } else if (formData.newEmail === user.email) {
      newErrors.newEmail = 'This is already your current email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required for verification';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/api/user/email/change-request`,
        {
          user_id: user.user_id,
          new_email: formData.newEmail,
          current_password: formData.password
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        toast.success(`📧 Verification email sent to ${formData.newEmail}`);
        setStep('verification');
      }
    } catch (error) {
      console.error('Email change error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to send verification email';
      
      if (errorMsg.includes('password')) {
        setErrors({ ...errors, password: 'Incorrect password' });
      } else if (errorMsg.includes('email') && errorMsg.includes('use')) {
        setErrors({ ...errors, newEmail: 'This email is already in use' });
      }
      
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
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
      zIndex: 99999999,
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(26, 31, 58, 0.95), rgba(19, 24, 41, 0.95))',
        border: '2px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '20px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 0 40px rgba(0, 240, 255, 0.3)'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '800',
            color: '#FFFFFF',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <IoMail size={28} color="#00F0FF" />
            Email Settings
          </h2>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            padding: '8px'
          }}>
            <IoClose size={28} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {step === 'input' ? (
            <form onSubmit={handleSubmit}>
              <div style={{
                padding: '16px',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <p style={{ color: '#00F0FF', fontSize: '14px', margin: 0 }}>
                  <strong>Current Email:</strong> {user.email}
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}>
                  <IoMail size={16} color="#00F0FF" />
                  New Email Address *
                </label>
                <input
                  type="email"
                  value={formData.newEmail}
                  onChange={(e) => setFormData({ ...formData, newEmail: e.target.value })}
                  placeholder="newemail@example.com"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: `1px solid ${errors.newEmail ? '#FF4444' : 'rgba(0, 240, 255, 0.4)'}`,
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.newEmail && (
                  <p style={{ color: '#FF4444', fontSize: '12px', marginTop: '4px' }}>
                    {errors.newEmail}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}>
                  <IoLockClosed size={16} color="#00F0FF" />
                  Current Password *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password to confirm"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: `1px solid ${errors.password ? '#FF4444' : 'rgba(0, 240, 255, 0.4)'}`,
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.password && (
                  <p style={{ color: '#FF4444', fontSize: '12px', marginTop: '4px' }}>
                    {errors.password}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: loading ? 'rgba(0, 240, 255, 0.3)' : 'linear-gradient(135deg, #00F0FF 0%, #9B4DFF 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 4px 20px rgba(0, 240, 255, 0.4)'
                  }}
                >
                  {loading ? 'Sending...' : 'Send Verification Email'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #00F0FF, #9B4DFF)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 0 40px rgba(0, 240, 255, 0.5)'
              }}>
                <IoCheckmarkCircle size={48} color="#FFFFFF" />
              </div>
              <h3 style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>
                Verification Email Sent!
              </h3>
              <p style={{ color: '#B8C5D6', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>
                We've sent a verification link to:<br />
                <strong style={{ color: '#00F0FF' }}>{formData.newEmail}</strong>
              </p>
              <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
                Click the link in the email to complete the email change.
              </p>
              <button
                onClick={onClose}
                style={{
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #00F0FF 0%, #9B4DFF 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(0, 240, 255, 0.4)'
                }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailSettings;
