import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoCheckmarkCircle as CheckCircle, IoCloseCircle as XCircle, IoShield, IoTime as Clock, IoTrendingUp, IoWarning as AlertTriangle } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function MyOrders() {
  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, buying, selling, active, completed
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // console.log('MyOrders: Component mounted, checking auth...');
    const userData = localStorage.getItem('cryptobank_user');
    // console.log('MyOrders: localStorage user data:', userData ? 'Found' : 'NOT FOUND');
    
    if (!userData) {
      // console.log('MyOrders: No user data, redirecting to login');
      navigate('/login');
      return;
    }
    
    const user = JSON.parse(userData);
    // console.log('MyOrders: Parsed user:', user);
    setCurrentUser(user);
    // console.log('MyOrders: Calling fetchTrades with userId:', user.user_id);
    fetchTrades(user.user_id);

    // Poll for updates every 10 seconds
    const interval = setInterval(() => {
      fetchTrades(user.user_id);
    }, 10000);

    return () => clearInterval(interval);
  }, [navigate]);

  const fetchTrades = async (userId) => {
    try {
      const apiUrl = `${API}/api/p2p/trades/user/${userId}`;
      // console.log('Fetching trades from:', apiUrl);
      const response = await axios.get(apiUrl);
      // console.log('Trades response:', response.data);
      
      if (response.data.success) {
        setTrades(response.data.trades || []);
        // console.log('Loaded trades:', response.data.trades?.length || 0);
      } else {
        console.error('Invalid response format:', response.data);
        setTrades([]);
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.detail || 'Failed to load orders');
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTrades = () => {
    if (!currentUser) return [];

    let filtered = trades;

    switch (filter) {
      case 'buying':
        filtered = trades.filter(t => t.buyer_id === currentUser.user_id);
        break;
      case 'selling':
        filtered = trades.filter(t => t.seller_id === currentUser.user_id);
        break;
      case 'active':
        filtered = trades.filter(t => ['pending_payment', 'buyer_marked_paid'].includes(t.status));
        break;
      case 'completed':
        filtered = trades.filter(t => t.status === 'released');
        break;
      default:
        break;
    }

    return filtered;
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending_payment':
        return { label: 'Pending Payment', color: '#F59E0B', icon: Clock };
      case 'buyer_marked_paid':
        return { label: 'Payment Sent', color: '#3B82F6', icon: Clock };
      case 'released':
        return { label: 'Completed', color: '#22C55E', icon: CheckCircle2 };
      case 'cancelled':
        return { label: 'Cancelled', color: '#EF4444', icon: XCircle };
      case 'expired':
        return { label: 'Expired', color: '#6B7280', icon: XCircle };
      case 'disputed':
        return { label: 'Disputed', color: '#F59E0B', icon: AlertTriangle };
      default:
        return { label: status, color: '#FFFFFF', icon: Clock };
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTrades = getFilteredTrades();

  return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '900',
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            My Orders
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem' }}>
            View and manage all your P2P trades
          </p>
        </div>

        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '0.5rem',
          borderRadius: '12px'
        }}>
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'active', label: 'Active' },
            { id: 'buying', label: 'Buying' },
            { id: 'selling', label: 'Selling' },
            { id: 'completed', label: 'Completed' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '0.75rem 1.5rem',
                background: filter === tab.id ? 'linear-gradient(135deg, #00F0FF, #A855F7)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: filter === tab.id ? '#000000' : '#FFFFFF',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid rgba(0, 240, 255, 0.3)',
              borderTopColor: '#00F0FF',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '16px',
            border: '2px dashed rgba(255, 255, 255, 0.1)'
          }}>
            <IoTrendingUp size={64} color="rgba(255,255,255,0.3)" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '0.5rem' }}>
              No Orders Found
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', marginBottom: '1.5rem' }}>
              Start trading on the marketplace to see your orders here
            </p>
            <button
              onClick={() => navigate('/p2p-marketplace')}
              style={{
                padding: '0.875rem 2rem',
                background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                border: 'none',
                borderRadius: '10px',
                color: '#000000',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Go to Marketplace
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredTrades.map((trade) => {
              const statusInfo = getStatusInfo(trade.status);
              const StatusIcon = statusInfo.icon;
              const isBuyer = currentUser && trade.buyer_id === currentUser.user_id;
              const isActive = ['pending_payment', 'buyer_marked_paid'].includes(trade.status);

              return (
                <div
                  key={trade.trade_id}
                  onClick={() => navigate(`/trade/${trade.trade_id}`)}
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.05), rgba(168, 85, 247, 0.05))',
                    border: `2px solid ${isActive ? 'rgba(0, 240, 255, 0.3)' : 'rgba(168, 85, 247, 0.2)'}`,
                    borderRadius: '16px',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 8px 30px ${isActive ? 'rgba(0, 240, 255, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                    {/* Left: Trade Info */}
                    <div style={{ flex: '1', minWidth: '250px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{
                          padding: '0.5rem 1rem',
                          background: isBuyer ? 'rgba(0, 240, 255, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                          border: `2px solid ${isBuyer ? '#00F0FF' : '#A855F7'}`,
                          borderRadius: '8px',
                          color: isBuyer ? '#00F0FF' : '#A855F7',
                          fontSize: '0.875rem',
                          fontWeight: '700',
                          textTransform: 'uppercase'
                        }}>
                          {isBuyer ? 'BUYING' : 'SELLING'}
                        </div>
                        {trade.escrow_locked && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#22C55E', fontSize: '0.875rem', fontWeight: '600' }}>
                            <IoShield size={16} />
                            Escrow
                          </div>
                        )}
                      </div>

                      <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#FFFFFF', marginBottom: '0.5rem' }}>
                        {trade?.crypto_amount || '0'} {trade?.crypto_currency || 'N/A'}
                      </div>

                      <div style={{ fontSize: '1.125rem', fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: '0.75rem' }}>
                        {trade?.fiat_amount ? trade.fiat_amount.toLocaleString() : '0'} {trade?.fiat_currency || 'N/A'}
                      </div>

                      <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                        Trade ID: {trade?.trade_id ? trade.trade_id.slice(0, 12) : 'N/A'}...
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>
                        {trade?.created_at ? formatDate(trade.created_at) : 'N/A'}
                      </div>
                    </div>

                    {/* Right: Status */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                      <div style={{
                        padding: '0.75rem 1.5rem',
                        background: `${statusInfo.color}20`,
                        border: `2px solid ${statusInfo.color}`,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <StatusIcon size={20} color={statusInfo.color} />
                        <span style={{ color: statusInfo.color, fontWeight: '700', fontSize: '0.875rem' }}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {isActive && (
                        <div style={{
                          padding: '0.75rem 1.5rem',
                          background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                          borderRadius: '10px',
                          color: '#000000',
                          fontSize: '0.875rem',
                          fontWeight: '700',
                          textTransform: 'uppercase'
                        }}>
                          View Trade →
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
  );
}
