import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { X, Zap, TrendingUp, Star, Check } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || 'https://atomic-pay-fix.preview.emergentagent.com';

const BOOST_PRICING = [
  {
    type: 'daily',
    label: 'Daily Boost',
    price: 10,
    duration: '24 hours',
    description: 'Perfect for quick visibility'
  },
  {
    type: 'weekly',
    label: 'Weekly Boost',
    price: 40,
    duration: '7 days',
    description: 'Best value for consistent exposure',
    popular: true
  },
  {
    type: 'monthly',
    label: 'Monthly Boost',
    price: 100,
    duration: '30 days',
    description: 'Maximum visibility and savings'
  }
];

function BoostOfferModal({ isOpen, onClose, offer, onBoostSuccess }) {
  const [selectedPlan, setSelectedPlan] = useState('weekly');
  const [boosting, setBoosting] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchBalance();
    }
  }, [isOpen]);

  const fetchBalance = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);

      const response = await axios.get(`${API}/api/trader/my-balances/${user.user_id}`);
      if (response.data.success) {
        const gbpBalance = response.data.balances.find(b => b.currency === 'GBP');
        setBalance(gbpBalance?.available_balance || 0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handleBoost = async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      toast.error('Please login to boost your offer');
      return;
    }
    const user = JSON.parse(userStr);

    const selectedPricing = BOOST_PRICING.find(p => p.type === selectedPlan);
    if (balance < selectedPricing.price) {
      toast.error(`Insufficient GBP balance. You need £${selectedPricing.price}, but have £${balance.toFixed(2)}`);
      return;
    }

    setBoosting(true);
    try {
      const response = await axios.post(`${API}/api/p2p/boost-offer`, {
        user_id: user.user_id,
        ad_id: offer.ad_id,
        duration_type: selectedPlan
      });

      if (response.data.success) {
        toast.success(response.data.message);
        if (onBoostSuccess) onBoostSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error boosting offer:', error);
      toast.error(error.response?.data?.detail || 'Failed to boost offer');
    } finally {
      setBoosting(false);
    }
  };

  if (!isOpen || !offer) return null;

  const selectedPricing = BOOST_PRICING.find(p => p.type === selectedPlan);

  return (
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
      zIndex: 2000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(26, 31, 58, 0.95), rgba(15, 20, 40, 0.95))',
        border: '2px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Star size={28} color="#F59E0B" />
            <h2 style={{ color: '#F59E0B', fontSize: '1.5rem', fontWeight: '700', textTransform: 'uppercase' }}>
              Boost Your Offer
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            <X size={24} />
          </button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Get your offer featured at the top of the marketplace and increase your visibility to buyers.
        </p>

        {/* Offer Info */}
        <div style={{
          padding: '1rem',
          background: 'rgba(0, 240, 255, 0.1)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '12px',
          marginBottom: '1.5rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>
            Your Offer:
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#00F0FF' }}>
            {offer.ad_type?.toUpperCase()} {offer.crypto_currency} - £{offer.price_value?.toLocaleString()}
          </div>
        </div>

        {/* Pricing Plans */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {BOOST_PRICING.map(plan => (
            <button
              key={plan.type}
              onClick={() => setSelectedPlan(plan.type)}
              style={{
                position: 'relative',
                padding: '1.5rem',
                background: selectedPlan === plan.type 
                  ? 'rgba(245, 158, 11, 0.2)' 
                  : 'rgba(26, 31, 58, 0.8)',
                border: selectedPlan === plan.type 
                  ? '2px solid #F59E0B' 
                  : '2px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                if (selectedPlan !== plan.type) {
                  e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedPlan !== plan.type) {
                  e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                }
              }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '10px',
                  padding: '0.25rem 0.75rem',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)'
                }}>
                  POPULAR
                </div>
              )}
              
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#F59E0B', marginBottom: '0.5rem' }}>
                £{plan.price}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                {plan.label}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
                {plan.duration}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                {plan.description}
              </div>
              
              {selectedPlan === plan.type && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: '#F59E0B',
                  borderRadius: '50%',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Check size={16} color="#fff" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Benefits */}
        <div style={{
          padding: '1rem',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '2px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '12px',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <TrendingUp size={18} color="#F59E0B" />
            <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#F59E0B' }}>
              Boost Benefits
            </span>
          </div>
          <ul style={{ 
            margin: 0, 
            paddingLeft: '1.25rem',
            fontSize: '0.875rem',
            color: 'rgba(255,255,255,0.8)',
            lineHeight: '1.8'
          }}>
            <li>Featured at the top of marketplace listings</li>
            <li>Special glowing badge to stand out</li>
            <li>Higher visibility to potential buyers</li>
            <li>Priority placement above regular offers</li>
          </ul>
        </div>

        {/* Balance & Summary */}
        <div style={{
          padding: '1rem',
          background: 'rgba(0, 240, 255, 0.1)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '12px',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Your GBP Balance:</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#fff' }}>£{balance.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Boost Cost:</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#F59E0B' }}>£{selectedPricing?.price}</span>
          </div>
          <div style={{ height: '1px', background: 'rgba(0, 240, 255, 0.3)', margin: '0.5rem 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#00F0FF' }}>Remaining Balance:</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#00F0FF' }}>
              £{(balance - (selectedPricing?.price || 0)).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '2px solid #EF4444',
              borderRadius: '12px',
              color: '#EF4444',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleBoost}
            disabled={boosting || balance < (selectedPricing?.price || 0)}
            style={{
              flex: 1,
              padding: '1rem',
              background: (boosting || balance < (selectedPricing?.price || 0))
                ? 'rgba(245, 158, 11, 0.3)'
                : 'linear-gradient(135deg, #F59E0B, #D97706)',
              border: 'none',
              borderRadius: '12px',
              color: (boosting || balance < (selectedPricing?.price || 0)) ? 'rgba(255,255,255,0.5)' : '#fff',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: (boosting || balance < (selectedPricing?.price || 0)) ? 'not-allowed' : 'pointer',
              boxShadow: (boosting || balance < (selectedPricing?.price || 0)) ? 'none' : '0 4px 20px rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <Zap size={20} />
            {boosting ? 'Processing...' : `Boost for £${selectedPricing?.price}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BoostOfferModal;
