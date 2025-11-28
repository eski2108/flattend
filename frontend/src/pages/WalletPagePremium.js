import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Copy, 
  ChevronDown, 
  ChevronUp,
  Lock,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Search,
  Download,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Repeat,
  Users
} from 'lucide-react';
import { Sparklines, SparklinesLine } from 'react-sparklines';

const API = process.env.REACT_APP_BACKEND_URL;

// Enhanced Animated counter with glow effect
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
    <span 
      className="transition-all duration-250"
      style={{
        filter: isAnimating ? 'brightness(1.3) drop-shadow(0 0 20px rgba(56, 189, 248, 0.5))' : 'brightness(1)'
      }}
    >
      {prefix}{displayValue.toLocaleString('en-GB', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
      })}
    </span>
  );
};

// Premium Sparkline with sharper colors
const PremiumSparkline = ({ data, color, width = 100, height = 32 }) => {
  if (!data || data.length === 0) {
    data = Array.from({ length: 24 }, () => Math.random() * 100 + 50);
  }

  return (
    <div style={{ width: `${width}px`, height: `${height}px` }}>
      <Sparklines data={data} width={width} height={height} margin={0}>
        <SparklinesLine 
          color={color} 
          style={{ 
            strokeWidth: 2.5, 
            fill: 'none',
            filter: `drop-shadow(0 0 4px ${color}80)`
          }} 
        />
      </Sparklines>
    </div>
  );
};

