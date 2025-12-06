import React, { useEffect, useState } from 'react';
import { IoAlertCircle, IoChatbubbles, IoCheckmark, IoCheckmarkCircle, IoClose, IoNotifications, IoTime } from 'react-icons/io5';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://tradepanel-12.preview.emergentagent.com';

const P2PNotifications = ({ userId, tradeId = null, onNotificationClick }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!userId) return;

    try {
      const url = `${BACKEND_URL}/api/p2p/notifications/${userId}${
        tradeId ? `?trade_id=${tradeId}` : ''
      }`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await fetch(`${BACKEND_URL}/api/p2p/notifications/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: notificationId, user_id: userId }),
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/p2p/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, trade_id: tradeId }),
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Poll for new notifications every 10 seconds
  useEffect(() => {
    if (userId) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [userId, tradeId]);

  // Get icon for notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'trade_opened':
        return <IoCheckmarkCircle size={18} style={{ color: '#22C55E' }} />;
      case 'escrow_locked':
        return <IoCheckmark size={18} style={{ color: '#22C55E' }} />;
      case 'message_received':
        return <IoChatbubbles size={18} style={{ color: '#3B82F6' }} />;
      case 'payment_marked':
        return <IoTime size={18} style={{ color: '#F59E0B' }} />;
      case 'crypto_released':
        return <IoCheckmarkCircle size={18} style={{ color: '#22C55E' }} />;
      case 'dispute_opened':
        return <IoAlertCircle size={18} style={{ color: '#EF4444' }} />;
      case 'admin_message':
        return <IoChatbubbles size={18} style={{ color: '#8B5CF6' }} />;
      default:
        return <IoNotifications size={18} style={{ color: '#6B7280' }} />;
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Icon with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IoNotifications size={20} style={{ color: '#fff' }} />
        {unreadCount > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: 'linear-gradient(135deg, #EF4444, #DC2626)',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: '700',
              color: '#fff',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '50px',
            right: '0',
            width: tradeId ? '100%' : '400px',
            maxWidth: '95vw',
            maxHeight: '500px',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '1px solid rgba(0, 229, 255, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: '700' }}>
              {tradeId ? 'Trade Notifications' : 'All Notifications'}
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    color: '#22C55E',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <IoClose size={20} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div
            style={{
              overflowY: 'auto',
              maxHeight: '400px',
              padding: '8px',
            }}
          >
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.5)',
                }}
              >
                <IoNotifications size={40} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.notification_id}
                  onClick={() => {
                    markAsRead(notification.notification_id);
                    if (onNotificationClick) {
                      onNotificationClick(notification);
                    }
                  }}
                  style={{
                    background: notification.read
                      ? 'rgba(255, 255, 255, 0.03)'
                      : 'rgba(0, 229, 255, 0.08)',
                    border: notification.read
                      ? '1px solid rgba(255, 255, 255, 0.05)'
                      : '1px solid rgba(0, 229, 255, 0.2)',
                    borderRadius: '12px',
                    padding: '12px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 229, 255, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = notification.read
                      ? 'rgba(255, 255, 255, 0.03)'
                      : 'rgba(0, 229, 255, 0.08)';
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flexShrink: 0 }}>{getNotificationIcon(notification.notification_type)}</div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'start',
                          marginBottom: '4px',
                        }}
                      >
                        <h4
                          style={{
                            margin: 0,
                            fontSize: '14px',
                            fontWeight: '700',
                            color: '#fff',
                          }}
                        >
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#00E5FF',
                              boxShadow: '0 0 8px rgba(0, 229, 255, 0.6)',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>
                      <p
                        style={{
                          margin: '4px 0',
                          fontSize: '13px',
                          color: 'rgba(255, 255, 255, 0.7)',
                          lineHeight: '1.4',
                        }}
                      >
                        {notification.message}
                      </p>
                      {notification.action_required && (
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '8px',
                            background: 'rgba(0, 229, 255, 0.1)',
                            border: '1px solid rgba(0, 229, 255, 0.2)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: '#00E5FF',
                            lineHeight: '1.4',
                          }}
                        >
                          <strong>Next Step:</strong> {notification.action_required}
                        </div>
                      )}
                      <div
                        style={{
                          marginTop: '8px',
                          display: 'flex',
                          gap: '12px',
                          fontSize: '11px',
                          color: 'rgba(255, 255, 255, 0.4)',
                        }}
                      >
                        <span>Trade ID: {notification.trade_id.slice(0, 8)}...</span>
                        <span>•</span>
                        <span>{formatTime(notification.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default P2PNotifications;
