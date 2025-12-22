import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IoAlertCircle, IoArrowBack } from 'react-icons/io5';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';;
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import OTPModal from '@/components/OTPModal';

const API = process.env.REACT_APP_BACKEND_URL;

export default function WithdrawalRequest() {
  const { coin } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedCrypto, setSelectedCrypto] = useState(coin?.toUpperCase() || 'BTC');
  const [amount, setAmount] = useState('');
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [pendingWithdrawal, setPendingWithdrawal] = useState(null);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [balances, setBalances] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const u = JSON.parse(userData);
    setUser(u);
    loadBalances(u.user_id);
  }, [navigate]);

  useEffect(() => {
    if (coin) {
      setSelectedCrypto(coin.toUpperCase());
    }
  }, [coin]);

  const loadBalances = async (userId) => {
    try {
      const response = await axios.get(`${API}/api/wallets/balances/${userId}`);
      if (response.data.success) {
        const bals = response.data.balances || [];
        setBalances(bals);
        
        const currentAsset = bals.find(b => b.currency === selectedCrypto);
        if (currentAsset) {
          setAvailableBalance(currentAsset.available_balance);
        }
      }
    } catch (error) {
      console.error('Failed to load balances:', error);
    }
  };

  useEffect(() => {
    if (balances.length > 0) {
      const currentAsset = balances.find(b => b.currency === selectedCrypto);
      if (currentAsset) {
        setAvailableBalance(currentAsset.available_balance);
      }
    }
  }, [selectedCrypto, balances]);

  const handleSubmitWithdrawal = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!withdrawalAddress || withdrawalAddress.trim().length < 20) {
      toast.error('Please enter a valid withdrawal address');
      return;
    }

    if (parseFloat(amount) > availableBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setPendingWithdrawal({
      currency: selectedCrypto,
      amount: parseFloat(amount),
      address: withdrawalAddress.trim()
    });
    setShowOTPModal(true);
  };

  const handleOTPVerified = async (otp) => {
    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/api/wallet/withdraw`, {
        user_id: user.user_id,
        currency: pendingWithdrawal.currency,
        amount: pendingWithdrawal.amount,
        wallet_address: pendingWithdrawal.address,
        otp_code: otp
      });

      if (response.data.success) {
        toast.success('Withdrawal request submitted successfully!');
        setAmount('');
        setWithdrawalAddress('');
        setShowOTPModal(false);
        setPendingWithdrawal(null);
        
        setTimeout(() => {
          navigate('/wallet');
        }, 2000);
      } else {
        toast.error(response.data.message || 'Withdrawal failed');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error(error.response?.data?.message || 'Failed to process withdrawal');
    } finally {
      setSubmitting(false);
    }
  };

  const setMaxAmount = () => {
    setAmount(availableBalance.toString());
  };

  const getCoinColor = (curr) => {
    const colors = {
      'BTC': '#F7931A',
      'ETH': '#627EEA',
      'USDT': '#26A17B',
      'BNB': '#F3BA2F',
      'SOL': '#9945FF',
      'LTC': '#345D9D',
      'DOGE': '#C3A634'
    };
    return colors[curr] || '#00F0FF';
  };

  return (
    <Layout>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #05060B 0%, #080B14 100%)',
        padding: '20px'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Header */}
          <button
            onClick={() => navigate('/wallet')}
            className="premium-btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              marginBottom: '24px',
              fontSize: '14px'
            }}
          >
            <IoArrowBack size={18} />
            Back to Wallet
          </button>

          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#FFFFFF', marginBottom: '8px' }}>Withdraw {selectedCrypto}</h1>
            <p style={{ fontSize: '15px', color: '#A3AEC2' }}>Send {selectedCrypto} to your external wallet. Withdrawals require OTP verification.</p>
          </div>

          {/* Withdrawal Form */}
          <div style={{
            background: 'linear-gradient(135deg, #08192B 0%, #04101F 100%)',
            border: `2px solid ${getCoinColor(selectedCrypto)}44`,
            borderRadius: '22px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: `0 0 20px ${getCoinColor(selectedCrypto)}22`,
            opacity: 0.94
          }}>
            {/* Available Balance */}
            <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
              <div style={{ fontSize: '13px', color: '#A3AEC2', marginBottom: '4px' }}>Available Balance</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#00F0FF' }}>
                {availableBalance.toFixed(8)} {selectedCrypto}
              </div>
            </div>

            {/* Amount Input */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', color: '#A3AEC2', marginBottom: '8px', display: 'block' }}>Amount to Withdraw</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00000000"
                  className="premium-input"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={setMaxAmount}
                  className="premium-btn-secondary"
                  style={{ padding: '0 20px', fontSize: '14px', fontWeight: '600' }}
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Withdrawal Address */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', color: '#A3AEC2', marginBottom: '8px', display: 'block' }}>Withdrawal Address</label>
              <input
                type="text"
                value={withdrawalAddress}
                onChange={(e) => setWithdrawalAddress(e.target.value)}
                placeholder={`Enter ${selectedCrypto} address`}
                className="premium-input"
              />
            </div>

            {/* Estimated Fee */}
            <div style={{ marginBottom: '24px', padding: '12px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#A3AEC2' }}>Network Fee</span>
                <span style={{ fontSize: '13px', color: '#FFFFFF' }}>~0.0001 {selectedCrypto}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '600' }}>You will receive</span>
                <span style={{ fontSize: '14px', color: '#00F0FF', fontWeight: '600' }}>
                  {amount ? (parseFloat(amount) - 0.0001).toFixed(8) : '0.00000000'} {selectedCrypto}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitWithdrawal}
              disabled={submitting || !amount || !withdrawalAddress}
              className="premium-btn-primary"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {submitting ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <AiOutlineLoading3Quarters size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Processing...
                </span>
              ) : (
                'Withdraw ' + selectedCrypto
              )}
            </button>
          </div>

          {/* Warning */}
          <div style={{
            background: 'rgba(255, 191, 0, 0.05)',
            border: '1px solid rgba(255, 191, 0, 0.3)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            gap: '12px'
          }}>
            <IoAlertCircle size={20} color="#FBBF24" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#FBBF24', marginBottom: '4px' }}>Important</div>
              <div style={{ fontSize: '13px', color: '#FDE68A', lineHeight: '1.5' }}>
                Double-check the withdrawal address. Sending {selectedCrypto} to a wrong address will result in permanent loss. Withdrawals require OTP verification for security.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      {showOTPModal && (
        <OTPModal
          isOpen={showOTPModal}
          onClose={() => {
            setShowOTPModal(false);
            setPendingWithdrawal(null);
          }}
          onVerify={handleOTPVerified}
          action="withdraw"
        />
      )}
    </Layout>
  );
}
