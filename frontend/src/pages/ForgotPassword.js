import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Send } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/forgot-password`, {
        email: email.trim().toLowerCase()
      });

      if (response.data.success) {
        setSent(true);
        toast.success('Password reset link sent to your email!');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error(error.response?.data?.detail || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <Link to="/login" style={styles.backLink}>
          <ArrowLeft size={20} />
          <span>Back to Login</span>
        </Link>

        <div style={styles.header}>
          <div style={styles.iconWrapper}>
            <Mail size={40} style={{color: '#00D9FF'}} />
          </div>
          <h1 style={styles.title}>Forgot Password?</h1>
          <p style={styles.subtitle}>
            {sent 
              ? "Check your email for the reset link" 
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address</label>
              <div style={styles.inputWrapper}>
                <Mail size={20} style={styles.inputIcon} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={styles.input}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                ...styles.submitButton,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div style={styles.spinner}></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Send Reset Link
                </>
              )}
            </button>
          </form>
        ) : (
          <div style={styles.successBox}>
            <div style={styles.checkmark}>✓</div>
            <p style={styles.successText}>
              If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
            </p>
            <p style={styles.hintText}>
              Check your spam folder if you don't see it in your inbox.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={styles.backToLoginBtn}
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0A0E27 0%, #1A1F3A 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  formCard: {
    background: 'linear-gradient(135deg, #1A1F3A 0%, #0F1629 100%)',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '480px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0, 217, 255, 0.15)',
    border: '1px solid rgba(0, 217, 255, 0.2)'
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: '#8B9DC3',
    textDecoration: 'none',
    fontSize: '14px',
    marginBottom: '30px',
    transition: 'all 0.3s ease'
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  iconWrapper: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #00D9FF20, #A855F720)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    border: '2px solid #00D9FF40'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '10px'
  },
  subtitle: {
    color: '#8B9DC3',
    fontSize: '16px',
    lineHeight: '1.5'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    color: '#8B9DC3',
    fontSize: '14px',
    fontWeight: '600'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '15px',
    color: '#00D9FF',
    pointerEvents: 'none'
  },
  input: {
    width: '100%',
    padding: '15px 15px 15px 45px',
    background: '#0A0E27',
    border: '2px solid #00D9FF40',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '16px',
    outline: 'none',
    transition: 'all 0.3s ease'
  },
  submitButton: {
    background: 'linear-gradient(135deg, #00D9FF, #A855F7)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.3s ease',
    marginTop: '10px'
  },
  successBox: {
    textAlign: 'center',
    padding: '20px'
  },
  checkmark: {
    width: '60px',
    height: '60px',
    background: 'linear-gradient(135deg, #10B981, #059669)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px',
    color: '#fff',
    margin: '0 auto 20px',
    fontWeight: 'bold'
  },
  successText: {
    color: '#fff',
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '15px'
  },
  hintText: {
    color: '#8B9DC3',
    fontSize: '14px',
    marginBottom: '30px'
  },
  backToLoginBtn: {
    background: 'linear-gradient(135deg, #00D9FF, #A855F7)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 30px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255,255,255,0.3)',
    borderTop: '3px solid #fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};