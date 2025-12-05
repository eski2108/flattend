import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IoAdd, IoNotifications, IoNotificationsOff, IoTrash, IoTrendingDown, IoTrendingUp } from 'react-icons/io5';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const COINS = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'LTC'];
const THRESHOLDS = [5, 10, 15, 20, 25];

export default function PriceAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAlert, setNewAlert] = useState({
    coin: 'BTC',
    threshold: 5,
    direction: 'up'
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      if (!userId) return;

      const response = await axios.get(`${BACKEND_URL}/api/price-alerts/user/${userId}`);
      
      if (response.data.success) {
        setAlerts(response.data.alerts);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      
      const response = await axios.post(`${BACKEND_URL}/api/price-alerts/create`, {
        user_id: userId,
        ...newAlert
      });

      if (response.data.success) {
        toast.success('Price alert created!');
        setShowAddModal(false);
        fetchAlerts();
      } else {
        toast.error(response.data.error || 'Failed to create alert');
      }
    } catch (error) {
      toast.error('Failed to create alert');
    }
  };

  const toggleAlert = async (alertId, currentState) => {
    try {
      const userId = localStorage.getItem('user_id');
      
      const response = await axios.patch(`${BACKEND_URL}/api/price-alerts/${alertId}/toggle`, {
        user_id: userId,
        enabled: !currentState
      });

      if (response.data.success) {
        toast.success(`Alert ${!currentState ? 'enabled' : 'disabled'}`);
        fetchAlerts();
      }
    } catch (error) {
      toast.error('Failed to toggle alert');
    }
  };

  const deleteAlert = async (alertId) => {
    try {
      const userId = localStorage.getItem('user_id');
      
      const response = await axios.delete(`${BACKEND_URL}/api/price-alerts/${alertId}?user_id=${userId}`);

      if (response.data.success) {
        toast.success('Alert deleted');
        fetchAlerts();
      }
    } catch (error) {
      toast.error('Failed to delete alert');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        Loading alerts...
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#00F0FF' }}>
            Price Alerts
          </h3>
          <p style={{ margin: '0.5rem 0 0', fontSize: '14px', color: '#888' }}>
            Get notified when prices move by your chosen percentage
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
            border: 'none',
            borderRadius: '8px',
            color: '#000',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <IoAdd size={18} />
          New Alert
        </button>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <IoNotifications size={48} color="#444" style={{ marginBottom: '1rem' }} />
          <p style={{ color: '#888', fontSize: '16px', margin: 0 }}>
            No price alerts set up yet
          </p>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '0.5rem' }}>
            Create your first alert to get notified of price movements
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {alerts.map((alert) => (
            <div
              key={alert.alert_id}
              style={{
                padding: '1.25rem',
                background: 'rgba(0, 0, 0, 0.3)',
                border: `1px solid ${alert.enabled ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: alert.direction === 'up' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {alert.direction === 'up' ? (
                    <IoTrendingUp size={24} color="#22C55E" />
                  ) : (
                    <IoTrendingDown size={24} color="#EF4444" />
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#E2E8F0' }}>
                      {alert.coin}
                    </h4>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: alert.direction === 'up' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: alert.direction === 'up' ? '#22C55E' : '#EF4444',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '700'
                    }}>
                      {alert.direction === 'up' ? '↑' : '↓'} {alert.threshold}%
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>
                    Triggered {alert.triggered_count} times
                    {alert.last_triggered_at && ` • Last: ${new Date(alert.last_triggered_at).toLocaleDateString()}`}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => toggleAlert(alert.alert_id, alert.enabled)}
                  style={{
                    padding: '0.5rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: alert.enabled ? '#00F0FF' : '#666'
                  }}
                  title={alert.enabled ? 'Disable alert' : 'Enable alert'}
                >
                  {alert.enabled ? <IoNotifications size={20} /> : <IoNotificationsOff size={20} />}
                </button>

                <button
                  onClick={() => deleteAlert(alert.alert_id)}
                  style={{
                    padding: '0.5rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#EF4444'
                  }}
                  title="Delete alert"
                >
                  <IoTrash size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Alert Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0F172A, #1E293B)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '24px', fontWeight: '700', color: '#00F0FF' }}>
              Create Price Alert
            </h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '14px', fontWeight: '600' }}>
                Coin
              </label>
              <select
                value={newAlert.coin}
                onChange={(e) => setNewAlert({ ...newAlert, coin: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '16px'
                }}
              >
                {COINS.map(coin => (
                  <option key={coin} value={coin}>{coin}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '14px', fontWeight: '600' }}>
                Direction
              </label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setNewAlert({ ...newAlert, direction: 'up' })}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: newAlert.direction === 'up' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                    border: `1px solid ${newAlert.direction === 'up' ? '#22C55E' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '8px',
                    color: newAlert.direction === 'up' ? '#22C55E' : '#888',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <IoTrendingUp size={18} />
                  Price Up
                </button>
                <button
                  onClick={() => setNewAlert({ ...newAlert, direction: 'down' })}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: newAlert.direction === 'down' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                    border: `1px solid ${newAlert.direction === 'down' ? '#EF4444' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '8px',
                    color: newAlert.direction === 'down' ? '#EF4444' : '#888',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <IoTrendingDown size={18} />
                  Price Down
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '14px', fontWeight: '600' }}>
                Threshold
              </label>
              <select
                value={newAlert.threshold}
                onChange={(e) => setNewAlert({ ...newAlert, threshold: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '16px'
                }}
              >
                {THRESHOLDS.map(threshold => (
                  <option key={threshold} value={threshold}>{threshold}%</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#888',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={createAlert}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#000',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Create Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
