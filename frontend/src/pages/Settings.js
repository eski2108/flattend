import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { IoCard as CreditCard, IoGlobe as Globe, IoLockClosed as Lock, IoLogOut, IoMail, IoNotifications, IoNotifications as Bell, IoPersonOutline as User, IoPhonePortrait as Smartphone, IoShield as Shield, IoTrendingUp } from 'react-icons/io5';
import { toast } from 'sonner';
import CurrencySelector from '@/components/CurrencySelector';
import PriceAlerts from '@/components/PriceAlerts';
import PremiumDownloadButtons from '@/components/PremiumDownloadButtons';

// Settings Components
import ProfileSettings from '@/components/settings/ProfileSettings';
import EmailSettings from '@/components/settings/EmailSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';
import TwoFactorSettings from '@/components/settings/TwoFactorSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import LanguageSettings from '@/components/settings/LanguageSettings';
import PaymentMethodsManager from '@/components/settings/PaymentMethodsManager';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Settings() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmailAlerts, setLoginEmailAlerts] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'profile' | 'email' | 'security' | '2fa' | 'notifications' | 'language' | 'payment'

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/');
      return;
    }
    
    const user = JSON.parse(userData);
    setCurrentUser(user);
    
    // Fetch security settings
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
        // Refresh user data
        window.location.reload();
      } else {
        toast.error(data.detail || 'Failed to verify seller');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to verify seller');
    }
  };

  const handleUpgradeLevel = async (level) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/monetization/upgrade-seller-level`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          user_id: currentUser?.user_id,
          target_level: level
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        // Refresh user data
        window.location.reload();
      } else {
        toast.error(data.detail || 'Failed to upgrade level');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to upgrade level');
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
        { icon: User, label: 'Profile', description: 'Manage your account details', action: () => setActiveModal('profile') },
        { icon: IoMail, label: 'Email', description: currentUser.email, action: () => setActiveModal('email') },
        { icon: Lock, label: 'Security', description: 'Change password and security settings', action: () => setActiveModal('security') },
        { icon: Shield, label: 'Two-Factor Authentication', description: 'Enable 2FA for enhanced security', action: () => setActiveModal('2fa') }
      ]
    },
    {
      title: 'Preferences',
      items: [
        { icon: Bell, label: 'Notifications', description: 'Manage notification preferences', action: () => setActiveModal('notifications') },
        { icon: Globe, label: 'Language', description: currentUser.language ? `${currentUser.language.toUpperCase()}` : 'English', action: () => setActiveModal('language') },
        { icon: Smartphone, label: 'Mobile App', description: 'Download iOS or Android app', action: () => navigate('/mobile-app') }
      ]
    },
    {
      title: 'Payment',
      items: [
        { icon: CreditCard, label: 'Payment Methods', description: 'Manage your payment methods for P2P', action: () => setActiveModal('payment') }
      ]
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)', padding: '2rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#fff', marginBottom: '0.5rem' }}>
            Settings
          </h1>
          <p style={{ color: '#a0a0a0', fontSize: '16px' }}>
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile Card */}
        <Card style={{
          background: 'linear-gradient(135deg, rgba(26, 31, 58, 0.8), rgba(19, 24, 41, 0.6))',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: '900',
              color: '#000',
              boxShadow: '0 0 20px rgba(0, 240, 255, 0.5)',
              flexShrink: 0
            }}>
              {(currentUser.full_name || currentUser.name || 'U').substring(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: '#888', fontSize: '12px', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Full Name</label>
                <input
                  type="text"
                  value={currentUser.full_name || currentUser.name || ''}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setCurrentUser({...currentUser, full_name: newName});
                  }}
                  onBlur={async (e) => {
                    // Reset styling
                    e.target.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                    e.target.style.boxShadow = 'none';
                    
                    // Handle API update
                    const newName = e.target.value.trim();
                    if (newName && newName !== (currentUser.full_name || currentUser.name)) {
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
                          toast.success('Name updated successfully!');
                          const updatedUser = {...currentUser, full_name: newName};
                          setCurrentUser(updatedUser);
                          localStorage.setItem('cryptobank_user', JSON.stringify(updatedUser));
                        } else {
                          toast.error('Failed to update name');
                        }
                      } catch (error) {
                        toast.error('Failed to update name');
                      } finally {
                        setLoadingSettings(false);
                      }
                    }
                  }}
                  disabled={loadingSettings}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '18px',
                    fontWeight: '700',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(0, 240, 255, 0.6)';
                    e.target.style.boxShadow = '0 0 20px rgba(0, 240, 255, 0.2)';
                  }}
                />
              </div>
              <p style={{ color: '#00F0FF', fontSize: '16px', fontWeight: '600', marginBottom: 0 }}>
                {currentUser.email}
              </p>
            </div>
          </div>
        </Card>

        {/* Seller Features & Premium */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '900', marginBottom: '1rem', paddingLeft: '4px' }}>
            💎 Premium Features
          </h3>
          <Card style={{
            background: 'rgba(26, 31, 58, 0.8)',
            border: '2px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {/* Seller Status */}
              <div style={{ padding: '1rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Seller Status</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {currentUser?.is_verified_seller ? (
                    <span style={{ color: '#A855F7', fontWeight: '700', fontSize: '16px' }}>✓ Verified</span>
                  ) : (
                    <span style={{ color: '#888', fontSize: '14px' }}>Not Verified</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (!currentUser?.is_verified_seller) {
                      if (window.confirm('Get Verified Seller badge for £25?\n\nThis will be deducted from your GBP wallet balance.')) {
                        handleVerifySeller();
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: currentUser?.is_verified_seller ? 'rgba(34, 197, 94, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    borderRadius: '6px',
                    color: currentUser?.is_verified_seller ? '#22C55E' : '#A855F7',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: currentUser?.is_verified_seller ? 'default' : 'pointer'
                  }}
                >
                  {currentUser?.is_verified_seller ? 'Active' : 'Get Verified £25'}
                </button>
              </div>

              {/* Seller Level */}
              <div style={{ padding: '1rem', background: 'rgba(255, 215, 0, 0.05)', borderRadius: '12px', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Seller Level</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {currentUser?.seller_level === 'gold' && (
                    <span style={{ color: '#FFD700', fontWeight: '700', fontSize: '16px' }}>👑 Gold</span>
                  )}
                  {currentUser?.seller_level === 'silver' && (
                    <span style={{ color: '#C0C0C0', fontWeight: '700', fontSize: '16px' }}>⭐ Silver</span>
                  )}
                  {(!currentUser?.seller_level || currentUser?.seller_level === 'bronze') && (
                    <span style={{ color: '#888', fontSize: '14px' }}>Bronze (Default)</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    const currentLevel = currentUser?.seller_level || 'bronze';
                    if (currentLevel === 'gold') {
                      toast.info('You already have Gold level!');
                      return;
                    }
                    
                    const nextLevel = currentLevel === 'bronze' ? 'silver' : 'gold';
                    const price = nextLevel === 'silver' ? '£20' : '£50';
                    
                    if (window.confirm(`Upgrade to ${nextLevel.toUpperCase()} level for ${price}?\n\nBenefits:\n- Priority ranking in marketplace\n- Reduced seller fees\n- ${nextLevel.toUpperCase()} badge\n\nAmount will be deducted from your GBP wallet.`)) {
                      handleUpgradeLevel(nextLevel);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'rgba(255, 215, 0, 0.2)',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    borderRadius: '6px',
                    color: '#FFD700',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {currentUser?.seller_level === 'gold' ? 'Max Level' : 'Upgrade Level'}
                </button>
              </div>

              {/* Arbitrage Alerts */}
              <div style={{ padding: '1rem', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Alerts Subscription</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#888', fontSize: '14px' }}>Not Subscribed</span>
                </div>
                <button
                  onClick={() => navigate('/subscriptions')}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'rgba(0, 240, 255, 0.2)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '6px',
                    color: '#00F0FF',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Subscribe £10/mo
                </button>
              </div>

              {/* View All Premium */}
              <div style={{ padding: '1rem', background: 'rgba(168, 85, 247, 0.05)', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <button
                  onClick={() => navigate('/subscriptions')}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#000',
                    fontSize: '14px',
                    fontWeight: '900',
                    cursor: 'pointer'
                  }}
                >
                  View All Features
                </button>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '0.5rem', textAlign: 'center' }}>
                  Boost earnings & priority
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Currency Selector */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '900', marginBottom: '1rem', paddingLeft: '4px' }}>
            Currency Settings
          </h3>
          <CurrencySelector />
        </div>

        {/* Price Alerts */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '900', marginBottom: '1rem', paddingLeft: '4px' }}>
            <IoTrendingUp size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Price Alerts
          </h3>
          <PriceAlerts />
        </div>

        {/* Security Settings */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '900', marginBottom: '1rem', paddingLeft: '4px' }}>
            Security & Notifications
          </h3>
          <Card style={{
            background: 'rgba(26, 31, 58, 0.8)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(0, 240, 255, 0.1)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IoMail size={20} color="#00F0FF" />
                  </div>
                  <div style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>
                    Login Email Alerts
                  </div>
                </div>
                <p style={{
                  color: '#888',
                  fontSize: '14px',
                  margin: 0,
                  paddingLeft: '48px'
                }}>
                  Receive email notifications when your account is logged into
                </p>
              </div>
              
              {/* Toggle Switch */}
              <button
                onClick={() => updateSecuritySettings(!loginEmailAlerts)}
                disabled={loadingSettings}
                style={{
                  width: '52px',
                  height: '28px',
                  borderRadius: '14px',
                  background: loginEmailAlerts ? 'linear-gradient(135deg, #00F0FF, #A855F7)' : 'rgba(100, 116, 139, 0.3)',
                  border: 'none',
                  position: 'relative',
                  cursor: loadingSettings ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  flexShrink: 0,
                  opacity: loadingSettings ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loadingSettings) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  left: loginEmailAlerts ? 'calc(100% - 26px)' : '2px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  transition: 'left 0.3s ease'
                }} />
              </button>
            </div>
          </Card>
        </div>

        {/* Settings Sections */}
        {settingSections.map((section, sectionIdx) => (
          <div key={sectionIdx} style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '900', marginBottom: '1rem', paddingLeft: '4px' }}>
              {section.title}
            </h3>
            <Card style={{
              background: 'rgba(26, 31, 58, 0.8)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '16px',
              overflow: 'hidden'
            }}>
              {section.items.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    onClick={item.action}
                    style={{
                      padding: '1.5rem',
                      borderBottom: idx < section.items.length - 1 ? '1px solid rgba(0, 240, 255, 0.1)' : 'none',
                      cursor: item.action ? 'pointer' : 'default',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}
                    onMouseEnter={(e) => {
                      if (item.action) {
                        e.currentTarget.style.background = 'rgba(0, 240, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'rgba(0, 240, 255, 0.1)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon size={24} color="#00F0FF" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
                        {item.label}
                      </div>
                      <div style={{ color: '#888', fontSize: '14px' }}>
                        {item.description}
                      </div>
                    </div>
                    {item.action && (
                      <div style={{ color: '#00F0FF', fontSize: '20px' }}>→</div>
                    )}
                  </div>
                );
              })}
            </Card>
          </div>
        ))}

        {/* Mobile App Download Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '900', marginBottom: '1rem', paddingLeft: '4px' }}>
            📱 Mobile App
          </h3>
          <Card style={{
            background: 'rgba(26, 31, 58, 0.8)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <PremiumDownloadButtons showTitle={false} compact={true} />
          </Card>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '16px',
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '900',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.4)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 0 40px rgba(239, 68, 68, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(239, 68, 68, 0.4)';
          }}
        >
          <IoLogOut size={20} />
          Log Out
        </button>

        {/* App Version */}
        <div style={{ textAlign: 'center', marginTop: '2rem', color: '#666', fontSize: '13px' }}>
          Coin Hub IoClose as X v2.0.0
        </div>
      </div>
    </div>
  );
}
