import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoCheckmark as Check, IoCheckmarkCircle, IoEye, IoEyeOff, IoLockClosed } from 'react-icons/io5';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const resetToken = searchParams.get('token');

  useEffect(() => {
    if (!resetToken) {
      toast.error('Invalid reset link');
      navigate('/login');
    }
  }, [resetToken, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/auth/reset-password`, {
        reset_token: resetToken,
        new_password: newPassword
      });

      if (response.data.success) {
        setSuccess(true);
        toast.success('Password reset successfully!');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.formCard}>
          <div style={styles.successContainer}>
            <div style={styles.successIcon}>
              <IoCheckmarkCircle size={60} style={{color: '#10B981'}} />
            </div>
            <h1 style={styles.successTitle}>Password Reset Complete!</h1>
            <p style={styles.successText}>
              Your password has been successfully reset.
              Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <div style={styles.header}>
          <div style={styles.iconWrapper}>
            <IoLockClosed size={40} style={{color: '#00D9FF'}} />
          </div>
          <h1 style={styles.title}>Reset Password</h1>
          <p style={styles.subtitle}>Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>New Password</label>
            <div style={styles.inputWrapper}>
              <IoLockClosed size={20} style={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                style={styles.input}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
              </button>
            </div>
            <span style={styles.hint}>Minimum 6 characters</span>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Confirm Password</label>
            <div style={styles.inputWrapper}>
              <IoLockClosed size={20} style={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
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
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
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
    fontSize: '16px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
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
    padding: '15px 50px 15px 45px',
    background: '#0A0E27',
    border: '2px solid #00D9FF40',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '16px',
    outline: 'none',
    transition: 'all 0.3s ease'
  },
  eyeButton: {
    position: 'absolute',
    right: '15px',
    background: 'none',
    border: 'none',
    color: '#8B9DC3',
    cursor: 'pointer',
    padding: '5px',
    display: 'flex',
    alignItems: 'center'
  },
  hint: {
    color: '#8B9DC3',
    fontSize: '12px'
  },
  submitButton: {
    background: 'linear-gradient(135deg, #00D9FF, #A855F7)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    marginTop: '10px'
  },
  successContainer: {
    textAlign: 'center',
    padding: '20px'
  },
  successIcon: {
    marginBottom: '20px'
  },
  successTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '15px'
  },
  successText: {
    color: '#8B9DC3',
    fontSize: '16px',
    lineHeight: '1.6'
  }
};