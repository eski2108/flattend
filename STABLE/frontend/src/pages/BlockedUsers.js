import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { IoEyeOff, IoCheckmarkCircle, IoTrash } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

export default function BlockedUsers() {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user') || localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    fetchBlockedUsers();
  }, [navigate]);

  const getUserId = () => {
    const userStr = localStorage.getItem('cryptobank_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.user_id;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    return null;
  };

  const fetchBlockedUsers = async () => {
    setLoading(true);
    try {
      const userId = getUserId();
      if (!userId) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API}/api/p2p/blocked/${userId}`);
      if (response.data.success) {
        const blocked = response.data.blocked || [];
        
        // Fetch user details for each blocked user
        const userDetails = await Promise.all(
          blocked.map(async (blockedId) => {
            try {
              const userResp = await axios.get(`${API}/api/user/${blockedId}`);
              return {
                user_id: blockedId,
                email: userResp.data.email || blockedId,
                full_name: userResp.data.full_name || 'Unknown User'
              };
            } catch (e) {
              return {
                user_id: blockedId,
                email: blockedId,
                full_name: 'Unknown User'
              };
            }
          })
        );
        
        setBlockedUsers(userDetails);
      }
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      toast.error('Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockedUserId) => {
    setProcessing(true);
    try {
      const userId = getUserId();
      const response = await axios.post(`${API}/api/p2p/block/remove`, {
        user_id: userId,
        blocked_user_id: blockedUserId
      });

      if (response.data.success) {
        toast.success('User unblocked successfully');
        setBlockedUsers(blockedUsers.filter(u => u.user_id !== blockedUserId));
      }
    } catch (error) {
      toast.error('Failed to unblock user');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0A0E27 0%, #1a1f3a 100%)',
        padding: '40px 20px'
      }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          {/* Header */}
          <div style={{
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <IoEyeOff size={32} color="#EF4444" />
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#FFFFFF',
                margin: 0
              }}>Blocked Users</h1>
              <p style={{
                fontSize: '14px',
                color: '#8F9BB3',
                margin: '4px 0 0 0'
              }}>Manage users you've blocked from P2P trading</p>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div style={{
              background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
              border: '1px solid rgba(0, 198, 255, 0.2)',
              borderRadius: '16px',
              padding: '60px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                border: '4px solid rgba(0, 198, 255, 0.2)',
                borderTop: '4px solid #00C6FF',
                borderRadius: '50%',
                margin: '0 auto 20px',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ color: '#8F9BB3' }}>Loading blocked users...</p>
            </div>
          ) : blockedUsers.length === 0 ? (
            <div style={{
              background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
              border: '1px solid rgba(0, 198, 255, 0.2)',
              borderRadius: '16px',
              padding: '60px',
              textAlign: 'center'
            }}>
              <IoCheckmarkCircle size={64} color="#00C6FF" style={{ marginBottom: '20px' }} />
              <h3 style={{ color: '#FFFFFF', marginBottom: '8px' }}>No Blocked Users</h3>
              <p style={{ color: '#8F9BB3', marginBottom: '24px' }}>
                You haven't blocked anyone yet. Users you block will appear here.
              </p>
              <button
                onClick={() => navigate('/p2p')}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #00C6FF, #0096CC)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Go to P2P Marketplace
              </button>
            </div>
          ) : (
            <div style={{
              background: 'linear-gradient(135deg, #0A1929 0%, #051018 100%)',
              border: '1px solid rgba(0, 198, 255, 0.2)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              {/* Stats */}
              <div style={{
                padding: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                <p style={{
                  color: '#EF4444',
                  fontSize: '14px',
                  fontWeight: '600',
                  margin: 0
                }}>
                  You have blocked {blockedUsers.length} user{blockedUsers.length !== 1 ? 's' : ''}. They cannot see your offers or trade with you.
                </p>
              </div>

              {/* Blocked Users List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {blockedUsers.map((user) => (
                  <div
                    key={user.user_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '20px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(143, 155, 179, 0.2)',
                      borderRadius: '12px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                      {/* Avatar */}
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        color: '#FFFFFF',
                        fontSize: '18px'
                      }}>
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>

                      {/* User Info */}
                      <div>
                        <h4 style={{
                          color: '#FFFFFF',
                          fontSize: '16px',
                          fontWeight: '600',
                          margin: '0 0 4px 0'
                        }}>
                          {user.full_name}
                        </h4>
                        <p style={{
                          color: '#8F9BB3',
                          fontSize: '13px',
                          margin: 0
                        }}>
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {/* Unblock Button */}
                    <button
                      onClick={() => handleUnblock(user.user_id)}
                      disabled={processing}
                      style={{
                        padding: '10px 20px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        color: '#EF4444',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: processing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: processing ? 0.5 : 1,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!processing) {
                          e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                      }}
                    >
                      <IoTrash size={16} />
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
}
