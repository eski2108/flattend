import React, { useState, useEffect } from 'react';
import { IoClose, IoNotifications, IoCheckmarkCircle } from 'react-icons/io5';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const NotificationSettings = ({ user, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    security_alerts: true,
    transaction_alerts: true,
    system_announcements: true,
    marketing: false,
    p2p_updates: true,
    price_alerts: true
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/api/user/notifications/preferences`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { user_id: user.user_id }
        }
      );
      
      if (response.data.success) {
        setPreferences(response.data.preferences);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API}/api/user/notifications/preferences`,
        {
          user_id: user.user_id,
          preferences: preferences
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success('✅ Notification preferences saved!');
        setTimeout(() => onClose(), 1000);
      }
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const ToggleSwitch = ({ enabled, onChange, label, description }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      background: 'rgba(0, 0, 0, 0.2)',
      border: '1px solid rgba(0, 240, 255, 0.2)',
      borderRadius: '12px',
      marginBottom: '12px'
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>
          {label}
        </p>
        <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
          {description}
        </p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        style={{
          width: '52px',
          height: '28px',
          borderRadius: '14px',
          background: enabled ? 'linear-gradient(135deg, #00F0FF, #9B4DFF)' : 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.3s',
          boxShadow: enabled ? '0 0 20px rgba(0, 240, 255, 0.5)' : 'none'
        }}
      >
        <div style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: '#1a1f3a',
          position: 'absolute',
          top: '3px',
          left: enabled ? '27px' : '3px',
          transition: 'all 0.3s',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }} />
      </button>
    </div>
  );

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
      zIndex: 99999999,
      padding: '20px'
    }}>
      <div style={{
        background: '#1a1f3a',
        border: '2px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '20px',
        maxWidth: '550px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
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
            <IoNotifications size={28} color="#00F0FF" />
            Notification Preferences
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

        <div style={{ padding: '24px' }}>
          <ToggleSwitch
            enabled={preferences.security_alerts}
            onChange={(val) => setPreferences({ ...preferences, security_alerts: val })}
            label="🔒 Security Alerts"
            description="Login attempts, password changes, 2FA changes, withdrawals"
          />

          <ToggleSwitch
            enabled={preferences.transaction_alerts}
            onChange={(val) => setPreferences({ ...preferences, transaction_alerts: val })}
            label="💸 Transaction Alerts"
            description="Completed trades, deposits, withdrawals, swaps"
          />

          <ToggleSwitch
            enabled={preferences.p2p_updates}
            onChange={(val) => setPreferences({ ...preferences, p2p_updates: val })}
            label="🤝 P2P Order Updates"
            description="New offers, order status, chat messages, disputes"
          />

          <ToggleSwitch
            enabled={preferences.price_alerts}
            onChange={(val) => setPreferences({ ...preferences, price_alerts: val })}
            label="📈 Price Alerts"
            description="Custom price alerts and market movements"
          />

          <ToggleSwitch
            enabled={preferences.system_announcements}
            onChange={(val) => setPreferences({ ...preferences, system_announcements: val })}
            label="📢 System Announcements"
            description="Platform updates, maintenance, new features"
          />

          <ToggleSwitch
            enabled={preferences.marketing}
            onChange={(val) => setPreferences({ ...preferences, marketing: val })}
            label="🎁 Marketing & Promotions"
            description="Special offers, referral bonuses, trading competitions"
          />

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
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
              onClick={handleSave}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(0, 240, 255, 0.4)'
              }}
            >
              {loading ? 'Saving...' : (
                <>
                  <IoCheckmarkCircle size={20} />
                  Save Preferences
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
