import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { IoCalendar, IoCheckmark as Check, IoCheckmarkCircle, IoLockClosed, IoShield, IoStar, IoTrendingUp } from 'react-icons/io5';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function PublicSellerProfile() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const [seller, setSeller] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSellerProfile();
  }, [sellerId]);

  const fetchSellerProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/api/p2p/seller/${sellerId}`);
      
      if (response.data.success) {
        setSeller(response.data.seller);
        setOffers(response.data.offers);
      } else {
        setError(response.data.error || 'Seller not found');
      }
    } catch (error) {
      console.error('Failed to fetch seller profile:', error);
      setError('Failed to load seller profile');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = (offerId) => {
    // Redirect to P2P trading page with pre-selected offer
    navigate(`/trading?offer=${offerId}`);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(0, 240, 255, 0.3)',
            borderTop: '4px solid #00F0FF',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: '#888', fontSize: '14px' }}>Loading seller profile...</p>
        </div>
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        padding: '2rem'
      }}>
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '2px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          padding: '2rem',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#EF4444', fontSize: '24px', fontWeight: '700', marginBottom: '1rem' }}>
            Seller Not Found
          </h2>
          <p style={{ color: '#888', marginBottom: '1.5rem' }}>
            {error || 'The seller profile you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      padding: '2rem',
      color: '#fff'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>
            COIN HUB X
          </h1>
          <p style={{ color: '#888', fontSize: '14px' }}>Verified P2P Crypto Marketplace</p>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(0, 240, 255, 0.2)',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            borderRadius: '8px',
            color: '#00F0FF',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Visit Platform
        </button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Seller Info Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(168, 85, 247, 0.15))',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              fontWeight: '900',
              color: '#000'
            }}>
              {seller.username.charAt(0).toUpperCase()}
            </div>

            {/* Seller Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#00F0FF' }}>
                  {seller.username}
                </h2>
                {seller.is_verified && (
                  <div style={{
                    padding: '0.25rem 0.75rem',
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <IoShield size={16} color="#22C55E" />
                    <span style={{ color: '#22C55E', fontSize: '13px', fontWeight: '700' }}>
                      VERIFIED SELLER
                    </span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <IoStar size={18} color="#FBBF24" fill="#FBBF24" />
                  <span style={{ color: '#E2E8F0', fontSize: '16px', fontWeight: '600' }}>
                    {seller.rating.toFixed(1)} Rating
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <IoCheckmarkCircle size={18} color="#00F0FF" />
                  <span style={{ color: '#E2E8F0', fontSize: '16px', fontWeight: '600' }}>
                    {seller.total_trades} Completed Trades
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <IoTrendingUp size={18} color="#A855F7" />
                  <span style={{ color: '#E2E8F0', fontSize: '16px', fontWeight: '600' }}>
                    {seller.active_offers_count} Active Offers
                  </span>
                </div>

                {seller.member_since && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <IoCalendar size={18} color="#888" />
                    <span style={{ color: '#888', fontSize: '14px' }}>
                      Member since {new Date(seller.member_since).getFullYear()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Trust Badge */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem 1.5rem',
            background: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <IoLockClosed size={20} color="#00F0FF" />
            <p style={{ margin: 0, color: '#E2E8F0', fontSize: '14px' }}>
              <strong style={{ color: '#00F0FF' }}>100% Escrow Protected</strong> - All transactions are secured through CoinHub IoClose as X escrow system. Your funds are safe until trade completion.
            </p>
          </div>
        </div>

        {/* Active Offers */}
        <div>
          <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#00F0FF', marginBottom: '1.5rem' }}>
            Active Sell Offers ({offers.length})
          </h3>

          {offers.length === 0 ? (
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center'
            }}>
              <p style={{ color: '#888', fontSize: '16px' }}>
                This seller has no active offers at the moment.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '1.5rem'
            }}>
              {offers.map((offer) => (
                <div
                  key={offer.ad_id}
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.2)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.2)'}
                >
                  {/* Crypto & Price */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#00F0FF' }}>
                        {offer.crypto_currency}
                      </h4>
                      <div style={{
                        padding: '0.25rem 0.75rem',
                        background: 'rgba(34, 197, 94, 0.2)',
                        borderRadius: '6px'
                      }}>
                        <span style={{ color: '#22C55E', fontSize: '12px', fontWeight: '700' }}>
                          SELL
                        </span>
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#E2E8F0' }}>
                      {offer.price_type === 'fixed' 
                        ? `${offer.fiat_currency} ${offer.price_value.toLocaleString()}`
                        : `Market ${offer.price_value > 0 ? '+' : ''}${offer.price_value}%`
                      }
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '12px', color: '#888' }}>
                      per {offer.crypto_currency}
                    </p>
                  </div>

                  {/* Limits */}
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '13px', color: '#888', fontWeight: '600' }}>
                      Limits:
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#E2E8F0', fontSize: '14px' }}>Min:</span>
                      <span style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: '600' }}>
                        {offer.fiat_currency} {offer.min_amount.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#E2E8F0', fontSize: '14px' }}>Max:</span>
                      <span style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: '600' }}>
                        {offer.fiat_currency} {offer.max_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '13px', color: '#888', fontWeight: '600' }}>
                      Payment Methods:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {offer.payment_methods.map((method, index) => (
                        <span
                          key={index}
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: 'rgba(168, 85, 247, 0.2)',
                            border: '1px solid rgba(168, 85, 247, 0.4)',
                            borderRadius: '6px',
                            color: '#A855F7',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Buy Button */}
                  <button
                    onClick={() => handleBuyNow(offer.ad_id)}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#000',
                      fontWeight: '900',
                      fontSize: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <IoLockClosed size={20} />
                    Buy Now (Escrow Protected)
                  </button>

                  {offer.terms && (
                    <p style={{ margin: '0.75rem 0 0', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                      Terms: {offer.terms}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div style={{
          marginTop: '3rem',
          padding: '1.5rem',
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 1rem', color: '#888', fontSize: '14px' }}>
            Want to trade crypto safely? Join CoinHub IoClose as X - The most secure P2P marketplace.
          </p>
          <button
            onClick={() => navigate('/register')}
            style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontWeight: '900',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Create Free Account
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
