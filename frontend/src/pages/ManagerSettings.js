import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoKey, IoLockClosed, IoNotifications, IoPerson, IoSettings, IoShield } from 'react-icons/io5';
import Layout from '@/components/Layout';

const API = process.env.REACT_APP_BACKEND_URL;

export default function ManagerSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    twoFactorEnabled: false,
    emailNotifications: true,
    pushNotifications: false,
    referralTier: 'standard'
  });

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userData));
    loadSettings();
  }, [navigate]);

  const loadSettings = async () => {
    try {
      // Load user settings from API
      setLoading(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '2rem', color: '#FFF' }}>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0A0E27 0%, #1a1f3a 100%)',
        padding: '2rem'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>
            Manager Settings
          </h1>
          <p style={{ color: '#8F9BB3', fontSize: '14px' }}>
            Manage your account, security, and referral settings
          </p>
        </div>

        {/* Settings Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Profile Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <IoPerson size={24} color="#00F0FF" />
              <h2 style={{ color: '#FFF', fontSize: '18px', fontWeight: '700' }}>Profile</h2>
            </div>
            <div style={{ color: '#8F9BB3', fontSize: '14px' }}>
              <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
              <p><strong>User ID:</strong> {user?.user_id?.slice(0, 8) || 'N/A'}</p>
            </div>
          </div>

          {/* Security Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <IoShield size={24} color="#00F0FF" />
              <h2 style={{ color: '#FFF', fontSize: '18px', fontWeight: '700' }}>Security</h2>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#FFF', marginBottom: '0.5rem' }}>
                <span>2FA Authentication</span>
                <span style={{ color: settings.twoFactorEnabled ? '#22C55E' : '#EF4444' }}>
                  {settings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
            <button
              onClick={() => toast.info('Password change coming soon')}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
                border: 'none',
                borderRadius: '10px',
                color: '#000',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Change Password
            </button>
          </div>

          {/* Referral Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <IoKey size={24} color="#00F0FF" />
              <h2 style={{ color: '#FFF', fontSize: '18px', fontWeight: '700' }}>Referral Tier</h2>
            </div>
            <div style={{
              padding: '12px',
              background: 'rgba(0, 240, 255, 0.1)',
              borderRadius: '10px',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              textAlign: 'center'
            }}>
              <span style={{
                color: '#00F0FF',
                fontSize: '18px',
                fontWeight: '700',
                textTransform: 'uppercase'
              }}>
                {settings.referralTier}
              </span>
              <p style={{ color: '#8F9BB3', fontSize: '12px', marginTop: '0.5rem' }}>
                20% commission on all fees
              </p>
            </div>
          </div>

          {/* Notifications Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <IoNotifications size={24} color="#00F0FF" />
              <h2 style={{ color: '#FFF', fontSize: '18px', fontWeight: '700' }}>Notifications</h2>
            </div>
            <div style={{ color: '#8F9BB3', fontSize: '14px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Email Notifications</span>
                <span style={{ color: settings.emailNotifications ? '#22C55E' : '#EF4444' }}>
                  {settings.emailNotifications ? 'On' : 'Off'}
                </span>
              </label>
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Push Notifications</span>
                <span style={{ color: settings.pushNotifications ? '#22C55E' : '#EF4444' }}>
                  {settings.pushNotifications ? 'On' : 'Off'}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
