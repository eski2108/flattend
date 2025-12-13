import React, { useState } from 'react';
import { IoClose } from 'react-icons/io5';
import { getCoinLogo } from '@/utils/coinLogos';
import { toast } from 'sonner';

/**
 * StakeModal - Binance Premium Design
 */
export default function StakeModal({ isOpen, onClose, currency, availableBalance }) {
  const [amount, setAmount] = useState('');
  const [lockPeriod, setLockPeriod] = useState('30');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stakingOptions = {
    '7': { apy: 3.5, label: '7 Days' },
    '30': { apy: 8.2, label: '30 Days' },
    '90': { apy: 15.5, label: '90 Days' },
    '180': { apy: 25.0, label: '180 Days' }
  };

  const selectedOption = stakingOptions[lockPeriod];
  const estimatedRewards = amount ? (parseFloat(amount) * selectedOption.apy / 100 * (parseInt(lockPeriod) / 365)).toFixed(8) : '0.00';

  const handleStake = async () => {
    setIsSubmitting(true);
    try {
      toast.success(`Staked ${amount} ${currency} for ${lockPeriod} days`);
      onClose();
    } catch (error) {
      toast.error('Staking failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: 'rgba(18, 22, 28, 0.98)', backdropFilter: 'blur(12px)', border: '1px solid #1E2329', borderRadius: '14px', padding: '32px', maxWidth: '500px', width: '100%', position: 'relative', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#EAECEF' }}>
          <IoClose size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <img src={getCoinLogo(currency)} alt={currency} style={{ width: '48px', height: '48px' }} />
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#EAECEF', margin: 0 }}>Stake {currency}</h2>
            <p style={{ fontSize: '14px', color: '#B7BDC6', margin: '4px 0 0 0' }}>Earn rewards by staking</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {Object.entries(stakingOptions).map(([days, data]) => (
            <button key={days} onClick={() => setLockPeriod(days)} style={{ padding: '12px', background: lockPeriod === days ? 'rgba(14, 203, 129, 0.2)' : '#0B0E11', border: lockPeriod === days ? '1px solid #0ECB81' : '1px solid #1E2329', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: lockPeriod === days ? '#0ECB81' : '#EAECEF', marginBottom: '4px' }}>{data.label}</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: lockPeriod === days ? '#0ECB81' : '#F0B90B' }}>{data.apy}%</div>
              <div style={{ fontSize: '11px', color: '#B7BDC6' }}>APY</div>
            </button>
          ))}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '14px', color: '#B7BDC6', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Amount to Stake</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '12px', background: '#0B0E11', border: '1px solid #1E2329', borderRadius: '12px', color: '#EAECEF', fontSize: '16px', fontWeight: '600', outline: 'none' }} />
          <div style={{ fontSize: '13px', color: '#B7BDC6', marginTop: '4px' }}>Available: {availableBalance} {currency}</div>
        </div>

        <div style={{ background: 'rgba(14, 203, 129, 0.1)', border: '1px solid rgba(14, 203, 129, 0.3)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#B7BDC6' }}>Est. Rewards</span>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#0ECB81' }}>{estimatedRewards} {currency}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', color: '#B7BDC6' }}>Lock Period</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#EAECEF' }}>{lockPeriod} days</span>
          </div>
        </div>

        <button onClick={handleStake} disabled={isSubmitting || !amount || parseFloat(amount) > availableBalance} style={{ width: '100%', padding: '14px', background: isSubmitting || !amount ? '#6B7280' : '#0ECB81', border: 'none', borderRadius: '12px', color: '#FFFFFF', fontSize: '16px', fontWeight: '600', cursor: isSubmitting || !amount ? 'not-allowed' : 'pointer' }}>
          {isSubmitting ? 'Processing...' : 'Stake Now'}
        </button>
      </div>
    </div>
  );
}
