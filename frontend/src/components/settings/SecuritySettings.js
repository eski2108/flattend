import React, { useState } from 'react';
import { IoClose, IoLockClosed, IoCheckmarkCircle, IoEye, IoEyeOff } from 'react-icons/io5';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const SecuritySettings = ({ user, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword)) {
      newErrors.newPassword = 'Password must contain uppercase, lowercase, and numbers';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (formData.newPassword === formData.currentPassword) {
      newErrors.newPassword = 'New password must be different from current password';
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
        `${API}/api/user/security/change-password`,
        {
          user_id: user.user_id,
          current_password: formData.currentPassword,
          new_password: formData.newPassword
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        toast.success('✅ Password changed successfully!');
        setTimeout(() => onClose(), 1000);
      }
    } catch (error) {
      console.error('Password change error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to change password';
      
      if (errorMsg.includes('current password') || errorMsg.includes('incorrect')) {
        setErrors({ ...errors, currentPassword: 'Incorrect current password' });
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
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#FFFFFF',
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
            color: '#000000',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <IoLockClosed size={28} color="#00F0FF" />
            Change Password
          </h2>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            padding: '8px'
          }}>
            <IoClose size={28} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Current Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#000000',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '8px',
              textTransform: 'uppercase'
            }}>
              <IoLockClosed size={16} color="#00F0FF" />
              Current Password *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                style={{
                  width: '100%',
                  padding: '14px 48px 14px 16px',
                  background: '#F5F5F5',
                  border: `1px solid ${errors.currentPassword ? '#FF4444' : 'rgba(0, 240, 255, 0.4)'}`,
                  borderRadius: '12px',
                  color: '#000000',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#00F0FF',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPasswords.current ? <IoEyeOff size={20} /> : <IoEye size={20} />}
              </button>
            </div>
            {errors.currentPassword && (
              <p style={{ color: '#FF4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.currentPassword}
              </p>
            )}
          </div>

          {/* New Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#000000',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '8px',
              textTransform: 'uppercase'
            }}>
              <IoLockClosed size={16} color="#00F0FF" />
              New Password *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder="Minimum 8 characters, mixed case & numbers"
                style={{
                  width: '100%',
                  padding: '14px 48px 14px 16px',
                  background: '#F5F5F5',
                  border: `1px solid ${errors.newPassword ? '#FF4444' : 'rgba(0, 240, 255, 0.4)'}`,
                  borderRadius: '12px',
                  color: '#000000',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#00F0FF',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPasswords.new ? <IoEyeOff size={20} /> : <IoEye size={20} />}
              </button>
            </div>
            {errors.newPassword && (
              <p style={{ color: '#FF4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.newPassword}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#000000',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '8px',
              textTransform: 'uppercase'
            }}>
              <IoCheckmarkCircle size={16} color="#00F0FF" />
              Confirm New Password *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                style={{
                  width: '100%',
                  padding: '14px 48px 14px 16px',
                  background: '#F5F5F5',
                  border: `1px solid ${errors.confirmPassword ? '#FF4444' : 'rgba(0, 240, 255, 0.4)'}`,
                  borderRadius: '12px',
                  color: '#000000',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#00F0FF',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPasswords.confirm ? <IoEyeOff size={20} /> : <IoEye size={20} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p style={{ color: '#FF4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.confirmPassword}
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
                color: '#000000',
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
                color: '#000000',
                fontSize: '15px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(0, 240, 255, 0.4)'
              }}
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SecuritySettings;
