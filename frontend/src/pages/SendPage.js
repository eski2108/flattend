import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IoArrowBack, IoCheckmarkCircle, IoAlertCircle, IoCopyOutline, IoQrCodeOutline } from 'react-icons/io5';
import axios from 'axios';
import { getCoinLogo } from '@/utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SendPage() {
  const navigate = useNavigate();
  const { currency } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // ALL data from backend
  const [metadata, setMetadata] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [txResult, setTxResult] = useState(null);

  useEffect(() => {
    if (!currency) {
      navigate('/wallet');
      return;
    }
    loadMetadata();
  }, [currency]);

  const loadMetadata = async () => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) { 
      navigate('/login'); 
      return; 
    }
    const user = JSON.parse(userData);

    try {
      setLoading(true);
      setError('');
      
      // Get ALL metadata from backend
      const res = await axios.get(
        `${API}/api/wallet/send/${currency.toUpperCase()}/metadata`,
        { params: { user_id: user.user_id } }
      );
      
      if (res.data.success) {
        setMetadata(res.data);
      } else {
        setError(res.data.error || 'Failed to load data');
      }
      
    } catch (err) {
      console.error('Failed to load metadata:', err);
      setError(err.response?.data?.error || 'Failed to load page data');
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRecipientAddress(text);
    } catch (err) {
      console.error('Paste failed:', err);
    }
  };

  const handleMax = () => {
    if (!metadata) return;
    const maxAmount = Math.max(0, metadata.available_balance - metadata.estimated_network_fee);
    setAmount(maxAmount.toFixed(metadata.decimals));
  };

  const handleSend = async () => {
    setError('');
    
    if (!recipientAddress) {
      setError('Please enter recipient address');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const userData = localStorage.getItem('cryptobank_user');
      const user = JSON.parse(userData);
      
      const res = await axios.post(
        `${API}/api/wallet/send/${currency.toUpperCase()}`,
        {
          user_id: user.user_id,
          recipient_address: recipientAddress,
          amount: parseFloat(amount)
        }
      );
      
      if (res.data.success) {
        setSuccess(true);
        setTxResult(res.data);
        
        // Refresh balance
        await loadMetadata();
        
        // Redirect after 5 seconds
        setTimeout(() => {
          navigate('/wallet');
        }, 5000);
      } else {
        setError(res.data.error || 'Transaction failed');
      }
    } catch (err) {
      console.error('Send failed:', err);
      setError(err.response?.data?.error || 'Failed to send. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0B1120 0%, #060A14 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6B7A99'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px' }}>
          <div style={{
            width: '18px',
            height: '18px',
            border: '2px solid rgba(0,229,255,0.2)',
            borderTop: '2px solid #00E5FF',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          Loading...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0B1120 0%, #060A14 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        padding: '20px'
      }}>
        <IoAlertCircle size={48} color="#EA3943" style={{ marginBottom: '16px' }} />
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Failed to load</div>
        <div style={{ fontSize: '14px', color: '#8FA3C8', marginBottom: '20px' }}>{error}</div>
        <button
          onClick={() => navigate('/wallet')}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            background: '#00E5FF',
            color: '#001018',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const isDisabled = submitting || success || !recipientAddress || !amount;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0B1120 0%, #060A14 100%)',
      color: '#fff',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      {/* HEADER */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.04)'}
            >
              <IoArrowBack size={20} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-0.02em' }}>
                Send {metadata.currency}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.7, marginTop: '2px' }}>
                Send {metadata.currency_name} to an external address
              </div>
            </div>
            <div style={{
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(0,229,255,0.08)',
              border: '1px solid rgba(0,229,255,0.2)',
              fontSize: '12px',
              fontWeight: '600',
              color: '#00E5FF'
            }}>
              {metadata.network}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 20px' }}>
        {/* SUCCESS MESSAGE */}
        {success && txResult && (
          <div style={{
            marginBottom: '24px',
            padding: '20px',
            borderRadius: '16px',
            background: 'rgba(22,199,132,0.08)',
            border: '1px solid rgba(22,199,132,0.2)',
            boxShadow: '0 8px 32px rgba(22,199,132,0.12), 0 0 0 1px rgba(22,199,132,0.1)'
          }}>
            <div style={{ display: 'flex', gap: '14px' }}>
              <IoCheckmarkCircle size={28} color="#16C784" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#16C784', marginBottom: '8px' }}>
                  Withdrawal Submitted
                </div>
                <div style={{ fontSize: '14px', color: '#C5D0E6', marginBottom: '12px' }}>
                  {txResult.message}
                </div>
                <div style={{ fontSize: '13px', color: '#8FA3C8', fontFamily: 'monospace', lineHeight: '1.6' }}>
                  <div>TX ID: <span style={{ color: '#fff' }}>{txResult.tx_id}</span></div>
                  {txResult.provider_tx_id && (
                    <div style={{ marginTop: '4px' }}>Provider: <span style={{ color: '#fff' }}>{txResult.provider_tx_id}</span></div>
                  )}
                  <div style={{ marginTop: '4px' }}>Status: <span style={{ color: '#F0B90B', textTransform: 'uppercase' }}>{txResult.status}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && !success && (
          <div style={{
            marginBottom: '24px',
            padding: '16px 18px',
            borderRadius: '14px',
            background: 'rgba(234,57,67,0.08)',
            border: '1px solid rgba(234,57,67,0.25)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <IoAlertCircle size={22} color="#EA3943" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div style={{ fontSize: '14px', color: '#EA3943', lineHeight: '1.5' }}>{error}</div>
          </div>
        )}

        {/* PREMIUM BALANCE CARD */}
        <div style={{
          marginBottom: '28px',
          padding: '20px',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, rgba(0,71,217,0.06) 0%, rgba(0,229,255,0.06) 100%)',
          border: '1px solid rgba(0,229,255,0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,229,255,0.05), 0 4px 16px rgba(0,229,255,0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Ambient glow */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-30%',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(0,229,255,0.15) 0%, transparent 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none'
          }} />
          
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img 
              src={getCoinLogo(metadata.currency)} 
              alt={metadata.currency} 
              style={{ width: '48px', height: '48px', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} 
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', color: '#8FA3C8', marginBottom: '4px', fontWeight: '500' }}>
                Available {metadata.currency}
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#00E5FF', letterSpacing: '-0.02em' }}>
                {metadata.available_balance.toFixed(metadata.decimals)}
              </div>
              <div style={{ fontSize: '14px', color: '#6B7A99', marginTop: '2px' }}>
                ≈ £{metadata.gbp_value.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* RECIPIENT ADDRESS */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: '#8FA3C8',
            marginBottom: '10px'
          }}>
            Recipient Address
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder={`Enter ${metadata.currency} address`}
              disabled={submitting || success}
              style={{
                width: '100%',
                height: '52px',
                padding: '0 90px 0 16px',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: '#fff',
                fontSize: '14px',
                fontFamily: 'monospace',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.border = '1px solid rgba(0,229,255,0.4)';
                e.target.style.boxShadow = '0 0 0 3px rgba(0,229,255,0.08)';
              }}
              onBlur={(e) => {
                e.target.style.border = '1px solid rgba(255,255,255,0.08)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <div style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: '6px'
            }}>
              <button
                onClick={handlePaste}
                disabled={submitting || success}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#8FA3C8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: submitting || success ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => !submitting && !success && (e.target.style.background = 'rgba(255,255,255,0.1)', e.target.style.color = '#fff')}
                onMouseLeave={(e) => (e.target.style.background = 'rgba(255,255,255,0.06)', e.target.style.color = '#8FA3C8')}
              >
                <IoCopyOutline size={18} />
              </button>
              <button
                disabled
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#4A5568',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'not-allowed',
                  opacity: 0.4
                }}
              >
                <IoQrCodeOutline size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* AMOUNT */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#8FA3C8' }}>
              Amount
            </label>
            <div style={{ fontSize: '12px', color: '#6B7A99' }}>
              Available: <span style={{ color: '#8FA3C8', fontWeight: '500' }}>{metadata.available_balance.toFixed(metadata.decimals)} {metadata.currency}</span>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={submitting || success}
              style={{
                width: '100%',
                height: '52px',
                padding: '0 70px 0 16px',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: '#fff',
                fontSize: '18px',
                fontWeight: '600',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.border = '1px solid rgba(0,229,255,0.4)';
                e.target.style.boxShadow = '0 0 0 3px rgba(0,229,255,0.08)';
              }}
              onBlur={(e) => {
                e.target.style.border = '1px solid rgba(255,255,255,0.08)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button
              onClick={handleMax}
              disabled={submitting || success}
              style={{
                position: 'absolute',
                right: '8px',
                top: '8px',
                height: '36px',
                padding: '0 16px',
                borderRadius: '999px',
                border: 'none',
                background: 'linear-gradient(135deg, rgba(0,229,255,0.15) 0%, rgba(0,184,212,0.15) 100%)',
                color: '#00E5FF',
                fontSize: '13px',
                fontWeight: '700',
                cursor: submitting || success ? 'not-allowed' : 'pointer',
                boxShadow: '0 0 12px rgba(0,229,255,0.2)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => !submitting && !success && (e.target.style.boxShadow = '0 0 20px rgba(0,229,255,0.35)')}
              onMouseLeave={(e) => (e.target.style.boxShadow = '0 0 12px rgba(0,229,255,0.2)')}
            >
              MAX
            </button>
          </div>
        </div>

        {/* FEE INFO */}
        <div style={{
          marginBottom: '32px',
          padding: '14px 18px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#8FA3C8' }}>Estimated network fee</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
              {metadata.estimated_network_fee} {metadata.currency}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: '#8FA3C8' }}>Minimum withdrawal</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
              {metadata.minimum_withdrawal} {metadata.currency}
            </span>
          </div>
        </div>

        {/* SEND BUTTON */}
        <button
          onClick={handleSend}
          disabled={isDisabled}
          style={{
            width: '100%',
            height: '56px',
            borderRadius: '16px',
            border: 'none',
            background: isDisabled 
              ? 'rgba(0,229,255,0.15)' 
              : 'linear-gradient(135deg, #00E5FF 0%, #7B2CFF 100%)',
            color: isDisabled ? '#4A5568' : '#fff',
            fontSize: '16px',
            fontWeight: '700',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            boxShadow: isDisabled 
              ? 'none' 
              : '0 8px 32px rgba(0,229,255,0.3), 0 0 0 1px rgba(0,229,255,0.2)',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}
          onMouseEnter={(e) => {
            if (!isDisabled) {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 40px rgba(0,229,255,0.4), 0 0 0 1px rgba(0,229,255,0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            if (!isDisabled) {
              e.target.style.boxShadow = '0 8px 32px rgba(0,229,255,0.3), 0 0 0 1px rgba(0,229,255,0.2)';
            }
          }}
        >
          {submitting && (
            <div style={{
              width: '18px',
              height: '18px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTop: '2px solid #fff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
          )}
          {submitting ? 'Sending...' : success ? 'Sent!' : `Send ${metadata.currency}`}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}
