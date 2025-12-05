import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { IoAlertCircle, IoCheckmark as Check, IoCheckmarkCircle, IoClose, IoFlash, IoShield, IoTrendingUp } from 'react-icons/io5';

const API = process.env.REACT_APP_BACKEND_URL || 'https://tradefix-preview.preview.emergentagent.com';

const EXPRESS_CRYPTOS = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'LTC'];

function ExpressBuyModal({ isOpen, onClose }) {
  const [crypto, setCrypto] = useState('BTC');
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [matchedOffer, setMatchedOffer] = useState(null);
  const [matching, setMatching] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [walletValid, setWalletValid] = useState(null);
  const [validatingWallet, setValidatingWallet] = useState(false);

  useEffect(() => {
    if (walletAddress && walletAddress.length > 10) {
      validateWallet();
    }
  }, [walletAddress]);

  const validateWallet = async () => {
    setValidatingWallet(true);
    try {
      const response = await axios.post(`${API}/api/wallet/validate`, {
        address: walletAddress,
        currency: crypto,
        network: 'mainnet'
      });
      setWalletValid(response.data.valid);
    } catch (error) {
      setWalletValid(false);
    } finally {
      setValidatingWallet(false);
    }
  };

  const findMatch = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const userStr = localStorage.getItem('user');
    if (!userStr) {
      toast.error('Please login to use Express Buy');
      return;
    }
    const user = JSON.parse(userStr);

    setMatching(true);
    try {
      const response = await axios.post(`${API}/api/express-buy/match`, {
        crypto_currency: crypto,
        fiat_amount: parseFloat(amount),
        user_id: user.user_id
      });

      if (response.data.success) {
        setMatchedOffer(response.data.matched_offer);
        toast.success('Matched with cheapest seller!');
      }
    } catch (error) {
      console.error('Error matching:', error);
      toast.error(error.response?.data?.detail || 'No sellers available for this amount');
    } finally {
      setMatching(false);
    }
  };

  const executeExpressBuy = async () => {
    if (!walletAddress || !walletValid) {
      toast.error('Please enter a valid wallet address');
      return;
    }

    const userStr = localStorage.getItem('user');
    if (!userStr) {
      toast.error('Please login to continue');
      return;
    }
    const user = JSON.parse(userStr);

    setExecuting(true);
    try {
      const response = await axios.post(`${API}/api/express-buy/execute`, {
        user_id: user.user_id,
        ad_id: matchedOffer.ad_id,
        crypto_currency: matchedOffer.crypto_currency,
        crypto_amount: matchedOffer.crypto_amount,
        net_crypto_to_buyer: matchedOffer.net_crypto_to_buyer || matchedOffer.crypto_amount,
        fiat_amount: matchedOffer.fiat_amount,
        buyer_wallet_address: walletAddress,
        buyer_wallet_network: 'mainnet'
      });

      if (response.data.success) {
        toast.success(response.data.message);
        onClose();
        // Optionally redirect to trade page
        window.location.href = `/trade/${response.data.trade_id}`;
      }
    } catch (error) {
      console.error('Error executing express buy:', error);
      toast.error(error.response?.data?.detail || 'Failed to execute express buy');
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

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
        border: '2px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <IoFlash size={28} color="#22C55E" />
            <h2 style={{ color: '#22C55E', fontSize: '1.5rem', fontWeight: '700', textTransform: 'uppercase' }}>
              Express Buy
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
            <IoClose size={24} />
          </button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Get matched with the cheapest seller instantly. One-click purchase with 1.5% express fee.
        </p>

        {!matchedOffer ? (
          <>
            {/* Select Crypto */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                Select Cryptocurrency
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {EXPRESS_CRYPTOS.map(c => (
                  <button
                    key={c}
                    onClick={() => setCrypto(c)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: crypto === c ? 'rgba(34, 197, 94, 0.2)' : 'rgba(26, 31, 58, 0.8)',
                      border: crypto === c ? '2px solid #22C55E' : '2px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '10px',
                      color: crypto === c ? '#22C55E' : 'rgba(255,255,255,0.6)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                Amount (GBP)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount in GBP"
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '2px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '1rem'
                }}
              />
            </div>

            {/* Find Match Button */}
            <button
              onClick={findMatch}
              disabled={matching || !amount || parseFloat(amount) <= 0}
              style={{
                width: '100%',
                padding: '1.25rem',
                background: (matching || !amount || parseFloat(amount) <= 0)
                  ? 'rgba(34, 197, 94, 0.3)'
                  : 'linear-gradient(135deg, #22C55E, #16A34A)',
                border: 'none',
                borderRadius: '12px',
                color: (matching || !amount || parseFloat(amount) <= 0) ? 'rgba(255,255,255,0.5)' : '#fff',
                fontSize: '1.125rem',
                fontWeight: '700',
                cursor: (matching || !amount || parseFloat(amount) <= 0) ? 'not-allowed' : 'pointer',
                boxShadow: (matching || !amount || parseFloat(amount) <= 0) ? 'none' : '0 4px 20px rgba(34, 197, 94, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <IoTrendingUp size={20} />
              {matching ? 'Finding Best Seller...' : 'Find Best Match'}
            </button>
          </>
        ) : (
          <>
            {/* Matched Offer */}
            <div style={{
              padding: '1.5rem',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '2px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '12px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <IoCheckmarkCircle size={20} color="#22C55E" />
                <span style={{ color: '#22C55E', fontWeight: '700', fontSize: '1rem' }}>
                  Best Match Found!
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>Seller:</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>{matchedOffer.seller_name}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>Price per {crypto}:</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>£{matchedOffer.price_per_unit.toLocaleString()}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>You Get:</span>
                  <span style={{ color: '#22C55E', fontWeight: '700', fontSize: '1rem' }}>
                    {matchedOffer.crypto_amount.toFixed(8)} {crypto}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>Express Fee (1.5%):</span>
                  <span style={{ color: '#F59E0B', fontWeight: '600' }}>£{matchedOffer.express_fee_fiat.toFixed(2)}</span>
                </div>

                <div style={{ height: '1px', background: 'rgba(34, 197, 94, 0.2)', margin: '0.25rem 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#22C55E', fontWeight: '600' }}>Total:</span>
                  <span style={{ color: '#22C55E', fontWeight: '700', fontSize: '1rem' }}>
                    £{matchedOffer.fiat_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Wallet Address */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                Your {crypto} Wallet Address <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder={`Enter your ${crypto} wallet address`}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: `2px solid ${walletValid === true ? '#22C55E' : walletValid === false ? '#EF4444' : 'rgba(34, 197, 94, 0.3)'}`,
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '0.875rem'
                }}
              />
              {validatingWallet && (
                <div style={{ fontSize: '0.75rem', color: '#22C55E', marginTop: '0.5rem' }}>
                  Validating wallet address...
                </div>
              )}
              {walletValid === true && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#22C55E', marginTop: '0.5rem' }}>
                  <IoCheckmarkCircle size={14} />
                  Valid wallet address
                </div>
              )}
              {walletValid === false && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#EF4444', marginTop: '0.5rem' }}>
                  <IoAlertCircle size={14} />
                  Invalid wallet address
                </div>
              )}
            </div>

            {/* Security Notice */}
            <div style={{
              padding: '1rem',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '2px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '12px',
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <IoShield size={20} color="#22C55E" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>
                <div style={{ fontWeight: '700', color: '#22C55E', marginBottom: '0.25rem' }}>
                  Instant & Secure
                </div>
                Crypto will be locked in escrow. Payment required to complete the trade.
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setMatchedOffer(null)}
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
                onClick={executeExpressBuy}
                disabled={executing || !walletValid}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: (executing || !walletValid)
                    ? 'rgba(34, 197, 94, 0.3)'
                    : 'linear-gradient(135deg, #22C55E, #16A34A)',
                  border: 'none',
                  borderRadius: '12px',
                  color: (executing || !walletValid) ? 'rgba(255,255,255,0.5)' : '#fff',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: (executing || !walletValid) ? 'not-allowed' : 'pointer',
                  boxShadow: (executing || !walletValid) ? 'none' : '0 4px 20px rgba(34, 197, 94, 0.4)'
                }}
              >
                {executing ? 'Processing...' : 'Confirm Purchase'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ExpressBuyModal;
