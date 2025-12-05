import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IoAdd, IoCheckmark, IoCopy, IoCreate, IoTrash as Trash2 } from 'react-icons/io5';
import axios from 'axios';
import Layout from '@/components/Layout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

const CRYPTO_LIST = [
  { code: 'BTC', name: 'Bitcoin', symbol: '₿' },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ' },
  { code: 'USDT', name: 'Tether', symbol: '₮' },
  { code: 'BNB', name: 'Binance Coin', symbol: '🔶' },
  { code: 'SOL', name: 'Solana', symbol: '◎' },
  { code: 'XRP', name: 'Ripple', symbol: '✕' },
  { code: 'ADA', name: 'Cardano', symbol: '₳' },
  { code: 'DOGE', name: 'Dogecoin', symbol: 'Ð' },
  { code: 'MATIC', name: 'Polygon', symbol: '⬡' },
  { code: 'LTC', name: 'Litecoin', symbol: 'Ł' },
  { code: 'AVAX', name: 'Avalanche', symbol: '🔺' },
  { code: 'DOT', name: 'Polkadot', symbol: '●' },
];

export default function WalletSettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [addresses, setAddresses] = useState({});
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [newAddress, setNewAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedCurrency, setCopiedCurrency] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
  }, [navigate]);
  
  useEffect(() => {
    if (user?.user_id) {
      fetchAddresses();
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      const response = await axios.get(`${API}/wallet/addresses/${user.user_id}`);
      setAddresses(response.data.addresses || {});
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (currency) => {
    if (!newAddress.trim()) return;

    try {
      await axios.post(`${API}/wallet/add-address`, {
        user_id: user.user_id,
        currency,
        address: newAddress.trim()
      });
      
      await fetchAddresses();
      setEditingCurrency(null);
      setNewAddress('');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to add address');
    }
  };

  const handleRemoveAddress = async (currency) => {
    if (!confirm(`Remove ${currency} address?`)) return;

    try {
      await axios.delete(`${API}/wallet/remove-address/${user.user_id}/${currency}`);
      await fetchAddresses();
    } catch (error) {
      alert('Failed to remove address');
    }
  };

  const copyToClipboard = (text, currency) => {
    navigator.clipboard.writeText(text);
    setCopiedCurrency(currency);
    setTimeout(() => setCopiedCurrency(null), 2000);
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>
          Loading wallet settings...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '800', 
          color: '#fff', 
          marginBottom: '0.5rem' 
        }}>
          My Wallet Addresses
        </h1>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.7)', 
          marginBottom: '2rem' 
        }}>
          Add your crypto wallet addresses for withdrawals
        </p>

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {CRYPTO_LIST.map((crypto) => {
            const hasAddress = addresses[crypto.code];
            const isEditing = editingCurrency === crypto.code;

            return (
              <Card 
                key={crypto.code}
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.05), rgba(168, 85, 247, 0.05))',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '32px' }}>{crypto.symbol}</span>
                      <div>
                        <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '0.25rem' }}>
                          {crypto.name}
                        </h3>
                        <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)' }}>
                          {crypto.code}
                        </span>
                      </div>
                    </div>

                    {isEditing ? (
                      <div style={{ marginTop: '1rem' }}>
                        <input
                          type="text"
                          value={newAddress}
                          onChange={(e) => setNewAddress(e.target.value)}
                          placeholder={`Enter your ${crypto.code} address`}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(0, 240, 255, 0.3)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '14px',
                            marginBottom: '1rem'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button
                            onClick={() => handleAddAddress(crypto.code)}
                            style={{
                              background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                              border: 'none',
                              padding: '0.5rem 1rem',
                              fontSize: '14px'
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingCurrency(null);
                              setNewAddress('');
                            }}
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: '#fff',
                              padding: '0.5rem 1rem',
                              fontSize: '14px'
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : hasAddress ? (
                      <div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.75rem',
                          background: 'rgba(0, 0, 0, 0.3)',
                          borderRadius: '8px',
                          marginTop: '1rem'
                        }}>
                          <span style={{
                            color: '#00F0FF',
                            fontSize: '14px',
                            fontFamily: 'monospace',
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {addresses[crypto.code]}
                          </span>
                          <button
                            onClick={() => copyToClipboard(addresses[crypto.code], crypto.code)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: copiedCurrency === crypto.code ? '#22C55E' : '#00F0FF',
                              cursor: 'pointer',
                              padding: '0.25rem'
                            }}
                          >
                            {copiedCurrency === crypto.code ? <IoCheckmark size={18} /> : <IoCopy size={18} />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        padding: '1rem',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        marginTop: '1rem',
                        textAlign: 'center'
                      }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
                          No address added
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ marginLeft: '1rem' }}>
                    {hasAddress && !isEditing ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => {
                            setEditingCurrency(crypto.code);
                            setNewAddress(addresses[crypto.code]);
                          }}
                          style={{
                            background: 'rgba(0, 240, 255, 0.1)',
                            border: '1px solid rgba(0, 240, 255, 0.3)',
                            borderRadius: '8px',
                            padding: '0.5rem',
                            color: '#00F0FF',
                            cursor: 'pointer'
                          }}
                        >
                          <IoCreate size={18} />
                        </button>
                        <button
                          onClick={() => handleRemoveAddress(crypto.code)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            padding: '0.5rem',
                            color: '#EF4444',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ) : !isEditing ? (
                      <button
                        onClick={() => setEditingCurrency(crypto.code)}
                        style={{
                          background: 'linear-gradient(135deg, #00F0FF, #A855F7)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.5rem 1rem',
                          color: '#fff',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <IoAdd size={18} />
                        Add
                      </button>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
