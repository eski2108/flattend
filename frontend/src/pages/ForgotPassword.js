import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, IoArrowBack, IoCheckmark as Check, IoCheckmarkCircle, IoMail, Mail } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';
import CHXButton from '@/components/CHXButton';

const API = 'https://coinhubx.net/api';
// API already defined

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/forgot-password`, { email });
      
      if (response.data.success) {
        setEmailSent(true);
        toast.success('✅ Password reset instructions sent!');
      } else {
        toast.error(response.data.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error(error.response?.data?.message || 'Failed to send reset instructions');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05121F 0%, #0A1F2E 50%, #051018 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '480px',
          background: 'linear-gradient(135deg, rgba(10, 25, 41, 0.95) 0%, rgba(5, 16, 24, 0.95) 100%)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(0, 229, 255, 0.3)',
          borderRadius: '28px',
          padding: '56px 48px',
          boxShadow: '0 0 50px rgba(0, 229, 255, 0.25)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 32px',
            background: 'rgba(0, 229, 255, 0.15)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(0, 229, 255, 0.4)',
            boxShadow: '0 0 30px rgba(0, 229, 255, 0.3)'
          }}>
            <IoCheckmarkCircle size={40} color="#00E5FF" strokeWidth={2.5} />
          </div>
          
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#FFFFFF',
            marginBottom: '16px'
          }}>
            Check Your Email
          </h1>
          
          <p style={{
            color: '#8F9BB3',
            fontSize: '16px',
            lineHeight: '1.6',
            marginBottom: '32px'
          }}>
            We've sent password reset instructions to <strong style={{ color: '#00E5FF' }}>{email}</strong>
          </p>
          
          <CHXButton
            onClick={() => navigate('/login')}
            coinColor="#00C6FF"
            variant="primary"
            size="large"
            fullWidth
          >
            Back to Login
          </CHXButton>
          
          <p style={{
            color: '#8F9BB3',
            fontSize: '14px',
            marginTop: '24px'
          }}>
            Didn't receive the email?{' '}
            <button
              onClick={() => setEmailSent(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#00C6FF',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Try again
            </button>
          </p>
        </div>
      </div>
    );
  }

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
      {/* Animated Background */}
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

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: 'linear-gradient(135deg, rgba(10, 25, 41, 0.95) 0%, rgba(5, 16, 24, 0.95) 100%)',
        backdropFilter: 'blur(30px)',
        border: '1px solid rgba(0, 229, 255, 0.3)',
        borderRadius: '28px',
        padding: '56px 48px',
        boxShadow: '0 0 50px rgba(0, 229, 255, 0.25)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Back Button */}
        <Link
          to="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#00C6FF',
            fontSize: '14px',
            fontWeight: '600',
            textDecoration: 'none',
            marginBottom: '32px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#00E5FF';
            e.currentTarget.style.transform = 'translateX(-5px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#00C6FF';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          <IoArrowBack size={18} />
          Back to Login
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '38px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #00E5FF 50%, #0080FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '12px'
          }}>
            Forgot Password?
          </h1>
          <p style={{
            color: '#8F9BB3',
            fontSize: '16px',
            fontWeight: '500',
            lineHeight: '1.5'
          }}>
            No worries! Enter your email and we'll send you reset instructions.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '28px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: '600',
              marginBottom: '10px'
            }}>
              <IoMail size={18} color="#00E5FF" strokeWidth={2.5} />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
                transition: 'all 0.3s ease',
                fontFamily: 'Inter, sans-serif',
                fontWeight: '500',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(0, 229, 255, 0.6)';
                e.target.style.boxShadow = '0 0 25px rgba(0, 229, 255, 0.2)';
                e.target.style.background = 'rgba(0, 0, 0, 0.5)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(0, 229, 255, 0.25)';
                e.target.style.boxShadow = 'none';
                e.target.style.background = 'rgba(0, 0, 0, 0.4)';
              }}
            />
          </div>

          <CHXButton
            type="submit"
            disabled={loading}
            coinColor="#00C6FF"
            variant="primary"
            size="large"
            fullWidth
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </CHXButton>
        </form>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, 20px); }
        }
      `}</style>
    </div>
  );
}
