import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IoArrowBack, IoCheckmarkCircle, IoAlertCircle, IoCopyOutline, IoQrCodeOutline } from 'react-icons/io5';
import axios from 'axios';
import { getCoinLogo } from '@/utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SendPage() {
  const navigate = useNavigate();
  const { currency } = useParams(); // Get currency from URL: /send/btc
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Data from backend
  const [assetData, setAssetData] = useState(null);
  const [balance, setBalance] = useState({
    available: 0,
    locked: 0,
    total: 0
  });
  const [fees, setFees] = useState({
    network_fee: 0,
    min_withdraw: 0
  });
  
  // Form data
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [withdrawalResult, setWithdrawalResult] = useState(null);

  useEffect(() => {
    if (!currency) {
      navigate('/wallet');
      return;
    }
    loadPageData();
  }, [currency]);

  const loadPageData = async () => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) { 
      navigate('/login'); 
      return; 
    }
    const user = JSON.parse(userData);

    try {
      setLoading(true);
      
      // 1. Get balances
      const balanceRes = await axios.get(`${API}/api/wallets/balances/${user.user_id}`);
      
      // 2. Get coin metadata
      const metaRes = await axios.get(`${API}/api/wallets/coin-metadata`);
      
      // 3. Get fees for this currency
      const feesRes = await axios.get(`${API}/api/wallets/${currency.toUpperCase()}/fees`);
      
      // Process balance
      if (balanceRes.data.success) {
        const userBalance = balanceRes.data.balances?.find(
          b => b.currency.toLowerCase() === currency.toLowerCase()
        );
        if (userBalance) {
          setBalance({
            available: userBalance.available_balance || 0,
            locked: userBalance.locked_balance || 0,
            total: userBalance.total_balance || 0,
            gbp_value: userBalance.gbp_value || 0
          });
        }
      }
      
      // Process metadata
      if (metaRes.data.success) {
        const coinData = metaRes.data.coins?.find(
          c => c.symbol.toLowerCase() === currency.toLowerCase()
        );
        if (coinData) {
          setAssetData({
            symbol: coinData.symbol,
            name: coinData.name,
            decimals: coinData.decimals || 8,
            logoUrl: getCoinLogo(coinData.symbol)
          });
        }
      }
      
      // Process fees
      if (feesRes.data.success) {
        setFees({
          network_fee: feesRes.data.estimated_network_fee || 0,
          min_withdraw: feesRes.data.min_withdraw || 0,
          network: feesRes.data.network
        });
      }
      
    } catch (err) {
      console.error('Failed to load page data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setToAddress(text);
    } catch (err) {
      console.error('Failed to paste:', err);
    }
  };

  const handleMaxClick = () => {
    const maxAmount = Math.max(0, balance.available - fees.network_fee);
    setAmount(maxAmount.toFixed(8));
  };

  const handleSend = async () => {
    setError('');
    
    // Validation
    if (!toAddress) {
      setError('Please enter recipient address');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    const amountNum = parseFloat(amount);
    
    if (amountNum < fees.min_withdraw) {
      setError(`Minimum withdrawal is ${fees.min_withdraw} ${currency.toUpperCase()}`);
      return;
    }
    
    const totalNeeded = amountNum + fees.network_fee;
    if (totalNeeded > balance.available) {
      setError(`Insufficient balance. Need ${totalNeeded.toFixed(8)} ${currency.toUpperCase()} (including fee)`);
      return;
    }
    
    setSubmitting(true);
    
    try {
      const userData = localStorage.getItem('cryptobank_user');
      const user = JSON.parse(userData);
      
      const response = await axios.post(`${API}/api/wallets/${currency.toUpperCase()}/send`, {
        user_id: user.user_id,
        to_address: toAddress,
        amount: amountNum,
        network: fees.network
      });
      
      if (response.data.success) {
        setSuccess(true);
        setWithdrawalResult(response.data);
        // Redirect after 4 seconds
        setTimeout(() => {
          navigate('/wallet');
        }, 4000);
      } else {
        setError(response.data.error || 'Failed to process withdrawal');
      }
    } catch (err) {
      console.error('Send error:', err);
      setError(err.response?.data?.error || 'Failed to send. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #09111D 0%, #050810 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6B7A99'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '3px solid rgba(0,229,255,0.2)',
            borderTop: '3px solid #00E5FF',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Loading...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!assetData) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #09111D 0%, #050810 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      }}>
        Asset not found
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #09111D 0%, #050810 100%)',
      color: '#fff',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      paddingBottom: '40px'
    }}>
      {/* Header Bar */}
      <div style={{
        height: window.innerWidth < 768 ? '64px' : '72px',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(9, 17, 29, 0.8)',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <IoArrowBack size={20} />
          </button>
          <div>
            <div style={{
              fontSize: window.innerWidth < 768 ? '18px' : '22px',
              fontWeight: '700',
              letterSpacing: '-0.01em'
            }}>
              Send {assetData.symbol}
            </div>
            <div style={{
              fontSize: '13px',
              opacity: 0.7,
              marginTop: '2px'
            }}>
              Send {assetData.name} to an external address
            </div>
          </div>
        </div>
        <div style={{
          height: '28px',
          padding: '0 12px',
          borderRadius: '999px',
          background: 'rgba(0,229,255,0.1)',
          border: '1px solid rgba(0,229,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          fontSize: '12px',
          color: '#00E5FF'
        }}>
          {fees.network}
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1180px',
        margin: '0 auto',
        padding: window.innerWidth < 768 ? '16px' : '32px'
      }}>
        {/* Success Message */}
        {success && withdrawalResult && (
          <div style={{
            marginBottom: '24px',
            padding: '20px 24px',
            borderRadius: '18px',
            background: 'rgba(22,199,132,0.1)',
            border: '1px solid rgba(22,199,132,0.3)',
            boxShadow: '0 8px 32px rgba(22,199,132,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <IoCheckmarkCircle size={28} color="#16C784" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#16C784', marginBottom: '8px' }}>
                  Withdrawal Submitted
                </div>
                <div style={{ fontSize: '14px', color: '#C5D0E6', marginBottom: '12px' }}>
                  Your withdrawal is being processed
                </div>
                <div style={{ fontSize: '13px', color: '#8FA3C8' }}>
                  <div>Transaction ID: <span style={{ fontFamily: 'monospace', color: '#fff' }}>{withdrawalResult.withdrawal_id}</span></div>
                  {withdrawalResult.provider_tx_id && (
                    <div style={{ marginTop: '4px' }}>Provider ID: <span style={{ fontFamily: 'monospace', color: '#fff' }}>{withdrawalResult.provider_tx_id}</span></div>
                  )}
                  <div style={{ marginTop: '4px' }}>Status: <span style={{ color: '#F0B90B' }}>{withdrawalResult.status}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && !success && (
          <div style={{
            marginBottom: '24px',
            padding: '16px 20px',
            borderRadius: '14px',
            background: 'rgba(234,57,67,0.1)',
            border: '1px solid rgba(234,57,67,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <IoAlertCircle size={24} color="#EA3943" />
            <div style={{ fontSize: '14px', color: '#EA3943' }}>{error}</div>
          </div>
        )}

        {/* Main Card */}
        <div style={{
          borderRadius: '18px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: window.innerWidth < 768 ? '20px' : '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02)'
        }}>
          {/* Balance Strip */}
          <div style={{
            height: '64px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(0,71,217,0.08) 0%, rgba(0,229,255,0.08) 100%)',
            border: '1px solid rgba(0,229,255,0.15)',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: window.innerWidth < 768 ? '16px' : '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={assetData.logoUrl} alt={assetData.symbol} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
              <span style={{ fontSize: '14px', color: '#8FA3C8', fontWeight: '500' }}>Available {assetData.symbol}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: window.innerWidth < 768 ? '18px' : '20px', fontWeight: '700', color: '#00E5FF' }}>
                {balance.available.toFixed(assetData.decimals)}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>
                £{balance.gbp_value?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>

          {/* Recipient Address Field */}
          <div style={{ marginBottom: window.innerWidth < 768 ? '16px' : '18px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              opacity: 0.75,
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              Recipient Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder={`Enter ${assetData.symbol} address`}
                disabled={submitting || success}
                style={{
                  width: '100%',
                  height: '52px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#fff',
                  fontSize: '14px',
                  padding: '0 100px 0 14px',
                  outline: 'none',
                  fontFamily: 'monospace',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.border = '1px solid rgba(0,229,255,0.4)';
                  e.target.style.boxShadow = '0 0 0 2px rgba(0,229,255,0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.border = '1px solid rgba(255,255,255,0.1)';
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
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#8FA3C8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: submitting || success ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!submitting && !success) {
                      e.target.style.background = 'rgba(255,255,255,0.08)';
                      e.target.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.05)';
                    e.target.style.color = '#8FA3C8';
                  }}
                >
                  <IoCopyOutline size={18} />
                </button>
                <button
                  disabled
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#8FA3C8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'not-allowed',
                    opacity: 0.5
                  }}
                >
                  <IoQrCodeOutline size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Amount Section */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <label style={{
                fontSize: '12px',
                opacity: 0.75,
                fontWeight: '500'
              }}>
                Amount
              </label>
              <span style={{ fontSize: '12px', color: '#8FA3C8' }}>
                Available: {balance.available.toFixed(assetData.decimals)} {assetData.symbol}
              </span>
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
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#fff',
                  fontSize: '16px',
                  padding: '0 80px 0 14px',
                  outline: 'none',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.border = '1px solid rgba(0,229,255,0.4)';
                  e.target.style.boxShadow = '0 0 0 2px rgba(0,229,255,0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.border = '1px solid rgba(255,255,255,0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                onClick={handleMaxClick}
                disabled={submitting || success}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '8px',
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(0,229,255,0.3)',
                  background: 'rgba(0,229,255,0.1)',
                  color: '#00E5FF',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: submitting || success ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!submitting && !success) {
                    e.target.style.background = 'rgba(0,229,255,0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(0,229,255,0.1)';
                }}
              >
                MAX
              </button>
            </div>
          </div>

          {/* Fee Info */}
          <div style={{
            padding: '14px 18px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#8FA3C8' }}>Network Fee</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
                {fees.network_fee} {assetData.symbol}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#8FA3C8' }}>Minimum Withdrawal</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
                {fees.min_withdraw} {assetData.symbol}
              </span>
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={submitting || success || !toAddress || !amount}
            style={{
              width: '100%',
              height: '56px',
              borderRadius: '16px',
              border: 'none',
              background: (submitting || success || !toAddress || !amount) 
                ? 'rgba(0,229,255,0.2)' 
                : 'linear-gradient(135deg, #00E5FF 0%, #00B8D4 100%)',
              color: (submitting || success || !toAddress || !amount) ? '#6B7A99' : '#001018',
              fontSize: '16px',
              fontWeight: '700',
              cursor: (submitting || success || !toAddress || !amount) ? 'not-allowed' : 'pointer',
              boxShadow: (submitting || success || !toAddress || !amount) 
                ? 'none' 
                : '0 8px 24px rgba(0,229,255,0.35)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!submitting && !success && toAddress && amount) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 32px rgba(0,229,255,0.45)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 24px rgba(0,229,255,0.35)';
            }}
          >
            {submitting ? 'Processing...' : success ? 'Sent!' : `Send ${assetData.symbol}`}
          </button>
        </div>
      </div>
    </div>
  );
}
