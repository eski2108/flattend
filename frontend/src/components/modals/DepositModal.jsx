import React, { useState, useEffect } from 'react';
import { IoClose, IoCopy, IoCheckmark } from 'react-icons/io5';
import { getCoinLogo } from '@/utils/coinLogos';
import { QRCodeCanvas } from 'qrcode.react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * DepositModal - Binance Premium Design
 */
export default function DepositModal({ isOpen, onClose, currency, userId }) {
  const [depositAddress, setDepositAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && currency && userId) {
      fetchDepositAddress();
    }
  }, [isOpen, currency, userId]);

  const fetchDepositAddress = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/deposit-address`, {
        params: { currency, user_id: userId }
      });
      if (response.data.address) {
        setDepositAddress(response.data.address);
      }
    } catch (error) {
      console.error('Error fetching deposit address:', error);
      toast.error('Failed to load deposit address');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
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
      zIndex: 9999,
      padding: '20px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: 'rgba(18, 22, 28, 0.98)',
        backdropFilter: 'blur(12px)',
        border: '1px solid #1E2329',
        borderRadius: '14px',
        padding: '32px',
        maxWidth: '500px',
        width: '100%',
        position: 'relative',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#EAECEF'
          }}
        >
          <IoClose size={20} />
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <img 
            src={getCoinLogo(currency)} 
            alt={currency}
            style={{ width: '48px', height: '48px', objectFit: 'contain' }}
          />
          <div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#EAECEF',
              margin: 0
            }}>
              Deposit {currency}
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#B7BDC6',
              margin: '4px 0 0 0'
            }}>
              Send {currency} to this address
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#B7BDC6'
          }}>
            Loading deposit address...
          </div>
        ) : (
          <>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '24px',
              background: '#FFFFFF',
              padding: '20px',
              borderRadius: '14px'
            }}>
              <QRCode value={depositAddress} size={200} />
            </div>

            <div style={{
              background: '#0B0E11',
              border: '1px solid #1E2329',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{
                fontSize: '13px',
                color: '#B7BDC6',
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Your {currency} Deposit Address
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  flex: 1,
                  fontSize: '14px',
                  color: '#EAECEF',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all'
                }}>
                  {depositAddress}
                </div>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '8px',
                    background: copied ? 'rgba(14, 203, 129, 0.2)' : 'rgba(240, 185, 11, 0.2)',
                    border: `1px solid ${copied ? '#0ECB81' : '#F0B90B'}`,
                    borderRadius: '8px',
                    color: copied ? '#0ECB81' : '#F0B90B',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {copied ? <IoCheckmark size={18} /> : <IoCopy size={18} />}
                </button>
              </div>
            </div>

            <div style={{
              background: 'rgba(240, 185, 11, 0.1)',
              border: '1px solid rgba(240, 185, 11, 0.3)',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{
                fontSize: '14px',
                color: '#F0B90B',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                ⚠️ Important
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '13px',
                color: '#B7BDC6'
              }}>
                <li>Only send {currency} to this address</li>
                <li>Sending other assets may result in permanent loss</li>
                <li>Minimum deposit: 0.0001 {currency}</li>
                <li>Funds will appear after network confirmations</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
