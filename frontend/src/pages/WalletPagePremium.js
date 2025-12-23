import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { IoAlertCircle, IoCheckmark as Check, IoCheckmarkCircle, IoChevronDown, IoChevronUp, IoClose as X, IoCloseCircle, IoCloudDownload as Download, IoCopy, IoFilter as Filter, IoLockClosed, IoOpenOutline as ExternalLink, IoRefresh, IoSearch as Search, IoTime, IoTrendingDown, IoTrendingUp, IoWallet } from 'react-icons/io5';
import { BiArrowToTop, BiArrowFromTop } from 'react-icons/bi';;
import { Line, Sparklines, SparklinesLine } from 'react-sparklines';

const API = process.env.REACT_APP_BACKEND_URL;

// Animated counter with smooth transitions
const AnimatedCounter = ({ value, prefix = '£', decimals = 2, duration = 1500 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value === displayValue) return;
    
    setIsAnimating(true);
    let startTime = null;
    const startValue = displayValue;
    const endValue = value;
    const change = endValue - startValue;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (change * easeOutQuart);
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className={`transition-all duration-300 ${isAnimating ? 'text-cyan-400' : ''}`}>
      {prefix}{displayValue.toLocaleString('en-GB', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
      })}
    </span>
  );
};

// Premium Sparkline Component
const PremiumSparkline = ({ data, color, width = 100, height = 30 }) => {
  if (!data || data.length === 0) {
    // Generate random data for demo
    data = Array.from({ length: 20 }, () => Math.random() * 100 + 50);
  }

  return (
    <div style={{ width: `${width}px`, height: `${height}px` }}>
      <Sparklines data={data} width={width} height={height} margin={0}>
        <SparklinesLine color={color} style={{ strokeWidth: 2, fill: 'none' }} />
      </Sparklines>
    </div>
  );
};

