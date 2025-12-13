import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '../components/Layout';

const API = process.env.REACT_APP_BACKEND_URL;

export default function AddPaymentMethod() {
  console.log('🔥 AddPaymentMethod component MOUNTED');
  console.log('🔥 API URL:', API);
  
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log('🔥 AddPaymentMethod useEffect running');
    const userData = localStorage.getItem('cryptobank_user');
    console.log('🔥 User data from localStorage:', userData);
  }, []);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState({
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔥 Form submitted');
    console.log('🔥 Payment method data:', paymentMethod);
    
    // Validation
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

    setLoading(true);
    try {
      const userData = localStorage.getItem('cryptobank_user');
      if (!userData) {
        console.error('🔥 No user data found in localStorage');
        toast.error('Please login first');
        navigate('/login');
        return;
      }

      const user = JSON.parse(userData);
      console.log('🔥 Sending request to:', `${API}/api/users/payment-methods`);
      console.log('🔥 User ID:', user.user_id);
      
      const response = await axios.post(`${API}/api/users/payment-methods`, {
        user_id: user.user_id,
        payment_method: paymentMethod
      });

      console.log('🔥 Response:', response.data);

      if (response.data.success) {
        toast.success('Payment method added successfully! ✅');
        setTimeout(() => {
          // Navigate with state to trigger refresh
          navigate('/p2p/merchant', { state: { refreshStatus: true } });
        }, 1000);
      }
    } catch (error) {
      console.error('🔥 Error saving payment method:', error);
      console.error('🔥 Error response:', error.response?.data);
      toast.error(error.response?.data?.detail || 'Failed to save payment method');
    } finally {
      setLoading(false);
    }
  };

  console.log('🔥 Rendering AddPaymentMethod component');
  
  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0A0E27 0%, #1a1f3a 100%)',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '3rem',
          boxShadow: '0 0 40px rgba(0, 240, 255, 0.2)'
        }}>
          <h1 style={{ color: '#00F0FF', fontSize: '2rem', fontWeight: '900', marginBottom: '0.5rem' }}>
            🏦 Add Bank Payment Method
          </h1>
          <p style={{ color: '#888', fontSize: '1rem', marginBottom: '2rem' }}>
            Add your payment details to receive payments from buyers 💷
          </p>

          <form onSubmit={handleSubmit}>
            {/* Payment Type */}
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

            {/* Country */}
            <div style={{ marginBottom: '1.5rem' }}>
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
              </select>
            </div>

            {/* Bank Transfer Fields */}
            {paymentMethod.type === 'bank_transfer' && (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
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

                <div style={{ marginBottom: '1.5rem' }}>
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
                    <div style={{ marginBottom: '1.5rem' }}>
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
                    <div style={{ marginBottom: '1.5rem' }}>
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
                  <div style={{ marginBottom: '1.5rem' }}>
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
                    <div style={{ marginBottom: '1.5rem' }}>
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
                    <div style={{ marginBottom: '1.5rem' }}>
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
                <div style={{ marginBottom: '1.5rem' }}>
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
              </>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                type="button"
                onClick={() => navigate('/p2p/merchant')}
                style={{
                  flex: 1,
                  padding: '1rem',
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
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: loading ? 'rgba(100, 100, 100, 0.5)' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                  border: 'none',
                  borderRadius: '8px',
                  color: loading ? '#666' : '#000',
                  fontSize: '1rem',
                  fontWeight: '900',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Saving...' : 'Save Payment Method'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}