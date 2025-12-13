import React, { useState } from 'react';
import { IoClose, IoCheckmarkCircle, IoPerson, IoMail, IoCall, IoGlobe } from 'react-icons/io5';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const ProfileSettings = ({ user, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user.full_name || user.name || '',
    username: user.username || '',
    phone_number: user.phone_number || '',
    country: user.country || 'United Kingdom'
  });
  
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.full_name || formData.full_name.length < 2) {
      newErrors.full_name = 'Name must be at least 2 characters';
    }
    
    if (formData.username && formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (formData.username && !/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
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
      const response = await axios.put(
        `${API}/api/user/profile`,
        {
          user_id: user.user_id,
          full_name: formData.full_name,
          username: formData.username,
          country: formData.country
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        toast.success('✅ Profile updated successfully!');
        
        const updatedUser = { ...user, ...formData };
        localStorage.setItem('cryptobank_user', JSON.stringify(updatedUser));
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        if (onUpdate) onUpdate(updatedUser);
        
        setTimeout(() => onClose(), 1000);
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.response?.data?.detail || 'Failed to update profile');
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
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px',
      overflow: 'auto'
    }}>
      <div style={{
        background: '#1a1f3a',
        border: '2px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '20px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 0 40px rgba(0, 240, 255, 0.3)',
        margin: 'auto'
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
            <IoPerson size={28} color="#00F0FF" />
            Profile Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#aaa',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <IoClose size={28} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
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
              <IoPerson size={16} color="#00F0FF" />
              Full Name *
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: `1px solid ${errors.full_name ? '#FF4444' : 'rgba(0, 240, 255, 0.4)'}`,
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {errors.full_name && (
              <p style={{ color: '#FF4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.full_name}
              </p>
            )}
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
              <IoPerson size={16} color="#00F0FF" />
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Optional"
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: `1px solid ${errors.username ? '#FF4444' : 'rgba(0, 240, 255, 0.4)'}`,
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {errors.username && (
              <p style={{ color: '#FF4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.username}
              </p>
            )}
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
              <IoGlobe size={16} color="#00F0FF" />
              Country
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(0, 240, 255, 0.4)',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer'
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
                background: loading ? '#666' : 'linear-gradient(135deg, #00F0FF, #0099CC)',
                border: 'none',
                borderRadius: '12px',
                color: '#000',
                fontSize: '15px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;