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
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #0A0F1E 0%, #050810 100%)', 
      color: '#fff', 
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* MASSIVE Animated Background Glows */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '-15%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(0,229,255,0.25) 0%, rgba(0,229,255,0.1) 40%, transparent 70%)',
        filter: 'blur(100px)',
        pointerEvents: 'none',
        animation: 'float 8s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        top: '30%',
        right: '-20%',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(123,44,255,0.2) 0%, rgba(123,44,255,0.08) 40%, transparent 70%)',
        filter: 'blur(100px)',
        pointerEvents: 'none',
        animation: 'float 10s ease-in-out infinite reverse'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        left: '20%',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(0,71,217,0.18) 0%, transparent 70%)',
        filter: 'blur(90px)',
        pointerEvents: 'none',
        animation: 'float 12s ease-in-out infinite'
      }} />
      {/* Premium Header with Enhanced Glow */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: 'rgba(10, 15, 30, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '18px 24px',
        borderBottom: '1px solid rgba(0,229,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        zIndex: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 0 40px rgba(0,229,255,0.1)'
      }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            color: '#fff', 
            cursor: 'pointer', 
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
        >
          <IoArrowBack size={22} />
        </button>
        <div style={{ 
          fontSize: '20px', 
          fontWeight: '700',
          background: 'linear-gradient(135deg, #00E5FF 0%, #FFFFFF 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.01em'
        }}>
          Receive {selectedCurrency}
        </div>
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
            {/* Premium Warning Card with Glow */}
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(240, 185, 11, 0.12) 0%, rgba(255, 159, 10, 0.08) 100%)',
              border: '1px solid rgba(240, 185, 11, 0.25)',
              borderRadius: '16px',
              marginBottom: '28px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(240, 185, 11, 0.15)'
            }}>
              <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-20%',
                width: '150px',
                height: '150px',
                background: 'radial-gradient(circle, rgba(240,185,11,0.15) 0%, transparent 70%)',
                filter: 'blur(40px)',
                pointerEvents: 'none'
              }} />
              <div style={{ 
                fontSize: '15px', 
                color: '#F0B90B', 
                fontWeight: '700', 
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                position: 'relative',
                zIndex: 1
              }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                Important
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#C5D0E6', 
                lineHeight: '1.6',
                position: 'relative',
                zIndex: 1
              }}>
                Only send <strong style={{ color: '#fff', fontWeight: '700' }}>{selectedCurrency}</strong> to this address. 
                Sending any other asset will result in <strong style={{ color: '#EA3943' }}>permanent loss</strong>.
              </div>
            </div>

            {/* Premium QR Code Card */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '28px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(240,243,250,1) 100%)',
                padding: '28px',
                borderRadius: '24px',
                display: 'inline-block',
                boxShadow: '0 12px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.8)',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  inset: '-2px',
                  background: 'linear-gradient(135deg, rgba(0,229,255,0.4), rgba(123,44,255,0.4))',
                  borderRadius: '24px',
                  filter: 'blur(8px)',
                  zIndex: -1
                }} />
                <QRCodeSVG 
                  value={depositAddress} 
                  size={220}
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>

            {/* Premium Address Display Card */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                color: '#6B7A99', 
                marginBottom: '10px', 
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {selectedCurrency} Deposit Address
              </label>
              <div style={{
                background: 'linear-gradient(135deg, rgba(0,71,217,0.08) 0%, rgba(0,229,255,0.08) 100%)',
                border: '1px solid rgba(0,229,255,0.2)',
                borderRadius: '16px',
                padding: '18px',
                boxShadow: '0 8px 24px rgba(0,229,255,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '120px',
                  height: '120px',
                  background: 'radial-gradient(circle, rgba(0,229,255,0.15) 0%, transparent 70%)',
                  filter: 'blur(30px)',
                  pointerEvents: 'none'
                }} />
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <div style={{
                    flex: 1,
                    fontSize: '14px',
                    color: '#E8EFFE',
                    wordBreak: 'break-all',
                    fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace',
                    lineHeight: '1.6',
                    fontWeight: '500'
                  }}>
                    {depositAddress}
                  </div>
                  <button
                    onClick={copyAddress}
                    style={{
                      padding: '10px',
                      background: copied ? 'linear-gradient(135deg, #16C784 0%, #0FAE6E 100%)' : 'rgba(255,255,255,0.08)',
                      border: '1px solid ' + (copied ? 'rgba(22,199,132,0.3)' : 'rgba(255,255,255,0.1)'),
                      color: '#fff',
                      cursor: 'pointer',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      boxShadow: copied ? '0 4px 12px rgba(22,199,132,0.4)' : 'none',
                      minWidth: '40px',
                      minHeight: '40px'
                    }}
                  >
                    {copied ? <IoCheckmark size={20} /> : <IoCopyOutline size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Premium Instructions Card */}
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              fontSize: '14px',
              color: '#8FA3C8',
              lineHeight: '1.7',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)'
            }}>
              <div style={{ 
                fontWeight: '700', 
                color: '#fff', 
                marginBottom: '14px',
                fontSize: '15px',
                letterSpacing: '-0.01em'
              }}>
                How to deposit:
              </div>
              <ol style={{ 
                margin: 0, 
                paddingLeft: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <li style={{ paddingLeft: '8px' }}>Copy the address above or scan the QR code</li>
                <li style={{ paddingLeft: '8px' }}>Send <strong style={{ color: '#00E5FF' }}>{selectedCurrency}</strong> from your external wallet</li>
                <li style={{ paddingLeft: '8px' }}>Wait for network confirmations</li>
                <li style={{ paddingLeft: '8px' }}>Your balance will update <strong style={{ color: '#16C784' }}>automatically</strong></li>
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
