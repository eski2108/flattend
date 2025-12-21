import React, { useState, useEffect } from 'react';
import './WithdrawalWhitelist.css';

const WithdrawalWhitelist = ({ userId }) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ currency: 'BTC', address: '', label: '' });
  const [submitting, setSubmitting] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    fetchWhitelist();
  }, [userId]);

  const fetchWhitelist = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/wallet/whitelist/${userId}`);
      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (error) {
      console.error('Failed to fetch whitelist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`${backendUrl}/api/wallet/whitelist/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          ...newAddress
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Address added! Check your email to verify.');
        setShowAddForm(false);
        setNewAddress({ currency: 'BTC', address: '', label: '' });
        fetchWhitelist();
      } else {
        alert(data.detail || 'Failed to add address');
      }
    } catch (error) {
      alert('Failed to add address');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAddress = async (entryId) => {
    if (!window.confirm('Remove this address from whitelist?')) return;

    try {
      const response = await fetch(`${backendUrl}/api/wallet/whitelist/${entryId}?user_id=${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchWhitelist();
      } else {
        alert('Failed to remove address');
      }
    } catch (error) {
      alert('Failed to remove address');
    }
  };

  const currencies = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'SOL', 'DOGE', 'ADA', 'LTC'];

  if (loading) {
    return <div className="whitelist-loading">Loading whitelist...</div>;
  }

  return (
    <div className="withdrawal-whitelist">
      <div className="whitelist-header">
        <div>
          <h3>🔐 Withdrawal Whitelist</h3>
          <p className="whitelist-desc">
            Withdrawals to whitelisted addresses are instant. New addresses require 24-hour security hold.
          </p>
        </div>
        <button 
          className="add-address-btn"
          onClick={() => setShowAddForm(true)}
        >
          + Add Address
        </button>
      </div>

      {showAddForm && (
        <div className="add-form-overlay" onClick={() => setShowAddForm(false)}>
          <form className="add-form" onClick={(e) => e.stopPropagation()} onSubmit={handleAddAddress}>
            <h4>Add Withdrawal Address</h4>
            
            <div className="form-group">
              <label>Currency</label>
              <select
                value={newAddress.currency}
                onChange={(e) => setNewAddress({ ...newAddress, currency: e.target.value })}
              >
                {currencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Wallet Address *</label>
              <input
                type="text"
                required
                placeholder="Enter wallet address"
                value={newAddress.address}
                onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Label (optional)</label>
              <input
                type="text"
                placeholder="e.g., My Ledger, Exchange"
                value={newAddress.label}
                onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button type="submit" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Address'}
              </button>
            </div>

            <p className="verify-note">⚠️ You'll receive an email to verify this address</p>
          </form>
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="no-addresses">
          <p>No whitelisted addresses yet.</p>
          <p>Add addresses to enable instant withdrawals.</p>
        </div>
      ) : (
        <div className="addresses-list">
          {addresses.map((addr) => (
            <div key={addr.id} className={`address-item ${addr.verified ? 'verified' : 'pending'}`}>
              <div className="address-info">
                <div className="address-header">
                  <span className="currency-badge">{addr.currency}</span>
                  <span className={`status-badge ${addr.verified ? 'verified' : 'pending'}`}>
                    {addr.verified ? '✓ Verified' : '⏳ Pending'}
                  </span>
                </div>
                <div className="address-value">{addr.address}</div>
                {addr.label && <div className="address-label">{addr.label}</div>}
              </div>
              <button 
                className="remove-btn"
                onClick={() => handleRemoveAddress(addr.id)}
                title="Remove address"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WithdrawalWhitelist;
