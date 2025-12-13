import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { IoCalendar as Calendar, IoCash as DollarSign, IoMail as Mail, IoPeople, IoPersonOutline, IoSearch, IoStar, IoTrendingUp as TrendingUp, IoTrophy } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL;

const AdminUsersManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState('all');

  useEffect(() => {
    const adminData = localStorage.getItem('admin_user');
    if (!adminData) {
      navigate('/admin/login');
      return;
    }
    loadUsers();
  }, [navigate]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/admin/users/all`);
      if (response.data.success) {
        setUsers(response.data.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserTier = async (userId, newTier) => {
    try {
      const response = await axios.post(`${API}/api/admin/users/update-tier`, {
        user_id: userId,
        tier: newTier
      });

      if (response.data.success) {
        toast.success(`User tier updated to ${newTier.toUpperCase()}!`);
        loadUsers();
      } else {
        toast.error(response.data.message || 'Failed to update tier');
      }
    } catch (error) {
      console.error('Error updating tier:', error);
      toast.error(error.response?.data?.detail || 'Failed to update user tier');
    }
  };

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'golden':
        return {
          label: 'Golden (50%)',
          gradient: 'linear-gradient(135deg, #FFD700, #FFA500)',
          icon: <IoStar size={16} style={{ color: '#000' }} />
        };
      case 'vip':
        return {
          label: 'VIP (20%)',
          gradient: 'linear-gradient(135deg, #A855F7, #7B2CFF)',
          icon: <IoTrophy size={16} style={{ color: '#fff' }} />
        };
      default:
        return {
          label: 'Standard (20%)',
          gradient: 'linear-gradient(135deg, #6B7280, #4B5563)',
          icon: <IoPersonOutline size={16} style={{ color: '#fff' }} />
        };
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.user_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTier = filterTier === 'all' || user.referral_tier === filterTier;
    
    return matchesSearch && matchesTier;
  });

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: '#00F0FF' }}>
          <div style={{ fontSize: '18px' }}>Loading users...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => navigate('/admin/dashboard')}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '8px 16px',
              color: '#fff',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            ← Back to Dashboard
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
            <IoPeople size={32} style={{ color: '#00F0FF' }} />
            <h1 style={{
              fontSize: '36px',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Users Management
            </h1>
          </div>
          <p style={{ color: '#A3AEC2', fontSize: '16px' }}>
            Manage user referral tiers and commission rates
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {[
            { label: 'Total Users', value: users.length, icon: <IoPeople size={24} />, color: '#00F0FF' },
            { label: 'Standard Tier', value: users.filter(u => !u.referral_tier || u.referral_tier === 'standard').length, icon: <IoPersonOutline size={24} />, color: '#6B7280' },
            { label: 'VIP Tier', value: users.filter(u => u.referral_tier === 'vip').length, icon: <IoTrophy size={24} />, color: '#A855F7' },
            { label: 'Golden Tier', value: users.filter(u => u.referral_tier === 'golden').length, icon: <IoStar size={24} />, color: '#FFD700' }
          ].map((stat, idx) => (
            <div key={idx} style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: '16px',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                <div style={{ color: stat.color }}>{stat.icon}</div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '900',
                  color: stat.color
                }}>
                  {stat.value}
                </div>
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ flex: '1', minWidth: '300px' }}>
              <div style={{ position: 'relative' }}>
                <IoSearch size={20} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255, 255, 255, 0.4)'
                }} />
                <input
                  type="text"
                  placeholder="Search by email, name, or user ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Tier Filter */}
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              style={{
                padding: '12px 16px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Tiers</option>
              <option value="standard">Standard Only</option>
              <option value="vip">VIP Only</option>
              <option value="golden">Golden Only</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0, 240, 255, 0.1)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>User</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Email</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Joined</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Current Tier</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#00F0FF', fontSize: '14px', fontWeight: '700' }}>Change Tier</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, idx) => {
                    const tier = getTierBadge(user.referral_tier || 'standard');
                    return (
                      <tr key={user.user_id} style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.2)'
                      }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: '700',
                              fontSize: '16px'
                            }}>
                              {user.full_name ? user.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>
                                {user.full_name || 'User'}
                              </div>
                              <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
                                ID: {user.user_id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                          {user.email}
                        </td>
                        <td style={{ padding: '1rem', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            background: tier.gradient,
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            color: user.referral_tier === 'golden' ? '#000' : '#fff'
                          }}>
                            {tier.icon}
                            {tier.label}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <select
                            value={user.referral_tier || 'standard'}
                            onChange={(e) => {
                              if (e.target.value !== (user.referral_tier || 'standard')) {
                                if (window.confirm(`Change ${user.full_name || user.email}'s tier to ${e.target.value.toUpperCase()}?`)) {
                                  updateUserTier(user.user_id, e.target.value);
                                }
                              }
                            }}
                            style={{
                              padding: '8px 12px',
                              background: 'rgba(0, 0, 0, 0.5)',
                              border: '1px solid rgba(0, 240, 255, 0.3)',
                              borderRadius: '8px',
                              color: '#fff',
                              fontSize: '13px',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="standard">Standard (20%)</option>
                            <option value="vip">VIP (20%)</option>
                            <option value="golden">Golden (50%)</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: 'rgba(0, 240, 255, 0.05)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '12px',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '13px',
          lineHeight: '1.6'
        }}>
          <strong style={{ color: '#00F0FF' }}>💡 Tier Information:</strong>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
            <li><strong>Standard (20%):</strong> Default tier for all users. Earns 20% commission on referrals.</li>
            <li><strong>VIP (20%):</strong> Users who paid £150 upgrade fee. Same commission, with priority support and exclusive features.</li>
            <li><strong>Golden (50%):</strong> Manually assigned by admin. Earns 50% commission on all referral transactions.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersManagement;