export default function WalletPagePremium() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalPortfolioGBP, setTotalPortfolioGBP] = useState(0);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [totalLocked, setTotalLocked] = useState(0);
  const [change24h, setChange24h] = useState(0);
  const [expandedAsset, setExpandedAsset] = useState(0); // Auto-expand first asset by default
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [depositAddress, setDepositAddress] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // OTP state
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  
  // Withdraw form
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNetwork, setWithdrawNetwork] = useState('BTC');
  const [withdrawFee, setWithdrawFee] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem('cryptobank_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const u = JSON.parse(userData);
    setUser(u);
    loadWalletData(u.user_id);
    
    // Auto-refresh every 15 seconds
    const interval = setInterval(() => {
      loadWalletData(u.user_id, true);
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const loadWalletData = async (userId, silent = false) => {
    try {
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);
      
      // Load balances
      const balRes = await axios.get(`${API}/api/wallets/balances/${userId}`);
      // console.log('🔍 Wallet API Response:', balRes.data);
      
      // VALIDATION: Ensure response has correct structure
      if (!balRes.data || typeof balRes.data !== 'object') {
        throw new Error('Invalid wallet response: not an object');
      }
      if (!Array.isArray(balRes.data.balances)) {
        throw new Error('Invalid wallet response: balances is not an array');
      }
      
      // VALIDATION: Check each balance has required fields
      balRes.data.balances.forEach((bal, idx) => {
        if (!bal.currency) {
          throw new Error(`Balance ${idx} missing currency field`);
        }
        if (bal.total_balance === undefined) {
          throw new Error(`Balance ${idx} (${bal.currency}) missing total_balance`);
        }
      });
      
      if (balRes.data.success) {
        const bals = balRes.data.balances || [];
        // console.log('🔍 Balances array:', bals);
        setBalances(bals);
        
        // Calculate totals
        const total = bals.reduce((sum, bal) => {
          const value = bal.gbp_value || bal.value_gbp || 0;
          // console.log(`💰 ${bal.currency}: gbp_value=${value}`);
          return sum + value;
        }, 0);
        const available = bals.reduce((sum, bal) => sum + (bal.available_balance * (bal.price_gbp || 0)), 0);
        const locked = bals.reduce((sum, bal) => sum + ((bal.locked_balance || 0) * (bal.price_gbp || 0)), 0);
        
        // console.log('💰 Total Portfolio GBP:', total);
        // console.log('💰 Total Available:', available);
        // console.log('💰 Total Locked:', locked);
        
        setTotalPortfolioGBP(total);
        setTotalAvailable(available);
        setTotalLocked(locked);
        
        // Mock 24h change (in production, fetch from price service)
        setChange24h((Math.random() * 10 - 5));
      }
      
      // Load transactions
      const txRes = await axios.get(`${API}/api/wallet/transactions/${userId}`);
      if (txRes.data.success) {
        setTransactions(txRes.data.transactions || []);
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error);
      // Silently fail - don't show annoying error toast
    } finally {
      if (!silent) setLoading(false);
      if (silent) setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    if (user) {
      loadWalletData(user.user_id, true);
      toast.success('Wallet refreshed');
    }
  };

  const handleDepositClick = (asset) => {
    const currency = asset.currency || asset.symbol;
    if (!currency) {
      toast.error('Invalid currency');
      return;
    }
    navigate(`/deposit/${currency.toLowerCase()}`);
  };

  const generateDepositAddress = async (currency) => {
    try {
      const res = await axios.post(`${API}/api/nowpayments/create-deposit`, {
        user_id: user.user_id,
        amount: 50, // Minimum deposit amount in GBP
        currency: 'gbp',
        pay_currency: currency.toLowerCase()
      });
      if (res.data.success) {
        setDepositAddress(res.data.deposit_address || res.data.address || res.data.pay_address);
      } else {
        toast.error(res.data.message || 'Failed to generate deposit address');
      }
    } catch (error) {
      console.error('Failed to generate deposit address:', error);
      toast.error(error.response?.data?.message || 'Failed to generate deposit address');
    }
  };

  const handleWithdrawClick = (asset) => {
    const currency = asset.currency || asset.symbol;
    if (!currency) {
      toast.error('Invalid currency');
      return;
    }
    navigate(`/withdraw/${currency.toLowerCase()}`);
  };

  const sendOTP = async () => {
    setSendingOTP(true);
    try {
      const res = await axios.post(`${API}/api/auth/send-otp`, {
        user_id: user.user_id,
        action: 'withdrawal'
      });
      if (res.data.success) {
        toast.success('OTP sent to your email');
        setShowOTPInput(true);
        setOtpCountdown(300); // 5 minutes
      } else {
        toast.error(res.data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Failed to send OTP:', error);
      toast.error('Failed to send OTP');
    } finally {
      setSendingOTP(false);
    }
  };

  const verifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast.error('Please enter 6-digit OTP code');
      return;
    }
    
    try {
      const res = await axios.post(`${API}/api/auth/verify-otp`, {
        user_id: user.user_id,
        otp_code: otpCode,
        action: 'withdrawal'
      });
      if (res.data.success) {
        toast.success('OTP verified successfully');
        setOtpVerified(true);
      } else {
        toast.error(res.data.message || 'Invalid OTP code');
      }
    } catch (error) {
      console.error('Failed to verify OTP:', error);
      toast.error('Failed to verify OTP');
    }
  };

  const executeWithdrawal = async () => {
    if (!otpVerified) {
      toast.error('Please verify OTP first');
      return;
    }
    
    if (!withdrawAddress || !withdrawAmount) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      const res = await axios.post(`${API}/api/wallet/withdraw`, {
        user_id: user.user_id,
        currency: selectedAsset.currency,
        amount: parseFloat(withdrawAmount),
        destination_address: withdrawAddress,
        network: withdrawNetwork
      });
      
      if (res.data.success) {
        toast.success('Withdrawal request submitted successfully');
        setShowWithdrawModal(false);
        loadWalletData(user.user_id);
      } else {
        toast.error(res.data.message || 'Withdrawal failed');
      }
    } catch (error) {
      console.error('Withdrawal failed:', error);
      toast.error('Withdrawal failed');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesType = filterType === 'all' || tx.type === filterType;
    const matchesSearch = !searchQuery || 
      tx.currency?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(to bottom, #05060B, #050814)' }}>
          <div className="text-center">
            <IoRefresh className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
            <div className="text-white text-xl">Loading your wallet...</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen pb-12" style={{ background: 'linear-gradient(to bottom, #05060B, #050814)' }}>
        <div className="max-w-[1280px] mx-auto px-6 py-8">
          
          {/* Header with Refresh */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Wallet</h1>
              <p className="text-gray-400 text-sm">Manage your crypto assets</p>
            </div>
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-white"
            >
              <IoRefresh className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">Refresh</span>
            </button>
          </div>
          
          {/* Premium Portfolio Summary Card with Glassmorphism */}
          <div 
            className="mb-8 rounded-[22px] p-8 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #050C1E 0%, #1C1540 100%)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          >
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10">
              <div className="text-xs uppercase tracking-wider text-gray-400 mb-3 font-semibold">Total Portfolio Value</div>
              <div className="flex items-end gap-4 mb-8">
                <div className="text-5xl font-bold text-white tracking-tight">
                  <AnimatedCounter value={totalPortfolioGBP} decimals={2} />
                </div>
                <div 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold mb-2"
                  style={{
                    background: change24h >= 0 
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)' 
                      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
                    border: `1px solid ${change24h >= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    color: change24h >= 0 ? '#22C55E' : '#EF4444'
                  }}
                >
                  {change24h >= 0 ? <IoTrendingUp className="w-4 h-4" /> : <IoTrendingDown className="w-4 h-4" />}
                  {Math.abs(change24h).toFixed(2)}%
                  <span className="text-xs opacity-60">24h</span>
                </div>
              </div>
              
              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div 
                  className="rounded-xl p-5 backdrop-blur-sm"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center">
                      <IoWallet className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Available</div>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    £{totalAvailable.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                
                <div 
                  className="rounded-xl p-5 backdrop-blur-sm"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 flex items-center justify-center">
                      <IoLockClosed className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Locked</div>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    £{totalLocked.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                
                <div 
                  className="rounded-xl p-5 backdrop-blur-sm"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                      <IoTime className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Pending</div>
                  </div>
                  <div className="text-2xl font-bold text-white">£0.00</div>
                </div>
                
                <div 
                  className="rounded-xl p-5 backdrop-blur-sm"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
                      <IoTrendingUp className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Assets</div>
                  </div>
                  <div className="text-2xl font-bold text-white">{balances.filter(b => b.total_balance > 0).length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Asset List with Premium Design */}
          <div 
            className="rounded-2xl p-6 mb-8"
            style={{
              background: '#0B1020',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Your Assets</h2>
              <div className="text-sm text-gray-400">
                {balances.filter(b => b.total_balance > 0).length} assets
              </div>
            </div>
            
            <div className="space-y-2">
              {balances.filter(bal => bal.total_balance > 0).length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center mx-auto mb-4">
                    <IoWallet className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No assets yet</h3>
                  <p className="text-gray-400 text-sm mb-6">Deposit crypto to get started</p>
                  <button 
                    onClick={() => navigate('/instant-buy')}
                    className="px-6 py-3 rounded-full font-medium text-white transition-all"
                    style={{ background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)' }}
                  >
                    Buy Crypto
                  </button>
                </div>
              ) : (
                balances.filter(bal => bal.total_balance > 0).map((asset, index) => {
                  const priceChange = (Math.random() * 20 - 10);
                  const isPositive = priceChange >= 0;
                  
                  return (
                    <div key={index}>
                      <div 
                        className="rounded-xl p-4 cursor-pointer transition-all duration-200"
                        style={{
                          background: expandedAsset === index ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}
                        onMouseEnter={(e) => {
                          if (expandedAsset !== index) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (expandedAsset !== index) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                          }
                        }}
                        onClick={() => setExpandedAsset(expandedAsset === index ? null : index)}
                      >
                        <div className="flex items-center w-full">
                          {/* Coin Avatar & Info */}
                          <div className="flex items-center gap-4" style={{ flex: '0 0 280px' }}>
                            <div 
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #9333EA 100%)' }}
                            >
                              {asset.currency.substring(0, 1)}
                            </div>
                            
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="text-white font-semibold text-base">{asset.currency}</div>
                                <div className="text-xs px-2 py-0.5 rounded bg-white/5 text-gray-400 whitespace-nowrap">
                                  {asset.currency} Network
                                </div>
                              </div>
                              <div className="text-sm text-gray-400">
                                {asset.available_balance.toFixed(8)} {asset.currency}
                              </div>
                            </div>
                          </div>
                          
                          {/* Balance Value */}
                          <div className="text-right" style={{ flex: '0 0 180px' }}>
                            <div className="text-white font-semibold text-lg mb-1">
                              £{(asset.available_balance * (asset.price_gbp || 0)).toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-400">
                              £{(asset.price_gbp || 0).toFixed(2)} / {asset.currency}
                            </div>
                          </div>
                          
                          {/* 24h Change & Sparkline */}
                          <div className="flex items-center gap-4" style={{ flex: '0 0 200px' }}>
                            <div className="text-right">
                              <div 
                                className={`text-sm font-semibold mb-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}
                              >
                                {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                              </div>
                              <div className="text-xs text-gray-500">24h</div>
                            </div>
                            <PremiumSparkline 
                              data={Array.from({ length: 24 }, () => Math.random() * 100 + 50)}
                              color={isPositive ? '#22C55E' : '#EF4444'}
                              width={100}
                              height={32}
                            />
                          </div>
                          
                          {/* Expand Icon */}
                          <div className="ml-auto flex-shrink-0">
                            {expandedAsset === index ? 
                              <IoChevronUp className="w-5 h-5 text-gray-400" /> : 
                              <IoChevronDown className="w-5 h-5 text-gray-400" />
                            }
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded Section */}
                      {expandedAsset === index && (
                        <div 
                          className="mt-2 rounded-xl p-6 space-y-5"
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            animation: 'slideDown 0.25s ease-out'
                          }}
                        >
                          {/* Balance Breakdown */}
                          <div>
                            <div className="text-xs uppercase tracking-wider text-gray-400 mb-3 font-semibold">Balance Breakdown</div>
                            <div className="grid grid-cols-3 gap-4">
                              <div 
                                className="rounded-lg p-4"
                                style={{
                                  background: 'rgba(34, 197, 94, 0.05)',
                                  border: '1px solid rgba(34, 197, 94, 0.2)'
                                }}
                              >
                                <div className="text-xs text-green-400 mb-1 font-medium">Available</div>
                                <div className="text-white font-semibold text-lg">
                                  {asset.available_balance.toFixed(8)}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">{asset.currency}</div>
                              </div>
                              <div 
                                className="rounded-lg p-4"
                                style={{
                                  background: 'rgba(251, 191, 36, 0.05)',
                                  border: '1px solid rgba(251, 191, 36, 0.2)'
                                }}
                              >
                                <div className="text-xs text-yellow-400 mb-1 font-medium">Locked / Escrow</div>
                                <div className="text-white font-semibold text-lg">
                                  {(asset.locked_balance || 0).toFixed(8)}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">{asset.currency}</div>
                              </div>
                              <div 
                                className="rounded-lg p-4"
                                style={{
                                  background: 'rgba(59, 130, 246, 0.05)',
                                  border: '1px solid rgba(59, 130, 246, 0.2)'
                                }}
                              >
                                <div className="text-xs text-blue-400 mb-1 font-medium">Total</div>
                                <div className="text-white font-semibold text-lg">
                                  {asset.total_balance.toFixed(8)}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">{asset.currency}</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div>
                            <div className="text-xs uppercase tracking-wider text-gray-400 mb-3 font-semibold">Actions</div>
                            <div className="flex gap-3">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDepositClick(asset);
                                }}
                                className="flex-1 py-3 px-4 rounded-xl font-medium text-white transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-lg"
                                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)' }}
                              >
                                <BiArrowFromTop className="w-4 h-4" />
                                Deposit
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWithdrawClick(asset);
                                }}
                                className="flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 hover:bg-white/5"
                                style={{ 
                                  border: '2px solid #2563EB', 
                                  color: '#38BDF8',
                                  background: 'rgba(37, 99, 235, 0.05)'
                                }}
                              >
                                <BiArrowToTop className="w-4 h-4" />
                                Withdraw
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/swap-crypto');
                                }}
                                className="flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 hover:bg-white/5"
                                style={{ 
                                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                                  color: '#9CA3AF',
                                  background: 'rgba(255, 255, 255, 0.02)'
                                }}
                              >
                                <IoRefresh className="w-4 h-4" />
                                Swap
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Transaction History */}
          <div 
            className="rounded-2xl p-6"
            style={{
              background: '#0B1020',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-white">Transaction History</h2>
              
              <div className="flex flex-wrap gap-2">
                {['all', 'deposit', 'withdrawal', 'swap', 'p2p'].map(type => (
                  <button 
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterType === type 
                        ? 'text-white shadow-lg' 
                        : 'text-gray-400 hover:bg-white/5'
                    }`}
                    style={{
                      background: filterType === type 
                        ? 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${filterType === type ? 'transparent' : 'rgba(255, 255, 255, 0.05)'}` 
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center mx-auto mb-4">
                    <IoTime className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No transactions yet</h3>
                  <p className="text-gray-400 text-sm">Your transaction history will appear here</p>
                </div>
              ) : (
                filteredTransactions.slice(0, 10).map((tx, index) => {
                  const isDeposit = tx.type === 'deposit' || tx.type === 'swap_in';
                  const statusColors = {
                    completed: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', text: '#22C55E' },
                    pending: { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)', text: '#FBB F24' },
                    failed: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#EF4444' }
                  };
                  const statusColor = statusColors[tx.status] || statusColors.pending;
                  
                  return (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-4 rounded-xl transition-all hover:bg-white/5"
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{
                            background: isDeposit 
                              ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.05) 100%)'
                              : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.05) 100%)'
                          }}
                        >
                          {isDeposit ? 
                            <BiArrowFromTop className="w-5 h-5 text-green-400" /> : 
                            <BiArrowToTop className="w-5 h-5 text-red-400" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-white font-medium capitalize">{tx.type}</div>
                            <div 
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                background: statusColor.bg,
                                border: `1px solid ${statusColor.border}`,
                                color: statusColor.text
                              }}
                            >
                              {tx.status}
                            </div>
                          </div>
                          <div className="text-sm text-gray-400">
                            {new Date(tx.created_at).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-semibold ${isDeposit ? 'text-green-400' : 'text-red-400'}`}>
                          {isDeposit ? '+' : '-'}{tx.amount} {tx.currency}
                        </div>
                        <div className="text-sm text-gray-400">
                          {tx.transaction_id ? `ID: ${tx.transaction_id.substring(0, 8)}...` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Deposit Modal */}
      {showDepositModal && selectedAsset && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowDepositModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
              animation: 'modalSlideIn 0.25s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Deposit {selectedAsset.currency}</h3>
              <button 
                onClick={() => setShowDepositModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
              >
                <IoCloseCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {depositAddress ? (
              <>
                {/* QR Code */}
                <div className="bg-white p-4 rounded-xl mb-6">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${depositAddress}`} 
                    alt="QR Code" 
                    className="w-full"
                  />
                </div>
                
                {/* Network Info */}
                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-2">Network</div>
                  <div 
                    className="rounded-lg p-3"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div className="text-white font-medium">{selectedAsset.currency} Network</div>
                  </div>
                </div>
                
                {/* Address */}
                <div className="mb-6">
                  <div className="text-sm text-gray-400 mb-2">Deposit Address</div>
                  <div 
                    className="rounded-lg p-4 flex items-center gap-3"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <code className="text-white text-sm flex-1 break-all font-mono">{depositAddress}</code>
                    <button 
                      onClick={() => copyToClipboard(depositAddress)} 
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all flex-shrink-0"
                    >
                      <IoCopy className="w-5 h-5 text-cyan-400" />
                    </button>
                  </div>
                </div>
                
                {/* Warning */}
                <div 
                  className="rounded-xl p-4 mb-6"
                  style={{
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid rgba(251, 191, 36, 0.3)'
                  }}
                >
                  <div className="flex gap-3">
                    <IoAlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-yellow-400 text-sm">
                      <div className="font-semibold mb-1">Important</div>
                      Send only {selectedAsset.currency} to this address on {selectedAsset.currency} network. Sending other coins or using wrong network may result in permanent loss of funds.
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <IoRefresh className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                <div className="text-gray-400">Generating deposit address...</div>
              </div>
            )}
            
            <button 
              onClick={() => setShowDepositModal(false)}
              className="w-full py-3 rounded-xl font-medium text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Premium Withdraw Modal with OTP */}
      {showWithdrawModal && selectedAsset && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowWithdrawModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{
              background: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
              animation: 'modalSlideIn 0.25s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Withdraw {selectedAsset.currency}</h3>
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
              >
                <IoCloseCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {/* Available Balance */}
            <div 
              className="rounded-xl p-4 mb-6"
              style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}
            >
              <div className="text-sm text-green-400 mb-1">Available Balance</div>
              <div className="text-2xl font-bold text-white">
                {selectedAsset.available_balance.toFixed(8)} {selectedAsset.currency}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                ≈ £{(selectedAsset.available_balance * (selectedAsset.price_gbp || 0)).toFixed(2)}
              </div>
            </div>
            
            {/* Form Fields */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-gray-400 block mb-2 font-medium">Destination Address</label>
                <input 
                  type="text"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="w-full rounded-lg px-4 py-3 text-white font-mono text-sm"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  placeholder="Enter wallet address"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-2 font-medium">Amount</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full rounded-lg px-4 py-3 pr-28 text-white text-lg"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                    placeholder="0.00"
                    step="0.00000001"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                    <button 
                      onClick={() => setWithdrawAmount((selectedAsset.available_balance * 0.5).toFixed(8))}
                      className="text-xs px-3 py-1.5 rounded-lg text-white font-semibold transition-all"
                      style={{ background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)' }}
                    >
                      50%
                    </button>
                    <button 
                      onClick={() => setWithdrawAmount(selectedAsset.available_balance.toFixed(8))}
                      className="text-xs px-3 py-1.5 rounded-lg text-white font-semibold transition-all"
                      style={{ background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)' }}
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Fee Summary */}
              {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                <div 
                  className="rounded-lg p-4"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Amount</span>
                      <span className="text-white font-medium">{withdrawAmount} {selectedAsset.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Network Fee</span>
                      <span className="text-white font-medium">{withdrawFee.toFixed(8)} {selectedAsset.currency}</span>
                    </div>
                    <div className="h-px bg-white/10 my-2" />
                    <div className="flex justify-between">
                      <span className="text-white font-semibold">You will receive</span>
                      <span className="text-cyan-400 font-bold">
                        {(parseFloat(withdrawAmount) - withdrawFee).toFixed(8)} {selectedAsset.currency}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* OTP Section */}
            <div 
              className="rounded-xl p-5 mb-6"
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <IoLockClosed className="w-5 h-5 text-blue-400" />
                <div className="text-sm font-semibold text-blue-400">SMS Verification Required</div>
              </div>
              
              {!showOTPInput ? (
                <button 
                  onClick={sendOTP}
                  disabled={sendingOTP}
                  className="w-full py-3 rounded-lg font-medium text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)' }}
                >
                  {sendingOTP ? (
                    <div className="flex items-center justify-center gap-2">
                      <IoRefresh className="w-4 h-4 animate-spin" />
                      Sending OTP...
                    </div>
                  ) : (
                    'Send OTP to Phone'
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-300 font-medium">Enter 6-digit code</label>
                      {otpCountdown > 0 && (
                        <span className="text-xs text-blue-400">
                          Expires in {Math.floor(otpCountdown / 60)}:{(otpCountdown % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    <input 
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      maxLength={6}
                      className="w-full rounded-lg px-4 py-3 text-white text-center text-2xl tracking-[0.5em] font-bold"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '2px solid rgba(59, 130, 246, 0.5)'
                      }}
                      placeholder="000000"
                    />
                  </div>
                  {otpVerified ? (
                    <div className="flex items-center justify-center gap-2 text-green-400 font-medium py-2">
                      <IoCheckmarkCircle className="w-5 h-5" />
                      OTP Verified Successfully
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={verifyOTP}
                        disabled={otpCode.length !== 6}
                        className="flex-1 py-2.5 rounded-lg font-medium text-white transition-all disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)' }}
                      >
                        Verify OTP
                      </button>
                      <button 
                        onClick={sendOTP}
                        disabled={otpCountdown > 240}
                        className="px-4 py-2.5 rounded-lg font-medium text-gray-300 transition-all disabled:opacity-50"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        Resend
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-3 rounded-xl font-medium text-gray-400 transition-all hover:bg-white/5"
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.02)'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={executeWithdrawal}
                disabled={!otpVerified || !withdrawAddress || !withdrawAmount}
                className="flex-1 py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)' }}
              >
                Confirm Withdrawal
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </Layout>
  );
}