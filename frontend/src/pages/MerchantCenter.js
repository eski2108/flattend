import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { IoAdd, IoCheckmark as Check, IoCheckmarkCircle, IoClose as X, IoCloseCircle, IoEye, IoTrendingUp, IoShieldCheckmark as ShieldCheck } from 'react-icons/io5';
import axios from 'axios';
import axiosInstance from '@/utils/axiosConfig';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function MerchantCenter() {
  console.log('🎯 MerchantCenter component MOUNTED');
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [sellerStatus, setSellerStatus] = useState(null);
  const [activating, setActivating] = useState(false);
  const [myAds, setMyAds] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState({
    type: 'bank_transfer',
    country: 'GB',
    // Bank Transfer fields
    account_name: '',
    account_number: '',
    sort_code: '',
    bank_name: '',
    iban: '',
    swift_bic: '',
    routing_number: '',
    // Digital wallet fields
    email: '',
    phone: '',
    wallet_id: '',
    // Additional info
    currency: 'GBP'
  });
  const [paymentMethods, setPaymentMethods] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    
    if (!userData) {
      setLoading(false);
      toast.error('Please login to access Merchant Center');
      setTimeout(() => navigate('/login'), 100);
      return;
    }
    
    try {
      const user = JSON.parse(userData);
      setCurrentUser(user);
      setLoading(false);
      fetchSellerStatus(user.user_id);
    } catch (error) {
      console.error('Error parsing user data:', error);
      setLoading(false);
      toast.error('Invalid session data');
      navigate('/login');
    }
  }, [navigate]);
  
  // Refetch ads when returning from create-ad page
  useEffect(() => {
    if (location.state?.refreshAds && currentUser?.user_id) {
      fetchSellerStatus(currentUser.user_id);
      // Clear the state to prevent refetching on subsequent renders
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, currentUser]);
  
  // Refetch seller status when returning to this page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentUser?.user_id) {
        fetchSellerStatus(currentUser.user_id);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentUser]);

  const fetchSellerStatus = async (userId) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const [statusResp, adsResp] = await Promise.all([
        axios.get(`${API}/api/p2p/seller-status/${userId}`, { signal: controller.signal }),
        axios.get(`${API}/api/p2p/my-ads/${userId}`, { signal: controller.signal })
      ]);
      
      clearTimeout(timeoutId);

      if (statusResp.data.success) {
        setSellerStatus(statusResp.data);
      }

      if (adsResp.data.success) {
        setMyAds(adsResp.data.ads);
      }
    } catch (error) {
      console.error('Error fetching seller status:', error);
      toast.error('Failed to load seller information');
      
      // Set default state so page can still render
      console.log('💾 Setting default seller status');
      setSellerStatus({ is_seller: false, can_activate: false });
      setMyAds([]);
    } finally {
      console.log('🏁 fetchSellerStatus finally block - setting loading false');
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

  const handleSavePaymentMethod = async () => {
    // Validate based on payment type
    if (paymentMethod.type === 'bank_transfer') {
      if (!paymentMethod.account_name || !paymentMethod.bank_name) {
        toast.error('Please fill in account name and bank name');
        return;
      }
    } else if (['paypal', 'wise', 'revolut', 'cashapp', 'venmo'].includes(paymentMethod.type)) {
      if (!paymentMethod.email && !paymentMethod.phone) {
        toast.error('Please provide email or phone number');
        return;
      }
    }

    try {
      const response = await axios.post(`${API}/api/users/payment-methods`, {
        user_id: currentUser.user_id,
        payment_method: paymentMethod
      });

      if (response.data.success) {
        toast.success('Payment method added successfully!');
        setShowPaymentForm(false);
        setPaymentMethod({
          type: 'bank_transfer',
          country: 'GB',
          account_name: '',
          account_number: '',
          sort_code: '',
          bank_name: '',
          iban: '',
          swift_bic: '',
          routing_number: '',
          email: '',
          phone: '',
          wallet_id: '',
          currency: 'GBP'
        });
        // Refresh seller status
        fetchSellerStatus(currentUser.user_id);
      }
    } catch (error) {
      console.error('Error saving payment method:', error);
      toast.error(error.response?.data?.detail || 'Failed to save payment method');
    }
  };

  const handleActivateSeller = async () => {
    if (!sellerStatus?.can_activate) {
      toast.error('Please complete all requirements first');
      return;
    }

    setActivating(true);
    try {
      const response = await axios.post(`${API}/api/p2p/activate-seller`, {
        user_id: currentUser.user_id
      });

      if (response.data.success && response.data.seller_status) {
        // Use the seller_status returned by the backend
        setSellerStatus(response.data.seller_status);
        toast.success('🎉 Seller account activated successfully!');
        
        // Force a fresh fetch to ensure we have latest data
        await fetchSellerStatus(currentUser.user_id);
      }
    } catch (error) {
      console.error('Error activating seller:', error);
      toast.error(error.response?.data?.detail || 'Failed to activate seller account');
    } finally {
      setActivating(false);
    }
  };

  console.log('🎨 MerchantCenter render - loading:', loading, 'user:', currentUser, 'sellerStatus:', sellerStatus);
  
  if (loading) {
    console.log('⏳ Rendering loading spinner');
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
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem', paddingBottom: '4rem' }}>
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
                    <button 
                      onClick={() => navigate('/p2p/add-payment-method')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#000',
                        fontSize: '1rem',
                        fontWeight: '900',
                        cursor: 'pointer'
                      }}
                    >
                      Add Payment Method
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Method Form Modal */}
            {showPaymentForm && (
              <div 
                onClick={() => setShowPaymentForm(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.95)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 99999,
                  padding: '1rem',
                  overflowY: 'auto'
                }}>
                <div 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: '#1E293B',
                    border: '3px solid #00F0FF',
                    borderRadius: '16px',
                    padding: '2rem',
                    maxWidth: '600px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 0 50px rgba(0, 240, 255, 0.8)',
                    position: 'relative',
                    zIndex: 100000
                  }}>
                  <h2 style={{ color: '#00F0FF', fontSize: '1.5rem', fontWeight: '900', marginBottom: '0.5rem' }}>
                    💳 Add Payment Method
                  </h2>
                  <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    🌍 Support for 200+ countries & all major payment methods | v2.0
                  </p>

                  {/* Payment Type Selector */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ color: '#fff', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block', fontWeight: '700' }}>
                      Payment Method Type
                    </label>
                    <select
                      value={paymentMethod.type}
                      onChange={(e) => setPaymentMethod({...paymentMethod, type: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '1rem'
                      }}
                    >
                      <option value="bank_transfer">🏦 Bank Transfer</option>
                      <option value="paypal">💳 PayPal</option>
                      <option value="wise">🌍 Wise (TransferWise)</option>
                      <option value="revolut">💷 Revolut</option>
                      <option value="cashapp">💵 Cash App</option>
                      <option value="venmo">📱 Venmo</option>
                      <option value="zelle">⚡ Zelle</option>
                      <option value="alipay">🇨🇳 Alipay</option>
                      <option value="wechat">💬 WeChat Pay</option>
                      <option value="paytm">🇮🇳 Paytm</option>
                      <option value="upi">🇮🇳 UPI</option>
                      <option value="gcash">🇵🇭 GCash</option>
                      <option value="maya">🇵🇭 Maya (PayMaya)</option>
                      <option value="m_pesa">🇰🇪 M-Pesa</option>
                      <option value="other">🌐 Other</option>
                    </select>
                  </div>

                  {/* Country Selector */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ color: '#fff', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
                      Country
                    </label>
                    <select
                      value={paymentMethod.country}
                      onChange={(e) => setPaymentMethod({...paymentMethod, country: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(0, 240, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '1rem'
                      }}
                    >
                      <option value="GB">🇬🇧 United Kingdom</option>
                      <option value="US">🇺🇸 United States</option>
                      <option value="EU">🇪🇺 European Union</option>
                      <option value="CA">🇨🇦 Canada</option>
                      <option value="AU">🇦🇺 Australia</option>
                      <option value="IN">🇮🇳 India</option>
                      <option value="CN">🇨🇳 China</option>
                      <option value="PH">🇵🇭 Philippines</option>
                      <option value="KE">🇰🇪 Kenya</option>
                      <option value="NG">🇳🇬 Nigeria</option>
                      <option value="ZA">🇿🇦 South Africa</option>
                      <option value="BR">🇧🇷 Brazil</option>
                      <option value="MX">🇲🇽 Mexico</option>
                      <option value="OTHER">🌍 Other</option>
                    </select>
                  </div>

                  {/* Bank Transfer Fields */}
                  {paymentMethod.type === 'bank_transfer' && (
                    <>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ color: '#fff', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
                          Account Holder Name *
                        </label>
                        <input
                          type="text"
                          value={paymentMethod.account_name}
                          onChange={(e) => setPaymentMethod({...paymentMethod, account_name: e.target.value})}
                          placeholder="Full name as on bank account"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(0, 240, 255, 0.3)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '1rem'
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ color: '#fff', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
                          Bank Name *
                        </label>
                        <input
                          type="text"
                          value={paymentMethod.bank_name}
                          onChange={(e) => setPaymentMethod({...paymentMethod, bank_name: e.target.value})}
                          placeholder="e.g., Barclays, Chase, HSBC"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(0, 240, 255, 0.3)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '1rem'
                          }}
                        />
                      </div>

                      {paymentMethod.country === 'GB' && (
                        <>
                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ color: '#fff', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
                              Account Number
                            </label>
                            <input
                              type="text"
                              value={paymentMethod.account_number}
                              onChange={(e) => setPaymentMethod({...paymentMethod, account_number: e.target.value})}
                              placeholder="12345678"
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'rgba(15, 23, 42, 0.8)',
                                border: '1px solid rgba(0, 240, 255, 0.3)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '1rem'
                              }}
                            />
                          </div>
                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ color: '#fff', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
                              Sort Code
                            </label>
                            <input
                              type="text"
                              value={paymentMethod.sort_code}
                              onChange={(e) => setPaymentMethod({...paymentMethod, sort_code: e.target.value})}
                              placeholder="12-34-56"
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'rgba(15, 23, 42, 0.8)',
                                border: '1px solid rgba(0, 240, 255, 0.3)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '1rem'
                              }}
                            />
                          </div>
                        </>
                      )}

                      {(paymentMethod.country === 'US' || paymentMethod.country === 'CA') && (
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ color: '#fff', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
                            Routing Number
                          </label>
                          <input
                            type="text"
                            value={paymentMethod.routing_number}
                            onChange={(e) => setPaymentMethod({...paymentMethod, routing_number: e.target.value})}
                            placeholder="123456789"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              background: 'rgba(15, 23, 42, 0.8)',
                              border: '1px solid rgba(0, 240, 255, 0.3)',
                              borderRadius: '8px',
                              color: '#fff',
                              fontSize: '1rem'
                            }}
                          />
                        </div>
                      )}

                      {(paymentMethod.country === 'EU' || paymentMethod.country === 'OTHER') && (
                        <>
                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ color: '#fff', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
                              IBAN
                            </label>
                            <input
                              type="text"
                              value={paymentMethod.iban}
                              onChange={(e) => setPaymentMethod({...paymentMethod, iban: e.target.value})}
                              placeholder="GB29 NWBK 6016 1331 9268 19"
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'rgba(15, 23, 42, 0.8)',
                                border: '1px solid rgba(0, 240, 255, 0.3)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '1rem'
                              }}
                            />
                          </div>
                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ color: '#fff', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
                              SWIFT/BIC Code
                            </label>
                            <input
                              type="text"
                              value={paymentMethod.swift_bic}
                              onChange={(e) => setPaymentMethod({...paymentMethod, swift_bic: e.target.value})}
                              placeholder="NWBKGB2L"
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'rgba(15, 23, 42, 0.8)',
                                border: '1px solid rgba(0, 240, 255, 0.3)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '1rem'
                              }}
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Digital Wallet Fields */}
                  {['paypal', 'wise', 'revolut', 'cashapp', 'venmo', 'zelle'].includes(paymentMethod.type) && (
                    <>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ color: '#fff', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={paymentMethod.email}
                          onChange={(e) => setPaymentMethod({...paymentMethod, email: e.target.value})}
                          placeholder="your@email.com"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(0, 240, 255, 0.3)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '1rem'
                          }}
                        />
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ color: '#fff', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
                          Phone Number (Optional)
                        </label>
                        <input
                          type="tel"
                          value={paymentMethod.phone}
                          onChange={(e) => setPaymentMethod({...paymentMethod, phone: e.target.value})}
                          placeholder="+44 7700 900000"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(0, 240, 255, 0.3)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '1rem'
                          }}
                        />
                      </div>
                    </>
                  )}

                  {/* Mobile Money & Asian Payment Fields */}
                  {['alipay', 'wechat', 'paytm', 'upi', 'gcash', 'maya', 'm_pesa'].includes(paymentMethod.type) && (
                    <>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ color: '#fff', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
                          {paymentMethod.type === 'upi' ? 'UPI ID' : 
                           paymentMethod.type === 'm_pesa' ? 'M-Pesa Number' : 
                           'Account ID / Phone Number'} *
                        </label>
                        <input
                          type="text"
                          value={paymentMethod.wallet_id}
                          onChange={(e) => setPaymentMethod({...paymentMethod, wallet_id: e.target.value})}
                          placeholder={
                            paymentMethod.type === 'upi' ? 'username@upi' :
                            paymentMethod.type === 'm_pesa' ? '+254 7XX XXX XXX' :
                            'Enter your account ID or phone'
                          }
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(0, 240, 255, 0.3)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '1rem'
                          }}
                        />
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button
                      onClick={() => {
                        setShowPaymentForm(false);
                        setPaymentMethod({
                          type: 'bank_transfer',
                          country: 'GB',
                          account_name: '',
                          account_number: '',
                          sort_code: '',
                          bank_name: '',
                          iban: '',
                          swift_bic: '',
                          routing_number: '',
                          email: '',
                          phone: '',
                          wallet_id: '',
                          currency: 'GBP'
                        });
                      }}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'rgba(100, 100, 100, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '1rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePaymentMethod}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#000',
                        fontSize: '1rem',
                        fontWeight: '900',
                        cursor: 'pointer'
                      }}
                    >
                      Save Payment Method
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Activate Button */}
            <button
              onClick={handleActivateSeller}
              disabled={!sellerStatus?.can_activate || activating}
              style={{
                width: '100%',
                minHeight: '64px',
                marginTop: '2rem',
                marginBottom: '3rem',
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
                          Price: £{ad.price_per_unit || ad.price_value || 0} • 
                          Min: {ad.min_order_limit || ad.min_amount || 0} • Max: {ad.max_order_limit || ad.max_amount || 0} {ad.crypto_currency}
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
