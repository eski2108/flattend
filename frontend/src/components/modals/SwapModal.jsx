import React, { useState, useEffect } from 'react';
import { IoClose, IoSwapHorizontalOutline, IoArrowDown } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;
const COLORS = { PRIMARY_BG: '#0B0E11', SECONDARY_BG: '#111418', ACCENT: '#00AEEF', SUCCESS: '#00C98D', WARNING: '#F5C542', DANGER: '#E35355', GREY: '#9FA6B2', WHITE: '#FFFFFF' };

export default function SwapModal({ isOpen, onClose, fromCurrency, balances, userId, onSuccess }) {
  const [from, setFrom] = useState(fromCurrency || 'BTC');
  const [to, setTo] = useState('ETH');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [rate, setRate] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableCoins = balances.filter(b => b.total_balance > 0).map(b => b.currency);

  useEffect(() => {
    if (fromAmount && from && to) {
      const mockRate = Math.random() * 10 + 1;
      setRate(mockRate);
      setToAmount((parseFloat(fromAmount) * mockRate).toFixed(8));
    } else {
      setToAmount('');
    }
  }, [fromAmount, from, to]);

  const handleSwap = async () => {
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API}/api/swap`, {
        user_id: userId,
        from_currency: from,
        to_currency: to,
        amount: parseFloat(fromAmount)
      });
      if (response.data.success) {
        toast.success(`Swapped ${fromAmount} ${from} to ${toAmount} ${to}`);
        onClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error(response.data.message || 'Swap failed');
      }
    } catch (error) {
      toast.error('Swap failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;
  const fromBalance = balances.find(b => b.currency === from)?.total_balance || 0;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: COLORS.SECONDARY_BG, border: `1px solid rgba(0, 174, 239, 0.2)`, borderRadius: '16px', padding: '32px', maxWidth: '500px', width: '100%', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.WHITE }}><IoClose size={20} /></button>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: COLORS.WHITE, margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IoSwapHorizontalOutline size={32} color={COLORS.WARNING} />
          Swap Crypto
        </h2>

        <div style={{ marginBottom: '16px', background: COLORS.PRIMARY_BG, borderRadius: '12px', padding: '16px', border: `1px solid rgba(0, 174, 239, 0.2)` }}>
          <div style={{ fontSize: '13px', color: COLORS.GREY, marginBottom: '8px', fontWeight: '500' }}>From</div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: '12px', background: COLORS.SECONDARY_BG, border: `1px solid rgba(0, 174, 239, 0.2)`, borderRadius: '12px', color: COLORS.WHITE, fontSize: '16px', fontWeight: '600', cursor: 'pointer', minWidth: '120px' }}>
              {availableCoins.map(coin => <option key={coin} value={coin}>{coin}</option>)}
            </select>
            <input type="number" value={fromAmount} onChange={(e) => setFromAmount(e.target.value)} placeholder="0.00" style={{ flex: 1, padding: '12px', background: COLORS.SECONDARY_BG, border: `1px solid rgba(0, 174, 239, 0.2)`, borderRadius: '12px', color: COLORS.WHITE, fontSize: '16px', fontWeight: '600', outline: 'none' }} />
          </div>
          <div style={{ fontSize: '13px', color: COLORS.GREY, marginTop: '8px' }}>Available: {fromBalance.toFixed(8)} {from}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `rgba(245, 197, 66, 0.2)`, border: `1px solid ${COLORS.WARNING}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IoArrowDown size={20} color={COLORS.WARNING} />
          </div>
        </div>

        <div style={{ marginBottom: '20px', background: COLORS.PRIMARY_BG, borderRadius: '12px', padding: '16px', border: `1px solid rgba(0, 174, 239, 0.2)` }}>
          <div style={{ fontSize: '13px', color: COLORS.GREY, marginBottom: '8px', fontWeight: '500' }}>To</div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: '12px', background: COLORS.SECONDARY_BG, border: `1px solid rgba(0, 174, 239, 0.2)`, borderRadius: '12px', color: COLORS.WHITE, fontSize: '16px', fontWeight: '600', cursor: 'pointer', minWidth: '120px' }}>
              {balances.map(b => <option key={b.currency} value={b.currency}>{b.currency}</option>)}
            </select>
            <input type="text" value={toAmount} readOnly placeholder="0.00" style={{ flex: 1, padding: '12px', background: COLORS.SECONDARY_BG, border: `1px solid rgba(0, 174, 239, 0.2)`, borderRadius: '12px', color: COLORS.WHITE, fontSize: '16px', fontWeight: '600' }} />
          </div>
        </div>

        {rate > 0 && (
          <div style={{ background: `rgba(245, 197, 66, 0.1)`, border: `1px solid ${COLORS.WARNING}`, borderRadius: '12px', padding: '12px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: COLORS.GREY }}>Exchange Rate</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: COLORS.WARNING, marginTop: '4px' }}>1 {from} = {rate.toFixed(6)} {to}</div>
          </div>
        )}

        <button onClick={handleSwap} disabled={isSubmitting || !fromAmount || parseFloat(fromAmount) > fromBalance} style={{ width: '100%', padding: '14px', background: isSubmitting || !fromAmount ? COLORS.GREY : `linear-gradient(135deg, ${COLORS.WARNING}, #D4A532)`, border: 'none', borderRadius: '12px', color: COLORS.WHITE, fontSize: '16px', fontWeight: '600', cursor: isSubmitting || !fromAmount ? 'not-allowed' : 'pointer', opacity: isSubmitting || !fromAmount ? 0.5 : 1 }}>
          {isSubmitting ? 'Processing...' : 'Swap Now'}
        </button>
      </div>
    </div>
  );
}
