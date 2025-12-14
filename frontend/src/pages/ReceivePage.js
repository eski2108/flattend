import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { IoArrowBack, IoCopyOutline, IoCheckmark } from 'react-icons/io5';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { getCoinLogo } from '@/utils/coinLogos';

const API = process.env.REACT_APP_BACKEND_URL;

export default function ReceivePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Get asset from URL parameter or location state
  const assetFromParam = searchParams.get('asset');
  const assetFromState = location.state?.asset;
  const preselectedAsset = (assetFromParam || assetFromState || 'BTC').toUpperCase();
  
  const [selectedCurrency, setSelectedCurrency] = useState(preselectedAsset);
  const [depositAddress, setDepositAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [allCoins, setAllCoins] = useState([]);

  useEffect(() => {
    loadCoins();
  }, []);

  useEffect(() => {
    if (selectedCurrency) {
      fetchDepositAddress();
    }
  }, [selectedCurrency]);

  const loadCoins = async () => {
    try {
      const response = await axios.get(`${API}/api/wallets/coin-metadata`);
      if (response.data.success) {
        setAllCoins(response.data.coins || []);
      }
    } catch (error) {
      console.error('Failed to load coins:', error);
    }
  };

  const fetchDepositAddress = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API}/api/crypto-bank/deposit-address/${selectedCurrency.toLowerCase()}`);
      
      if (response.data.success && response.data.address) {
        setDepositAddress(response.data.address);
      } else {
        setError('Failed to generate deposit address. Please try again.');
      }
    } catch (err) {
      console.error('Deposit address error:', err);
      setError(err.response?.data?.detail || 'Failed to get deposit address');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedCoin = allCoins.find(c => c.symbol === selectedCurrency) || { name: selectedCurrency };

  return (
    <div style={{ minHeight: '100vh', background: '#060B1A', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px' }}>
          <IoArrowBack size={24} />
        </button>
        <div style={{ fontSize: '20px', fontWeight: '700' }}>Receive {selectedCurrency}</div>
      </div>

      <div style={{ padding: '24px 20px', maxWidth: '500px', margin: '0 auto' }}>
        {/* Coin Selector */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#8FA3C8', marginBottom: '8px', fontWeight: '500' }}>
            Select Asset
          </label>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '15px',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {allCoins.map(coin => (
              <option key={coin.symbol} value={coin.symbol}>{coin.symbol} - {coin.name}</option>
            ))}
          </select>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '14px', color: '#8FA3C8' }}>Generating deposit address...</div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div style={{
            padding: '16px',
            background: 'rgba(234, 57, 67, 0.1)',
            border: '1px solid rgba(234, 57, 67, 0.3)',
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '14px', color: '#EA3943' }}>{error}</div>
            <button
              onClick={fetchDepositAddress}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                background: '#EA3943',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Success State - Show Address */}
        {depositAddress && !loading && !error && (
          <>
            {/* Network Warning */}
            <div style={{
              padding: '16px',
              background: 'rgba(240, 185, 11, 0.1)',
              border: '1px solid rgba(240, 185, 11, 0.3)',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '14px', color: '#F0B90B', fontWeight: '600', marginBottom: '8px' }}>
                ⚠️ Important
              </div>
              <div style={{ fontSize: '13px', color: '#8FA3C8', lineHeight: '1.5' }}>
                Only send <strong style={{ color: '#fff' }}>{selectedCurrency}</strong> to this address. 
                Sending any other asset will result in permanent loss.
              </div>
            </div>

            {/* QR Code */}
            <div style={{
              background: '#fff',
              padding: '20px',
              borderRadius: '16px',
              display: 'inline-block',
              marginBottom: '24px'
            }}>
              <QRCode value={depositAddress} size={200} />
            </div>

            {/* Address Display */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#8FA3C8', marginBottom: '8px', fontWeight: '500' }}>
                {selectedCurrency} Deposit Address
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px'
              }}>
                <div style={{
                  flex: 1,
                  fontSize: '14px',
                  color: '#fff',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace'
                }}>
                  {depositAddress}
                </div>
                <button
                  onClick={copyAddress}
                  style={{
                    padding: '8px',
                    background: copied ? '#16C784' : 'transparent',
                    border: 'none',
                    color: copied ? '#fff' : '#8FA3C8',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  {copied ? <IoCheckmark size={20} /> : <IoCopyOutline size={20} />}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div style={{
              padding: '16px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              fontSize: '13px',
              color: '#8FA3C8',
              lineHeight: '1.6'
            }}>
              <div style={{ fontWeight: '600', color: '#fff', marginBottom: '8px' }}>How to deposit:</div>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Copy the address above or scan the QR code</li>
                <li>Send {selectedCurrency} from your external wallet</li>
                <li>Wait for network confirmations</li>
                <li>Your balance will update automatically</li>
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
