import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { IoEye, IoEyeOff, IoLockClosed, IoMail, IoPersonOutline, IoChevronDown, IoShield, IoCheckmarkCircle } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';
import API_BASE_URL from '@/config/api';

const API = API_BASE_URL;

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
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/api/auth/register`, {
        full_name: formData.full_name,
        email: formData.email,
        phone_number: formData.country_code + formData.phone_number,
        password: formData.password,
        referral_code: formData.referral_code || undefined
      });
      
      if (response.data.success) {
        toast.success('✅ Account created successfully! Please login.');
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = `${API}/auth/google`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A0E27 0%, #1a1f3a 50%, #0A0E27 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-20%',
        width: '800px',
        height: '800px',
        background: 'radial-gradient(circle, rgba(0, 240, 255, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        animation: 'float 20s ease-in-out infinite'
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        left: '-10%',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(155, 77, 255, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        animation: 'float 25s ease-in-out infinite reverse'
      }} />

      {/* Register Form */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* CHX Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src="/chx-logo-actual.jpeg" 
            alt="CoinHubX Logo" 
            style={{
              width: '120px',
              height: '120px',
              objectFit: 'contain',
              marginBottom: '24px',
              filter: 'drop-shadow(0 8px 24px rgba(0, 240, 255, 0.4))'
            }}
          />
          <h1 style={{
            fontSize: '36px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #00F0FF 0%, #00C6FF 50%, #9B4DFF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '10px',
            letterSpacing: '-1px',
            textShadow: '0 0 40px rgba(0, 240, 255, 0.3)'
          }}>Create Account</h1>
          <p style={{ color: '#B8C5D6', fontSize: '15px', fontWeight: '500' }}>Join CoinHubX and start trading crypto</p>
        </div>

        {/* Google Sign Up */}
        <button
          onClick={handleGoogleSignup}
          type="button"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(10, 25, 41, 0.8)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '14px',
            color: '#FFFFFF',
            fontSize: '15px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.3s',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.target.style.background = 'rgba(10, 25, 41, 0.95)';
              e.target.style.borderColor = 'rgba(0, 240, 255, 0.5)';
              e.target.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(10, 25, 41, 0.8)';
            e.target.style.borderColor = 'rgba(0, 240, 255, 0.3)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        {/* OR Divider with Neon Glow */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            flex: 1,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.5), transparent)',
            boxShadow: '0 0 8px rgba(0, 240, 255, 0.3)'
          }} />
          <span style={{
            color: '#00F0FF',
            fontSize: '13px',
            fontWeight: '700',
            textShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
          }}>OR</span>
          <div style={{
            flex: 1,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.5), transparent)',
            boxShadow: '0 0 8px rgba(0, 240, 255, 0.3)'
          }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <IoPersonOutline size={16} color="#00F0FF" />
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
              style={{
                width: '100%',
                padding: '13px 16px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(0, 240, 255, 0.4)',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.3s',
                boxSizing: 'border-box',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(0, 240, 255, 0.8)';
                e.target.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(0, 240, 255, 0.4)';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.2)';
              }}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <IoMail size={16} color="#00F0FF" />
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
              style={{
                width: '100%',
                padding: '13px 16px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(0, 240, 255, 0.4)',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.3s',
                boxSizing: 'border-box',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(0, 240, 255, 0.8)';
                e.target.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(0, 240, 255, 0.4)';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.2)';
              }}
            />
          </div>

          {/* Phone with Country Selector */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              📱 Phone Number
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  style={{
                    padding: '13px 12px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(0, 240, 255, 0.4)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    minWidth: '90px',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{countries.find(c => c.code === formData.country_code)?.flag}</span>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>{formData.country_code}</span>
                  <IoChevronDown size={14} />
                </button>
                {showCountryDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    background: 'rgba(10, 25, 41, 0.98)',
                    border: '1px solid rgba(0, 240, 255, 0.4)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    zIndex: 100,
                    minWidth: '140px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
                  }}>
                    {countries.map(country => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, country_code: country.code });
                          setShowCountryDropdown(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'transparent',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(0, 240, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>{country.flag}</span>
                        <span style={{ fontWeight: '600' }}>{country.code}</span>
                        <span style={{ color: '#8F9BB3', fontSize: '12px' }}>{country.name}</span>
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
                style={{
                  flex: 1,
                  padding: '13px 16px',
                  background: 'rgba(10, 25, 41, 0.8)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'all 0.3s',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(0, 240, 255, 0.8)';
                  e.target.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(0, 240, 255, 0.4)';
                  e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.2)';
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <IoLockClosed size={16} color="#00F0FF" />
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="Minimum 8 characters • Mix letters & numbers"
                style={{
                  width: '100%',
                  padding: '13px 50px 13px 16px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(0, 240, 255, 0.4)',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'all 0.3s',
                  boxSizing: 'border-box',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(0, 240, 255, 0.8)';
                  e.target.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(0, 240, 255, 0.4)';
                  e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.2)';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#00F0FF',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <IoCheckmarkCircle size={16} color="#00F0FF" />
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="Re-enter password to confirm"
                style={{
                  width: '100%',
                  padding: '13px 50px 13px 16px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: `1px solid ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'rgba(239, 68, 68, 0.6)' : 'rgba(0, 240, 255, 0.4)'}`,
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'all 0.3s',
                  boxSizing: 'border-box',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = formData.confirmPassword && formData.password !== formData.confirmPassword ? 'rgba(239, 68, 68, 0.8)' : 'rgba(0, 240, 255, 0.8)';
                  e.target.style.boxShadow = `0 0 20px ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'rgba(239, 68, 68, 0.3)' : 'rgba(0, 240, 255, 0.3)'}, inset 0 2px 4px rgba(0, 0, 0, 0.2)`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = formData.confirmPassword && formData.password !== formData.confirmPassword ? 'rgba(239, 68, 68, 0.6)' : 'rgba(0, 240, 255, 0.4)';
                  e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.2)';
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#00F0FF',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showConfirmPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
              </button>
            </div>
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '6px', fontWeight: '500' }}>⚠️ Passwords do not match</p>
            )}
          </div>

          {/* Referral Code */}
          {formData.referral_code && (
            <div style={{
              marginBottom: '20px',
              padding: '10px 14px',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: '#22C55E', fontSize: '13px', fontWeight: '700' }}>
                🎁 Referral: {formData.referral_code}
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              background: loading ? 'rgba(143, 155, 179, 0.3)' : 'linear-gradient(135deg, #00F0FF 0%, #00C6FF 50%, #9B4DFF 100%)',
              border: 'none',
              borderRadius: '14px',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: '800',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              boxShadow: loading ? 'none' : '0 6px 24px rgba(0, 240, 255, 0.5), 0 0 40px rgba(155, 77, 255, 0.3)',
              marginBottom: '18px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 32px rgba(0, 240, 255, 0.6), 0 0 60px rgba(155, 77, 255, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 6px 24px rgba(0, 240, 255, 0.5), 0 0 40px rgba(155, 77, 255, 0.3)';
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          {/* Login Link */}
          <p style={{
            textAlign: 'center',
            color: '#8F9BB3',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Already have an account?{' '}
            <Link
              to="/login"
              style={{
                color: '#00F0FF',
                fontWeight: '700',
                textDecoration: 'none',
                transition: 'all 0.3s',
                textShadow: '0 0 10px rgba(0, 240, 255, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#9B4DFF';
                e.target.style.textShadow = '0 0 10px rgba(155, 77, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#00F0FF';
                e.target.style.textShadow = '0 0 10px rgba(0, 240, 255, 0.3)';
              }}
            >
              Login
            </Link>
          </p>
        </form>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 12px 40px rgba(0, 240, 255, 0.5), 0 0 60px rgba(155, 77, 255, 0.3); }
          50% { box-shadow: 0 12px 40px rgba(0, 240, 255, 0.7), 0 0 80px rgba(155, 77, 255, 0.5); }
        }
        input::placeholder {
          color: rgba(184, 197, 214, 0.6) !important;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