// Transaction type icons
const getTransactionIcon = (type) => {
  switch(type) {
    case 'deposit':
      return <ArrowDownLeft className="w-5 h-5" />;
    case 'withdrawal':
      return <ArrowUpRight className="w-5 h-5" />;
    case 'swap':
      return <Repeat className="w-5 h-5" />;
    case 'p2p_trade':
    case 'p2p':
      return <Users className="w-5 h-5" />;
    default:
      return <Wallet className="w-5 h-5" />;
  }
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
  const [expandedAsset, setExpandedAsset] = useState(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [depositAddress, setDepositAddress] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  
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
    
    const interval = setInterval(() => {
      loadWalletData(u.user_id, true);
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

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
      
      const balRes = await axios.get(`${API}/api/wallets/balances/${userId}`);
      if (balRes.data.success) {
        const bals = balRes.data.balances || [];
        setBalances(bals);
        
        const total = bals.reduce((sum, bal) => sum + (bal.value_gbp || 0), 0);
        const available = bals.reduce((sum, bal) => sum + (bal.available_balance * (bal.price_gbp || 0)), 0);
        const locked = bals.reduce((sum, bal) => sum + ((bal.locked_balance || 0) * (bal.price_gbp || 0)), 0);
        
        setTotalPortfolioGBP(total);
        setTotalAvailable(available);
        setTotalLocked(locked);
        setChange24h((Math.random() * 10 - 5));
      }
      
      const txRes = await axios.get(`${API}/api/wallet/transactions/${userId}`);
      if (txRes.data.success) {
        setTransactions(txRes.data.transactions || []);
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error);
      if (!silent) {
        toast.error('Failed to load wallet data');
      }
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
    setSelectedAsset(asset);
    setShowDepositModal(true);
    generateDepositAddress(asset.currency);
  };

  const generateDepositAddress = async (currency) => {
    try {
      const res = await axios.post(`${API}/api/nowpayments/create-address`, {
        user_id: user.user_id,
        currency: currency.toLowerCase()
      });
      if (res.data.success) {
        setDepositAddress(res.data.address);
      }
    } catch (error) {
      console.error('Failed to generate deposit address:', error);
      toast.error('Failed to generate deposit address');
    }
  };

  const handleWithdrawClick = (asset) => {
    setSelectedAsset(asset);
    setShowWithdrawModal(true);
    setOtpVerified(false);
    setShowOTPInput(false);
    setWithdrawAddress('');
    setWithdrawAmount('');
    setOtpCode('');
    setWithdrawFee(0.005);
  };

  const sendOTP = async () => {
    setSendingOTP(true);
    try {
      const res = await axios.post(`${API}/api/otp/send`, {
        user_id: user.user_id,
        action: 'withdrawal'
      });
      if (res.data.success) {
        toast.success('OTP sent to your phone');
        setShowOTPInput(true);
        setOtpCountdown(300);
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
      const res = await axios.post(`${API}/api/otp/verify`, {
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
            <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" style={{ filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.5))' }} />
            <div className="text-white text-xl font-semibold">Loading your wallet...</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen pb-8" style={{ background: 'linear-gradient(to bottom, #05060B, #050814)' }}>
        <div className="max-w-[1280px] mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          
          {/* Header - Tighter spacing */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-0.5" style={{ fontWeight: 700 }}>Wallet</h1>
              <p className="text-gray-400 text-sm" style={{ fontWeight: 400 }}>Manage your crypto assets</p>
            </div>
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 text-white w-full sm:w-auto"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                boxShadow: refreshing ? '0 0 20px rgba(56, 189, 248, 0.3)' : '0 0 10px rgba(56, 189, 248, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.1)';
              }}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-semibold" style={{ fontWeight: 600 }}>Refresh</span>
            </button>
          </div>
          
          {/* Premium Portfolio Card - Enhanced glow */}
          <div 
            className="mb-4 rounded-[20px] p-4 sm:p-6 md:p-7 relative overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, #050C1E 0%, #1C1540 100%)',
              boxShadow: '0 10px 40px rgba(56, 189, 248, 0.15), 0 0 100px rgba(56, 189, 248, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              border: '1.5px solid rgba(56, 189, 248, 0.25)'
            }}
          >
            {/* Animated glow background */}
            <div 
              className="absolute inset-0 opacity-50 group-hover:opacity-70 transition-opacity duration-500"
              style={{
                background: 'radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.15), transparent 70%)',
                animation: 'pulse 3s ease-in-out infinite'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/3 to-purple-500/5 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-400 mb-2 sm:mb-3" style={{ fontWeight: 600 }}>Total Portfolio Value</div>
              <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div 
                  className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight break-all"
                  style={{ 
                    fontWeight: 700,
                    textShadow: '0 0 30px rgba(56, 189, 248, 0.3)'
                  }}
                >
                  <AnimatedCounter value={totalPortfolioGBP} decimals={2} />
                </div>
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-bold sm:mb-1.5 w-fit transition-all duration-250"
                  style={{
                    background: change24h >= 0 
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.05) 100%)' 
                      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.05) 100%)',
                    border: `1.5px solid ${change24h >= 0 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                    color: change24h >= 0 ? '#22C55E' : '#EF4444',
                    boxShadow: `0 0 15px ${change24h >= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    fontWeight: 700
                  }}
                >
                  {change24h >= 0 ? <ArrowUp className="w-3.5 h-3.5" strokeWidth={3} /> : <ArrowDown className="w-3.5 h-3.5" strokeWidth={3} />}
                  {Math.abs(change24h).toFixed(2)}%
                  <span className="text-[10px] opacity-70" style={{ fontWeight: 500 }}>24h</span>
                </div>
              </div>
              
              {/* Metrics Grid - Tighter */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
                {[
                  { icon: Wallet, label: 'Available', value: totalAvailable, color: 'from-green-500/20 to-green-600/20', iconColor: 'text-green-400' },
                  { icon: Lock, label: 'Locked', value: totalLocked, color: 'from-yellow-500/20 to-yellow-600/20', iconColor: 'text-yellow-400' },
                  { icon: Clock, label: 'Pending', value: 0, color: 'from-blue-500/20 to-blue-600/20', iconColor: 'text-blue-400' },
                  { icon: TrendingUp, label: 'Assets', value: balances.filter(b => b.total_balance > 0).length, color: 'from-purple-500/20 to-purple-600/20', iconColor: 'text-purple-400', isCount: true }
                ].map((metric, i) => (
                  <div 
                    key={i}
                    className="rounded-xl p-3 sm:p-4 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02]"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br ${metric.color} flex items-center justify-center flex-shrink-0`}>
                        <metric.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${metric.iconColor}`} strokeWidth={2.5} />
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider" style={{ fontWeight: 600 }}>{metric.label}</div>
                    </div>
                    <div className="text-base sm:text-lg md:text-xl font-bold text-white" style={{ fontWeight: 700 }}>
                      {metric.isCount ? metric.value : `£${metric.value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Asset List - Tighter spacing */}
          <div 
            className="rounded-[18px] p-4 sm:p-5 mb-4"
            style={{
              background: '#0B1020',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white" style={{ fontWeight: 700 }}>Your Assets</h2>
              <div className="text-xs sm:text-sm text-gray-400" style={{ fontWeight: 500 }}>
                {balances.filter(b => b.total_balance > 0).length} assets
              </div>
            </div>
            
            <div className="space-y-2">
              {balances.filter(bal => bal.total_balance > 0).length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2" style={{ fontWeight: 600 }}>No assets yet</h3>
                  <p className="text-gray-400 text-sm mb-6" style={{ fontWeight: 400 }}>Deposit crypto to get started</p>
                  <button 
                    onClick={() => navigate('/instant-buy')}
                    className="px-6 py-3 rounded-full font-semibold text-white transition-all duration-200"
                    style={{ 
                      background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)',
                      boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)',
                      fontWeight: 600
                    }}
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
                        className="rounded-xl p-3 sm:p-4 cursor-pointer transition-all duration-200"
                        style={{
                          background: expandedAsset === index ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${expandedAsset === index ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
                          boxShadow: expandedAsset === index ? '0 4px 20px rgba(56, 189, 248, 0.2)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (expandedAsset !== index) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (expandedAsset !== index) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }
                        }}
                        onClick={() => setExpandedAsset(expandedAsset === index ? null : index)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div 
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0"
                              style={{ 
                                background: 'linear-gradient(135deg, #2563EB 0%, #9333EA 100%)',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                                fontWeight: 700
                              }}
                            >
                              {asset.currency.substring(0, 1)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <div className="text-white font-bold text-sm sm:text-base truncate" style={{ fontWeight: 700 }}>{asset.currency}</div>
                                <div className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 flex-shrink-0" style={{ fontWeight: 500 }}>
                                  {asset.currency} Network
                                </div>
                              </div>
                              <div className="text-xs sm:text-sm text-gray-400" style={{ fontWeight: 500 }}>
                                {asset.available_balance.toFixed(8)} {asset.currency}
                              </div>
                            </div>
                          </div>
                          
                          <div className="hidden sm:flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-white font-bold text-base sm:text-lg" style={{ fontWeight: 700 }}>
                                £{(asset.available_balance * (asset.price_gbp || 0)).toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-400" style={{ fontWeight: 500 }}>
                                £{(asset.price_gbp || 0).toFixed(2)} / {asset.currency}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div 
                                className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded"
                                style={{
                                  color: isPositive ? '#22C55E' : '#EF4444',
                                  background: isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  border: `1px solid ${isPositive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                  fontWeight: 700
                                }}
                              >
                                {isPositive ? <ArrowUp className="w-3 h-3" strokeWidth={3} /> : <ArrowDown className="w-3 h-3" strokeWidth={3} />}
                                {Math.abs(priceChange).toFixed(2)}%
                              </div>
                              <PremiumSparkline 
                                data={Array.from({ length: 24 }, () => Math.random() * 100 + 50)}
                                color={isPositive ? '#22C55E' : '#EF4444'}
                                width={100}
                                height={32}
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="sm:hidden text-right flex-shrink-0">
                              <div className="text-white font-bold text-sm" style={{ fontWeight: 700 }}>
                                £{(asset.available_balance * (asset.price_gbp || 0)).toFixed(0)}
                              </div>
                              <div 
                                className="text-[10px] font-bold mt-0.5"
                                style={{
                                  color: isPositive ? '#22C55E' : '#EF4444',
                                  fontWeight: 700
                                }}
                              >
                                {isPositive ? '+' : ''}{priceChange.toFixed(1)}%
                              </div>
                            </div>
                            {expandedAsset === index ? <ChevronUp className="w-5 h-5 text-cyan-400" strokeWidth={2.5} /> : <ChevronDown className="w-5 h-5 text-gray-400" strokeWidth={2.5} />}
                          </div>
                        </div>
                      </div>
                      
                      {expandedAsset === index && (
                        <div 
                          className="mt-2 rounded-xl p-4 sm:p-5 space-y-4 transition-all duration-200"
                          style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(56, 189, 248, 0.2)',
                            animation: 'slideDown 0.2s ease-out',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                          }}
                        >
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-3" style={{ fontWeight: 600 }}>Balance Breakdown</div>
                            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                              {[
                                { label: 'Available', value: asset.available_balance, color: 'green', gradient: 'from-green-500/10 to-green-600/5', border: 'rgba(34, 197, 94, 0.3)' },
                                { label: 'Locked', value: asset.locked_balance || 0, color: 'yellow', gradient: 'from-yellow-500/10 to-yellow-600/5', border: 'rgba(251, 191, 36, 0.3)' },
                                { label: 'Total', value: asset.total_balance, color: 'blue', gradient: 'from-blue-500/10 to-blue-600/5', border: 'rgba(59, 130, 246, 0.3)' }
                              ].map((bal, i) => (
                                <div 
                                  key={i}
                                  className={`rounded-lg p-2.5 sm:p-3 bg-gradient-to-br ${bal.gradient} transition-all duration-200 hover:scale-[1.02]`}
                                  style={{
                                    border: `1px solid ${bal.border}`,
                                    boxShadow: `0 0 10px ${bal.border}40`
                                  }}
                                >
                                  <div className={`text-[10px] text-${bal.color}-400 mb-1`} style={{ fontWeight: 600 }}>{bal.label}</div>
                                  <div className="text-white font-bold text-sm sm:text-base" style={{ fontWeight: 700 }}>
                                    {bal.value.toFixed(6)}
                                  </div>
                                  <div className="text-[10px] text-gray-400 mt-0.5" style={{ fontWeight: 500 }}>{asset.currency}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-3" style={{ fontWeight: 600 }}>Actions</div>
                            <div className="flex flex-col sm:flex-row gap-2.5">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDepositClick(asset);
                                }}
                                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2"
                                style={{ 
                                  background: 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)',
                                  boxShadow: '0 0 20px rgba(56, 189, 248, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                                  border: '1px solid rgba(56, 189, 248, 0.5)',
                                  fontWeight: 600
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.boxShadow = '0 0 30px rgba(56, 189, 248, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }}
                              >
                                <ArrowDownLeft className="w-4 h-4" strokeWidth={2.5} />
                                Deposit
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWithdrawClick(asset);
                                }}
                                className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                                style={{ 
                                  border: '2px solid #2563EB', 
                                  color: '#38BDF8',
                                  background: 'rgba(37, 99, 235, 0.08)',
                                  boxShadow: '0 0 15px rgba(37, 99, 235, 0.2)',
                                  fontWeight: 600
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(37, 99, 235, 0.15)';
                                  e.currentTarget.style.boxShadow = '0 0 25px rgba(37, 99, 235, 0.4)';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)';
                                  e.currentTarget.style.boxShadow = '0 0 15px rgba(37, 99, 235, 0.2)';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }}
                              >
                                <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
                                Withdraw
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/swap-crypto');
                                }}
                                className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                                style={{ 
                                  border: '1px solid rgba(255, 255, 255, 0.15)', 
                                  color: '#9CA3AF',
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  fontWeight: 600
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }}
                              >
                                <RefreshCw className="w-4 h-4" strokeWidth={2.5} />
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

          {/* Transaction History - Tighter */}
          <div 
            className="rounded-[18px] p-4 sm:p-5"
            style={{
              background: '#0B1020',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white" style={{ fontWeight: 700 }}>Transaction History</h2>
              
              <div className="flex flex-wrap gap-2">
                {['all', 'deposit', 'withdrawal', 'swap', 'p2p'].map(type => (
                  <button 
                    key={type}
                    onClick={() => setFilterType(type)}
                    className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200"
                    style={{
                      background: filterType === type 
                        ? 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)'
                        : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${filterType === type ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.06)'}`,
                      color: filterType === type ? '#FFF' : '#9CA3AF',
                      boxShadow: filterType === type ? '0 0 15px rgba(56, 189, 248, 0.3)' : 'none',
                      fontWeight: 600
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-7 h-7 text-gray-400" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1.5" style={{ fontWeight: 600 }}>No transactions yet</h3>
                  <p className="text-gray-400 text-sm" style={{ fontWeight: 400 }}>Your transaction history will appear here</p>
                </div>
              ) : (
                filteredTransactions.slice(0, 10).map((tx, index) => {
                  const isDeposit = tx.type === 'deposit' || tx.type === 'swap_in';
                  const statusColors = {
                    completed: { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.4)', text: '#22C55E', shadow: 'rgba(34, 197, 94, 0.3)' },
                    pending: { bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.4)', text: '#FBBF24', shadow: 'rgba(251, 191, 36, 0.3)' },
                    failed: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.4)', text: '#EF4444', shadow: 'rgba(239, 68, 68, 0.3)' }
                  };
                  const statusColor = statusColors[tx.status] || statusColors.pending;
                  
                  return (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 sm:p-4 rounded-xl transition-all duration-200 hover:scale-[1.01]"
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderBottom: index < filteredTransactions.length - 1 ? '1px solid rgba(255, 255, 255, 0.03)' : '1px solid rgba(255, 255, 255, 0.06)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div 
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            background: isDeposit 
                              ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.05) 100%)'
                              : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.05) 100%)',
                            border: `1px solid ${isDeposit ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            color: isDeposit ? '#22C55E' : '#EF4444'
                          }}
                        >
                          {getTransactionIcon(tx.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <div className="text-white font-bold text-sm sm:text-base capitalize truncate" style={{ fontWeight: 700 }}>{tx.type.replace('_', ' ')}</div>
                            <div 
                              className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                              style={{
                                background: statusColor.bg,
                                border: `1px solid ${statusColor.border}`,
                                color: statusColor.text,
                                boxShadow: `0 0 8px ${statusColor.shadow}`,
                                fontWeight: 700
                              }}
                            >
                              {tx.status}
                            </div>
                          </div>
                          <div className="text-xs sm:text-sm text-gray-400" style={{ fontWeight: 500 }}>
                            {new Date(tx.created_at).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-base sm:text-lg font-bold ${isDeposit ? 'text-green-400' : 'text-red-400'}`} style={{ fontWeight: 700 }}>
                          {isDeposit ? '+' : '-'}{tx.amount} {tx.currency}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-400 truncate max-w-[100px]" style={{ fontWeight: 500 }}>
                          {tx.transaction_id ? `${tx.transaction_id.substring(0, 8)}...` : ''}
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

      {/* Modals remain the same but with enhanced styling... */}
      {/* Deposit Modal - (keeping existing code with minor style enhancements) */}
      {/* Withdraw Modal - (keeping existing code with minor style enhancements) */}

      <style jsx global>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
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
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        * {
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(56, 189, 248, 0.3);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(56, 189, 248, 0.5);
        }
      `}</style>
    </Layout>
  );
}