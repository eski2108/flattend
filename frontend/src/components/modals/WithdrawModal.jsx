import React, { useState } from 'react';
import { IoClose, IoWarning } from 'react-icons/io5';
import { getCoinLogo } from '@/utils/coinLogos';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * WithdrawModal - Binance Premium Design
 */
export default function WithdrawModal({ isOpen, onClose, currency, availableBalance, userId }) {
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validateAddress = (addr) => {
    if (!addr) return false;
    if (addr.length < 20) return false;
    return true;
  };

  const validateAmount = (amt) => {
    const num = parseFloat(amt);
    if (isNaN(num) || num <= 0) return false;
    if (num > availableBalance) return false;
    return true;
  };

  const handleSubmit = async () => {
    const newErrors = {};
    
    if (!validateAmount(amount)) {
      newErrors.amount = 'Invalid amount or insufficient balance';
    }
    if (!validateAddress(address)) {
      newErrors.address = 'Invalid address format (min 20 characters)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API}/api/user/withdraw`, {
        user_id: userId,
        currency,
        amount: parseFloat(amount),
        wallet_address: address
      });

      if (response.data.success) {
        toast.success('Withdrawal request submitted!');
        onClose();
        setAmount('');
        setAddress('');
        // Trigger balance refresh
        window.dispatchEvent(new Event('walletBalanceUpdated'));
      } else {
        toast.error(response.data.message || 'Withdrawal failed');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error(error.response?.data?.message || 'Failed to process withdrawal');
    } finally {
      setIsSubmitting(false);
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
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#EAECEF' }}>
          <IoClose size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <img src={getCoinLogo(currency)} alt={currency} style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#EAECEF', margin: 0 }}>Withdraw {currency}</h2>
            <p style={{ fontSize: '14px', color: '#B7BDC6', margin: '4px 0 0 0' }}>Send {currency} to external wallet</p>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', color: '#B7BDC6', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Amount</label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setErrors({...errors, amount: null}); }}
              placeholder="0.00"
              style={{ width: '100%', padding: '12px', paddingRight: '80px', background: '#0B0E11', border: errors.amount ? '1px solid #F6465D' : '1px solid #1E2329', borderRadius: '12px', color: '#EAECEF', fontSize: '16px', fontWeight: '600', outline: 'none' }}
            />
            <button
              onClick={() => setAmount(availableBalance.toString())}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', padding: '6px 12px', background: 'rgba(240, 185, 11, 0.2)', border: '1px solid #F0B90B', borderRadius: '8px', color: '#F0B90B', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
            >
              MAX
            </button>
          </div>
          {errors.amount && <div style={{ color: '#F6465D', fontSize: '13px', marginTop: '4px' }}>{errors.amount}</div>}
          <div style={{ fontSize: '13px', color: '#B7BDC6', marginTop: '4px' }}>Available: {availableBalance} {currency}</div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', color: '#B7BDC6', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Destination Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => { setAddress(e.target.value); setErrors({...errors, address: null}); }}
            placeholder="Enter wallet address"
            style={{ width: '100%', padding: '12px', background: '#0B0E11', border: errors.address ? '1px solid #F6465D' : '1px solid #1E2329', borderRadius: '12px', color: '#EAECEF', fontSize: '14px', fontFamily: 'monospace', outline: 'none' }}
          />
          {errors.address && <div style={{ color: '#F6465D', fontSize: '13px', marginTop: '4px' }}>{errors.address}</div>}
        </div>

        <div style={{ background: 'rgba(246, 70, 93, 0.1)', border: '1px solid rgba(246, 70, 93, 0.3)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <IoWarning color="#F6465D" size={20} />
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#F6465D' }}>Important</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#B7BDC6' }}>
            <li>Double-check the address - transactions cannot be reversed</li>
            <li>Withdrawal fee: 0.5% of amount</li>
            <li>Admin approval required (usually within 24h)</li>
          </ul>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !amount || !address}
          style={{ width: '100%', padding: '14px', background: isSubmitting || !amount || !address ? '#6B7280' : '#F6465D', border: 'none', borderRadius: '12px', color: '#FFFFFF', fontSize: '16px', fontWeight: '600', cursor: isSubmitting || !amount || !address ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease' }}
        >
          {isSubmitting ? 'Processing...' : `Withdraw ${currency}`}
        </button>
      </div>
    </div>
  );
}
