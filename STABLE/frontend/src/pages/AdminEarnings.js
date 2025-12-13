import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoCash, IoCheckmark, IoCopy, IoInformationCircle, IoTrendingUp, IoWallet } from 'react-icons/io5';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL;

export default function AdminEarnings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState({});
  const [revenueSummary, setRevenueSummary] = useState(null);
  const [revenueBreakdown, setRevenueBreakdown] = useState(null);
  const [period, setPeriod] = useState('all');
  const [walletAddresses, setWalletAddresses] = useState({
    BTC: '',
    ETH: '',
    USDT: ''
  });
  const [feeStats, setFeeStats] = useState({
    withdrawal_fees: {},
    trade_fees: {},
    total_revenue: {}
  });
  const [copied, setCopied] = useState('');
  const [livePrices, setLivePrices] = useState({
    BTC: 0,
    ETH: 0,
    USDT: 0
  });

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/admin-login');
      return;
    }

    const user = JSON.parse(userData);
    if (!user.is_admin) {
      navigate('/');
      return;
    }

    loadEarnings();
    loadWalletAddresses();
    loadFeeStats();
    loadRevenueSummary();
    loadRevenueBreakdown();
    loadLivePrices();
  }, [navigate, period]);

  const loadLivePrices = async () => {
    try {
      const response = await axios.get(`${API}/api/prices/live`);
      if (response.data) {
        const prices = response.data.prices || response.data;
        setLivePrices({
          BTC: prices.BTC?.gbp || 0,
          ETH: prices.ETH?.gbp || 0,
          USDT: prices.USDT?.gbp || 0
        });
      }
    } catch (error) {
      console.error('Failed to load live prices:', error);
    }
  };

  const loadEarnings = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/platform-earnings`);
      if (response.data.success) {
        setEarnings(response.data.earnings);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load earnings:', error);
      toast.error('Failed to load platform earnings');
      setLoading(false);
    }
  };

  const loadWalletAddresses = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/withdrawal-addresses`);
      if (response.data.success) {
        setWalletAddresses(response.data.addresses);
      }
    } catch (error) {
      console.error('Failed to load wallet addresses:', error);
    }
  };

  const loadFeeStats = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/fee-statistics`);
      if (response.data.success) {
        setFeeStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to load fee stats:', error);
    }
  };

  const loadRevenueSummary = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/revenue/summary?period=${period}`);
      if (response.data.success) {
        setRevenueSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Failed to load revenue summary:', error);
    }
  };

  const loadRevenueBreakdown = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/revenue/monetization-breakdown`);
      if (response.data.success) {
        setRevenueBreakdown(response.data);
      }
    } catch (error) {
      console.error('Failed to load revenue breakdown:', error);
    }
  };

  const handleUpdateAddress = async (currency) => {
    const address = prompt(`Enter your ${currency} wallet address:`);
    if (!address) return;

    try {
      await axios.post(`${API}/api/admin/set-withdrawal-address`, {
        currency,
        address
      });
      toast.success(`${currency} wallet address saved!`);
      setWalletAddresses({ ...walletAddresses, [currency]: address });
    } catch (error) {
      toast.error('Failed to save wallet address');
    }
  };

  const handleWithdraw = async (currency, amount) => {
    if (!walletAddresses[currency]) {
      toast.error(`Please set your ${currency} wallet address first`);
      return;
    }

    if (!window.confirm(`Withdraw ${amount} ${currency} to your wallet?\n\nAddress: ${walletAddresses[currency]}`)) {
      return;
    }

    try {
      await axios.post(`${API}/api/admin/withdraw-earnings`, {
        currency,
        amount,
        address: walletAddresses[currency]
      });
      toast.success(`✅ Withdrawal initiated! ${amount} ${currency} will be sent to your wallet.`);
      await loadEarnings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to withdraw');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(''), 2000);
  };

  const formatNumber = (num) => {
    return parseFloat(num || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    });
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      }}>
        <div>Loading earnings...</div>
      </div>
    );
  }

  const totalBTC = parseFloat(earnings.BTC || 0);
  const totalETH = parseFloat(earnings.ETH || 0);
  const totalUSDT = parseFloat(earnings.USDT || 0);

  // Get revenue from new comprehensive endpoint
  const totalProfit = revenueSummary?.total_profit || 0;
  const totalFeeWallet = revenueSummary?.total_fee_wallet_gbp || 0;
  const revenueBreakdownData = revenueSummary?.revenue_breakdown || {};
  const feeWalletBreakdown = revenueSummary?.fee_wallet_breakdown || {};

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #00F0FF 0%, #A855F7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem'
            }}>
              Platform Earnings
            </h1>
            <p style={{ color: '#a0a0a0', fontSize: '16px' }}>
              Your cryptocurrency revenue from platform fees
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/dashboard')}
            style={{
              background: 'rgba(0, 240, 255, 0.2)',
              border: '2px solid #00F0FF',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              color: '#00F0FF',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Back to Dashboard
          </button>
        </div>

        {/* Period Selector */}
        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {['day', 'week', 'month', 'all'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '0.75rem 1.5rem',
                background: period === p ? 'linear-gradient(135deg, #00F0FF, #A855F7)' : 'rgba(255,255,255,0.05)',
                border: period === p ? 'none' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff',
                fontWeight: '700',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Total Earnings Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%)',
          border: '2px solid rgba(34, 197, 94, 0.6)',
          borderRadius: '20px',
          padding: '3rem',
          marginBottom: '2.5rem',
          boxShadow: '0 0 40px rgba(34, 197, 94, 0.4)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '16px', color: '#888', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Total Platform Profit ({period})
          </div>
          <div style={{
            fontSize: '56px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #22C55E, #16A34A)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1rem'
          }}>
            £{formatNumber(totalProfit)}
          </div>
          <div style={{ color: '#888', fontSize: '14px' }}>
            Fee Wallet Balance: £{formatNumber(totalFeeWallet)}
          </div>
        </div>

        {/* Revenue Breakdown Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem'
        }}>
          {/* Trading Fees */}
          <div style={{
            background: 'rgba(0, 240, 255, 0.05)',
            border: '2px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <IoTrendingUp size={24} color="#00F0FF" style={{ marginRight: '0.75rem' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>Trading Fees</h3>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#00F0FF' }}>
              £{formatNumber(revenueBreakdownData.trading_fees)}
            </div>
            <div style={{ color: '#888', fontSize: '13px', marginTop: '0.5rem' }}>
              From swap transactions
            </div>
          </div>

          {/* Express Buy Fees */}
          <div style={{
            background: 'rgba(168, 85, 247, 0.05)',
            border: '2px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <IoCash size={24} color="#A855F7" style={{ marginRight: '0.75rem' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>Express Buy Fees</h3>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#A855F7' }}>
              £{formatNumber(revenueBreakdownData.express_buy_fees)}
            </div>
            <div style={{ color: '#888', fontSize: '13px', marginTop: '0.5rem' }}>
              From instant purchases
            </div>
          </div>

          {/* Markup Profit */}
          <div style={{
            background: 'rgba(34, 197, 94, 0.05)',
            border: '2px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <IoWallet size={24} color="#22C55E" style={{ marginRight: '0.75rem' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>Markup Profit</h3>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#22C55E' }}>
              £{formatNumber(revenueBreakdownData.markup_markdown_profit)}
            </div>
            <div style={{ color: '#888', fontSize: '13px', marginTop: '0.5rem' }}>
              Price difference profit
            </div>
          </div>

          {/* P2P Fees */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.05)',
            border: '2px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <ArrowDownToLine size={24} color="#EF4444" style={{ marginRight: '0.75rem' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>P2P Fees</h3>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#EF4444' }}>
              £{formatNumber(revenueBreakdownData.p2p_fees)}
            </div>
            <div style={{ color: '#888', fontSize: '13px', marginTop: '0.5rem' }}>
              From P2P trades
            </div>
          </div>
        </div>

        {/* Fee Wallet Breakdown */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2.5rem'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginBottom: '2rem' }}>
            Fee Wallet Breakdown
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.5rem'
          }}>
            {Object.entries(feeWalletBreakdown).map(([currency, data]) => (
              <div key={currency} style={{
                background: 'rgba(0, 240, 255, 0.05)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: '12px',
                padding: '1.5rem'
              }}>
                <div style={{ fontSize: '14px', color: '#888', marginBottom: '0.5rem' }}>{currency}</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#00F0FF', marginBottom: '0.5rem' }}>
                  {formatNumber(data.total_fees)}
                </div>
                <div style={{ fontSize: '13px', color: '#22C55E' }}>
                  ≈ £{formatNumber(data.gbp_value)}
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '0.75rem' }}>
                  Trading: {formatNumber(data.trading_fees)}<br />
                  Express: {formatNumber(data.express_buy_fees)}<br />
                  P2P: {formatNumber(data.p2p_fees)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Old earnings display for withdrawal */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2.5rem'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginBottom: '2rem' }}>
            Withdraw Earnings
          </h2>
          <div style={{ color: '#888', fontSize: '14px' }}>
            Equivalent value at current market prices
          </div>
        </div>

        {/* Earnings by Currency */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '900',
            color: '#fff',
            marginBottom: '1.5rem'
          }}>
            Earnings by Currency
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* BTC Card */}
            <div style={{
              background: 'rgba(26, 31, 58, 0.8)',
              border: '2px solid rgba(247, 147, 26, 0.4)',
              borderRadius: '16px',
              padding: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#888', marginBottom: '0.5rem' }}>Bitcoin</div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#F7931A' }}>
                    {formatNumber(totalBTC)} BTC
                  </div>
                  <div style={{ fontSize: '14px', color: '#888', marginTop: '0.5rem' }}>
                    ≈ £{formatNumber(totalBTC * livePrices.BTC)}
                  </div>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #F7931A, #FF9F00)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: '900',
                  color: '#000'
                }}>
                  ₿
                </div>
              </div>

              {/* Wallet Address */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem' }}>
                  Your BTC Wallet
                </div>
                {walletAddresses.BTC ? (
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(247, 147, 26, 0.3)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: '#fff', fontSize: '13px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {walletAddresses.BTC}
                    </span>
                    <button
                      onClick={() => handleCopy(walletAddresses.BTC)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copied === walletAddresses.BTC ? '#22C55E' : '#F7931A',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      {copied === walletAddresses.BTC ? <IoCheckmark size={16} /> : <IoCopy size={16} />}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpdateAddress('BTC')}
                    style={{
                      width: '100%',
                      background: 'rgba(247, 147, 26, 0.2)',
                      border: '2px dashed rgba(247, 147, 26, 0.4)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      color: '#F7931A',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    + Set Wallet Address
                  </button>
                )}
              </div>

              {/* Withdraw Button */}
              <button
                onClick={() => handleWithdraw('BTC', totalBTC)}
                disabled={totalBTC === 0 || !walletAddresses.BTC}
                style={{
                  width: '100%',
                  background: (totalBTC === 0 || !walletAddresses.BTC) 
                    ? 'rgba(100, 100, 100, 0.3)' 
                    : 'linear-gradient(135deg, #F7931A, #FF9F00)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1rem',
                  color: (totalBTC === 0 || !walletAddresses.BTC) ? '#666' : '#000',
                  fontSize: '16px',
                  fontWeight: '900',
                  cursor: (totalBTC === 0 || !walletAddresses.BTC) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <ArrowDownToLine size={20} />
                Withdraw to My Wallet
              </button>
            </div>

            {/* ETH Card */}
            <div style={{
              background: 'rgba(26, 31, 58, 0.8)',
              border: '2px solid rgba(98, 126, 234, 0.4)',
              borderRadius: '16px',
              padding: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#888', marginBottom: '0.5rem' }}>Ethereum</div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#627EEA' }}>
                    {formatNumber(totalETH)} ETH
                  </div>
                  <div style={{ fontSize: '14px', color: '#888', marginTop: '0.5rem' }}>
                    ≈ £{formatNumber(totalETH * livePrices.ETH)}
                  </div>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #627EEA, #8A9EFF)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: '900',
                  color: '#fff'
                }}>
                  Ξ
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem' }}>
                  Your ETH Wallet
                </div>
                {walletAddresses.ETH ? (
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(98, 126, 234, 0.3)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: '#fff', fontSize: '13px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {walletAddresses.ETH}
                    </span>
                    <button
                      onClick={() => handleCopy(walletAddresses.ETH)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copied === walletAddresses.ETH ? '#22C55E' : '#627EEA',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      {copied === walletAddresses.ETH ? <IoCheckmark size={16} /> : <IoCopy size={16} />}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpdateAddress('ETH')}
                    style={{
                      width: '100%',
                      background: 'rgba(98, 126, 234, 0.2)',
                      border: '2px dashed rgba(98, 126, 234, 0.4)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      color: '#627EEA',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    + Set Wallet Address
                  </button>
                )}
              </div>

              <button
                onClick={() => handleWithdraw('ETH', totalETH)}
                disabled={totalETH === 0 || !walletAddresses.ETH}
                style={{
                  width: '100%',
                  background: (totalETH === 0 || !walletAddresses.ETH) 
                    ? 'rgba(100, 100, 100, 0.3)' 
                    : 'linear-gradient(135deg, #627EEA, #8A9EFF)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1rem',
                  color: (totalETH === 0 || !walletAddresses.ETH) ? '#666' : '#fff',
                  fontSize: '16px',
                  fontWeight: '900',
                  cursor: (totalETH === 0 || !walletAddresses.ETH) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <ArrowDownToLine size={20} />
                Withdraw to My Wallet
              </button>
            </div>

            {/* USDT Card */}
            <div style={{
              background: 'rgba(26, 31, 58, 0.8)',
              border: '2px solid rgba(38, 161, 123, 0.4)',
              borderRadius: '16px',
              padding: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#888', marginBottom: '0.5rem' }}>Tether</div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#26A17B' }}>
                    {formatNumber(totalUSDT)} USDT
                  </div>
                  <div style={{ fontSize: '14px', color: '#888', marginTop: '0.5rem' }}>
                    ≈ £{formatNumber(totalUSDT * livePrices.USDT)}
                  </div>
                </div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #26A17B, #2FD899)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: '900',
                  color: '#fff'
                }}>
                  ₮
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem' }}>
                  Your USDT Wallet
                </div>
                {walletAddresses.USDT ? (
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(38, 161, 123, 0.3)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ color: '#fff', fontSize: '13px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {walletAddresses.USDT}
                    </span>
                    <button
                      onClick={() => handleCopy(walletAddresses.USDT)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copied === walletAddresses.USDT ? '#22C55E' : '#26A17B',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      {copied === walletAddresses.USDT ? <IoCheckmark size={16} /> : <IoCopy size={16} />}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpdateAddress('USDT')}
                    style={{
                      width: '100%',
                      background: 'rgba(38, 161, 123, 0.2)',
                      border: '2px dashed rgba(38, 161, 123, 0.4)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      color: '#26A17B',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    + Set Wallet Address
                  </button>
                )}
              </div>

              <button
                onClick={() => handleWithdraw('USDT', totalUSDT)}
                disabled={totalUSDT === 0 || !walletAddresses.USDT}
                style={{
                  width: '100%',
                  background: (totalUSDT === 0 || !walletAddresses.USDT) 
                    ? 'rgba(100, 100, 100, 0.3)' 
                    : 'linear-gradient(135deg, #26A17B, #2FD899)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1rem',
                  color: (totalUSDT === 0 || !walletAddresses.USDT) ? '#666' : '#fff',
                  fontSize: '16px',
                  fontWeight: '900',
                  cursor: (totalUSDT === 0 || !walletAddresses.USDT) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <ArrowDownToLine size={20} />
                Withdraw to My Wallet
              </button>
            </div>
          </div>
        </div>

        {/* Fee Breakdown */}
        <div style={{
          background: 'rgba(26, 31, 58, 0.8)',
          border: '2px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '16px',
          padding: '2rem'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '900',
            color: '#00F0FF',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <IoInformationCircle size={20} />
            Revenue Breakdown
          </h2>

          <div style={{
            background: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1rem'
          }}>
            <div style={{ color: '#00F0FF', fontSize: '16px', fontWeight: '700', marginBottom: '0.5rem' }}>
              How Platform Earns
            </div>
            <ul style={{ color: '#888', fontSize: '14px', lineHeight: '1.8', paddingLeft: '1.5rem', margin: 0 }}>
              <li><strong style={{ color: '#fff' }}>1% Withdrawal Fee:</strong> Collected when users withdraw crypto to external wallets</li>
              <li><strong style={{ color: '#fff' }}>1% P2P Trade Fee:</strong> Collected from sellers when crypto is released from escrow</li>
              <li><strong style={{ color: '#fff' }}>Referral Commissions:</strong> 20% of fees go to referrers, platform keeps 80%</li>
            </ul>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <IoTrendingUp size={32} color="#22C55E" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem' }}>
                Withdrawal Fees
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#22C55E' }}>
                Coming Soon
              </div>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <IoCash size={32} color="#3B82F6" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem' }}>
                P2P Trade Fees
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#3B82F6' }}>
                Coming Soon
              </div>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <IoWallet size={32} color="#A855F7" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '0.5rem' }}>
                Total Fees Paid
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#A855F7' }}>
                Coming Soon
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
