import React, { useState, useEffect } from 'react';
import { IoClose, IoCopy, IoCheckmark } from 'react-icons/io5';
import { getCoinLogo } from '@/utils/coinLogos';
import QRCode from 'qrcode.react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * DepositModal Component
 * Shows deposit address and QR code for selected cryptocurrency
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
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #08192B 0%, #0A1F35 100%)',
        border: '1px solid rgba(0, 198, 255, 0.2)',
        borderRadius: '20px',
        padding: '32px',
        maxWidth: '500px',
        width: '100%',
        position: 'relative'
      }}>
        {/* Close Button */}
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
            color: '#FFFFFF'
          }}
        >
          <IoClose size={20} />
        </button>

        {/* Header */}
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
              color: '#FFFFFF',
              margin: 0
            }}>
              Deposit {currency}
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#8F9BB3',
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
            color: '#8F9BB3'
          }}>
            Loading deposit address...
          </div>
        ) : (
          <>
            {/* QR Code */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '24px',
              background: '#FFFFFF',
              padding: '20px',
              borderRadius: '16px'
            }}>
              <QRCode value={depositAddress} size={200} />
            </div>

            {/* Address */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{
                fontSize: '13px',
                color: '#8F9BB3',
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
                  color: '#FFFFFF',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all'
                }}>
                  {depositAddress}
                </div>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '8px',
                    background: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(0, 198, 255, 0.2)',
                    border: `1px solid ${copied ? '#22C55E' : '#00C6FF'}`,
                    borderRadius: '8px',
                    color: copied ? '#22C55E' : '#00C6FF',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {copied ? <IoCheckmark size={18} /> : <IoCopy size={18} />}
                </button>
              </div>
            </div>

            {/* Warning */}
            <div style={{
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{
                fontSize: '14px',
                color: '#FBBF24',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                ⚠️ Important
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '13px',
                color: '#8F9BB3'
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
