import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { IoCard as CreditCard, IoGlobe as Globe, IoLockClosed as Lock, IoLogOut, IoMail, IoNotifications as Bell, IoPersonOutline as User, IoPhonePortrait as Smartphone, IoShield as Shield, IoTrendingUp, IoCheckmarkCircle } from 'react-icons/io5';
import { toast } from 'sonner';
import CurrencySelector from '@/components/CurrencySelector';
import PriceAlerts from '@/components/PriceAlerts';
import MobileBottomNav from '@/components/MobileBottomNav';

// Settings Components
import ProfileSettings from '@/components/settings/ProfileSettings';
import EmailSettings from '@/components/settings/EmailSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';
import TwoFactorSettings from '@/components/settings/TwoFactorSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import TelegramSettings from '@/components/settings/TelegramSettings';
import LanguageSettings from '@/components/settings/LanguageSettings';
import PaymentMethodsManager from '@/components/settings/PaymentMethodsManager';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Settings() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmailAlerts, setLoginEmailAlerts] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeModal]);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/');
      return;
    }
    
    const user = JSON.parse(userData);
    setCurrentUser(user);
    
    fetchSecuritySettings();
  }, [navigate]);

  const handleVerifySeller = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/monetization/verify-seller`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: currentUser?.user_id })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        window.location.reload();
      } else {
        toast.error(data.detail || 'Failed to verify seller');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to verify seller');
    }
  };

  const fetchSecuritySettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/user/security/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLoginEmailAlerts(data.settings.login_email_alerts_enabled);
      }
    } catch (error) {
      console.error('Failed to fetch security settings:', error);
    }
  };

  const updateSecuritySettings = async (login_email_alerts_enabled) => {
    try {
      setLoadingSettings(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/user/security/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ login_email_alerts_enabled })
      });

      if (response.ok) {
        setLoginEmailAlerts(login_email_alerts_enabled);
        toast.success('Security settings updated successfully');
      } else {
        toast.error('Failed to update security settings');
      }
    } catch (error) {
      console.error('Failed to update security settings:', error);
      toast.error('Failed to update security settings');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cryptobank_user');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    toast.success('Logged out successfully');
    navigate('/');
  };

  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ border: '4px solid rgba(0, 240, 255, 0.1)', borderTop: '4px solid #00F0FF', borderRadius: '50%', width: '50px', height: '50px', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  const settingSections = [
    {
      title: 'Account',
      items: [
        { 
          icon: User, 
          label: 'Profile', 
          description: 'Manage your personal information', 
          action: () => setActiveModal('profile'),
          dataTestId: 'btn-profile-settings'
        },
        { 
          icon: Lock, 
          label: 'Security', 
          description: 'Password and security settings', 
          action: () => setActiveModal('security'),
          dataTestId: 'btn-security-settings'
        },
        { 
          icon: Shield, 
          label: 'Two-Factor Authentication', 
          description: '2FA for enhanced security', 
          action: () => setActiveModal('2fa'),
          dataTestId: 'btn-2fa-settings'
        }
      ]
    },
    {
      title: 'Preferences',
      items: [
        { 
          icon: Bell, 
          label: 'Notifications', 
          description: 'Manage notification preferences', 
          action: () => setActiveModal('notifications'),
          dataTestId: 'btn-notification-settings'
        },
        { 
          icon: Smartphone, 
          label: 'Telegram', 
          description: 'Connect Telegram for instant alerts', 
          action: () => setActiveModal('telegram'),
          dataTestId: 'btn-telegram-settings'
        },
        { 
          icon: Globe, 
          label: 'Language', 
          description: currentUser.language ? `${currentUser.language.toUpperCase()}` : 'English', 
          action: () => setActiveModal('language'),
          dataTestId: 'btn-language-settings'
        }
      ]
    },
    {
      title: 'Payment',
      items: [
        { 
          icon: CreditCard, 
          label: 'Payment Methods', 
          description: 'Manage P2P payment methods', 
          action: () => setActiveModal('payment'),
          dataTestId: 'btn-payment-methods'
        }
      ]
    },
    {
      title: 'P2P Trading',
      items: [
        { 
          icon: IoTrendingUp, 
          label: 'Become a Seller', 
          description: 'Start selling on P2P marketplace', 
          action: handleVerifySeller, 
          highlight: true,
          dataTestId: 'btn-become-seller'
        }
      ]
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', padding: '3rem 2rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Premium Header with Logo */}
        <div style={{ 
          marginBottom: '3rem',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          paddingBottom: '2rem',
          borderBottom: '1px solid rgba(0, 240, 255, 0.1)'
        }}>
          <img 
            src="/logo1-transparent.png" 
            alt="CoinHubX" 
            style={{
              width: '60px',
              height: '60px',
              objectFit: 'contain'
            }}
          />
          <div style={{ flex: 1 }}>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              color: '#fff', 
              marginBottom: '0.5rem',
              letterSpacing: '-0.5px'
            }}>
              Settings
            </h1>
            <p style={{ color: '#888', fontSize: '15px', marginBottom: 0 }}>
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        {/* Premium Profile Card */}
        <Card style={{
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '16px',
          padding: '2.5rem',
          marginBottom: '3rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', flexDirection: 'column' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '3px solid rgba(0, 240, 255, 0.3)',
              margin: '0 auto'
            }}>
              <span style={{ fontSize: '32px', fontWeight: '700', color: '#000' }}>
                {(currentUser.full_name || currentUser.name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div style={{ width: '100%' }}>
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ 
                  color: '#00F0FF', 
                  fontSize: '11px', 
                  marginBottom: '0.75rem', 
                  display: 'block', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px',
                  fontWeight: '600'
                }}>Full Name</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'stretch', flexDirection: 'column' }}>
                  <input
                    type="text"
                    value={currentUser.full_name || currentUser.name || ''}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setCurrentUser({...currentUser, full_name: newName});
                    }}
                    disabled={loadingSettings}
                    data-testid="input-full-name"
                    style={{
                      flex: 1,
                      padding: '1rem 1.25rem',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '17px',
                      fontWeight: '600',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(0, 240, 255, 0.6)';
                      e.target.style.background = 'rgba(0, 0, 0, 0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                      e.target.style.background = 'rgba(0, 0, 0, 0.4)';
                    }}
                  />
                  <button
                    onClick={async () => {
                      const newName = (currentUser.full_name || currentUser.name || '').trim();
                      if (!newName) {
                        toast.error('Please enter a name');
                        return;
                      }
                      setLoadingSettings(true);
                      try {
                        const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                          },
                          body: JSON.stringify({
                            user_id: currentUser.user_id,
                            full_name: newName
                          })
                        });
                        const data = await response.json();
                        if (data.success) {
                          toast.success('✓ Name saved successfully');
                          const updatedUser = {...currentUser, full_name: newName};
                          setCurrentUser(updatedUser);
                          localStorage.setItem('cryptobank_user', JSON.stringify(updatedUser));
                        } else {
                          toast.error('Failed to save name');
                        }
                      } catch (error) {
                        toast.error('Failed to save name');
                      } finally {
                        setLoadingSettings(false);
                      }
                    }}
                    disabled={loadingSettings}
                    data-testid="btn-save-name"
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: loadingSettings ? '#666' : 'linear-gradient(135deg, #00F0FF, #0099CC)',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#000',
                      fontSize: '15px',
                      fontWeight: '700',
                      cursor: loadingSettings ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!loadingSettings) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 240, 255, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {loadingSettings ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              
              {/* Email - Locked */}
              <div>
                <label style={{ 
                  color: '#888', 
                  fontSize: '11px', 
                  marginBottom: '0.75rem', 
                  display: 'block', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px',
                  fontWeight: '600'
                }}>Email Address</label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(100, 100, 100, 0.3)',
                  borderRadius: '10px'
                }}>
                  <Lock size={18} color="#666" />
                  <span style={{ color: '#aaa', fontSize: '17px', fontWeight: '500', flex: 1 }}>{currentUser.email}</span>
                  <span style={{ 
                    fontSize: '10px', 
                    color: '#666', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px',
                    padding: '4px 8px',
                    background: 'rgba(100, 100, 100, 0.2)',
                    borderRadius: '4px'
                  }}>Locked</span>
                </div>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '0.75rem', marginBottom: 0, lineHeight: '1.5' }}>
                  Email cannot be changed for security reasons. Contact support if you need to update your email address.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Settings Sections */}
        {settingSections.map((section, sectionIdx) => (
          <div key={sectionIdx} style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ 
              color: '#fff', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '1rem', 
              paddingLeft: '4px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {section.title}
            </h3>
            <Card style={{
              background: 'rgba(26, 31, 58, 0.5)',
              border: '1px solid rgba(0, 240, 255, 0.15)',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              {section.items.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={item.action}
                    data-testid={item.dataTestId}
                    style={{
                      width: '100%',
                      padding: '1.5rem 1.75rem',
                      borderBottom: idx < section.items.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.25rem',
                      background: item.highlight ? 'rgba(0, 240, 255, 0.05)' : 'transparent',
                      border: 'none',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 240, 255, 0.08)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = item.highlight ? 'rgba(0, 240, 255, 0.05)' : 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'rgba(0, 240, 255, 0.1)',
                      border: '1px solid rgba(0, 240, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon size={22} color="#00F0FF" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                        {item.label}
                      </div>
                      <div style={{ color: '#888', fontSize: '13px', lineHeight: '1.4' }}>
                        {item.description}
                      </div>
                    </div>
                    <div style={{ color: '#00F0FF', fontSize: '20px', opacity: 0.6 }}>→</div>
                  </button>
                );
              })}
            </Card>
          </div>
        ))}

        {/* Currency Selector */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ 
            color: '#fff', 
            fontSize: '14px', 
            fontWeight: '600', 
            marginBottom: '1rem', 
            paddingLeft: '4px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Display Currency
          </h3>
          <CurrencySelector />
        </div>

        {/* Price Alerts */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ 
            color: '#fff', 
            fontSize: '14px', 
            fontWeight: '600', 
            marginBottom: '1rem', 
            paddingLeft: '4px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Price Alerts
          </h3>
          <PriceAlerts />
        </div>

        {/* Security Settings */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ 
            color: '#fff', 
            fontSize: '14px', 
            fontWeight: '600', 
            marginBottom: '1rem', 
            paddingLeft: '4px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Login Notifications
          </h3>
          <Card style={{
            background: 'rgba(26, 31, 58, 0.5)',
            border: '1px solid rgba(0, 240, 255, 0.15)',
            borderRadius: '12px',
            padding: '1.5rem 1.75rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem'
            }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(0, 240, 255, 0.1)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IoMail size={22} color="#00F0FF" />
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                    Email Login Alerts
                  </div>
                  <div style={{ color: '#888', fontSize: '13px' }}>
                    Get notified when someone logs into your account
                  </div>
                </div>
              </div>
              <button
                onClick={() => updateSecuritySettings(!loginEmailAlerts)}
                disabled={loadingSettings}
                data-testid="toggle-login-alerts"
                style={{
                  position: 'relative',
                  width: '52px',
                  height: '28px',
                  borderRadius: '14px',
                  border: 'none',
                  cursor: loadingSettings ? 'not-allowed' : 'pointer',
                  background: loginEmailAlerts ? '#00F0FF' : '#333',
                  transition: 'background 0.3s ease',
                  flexShrink: 0
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  left: loginEmailAlerts ? '27px' : '3px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {loginEmailAlerts && <IoCheckmarkCircle size={14} color="#00F0FF" />}
                </div>
              </button>
            </div>
          </Card>
        </div>

        {/* Mobile App - Coming Soon */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ 
            color: '#fff', 
            fontSize: '14px', 
            fontWeight: '600', 
            marginBottom: '1rem', 
            paddingLeft: '4px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Mobile App
          </h3>
          <Card style={{
            background: 'rgba(26, 31, 58, 0.5)',
            border: '1px solid rgba(100, 100, 100, 0.3)',
            borderRadius: '12px',
            padding: '2.5rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(100, 100, 100, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <Smartphone size={40} color="#666" />
            </div>
            <h4 style={{ color: '#aaa', fontSize: '18px', fontWeight: '600', marginBottom: '0.75rem' }}>
              Mobile App Coming Soon
            </h4>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: 0, maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
              iOS and Android apps are currently in development. You'll be notified when they're available.
            </p>
          </Card>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          data-testid="btn-logout"
          style={{
            width: '100%',
            padding: '1rem',
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '700',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.opacity = '1';
          }}
        >
          <IoLogOut size={20} />
          Log Out
        </button>

        {/* App Version */}
        <div style={{ textAlign: 'center', marginTop: '2rem', color: '#555', fontSize: '12px' }}>
          CoinHubX v2.0.0 • Premium Exchange Platform
        </div>
      </div>

      {/* Settings Modals - Rendered using Portal with proper cleanup */}
      {activeModal === 'profile' && ReactDOM.createPortal(
        <ProfileSettings
          user={currentUser}
          onClose={() => {
            setActiveModal(null);
          }}
          onUpdate={(updatedUser) => setCurrentUser(updatedUser)}
        />,
        document.body
      )}
      {activeModal === 'email' && ReactDOM.createPortal(
        <EmailSettings
          user={currentUser}
          onClose={() => setActiveModal(null)}
        />,
        document.body
      )}
      {activeModal === 'security' && ReactDOM.createPortal(
        <SecuritySettings
          user={currentUser}
          onClose={() => setActiveModal(null)}
        />,
        document.body
      )}
      {activeModal === '2fa' && ReactDOM.createPortal(
        <TwoFactorSettings
          user={currentUser}
          onClose={() => setActiveModal(null)}
          onUpdate={(updatedUser) => setCurrentUser(updatedUser)}
        />,
        document.body
      )}
      {activeModal === 'notifications' && ReactDOM.createPortal(
        <NotificationSettings
          user={currentUser}
          onClose={() => setActiveModal(null)}
        />,
        document.body
      )}
      {activeModal === 'telegram' && ReactDOM.createPortal(
        <TelegramSettings
          user={currentUser}
          onClose={() => setActiveModal(null)}
        />,
        document.body
      )}
      {activeModal === 'language' && ReactDOM.createPortal(
        <LanguageSettings
          user={currentUser}
          onClose={() => setActiveModal(null)}
        />,
        document.body
      )}
      {activeModal === 'payment' && ReactDOM.createPortal(
        <PaymentMethodsManager
          user={currentUser}
          onClose={() => setActiveModal(null)}
        />,
        document.body
      )}
    </div>
  );
}
