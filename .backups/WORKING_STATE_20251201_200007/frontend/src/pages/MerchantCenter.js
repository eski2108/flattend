import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { IoAdd, IoCheckmark as Check, IoCheckmarkCircle, IoClose as X, IoCloseCircle, IoEye, IoTrendingUp } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function MerchantCenter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sellerStatus, setSellerStatus] = useState(null);
  const [activating, setActivating] = useState(false);
  const [myAds, setMyAds] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    
    const user = JSON.parse(userData);
    setCurrentUser(user);
    fetchSellerStatus(user.user_id);
  }, [navigate]);

  const fetchSellerStatus = async (userId) => {
    try {
      const [statusResp, adsResp] = await Promise.all([
        axios.get(`${API}/p2p/seller-status/${userId}`),
        axios.get(`${API}/p2p/my-ads/${userId}`)
      ]);

      if (statusResp.data.success) {
        setSellerStatus(statusResp.data);
      }

      if (adsResp.data.success) {
        setMyAds(adsResp.data.ads);
      }
    } catch (error) {
      console.error('Error fetching seller status:', error);
      toast.error('Failed to load seller information');
    } finally {
      setLoading(false);
    }
  };

  const handleBoostListing = async (listingId, durationHours) => {
    try {
      const token = localStorage.getItem('token');
      const userId = currentUser?.user_id;

      const response = await axios.post(
        `${API}/api/monetization/boost-listing`,
        {
          user_id: userId,
          listing_id: listingId,
          duration_hours: durationHours
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        // Refresh ads to show boosted status
        fetchSellerStatus(userId);
      }
    } catch (error) {
      console.error('Error boosting listing:', error);
      toast.error(error.response?.data?.detail || 'Failed to boost listing');
    }
  };

  const handleActivateSeller = async () => {
    if (!sellerStatus?.can_activate) {
      toast.error('Please complete all requirements first');
      return;
    }

    setActivating(true);
    try {
      const response = await axios.post(`${API}/p2p/activate-seller`, {
        user_id: currentUser.user_id
      });

      if (response.data.success) {
        toast.success('Seller account activated! You can now create ads.');
        fetchSellerStatus(currentUser.user_id);
      }
    } catch (error) {
      console.error('Error activating seller:', error);
      toast.error(error.response?.data?.detail || 'Failed to activate seller account');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#00F0FF', marginBottom: '0.5rem' }}>
            Merchant Center
          </h1>
          <p style={{ color: '#888', fontSize: '1rem' }}>
            {sellerStatus?.is_seller ? 'Manage your P2P ads and trading activity' : 'Become a seller and start earning'}
          </p>
        </div>

        {!sellerStatus?.is_seller ? (
          /* NOT A SELLER - ACTIVATION FLOW */
          <>
            {/* What is Selling Section */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(168, 85, 247, 0.1))',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '16px',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <h2 style={{ color: '#00F0FF', fontSize: '1.5rem', fontWeight: '900', marginBottom: '1rem' }}>
                What is Merchant Mode?
              </h2>
              <p style={{ color: '#ccc', fontSize: '1rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                As a merchant, you can create buy/sell ads for crypto, set your own prices and payment methods, 
                and trade directly with other users. Earn by offering competitive rates and building your reputation.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '1.5rem', borderRadius: '12px' }}>
                  <IoTrendingUp size={32} style={{ color: '#00F0FF', marginBottom: '0.5rem' }} />
                  <h3 style={{ color: '#fff', fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.5rem' }}>Set Your Prices</h3>
                  <p style={{ color: '#888', fontSize: '0.875rem' }}>Control your margins and pricing strategy</p>
                </div>
                <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '1.5rem', borderRadius: '12px' }}>
                  <ShieldCheck size={32} style={{ color: '#22C55E', marginBottom: '0.5rem' }} />
                  <h3 style={{ color: '#fff', fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.5rem' }}>Protected Trading</h3>
                  <p style={{ color: '#888', fontSize: '0.875rem' }}>All trades secured by escrow system</p>
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div style={{
              background: 'rgba(26, 31, 58, 0.9)',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '16px',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <h2 style={{ color: '#00F0FF', fontSize: '1.5rem', fontWeight: '900', marginBottom: '1.5rem' }}>
                Requirements to Become a Seller
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '2px solid #22C55E',
                  borderRadius: '12px'
                }}>
                  <IoCheckmarkCircle size={32} style={{ color: '#22C55E', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: '#fff', fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                      Account Verified
                    </h3>
                    <p style={{ color: '#888', fontSize: '0.875rem' }}>
                      Your account is active and ready to sell ✓
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  background: sellerStatus?.requirements?.has_payment_method ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `2px solid ${sellerStatus?.requirements?.has_payment_method ? '#22C55E' : '#EF4444'}`,
                  borderRadius: '12px'
                }}>
                  {sellerStatus?.requirements?.has_payment_method ? (
                    <IoCheckmarkCircle size={32} style={{ color: '#22C55E', flexShrink: 0 }} />
                  ) : (
                    <IoCloseCircle size={32} style={{ color: '#EF4444', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: '#fff', fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                      Payment Method
                    </h3>
                    <p style={{ color: '#888', fontSize: '0.875rem' }}>
                      {sellerStatus?.requirements?.has_payment_method ? 'Added ✓' : 'Add at least one payment method'}
                    </p>
                  </div>
                  {!sellerStatus?.requirements?.has_payment_method && (
                    <Button onClick={() => navigate('/settings')}>Add Payment Method</Button>
                  )}
                </div>
              </div>
            </div>

            {/* Activate Button */}
            <button
              onClick={handleActivateSeller}
              disabled={!sellerStatus?.can_activate || activating}
              style={{
                width: '100%',
                minHeight: '64px',
                background: !sellerStatus?.can_activate || activating 
                  ? 'rgba(100,100,100,0.5)' 
                  : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                border: 'none',
                borderRadius: '16px',
                fontSize: '1.25rem',
                fontWeight: '900',
                color: !sellerStatus?.can_activate || activating ? '#666' : '#000',
                cursor: !sellerStatus?.can_activate || activating ? 'not-allowed' : 'pointer',
                boxShadow: !sellerStatus?.can_activate || activating 
                  ? 'none' 
                  : '0 4px 24px rgba(0, 240, 255, 0.5), 0 0 40px rgba(0, 240, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                transition: 'all 0.3s'
              }}
            >
              {activating ? (
                <>
                  <div className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }}></div>
                  Activating...
                </>
              ) : (
                <>
                  <ShieldCheck size={28} />
                  Activate Seller Account
                </>
              )}
            </button>
          </>
        ) : (
          /* IS A SELLER - DASHBOARD */
          <>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(0, 240, 255, 0.05))',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <div style={{ color: '#888', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Trades</div>
                <div style={{ color: '#00F0FF', fontSize: '2rem', fontWeight: '900' }}>
                  {sellerStatus?.stats?.total_trades || 0}
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(168, 85, 247, 0.05))',
                border: '2px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <div style={{ color: '#888', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Completion Rate</div>
                <div style={{ color: '#A855F7', fontSize: '2rem', fontWeight: '900' }}>
                  {sellerStatus?.stats?.completion_rate || 0}%
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.05))',
                border: '2px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <div style={{ color: '#888', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Volume</div>
                <div style={{ color: '#22C55E', fontSize: '2rem', fontWeight: '900' }}>
                  ${(sellerStatus?.stats?.total_volume || 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Create Ad Button */}
            <button
              onClick={() => navigate('/p2p/create-ad')}
              style={{
                width: '100%',
                minHeight: '64px',
                background: 'linear-gradient(135deg, #F59E0B, #EAB308)',
                border: 'none',
                borderRadius: '16px',
                fontSize: '1.25rem',
                fontWeight: '900',
                color: '#000',
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(245, 158, 11, 0.5), 0 0 40px rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '2rem',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 40px rgba(245, 158, 11, 0.7), 0 0 60px rgba(245, 158, 11, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 24px rgba(245, 158, 11, 0.5), 0 0 40px rgba(245, 158, 11, 0.3)';
              }}
            >
              <IoAdd size={28} />
              Create New Ad
            </button>

            {/* My Ads */}
            <div style={{
              background: 'rgba(26, 31, 58, 0.9)',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '16px',
              padding: '2rem'
            }}>
              <h2 style={{ color: '#00F0FF', fontSize: '1.5rem', fontWeight: '900', marginBottom: '1.5rem' }}>
                My Active Ads
              </h2>

              {myAds.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {myAds.map((ad) => (
                    <div
                      key={ad.ad_id}
                      style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 240, 255, 0.2)',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem'
                      }}
                    >
                      <div>
                        <div style={{ color: '#00F0FF', fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                          {ad.ad_type.toUpperCase()} {ad.crypto_currency}
                        </div>
                        <div style={{ color: '#888', fontSize: '0.875rem' }}>
                          Price: {ad.price_type === 'fixed' ? `$${ad.price_value}` : `${ad.price_value}% margin`} • 
                          Min: {ad.min_amount} • Max: {ad.max_amount} {ad.crypto_currency}
                        </div>
                        <div style={{ color: '#666', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                          {ad.payment_methods.join(', ')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {ad.is_boosted && ad.boosted_until && new Date(ad.boosted_until) > new Date() && (
                          <div style={{
                            padding: '0.5rem 0.75rem',
                            background: 'linear-gradient(135deg, #FFA500, #FF8C00)',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#FFF',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 0 15px rgba(255, 165, 0, 0.5)'
                          }}>
                            🚀 BOOSTED
                          </div>
                        )}
                        <button
                          onClick={() => {
                            const duration = window.prompt('Boost duration:\n1 = 1 hour (£10)\n6 = 6 hours (£20)\n24 = 24 hours (£50)\n\nEnter duration:');
                            if (duration && ['1', '6', '24'].includes(duration)) {
                              handleBoostListing(ad.ad_id, parseInt(duration));
                            }
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'linear-gradient(135deg, #FFA500, #FF8C00)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#FFF',
                            fontSize: '0.875rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          🚀 Boost
                        </button>
                        <button
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(0, 240, 255, 0.1)',
                            border: '1px solid rgba(0, 240, 255, 0.3)',
                            borderRadius: '8px',
                            color: '#00F0FF',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <IoEye size={16} />
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                  No active ads yet. Create your first ad to start trading!
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
