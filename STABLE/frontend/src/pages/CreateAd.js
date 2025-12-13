import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IoArrowBack } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function CreateAd() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [creating, setCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    ad_type: 'sell',
    crypto_currency: 'BTC',
    fiat_currency: 'GBP',
    price_type: 'fixed',
    price_value: '',
    min_amount: '',
    max_amount: '',
    available_amount: '',
    payment_methods: [],
    terms: ''
  });

  const [availableCryptos, setAvailableCryptos] = useState(['BTC', 'ETH', 'USDT']);
  const availableFiats = ['GBP', 'USD', 'EUR'];
  const availablePaymentMethods = [
    'sepa', 'faster_payments', 'swift', 'ach',
    'local_bank_transfer', 'wire_transfer', 'pix', 'interac'
  ];

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setCurrentUser(JSON.parse(userData));
    
    // Fetch available cryptocurrencies dynamically
    fetchAvailableCryptos();
  }, [navigate]);

  const fetchAvailableCryptos = async () => {
    try {
      const response = await axios.get(`${API}/api/p2p/marketplace/available-coins`);
      if (response.data.success && response.data.coins.length > 0) {
        setAvailableCryptos(response.data.coins);
      }
    } catch (error) {
      console.error('Error fetching available cryptos:', error);
      // Keep default fallback
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePaymentMethod = (method) => {
    setFormData(prev => ({
      ...prev,
      payment_methods: prev.payment_methods.includes(method)
        ? prev.payment_methods.filter(m => m !== method)
        : [...prev.payment_methods, method]
    }));
  };

  const validateForm = () => {
    if (!formData.price_value || parseFloat(formData.price_value) <= 0) {
      toast.error('Please enter a valid price');
      return false;
    }
    if (!formData.min_amount || parseFloat(formData.min_amount) <= 0) {
      toast.error('Please enter a valid minimum amount');
      return false;
    }
    if (!formData.max_amount || parseFloat(formData.max_amount) <= 0) {
      toast.error('Please enter a valid maximum amount');
      return false;
    }
    if (parseFloat(formData.min_amount) >= parseFloat(formData.max_amount)) {
      toast.error('Maximum amount must be greater than minimum amount');
      return false;
    }
    if (formData.payment_methods.length === 0) {
      toast.error('Please select at least one payment method');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setCreating(true);
    try {
      const response = await axios.post(`${API}/api/p2p/create-ad`, {
        user_id: currentUser.user_id,
        ...formData,
        price_value: parseFloat(formData.price_value),
        min_amount: parseFloat(formData.min_amount),
        max_amount: parseFloat(formData.max_amount),
        available_amount: parseFloat(formData.available_amount) || parseFloat(formData.max_amount)
      });

      if (response.data.success) {
        toast.success('Ad created successfully!');
        setTimeout(() => {
          navigate('/p2p/merchant');
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating ad:', error);
      toast.error(error.response?.data?.detail || 'Failed to create ad');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => navigate('/p2p/merchant')}
            style={{
              background: 'rgba(0, 240, 255, 0.1)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '8px',
              padding: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <IoArrowBack size={20} style={{ color: '#00F0FF' }} />
          </button>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#00F0FF', marginBottom: '0.25rem' }}>
              Create New Ad
            </h1>
            <p style={{ color: '#888', fontSize: '0.875rem' }}>
              Set your trading terms and start receiving orders
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Ad Type */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.9)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <label style={{ color: '#888', fontSize: '0.875rem', display: 'block', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ad Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => handleChange('ad_type', 'sell')}
                style={{
                  padding: '1rem',
                  background: formData.ad_type === 'sell' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                  border: `2px solid ${formData.ad_type === 'sell' ? '#22C55E' : 'rgba(0, 240, 255, 0.2)'}`,
                  borderRadius: '12px',
                  color: formData.ad_type === 'sell' ? '#22C55E' : '#888',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                I Want to SELL Crypto
              </button>
              <button
                type="button"
                onClick={() => handleChange('ad_type', 'buy')}
                style={{
                  padding: '1rem',
                  background: formData.ad_type === 'buy' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                  border: `2px solid ${formData.ad_type === 'buy' ? '#EF4444' : 'rgba(0, 240, 255, 0.2)'}`,
                  borderRadius: '12px',
                  color: formData.ad_type === 'buy' ? '#EF4444' : '#888',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                I Want to BUY Crypto
              </button>
            </div>
          </div>

          {/* Asset Selection */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.9)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ color: '#888', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                  Crypto Asset
                </label>
                <select
                  value={formData.crypto_currency}
                  onChange={(e) => handleChange('crypto_currency', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  {availableCryptos.map(crypto => (
                    <option key={crypto} value={crypto}>{crypto}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ color: '#888', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                  Fiat Currency
                </label>
                <select
                  value={formData.fiat_currency}
                  onChange={(e) => handleChange('fiat_currency', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  {availableFiats.map(fiat => (
                    <option key={fiat} value={fiat}>{fiat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.9)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <label style={{ color: '#888', fontSize: '0.875rem', display: 'block', marginBottom: '0.75rem' }}>
              Pricing Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => handleChange('price_type', 'fixed')}
                style={{
                  padding: '0.75rem',
                  background: formData.price_type === 'fixed' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                  border: `2px solid ${formData.price_type === 'fixed' ? '#00F0FF' : 'rgba(0, 240, 255, 0.2)'}`,
                  borderRadius: '8px',
                  color: formData.price_type === 'fixed' ? '#00F0FF' : '#888',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Fixed Price
              </button>
              <button
                type="button"
                onClick={() => handleChange('price_type', 'floating')}
                style={{
                  padding: '0.75rem',
                  background: formData.price_type === 'floating' ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                  border: `2px solid ${formData.price_type === 'floating' ? '#00F0FF' : 'rgba(0, 240, 255, 0.2)'}`,
                  borderRadius: '8px',
                  color: formData.price_type === 'floating' ? '#00F0FF' : '#888',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Floating (% Margin)
              </button>
            </div>

            <Input
              type="number"
              value={formData.price_value}
              onChange={(e) => handleChange('price_value', e.target.value)}
              placeholder={formData.price_type === 'fixed' ? 'Enter fixed price (e.g., 45000)' : 'Enter margin % (e.g., 2.5)'}
              style={{
                fontSize: '1.125rem',
                fontWeight: '700',
                color: '#fff',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '10px',
                padding: '1rem',
                width: '100%'
              }}
            />
          </div>

          {/* Trade Limits */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.9)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <label style={{ color: '#888', fontSize: '0.875rem', display: 'block', marginBottom: '0.75rem' }}>
              Trade Limits ({formData.crypto_currency})
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ color: '#666', fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem' }}>
                  Minimum
                </label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={formData.min_amount}
                  onChange={(e) => handleChange('min_amount', e.target.value)}
                  placeholder="0.01"
                  style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#fff',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    width: '100%'
                  }}
                />
              </div>
              <div>
                <label style={{ color: '#666', fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem' }}>
                  Maximum
                </label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={formData.max_amount}
                  onChange={(e) => handleChange('max_amount', e.target.value)}
                  placeholder="1.0"
                  style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#fff',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    width: '100%'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.9)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <label style={{ color: '#888', fontSize: '0.875rem', display: 'block', marginBottom: '0.75rem' }}>
              Payment Methods (Select at least one)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {availablePaymentMethods.map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => togglePaymentMethod(method)}
                  style={{
                    padding: '0.75rem',
                    background: formData.payment_methods.includes(method) ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                    border: `2px solid ${formData.payment_methods.includes(method) ? '#00F0FF' : 'rgba(0, 240, 255, 0.2)'}`,
                    borderRadius: '8px',
                    color: formData.payment_methods.includes(method) ? '#00F0FF' : '#888',
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  {method.replace(/_/g, ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Terms (Optional) */}
          <div style={{
            background: 'rgba(26, 31, 58, 0.9)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <label style={{ color: '#888', fontSize: '0.875rem', display: 'block', marginBottom: '0.75rem' }}>
              Terms & Conditions (Optional)
            </label>
            <textarea
              value={formData.terms}
              onChange={(e) => handleChange('terms', e.target.value)}
              placeholder="Enter any special terms or instructions for buyers..."
              rows={4}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '0.9375rem',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={creating}
            style={{
              width: '100%',
              minHeight: '60px',
              background: creating ? 'rgba(100,100,100,0.5)' : 'linear-gradient(135deg, #22C55E, #16A34A)',
              border: 'none',
              borderRadius: '16px',
              fontSize: '1.125rem',
              fontWeight: '900',
              color: '#fff',
              cursor: creating ? 'not-allowed' : 'pointer',
              boxShadow: creating ? 'none' : '0 4px 24px rgba(34, 197, 94, 0.5), 0 0 40px rgba(34, 197, 94, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'all 0.3s'
            }}
          >
            {creating ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                Creating Ad...
              </>
            ) : (
              'Publish Ad'
            )}
          </button>
        </form>
      </div>
    </Layout>
  );
}
