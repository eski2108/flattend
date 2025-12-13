import React, { useState } from 'react';
import { IoClose, IoWarning } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;
const COLORS = { PRIMARY_BG: '#0B0E11', SECONDARY_BG: '#111418', ACCENT: '#00AEEF', SUCCESS: '#00C98D', WARNING: '#F5C542', DANGER: '#E35355', GREY: '#9FA6B2', WHITE: '#FFFFFF' };

export default function WithdrawModal({ isOpen, onClose, currency, availableBalance, userId, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validateAddress = (addr) => addr && addr.length >= 20;
  const validateAmount = (amt) => {
    const num = parseFloat(amt);
    return !isNaN(num) && num > 0 && num <= availableBalance;
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!validateAmount(amount)) newErrors.amount = 'Invalid amount or insufficient balance';
    if (!validateAddress(address)) newErrors.address = 'Invalid address (min 20 characters)';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API}/api/withdrawals/request`, {
        user_id: userId,
        currency,
        amount_crypto: parseFloat(amount),
        destination_address: address,
        network: `${currency} Network`,
        amount_fiat_gbp: 0,
        rate_used: 1
      });
      if (response.data.success) {
        toast.success('Withdrawal request submitted!');
        onClose();
        setAmount('');
        setAddress('');
        if (onSuccess) onSuccess();
      } else {
        toast.error(response.data.message || 'Withdrawal failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process withdrawal');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const fee = parseFloat(amount) * 0.005 || 0;
  const netAmount = parseFloat(amount) - fee || 0;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: COLORS.SECONDARY_BG, border: `1px solid rgba(0, 174, 239, 0.2)`, borderRadius: '16px', padding: '32px', maxWidth: '500px', width: '100%', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.WHITE }}><IoClose size={20} /></button>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: COLORS.WHITE, margin: '0 0 24px 0' }}>Withdraw {currency}</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', color: COLORS.GREY, fontWeight: '500', marginBottom: '8px', display: 'block' }}>Amount</label>
          <div style={{ position: 'relative' }}>
            <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setErrors({...errors, amount: null}); }} placeholder="0.00" style={{ width: '100%', padding: '12px', paddingRight: '80px', background: COLORS.PRIMARY_BG, border: errors.amount ? `1px solid ${COLORS.DANGER}` : `1px solid rgba(0, 174, 239, 0.2)`, borderRadius: '12px', color: COLORS.WHITE, fontSize: '16px', fontWeight: '600', outline: 'none' }} />
            <button onClick={() => setAmount(availableBalance.toString())} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', padding: '6px 12px', background: `rgba(0, 174, 239, 0.2)`, border: `1px solid ${COLORS.ACCENT}`, borderRadius: '8px', color: COLORS.ACCENT, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>MAX</button>
          </div>
          {errors.amount && <div style={{ color: COLORS.DANGER, fontSize: '13px', marginTop: '4px' }}>{errors.amount}</div>}
          <div style={{ fontSize: '13px', color: COLORS.GREY, marginTop: '4px' }}>Available: {availableBalance} {currency}</div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', color: COLORS.GREY, fontWeight: '500', marginBottom: '8px', display: 'block' }}>Destination Address</label>
          <input type="text" value={address} onChange={(e) => { setAddress(e.target.value); setErrors({...errors, address: null}); }} placeholder="Enter wallet address" style={{ width: '100%', padding: '12px', background: COLORS.PRIMARY_BG, border: errors.address ? `1px solid ${COLORS.DANGER}` : `1px solid rgba(0, 174, 239, 0.2)`, borderRadius: '12px', color: COLORS.WHITE, fontSize: '14px', fontFamily: 'monospace', outline: 'none' }} />
          {errors.address && <div style={{ color: COLORS.DANGER, fontSize: '13px', marginTop: '4px' }}>{errors.address}</div>}
        </div>

        {amount && (
          <div style={{ background: COLORS.PRIMARY_BG, border: `1px solid rgba(0, 174, 239, 0.2)`, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: COLORS.GREY }}>Amount</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: COLORS.WHITE }}>{parseFloat(amount).toFixed(8)} {currency}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: COLORS.GREY }}>Fee (0.5%)</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: COLORS.WARNING }}>{fee.toFixed(8)} {currency}</span>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: COLORS.WHITE }}>You receive</span>
              <span style={{ fontSize: '16px', fontWeight: '700', color: COLORS.SUCCESS }}>{netAmount.toFixed(8)} {currency}</span>
            </div>
          </div>
        )}

        <div style={{ background: `rgba(227, 83, 85, 0.1)`, border: `1px solid ${COLORS.DANGER}`, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <IoWarning color={COLORS.DANGER} size={20} />
            <span style={{ fontSize: '14px', fontWeight: '600', color: COLORS.DANGER }}>Important</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: COLORS.GREY }}>
            <li>Double-check the address - transactions cannot be reversed</li>
            <li>Admin approval required (usually within 24h)</li>
          </ul>
        </div>

        <button onClick={handleSubmit} disabled={isSubmitting || !amount || !address} style={{ width: '100%', padding: '14px', background: isSubmitting || !amount || !address ? COLORS.GREY : `linear-gradient(135deg, ${COLORS.DANGER}, #CC2222)`, border: 'none', borderRadius: '12px', color: COLORS.WHITE, fontSize: '16px', fontWeight: '600', cursor: isSubmitting || !amount || !address ? 'not-allowed' : 'pointer', opacity: isSubmitting || !amount || !address ? 0.5 : 1 }}>
          {isSubmitting ? 'Processing...' : `Withdraw ${currency}`}
        </button>
      </div>
    </div>
  );
}
