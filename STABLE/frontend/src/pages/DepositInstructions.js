import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Copy, IoAlertCircle, IoArrowBack, IoCheckmark, IoCopy, Loader } from 'react-icons/io5';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import axios from 'axios';
import { toast } from 'sonner';
import QRCode from 'qrcode';

const API = process.env.REACT_APP_BACKEND_URL;

export default function DepositInstructions() {
  const { coin } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [depositAddress, setDepositAddress] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(coin?.toUpperCase() || 'BTC');
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [amountToSend, setAmountToSend] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userData));
    fetchAvailableCurrencies();
  }, [navigate]);

  useEffect(() => {
    if (user && selectedCurrency) {
      generateDepositAddress();
    }
  }, [user, selectedCurrency]);

  const fetchAvailableCurrencies = async () => {
    try {
      const response = await axios.get(`${API}/api/nowpayments/currencies`);
      if (response.data.success && response.data.currencies) {
        const currencies = response.data.currencies
          .filter(c => c && c.length >= 3)
          .map(c => c.toUpperCase())
          .sort();
        setAvailableCurrencies(currencies);
      }
    } catch (error) {
      console.error('Failed to load currencies:', error);
      setAvailableCurrencies(['BTC', 'ETH', 'USDT', 'LTC', 'DOGE', 'SOL', 'BNB']);
    }
  };

  const generateDepositAddress = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/nowpayments/create-deposit`, {
        user_id: user.user_id,
        amount: 50,
        currency: 'gbp',
        pay_currency: selectedCurrency.toLowerCase()
      });

      if (response.data.success) {
        const address = response.data.deposit_address || response.data.address || response.data.pay_address;
        const pId = response.data.payment_id;
        const amount = response.data.amount_to_send;
        
        setDepositAddress(address);
        setPaymentId(pId);
        setAmountToSend(amount);
        
        // Generate QR code
        const qrUrl = await QRCode.toDataURL(address);
        setQrCodeUrl(qrUrl);
        
        toast.success('Deposit address generated!');
      } else {
        toast.error(response.data.message || 'Failed to generate address');
      }
    } catch (error) {
      console.error('Error generating deposit address:', error);
      toast.error(error.response?.data?.message || 'Failed to generate deposit address');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getCoinColor = (curr) => {
    const colors = {
      'BTC': '#F7931A',
      'ETH': '#627EEA',
      'USDT': '#26A17B',
      'BNB': '#F3BA2F',
      'SOL': '#9945FF',
      'LTC': '#345D9D',
      'DOGE': '#C3A634'
    };
    return colors[curr] || '#00F0FF';
  };

  if (loading && !depositAddress) {
    return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #05060B 0%, #080B14 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <AiOutlineLoading3Quarters size={48} color="#00F0FF" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <div style={{ fontSize: '18px', color: '#FFFFFF', fontWeight: '600' }}>Generating deposit address...</div>
            <div style={{ fontSize: '14px', color: '#A3AEC2', marginTop: '8px' }}>Please wait</div>
          </div>
        </div>
    );
  }

  return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05060B 0%, #080B14 100%)',
        padding: '20px'
      }}>
        {/* Header */}
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <button
            onClick={() => navigate('/wallet')}
            className="premium-btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              marginBottom: '24px',
              fontSize: '14px'
            }}
          >
            <IoArrowBack size={18} />
            Back to Wallet
          </button>

          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#FFFFFF', marginBottom: '8px' }}>Deposit {selectedCurrency}</h1>
            <p style={{ fontSize: '15px', color: '#A3AEC2' }}>Send {selectedCurrency} to the address below. Deposits are automatically credited after confirmation.</p>
          </div>

          {/* Currency Selector */}
          <div style={{
            background: 'linear-gradient(135deg, #0B1220 0%, #101828 100%)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '22px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <label style={{ fontSize: '14px', color: '#A3AEC2', marginBottom: '12px', display: 'block' }}>Select Cryptocurrency</label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="premium-input"
              style={{ width: '100%', fontSize: '16px' }}
            >
              {availableCurrencies.map(curr => (
                <option key={curr} value={curr}>{curr}</option>
              ))}
            </select>
          </div>

          {/* Deposit Address Card */}
          {depositAddress && (
            <div style={{
              background: 'linear-gradient(135deg, #0B1220 0%, #101828 100%)',
              border: `2px solid ${getCoinColor(selectedCurrency)}44`,
              borderRadius: '22px',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: `0 0 20px ${getCoinColor(selectedCurrency)}22`
            }}>
              {/* QR Code */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF', marginBottom: '16px' }}>Scan QR Code</div>
                {qrCodeUrl && (
                  <img 
                    src={qrCodeUrl} 
                    alt="Deposit QR Code" 
                    style={{
                      width: '200px',
                      height: '200px',
                      margin: '0 auto',
                      border: '4px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '16px',
                      padding: '12px',
                      background: '#FFFFFF'
                    }}
                  />
                )}
              </div>

              {/* Deposit Address */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', color: '#A3AEC2', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deposit Address</label>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <code style={{
                    color: '#00F0FF',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    flex: 1
                  }}>
                    {depositAddress}
                  </code>
                  <button
                    onClick={() => copyToClipboard(depositAddress)}
                    style={{
                      background: 'rgba(0, 240, 255, 0.1)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '8px',
                      padding: '8px',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {copied ? <IoCheckmark size={18} color="#6EE7B7" /> : <IoCopy size={18} color="#00F0FF" />}
                  </button>
                </div>
              </div>

              {/* Amount to Send */}
              {amountToSend && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '13px', color: '#A3AEC2', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount to Send</label>
                  <div style={{
                    background: 'rgba(0, 240, 255, 0.05)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    borderRadius: '12px',
                    padding: '14px',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#00F0FF'
                  }}>
                    {amountToSend} {selectedCurrency}
                  </div>
                </div>
              )}

              {/* Payment ID */}
              {paymentId && (
                <div>
                  <label style={{ fontSize: '13px', color: '#A3AEC2', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment ID</label>
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '14px',
                    fontSize: '14px',
                    color: '#A3AEC2',
                    fontFamily: 'monospace'
                  }}>
                    {paymentId}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Warning */}
          <div style={{
            background: 'rgba(255, 191, 0, 0.05)',
            border: '1px solid rgba(255, 191, 0, 0.3)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <IoAlertCircle size={20} color="#FBBF24" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#FBBF24', marginBottom: '4px' }}>Important</div>
              <div style={{ fontSize: '13px', color: '#FDE68A', lineHeight: '1.5' }}>
                Only send {selectedCurrency} to this address. Sending any other cryptocurrency will result in permanent loss of funds. Minimum deposit: 0.0001 {selectedCurrency}.
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={generateDepositAddress}
            className="premium-btn-secondary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            {loading ? 'Generating...' : 'Generate New Address'}
          </button>
        </div>
      </div>
  );
}
