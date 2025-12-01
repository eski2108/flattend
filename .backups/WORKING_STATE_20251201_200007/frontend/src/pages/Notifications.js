import React, { useState, useEffect } from 'react';
import { IoAlertCircle, IoChatbubbles, IoCheckmark, IoFilter as Filter, IoNotifications, IoShield, IoTrendingUp } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const unreadParam = filter === 'unread' ? '&unread_only=true' : '';
      const response = await fetch(`${BACKEND_URL}/api/notifications?limit=100${unreadParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        let filteredNotifications = data.notifications || [];

        // Apply type filtering
        if (filter === 'security') {
          filteredNotifications = filteredNotifications.filter(n => n.type === 'login_alert');
        } else if (filter === 'trading') {
          filteredNotifications = filteredNotifications.filter(n =>
            ['p2p_trade_update', 'deposit_confirmed', 'withdrawal_completed', 'swap_completed', 'staking_reward'].includes(n.type)
          );
        } else if (filter === 'system') {
          filteredNotifications = filteredNotifications.filter(n =>
            ['admin_announcement', 'dispute_update'].includes(n.type)
          );
        }

        setNotifications(filteredNotifications);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationIds) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/notifications/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notification_ids: notificationIds })
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            notificationIds.includes(n.id) ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead([notification.id]);
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'login_alert':
        return <IoShield size={24} style={{ color: '#00F0FF' }} />;
      case 'p2p_trade_update':
      case 'deposit_confirmed':
      case 'withdrawal_completed':
      case 'swap_completed':
      case 'staking_reward':
        return <IoTrendingUp size={24} style={{ color: '#22C55E' }} />;
      case 'dispute_update':
        return <IoAlertCircle size={24} style={{ color: '#EF4444' }} />;
      case 'admin_announcement':
        return <IoChatbubbles size={24} style={{ color: '#A855F7' }} />;
      default:
        return <IoNotifications size={24} style={{ color: '#64748B' }} />;
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return time.toLocaleDateString();
  };

  const filters = [
    { value: 'all', label: 'All', icon: Bell },
    { value: 'unread', label: 'Unread', icon: Filter },
    { value: 'security', label: 'Security', icon: Shield },
    { value: 'trading', label: 'Trading', icon: TrendingUp },
    { value: 'system', label: 'System', icon: MessageSquare }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      padding: '2rem',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto 2rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <div>
            <h1 style={{
              margin: '0 0 0.5rem',
              fontSize: '2rem',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: '#94A3B8'
              }}>
                {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              style={{
                background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                border: 'none',
                borderRadius: '10px',
                padding: '0.75rem 1.5rem',
                color: '#000',
                fontSize: '0.875rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 240, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <IoCheckmark size={16} />
              Mark all as read
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}>
          {filters.map((f) => {
            const Icon = f.icon;
            const isActive = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                style={{
                  background: isActive
                    ? 'rgba(0, 240, 255, 0.15)'
                    : 'rgba(0, 240, 255, 0.05)',
                  border: `1px solid ${isActive ? 'rgba(0, 240, 255, 0.5)' : 'rgba(0, 240, 255, 0.2)'}`,
                  borderRadius: '8px',
                  padding: '0.625rem 1rem',
                  color: isActive ? '#00F0FF' : '#94A3B8',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(0, 240, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.2)';
                  }
                }}
              >
                <Icon size={16} />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications List */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {loading ? (
          <div style={{
            background: 'rgba(0, 240, 255, 0.05)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
            color: '#94A3B8'
          }}>
            <IoNotifications size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ margin: 0 }}>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{
            background: 'rgba(0, 240, 255, 0.05)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
            color: '#94A3B8'
          }}>
            <IoNotifications size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: '1rem' }}>No notifications found</p>
            {filter !== 'all' && (
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
                Try selecting a different filter
              </p>
            )}
          </div>
        ) : (
          <div style={{
            background: 'rgba(0, 240, 255, 0.03)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            {notifications.map((notification, index) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                style={{
                  padding: '1.5rem',
                  borderBottom: index < notifications.length - 1 ? '1px solid rgba(0, 240, 255, 0.1)' : 'none',
                  cursor: 'pointer',
                  background: notification.is_read ? 'transparent' : 'rgba(0, 240, 255, 0.05)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  gap: '1rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 240, 255, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = notification.is_read ? 'transparent' : 'rgba(0, 240, 255, 0.05)';
                }}
              >
                {/* Icon */}
                <div style={{
                  flexShrink: 0,
                  width: '48px',
                  height: '48px',
                  background: 'rgba(0, 240, 255, 0.1)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '1rem',
                      fontWeight: notification.is_read ? '500' : '700',
                      color: notification.is_read ? '#94A3B8' : '#E2E8F0'
                    }}>
                      {notification.title}
                    </h3>
                    {!notification.is_read && (
                      <div style={{
                        width: '10px',
                        height: '10px',
                        background: '#00F0FF',
                        borderRadius: '50%',
                        boxShadow: '0 0 12px rgba(0, 240, 255, 0.6)',
                        flexShrink: 0,
                        marginLeft: '1rem'
                      }} />
                    )}
                  </div>
                  <p style={{
                    margin: '0 0 0.5rem',
                    fontSize: '0.875rem',
                    color: '#64748B',
                    lineHeight: 1.6
                  }}>
                    {notification.message}
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '0.75rem',
                    color: '#475569'
                  }}>
                    {getTimeAgo(notification.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
