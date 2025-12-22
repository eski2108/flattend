import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { ArrowLeft, IoAdd, IoArrowBack, IoClose, Plus } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function CreateOffer() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [cryptoCurrency, setCryptoCurrency] = useState('BTC');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [fiatCurrency, setFiatCurrency] = useState('GBP');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [minPurchase, setMinPurchase] = useState('');
  const [maxPurchase, setMaxPurchase] = useState('');
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState([]);
  const [sellerRequirements, setSellerRequirements] = useState([]);
  const [newRequirement, setNewRequirement] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userData);
    setCurrentUser(user);
    fetchConfig();
  }, [navigate]);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API}/api/p2p/config`);
      if (response.data.success) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const togglePaymentMethod = (pmId) => {
    if (selectedPaymentMethods.includes(pmId)) {
      setSelectedPaymentMethods(selectedPaymentMethods.filter(id => id !== pmId));
    } else {
      setSelectedPaymentMethods([...selectedPaymentMethods, pmId]);
    }
  };

  const addRequirement = () => {
    if (!newRequirement.trim()) return;
    
    setSellerRequirements([
      ...sellerRequirements,
      {
        tag: newRequirement.toLowerCase().replace(/\s+/g, '_'),
        label: newRequirement
      }
    ]);
    setNewRequirement('');
  };

  const removeRequirement = (index) => {
    setSellerRequirements(sellerRequirements.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!cryptoAmount || parseFloat(cryptoAmount) <= 0) {
      toast.error('Please enter a valid crypto amount');
      return;
    }

    if (!pricePerUnit || parseFloat(pricePerUnit) <= 0) {
      toast.error('Please enter a valid price per unit');
      return;
    }

    if (!minPurchase || parseFloat(minPurchase) <= 0) {
      toast.error('Please enter a valid minimum purchase');
      return;
    }

    if (!maxPurchase || parseFloat(maxPurchase) <= 0) {
      toast.error('Please enter a valid maximum purchase');
      return;
    }

    if (parseFloat(minPurchase) > parseFloat(maxPurchase)) {
      toast.error('Minimum purchase cannot be greater than maximum');
      return;
    }

    if (parseFloat(maxPurchase) > parseFloat(cryptoAmount)) {
      toast.error('Maximum purchase cannot exceed total amount');
      return;
    }

    if (selectedPaymentMethods.length === 0) {
      toast.error('Please select at least one payment method');
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(`${API}/api/p2p/create-offer`, {
        seller_id: currentUser.user_id,
        crypto_currency: cryptoCurrency,
        crypto_amount: parseFloat(cryptoAmount),
        fiat_currency: fiatCurrency,
        price_per_unit: parseFloat(pricePerUnit),
        min_purchase: parseFloat(minPurchase),
        max_purchase: parseFloat(maxPurchase),
        payment_methods: selectedPaymentMethods,
        seller_requirements: sellerRequirements
      });

      if (response.data.success) {
        toast.success('Offer created successfully!');
        navigate('/p2p-marketplace');
      }
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error(error.response?.data?.detail || 'Failed to create offer');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(0, 240, 255, 0.3)',
            borderTopColor: '#00F0FF',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      </Layout>
    );
  }

  const totalValue = cryptoAmount && pricePerUnit ? (parseFloat(cryptoAmount) * parseFloat(pricePerUnit)).toLocaleString() : '0';
  const currencySymbol = config?.currencies[fiatCurrency]?.symbol || '';

  return (
    <Layout>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/p2p-marketplace')}
            style={{
              padding: '0.75rem',
              background: 'rgba(0, 240, 255, 0.1)',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderRadius: '10px',
              color: '#00F0FF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <IoArrowBack size={24} />
          </button>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Create Sell Offer
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              List your crypto for sale on the P2P marketplace
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Crypto Details */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.05), rgba(168, 85, 247, 0.05))',
            border: '2px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ fontSize: '1.375rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '1.5rem' }}>
              Crypto Details
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 768 ? 'repeat(2, 1fr)' : '1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>
                  Cryptocurrency *
                </label>
                <select
                  value={cryptoCurrency}
                  onChange={(e) => setCryptoCurrency(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                >
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="ETH">Ethereum (ETH)</option>
                  <option value="USDT">Tether (USDT)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>
                  Total Amount *
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  placeholder="0.00"
                  value={cryptoAmount}
                  onChange={(e) => setCryptoAmount(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Price & Currency */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(0, 240, 255, 0.05))',
            border: '2px solid rgba(168, 85, 247, 0.2)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ fontSize: '1.375rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '1.5rem' }}>
              Price & Currency
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 768 ? 'repeat(2, 1fr)' : '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>
                  Fiat Currency *
                </label>
                <select
                  value={fiatCurrency}
                  onChange={(e) => setFiatCurrency(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '2px solid rgba(168, 85, 247, 0.3)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                >
                  {config && Object.entries(config.currencies).map(([code, info]) => (
                    <option key={code} value={code}>
                      {info.symbol} {info.name} ({code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>
                  Price per {cryptoCurrency} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '2px solid rgba(168, 85, 247, 0.3)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {cryptoAmount && pricePerUnit && (
              <div style={{
                padding: '1rem',
                background: 'rgba(168, 85, 247, 0.1)',
                border: '2px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '10px'
              }}>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.25rem' }}>
                  Total Value
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#A855F7' }}>
                  {currencySymbol}{totalValue}
                </div>
              </div>
            )}
          </div>

          {/* Limits */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.05), rgba(168, 85, 247, 0.05))',
            border: '2px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ fontSize: '1.375rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '1.5rem' }}>
              Trade Limits
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 768 ? 'repeat(2, 1fr)' : '1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>
                  Minimum Purchase ({cryptoCurrency}) *
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  placeholder="0.00"
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>
                  Maximum Purchase ({cryptoCurrency}) *
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  placeholder="0.00"
                  value={maxPurchase}
                  onChange={(e) => setMaxPurchase(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(0, 240, 255, 0.05))',
            border: '2px solid rgba(168, 85, 247, 0.2)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ fontSize: '1.375rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '1.5rem' }}>
              Payment Methods *
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 768 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '1rem' }}>
              {config && Object.values(config.payment_methods).map((pm) => (
                <div
                  key={pm.id}
                  onClick={() => togglePaymentMethod(pm.id)}
                  style={{
                    padding: '1rem',
                    background: selectedPaymentMethods.includes(pm.id) ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                    border: `2px solid ${selectedPaymentMethods.includes(pm.id) ? '#A855F7' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{pm.icon}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#FFFFFF' }}>{pm.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>
                    ~{pm.estimated_time_minutes}m
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seller Requirements */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.05), rgba(168, 85, 247, 0.05))',
            border: '2px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ fontSize: '1.375rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '1.5rem' }}>
              Advertiser Requirements (Optional)
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>
                Add Requirement
              </label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="e.g., KYC Required, UK Banks Only"
                  value={newRequirement}
                  onChange={(e) => setNewRequirement(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={addRequirement}
                  style={{
                    padding: '0.875rem 1.5rem',
                    background: 'linear-gradient(135deg, #00F0FF, #00B8E6)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#000000',
                    fontSize: '1rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <IoAdd size={20} />
                  Add
                </button>
              </div>
            </div>

            {sellerRequirements.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {sellerRequirements.map((req, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '2px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#F59E0B' }}>
                      {req.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRequirement(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <IoClose size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => navigate('/p2p-marketplace')}
              style={{
                flex: 1,
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '1.125rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              style={{
                flex: 1,
                padding: '1rem',
                background: creating ? 'rgba(0, 240, 255, 0.5)' : 'linear-gradient(135deg, #00F0FF, #A855F7)',
                border: 'none',
                borderRadius: '12px',
                color: '#000000',
                fontSize: '1.125rem',
                fontWeight: '700',
                cursor: creating ? 'not-allowed' : 'pointer'
              }}
            >
              {creating ? 'Creating Offer...' : 'Create Offer'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
