import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

function Subscriptions() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [subscribing, setSubscing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetchUserData();
    fetchSubscription();
  }, [navigate]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/user/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setUserData(response.data.user);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setLoading(false);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('user_id');
      
      const response = await axios.get(`${API}/api/user/subscription/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.subscription) {
        setSubscription(response.data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);

    try {
      const userId = localStorage.getItem('user_id');
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${API}/api/monetization/subscribe-alerts`,
        {
          user_id: userId,
          notification_channels: ['email', 'telegram', 'in_app']
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        alert('Successfully subscribed to arbitrage alerts!');
        fetchSubscription();
        fetchUserData();
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      alert(error.response?.data?.detail || 'Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0A0E27' }}>
        <div style={{ fontSize: '24px', color: '#00F0FF', fontWeight: '700' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0A0E27 0%, #1A1F3A 100%)', padding: '2rem' }}>
      {/* Header */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            color: '#00F0FF',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '700',
            marginBottom: '1rem'
          }}
        >
          ← Back to Dashboard
        </button>

        <h1 style={{ fontSize: '48px', fontWeight: '900', color: '#fff', margin: 0, marginBottom: '0.5rem' }}>
          📊 Subscriptions & Premium Features
        </h1>
        <p style={{ fontSize: '18px', color: '#888', margin: 0 }}>
          Unlock premium features and boost your trading experience
        </p>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        {/* Arbitrage Alerts Subscription */}
        <div style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '64px', marginBottom: '1rem' }}>🔔</div>
            <h2 style={{ color: '#00F0FF', fontSize: '28px', fontWeight: '900', marginBottom: '0.5rem' }}>
              Arbitrage Alerts
            </h2>
            <div style={{ fontSize: '48px', fontWeight: '900', color: '#fff', marginBottom: '0.5rem' }}>
              £10<span style={{ fontSize: '24px', fontWeight: '600', color: '#888' }}>/month</span>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <div style={{ color: '#fff', fontSize: '16px', marginBottom: '1.5rem', fontWeight: '700' }}>
              What's Included:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ color: '#22C55E', fontSize: '20px', flexShrink: 0 }}>✓</div>
                <div style={{ color: '#888', fontSize: '14px' }}>
                  Real-time arbitrage opportunities across P2P markets
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ color: '#22C55E', fontSize: '20px', flexShrink: 0 }}>✓</div>
                <div style={{ color: '#888', fontSize: '14px' }}>
                  Email notifications for instant alerts
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ color: '#22C55E', fontSize: '20px', flexShrink: 0 }}>✓</div>
                <div style={{ color: '#888', fontSize: '14px' }}>
                  Telegram bot integration for mobile alerts
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ color: '#22C55E', fontSize: '20px', flexShrink: 0 }}>✓</div>
                <div style={{ color: '#888', fontSize: '14px' }}>
                  In-app notifications dashboard
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ color: '#22C55E', fontSize: '20px', flexShrink: 0 }}>✓</div>
                <div style={{ color: '#888', fontSize: '14px' }}>
                  Profit percentage calculations on opportunities
                </div>
              </div>
            </div>
          </div>

          {subscription && subscription.is_active ? (
            <div>
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22C55E', fontSize: '16px', fontWeight: '700', marginBottom: '0.5rem' }}>
                  <span>✓</span> Active Subscription
                </div>
                <div style={{ color: '#888', fontSize: '14px' }}>
                  Next billing: {new Date(subscription.next_billing_date).toLocaleDateString()}
                </div>
              </div>
              <button
                disabled
                style={{
                  width: '100%',
                  padding: '1.25rem',
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  color: '#22C55E',
                  fontSize: '18px',
                  fontWeight: '900',
                  cursor: 'not-allowed'
                }}
              >
                Already Subscribed
              </button>
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              style={{
                width: '100%',
                padding: '1.25rem',
                background: subscribing ? 'rgba(0, 240, 255, 0.3)' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                border: 'none',
                borderRadius: '8px',
                color: subscribing ? '#888' : '#000',
                fontSize: '18px',
                fontWeight: '900',
                cursor: subscribing ? 'not-allowed' : 'pointer'
              }}
            >
              {subscribing ? 'Subscribing...' : 'Subscribe Now'}
            </button>
          )}
        </div>

        {/* Seller Features */}
        <div style={{ background: 'rgba(26, 31, 58, 0.8)', border: '2px solid rgba(168, 85, 247, 0.3)', borderRadius: '16px', padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '64px', marginBottom: '1rem' }}>👔</div>
            <h2 style={{ color: '#A855F7', fontSize: '28px', fontWeight: '900', marginBottom: '0.5rem' }}>
              Seller Features
            </h2>
            <div style={{ fontSize: '18px', color: '#888' }}>
              One-time payments
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(168, 85, 247, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>Seller Verification</div>
                <div style={{ color: '#A855F7', fontSize: '20px', fontWeight: '900' }}>£25</div>
              </div>
              <div style={{ color: '#888', fontSize: '13px', marginBottom: '1rem' }}>
                Get verified badge and build trust with buyers
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(168, 85, 247, 0.2)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: '6px',
                  color: '#A855F7',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Available in Dashboard
              </button>
            </div>

            <div style={{ background: 'rgba(192, 192, 192, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>Silver Level</div>
                <div style={{ color: '#C0C0C0', fontSize: '20px', fontWeight: '900' }}>£20</div>
              </div>
              <div style={{ color: '#888', fontSize: '13px', marginBottom: '1rem' }}>
                Priority ranking + 0.5% fee reduction
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(192, 192, 192, 0.2)',
                  border: '1px solid rgba(192, 192, 192, 0.3)',
                  borderRadius: '6px',
                  color: '#C0C0C0',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Available in Dashboard
              </button>
            </div>

            <div style={{ background: 'rgba(255, 215, 0, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>Gold Level</div>
                <div style={{ color: '#FFD700', fontSize: '20px', fontWeight: '900' }}>£50</div>
              </div>
              <div style={{ color: '#888', fontSize: '13px', marginBottom: '1rem' }}>
                Top priority + 1.0% fee reduction
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255, 215, 0, 0.2)',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  borderRadius: '6px',
                  color: '#FFD700',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Available in Dashboard
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Subscriptions;
