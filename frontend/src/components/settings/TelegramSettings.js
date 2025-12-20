import React, { useState, useEffect } from 'react';
import { IoClose, IoCheckmarkCircle, IoLink, IoUnlink, IoRefresh } from 'react-icons/io5';
import { FaTelegramPlane } from 'react-icons/fa';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const TelegramSettings = ({ user, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState({
    linked: false,
    username: null,
    chat_id: null
  });
  const [preferences, setPreferences] = useState({
    telegram_enabled: true,
    telegram_disputes_enabled: true,
    p2p_trades: true,
    deposits: true,
    withdrawals: true
  });

  useEffect(() => {
    fetchTelegramStatus();
    fetchPreferences();
  }, []);

  const fetchTelegramStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/api/telegram/status`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { user_id: user.user_id }
        }
      );
      
      if (response.data.success) {
        setTelegramStatus({
          linked: response.data.linked,
          username: response.data.telegram_username,
          chat_id: response.data.telegram_chat_id
        });
      }
    } catch (error) {
      console.error('Failed to fetch Telegram status:', error);
    }
  };

  const fetchPreferences = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/api/telegram/notification-settings`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { user_id: user.user_id }
        }
      );
      
      if (response.data.success) {
        setPreferences(response.data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    }
  };

  const handleConnectTelegram = async () => {
    setLinkLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/api/telegram/link-url`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { user_id: user.user_id }
        }
      );
      
      if (response.data.success) {
        if (response.data.already_linked) {
          toast.info(`Already linked to @${response.data.telegram_username}`);
        } else {
          // Open Telegram link
          window.open(response.data.link_url, '_blank');
          toast.success('Opening Telegram... Click START in the bot!');
          
          // Poll for link completion
          setTimeout(() => {
            fetchTelegramStatus();
          }, 5000);
        }
      }
    } catch (error) {
      toast.error('Failed to generate Telegram link');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    if (!window.confirm('Are you sure you want to unlink your Telegram account?')) {
      return;
    }
    
    setLinkLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/api/telegram/unlink`,
        { user_id: user.user_id },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success('Telegram unlinked successfully');
        setTelegramStatus({ linked: false, username: null, chat_id: null });
      }
    } catch (error) {
      toast.error('Failed to unlink Telegram');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API}/api/telegram/notification-settings`,
        {
          user_id: user.user_id,
          settings: preferences
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success('✅ Telegram preferences saved!');
      }
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const ToggleSwitch = ({ enabled, onChange, label, description, disabled }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      background: 'rgba(0, 0, 0, 0.2)',
      border: '1px solid rgba(0, 240, 255, 0.2)',
      borderRadius: '12px',
      marginBottom: '12px',
      opacity: disabled ? 0.5 : 1
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
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        style={{
          width: '52px',
          height: '28px',
          borderRadius: '14px',
          background: enabled ? 'linear-gradient(135deg, #00F0FF, #9B4DFF)' : 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
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
        border: '2px solid rgba(0, 136, 204, 0.4)',
        borderRadius: '20px',
        maxWidth: '550px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 0 40px rgba(0, 136, 204, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(0, 136, 204, 0.2)',
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
            <IoLogoTelegram size={28} color="#0088cc" />
            Telegram Notifications
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
          {/* Connection Status */}
          <div style={{
            background: telegramStatus.linked 
              ? 'linear-gradient(135deg, rgba(0, 200, 83, 0.1), rgba(0, 136, 204, 0.1))' 
              : 'rgba(255, 255, 255, 0.05)',
            border: telegramStatus.linked 
              ? '2px solid rgba(0, 200, 83, 0.4)' 
              : '2px dashed rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            {telegramStatus.linked ? (
              <>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00C853, #0088cc)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 0 30px rgba(0, 200, 83, 0.4)'
                }}>
                  <IoCheckmarkCircle size={32} color="#fff" />
                </div>
                <h3 style={{ color: '#00C853', margin: '0 0 8px', fontSize: '18px' }}>
                  Connected to Telegram
                </h3>
                <p style={{ color: '#aaa', margin: '0 0 16px', fontSize: '14px' }}>
                  @{telegramStatus.username || 'Unknown'}
                </p>
                <button
                  onClick={handleUnlinkTelegram}
                  disabled={linkLoading}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(255, 100, 100, 0.2)',
                    border: '1px solid rgba(255, 100, 100, 0.4)',
                    borderRadius: '10px',
                    color: '#ff6464',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: linkLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '0 auto'
                  }}
                >
                  <IoUnlink size={18} />
                  {linkLoading ? 'Unlinking...' : 'Unlink Telegram'}
                </button>
              </>
            ) : (
              <>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(0, 136, 204, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <IoLogoTelegram size={32} color="#0088cc" />
                </div>
                <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: '18px' }}>
                  Connect Your Telegram
                </h3>
                <p style={{ color: '#888', margin: '0 0 16px', fontSize: '14px' }}>
                  Get instant notifications for trades, disputes & more
                </p>
                <button
                  onClick={handleConnectTelegram}
                  disabled={linkLoading}
                  style={{
                    padding: '14px 28px',
                    background: 'linear-gradient(135deg, #0088cc, #00aced)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: linkLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    margin: '0 auto',
                    boxShadow: '0 4px 20px rgba(0, 136, 204, 0.4)'
                  }}
                >
                  <IoLink size={20} />
                  {linkLoading ? 'Generating Link...' : 'Connect Telegram'}
                </button>
              </>
            )}
          </div>

          {/* Notification Preferences */}
          {telegramStatus.linked && (
            <>
              <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '16px' }}>
                Notification Preferences
              </h3>

              <ToggleSwitch
                enabled={preferences.telegram_enabled}
                onChange={(val) => setPreferences({ ...preferences, telegram_enabled: val })}
                label="📱 Enable Telegram Notifications"
                description="Master switch for all Telegram alerts"
              />

              <ToggleSwitch
                enabled={preferences.telegram_disputes_enabled}
                onChange={(val) => setPreferences({ ...preferences, telegram_disputes_enabled: val })}
                label="⚠️ Dispute Alerts"
                description="Get notified when disputes are raised or resolved"
                disabled={!preferences.telegram_enabled}
              />

              <ToggleSwitch
                enabled={preferences.p2p_trades}
                onChange={(val) => setPreferences({ ...preferences, p2p_trades: val })}
                label="🤝 P2P Trade Updates"
                description="New trades, payment confirmations, completions"
                disabled={!preferences.telegram_enabled}
              />

              <ToggleSwitch
                enabled={preferences.deposits}
                onChange={(val) => setPreferences({ ...preferences, deposits: val })}
                label="💰 Deposit Alerts"
                description="Get notified when deposits are confirmed"
                disabled={!preferences.telegram_enabled}
              />

              <ToggleSwitch
                enabled={preferences.withdrawals}
                onChange={(val) => setPreferences({ ...preferences, withdrawals: val })}
                label="💸 Withdrawal Alerts"
                description="Get notified about withdrawal status"
                disabled={!preferences.telegram_enabled}
              />

              <button
                onClick={handleSavePreferences}
                disabled={loading}
                style={{
                  width: '100%',
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
                  marginTop: '20px',
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
            </>
          )}

          {/* Refresh Button */}
          <button
            onClick={fetchTelegramStatus}
            style={{
              width: '100%',
              padding: '12px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              color: '#888',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '16px'
            }}
          >
            <IoRefresh size={18} />
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
};

export default TelegramSettings;
